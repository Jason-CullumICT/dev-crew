# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-04-20

### Tool availability
- **gitleaks**: NOT installed. Fall back to LLM pattern scan.
- **semgrep**: NOT installed. Fall back to LLM pattern scan.

### Confirmed real issues (not false positives)
- **No auth middleware at all** — every route is unauthenticated. Affects all backend routes.
- **No Helmet.js / security headers** — confirmed by reading app.ts; zero middleware for CSP, X-Frame-Options, HSTS, etc.
- **No CORS config** — no `cors()` middleware anywhere in app.ts.
- **No rate limiting** — confirmed absence of `express-rate-limit` or similar.
- **Intake endpoints accept unvalidated enum fields** — `/api/intake/zendesk` and `/api/intake/automated` accept `type` and `priority` from body without enum-validation.
- **Error message leakage in workflow.ts** — multiple `catch` blocks return `err.message` directly in `res.status(500).json({ error: message })`.
- **Unprotected /metrics endpoint** — Prometheus metrics accessible without auth.
- **DebugPortalPage iframe missing `sandbox` attribute** — at `Source/Frontend/src/pages/DebugPortalPage.tsx:9`.
- **Pagination params lack NaN/overflow guard** — `parseInt(req.query.page)` not guarded; could produce NaN, 0, or huge numbers causing slice issues.

### Known false positives
- `package-lock.json` matches for `token`, `password`, `key` — these are all package name fragments or integrity hashes, not real secrets.
- `assessment.ts` notes field interpolation (e.g., `[${r.role}]: ${r.notes}`) — these are internal service strings, not user-controlled XSS vectors since this is a JSON API, not HTML.

### Files to always prioritise
1. `Source/Backend/src/app.ts` — middleware chain (auth, CORS, helmet)
2. `Source/Backend/src/routes/intake.ts` — webhook auth gaps
3. `Source/Backend/src/routes/workflow.ts` — error message exposure
4. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox
5. `Source/Backend/src/routes/workItems.ts` / `dashboard.ts` — pagination param validation
