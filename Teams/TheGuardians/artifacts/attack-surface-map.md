# Attack Surface Map — dev-crew Source App
**Agent:** pen_tester | **Run Date:** 2026-09-21 | **Scope:** White-box static analysis
**Handoff to:** red-teamer | **Status:** Theoretical — requires dynamic verification

---

## Target Summary

| Layer | Technology | Entry Points Analysed |
|-------|-----------|----------------------|
| Backend API | Express / Node.js (TypeScript) | 5 route groups, 14 endpoints |
| Auth Middleware | **None** | — |
| Data Store | In-memory `Map<string, WorkItem>` | — |
| Intake | Unauthenticated webhooks (`/api/intake/*`) | 2 |
| Observability | Prometheus `/metrics` (public) | 1 |

---

## Critical Findings

---

### PEN-001: Complete Absence of Authentication on All API Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:1-54`
- **Vulnerability Description:** No authentication middleware is registered anywhere in the Express application. Every state-mutating endpoint — create, update, approve, reject, dispatch, route — is publicly accessible without any token, session, or API key. There is no `authMiddleware`, no JWT validation, no session check, no RBAC gate anywhere in the middleware chain or in individual route handlers.
- **Potential Exploit Path:**
  1. Attacker knows or guesses the backend URL (`http://localhost:3001`) — exposed in CLAUDE.md.
  2. Attacker sends any API request (e.g., `POST /api/work-items/:id/approve`) with no Authorization header.
  3. Request is accepted and processed. State transition succeeds unconditionally.
- **Red Team Handoff Notes:**
  - Probe every endpoint listed in the config without any credentials: `curl -X POST http://localhost:3001/api/work-items -H "Content-Type: application/json" -d '{"title":"t","description":"d","type":"bug","priority":"high","source":"manual"}'`
  - Follow with approve/dispatch. Expect full workflow execution with zero auth.
  - This is the root enabler for all other findings — all subsequent exploits assume zero auth.

---

## High Findings

---

### PEN-002: `overrideRoute=fast-track` Bypasses Entire Assessment Pod (State Machine Skip)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57`, `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:** The route action endpoint (`POST /api/work-items/:id/route`) accepts a user-supplied `overrideRoute` body field. In `classifyRoute()`, if `overrideRoute` is truthy, the function immediately returns the caller-specified route with `targetStatus: WorkItemStatus.Approved` (if `fast-track`). This allows any caller to skip the entire assessment pod process and move any `backlog` work item directly to `approved` in a single request. No privilege check, no validation that the caller is authorised to override routing logic.
- **Potential Exploit Path:**
  1. Create a work item (any type/priority): `POST /api/work-items` → receives `{id: "xyz", status: "backlog"}`.
  2. Call `POST /api/work-items/xyz/route` with body `{"overrideRoute": "fast-track"}`.
  3. `classifyRoute()` receives truthy `overrideRoute`; returns `{route: "fast-track", targetStatus: "approved"}`.
  4. Item jumps from `backlog` → `approved` without ever touching the assessment pod.
  5. Now dispatch: `POST /api/work-items/xyz/dispatch` → item is in-progress.
- **Red Team Handoff Notes:**
  - Objective from config: *"Bypass work item state machine to reach an invalid status"* — this is a confirmed exploit path.
  - Payload: `{"overrideRoute": "fast-track"}` — TypeScript cast at line 57 does **not** validate; any string is accepted at runtime.
  - Also try `{"overrideRoute": "full-review"}` to force `targetStatus: proposed` even for items that would fast-track normally.
  - Also try invalid string values: `{"overrideRoute": "admin"}` — `if (overrideRoute)` is truthy, so it enters the override branch; the equality check `=== WorkItemRoute.FastTrack` fails, so targetStatus is `proposed` (harmless but demonstrates unvalidated input).

---

### PEN-003: Unbounded Pagination Allows Full Work Item Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:69-71`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Vulnerability Description:** The `GET /api/work-items` and `GET /api/dashboard/activity` endpoints parse `limit` from the query string using `parseInt()` with no maximum bound check. The store's `findAll()` applies the raw limit to slice the in-memory array. An attacker can set `limit=999999999` to retrieve every work item in a single response, completely defeating pagination controls.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999999&page=1`
  2. `findAll()` receives `limit: 999999999`, slices `result.slice(0, 999999999)` — returns entire dataset.
  3. Attacker receives all non-deleted work items, including their full `changeHistory`, `assessments`, `blockedBy`, and `blocks` arrays.
