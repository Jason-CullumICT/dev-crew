# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-10-05 (full scan)

### Tools Available
- **gitleaks**: NOT installed — fall back to LLM pattern scan
- **semgrep**: NOT installed — fall back to LLM pattern scan

### Codebase Profile
- Express.js backend (TypeScript), React frontend (Vite), shared types in `Source/Shared/types/workflow.ts`
- In-memory store (`workItemStore.ts`) — no database, no SQL injection risk
- No authentication layer whatsoever — all endpoints are public
- No CORS, no helmet, no rate limiting

### Confirmed True Positives
- **No auth middleware** — entire API is unauthenticated (SAST-001, Critical)
- **Intake webhook lacks HMAC validation** — `Source/Backend/src/routes/intake.ts` (SAST-002, High)
- **Error messages leaked in 500 responses** — workflow route catch blocks return `err.message` (SAST-003, Medium)
- **Intake type/priority not enum-validated** — `body.type || WorkItemType.Bug` passes arbitrary strings if truthy (SAST-004, Medium)
- **Pagination limit unbounded** — no max cap on `?limit=` query param (SAST-005, Medium)
- **No security headers** — no helmet, CORS, CSP, HSTS, X-Frame-Options (SAST-006, Medium)
- **Unauthenticated `/metrics` endpoint** — exposes Prometheus counters without auth (SAST-007, Low)
- **No rate limiting** — all endpoints unthrottled (SAST-008, Low)

### Known False-Positive Patterns
- `parseInt(..., 10)` on query params followed by `|| 1` / `|| 20` — NaN is handled safely via logical OR fallback; NOT a finding
- `String(entry.oldValue)` / `String(entry.newValue)` in React JSX — rendering internal audit data, no XSS vector (React escapes by default)
- `item.description` rendered in JSX — React escapes output, no dangerouslySetInnerHTML used

### Files to Always Prioritise
1. `Source/Backend/src/app.ts` — middleware chain (auth, CORS, headers)
2. `Source/Backend/src/routes/intake.ts` — unauthenticated external webhook surface
3. `Source/Backend/src/routes/workflow.ts` — state machine mutations
4. `Source/Backend/src/routes/workItems.ts` — CRUD, pagination
5. `Source/Backend/src/services/dependency.ts` — cycle detection (BFS logic)

### Architecture Notes
- No auth layer: deliberate dev-environment choice, but must be flagged for production readiness
- `/api/search?q=` referenced in frontend but backend endpoint missing — worth noting but not a security finding
- `Source/Frontend/src/pages/DebugPortalPage.tsx` embeds `localhost:4200` iframe — acceptable for dev portal, no open-redirect risk
