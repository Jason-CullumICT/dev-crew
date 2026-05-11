# Attack Surface Map — dev-crew Source App

**Produced by:** `pen_tester`
**Date:** 2026-05-11
**Scope:** White-box static analysis of `Source/Backend/` and `Source/Frontend/`
**Handoff target:** `red-teamer`
**Backend:** Express + TypeScript, in-memory Map store, no database
**Auth stack:** None (zero authentication/authorization implemented)

---

## Executive Summary

The application has **no authentication or authorization on any endpoint**. Every route — including state-changing workflow operations (approve, reject, dispatch) and intake webhooks — is fully public. This is the root cause of the highest-severity findings; most other flaws are exploitable specifically _because_ there is no auth gate.

Five attack objectives from `security.config.yml` are achievable:
- ✅ Bypass work item state machine to reach an invalid status — via PEN-003
- ✅ Access soft-deleted work item via direct ID reference — via PEN-009
- ✅ Submit a malformed assessment verdict that bypasses routing logic — via PEN-003 / PEN-006
- ✅ Enumerate all work items without pagination limit enforcement — via PEN-004
- ✅ Force unauthorized cascade dispatch — via PEN-007

---

## Critical Findings

---

### PEN-001: Complete Absence of Authentication on All Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:11-54` — no auth middleware registered
- **Vulnerability Description:** `app.use(express.json())` is the only middleware applied globally. There is no JWT validation, session check, API key guard, or any other authentication mechanism on any route — including state-mutating workflow endpoints (approve, reject, dispatch) and intake webhooks.
- **Potential Exploit Path:**
  1. Send any HTTP request to `http://localhost:3001/api/work-items` or any other endpoint — no `Authorization` header needed.
  2. The request is processed immediately with full privileges.
  3. Read all data, create items, approve/reject/dispatch — no credential required.
- **Red Team Handoff Notes:**
  - Confirm with: `curl http://localhost:3001/api/work-items` — expect 200 with data.
  - Confirm write access: `curl -X POST http://localhost:3001/api/work-items -H "Content-Type: application/json" -d '{"title":"pen-test","description":"test item","type":"bug","priority":"high","source":"manual"}'` — expect 201.
  - This finding unlocks all other findings — execute them all as an unauthenticated caller.

---

### PEN-002: Complete Absence of Authorization / RBAC on Privileged Operations
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:94-209` (approve, reject, dispatch endpoints) — no role check at any point
- **Vulnerability Description:** No RBAC or ABAC layer exists. The approve endpoint (`POST /:id/approve`), reject endpoint (`POST /:id/reject`), and dispatch endpoint (`POST /:id/dispatch`) perform no caller identity check. Any anonymous HTTP client can approve or dispatch arbitrary work items.
- **Potential Exploit Path:**
  1. Obtain any work item ID (trivially, via `GET /api/work-items`).
  2. Route the item: `POST /api/work-items/{id}/route`.
  3. Approve it without assessment: `POST /api/work-items/{id}/approve` (no `reason` required).
  4. Dispatch it to any team: `POST /api/work-items/{id}/dispatch` with `{"team":"TheATeam"}`.
  5. Item is now `in-progress` — full workflow bypassed without any credentials.
- **Red Team Handoff Notes:**
  - Execute the full 4-step chain above. Capture `status` field in each response to prove state traversal.
  - Also try calling `/approve` on an already-approved item to confirm the transition check is the only guard.

---

### PEN-003: Unrestricted `overrideRoute` Parameter Bypasses Entire Assessment Pipeline
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57` → `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:** `POST /api/work-items/:id/route` passes `body.overrideRoute` directly to `classifyRoute()`. When `overrideRoute === "fast-track"`, `classifyRoute` returns `targetStatus = WorkItemStatus.Approved` unconditionally — skipping the assessment pod entirely. There is no privilege check on this override; any caller may use it.
  ```typescript
  // router.ts:66-88
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus:
        overrideRoute === WorkItemRoute.FastTrack
          ? WorkItemStatus.Approved   // <-- direct Approved, no assessment
          : WorkItemStatus.Proposed,
    };
  }
  ```
- **Potential Exploit Path:**
  1. `POST /api/work-items` — create any item (title, description, type, priority, source).
  2. `POST /api/work-items/{id}/route` with body `{"overrideRoute": "fast-track"}` — item status becomes `approved`.
  3. `POST /api/work-items/{id}/dispatch` with `{"team":"TheATeam"}` — item dispatched as `in-progress`.
  4. Full backlog→in-progress transition in 3 unauthenticated requests; assessment pod never consulted.
- **Red Team Handoff Notes:**
  - Payload for step 2: `{"overrideRoute": "fast-track"}`
  - Confirm response `status === "approved"` and `route === "fast-track"`.
  - Also test `overrideRoute: "full-review"` to confirm it forces `proposed` status.
  - Combine with PEN-007 to trigger cascade dispatch.

---

## High Findings

---

### PEN-004: No Pagination Upper Bound — Full Dataset Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68-74`
- **Vulnerability Description:** The `limit` query parameter is parsed with `parseInt` and passed directly to `store.findAll()` without any cap. `findAll()` slices the result array with the arbitrary limit. An attacker can retrieve the entire dataset in a single request.
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20, // no upper bound
  };
  const result = store.findAll(filters, pagination);
  ```
  The `getActivity` endpoint in `dashboard.ts:32` has the same flaw for limit on change history.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999` — returns all work items in one request.
  2. `GET /api/dashboard/activity?limit=999999` — returns full change history for all items.
  3. Both responses include all field values including `id`, `docId`, `title`, `description`, `changeHistory`, and `assessments`.
