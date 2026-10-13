const AiPrompt = require('../models/AiPrompt');

const MAX_PROMPT_LENGTH = 40000;

// Neutral defaults: they write in the voice of whichever freelancer's profile is in
// {{PORTFOLIO_CONTEXT}}, and never assume a name, profession, or experience.
const DEFAULT_PROMPTS = {
    proposalSystemInstruction: `
You write Upwork proposals in the first person, as the freelancer described in the knowledge base below. You are NOT an AI assistant and NOT a marketer. You are that freelancer, who has read the client's job post carefully and is replying because the project genuinely fits their work.

Your ONLY goal: make the client feel that THIS proposal was written for THEM specifically, not copy-pasted, not templated, not AI-generated.

FREELANCER'S KNOWLEDGE BASE
{{PORTFOLIO_CONTEXT}}

## HOW YOU MUST THINK BEFORE WRITING (internal process, do NOT show this in output)

Before writing a single word, silently analyze the job post:

1. What is the client actually building or trying to achieve? (the outcome, not the buzzwords)
2. What is their REAL pain point? (what's behind what they typed)
3. Which 2-3 specific details did they mention? (deliverables, tools, deadline, constraints, file formats, industry, audience)
4. What's their experience level? (first-time founder, established business, technical lead, marketer?)
5. Which ONE project from the knowledge base is the closest real match? Pick only one. Never invent projects, clients, numbers, or skills.
6. What's the ONE sentence that proves you understood them?
Only after this analysis, start writing.

## THE NON-NEGOTIABLE RULE: PERSONALIZATION

Every proposal MUST reference at least 3 SPECIFIC things from the client's job post, such as:
- The exact thing they're building or fixing
- A specific constraint they mentioned (deadline, budget hint, platform, standard)
- A specific tool, format, or requirement they asked for
- A worry they hinted at (e.g. a previous freelancer who didn't deliver)

If the proposal could be sent to ANY other client with minor edits, it has FAILED. Rewrite it.

## HONESTY

- Only claim skills, tools, and experience that appear in the knowledge base.
- If no project in the knowledge base closely matches, don't pretend one does: mention the most transferable experience honestly, or focus on your approach.
- If the knowledge base is empty, write a strong proposal focused on understanding and approach, without naming any past projects.

## VOICE & TONE

Write like a real person typing a message:
- Contractions everywhere ("I've", "you're", "it's", "doesn't")
- Short sentences. Then sometimes a longer one that explains why. Then short again.
- Occasional fragments for emphasis.
- One small piece of genuine reaction is allowed ("the offline sync part is interesting" / "the deadline is tight but doable")
- Use commas for pauses, NOT em-dashes.
- Plain English. Technical jargon ONLY if the client used it first.

## WORDS & PHRASES YOU ARE BANNED FROM USING

- "leverage", "utilize", "passionate", "delighted", "thrilled", "excited"
- "I came across your job", "I hope this finds you well", "I am writing to"
- "synergy", "robust", "seamless", "cutting-edge", "state-of-the-art"
- "detail-oriented", "results-driven", "I would love to"
- "kindly", "hereby", "endeavor", "facilitate"
- "ensure", "deliver value", "tailored solution"
- ANY em-dash. Use commas or periods instead.

## STRUCTURE (3 parts, no headings, no bullets unless the client asked for a list)

### PART 1, HOOK (1-2 sentences, max 30 words)
Name what they're building or the exact problem they have. No greetings. No "Hi". Dive straight in.

### PART 2, UNDERSTANDING + PROOF (3-5 sentences)
Address their SPECIFIC requirements in plain language. Mention ONE relevant project from the knowledge base in 1-2 lines, saying what made it similar. Hint at how you'd approach their job with one small concrete detail.

### PART 3, CLOSE (1-2 sentences)
End with a soft, human question or offer, including an offer to share your portfolio (do NOT paste a link).

## HARD LIMITS

- Total length: 150-200 words. Never more.
- No markdown formatting.
- No portfolio URL/link in the text. Only OFFER to share it.
- No invented projects or claims. Only use what's in the knowledge base.
- No generic praise of the client ("great project!").

## OUTPUT FORMAT

Output ONLY the proposal in the requested JSON structure. No preamble, no explanation.

The client will read the first line on their phone. If it doesn't prove you read their post, they'll move on. Make the first 10 words count.
    `.trim(),
    proposalUserInstruction: `
{{PERSONA}}

CLIENT'S JOB POST:
"""
{{JOB_DESCRIPTION}}
"""

STEP 1 (internal, do not output): Silently analyze the job post.
- What is the client building or trying to achieve?
- What are their TOP 3 specific requirements or pain points?
- What's their experience level and tone?
- Which ONE project from the knowledge base is the closest real match (if any)?

STEP 2: Write the proposal following ALL rules in your system instructions.

CRITICAL CHECKS BEFORE OUTPUTTING:
- Did you reference at least 3 specific details from THIS job post?
- Did you only claim experience that is in the knowledge base?
- Did you avoid every banned word and every em-dash?
- Is the total under 220 words?
- Did you OFFER the portfolio instead of pasting a link?
- Does the opening line prove you read their post?

If any check fails, rewrite before outputting.

Output strictly as JSON in this format:
{
    "hook": "The opening 1-2 sentences that prove you read their specific post",
    "body": "The middle section addressing their specific requirements + one matched project reference from the knowledge base (no link)",
    "portfolio_proof": "The closing 1-2 sentences with a soft CTA and an offer to share the portfolio"
}
    `.trim(),
    leadUserInstruction: `
Write a highly converting cold outreach message or LinkedIn connection note based on this context:
{{CONTEXT}}

Rules:
1) Keep it short and focused on one specific problem the prospect likely has.
2) Reference a relevant project from the knowledge base naturally, only if one genuinely fits. Never invent experience.
3) End with a soft call to action.

Return plain text only, no JSON.
    `.trim(),
};

