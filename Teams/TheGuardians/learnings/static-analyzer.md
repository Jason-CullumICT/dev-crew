# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-08-17

### Tool Availability
- **gitleaks**: NOT INSTALLED — fall back to LLM pattern scan for secrets
- **semgrep**: NOT INSTALLED — fall back to LLM pattern scan for SAST patterns

### Codebase Profile
- Backend: Express + TypeScript, in-memory store (no database), no auth middleware
- Frontend: React + Vite, single API client at `Source/Frontend/src/api/client.ts`
- Shared types: `Source/Shared/types/workflow.ts`
- No `.env` files in Source/ — credentials via environment variables only (correct)
- No hardcoded secrets found in first-party source code
- No dangerous API patterns (eval, exec, innerHTML, dangerouslySetInnerHTML)
- No weak crypto usage

### Confirmed High-Priority Patterns in This Codebase
1. **Missing auth middleware on ALL routes** — Every Express route handler is unauthenticated. This is structural, not incidental.
2. **Catch blocks forwarding `err.message` directly to clients** — Pattern appears in ALL workflow route handlers (`workflow.ts` lines 60–63, 87–90, 138–141, etc.). Error handler in `errorHandler.ts` is correct, but catch blocks in route files bypass it.
3. **No webhook signature verification** — Intake routes (`intake.ts`) accept POST from any caller with no HMAC/token check.
4. **`/metrics` endpoint unauthenticated** — Exposes Prometheus metrics (including `collectDefaultMetrics` Node.js runtime data) with no auth gate.
5. **Unbounded `limit` query parameter** — `parseInt(req.query.limit)` has no max cap; `?limit=999999999` dumps entire store.

### False Positive Patterns to Skip
- `RESOLVED_STATUSES.includes(...)` — not a crypto pattern, it's an array membership check
- `Math.max(1, Math.ceil(...))` — not weak crypto, it's pagination math
- `import.meta.env.VITE_*` — build-time env vars, not runtime user-controlled secrets

### Files Prioritised in This Run
- `Source/Backend/src/app.ts` — entry point, reveals no auth middleware
- `Source/Backend/src/middleware/errorHandler.ts` — error handler is correct; the bypass is in routes
- `Source/Backend/src/routes/workflow.ts` — primary finding location for CWE-209
- `Source/Backend/src/routes/intake.ts` — webhook auth gap
- `Source/Backend/src/routes/workItems.ts` — unbounded pagination

### Auto-Generated / Safe to Skip
- `Source/Shared/types/workflow.ts` — enum/interface definitions, no logic
- Test files under `tests/` — not shipped to production
- `Source/Frontend/src/vite-env.d.ts` — TypeScript ambient declaration
