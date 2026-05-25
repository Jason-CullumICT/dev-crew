# Attack Surface Map — dev-crew Source App
**Agent:** pen_tester  
**Date:** 2026-05-25  
**Scope:** White-box static analysis of `Source/Backend/` and `Source/Frontend/`  
**Config:** `Teams/TheGuardians/security.config.yml`

---

## Methodology

Full data-flow trace from all HTTP entry points through the Express router → service → in-memory store layers. Focus areas: authentication/authorization absence, business-logic state-machine bypasses, injection/DoS via unbounded inputs, and dependency graph manipulation.

**Not duplicated here** (see SAST findings): hardcoded secrets, CWE-specific code patterns, config-level issues.

---

## Summary Table

| ID | Title | Severity | Target |
|----|-------|----------|--------|
| PEN-001 | No Authentication on Any API Endpoint | **Critical** | All routes (`app.ts`) |
| PEN-002 | No Authorization / RBAC Layer | **Critical** | All privileged actions |
| PEN-003 | Unbounded Pagination — No Maximum Limit | **High** | `GET /api/work-items` |
| PEN-004 | Fast-Track Route Override Bypasses Assessment Pod | **High** | `POST /api/work-items/:id/route` |
| PEN-005 | Manual Approve/Reject Bypasses Assessment Pod (No Auth) | **High** | `POST /api/work-items/:id/approve` |
| PEN-006 | Unauthenticated Intake Webhooks — No Signature Verification | **High** | `POST /api/intake/*` |
| PEN-007 | Rejection Cascade Auto-Dispatches Dependents (Business Logic Flaw) | **High** | `POST /api/work-items/:id/reject` |
| PEN-008 | Soft-Deleted Blocker Permanently Blocks Dependents (DoS) | **High** | `DELETE /api/work-items/:id` + dispatch |
| PEN-009 | Negative Page Parameter Reads Unexpected Data Positions | **Medium** | `GET /api/work-items?page=-N` |
| PEN-010 | Intake Endpoints Accept Arbitrary Enum Values (No Validation) | **Medium** | `POST /api/intake/zendesk`, `POST /api/intake/automated` |
| PEN-011 | No Rate Limiting on Any Endpoint | **Medium** | All routes |
| PEN-012 | Unimplemented Search Endpoint Referenced by Frontend | **Medium** | `GET /api/search` |
| PEN-013 | Predictable Sequential docIds Enable Work Item Enumeration | **Low** | All work item responses |
| PEN-014 | Prometheus Metrics Endpoint Unauthenticated | **Low** | `GET /metrics` |
| PEN-015 | No CORS Configuration | **Low** | All routes |
| PEN-016 | No CSRF Protection | **Low** | All state-changing routes |

---

## Findings

---

### PEN-001: No Authentication on Any API Endpoint
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (entire Express app — no auth middleware registered)
- **Vulnerability Description:**  
  The Express application mounts zero authentication middleware globally or per-route. No JWT verification, no session check, no API-key validation anywhere in the middleware chain. Every route — including destructive state transitions (`/approve`, `/reject`, `/dispatch`), intake webhooks, and the Prometheus metrics endpoint — is fully accessible to any unauthenticated HTTP client.
- **Potential Exploit Path:**
  1. Make any HTTP request to `http://localhost:3001/api/work-items` (no token or header required).
  2. Receive `200 OK` with live work item data — confirmed unauthenticated access.
  3. Proceed to call any destructive endpoint (e.g., `POST /api/work-items/:id/approve`) with zero credentials.
  4. Expected outcome: full data access and workflow control without any identity verification.
- **Red Team Handoff Notes:**  
  Baseline test first: `curl http://localhost:3001/api/work-items` — should return `200` with data to confirm no token required. Then chain PEN-004 and PEN-005 to demonstrate full workflow bypass.

---

