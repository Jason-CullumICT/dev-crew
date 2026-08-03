# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack patterns unique to this codebase, IDOR-prone routes, logic flaw hotspots. -->

## Run: 2026-08-03

### Architecture Observations

- **In-memory store only** — `workItemStore.ts` uses a `Map<string, WorkItem>`. No database. No persistence across restarts. This means red-team findings are ephemeral unless state is maintained in a single server session.
- **Node.js single-threaded** — True async race conditions (TOCTOU on status checks) are not exploitable via standard HTTP concurrency since all store operations are synchronous.
- **UUID for internal IDs, sequential WI-NNN for docIds** — The UUID is the primary key used in all API routes (`:id` parameter). The docId is human-readable and sequential, enabling enumeration (PEN-012).

### No Authentication — This Is the Root Cause of Most Findings

The entire backend has zero auth middleware. Every finding that involves "any caller can do X" traces back to `app.ts` having no auth middleware at all. When auth is eventually added, it should be mounted before all route handlers.

### Intake Endpoints Are the Weakest Input Path

`/api/intake/zendesk` and `/api/intake/automated` skip enum validation for `type` and `priority`. The main `POST /api/work-items` validates these; intake does not. These two endpoints are also missing webhook HMAC signature verification. They are the easiest entry points for flooding and data corruption.

### Assessment Bypass: Two Independent Paths

1. **Via `/approve` endpoint** (PEN-002): Works post-routing (item in `proposed`/`reviewing`).
2. **Via `overrideRoute: "fast-track"` in `/route` endpoint** (PEN-005): Works from `backlog` directly to `approved`.

Both bypass the `assessWorkItem()` pod entirely. The red-teamer can achieve "item dispatched without any assessment" via either path.

### Dependency Service: Soft-Delete / Cascade Asymmetry

- `onItemResolved()` is called from the **`reject` workflow action only**. Not from soft-delete. Not from `fail` or `complete` (there are no endpoints to set these statuses either).
- Soft-deleting a blocker leaves orphaned `blockedBy` links on dependent items and permanently gates their dispatch (PEN-011).
- The `completed` status is unreachable via any current API endpoint — `VALID_STATUS_TRANSITIONS[InProgress]` includes `Completed` but no route triggers it. The cascade auto-dispatch for `DISPATCH_TRIGGER_STATUSES = [Completed, Rejected]` can only fire for `Rejected` in practice.

### State Machine: Unreachable Terminal States

`completed` and `failed` statuses are defined in the enum and transition table but have no corresponding API endpoints. Items dispatched to `in-progress` are stuck there permanently via the current API surface.

### IDOR-Prone Routes

All of the following accept `:id` (UUID) with no ownership check:
- `GET /api/work-items/:id`
- `PATCH /api/work-items/:id`
- `DELETE /api/work-items/:id`
- `POST /api/work-items/:id/route|assess|approve|reject|dispatch`
- `POST /api/work-items/:id/dependencies`
- `GET /api/work-items/:id/ready`

Since there is no user concept or ownership model, IDOR in the traditional sense doesn't apply. But if auth is added later without proper ownership checks on these routes, all of them are IDOR candidates.

### Config Discrepancy

`security.config.yml` lists `/api/work-items/:id/transition` and `/api/work-items/:id/assessment` as critical entry points. Neither exists. Actual endpoints are `/route`, `/assess`, `/approve`, `/reject`, `/dispatch`. Config should be updated to reflect actual routes.

### Dashboard Service: Memory Pattern to Watch

`getActivity()` builds the full in-memory union of all change history entries before slicing. With many items and many update cycles, this is O(n×m) memory allocation per request. Combined with no pagination enforcement and no changeHistory length cap, this is the primary memory-exhaustion vector.
