# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-06-22 — Portal Backend (docker-compose.test.yml)

### Key Discovery: Target App Mismatch
The pen-tester analyzed `Source/Backend/src/` (workflow engine with work items) but `docker-compose.test.yml` runs `portal/Backend/src/` (feature request & bug tracking portal). The vulnerability *classes* are identical but object types differ. Always verify the running service against the pentest source analysis before assuming route names match.

### Live Endpoints (port 3001)
- `GET/POST /api/feature-requests` — list and create feature requests (no auth)
- `POST /api/feature-requests/:id/vote` — triggers AI voting panel (5 agents, deterministic)
- `POST /api/feature-requests/:id/approve` — approves item in `voting` state
- `POST /api/feature-requests/:id/force-approve` — overrides vote majority (requires `voting` state first)
- `POST /api/feature-requests/:id/deny` — denies with comment (requires `voting` state)
- `POST /api/feature-requests/:id/retrigger` — resets votes (requires `voting` state)
- `POST /api/feature-requests/:id/dependencies` — add/remove blockers
- `GET /api/feature-requests/:id/ready` — check readiness (exposes ghost blockers)
- `GET/POST /api/bugs` — list and create bugs (no auth)
- `POST /api/bugs/:id/triage` — reported → triaged
- `POST /api/bugs/:id/resolve` — in_development → resolved
- `POST /api/bugs/:id/close` — resolved → closed
- `POST /api/bugs/:id/reopen` — resolved|closed → triaged
- `GET /api/cycles`, `GET /api/features`, `GET /api/learnings` — all unauthenticated
- `GET /api/search?q=` — returns all items on empty/missing query (pagination gap)
- `GET /metrics` — full Prometheus output, no auth (Node.js v22.23.0 exposed)

### Confirmed Working Exploit Chains

#### Chain A: AI Governance Bypass (2-3 requests)
```
POST /api/feature-requests → create item (status: potential)
POST /api/feature-requests/:id/vote → trigger voting
POST /api/feature-requests/:id/force-approve → bypass deny majority (no auth needed)
```
**Works even with 3-2 deny majority.** The force-approve endpoint has no auth and no identity requirement.

#### Chain B: Permanent Dependency Sabotage
```
POST /api/feature-requests → create victim (FR-XXXX)
POST /api/feature-requests → create blocker (FR-YYYY)
POST /api/feature-requests/FR-XXXX/dependencies → {"action":"add","blocker_id":"FR-YYYY"}
DELETE /api/feature-requests/FR-YYYY → soft-delete blocker
GET /api/feature-requests/FR-XXXX/ready → returns ready:false permanently
```
**Ghost blocker shows title:"Unknown", status:"unknown". No repair path without DB access.**

#### Chain C: Full Data Dump (1 request)
```
GET /api/feature-requests → returns all items (limit param ignored)
GET /api/bugs → returns all items (limit param ignored)
GET /api/search → returns all items cross-entity on empty query
```
**No pagination enforcement whatsoever. `?limit=1` still returns all records.**

#### Chain D: Audit Trail Injection
```
POST /api/feature-requests/:id/deny with {"comment":"<script>...</script>[5000 chars]"}
→ stored verbatim in human_approval_comment (5,116 chars confirmed)
```
**No length cap, no sanitization, no identity attribution.**

### Dead Ends / Defended Paths

- **Bug state machine via PATCH**: Enforced. `reported→closed` via PATCH returns 400 with clear allowed-transitions message.
- **Bug state machine via transition endpoints**: Enforced. `triaged→close` blocked, `triaged→resolve` blocked.
- **FR state machine via PATCH**: Enforced. `potential→approved` blocked with allowed-next-states list.
- **Retrigger on approved item**: Blocked — retrigger requires `voting` status, not `approved`.
- **CORS browser bypass**: Correctly restricted. Only `http://localhost:5173` gets ACAO header. (Non-browser bypass is trivial since there's no auth, but browser-based CSRF is mitigated.)

### Timing / Probing Notes
- Docker container starts within ~20 seconds after `docker compose up -d --build`
- Health endpoint: `GET /health` returns `{"status":"ok"}`
- DB is SQLite, stored at `/app/Backend/data/dev-workflow.db` inside container
- `tmpfs` mount means DB is ephemeral per container lifecycle
- AI voting in `/vote` is deterministic (fixed agent responses per run, not calling external LLM)
- Force-approve requires the item to first be in `voting` state — trigger vote first

### Metrics Intelligence Extracted
- Node.js version: v22.23.0
- RSS memory at startup: ~134MB
- Event loop mean lag: ~10ms
- Custom counter: `ai_voting_invocations_total`
- File descriptors: ~54 at startup
