# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-08-03

### Tool Availability
- `gitleaks`: NOT installed in runner environment. Use LLM pattern scan as fallback.
- `semgrep`: NOT installed in runner environment. Use LLM pattern scan as fallback.
- `node`: Available — use for npm script inspection.

### Codebase Characteristics
- **Stack:** TypeScript + Express backend (no SQL — in-memory Map store), React/Vite frontend.
- **No secrets found** in first-party source code. No hardcoded API keys, passwords, or tokens.
- **No eval/exec/spawn** patterns in Source/ directories.
- **No weak crypto** (MD5, SHA1, custom crypto) in use.
- **No SQL** — in-memory store only; no injection vectors of that class.
- **No dangerouslySetInnerHTML** in React components.
- **No unvalidated redirects** in either frontend or backend.

### Priority Files for Future Scans
- `Source/Backend/src/app.ts` — no auth middleware, no helmet, no rate-limit (SAST-01, 06, 07)
- `Source/Backend/src/routes/workflow.ts` — error message leakage pattern in all 7 catch blocks (SAST-03)
- `Source/Backend/src/routes/intake.ts` — unauthenticated webhooks + missing enum validation (SAST-02, 08)
- `Source/Backend/src/routes/workItems.ts` + `dashboard.ts` — unbounded pagination limit (SAST-05)

### Confirmed Issues (not false positives)
- **SAST-01:** Zero authentication on all routes — confirmed by reading app.ts, no middleware found
- **SAST-02:** Webhook intake lacks HMAC/secret; intake routes don't validate type/priority enums
- **SAST-03:** `err.message` sent verbatim in 500 responses in workflow.ts catch blocks
- **SAST-04:** `/metrics` endpoint has no access control
- **SAST-05:** `parseInt(req.query.limit)` with no max cap in workItems and dashboard routes
- **SAST-06:** No rate limiting middleware present
- **SAST-07:** No helmet/security headers configured
- **SAST-08:** Intake routes skip the enum validation that POST /api/work-items does correctly
- **SAST-09:** portal/Dockerfile has no USER directive

### False-Positive Patterns to Skip
- `logger.error({ ... stack: err.stack })` in `errorHandler.ts` — this logs to server-side stdout only (not sent to client). The same middleware correctly returns `{ error: 'Internal server error' }` without stack. NOT a finding.
- `VITE_PORTAL_URL` in DebugPortalPage.tsx — env var is baked in at Vite build time, not a runtime redirect. Low risk; context is a debug-only portal page. Can note as informational but not a real finding.
- Query filter params passed without enum validation to store — the store does strict equality matching so invalid values just return empty results, no corruption occurs for read-only filters. Low-severity only if the filter affects state mutations.

### Notes on Scope
- `platform/` directory is off-limits per CLAUDE.md hard limits. Do not scan or report on platform/ Dockerfiles.
- `portal/Dockerfile` is within scope (not in platform/).
- `docker-compose.test.yml` is in scope as a CI config file.
- `.github/workflows/` files were reviewed; no secrets hardcoded — all use `${{ secrets.* }}` references correctly.
