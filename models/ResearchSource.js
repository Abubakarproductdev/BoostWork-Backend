const mongoose = require('mongoose');

// A public web page used as evidence in a research run. Only metadata and the short
// excerpts the report relied on are kept, not full page copies.
const researchSourceSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    runId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reportIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    ref: { type: String, required: true }, // S1, S2, ... within the run
    url: { type: String, required: true },
    title: { type: String, default: '' },
    domain: { type: String, default: '' },
    publisher: { type: String, default: '' },
    publishedAt: { type: String, default: '' }, // as stated by the page or search provider, may be empty
    retrievedAt: { type: Date, required: true },
    sourceType: { type: String, default: 'web' },
    searchProvider: { type: String, default: '' },
    excerpts: { type: [String], default: [] },
    relevanceNotes: { type: String, default: '' },
    fetchError: { type: String, default: '' },
}, {
    timestamps: true,
});

module.exports = mongoose.model('ResearchSource', researchSourceSchema);
