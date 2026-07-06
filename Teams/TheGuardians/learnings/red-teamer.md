# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-07-06

### Environment Discovery
- `docker-compose.test.yml` deploys `portal/` (debug UI backend) on port 3001 — this is a DIFFERENT application from `Source/Backend/` (the workflow engine). The pen-tester analyzed `Source/Backend/`, not `portal/`.
- To test `Source/Backend/` findings: install deps with `npm install` in `Source/Backend/`, then start with `PORT=3002 npx tsx src/app.ts &`. Port 3002 was already occupied by a prior run — check `ss -tlnp` before picking a free port.
- The `/` root route returns 404 (no default handler) — use `/health` to confirm the service is up.
- Source/Backend uses `require('uuid')` for IDs and `pino` for logging.

### Confirmed Exploit Chains

#### CHAIN-A: Full Lifecycle Bypass (PEN-001 + PEN-002) — CRITICAL
- `POST /api/work-items` → `POST /:id/route {"overrideRoute":"fast-track"}` → `POST /:id/dispatch {"team":"TheATeam"}`
- Result: item goes backlog → approved → in-progress with `assessments: []` in 3 unauthenticated calls
- Key payload: `{"overrideRoute":"fast-track"}` on the `/route` endpoint
- Change history annotation: `"Fast-tracked: bypasses assessment pod"` — confirms bypass in response body

#### CHAIN-B: Direct Approve Skip (PEN-001 + PEN-003) — HIGH
- `POST /api/work-items` → `POST /:id/route {"overrideRoute":"full-review"}` → `POST /:id/approve {"reason":"..."}`
- Result: item goes proposed → approved with `assessments: []`
- The `/approve` endpoint accepts items in `proposed`, `reviewing`, OR `routing` state — all three bypass assessment

#### CHAIN-C: Full Store Dump (PEN-001 + PEN-004) — HIGH
- `GET /api/work-items?limit=9999999` dumps entire store in one response
- `GET /api/dashboard/activity?limit=9999999` dumps all change history across all items
- `limit=-1` returns N-1 items (all except last) — unexpected slice behavior, not an error
- `limit=abc` silently falls back to 20 — no 400 returned

#### CHAIN-D: Ghost Blocker DoS (PEN-001 + PEN-007) — HIGH (Partial)
- Create A (blocker), B (dependent). Add dependency `B blocked by A`. Approve B. `DELETE /A`. Now B is undispatchable.
- `computeHasUnresolvedBlockers` returns true when `findById(blockerItemId)` returns undefined (deleted item)
- **Mitigation escape hatch exists**: `POST /:id/dependencies {"action":"remove","blockerId":"<deleted-uuid>"}` returns 204 and clears the link even when the blocker is deleted. An attacker doing this offensively could be mitigated by an admin who knows the deleted UUID (leaked in the dispatch error body).
- The dispatch error body LEAKS the deleted blocker's full UUID and docId — useful for cleanup but also confirms soft-delete state to attacker

#### CHAIN-E: Cascade Hijack (PEN-001 + PEN-006) — HIGH
- Create A (blocker), B and C (dependents blocked by A). Fast-track approve B and C. Route A to proposed. `POST /A/reject`.
- Result: A → rejected, B and C automatically → in-progress via `onItemResolved()` cascade WITHOUT any `/dispatch` call
- Confirmed by Prometheus: `dispatch_gating_events_total{event="cascade_dispatched"} 2`

#### CHAIN-F: Intake Injection (PEN-001 + PEN-005) — HIGH
- `POST /api/intake/zendesk {"title":"T","description":"D","type":"MALICIOUS_VALUE","priority":"critical"}` → HTTP 201
- `POST /api/intake/automated {"title":"T","description":"D","type":"arbitrary_invalid"}` → HTTP 201
- No `X-Zendesk-Webhook-Signature` header required — no validation at all
- Invalid enum values stored verbatim; visible in `/metrics` under `workflow_items_created_total{type="MALICIOUS_VALUE"}`

### Dead Ends / Non-Exploitable

- **Direct soft-deleted item access**: `GET /api/work-items/:deleted-id` returns 404. `POST /:id/route`, `POST /:id/approve` on deleted items return 404. Soft-delete is protected at the route level. The ONLY exploit path is via dependency links (PEN-007/CHAIN-D).
- **`POST /assess` verdict injection**: The endpoint ignores submitted `role` and `verdict` body fields entirely. It always runs the automated assessment pod. Cannot force a specific verdict via this endpoint. Use CHAIN-B (`/approve`) to skip assessment instead.
- **Approved item approve**: Sending `POST /approve` on an already-approved item returns a transition error — terminal state guard works for same-status re-approvals.

### Key Observations
- The `POST /api/work-items` main route validates `type` enum but the intake routes do NOT — a deliberate asymmetry that enables CHAIN-F
- The `/assess` endpoint triggers the full automated assessment pod — it is NOT a manual role-submission endpoint. Body fields are decorative/ignored.
- All 5 confirmed exploits required zero authentication headers — PEN-001 is the root cause enabling all chains
- The `/metrics` endpoint is a post-exploit gold mine: it records all attack traces including injected enum values
- Source/Backend required fields for `POST /api/work-items`: `title`, `description`, `type` (feature|bug|...), `priority`, `source` (browser|zendesk|manual|automated)
