const mongoose = require('mongoose');

const aiPromptSchema = new mongoose.Schema({
    // One prompt config per user; `key` holds the Firebase uid (kept unique as before).
    key: {
        type: String,
        required: true,
        unique: true,
    },
    proposalSystemInstruction: {
        type: String,
        required: true,
    },
    proposalUserInstruction: {
        type: String,
        required: true,
    },
    leadUserInstruction: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('AiPrompt', aiPromptSchema);