- **Red Team Handoff Notes:**
  - Objective from config: *"Enumerate all work items without pagination limit enforcement"* — direct match.
  - Also test negative limit (`limit=-1`), zero (`limit=0`), and NaN (`limit=abc`) — `parseInt("abc")` returns `NaN`; `findAll` falls back to default limit 20 for NaN but test to confirm.
  - `GET /api/dashboard/activity?limit=999999` returns every change history entry ever recorded.

---

### PEN-004: Intake Webhooks Lack Authentication and Enum Validation
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11-55`
- **Vulnerability Description:** Two webhook endpoints — `POST /api/intake/zendesk` and `POST /api/intake/automated` — accept requests from any source without HMAC signature verification, API key, or token. Additionally, the `type` and `priority` fields from the request body are passed directly to `createWorkItem()` without enum validation (contrast with the main `/api/work-items` endpoint which validates these). This allows: (a) anyone to inject arbitrary work items, and (b) items to be created with invalid `type` or `priority` string values that bypass the application's enum guards.
- **Potential Exploit Path (injection):**
  1. `POST /api/intake/zendesk` with `{"title":"t","description":"d","type":"ARBITRARY_STRING","priority":"ARBITRARY_STRING"}`.
  2. `body.type || WorkItemType.Bug` — if `body.type` is non-empty, it passes through unvalidated.
  3. Item is stored with `type: "ARBITRARY_STRING"`. The `assessAsWorkDefiner` switch statement hits no case (no default); the assessment proceeds without type-specific guidance. The filter endpoint `GET /api/work-items?type=ARBITRARY_STRING` would find the item.
- **Red Team Handoff Notes:**
  - Test without any auth header — should accept freely.
  - Fuzz `type` and `priority` with arbitrary strings: `"type":"root"`, `"priority":"0"`, `"priority":-1`.
  - Test with `"type":"feature"` (valid) alongside `"priority":"INJECTION"` to partially bypass enum guards.
  - Verify no Zendesk signature header (`X-Zendesk-Webhook-Signature`) is checked anywhere.

---

### PEN-005: Business Logic — Rejected Item Triggers Cascade Auto-Dispatch of Dependents
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:192-203`, `Source/Backend/src/services/dependency.ts:251-314`
- **Vulnerability Description:** When a work item is **rejected**, the reject handler calls `onItemResolved(id)`. The `DISPATCH_TRIGGER_STATUSES` constant includes `Rejected`. `onItemResolved()` then finds all items that this rejected item was blocking, and if they are in `Approved` status with all other blockers resolved, **auto-dispatches them to production teams**. A rejected item is a failed/cancelled prerequisite; auto-dispatching dependents on a prerequisite's failure is a business logic flaw — it moves work into `in-progress` when a blocking dependency has explicitly failed, not completed.
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (blocked by A). Set B to `Approved`.
  2. Reject item A via `POST /api/work-items/A_id/reject` with `{"reason": "..."}`.
  3. `onItemResolved(A_id)` runs; A's status is `Rejected` ∈ `DISPATCH_TRIGGER_STATUSES`.
  4. B (Approved, A now "resolved" per `RESOLVED_STATUSES`) gets auto-dispatched: status → `in-progress`, `assignedTeam` set.
  5. B is now in-progress with a rejected prerequisite — invalid business state.
- **Red Team Handoff Notes:**
  - Objective from config: *"Bypass work item state machine to reach an invalid status"*.
  - Chain: create A → create B → add dependency (B blocked by A) → fast-track B to Approved (use PEN-002) → reject A → observe B auto-dispatched.
  - Verify B's `changeHistory` shows `cascade-dispatcher` as agent with reason referencing A's docId.
  - Note: the same cascade does NOT fire on Approve (only Reject and Completed), making this asymmetric.

---

## Medium Findings

---

