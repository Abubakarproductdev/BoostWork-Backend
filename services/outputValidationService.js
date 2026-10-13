// Deterministic checks on AI proposal drafts. An LLM reviewer is not a guarantee of
// truth, so these rules run on every draft regardless of what the critique says.

const { tokenize } = require('./retrievalService');

const BANNED_PHRASES = [
    'leverage', 'utilize', 'passionate', 'delighted', 'thrilled', 'excited',
    'i came across your job', 'i hope this finds you well', 'i am writing to',
    'synergy', 'robust', 'seamless', 'cutting-edge', 'state-of-the-art',
    'detail-oriented', 'results-driven', 'i would love to',
    'kindly', 'hereby', 'endeavor', 'facilitate',
    'ensure', 'deliver value', 'tailored solution',
];

const DEFAULT_LIMITS = { minWords: 110, maxWords: 230 };

const countWords = (text = '') => (String(text).trim().match(/\S+/g) || []).length;

/** Joins the structured draft into the natural message the client will read. */
const renderProposal = (draft) => {
    const join = (...parts) => parts.map((part) => (part || '').trim()).filter(Boolean).join(' ');
    return [
        draft.hook,
        join(draft.understanding, draft.approach),
        draft.evidence,
        join(draft.question, draft.close),
    ]
        .map((paragraph) => (paragraph || '').trim())
        .filter(Boolean)
        .join('\n\n')
        // Evidence tags are for internal checking only
        .replace(/\s*\[E\d+\]/g, '');
};

const containsPhrase = (lowerText, phrase) => new RegExp(`(^|[^a-z])${phrase.replace(/[-]/g, '[- ]?')}([^a-z]|$)`).test(lowerText);

/**
 * @param {object} draft        structured draft from the model
 * @param {object} context      { evidence: [...retrieved items], jobSkills: [...], profileText, limits }
 * @returns {{ errors: Array, warnings: Array, wordCount: number, text: string }}
 *   errors block acceptance (trigger a revision); warnings are shown to the user.
 */
const validateDraft = (draft, { evidence = [], jobSkills = [], profileText = '', limits = DEFAULT_LIMITS } = {}) => {
    const errors = [];
    const warnings = [];
    const text = renderProposal(draft);
    const lower = text.toLowerCase();
    const wordCount = countWords(text);

    for (const field of ['hook', 'understanding', 'close']) {
        if (!draft[field] || !String(draft[field]).trim()) {
            errors.push({ code: 'missing-field', message: `The "${field}" part is empty.` });
        }
    }

    if (wordCount < limits.minWords) {
        errors.push({ code: 'too-short', message: `The proposal is ${wordCount} words; it should be at least ${limits.minWords}.` });
    } else if (wordCount > limits.maxWords) {
        errors.push({ code: 'too-long', message: `The proposal is ${wordCount} words; it should be at most ${limits.maxWords}.` });
    }

    const validRefs = new Set(evidence.map((item) => item.ref));
    const citedRefs = new Set([
        ...(draft.evidenceRefs || []),
        ...[...JSON.stringify(draft).matchAll(/\bE\d+\b/g)].map((match) => match[0]),
    ]);
    for (const ref of citedRefs) {
        if (!validRefs.has(ref)) {
            errors.push({ code: 'unknown-evidence', message: `The draft cites ${ref}, which is not one of the retrieved portfolio projects.` });
        }
    }

    for (const phrase of BANNED_PHRASES) {
        if (containsPhrase(lower, phrase)) {
            errors.push({ code: 'banned-phrase', message: `Uses the banned phrase "${phrase}".` });
        }
    }

    if (text.includes('—')) {
        errors.push({ code: 'em-dash', message: 'Uses an em-dash; use commas or periods instead.' });
    }

    if (/https?:\/\/|www\./i.test(text)) {
        errors.push({ code: 'link', message: 'Contains a link; the proposal should only offer to share the portfolio.' });
    }

    if (/\*\*|^#{1,6}\s|^\s*[-*•]\s/m.test(text)) {
        errors.push({ code: 'markdown', message: 'Uses markdown formatting or bullet points.' });
    }

    // Skills the job asks for that the proposal mentions but nothing in the
    // profile or retrieved projects supports. Mentioning the client's need is fine;
    // the user should double-check that no experience is being claimed.
    const supportTokens = new Set(tokenize([
        profileText,
        ...evidence.map((item) => `${item.title} ${item.technologies.join(' ')} ${item.description}`),
    ].join(' ')));
    const draftTokens = new Set(tokenize(text));
    for (const skill of jobSkills) {
        const skillTokens = tokenize(skill);
        if (!skillTokens.length) continue;
        const mentioned = skillTokens.every((token) => draftTokens.has(token));
        const supported = skillTokens.every((token) => supportTokens.has(token));
        if (mentioned && !supported) {
            warnings.push({
                code: 'unsupported-skill',
                message: `Mentions "${skill}", but your profile and projects don't show experience with it. Make sure the proposal isn't claiming it.`,
            });
        }
    }

    return { errors, warnings, wordCount, text };
};

module.exports = {
    BANNED_PHRASES,
    DEFAULT_LIMITS,
    countWords,
    renderProposal,
    validateDraft,
};
