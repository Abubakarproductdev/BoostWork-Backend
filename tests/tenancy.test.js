// Integration tests: the real Express app against an in-memory MongoDB.
// Firebase verification is replaced so "token-<uid>" signs in as <uid>.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { startTestDb } = require('./helpers/testDb');
const { createApp } = require('../app');
const { setTokenVerifierForTests } = require('../middleware/auth');

let mongo;
let server;
let baseUrl;

const api = async (method, path, { as, body } = {}) => {
    const headers = {};
    if (as) headers.Authorization = `Bearer token-${as}`;
    if (body) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json().catch(() => null);
    return { status: response.status, json };
};

const proposalBody = (overrides = {}) => ({
    title: 'Build a landing page',
    status: 'draft',
    jobDetails: { description: 'Need a landing page for a SaaS product.', jobPostedDate: '2026-10-01' },
    ...overrides,
});

test.before(async () => {
    mongo = await startTestDb();
    await mongoose.connect(mongo.uri);

    setTokenVerifierForTests(async (token) => {
        const match = /^token-(.+)$/.exec(token);
        if (!match) throw new Error('invalid token');
        return { uid: match[1], email: `${match[1]}@test.dev`, name: match[1] };
    });

    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    setTokenVerifierForTests(null);
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo?.stop();
});

test('every /api route rejects missing and invalid tokens', async () => {
    const routes = [
        ['GET', '/api/proposals'], ['POST', '/api/proposals'],
        ['GET', '/api/proposals/507f1f77bcf86cd799439011'], ['PUT', '/api/proposals/507f1f77bcf86cd799439011'],
        ['DELETE', '/api/proposals/507f1f77bcf86cd799439011'],
        ['GET', '/api/portfolio'], ['POST', '/api/portfolio'],
        ['GET', '/api/ai/prompts'], ['PUT', '/api/ai/prompts'], ['POST', '/api/ai/prompts/reset'],
        ['POST', '/api/ai/generate-proposal'], ['POST', '/api/ai/generate-lead'],
    ];

    for (const [method, path] of routes) {
        const missing = await api(method, path);
        assert.equal(missing.status, 401, `${method} ${path} without token`);

        const response = await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: 'Bearer forged' } });
        assert.equal(response.status, 401, `${method} ${path} with invalid token`);
    }

    assert.equal((await api('GET', '/health')).status, 200);
});

test('proposals are isolated between users', async () => {
    const created = await api('POST', '/api/proposals', { as: 'alice', body: proposalBody({ userId: 'bob' }) });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.userId, 'alice', 'owner comes from the token, not the body');
    const id = created.json.data._id;

    await api('POST', '/api/proposals', { as: 'bob', body: proposalBody({ title: 'Bob job' }) });

    const aliceList = await api('GET', '/api/proposals', { as: 'alice' });
    assert.deepEqual(aliceList.json.data.map((p) => p.title), ['Build a landing page']);

    assert.equal((await api('GET', `/api/proposals/${id}`, { as: 'bob' })).status, 404);
    assert.equal((await api('PUT', `/api/proposals/${id}`, { as: 'bob', body: proposalBody({ title: 'hacked' }) })).status, 404);
    assert.equal((await api('DELETE', `/api/proposals/${id}`, { as: 'bob' })).status, 404);

    const stillThere = await api('GET', `/api/proposals/${id}`, { as: 'alice' });
    assert.equal(stillThere.json.data.title, 'Build a landing page');

    // Changing userId through an update is ignored
    await api('PUT', `/api/proposals/${id}`, { as: 'alice', body: proposalBody({ userId: 'bob' }) });
    assert.equal((await api('GET', `/api/proposals/${id}`, { as: 'alice' })).json.data.userId, 'alice');

    assert.equal((await api('DELETE', `/api/proposals/${id}`, { as: 'alice' })).status, 200);
    assert.equal((await api('GET', `/api/proposals/${id}`, { as: 'alice' })).status, 404);
});

test('editing keeps unsent clientInfo fields and records status dates', async () => {
    const created = await api('POST', '/api/proposals', {
        as: 'carol',
        body: proposalBody({ clientInfo: { region: 'UK', persona: 'technical', hireRate: 40 } }),
    });
    const id = created.json.data._id;
    assert.equal(created.json.data.submissionDate, undefined, 'drafts have no submission date');

    const updated = await api('PUT', `/api/proposals/${id}`, {
        as: 'carol',
        body: proposalBody({ status: 'responded', clientInfo: { region: 'US', hireRate: null } }),
    });
    assert.equal(updated.status, 200);
    const proposal = updated.json.data;
    assert.equal(proposal.clientInfo.region, 'US');
    assert.equal(proposal.clientInfo.persona, 'technical', 'persona survives an edit that omits it');
    assert.equal(proposal.clientInfo.hireRate, null, 'a field can be cleared explicitly');
    assert.ok(proposal.submissionDate, 'submission date recorded');
    assert.ok(proposal.responseDate, 'response date recorded');
    assert.equal(proposal.hiredDate, undefined);
});

test('portfolios are isolated between users', async () => {
    const save = await api('POST', '/api/portfolio', {
        as: 'dave',
        body: { profile: { fullName: 'Dave', title: 'Designer', bio: '' }, projects: [{ title: 'Logo', technologies: ['Figma'] }], links: [] },
    });
    assert.equal(save.status, 200);

    const dave = await api('GET', '/api/portfolio', { as: 'dave' });
    assert.equal(dave.json.data.profile.fullName, 'Dave');

    const erin = await api('GET', '/api/portfolio', { as: 'erin' });
    assert.equal(erin.status, 200);
    assert.deepEqual(erin.json.data.projects, []);
    assert.equal(erin.json.data.profile.fullName, undefined);
});

test('prompt settings are isolated between users and default to neutral text', async () => {
    const defaults = await api('GET', '/api/ai/prompts', { as: 'frank' });
    assert.equal(defaults.status, 200);
    assert.doesNotMatch(defaults.json.data.proposalSystemInstruction, /Muhammad/);

    const custom = { ...defaults.json.data, leadUserInstruction: 'Frank custom {{CONTEXT}}' };
    assert.equal((await api('PUT', '/api/ai/prompts', { as: 'frank', body: custom })).status, 200);

    assert.equal((await api('GET', '/api/ai/prompts', { as: 'frank' })).json.data.leadUserInstruction, 'Frank custom {{CONTEXT}}');
    assert.notEqual((await api('GET', '/api/ai/prompts', { as: 'grace' })).json.data.leadUserInstruction, 'Frank custom {{CONTEXT}}');

    const reset = await api('POST', '/api/ai/prompts/reset', { as: 'frank' });
    assert.equal(reset.json.data.leadUserInstruction, defaults.json.data.leadUserInstruction);
});

test('AI routes validate input before calling the model', async () => {
    assert.equal((await api('POST', '/api/ai/generate-proposal', { as: 'alice', body: { jobDescription: 'short' } })).status, 400);
    assert.equal((await api('POST', '/api/ai/generate-lead', { as: 'alice', body: { context: '' } })).status, 400);
});
