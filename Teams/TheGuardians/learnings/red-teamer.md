# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-08-24

### Environment Discrepancy — CRITICAL for Future Runs
The `docker-compose.test.yml` runs the **portal backend** (`portal/Backend/`), NOT `Source/Backend/`. The pen-tester typically analyzes `Source/Backend/` statically. The attack surface maps will reference `Source/Backend/` file paths, but the live target is the portal backend. Always verify the running service routes before assuming pen-tester findings apply 1:1.

**Portal backend actual routes (confirmed live):**
- `GET/POST /api/bugs` — Bug management (SQLite-backed)
- `GET/POST /api/feature-requests` — Feature request lifecycle
- `POST /api/feature-requests/:id/vote` — AI voting trigger
- `POST /api/feature-requests/:id/approve` — Majority-vote approval
- `POST /api/feature-requests/:id/force-approve` — **NO AUTH** human override ⚠️
- `POST /api/feature-requests/:id/deny`
- `GET/POST /api/cycles` — Development cycle creation → triggers pipeline ⚠️
- `GET /api/pipeline-runs` — Pipeline run status (no auth)
- `GET /api/search?q=` — Cross-entity search (empty q dumps everything) ⚠️
- `POST /api/bugs/:id/dependencies` — Uses `blocker_id` field (not `target_id`)
- `GET /metrics` — Prometheus metrics (no auth) ⚠️
- `GET /health` — Health check

### Confirmed Exploit Chains

**Chain A — Full Pipeline Takeover (CRITICAL):**
1. `POST /api/feature-requests` (no auth)
2. `PATCH /api/feature-requests/:id {"status":"voting"}` (no state guard on PATCH)
3. `POST /api/feature-requests/:id/force-approve` (no auth, no votes required)
4. `POST /api/cycles` (no auth) → triggers pipeline run immediately

**Chain B — Permanent DoS via Soft-Delete IDOR:**
1. Add dependency: `POST /api/bugs/A/dependencies {"action":"add","blocker_id":"B"}`
2. Delete blocker: `DELETE /api/bugs/B`
3. Bug A has `has_unresolved_blockers: true` forever; `BUG-B` ID exposed in `blocked_by` array

**Chain C — Full Data Dump:**
- `GET /api/search?q=` → all entities returned (no auth, no min-length check)
- `GET /api/bugs?limit=9999999` → all bugs (no server-side cap)

### Successful Techniques
- **Force-approve endpoint** is the most powerful state machine bypass — no auth, no votes needed
- **Cycle creation** is unauthenticated and immediately triggers a live pipeline run
- **`status` field in PATCH** — state machine enforced for transitions, but only for _valid_ enum values; arbitrary strings rejected
- **XSS via title/description fields** — payloads stored verbatim, no sanitization
- **Empty search query** dumps all entities across types

### Dead Ends (No Breach)
- Arbitrary `severity` on `POST /api/bugs` → rejected (enum validated on create)
- Arbitrary `status` string via PATCH → rejected (enum validated)
- Invalid `status` transitions → rejected (state machine enforced on PATCH)
- Orchestrator SSRF via `/api/orchestrator/*` → returns `502 Orchestrator unreachable` (orchestrator not running in test env)
- Race condition concurrent transitions → SQLite serializes correctly; no double-transition observed
- 16KB+ body → Express `json({limit:'16kb'})` triggers 500 Internal Server Error (body parser crashes); not exploitable for significant data injection
- Path traversal on `/api/orchestrator/../health` → Express normalizes path, 404

### Dependency API Contract
- `POST /api/bugs/:id/dependencies` uses `{ "action": "add"|"remove", "blocker_id": "BUG-XXXX" }` — NOT `target_id` or `target_type`
- Feature request dependency format may differ — check featureRequests route

### Feature Request State Machine
- Valid transitions: `potential → voting`, `voting → approved` (via force-approve or majority)
- `force-approve` works from `voting` status only (blocks from `potential`)
- `vote` endpoint only works from `potential` status (triggers AI vote cycle)

### Portal Backend Notable Security Controls (Partial)
- Severity enum validated on create/update
- Status transitions validated on PATCH (no arbitrary strings)
- Body size limit: 16KB (Express middleware) — but triggers 500 not 413
- Bug description field has 10,000 char max (application-level, before body limit)
- Cycle creation: blocks second active cycle ("An active development cycle already exists")