### PEN-002: No Authorization / RBAC Layer
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (all action handlers), `Source/Backend/src/routes/workItems.ts`
- **Vulnerability Description:**  
  No role-based or attribute-based access control exists anywhere in the codebase. After authentication is added, there is no mechanism to distinguish admin users from read-only users. A user who can `GET /api/work-items` can also `POST /api/work-items/:id/dispatch` — no permission check separates these operations. This compounds PEN-001: even once auth exists, the authorization layer is completely absent.
- **Potential Exploit Path:**
  1. (Pre-auth) Any caller can execute any action on any work item.
  2. (Post-auth, if auth added without RBAC) A low-privilege user can approve, reject, or dispatch work items that should require elevated rights.
  3. No middleware in `app.ts` inspects request identity to gate access.
- **Red Team Handoff Notes:**  
  Verify via PEN-001 first. The absence of RBAC is confirmed structurally — no `authorize()`, `requireRole()`, or equivalent middleware calls exist in any route file.

---

### PEN-003: Unbounded Pagination — No Maximum Limit Enforcement
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:69`, `Source/Backend/src/store/workItemStore.ts:34–63`
- **Vulnerability Description:**  
  The `GET /api/work-items` endpoint accepts a `?limit=` query parameter parsed directly with `parseInt()`. There is no cap applied — the store's `findAll()` function has no maximum limit guard. An attacker can request `?limit=999999` to dump all work items in a single response. This enables mass data exfiltration and serves as a DoS vector for large datasets.

  ```typescript
  // workItems.ts:69 — no upper bound check
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```

  ```typescript
  // workItemStore.ts:61 — no guard
  const data = result.slice(offset, offset + limit);
  ```
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999` — receives all non-deleted work items in one call.
  2. Repeat for `GET /api/dashboard/activity?limit=999999` (same pattern, no bound in `dashboard.ts:32`).
  3. Expected outcome: full data dump, potential server memory spike on large stores.
- **Red Team Handoff Notes:**  
  Try `?limit=999999`, `?limit=0` (falls back to 20 — safe), `?limit=-1` (see PEN-009). Also verify `/api/dashboard/activity` has the same flaw (it calls `getActivity(page, limit)` with unvalidated `limit` from query).

---

### PEN-004: Fast-Track Route Override Bypasses Assessment Pod
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57`, `Source/Backend/src/services/router.ts:66–88`
- **Vulnerability Description:**  
  The `POST /api/work-items/:id/route` endpoint passes `body?.overrideRoute` directly to `routeWorkItem()`, which calls `classifyRoute()`. When `overrideRoute` is set, the business-logic classification (fast-track vs full-review) is **skipped entirely** and the caller's chosen route is applied without any validation of whether the work item qualifies:

  ```typescript
  // router.ts:66–73
  export function classifyRoute(item: WorkItem, overrideRoute?: WorkItemRoute): RouteResult {
    if (overrideRoute) {
      return {
        route: overrideRoute,
        targetStatus:
          overrideRoute === WorkItemRoute.FastTrack
            ? WorkItemStatus.Approved   // <--- bypasses assessment pod
            : WorkItemStatus.Proposed,
      };
    }
    // ...
  }
  ```

  No authentication, no privilege check, and no audit gate prevents any caller from applying `"fast-track"` to any work item regardless of its type or complexity, directly transitioning it from `backlog` → `approved`, skipping the assessment pod completely.
- **Potential Exploit Path:**
  1. `POST /api/work-items` → create any work item (gets `id`).
  2. `POST /api/work-items/:id/route` with body `{"overrideRoute": "fast-track"}`.
  3. Item transitions from `backlog` → `approved` in one step, bypassing routing classification AND the assessment pod.
  4. Confirm via `GET /api/work-items/:id` — status should be `"approved"`, route `"fast-track"`.
  5. Now `POST /api/work-items/:id/dispatch` — item enters `in-progress` with no review.
- **Red Team Handoff Notes:**  
  This directly satisfies red-team objective: *"Bypass work item state machine to reach an invalid status."* Create a `feature` type item (which should always require full review) and fast-track it. Verify it reaches `approved` status without any assessment records.

---

### PEN-005: Manual Approve/Reject Bypasses Assessment Pod (No Auth Gate)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:94–142` (approve), `145–209` (reject)
- **Vulnerability Description:**  
  The `POST /api/work-items/:id/approve` and `POST /api/work-items/:id/reject` endpoints are intended as "manual override" actions but carry no authentication check. Any unauthenticated caller with a valid work item ID can:
  - Approve a work item in `proposed` or `reviewing` status, bypassing the assessment pod verdict.
  - Reject a work item with an arbitrary reason string.
  
  The `approve` endpoint also permits transition from `routing` status (per `VALID_STATUS_TRANSITIONS`), providing an escape hatch if an item ever gets stuck in that state — with no auth gate protecting it.

  ```typescript
  // workflow.ts:106 — no auth, any caller can invoke
  if (!isValidTransition(item.status, WorkItemStatus.Approved)) { ... }
  // proceeds to approve without any identity check
  ```
