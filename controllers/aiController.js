const cacheService = require('../services/cacheService');
const {
    analyzePersona,
    formatPortfolioContext,
    getPromptConfig,
    hydrateTemplate,
    resetPromptConfig,
    savePromptConfig,
} = require('../services/promptService');

const { chat, modelFor } = require('../services/modelGateway');

// Quick single-call generation (the multi-stage workflow lives in proposalWorkflowService).
const generateWithGroq = async ({ systemInstruction, userPrompt, responseFormat }) => {
    const response = await chat({
        tier: 'fast',
        system: systemInstruction,
        user: userPrompt,
        json: responseFormat?.type === 'json_object',
        temperature: 0.85,
    });
    return response.text;
};

const buildPortfolioContext = async (user) => {
    let portfolioData;
    try {
        portfolioData = await cacheService.getPortfolioContext(user.uid);
    } catch (error) {
        throw new Error('Could not read portfolio context from the database.');
    }

    return formatPortfolioContext(portfolioData, user.name);
};

/**
 * @desc    Get editable AI prompt instructions
 * @route   GET /api/ai/prompts
 */
exports.getPrompts = async (req, res) => {
    try {
        const prompts = await getPromptConfig(req.user.uid);

        return res.status(200).json({
            success: true,
            data: prompts,
        });
    } catch (error) {
        console.error('Prompt Read Failure:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to read prompt settings.',
        });
    }
};

/**
 * @desc    Save editable AI prompt instructions
 * @route   PUT /api/ai/prompts
 */
exports.updatePrompts = async (req, res) => {
    try {
        const prompts = await savePromptConfig(req.user.uid, req.body);

        return res.status(200).json({
            success: true,
            message: 'AI prompt settings updated.',
            data: prompts,
        });
    } catch (error) {
        console.error('Prompt Save Failure:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to save prompt settings.',
        });
    }
};

/**
 * @desc    Reset editable AI prompt instructions to defaults
 * @route   POST /api/ai/prompts/reset
 */
exports.resetPrompts = async (req, res) => {
    try {
        const prompts = await resetPromptConfig(req.user.uid);

        return res.status(200).json({
            success: true,
            message: 'AI prompt settings reset to defaults.',
            data: prompts,
        });
    } catch (error) {
        console.error('Prompt Reset Failure:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to reset prompt settings.',
        });
    }
};

/**
 * @desc    Generate a proposal using Groq-hosted Llama
 * @route   POST /api/ai/generate-proposal
 */
exports.generateProposal = async (req, res) => {
    const { jobDescription } = req.body;

    if (!jobDescription) {
        return res.status(400).json({ success: false, message: 'Job description is required.' });
    }

    if (typeof jobDescription !== 'string' || jobDescription.trim().length < 20) {
        return res.status(400).json({ success: false, message: 'Job description must be at least 20 characters long.' });
    }

    if (jobDescription.length > 15000) {
        return res.status(400).json({ success: false, message: 'Job description is too long.' });
    }

    try {
        const promptConfig = await getPromptConfig(req.user.uid);
        const portfolioContext = await buildPortfolioContext(req.user);
        const systemInstruction = hydrateTemplate(promptConfig.proposalSystemInstruction, {
            PORTFOLIO_CONTEXT: portfolioContext,
        });
        const finalPrompt = hydrateTemplate(promptConfig.proposalUserInstruction, {
            PERSONA: analyzePersona(jobDescription),
            JOB_DESCRIPTION: jobDescription,
        });

        console.log(`Generating proposal with ${modelFor('fast')}...`);
        const responseText = await generateWithGroq({
            systemInstruction,
            userPrompt: finalPrompt,
            responseFormat: { type: 'json_object' },
        });

        const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const proposalData = JSON.parse(cleanJsonStr);

        return res.status(200).json({
            success: true,
            modelUsed: modelFor('fast'),
            data: proposalData,
        });
    } catch (error) {
        console.error('Total Generation Failure:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate proposal.',
        });
    }
};

/**
 * @desc    Generate a cold outreach message
 * @route   POST /api/ai/generate-lead
 */
exports.generateLead = async (req, res) => {
    const { context } = req.body;

    if (!context || typeof context !== 'string' || context.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'Valid context is required.' });
    }

    try {
        const promptConfig = await getPromptConfig(req.user.uid);
        const portfolioContext = await buildPortfolioContext(req.user);
        const systemInstruction = hydrateTemplate(promptConfig.proposalSystemInstruction, {
            PORTFOLIO_CONTEXT: portfolioContext,
        });
        const finalPrompt = hydrateTemplate(promptConfig.leadUserInstruction, {
            CONTEXT: context,
        });

        console.log(`Generating lead with ${modelFor('fast')}...`);
        const responseText = await generateWithGroq({
            systemInstruction,
            userPrompt: finalPrompt,
        });

        return res.status(200).json({
            success: true,
            modelUsed: modelFor('fast'),
            data: responseText.trim(),
        });
    } catch (error) {
        console.error('Total Lead Generation Failure:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate lead message.',
        });
    }
};
