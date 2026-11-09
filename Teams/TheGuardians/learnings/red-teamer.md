# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-11-09

### Environment Discrepancy (Critical Learning)
- The attack surface map (`pen-tester`) is written against `Source/Backend/` (workflow engine with `/api/work-items`).
- The ephemeral test environment (`docker-compose.test.yml`) runs the **portal backend** (`portal/Backend/`) at `http://localhost:3001`.
- Portal routes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/dashboard`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/search`, `/api/team-dispatches`.
- The root route `/` returns 404 (Express default), but `/health` is 200 — use `/health` as the target reachability check, not `/`.
- **Action for future runs:** Verify which codebase is actually running (check `portal/Backend/src/index.ts` for route registration) before attempting PEN-ID chains.

### Successful Exploit Chains
1. **Full Pipeline Bypass (RED-002):** `POST /vote` → `POST /force-approve` → `PATCH {"status":"in_development"}` — 4 requests, zero auth, item goes from `potential` to `in_development`.
   - `force-approve` requires item to be in `voting` status first (call `/vote` to trigger that transition).
   - `PATCH` with `{"status":"in_development"}` works from `approved` without further gate checks.

2. **Dependency Deadlock via Soft-Delete (RED-003):** Create A → Create B → `POST /B/dependencies {"action":"add","blocker_id":"A"}` → `DELETE /A` → verify B is permanently stuck.
   - Response shows `{title:"Unknown", status:"unknown"}` for deleted blocker — ghost dependency confirmed.
   - `GET /B/ready` returns `{"ready":false,"unresolved_blockers":[...]}` even after blocker deletion.

3. **Stored XSS (RED-004):** `PATCH /:id` with `{"description":"<script>alert(1)</script>"}` → stored verbatim in DB → HTTP 200 response echoes payload.

4. **Prometheus Recon (RED-005):** `GET /metrics` with zero auth → full Prometheus output including route histograms and business-domain counters.

### Dead Ends / Non-Vulnerabilities
- **CORS:** `Origin: http://evil.attacker.com` — `Access-Control-Allow-Origin` is NOT reflected back for disallowed origins. CORS is correctly configured to only reflect `http://localhost:5173`. Not exploitable.
- **Status injection via PATCH:** Direct invalid status transitions are rejected with `400 Invalid status transition`. State machine is enforced in the service layer.
- **Reviving denied items:** `denied → potential` via PATCH returns 400. Terminal states (`denied`, `duplicate`, `deprecated`) are enforced.
- **Retrigger on denied items:** Returns 400 — retrigger only works from `voting` status.
- **Vote accumulation:** Second call to `/vote` clears and replaces votes (not accumulation). The retrigger endpoint also resets. Not exploitable for vote stuffing.

### Key API Facts
- Dependency format: `POST /:id/dependencies {"action": "add"|"remove", "blocker_id": "FR-XXXX"}` (not `blocked_by_id`)
- Deny format: `POST /:id/deny {"comment": "..."}` (comment is required, not `reason`)
- Vote endpoint triggers AI voting round (5 agent votes: TechFeasibility, BusinessValue, SecurityReview, UserImpact, ResourceCost). No body needed.
- Force-approve sets `human_approval_approved_at` timestamp.
- Feature request IDs are sequential: `FR-0001`, `FR-0002`, etc. (zero-padded to 4 digits).
- Bug IDs: `BUG-0001`, `BUG-0002`, etc.
- Items can transition `potential → voting → approved → in_development → completed` normally.
- `denied`, `duplicate`, `deprecated` are terminal states (no further transitions except to other terminal states).
