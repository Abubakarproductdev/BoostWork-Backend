const cacheService = require('../services/cacheService');

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
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.35
    };

    if (responseFormat) {
        payload.response_format = responseFormat;
    }

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getGroqApiKey()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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

/**
 * Helper: Reads your portfolio data to act as the AI brain
 */
const getSystemContext = async () => {
    try {
        const portfolioData = await cacheService.getPortfolioContext();
        const profile = portfolioData?.profile || {};
        const projects = portfolioData?.projects || [];
        const links = portfolioData?.links || [];

        let portfolioContextStr = `Name: ${profile.fullName || 'Muhammad'}
Title: ${profile.title || 'Professional Industrial Designer'}
Bio: ${profile.bio || 'Expert in 3D printing products and DFM ready design workflows.'}

PROJECTS:
`;

        projects.forEach((project) => {
            portfolioContextStr += `- ${project.title} (${project.technologies?.join(', ') || ''}):
  ${project.description}
`;
        });

        return `
You are Muhammad's personal Upwork proposal writer. You are a professional industrial designer with experience in 3D printing products, DFM-ready design, and rendering. You are not a generic AI assistant.

Your only job: write proposals that make clients reply.

Muhammad knowledge base:
${portfolioContextStr}
Portfolio link (always include naturally): ${links[0]?.url || 'https://industrial-ideation.vercel.app/'}

Core writing philosophy:
- Direct, warm, slightly casual
- Confident but never arrogant
- Mention one portfolio item closely related to the job
- Use simple words unless the client is technical
- Keep sentences short and human
- Avoid buzzwords and robotic language

Absolute rules:
- Never invent projects or skills outside the knowledge base
- Never open with generic greetings
- Never write more than 260 words
- No bullet points unless the client asked for a list

Proposal structure:
1) Hook: one line about their specific pain point and one proof signal
2) Why me: one relevant project and natural portfolio mention
3) Close: one soft, human call to action

Output format:
Return only the proposal text, no markdown, no explanation.
`;
    } catch (error) {
        throw new Error('Could not read portfolio data from cache service.');
    }
};

/**
 * Helper: Analyze the job description to infer persona
 */
const analyzePersona = (jobDescription) => {
    const text = jobDescription.toLowerCase();
    const isTechnical = text.includes('api') || text.includes('react') || text.includes('architecture') || text.includes('solidworks') || text.includes('pine script');

    if (isTechnical) {
        return 'PERSONA INSTRUCTION: The client is highly technical. Use strict engineering terms, mention specific frameworks, and keep the tone analytical and precise.';
    }

    return 'PERSONA INSTRUCTION: The client is a business owner or non-technical manager. Focus on ROI, delivery speed, smooth communication, and end-user experience. Avoid deep code jargon.';
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
        const systemInstruction = await getSystemContext();
        const persona = analyzePersona(jobDescription);

        const finalPrompt = `
${persona}

Write a proposal for this exact job description:
${jobDescription}

Format output strictly as a JSON object with keys: hook, body, portfolio_proof.
`;

        console.log(`Generating proposal with ${GROQ_MODEL}...`);
        const responseText = await generateWithGroq({
            systemInstruction,
            userPrompt: finalPrompt,
            responseFormat: { type: 'json_object' }
        });

        const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const proposalData = JSON.parse(cleanJsonStr);

        return res.status(200).json({
            success: true,
            modelUsed: GROQ_MODEL,
            data: proposalData
        });
    } catch (error) {
        console.error('Total Generation Failure:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate proposal.'
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
        const systemInstruction = await getSystemContext();

        const finalPrompt = `
Write a highly converting cold outreach message or LinkedIn connection note based on this context:
${context}

Rules:
1) Keep it short and focused on one specific problem.
2) Reference a relevant project from the knowledge base naturally.
3) End with a soft call to action.

Return plain text only, no JSON.
`;

        console.log(`Generating lead with ${GROQ_MODEL}...`);
        const responseText = await generateWithGroq({
            systemInstruction,
            userPrompt: finalPrompt
        });

        return res.status(200).json({
            success: true,
            modelUsed: GROQ_MODEL,
            data: responseText.trim()
        });
    } catch (error) {
        console.error('Total Lead Generation Failure:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate lead message.'
        });
    }
};
