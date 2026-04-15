# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-04-15

### Architecture Pattern
- **In-memory Map store** (`workItemStore.ts`): All data lives in a `Map<string, WorkItem>`. Resets on server restart. No persistence layer — exploits must be chained in a single session.
- **No auth layer whatsoever**: Zero middleware for authentication or authorization. Every endpoint is fully open. This is the single highest-leverage finding and precondition for all other exploits.

### IDOR-Prone Routes
- `GET /api/work-items/:id` — any UUID is accessible, no ownership check.
- `POST /api/work-items/:id/approve`, `/reject`, `/dispatch`, `/route`, `/assess` — all workflow mutations are IDOR-exploitable since there is no user context.
- All routes use `req.params.id` directly passed to `store.findById()` — no tenant scoping, no ownership assertion.

### Critical Logic Flaw Hotspots
1. **`/api/work-items/:id/route` with `overrideRoute`** — the single most powerful exploit. Sends `{"overrideRoute": "fast-track"}` to collapse the entire workflow (`backlog → approved`) in one call. No privilege check exists.
2. **`/api/work-items/:id/approve`** — manual approval of any item in `proposed`/`reviewing`/`routing` with no auth.
3. **Cascade dispatch via `onItemResolved`** — called only from the `/reject` handler. Rejecting a blocking item auto-dispatches dependents. `Completed` status is unreachable via the API (no `/complete` endpoint), so the only cascade trigger is rejection.

### Assessment Pod Logic
- Assessment runs synchronously in a single request.
- `NeedsClarification` verdict from the pod-lead is treated as `Rejected` at the status level (mapped to `WorkItemStatus.Rejected`). The `NeedsClarification` verdict exists in the enum but is never mapped to a distinct status.
- Re-assessing a `reviewing` item accumulates 4 new assessment records on each call. The only cycle path is: `rejected → backlog → routing → proposed → assess`. Each full cycle adds 4 records.

### Intake Webhook Attack Surface
- `/api/intake/zendesk` and `/api/intake/automated` have NO webhook signature validation.
- Both accept `type` and `priority` without enum validation — arbitrary strings can be stored in the domain model.
- This is a higher-privilege intake path: items created here have `source` hardcoded by the server (zendesk/automated), but `type` and `priority` can be anything.

### Pagination / Enumeration
- No maximum `limit` cap on `GET /api/work-items` or `GET /api/dashboard/activity`.
- `parseInt` with non-numeric input returns `NaN`, which causes `slice(NaN, NaN) = []` with HTTP 200 — silent failure.
- `page=0` yields offset `-20`, `slice(-20, 0) = []` — another silent failure.

### Soft-Delete Behavior
- `store.findById()` returns `undefined` for deleted items — they are logically gone from all CRUD operations.
- **Blocker soft-delete bug**: `computeHasUnresolvedBlockers()` treats a missing (deleted) blocker as "unresolved" (`!blocker` → return true). Deleting a blocker permanently blocks its dependent items from dispatch.
- `removeDependency()` handles deleted blockers gracefully (cleans up link), but `addDependency()` rejects deleted blockers with a 404 — error message exposes internal ID lookups.

### State Machine Completeness
- `VALID_STATUS_TRANSITIONS` defines `InProgress → Completed | Failed`, but **no API endpoints implement these transitions**.
- Items dispatched to `InProgress` are permanently stuck — no `/complete`, `/fail`, or similar endpoint exists.
- The only way to trigger cascade dispatch of dependents is via the `/reject` endpoint (which calls `onItemResolved`).

### Security Middleware Gap
- No `helmet` (missing security headers: no CSP, no X-Content-Type-Options, no X-Frame-Options).
- No `cors` middleware.
- No `express-rate-limit` or any rate limiting.
- `GET /metrics` (Prometheus) is fully open.
- `express.json()` uses default 100KB body limit — acceptable but no per-field length validation.
