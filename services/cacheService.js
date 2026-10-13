const Portfolio = require('../models/Portfolio');

// Per-user in-memory cache: uid -> portfolio document
const cachedPortfolios = new Map();

/**
 * Retrieves a user's portfolio context from cache.
 * On a cache miss it loads that user's portfolio from MongoDB once.
 */
const getPortfolioContext = async (userId) => {
    if (cachedPortfolios.has(userId)) {
        return cachedPortfolios.get(userId);
    }

    try {
        const portfolioData = await Portfolio.findOne({ userId });
        const context = portfolioData || { profile: {}, projects: [], links: [] };
        cachedPortfolios.set(userId, context);
        return context;
    } catch (error) {
        console.error("Cache Service: Failed to fetch from MongoDB", error);
        throw error;
    }
};

/**
 * Called when a user saves their profile, so the AI immediately uses the new context.
 */
const setPortfolioContext = (userId, newContext) => {
    cachedPortfolios.set(userId, newContext);
};

module.exports = {
    getPortfolioContext,
    setPortfolioContext
};
