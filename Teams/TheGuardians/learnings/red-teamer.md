# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-10-12

### Critical Discovery: Target Discrepancy
- **The attack surface map was written against `Source/Backend`** (routes: `/api/work-items`, `/api/intake`) but **the actual docker-compose.test.yml target is `portal/Backend`** (routes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, etc.)
- Always verify the actual running service by reading `docker-compose.test.yml` before trusting the pen-tester's route map
- Structural vulnerability classes (no auth, state machine bypass, ghost blocker, no pagination) were present in both codebases — the findings transferred

### Successful Exploit Chains

#### 1. State Machine Bypass (RED-002) — All 4 Objectives Enabled
- `PATCH /api/feature-requests/:id` accepts `{"status":"voting"}` directly — bypasses `/vote` endpoint requirement
- After PATCH to `voting` with 0 votes, `POST /api/feature-requests/:id/force-approve` succeeds → `approved` with zero AI votes
- Key: the PATCH endpoint does not enforce state machine transitions — it accepts any valid status string that passes the transition table

#### 2. Ghost-Blocker DoS (RED-003)
- Add dependency via `POST /:id/dependencies` body: `{"action":"add","blocker_id":"<id>"}` (NOT `targetId` — field is `blocker_id`)
- Hard-delete the blocker → `blocked_by` retains zombie entry `{status:"unknown", title:"Unknown"}`
- `has_unresolved_blockers` stays `true` permanently — no API endpoint can clear ghost references
- **Fix path**: cascade delete dependency edges on blocker deletion

#### 3. Stored XSS (RED-006)
- `title` and `description` fields accept raw HTML on both `/api/bugs` and `/api/feature-requests`
- Payloads stored verbatim in DB and returned in listing endpoints
- `<img src=x onerror="...">` and `<script>` both accepted — no sanitization

#### 4. Full Data Extraction (RED-004)
- `GET /api/feature-requests` runs raw `SELECT * FROM feature_requests` — no LIMIT
- No pagination parameters supported at all — entire dataset returned every time

### Dead Ends / Blocked Paths

- **Bug PATCH status injection**: `PATCH /api/bugs/:id` with `{"status":"closed"}` returns 400 — bug service enforces state machine via PATCH
- **Direct FR status injection**: `PATCH /api/feature-requests/:id` with `{"status":"approved"}` returns 400 — approved/in_development not PATCHable directly
- **Orchestrator SSRF**: `GET /api/orchestrator/...` returns 502 — orchestrator not running in test environment
- **Path traversal on orchestrator**: Express path normalization prevents `/../../../etc/passwd`
- **Soft-delete bypass**: FRs are hard-deleted — no soft-delete flag to exploit (different from Source/Backend which uses soft-delete)

### API Shape Notes (portal/Backend)
- Dependency add: `POST /:id/dependencies` body `{"action":"add","blocker_id":"<id>"}` — NOT `targetId`
- Feature request statuses: `potential → voting → approved/denied/duplicate/deprecated → in_development → completed`
- Bug statuses: `reported → triaged → resolved → closed` (also: `reopen`)
- Force-approve: only works from `voting` status — but PATCH can set `voting` with 0 votes
- Vote endpoint: `POST /:id/vote` with empty body `{}` — triggers AI simulation, sets status to `voting`
- Metrics: always at `/metrics`, no auth required
