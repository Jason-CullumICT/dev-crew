# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-09-14

### Critical Discovery: Target App Mismatch
- **The live target (`docker-compose.test.yml`) runs `portal/Backend/`, NOT `Source/Backend/`**
- The pen-tester performed static analysis on `Source/Backend/` (workflow engine with `/api/work-items`)
- The actual running service is `portal/Backend/` (feature portal with `/api/feature-requests`, `/api/bugs`, etc.)
- Always confirm which app is running before attempting exploit chains: `cat portal/Backend/src/index.ts` for route map

### Confirmed Attack Surface (portal/Backend)
Live endpoints that respond:
- `GET/POST /api/feature-requests` — No auth, no pagination
- `GET/POST /api/bugs` — No auth
- `GET/POST /api/cycles` — No auth
- `GET /api/learnings` — No auth
- `GET /api/features` — No auth
- `GET /api/pipeline-runs` — No auth
- `GET /api/team-dispatches` — No auth
- `GET /api/dashboard/summary` — No auth, exposes internal state counts
- `GET /api/dashboard/activity` — No auth, full audit trail
- `GET /api/search?q=` — No auth, in-memory filter (NOT SQL, not injectable)

### Successful Exploit Chains

#### Chain 1: State Machine Bypass (3 requests, no auth)
```bash
POST /api/feature-requests            # Create item → status: potential
POST /api/feature-requests/ID/vote    # Any body triggers AI voting → status: voting
POST /api/feature-requests/ID/force-approve  # {"reason":"..."} → status: approved (NO AUTH CHECK)
PATCH /api/feature-requests/ID {"status":"in_development"}  # Continue bypass → in_development
```
**Key:** `/force-approve` endpoint requires no authentication whatsoever.

#### Chain 2: Soft-Delete IDOR
```bash
POST /api/feature-requests/A/dependencies {"action":"add","blocker_id":"B-id"}  # note: blocker_id NOT blockerId
DELETE /api/feature-requests/B-id     # Soft delete B
GET /api/feature-requests/A-id        # B's ID still leaked in blocked_by array
POST /api/feature-requests/A-id/dependencies {"action":"remove","blocker_id":"B-id"}  # Can interact with deleted item
```
**Key:** `blocked_by` array exposes deleted item IDs as `{"item_id":"FR-XXXX","title":"Unknown","status":"unknown"}`.

#### Chain 3: Full Data Exfiltration
```bash
GET /api/feature-requests             # Returns ALL items (limit param ignored entirely)
GET /api/dashboard/activity           # Full audit trail of all events
```
**Key:** No pagination at all on `listFeatureRequests()` service — always returns full table.

#### Chain 4: Stored XSS
```bash
POST /api/feature-requests {"title":"<script>alert(document.cookie)</script>","description":"<img src=x onerror=alert(1)>"}
# → Stored verbatim, served to all clients
```
**Key:** No input sanitization on title or description fields. Impact depends on frontend rendering.

### Dead Ends
- **SQL Injection via /api/search**: Search uses in-memory filtering (`Array.filter`), not SQL. Not injectable.
- **Prototype pollution via enum fields**: `source`, `priority`, `status` all validated against allowed enum lists before persistence. `__proto__`, `constructor` all rejected.
- **Mass assignment via POST body**: Internal fields (`id`, `votes`, `created_at`, `human_approval_approved_at`) are not accepted from request body. Protected.
- **CORS bypass**: CORS correctly restricts cross-origin requests. Evil origin does NOT receive `Access-Control-Allow-Origin` header.

### Field Name Gotchas
- Dependency endpoint uses `blocker_id` (snake_case), NOT `blockerId` (camelCase)
- Action values are `"add"` and `"remove"` (lowercase)
- Deny endpoint requires `comment` field, not `reason`

### State Machine Map (portal/Backend feature-requests)
```
potential → voting (via /vote endpoint — any voter name accepted)
          → denied (if voting outcome is negative, or via /deny with comment)
          → duplicate, deprecated (terminal)
voting → approved (via /approve if majority vote or /force-approve — NO AUTH)
       → denied (via /deny)
approved → in_development (via PATCH)
in_development → completed (via PATCH)
pending_dependencies → approved
```

### Metrics
- Chains attempted: 8
- Objectives achieved: 3/4 (state bypass, IDOR, exfiltration — assessment bypass partial)
- Confirmed critical breaches: 3 (no-auth, state-bypass, IDOR-delete)
- Dead ends: 4 (SQL injection, prototype pollution, mass assignment, CORS)
