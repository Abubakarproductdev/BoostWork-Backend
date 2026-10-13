/**
 * One-off migration: assigns data created before Firebase auth (documents with no
 * owner) to a single Firebase user.
 *
 * Usage:  node scripts/claimLegacyData.js <firebase-uid>
 * Find the uid in Firebase Console -> Authentication -> Users.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const Portfolio = require('../models/Portfolio');
const AiPrompt = require('../models/AiPrompt');

const run = async () => {
    const uid = process.argv[2];
    if (!uid) {
        console.error('Usage: node scripts/claimLegacyData.js <firebase-uid>');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    const unowned = { userId: { $exists: false } };

    const proposals = await Proposal.updateMany(unowned, { $set: { userId: uid } }, { strict: false });
    console.log(`Proposals claimed: ${proposals.modifiedCount}`);

    if (await Portfolio.exists({ userId: uid })) {
        console.log('Portfolio: user already has one, legacy portfolio left untouched.');
    } else {
        const portfolio = await Portfolio.updateOne(unowned, { $set: { userId: uid } });
        console.log(`Portfolio claimed: ${portfolio.modifiedCount}`);
    }

    if (await AiPrompt.exists({ key: uid })) {
        console.log('Prompts: user already has a config, legacy prompts left untouched.');
    } else {
        const prompts = await AiPrompt.updateOne({ key: 'default' }, { $set: { key: uid } });
        console.log(`Prompt config claimed: ${prompts.modifiedCount}`);
    }

    await mongoose.disconnect();
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
