const express = require('express');
const router = express.Router();

// Import the controller functions we created earlier
const {
    createProposal,
    getAllProposals,
    getProposalById,
    updateProposal,
    deleteProposal
} = require('../controllers/proposalController');

// This is a clean way to map all HTTP methods for a specific route.

// Requests to the root of our endpoint (e.g., /api/proposals)
router.route('/')
    .post(createProposal)   // Handles POST requests to create a new proposal
    .get(getAllProposals);  // Handles GET requests to fetch all proposals

// Requests that include an ID (e.g., /api/proposals/653a9b1c7b9d8a4f6e8b4c2f)
router.route('/:id')
    .get(getProposalById)   // Handles GET requests for a single proposal
    .put(updateProposal)    // Handles PUT requests to update a proposal
    .delete(deleteProposal);// Handles DELETE requests to delete a proposal

module.exports = router;