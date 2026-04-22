const OpenAI = require('openai');
const cacheService = require('../services/cacheService');

// Define your primary and fallback models
const PRIMARY_MODEL = 'google/gemma-4-31b-it:free';   // Fast, best for daily volume
const FALLBACK_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';    // Reliable backup if rate limits hit

const getGenAIClient = () => {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (!apiKey) {
        const error = new Error('OPENROUTER_API_KEY is missing in Backend/.env');
        error.statusCode = 500;
        throw error;
    }

    return new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
    });
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
        const portfolioData = await cacheService.getPortfolioContext();
        const profile = portfolioData?.profile || {};
        const projects = portfolioData?.projects || [];
        const links = portfolioData?.links || [];

        let portfolioContextStr = `Name: ${profile.fullName || 'Muhammad'}\nTitle: ${profile.title || 'Professional Industrial Designer'}\nBio: ${profile.bio || 'Expert in 3D printing products and DFM ready design workflows.'}\n\nPROJECTS:\n`;

        projects.forEach(p => {
            portfolioContextStr += `- ${p.title} (${p.technologies?.join(', ') || ''}):\n  ${p.description}\n`;
        });

        return `
           You are Muhammad's personal Upwork proposal writer and you are a professional industrial designer with experience in 3d printing products an DFM ready design and rendering expert.  You are NOT a generic AI assistant. You write proposals exactly the way Muhammad writes — casual, human, direct, and confident — never corporate, never robotic, never "AI-sounding."

Your ONLY job: write proposals that make clients reply. Nothing else.

═══════════════════════════════════════════
MUHAMMAD'S KNOWLEDGE BASE (his real projects & skills)
═══════════════════════════════════════════
${portfolioContextStr}

Portfolio link (always include in paragraph 2): ${links[0]?.url || 'https://industrial-ideation.vercel.app/'}
═══════════════════════════════════════════

## CORE WRITING PHILOSOPHY

Write like a human talking to another human over coffee — not like a freelancer "applying for a job." Muhammad's voice is:
- Direct, warm, slightly casual
- Confident but never arrogant
- you must mention the portfolio item which is closly related to that job 
- Uses simple words a 12-year-old could understand (unless the client is technical)
- Short sentences. Sometimes fragments. Like this.
-  do not Uses em-dashes (—) naturally, use commas for every pause
- Zero buzzwords, zero fluff, zero "I am writing to express my interest"
- Sounds like a real person typed it at 11pm, not a template

## ABSOLUTE RULES (never break these)
❌ NEVER talk about fake projects or invent projects that are not found in my portfolio. Never Lie.
❌ NEVER start with: "Hi", "Hello", "Dear", "Greetings", "I hope this finds you well", "I came across your job"
❌ NEVER use: "leverage", "utilize", "synergy", "passionate", "detail-oriented", "I am excited", "I would love to", "delighted", "kindly", "hereby"
❌ NEVER use em-dashes as a crutch in every sentence
❌ NEVER invent skills, tools, or projects not in the Knowledge Base
❌ NEVER write more than 260 words total
❌ NEVER use bullet points unless the client's job post specifically asked for a list

## PROPOSAL STRUCTURE (3 parts, strict order)

### PART 1 — THE HOOK (first 1.5 lines MAX)
This is the mobile preview. If this fails, nothing else matters.

Formula: [Client's name if given] — [one-sentence solution to their exact pain point] + [one micro-proof point].

The hook must:
- Name their specific problem (not a generic version of it)
- Offer a clear, simple fix in plain English
- Drop ONE proof number/result/project name (not a resume dump)


### PART 2 — WHY ME (3–5 lines)
Explain — casually — why you're the right fit. Pick ONE relevant (closly related to the job) project from the Knowledge Base and describe it in 2 lines MAX. Then drop the portfolio link naturally.

Template tone: "I've done this before. Here's proof. Here's where you can see more."

Example feel: "I've built [relevant project] where I had to solve [similar problem] — it's one of the cleaner pieces in my portfolio: https://industrial-ideation.vercel.app/"

### PART 3 — THE CLOSE (1–2 lines)
A soft, human question or next step. Not "looking forward to hearing from you." and a Call to action statement- MUST.

Examples:
- "Want me to send a quick 2-minute Loom walking through how I'd approach yours?"
- "Happy to share the exact workflow I'd use — should I break it down here or jump on a quick call?"
- "Got a rough sketch or reference? I can sanity-check the feasibility before you commit to anything."



## OUTPUT FORMAT

Output ONLY the proposal text. No preamble like "Here's your proposal:". No explanations. No markdown formatting (no **bold**, no headers). Just the raw proposal exactly as it would be pasted into Upwork.

Now read the client's job post carefully, identify their real pain point (not just what they literally asked for), and write the proposal.
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

        // 4. Try Primary Model (OpenRouter)
        let responseText;
        let modelUsed = PRIMARY_MODEL;
        try {
            console.log(`Attempting generation with ${PRIMARY_MODEL}...`);
            const completion = await genAI.chat.completions.create({
                model: PRIMARY_MODEL,
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: finalPrompt }
                ]
            });

            if (!completion || !completion.choices || completion.choices.length === 0) {
                console.error("OpenRouter Error response:", completion);
                throw new Error("OpenRouter API Key issue, provider offline, or rate limit hit. API returned an empty/malformed response.");
            }

            responseText = completion.choices[0].message.content;

        } catch (primaryError) {
            if (!isRetryableModelError(primaryError) && !primaryError.message.includes("OpenRouter")) {
                throw primaryError;
            }

            console.warn(`Primary model failed (Rate limit or error). Falling back to ${FALLBACK_MODEL}...`);

            // 5. Fallback Mechanism (OpenRouter)
            modelUsed = FALLBACK_MODEL;
            const fallbackCompletion = await genAI.chat.completions.create({
                model: FALLBACK_MODEL,
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: finalPrompt }
                ]
            });

            if (!fallbackCompletion || !fallbackCompletion.choices || fallbackCompletion.choices.length === 0) {
                throw new Error("Fallback failed. Both models returned empty responses. Please verify your API Key and credits.");
            }

            responseText = fallbackCompletion.choices[0].message.content;
        }

        // Parse the JSON. Clean markdown block if models return ```json ... ```
        const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const proposalData = JSON.parse(cleanJsonStr);

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
            const completion = await genAI.chat.completions.create({
                model: PRIMARY_MODEL,
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: finalPrompt }
                ]
            });

            if (!completion || !completion.choices || completion.choices.length === 0) {
                console.error("OpenRouter Lead Gen Error response:", completion);
                throw new Error("OpenRouter API returned an empty/malformed response.");
            }

            responseText = completion.choices[0].message.content;

        } catch (primaryError) {
            if (!isRetryableModelError(primaryError) && !primaryError.message.includes("OpenRouter")) {
                throw primaryError;
            }

            console.warn(`Primary model failed for lead gen. Falling back to ${FALLBACK_MODEL}...`);
            modelUsed = FALLBACK_MODEL;
            const fallbackCompletion = await genAI.chat.completions.create({
                model: FALLBACK_MODEL,
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: finalPrompt }
                ]
            });

            if (!fallbackCompletion || !fallbackCompletion.choices || fallbackCompletion.choices.length === 0) {
                throw new Error("Fallback lead generation failed. Please verify your API Key.");
            }

            responseText = fallbackCompletion.choices[0].message.content;
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
