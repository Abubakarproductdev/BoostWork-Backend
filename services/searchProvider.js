// Web search provider adapter. Configure with:
//   SEARCH_PROVIDER = tavily | brave | exa
//   SEARCH_API_KEY  = the provider's API key
// Every provider returns the same shape: [{ title, url, snippet, publishedAt }].

const TIMEOUT_MS = 15 * 1000;

const providerError = (message, statusCode = 502) => Object.assign(new Error(message), { statusCode, expose: true });

const getConfig = () => ({
    provider: (process.env.SEARCH_PROVIDER || '').trim().toLowerCase(),
    apiKey: (process.env.SEARCH_API_KEY || '').trim(),
});

const isConfigured = () => {
    const { provider, apiKey } = getConfig();
    return Boolean(apiKey) && ['tavily', 'brave', 'exa'].includes(provider);
};

const request = async (url, options, provider) => {
    let response;
    try {
        response = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
        throw providerError(`The ${provider} search request failed: ${error.name === 'TimeoutError' ? 'timed out' : error.message}`, 504);
    }

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error(`Search provider ${provider} error (${response.status}):`, body.slice(0, 300));
        throw providerError(response.status === 429
            ? `The ${provider} search provider is rate-limiting requests. Try again shortly.`
            : `The ${provider} search provider returned an error (${response.status}).`,
        response.status === 429 ? 429 : 502);
    }

    return response.json();
};

const searchTavily = async (query, { maxResults, apiKey }) => {
    const data = await request('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ query, max_results: maxResults, search_depth: 'basic', include_answer: false }),
    }, 'tavily');

    return (data.results || []).map((r) => ({
        title: r.title || '',
        url: r.url,
        snippet: r.content || '',
        publishedAt: r.published_date || '',
    }));
};

const searchBrave = async (query, { maxResults, apiKey }) => {
    const params = new URLSearchParams({ q: query, count: String(maxResults) });
    const data = await request(`https://api.search.brave.com/res/v1/web/search?${params}`, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
    }, 'brave');

    return (data.web?.results || []).map((r) => ({
        title: r.title || '',
        url: r.url,
        snippet: (r.description || '').replace(/<[^>]+>/g, ''),
        publishedAt: r.page_age || r.age || '',
    }));
};

const searchExa = async (query, { maxResults, apiKey }) => {
    const data = await request('https://api.exa.ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ query, numResults: maxResults, type: 'auto' }),
    }, 'exa');

    return (data.results || []).map((r) => ({
        title: r.title || '',
        url: r.url,
        snippet: r.text || r.summary || '',
        publishedAt: r.publishedDate || '',
    }));
};

const PROVIDERS = { tavily: searchTavily, brave: searchBrave, exa: searchExa };

let overrideForTests = null;

/** Searches the configured provider. Throws a clear error if search isn't configured. */
const search = async (query, { maxResults = 6 } = {}) => {
    if (overrideForTests) return overrideForTests(query, { maxResults });

    const { provider, apiKey } = getConfig();
    if (!isConfigured()) {
        throw providerError('Web research is not set up yet. Add SEARCH_PROVIDER (tavily, brave or exa) and SEARCH_API_KEY to the backend settings.', 503);
    }

    const results = await PROVIDERS[provider](query, { maxResults, apiKey });
    return results.filter((r) => r.url && /^https?:\/\//i.test(r.url));
};

const providerName = () => (overrideForTests ? 'test' : getConfig().provider);

const setSearchForTests = (fn) => {
    overrideForTests = fn;
};

module.exports = {
    isConfigured: () => Boolean(overrideForTests) || isConfigured(),
    providerName,
    search,
    setSearchForTests,
};