- **Potential Exploit Path:**
  1. `POST /api/work-items` → create item.
  2. `POST /api/work-items/:id/route` → transitions to `proposed` (full-review path).
  3. `POST /api/work-items/:id/approve` with body `{"reason": "override"}` — transitions to `approved` skipping assessment.
  4. Assessment pod is never invoked; `item.assessments` array remains empty.
  5. `GET /api/work-items/:id` confirms `status: "approved"` with zero assessment records.
- **Red Team Handoff Notes:**  
  Create a `feature` type item (complex, should always go through full review). Route it (gets `proposed`). Call `/approve` immediately. Verify the item is approved with `assessments: []` and the changeHistory shows only `manual-override` agents, not `assessment-pod`.

---

### PEN-006: Unauthenticated Intake Webhooks — No Signature Verification
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Vulnerability Description:**  
  The Zendesk and automated intake endpoints accept webhook payloads without any form of authentication, HMAC signature verification, or shared-secret validation. The Zendesk webhook standard requires verifying an `X-Zendesk-Webhook-Signature` header; this is completely absent. Any attacker who knows the endpoint exists can forge Zendesk or automated system events, injecting arbitrary work items into the system.

  Additionally, the intake endpoints do **not validate** the `type` and `priority` fields against their respective enums:

  ```typescript
  // intake.ts:20 — body.type is used as-is if truthy; no enum validation
  type: body.type || WorkItemType.Bug,
  priority: body.priority || WorkItemPriority.Medium,
  ```

  A malicious payload with `type: "INJECTED"` stores that verbatim value.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with body `{"title": "Forged", "description": "Attacker-controlled content"}` — no `X-Zendesk-Webhook-Signature` check fails.
  2. Work item is created with `source: "zendesk"` regardless of actual origin.
  3. Send `{"title": "t", "description": "d", "type": "admin", "priority": "CRITICAL_OVERRIDE"}` — invalid enum values stored verbatim.
  4. Send hundreds of requests to flood the work item queue (DoS — see PEN-011).
- **Red Team Handoff Notes:**  
  Send forged Zendesk webhook without any signature header. Verify `201` response and item creation. Then send with `type: "invalid_enum_value"` — confirm item is created with invalid type stored. Also test `POST /api/intake/automated` with identical attack vectors.

---

