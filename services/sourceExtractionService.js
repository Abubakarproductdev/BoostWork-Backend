// Safe public web page fetching and text extraction for research.
// Fetched pages are untrusted: they are only ever passed to the model as quoted data.

const dns = require('dns');
const http = require('http');
const https = require('https');
const net = require('net');

const TIMEOUT_MS = 10 * 1000;
const MAX_BYTES = 1.5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MAX_TEXT_CHARS = 8000;
const ALLOWED_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain'];

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
const isPrivateAddress = (address) => {
    if (net.isIPv4(address)) {
        const [a, b] = address.split('.').map(Number);
        return a === 0 || a === 10 || a === 127
            || (a === 100 && b >= 64 && b <= 127)
            || (a === 169 && b === 254)
            || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && b === 168)
            || (a === 192 && b === 0)
            || (a === 198 && (b === 18 || b === 19))
            || a >= 224;
    }

    if (net.isIPv6(address)) {
        const lower = address.toLowerCase();
        const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) return isPrivateAddress(mapped[1]);
        // Hex-form IPv4-mapped/translated addresses (e.g. ::ffff:7f00:1): refuse rather than decode
        if (lower.startsWith('::ffff:') || lower.startsWith('64:ff9b:')) return true;
        return lower === '::' || lower === '::1'
            || lower.startsWith('fc') || lower.startsWith('fd')
            || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')
            || lower.startsWith('ff');
    }

    return true;
};

const fetchError = (message) => Object.assign(new Error(message), { expose: true });

/** Validates a URL before fetching. Returns a URL object or throws. */
const checkUrl = (raw) => {
    let url;
    try {
        url = new URL(raw);
    } catch {
        throw fetchError('Invalid URL.');
    }

    if (!['http:', 'https:'].includes(url.protocol)) throw fetchError('Only http and https URLs can be fetched.');
    if (url.username || url.password) throw fetchError('URLs with credentials are not allowed.');
    if (url.port && !['80', '443'].includes(url.port)) throw fetchError('Only standard web ports are allowed.');
    if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ''))) {
        throw fetchError('Private network addresses are not allowed.');
    }
    if (/^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(url.hostname)) {
        throw fetchError('Internal hostnames are not allowed.');
    }

    return url;
};

// DNS lookup that refuses private addresses. Used as the socket's lookup, so the
// address that is checked is the address that is connected to (no DNS rebinding gap).
const safeLookup = (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error);
        const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family }];
        const blocked = list.find((entry) => isPrivateAddress(entry.address));
        if (blocked) return callback(fetchError(`Blocked private network address for ${hostname}.`));
        if (options.all) return callback(null, list);
        return callback(null, list[0].address, list[0].family);
    });
};

const requestOnce = (url) => new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(url, {
        method: 'GET',
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
            'User-Agent': 'BoostWorkResearchBot/1.0 (+public research for freelancers)',
            Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
            'Accept-Language': 'en',
        },
    }, (response) => {
        const { statusCode, headers } = response;

        if (statusCode >= 300 && statusCode < 400 && headers.location) {
            response.resume();
            return resolve({ redirect: new URL(headers.location, url).toString() });
        }
        if (statusCode < 200 || statusCode >= 300) {
            response.resume();
            return reject(fetchError(`The page returned HTTP ${statusCode}.`));
        }

        const contentType = String(headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (!ALLOWED_TYPES.includes(contentType)) {
            response.resume();
            return reject(fetchError(`Unsupported content type: ${contentType || 'unknown'}.`));
        }

        const chunks = [];
        let size = 0;
        response.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BYTES) {
                response.destroy();
                reject(fetchError('The page is too large.'));
                return;
            }
            chunks.push(chunk);
        });
        response.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8'), contentType, finalUrl: url.toString() }));
        response.on('error', reject);
    });

    request.on('timeout', () => request.destroy(fetchError('The page took too long to respond.')));
    request.on('error', reject);
    request.end();
});

/** Fetches a public page with SSRF protection, redirect, size, time and type limits. */
const safeFetch = async (rawUrl) => {
    let url = checkUrl(rawUrl);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const result = await requestOnce(url);
        if (!result.redirect) return result;
        url = checkUrl(result.redirect);
    }

    throw fetchError('Too many redirects.');
};

const decodeEntities = (text) => text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));

const metaContent = (html, pattern) => {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${pattern}["'][^>]*>`, 'i'));
    return tag?.[0].match(/content=["']([^"']*)["']/i)?.[1]?.trim() || '';
};

/** Extracts title, publication date, publisher and readable text from HTML. */
const extractFromHtml = (html) => {
    const title = decodeEntities(
        metaContent(html, 'og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''
    ).replace(/\s+/g, ' ').trim();

    const jsonLdDate = html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1] || '';
    const publishedAt = metaContent(html, 'article:published_time')
        || metaContent(html, 'datePublished')
        || metaContent(html, 'date')
        || metaContent(html, 'pubdate')
        || jsonLdDate
        || html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1]
        || '';

    const publisher = decodeEntities(metaContent(html, 'og:site_name'));

    // Prefer the main article content when the page marks it
    const main = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
    const text = decodeEntities(main
        .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe|template)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, '\n')
        .replace(/<[^>]+>/g, ' '))
        .replace(/[ \t\f\v]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim()
        .slice(0, MAX_TEXT_CHARS);

    return { title, publishedAt: publishedAt.slice(0, 40), publisher, text };
};

/** Fetches and extracts a page. Never throws: errors are returned so research can continue. */
const fetchSource = async (url) => {
    try {
        const { body, contentType, finalUrl } = await safeFetch(url);
        const extracted = contentType === 'text/plain'
            ? { title: '', publishedAt: '', publisher: '', text: body.slice(0, MAX_TEXT_CHARS) }
            : extractFromHtml(body);
        return { ok: true, url: finalUrl, ...extracted };
    } catch (error) {
        return { ok: false, url, error: error.expose ? error.message : 'Could not fetch the page.' };
    }
};

module.exports = {
    checkUrl,
    extractFromHtml,
    fetchSource,
    isPrivateAddress,
    safeFetch,
};
