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
