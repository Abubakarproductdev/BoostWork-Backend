// In-process background job runner backed by the WorkflowRun collection.
// Jobs survive restarts (they live in MongoDB); a single App Service instance runs
// them with limited concurrency. Long AI/research work never blocks an HTTP request:
// the API enqueues a run and the browser polls GET .../:id for progress.

const crypto = require('crypto');
const WorkflowRun = require('../models/WorkflowRun');

const CONCURRENCY = 2;
const MAX_ATTEMPTS = 2;
const MAX_ACTIVE_RUNS_PER_USER = 3;
const RUN_TIMEOUT_MS = 6 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;

const handlers = new Map();
let active = 0;
let timer = null;
let started = false;

/**
 * Registers a workflow type.
 * handler = { steps: [{ name, label }], run: async (ctx) => result, onFailed?: async (run, message) => void }
 */
const register = (workflowType, handler) => {
    handlers.set(workflowType, handler);
};

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode, expose: true });

/** User-facing message: our own errors are descriptive, anything unexpected stays generic. */
const safeMessage = (error) => (
    error?.expose || error?.statusCode ? error.message : 'Something went wrong while running this workflow. Please try again.'
);

const enqueue = async ({ userId, workflowType, input = {}, reportId = null }) => {
    const handler = handlers.get(workflowType);
    if (!handler) throw httpError(400, `Unknown workflow type: ${workflowType}`);

    const activeRuns = await WorkflowRun.countDocuments({ userId, status: { $in: ['queued', 'running'] } });
    if (activeRuns >= MAX_ACTIVE_RUNS_PER_USER) {
        throw httpError(429, `You already have ${activeRuns} workflows running. Please wait for one to finish.`);
    }

    const run = await WorkflowRun.create({
        userId,
        workflowType,
        input,
        reportId,
        correlationId: crypto.randomUUID(),
        steps: handler.steps.map((step) => ({ name: step.name, label: step.label, status: 'pending' })),
    });

    setImmediate(pump);
    return run;
};

const updateStep = (runId, name, fields) => WorkflowRun.updateOne(
    { _id: runId, 'steps.name': name },
    { $set: Object.fromEntries(Object.entries(fields).map(([key, value]) => [`steps.$.${key}`, value])) }
);

const createContext = (run) => ({
    run,
    input: run.input,
    userId: run.userId,
    correlationId: run.correlationId,

    /** Runs fn as a named step, recording status and timing for the progress UI. */
    async step(name, fn) {
        await updateStep(run._id, name, { status: 'running', startedAt: new Date(), detail: '' });
        try {
            const value = await fn();
            await updateStep(run._id, name, { status: 'completed', finishedAt: new Date() });
            return value;
        } catch (error) {
            await updateStep(run._id, name, { status: 'failed', finishedAt: new Date(), detail: safeMessage(error) });
            throw error;
        }
    },

    async skip(name, detail = '') {
        await updateStep(run._id, name, { status: 'skipped', finishedAt: new Date(), detail });
    },

    async note(name, detail) {
        await updateStep(run._id, name, { detail: String(detail).slice(0, 300) });
    },

    /** Adds model token usage to the run (for cost tracking). */
    async trackUsage(usage) {
        await WorkflowRun.updateOne({ _id: run._id }, {
            $inc: {
                'usage.modelCalls': 1,
                'usage.promptTokens': usage?.prompt_tokens || 0,
                'usage.completionTokens': usage?.completion_tokens || 0,
            },
        });
    },
});

const withTimeout = (promise, ms) => {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(httpError(504, 'The workflow took too long and was stopped.')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

const execute = async (run) => {
    const handler = handlers.get(run.workflowType);
    const started_ = Date.now();

    try {
        if (!handler) throw httpError(500, `No handler for workflow type ${run.workflowType}`);
        const result = await withTimeout(handler.run(createContext(run)), RUN_TIMEOUT_MS);

        await WorkflowRun.updateOne({ _id: run._id }, {
            $set: { status: 'completed', result, error: '', finishedAt: new Date() },
        });
        console.log(JSON.stringify({ event: 'workflow.completed', type: run.workflowType, runId: String(run._id), correlationId: run.correlationId, ms: Date.now() - started_ }));
    } catch (error) {
        const retry = error.retryable && run.attempts < MAX_ATTEMPTS;
        const message = safeMessage(error);
        console.error(JSON.stringify({ event: retry ? 'workflow.retry' : 'workflow.failed', type: run.workflowType, runId: String(run._id), correlationId: run.correlationId, attempt: run.attempts, error: error.message }));

        if (retry) {
            await WorkflowRun.updateOne({ _id: run._id }, {
                $set: { status: 'queued', error: '', steps: run.steps.map((s) => ({ name: s.name, label: s.label, status: 'pending' })) },
            });
        } else {
            await WorkflowRun.updateOne({ _id: run._id }, {
                $set: { status: 'failed', error: message, finishedAt: new Date() },
            });
            await handler?.onFailed?.(run, message).catch(() => {});
        }
    }
};

const claimNext = () => WorkflowRun.findOneAndUpdate(
    { status: 'queued' },
    { $set: { status: 'running', startedAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, returnDocument: 'after' }
);

async function pump() {
    if (!started) return;

    while (active < CONCURRENCY) {
        let run;
        try {
            run = await claimNext();
        } catch (error) {
            console.error('Job runner: could not claim a run:', error.message);
            return;
        }
        if (!run) return;

        active += 1;
        execute(run).finally(() => {
            active -= 1;
            setImmediate(pump);
        });
    }
}

/** Starts processing. Runs left 'running' by a crash or restart are re-queued (or failed after max attempts). */
const start = async () => {
    if (started) return;
    started = true;

    await WorkflowRun.updateMany(
        { status: 'running', attempts: { $lt: MAX_ATTEMPTS } },
        { $set: { status: 'queued' } }
    );
    await WorkflowRun.updateMany(
        { status: 'running' },
        { $set: { status: 'failed', error: 'The server restarted while this workflow was running. Please start it again.', finishedAt: new Date() } }
    );

    timer = setInterval(pump, POLL_INTERVAL_MS);
    timer.unref();
    setImmediate(pump);
};

const stop = () => {
    started = false;
    if (timer) clearInterval(timer);
    timer = null;
};

/** Waits until no runs are executing in this process (tests). */
const idle = async () => {
    while (active > 0) {
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
};

module.exports = {
    enqueue,
    httpError,
    idle,
    register,
    safeMessage,
    start,
    stop,
};
