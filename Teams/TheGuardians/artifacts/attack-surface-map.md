# Attack Surface Map
**Agent:** pen_tester  
**Target:** dev-crew Source App — Backend API (`http://localhost:3001`)  
**Analysis type:** White-box static analysis  
**Date:** 2026-06-15  
**Scope:** `Source/Backend/`, `Source/Shared/types/workflow.ts`  
**OWASP Focus:** A01 (Broken Access Control), A02 (Cryptographic Failures), A03 (Injection), A07 (Auth Failures), A08 (Data Integrity)

---

## Critical Entry Points Covered

| Endpoint | File | Analyzed |
|---|---|---|
| `POST /api/work-items` | `routes/workItems.ts:21` | ✅ |
| `GET /api/work-items` | `routes/workItems.ts:60` | ✅ |
| `GET /api/work-items/:id` | `routes/workItems.ts:78` | ✅ |
| `PATCH /api/work-items/:id` | `routes/workItems.ts:88` | ✅ |
| `DELETE /api/work-items/:id` | `routes/workItems.ts:141` | ✅ |
| `POST /api/work-items/:id/route` | `routes/workflow.ts:39` | ✅ |
| `POST /api/work-items/:id/assess` | `routes/workflow.ts:67` | ✅ |
| `POST /api/work-items/:id/approve` | `routes/workflow.ts:94` | ✅ |
| `POST /api/work-items/:id/reject` | `routes/workflow.ts:145` | ✅ |
| `POST /api/work-items/:id/dispatch` | `routes/workflow.ts:212` | ✅ |
| `POST /api/work-items/:id/dependencies` | `routes/workflow.ts:302` | ✅ |
| `GET /api/work-items/:id/ready` | `routes/workflow.ts:354` | ✅ |
| `GET /api/dashboard/summary` | `routes/dashboard.ts:9` | ✅ |
| `GET /api/dashboard/activity` | `routes/dashboard.ts:16` | ✅ |
| `GET /api/dashboard/queue` | `routes/dashboard.ts:27` | ✅ |
| `POST /api/intake/zendesk` | `routes/intake.ts:11` | ✅ |
| `POST /api/intake/automated` | `routes/intake.ts:33` | ✅ |
| `GET /metrics` | `app.ts:34` | ✅ |

---

## Findings

---

### PEN-001: Complete Absence of Authentication on All Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (all middleware registration, lines 11-44)
- **Vulnerability Description:** `app.ts` registers no authentication middleware whatsoever. There is no JWT validation, API key check, session management, or any identity mechanism. Every endpoint — including destructive actions like approve, reject, dispatch, and delete — is fully accessible to any HTTP client with network access. There is no concept of a caller identity anywhere in the codebase.
- **Potential Exploit Path:**
  1. Attacker sends `POST http://localhost:3001/api/work-items/:id/approve` with no credentials
  2. The request reaches the route handler with no authentication gate
  3. `isValidTransition` check passes (valid state transition)
  4. Work item is approved by the attacker with no audit trail of caller identity
- **Red Team Handoff Notes:**
  - Try every endpoint cold — no headers, no tokens, no cookies. All should respond with data or perform actions.
  - Specifically target: `POST /api/work-items/:id/approve`, `POST /api/work-items/:id/dispatch`, `DELETE /api/work-items/:id`
  - Confirm the approve/reject/dispatch cycle is fully executable end-to-end without credentials.

---

