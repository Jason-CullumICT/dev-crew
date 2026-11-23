# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-11-23

### Architecture Notes (Codebase-Specific)
- **In-memory store only** — no database; all data in `Map<string, WorkItem>` in `workItemStore.ts`. State resets on server restart. No SQL injection surface; attack focus is business logic and auth.
- **Zero authentication** — this is the single most critical systemic issue. No auth middleware exists anywhere in `app.ts`. All endpoints are anonymous by design (or by omission).
- **Status machine is data-driven** — transitions are enforced via `VALID_STATUS_TRANSITIONS` lookup table in `Shared/types/workflow.ts`. The table itself allows `routing → approved` which is a logic bypass path.

### IDOR-Prone Routes
- All `:id` routes (`/api/work-items/:id`, `/api/work-items/:id/route`, etc.) are IDOR-vulnerable because there is no ownership model. Any caller knowing a valid UUID can read, modify, approve, reject, or delete any item.

### Logic Flaw Hotspots
1. **`onItemResolved()` in dependency.ts** — called on BOTH `Completed` and `Rejected` statuses. Rejection triggering cascade dispatch is an almost certainly unintended behavior.
2. **`computeHasUnresolvedBlockers()`** — treats `findById() == undefined` (soft-deleted item) as "unresolved blocker". Soft-deleting a blocker permanently blocks dependent items.
3. **`runAssessmentPod()` verdict mapping** — `NeedsClarification` falls into `else → Rejected`. No `needs-clarification` state exists in the status machine.
4. **`classifyRoute()` with `overrideRoute`** — if body contains `overrideRoute`, it is applied with zero authorization. Unauthenticated callers can fast-track any item.

### Entry Points with No Enum Validation
- `POST /api/intake/zendesk` — `body.type` and `body.priority` not validated against enums (contrast: `POST /api/work-items` does validate)
- `POST /api/intake/automated` — same gap

### Pagination Attack Surface
- `GET /api/work-items?limit=N` — no upper bound; `N=999999` returns all items
- `GET /api/dashboard/activity?limit=N` — same pattern in `dashboardService.getActivity()`
- Non-numeric `page`/`limit` values → `parseInt()` returns `NaN` → silent empty-data response

### Low-Noise Entry Points (Unauthenticated, No Side Effects)
- `GET /metrics` — Prometheus exposition; reveals counters, labels, throughput
- `GET /api/dashboard/summary` — reveals full status/team/priority distribution
- `GET /api/work-items/:id/ready` — reveals dependency graph structure
