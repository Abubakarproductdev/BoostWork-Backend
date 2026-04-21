const express = require('express');
const router = express.Router();

// Import the new controller functions
const {
    getPortfolio,
    updatePortfolio
} = require('../controllers/portfolioController');


// When a GET request comes to '/api/portfolio', use the getPortfolio function.
// When a POST request comes to '/api/portfolio', use the updatePortfolio function.
router.route('/')
    .get(getPortfolio)
    .post(updatePortfolio);

module.exports = router;