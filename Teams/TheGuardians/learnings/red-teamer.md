# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-05-18

### Environment Setup
- **Target app:** `Source/Backend/src/app.ts` (the workflow engine, NOT `portal/Backend`)
- `docker-compose.test.yml` spins up `portal/Backend` on port 3001 (different app with different routes)
- `Source/Backend` must be started separately: `cd Source/Backend && PORT=3002 npx tsx src/app.ts &`
- Source/Backend has no pre-built dist — must use `tsx` (TypeScript runtime) directly
- Source/Backend starts in ~3 seconds via tsx; wait for `{"status":"ok"}` from `/health`
- The previous agent run left Source/Backend running on port 3002 (in-memory store has prior run data)

### Successful Exploit Chains

#### State Machine Bypass (PEN-002)
- `POST /api/work-items/{id}/route` with `{"overrideRoute":"fast-track"}` works on ANY item in backlog
- No role check anywhere. Transitions directly: `backlog → routing → approved` (skips all assessment)
- THEN `POST /api/work-items/{id}/dispatch` completes to `in-progress` in one more call
- Variant: `{"overrideRoute":"FAST-TRACK"}` (uppercase) does NOT bypass — case-sensitive match required
- Variant: `{"overrideRoute":"invalid-value"}` stores the string as route label and goes to `proposed` (non-fast-track path)

#### Enum Injection via Intake (PEN-003)
- `POST /api/intake/zendesk` and `POST /api/intake/automated` accept ANY string for `type` and `priority`
- No 400 returned — items are persisted with arbitrary values
- Injected type values appear as Prometheus metric labels in `/metrics` — telemetry pollution confirmed
- The main `POST /api/work-items` endpoint DOES validate enums; only intake bypasses this

#### Cascade Dispatch (PEN-004)
- Chain: create A, create B, add B as blocker of A, route A to approved, route B to proposed, reject B
- After blocker B is rejected, `onItemResolved` fires and auto-dispatches A to `in-progress`
- `cascade-dispatcher` agent sets `assignedTeam` automatically (e.g., TheFixer)
- Key step: A must be in `approved` status for cascade to fire — fast-track is the easiest way to get there

#### Soft-Deleted Blocker DoS (PEN-006)
- `DELETE /api/work-items/{id}` soft-deletes the item (returns 200 or 204)
- Deleted item returns 404 on GET, but `blockedBy` links in dependents are NOT cleaned up
- `GET /api/work-items/{victim}/ready` returns `{ready: false, unresolvedBlockers: [{...deleted item id...}]}`
- `POST /api/work-items/{victim}/dispatch` returns 400 permanently
- Manual fix: `POST /api/work-items/{victim}/dependencies` with `{"action":"remove","blockerId":"{deleted-id}"}` restores dispatchability

#### Pagination Bypass (PEN-005)
- `limit=999999999` → returns all items (confirmed with 19 items)
- `limit=-1` → returns all-except-last (JavaScript `Array.slice(0, -1)`)
- `limit=0` → falls back to default 20 (JS falsy check `0 || 20`)
- `limit=abc` → NaN, falls back to default 20 (same falsy check)
- `GET /api/dashboard/activity?limit=999999999` has the SAME flaw — returned 66 entries
- Objective confirmed: full dataset dump in one unauthenticated request

#### Assessment Logic Flaw (PEN-008)
- Create a `feature` type item with NO `complexity` field
- Route with no override → goes to `full-review → proposed`
- Assess → `domain-expert` returns `needs-clarification`, `pod-lead` returns `needs-clarification`
- Final status: `rejected` (not `needs-clarification`) — the hard rejection mapping is confirmed

### Dead Ends / Partial Results
- **PEN-013 `/api/search`**: Returns 404 as expected — endpoint not registered. Skip until implemented.
- **`limit=0` and `limit=abc`**: Partially mitigated by JS falsy coercion. The pen-tester's prediction of `Infinity/NaN` totalPages was WRONG — these values fall back to the default of 20. Only large positive and negative values are exploitable.
- **CORS (PEN-010)**: No CORS headers present, which is actually the safer state. Without `Access-Control-Allow-Origin: *`, browser SOP blocks cross-origin reads. This only becomes dangerous if CORS is later misconfigured.

### New Finding (Beyond Pen-Tester Scope)
- **Body parser 500 vs 413**: `express.json()` with no explicit `limit` defaults to 100KB. Payloads exceeding ~100KB return HTTP 500 ("Internal server error") instead of 413 ("Payload Too Large"). The error handler doesn't handle `PayloadTooLargeError`. This obscures the limit from clients and should return 413.

### Metrics Endpoint Intelligence (PEN-007)
- `GET /metrics` returns Prometheus text with no auth
- Confirmed counters: `workflow_items_created_total{source,type}`, `workflow_items_routed_total{route}`, `workflow_items_assessed_total{verdict}`, `workflow_items_dispatched_total{team}`, `dispatch_gating_events_total{event}`, `cycle_detection_events_total{detected}`
- Injected enum values from PEN-003 appear as metric labels — an attacker can enumerate what injections were accepted

### Timings / Order
- Always build dependency chains WITHIN the same session (in-memory store resets on restart)
- Fast-track bypass is the fastest way to get any item to `approved` for further chaining
- Assess endpoint is async but responds quickly (~50ms); no need for polling
