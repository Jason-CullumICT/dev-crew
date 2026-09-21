# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-09-21

### Architecture Patterns to Know

- **No authentication layer exists.** The Express app (`Source/Backend/src/app.ts`) mounts all routers with zero auth middleware. Every pen test run should assume a completely open API until this changes.
- **In-memory store, no DB.** `Source/Backend/src/store/workItemStore.ts` uses a `Map<string, WorkItem>`. No SQL, no NoSQL — injection attacks are irrelevant. Focus is entirely on business logic, state machine, and access control.
- **Soft-delete pattern:** `findById()` returns `undefined` for deleted items. BUT deleted items remain in the `Map` — stale references in `blockedBy` arrays are NOT cleaned up on delete, creating permanent dispatch-blocking (PEN-006).

### IDOR-Prone Routes

- `GET /api/work-items/:id` — no ownership check; any ID returns full item data including change history, assessments, dependency graph.
- `POST /api/work-items/:id/approve|reject|dispatch|route` — no ownership or role check; any caller can transition any item.
- `GET /api/work-items/:id/ready` — leaks full dependency graph for any item.

### Logic Flaw Hotspots

1. **`overrideRoute` in route action** (`workflow.ts:57`, `router.ts:66`) — user-controlled field that bypasses the entire assessment pod. High-priority check every run.
2. **`DISPATCH_TRIGGER_STATUSES` includes `Rejected`** — rejection cascades to auto-dispatch dependents. Counterintuitive; check `onItemResolved` logic after any status-machine changes.
3. **`setDependencies` is non-atomic** (`dependency.ts:220-238`) — remove-then-add creates a dispatch window. Watch if async is introduced to the store.
4. **`/api/intake/*` skips enum validation** — `type` and `priority` from webhook bodies bypass the guards in the main `/api/work-items` POST endpoint.

### State Machine Notes

- Valid transitions are in `Source/Shared/types/workflow.ts:VALID_STATUS_TRANSITIONS`.
- `routing` is a transient status; normally no item stays there, but errors can strand items there.
- `routing → approved` is a valid transition (allows manual approve before assessment runs).
- Terminal statuses: `completed` (no exits), `failed → backlog`, `rejected → backlog`.
- `RESOLVED_STATUSES = [completed, rejected, failed]` — rejected is treated as resolved, enabling PEN-005.

### Prometheus Metrics Labels (Useful for Recon)

- `work_items_created_total{source, type}`
- `work_items_assessed_total{verdict}`
- `work_items_routed_total{route}`
- `work_items_dispatched_total{team}`
- `dispatch_gating_events_total{event}` — `event=blocked` or `event=cascade_dispatched`
- `dependency_operations_total{action}` — `add/remove/set`
- `cycle_detection_events_total{detected}` — `true/false`
