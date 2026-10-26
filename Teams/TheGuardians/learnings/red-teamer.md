# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-10-26 — Portal Backend (docker-compose.test.yml)

### Target Clarification
The pen-tester analyzes `Source/Backend/` but the **live test target is `portal/Backend/`**. These are different applications. Always verify routes against the live running container — do not assume the pen-tester's findings map 1:1. The portal uses SQLite (better-sqlite3), has different route structures, but analogous vulnerabilities exist.

### Confirmed Working Exploit Chains

**Chain: State Machine Bypass (4/4 objectives)**
1. `POST /api/feature-requests` — create item (valid source values: `manual`, `zendesk`, `competitor_analysis`, `code_review`)
2. `PATCH /api/feature-requests/:id` `{"status":"voting"}` — advance from `potential` to `voting` (legal transition, no auth)
3. `POST /api/feature-requests/:id/force-approve` — bypass vote majority requirement entirely
4. Result: item reaches `approved` with zero votes, no auth, no role check

**Chain: Ghost Blocker DoS**
1. Create attacker-controlled item (A)
2. `POST /api/feature-requests/<victim-id>/dependencies` `{"action":"add","blocker_id":"<A-id>"}` — no ownership check
3. `DELETE /api/feature-requests/<A-id>` — hard delete; `dependencies` table has no FK cascade
4. Victim item permanently shows `has_unresolved_blockers: true` with `status: "unknown"`
5. Victim must know the deleted ID to clean up via `{"action":"remove","blocker_id":"<A-id>"}`

**Chain: Full Store Dump**
- `GET /api/feature-requests?limit=1` returns ALL items (limit parameter is entirely ignored by the list service)

### Dead Ends / Not Applicable in Portal
- PEN-002 (`overrideRoute: "fast-track"`) — does NOT exist in portal; portal has `/force-approve` instead
- PEN-004 (webhook intake) — portal has no `/api/intake/*` routes
- PEN-007 (missing search route) — portal HAS `/api/search` implemented (returns `{"data":[]}`)
- PEN-008 (cascade dispatch via reject) — portal has no `/reject` endpoint; cascade pattern not present
- Source/Backend routes (`/api/work-items`) — these routes do not exist in the portal container

### API Notes
- Portal routes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/dashboard`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/search`, `/api/team-dispatches`
- Valid `source` values: `manual`, `zendesk`, `competitor_analysis`, `code_review`
- Valid `priority` values: `low`, `medium`, `high`, `critical`
- ID format: `FR-XXXX` (feature requests), `BUG-XXXX` (bugs) — sequential integers
- Body limit: 16 KB; >16 KB returns 500 (not 413 — error handler bug)
- CORS: configured to `localhost:5173` only, but server PROCESSES all requests regardless of origin (CORS is browser-enforcement only)
- `/metrics` endpoint: no auth, returns full Prometheus telemetry

### Tool Observations
- `curl -sf http://localhost:3001/` returns non-200 (root route not registered) — use `/health` for health checks
- Rate limiting: zero — 100 rapid requests return 0 × 429
