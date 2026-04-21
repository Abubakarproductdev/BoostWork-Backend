const mongoose = require('mongoose');
const { Schema } = mongoose;

// Changed variable name to 'proposalSchema' for clarity
const proposalSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Job title is required.'],
        trim: true,
    },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'viewed', 'responded', 'won', 'lost', 'archived'],
        default: 'draft',
    },

    // --- Job & Client Details ---
    jobDetails: {
        description: {
            type: String,
            required: [true, 'Job description is required.'],
        },
        url: String,
        platform: { type: String, default: 'Upwork' },
        connectsCost: Number,
        // ADD THIS FIELD: When was the job originally posted?
        jobPostedDate: { 
            type: Date,
            required: true,
        },
    },

    clientInfo: {
        // ... all your clientInfo fields are perfect, no change needed
        name: String,
        region: String,
        hireRate: Number,
        totalSpent: Number,
        memberSince: String,
        rating: Number,
        isPaymentVerified: Boolean,
        persona: {
            type: String,
            enum: ['technical', 'non-technical', 'direct', 'detailed', 'unknown'],
            default: 'unknown',
        }
    },

    // --- Analytics & Tracking ---
    budget: {
        type: { type: String },
        amount: Number,
        currency: { type: String, default: 'USD' }
    },
    
    // CHANGE THESE TO DATE TYPE
    submissionDate: Date, // The exact timestamp when you hit "apply"
    viewedDate: Date,
    responseDate: Date,
    hiredDate: Date,

    finalEarnings: Number, 
    proposalText: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Proposal', proposalSchema);
