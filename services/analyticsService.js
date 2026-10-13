// Deterministic proposal statistics for the performance-analysis strategy report.
// Uses the same definitions as the dashboard (Frontend/src/lib/metrics.js):
// submitted = submitted/viewed/responded/won/lost; responded = responded/won.

const SENT = ['submitted', 'viewed', 'responded', 'won', 'lost'];
const MIN_SEGMENT_SAMPLE = 5;

const countWords = (text = '') => (String(text).trim().match(/\S+/g) || []).length;

const rate = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

const summarise = (proposals) => {
    const submitted = proposals.length;
    const responded = proposals.filter((p) => ['responded', 'won'].includes(p.status)).length;
    const won = proposals.filter((p) => p.status === 'won').length;
    return {
        n: submitted,
        responded,
        won,
        responseRatePct: rate(responded, submitted),
        winRatePct: rate(won, submitted),
        smallSample: submitted < MIN_SEGMENT_SAMPLE,
    };
};

const groupBy = (items, keyFn) => {
    const groups = new Map();
    for (const item of items) {
        const key = keyFn(item);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    }
    return groups;
};

const segmentsOf = (items, dimension, keyFn, order) => {
    const groups = groupBy(items, keyFn);
    const keys = order ? order.filter((k) => groups.has(k)) : [...groups.keys()];
    return keys.map((key) => ({ dimension, segment: key, ...summarise(groups.get(key)) }));
};

const median = (values) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * @param {Array} proposals  the user's proposal documents (plain objects)
 * @returns {object} totals, segment breakdowns with sample sizes, and data-quality notes
 */
const computePerformanceStats = (proposals = []) => {
    const sent = proposals.filter((p) => SENT.includes(p.status));
    const totals = {
        proposals: proposals.length,
        drafts: proposals.filter((p) => p.status === 'draft').length,
        ...summarise(sent),
        viewed: sent.filter((p) => ['viewed', 'responded', 'won'].includes(p.status)).length,
        lost: sent.filter((p) => p.status === 'lost').length,
        connectsSpent: sent.reduce((sum, p) => sum + (Number(p.jobDetails?.connectsCost) || 0), 0),
        confirmedEarnings: sent.reduce((sum, p) => sum + (p.status === 'won' && typeof p.finalEarnings === 'number' ? p.finalEarnings : 0), 0),
    };

    const responseDays = sent
        .filter((p) => p.submissionDate && p.responseDate)
        .map((p) => (new Date(p.responseDate) - new Date(p.submissionDate)) / 86400000)
        .filter((days) => days >= 0);

    const budgetBand = (p) => {
        if (p.budget?.type === 'hourly') return 'hourly';
        const amount = Number(p.budget?.amount);
        if (!amount) return 'unknown budget';
        if (amount < 500) return 'fixed < $500';
        if (amount <= 2000) return 'fixed $500-2000';
        return 'fixed > $2000';
    };
    const lengthBand = (p) => {
        const words = countWords(p.proposalText);
        if (!words) return 'no proposal text';
        if (words < 150) return 'under 150 words';
        if (words <= 250) return '150-250 words';
        return 'over 250 words';
    };
    const month = (p) => (p.submissionDate ? new Date(p.submissionDate).toISOString().slice(0, 7) : 'no submission date');
    const verified = (p) => {
        const value = p.clientInfo?.isPaymentVerified;
        if (value === true) return 'payment verified';
        if (value === false) return 'payment not verified';
        return 'unknown';
    };

    const recentMonths = [...new Set(sent.map(month))].filter((m) => m !== 'no submission date').sort().slice(-6);

    const segments = [
        ...segmentsOf(sent, 'budget', budgetBand, ['fixed < $500', 'fixed $500-2000', 'fixed > $2000', 'hourly', 'unknown budget']),
        ...segmentsOf(sent, 'proposal length', lengthBand, ['under 150 words', '150-250 words', 'over 250 words', 'no proposal text']),
        ...segmentsOf(sent, 'client verification', verified, ['payment verified', 'payment not verified', 'unknown']),
        ...segmentsOf(sent.filter((p) => recentMonths.includes(month(p))), 'month', month, recentMonths),
    ].map((segment, index) => ({ ref: `M${index + 1}`, ...segment }));

    const dataQuality = [];
    const missingDates = sent.filter((p) => !p.submissionDate).length;
    if (missingDates) dataQuality.push(`${missingDates} submitted proposal(s) have no submission date.`);
    const missingText = sent.filter((p) => !countWords(p.proposalText)).length;
    if (missingText) dataQuality.push(`${missingText} submitted proposal(s) have no proposal text recorded.`);
    const wonNoEarnings = sent.filter((p) => p.status === 'won' && typeof p.finalEarnings !== 'number').length;
    if (wonNoEarnings) dataQuality.push(`${wonNoEarnings} won job(s) have no final earnings recorded.`);
    if (!responseDays.length) dataQuality.push('No proposals have both a submission and a response date, so response time cannot be measured.');

    return {
        totals,
        medianDaysToResponse: responseDays.length >= 3 ? Math.round(median(responseDays) * 10) / 10 : null,
        responseTimeSample: responseDays.length,
        segments,
        dataQuality,
        minSegmentSample: MIN_SEGMENT_SAMPLE,
    };
};

module.exports = {
    MIN_SEGMENT_SAMPLE,
    computePerformanceStats,
};
