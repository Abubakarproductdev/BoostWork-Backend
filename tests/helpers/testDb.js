// Starts a throwaway MongoDB for integration tests. Its data lives in a gitignored
// folder inside the project (not the system temp drive) and is removed afterwards.
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const ROOT = path.join(__dirname, '..', '..', '.test-db');

const startTestDb = async () => {
    fs.mkdirSync(ROOT, { recursive: true });
    const dbPath = fs.mkdtempSync(path.join(ROOT, 'run-'));
    const server = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } });

    return {
        uri: server.getUri(),
        stop: async () => {
            await server.stop({ doCleanup: true, force: true });
            fs.rmSync(dbPath, { recursive: true, force: true });
        },
    };
};

module.exports = { startTestDb };
