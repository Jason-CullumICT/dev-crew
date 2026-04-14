# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-04-14

### Codebase Fingerprint
- **Stack:** Express 4.18, TypeScript, in-memory Map store (no DB), pino logging, prom-client metrics, React/Vite frontend.
- **Auth:** **None.** Zero authentication or authorization anywhere in the codebase as of this run.
- **Data layer:** Single in-memory `Map<string, WorkItem>`. All data lost on restart. No persistence.

### High-Value Attack Patterns Found

#### 1. Fast-Track Override — Most Dangerous Single Entry Point
`POST /api/work-items/:id/route` accepts `{"overrideRoute":"fast-track"}` with no auth, sending any `backlog` item directly to `approved`. Combined with the unauthenticated `/dispatch` endpoint, this bypasses the entire 4-role assessment pod in 2 requests. Always probe this first.

#### 2. Non-Atomic `setDependencies` — Dependency Stripping via Partial Failure
`PATCH /api/work-items/:id` with `{"blockedBy":["valid_id","nonexistent_id"]}` causes `setDependencies` to remove all existing blockers before the non-existent ID throws. The error is caught at the route level but the side effects (blocker removal) already committed. Repeat once more with `{"blockedBy":["nonexistent_id"]}` to strip all blockers. This unlocks dispatch-blocked items.

#### 3. Soft-Deleted Blocker = Permanent Dispatch Block
`store.findById()` returns `undefined` for soft-deleted items. `computeHasUnresolvedBlockers` treats `!blocker` as unresolved. Deleting a blocker item permanently blocks all its dependents. No recovery path. This is a DoS via `DELETE /api/work-items/:blockerId`.

#### 4. Unbounded `limit` Parameter
No upper-bound cap on `?limit=` in `/api/work-items`, `/api/dashboard/activity`. `?limit=999999` dumps the full store. Also `?limit=-1` → `slice(0,-1)` returns all-but-last record.

#### 5. Intake Endpoints Skip Enum Validation
`POST /api/intake/zendesk` and `/automated` use `body.type || default` without validating against `WorkItemType` enum. Arbitrary string types can be injected. Regular `POST /api/work-items` does validate. Asymmetry is the exploit.

#### 6. Missing `/api/search` Route
The frontend's DependencyPicker calls `/api/search` which is not wired up in `app.ts`. Every search returns 404. Confirmed in `tests/routes/search.test.ts` which documents the gap as intentional but unimplemented.

### IDOR-Prone Routes
- `GET /api/work-items/:id` — no ownership check; UUID is the only gate (UUIDs are not secret)
- `POST /api/work-items/:id/approve` — no user-item relationship check
- `POST /api/work-items/:id/dispatch` — no team membership verification
- `POST /api/work-items/:id/dependencies` — blockerId not validated as UUID format before lookup

### Logic Flaw Hotspots
- `dependency.ts:setDependencies` — non-atomic remove-then-add
- `dependency.ts:computeHasUnresolvedBlockers` — deleted item treated as unresolved
- `router.ts:classifyRoute` — `overrideRoute` bypasses all heuristics with no guard
- `assessment.ts:assessWorkItem` — `NeedsClarification` verdict collapses to `Rejected` silently
- `workflow.ts:onItemResolved` — cascade dispatch triggered by rejection (not just completion)

### Change History as Side Channel
All change history entries (including assessment pod reasoning, reject reasons, agent identifiers) are returned in full via `GET /api/dashboard/queue` and embedded in every work item response. Useful for reconstructing internal workflow state without any auth.

### Items Never Persist in `routing` Status
Despite `VALID_STATUS_TRANSITIONS[routing]` including `[proposed, approved]`, items never persist in `routing` status. `routeWorkItem` writes `routing` only to `changeHistory`, not to `item.status` in the store. The single `store.updateWorkItem` call sets `result.targetStatus` (proposed or approved) atomically. The `routing → approved` transition in the approve endpoint is therefore theoretically unreachable via normal flow.