### PEN-002: State Machine Bypass — Unauthenticated Fast-Track to Approved Status
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57` → `Source/Backend/src/services/router.ts:66-76`
- **Vulnerability Description:** The `POST /api/work-items/:id/route` endpoint accepts an `overrideRoute` field in the request body. In `services/router.ts`, `classifyRoute()` checks for `overrideRoute` first — before any heuristic logic — and immediately returns `targetStatus: WorkItemStatus.Approved` when `overrideRoute === "fast-track"`. This entirely bypasses the assessment pod review. There is no authorization check on the override capability; any caller can supply it.
- **Potential Exploit Path:**
  1. Create a work item: `POST /api/work-items` → item in `backlog` status
  2. Send `POST /api/work-items/:id/route` with body `{"overrideRoute": "fast-track"}`
  3. `classifyRoute()` immediately returns `{ route: "fast-track", targetStatus: "approved" }`
  4. Work item status jumps from `backlog` → `approved`, bypassing `routing → proposed → reviewing → approved` pipeline
  5. Item is now dispatchable: `POST /api/work-items/:id/dispatch` completes the bypass
- **Red Team Handoff Notes:**
  - Payload: `POST /api/work-items/:id/route` body: `{"overrideRoute": "fast-track"}`
  - Verify status field in response is `"approved"` (not `"proposed"`)
  - Then dispatch the now-approved item with `POST /api/work-items/:id/dispatch` to confirm full pipeline bypass
  - This directly satisfies the red team objective: "Bypass work item state machine to reach an invalid status"

---

### PEN-003: Access to Soft-Deleted Work Items via Dependency Operations
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/store/workItemStore.ts:23-27` and `Source/Backend/src/services/dependency.ts:107-166`
- **Vulnerability Description:** `findById()` correctly hides soft-deleted items (returns `undefined`). However, dependency `DependencyLink` objects stored on surviving items contain the `blockerItemId` of deleted items. The `GET /api/work-items/:id/ready` endpoint and `computeHasUnresolvedBlockers()` function both call `store.findById(link.blockerItemId)` for each blocker — if the blocker is soft-deleted, `findById` returns `undefined`, and the code treats `!blocker` as "unresolved" (`dependency.ts:69-72`). Additionally, the full `DependencyLink` objects (including the deleted item's ID and docId) are returned in API responses for surviving items.
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (blocked): link them with `POST /api/work-items/B/dependencies {"action":"add","blockerId":"A_id"}`
  2. Approve item B: `POST /api/work-items/B/approve`
  3. Soft-delete item A: `DELETE /api/work-items/A_id` → A marked deleted
  4. Call `GET /api/work-items/B_id` → response includes `blockedBy` array containing A's ID and docId (information disclosure of deleted resource)
  5. Call `GET /api/work-items/B_id/ready` → response is `ready: false` with A's link in `unresolvedBlockers`, permanently gating dispatch
  6. Call `POST /api/work-items/B_id/dispatch` → blocked forever because `computeHasUnresolvedBlockers` returns `true`
- **Red Team Handoff Notes:**
  - Verify that `GET /api/work-items/:id` for a surviving item exposes the deleted item's ID in `blockedBy[]`
  - Verify `GET /api/work-items/:id/ready` returns `ready: false` with deleted item's link visible
  - Verify `POST /api/work-items/:id/dispatch` is permanently blocked (400 with `unresolvedBlockers`) — confirms "Access or modify a soft-deleted work item via direct ID reference" objective
  - The `blockedBy[].blockerItemId` in the response exposes the deleted item's UUID despite the soft-delete

---

### PEN-004: Intake Webhook Endpoints — No Webhook Signature Validation and Unvalidated Enum Injection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11-31` (zendesk) and `Source/Backend/src/routes/intake.ts:33-53` (automated)
- **Vulnerability Description:** Two flaws in the intake routes:
  1. **No webhook authentication:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept any request without validating a shared secret, HMAC signature (`X-Zendesk-Webhook-Signature`), or IP allowlist. Any party can inject work items claiming to be Zendesk or an automated system.
  2. **Unvalidated enum passthrough:** Unlike the main `POST /api/work-items` route which validates `type` and `priority` against `WorkItemType` and `WorkItemPriority` enums, the intake routes do not validate these fields: `type: body.type || WorkItemType.Bug` passes `body.type` directly to `createWorkItem` if truthy. An attacker can inject a work item with `type: "arbitrary-string"` or `type: null` (forcing default) or `priority: "super-critical"` — creating items with invalid/unexpected enum values that pollute the store and break type-dependent logic (routing heuristics, assessment rules, team assignment).
- **Potential Exploit Path:**
  1. Send `POST /api/intake/zendesk` with no authentication headers: `{"title":"Injected","description":"Malicious","type":"invalid-type","priority":"super-critical"}`
  2. Request succeeds with 201 — item created with `type="invalid-type"`, `source="zendesk"`
  3. Item persists in store with invalid type; assessment logic switch-case misses it (falls to no-op); routing heuristics produce wrong classification
  4. `POST /api/intake/automated` is equally unprotected — can be used to mass-inject items with `source: "automated"` to disguise attacker origin
- **Red Team Handoff Notes:**
  - No authentication headers required — test raw POST to both endpoints
  - Try `{"title":"t","description":"d","type":"INJECTED","priority":"INJECTED"}` — verify 201 Created with injected values
  - Try flooding with 50+ requests back-to-back to test rate limiting (none expected)
  - Verify the injected items appear in `GET /api/work-items` responses, polluting the dashboard

---

### PEN-005: Unlimited Pagination `limit` Parameter — Full Dataset Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68-70` and `Source/Backend/src/store/workItemStore.ts:30-63`
- **Vulnerability Description:** The `GET /api/work-items` route parses `req.query.limit` using `parseInt()` with no maximum cap applied before or after parsing. `findAll()` in the store uses the raw `limit` value in `result.slice(offset, offset + limit)`. An attacker can pass `limit=999999999` to retrieve the entire in-memory dataset in a single response — bypassing the intended default pagination of 20 items per page. Similarly, `GET /api/dashboard/activity` has the same flaw (`dashboard.ts:17`).
- **Potential Exploit Path:**
  1. Send `GET /api/work-items?limit=999999999`
  2. The store returns `result.slice(0, 999999999)` — effectively all items
  3. Response includes full dataset: all IDs, docIds, titles, descriptions, history, dependencies
  4. This satisfies the objective: "Enumerate all work items without pagination limit enforcement"
- **Red Team Handoff Notes:**
  - Request: `GET http://localhost:3001/api/work-items?limit=9999999`
  - Verify response `total` count matches number of items in `data[]` array
  - Also test `GET /api/dashboard/activity?limit=9999999` — same flaw
  - Test `limit=0` to observe `totalPages: Infinity` in the JSON response (serialization bug — null in JSON)
  - Test `limit=-1` and `page=-1` to confirm unexpected slice behavior

---

### PEN-006: Internal Error Messages Leaked to API Clients
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:59-63, 87-90, 137-141, 202-207, 290-294, 369-373`
- **Vulnerability Description:** Every `try/catch` block in `workflow.ts` route handlers does: `const message = err instanceof Error ? err.message : 'Internal server error'; res.status(500).json({ error: message })`. This directly exposes raw `Error.message` strings from internal services to API callers. For example, `assessWorkItem` throws `"Failed to update work item ${itemId}"` and `"Work item ${itemId} not found"` — these propagate verbatim to the 500 response body. The central `errorHandler` middleware correctly suppresses stack traces, but per-route catches bypass it and leak implementation detail.
- **Potential Exploit Path:**
  1. Trigger an unexpected error condition (e.g., manipulate internal state, provide boundary-condition input)
  2. The 500 response body contains `{"error": "Work item <internal-uuid> not found"}` — confirming item existence and internal ID format
  3. Error messages from `dependency.ts` (`"Work item X not found"`) confirm whether a given ID exists even for items the caller doesn't otherwise have access to — an oracle for existence checking
- **Red Team Handoff Notes:**
  - Test `POST /api/work-items/nonexistent-id/route` — observe whether error body reveals internal message vs generic "Internal server error"
  - Try to reach the `assessWorkItem` "Failed to update work item" path by concurrent requests
  - Test dependency endpoint with a known-deleted item ID as `blockerId` to confirm error message exposes deleted ID

---

### PEN-007: Assessment Pod Can Be Called on `reviewing` Status — Re-assessment Vector
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:77-79` and `Source/Backend/src/services/assessment.ts:183-185`
- **Vulnerability Description:** The `POST /api/work-items/:id/assess` endpoint allows calling assessment on items in either `proposed` OR `reviewing` status. The `assessWorkItem` service also permits both. While `reviewing` is intended to be a transient internal state (never directly observable in the store because the router service transitions through it atomically), any item that legitimately starts in `reviewing` state can be re-assessed. More importantly, this allows a race condition: if two concurrent `POST /api/work-items/:id/assess` requests are received for a `proposed` item simultaneously, both fetch the same item (still `proposed`), both run the assessment pod independently, and both call `store.updateWorkItem()`. The last write wins, but both append to `item.changeHistory` (a shared mutable reference since `store.findById` returns the object by reference from the Map). The resulting item accumulates duplicate history entries from two overlapping assessment runs.
- **Potential Exploit Path:**
  1. Create and route a work item to `proposed` status
  2. Fire two concurrent `POST /api/work-items/:id/assess` requests within ~1ms
  3. Both requests get the item in `proposed` state from the store
  4. Both mutate `item.changeHistory` in memory (shared Map reference)
  5. Both call `store.updateWorkItem` — second write overwrites first, but history has double entries
  6. Resulting item has corrupt change history and duplicate assessment records
- **Red Team Handoff Notes:**
  - Use `curl` or `ab` to fire two assess requests simultaneously against the same item ID
  - Inspect `changeHistory` and `assessments` arrays in the response for duplicates
  - Alternatively: place an item in `reviewing` status (if achievable) and call `/assess` again — verify it runs assessment a second time

---

### PEN-008: Route Override Accepts Arbitrary `WorkItemRoute` Value — Malformed Assessment Verdict Bypass
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57` → `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:** The `overrideRoute` parameter in `POST /api/work-items/:id/route` is typed as `WorkItemRoute` in `RouteWorkItemRequest`, but TypeScript types are erased at runtime. No runtime validation is performed in the route handler (`body?.overrideRoute` is passed directly). If an attacker sends `overrideRoute: "full-review"`, the item transitions to `proposed` status. If they send an unrecognized value (e.g., `overrideRoute: "skip-all"`), the truthy `if (overrideRoute)` branch is entered in `classifyRoute()`, but `overrideRoute === WorkItemRoute.FastTrack` evaluates false — so `targetStatus` becomes `WorkItemStatus.Proposed`. However, `route` is set to the attacker-supplied string (`"skip-all"`), persisting an invalid `route` enum value in the store.
- **Potential Exploit Path:**
  1. `POST /api/work-items/:id/route` with body `{"overrideRoute": "invalid-route-value"}`
  2. `classifyRoute` receives truthy `overrideRoute`, enters the override branch
  3. Item's `route` field is set to `"invalid-route-value"` — stored in the in-memory Map
  4. `GET /api/work-items/:id` returns item with `route: "invalid-route-value"` — invalid enum value in API response
  5. Downstream logic that switch-cases on `route` may behave unexpectedly
- **Red Team Handoff Notes:**
  - Send: `POST /api/work-items/:id/route` with `{"overrideRoute": "MALFORMED"}`
  - Check the response's `route` field — verify it contains the injected string
  - Confirm `GET /api/work-items/:id` persists the invalid value
  - This satisfies: "Submit a malformed assessment verdict that bypasses routing logic"

---

### PEN-009: Metrics Endpoint Unauthenticated — Operational Intelligence Exposure
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`
- **Vulnerability Description:** `GET /metrics` exposes a Prometheus-format metrics dump with no authentication. The metrics reveal: `items_created_total` (by source and type), `items_assessed_total` (by verdict), `items_routed_total` (by route), `items_dispatched_total` (by team), `dependency_operations_total` (by action), `cycle_detection_events_total`. An attacker can baseline system activity, infer traffic patterns, determine which features are used, and detect when new work items are being processed — all without any credentials.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics`
  2. Response includes counter labels revealing: volume by work item type/source, assessment verdict distribution, team dispatch counts
  3. Cross-reference with `GET /api/dashboard/queue` (also unauthenticated) to correlate business state
- **Red Team Handoff Notes:**
  - Verify `GET /metrics` returns Prometheus-format data with no auth headers
  - Record baseline counts, perform some operations, re-fetch metrics to confirm counters increment

---

### PEN-010: No CORS Policy Configured — Cross-Origin Request Accepted from Any Origin
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no CORS middleware registered)
- **Vulnerability Description:** `app.ts` does not configure any CORS middleware. Express allows requests from all origins by default (for server-to-server), and browser CORS preflight requests will not be rejected. This means any web page can make cross-origin requests to the API. Combined with the complete lack of authentication, this creates a full CSRF attack surface — if a browser-side session mechanism is added in the future, existing cross-origin permissiveness means all endpoints are pre-exposed. Additionally, for the current unauthenticated API, any malicious web page can instruct a victim's browser to call `DELETE /api/work-items/:id` or `POST /api/work-items/:id/approve`.
- **Potential Exploit Path:**
  1. Attacker hosts a page at `http://evil.example.com`
  2. Page runs `fetch("http://localhost:3001/api/work-items/ID/approve", {method:"POST",body:"{}"})`
  3. Since no CORS policy is set, the browser sends the request and receives the response
  4. Attacker's page receives the full approved work item response (no credentials needed)