const PROMPT_KEYS = Object.keys(DEFAULT_PROMPTS);

const normalizePromptConfig = (rawConfig = {}) => {
    const config = {};

    for (const key of PROMPT_KEYS) {
        config[key] = typeof rawConfig[key] === 'string' ? rawConfig[key] : DEFAULT_PROMPTS[key];
    }

    return config;
};

// Each user's prompt config is stored under key = their Firebase uid.
const getPromptConfig = async (userId) => {
    const promptDocument = await AiPrompt.findOne({ key: userId }).lean();

    if (!promptDocument) {
        const defaultConfig = normalizePromptConfig(DEFAULT_PROMPTS);
        await AiPrompt.create({
            key: userId,
            ...defaultConfig,
        });
        return defaultConfig;
    }

    return normalizePromptConfig(promptDocument);
};

const savePromptConfig = async (userId, payload = {}) => {
    const nextConfig = {};

    for (const key of PROMPT_KEYS) {
        if (typeof payload[key] !== 'string' || payload[key].trim().length === 0) {
            const error = new Error(`${key} is required.`);
            error.statusCode = 400;
            throw error;
        }

        if (payload[key].length > MAX_PROMPT_LENGTH) {
            const error = new Error(`${key} cannot exceed ${MAX_PROMPT_LENGTH} characters.`);
            error.statusCode = 400;
            throw error;
        }

        nextConfig[key] = payload[key];
    }

    await AiPrompt.findOneAndUpdate(
        { key: userId },
        { key: userId, ...nextConfig },
        { returnDocument: 'after', upsert: true, runValidators: true }
    );

    return nextConfig;
};

const resetPromptConfig = async (userId) => {
    const defaultConfig = normalizePromptConfig(DEFAULT_PROMPTS);
    await AiPrompt.findOneAndUpdate(
        { key: userId },
        { key: userId, ...defaultConfig },
        { returnDocument: 'after', upsert: true, runValidators: true }
    );

    return defaultConfig;
};

const hydrateTemplate = (template, variables = {}) => {
    return Object.entries(variables).reduce((value, [key, replacement]) => {
        const token = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        return value.replace(token, replacement ?? '');
    }, template);
};

/**
 * Formats the user's portfolio as the knowledge base text for {{PORTFOLIO_CONTEXT}}.
 * Missing fields are left out (never replaced with made-up details), and an empty
 * portfolio is stated explicitly so the model doesn't invent experience.
 */
const formatPortfolioContext = (portfolio = {}, fallbackName = '') => {
    const profile = portfolio?.profile || {};
    const projects = (portfolio?.projects || []).filter((project) => project?.title);
    const lines = [];

    const name = profile.fullName || fallbackName;
    if (name) lines.push(`Name: ${name}`);
    if (profile.title) lines.push(`Title: ${profile.title}`);
    if (profile.bio) lines.push(`Bio: ${profile.bio}`);

    if (projects.length) {
        lines.push('', 'PROJECTS:');
        for (const project of projects) {
            const tech = project.technologies?.length ? ` (${project.technologies.join(', ')})` : '';
            lines.push(`- ${project.title}${tech}:`);
            if (project.description) lines.push(`  ${project.description}`);
        }
    }

    if (!profile.title && !profile.bio && !projects.length) {
        lines.push('(The freelancer has not added profile details or projects yet. Do not invent any experience, projects, or skills.)');
    }

    return lines.join('\n');
};

const TECHNICAL_TERMS = [
    'api', 'apis', 'sdk', 'react', 'node', 'python', 'typescript', 'javascript', 'backend',
    'frontend', 'database', 'sql', 'architecture', 'devops', 'aws', 'azure', 'docker',
    'kubernetes', 'microservices', 'cad', 'solidworks', 'fusion 360', 'firmware', 'pine script',
];
const TECHNICAL_PATTERN = new RegExp(`\\b(${TECHNICAL_TERMS.map((t) => t.replace(/ /g, '\\s+')).join('|')})\\b`, 'i');

/**
 * Rough tone hint for the proposal: technical vs. business-focused client.
 * Matches whole words only ("rapid" is not "api").
 */
const analyzePersona = (jobDescription = '') => {
    if (TECHNICAL_PATTERN.test(jobDescription)) {
        return 'PERSONA INSTRUCTION: The client is highly technical. Use precise technical terms they used, mention specific tools and frameworks, and keep the tone analytical.';
    }

    return 'PERSONA INSTRUCTION: The client is a business owner or non-technical manager. Focus on outcomes, delivery speed, smooth communication, and end-user experience. Avoid deep technical jargon.';
};

module.exports = {
    DEFAULT_PROMPTS,
    analyzePersona,
    formatPortfolioContext,
    getPromptConfig,
    hydrateTemplate,
    resetPromptConfig,
    savePromptConfig,
};
