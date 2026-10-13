import test from 'node:test';
import assert from 'node:assert/strict';
import { formToPayload, newProposalForm, parseAmount, proposalToForm } from './proposalForm.js';

test('parseAmount extracts numbers and keeps blanks as null', () => {
  assert.equal(parseAmount('$1,500'), 1500);
  assert.equal(parseAmount('45/hr'), 45);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount(0), 0);
});

test('editing an hourly budget keeps it hourly', () => {
  const form = proposalToForm({ title: 'T', budget: { amount: 40, type: 'hourly' } });
  assert.equal(form.budget, '40/hr');
  assert.deepEqual(formToPayload(form).budget, { amount: 40, type: 'hourly' });
});

test('blank client fields are sent as null, not 0', () => {
  const payload = formToPayload({ ...newProposalForm(), title: 'T', description: 'D' });
  assert.equal(payload.clientInfo.hireRate, null);
  assert.equal(payload.clientInfo.totalSpent, null);
  assert.equal(payload.clientInfo.rating, null);
  assert.equal('persona' in payload.clientInfo, false, 'persona is never sent, so the server keeps it');
});

test('drafts have no submission date; final earnings only for won', () => {
  const draft = formToPayload({ ...newProposalForm(), title: 'T', status: 'draft', finalEarnings: '500' });
  assert.equal('submissionDate' in draft, false);
  assert.equal(draft.finalEarnings, null);

  const won = formToPayload({ ...newProposalForm(), title: 'T', status: 'won', submissionDate: '2026-10-01', finalEarnings: '$1,200' });
  assert.equal(won.submissionDate, '2026-10-01');
  assert.equal(won.finalEarnings, 1200);
});

test('round-trips a stored proposal', () => {
  const stored = {
    title: 'Landing page',
    status: 'responded',
    jobDetails: { description: 'Desc', connectsCost: 16, jobPostedDate: '2026-10-01T00:00:00.000Z' },
    clientInfo: { region: 'US', hireRate: 50, totalSpent: 10000, memberSince: '2019', rating: 4.8, isPaymentVerified: true },
    budget: { amount: 1500, type: 'fixed' },
    submissionDate: '2026-10-02T00:00:00.000Z',
    proposalText: 'Hello',
  };
  const payload = formToPayload(proposalToForm(stored));

  assert.equal(payload.title, 'Landing page');
  assert.equal(payload.jobDetails.connectsCost, 16);
  assert.equal(payload.jobDetails.jobPostedDate, '2026-10-01');
  assert.deepEqual(payload.budget, { amount: 1500, type: 'fixed' });
  assert.equal(payload.clientInfo.rating, 4.8);
  assert.equal(payload.submissionDate, '2026-10-02');
  assert.equal(payload.proposalText, 'Hello');
});
