# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-05-11

### Environment Discovery
- `docker-compose.test.yml` runs `portal/Backend` on port 3001 (feature management app with `/api/feature-requests`, `/api/bugs`, `/api/cycles`, etc.)
- The pen-tester analyzed `Source/Backend` (workflow engine with `/api/work-items` routes) — **these are two different applications**
- To test the pen-tester's findings: `cd Source/Backend && npm install && npm install tsconfig-paths --no-save && npm run build` then `PORT=3002 npx ts-node --project tsconfig.json -r tsconfig-paths/register src/app.ts`
- `Source/Backend` depends on `Source/Shared/types/workflow` via `@shared/` path alias — must use `tsconfig-paths/register` with ts-node or the dist fails to resolve `@shared/`

### Successful Exploit Chains

#### Chain 1: Full Workflow Takeover (3 requests)
- `POST /api/work-items` → `POST /:id/route {"overrideRoute":"fast-track"}` → `POST /:id/dispatch {"team":"TheATeam"}`
- Result: `backlog → approved → in-progress`, assessment never ran
- Evidence: `assessments: []` in final response; changeHistory shows `reason: "Fast-tracked: bypasses assessment pod"`

#### Chain 2: Full Data Exfiltration
- `GET /api/work-items?limit=999999` dumps all items
- `GET /api/dashboard/queue` dumps all items grouped by status with full nested arrays
- `GET /api/dashboard/activity?limit=999999` dumps full audit log
- Edge case: `limit=0` returns ALL items (not zero!) — default page 1 with limit=0 still returns data
- Edge case: `limit=-1` returns N-1 items (slice with negative index)
- Edge case: `page=-1` returns 0 items but leaks `total` count

#### Chain 3: Cascade Dispatch (5 requests)
- Create victim item → fast-track to `approved` → create blocker → inject blocker onto victim → route blocker → reject blocker
- `onItemResolved` fires after rejection, auto-dispatches approved victim
- Confirmed: `cascade-dispatcher` agent appears in changeHistory, Prometheus counter `dispatch_gating_events_total{event="cascade_dispatched"}` increments

#### Chain 4: Intake Injection
- `/api/intake/zendesk` accepts any payload with no HMAC — no 401, no signature header needed
- `type` and `priority` stored verbatim — XSS payloads accepted: `<img src=x onerror=alert(document.cookie)>`
- `priority: {"nested":"object"}` — object literal accepted as priority value
- `type: null` → falls back to default `WorkItemType.Bug` (safe fallback)
- `POST /api/intake/automated` creates items with `source: "automated"` — identical to legitimate pipeline events

### Soft-Delete UUID Disclosure
- `DELETE /api/work-items/:id` returns 204
- `GET /api/work-items/:id` after delete returns 404
- `GET /api/work-items/:id/ready` AFTER delete DISCLOSES deleted item's UUID in `unresolvedBlockers`
- Secondary impact: soft-deleted blocker permanently strands dependent (no auto-resolution)

### Assessment Bypass Pattern
- Create blocker without `complexity` field → `POST /assess` → pods return `needs-clarification` → stored as `rejected`
- `rejected` is in `RESOLVED_STATUSES` so dispatch gating check passes even though `hasUnresolvedBlockers: True`
- Dispatch endpoint doesn't re-check live blocker state — relies on stored status of blockers

### Metrics as Attack Oracle
- `workflow_items_created_total{source,type}` — reveals intake source types including injected values
- `dispatch_gating_events_total{event="cascade_dispatched"}` — reveals unauthorized cascade dispatches
- `cycle_detection_events_total{detected}` — reveals when cycle detection fires (useful for timing attacks)
- Prometheus endpoint `/metrics` requires NO authentication

### Dead Ends / Notes
- The `Source/Backend` has no persistent storage — all data resets on process restart
- DocId counter resets on restart — WI-011 gap (soft-deleted item) appears as a missing sequence number
- Error messages echo the raw ID from path params — no stack traces exposed (only item-not-found messages)
- `POST /:id/route` with empty body `{}` routes normally using content-based classification (not an error)
