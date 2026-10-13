const express = require('express');
const cors = require('cors');
const { createRateLimiter } = require('./middleware/security');
const { requireAuth } = require('./middleware/auth');
const proposalRoutes = require('./routes/ProposalRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { buildRouters } = require('./routes/workflowRoutes');
require('./services/workflows');

/**
 * Builds the Express app without connecting to MongoDB or listening on a port,
 * so tests can run the real app against a test database.
 */
const createApp = () => {
    const app = express();
    const allowedOrigins = (process.env.CORS_ORIGIN || 'https://boostwork.vercel.app, http://localhost:5173')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);
    const aiLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        maxRequests: 20,
        message: 'Too many AI generation requests. Please wait a moment and try again.',
    });
    // Starting a multi-step workflow costs several model calls, so it has a tighter limit.
    const workflowLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        maxRequests: 6,
        message: 'Too many workflows started. Please wait a minute and try again.',
    });
    const workflowRouters = buildRouters(workflowLimiter);

    // --- Middleware ---
    app.disable('x-powered-by');
    app.set('trust proxy', 1);

    app.use(cors({
        origin(origin, callback) {
            if (!origin) return callback(null, true);

            const cleanOrigin = origin.replace(/\/$/, '');

            // Allow exactly matched origins OR any Vercel deployment URL
            if (allowedOrigins.includes(cleanOrigin) || /^https:\/\/(.*\.)?vercel\.app$/.test(cleanOrigin)) {
                return callback(null, true);
            }

            // Reject without throwing: the browser blocks the response, and the server doesn't log a 500.
            return callback(null, false);
        },
    }));

    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: false, limit: '100kb' }));

    // --- API Routes ---

    app.get('/', (_req, res) => {
        res.status(200).json({
            success: true,
            message: 'BoostWork API is running.',
        });
    });

    app.get('/health', (_req, res) => {
        res.status(200).json({
            success: true,
            status: 'ok',
        });
    });

    // Every /api route requires a signed-in Firebase user; data is scoped to req.user.uid.
    app.use('/api', requireAuth);

    app.use('/api/proposals', proposalRoutes);
    app.use('/api/portfolio', portfolioRoutes);
    // Mounted before the general /api/ai limiter so progress polling isn't rate-limited
    app.use('/api/ai/proposal-workflows', workflowRouters.proposalWorkflows);
    app.use('/api/ai', aiLimiter, aiRoutes);
    app.use('/api/research', workflowRouters.research);
    app.use('/api/strategy', workflowRouters.strategy);

    return app;
};

module.exports = { createApp };
