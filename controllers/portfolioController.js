const Portfolio = require('../models/Portfolio');
const { validatePortfolioPayload } = require('../middleware/security');
const cacheService = require('../services/cacheService');

/**
 * @desc    Get the current portfolio data from Database/Cache
 * @route   GET /api/portfolio
 * @access  Private
 */
exports.getPortfolio = async (req, res) => {
    try {
        const portfolioData = await cacheService.getPortfolioContext();

        res.status(200).json({
            success: true,
            data: portfolioData
        });
    } catch (error) {
        console.error('Error reading portfolio data:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not read portfolio data.'
        });
    }
};

/**
 * @desc    Update the portfolio data in Database.
 * @route   POST /api/portfolio
 * @access  Private
 */
exports.updatePortfolio = async (req, res) => {
    try {
        const newPortfolioData = req.body;

        if (Object.keys(newPortfolioData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is empty. Ensure you are sending JSON data with the correct Content-Type header."
            });
        }

        const validation = validatePortfolioPayload(newPortfolioData);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors[0],
                errors: validation.errors,
            });
        }

        let portfolio = await Portfolio.findOne({});
        
        if (!portfolio) {
            portfolio = new Portfolio(newPortfolioData);
            await portfolio.save();
        } else {
            portfolio.profile = newPortfolioData.profile || {};
            portfolio.projects = newPortfolioData.projects || [];
            portfolio.links = newPortfolioData.links || [];
            await portfolio.save();
        }

        cacheService.setPortfolioContext(portfolio);

        res.status(200).json({
            success: true,
            message: 'Portfolio context securely updated in DB.',
            data: portfolio
        });

    } catch (error) {
        console.error('Error writing portfolio to Database:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not update portfolio securely.'
        });
    }
};
