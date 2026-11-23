# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-11-23

### Critical Discovery: Target Mismatch
- The pen-tester's attack surface map (`attack-surface-map.md`) analyzed `Source/Backend` (workflow engine with `/api/work-items` routes).
- The **actual running test environment** (`docker-compose.test.yml`) runs the **portal backend** in `portal/Backend/` with different routes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/features`, `/api/learnings`, `/api/pipeline-runs`, `/api/team-dispatches`, `/api/search`.
- Always check `docker-compose.test.yml` and probe actual live routes before assuming pen-tester's route map matches the running service.
- Container name: `dev-crew-portal-1` on ports `3001` (backend API) and `5173` (frontend).

### Confirmed Exploit Chains

#### RED-001: Full State Machine Bypass (Critical)
- Chain: `POST /api/feature-requests` (no auth) → `PATCH /:id` with `{"status":"voting"}` → `POST /:id/force-approve`
- All three steps return 200/201 with zero credentials.
- `force-approve` is an admin-only action but has no auth check.
- End state: `status:"approved"`, `human_approval_approved_at` stamped.

#### RED-002: Full Data Enumeration + Delete (Critical)
- `GET /api/feature-requests` — all items, no auth, no pagination enforcement needed.
- `GET /api/dashboard/summary` — full system inventory (counts by status/severity).
- `GET /api/dashboard/activity` — full audit trail of recent state changes.
- `DELETE /api/feature-requests/:id` — permanent item deletion, no auth. HTTP 204.

#### RED-003: Stale Dependency DoS (High)
- Create blocker FR, add dependency on target FR via `POST /:id/dependencies` with `{"action":"add","blocker_id":"FR-XXXX"}`.
- DELETE the blocker → stale entry appears with `status:"unknown"`, `title:"Unknown"`.
- Target's `has_unresolved_blockers` stays `true`.
- Note: Recoverable — attacker or admin can call `remove` action on the stale dependency.

#### RED-004: Unvalidated `source_system` Field (High)
- `POST /api/bugs` with `{"source_system":"INJECT; DROP TABLE bugs;--"}` → HTTP 201, stored verbatim.
- Bugs validate `severity` against enum but NOT `source_system`.
- Feature requests validate `priority` weakly.

#### RED-005: Unauthenticated Metrics (Medium)
- `GET /metrics` → full Prometheus export including `feature_request_status_transitions_total`, `ai_voting_invocations_total`, all HTTP route timings and counts.
- Leaks complete route map and usage patterns.

#### RED-006: Cross-Entity Dependency Injection (Medium)
- Bugs can be used as blockers for feature requests via `blocker_id: "BUG-XXXX"`.
- No cross-entity link validation.

### Dead Ends / Non-Issues
- `/api/feature-requests?limit=999999` — no pagination parameters exposed; API returns `{data:[...]}` without limit/total pagination fields — this is a simple list, not unbounded pagination issue.
- `PATCH` with `{"blocked_by":[...]}` direct array injection → HTTP 500 (server error, not exploitable data injection).
- `POST /:id/deny` on `approved` items → correctly rejected (409).
- `POST /:id/retrigger` on `approved` items → correctly rejected (400).
- Bug `severity` field IS validated against enum `["low","medium","high","critical"]` — rejects invalid values.

### API Parameter Notes
- Dependencies endpoint: `blocker_id` (not `blockerId`) — snake_case.
- Bug required fields: `title`, `description`, `severity` (not `priority`).
- FR optional fields: `source`, `priority`, `target_repo`.