### PEN-006: Soft-Deleted Blocker Permanently Blocks Dependent Item Dispatch (DoS)
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64-75`, `Source/Backend/src/store/workItemStore.ts:23-27`
- **Vulnerability Description:** `computeHasUnresolvedBlockers()` calls `store.findById(link.blockerItemId)` for each blocker. `findById()` returns `undefined` for soft-deleted items (line 24-25 of store). The function treats `!blocker` as **unresolved**: `return !b || !RESOLVED_STATUSES.includes(b.status)`. If a blocker item is soft-deleted via `DELETE /api/work-items/:id` **without first removing the dependency link**, the blocked item's `blockedBy` array still contains a stale reference. `computeHasUnresolvedBlockers` returns `true` permanently, and the blocked item can never be dispatched.
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (blocked by A, Approved status).
  2. `DELETE /api/work-items/A_id` — soft deletes A.
  3. B's `blockedBy` array still references A's ID.
  4. `computeHasUnresolvedBlockers(B_id)` → `findById(A_id)` returns `undefined` → returns `true`.
  5. `POST /api/work-items/B_id/dispatch` → returns 400: "work item has unresolved blocking dependencies".
  6. B is permanently stuck — no endpoint automatically cleans up stale `blockedBy` references after soft-deletion.
- **Red Team Handoff Notes:**
  - Objective from config: *"Access or modify a soft-deleted work item via direct ID reference"* — partial match (blocked item cannot access the deleted blocker).
  - Try `GET /api/work-items?status=approved` after the DoS — B is still visible but un-dispatchable.
  - Recovery: call `POST /api/work-items/B_id/dependencies` with `{"action":"remove","blockerId":"A_id"}` — this succeeds because `removeDependency` only requires `blockedId` to exist, not the blocker.

---

### PEN-007: Prometheus /metrics Endpoint Publicly Accessible Without Authentication
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`
- **Vulnerability Description:** The `/metrics` endpoint exposes Prometheus-format operational metrics without any authentication gate. Metrics include: total items created by source/type, assessed (with verdict label), routed (by route), dispatched (by team), dispatch gating events, cycle detection results, and dependency operation counts. This leaks operational intelligence about workload volume, team assignments, and system behaviour to any network-accessible caller.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics`
  2. Response contains counters: `work_items_created_total{source="zendesk"}`, `work_items_dispatched_total{team="TheATeam"}`, `dependency_operations_total{action="add"}`, etc.
  3. Attacker maps item creation rates, route distribution, and team load without touching the main API.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` — no auth required.
  - Cross-reference metric labels with actual item IDs to infer routing and assessment patterns.

---

### PEN-008: Race Condition in `setDependencies` — Non-Atomic Remove-Then-Add
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:220-238`
- **Vulnerability Description:** `setDependencies()` (called from `PATCH /api/work-items/:id` when `blockedBy` is supplied) first removes all existing dependency links, then adds new ones. This is a two-phase non-atomic operation on an in-memory store with no locking. Between the removal phase and re-addition phase, the item briefly has zero blockers — `hasUnresolvedBlockers` is set to `false`. A concurrent `POST /api/work-items/:id/dispatch` during this window would pass the `computeHasUnresolvedBlockers` check and dispatch the item while its dependencies are in a partially reset state.
- **Potential Exploit Path:**
  1. Item B is in `Approved` status, blocked by items A1, A2, A3.
  2. Attacker sends `PATCH /api/work-items/B_id` with `{"blockedBy": ["A1","A2","A3"]}` — triggers `setDependencies`.
  3. Concurrently (timed to hit during the remove phase): `POST /api/work-items/B_id/dispatch`.
  4. If the dispatch request arrives after `removeDependency` calls complete but before `addDependency` calls complete, `computeHasUnresolvedBlockers` returns `false` and dispatch proceeds.
  5. B is dispatched with its blockers actually unresolved.
- **Red Team Handoff Notes:**
  - In-memory Node.js is single-threaded (event loop); true concurrent execution is unlikely for sync code. However, if any async await is introduced or the store is externalised, this race becomes reliably exploitable.
  - For now: test with rapid sequential requests — send PATCH then immediately send dispatch (two requests in rapid succession using `curl --parallel` or a test script).

---

### PEN-009: State Machine Partial Bypass — `routing` Status Allows Direct Approve
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:106-111`, `Source/Shared/types/workflow.ts:214-224`
- **Vulnerability Description:** `VALID_STATUS_TRANSITIONS` allows `routing → approved` as a valid transition. The `POST /api/work-items/:id/approve` endpoint uses `isValidTransition()` which consults this map. An item that has only reached `routing` status (the transient router state) can be manually approved before the router service completes its classification, bypassing the router's decision and assessment pod entirely. Combined with PEN-001 (no auth), any unauthenticated caller can approve an item that is momentarily in the `routing` transient state.
- **Potential Exploit Path:**
  1. The route action transitions through `routing` as a transient state in `routeWorkItem()` — but the HTTP response only returns after the full routing completes, so normal flow won't leave items in `routing`.
  2. However, any error in `routeWorkItem()` after the `routing` entry is written but before the final status update would leave items permanently stuck in `routing`.
  3. Direct exploit: if an attacker can inject a fault between the two store writes in `routeWorkItem()` (lines 107-128 of router.ts), the item remains in `routing` and can be immediately approved via the approve endpoint.
  4. Without fault injection: create an item, call route (fails partway), then call approve.
