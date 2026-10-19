# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-10-19

### Environment Gap
- The pen-tester analyzed `Source/Backend/` (work-items app with `/api/work-items` routes)
- The test environment (`docker-compose.test.yml`) runs `portal/` (feature-requests/bugs app with `/api/feature-requests` routes)
- Both apps implement the same vulnerability classes — the pen-tester's PEN-IDs map directly to portal endpoints
- Always verify which app is actually running before assuming route paths from the attack surface map

### Successful Exploit Chains

#### Chain 1: State Machine Bypass via force-approve (RED-001)
- `PATCH /:id {"status":"voting"}` → then `POST /:id/force-approve {}` → item reaches `approved` with zero votes
- Works because `force-approve` only checks `status === 'voting'`, not that any votes were actually cast
- No authentication required at any step
- Confirmed live against `http://localhost:3001/api/feature-requests`

#### Chain 2: Ghost Blocker DoS (RED-002)
- Create blocker B, add as dependency of victim A
- `DELETE /api/feature-requests/B_id` → hard-deletes B (NOT soft-delete — removes from DB entirely)
- Victim A's `blocked_by` array retains reference to B's ID
- `/api/feature-requests/A_id/ready` returns `status:"unknown"` ghost blocker — permanent block
- Also: `denied` status is NOT in `RESOLVED_STATUSES` — denied blocker also permanently blocks dependents

#### Chain 3: Cascade Dispatch via duplicate status (RED-005) — CRITICAL
- Attacker puts target in `pending_dependencies` (via force-approve + add dependency)
- `PATCH /api/feature-requests/blocker_id {"status":"duplicate"}` → no auth, no justification
- `duplicate` IS in `RESOLVED_STATUSES` → triggers `onItemCompleted(blocker_id)`
- All dependents in `pending_dependencies` with no other unresolved blockers → auto-dispatch to `approved`
- **Root cause**: `STATUS_TRANSITIONS` allows `duplicate`/`deprecated` from ANY status, no auth check

#### Chain 4: Stored XSS (RED-003)
- `POST /api/feature-requests {"title":"<script>alert(document.cookie)</script>","description":"...","priority":"low","source":"manual"}` → HTTP 201, payload stored verbatim
- Same works for `POST /api/bugs` with `{"title":"<svg onload=alert(1)>","severity":"critical",...}`
- Payloads appear in `GET /api/search` responses and all list endpoints

#### Chain 5: Pagination Bypass (RED-004)
- `GET /api/feature-requests?limit=999999` → ALL items returned (limit ignored)
- `GET /api/feature-requests?limit=0` → ALL items returned
- `GET /api/feature-requests?page=abc&limit=xyz` → ALL items returned (NaN silently ignored)
- Portal's pagination is entirely unenforced — no server-side limit cap

### Dead Ends
- **SQL injection**: Portal uses parameterized queries + in-memory filtering in search — no SQL injection vectors found
- **CORS bypass**: Attacker-origin requests rejected by CORS middleware (no `Access-Control-Allow-Origin` returned for unknown origins)
- **Direct enum injection**: `priority` field has proper enum validation on creation endpoint (returns 400 for invalid values)
- **Status injection via PATCH**: Status transitions validated against `STATUS_TRANSITIONS` map — direct jumps like `potential → approved` rejected

### Key Facts About the Portal API
- Routes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/dashboard`, `/api/search`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/team-dispatches`
- DB: SQLite (better-sqlite3) in `/app/Backend/data`
- IDs: Sequential format `FR-XXXX` / `BUG-XXXX`
- `force-approve` endpoint: requires `status === 'voting'`, no actual vote threshold
- `duplicate`/`deprecated` transitions: allowed from ANY non-terminal status — no authorization
- `RESOLVED_STATUSES`: `['completed', 'resolved', 'closed', 'duplicate', 'deprecated']` — does NOT include `denied`
- `DISPATCH_TRIGGER_STATUSES`: `['approved', 'in_development']` — triggers dependency gate check
- Hard-delete (not soft-delete): `DELETE /api/feature-requests/:id` permanently removes from DB
- No authentication anywhere — all endpoints accessible without credentials
