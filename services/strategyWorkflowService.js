// Strategy report workflows: profile audit, performance analysis, market research.
// Reports separate evidence, interpretation, confidence and recommendations, and every
// reference a report makes is checked against the evidence it was given.

const { z } = require('zod');
const cacheService = require('./cacheService');
const { chatJson } = require('./modelGateway');
const { rankProjects } = require('./retrievalService');
const { computePerformanceStats, MIN_SEGMENT_SAMPLE } = require('./analyticsService');
const { runResearch } = require('./researchService');
const Proposal = require('../models/Proposal');
const StrategyReport = require('../models/StrategyReport');

const optStr = (max) => z.string().default('').transform((s) => s.trim().slice(0, max));
const reqStr = (max) => z.string().transform((s) => s.trim().slice(0, max));
const refList = z.array(z.string()).default([])
    .transform((items) => [...new Set(items.map((s) => s.trim().replace(/^\[|\]$/g, '').toUpperCase()))].filter(Boolean));
const level = z.enum(['high', 'medium', 'low']).catch('medium');

const ReportSchema = z.object({
    summary: reqStr(1500),
    findings: z.array(z.object({
        statement: reqStr(500),
        category: optStr(60),
        evidence: optStr(600),
        sourceRefs: refList,
        confidence: level,
        limitations: optStr(400),
    })).default([]).transform((items) => items.slice(0, 10)),
    recommendations: z.array(z.object({
        title: reqStr(160),
        description: optStr(800),
        rationale: optStr(600),
        sourceRefs: refList,
        estimatedEffort: level,
        expectedBenefit: optStr(300),
        dependencies: optStr(300),
        before: optStr(1500),
        after: optStr(1500),
        confidence: level,
    })).default([]).transform((items) => items.slice(0, 8)),
    limitations: z.array(z.string()).default([]).transform((items) => items.map((s) => s.trim().slice(0, 300)).filter(Boolean).slice(0, 6)),
});

const REPORT_FORMAT = `Return a JSON object:
{
  "summary": "3-5 sentence overview",
  "findings": [{ "statement": "what was found", "category": "short category", "evidence": "the specific evidence, quoted or paraphrased", "sourceRefs": ["refs that support it"], "confidence": "high|medium|low", "limitations": "why this might be wrong or incomplete" }],
  "recommendations": [{ "title": "short action", "description": "what to change", "rationale": "why it matters, linked to findings", "sourceRefs": ["refs"], "estimatedEffort": "low|medium|high", "expectedBenefit": "qualitative benefit, no invented numbers", "dependencies": "what it needs first, or empty", "before": "current text if suggesting a rewrite, else empty", "after": "proposed text if suggesting a rewrite, else empty", "confidence": "high|medium|low" }],
  "limitations": ["limitations of this whole report"]
}`;

/** Drops refs that weren't provided; findings left without support are removed. */
const enforceRefs = (report, validRefs) => {
    const keep = (refs) => refs.filter((ref) => validRefs.has(ref));
    const findings = report.findings
        .map((finding) => ({ ...finding, sourceRefs: keep(finding.sourceRefs) }))
        .filter((finding) => finding.sourceRefs.length > 0);
    const removed = report.findings.length - findings.length;

    return {
        ...report,
        findings,
        recommendations: report.recommendations.map((rec) => ({ ...rec, sourceRefs: keep(rec.sourceRefs) })),
        limitations: removed
            ? [...report.limitations, `${removed} finding(s) were removed because they cited no valid evidence.`]
            : report.limitations,
    };
};

const tracked = (ctx) => async (promise) => {
    const response = await promise;
    await ctx.trackUsage(response.usage);
    return response.data;
};

const saveReport = (ctx, fields) => StrategyReport.updateOne(
    { _id: ctx.run.reportId, userId: ctx.userId },
    { $set: { ...fields, status: 'completed', error: '' } }
);

const markRunning = (ctx) => StrategyReport.updateOne({ _id: ctx.run.reportId, userId: ctx.userId }, { $set: { status: 'running' } });

const onFailed = (run, message) => StrategyReport.updateOne(
    { _id: run.reportId, userId: run.userId },
    { $set: { status: 'failed', error: message } }
);