- **Red Team Handoff Notes:**
  - Use `limit=999999` and verify `total` in the response matches the full count returned in `data`.
  - Also try `limit=0` and `limit=-1` to test edge-case handling.
  - Try `page=0` and `page=-1` for boundary testing on the offset calculation (`offset = (page-1)*limit`).
  - A negative `page` produces a negative offset; `slice(-offset, -offset + limit)` may behave unexpectedly.

---

### PEN-005: Intake Webhooks Accept Arbitrary POSTs with No Signature Validation
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Vulnerability Description:** `POST /api/intake/zendesk` and `POST /api/intake/automated` create work items with forced `source` values (`WorkItemSource.Zendesk` / `WorkItemSource.Automated`). There is no HMAC signature check, no shared secret validation, and no IP allowlist. Any caller can impersonate Zendesk or a trusted automated system.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title":"Fake Zendesk ticket","description":"..."}` — creates an item with `source: "zendesk"`, indistinguishable from a real Zendesk event.
  2. `POST /api/intake/automated` similarly impersonates the automated monitoring pipeline.
  3. These forged items enter the workflow and can be routed and dispatched normally.
- **Red Team Handoff Notes:**
  - Confirm work item is created with `source === "zendesk"` in the response.
  - Test flooding: send 50 requests in parallel to measure impact on the in-memory store.
  - Note: `type` and `priority` are NOT enum-validated in intake (see PEN-006) — combine both findings.

---

### PEN-006: Unvalidated Enum Fields in Intake Endpoints Allow Type/Priority Injection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:19-24` (zendesk), `39-44` (automated)
- **Vulnerability Description:** The intake routes accept `type` and `priority` from the request body and pass them directly to `store.createWorkItem()` with no enum validation — unlike the main `POST /api/work-items` endpoint which validates both fields. The in-memory store and TypeScript model factory (`Source/Backend/src/models/WorkItem.ts`) also perform no runtime validation.
  ```typescript
  // intake.ts:19-24 — no validation
  const item = store.createWorkItem({
    type: body.type || WorkItemType.Bug,       // arbitrary string accepted
    priority: body.priority || WorkItemPriority.Medium, // arbitrary string accepted
    source: WorkItemSource.Zendesk,
  });
  ```
  By contrast, `workItems.ts:29-41` validates both fields against enum values.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title":"test","description":"test item","type":"__proto__","priority":"<script>alert(1)</script>"}`.
  2. Item is stored with `type="__proto__"` and `priority="<script>alert(1)</script>"`.
  3. The routing service `isFastTrack(item)` / `isFullReview(item)` receive unexpected types; `isFullReview` has a `default: return true` fallback so routing still functions, but the stored data is corrupted.
  4. If rendered in the frontend without escaping, `priority` value could become a Stored XSS vector.
- **Red Team Handoff Notes:**
  - Payload: `{"title":"XSS test","description":"checking stored xss via intake","type":"INVALID","priority":"<img src=x onerror=alert(1)>"}`
  - Verify the item is stored with these values via `GET /api/work-items/{id}`.
  - Check if the frontend renders `priority` with JSX auto-escaping or as `dangerouslySetInnerHTML`.
  - Also test `type: null`, `type: 12345`, `type: {"nested":"obj"}` to probe type coercion.

---

