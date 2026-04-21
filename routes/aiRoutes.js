const express = require('express');
const router = express.Router();

const {
    generateProposal
} = require('../controllers/aiController');

// Main endpoint for generating proposals
router.route('/generate-proposal').post(generateProposal);



module.exports = router;