- **Red Team Handoff Notes:**
  - Test: send a route request with a body designed to trigger an exception mid-route, then immediately approve.
  - Also test: directly call `POST /api/work-items/:id/approve` on an item that somehow ended up stuck in `routing`.

---

## Low Findings

---

### PEN-010: Internal Error Messages Leaked to API Clients
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:61,89,138,205,293,350,367`
- **Vulnerability Description:** All catch blocks in `workflow.ts` extract `err.message` and return it directly in the JSON response body with a 500 status. Error messages from internal services (dependency cycle detection, store failures, router logic) can expose implementation details: function names, internal IDs, state names, and dependency graph structure.
- **Potential Exploit Path:**
  1. Trigger a 500 error (e.g., send a route request for an item in an invalid internal state).
  2. Response contains: `{"error": "Work item XYZ not found"}` or cycle detection messages.
  3. Attacker uses error text to map internal item IDs and state machine edges.
- **Red Team Handoff Notes:**
  - Deliberately trigger errors: submit malformed dependency IDs, request transitions from terminal states.
  - Note: the global `errorHandler` middleware returns a generic "Internal server error" — only unhandled errors reach it. Route-level catches return raw messages.

---

### PEN-011: No Rate Limiting on Any Endpoint (Intake Flood / ID Brute-Force)
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:1-54` (no rate-limit middleware registered)
- **Vulnerability Description:** No rate limiting, throttling, or request quota is applied to any endpoint. The intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) can be flooded to create thousands of work items with no back-pressure. The `GET /api/work-items/:id` endpoint can be used to brute-force valid item IDs (UUIDs from `generateId()`).
- **Potential Exploit Path:**
  1. `for i in seq 1 10000; do curl -s -X POST http://localhost:3001/api/intake/automated -d '{"title":"spam","description":"flood"}' & done`
  2. In-memory store fills with garbage work items; dashboard and list endpoints slow or time out.
  3. For ID brute-force: UUIDs are random (v4 via `generateId()`), making enumeration impractical unless IDs are leaked via other means (PEN-007, PEN-003).
- **Red Team Handoff Notes:**
  - Focus flood on intake endpoints — they have the weakest validation.
  - Confirm memory usage grows unbounded under load; no eviction or cap is implemented in `workItemStore.ts`.

---

## Attack Chain Summary

The following chains combine individual findings for maximum impact:

| Chain | Steps | Objective |
|-------|-------|-----------|
| **Full Bypass** | PEN-001 → PEN-002 → dispatch | Backlog→Approved→InProgress without any auth or assessment (3 requests) |
| **Cascade Abuse** | PEN-001 → PEN-002 (fast-track B to Approved) → create A as blocker → reject A → B auto-dispatches | Objective: "Bypass state machine to reach invalid status" |
| **Enumeration** | PEN-001 → PEN-003 | Dump all work items in one request |
| **Intake Spoofing** | PEN-004 → PEN-001 → PEN-002 | Inject item via unauthed webhook with invalid enum values, then fast-track it |
| **Dispatch DoS** | PEN-001 → PEN-006 | Soft-delete a blocker to permanently prevent a target item from being dispatched |

