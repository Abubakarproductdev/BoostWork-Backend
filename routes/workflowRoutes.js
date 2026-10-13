const express = require('express');
const {
    deleteReport,
    getProposalWorkflow,
    getReport,
    getResearch,
    listReports,
    listResearch,
    researchStatus,
    startMarketResearch,
    startPerformanceAnalysis,
    startProfileAudit,
    startProposalWorkflow,
    startResearch,
    updateRecommendation,
} = require('../controllers/workflowController');

// Routers are mounted in app.js; `limit` is the AI rate limiter, applied only to
// endpoints that start model work (polling must stay cheap and unlimited).
const buildRouters = (limit) => {
    const proposalWorkflows = express.Router();
    proposalWorkflows.post('/', limit, startProposalWorkflow);
    proposalWorkflows.get('/:id', getProposalWorkflow);

    const research = express.Router();
    research.get('/status', researchStatus);
    research.get('/jobs', listResearch);
    research.post('/jobs', limit, startResearch);
    research.get('/jobs/:id', getResearch);

    const strategy = express.Router();
    strategy.post('/profile-audit', limit, startProfileAudit);
    strategy.post('/performance-analysis', limit, startPerformanceAnalysis);
    strategy.post('/market-research', limit, startMarketResearch);
    strategy.get('/reports', listReports);
    strategy.get('/reports/:id', getReport);
    strategy.delete('/reports/:id', deleteReport);
    strategy.patch('/reports/:id/recommendations/:recommendationId', updateRecommendation);

    return { proposalWorkflows, research, strategy };
};

module.exports = { buildRouters };
