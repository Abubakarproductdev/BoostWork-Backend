const Portfolio = require('../models/Portfolio');

let cachedPortfolio = null;

/**
 * Retrieves the portfolio context directly from Cache. 
 * If cache is completely empty (on server start), it executes ONE exact load sequence from MongoDB.
 */
const getPortfolioContext = async () => {
    if (cachedPortfolio !== null) {
        return cachedPortfolio;
    }

    try {
        const portfolioData = await Portfolio.findOne({});
        if (portfolioData) {
            cachedPortfolio = portfolioData;
        } else {
            // Return empty layout if completely empty
            cachedPortfolio = { profile: {}, projects: [], links: [] };
        }
        return cachedPortfolio;
    } catch (error) {
        console.error("Cache Service: Failed to fetch from MongoDB", error);
        throw error;
    }
};

/**
 * Whenever a user clicks 'Save Profile' actively from the customize details, it forcefully refreshes the memory.
 */
const setPortfolioContext = (newContext) => {
    cachedPortfolio = newContext;
};

module.exports = {
    getPortfolioContext,
    setPortfolioContext
};