---

## Exclusions (Handled by Static Analyzer)

The following were observed but are in the static-analyzer's CWE scope and are NOT re-reported here:
- Hardcoded secrets / environment variable usage patterns — [SEE SAST findings]
- Prototype pollution via `Object.assign` in `updateWorkItem` — [SEE SAST findings, mitigated by allowlist in PATCH handler]

---

*This map was generated by pen_tester via white-box static analysis. No live requests were executed. All findings are theoretical until confirmed by the red-teamer.*

---

## Red Team Results

**Agent:** red_teamer | **Run Date:** 2026-09-21 | **Environment:** Ephemeral (docker-compose.test.yml)
**Target:** `http://localhost:3001` (portal/Backend — Node.js/Express + SQLite)
**Note:** The pen-tester analyzed `Source/Backend/` (in-memory store, `/api/work-items`). The running test environment uses `portal/Backend/` (SQLite, different domain model). Vulnerability classes are identical; exploit payloads adapted to actual running routes.

| Chain ID | Objective Achieved | Severity | Status |
|----------|--------------------|----------|--------|
| RED-001 | No auth on any endpoint — confirmed | Critical | Confirmed (Live Exploit) |
| RED-002 | State machine bypass via force-approve | Critical | Confirmed (Live Exploit) |
| RED-003 | Full item enumeration without pagination | High | Confirmed (Live Exploit) |
| RED-004 | Stale blocker dependency DoS | High | Confirmed (Live Exploit) |
| RED-005 | Vote reset via unauthenticated retrigger | High | Confirmed (Live Exploit) |
| RED-006 | Public Prometheus metrics — operational intel | Medium | Confirmed (Live Exploit) |
| RED-007 | Error message information leakage | Low | Confirmed (Live Exploit) |
| RED-008 | Unauthorized development cycle creation | Critical | Confirmed (Live Exploit) |
| RED-009 | Full CI/CD pipeline takeover | Critical | Confirmed (Live Exploit) |

---

### RED-001: Complete Absence of Authentication — All Endpoints Open
- **Severity:** Critical
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests`, `http://localhost:3001/api/bugs`, all routes
- **Based On:** PEN-001
- **Exploit Scenario:**
  1. `POST /api/feature-requests` with no Authorization header, no API key, no session cookie.
  2. Server returns HTTP 201 with fully created entity: `{"id":"FR-0001","status":"potential",...}`
  3. Same result for `POST /api/bugs` → HTTP 201 with `{"id":"BUG-0001","status":"reported",...}`
  4. All state-mutation endpoints (PATCH, DELETE, POST sub-routes) accept requests with zero credentials.
- **Evidence:** `curl -s -X POST http://localhost:3001/api/feature-requests -H "Content-Type: application/json" -d '{"title":"t","description":"d","priority":"high"}' → HTTP 201 {"id":"FR-0001",...}`
- **Recommendation:** Implement an authentication middleware (JWT or session-based) that gates all `/api/*` routes. Return HTTP 401 for unauthenticated requests to any non-public endpoint.

---

### RED-002: Unauthenticated Force-Approve Bypasses Entire AI Voting Process
- **Severity:** Critical
- **Objective Achieved:** Yes — "Bypass work item state machine to reach an invalid status"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/force-approve`
- **Based On:** PEN-001, PEN-002 (analogous: force-approve replaces overrideRoute fast-track)
- **Exploit Scenario:**
  1. `POST /api/feature-requests` (no auth) → creates FR-0003 in `potential` status.
  2. `PATCH /api/feature-requests/FR-0003` body `{"status":"voting"}` → moves to `voting` (valid transition, no auth).
  3. `POST /api/feature-requests/FR-0003/force-approve` (no auth) → item immediately jumps to `approved`, bypassing AI voting quorum (normally requires 5 agent votes to reach consensus).
  4. Feature request is approved in 3 unauthenticated HTTP requests in under 1 second.
- **Evidence:** `human_approval_approved_at` set, `status=approved`, zero votes cast by any AI agent, zero auth headers sent.
- **Recommendation:** `force-approve` must require a privileged role (e.g., `ADMIN` or `HUMAN_APPROVER`). Remove the unauthenticated PATCH-based status transition; all state transitions must go through validated service-layer flows.

---

### RED-003: Unbounded Enumeration — All Records Returned in Single Request
- **Severity:** High
- **Objective Achieved:** Yes — "Enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/api/feature-requests?limit=999999999`
- **Based On:** PEN-003
- **Exploit Scenario:**
  1. `GET /api/feature-requests?limit=999999999` → server returns all 60 items (entire dataset) in a single response.
  2. No server-side cap on `limit` parameter — `parseInt("999999999")` passes directly to the query.
  3. Response includes full record detail for every item including votes, dependency links, and metadata.
