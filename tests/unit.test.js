const test = require('node:test');
const assert = require('node:assert/strict');
const { statusDatesFor, toSetPaths } = require('../services/proposalUpdates');
const {
    DEFAULT_PROMPTS,
    analyzePersona,
    formatPortfolioContext,
    hydrateTemplate,
} = require('../services/promptService');

test('toSetPaths turns nested objects into dot paths and drops protected fields', () => {
    const set = toSetPaths({
        _id: 'x',
        userId: 'attacker',
        createdAt: 'x',
        title: 'Job',
        clientInfo: { region: 'US', hireRate: null, ignored: undefined },
        budget: { amount: 50, type: 'hourly' },
    });

    assert.deepEqual(set, {
        title: 'Job',
        'clientInfo.region': 'US',
        'clientInfo.hireRate': null,
        'budget.amount': 50,
        'budget.type': 'hourly',
    });
});

test('statusDatesFor stamps submission and status dates once', () => {
    const now = new Date('2026-10-13T12:00:00Z');

    assert.deepEqual(statusDatesFor('draft', {}, now), {});
    assert.deepEqual(statusDatesFor('submitted', {}, now), { submissionDate: now });
    assert.deepEqual(statusDatesFor('responded', {}, now), { submissionDate: now, responseDate: now });
    assert.deepEqual(statusDatesFor('won', { submissionDate: new Date(0) }, now), { hiredDate: now });
    assert.deepEqual(statusDatesFor('lost', {}, now), { submissionDate: now });
    assert.deepEqual(statusDatesFor('archived', {}, now), {});
    // Existing dates are never overwritten
    assert.deepEqual(statusDatesFor('viewed', { submissionDate: now, viewedDate: now }, new Date()), {});
});

test('formatPortfolioContext omits missing fields and never invents details', () => {
    const empty = formatPortfolioContext({}, '');
    assert.match(empty, /not added profile details/);
    assert.doesNotMatch(empty, /Name:|Title:/);

    const filled = formatPortfolioContext({
        profile: { fullName: '', title: 'Web Developer', bio: '' },
        projects: [{ title: 'Shop', technologies: ['React'], description: 'An online store' }, { title: '' }],
    }, 'Firebase Name');
    assert.equal(filled, 'Name: Firebase Name\nTitle: Web Developer\n\nPROJECTS:\n- Shop (React):\n  An online store');
});

test('analyzePersona matches whole technical words only', () => {
    assert.match(analyzePersona('Build a REST API in Node.js'), /highly technical/);
    assert.match(analyzePersona('Need rapid growth for my capital-raising deck'), /business owner/);
});

test('hydrateTemplate replaces tokens, tolerating whitespace', () => {
    assert.equal(hydrateTemplate('A {{ X }} B {{X}}', { X: 1 }), 'A 1 B 1');
});

test('default prompts are neutral and contain their tokens', () => {
    const all = Object.values(DEFAULT_PROMPTS).join('\n');
    assert.doesNotMatch(all, /Muhammad|industrial designer/i);
    assert.match(DEFAULT_PROMPTS.proposalSystemInstruction, /\{\{PORTFOLIO_CONTEXT\}\}/);
    assert.match(DEFAULT_PROMPTS.proposalUserInstruction, /\{\{PERSONA\}\}[\s\S]*\{\{JOB_DESCRIPTION\}\}/);
    assert.match(DEFAULT_PROMPTS.leadUserInstruction, /\{\{CONTEXT\}\}/);
});
