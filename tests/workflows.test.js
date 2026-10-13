// End-to-end tests for background workflows (proposal, research, strategy) on the real
// Express app and an in-memory MongoDB, with a scripted model, search and page fetcher.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { startTestDb } = require('./helpers/testDb');
const { createApp } = require('../app');
const { setTokenVerifierForTests } = require('../middleware/auth');
const { setModelForTests } = require('../services/modelGateway');
const { setSearchForTests } = require('../services/searchProvider');
const { setFetchForTests } = require('../services/researchService');
const jobRunner = require('../services/workflows');
const ResearchSource = require('../models/ResearchSource');

let mongo;
let server;
let baseUrl;
const modelCalls = [];

const api = async (method, path, { as, body } = {}) => {
    const headers = {};
    if (as) headers.Authorization = `Bearer token-${as}`;
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, json: await response.json().catch(() => null) };
};

const waitFor = async (path, as, isDone = (d) => ['completed', 'failed'].includes(d.status)) => {
    for (let i = 0; i < 200; i += 1) {
        const { json } = await api('GET', path, { as });
        const data = json?.data;
        if (data && isDone(data)) return data;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for ${path}`);
};

const words = (n, word = 'detail') => Array.from({ length: n }, () => word).join(' ');

const cleanDraft = {
    hook: 'Your React admin dashboard for live shipment tracking needs fast tables and clear status views.',
    understanding: `You want drivers and dispatchers on one screen, with filters that stay quick as data grows. ${words(40)}`,
    approach: `I'd start with the data model and the map view, then build the tables. ${words(40)}`,
    evidence: 'I built a logistics dashboard with React and Node for realtime tracking, which is very close to this.',
    question: 'Which carrier APIs do you use today?',
    close: 'Happy to share my portfolio of similar dashboards if that helps.',
    evidenceRefs: ['E1'],
    uncertainties: ['Unsure which map provider they prefer.'],
};

const scriptedModel = async ({ stage, messages }) => {
    modelCalls.push(stage);
    const user = messages[1].content;
    const reply = (obj) => ({ text: JSON.stringify(obj), model: 'test-model', usage: { prompt_tokens: 100, completion_tokens: 50 } });

    switch (stage) {
        case 'analyze':
            return reply({
                clientProblem: 'Needs a dashboard to track shipments live.',
                deliverables: ['Admin dashboard'],
                skills: ['React', 'Node', 'Kubernetes'],
                constraints: ['4 weeks'],
                desiredOutcome: 'Fewer missed deliveries',
                experienceLevel: 'Intermediate',
                unknowns: ['Carrier APIs'],
                explicitRequirements: ['React'],
                inferredRequirements: ['Map view'],
                keywords: ['dashboard', 'tracking', 'logistics'],
                clientTone: 'technical',
            });
        case 'strategy':
            return reply({
                openingFocus: 'Live tracking dashboard',
                evidenceRefs: ['E1', 'E9'],
                evidenceRationale: 'E1 is a logistics dashboard',
                approachSteps: ['Data model', 'Tables'],
                clarificationQuestion: 'Which carrier APIs?',
                avoidClaims: ['Kubernetes experience'],
                tone: 'Technical',
                targetWords: 160,
            });
        case 'draft':
            // First draft breaks a rule (banned word) so the workflow must revise
            return reply({ ...cleanDraft, hook: 'I can leverage my experience to build your React tracking dashboard quickly.' });
        case 'critique':
            return reply({
                scores: { relevance: 4, specificity: 4, evidenceQuality: 4, tone: 4, opening: 4, length: 4 },
                issues: [],
                unsupportedClaims: [],
                verdict: 'pass',
                summary: 'Solid.',
            });
        case 'revise':
            assert.match(user, /banned phrase "leverage"/, 'revision is told about the rule violation');
            return reply(cleanDraft);
        case 'research-plan':
            return reply({ queries: ['react freelance demand 2026', 'react developer rates 2026'], evidenceNeeded: ['demand'] });
        case 'research-extract': {
            const relevant = !user.includes('ref="S3"');
            return reply({ relevant, claims: relevant ? [{ claim: 'React demand is growing.', quote: 'demand grew 20%' }] : [], publishedAt: '' });
        }
        case 'research-synthesize':
            return reply({
                summary: 'Demand for React work is growing [S1].',
                findings: [
                    { statement: 'React demand grew.', category: 'trend', sourceRefs: ['S1', 'S99'], confidence: 'high', limitations: '' },
                    { statement: 'Unsupported claim.', category: 'trend', sourceRefs: ['S77'], confidence: 'low', limitations: '' },
                ],
                conflicts: [],
                gaps: ['No rate data.'],
            });
        case 'profile-audit':
        case 'performance-analysis':
        case 'market-strategy':
            return reply({
                summary: `Report for ${stage}.`,
                findings: [
                    { statement: 'Bio is vague.', category: 'positioning', evidence: 'Bio says "dev".', sourceRefs: [stage === 'market-strategy' ? 'S1' : stage === 'profile-audit' ? 'P' : 'M0'], confidence: 'medium', limitations: '' },
                    { statement: 'Made up.', category: 'x', evidence: '', sourceRefs: ['ZZ'], confidence: 'low', limitations: '' },
                ],
                recommendations: [{
                    title: 'Rewrite the title',
                    description: 'Be specific.',
                    rationale: 'Clarity',
                    sourceRefs: ['P', 'NOPE'],
                    estimatedEffort: 'low',
                    expectedBenefit: 'Clearer positioning',
                    dependencies: '',
                    before: 'Developer',
                    after: 'React dashboard developer',
                    confidence: 'medium',
                }],
                limitations: [],
            });
        default:
            throw new Error(`Unexpected model stage: ${stage}`);
    }
};

test.before(async () => {
    mongo = await startTestDb();
    await mongoose.connect(mongo.uri);

    setTokenVerifierForTests(async (token) => {
        const match = /^token-(.+)$/.exec(token);
        if (!match) throw new Error('invalid token');
        return { uid: match[1], email: `${match[1]}@test.dev`, name: match[1] };
    });
    setModelForTests(scriptedModel);
    // Pages on "rates" hosts state no publication date
    setFetchForTests(async (url) => ({ ok: true, url, title: `Page ${url}`, publishedAt: url.includes('rates') ? '' : '2026-09-01', publisher: '', text: `Content of ${url}` }));

    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    await jobRunner.start();
});

test.after(async () => {
    jobRunner.stop();
    await jobRunner.idle();
    setTokenVerifierForTests(null);
    setModelForTests(null);
    setSearchForTests(null);
    setFetchForTests(null);
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo?.stop();
});

test('proposal workflow runs every stage, revises rule violations and only cites real evidence', async () => {
    await api('POST', '/api/portfolio', {
        as: 'alice',
        body: {
            profile: { fullName: 'Alice', title: 'React developer', bio: 'I build dashboards.' },
            projects: [
                { title: 'Logo design', technologies: ['Figma'], description: 'Brand work' },
                { title: 'Logistics dashboard', technologies: ['React', 'Node.js'], description: 'Realtime tracking dashboard' },
            ],
            links: [],
        },
    });

    const started = await api('POST', '/api/ai/proposal-workflows', {
        as: 'alice',
        body: { title: 'React tracking dashboard', jobDescription: 'We need a React developer to build a logistics tracking dashboard with a Node backend.' },
    });
    assert.equal(started.status, 202);
    const run = await waitFor(`/api/ai/proposal-workflows/${started.json.data.id}`, 'alice');

    assert.equal(run.status, 'completed', run.error);
    assert.deepEqual(run.steps.map((s) => s.status), ['completed', 'completed', 'completed', 'completed', 'completed', 'completed']);

    const result = run.result;
    assert.equal(result.revisions, 1);
    assert.equal(result.passedChecks, true);
    assert.deepEqual(result.validation.errors, []);
    assert.doesNotMatch(result.proposalText, /leverage|\[E\d+\]/);
    assert.deepEqual(result.strategy.evidenceRefs, ['E1'], 'non-existent evidence ref E9 is dropped');
    assert.equal(result.evidence[0].title, 'Logistics dashboard', 'the best keyword match ranks first');
    assert.equal(result.evidence[0].used, true);
    assert.ok(result.validation.warnings.some((w) => /Kubernetes/.test(w.message)) === false, 'unmentioned skills are not flagged');
    assert.ok(run.usage.modelCalls >= 6);

    // Another user can't see it
    assert.equal((await api('GET', `/api/ai/proposal-workflows/${run.id}`, { as: 'bob' })).status, 404);
});

test('proposal workflow validates input', async () => {
    assert.equal((await api('POST', '/api/ai/proposal-workflows', { as: 'alice', body: { title: 'x', jobDescription: 'short' } })).status, 400);
});

test('research is refused with a clear message when no search provider is configured', async () => {
    setSearchForTests(null);
    const response = await api('POST', '/api/research/jobs', { as: 'carol', body: { question: 'What is the demand for React freelancers?' } });
    assert.equal(response.status, 503);
    assert.match(response.json.message, /SEARCH_PROVIDER/);
    assert.equal((await api('GET', '/api/research/status', { as: 'carol' })).json.data.configured, false);
});

test('research cites only real sources and records source metadata', async () => {
    setSearchForTests(async (query) => [
        { title: 'A', url: 'https://news.example.com/a?utm_source=x', snippet: 's', publishedAt: '2026-08-01' },
        { title: 'A dup', url: 'https://news.example.com/a', snippet: 's', publishedAt: '' },
        { title: 'B', url: `https://blog.example.org/${encodeURIComponent(query)}`, snippet: 's', publishedAt: '2020-01-01' },
    ]);

    const started = await api('POST', '/api/research/jobs', { as: 'carol', body: { question: 'What is the demand for React freelancers?' } });
    assert.equal(started.status, 202);
    const run = await waitFor(`/api/research/jobs/${started.json.data.id}`, 'carol');

    assert.equal(run.status, 'completed', run.error);
    const { result } = run;
    assert.equal(result.sources.length, 3, 'duplicate URL removed after stripping tracking params');
    assert.equal(result.findings.length, 1, 'finding citing only unknown sources is removed');
    assert.deepEqual(result.findings[0].sourceRefs, ['S1']);
    assert.ok(result.gaps.some((g) => /removed/.test(g)));
    assert.equal(result.sources.find((s) => s.ref === 'S3').relevant, false);

    const saved = await ResearchSource.find({ userId: 'carol' }).lean();
    assert.equal(saved.length, 3);
    assert.ok(saved.every((s) => s.retrievedAt && s.url));

    assert.equal((await api('GET', `/api/research/jobs/${run.id}`, { as: 'dave' })).status, 404);
});

test('profile audit fails clearly on an empty profile', async () => {
    const started = await api('POST', '/api/strategy/profile-audit', { as: 'erin' });
    assert.equal(started.status, 202);
    const report = await waitFor(`/api/strategy/reports/${started.json.data.reportId}`, 'erin', (d) => ['completed', 'failed'].includes(d.status));
    assert.equal(report.status, 'failed');
    assert.match(report.error, /profile is empty/);
});

test('profile audit report keeps only valid references and supports recommendation status', async () => {
    const started = await api('POST', '/api/strategy/profile-audit', { as: 'alice' });
    const report = await waitFor(`/api/strategy/reports/${started.json.data.reportId}`, 'alice', (d) => ['completed', 'failed'].includes(d.status));

    assert.equal(report.status, 'completed', report.error);
    assert.equal(report.findings.length, 1, 'finding with invalid ref removed');
    assert.deepEqual(report.recommendations[0].sourceRefs, ['P']);
    assert.equal(report.recommendations[0].after, 'React dashboard developer');

    const recId = report.recommendations[0]._id;
    const patched = await api('PATCH', `/api/strategy/reports/${report._id}/recommendations/${recId}`, { as: 'alice', body: { userStatus: 'accepted' } });
    assert.equal(patched.json.data.userStatus, 'accepted');

    assert.equal((await api('PATCH', `/api/strategy/reports/${report._id}/recommendations/${recId}`, { as: 'bob', body: { userStatus: 'rejected' } })).status, 404);
    assert.equal((await api('PATCH', `/api/strategy/reports/${report._id}/recommendations/${recId}`, { as: 'alice', body: { userStatus: 'bogus' } })).status, 400);
    assert.equal((await api('GET', `/api/strategy/reports/${report._id}`, { as: 'bob' })).status, 404);

    const list = await api('GET', '/api/strategy/reports', { as: 'alice' });
    assert.ok(list.json.data.some((r) => String(r._id) === String(report._id)));
    assert.equal((await api('GET', '/api/strategy/reports', { as: 'bob' })).json.data.length, 0);
});

test('performance analysis reports insufficient data without calling the model', async () => {
    const before = modelCalls.filter((s) => s === 'performance-analysis').length;
    const started = await api('POST', '/api/strategy/performance-analysis', { as: 'frank' });
    const report = await waitFor(`/api/strategy/reports/${started.json.data.reportId}`, 'frank', (d) => ['completed', 'failed'].includes(d.status));

    assert.equal(report.status, 'completed', report.error);
    assert.match(report.summary, /too few/);
    assert.equal(report.metrics.totals.n, 0);
    assert.equal(modelCalls.filter((s) => s === 'performance-analysis').length, before);
});

test('performance analysis interprets computed statistics when there is enough data', async () => {
    for (let i = 0; i < 6; i += 1) {
        await api('POST', '/api/proposals', {
            as: 'gina',
            body: {
                title: `Job ${i}`,
                status: i < 2 ? 'responded' : 'submitted',
                jobDetails: { description: 'A job description long enough.', jobPostedDate: '2026-09-01' },
                budget: { amount: 800, type: 'fixed' },
            },
        });
    }

    const started = await api('POST', '/api/strategy/performance-analysis', { as: 'gina' });
    const report = await waitFor(`/api/strategy/reports/${started.json.data.reportId}`, 'gina', (d) => ['completed', 'failed'].includes(d.status));

    assert.equal(report.status, 'completed', report.error);
    assert.equal(report.metrics.totals.n, 6);
    assert.equal(report.metrics.totals.responseRatePct, 33.3);
    assert.deepEqual(report.findings.map((f) => f.sourceRefs), [['M0']]);
});

test('market research builds a cited strategy report', async () => {
    setSearchForTests(async () => [
        { title: 'Trends', url: 'https://trends.example.com/react', snippet: 's', publishedAt: '2026-07-01' },
        { title: 'Rates', url: 'https://rates.example.net/react', snippet: 's', publishedAt: '' },
    ]);

    const started = await api('POST', '/api/strategy/market-research', { as: 'alice', body: { focus: 'React dashboard work' } });
    assert.equal(started.status, 202);
    const report = await waitFor(`/api/strategy/reports/${started.json.data.reportId}`, 'alice', (d) => ['completed', 'failed'].includes(d.status));

    assert.equal(report.status, 'completed', report.error);
    assert.ok(report.sourceRefs.some((s) => s.kind === 'web' && s.url === 'https://trends.example.com/react'));
    assert.deepEqual(report.findings.map((f) => f.sourceRefs), [['S1']]);
    assert.ok(report.limitations.some((l) => /no publication date/.test(l)));
});

test('a user cannot have unlimited workflows running at once', async () => {
    // Model calls wait until released, so the runs stay active during the check
    let release;
    const gate = new Promise((_, reject) => {
        release = () => reject(Object.assign(new Error('released'), { expose: true }));
    });
    gate.catch(() => {});
    setModelForTests(() => gate);
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
        statuses.push((await api('POST', '/api/ai/proposal-workflows', {
            as: 'henry',
            body: { title: 'Busy job', jobDescription: 'A long enough job description for testing.' },
        })).status);
    }
    assert.deepEqual(statuses, [202, 202, 202, 429]);
    release();
    await jobRunner.idle();
});