### PEN-007: Unauthorized Cascade Auto-Dispatch via Dependency Injection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:195-199` → `Source/Backend/src/services/dependency.ts:251-315`
- **Vulnerability Description:** The `POST /:id/reject` endpoint calls `onItemResolved(id)` after rejection. `onItemResolved` iterates all items that the rejected item "blocks" and, if those dependents are in `Approved` status with no remaining unresolved blockers, auto-dispatches them to a team — bypassing the explicit `POST /:id/dispatch` endpoint entirely. Because no authentication exists, an attacker can inject a dependency onto any `Approved` work item and then immediately reject their own blocker to trigger the cascade dispatch.
  ```typescript
  // workflow.ts:195-199
  const cascaded = onItemResolved(id); // called after every rejection
  ```
  ```typescript
  // dependency.ts:292-302
  const updated = store.updateWorkItem(dependent.id, {
    status: WorkItemStatus.InProgress,  // directly dispatched
    assignedTeam: team,
    hasUnresolvedBlockers: false,
    changeHistory: [...dependent.changeHistory, statusEntry, teamEntry],
  });
  ```
- **Potential Exploit Path:**
  1. `GET /api/work-items?status=approved` — enumerate all approved items waiting for dispatch.
  2. `POST /api/work-items` — create attacker-controlled blocker item B (any valid body).
  3. `POST /api/work-items/{target_approved_item_id}/dependencies` with `{"action":"add","blockerId":"{B.id}"}` — inject B as a blocker on the approved target.
  4. `POST /api/work-items/{B.id}/route` — route B (goes to `proposed`).
  5. `POST /api/work-items/{B.id}/reject` with `{"reason":"attacker-controlled"}` — reject B.
  6. `onItemResolved(B.id)` fires: target item is `Approved`, `computeHasUnresolvedBlockers` returns `false` (B is `Rejected` = resolved status), target is auto-dispatched to `InProgress`.
  7. The target work item is now dispatched without any explicit authorize/dispatch action on it.
- **Red Team Handoff Notes:**
  - Confirm the target item's status changed to `in-progress` in the response from step 5 (`cascaded` list in server log or by subsequent GET).
  - Also test: what if the target item has MULTIPLE blockers? Only after ALL are resolved does cascade fire. Test multi-blocker scenario.
  - Note: cascade dispatch bypasses the `team !== TheATeam && team !== TheFixer` guard in the dispatch endpoint — but `assignTeam()` only returns those two values anyway, so it doesn't matter in practice.

---

## Medium Findings

---

### PEN-008: Dashboard Queue Endpoint Dumps All Work Items Without Pagination or Auth
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts:25-31` → `Source/Backend/src/services/dashboard.ts:57-76`
- **Vulnerability Description:** `GET /api/dashboard/queue` returns every non-deleted work item grouped by status with no pagination and no authentication. `getAllItems()` returns the full Map contents.
- **Potential Exploit Path:**
  1. `GET /api/dashboard/queue` — single unauthenticated request.
  2. Response contains complete `items: WorkItem[]` arrays for all statuses.
  3. Every work item's full state (title, description, assessments, changeHistory, blockedBy, blocks) is exposed.
- **Red Team Handoff Notes:**
  - Confirm response size scales with work item count.
  - Compare with `GET /api/work-items?limit=999999` — the queue endpoint also exposes `assessments` and `changeHistory` arrays nested within items.

---

### PEN-009: Soft-Deleted Item UUID Disclosure via Readiness Check Response
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:82-98`
- **Vulnerability Description:** `GET /api/work-items/:id/ready` returns `unresolvedBlockers` which includes raw `DependencyLink` objects (`blockerItemId`, `blockerItemDocId`). If a blocker has been soft-deleted, `store.findById(link.blockerItemId)` returns `undefined`, causing `computeHasUnresolvedBlockers` to treat it as unresolved. The `isReady()` function then returns the `DependencyLink` containing the soft-deleted item's UUID in the `unresolvedBlockers` array — violating the expectation that soft-deleted items are fully hidden.
  ```typescript
  // dependency.ts:88-98
  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId); // returns undefined for deleted
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      unresolvedBlockers.push(link); // link.blockerItemId is the deleted item's UUID
    }
  }
  ```
- **Potential Exploit Path:**
  1. Discover a work item with known dependencies (via activity log or queue endpoint).
  2. `DELETE /api/work-items/{blocker_id}` — soft-delete the blocker.
  3. `GET /api/work-items/{dependent_id}/ready` — response includes `{"ready":false,"unresolvedBlockers":[{"blockerItemId":"{deleted_uuid}","blockerItemDocId":"WI-XXX",...}]}`.
  4. The UUID and docId of the deleted item are disclosed.
- **Red Team Handoff Notes:**
  - Create two items A and B, add A→B dependency, soft-delete B, then call `/ready` on A.
  - Also note: a soft-deleted blocker permanently blocks the dependent's dispatch (no auto-resolution on soft-delete) — this is a separate DoS-style logic flaw.

