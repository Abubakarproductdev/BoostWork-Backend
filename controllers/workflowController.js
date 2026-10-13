// Endpoints that start background workflows and report their progress.

const mongoose = require('mongoose');
const jobRunner = require('../services/jobRunner');
const searchProvider = require('../services/searchProvider');
const WorkflowRun = require('../models/WorkflowRun');
const StrategyReport = require('../models/StrategyReport');

const RECOMMENDATION_STATUSES = ['new', 'accepted', 'rejected', 'completed'];

const sendError = (res, error, fallback) => {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    if (status === 500) console.error(fallback, error);
    return res.status(status).json({ success: false, message: status === 500 ? fallback : error.message });
};

const badRequest = (res, message) => res.status(400).json({ success: false, message });

/** Shape returned to the browser: progress and result, never internal fields. */
const presentRun = (run) => ({
    id: run._id,
    workflowType: run.workflowType,
    status: run.status,
    steps: run.steps,
    result: run.status === 'completed' ? run.result : null,
    error: run.error,
    reportId: run.reportId,
    input: run.workflowType === 'proposal'
        ? { title: run.input?.title, jobDescription: run.input?.jobDescription }
        : { question: run.input?.question, focus: run.input?.focus },
    usage: run.usage,
    createdAt: run.createdAt,
    finishedAt: run.finishedAt,
});

const getOwnRun = async (req, res, workflowTypes) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        badRequest(res, 'Invalid workflow ID.');
        return null;
    }

    const run = await WorkflowRun.findOne({ _id: req.params.id, userId: req.user.uid, workflowType: { $in: workflowTypes } }).lean();
    if (!run) {
        res.status(404).json({ success: false, message: 'Workflow not found.' });
        return null;
    }
    return run;
};

// ---------- Proposal workflows ----------

exports.startProposalWorkflow = async (req, res) => {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const jobDescription = typeof req.body.jobDescription === 'string' ? req.body.jobDescription.trim() : '';

    if (title.length < 3 || title.length > 200) return badRequest(res, 'Job title must be 3-200 characters.');
    if (jobDescription.length < 20) return badRequest(res, 'Job description must be at least 20 characters long.');
    if (jobDescription.length > 15000) return badRequest(res, 'Job description is too long (max 15,000 characters).');

    try {
        const run = await jobRunner.enqueue({
            userId: req.user.uid,
            workflowType: 'proposal',
            input: { title, jobDescription, userName: req.user.name },
        });
        return res.status(202).json({ success: true, data: presentRun(run) });
    } catch (error) {
        return sendError(res, error, 'Could not start the proposal workflow.');
    }
};

exports.getProposalWorkflow = async (req, res) => {
    try {
        const run = await getOwnRun(req, res, ['proposal']);
        if (run) res.status(200).json({ success: true, data: presentRun(run) });
    } catch (error) {
        sendError(res, error, 'Could not read the workflow.');
    }
};

// ---------- Research ----------

exports.researchStatus = (_req, res) => {
    res.status(200).json({ success: true, data: { configured: searchProvider.isConfigured(), provider: searchProvider.providerName() || null } });
};

exports.startResearch = async (req, res) => {
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
    if (question.length < 10 || question.length > 500) return badRequest(res, 'The research question must be 10-500 characters.');
    if (!searchProvider.isConfigured()) {
        return res.status(503).json({ success: false, message: 'Web research is not set up yet. Add SEARCH_PROVIDER and SEARCH_API_KEY to the backend settings.' });
    }

    try {
        const run = await jobRunner.enqueue({ userId: req.user.uid, workflowType: 'research', input: { question } });
        return res.status(202).json({ success: true, data: presentRun(run) });
    } catch (error) {
        return sendError(res, error, 'Could not start the research.');
    }
};

exports.getResearch = async (req, res) => {
    try {
        const run = await getOwnRun(req, res, ['research']);
        if (run) res.status(200).json({ success: true, data: presentRun(run) });
    } catch (error) {
        sendError(res, error, 'Could not read the research.');
    }
};

