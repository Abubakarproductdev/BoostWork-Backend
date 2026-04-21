// Import the Proposal model we created. This is how we interact with the 'proposals' collection.
const Proposal = require('../models/Proposal');
const mongoose = require('mongoose');
const { validateProposalPayload } = require('../middleware/security');

/**
 * @desc    Create a new proposal.
 * @route   POST /api/proposals
 * @access  Private (for a single user)
 * 
 * This function handles two key scenarios from your requirements:
 * 1.  From "Proposal Writing": A new job is added with just a title and description.
 *     The frontend should send this data, and it will be saved as a 'draft'.
 * 2.  From "Add Job": The user manually fills out a detailed form.
 * 
 * Mongoose will automatically validate against the schema. If required fields
 * like `title` or `jobDetails.description` are missing, it will throw an error.
 */
exports.createProposal = async (req, res) => {
    try {
        const validation = validateProposalPayload(req.body);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors[0],
                errors: validation.errors,
            });
        }

        // req.body will contain all the data sent from your React form.
        // We create a new Proposal document in memory using this data.
        const newProposal = new Proposal(req.body);

        // We save the document to the MongoDB database. This is an async operation.
        const savedProposal = await newProposal.save();

        // Respond with a 201 'Created' status and the saved document.
        // Sending the document back is useful for the frontend to update its state.
        res.status(201).json({
            success: true,
            data: savedProposal,
        });
    } catch (error) {
        // If Mongoose validation fails (e.g., a required field is missing),
        // it will be caught here.
        console.error('Error creating proposal:', error.message);
        res.status(400).json({
            success: false,
            message: 'Failed to create proposal. Please check your input.',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all proposals for the dashboard.
 * @route   GET /api/proposals
 * @access  Private
 * 
 * This fetches all jobs to display on your "proposal performance" page.
 * We sort by `createdAt` in descending order to show the most recent jobs first.
 */
exports.getAllProposals = async (req, res) => {
    try {
        const proposals = await Proposal.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: proposals.length,
            data: proposals,
        });
    } catch (error) {
        console.error('Error fetching all proposals:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not fetch proposals.',
        });
    }
};

/**
 * @desc    Get a single proposal by its ID.
 * @route   GET /api/proposals/:id
 * @access  Private
 * 
 * This is used when you click on a job to open the detailed view.
 */
exports.getProposalById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid proposal ID.',
            });
        }

        const proposal = await Proposal.findById(req.params.id);

        if (!proposal) {
            return res.status(404).json({ 
                success: false, 
                message: 'Proposal not found with that ID.' 
            });
        }

        res.status(200).json({
            success: true,
            data: proposal,
        });
    } catch (error) {
        console.error('Error fetching proposal by ID:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not fetch proposal.',
        });
    }
};

/**
 * @desc    Update an existing proposal.
 * @route   PUT /api/proposals/:id
 * @access  Private
 * 
 * This is the crucial function for your workflow. When you have an 'incomplete'
 * proposal (status: 'draft') and you fill in the rest of the details and save,
 * this function will be called to update the document in the database.
 */
exports.updateProposal = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid proposal ID.',
            });
        }

        const validation = validateProposalPayload(req.body);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors[0],
                errors: validation.errors,
            });
        }

        // Find the proposal by the ID passed in the URL
        const proposal = await Proposal.findById(req.params.id);

        if (!proposal) {
            return res.status(404).json({ 
                success: false, 
                message: 'Proposal not found with that ID.' 
            });
        }

        // Use findByIdAndUpdate for efficiency. It finds and updates in one go.
        // req.body contains the fields you want to change.
        // { new: true } ensures the updated document is returned.
        // { runValidators: true } ensures any new data still meets schema rules.
        const updatedProposal = await Proposal.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            {
                new: true,
                runValidators: true,
            }
        );

        res.status(200).json({
            success: true,
            data: updatedProposal,
        });
    } catch (error) {
        console.error('Error updating proposal:', error.message);
        res.status(400).json({
            success: false,
            message: 'Failed to update proposal.',
            error: error.message,
        });
    }
};


/**
 * @desc    Delete a proposal.
 * @route   DELETE /api/proposals/:id
 * @access  Private
 * 
 * For house-cleaning, in case you want to remove a job entry entirely.
 */
exports.deleteProposal = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid proposal ID.',
            });
        }

        const proposal = await Proposal.findByIdAndDelete(req.params.id);

        if (!proposal) {
            return res.status(404).json({ 
                success: false, 
                message: 'Proposal not found with that ID.' 
            });
        }

        // You can also send a 204 'No Content' response which has no body.
        res.status(200).json({
            success: true,
            message: 'Proposal deleted successfully.',
        });
    } catch (error) {
        console.error('Error deleting proposal:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not delete proposal.',
        });
    }
};