- **Red Team Handoff Notes:**
  - Send request with `Origin: http://evil.example.com` header; verify `Access-Control-Allow-Origin` is absent or wildcard in response
  - Attempt preflight `OPTIONS /api/work-items` with `Access-Control-Request-Method: DELETE`

---

### PEN-011: Dashboard and Queue Endpoints Expose Full Operational Dataset Without Authentication
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts:9-31` and `Source/Backend/src/services/dashboard.ts`
- **Vulnerability Description:** `GET /api/dashboard/queue` returns ALL work items grouped by status via `getQueue()` — which calls `getAllItems()` and returns each item's full struct (including `changeHistory`, `assessments`, `blockedBy`, `blocks`). This is not paginated. `GET /api/dashboard/activity` aggregates all change history entries across all items and returns them. Neither endpoint requires any authentication. This represents full information disclosure of the entire work item dataset.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/api/dashboard/queue` → response contains all items with full data
  2. `GET http://localhost:3001/api/dashboard/activity` → returns all change history across all items
  3. From change history, attacker can reconstruct the full lifecycle of every work item, including assessment notes and agent identifiers
- **Red Team Handoff Notes:**
  - Verify `GET /api/dashboard/queue` returns all items (compare count vs `GET /api/work-items?limit=9999`)
  - Confirm `assessments[].notes` and `changeHistory[].reason` fields contain sensitive internal notes