- **Evidence:** With 60 items in DB, `limit=999999999` returned all 60; default request (no limit) also returned all 60, confirming no default cap enforced.
- **Recommendation:** Enforce a server-side maximum `limit` (e.g., 100). Apply the cap at the service layer, not the route layer, so it cannot be bypassed by any caller.

---

### RED-004: Stale Blocker Dependency DoS — Permanent Item Lock
- **Severity:** High
- **Objective Achieved:** Partial — "Access or modify a soft-deleted work item" (item is instead permanently locked, not accessed)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `DELETE http://localhost:3001/api/feature-requests/:id`, `GET /api/feature-requests/:id/ready`
- **Based On:** PEN-006
- **Exploit Scenario:**
  1. Create FR-0009 (blocker) and FR-0010 (blocked). Add dependency: FR-0010 blocked by FR-0009.
  2. `DELETE /api/feature-requests/FR-0009` (no auth) → HTTP 204. FR-0009 is deleted; FR-0010's `blocked_by` still references FR-0009.
  3. `GET /api/feature-requests/FR-0010/ready` → `{"ready":false,"unresolved_blockers":[{"item_type":"feature_request","item_id":"FR-0009","title":"Unknown","status":"unknown"}]}`
  4. Attempting `force-approve` on FR-0010 pushes it to `pending_dependencies` status — permanently stuck.
  5. No automated cleanup of stale `blocked_by` references on deletion.
- **Evidence:** FR-0010 `status=pending_dependencies`, `has_unresolved_blockers=true` permanently after FR-0009 deletion. Recovery requires manual `POST /api/feature-requests/FR-0010/dependencies` with `{"action":"remove","blocker_id":"FR-0009"}`.
- **Recommendation:** Cascade dependency cleanup on deletion: when an item is deleted, remove all dependency links where it appears as a blocker before completing the delete. Add a database-level foreign key constraint or application-layer cleanup transaction.

---

### RED-005: Unauthenticated Vote Retrigger — Resets All Existing Votes
- **Severity:** High
- **Objective Achieved:** Yes — "Submit a malformed assessment verdict that bypasses routing logic"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/retrigger`
- **Based On:** PEN-001 (no auth root cause)
- **Exploit Scenario:**
  1. Feature request has completed AI voting with existing `approve`/`deny` votes on record.
  2. `POST /api/feature-requests/FR-0011/retrigger` (no auth) → clears all existing votes and re-runs AI voting from scratch.
  3. Attacker can repeatedly retrigger to keep resetting votes, preventing consensus from forming, or to game the voting outcome.
  4. If AI voting is non-deterministic, repeated retriggers can eventually produce a desired `approved` outcome.
- **Evidence:** Retrigger on FR-0011 returned 5 fresh votes with `status=voting`. Previous vote state was cleared with no auth check.
- **Recommendation:** Restrict retrigger to authorized roles only (e.g., `ADMIN`). Add an audit log entry recording who triggered and when.

---

### RED-006: Prometheus /metrics Publicly Accessible — Operational Intelligence Leak
- **Severity:** Medium
- **Objective Achieved:** Yes (reconnaissance objective)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/metrics`
- **Based On:** PEN-007
- **Exploit Scenario:**
  1. `curl http://localhost:3001/metrics` — no auth required.
  2. Response exposes: all HTTP request routes (including parameterized IDs like `FR-0001`), status codes, request counts, timing histograms.
  3. Attacker can enumerate all endpoint paths that received requests, map entity IDs from route labels, and infer traffic patterns.
