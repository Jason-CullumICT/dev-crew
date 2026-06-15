# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-06-15

### Environment Discrepancy (CRITICAL — Read First)
- `docker-compose.test.yml` runs `portal/Backend/` NOT `Source/Backend/`
- The pen-tester analyzes `Source/Backend/` which has `/api/work-items`, `/api/intake`, etc.
- The running container exposes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/dashboard`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/search`, `/api/team-dispatches`
- Health check: `/health` returns 200; root `/` returns 404 — use `/health` for liveness check, NOT `/`
- Always verify which codebase is running before testing pen-tester findings

### Successful Exploit Chains

**State Machine Bypass via force-approve (OBJECTIVE 1 + 3)**
- `POST /api/feature-requests/:id/force-approve` is unauthenticated and bypasses voting majority
- Chain: Create → PATCH `voting` → POST `/force-approve` → `approved` with 0 votes
- Also works against items with explicit `deny` majority — force-approve overrides AI agent verdict
- This endpoint exists on the portal backend (not in Source/Backend) — confirmed live in this run

**Full Dataset Enumeration (OBJECTIVE 4)**
- Portal backend list endpoints return ALL data — no pagination at all
- `?limit=1` parameter is completely ignored — returns all items
- No `total`, `page`, `limit`, `totalPages` metadata in any list response
- Affects: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, and all other list endpoints

**Orphaned Dependency After Hard Delete (OBJECTIVE 2)**
- When a blocker item is hard-deleted, its ID persists in `blocked_by[]` of surviving dependents
- Deleted item's ID is exposed with `status: "unknown"`, `title: "Unknown"`
- `GET /:id/ready` exposes deleted item ID in `unresolved_blockers[]`
- Dependent item gets stuck in `pending_dependencies` on approval attempts

**Cascade State Change (SUPPORTING)**
- Completing a blocker item triggers `onItemCompleted()` which auto-advances dependents from `pending_dependencies` → `approved`
- Unauthenticated attacker can trigger this cascade — no authorization check on the cascade trigger

### Dead Ends / What Doesn't Work
- SQL injection in title/description fields: properly parameterized (SQLite/better-sqlite3) — items created but no injection
- Invalid status strings: properly validated and rejected with HTTP 400
- Invalid state transitions: properly enforced — `potential → completed` returns 400
- CORS preflight for preflighted requests from evil origin: browser would be blocked (no `Access-Control-Allow-Origin` returned)
- But CORS provides no protection against direct API clients (curl, etc.)

### Endpoints That Respond to Probing
- ALL endpoints: unauthenticated, no rate limiting
- `/api/orchestrator` (proxy): reveals internal URL `http://localhost:8080` in error
- `/metrics`: 572 lines of Prometheus data, fully open
- `/uploads`: static files served unauthenticated

### Key Architecture Notes
- Portal backend uses SQLite via `better-sqlite3` (synchronous)
- State machines ARE enforced for regular PATCH transitions
- `force-approve` is the key bypass — intended for "human override" but completely unprotected
- CORS IS configured (restricted to `localhost:5173`) — unlike pen-tester's finding for Source/Backend
- No authentication middleware anywhere in the codebase