---

### PEN-012: Dependency `blockedBy` Array Has No Size Limit — DoS via Quadratic Cycle Detection
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:120-129` → `Source/Backend/src/services/dependency.ts:220-238`
- **Vulnerability Description:** `PATCH /api/work-items/:id` accepts `blockedBy: string[]` with no maximum size validation. `setDependencies()` first removes all existing blockers (O(n) removals) then calls `addDependency()` for each new blocker. Each `addDependency` call runs a BFS cycle detection (`detectCycle`) over the entire dependency graph. With a large and deep dependency graph, `setDependencies` with a large `blockerIds` array causes polynomial-time CPU work on the server. Additionally, `setDependencies` is not atomic: if cycle detection fails midway through the new blocker list, some dependencies are already added and some are not, leaving the item in a partially updated state.
- **Potential Exploit Path:**
  1. Create 100 work items
  2. Build a chain: item 1 blocks 2, 2 blocks 3, ... 99 blocks 100
  3. Send `PATCH /api/work-items/100/` with `{"blockedBy": ["id1","id2",...,"id99"]}` repeatedly
  4. Each `setDependencies` call triggers 99 `addDependency` calls, each with a BFS over the 100-node graph
  5. Server CPU spikes; response times degrade significantly
- **Red Team Handoff Notes:**
  - Create 20 items, build a long chain, then PATCH the last item with all IDs in `blockedBy`
  - Monitor response time vs a baseline simple request
  - Try a `blockedBy` array with 1000 random/nonexistent IDs to observe error handling and response time

---

### PEN-013: Reject Action Cascade Auto-Dispatch — Unauthenticated Trigger of Dispatch Pipeline
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:193-207` → `Source/Backend/src/services/dependency.ts:251-315`
- **Vulnerability Description:** When `POST /api/work-items/:id/reject` is called, the handler calls `onItemResolved(id)` after the rejection. `onItemResolved()` iterates over all items this item blocks, and for any dependent in `Approved` status with no remaining unresolved blockers, automatically dispatches it (sets status to `in-progress`, assigns a team). This cascade dispatch is triggered by the unauthenticated reject endpoint — meaning an attacker who can reject any item (which requires no auth) can also trigger automatic dispatch of approved dependents without ever calling the dispatch endpoint directly, bypassing any manual dispatch review.
- **Potential Exploit Path:**
  1. Scenario: Item B (approved, blocked by A) is waiting for A to resolve before dispatch
  2. Attacker calls `POST /api/work-items/A_id/reject` with `{"reason":"injected"}`
  3. Handler rejects A, then calls `onItemResolved(A_id)`
  4. `onItemResolved` finds B (approved, now unblocked), auto-dispatches it to a team
  5. B is now `in-progress` — dispatched without any human or authorized actor ever calling `/dispatch`
