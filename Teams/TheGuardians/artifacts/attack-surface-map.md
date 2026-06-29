# Attack Surface Map — dev-crew Source App
**Generated:** 2026-06-29  
**Analyst:** pen_tester (TheGuardians)  
**Scope:** White-box static analysis of `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`  
**Handoff target:** red-teamer  

---

## Executive Summary

The backend is an Express.js REST API with an **in-memory store**, zero authentication middleware, and no authorization layer whatsoever. Every single route — including state-changing workflow transitions, intake webhooks, and the Prometheus metrics endpoint — is publicly accessible without credentials. The attack surface is extremely wide. The highest-impact chains allow any anonymous caller to fully bypass the assessment pod, approve arbitrary work items, and force-dispatch them to a team.

---

## Finding Index

| ID | Title | Severity |
|----|-------|----------|
| PEN-001 | Complete Absence of Authentication — All Endpoints Unprotected | Critical |
| PEN-002 | State Machine Bypass via Fast-Track Route Override | Critical |
| PEN-003 | Manual Approve Bypasses Entire Assessment Pod | Critical |
| PEN-004 | Intake Webhooks Accept Unauthenticated Arbitrary Input | Critical |
| PEN-005 | No Pagination Limit — Full Dataset Enumeration | High |
| PEN-006 | Unvalidated Enum Injection on Intake Endpoints | High |
| PEN-007 | Unauthenticated Prometheus Metrics Endpoint | High |
| PEN-008 | Partial State Mutation — changeHistory Written Before Status Confirmed | High |
| PEN-009 | No CSRF Protection on State-Changing Actions | Medium |
| PEN-010 | Integer Overflow / Negative Limit in Pagination | Medium |
| PEN-011 | Internal Error Messages Leaked to Clients | Medium |
| PEN-012 | No Rate Limiting on Any Endpoint | Medium |
| PEN-013 | Sequential Predictable DocIDs Enable Item Count Enumeration | Low |
| PEN-014 | NeedsClarification Verdict Silently Maps to Rejected | Low |
| PEN-015 | Unauthenticated Full Dashboard Data Disclosure | Low |

---

## Detailed Findings

---

### PEN-001: Complete Absence of Authentication — All Endpoints Unprotected
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — Lines 1–54 (entire app setup)
- **Vulnerability Description:**  
  There is no authentication or session middleware registered anywhere in the Express application. `app.ts` mounts four routers (`workItemsRouter`, `workflowRouter`, `dashboardRouter`, `intakeRouter`) with no preceding `authenticate()`, `requireAuth()`, or token-verification middleware. Every endpoint — CRUD, state transitions, intake webhooks, and metrics — is completely open to anonymous HTTP requests from any caller that can reach port 3001.
- **Potential Exploit Path:**
  1. Attacker sends any HTTP request to `http://localhost:3001/api/work-items` without any `Authorization` header or cookie.
  2. Express receives the request, routes it through the mounted router, and processes it normally.
  3. The request reads, creates, or modifies data with no identity check performed at any layer.
- **Red Team Handoff Notes:**  
  Test baseline: `curl -s http://localhost:3001/api/work-items` should return data with no auth header. Then escalate to state-changing calls (PEN-002, PEN-003) to confirm full exploitation. Every PEN finding below assumes PEN-001 is confirmed.

---

