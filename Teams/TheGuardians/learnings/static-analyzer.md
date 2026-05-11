# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-05-11 (run-20260511-064217)

### Tools Available
- **gitleaks**: NOT INSTALLED — use LLM pattern scan for secrets
- **semgrep**: NOT INSTALLED — use LLM pattern scan for SAST patterns

### Key Structural Facts (saves time on future runs)
- **Stack**: Express 4 + TypeScript backend, React/Vite frontend, in-memory Map store (no DB)
- **No authentication layer** — by design (internal tool), but all API routes are completely open
- **No security middleware** — no `helmet`, no `cors`, no rate-limiter in `package.json`
- **Only middleware file**: `Source/Backend/src/middleware/errorHandler.ts` — catches unhandled errors
- **Two logger files**: `src/logger.ts` (re-export shim) and `src/utils/logger.ts` (actual impl using `process.stdout.write`)
- **`/api/search` endpoint is NOT implemented** — tests in `tests/routes/search.test.ts` document the intended contract but the route is not wired in `app.ts`

### Confirmed True Positives (real issues)
1. No auth/authz on any route (CWE-306) — by design, but still a real risk for any network exposure
2. No webhook HMAC verification on `/api/intake/zendesk` and `/api/intake/automated` (CWE-345)
3. No `helmet` / security headers — missing CSP, X-Frame-Options, HSTS, X-Content-Type-Options (CWE-693)
4. `/metrics` Prometheus endpoint unauthenticated — info disclosure (CWE-200)
5. Pagination `limit` and `page` have no max value bounds — DoS risk (CWE-400)
6. No CORS configuration whatsoever (CWE-942)
7. No rate limiting (CWE-770)

### Confirmed False Positives / Non-Issues
- `Object.assign(item, updates, ...)` in `workItemStore.ts` is NOT a prototype pollution risk because route handlers construct a filtered `updates` object using an `allowedFields` allowlist before calling `updateWorkItem`
- `console.log` search in test comment line is a false positive — production code uses structured logger correctly
- The `pino` package in `package.json` is unused (custom logger used instead) — not a security issue

### Files to Prioritise on Future Runs
1. `Source/Backend/src/app.ts` — middleware registration, route wiring
2. `Source/Backend/src/routes/intake.ts` — unauthenticated webhook surface
3. `Source/Backend/src/store/workItemStore.ts` — `Object.assign` pattern worth re-checking if fields expand
4. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe without sandbox attributes
