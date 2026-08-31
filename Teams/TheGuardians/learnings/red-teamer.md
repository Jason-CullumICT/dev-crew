# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-08-31

### Critical Discovery: Target Mismatch
**The pen-tester analyzed `Source/Backend/` (work-items state machine) but `docker-compose.test.yml` runs `portal/Backend/` (feature-request/bug portal).** Always verify the actual running service matches the attack surface map before executing pen-tester chains. Adapt dynamically — the actual service had analogous vulnerabilities to all PEN findings.

### Confirmed Exploit Chains

#### Chain 1: Full State Machine Bypass (Objective 1 — ACHIEVED)
```
POST /api/feature-requests (no auth)                    → FR created (potential)
PATCH /api/feature-requests/:id {"status":"voting"}      → voting (no auth)
POST /api/feature-requests/:id/force-approve (no auth)   → approved (0 votes, no human review)
```
- `force-approve` has **zero auth guard** — any anonymous caller can approve anything
- `votes: []` in response proves the voting phase was skipped entirely
- `human_approval_comment` is silently dropped (the body field is ignored by the handler)

#### Chain 2: Dependency Gating Bypass (Supporting Objective 1)
```
Create item with blocker → force-approve → pending_dependencies
PATCH blocked_by: []    → has_unresolved_blockers flips to false
PATCH status: approved  → state advances despite blocker never resolved
```
- `PATCH blocked_by: []` is a direct dependency clearing API — no auth, no resolution check
- Transition from `pending_dependencies → approved` is allowed by state machine table

#### Chain 3: Soft-Delete IDOR (Objective 2 — ACHIEVED)
```
Create FR-A (blocker) and FR-B (dependent)
Link: FR-B blocked_by FR-A
DELETE FR-A  → soft deleted (204)
GET FR-B     → blocked_by still contains {"item_id":"FR-A","title":"Unknown","status":"unknown"}
```
- Deleted item IDs persist in dependency arrays — confirmed ID leak
- `has_unresolved_blockers: true` on FR-B forever (can never auto-resolve)
- Direct GET on deleted item correctly returns 404

#### Chain 4: Full Dataset Enumeration (Objective 4 — ACHIEVED)
```
GET /api/feature-requests?limit=999999  → all items returned
GET /api/feature-requests?page=-1       → all items returned  
GET /api/feature-requests?limit=abc     → falls back to full dump (not empty)
```
- No `limit` upper bound on any list endpoint
- `limit=abc` → NaN behavior returns full dataset, not empty array

### Endpoints That Responded to Probing
- `GET /api/feature-requests` — 200, full list, no auth
- `POST /api/feature-requests` — 201, creates item, no auth
- `PATCH /api/feature-requests/:id` — 200, updates status/blockers, no auth
- `DELETE /api/feature-requests/:id` — 204, soft deletes, no auth
- `POST /api/feature-requests/:id/force-approve` — 200, bypasses all review, no auth
- `GET /metrics` — 200, full Prometheus metrics, no auth
- `GET /api/orchestrator/` — 502 + reveals internal URL `http://localhost:8080`
- `POST /api/feature-requests/:id/dependencies` — 400/404 differentiation confirms ID enumeration

### Dead Ends / Defended Paths
- **Enum validation on POST**: `priority`, `severity`, `source` all validated against allowlist — rejection with clear error
- **PATCH status**: Transitions are validated via state machine table — arbitrary status strings rejected
- **Cycle detection**: `POST /:id/dependencies` with circular blocker → `"Adding this dependency would create a circular dependency"` — correctly blocked
- **Path traversal on proxy**: `GET /api/orchestrator/../../etc/passwd` → Express 404 (not exploitable)
- **Vote body injection**: `/api/feature-requests/:id/vote` body is completely ignored — AI votes are simulated server-side; attacker cannot inject `decision` field
- **Bug state machine**: `POST /api/bugs/:id/resolve` enforces `in_development` prerequisite — direct bypass rejected

### Assessment of Objective 3 (Malformed Assessment Verdict)
- The `/vote` endpoint **ignores the request body entirely** — no injection surface
- `force-approve` is the functional equivalent: achieves approval without any votes
- Objective partially achieved via `force-approve` chain (no legitimate votes cast)

### Architecture Notes for Next Run
- Portal uses SQLite (better-sqlite3) — not in-memory; data persists within the container run
- IDs are sequential: `FR-0001`, `BUG-0001` — trivially enumerable
- `VALID_STATUSES` and `STATUS_TRANSITIONS` map in `featureRequestService.ts` is the authoritative state machine
- `DependencyService` in `portal/Backend/src/services/dependencyService.ts` handles cross-type dependencies (FR ↔ BUG)
- Cascade resolve on dependency: `onBlockerResolved()` auto-advances `pending_dependencies` items — not tested in this run
