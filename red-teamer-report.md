The dashboard run wasn't pre-registered (this was a standalone invocation), but all results are written. Here is the complete red team report:

---

## 🔴 Red Team Results — dev-crew Portal Backend

**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — `portal/Backend/` on SQLite/port 3001  
**Run:** 2026-04-27 | 8 exploit chains attempted

---

### ⚠️ Critical Discovery: Attack Surface Map Target Mismatch

The pen-tester analyzed `Source/Backend/` (in-memory Map store, `/api/work-items/*` routes). The actual ephemeral test target is `portal/Backend/` — a SQLite-backed application with entirely different routes (`/api/feature-requests`, `/api/bugs`, etc.). Findings were adapted and validated against the actual live service.

---

### CONFIRMED BREACHES

#### 🔴 RED-001 — Zero Authentication (Critical) | CONFIRMED
Every portal endpoint returns HTTP 200 with data and accepts writes with no credentials, tokens, or session. Created FR-0001 and BUG-0001 from a cold unauthenticated curl. All 9 API routers + `/metrics` are fully exposed.

#### 🔴 RED-002 — State Machine Bypass via Force-Approve (Critical) | OBJECTIVE ACHIEVED
**3-step chain (all unauthenticated):**
1. `POST /api/feature-requests` → FR-0003 in `potential`, 0 votes
2. `PATCH /api/feature-requests/FR-0003` `{"status":"voting"}` → skips AI vote simulation entirely, 0 votes cast
3. `POST /api/feature-requests/FR-0003/force-approve` → status `approved`, 0 votes, approved_at set

FR-0003 confirmed `approved` with empty `votes[]` array. The entire agent voting gate was bypassed by an unauthenticated caller.

#### 🟠 RED-003 — Dependency DoS via Delete (High) | PARTIAL OBJECTIVE
Create blocker BUG → add as dependency for FR-victim → delete BUG (HTTP 204) → `GET /api/feature-requests/FR/ready` returns `ready: false, unresolved: [{id: BUG-0002, status: "unknown", title: "Unknown"}]`. Victim FR permanently shows as blocked by a 404 item. Root cause: no `ON DELETE CASCADE` on the `dependencies` table foreign key.

#### 🟠 RED-005 — No Pagination Enforcement (High) | OBJECTIVE ACHIEVED
`GET /api/feature-requests` returns all 22 items in a single unauthenticated call with no pagination. `?limit=999999` parameter is silently ignored. Complete dataset dump achievable in one request.

#### 🟠 RED-006 — Prometheus Metrics Exposed (High) | CONFIRMED
`GET /metrics` returns full Prometheus output including route-by-route request counts, Node.js heap/CPU/GC data, and AI voting invocation counters — with zero authentication.

---

### MITIGATIONS CONFIRMED WORKING
- **SQL Injection:** Not exploitable — parameterized queries used consistently
- **Input length:** Enforced at service layer (title ≤ 200, description ≤ 10,000 chars)
- **State machine jumps:** Direct PATCH jumps (e.g., `potential → completed`) are blocked by the transition validator
- **Bug close without resolve:** The `/close` endpoint correctly enforces `resolved` prerequisite

---

### NEW FINDING (not in pen-tester map)
**RED-008 — Unauthenticated Orchestrator Proxy (SSRF):** `/api/orchestrator/*` proxies all requests to an internal orchestrator with no auth check. In production this allows an unauthenticated attacker to interact with the internal orchestrator API. Error response leaks internal URL: `"Orchestrator unreachable at http://localhost:8080"`.
