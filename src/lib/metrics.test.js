import test from 'node:test';
import assert from 'node:assert/strict';
import { activityDate, computeMetrics } from './metrics.js';

// Local-time noon on 13 Oct 2026, so day boundaries don't depend on the machine's timezone
const NOW = new Date(2026, 9, 13, 12, 0, 0);
const daysAgo = (n, hour = 10) => new Date(2026, 9, 13 - n, hour, 0, 0).toISOString();

const p = (status, extra = {}) => ({ status, createdAt: daysAgo(0), ...extra });

test('counts only real statuses and never counts drafts as submitted', () => {
  const m = computeMetrics([
    p('draft'), p('draft'),
    p('submitted', { submissionDate: daysAgo(1) }),
    p('viewed', { submissionDate: daysAgo(1) }),
    p('responded', { submissionDate: daysAgo(2) }),
    p('won', { submissionDate: daysAgo(3) }),
    p('lost', { submissionDate: daysAgo(3) }),
    p('archived'),
  ], { days: 30, now: NOW });

  assert.equal(m.drafted, 2);
  assert.equal(m.submitted, 5);
  assert.equal(m.viewed, 3); // viewed + responded + won
  assert.equal(m.responded, 2); // responded + won
  assert.equal(m.won, 1);
  assert.equal(m.lost, 1);
  assert.equal(m.viewRate, 3 / 5);
  assert.equal(m.responseRate, 2 / 5);
  assert.equal(m.winRate, 1 / 5);
  assert.equal(m.smallSample, false);
});

test('rates are null with no submissions and flagged for small samples', () => {
  const none = computeMetrics([p('draft')], { days: 7, now: NOW });
  assert.equal(none.submitted, 0);
  assert.equal(none.responseRate, null);

  const small = computeMetrics([p('submitted', { submissionDate: daysAgo(0) })], { days: 7, now: NOW });
  assert.equal(small.smallSample, true);
});

test('period is today plus the previous N-1 days, by submission date', () => {
  const proposals = [
    p('submitted', { submissionDate: daysAgo(0) }),
    p('submitted', { submissionDate: daysAgo(6, 0) }), // start of the 7-day window
    p('submitted', { submissionDate: daysAgo(7, 23) }), // just outside
    p('submitted', { createdAt: daysAgo(40), submissionDate: daysAgo(1) }),
  ];

  assert.equal(computeMetrics(proposals, { days: 1, now: NOW }).submitted, 1);
  assert.equal(computeMetrics(proposals, { days: 7, now: NOW }).submitted, 3);
  assert.equal(computeMetrics(proposals, { days: null, now: NOW }).submitted, 4);
});

test('activity date falls back to createdAt for drafts and old records', () => {
  assert.equal(activityDate({ status: 'draft', createdAt: daysAgo(2), submissionDate: daysAgo(0) }).toISOString(), daysAgo(2));
  assert.equal(activityDate({ status: 'won', createdAt: daysAgo(5) }).toISOString(), daysAgo(5));
  assert.equal(activityDate({ status: 'won' }), null);
});

test('separates confirmed earnings from budget estimates', () => {
  const m = computeMetrics([
    p('won', { submissionDate: daysAgo(1), finalEarnings: 800, budget: { amount: 1000, type: 'fixed' } }),
    p('won', { submissionDate: daysAgo(1), budget: { amount: 500, type: 'fixed' } }),
    p('won', { submissionDate: daysAgo(1), budget: { amount: 40, type: 'hourly' } }),
    p('won', { submissionDate: daysAgo(1) }),
    p('submitted', { submissionDate: daysAgo(1), finalEarnings: 999 }),
  ], { days: 30, now: NOW });

  assert.equal(m.confirmedEarnings, 800);
  assert.equal(m.estimatedEarnings, 500);
  assert.equal(m.wonWithoutEarnings, 2);
});

test('connects are summed over sent proposals only', () => {
  const m = computeMetrics([
    p('submitted', { submissionDate: daysAgo(1), jobDetails: { connectsCost: 12 } }),
    p('won', { submissionDate: daysAgo(1), jobDetails: { connectsCost: 8 } }),
    p('draft', { jobDetails: { connectsCost: 16 } }),
  ], { days: 30, now: NOW });

  assert.equal(m.connectsSpent, 20);
});

test('daily series has one point per day with real counts', () => {
  const m = computeMetrics([
    p('submitted', { submissionDate: daysAgo(0) }),
    p('submitted', { submissionDate: daysAgo(0) }),
    p('draft', { createdAt: daysAgo(2) }),
  ], { days: 3, now: NOW });

  assert.equal(m.series.length, 3);
  assert.deepEqual(m.series.map((d) => [d.submitted, d.drafted]), [[0, 1], [0, 0], [2, 0]]);
});
