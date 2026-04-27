# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-04-27

### Critical Discovery: Attack Surface Map Target Mismatch
- **Issue:** The pen-tester analyzed `Source/Backend/` (in-memory Map store, routes at `/api/work-items/*`). The ephemeral test environment (`docker-compose.test.yml`) runs `portal/Backend/` — a completely different SQLite-backed app with routes at `/api/feature-requests`, `/api/bugs`, `/api/cycles`, etc.
- **Action for future runs:** Always check actual running service routes BEFORE assuming the pen-tester map is accurate. Probe `/health`, then discover routes empirically.
- **Check command:** `curl -s docker-compose.test.yml portal-service-name's actual routes`

### Successful Exploit Chains

#### Chain 1: State Machine Bypass (CRITICAL — objective achieved)
- `POST /api/feature-requests` → creates FR in `potential`
- `PATCH /api/feature-requests/{id}` with `{"status":"voting"}` → skips `/vote` endpoint (AI simulation never fires), FR goes to `voting` with 0 votes
- `POST /api/feature-requests/{id}/force-approve` → FR jumps to `approved` with 0 votes cast
- **Key insight:** The PATCH endpoint enforces transition rules but doesn't enforce that `/vote` was called. The force-approve checks for `voting` status but not that any votes exist. Chain takes ~3 seconds.
- **Note:** Direct jumps via PATCH from `potential` to `approved`/`in_development`/`completed` are blocked by the transition validator. The bypass requires the intermediate `voting` state.

#### Chain 2: Dependency DoS (HIGH — partial objective)
- Create any item as "blocker", create victim item, `POST /dependencies` to add the link
- `DELETE /api/bugs/{blocker_id}` — hard delete removes the bug row, but `dependencies` table row survives
- Victim item's `/ready` endpoint now returns `unresolved_blockers: [{status: "unknown"}]` — permanently appears blocked
- **Recovery path exists:** `POST /dependencies {"action":"remove","blocker_id":"deleted-id"}` cleans the stale row. Not obvious to end users.
- **Root cause:** Missing `ON DELETE CASCADE` on `dependencies.blocker_item_id` foreign key.

#### Chain 3: Full Data Enumeration (HIGH — objective achieved)
- `GET /api/feature-requests` returns ALL items with no pagination (no limit parameter enforced)
- `GET /api/bugs` same behavior
- Search endpoint has hardcoded limit=20 but the list endpoints have no cap at all

### Dead Ends / Non-Issues

- **SQL Injection:** Not exploitable. `listBugs`/`listFeatureRequests` services use parameterized queries consistently for all filter parameters. The search endpoint uses in-memory JavaScript `.includes()` filtering, not SQL. No injection surface found.
- **Input length abuse:** NOT exploitable. Title limited to 200 chars, description to 10,000 chars at service layer. Both return 400 if exceeded. Express JSON body limit is 16KB.
- **State machine PATCH jumps (potential → completed):** Blocked. The transition validator in the service rejects invalid jumps and returns the allowed next states in the error message (which is an information disclosure).
- **Bug state machine via dedicated endpoints:** `/close` requires `resolved` status; `/reopen` from resolved/closed works but is legitimate. No bypass found via the state-specific endpoints.
- **Voting spam:** `/vote` endpoint requires `potential` status (not `voting`). If FR is already in `voting`, repeated calls to `/vote` return 400. Rate limiting irrelevant since voting is orchestrated, not user-driven.
- **Direct CORS bypass:** CORS is correctly configured to not return `Access-Control-Allow-Origin` for non-whitelisted origins. Browser-based cross-origin attacks are blocked. However, `Access-Control-Allow-Credentials: true` leaks for all origins (misconfiguration, forward risk).

### Useful Endpoints Confirmed

| Endpoint | Auth Required | Notes |
|----------|---------------|-------|
| GET /api/feature-requests | No | Returns all items, no pagination |
| POST /api/feature-requests | No | Creates items without limits |
| PATCH /api/feature-requests/:id | No | Can manipulate status (within transition rules) |
| POST /api/feature-requests/:id/force-approve | No | Skips voting if FR is in 'voting' state |
| DELETE /api/bugs/:id | No | Hard delete, no cascade on dependencies |
| GET /metrics | No | Full Prometheus metrics dump |
| GET /api/orchestrator/* | No | Proxies to internal orchestrator (SSRF surface) |

### Environment Notes

- Docker compose brings up portal in ~5-10 seconds (image is cached)
- Health check: `GET /health` returns `{"status":"ok"}` when ready
- The portal uses SQLite at `/app/Backend/data/dev-workflow.db` — ephemeral (tmpfs), resets on container restart
- Item IDs are sequential: FR-0001, FR-0002... and BUG-0001, BUG-0002... Counter is DB-driven (not global counter), so no duplicate on restart since tmpfs clears
- The orchestrator proxy at `/api/orchestrator/*` points to `http://localhost:8080` in test env (not running) — error leaks the URL
