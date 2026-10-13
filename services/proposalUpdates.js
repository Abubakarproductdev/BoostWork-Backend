// Pure helpers for writing proposals. Kept free of Express/Mongoose so they can be unit-tested.

const NESTED_FIELDS = ['jobDetails', 'clientInfo', 'budget'];
const PROTECTED_FIELDS = ['_id', 'userId', 'createdAt', 'updatedAt', '__v'];

// The date that records when a proposal first reached each status.
const STATUS_DATE_FIELD = {
    viewed: 'viewedDate',
    responded: 'responseDate',
    won: 'hiredDate',
};

// Statuses that mean the proposal was actually sent to the client.
const SENT_STATUSES = ['submitted', 'viewed', 'responded', 'won', 'lost'];

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

/**
 * Turns a request body into a `$set` document that only touches the fields sent.
 * Nested objects become dot paths (`clientInfo.region`), so an edit that omits
 * `clientInfo.persona` keeps the stored persona instead of wiping it.
 * Ownership and system fields are dropped.
 */
const toSetPaths = (body = {}) => {
    const set = {};

    for (const [key, value] of Object.entries(body)) {
        if (PROTECTED_FIELDS.includes(key) || value === undefined) continue;

        if (NESTED_FIELDS.includes(key) && isPlainObject(value)) {
            for (const [subKey, subValue] of Object.entries(value)) {
                if (subValue !== undefined) set[`${key}.${subKey}`] = subValue;
            }
        } else {
            set[key] = value;
        }
    }

    return set;
};

/**
 * Returns the status dates to record for `status`, without overwriting dates
 * that are already set on `existing` (the stored proposal, or {} on create).
 */
const statusDatesFor = (status, existing = {}, now = new Date()) => {
    const dates = {};

    if (SENT_STATUSES.includes(status) && !existing.submissionDate) {
        dates.submissionDate = now;
    }

    const field = STATUS_DATE_FIELD[status];
    if (field && !existing[field]) {
        dates[field] = now;
    }

    return dates;
};

module.exports = {
    SENT_STATUSES,
    statusDatesFor,
    toSetPaths,
};
