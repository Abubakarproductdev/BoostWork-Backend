const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

// Define your primary and fallback models
const PRIMARY_MODEL = 'gemini-3-flash-preview';   // Fast, best for daily volume
const FALLBACK_MODEL = 'gemini-1.5-flash-001';    // Reliable backup if rate limits hit

const portfolioFilePath = path.join(__dirname, '..', 'data', 'portfolioContext.txt');

const getGenAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
        const error = new Error('GEMINI_API_KEY is missing in Backend/.env');
        error.statusCode = 500;
        throw error;
    }

    return new GoogleGenerativeAI(apiKey);
};

const isRetryableModelError = (error) => {
    const message = `${error?.message || ''}`.toLowerCase();

    return (
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('resource_exhausted') ||
        message.includes('unavailable') ||
        message.includes('timeout')
    );
};

/**
 * Helper: Reads your portfolio file to act as the AI's "Brain"
 */
const getSystemContext = async () => {
    try {
        const fileContent = await fs.readFile(portfolioFilePath, 'utf8');
        return `
            You are the expert proposal writer for Muhammad, a highly skilled freelancer.
            Your ONLY goal is to write Upwork proposals that get clients to reply.
            
            --- MUHAMMAD'S KNOWLEDGE BASE ---
            ${fileContent}
            --- END KNOWLEDGE BASE ---
            
            RULES FOR WRITING:
            1. NO greetings like "Hi", "Hello", or "Dear Hiring Manager". 
            2. The very first sentence MUST be a 'Hook' that directly addresses the client's biggest technical or business problem. for example,Hi Mark — I can build this WordPress plugin to import CSVs and map fields — I’ve done 7 similar imports for ecommerce stores (example attached).”
•	“Hi Sara — I can write a landing page that converts your trial users into paying customers (I increased conversions 24% for Client X).”
Make the very first two lines a one-sentence solution + one proof point — that’s the mobile preview and it must hook.

            3. Briefly explain the exact procedure to solve their problem.
            4. Include ONLY ONE relevant project from the Knowledge Base (e.g., SIVO for AI/React, AgriMind for multi-agent, or the 3D Miswak/Marker models for CAD) in exactly 2 lines to prove competence.
            5. Never hallucinate skills outside the Knowledge Base.
        `;
    } catch (error) {
        throw new Error("Could not read portfolio file. Ensure portfolioContext.txt exists.");
    }
};

/**
 * Helper: Analyzes the job description to determine the client's persona
 */
const analyzePersona = (jobDescription) => {
    const text = jobDescription.toLowerCase();

    // Scan for technical jargon
    const isTechnical = text.includes('api') || text.includes('react') || text.includes('architecture') || text.includes('solidworks') || text.includes('pine script');

    if (isTechnical) {
        return "PERSONA INSTRUCTION: The client is highly technical. Use strict engineering terms, mention specific frameworks, and keep the tone analytical and precise.";
    } else {
        return "PERSONA INSTRUCTION: The client is a business owner or non-technical manager. Focus heavily on ROI, delivery speed, smooth communication, and end-user experience. Avoid deep code jargon.";
    }
};

/**
 * @desc    Generate a proposal with Model Fallback
 * @route   POST /api/ai/generate-proposal
 */
exports.generateProposal = async (req, res) => {
    const { jobDescription } = req.body;

    if (!jobDescription) {
        return res.status(400).json({ success: false, message: "Job description is required." });
    }

    if (typeof jobDescription !== 'string' || jobDescription.trim().length < 20) {
        return res.status(400).json({ success: false, message: 'Job description must be at least 20 characters long.' });
    }

    if (jobDescription.length > 15000) {
        return res.status(400).json({ success: false, message: 'Job description is too long.' });
    }

    try {
        const genAI = getGenAIClient();

        // 1. Get Muhammad's entire history and rules (The Brain)
        const systemInstruction = await getSystemContext();

        // 2. Figure out who we are talking to
        const persona = analyzePersona(jobDescription);

        // 3. Assemble the final prompt
        const finalPrompt = `
            ${persona}
            
            Write a proposal for this exact job description:
            "${jobDescription}"
            
            Format the output strictly as JSON:
            {
                "hook": "The opening 1-2 sentences",
                "body": "The procedure and explanation",
                "portfolio_proof": "The 2-line reference to a past project"
            }
        `;

        // 4. Try Primary Model (Gemini 3 Flash)
        let responseText;
        let modelUsed = PRIMARY_MODEL;
        try {
            console.log(`Attempting generation with ${PRIMARY_MODEL}...`);
            const model = genAI.getGenerativeModel({
                model: PRIMARY_MODEL,
                systemInstruction: systemInstruction,
                generationConfig: { responseMimeType: "application/json" } // Forces JSON output
            });
            const result = await model.generateContent(finalPrompt);
            responseText = result.response.text();

        } catch (primaryError) {
            if (!isRetryableModelError(primaryError)) {
                throw primaryError;
            }

            console.warn(`Primary model failed (Rate limit or error). Falling back to ${FALLBACK_MODEL}...`);

            // 5. Fallback Mechanism (Gemini 1.5 Flash)
            modelUsed = FALLBACK_MODEL;
            const fallbackModel = genAI.getGenerativeModel({
                model: FALLBACK_MODEL,
                systemInstruction: systemInstruction,
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await fallbackModel.generateContent(finalPrompt);
            responseText = result.response.text();
        }

        // Parse the guaranteed JSON string into a real object
        const proposalData = JSON.parse(responseText);

        // 6. Send it to the frontend dashboard
        res.status(200).json({
            success: true,
            modelUsed,
            data: proposalData
        });

    } catch (error) {
        console.error('Total Generation Failure:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate proposal.'
        });
    }
};

/**
 * @desc    Generate a cold outreach message/lead generation message
 * @route   POST /api/ai/generate-lead
 */
exports.generateLead = async (req, res) => {
    const { context } = req.body;

    if (!context || typeof context !== 'string' || context.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'Valid context is required.' });
    }

    try {
        const genAI = getGenAIClient();
        const systemInstruction = await getSystemContext();

        const finalPrompt = `
            Write a highly converting cold outreach message/LinkedIn connection note based on this context:
            "${context}"
            
            RULES:
            1. Keep it short, focused on solving a specific problem.
            2. Reference a relevant project from the Knowledge Base naturally.
            3. End with a soft call to action.
            
            Format the output string directly, NO JSON. Just plain text.
        `;

        let responseText;
        let modelUsed = PRIMARY_MODEL;
        try {
            console.log(`Attempting lead generation with ${PRIMARY_MODEL}...`);
            const model = genAI.getGenerativeModel({
                model: PRIMARY_MODEL,
                systemInstruction: systemInstruction,
            });
            const result = await model.generateContent(finalPrompt);
            responseText = result.response.text();

        } catch (primaryError) {
            if (!isRetryableModelError(primaryError)) {
                throw primaryError;
            }

            console.warn(`Primary model failed for lead gen. Falling back to ${FALLBACK_MODEL}...`);
            modelUsed = FALLBACK_MODEL;
            const fallbackModel = genAI.getGenerativeModel({
                model: FALLBACK_MODEL,
                systemInstruction: systemInstruction,
            });
            const result = await fallbackModel.generateContent(finalPrompt);
            responseText = result.response.text();
        }

        res.status(200).json({
            success: true,
            modelUsed,
            data: responseText.trim()
        });

    } catch (error) {
        console.error('Total Lead Generation Failure:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate lead message.'
        });
    }
};
