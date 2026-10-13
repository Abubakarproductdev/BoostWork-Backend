# Backend requirements

This is a **Node.js** service. Its dependencies are declared in `package.json` and locked in `package-lock.json`. Don't add a `requirements.txt` here: Azure would detect it and try to build the app as Python (`pip install -r requirements.txt`), which breaks deployment.

## Runtime
| Requirement | Version |
|---|---|
| Node.js | 22.x (`engines.node` in `package.json`) |
| npm | 10.x (bundled with Node 22) |
| OS | Any (deployed on Azure App Service for Linux) |

## Dependencies (`dependencies` in `package.json`)
| Package | Version | Used for |
|---|---|---|
| express | ^5.2.1 | HTTP server and routing |
| cors | ^2.8.6 | Cross-origin access for the Vercel frontend |
| dotenv | ^17.4.1 | Loads `Backend/.env` in local development |
| mongoose | ^9.4.1 | MongoDB models and queries |
| firebase-admin | ^14.5.0 | Verifies Firebase ID tokens (`middleware/auth.js`) |
| colors | ^1.4.0 | Coloured console logs |
| zod | ^4.6.7 | Validates the JSON returned by the AI at every workflow stage |
| @google/genai | ^1.51.0 | *Unused* (left over from Gemini; safe to remove) |
| mongodb | ^7.1.1 | *Unused directly* (mongoose brings its own driver; safe to remove) |

Dev only: `nodemon ^3.1.14` (`npm run dev` auto-restart), `mongodb-memory-server ^11.3.0` (in-memory MongoDB for tests).

Groq and the search providers are called with Node's built-in `fetch`, and web pages are fetched with Node's `http`/`https` modules, so they need no extra packages.

Install:
```bash
npm install            # development
npm ci && npm test && npm prune --omit=dev   # what the Azure workflow runs before packaging
```

## Environment variables
Set these in `Backend/.env` locally and in **Azure → Web App → Settings → Environment variables** in production.

| Variable | Required | Example / notes |
|---|---|---|
| `MONGO_URI` | ✔ | MongoDB Atlas connection string. The server exits on startup if it can't connect |
| `GROQ_API_KEY` | ✔ | Groq API key for proposal and lead generation (`GROK_API_KEY` is accepted as a fallback) |
| `FIREBASE_PROJECT_ID` | ✔ | `boostwork-469a4`. Must match the frontend's Firebase project or every request gets a 401 |
| `CORS_ORIGIN` | recommended | Comma-separated allowed origins, e.g. `https://boost-working.vercel.app,http://localhost:5173`. `*.vercel.app` is always allowed |
| `NODE_ENV` | recommended | `production` on Azure |
| `SEARCH_PROVIDER` | for research | `tavily`, `brave` or `exa`. Without it, Research and Market research are disabled with a clear message |
| `SEARCH_API_KEY` | for research | API key for the chosen search provider |
| `FAST_MODEL` | no | Groq model for quick steps (job analysis, research planning/extraction). Default `qwen/qwen3.8-27b` |
| `REASONING_MODEL` | no | Groq model for strategy, drafting, critique and reports. Defaults to `FAST_MODEL` |
| `PORT` | no | Provided by Azure automatically; defaults to `5000` locally. Don't set it on Azure |

## External services
| Service | Needed for | Setup |
|---|---|---|
| MongoDB Atlas | All data | Allow the Azure outbound IPs (or `0.0.0.0/0`) in Network Access |
| Firebase Authentication | Signing in | Project `boostwork-469a4`; Email/Password + Google enabled; frontend domains in Authorized domains |
| Groq | AI generation | API key (free tier works). Default model `qwen/qwen3.8-27b`; other free options on the account include `openai/gpt-oss-20b` (smaller) and `openai/gpt-oss-120b` (larger). Free tier: ~8,000 tokens/minute, so a multi-stage proposal (6–10 calls) may pause briefly for rate limits |
| Tavily / Brave / Exa | Web research (optional) | One API key from any of them; check each provider's pricing and terms |

## Azure App Service settings
| Setting | Value |
|---|---|
| Publish / OS | Code, Linux |
| Runtime stack | **Node 22 LTS** (not Python) |
| Startup command | `npm start` |
| Deployment | GitHub Actions: `.github/workflows/main_boostworks.yml` on push to `main` |
| Health check path (optional) | `/health` |

## Scripts
| Command | What it does |
|---|---|
| `npm start` | `node index.js` (production) |
| `npm run dev` | `nodemon index.js` (local development) |
| `npm test` | Unit + multi-user isolation tests on an in-memory MongoDB (no Atlas or Firebase needed) |
| `node scripts/claimLegacyData.js <uid>` | Assigns data created before Firebase auth to one user |
