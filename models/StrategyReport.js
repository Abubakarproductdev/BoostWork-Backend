const mongoose = require('mongoose');

const sourceRefSchema = new mongoose.Schema({
    ref: String, // e.g. S1 (web source), P (profile), E1 (portfolio project), M (metric)
    kind: { type: String, enum: ['web', 'profile', 'project', 'metric'], default: 'web' },
    title: String,
    url: String,
    publishedAt: String,
    retrievedAt: Date,
    // Web sources only: quality flags shown next to the citation
    domain: String,
    relevant: Boolean,
    outdated: Boolean,
    fetched: Boolean,
}, { _id: false });

const findingSchema = new mongoose.Schema({
    statement: { type: String, required: true },
    category: { type: String, default: '' },
    evidence: { type: String, default: '' },
    sourceRefs: { type: [String], default: [] },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    limitations: { type: String, default: '' },
});

const recommendationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    rationale: { type: String, default: '' },
    sourceRefs: { type: [String], default: [] },
    estimatedEffort: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    expectedBenefit: { type: String, default: '' },
    dependencies: { type: String, default: '' },
    // Optional before/after copy (profile audit)
    before: { type: String, default: '' },
    after: { type: String, default: '' },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    userStatus: { type: String, enum: ['new', 'accepted', 'rejected', 'completed'], default: 'new' },
});

const strategyReportSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    reportType: { type: String, required: true, enum: ['profile-audit', 'performance-analysis', 'market-research'] },
    status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued' },
    title: { type: String, default: '' },
    focus: { type: String, default: '' },
    runId: { type: mongoose.Schema.Types.ObjectId, default: null },
    summary: { type: String, default: '' },
    findings: { type: [findingSchema], default: [] },
    recommendations: { type: [recommendationSchema], default: [] },
    sourceRefs: { type: [sourceRefSchema], default: [] },
    limitations: { type: [String], default: [] },
    // Deterministic numbers the report was based on (performance analysis)
    metrics: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: '' },
    nextReviewDate: Date,
}, {
    timestamps: true,
});

strategyReportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('StrategyReport', strategyReportSchema);