const loadPortfolio = async (userId) => {
    const portfolio = await cacheService.getPortfolioContext(userId);
    return {
        profile: portfolio?.profile || {},
        projects: (portfolio?.projects || []).filter((p) => p?.title),
        links: portfolio?.links || [],
    };
};

// ---------- A. Profile audit ----------

const profileAudit = {
    steps: [
        { name: 'collect', label: 'Reading your profile and projects' },
        { name: 'analyze', label: 'Auditing positioning and evidence' },
        { name: 'save', label: 'Saving the report' },
    ],
    async run(ctx) {
        await markRunning(ctx);
        const track = tracked(ctx);

        const { profile, projects, links, evidenceText, sourceRefs } = await ctx.step('collect', async () => {
            const data = await loadPortfolio(ctx.userId);
            if (!data.profile.title && !data.profile.bio && !data.projects.length) {
                throw Object.assign(new Error('Your profile is empty. Add a title, bio and some projects on the Customize Details page first.'), { expose: true });
            }
            const evidence = rankProjects(data.projects, {});
            const text = [
                `[P] PROFILE\nName: ${data.profile.fullName || '(empty)'}\nTitle: ${data.profile.title || '(empty)'}\nBio: ${data.profile.bio || '(empty)'}`,
                `Links: ${data.links.map((l) => l.name).filter(Boolean).join(', ') || '(none)'}`,
                ...evidence.map((item) => `[${item.ref}] PROJECT: ${item.title}\nTools: ${item.technologies.join(', ') || '(none listed)'}\nDescription: ${item.description || '(empty)'}\nLink: ${item.link ? 'yes' : 'no'}`),
            ].join('\n\n');
            return {
                ...data,
                evidenceText: text,
                sourceRefs: [
                    { ref: 'P', kind: 'profile', title: 'Profile (title and bio)' },
                    ...evidence.map((item) => ({ ref: item.ref, kind: 'project', title: item.title })),
                ],
            };
        });

        const report = await ctx.step('analyze', async () => {
            const result = await track(chatJson({
                tier: 'reasoning',
                stage: 'profile-audit',
                temperature: 0.3,
                schema: ReportSchema,
                system: 'You are a freelance positioning strategist auditing a freelancer\'s own profile and portfolio. Be specific and evidence-based: cite the profile as [P] and projects by their refs. Never invent skills, results or clients. Only suggest a niche or service package when the projects support it.',
                user: `FREELANCER PROFILE AND PORTFOLIO:
${evidenceText}

Audit this profile. Look for:
- vague positioning or unclear service offering in the title and bio
- skills asserted without a supporting project
- project descriptions that list tools but not the problem, process, deliverables or outcome
- a clearer niche or service package, only if the projects support it
For profile copy changes, include "before" (current text) and "after" (suggested rewrite) in the recommendation. Rewrites must only use facts present above.

${REPORT_FORMAT}`,
            }));
            return enforceRefs(result, new Set(sourceRefs.map((s) => s.ref)));
        });

        await ctx.step('save', () => saveReport(ctx, {
            title: `Profile audit${profile.title ? `: ${profile.title}` : ''}`,
            summary: report.summary,
            findings: report.findings,
            recommendations: report.recommendations,
            limitations: report.limitations,
            sourceRefs,
            metrics: { projects: projects.length, links: links.length },
        }));

        return { reportId: ctx.run.reportId };
    },
    onFailed,
};

// ---------- B. Proposal performance analysis ----------