### PEN-007: Rejection Cascade Auto-Dispatches Dependents (Business Logic Flaw)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:193`, `Source/Backend/src/services/dependency.ts:251–315`, `Source/Shared/types/workflow.ts:227–237`
- **Vulnerability Description:**  
  When a work item is rejected, the `reject` handler calls `onItemResolved(id)`. The `onItemResolved()` function checks `DISPATCH_TRIGGER_STATUSES`, which includes **both** `Completed` AND `Rejected`:

  ```typescript
  // workflow.ts:227–231
  export const RESOLVED_STATUSES: WorkItemStatus[] = [
    WorkItemStatus.Completed,
    WorkItemStatus.Rejected,   // <-- rejection "resolves" the dependency
    WorkItemStatus.Failed,
  ];

  export const DISPATCH_TRIGGER_STATUSES: WorkItemStatus[] = [
    WorkItemStatus.Completed,
    WorkItemStatus.Rejected,   // <-- rejection triggers cascade dispatch
  ];
  ```

  This means rejecting a blocker item causes all dependent items in `Approved` status to be **automatically dispatched to in-progress**, even though the blocker was rejected (not successfully completed). This violates the expected business logic: a dependent item should not proceed if its prerequisite was rejected.

  An attacker can exploit this to force items into `in-progress` state by manipulating a shared blocker item.
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (blocked by A), both route and approve them.
  2. `POST /api/work-items/A/reject` with any reason.
  3. `onItemResolved(A.id)` fires, sees B is `approved` and A is now "resolved" (rejected).
  4. B is automatically dispatched to `in-progress` via cascade — despite its blocker being rejected.
  5. `GET /api/work-items/B` confirms `status: "in-progress"`, `assignedTeam` set, `changeHistory` shows `cascade-dispatcher`.
- **Red Team Handoff Notes:**  
  This directly satisfies objective: *"Bypass work item state machine to reach an invalid status."* Set up A→B dependency, both approved. Reject A. Verify B becomes `in-progress` without ever being explicitly dispatched. Check B's changeHistory for `cascade-dispatcher` agent entries.

---

### PEN-008: Soft-Deleted Blocker Permanently Blocks Dependents (DoS via Dependency)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64–75`, `Source/Backend/src/store/workItemStore.ts:23–27`
- **Vulnerability Description:**  
  When `computeHasUnresolvedBlockers()` checks if a dependent has pending blockers, it calls `store.findById(link.blockerItemId)`. Since `findById()` returns `undefined` for soft-deleted items, the function treats a missing (soft-deleted) blocker as an **unresolved** blocker:

  ```typescript
  // dependency.ts:68–74
  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId);
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      return true;  // soft-deleted blocker → "unresolved" → blocks dispatch forever
    }
  }
  ```

  An attacker who controls the blocker item (or who can social-engineer a delete) can soft-delete it, permanently preventing the dependent item from ever being dispatched. The `DependencyLink` record remains in the blocked item's `blockedBy` array with no mechanism to remove a reference to a deleted item.

  Additionally, the `isReady()` endpoint exposes the blocker's UUID via `unresolvedBlockers`, which remains visible even after soft-deletion — leaking identities of deleted items.
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (blocked by A). Both in approved state.
  2. `DELETE /api/work-items/A` — soft-deletes A. Returns `204`.
  3. `POST /api/work-items/B/dispatch` — `computeHasUnresolvedBlockers(B.id)` returns true (blocker "not found").
  4. Dispatch is permanently blocked: `400 {"error": "Cannot dispatch: work item has unresolved blocking dependencies"}`.
  5. `GET /api/work-items/B/ready` reveals `{"ready": false, "unresolvedBlockers": [{"blockerItemId": "<A's UUID>", ...}]}` — confirms deleted item ID is leaked.
- **Red Team Handoff Notes:**  
  This satisfies objective: *"Access or modify a soft-deleted work item via direct ID reference."* Specifically — indirectly. The deleted item's UUID is disclosed via readiness check. Also confirm the permanent block: even after re-routing B or creating new items, B cannot be dispatched without removing the stale dependency link.

---

