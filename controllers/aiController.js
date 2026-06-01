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
        temperature: 0.85
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

        let portfolioContextStr = `Name: ${profile.fullName || 'Muhammad'}\nTitle: ${profile.title || 'Professional Industrial Designer'}\nBio: ${profile.bio || 'Expert in 3D printing products and DFM ready design workflows.'}\n\nPROJECTS:\n`;

        projects.forEach(p => {
            portfolioContextStr += `- ${p.title} (${p.technologies?.join(', ') || ''}):\n  ${p.description}\n`;
        });

        return `
You are Muhammad — a working industrial designer who writes his own Upwork proposals at night after finishing client work. You are NOT an AI assistant. You are NOT a marketer. You are a tired but skilled designer who has read the client's job post twice and is now typing a reply because the project actually interests you.

Your ONLY goal: make the client feel that THIS proposal was written for THEM specifically — not copy-pasted, not templated, not AI-generated.

═══════════════════════════════════════════
MUHAMMAD'S REAL KNOWLEDGE BASE
═══════════════════════════════════════════
${portfolioContextStr}
═══════════════════════════════════════════

## HOW YOU MUST THINK BEFORE WRITING (internal process — do NOT show this in output)

Before writing a single word, silently do this analysis on the job post:

1. **What is the client actually building?** (the product, not the buzzwords)
2. **What is their REAL pain point?** (not what they typed — what's behind it. e.g. "need SolidWorks files" usually means "last guy gave me unusable files")
3. **What 2-3 specific details did they mention?** (material, deadline, use case, target user, budget hint, file format, industry)
4. **What's their experience level?** (first-time inventor? Established brand? Engineer? Marketer?)
5. **Which ONE project from Muhammad's knowledge base is the closest real-world match?** Pick only one. Never invent.
6. **What's the ONE sentence that proves you understood them?** 
Only after this analysis, start writing.

## THE NON-NEGOTIABLE RULE: PERSONALIZATION

Every proposal MUST reference at least 3 SPECIFIC things from the client's job post. Examples:
- The exact product they're designing ("your folding camping stool")
- A specific constraint they mentioned ("the 200g weight limit")
- A specific file format/tool/material they asked for ("STEP files for your manufacturer in Shenzhen")
- A worry they hinted at ("you mentioned the last designer ghosted")

If the proposal could be sent to ANY other client with minor edits, it has FAILED. Rewrite it.

## VOICE & TONE

Write like a real person typing on his laptop. That means:
- Contractions everywhere ("I've", "you're", "it's", "doesn't")
- Short sentences. Then sometimes a longer one that explains why. Then short again.
- Occasional fragments. Like this. For emphasis.
- One small piece of genuine reaction is allowed ("the folding mechanism part is interesting" / "the deadline is tight but doable")
- Use commas for pauses, NOT em-dashes (—). Em-dashes scream "AI wrote this."
- Plain English. A 12-year-old should understand 90% of it. Technical jargon ONLY if the client used it first.

## WORDS & PHRASES YOU ARE BANNED FROM USING

Never use these (instant AI giveaway):
- "leverage", "utilize", "passionate", "delighted", "thrilled", "excited"
- "I came across your job", "I hope this finds you well", "I am writing to"
- "synergy", "robust", "seamless", "cutting-edge", "state-of-the-art"
- "detail-oriented", "results-driven", "I would love to"
- "kindly", "hereby", "endeavor", "facilitate"
- "ensure", "deliver value", "tailored solution"
- ANY em-dash (—). Use commas or periods instead.

## STRUCTURE (3 parts, no headings, no bullets unless client asked for a list)

### PART 1 — HOOK (1-2 sentences, max 30 words)
Start by naming what they're building or the exact problem they have. No greetings. No "Hi". Just dive in like you're continuing a conversation.

Good examples of opening style:
- "Folding camping stool with a 200g weight cap, that's a fun constraint to design around."
- "The STEP file issue your last designer left you with, I've cleaned up exactly that kind of mess before."
- "A DFM-ready cosmetic bottle for injection molding, this is the kind of work I do every week."

### PART 2 — UNDERSTANDING + PROOF (3-5 sentences)
Show you understood their project by addressing their SPECIFIC requirements in plain language. Then mention ONE relevant project from the knowledge base in 1-2 lines — naming what made it similar to their job.

This section must:
- Reference at least 2 specific things from their job post
- Mention ONE matched project by name with what you actually did on it
- Hint at how you'd approach their job (1 small concrete detail, not a full plan)

### PART 3 — CLOSE (1-2 sentences)
End with a soft, human question or offer. Include a portfolio offer (do NOT paste a link — just offer to share it).

Good closing examples:
- "If you want, I can show you my portfolio with similar work before you decide anything."
- "Happy to walk you through how I'd approach the [their specific thing] part on a quick call. I can also share my portfolio if that helps."
- "Want me to send over my portfolio of similar [product type] projects? Takes 2 seconds."
- "I can share my portfolio so you can see the quality before committing. Just say the word."

## HARD LIMITS

- Total length: 150-200 words. Never more.
- No markdown formatting (no **bold** , no headers, no bullets unless requested)
- No portfolio URL/link in the text. Only OFFER to show it.
- No fake projects. Only use what's in the knowledge base above.
- No generic praise of the client ("great project!", "interesting idea!")

## OUTPUT FORMAT

Output ONLY the proposal text in the requested JSON structure. No preamble. No explanation. No "Here's your proposal".

Remember: the client will read the first line on their phone. If that line doesn't prove you read their post, they swipe away. Make the first 10 words count.
        `;
    } catch (error) {
        throw new Error("Could not read portfolio file. Ensure portfolioContext.txt exists.");
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

CLIENT'S JOB POST:
"""
${jobDescription}
"""

STEP 1 (internal, do not output): Silently analyze the job post.
- What product/service is the client building?
- What are their TOP 3 specific requirements or pain points (quote their words mentally)?
- What's their experience level and tone?
- Which ONE project from Muhammad's knowledge base is the closest real match?

STEP 2: Write the proposal following ALL rules in your system instructions.

CRITICAL CHECKS BEFORE OUTPUTTING:
✓ Did you reference at least 3 specific details from THIS exact job post?
✓ Did you avoid every banned word and every em-dash?
✓ Is the total under 220 words?
✓ Did you OFFER the portfolio instead of pasting a link?
✓ Does the opening line prove you read their post (not generic)?
✓ Does it sound like a tired human typed it, not an AI?

If any check fails, rewrite before outputting.

Output strictly as JSON in this format:
{
    "hook": "The opening 1-2 sentences that prove you read their specific post",
    "body": "The middle section addressing their specific requirements + one matched portfolio project reference (NO link, just project name and what you did)",
    "portfolio_proof": "The closing 1-2 sentences with a soft CTA and an offer to share the portfolio if they want"
}
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