const performanceAnalysis = {
    steps: [
        { name: 'collect', label: 'Calculating your proposal statistics' },
        { name: 'analyze', label: 'Interpreting the results' },
        { name: 'save', label: 'Saving the report' },
    ],
    async run(ctx) {
        await markRunning(ctx);
        const track = tracked(ctx);

        const stats = await ctx.step('collect', async () => {
            const proposals = await Proposal.find({ userId: ctx.userId }).lean();
            return computePerformanceStats(proposals);
        });

        const sourceRefs = [
            { ref: 'M0', kind: 'metric', title: `Overall: ${stats.totals.n} submitted, ${stats.totals.responseRatePct ?? '—'}% response, ${stats.totals.winRatePct ?? '—'}% win` },
            ...stats.segments.map((s) => ({ ref: s.ref, kind: 'metric', title: `${s.dimension} = ${s.segment}: n=${s.n}, ${s.responseRatePct ?? '—'}% response, ${s.winRatePct ?? '—'}% win` })),
        ];

        let report;
        if (stats.totals.n < MIN_SEGMENT_SAMPLE) {
            await ctx.skip('analyze', 'Not enough submitted proposals to analyze');
            report = {
                summary: `There are only ${stats.totals.n} submitted proposal(s) recorded, which is too few to draw conclusions. Keep recording proposals and their outcomes (status, dates, earnings); an analysis becomes meaningful from about ${MIN_SEGMENT_SAMPLE * 2} submissions.`,
                findings: [{
                    statement: `Only ${stats.totals.n} submitted proposal(s) are recorded.`,
                    category: 'sample size',
                    evidence: `${stats.totals.proposals} proposal(s) total, ${stats.totals.drafts} draft(s).`,
                    sourceRefs: ['M0'],
                    confidence: 'high',
                    limitations: '',
                }],
                recommendations: [{
                    title: 'Record every proposal you send and update its status',
                    description: 'Add each submitted proposal with its date, connects and budget, and update the status when the client views, responds or hires.',
                    rationale: 'Reliable analysis needs a reasonable number of complete records.',
                    sourceRefs: ['M0'],
                    estimatedEffort: 'low',
                    expectedBenefit: 'Makes future analysis possible.',
                    dependencies: '',
                    before: '',
                    after: '',
                    confidence: 'high',
                }],
                limitations: ['Insufficient data for statistical comparison.', ...stats.dataQuality],
            };
        } else {
            report = await ctx.step('analyze', async () => {
                const result = await track(chatJson({
                    tier: 'reasoning',
                    stage: 'performance-analysis',
                    temperature: 0.2,
                    schema: ReportSchema,
                    system: 'You are a careful analyst of a freelancer\'s own proposal outcomes. You only interpret the statistics given; you never invent numbers. Always state sample sizes, treat segments with smallSample=true as unreliable, and never claim causation from correlation. Suggest controlled experiments (for example, testing two opening styles on comparable jobs) instead of definitive conclusions.',
                    user: `PROPOSAL STATISTICS (computed from the freelancer's records):
${JSON.stringify({ ...stats, segments: undefined }, null, 2)}

SEGMENTS (cite by ref; M0 = overall totals):
${stats.segments.map((s) => `[${s.ref}] ${s.dimension} = ${s.segment}: n=${s.n}, responded=${s.responded}, won=${s.won}, response=${s.responseRatePct ?? '—'}%, win=${s.winRatePct ?? '—'}%${s.smallSample ? ' (SMALL SAMPLE)' : ''}`).join('\n')}

Write the analysis. Mention sample sizes in findings, put data-quality problems in limitations, and keep recommendations practical.

${REPORT_FORMAT}`,
                }));
                return enforceRefs(result, new Set(sourceRefs.map((s) => s.ref)));
            });
            report.limitations = [...new Set([...report.limitations, ...stats.dataQuality])];
        }

        await ctx.step('save', () => saveReport(ctx, {
            title: 'Proposal performance analysis',
            summary: report.summary,
            findings: report.findings,
            recommendations: report.recommendations,
            limitations: report.limitations,
            sourceRefs,
            metrics: stats,
        }));

        return { reportId: ctx.run.reportId };
    },
    onFailed,
};

// ---------- C. Market research ----------

