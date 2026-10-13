import { addDays, differenceInCalendarDays, format, isValid, startOfDay, subDays } from 'date-fns';

/*
 * Dashboard metric definitions. All dates use the browser's local timezone.
 *
 * Period:      "Last N days" = today plus the previous N-1 calendar days.
 *              "All time" (days = null) has no lower bound.
 * Activity date: submissionDate for sent proposals, createdAt for drafts
 *              (and for older records saved without a submissionDate).
 *
 * drafted      proposals with status 'draft'.
 * submitted    proposals actually sent: submitted, viewed, responded, won, lost.
 *              Drafts and archived records are not counted as sent.
 * viewed       viewed, responded or won (a response or win implies a view).
 * responded    responded or won.
 * won / lost   that status.
 * view rate     = viewed / submitted
 * response rate = responded / submitted
 * win rate      = won / submitted
 *              Rates are null when nothing was submitted in the period.
 * connects     sum of jobDetails.connectsCost over submitted proposals.
 * confirmed earnings  sum of finalEarnings over won proposals that have it.
 * estimated earnings  fixed-price budget of won proposals without finalEarnings.
 *              Hourly wins without finalEarnings can't be estimated and are counted
 *              separately as wonWithoutEarnings.
 */

export const SENT_STATUSES = ['submitted', 'viewed', 'responded', 'won', 'lost'];
const VIEWED_STATUSES = ['viewed', 'responded', 'won'];
const RESPONDED_STATUSES = ['responded', 'won'];

// Below this many submitted proposals, rates are shown with a small-sample warning.
export const MIN_SAMPLE_FOR_RATES = 5;
const MAX_SERIES_DAYS = 365;

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? date : null;
};

export const activityDate = (proposal) => (
  SENT_STATUSES.includes(proposal.status)
    ? toDate(proposal.submissionDate) || toDate(proposal.createdAt)
    : toDate(proposal.createdAt) || toDate(proposal.submissionDate)
);

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const rate = (part, whole) => (whole > 0 ? part / whole : null);

export function computeMetrics(proposals, { days = 30, now = new Date() } = {}) {
  const start = days ? startOfDay(subDays(now, days - 1)) : null;
  const inPeriod = proposals.filter((proposal) => {
    const date = activityDate(proposal);
    return date && date <= now && (!start || date >= start);
  });

  const count = (statuses) => inPeriod.filter((p) => statuses.includes(p.status)).length;
  const sent = inPeriod.filter((p) => SENT_STATUSES.includes(p.status));
  const wins = inPeriod.filter((p) => p.status === 'won');

  const submitted = sent.length;
  const viewed = count(VIEWED_STATUSES);
  const responded = count(RESPONDED_STATUSES);
  const won = wins.length;

  let confirmedEarnings = 0;
  let estimatedEarnings = 0;
  let wonWithoutEarnings = 0;
  for (const proposal of wins) {
    if (isNumber(proposal.finalEarnings)) {
      confirmedEarnings += proposal.finalEarnings;
    } else if (proposal.budget?.type !== 'hourly' && isNumber(proposal.budget?.amount) && proposal.budget.amount > 0) {
      estimatedEarnings += proposal.budget.amount;
    } else {
      wonWithoutEarnings += 1;
    }
  }

  return {
    drafted: count(['draft']),
    submitted,
    viewed,
    responded,
    won,
    lost: count(['lost']),
    viewRate: rate(viewed, submitted),
    responseRate: rate(responded, submitted),
    winRate: rate(won, submitted),
    smallSample: submitted > 0 && submitted < MIN_SAMPLE_FOR_RATES,
    connectsSpent: sent.reduce((sum, p) => sum + (isNumber(p.jobDetails?.connectsCost) ? p.jobDetails.connectsCost : 0), 0),
    confirmedEarnings,
    estimatedEarnings,
    wonWithoutEarnings,
    series: dailySeries(inPeriod, { start, now }),
  };
}

/** One point per calendar day: proposals submitted and drafts created that day. */
export function dailySeries(proposals, { start, now }) {
  const end = startOfDay(now);
  let first = start;

  if (!first) {
    const dates = proposals.map(activityDate).filter(Boolean);
    if (!dates.length) return [];
    first = startOfDay(new Date(Math.min(...dates)));
  }
  if (differenceInCalendarDays(end, first) >= MAX_SERIES_DAYS) {
    first = subDays(end, MAX_SERIES_DAYS - 1);
  }

  const buckets = new Map();
  for (let day = first; day <= end; day = addDays(day, 1)) {
    buckets.set(format(day, 'yyyy-MM-dd'), { date: format(day, 'MMM d'), submitted: 0, drafted: 0 });
  }

  for (const proposal of proposals) {
    const bucket = buckets.get(format(activityDate(proposal), 'yyyy-MM-dd'));
    if (!bucket) continue;
    if (SENT_STATUSES.includes(proposal.status)) bucket.submitted += 1;
    else if (proposal.status === 'draft') bucket.drafted += 1;
  }

  return [...buckets.values()];
}
