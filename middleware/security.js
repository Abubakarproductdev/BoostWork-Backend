const ipHits = new Map();

const now = () => Date.now();

const cleanupExpiredHits = (bucket, windowMs) => {
    const cutoff = now() - windowMs;

    while (bucket.length && bucket[0] <= cutoff) {
        bucket.shift();
    }
};

const createRateLimiter = ({ windowMs, maxRequests, message }) => {
    return (req, res, next) => {
        const key = `${req.ip}:${req.baseUrl || req.path}:${req.method}`;
        const bucket = ipHits.get(key) || [];

        cleanupExpiredHits(bucket, windowMs);

        if (bucket.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message,
            });
        }

        bucket.push(now());
        ipHits.set(key, bucket);
        next();
    };
};

setInterval(() => {
    const staleBefore = now() - (60 * 60 * 1000);

    for (const [key, bucket] of ipHits.entries()) {
        cleanupExpiredHits(bucket, 60 * 60 * 1000);

        if (!bucket.length || bucket[bucket.length - 1] < staleBefore) {
            ipHits.delete(key);
        }
    }
}, 15 * 60 * 1000).unref();

const validateProposalPayload = (payload = {}) => {
    const errors = [];

    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length < 3) {
        errors.push('Title must be at least 3 characters long.');
    }

    if (payload.title && payload.title.length > 200) {
        errors.push('Title cannot exceed 200 characters.');
    }

    if (!payload.jobDetails || typeof payload.jobDetails !== 'object') {
        errors.push('Job details are required.');
    }

    if (!payload.jobDetails?.description || typeof payload.jobDetails.description !== 'string') {
        errors.push('Job description is required.');
    }

    if (payload.jobDetails?.description && payload.jobDetails.description.length > 15000) {
        errors.push('Job description cannot exceed 15000 characters.');
    }

    if (!payload.jobDetails?.jobPostedDate) {
        errors.push('Job posted date is required.');
    }

    if (payload.proposalText && payload.proposalText.length > 20000) {
        errors.push('Proposal text cannot exceed 20000 characters.');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

const validatePortfolioPayload = (payload = {}) => {
    const errors = [];

    if (payload.profile && typeof payload.profile !== 'object') {
        errors.push('Profile must be an object.');
    }

    if (payload.profile?.fullName && payload.profile.fullName.length > 120) {
        errors.push('Full name cannot exceed 120 characters.');
    }

    if (payload.profile?.title && payload.profile.title.length > 160) {
        errors.push('Professional title cannot exceed 160 characters.');
    }

    if (payload.profile?.bio && payload.profile.bio.length > 5000) {
        errors.push('Bio cannot exceed 5000 characters.');
    }

    if (payload.projects && !Array.isArray(payload.projects)) {
        errors.push('Projects must be an array.');
    }

    if (Array.isArray(payload.projects) && payload.projects.length > 100) {
        errors.push('Projects cannot exceed 100 items.');
    }

    if (Array.isArray(payload.links) && payload.links.length > 100) {
        errors.push('Links cannot exceed 100 items.');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

module.exports = {
    createRateLimiter,
    validatePortfolioPayload,
    validateProposalPayload,
};