- **Evidence:** Metrics revealed exact routes probed during this test session including specific FR IDs in route labels: `route="/api/feature-requests/FR-0001/reject"`. All operational state visible.
- **Recommendation:** Gate `/metrics` behind a network policy (allow-list Prometheus scraper IP), or add basic auth. Never expose raw Prometheus metrics to the public internet.

---

### RED-007: Internal Error Messages Leaked to API Clients
- **Severity:** Low
- **Objective Achieved:** Partial (reconnaissance value)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** Multiple endpoints
- **Based On:** PEN-010
- **Exploit Scenario:**
  1. `GET /api/feature-requests/INVALID-ID-FORMAT` → `{"error":"Feature request INVALID-ID-FORMAT not found"}` — confirms entity naming convention.
  2. `POST /api/feature-requests/FR-0001/dependencies` with invalid `blocker_id` → `{"error":"Invalid blocker_id format: INVALID-FORMAT. Must be BUG-XXXX or FR-XXXX"}` — reveals exact internal ID format schema.
  3. Attacker uses this to construct valid-format IDs for enumeration.
- **Evidence:** Error messages expose: entity types (`BUG-XXXX`, `FR-XXXX`), ID patterns, exact field validation rules.
- **Recommendation:** Return generic error messages to clients (`"Invalid request"`). Log full detail server-side only.

---

### RED-008: Unauthorized Development Cycle Creation — Triggers Pipeline Infrastructure
- **Severity:** Critical
- **Objective Achieved:** Yes — new attack surface not in pen-tester map
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/cycles`
- **Based On:** PEN-001 (no auth root cause)
- **Exploit Scenario:**
  1. `POST /api/cycles` with empty body (no auth) → server creates CYCLE-0001 with auto-selected approved work item.
  2. A pipeline run (RUN-0001) is automatically created and started: `{"status":"running","current_stage":1}`.
  3. 5 pipeline stages (requirements, api_contract, implementation, qa, integration) are instantiated and stage 1 begins.
  4. Attacker has injected a development cycle into the production pipeline queue.
- **Evidence:** `CYCLE-0001` created for `FR-0003`, `RUN-0001` created with `status=running`, `current_stage=1`, all 5 stages instantiated.
- **Recommendation:** Cycle creation must be restricted to authorized orchestrator agents with machine-to-machine authentication (e.g., shared secret header). No unauthenticated client should be able to trigger a development cycle.

---

### RED-009: Full CI/CD Pipeline Takeover — All 5 Stages Approved Without Authentication
- **Severity:** Critical
- **Objective Achieved:** Yes — "Bypass work item state machine to reach an invalid status" (pipeline control)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/pipeline-runs/:id/stages/:n/start` and `/complete`
- **Based On:** PEN-001, PEN-002 (analogous), RED-008
- **Exploit Scenario:**
  1. Attacker creates an unauthorized cycle (RED-008) → pipeline run `RUN-0002` created.
  2. For each of the 5 pipeline stages in sequence (no auth required):
     - `POST /api/pipeline-runs/RUN-0002/stages/{n}/start` → stage enters `running` status.
     - `POST /api/pipeline-runs/RUN-0002/stages/{n}/complete` with body `{"verdict":"approved"}` → stage immediately approved.
  3. After stage 5 completion: `pipeline_run.status=completed`, `completed_at` set.
  4. All five gates — requirements review, API contract, implementation, QA, integration — bypassed in under 30 seconds with 12 HTTP requests and zero authentication.
- **Evidence:**
  ```
  Stage 1 (requirements):   completed / verdict=approved
  Stage 2 (api_contract):   completed / verdict=approved
  Stage 3 (implementation): completed / verdict=approved
  Stage 4 (qa):             completed / verdict=approved
  Stage 5 (integration):    completed / verdict=approved
  Pipeline RUN-0002: status=completed, completed_at=2026-09-21T08:54:40.811Z
  ```
- **Recommendation:** All pipeline stage start/complete endpoints must authenticate the calling agent (machine-to-machine token). Implement stage-level authorization: only the designated agent (`agent_ids` field) should be allowed to start/complete its own stage. Consider a signed webhook pattern so the orchestrator pushes verified stage completions rather than allowing arbitrary POST calls.