---

### PEN-010: Dashboard Activity Endpoint Exposes Full Change History Without Auth
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts:16-23` → `Source/Backend/src/services/dashboard.ts:32-53`
- **Vulnerability Description:** `GET /api/dashboard/activity` returns every `ChangeHistoryEntry` across all items, including `oldValue` and `newValue` for every field mutation (status transitions, dependency changes, field edits), associated `workItemId` and `workItemDocId`. No authentication. The only limit is pagination (which has no upper bound cap — see PEN-004).
- **Potential Exploit Path:**
  1. `GET /api/dashboard/activity?limit=999999` — full audit trail dumped.
  2. Reconstructs complete state transition history for all work items including previously soft-deleted item IDs appearing in blockedBy change entries.
- **Red Team Handoff Notes:**
  - Look for `field: "blockedBy"` entries in the activity log — `oldValue` and `newValue` contain raw UUIDs that may reference soft-deleted items.
  - Look for `field: "status"` transitions where `agent: "cascade-dispatcher"` to identify items that were auto-dispatched (PEN-007 evidence).

---

### PEN-011: Unprotected Prometheus Metrics Endpoint
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`, `Source/Backend/src/metrics.ts`
- **Vulnerability Description:** `GET /metrics` is mounted without authentication and exposes: default Node.js process metrics (CPU, memory, event loop lag, heap usage), plus custom business counters (`workflow_items_created_total`, `workflow_items_dispatched_total`, `cycle_detection_events_total`, etc.). This provides operational intelligence for attack planning.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — Prometheus text format, no credentials.
  2. Use `workflow_items_created_total` and `workflow_items_dispatched_total` counters to understand workflow throughput.
  3. Use `cycle_detection_events_total{detected="true"}` to infer when circular dependency attacks are detected.
- **Red Team Handoff Notes:**
  - Capture baseline metrics before any attack, then compare post-attack to measure impact.
  - `dispatch_gating_events_total{event="blocked"}` counter reveals how many dispatch-block events occur — useful for timing PEN-007.

---

### PEN-012: `NeedsClarification` Assessment Verdict Silently Treated as Rejection
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts:162-167`
- **Vulnerability Description:** The assessment pod can produce a `NeedsClarification` verdict (e.g., when `complexity` is not set). However, `runAssessmentPod` maps all non-`Approve` verdicts to `WorkItemStatus.Rejected`:
  ```typescript
  // assessment.ts:162-167
  if (podLeadAssessment.verdict === AssessmentVerdict.Approve) {
    targetStatus = WorkItemStatus.Approved;
  } else {
    targetStatus = WorkItemStatus.Rejected; // NeedsClarification → Rejected!
  }
  ```
  An item rejected this way is treated as "resolved" per `RESOLVED_STATUSES`, so dependents with this item as a blocker become unblocked — but `onItemResolved` is NOT called from `assessWorkItem`, so the cascade dispatch does NOT trigger. This asymmetry between `/reject` and `/assess` rejection creates an inconsistency in the dependency gating model.
- **Potential Exploit Path:**
  1. Create item B (no `complexity` field), add as blocker for approved item A.
  2. `POST /api/work-items/B/route` then `POST /api/work-items/B/assess` — B is rejected due to `NeedsClarification`.
  3. `computeHasUnresolvedBlockers(A.id)` now returns `false` (B is `Rejected` = resolved).
  4. A can now be manually dispatched via `POST /api/work-items/A/dispatch` — dispatch gating effectively bypassed without triggering the cascade.
  5. Unlike PEN-007, this does NOT auto-dispatch A, but does silently unblock it.
- **Red Team Handoff Notes:**
  - Payload for step 1: `POST /api/work-items` with `{"title":"test","description":"test description here","type":"bug","priority":"medium","source":"manual"}` — omit `complexity`.
  - After assess, confirm B.status === "rejected" and A is now dispatchable.
  - Also: `NeedsClarification` in the pod-lead `notes` field contradicts the `status: "rejected"` — document this discrepancy for the compliance auditor.

---

## Low Findings

---

### PEN-013: Predictable Sequential Document IDs Enable Work Item Enumeration
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts:12-15`
- **Vulnerability Description:** `generateDocId()` uses a module-level counter: `WI-001`, `WI-002`, `WI-003`, etc. The counter is never persisted and resets on server restart. DocIds are exposed in all API responses and logged. An attacker can infer the total number of work items created, the rate of item creation, and perform enumeration by docId (if a future endpoint uses docId as a path parameter).
  ```typescript
  let docIdCounter = 0;
  export function generateDocId(): string {
    docIdCounter += 1;
    return `WI-${String(docIdCounter).padStart(3, '0')}`;
  }
  ```
  Note: the primary `id` field uses UUID v4 (non-predictable), so direct IDOR by UUID is not possible. However, docIds ARE predictable.
