# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-08-24

### Tool Availability
- **gitleaks:** NOT installed — always fall back to LLM pattern scan for secrets
- **semgrep:** NOT installed — always fall back to LLM pattern scan for CWEs

### No Hardcoded Secrets
No API keys, passwords, or cryptographic material were found in first-party source. All secrets use `process.env` / `import.meta.env`. No `.env` files exist in the repo (only config references). This is a known-clean area — no need to re-scan unless new config/test fixture files are added.

### Key Structural Issues (Confirmed Real, Not False Positives)
- **Zero authentication** across the entire API (`Source/Backend/src/app.ts`). No JWT, session, or API key middleware. This is SAST-001 and amplifies every other finding.
- **Intake webhooks** (`/api/intake/zendesk`, `/api/intake/automated`) have no HMAC signature validation — confirmed absence, not a FP.
- **No pagination cap** — `parseInt(req.query.limit)` with no `Math.min`. Both `workItems.ts:70` and `dashboard.ts:18` are affected.
- **`/metrics` endpoint** is fully public — no auth, no IP restriction. Line 34 of `app.ts`.

### Files Always Worth Prioritising
1. `Source/Backend/src/app.ts` — middleware order, missing security layers
2. `Source/Backend/src/routes/intake.ts` — unauthenticated webhook surface
3. `Source/Backend/src/routes/workflow.ts` — raw error message leakage pattern
4. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox

### Patterns That Reliably Signal Real Issues in This Codebase
- `parseInt(req.query.` without a following `Math.min` or `isNaN` guard → CWE-400
- `res.status(500).json({ error: message })` in route catch blocks → CWE-209
- Any `router.post(` in intake routes without `crypto.timingSafeEqual` nearby → CWE-345
- `<iframe src=` without `sandbox=` → CWE-1021

### Known Safe Patterns (Skip in Future Runs)
- `Object.assign(item, updates, ...)` in `workItemStore.ts:71` — the PATCH route has an allowlist (`allowedFields`) before calling this; internal callers (workflow/assessment/router services) pass only known-safe fields. This is PLAUSIBLE but low-risk given the current call graph. Monitor if new callers are added.
- `uuid` usage (v4) for ID generation — cryptographically secure, no issue.
- `process.stdout.write(JSON.stringify(entry))` in `utils/logger.ts` — intentional structured logging, not an injection risk.
- `docker-compose.test.yml` ENV section — no secrets, only `NODE_ENV=test` and `ORCHESTRATOR_URL`. Safe.
- `portal/Dockerfile` — no root user flag, no hardcoded secrets. Uses `node:22-slim`. The `--host 0.0.0.0` on vite is intentional for container networking.
