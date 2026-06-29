# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-06-29

### Environment Context
- Target service is the **portal app** (`portal/` directory), NOT a work-items/workflow engine.
- The live API routes are `/api/feature-requests`, `/api/bugs`, `/api/dashboard/*` — NOT `/api/work-items`.
- Attack surface map from pen-tester describes the *Source/Backend* app's routes. The portal is a DIFFERENT backend.
- Always adapt exploit chains to actual live routes, not the pen-tester's theoretical paths.
- Health endpoint: `GET /health` returns 200. Root `/` returns 404 — do NOT use `/` for liveness check.

### Confirmed Working Exploit Chains

**RED-001: No auth anywhere**
- `GET /api/feature-requests` with no headers → 200. All endpoints open.
- `DELETE /api/feature-requests/:id` with no headers → 204. Anonymous writes confirmed.

**RED-002: Force-approve overrides vote outcome**
- `POST /api/feature-requests/:id/force-approve` → 200 even with deny majority (3 deny, 2 approve).
- No role check, no reason required.

**RED-003: PATCH state machine bypass (most impactful)**
- `PATCH /api/feature-requests/:id` with `{"status":"approved"}` → 200, bypasses all vote guards.
- The `/approve` handler enforces vote counts; the PATCH handler does not.
- Also works via form-encoded body (`Content-Type: application/x-www-form-urlencoded; status=approved`).

**RED-006: Pagination not implemented**
- `limit` parameter is completely ignored on list endpoints.
- Response has no pagination metadata — `{data: [...]}` only, no `total`/`page`/`totalPages`.
- Any or no limit parameter returns entire dataset.

**RED-009: CSRF via form body**
- `express.urlencoded({extended:true})` is globally applied — form bodies parsed same as JSON.
- No CSRF token, no Origin validation. Classic CSRF fully exploitable.

**RED-010: Retrigger vote farming**
- `POST /api/feature-requests/:id/retrigger` → resets all votes and re-runs AI voting.
- No rate limit, no maximum attempt count, no auth. Can be called indefinitely.

### Dead Ends / False Paths

- **RED-011: Race condition** — SQLite's serialized writes prevent state corruption. Did not breach.
  - 5 simultaneous force-approves → only 1 succeeded, 4 got 409. Safe for now.
  - Would reopen if migrated to PostgreSQL with concurrent connections.

- **SQL injection** — Not exploitable. Parameterized queries throughout. `'; DROP TABLE...` stored safely.

- **Enum injection (priority/type/source fields)** — Main `/api/feature-requests` endpoint validates enums correctly (400 on invalid values). Validated fields: `priority`, `type`, `source`.

- **`/api/work-items` routes** — Return 404. These are from Source/Backend, not the portal service.

### XSS Note
- Free-text fields (`title`, `description`) accept and store arbitrary HTML including `<script>` tags.
- `POST /api/feature-requests {title:"<script>alert(document.cookie)</script>"}` → 201 stored verbatim.
- This is a stored XSS vector if the frontend ever renders without encoding.

### Metrics Recon (useful for ongoing probing)
- `GET /metrics` → 479 lines, no auth. Reveals:
  - All active API routes with call counts and latency percentiles
  - `ai_voting_invocations_total` counter (reveals AI voting system internals)
  - Process memory and heap stats
  - HTTP 404 probes from other scanners visible in the histogram labels

### Objective → Chain Mapping (for next run)
- State machine bypass → RED-003 (PATCH with status field) — fastest, most reliable
- Vote outcome override → RED-002 (force-approve) or RED-003 (PATCH)
- Data enumeration → RED-006 (no limit enforcement) + RED-008 (dashboard)
- Information disclosure → RED-007 (metrics) + RED-008 (dashboard activity)
