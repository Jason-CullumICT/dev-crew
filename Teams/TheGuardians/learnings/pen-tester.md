# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-07-06

### Architecture Observations
- **No auth layer at all.** The Express app (`app.ts`) registers all routers with no middleware for authentication or authorization. Every finding is reachable by an anonymous client — there is no credential to obtain first.
- **In-memory store.** All state lives in a `Map<string, WorkItem>`. No persistence, no database. This means:
  - No SQL/NoSQL injection surface.
  - No IDOR via database cursor tricks — items are retrieved by UUID via `Map.get()`.
  - DoS via memory exhaustion is a genuine concern.
- **Store uses UUIDs as primary keys, not `docId`.** The `docId` (WI-001 format) is a display identifier. Routes accept the UUID `id` in the path parameter. Do not confuse the two.

### High-Value Attack Surfaces
- **`POST /api/work-items/:id/route` with `overrideRoute` body field.** The override is checked only for whether it is truthy — any valid `WorkItemRoute` enum value bypasses the assessment pod. `"fast-track"` routes directly to `Approved`. No privilege check.
- **`POST /api/work-items/:id/approve`.** Valid from `Proposed` or `Reviewing` status per `VALID_STATUS_TRANSITIONS`. The assessment pod is entirely optional — an item can go `backlog → route → proposed → approve(direct)` with zero assessment records.
- **`POST /api/work-items/:id/reject` triggers `onItemResolved()`.** Rejecting an item cascades auto-dispatch to all `Approved` dependents. This is a side-effect endpoint — the response body only shows the rejected item, but dependent items change state silently.
- **Intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`).** No Zendesk webhook signature verification. No enum validation on `type`/`priority` fields — invalid values are stored verbatim.

### State Machine Observations
- **`VALID_STATUS_TRANSITIONS[Routing]` includes `Approved`**, but `routing` is never written to the store as a final status — it's only in `changeHistory`. The transient routing state is not exploitable via a real concurrent request in single-threaded Node.js.
- **`Approved` is reachable from `Proposed`, `Reviewing`, and `Routing`** via the direct `/approve` endpoint.
- **`Completed` and `Failed` have no outgoing transitions except `Failed → Backlog`**. Terminal states are correctly guarded.
- **The cascade dispatch in `onItemResolved` only fires on `Completed` or `Rejected` (DISPATCH_TRIGGER_STATUSES)**. It does NOT fire on `Failed`, creating an inconsistency — a failed blocker does not auto-unblock its dependents.

### Soft-Delete Behavior
- `store.findById()` returns `undefined` for soft-deleted items. ALL route handlers use `findById` — no route leaks soft-deleted data.
- **Exception: dependency blocker check.** `computeHasUnresolvedBlockers` interprets a missing (deleted) blocker as unresolved. Soft-deleting a blocker permanently locks its dependent items from being dispatched.
- The `removeDependency` function does NOT require the blocker to exist (`blocker` may be undefined — see line 177). So an orphaned dependency CAN be removed via `POST /api/work-items/:id/dependencies { "action": "remove", "blockerId": "<deleted-uuid>" }`. This is a mitigation path — test whether it works against a soft-deleted blocker's UUID.

### Pagination / Enumeration
- No upper bound on `limit` parameter anywhere. `parseInt("9999999", 10)` passes through to `Array.slice`. NaN input (`limit=abc`) results in `slice(NaN, NaN+20)` which resolves to `slice(0, 20)` — silently defaults to 20.
- Dashboard activity (`/api/dashboard/activity`) flattens and sorts ALL changeHistory entries from ALL items. This is O(N×H) complexity.

### CORS / CSRF
- No CORS middleware. Express default = no CORS headers. Browsers enforce same-origin by default.
- No CSRF protection. Not relevant since there is no authentication state to steal.

### Prometheus Metrics
- `GET /metrics` is unauthenticated and exposes all counters. Useful for red-team reconnaissance.

### Not Applicable
- No SQL/NoSQL injection (in-memory Map store).
- No stored XSS (React auto-escapes all rendered strings; no `dangerouslySetInnerHTML` usage found).
- No hardcoded secrets found in source (these are [SEE SAST] scope).
- No prototype pollution via PATCH — `allowedFields` whitelist prevents `__proto__` in `updates`.
