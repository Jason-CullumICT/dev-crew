# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-10-12

### CLI Tool Availability
- **gitleaks**: NOT installed in this environment — use LLM pattern matching for secret scanning
- **semgrep**: NOT installed in this environment — use LLM pattern matching for SAST

### Key Architecture Notes
- Backend is a pure Express/TypeScript app with **no authentication middleware whatsoever** — this is a structural gap, not a configuration issue
- In-memory store (`workItemStore.ts`) — no SQL/NoSQL injection surface, but DoS via unbounded pagination is real
- The `/metrics` (Prometheus) endpoint is unauthenticated and exposed on the same port as the API
- Intake routes (`/api/intake/zendesk`, `/api/intake/automated`) have no webhook signature verification

### Reliable Signal Patterns
- `res.status(500).json({ error: message })` where `message = err instanceof Error ? err.message : ...` → CWE-209 (error info leak) — this pattern is in `workflow.ts` in every catch block
- `parseInt(req.query.X as string, 10)` without a `isNaN()` guard and without an upper bound cap → CWE-20 / CWE-400 — found in `workItems.ts` and `dashboard.ts`
- `body.type || WorkItemType.Default` — the `||` fallback only protects against falsy values; a truthy-but-invalid enum string bypasses validation in intake routes

### Known False Positives / Safe Patterns
- `err.stack` in `errorHandler.ts` line 6 is safe — it logs to the server logger, NOT returned to the client (the response is generic `"Internal server error"`)
- `uuid` library usage for ID generation is safe (uses cryptographically strong randomness)
- No hardcoded secrets found in any first-party source code

### Files to Always Prioritise
1. `Source/Backend/src/app.ts` — middleware wiring, authentication gaps
2. `Source/Backend/src/routes/workflow.ts` — error message leakage in every catch block
3. `Source/Backend/src/routes/intake.ts` — webhook authentication, enum validation
4. `Source/Backend/src/routes/workItems.ts` — pagination bounds
5. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe src from env var
