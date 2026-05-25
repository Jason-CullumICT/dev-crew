# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-05-25

### Critical Discovery: Codebase Mismatch
The pen-tester analyzes `Source/Backend/` (work-item/state-machine domain) but the live Docker service (`docker-compose.test.yml`) runs `portal/Backend/` (feature-request/voting domain). Both share the same vulnerability classes. Map pen-tester findings to portal routes before executing.

**Portal route map:**
- Work items → Feature Requests (`/api/feature-requests`)
- State transitions → `/vote`, `/approve`, `/force-approve`, `/deny`, `/retrigger`
- Dispatch → `/force-approve` (moves to `approved` or `pending_dependencies`)
- Dependencies → `/api/feature-requests/:id/dependencies` + `/ready`
- Metrics → `/metrics` (unauthenticated, identical to PEN-014)
- Search → `/api/search` (implemented, returns data on empty query)

### Successful Exploit Chains

**Chain A — State Machine Full Bypass (CONFIRMED):**
```
POST /api/feature-requests                     → creates FR (potential)
POST /api/feature-requests/:id/vote            → triggers AI voting (potential→voting)
POST /api/feature-requests/:id/force-approve   → approved (NO AUTH, no majority check)
```
All 3 objectives achieved in 3 unauthenticated requests.

**Chain B — Vote Retrigger Farming (CONFIRMED):**
```
POST /api/feature-requests                     → creates FR
POST /api/feature-requests/:id/vote            → initial votes (may be deny majority)
POST /api/feature-requests/:id/retrigger       → re-roll votes (loop until approve majority)
POST /api/feature-requests/:id/approve         → approved
```
No rate limit on retrigger. Confirmed: deny majority → unanimous approve in 2 retriggers.

**Chain C — Deny Without Voting (CONFIRMED):**
```
POST /api/feature-requests                     → creates FR (potential)
POST /api/feature-requests/:id/deny            → {"comment":"..."}  → denied (no vote, no auth)
```
Skips voting entirely. Works from `potential` AND `voting` status.

**Chain D — Dependency DoS (CONFIRMED):**
```
POST /api/feature-requests (×2)                → blocker + dependent
POST /api/feature-requests/DEP/dependencies    → {"action":"add","blocker_id":"BLOCKER"}
DELETE /api/feature-requests/BLOCKER           → hard delete (HTTP 204)
GET /api/feature-requests/DEP/ready            → {ready:false, unresolved_blockers:[{id:BLOCKER}]}
```
Dependent permanently stuck in `pending_dependencies`. No recovery. Deleted item ID leaked.

**Chain E — Hard Delete + ID Reuse (CONFIRMED):**
```
DELETE /api/feature-requests/:id               → HTTP 204, record gone
POST /api/feature-requests                     → new FR gets SAME id (sequential reuse!)
```
Stale references to deleted IDs now point to attacker-created content.

### Dead Ends

- **PATCH status injection**: Invalid status strings correctly rejected with 400 — enum validation works
- **SQL injection via PATCH status**: SQLite parameterized queries prevent injection
- **PATCH pending_dependencies → approved**: Gating check re-applies; status stays pending_dependencies
- **CORS bypass**: `Access-Control-Allow-Origin` NOT sent for untrusted origins — restricted origin list works
- **Regex injection via search ?q=.***: Returns 0 results — SQLite LIKE search, not regex — no ReDoS
- **Source field injection**: Validated against enum list — invalid sources rejected
- **Priority injection**: Validated — invalid priorities rejected

### Endpoints That Responded to Probing

- `GET /api/feature-requests` — returns all items, no auth, no pagination limit
- `POST /api/feature-requests` — creates FR, only requires title + description
- `POST /api/feature-requests/:id/vote` — triggers AI vote simulation, no auth
- `POST /api/feature-requests/:id/force-approve` — approves without vote majority, no auth
- `POST /api/feature-requests/:id/retrigger` — re-runs voting, no auth, no rate limit
- `POST /api/feature-requests/:id/deny` — denies from any non-terminal status, no auth
- `DELETE /api/feature-requests/:id` — hard deletes, no auth, no soft delete
- `POST /api/feature-requests/:id/dependencies` — adds cross-item dependencies, no auth
- `GET /api/feature-requests/:id/ready` — leaks dependency IDs including deleted items
- `GET /api/search?q=` — empty query returns 20 items (data dump)
- `GET /metrics` — full Prometheus data, no auth
- `GET /api/orchestrator/*` — leaks internal URL in error message
- `POST /api/bugs`, `POST /api/bugs/:id/triage`, `POST /api/bugs/:id/resolve` — all unauthenticated

### Key Architecture Notes for Next Run

1. The portal uses SQLite (not in-memory) with `better-sqlite3` — data persists across requests within same container run
2. ID generation is sequential from DB MAX — hard delete causes ID reuse
3. CORS is configured and restricts origin (not a bypass vector in curl — browser-only protection)
4. The orchestrator proxy at `/api/orchestrator/*` is accessible without auth and leaks `ORCHESTRATOR_URL` env var
5. The `/health` endpoint at `:3001/health` is the correct health check (not `/`)
6. Votes are simulated deterministically per FR ID — same ID always produces same vote pattern across retriggers? NO — votes are randomized (confirmed by round 1≠round 2 results)
