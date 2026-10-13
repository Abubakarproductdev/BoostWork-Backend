// Keyword-based portfolio retrieval. Portfolios are small, so instead of vector
// embeddings we score each project against the job with weighted keyword matching
// (title and technologies count more than description; terms that appear in many
// projects count less). Every project gets an evidence ref (E1, E2, ...) so drafts
// can be checked against the projects they claim to use.

const STOPWORDS = new Set(`a about above after again all also am an and any are as at be because been before being
below between both but by can could did do does doing down during each few for from further had has have having he
her here hers him his how i if in into is it its itself just me more most my need needs no nor not now of off on once
only or other our ours out over own same she should so some such than that the their them then there these they this
those through to too under until up very was we were what when where which while who whom why will with would you your
yours looking want wants someone person freelancer job project work help please hi hello thanks thank us able must
etc ie eg get make like using use used new good great experience experienced expert required requirement requirements
skills skill strong plus bonus ideal candidate role team long term short time hour hours week weeks day days month
months budget fixed price rate pay paid quick quickly asap`.split(/\s+/));

// Normalise common spellings so "Node.js", "nodejs" and "node" match.
const ALIASES = {
    'node.js': 'node', nodejs: 'node', 'react.js': 'react', reactjs: 'react', 'vue.js': 'vue', vuejs: 'vue',
    'next.js': 'nextjs', 'nuxt.js': 'nuxt', 'express.js': 'express', expressjs: 'express', js: 'javascript',
    ts: 'typescript', postgres: 'postgresql', mongo: 'mongodb', k8s: 'kubernetes', 'c#': 'csharp', '.net': 'dotnet',
    'c++': 'cpp', golang: 'go', ai: 'ai', ml: 'machine-learning', ui: 'ui', ux: 'ux',
};

const MAX_EVIDENCE = 8;

const normaliseToken = (raw) => {
    let token = raw.replace(/^[.\-]+|[.\-]+$/g, '');
    if (!token) return '';
    if (ALIASES[token]) return ALIASES[token];
    // Light plural stemming ("websites" -> "website"), keep short/technical words intact
    if (token.length > 4 && token.endsWith('ies')) token = `${token.slice(0, -3)}y`;
    else if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) token = token.slice(0, -1);
    return token;
};

/** Lowercased content words, with technical tokens like c++, c#, node.js kept intact. */
const tokenize = (text = '') => String(text)
    .toLowerCase()
    .split(/[^a-z0-9+#.\-]+/)
    .map(normaliseToken)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token) && !/^\d+$/.test(token));

const bigrams = (tokens) => tokens.slice(1).map((token, i) => `${tokens[i]} ${token}`);

const termsOf = (text) => {
    const tokens = tokenize(text);
    return new Set([...tokens, ...bigrams(tokens)]);
};

/**
 * Ranks portfolio projects against a job.
 * @param {Array} projects   portfolio.projects
 * @param {object} query     { text, keywords[] } job description plus extracted skills/keywords (weighted 2x)
 * @returns {Array} evidence items sorted by score: { ref, projectId, title, technologies, description, link, score, matchedTerms }
 */
const rankProjects = (projects = [], { text = '', keywords = [] } = {}) => {
    const usable = projects.filter((project) => project?.title);
    if (!usable.length) return [];

    const queryWeights = new Map();
    for (const term of termsOf(text)) queryWeights.set(term, 1);
    for (const keyword of keywords) {
        for (const term of termsOf(keyword)) queryWeights.set(term, 2);
    }

    const docs = usable.map((project) => ({
        project,
        title: termsOf(project.title),
        tech: new Set((project.technologies || []).flatMap((t) => [...termsOf(t)])),
        description: termsOf(project.description),
    }));

    // Inverse document frequency: a term found in every project says little about relevance
    const df = new Map();
    for (const doc of docs) {
        for (const term of new Set([...doc.title, ...doc.tech, ...doc.description])) {
            df.set(term, (df.get(term) || 0) + 1);
        }
    }
    const idf = (term) => Math.log(1 + docs.length / (df.get(term) || 1));

    const ranked = docs.map(({ project, title, tech, description }, index) => {
        let score = 0;
        const matched = new Set();

        for (const [term, weight] of queryWeights) {
            const fieldWeight = (tech.has(term) ? 3 : 0) + (title.has(term) ? 3 : 0) + (description.has(term) ? 1 : 0);
            if (!fieldWeight) continue;
            const phraseBoost = term.includes(' ') ? 1.5 : 1;
            score += weight * fieldWeight * idf(term) * phraseBoost;
            matched.add(term);
        }

        return {
            projectId: String(project._id || project.id || index),
            title: project.title,
            technologies: project.technologies || [],
            description: project.description || '',
            link: project.link || '',
            score: Math.round(score * 100) / 100,
            matchedTerms: [...matched].filter((t) => !t.includes(' ') || !matched.has(t.split(' ')[0])).slice(0, 8),
            originalIndex: index,
        };
    });

    ranked.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
    return ranked.map(({ originalIndex, ...item }, i) => ({ ref: `E${i + 1}`, ...item }));
};

/**
 * Picks the evidence to send to the model. Small portfolios are sent whole (ranked);
 * larger ones are cut to the most relevant projects.
 */
const selectEvidence = (projects, query, { max = MAX_EVIDENCE } = {}) => {
    const ranked = rankProjects(projects, query);
    if (ranked.length <= max) return ranked;

    const relevant = ranked.filter((item) => item.score > 0);
    return (relevant.length ? relevant : ranked).slice(0, max);
};

/** Evidence as prompt text, each project tagged with its ref. */
const formatEvidence = (evidence = []) => {
    if (!evidence.length) {
        return '(No portfolio projects available. Do not invent or imply any past projects.)';
    }

    return evidence.map((item) => {
        const tech = item.technologies.length ? ` | Tools: ${item.technologies.join(', ')}` : '';
        const match = item.matchedTerms.length ? ` | Matches job terms: ${item.matchedTerms.join(', ')}` : ' | No direct keyword match with this job';
        const description = item.description ? `\n   ${item.description}` : '';
        return `[${item.ref}] ${item.title}${tech}${match}${description}`;
    }).join('\n');
};

module.exports = {
    formatEvidence,
    rankProjects,
    selectEvidence,
    tokenize,
};
