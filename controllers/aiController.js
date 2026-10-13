const cacheService = require('../services/cacheService');
const {
    getPromptConfig,
    hydrateTemplate,
    resetPromptConfig,
    savePromptConfig,
} = require('../services/promptService');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const getGroqApiKey = () => {
    const apiKey = process.env.GROQ_API_KEY?.trim() || process.env.GROK_API_KEY?.trim();

    if (!apiKey) {
        const error = new Error('GROQ_API_KEY is missing in Backend/.env');
        error.statusCode = 500;
        throw error;
    }

    return apiKey;
};

const generateWithGroq = async ({ systemInstruction, userPrompt, responseFormat }) => {
    const payload = {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
    };

    if (responseFormat) {
        payload.response_format = responseFormat;
    }

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getGroqApiKey()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Groq API error (${response.status}): ${errorText}`);
        error.statusCode = response.status;
        throw error;
    }

    const responseData = await response.json();
    const responseText = responseData?.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
        throw new Error('Groq returned an empty response. Please try again.');
    }

    return responseText;
};

const buildPortfolioContext = async (user) => {
    try {
        const portfolioData = await cacheService.getPortfolioContext(user.uid);
        const profile = portfolioData?.profile || {};
        const projects = portfolioData?.projects || [];

        let portfolioContextStr = `Name: ${profile.fullName || user.name || 'Freelancer'}\nTitle: ${profile.title || 'Professional Industrial Designer'}\nBio: ${profile.bio || 'Expert in 3D printing products and DFM ready design workflows.'}\n\nPROJECTS:\n`;

        projects.forEach((project) => {
            portfolioContextStr += `- ${project.title} (${project.technologies?.join(', ') || ''}):\n  ${project.description}\n`;
        });

        return portfolioContextStr;
    } catch (error) {
        throw new Error('Could not read portfolio context from the database.');
    }
};

const analyzePersona = (jobDescription) => {
    const text = jobDescription.toLowerCase();
    const isTechnical = text.includes('api')
        || text.includes('react')
        || text.includes('architecture')
        || text.includes('solidworks')
        || text.includes('pine script');

    if (isTechnical) {
        return 'PERSONA INSTRUCTION: The client is highly technical. Use strict engineering terms, mention specific frameworks, and keep the tone analytical and precise.';
    }

    return 'PERSONA INSTRUCTION: The client is a business owner or non-technical manager. Focus on ROI, delivery speed, smooth communication, and end-user experience. Avoid deep code jargon.';
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

        console.log(`Generating proposal with ${GROQ_MODEL}...`);
        const responseText = await generateWithGroq({
            systemInstruction,
            userPrompt: finalPrompt,
            responseFormat: { type: 'json_object' },
        });

        const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const proposalData = JSON.parse(cleanJsonStr);

        return res.status(200).json({
            success: true,
            modelUsed: GROQ_MODEL,
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

        console.log(`Generating lead with ${GROQ_MODEL}...`);
        const responseText = await generateWithGroq({
            systemInstruction,
            userPrompt: finalPrompt,
        });

        return res.status(200).json({
            success: true,
            modelUsed: GROQ_MODEL,
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