const marketResearch = {
    steps: [
        { name: 'research-plan', label: 'Planning the research' },
        { name: 'research-search', label: 'Searching the web' },
        { name: 'research-read', label: 'Reading and extracting sources' },
        { name: 'research-synthesize', label: 'Summarizing the evidence' },
        { name: 'recommend', label: 'Turning evidence into recommendations' },
        { name: 'save', label: 'Saving the report' },
    ],
    async run(ctx) {
        await markRunning(ctx);
        const track = tracked(ctx);
        const { profile, projects } = await loadPortfolio(ctx.userId);
        const focus = (ctx.input.focus || '').trim();
        const year = new Date().getFullYear();

        const tools = [...new Set(projects.flatMap((p) => p.technologies || []))].slice(0, 8);
        const field = profile.title || tools.slice(0, 3).join(', ') || 'freelance services';
        const question = focus
            ? `${focus} (context: a freelancer working as ${field}, ${year})`
            : `What are the current (${year}) market trends, in-demand skills, client expectations and rates for freelancers offering ${field}${tools.length ? ` with ${tools.join(', ')}` : ''}, and what should such a freelancer learn or offer next?`;

        const research = await runResearch(ctx, {
            question,
            context: `Freelancer title: ${profile.title || '(not set)'}\nTools used in projects: ${tools.join(', ') || '(none listed)'}`,
        }, { plan: 'research-plan', search: 'research-search', read: 'research-read', synthesize: 'research-synthesize' });

        const usableSources = research.sources.filter((s) => s.relevant);
        const projectRefs = rankProjects(projects, {});
        const sourceRefs = [
            ...research.sources.map((s) => ({
                ref: s.ref, kind: 'web', title: s.title, url: s.url, publishedAt: s.publishedAt, retrievedAt: s.retrievedAt,
                domain: s.domain, relevant: s.relevant, outdated: s.outdated, fetched: s.fetched,
            })),
            { ref: 'P', kind: 'profile', title: 'Your profile' },
            ...projectRefs.map((p) => ({ ref: p.ref, kind: 'project', title: p.title })),
        ];

        const report = await ctx.step('recommend', async () => {
            if (!usableSources.length) {
                return {
                    summary: research.summary,
                    findings: [],
                    recommendations: [],
                    limitations: ['No relevant sources were found, so no evidence-based recommendations could be made.', ...research.gaps],
                };
            }

            const result = await track(chatJson({
                tier: 'reasoning',
                stage: 'market-strategy',
                temperature: 0.3,
                schema: ReportSchema,
                system: 'You are a freelance market strategist. Turn researched evidence into practical recommendations for this specific freelancer. Distinguish verified facts (cite web sources S#) from your own hypotheses (say so, and lower the confidence). Cite the profile as P and projects as E#. Never claim something is a current trend unless a dated source supports it.',
                user: `RESEARCH QUESTION: ${question}

RESEARCH SUMMARY:
${research.summary}

CITED FINDINGS:
${research.findings.map((f) => `- ${f.statement} [${f.sourceRefs.join(', ')}] (confidence: ${f.confidence}${f.limitations ? `; ${f.limitations}` : ''})`).join('\n') || '(none)'}

SOURCE CONFLICTS: ${research.conflicts.map((c) => `${c.description} [${c.sourceRefs.join(', ')}]`).join('; ') || 'none'}
SOURCES: ${usableSources.map((s) => `[${s.ref}] ${s.title} (${s.domain}, published ${s.publishedAt || 'unknown'}${s.outdated ? ', OUTDATED' : ''})`).join('; ')}

FREELANCER:
[P] Title: ${profile.title || '(not set)'}; Bio: ${profile.bio || '(empty)'}
${projectRefs.map((p) => `[${p.ref}] ${p.title} (${p.technologies.join(', ') || 'no tools listed'})`).join('\n') || '(no projects)'}

Give findings (each citing at least one S# source) and practical recommendations on learning, positioning, portfolio and service ideas.

${REPORT_FORMAT}`,
            }));
            return enforceRefs(result, new Set(sourceRefs.map((s) => s.ref)));
        });

        const outdated = research.sources.filter((s) => s.relevant && s.outdated).length;
        const undated = research.sources.filter((s) => s.relevant && s.undated).length;

        await ctx.step('save', () => saveReport(ctx, {
            title: focus ? `Market research: ${focus.slice(0, 80)}` : `Market research: ${field}`,
            focus,
            summary: report.summary,
            findings: report.findings,
            recommendations: report.recommendations,
            limitations: [
                ...report.limitations,
                ...research.gaps,
                ...(outdated ? [`${outdated} source(s) are more than 2 years old.`] : []),
                ...(undated ? [`${undated} source(s) have no publication date.`] : []),
            ],
            sourceRefs,
            metrics: { conflicts: research.conflicts, queries: research.queries, searchProvider: research.searchProvider },
        }));

        return { reportId: ctx.run.reportId };
    },
    onFailed,
};

module.exports = {
    ReportSchema,
    enforceRefs,
    handlers: {
        'profile-audit': profileAudit,
        'performance-analysis': performanceAnalysis,
        'market-research': marketResearch,
    },
};
