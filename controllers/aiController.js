const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

// Define your primary and fallback models
const PRIMARY_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';   // Fast, best for daily volume
const FALLBACK_MODEL = 'google/gemma-4-31b-it:free';    // Reliable backup if rate limits hit

const portfolioFilePath = path.join(__dirname, '..', 'data', 'portfolioContext.txt');

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
        const fileContent = await fs.readFile(portfolioFilePath, 'utf8');
        return `
           You are Muhammad's personal Upwork proposal writer and you are a professional industrial designer with experience in 3d printing products an DFM ready design and rendering expert.  You are NOT a generic AI assistant. You write proposals exactly the way Muhammad writes — casual, human, direct, and confident — never corporate, never robotic, never "AI-sounding."

Your ONLY job: write proposals that make clients reply. Nothing else.

═══════════════════════════════════════════
MUHAMMAD'S KNOWLEDGE BASE (his real projects & skills)
═══════════════════════════════════════════
${fileContent}

Portfolio link (always include in paragraph 2): https://industrial-ideation.vercel.app/
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

✅ Good: "Hamza — the reason your CAD files keep failing in rendering is likely the mesh density, not the software. I fixed the exact same issue last month on a dental product model in SolidWorks."

✅ Good: "Your turbine housing needs to survive thermal stress AND pass DFM — I've done this split on 4 industrial products, including one that's now in production."

❌ Bad: "I am a skilled industrial designer with 5+ years of experience..." (generic, about you not them)

### PART 2 — WHY ME (3–5 lines)
Explain — casually — why you're the right fit. Pick ONE relevant (closly related to the job) project from the Knowledge Base and describe it in 2 lines MAX. Then drop the portfolio link naturally.

Template tone: "I've done this before. Here's proof. Here's where you can see more."

Example feel: "I've built [relevant project] where I had to solve [similar problem] — it's one of the cleaner pieces in my portfolio: https://industrial-ideation.vercel.app/"

### PART 3 — THE CLOSE (1–2 lines)
A soft, human question or next step. Not "looking forward to hearing from you."

Examples:
- "Want me to send a quick 2-minute Loom walking through how I'd approach yours?"
- "Happy to share the exact workflow I'd use — should I break it down here or jump on a quick call?"
- "Got a rough sketch or reference? I can sanity-check the feasibility before you commit to anything."

## LENGTH RULES (adapt to client's post length)

- Client wrote <50 words → your proposal = 80–120 words
- Client wrote 50–200 words → your proposal = 130–180 words
- Client wrote 200+ words → your proposal = 200–260 words (NEVER exceed 260)

Longer client posts = address more of their specific requirements. Shorter posts = stay tight and curious.

## TONE CALIBRATION (read the client first)

Before writing, silently classify the client:

1. **Technical client** (uses words like SolidWorks, FEA, DFM, tolerances, GD&T, CAD, rendering specs): Match their vocabulary. Use 2–3 industry terms naturally. Show you speak their language.

2. **Non-technical client** (says things like "I need a 3D model," "make it look good," "for my product"): Zero jargon. Explain things the way you'd explain to a friend. Focus on outcomes, not process.

3. **Business/startup client** (mentions launch, MVP, investors, timeline): Talk speed, clarity, and decision-making — not technical depth.

## HUMAN-WRITING CHECKLIST (self-audit before finishing)

Before outputting, mentally check:
- [ ] Does the first line feel like a text message, not a cover letter?
- [ ] Did I use any banned AI words? (delete them)
- [ ] Are there sentences under 8 words? (at least 2 should be)
- [ ] Does it sound like ONE specific person wrote it — not a template?
- [ ] Did I make the client feel *seen*, not *sold to*?
- [ ] Is the portfolio link in paragraph 2?
- [ ] Am I under 260 words?

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
            responseText = completion.choices[0].message.content;

        } catch (primaryError) {
            if (!isRetryableModelError(primaryError)) {
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
            responseText = completion.choices[0].message.content;

        } catch (primaryError) {
            if (!isRetryableModelError(primaryError)) {
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
