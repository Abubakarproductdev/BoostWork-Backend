// Registers every background workflow type with the job runner.
const jobRunner = require('./jobRunner');
const proposalWorkflow = require('./proposalWorkflowService');
const research = require('./researchService');
const strategy = require('./strategyWorkflowService');

jobRunner.register('proposal', proposalWorkflow.handler);
jobRunner.register('research', research.handler);
for (const [type, handler] of Object.entries(strategy.handlers)) {
    jobRunner.register(type, handler);
}

module.exports = jobRunner;