### PEN-002: State Machine Bypass via Fast-Track Route Override
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` line 57 → `Source/Backend/src/services/router.ts` lines 66–88
- **Vulnerability Description:**  
  The `POST /api/work-items/:id/route` endpoint accepts an optional `overrideRoute` body field and passes it directly to `classifyRoute()`. When `overrideRoute === "fast-track"`, `classifyRoute()` immediately returns `targetStatus: WorkItemStatus.Approved`, skipping the entire assessment pod (requirements review, domain expert, work definer, pod-lead verdict). Any anonymous caller can promote any item in `backlog` status directly to `approved` in two requests.
  
  ```typescript
  // router.ts lines 66-75
  export function classifyRoute(item: WorkItem, overrideRoute?: WorkItemRoute): RouteResult {
    if (overrideRoute) {
      return {
        route: overrideRoute,
        targetStatus:
          overrideRoute === WorkItemRoute.FastTrack
            ? WorkItemStatus.Approved  // ← Full assessment pod bypassed
            : WorkItemStatus.Proposed,
      };
    }
  ```

- **Potential Exploit Path:**
  1. Create a work item: `POST /api/work-items` with valid body → response contains `{id: "uuid-xxx", status: "backlog"}`.
  2. Override-route it: `POST /api/work-items/uuid-xxx/route` with body `{"overrideRoute": "fast-track"}`.
  3. Item transitions directly to `approved` without any assessment.
  4. Dispatch: `POST /api/work-items/uuid-xxx/dispatch` with body `{"team": "TheATeam"}`.
  5. Item is now `in-progress` — bypassing the entire governance workflow.
- **Red Team Handoff Notes:**  
  Payload: `{"overrideRoute": "fast-track"}`. Also try `{"overrideRoute": "full-review"}` to verify the non-fast-track path goes to `proposed` (control case). Confirm step 3 by GETting `/:id` and checking `status === "approved"`. The full chain (create → fast-track route → dispatch) is the critical objective: "Bypass work item state machine to reach an invalid status."

---

### PEN-003: Manual Approve Bypasses Entire Assessment Pod
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 94–142
- **Vulnerability Description:**  
  The `POST /api/work-items/:id/approve` endpoint is documented as a "manual override" but enforces only that the current status is in `VALID_STATUS_TRANSITIONS[status]` → `Approved`. Valid source statuses include `proposed`, `reviewing`, and `routing` (from the transition table). No role, privilege level, or authorization check gates this endpoint. The `reason` field is entirely optional. Any anonymous caller who can reach port 3001 can approve any item that is not in `backlog`, `approved`, `in-progress`, `completed`, `failed`, or `rejected` status.

  ```typescript
  // VALID_STATUS_TRANSITIONS — workflow.ts line 217
  [WorkItemStatus.Routing]: [WorkItemStatus.Proposed, WorkItemStatus.Approved],
  [WorkItemStatus.Proposed]: [WorkItemStatus.Reviewing, WorkItemStatus.Approved, WorkItemStatus.Rejected],
  [WorkItemStatus.Reviewing]: [WorkItemStatus.Approved, WorkItemStatus.Rejected],
  ```

- **Potential Exploit Path:**
  1. Create item → status `backlog`.
  2. Route normally: `POST /:id/route` (no override) → item moves to `proposed`.
  3. Manually approve: `POST /:id/approve` with body `{}` (reason is optional) → item status becomes `approved`.
  4. Assessment pod never ran. No requirements review, no domain expert assessment.
  5. Dispatch: `POST /:id/dispatch` → `in-progress`.
- **Red Team Handoff Notes:**  
  Try with an empty body `{}` to confirm `reason` is not required. Also test from `routing` status (after `/route` call before assessment) — the transition table permits `routing → approved` directly.

---

### PEN-004: Intake Webhooks Accept Unauthenticated Arbitrary Input
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 11–56
- **Vulnerability Description:**  
  `POST /api/intake/zendesk` and `POST /api/intake/automated` accept arbitrary JSON payloads and create work items without any authentication, API key validation, or webhook signature verification (no HMAC/SHA256 check of the request body against a shared secret). A real Zendesk integration would sign webhook payloads; this implementation accepts unsigned requests from any source.  
  
  Additionally, both endpoints pass `body.type` and `body.priority` directly to `store.createWorkItem()` without enum validation:
  ```typescript
  type: body.type || WorkItemType.Bug,     // no Object.values(WorkItemType).includes() check
  priority: body.priority || WorkItemPriority.Medium,  // no validation
  ```
  The standard `POST /api/work-items` endpoint validates both fields; the intake endpoints do not.

- **Potential Exploit Path:**
  1. Attacker POSTs to `http://localhost:3001/api/intake/zendesk` from any origin with:
     ```json
     {"title": "Injected Item", "description": "Attacker-controlled description", "type": "feature", "priority": "critical"}
     ```
  2. Server creates a `feature`/`critical` work item sourced as `zendesk` — misrepresenting its origin.
  3. Alternatively, set `type = "hacked_value"` to inject an invalid enum value into the store, corrupting downstream processing (routing logic, assessment logic).
  4. Mass-create items to flood the dashboard and disrupt legitimate operations.
- **Red Team Handoff Notes:**  
  Try: `{"title": "x", "description": "y", "type": "INVALID_ENUM_VALUE"}` on both `/intake/zendesk` and `/intake/automated`. Verify the created item has `type = "INVALID_ENUM_VALUE"` in the GET response. Also verify no HMAC header is required. Objective: create 100 items via intake and confirm they appear in `/api/dashboard/queue`.

---

### PEN-005: No Pagination Limit — Full Dataset Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68–75 → `Source/Backend/src/store/workItemStore.ts` lines 30–63
- **Vulnerability Description:**  
  The `GET /api/work-items` and `GET /api/dashboard/activity` endpoints accept user-supplied `limit` and `page` query parameters. Neither validates an upper bound on `limit`. The store performs:
  ```typescript
  const limit = pagination.limit || 20;
  const data = result.slice(offset, offset + limit);
  ```
  An attacker can set `limit=9999999` to retrieve the entire dataset in a single request, bypassing pagination controls and enabling full data exfiltration.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1`
  2. Server builds the full item array, slices from index 0 to 999999.
  3. All non-deleted work items (including sensitive descriptions and change histories) are returned in one response.
  4. The `total` field in the response confirms the exact item count (information disclosure).
- **Red Team Handoff Notes:**  
  Payload: `?limit=999999`. Also try `?limit=0` and `?limit=-1` as edge cases. Confirm the response contains all items by comparing `data.length` to the `total` field. This directly tests the objective: "Enumerate all work items without pagination limit enforcement."

---

### PEN-006: Unvalidated Enum Injection on Intake Endpoints
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 19–25, 40–46
- **Vulnerability Description:**  
  The intake endpoints accept `body.type` and `body.priority` from the request body and pass them directly to `createWorkItem()` without checking them against their respective enum value sets. By contrast, the main `POST /api/work-items` endpoint performs explicit validation:
  ```typescript
  if (!body.type || !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Valid type is required...' });
  }
  ```
  The intake endpoints have no equivalent guard. Any string value accepted by `body.type || WorkItemType.Bug` that is truthy will be stored verbatim, corrupting routing and assessment logic which uses switch/type-match on the enum values.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title":"t","description":"d","type":"feature","priority":"critical"}`
  2. Item is created as `type="feature"`, `priority="critical"` even though Zendesk items are supposed to be `bug` type by default.
  3. The routing service will classify `feature` items as `full-review` and assign to `TheATeam`, corrupting intended routing.
  4. Also try `type="MALICIOUS_TYPE_STRING"` to inject invalid enum values.
- **Red Team Handoff Notes:**  
  Try: `{"title":"t","description":"d","type":"HACKED","priority":"BOGUS"}`. GET the created item and confirm `type === "HACKED"`. Also try overriding the source field (though it's hardcoded server-side). Verify routing behavior is disrupted for injected `type` values.

---

### PEN-007: Unauthenticated Prometheus Metrics Endpoint
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` lines 34–37
- **Vulnerability Description:**  
  The `/metrics` endpoint is registered without any authentication guard and exposes full Prometheus-format metrics including:
  - `workflow_items_created_total` (with `source` and `type` label breakdown)
  - `workflow_items_routed_total` (with `route` label)
  - `workflow_items_assessed_total` (with `verdict` label — reveals rejection rates)
  - `workflow_items_dispatched_total` (with `team` label)
  - `dependency_operations_total`, `dispatch_gating_events_total`, `cycle_detection_events_total`
  - Default Node.js process metrics: heap size, CPU, event loop lag, GC stats
  
  This exposes operational intelligence to any unauthenticated attacker, enabling reconnaissance.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` with no credentials.
  2. Response contains full Prometheus text format with all counters and system metrics.
  3. Attacker learns exact item creation velocity, assessment rejection rate, team dispatch patterns, and system resource utilization.
- **Red Team Handoff Notes:**  
  `curl http://localhost:3001/metrics`. Confirm no `Authorization` header is required. Extract and document the operational profile this exposes (item counts, verdict ratios, team assignments).

---

### PEN-008: Partial State Mutation — changeHistory Written Before Status Confirmed
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 112–131 (approve), 168–198 (reject), 258–274 (dispatch)
- **Vulnerability Description:**  
  The workflow route handlers mutate the in-memory `item.changeHistory` array by direct push **before** calling `store.updateWorkItem()`. Because `findById()` returns a reference to the live store object, this mutation is immediately visible in the store:

  ```typescript
  // workflow.ts — approve handler
  const item = store.findById(id);          // Gets live reference
  item.changeHistory.push(statusEntry);     // Mutates live store directly!
  const updated = store.updateWorkItem(id, {
    status: WorkItemStatus.Approved,
    changeHistory: item.changeHistory,      // Already mutated
  });
  if (!updated) {
    res.status(500).json({ error: 'Failed to update work item' });
    // Status never changed but changeHistory is already corrupted!
    return;
  }
  ```

  If `updateWorkItem()` returns `undefined` (e.g., the item was concurrently soft-deleted between `findById()` and `updateWorkItem()`), the `changeHistory` is permanently mutated with a status transition that never actually occurred. The item will have a phantom history entry showing it was approved, while remaining in its pre-approval status.

- **Potential Exploit Path:**
  1. Attacker sends `DELETE /api/work-items/:id` and simultaneously `POST /api/work-items/:id/approve` against the same item.
  2. If DELETE wins the race, the approve handler's `findById()` returns the item (before deletion), pushes to `changeHistory`, then `updateWorkItem()` returns `undefined` (item is now deleted).
  3. The item's `changeHistory` now contains a misleading `approved` entry while the item is soft-deleted.
  4. If the item is subsequently undeleted (or if the race condition occurs during a different concurrent operation), the audit trail is corrupted.
- **Red Team Handoff Notes:**  
  Try rapid parallel requests: `DELETE /:id` and `POST /:id/approve` sent simultaneously (use `curl --parallel` or `ab`). Verify that changeHistory shows an `approved` transition even if the item ends up deleted. Primarily an audit integrity issue; confirm the state mismatch between `status` and `changeHistory` entries.

---

### PEN-009: No CSRF Protection on State-Changing Actions
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — no CORS or CSRF middleware present
- **Vulnerability Description:**  
  No CSRF token validation or SameSite cookie enforcement exists (no cookies are used at all, so CSRF via cookie theft is not applicable). However, the lack of CORS configuration means the browser will reject cross-origin `Content-Type: application/json` requests via preflight failure, but other CSRF vectors remain:
  - If a user-agent can be coerced into sending non-preflighted requests (e.g., `application/x-www-form-urlencoded`), state-changing POSTs can be triggered cross-site.
  - Server-side request forgery (SSRF) from any service that fetches user-supplied URLs and hits the backend.
  - Command injection through automation tools, CI/CD webhooks, or monitoring scripts that call the backend.
- **Potential Exploit Path:**
  1. A malicious page sends: `<form method="POST" action="http://localhost:3001/api/work-items/{known-id}/dispatch" enctype="application/x-www-form-urlencoded"><input name="team" value="TheATeam"/></form>`
  2. If the server parses the body as URL-encoded (Express's `express.json()` only handles JSON), the request body would not be parsed, so the team field would be missing.
  3. However, the dispatch handler: `const team = body?.team || assignTeam(item);` — with `body.team = undefined`, it falls back to `assignTeam(item)`, which auto-assigns based on item type. The dispatch still succeeds!
- **Red Team Handoff Notes:**  
  Try `POST /api/work-items/:id/dispatch` with `Content-Type: application/x-www-form-urlencoded` and no team field. Verify the item gets dispatched using the auto-assigned team. This tests whether form-based CSRF could trigger a dispatch without specifying the JSON body.

---

### PEN-010: Integer Overflow / Negative Limit in Pagination
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68–74, `Source/Backend/src/routes/dashboard.ts` lines 17–18
- **Vulnerability Description:**  
  Pagination parameters are parsed with `parseInt()` but not clamped to valid ranges. Edge cases:
  - `limit=-1`: `parseInt("-1") = -1`. In the store: `-1 || 20 = -1` (truthy, so -1 is used). `result.slice(0, -1)` returns all items except the last — unintended data exposure.
  - `page=0`: `parseInt("0") = 0`. `0 || 1 = 1` (falsy fallback) — handled correctly.
  - `limit=NaN` (via `?limit=abc`): `NaN || 20 = 20` — handled correctly via falsy fallback.
  - `page=9999999`: `offset = (9999999 - 1) * 20 = 199999980`. `result.slice(199999980, ...)` returns empty array — not harmful but confirms lack of validation.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=-1` → `result.slice(0, -1)` → returns all items except last.
  2. `GET /api/work-items?limit=2147483647` → effectively all items.
  3. `GET /api/dashboard/activity?limit=-1` → same issue on activity endpoint.
- **Red Team Handoff Notes:**  
  Test: `?limit=-1`, `?limit=0`, `?limit=abc`, `?limit=2147483647`. Document actual response lengths for each. Confirm `?limit=-1` returns `total - 1` items.

---

### PEN-011: Internal Error Messages Leaked to Clients
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 59–62, 87–90, 137–140, 203–206, 291–294, 349–351; `Source/Backend/src/routes/workItems.ts` lines 123–128
- **Vulnerability Description:**  
  All `catch` blocks in the workflow router extract the raw `Error.message` and return it directly to the HTTP client in the response body:
  ```typescript
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
  ```
  Error messages from deep services (dependency.ts, assessment.ts, router.ts) including internal IDs, internal state descriptions, and implementation details are exposed. The dependency endpoint maps specific message substrings to HTTP status codes, which means partial error messages could be misclassified if the message structure changes.
- **Potential Exploit Path:**
  1. Trigger an error condition (e.g., add a dependency that creates a cycle, add a dependency to a non-existent item).
  2. Read the `error` field in the 4xx/5xx response to gather internal implementation details.
  3. Use revealed item IDs and internal state from error messages to guide further attacks.
- **Red Team Handoff Notes:**  
  Test: `POST /api/work-items/nonexistent-uuid/route` — expect a 404 with the internal message format. `POST /api/work-items/:id/dependencies` with `{"action":"add","blockerId":"fake-uuid"}` — expect the exact error string from dependency.ts. Catalog all unique error message formats exposed.

---

### PEN-012: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — no rate-limiting middleware present
- **Vulnerability Description:**  
  No rate limiting middleware (e.g., `express-rate-limit`) is configured on any endpoint. Every endpoint accepts unlimited requests per second per IP. This enables:
  - DoS via high-frequency POST to intake endpoints (creates thousands of items, exhausts Node.js heap)
  - Brute-force enumeration of item UUIDs via GET `/:id`
  - Rapid-fire state transition attempts on the same item
- **Potential Exploit Path:**
  1. Attacker sends 10,000 concurrent `POST /api/intake/automated` requests with minimal valid bodies.
  2. Each creates a new in-memory WorkItem object, consuming heap until the Node.js process OOMs.
  3. Alternative: Rapid GET `/:id` with sequential/random UUIDs to enumerate the in-memory store.
- **Red Team Handoff Notes:**  
  Test: `ab -n 1000 -c 50 -T "application/json" -p body.json http://localhost:3001/api/intake/automated`. Monitor the process memory via `/metrics` (process_resident_memory_bytes). Document when response times degrade or process becomes unstable.

---

### PEN-013: Sequential Predictable DocIDs Enable Item Count Enumeration
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts` lines 1–26
- **Vulnerability Description:**  
  Work item document IDs (`docId`) are sequential integers formatted as `WI-001`, `WI-002`, etc. via a module-level counter. While the API uses UUID-based `id` for lookups, the predictable `docId` is:
  - Returned in all API responses and change history entries
  - Referenced in log entries and dependency link audit trails
  - Visible in dashboard activity feeds
  
  By observing the highest `docId` in any response, an attacker can determine the total number of work items ever created (including soft-deleted ones, since the counter is never reset for deletions).
- **Potential Exploit Path:**
  1. `GET /api/dashboard/summary` → no docIds exposed here.
  2. `GET /api/work-items` → highest `docId` in response = total items created (including deleted).
  3. The gap between `docId` sequence and `total` in pagination response reveals how many items have been soft-deleted.
- **Red Team Handoff Notes:**  
  Create one item, soft-delete it, create another. GET list should show 1 item but `docId = "WI-002"` — confirms the counter is not reset on delete. Document information leakage: `WI-002` with `total: 1` reveals one deleted item.

---

### PEN-014: NeedsClarification Verdict Silently Maps to Rejected Status
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts` lines 162–170
- **Vulnerability Description:**  
  The `AssessmentVerdict` enum has three values: `Approve`, `Reject`, `NeedsClarification`. The `assessWorkItem()` function maps these to target statuses, but `NeedsClarification` is treated identically to `Reject`:
  ```typescript
  let targetStatus: WorkItemStatus;
  if (podLeadAssessment.verdict === AssessmentVerdict.Approve) {
    targetStatus = WorkItemStatus.Approved;
  } else {
    targetStatus = WorkItemStatus.Rejected;  // Both Reject AND NeedsClarification → Rejected
  }
  ```
  A `NeedsClarification` verdict from the domain expert (triggered when complexity is unset) silently transitions the item to `Rejected` rather than a distinct clarification state, causing items with incomplete but not invalid requirements to be rejected outright.
- **Potential Exploit Path:**
  1. Create an item with no `complexity` field set.
  2. Route it to `proposed` (normal route).
  3. Call `POST /:id/assess`.
  4. Domain expert issues `NeedsClarification` (due to missing complexity).
  5. Pod-lead aggregates → `NeedsClarification` → item moves to `rejected` status.
  6. Item is permanently rejected despite only needing additional information, not having failed requirements.
  7. Attacker could deliberately omit `complexity` to cause legitimate items to be auto-rejected.
- **Red Team Handoff Notes:**  
  Create an item without complexity, route normally, then assess. Confirm `status === "rejected"` and `assessments[*].verdict === "needs-clarification"` — the mismatch between verdict and status is the finding. This also tests the objective: "Submit a malformed assessment verdict that bypasses routing logic."

---

### PEN-015: Unauthenticated Full Dashboard Data Disclosure
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts` lines 9–31
- **Vulnerability Description:**  
  All three dashboard endpoints (`/api/dashboard/summary`, `/api/dashboard/activity`, `/api/dashboard/queue`) are unauthenticated and return aggregate business intelligence. `getActivity()` returns the full `changeHistory` of all items, including: field names, old values, new values, agent IDs, reasons, and timestamps. `getQueue()` returns full `WorkItem` objects for every status group including `assessments` and `changeHistory` arrays.
- **Potential Exploit Path:**
  1. `GET /api/dashboard/queue` → returns every non-deleted work item grouped by status, including complete assessment records with verdict rationale.
  2. `GET /api/dashboard/activity?limit=999999` → returns the entire change history of every item ever created.
  3. No credentials required.
- **Red Team Handoff Notes:**  
  `curl http://localhost:3001/api/dashboard/queue | jq '.data[].items[].assessments'` — confirm full assessment content is exposed. `curl http://localhost:3001/api/dashboard/activity?limit=999999` — confirm unbounded activity history is returned.

---

## End-to-End Attack Chains for Red Team

### Chain A: Full Workflow Governance Bypass (Objectives 1 & 3)
```
1. POST /api/work-items              → create item (body: valid title/desc/type/priority/source)
2. POST /api/work-items/:id/route    → {"overrideRoute": "fast-track"}  → status: approved
3. POST /api/work-items/:id/dispatch → {"team": "TheATeam"}             → status: in-progress
```
Assessment pod never triggered. No auth required at any step.

### Chain B: Manual Approve + Dispatch (Objective 1)
```
1. POST /api/work-items              → create item
2. POST /api/work-items/:id/route    → {} (no override) → status: proposed
3. POST /api/work-items/:id/approve  → {} (no reason)   → status: approved
4. POST /api/work-items/:id/dispatch → {"team": "TheFixer"} → status: in-progress
```

### Chain C: Soft-Deleted Item — Direct ID Reference (Objective 2)
```
1. POST /api/work-items              → create item, note UUID
2. DELETE /api/work-items/:id        → soft-delete
3. GET /api/work-items/:id           → 404 (findById filters deleted)
4. POST /api/work-items/:id/route    → 404 (findById filters deleted)
   HYPOTHESIS: deleted items cannot be referenced via normal API
   VERIFY: dependency blocker references — addDependency() uses findById() for both sides
            → deleted blocker throws "not found", cannot be added
            BUT: if blocker is deleted AFTER dependency is added, computeHasUnresolvedBlockers()
                 uses findById() → blocker returns undefined → treated as unresolved blocker!
   EXPLOIT: 
     a. Create A and B, add A as blocker of B
     b. Delete A
     c. computeHasUnresolvedBlockers(B) → blocker not found → returns true (unresolved!)
     d. B is permanently blocked (cannot dispatch) by a deleted blocker it cannot remove
```

### Chain D: Cascade-Dispatch Abuse (Objective 3)
```
1. POST /api/work-items              → create blocker A
2. POST /api/work-items              → create blocked B
3. POST /api/work-items/B/dependencies → {"action":"add","blockerId":"A"}
4. POST /api/work-items/B/route      → fast-track (status: approved)
5. POST /api/work-items/A/route      → any route
   [A needs to reach a state that can be rejected]
6. POST /api/work-items/A/approve    → manual approve
7. POST /api/work-items/A/dispatch   → dispatch A
8. POST /api/work-items/A/[complete or reject] ???
   NOTE: InProgress → Completed requires a transition not exposed in routes
         Check if there's a direct status update path
         ACTUALLY: no /complete endpoint exists. Status InProgress→Completed is not directly exploitable
         But InProgress→Failed might be triggerable if a direct PATCH on status is possible.
         PATCH only allows: title, description, type, priority, complexity, blockedBy
         → status cannot be patched directly. Cascade requires legitimate completion.
```

---

## Soft-Deleted Item Permanent Block Bug (Unlisted Objective)

**Finding from Chain C Step 4:**
When a blocker item is soft-deleted **after** a dependency link has been established, `computeHasUnresolvedBlockers()` in `dependency.ts` lines 64–75 calls `store.findById(link.blockerItemId)`, which returns `undefined` for soft-deleted items. The code treats `undefined` (not found) as an **unresolved** blocker:
```typescript
for (const link of (item.blockedBy ?? [])) {
  const blocker = store.findById(link.blockerItemId);
  if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
    return true;  // ← deleted blocker = treated as unresolved!
  }
}
```
Result: The blocked item is **permanently unable to dispatch** because its blocker has been soft-deleted and `removeDependency()` requires both items to exist (via `findById`). The blocked item is also stuck because `POST /:id/dependencies` remove action also requires `findById(blockerId)` to... wait, actually looking at `removeDependency()`:

```typescript
export function removeDependency(blockedId: string, blockerId: string): void {
  const blocked = store.findById(blockedId);
  if (!blocked) throw new Error(`Work item ${blockedId} not found`);

  const blocker = store.findById(blockerId);
  // blocker may be soft-deleted; still clean up the reverse index
  // For simplicity: we only require blockedId to exist
```

`removeDependency` only requires `blockedId` to exist, not `blockerId`. So removing the dependency link is possible. But the route handler at `workflow.ts` line 324 calls `removeDependency()` which would succeed. The permanent-block condition is specifically the dispatch gate checking `computeHasUnresolvedBlockers`. This is exploitable by: (1) add dependency, (2) delete the blocker, (3) observe that dispatch fails even though the blocker is gone.

---

## Scope Notes

- **No SQLi / NoSQLi:** The backend uses an in-memory JavaScript `Map` with no database queries. Injection vectors require a database. [SEE SAST findings for any query-building patterns if a DB is added later]
- **No XSS vectors identified:** No server-side HTML rendering; the backend is pure JSON API. XSS risk lives in the React frontend (outside scope for backend pen-test).
- **No command injection identified:** No shell calls in any backend path.
- **No unsafe deserialization:** Standard `express.json()` middleware; no `eval()`, `new Function()`, or `JSON.parse()` on untrusted data in a dangerous context.

---

*This document is the handoff artifact for the red-teamer. All findings are theoretical and require dynamic verification against a running ephemeral environment.*
