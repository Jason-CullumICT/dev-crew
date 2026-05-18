# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-05-18

### Architecture Fingerprint
- **Stack:** Express.js (no auth middleware), TypeScript, in-memory `Map<string, WorkItem>` store (no DB), `prom-client` metrics.
- **No persistence:** Server restart resets all state. Build full exploit chains in a single session.
- **No authentication:** Zero auth anywhere. This is the root of all access-control findings. Do not attempt to find auth bypass — there is no auth to bypass.

### IDOR-Prone Routes
- `GET /api/work-items/:id` — UUID-based, but store returns full object including changeHistory, assessments, and dependency links. Combined with zero auth, this is a full data dump.
- `GET /api/work-items/:id/ready` — exposes dependency graph structure (blockerItemIds) for any item.
- `GET /api/dashboard/queue` — returns ALL non-deleted items grouped by status. One call reveals the entire workflow state.

### State Machine Bypass Hotspot
- `/api/work-items/:id/route` with `{"overrideRoute": "fast-track"}` is the single most powerful bypass: any item goes directly to `Approved` skipping the entire assessment pod. This requires only one API call after item creation.
- `VALID_STATUS_TRANSITIONS` in `Shared/types/workflow.ts` is the ground truth for valid paths. The approve endpoint (`POST /:id/approve`) is intentionally permissive: it allows transition from `proposed`, `reviewing`, and `routing` to `Approved` — this is by design, not a bug.

### Intake as Injection Point
- `/api/intake/zendesk` and `/api/intake/automated` lack enum validation that the main creation endpoint has. These are the only routes that allow injection of invalid `type`/`priority` strings into the store.
- Forging Zendesk source: send to `/api/intake/zendesk` — no signature check, item will show `source: "zendesk"`.

### Dependency Graph Attacks
- The `blockedBy` stale reference attack (PEN-006) is reliable: add a dep, delete the blocker, target item is permanently blocked unless manually cleaned via `removeDependency`.
- Cycle detection uses BFS from `fromId` following `.blocks` edges — this protects against circular dependencies but not the stale-reference DoS.
- `setDependencies` via `PATCH /:id` does a full replace — can be used to atomically clear all blockers of an item (pass `{"blockedBy": []}`) or inject many at once.

### Cascade Dispatch Attack Pattern
- Trigger: reject any item that is in `proposed` or `reviewing` status.
- Effect: `onItemResolved` fires on the rejected item's `.blocks` list.
- All dependents in `Approved` status with no remaining unresolved blockers are auto-dispatched.
- To engineer: (1) create blocker B, (2) create dependent A, (3) add A→B dependency, (4) route A to Approved, (5) route B to proposed, (6) reject B → A auto-dispatches.

### Pagination Bypass
- Negative `limit` values exploit JavaScript's `Array.slice(start, end)` behavior: `slice(0, -1)` = all but last item.
- `limit=999999999` dumps all items in one shot.
- Both `GET /api/work-items` and `GET /api/dashboard/activity` share this flaw.

### Assessment Logic Gotcha
- NeedsClarification pod-lead verdict → hard `Rejected` status (not a separate state). Items without `complexity` always get NeedsClarification from domain-expert → pod-lead → Rejected. Useful for sabotage testing.
- Requirements-reviewer threshold: title must be ≥ 5 chars, description ≥ 20 chars. Below these → Reject verdict from that role.

### Information Disclosure
- `GET /metrics` (unauthenticated) reveals Prometheus counters: creation volume by source/type, routing decisions, assessment verdicts, dispatch team assignments, cycle detection frequency.
- `GET /health` returns `{"status":"ok"}`.
- `GET /api/dashboard/summary` returns status/team/priority counts.
- `GET /api/dashboard/queue` returns ALL items grouped by status (no pagination).

### Unimplemented Endpoint
- `GET /api/search?q=` is called by the frontend but NOT registered in app.ts. Returns 404 currently. When implemented, test for ReDoS and unbounded results.