- **Red Team Handoff Notes:**
  - Set up: item A (blocker, in any pre-resolved status reachable via route/approve), item B (approved, blocked by A)
  - Call `POST /api/work-items/A_id/reject` → verify B's status changes to `in-progress` automatically
  - This is a privilege escalation: reject + cascade = unauthorized dispatch

---

### PEN-014: Invalid `page` and `limit` Values Cause Undefined Behavior — NaN Injection
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:69-70` and `Source/Backend/src/routes/dashboard.ts:17-18`
- **Vulnerability Description:** `parseInt('abc', 10)` returns `NaN`. When `limit=NaN` is computed: `result.slice(offset, offset + NaN)` → `result.slice(offset, NaN)`. `Array.prototype.slice` treats NaN as 0, so `result.slice(offset, 0)` returns `[]` for any `offset >= 0`. When `page=NaN`: `offset = (NaN - 1) * limit = NaN * limit = NaN`, and `result.slice(NaN, NaN + limit)` → `result.slice(0, limit)` (page 1 data). The `totalPages` calculation: `Math.ceil(total / NaN) = NaN`, `Math.max(1, NaN) = 1`. The response is structurally incorrect but does not crash the server. `limit=0`: `totalPages = Math.max(1, Math.ceil(total / 0)) = Math.max(1, Infinity) = Infinity`, serialized as `null` in JSON response.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=abc` → response `data: []`, `totalPages: 1` — misleadingly shows no data
  2. `GET /api/work-items?limit=0` → response `totalPages: null` — invalid JSON payload for clients expecting a number
  3. `GET /api/work-items?page=0` → `offset = (0-1) * 20 = -20`, `result.slice(-20, 0)` returns `[]` — page 0 shows no items silently
