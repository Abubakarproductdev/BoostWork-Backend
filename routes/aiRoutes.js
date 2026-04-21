const express = require('express');
const router = express.Router();

const {
    generateProposal,
    generateLead
} = require('../controllers/aiController');

// Main endpoint for generating proposals
router.route('/generate-proposal').post(generateProposal);

// Endpoint for generating cold outreach leads
router.route('/generate-lead').post(generateLead);

module.exports = router;