### PEN-009: Negative Page Parameter Reads Unexpected Data Positions
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:69`, `Source/Backend/src/store/workItemStore.ts:60–62`
- **Vulnerability Description:**  
  Negative integers pass through the page/limit parsing without sanitization. Negative `page` values produce a negative `offset` which is passed to JavaScript's `Array.slice()`. A negative start index in `slice()` counts from the end of the array:

  ```typescript
  // workItemStore.ts:60–62
  const offset = (page - 1) * limit;           // page=-1 → offset=-2*20=-40
  const data = result.slice(offset, offset + limit); // slice(-40, -20) → last 20 items
  ```

  This allows an attacker to read work items in reverse order from the end of the list, bypassing normal pagination ordering and potentially accessing recently-created items without knowing total item count. Combining with large `limit` can return arbitrary slices.

  Similarly, `?limit=-1` yields `slice(0, -1)` which returns all items except the last.
- **Potential Exploit Path:**
  1. `GET /api/work-items?page=-1` — slice(-40, -20) returns items near the end of the list.
  2. `GET /api/work-items?page=-1&limit=1` — slice(-2, -1) returns the second-to-last item.
  3. `GET /api/work-items?limit=-1` — returns all items except the last.
  4. `GET /api/dashboard/activity?page=-1` — same pattern in dashboard activity (unvalidated `page`/`limit`).
- **Red Team Handoff Notes:**  
  Populate the store with several work items across different pages. Send `?page=-1` and compare the response to `?page=<lastPage>` — confirm the data differs from what page 1 would return. Try `?page=-1000` with a small item count to observe `slice()` boundary wrapping behavior.

---

### PEN-010: Intake Endpoints Accept Arbitrary Enum Values (No Validation)
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:19–23`, `38–42`
- **Vulnerability Description:**  
  The Zendesk and automated intake routes use `body.type || WorkItemType.Bug` and `body.priority || WorkItemPriority.Medium` without validating against `WorkItemType` or `WorkItemPriority` enum values. Any truthy string for `type` or `priority` is stored verbatim. This bypasses the enum validation present on the main `POST /api/work-items` endpoint. Downstream code paths (assessment pod switch-case, `assignTeam()`) silently fall through on unrecognized values.

  The Prometheus counter `itemsCreatedCounter.inc({ source, type: item.type })` accepts the malicious string as a label — cardinality attacks on Prometheus are possible by submitting many unique type values.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title":"t","description":"d","type":"ADMIN_OVERRIDE","priority":"ULTRA"}`.
  2. Item created with `type: "ADMIN_OVERRIDE"` stored. `GET /api/work-items/:id` confirms.
  3. Assessment pod switch-case on `item.type` falls through (no `case 'ADMIN_OVERRIDE':`), silently skipping work-definer suggestions.
  4. Metric `workflow_items_created_total{source="zendesk",type="ADMIN_OVERRIDE"}` is registered — repeat with 1000 unique type values to create Prometheus cardinality explosion.
- **Red Team Handoff Notes:**  
  Send forged intake with invalid enum values. Verify item persists with invalid type. Check Prometheus `GET /metrics` to confirm cardinality label was registered.

---

### PEN-011: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no rate-limit middleware registered)
- **Vulnerability Description:**  
  No rate-limiting middleware (e.g., `express-rate-limit`) is configured anywhere. All endpoints are vulnerable to:
  - **Intake flood:** Spamming `POST /api/intake/zendesk` to fill the work item queue.
  - **State machine exhaustion:** Hammering `/route`, `/assess`, `/approve` in sequence.
  - **Enumeration:** Brute-force scanning `GET /api/work-items/:id` for valid UUIDs from leaked `blockedBy` arrays.
- **Potential Exploit Path:**
  1. Loop `POST /api/intake/automated` 10,000× — fills queue with noise work items.
  2. `GET /api/work-items?limit=999999` — retrieves all noise items.
  3. Node.js in-memory store grows unboundedly; potential OOM crash.
- **Red Team Handoff Notes:**  
  Send 500 rapid consecutive `POST /api/intake/automated` requests and observe whether any throttling occurs. Check memory growth via `/metrics` `process_heap_bytes` gauge.

---