- **Red Team Handoff Notes:**
  - Test: `?limit=abc`, `?limit=0`, `?page=0`, `?page=-1`, `?limit=NaN`, `?limit=Infinity`
  - Verify `totalPages` value in response for `limit=0` (expect `null` in JSON)
  - Confirm no server crash (500) on any of these inputs

---

### PEN-015: Sequential and Predictable `docId` Enables Work Item Enumeration
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts:12-15`
- **Vulnerability Description:** `generateDocId()` produces sequential document IDs (`WI-001`, `WI-002`, etc.) using a module-level counter. These docIds are exposed in all API responses and in error messages (e.g., logger output). While the primary `id` field is a UUID v4 (unpredictable), the `docId` field is sequential and predictable. By observing `WI-047` in one response, an attacker knows there are 46 other items. In combination with `GET /api/work-items?limit=999999` (PEN-005), this allows complete enumeration.
- **Potential Exploit Path:**
  1. Create one item, observe `docId: "WI-042"` in response
  2. Infer 41 other items exist
  3. Use `GET /api/work-items?limit=9999` to retrieve all of them
- **Red Team Handoff Notes:**
  - Create an item, note the `docId` value
  - Confirm the counter is strictly sequential and server-global (not per-session)

---

## Data Flow Summary

```
External Input → Route Handler → Validation (partial) → Service Layer → In-Memory Store
                 ↑                                        ↑
                 No auth gate anywhere                    No row-level access control
```

**Key Unsanitized Data Flows:**
- `body.type` / `body.priority` in intake routes → `createWorkItem()` with no enum validation
- `body.overrideRoute` in route endpoint → `classifyRoute()` with no runtime type check
- `req.query.limit` / `req.query.page` → `parseInt()` → `result.slice()` with no bounds or NaN guard
- Error messages from service layer → `res.status(500).json({ error: message })` in workflow routes

---

## Red Team Objectives Cross-Reference

| Objective | Finding(s) | Attack Vector |
|---|---|---|
| Bypass work item state machine to reach invalid status | PEN-002, PEN-008 | `POST /:id/route {"overrideRoute":"fast-track"}` |
| Access or modify a soft-deleted work item via direct ID reference | PEN-003 | Delete blocker; dependent's `blockedBy[]` still exposes deleted ID |
| Submit a malformed assessment verdict that bypasses routing logic | PEN-008 | `POST /:id/route {"overrideRoute":"MALFORMED"}` |
| Enumerate all work items without pagination limit enforcement | PEN-005 | `GET /api/work-items?limit=9999999` |

---

## Out of Scope (SAST Domain — Not Re-reported Here)

- Hardcoded secrets / credentials → [SEE SAST findings]
- Missing security headers (Helmet, CSP, HSTS) → [SEE SAST findings]
- Dependency vulnerability (npm audit) → [SEE SAST findings]

---

*Generated by pen_tester agent — TheGuardians security pipeline*
