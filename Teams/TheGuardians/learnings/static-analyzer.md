# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-05-18

### Tools Available
- **gitleaks**: NOT INSTALLED — use LLM pattern scan for secret detection
- **semgrep**: NOT INSTALLED — use LLM pattern scan for SAST patterns

### Confirmed False Positives (do not re-flag)
- `RESOLVED_STATUSES.includes()` / `DISPATCH_TRIGGER_STATUSES.includes()` calls in `dependency.ts` and `router.ts` — these are enum membership checks, not security issues; grep for `includes` produces many false hits
- `logger.error({ stack: err.stack })` in `errorHandler.ts` — stack is logged server-side only, NOT sent to client; `res.status(500).json({ error: 'Internal server error' })` is the safe response
- `Math.random` is not used anywhere in the codebase (no hits) — no weak-PRNG finding
- `JSON.parse` is not present in first-party source files — no unsafe deserialization finding
- No hardcoded secrets, API keys, or passwords anywhere in `Source/`
- `platform/.env.example` has `GITHUB_TOKEN=` (empty) — correct pattern, not a real secret

### Real Findings (confirmed real issues for this codebase)
- **No auth middleware at all** — entire API is open (CWE-306): HIGHEST PRIORITY
- **Intake webhooks lack signature verification** (CWE-345): zendesk + automated routes
- **Intake routes skip enum validation** for `type`/`priority` (CWE-20): body.type passed without validation
- **Unbounded `limit` parameter** in workItems + dashboard routes (CWE-400): no max cap
- **Raw exception messages returned to clients** in workflow.ts 500 handlers (CWE-209)
- **Metrics endpoint unauthenticated** — `/metrics` exposes Prometheus data (CWE-200)
- **Dockerfile runs as root** — no USER directive in portal/Dockerfile (CWE-250)
- **Vite dev server binds to 0.0.0.0** in Dockerfile CMD (CWE-923)
- **iframe missing sandbox attribute** in DebugPortalPage.tsx (CWE-1021)
- **parseInt(NaN) not checked** on query params (CWE-20)
- **No rate limiting** on any endpoint (CWE-770)

### Files to Always Prioritise in Future Runs
1. `Source/Backend/src/app.ts` — middleware setup, auth, CORS, headers
2. `Source/Backend/src/routes/intake.ts` — unauthenticated webhook ingestion
3. `Source/Backend/src/routes/workflow.ts` — error message leakage
4. `portal/Dockerfile` — container security posture
5. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe security