### PEN-012: Unimplemented Search Endpoint Referenced by Frontend
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts:101–104`, `Source/Backend/src/app.ts` (missing route)
- **Vulnerability Description:**  
  The frontend API client calls `GET /api/search?q=<userInput>`, but this route is not registered in `app.ts`. The test file `tests/routes/search.test.ts` documents this gap explicitly. This means:
  1. **Functionality gap:** The dependency picker typeahead feature silently fails in production (404 responses).
  2. **Security risk when implemented:** The `q` parameter will be a user-controlled search input. When the `/api/search` route is eventually added, it must sanitize `q` against regex injection (if regex search is used) and enforce a minimum query length to prevent full-dump queries (`?q=`).
  
  The test file shows empty `q` should return empty results — this contract is unimplemented and the future implementation must explicitly enforce it to prevent `?q=` from dumping all items.
- **Potential Exploit Path:**
  1. Current: `GET /api/search?q=test` → `404` (unimplemented — functionality broken).
  2. Future risk: `GET /api/search?q=` (empty) → potentially dumps all work items if the empty-query contract is not enforced in implementation.
  3. Future risk: `GET /api/search?q=.*` or other regex metacharacters if search uses `RegExp(q)` without escaping.
- **Red Team Handoff Notes:**  
  Verify the 404 currently. Flag for the red team to revisit once the search route is implemented. Specifically: test `?q=` (empty), `?q=.*`, `?q=a`.repeat(10000) for ReDoS.

---

### PEN-013: Predictable Sequential docIds Enable Work Item Enumeration
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts:13–16`
- **Vulnerability Description:**  
  Work items are assigned sequential `docId` values (`WI-001`, `WI-002`, ...) via a module-level counter. These are returned in all API responses and change history entries. An attacker can:
  - Determine total system usage (count of work items ever created) from the highest observed docId.
  - Infer system activity rate by comparing docIds over time.
  - Cross-reference docIds seen in changeHistory of accessible items to identify items they cannot directly access.

  Primary keys use UUIDs (secure), but docIds are an enumerable side-channel.
- **Potential Exploit Path:**
  1. `GET /api/work-items` — observe docId pattern in response (e.g., `WI-042`).
  2. Infer at least 42 work items have been created (including soft-deleted).
  3. In `blockedBy[].blockerItemDocId`, observe docIds of soft-deleted blockers (information disclosure about deleted items).
- **Red Team Handoff Notes:**  
  Note the highest docId in the system via a single list request. Cross-reference with soft-deleted item docIds visible in dependency link records.

---

### PEN-014: Prometheus Metrics Endpoint Unauthenticated
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34–37`
- **Vulnerability Description:**  
  `GET /metrics` is exposed without authentication and returns detailed operational counters: items created/routed/assessed/dispatched by label, dependency operation counts, cycle detection events, and default Node.js process metrics (heap, GC, event loop lag). This reveals:
  - System activity volume (items in each state)
  - Technology fingerprint (Node.js, prom-client version via metric names)
  - Operational patterns useful for timing attacks
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — returns full Prometheus text format output.
  2. `workflow_items_created_total{source="zendesk", type="bug"}` reveals intake activity.
  3. `process_heap_bytes` reveals memory state.
- **Red Team Handoff Notes:**  
  Fetch metrics endpoint, confirm unauthenticated 200 response with full metric dump.

---

### PEN-015: No CORS Configuration
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no `cors()` middleware)
- **Vulnerability Description:**  
  No `cors` middleware is configured. Without explicit CORS policy, the server does not send `Access-Control-Allow-Origin` headers. In a cross-origin browser scenario, this blocks legitimate frontend access. For security, the concern is that explicit allow-listing of trusted origins is absent — when the frontend is served from a different origin (e.g., `localhost:5173` calling `localhost:3001`), browser requests may fail or succeed inconsistently depending on the reverse-proxy setup. The lack of explicit CORS also means any future auth mechanism using cookies would be exploitable via CSRF.
- **Red Team Handoff Notes:**  
  Send a preflight `OPTIONS` request with `Origin: http://attacker.example.com` and `Access-Control-Request-Method: POST`. Observe whether the server returns permissive CORS headers.

