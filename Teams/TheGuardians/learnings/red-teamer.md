# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-04-20

### Critical Discovery: Service Mismatch
- `docker-compose.test.yml` builds from `context: portal` → runs `portal/Backend/` at port 3001
- Pen tester analysed `Source/Backend/` (workflow engine, `/api/work-items` routes) — this service is NOT running in the test environment
- Always verify which codebase the compose file actually builds before mapping PEN findings

### Confirmed Vulnerable Endpoints (portal/Backend at localhost:3001)
- `POST /api/feature-requests` — no auth, creates items
- `POST /api/feature-requests/:id/vote` — no auth, fires 5-agent AI voting pipeline unconditionally
- `PATCH /api/feature-requests/:id` — no auth, `status` field is writable (state machine bypassable)
- `POST /api/bugs` — no auth, creates bugs with arbitrary severity
- `PATCH /api/bugs/:id` — no auth, `status` field is writable (full lifecycle bypass)
- `POST /api/team-dispatches` — no auth, arbitrary `actions_url` accepted (SSRF vector)
- `GET /api/dashboard/summary` — no auth, full aggregate counts
- `GET /metrics` — no auth, Prometheus process internals

### Successful Exploit Chains
1. **Anonymous voting pipeline trigger**: `POST /api/feature-requests` → `POST /vote` = full AI pipeline fires (HTTP 200, no auth)
2. **State machine bypass via PATCH**: `potential → voting → approved → in_development → completed` — 4 unauthenticated PATCH calls
3. **Bug lifecycle takeover**: `reported → triaged → in_development → resolved → closed` — 4 unauthenticated PATCH calls
4. **SSRF storage**: `POST /api/team-dispatches {"actions_url":"http://169.254.169.254/..."}` accepted (HTTP 201)
5. **Full data dump**: `?limit=999999999` accepted — no server-side cap, all records returned

### Dead Ends / Mitigated
- **Soft-delete IDOR**: Hard delete used in portal/Backend — item returns 404 after DELETE (not soft-delete)
- **Orchestrator path traversal**: `GET /api/orchestrator/../../etc/passwd` → 404 (Express path normalisation blocks it)
- **Double-vote**: Second call to `/vote` blocked by status gate (FR already in `voting` status)
- **State machine via POST on invalid status at creation**: Status field ignored at creation time, defaults to `potential`

### Pagination Findings
- `GET /api/bugs?limit=999999999` → accepts without error, returns all records
- `GET /api/bugs?limit=abc` → silently defaults (no 400 validation error)
- `GET /api/bugs?page=-1` → silently accepted (no validation error)

### CORS Observations
- `Access-Control-Allow-Credentials: true` always sent
- `Access-Control-Allow-Origin` NOT reflected on simple cross-origin requests (partial CORS config)
- Preflight returns methods/headers but no origin — unclear cross-origin read access from browser

### Vote Endpoint Quirk
- `/vote` field value is completely ignored — `{"vote":"INVALID_VERDICT_XYZ"}` triggers the full pipeline
- The endpoint fires agent votes unconditionally; the `vote` input is decorative

### State Machine Notes (portal/Backend)
- Feature requests: `potential` can PATCH to `voting`, `approved`, `in_development`, `completed`, `duplicate`
- Feature requests: `completed` → `denied` blocked; `duplicate` → `deprecated` blocked
- Bugs: ALL status transitions via PATCH succeed without restriction (reported → closed in one chain)
- State machine IS partially enforced via dedicated workflow endpoints (e.g. `/vote` status guard)
  but completely bypassable by using `PATCH` with the `status` field directly
