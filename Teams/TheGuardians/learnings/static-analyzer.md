# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-11-23

### Tools Available
- **gitleaks**: NOT installed — fall back to LLM pattern scan for secrets
- **semgrep**: NOT installed — fall back to LLM pattern scan for SAST patterns

### Key Patterns Found in This Codebase

**Always scan first:**
- `Source/Backend/src/app.ts` — Express app setup; check for middleware gaps (cors, helmet, rate-limit, auth)
- `Source/Backend/src/routes/intake.ts` — Webhook receivers; check for HMAC signature verification
- `Source/Backend/src/routes/workflow.ts` — Each catch block returns `err.message` directly (CWE-209)
- `Source/Backend/src/routes/workItems.ts` — Pagination `limit` has no upper bound cap

### Known False Positives
- `executeAction` in `WorkItemDetailPage.tsx` — React callback wrapper, NOT dynamic code execution. Not `eval` or `Function()`.
- `js-tokens` in package-lock.json — legitimate dependency name, not a secret token.
- `WorkItemComplexity` values containing "medium", "small", etc. — not sensitive fields.

### Real Issue Patterns
1. **No authentication anywhere** — entire Express API is unauthenticated (CWE-306). No JWT, no session, no API key checks.
2. **Webhook endpoints without signature checks** — `/api/intake/zendesk` and `/api/intake/automated` accept any POST (CWE-345).
3. **Raw err.message in 500 responses** — routes in `workflow.ts` return internal error messages to clients (CWE-209). Note: `errorHandler.ts` does it correctly — but individual route try/catch blocks don't.
4. **Missing Helmet** — no security headers (CSP, X-Frame-Options, HSTS, etc.) (CWE-693).
5. **No rate limiting** — no express-rate-limit or similar middleware (CWE-770).
6. **Unbounded limit param** — `parseInt(req.query.limit)` with no max cap (CWE-20).
7. **Unauthenticated /metrics endpoint** — Prometheus metrics exposed publicly (CWE-200).
8. **iframe without sandbox** — `DebugPortalPage.tsx` iframe has no sandbox attribute (CWE-1021).

### Auto-generated / Safe to Skip
- `Source/Backend/package-lock.json` and `Source/Frontend/package-lock.json` — auto-generated lock files; no first-party secrets expected.
- `Source/Backend/src/models/WorkItem.ts` — model builder, no security-relevant logic.
- Test files under `tests/` — test fixtures may contain benign dummy data; not production secrets.