---

### PEN-016: No CSRF Protection
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no CSRF middleware)
- **Vulnerability Description:**  
  No CSRF token mechanism exists. Currently the API is authentication-free (PEN-001), so CSRF is not immediately exploitable. However, if cookie-based authentication is added in the future without CSRF protection, all state-changing endpoints (`/approve`, `/reject`, `/dispatch`, `/route`) become vulnerable to cross-site request forgery from any site that can guess a work item ID (sequential docId — see PEN-013).
- **Red Team Handoff Notes:**  
  Flag as future-risk. Confirm no `X-CSRF-Token` or `SameSite` cookie is set in current responses.

---

## Attack Chains for Priority Exploitation

### Chain A — Full State Machine Bypass (PEN-001 + PEN-004)
```
POST /api/work-items         → create item (gets UUID)
POST /api/work-items/:id/route  {"overrideRoute":"fast-track"}  → status: approved
POST /api/work-items/:id/dispatch {"team":"TheATeam"}           → status: in-progress
```
**Objective satisfied:** "Bypass work item state machine" — `feature` type item reaches `in-progress` with zero assessment records.

### Chain B — Fake Zendesk Webhook + Queue Flooding (PEN-006 + PEN-011)
```
POST /api/intake/zendesk (×1000, no auth, no sig check)
→ flood queue with attacker-controlled work items
GET /api/work-items?limit=999999  → extract all items
```
**Objective satisfied:** "Enumerate all work items without pagination limit enforcement."

### Chain C — Soft-Delete DoS on Dependency (PEN-008 + PEN-001)
```
POST /api/work-items          → create blocker A
POST /api/work-items          → create dependent B
POST /api/work-items/B/dependencies  {"action":"add","blockerId":"A.id"}
POST /api/work-items/B/route + /approve  → B status: approved
DELETE /api/work-items/A      → soft-delete A
POST /api/work-items/B/dispatch  → BLOCKED FOREVER
```
**Objective satisfied:** "Access or modify a soft-deleted work item via direct ID reference" — B is permanently blocked; A's UUID leaks via readiness check.

### Chain D — Rejection Cascade Exploit (PEN-007 + PEN-001)
```
Create + approve A (blocker) + B (blocked by A, also approved)
POST /api/work-items/A/reject  {"reason":"anything"}
→ onItemResolved(A) fires → B auto-dispatched to in-progress
GET /api/work-items/B  → status: "in-progress", changeHistory: cascade-dispatcher
```
**Objective satisfied:** "Submit a malformed assessment verdict that bypasses routing logic" — rejection of A drives B to in-progress without explicit dispatch.

---

## Handoff Notes for Red Teamer

1. **Start with PEN-001 baseline**: Confirm all endpoints are reachable without any auth header. This validates the testing environment.

2. **Chain A is the highest-value exploit**: Creates a feature item → fast-tracks it → dispatches it. Fully automated, ~3 requests. Demonstrates complete workflow bypass.

3. **Chain D is the subtlest finding**: Requires setup but demonstrates that the `RESOLVED_STATUSES` design decision (including `Rejected`) has a cascade side-effect that could drive items into production (in-progress) prematurely.

4. **PEN-008 requires store state**: Ensure the store is not reset between steps (in-memory store, no persistence — test in a single session).

5. **Search endpoint (PEN-012)**: Currently 404. If the endpoint gets implemented between pipeline runs, immediately test `?q=` (empty query) and `?q=.*` for data dump/ReDoS.

6. **Scope reminder**: `GET /api/work-items?status=<invalid_enum>` — unvalidated filter values silently return all results (filter is skipped) rather than erroring. Minor information disclosure, low priority.