exports.listResearch = async (req, res) => {
    try {
        const runs = await WorkflowRun.find({ userId: req.user.uid, workflowType: 'research' })
            .sort({ createdAt: -1 }).limit(30).select('-result.sources.excerpts').lean();
        res.status(200).json({ success: true, data: runs.map(presentRun) });
    } catch (error) {
        sendError(res, error, 'Could not list research.');
    }
};

// ---------- Strategy reports ----------

const startReport = (reportType) => async (req, res) => {
    const focus = typeof req.body?.focus === 'string' ? req.body.focus.trim().slice(0, 300) : '';
    if (reportType === 'market-research' && !searchProvider.isConfigured()) {
        return res.status(503).json({ success: false, message: 'Market research needs web search. Add SEARCH_PROVIDER and SEARCH_API_KEY to the backend settings.' });
    }

    let report;
    try {
        report = await StrategyReport.create({ userId: req.user.uid, reportType, focus, status: 'queued' });
        const run = await jobRunner.enqueue({ userId: req.user.uid, workflowType: reportType, input: { focus }, reportId: report._id });
        await StrategyReport.updateOne({ _id: report._id }, { $set: { runId: run._id } });
        return res.status(202).json({ success: true, data: { reportId: report._id, run: presentRun(run) } });
    } catch (error) {
        if (report) await StrategyReport.deleteOne({ _id: report._id }).catch(() => {});
        return sendError(res, error, 'Could not start the report.');
    }
};

exports.startProfileAudit = startReport('profile-audit');
exports.startPerformanceAnalysis = startReport('performance-analysis');
exports.startMarketResearch = startReport('market-research');

exports.listReports = async (req, res) => {
    try {
        const reports = await StrategyReport.find({ userId: req.user.uid })
            .sort({ createdAt: -1 }).limit(50)
            .select('reportType status title focus summary createdAt updatedAt runId error recommendations.userStatus')
            .lean();
        res.status(200).json({ success: true, data: reports });
    } catch (error) {
        sendError(res, error, 'Could not list reports.');
    }
};

exports.getReport = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return badRequest(res, 'Invalid report ID.');

    try {
        const report = await StrategyReport.findOne({ _id: req.params.id, userId: req.user.uid }).lean();
        if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

        const run = report.runId ? await WorkflowRun.findOne({ _id: report.runId, userId: req.user.uid }).lean() : null;
        return res.status(200).json({ success: true, data: { ...report, run: run ? presentRun(run) : null } });
    } catch (error) {
        return sendError(res, error, 'Could not read the report.');
    }
};

exports.updateRecommendation = async (req, res) => {
    const { id, recommendationId } = req.params;
    const { userStatus } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(recommendationId)) {
        return badRequest(res, 'Invalid report or recommendation ID.');
    }
    if (!RECOMMENDATION_STATUSES.includes(userStatus)) {
        return badRequest(res, `userStatus must be one of: ${RECOMMENDATION_STATUSES.join(', ')}.`);
    }

    try {
        const report = await StrategyReport.findOneAndUpdate(
            { _id: id, userId: req.user.uid, 'recommendations._id': recommendationId },
            { $set: { 'recommendations.$.userStatus': userStatus } },
            { returnDocument: 'after' }
        ).lean();
        if (!report) return res.status(404).json({ success: false, message: 'Recommendation not found.' });
        return res.status(200).json({ success: true, data: report.recommendations.find((r) => String(r._id) === recommendationId) });
    } catch (error) {
        return sendError(res, error, 'Could not update the recommendation.');
    }
};

exports.deleteReport = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return badRequest(res, 'Invalid report ID.');

    try {
        const report = await StrategyReport.findOne({ _id: req.params.id, userId: req.user.uid });
        if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
        if (['queued', 'running'].includes(report.status)) {
            return res.status(409).json({ success: false, message: 'This report is still being generated. Delete it after it finishes.' });
        }
        await report.deleteOne();
        return res.status(200).json({ success: true, message: 'Report deleted.' });
    } catch (error) {
        return sendError(res, error, 'Could not delete the report.');
    }
};
