# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-11-02

### Codebase Architecture
- **Backend**: Express.js, TypeScript, in-memory Map store (no database). `Source/Backend/src/`
- **State machine** defined in `Source/Shared/types/workflow.ts` (`VALID_STATUS_TRANSITIONS`)
- **No persistence layer** — all data is lost on restart; no SQL injection surface
- **No authentication layer** — zero auth middleware anywhere (as of this run)

### Key Attack Surfaces

#### Authentication
- **No auth at all** — `app.ts` registers zero auth middleware. Every endpoint is open.
- There is no JWT, session, API key, or any identity mechanism.
- All CRUD, all state transitions, all dashboard data, and Prometheus metrics are fully public.

#### State Machine Bypass Paths
- `proposed → approved` is in `VALID_STATUS_TRANSITIONS`. The manual `/approve` endpoint checks only the state machine, not whether assessment was completed. Items can skip the assessment pod by directly calling `/approve` after `/route`.
- `overrideRoute: "fast-track"` in `/route` body skips assessment entirely — no role check on this field.
- **VALID_STATUS_TRANSITIONS** (important to know):
  - `backlog → routing`
  - `routing → proposed, approved`
  - `proposed → reviewing, approved, rejected`
  - `reviewing → approved, rejected`
  - `approved → in-progress`
  - `rejected → backlog`
  - `in-progress → completed, failed`

#### Pagination
- `GET /api/work-items?limit=N` — N is not capped. `limit=999999` returns all items.
- `GET /api/dashboard/activity?limit=N` — same unbounded pattern.
- `parseInt(limit) || 20` — `limit=0` safely defaults to 20 (0 is falsy), but `limit=-1` passes through as -1 (truthy), causing `slice(0, -1)` which returns all but the last item.

#### Intake Routes (High Value)
- `POST /api/intake/zendesk` and `POST /api/intake/automated` do NOT validate `type` or `priority` enum values — unlike the main `/api/work-items` POST which does validate.
- Invalid enum values stored directly in `WorkItem.type` / `WorkItem.priority`.
- No Zendesk HMAC signature check.

#### Assessment Pod Logic (Deterministic)
- `assessAsRequirementsReviewer`: approves if `title.trim().length >= 5` AND `description.trim().length >= 20`
- `assessAsDomainExpert`: approves if BOTH `item.complexity` and `item.priority` are set (non-null)
- `assessAsWorkDefiner`: **always approves** (hardcoded `AssessmentVerdict.Approve`)
- Pod lead: approves only if zero rejections. NeedsClarification → rejected (maps to Rejected status)
- Guaranteed approval recipe: title ≥ 5 chars, description ≥ 20 chars, valid complexity set, valid priority set.

#### Cascade Dispatch
- `onItemResolved` is called after `/reject` succeeds — auto-dispatches dependent items in `approved` status if blocker is now resolved.
- `RESOLVED_STATUSES = [completed, rejected, failed]` — rejection counts as resolving a blocker.

#### Soft-Delete
- `findById` properly returns `undefined` for `deleted: true` items — no IDOR via direct ID access.
- `updateWorkItem` also checks `item.deleted` — no modification bypass.
- Soft-deleted item IDs still exist in the Map but are inaccessible via API.

#### No Race Conditions
- All store operations are synchronous Map reads/writes. Node.js single-threaded event loop means no traditional race conditions for synchronous code.

### Routes Quick Reference
```
POST   /api/work-items                   — create (validates: title, desc, type, priority, source enums)
GET    /api/work-items                   — list (pagination: page, limit; filters: status, type, priority, source)
GET    /api/work-items/:id               — get by ID
PATCH  /api/work-items/:id               — update (allowed fields: title, desc, type, priority, complexity, blockedBy)
DELETE /api/work-items/:id               — soft delete
POST   /api/work-items/:id/route         — backlog→routing→(proposed|approved); body: {overrideRoute?}
POST   /api/work-items/:id/assess        — proposed|reviewing → approved|rejected (runs assessment pod)
POST   /api/work-items/:id/approve       — manual approve (requires valid state-machine transition)
POST   /api/work-items/:id/reject        — manual reject (requires reason, triggers cascade)
POST   /api/work-items/:id/dispatch      — approved→in-progress; body: {team?}; validates team name
POST   /api/work-items/:id/dependencies  — add/remove dependency; body: {action, blockerId}
GET    /api/work-items/:id/ready         — readiness check (unresolved blockers)
GET    /api/dashboard/summary            — status/team/priority counts
GET    /api/dashboard/activity           — paginated change history across all items
GET    /api/dashboard/queue              — items grouped by status
POST   /api/intake/zendesk              — webhook (no sig check, no enum validation)
POST   /api/intake/automated            — webhook (no enum validation)
GET    /metrics                          — Prometheus metrics (no auth)
GET    /health                           — health check
```
