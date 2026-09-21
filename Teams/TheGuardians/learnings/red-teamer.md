# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-09-21 — Portal Backend (docker-compose.test.yml)

### Environment Discovery
- The pen-tester analyzed `Source/Backend/` (in-memory store, `/api/work-items` routes).
- The running test environment (`docker-compose.test.yml`) uses `portal/Backend/` — a **different codebase** with SQLite storage and different domain model.
- Always check `docker logs <container>` at the start of a run to identify the actual service, not just the code path the pen-tester analyzed.
- Actual port mapping: `3001` = Express API, `5173` = Vite frontend (both in same container).
- Health endpoint: `GET /health` returns `{"status":"ok"}`. Root `/` returns 404 — use `/health` to verify liveness.

### Confirmed Working Exploit Chains

#### Chain 1: State Machine Bypass (3 requests, ~1 second)
```
POST /api/feature-requests          # Create item in "potential" status (no auth)
PATCH /api/feature-requests/:id     # body: {"status":"voting"}  (valid transition, no auth)
POST /api/feature-requests/:id/force-approve  # Instantly approved, bypasses AI voting (no auth)
```
- Bypasses: AI voting quorum (normally 5 agent votes required), any human approval gate.
- Works for any feature request regardless of priority/type.

#### Chain 2: Full CI/CD Pipeline Takeover (12 requests, ~30 seconds)
```
POST /api/cycles                                          # Trigger new dev cycle (no auth)
# For n in 1..5:
POST /api/pipeline-runs/:id/stages/{n}/start              # Start stage n (no auth)
POST /api/pipeline-runs/:id/stages/{n}/complete           # Complete with verdict=approved (no auth)
```
- Pipeline status goes `running` → `completed` with all 5 stages `approved`.
- Bypasses: requirements review, API contract, implementation, QA, integration.
- Important: stage must be in `running` status to complete. Start before complete.
- Stage 3 (implementation) can sometimes be skipped if already `running` from a start call — just complete it directly.

#### Chain 3: Stale Blocker DoS (4 requests)
```
POST /api/feature-requests          # Create blocker A
POST /api/feature-requests          # Create dependent B
POST /api/feature-requests/B/dependencies  # body: {"action":"add","blocker_id":"A"}
DELETE /api/feature-requests/A      # Delete A without removing dependency link
```
- B becomes permanently stuck in `pending_dependencies` — `has_unresolved_blockers=true` permanently.
- Recovery requires: `POST /api/feature-requests/B/dependencies` with `{"action":"remove","blocker_id":"A"}`.
- The `/ready` endpoint reveals ghost blockers: `{"ready":false,"unresolved_blockers":[{"title":"Unknown","status":"unknown"}]}`.

### Actual Route Map (portal/Backend)
- `GET/POST /api/feature-requests` — feature requests (no auth)
- `GET/PATCH/DELETE /api/feature-requests/:id` — single item ops (no auth)
- `POST /api/feature-requests/:id/vote` — cast vote (no auth)
- `POST /api/feature-requests/:id/approve` — normal approve (requires voting status, checks vote consensus)
- `POST /api/feature-requests/:id/force-approve` — bypass approve (requires voting status only, no auth)
- `POST /api/feature-requests/:id/retrigger` — reset and re-run AI votes (no auth)
- `POST /api/feature-requests/:id/deny` — deny (requires `comment` field)
- `POST /api/feature-requests/:id/dependencies` — add/remove blocker links (no auth)
- `GET /api/feature-requests/:id/ready` — readiness check (reveals ghost blockers)
- `GET/POST /api/bugs` — bugs (no auth)
- `GET/POST /api/cycles` — development cycles (no auth); POST auto-selects next approved FR
- `GET /api/pipeline-runs` — list runs (no auth)
- `GET /api/pipeline-runs/:id` — get run detail (no auth)
- `POST /api/pipeline-runs/:id/stages/:n/start` — start stage (no auth)
- `POST /api/pipeline-runs/:id/stages/:n/complete` — complete stage with verdict (no auth)
- `GET /metrics` — Prometheus metrics (no auth, leaks route+ID data)
- `GET /health` — health check (intentionally public)

### Dead Ends
- `POST /api/feature-requests/:id/reject` → 404 (endpoint does not exist)
- `POST /api/feature-requests/:id/route` → 404 (pen-tester's route endpoint not present in portal backend)
- `PATCH /api/feature-requests/:id` with `{"status":"approved"}` directly → blocked (valid transitions enforced)
- `PATCH /api/feature-requests/:id` with `{"status":"implemented"}` → blocked (all invalid transitions rejected)
- `force-approve` from `potential` status → 409 "must be in voting status" (transition guard partially works)
- Cycle creation when one already active → 409 "An active development cycle already exists"
- `PATCH /api/pipeline-runs/:id/stages/:stageId` (PATCH by UUID) → 404 (use stage number, not UUID)
- `sqlite3` not available in container — cannot directly query DB

### Key Observations
- The PATCH endpoint for feature-requests allows `status` transitions but validates them via a state machine — some transitions blocked, not all.
- `force-approve` requires `voting` status but NO authentication — this is the critical gap.
- Pipeline stage completion requires the stage to be in `running` status first — always call `start` before `complete`.
- The cycle service auto-selects the next approved feature request as the work item — attacker doesn't need to know item IDs.
- Metrics endpoint leaks exact FR/BUG IDs from route parameter labels (e.g. `route="/api/feature-requests/FR-0001/approve"`).
- No rate limiting anywhere — 50 concurrent flood requests all accepted in 147ms.
