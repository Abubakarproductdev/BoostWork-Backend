const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        // The 'cyan.underline' part is just for styling the console log. 
        // You'll need to install the 'colors' package for it: npm install colors
        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    } catch (error) {
        console.error(`Error: ${error.message}`.red.bold);
        // Exit the process with failure if we can't connect to the database
        process.exit(1);
    }
};

module.exports = connectDB;