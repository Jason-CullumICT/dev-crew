# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-11-09

### Architecture Profile
- **Stack:** Node.js / Express, fully in-memory Map store (no DB), TypeScript strict mode.
- **No authentication layer exists anywhere.** This is the defining characteristic of this codebase.
- All state is volatile — restarting the server resets the entire store (Map re-initialized).
- UUIDs used for internal IDs; sequential `WI-NNN` docIds used for human-readable references.

### IDOR-Prone Routes
- All routes use UUID path params (`:id`). UUIDs are non-guessable but the API is unauthenticated, so IDOR is moot — all items are accessible to all callers.
- `docId` (sequential `WI-NNN`) is exposed in every response body. It reveals creation order and total item count. Use `GET /api/dashboard/queue` to bulk-enumerate all items without a pagination limit.

### State Machine Attack Surface
- **Fast-track bypass is the highest-impact single-request attack.** `POST /:id/route {"overrideRoute":"fast-track"}` skips assessment entirely.
- `VALID_STATUS_TRANSITIONS` allows `routing → approved` — the transient `routing` state is reachable by the approve endpoint (business logic gap).
- `NeedsClarification` assessment verdict collapses to `Rejected` in `assessWorkItem()` — the branch condition is binary (Approve vs. everything-else).

### Dependency System Logic Flaws
- **Soft-deleting a blocker permanently blocks dependent dispatch.** `computeHasUnresolvedBlockers` treats `findById() → undefined` as "unresolved". The dependency link is never auto-cleaned on soft delete.
- **Reject triggers auto-dispatch cascade.** `DISPATCH_TRIGGER_STATUSES` includes `Rejected`. Rejecting a blocker item dispatches all its approved dependents. This is a surprising and exploitable side effect.
- Dependency cycle detection (BFS) correctly stops at soft-deleted nodes (`findById → undefined → continue`). This means a cycle involving a soft-deleted middle node may not be detected, allowing a dependency to be added that creates a logical cycle once the node is restored (not possible since items can't be undeleted, but worth noting if persistence is added).

### Intake Webhook Vulnerabilities
- `/api/intake/zendesk` and `/api/intake/automated` accept `type` and `priority` fields without enum validation. The main `POST /api/work-items` DOES validate these.
- Neither intake endpoint validates a webhook secret/HMAC signature.

### Pagination / DoS
- No max `limit` cap on `GET /api/work-items` or `GET /api/dashboard/activity`.
- `GET /api/dashboard/queue` has no pagination at all — returns all items unconditionally. This satisfies the red-team enumeration objective directly.

### Missing Endpoint
- `GET /api/search` is called by the frontend client (`src/api/client.ts:searchItems`) and has test coverage in `tests/routes/search.test.ts`, but the route is **not registered** in `app.ts`. The tests fail intentionally. When implemented, this endpoint will search over titles and descriptions of all items — ensure it has auth and pagination.

### Metrics Exposure
- `GET /metrics` (Prometheus) is unauthenticated. Useful for attacker reconnaissance of operational scale.
