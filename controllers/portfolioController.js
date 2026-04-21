const fs = require('fs').promises; // <-- THIS IS THE FIX
const path = require('path');
const { validatePortfolioPayload } = require('../middleware/security');

// Define the path to our context file. 
// Using path.join makes it work on any operating system (Windows, Mac, Linux).
// __dirname points to the 'controllers' folder, so we go up one level ('..') and then into 'data'.
const portfolioFilePath = path.join(__dirname, '..', 'data', 'portfolioContext.txt');

/**
 * @desc    Get the current portfolio data from the file.
 * @route   GET /api/portfolio
 * @access  Private
 *
 * This function reads the portfolio file. The frontend will call this to populate
 * the "Customize my details" page. The AI service will also call this internally
 * to get context for writing proposals.
 */
exports.getPortfolio = async (req, res) => {
    try {
        // Read the file from the disk. 'utf8' encoding is important.
        const fileContent = await fs.readFile(portfolioFilePath, 'utf8');
        
        // The file stores JSON as a string, so we need to parse it back into an object.
        const portfolioData = JSON.parse(fileContent);

        res.status(200).json({
            success: true,
            data: portfolioData
        });
    } catch (error) {
        // This 'ENOENT' error happens if the file doesn't exist yet (e.g., on first run).
        // In this case, we just send back an empty object so the frontend doesn't break.
        if (error.code === 'ENOENT') {
            return res.status(200).json({ 
                success: true, 
                data: {} // Return an empty object if file not found
            });
        }
        // For any other error, it's a genuine server problem.
        console.error('Error reading portfolio file:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not read portfolio data.'
        });
    }
};


// ... keep getPortfolio as it is ...

/**
 * @desc    Update the portfolio data file.
 * @route   POST /api/portfolio
 * @access  Private
 *
 * This function takes the JSON body from the frontend request and writes it to the file,
 * overwriting whatever was there before.
 *
 * IMPROVED: It now ensures the 'data' directory exists before trying to write the file.
 */
exports.updatePortfolio = async (req, res) => {
    try {
        const newPortfolioData = req.body;

        // Check if the request body is empty. This can happen if the JSON middleware isn't working.
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
        
        // Step 1: Get the directory name from the full file path.
        const dirName = path.dirname(portfolioFilePath);

        // Step 2: Ensure the directory exists.
        // The { recursive: true } option creates parent directories if needed and
        // doesn't throw an error if the directory already exists.
        await fs.mkdir(dirName, { recursive: true });

        // Step 3: Stringify the JSON data for writing.
        const fileContent = JSON.stringify(newPortfolioData, null, 2);

        // Step 4: Write the file. This will now succeed.
        await fs.writeFile(portfolioFilePath, fileContent, 'utf8');

        res.status(200).json({
            success: true,
            message: 'Portfolio context file updated successfully.',
            data: newPortfolioData
        });

    } catch (error) {
        // Now, if an error still occurs, it's more likely a permissions issue.
        console.error('Error writing portfolio file:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not update portfolio data.'
        });
    }
};
