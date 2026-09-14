# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-09-14 (Security Audit — full scan)

### Tool Availability
- **gitleaks**: NOT installed in this environment — fell back to LLM pattern scan for secrets.
- **semgrep**: NOT installed in this environment — fell back to LLM pattern scan for all SAST patterns.
- Neither tool produced output. Document these as unavailable for future runs.

### Hardcoded Secrets
- **None found.** No hardcoded API keys, passwords, tokens, or database URIs in first-party source. The codebase correctly uses `process.env.PORT` and `import.meta.env.VITE_*` env vars.

### High-Signal CWE Patterns for This Codebase
1. **CWE-306 (Missing Authentication)** — The entire backend API has zero auth middleware. Every route in `Source/Backend/src/routes/` is public. This is the biggest finding. [HANDOFF → pen-tester for privilege-escalation chain]
2. **CWE-346 (Unvalidated Webhook Origin)** — `Source/Backend/src/routes/intake.ts` (Zendesk & automated) lacks HMAC signature verification. Attacker can inject work items freely.
3. **CWE-20 (Improper Input Validation)** — Intake webhook (`intake.ts`) uses `body.type || default` pattern, which only guards against falsy values — any arbitrary string for `type`/`priority` is stored as-is if truthy.
4. **CWE-200 (Unauthenticated /metrics)** — `app.ts` line 34 exposes Prometheus metrics with no auth.
5. **CWE-770 (Unbounded Pagination Limit)** — `workItems.ts:70` and `dashboard.ts:18` pass `parseInt(req.query.limit)` with no maximum cap.
6. **CWE-209 (Error Message Information Exposure)** — `workflow.ts` routes pass raw `err.message` in 500 responses (lines ~63, 88, 140, 207, 295, 350).
7. **CWE-1021 (Improper Iframe Restriction)** — `DebugPortalPage.tsx` embeds a configurable URL iframe with no `sandbox` attribute.

### Known False-Positive Patterns
- The string `executeAction` in `WorkItemDetailPage.tsx` is a React callback — not `eval`/code-exec. Confirmed safe.
- `assess.ts` references to "cycle" are algorithm variable names, not circular imports.
- `Math.random()` is not used in this codebase for security-sensitive purposes.

### Files to Always Prioritise
- `Source/Backend/src/app.ts` — route registration, security headers, CORS
- `Source/Backend/src/routes/intake.ts` — webhook auth is the highest-risk gap
- `Source/Backend/src/middleware/` — auth middleware gap lives here
- `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe without sandbox

### Auto-Generated / Safe to Skip
- `Source/Backend/src/metrics.ts` — Prometheus counter definitions, no user input
- `Source/Shared/types/workflow.ts` — TypeScript type definitions only
