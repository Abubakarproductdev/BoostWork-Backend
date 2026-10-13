const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
    name: { type: String, required: true },
    label: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'], default: 'pending' },
    startedAt: Date,
    finishedAt: Date,
    detail: { type: String, default: '' },
}, { _id: false });

// One background job (proposal workflow, research, strategy report) and its progress.
const workflowRunSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    workflowType: {
        type: String,
        required: true,
        enum: ['proposal', 'research', 'profile-audit', 'performance-analysis', 'market-research'],
    },
    status: {
        type: String,
        enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
        default: 'queued',
        index: true,
    },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    steps: { type: [stepSchema], default: [] },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    // Safe, user-facing error message (no provider bodies or stack traces)
    error: { type: String, default: '' },
    attempts: { type: Number, default: 0 },
    correlationId: { type: String, required: true },
    // Linked StrategyReport for strategy workflows
    reportId: { type: mongoose.Schema.Types.ObjectId, default: null },
    usage: {
        modelCalls: { type: Number, default: 0 },
        promptTokens: { type: Number, default: 0 },
        completionTokens: { type: Number, default: 0 },
    },
    startedAt: Date,
    finishedAt: Date,
}, {
    timestamps: true,
});

workflowRunSchema.index({ status: 1, createdAt: 1 });
workflowRunSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WorkflowRun', workflowRunSchema);
