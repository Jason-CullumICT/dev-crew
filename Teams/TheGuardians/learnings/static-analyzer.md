# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-07-13

### CLI Tools Available
- **gitleaks**: NOT installed — fall back to LLM scan
- **semgrep**: NOT installed — fall back to LLM scan

### Codebase Notes
- Tech stack: Express (TypeScript) backend, React (Vite + TypeScript) frontend, in-memory store (no DB)
- No authentication or authorization layer exists anywhere — this is the dominant finding every run
- No Helmet, no CORS, no express-rate-limit installed (confirmed via package.json)
- `express.json()` at line 13 of `app.ts` uses default 100KB body limit — no explicit cap
- `Object.assign(item, updates, {...})` in `workItemStore.ts:71` is used for in-memory mutations — allowlist enforcement happens upstream in route handlers, low risk of prototype pollution but worth watching if new callers added
- React JSX text rendering in `WorkItemDetailPage.tsx` (change history `oldValue`/`newValue`) auto-escapes — NOT a real XSS vector; mark as false positive in future runs
- `/api/search?q=` is called from the frontend API client (`searchItems()`) but NO backend route implements it — frontend will silently get 404s

### Reliable Signals for This Codebase
- `body.type` / `body.priority` passed without enum check in **intake routes** — real CWE-20
- Multiple `res.status(500).json({ error: message })` in `workflow.ts` catch blocks — real CWE-209
- `/metrics` endpoint at `app.ts:34` is always unauthenticated — real CWE-200
- Pagination `limit` has no max cap in `workItems.ts:70` and `dashboard.ts:18` — real CWE-400

### False Positives to Skip
- `executeAction` in `WorkItemDetailPage.tsx` — not `eval`, it's a React callback pattern
- `description` field references in routes — legitimate field access, not SQL/NoSQL injection context
- `.includes(...)` patterns in dependency service — array membership checks, not dangerous
