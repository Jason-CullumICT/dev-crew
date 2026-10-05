# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-10-05 — Portal Backend (docker-compose.test.yml)

### Environment Discovery
- `docker-compose.test.yml` runs the **portal/** backend, NOT `Source/Backend/`. Routes differ completely.
- Pen-tester's ASM targets (`/api/work-items`, `/api/intake/zendesk`) return 404 in the live env.
- Actual live routes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/team-dispatches`, `/api/dashboard/summary`, `/api/dashboard/activity`, `/api/search`, `/metrics`, `/health`.
- Always check which service is actually running before applying the ASM literally.

### Successful Exploit Chains
1. **Force-approve with 0 votes**: `POST /feature-requests` → `PATCH /:id {status:voting}` → `POST /:id/force-approve` = approved with 0 AI votes. No auth needed at any step.
2. **Full bug lifecycle**: Create → triage → in_development (via PATCH) → resolve → close → reopen → delete. All steps succeed with zero credentials.
3. **Cycle injection**: Create + triage bugs → `POST /api/cycles` → development cycle started pointing to attacker-created bug.
4. **Vote stuffing**: `POST /feature-requests/:id/vote` N times = N*2 votes with `voter_id=null`. Each call adds multiple votes — multiplier effect.
5. **Permanent delete**: `DELETE /api/feature-requests/:id` and `DELETE /api/bugs/:id` both work without auth; hard-delete (no soft-delete in portal).

### Dead Ends
- `PATCH /:id {status: "approved"}` — state machine validates transitions; direct arbitrary status jumps are rejected.
- `PATCH /:id {id: "INJECTED-ID"}` — mass assignment of `id`, `created_at`, `human_approval_approved_at` is not possible; service ignores these fields.
- `PATCH /:id {status: "HACKED"}` — enum validation rejects invalid status strings.
- `POST /api/cycles` when no triaged bugs exist — returns 404 with "No available work items".
- `/api/feature-requests/:id/force-approve` when status is `potential` — requires `voting` status first; combine with PATCH to reach voting first.
- SQL injection payloads stored as literal text; SQLite parameterized queries prevent exploitation.
- CORS: `Access-Control-Allow-Origin` not reflected — no wildcard CORS; but `Access-Control-Allow-Credentials: true` is risky if cookies ever added.

### Patterns That Work
- Any endpoint with no auth middleware → test all HTTP methods (GET, POST, PATCH, DELETE).
- State machine bypass = find transition endpoints that don't check auth, then call them directly.
- Voting endpoints with no rate-limit or identity check = vote stuffing multiplier.
- `/metrics` always unauthenticated = operational intel for attackers.
- Missing `X-Powered-By` suppression → framework disclosed on every response.
