const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });

const cors = require('cors');
const colors = require('colors'); 
const { createRateLimiter } = require('./middleware/security');
const proposalRoutes = require('./routes/proposalRoutes');
const connectDB = require('./Config/dbConfig');
const portfolioRoutes = require('./routes/portfolioRoutes'); 
const aiRoutes = require('./routes/aiRoutes'); 


// Connect to MongoDB
connectDB();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const aiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Too many AI generation requests. Please wait a moment and try again.',
});

// --- Middleware ---
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('CORS origin not allowed.'));
    },
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));


// --- API Routes ---

app.use('/api/proposals', proposalRoutes);
app.use('/api/portfolio', portfolioRoutes); 
app.use('/api/ai', aiLimiter, aiRoutes); 


const PORT = process.env.PORT || 5000;

app.listen(
    PORT,
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
    )
);
