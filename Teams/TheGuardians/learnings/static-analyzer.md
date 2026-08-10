# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-08-10

### Tools Available
- **gitleaks**: NOT installed — fall back to LLM pattern scan
- **semgrep**: NOT installed — fall back to LLM pattern scan

### Codebase Notes
- In-memory store (no database); no SQL/NoSQL injection risk
- TypeScript throughout — no `eval` or `Function()` dynamic execution found
- No hardcoded secrets in first-party Source/ code
- `pino` is listed in `Source/Backend/package.json` but is NOT used — actual logger is a custom `process.stdout.write` impl in `utils/logger.ts`
- `platform/` contains Docker/env files — out of scope per instructions; do NOT scan
- No `.env` files exist inside `Source/` — env is managed at platform level

### Known Real Findings (not false positives)
- Missing auth/authz: all API routes are public — this is structural, not incidental
- `workflow.ts` intentionally re-throws `err.message` at 500 level; each route handler does this (lines 60, 87, 140, 207, 294, 350, 370)
- Intake routes (`intake.ts`) deliberately omit enum validation for `type`/`priority` unlike `workItems.ts`
- No pagination max limit in `workItems.ts` or `dashboard.ts`

### Files to Always Prioritise
1. `Source/Backend/src/app.ts` — middleware chain, CORS, security headers
2. `Source/Backend/src/routes/intake.ts` — webhook ingress, auth/validation
3. `Source/Backend/src/routes/workflow.ts` — error handling pattern, overrideRoute bypass
4. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox

### Reliable Signal Patterns in This Codebase
- Pattern `res.status(500).json({ error: message })` in route handlers → CWE-209 (confirmed real)
- `parseInt(req.query.X as string, 10)` without max bound → CWE-400 (confirmed real)
- Absence of `helmet` or any security header middleware in `app.ts` → CWE-693 (confirmed real)
- `<iframe src={portalUrl}` without `sandbox` → CWE-1021 (confirmed real)
