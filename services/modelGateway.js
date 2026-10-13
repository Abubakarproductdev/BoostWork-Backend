// Single entry point for LLM calls. Product workflows ask for a model *tier*
// ('fast' or 'reasoning'); which provider model that maps to is configuration.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Groq removed llama-3.3-70b-versatile; qwen3.8-27b is a free, medium-size model with
// reliable JSON mode. Override per tier with FAST_MODEL / REASONING_MODEL.
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const REQUEST_TIMEOUT_MS = 60 * 1000;
// The free tier allows ~8,000 tokens/minute, so multi-step workflows can briefly hit 429s;
// waiting for the window to reset (up to ~30s) is usually enough.
const MAX_ATTEMPTS = 4;
const MAX_RETRY_WAIT_MS = 30 * 1000;

const modelFor = (tier) => (
    tier === 'reasoning'
        ? process.env.REASONING_MODEL?.trim() || process.env.FAST_MODEL?.trim() || DEFAULT_MODEL
        : process.env.FAST_MODEL?.trim() || DEFAULT_MODEL
);

const getGroqApiKey = () => {
    const apiKey = process.env.GROQ_API_KEY?.trim() || process.env.GROK_API_KEY?.trim();

    if (!apiKey) {
        const error = new Error('GROQ_API_KEY is missing in Backend/.env');
        error.statusCode = 500;
        throw error;
    }

    return apiKey;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Groq sends retry-after in seconds (sometimes fractional).
const retryDelayMs = (response, attempt) => {
    const header = Number.parseFloat(response.headers.get('retry-after'));
    const delay = Number.isFinite(header) ? header * 1000 : 1000 * 2 ** attempt;
    return Math.min(delay, MAX_RETRY_WAIT_MS);
};

const callGroq = async ({ model, messages, temperature, maxTokens, json }) => {
    const payload = { model, messages, temperature };
    if (maxTokens) payload.max_tokens = maxTokens;
    if (json) payload.response_format = { type: 'json_object' };

    for (let attempt = 1; ; attempt += 1) {
        let response;
        try {
            response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getGroqApiKey()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
        } catch (error) {
            if (attempt < MAX_ATTEMPTS && error.name !== 'AbortError') {
                await sleep(1000 * attempt);
                continue;
            }
            const wrapped = new Error(error.name === 'TimeoutError' || error.name === 'AbortError'
                ? 'The AI model took too long to respond. Please try again.'
                : `Could not reach the AI model: ${error.message}`);
            wrapped.statusCode = 504;
            wrapped.retryable = true;
            throw wrapped;
        }

        if (response.ok) {
            const data = await response.json();
            // Some reasoning models put <think>...</think> in the answer; never pass it on.
            const text = data?.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            if (!text) throw new Error('The AI model returned an empty response.');
            return { text, model, usage: data.usage || null };
        }

        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < MAX_ATTEMPTS) {
            await sleep(retryDelayMs(response, attempt));
            continue;
        }

        // Don't forward provider error bodies to users; log them for debugging.
        const errorText = await response.text().catch(() => '');
        console.error(`Groq API error (${response.status}) for ${model}:`, errorText.slice(0, 500));
        const error = new Error(response.status === 429
            ? 'The AI provider is rate-limiting requests. Please wait a minute and try again.'
            : `The AI provider returned an error (${response.status}).`);
        error.statusCode = response.status === 429 ? 429 : 502;
        error.retryable = retryable;
        throw error;
    }
};

let overrideForTests = null;

/**
 * Chat completion. Returns { text, model, usage }.
 * @param {object} options
 * @param {'fast'|'reasoning'} [options.tier]
 * @param {string} options.system
 * @param {string} options.user
 * @param {boolean} [options.json]  ask for a JSON object response
 */
const chat = async ({ tier = 'fast', system, user, json = false, temperature = 0.7, maxTokens, stage }) => {
    const request = {
        tier,
        stage,
        model: modelFor(tier),
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        temperature,
        maxTokens,
        json,
    };

    return overrideForTests ? overrideForTests(request) : callGroq(request);
};

/** Extracts and parses the JSON object from a model response. Throws on malformed JSON. */
const parseJsonObject = (text) => {
    const cleaned = String(text).replace(/```(?:json)?/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end <= start) {
        throw new Error('The AI response did not contain a JSON object.');
    }

    return JSON.parse(cleaned.slice(start, end + 1));
};

/**
 * Chat call that must return JSON matching a zod schema. If the output is malformed
 * or fails validation, the model is asked once to correct it; then it fails loudly
 * instead of silently accepting bad output.
 */
const chatJson = async ({ schema, ...options }) => {
    let lastError;
    let user = options.user;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
        const response = await chat({ ...options, user, json: true });
        try {
            const parsed = parseJsonObject(response.text);
            const result = schema.safeParse(parsed);
            if (result.success) return { data: result.data, model: response.model, usage: response.usage };
            lastError = new Error(`AI output failed validation: ${result.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
        } catch (error) {
            lastError = error;
        }

        user = `${options.user}\n\nYOUR PREVIOUS RESPONSE WAS INVALID (${lastError.message}). Respond again with ONLY a valid JSON object that matches the requested format exactly.`;
    }

    lastError.statusCode = 502;
    throw lastError;
};

const setModelForTests = (fn) => {
    overrideForTests = fn;
};

module.exports = {
    chat,
    chatJson,
    modelFor,
    parseJsonObject,
    setModelForTests,
};
