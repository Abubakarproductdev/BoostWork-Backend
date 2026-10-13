const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });

require('colors');
const connectDB = require('./Config/dbConfig');
const { createApp } = require('./app');
const jobRunner = require('./services/workflows');

// Connect to MongoDB, then start processing background workflows
connectDB().then(() => jobRunner.start()).catch((error) => {
    console.error('Could not start the background job runner:', error.message);
});

const app = createApp();
const PORT = process.env.PORT || 5000;

app.listen(
    PORT,
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
    )
);