- **Potential Exploit Path:**
  1. Create one item, observe `docId: "WI-001"`.
  2. Create a second item, observe `docId: "WI-002"`.
  3. Use `GET /api/work-items?limit=999999` to map all UUIDs to their docIds and infer the creation sequence.
- **Red Team Handoff Notes:**
  - Create 5 items in rapid succession and confirm sequential docIds.
  - Note: after a server restart, the counter resets to 0, so items created before restart have higher docIds than items created after restart in sequential order — a discrepancy that reveals restart events.

---

### PEN-014: Raw Exception Messages Returned in Some Error Responses
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:60-63`, `88-91`, `136-140`, `203-207`, `290-296`, `346-349`
- **Vulnerability Description:** Several catch blocks in workflow routes return `err.message` directly in the HTTP response body:
  ```typescript
  // e.g. workflow.ts:60-63
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message }); // raw message exposed
  }
  ```
  The top-level `errorHandler` middleware correctly returns a generic message, but the route-level catch blocks in `workflow.ts` pre-empt it and expose raw exception text. These messages include file paths and internal entity names that aid reconnaissance.
- **Potential Exploit Path:**
  1. Trigger an error in route-level logic (e.g., call `/route` with an invalid item ID that somehow bypasses the `findById` check).
  2. Observe raw stack trace fragment or internal path in `error` field.
- **Red Team Handoff Notes:**
  - Try edge cases: `POST /api/work-items/nonexistent-uuid/route` — observe error message format.
  - Try `POST /api/work-items//route` (empty segment) and `POST /api/work-items/undefined/route`.
  - Note: the errorHandler at `Source/Backend/src/middleware/errorHandler.ts:5-8` DOES log `err.stack` server-side — this is correct. The vulnerability is the route-level catch blocks exposing messages to the client.

---

## Attack Chain Summary for Red Teamer

### Chain 1: Full Workflow Takeover (3 requests)
```
POST /api/work-items                          # Create any item
POST /api/work-items/{id}/route               # Body: {"overrideRoute":"fast-track"}
POST /api/work-items/{id}/dispatch            # Body: {"team":"TheATeam"}
# Result: item goes backlog→approved→in-progress, bypassing assessment entirely
```

### Chain 2: Full Data Exfiltration (2 requests)
```
GET /api/work-items?limit=999999              # All work items with full details
GET /api/dashboard/activity?limit=999999      # Full change history for all items
# Result: complete data dump without authentication
```

### Chain 3: Cascade Dispatch of Victim Item (6 requests)
```
GET /api/work-items?status=approved           # Find approved items
POST /api/work-items                          # Create attacker blocker item
POST /api/work-items/{victim_id}/dependencies # Body: {"action":"add","blockerId":"{blocker_id}"}
POST /api/work-items/{blocker_id}/route       # Route blocker
POST /api/work-items/{blocker_id}/reject      # Body: {"reason":"x"} → triggers cascade
# Result: victim item auto-dispatched without explicit /dispatch call
```

### Chain 4: Inject Malformed Work Item via Intake (1 request)
```
POST /api/intake/zendesk
Body: {"title":"t","description":"d","type":"INVALID_TYPE","priority":"<svg/onload=alert(1)>"}
# Result: item with invalid type and XSS payload stored; renders in frontend dashboard
```

---

## Non-Findings (Static Analyzer Scope)

The following were noted but are NOT reported here per agent boundary rules:

- Hardcoded credentials in `CLAUDE.md` (`admin@example.com / admin123`) — `[SEE SAST]`
- `process.stdout.write` used in logger instead of framework logger — `[SEE SAST]`
- Missing `helmet` security headers — `[SEE SAST]`
- Missing CORS configuration — `[SEE SAST]`
- No rate limiting on any endpoint — `[SEE SAST]`

---

## Coverage by OWASP Focus Areas

| OWASP Category | Finding(s) | Covered |
|---|---|---|
| A01: Broken Access Control | PEN-001, PEN-002, PEN-007, PEN-009 | ✅ |
| A02: Cryptographic Failures | (No crypto in use) | N/A |
| A03: Injection | PEN-006 | ✅ |
| A07: Identification and Authentication Failures | PEN-001, PEN-005 | ✅ |
| A08: Software and Data Integrity Failures | PEN-003, PEN-012 | ✅ |
