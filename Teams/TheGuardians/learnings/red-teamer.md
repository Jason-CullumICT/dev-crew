# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-08-17

### Environment Discovery
- `docker-compose.test.yml` builds from `portal/` context, NOT `Source/Backend/`. The pen-tester analyzes `Source/Backend/`; the red-teamer must attack `portal/Backend/`.
- Live routes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/search`, `/api/team-dispatches`.
- `/api/dashboard` returns 404 in portal (exists in Source/Backend).
- `/api/work-items` returns 404 — that route only exists in Source/Backend (not installed/runnable, no node_modules).
- `/api/orchestrator` returns 502 — orchestrator unreachable in test env; SSRF not exploitable.
- Health: `GET /health` → JSON with timestamp. Metrics: `GET /metrics` → full Prometheus, no auth.

### Confirmed Exploit Chains

**Chain 1: State Machine Bypass (PATCH + force-approve, 0 votes)**
1. `POST /api/feature-requests` → id=FR-XXXX, status=potential
2. `PATCH /api/feature-requests/FR-XXXX {"status":"voting"}` → voting with 0 votes (BYPASSES vote trigger)
3. `POST /api/feature-requests/FR-XXXX/force-approve` → approved, 0 votes, timestamp set
- Root cause: PATCH allows potential→voting transition without enforcing `/vote` was called

**Chain 2: Dependency Ghost Block (hard-delete creates permanent freeze)**
1. Create FR_A and FR_B, add FR_A as blocker for FR_B
2. `DELETE /api/feature-requests/FR_A` → 204, hard-deleted
3. `GET /api/feature-requests/FR_B/ready` → ready=false, unresolved=[{id:FR_A, title:"Unknown"}]
- No cascade-delete on dependency links → permanent ghost block

**Chain 3: Cascade Auto-Promotion**
1. Put FR_TARGET in `pending_dependencies` (force-approve with active blocker)
2. Complete the blocker item: advance to `completed`
3. `onItemCompleted` fires → FR_TARGET auto-transitions pending_dependencies→approved
- No human confirmation required for cascade release

**Chain 4: Full Dataset Enumeration**
- `GET /api/bugs` (no params) → all records, no pagination
- `GET /api/bugs?limit=1&page=1` → same full result (pagination params silently ignored)

### Dead Ends / Mitigated
- SQL injection via `/api/search`: search uses in-memory `.includes()` filter, not SQL queries — safe
- Enum injection via `/api/bugs` and `/api/feature-requests`: validated at service layer (400 returned)
- Cross-entity ID traversal (BUG-XXXX via /api/feature-requests): proper 404 returned
- CORS: portal has CORS restricted to `localhost:5173` (ACAO absent for other origins) — browsers blocked; server-side attacks bypass CORS anyway (no auth to protect)
- Body size limit: 16kb enforced but returns 500 not 413 for oversized requests

### Portal State Machine Notes
- Feature request statuses: `potential → voting → approved → in_development → completed`
- Terminal statuses: `denied`, `duplicate`, `deprecated` (from most statuses)
- `pending_dependencies` is inserted before `approved` if blockers are unresolved
- `/vote` triggers voting from `potential` only; `/force-approve` requires `voting` status
- Key gap: PATCH can move potential→voting without ever calling /vote

### Rate Limiting
- None. 50 parallel requests all return 200. No 429 observed.
