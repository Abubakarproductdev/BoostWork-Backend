const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Verifying Firebase ID tokens only needs the project ID: firebase-admin checks
// the token signature against Google's public keys, so no service account is required.
const getFirebaseAuth = () => {
    if (!getApps().length) {
        const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.projectId || '').trim();

        if (!projectId) {
            throw new Error('FIREBASE_PROJECT_ID is missing in Backend/.env');
        }

        initializeApp({ projectId });
    }

    return getAuth();
};

// Tests replace token verification so they don't need real Firebase tokens.
let verifyTokenOverride = null;
const setTokenVerifierForTests = (fn) => {
    verifyTokenOverride = fn;
};

/**
 * Requires a valid Firebase ID token in the `Authorization: Bearer <token>` header.
 * On success, attaches `req.user = { uid, email, name }` for downstream controllers.
 */
const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please sign in.',
        });
    }

    let verifyIdToken;
    try {
        verifyIdToken = verifyTokenOverride || ((token) => getFirebaseAuth().verifyIdToken(token));
        if (!verifyTokenOverride) getFirebaseAuth();
    } catch (error) {
        // Server misconfiguration, not the user's fault: don't report it as an expired session.
        console.error('Auth setup failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server authentication is not configured (FIREBASE_PROJECT_ID missing).',
        });
    }

    try {
        const decoded = await verifyIdToken(match[1]);

        req.user = {
            uid: decoded.uid,
            email: decoded.email || '',
            name: decoded.name || '',
        };

        return next();
    } catch (error) {
        console.error('Auth verification failed:', error.code || error.message);
        return res.status(401).json({
            success: false,
            message: 'Your session is invalid or has expired. Please sign in again.',
        });
    }
};

module.exports = { requireAuth, setTokenVerifierForTests };
