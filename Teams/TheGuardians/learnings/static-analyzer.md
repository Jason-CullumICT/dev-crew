# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-08-31

### CLI Tools Status
- **gitleaks**: NOT installed in this environment — must use LLM pattern scan for secrets
- **semgrep**: NOT installed in this environment — must use LLM pattern scan for CWEs

### Confirmed False Positives (None yet)
- No false positives identified in this first run.

### High-Signal Files to Always Prioritise
- `Source/Backend/src/app.ts` — central Express app, check for security middleware (helmet, cors, rate-limiting)
- `Source/Backend/src/routes/intake.ts` — webhook receivers, always check for HMAC/signature verification
- `Source/Backend/src/routes/workflow.ts` — state-transition endpoints, check error leakage and auth
- `Source/Backend/src/routes/workItems.ts` — CRUD endpoints, check pagination caps and enum validation
- `Source/Backend/src/store/workItemStore.ts` — in-memory store, check for Object.assign prototype pollution

### Codebase-Specific Patterns
- **No authentication middleware exists anywhere** in this backend. Every endpoint is public. CWE-306 is systemic, not route-specific.
- **Error pattern**: `catch(err) { const message = err.message; res.status(500).json({ error: message }) }` appears throughout workflow.ts — this leaks internal error strings to clients (CWE-209).
- **Intake enum gap**: workItems.ts POST route validates type/priority with `Object.values(...).includes()`, but intake.ts does NOT — inconsistency pattern to watch for future routes.
- **No max limit cap** on pagination — check any new route accepting `?limit=` query param.
- `/metrics` endpoint is always unauthenticated (Prometheus scrape endpoint) — in production, consider network-level protection rather than code changes.
- `allowedFields` whitelist in workItems.ts PATCH handler adequately blocks prototype pollution through Object.assign.

### Architecture Notes
- TypeScript-based Express backend with pino/custom JSON logger — no `console.log` calls detected in source (good).
- No database — pure in-memory store. No SQL/NoSQL injection surface.
- No cryptographic operations in first-party code — no weak crypto concerns.
- No dynamic code execution (eval/Function/exec) anywhere in Source/.
- Frontend uses Vite + React, no dangerouslySetInnerHTML detected.
