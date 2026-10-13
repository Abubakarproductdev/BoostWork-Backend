const express = require('express');
const router = express.Router();

const {
    generateProposal,
    generateLead,
    getPrompts,
    resetPrompts,
    updatePrompts
} = require('../controllers/aiController');

// Editable prompt settings used by AI generation
router.route('/prompts')
    .get(getPrompts)
    .put(updatePrompts);

router.route('/prompts/reset')
    .post(resetPrompts);

// Main endpoint for generating proposals
router.route('/generate-proposal').post(generateProposal);

// Endpoint for generating cold outreach leads
router.route('/generate-lead').post(generateLead);

module.exports = router;
