# Attack Surface Map — dev-crew Source App
**Produced by:** pen_tester  
**Date:** 2026-04-14  
**Target:** `http://localhost:3001` (Backend API)  
**Scope:** White-box static analysis of `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`  
**Config:** `Teams/TheGuardians/security.config.yml`  
**Status:** Handoff to red-teamer — all findings are Theoretical (require dynamic verification)

---

## Executive Summary

The application has **zero authentication or authorization** on any endpoint. Every route — including state-machine transitions, manual approvals, webhook ingress, and the Prometheus metrics dump — is fully accessible to unauthenticated anonymous callers. This single structural failure amplifies every other finding into a Critical or High severity exploit chain.

**Findings Count:**

| Severity | Count |
|----------|-------|
| Critical | 4     |
| High     | 7     |
| Medium   | 5     |
| Low      | 3     |
| **Total**| **19**|

---

## Critical Findings

---

### PEN-001: Complete Absence of Authentication and Authorization on All API Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 11–44), all route files
- **Vulnerability Description:**  
  `app.ts` mounts all routers with no authentication middleware anywhere in the stack. There is no session validation, no JWT check, no API key requirement, no RBAC enforcement on any route. Every endpoint listed below is open to anonymous unauthenticated callers over HTTP.

  Complete unauthenticated endpoint inventory:
  - `POST   /api/work-items` — create
  - `GET    /api/work-items` — list all (paginated)
  - `GET    /api/work-items/:id` — read single
  - `PATCH  /api/work-items/:id` — update fields
  - `DELETE /api/work-items/:id` — soft-delete
  - `POST   /api/work-items/:id/route` — state transition
  - `POST   /api/work-items/:id/assess` — trigger assessment pod
  - `POST   /api/work-items/:id/approve` — manual approval override
  - `POST   /api/work-items/:id/reject` — reject
  - `POST   /api/work-items/:id/dispatch` — dispatch to team
  - `POST   /api/work-items/:id/dependencies` — manage dependency graph
  - `GET    /api/work-items/:id/ready` — readiness check
  - `GET    /api/dashboard/summary` — aggregate business metrics
  - `GET    /api/dashboard/activity` — full cross-item change history
  - `GET    /api/dashboard/queue` — full queue grouped by status
  - `POST   /api/intake/zendesk` — create from Zendesk webhook
  - `POST   /api/intake/automated` — create from system event
  - `GET    /metrics` — Prometheus operational telemetry
- **Potential Exploit Path:**
  1. Any unauthenticated HTTP client issues any of the above requests.
  2. No middleware intercepts or rejects the request.
  3. The request is processed in full and the response returned.
- **Red Team Handoff Notes:**  
  Every single active exploit listed in subsequent findings flows through this root vulnerability. To verify: issue `curl http://localhost:3001/api/work-items` with no headers — expect a `200 OK` with real data. Issue `curl -X DELETE http://localhost:3001/api/work-items/<id>` — expect 204 (soft-delete succeeds).

---

### PEN-002: Unauthenticated Manual Approval Bypasses Entire Assessment Pipeline
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (lines 93–142)
- **Vulnerability Description:**  
  `POST /api/work-items/:id/approve` performs a manual status override. Combined with PEN-001 (no auth), any unauthenticated caller can force any work item directly to `approved` status from `proposed`, `reviewing`, or `routing` states — completely skipping the 4-role assessment pod. The `VALID_STATUS_TRANSITIONS` table confirms `routing → approved` is a valid transition (line 219 of `Source/Shared/types/workflow.ts`), meaning an item can go from `backlog → routing → approved` with two API calls, bypassing all quality gates.
- **Potential Exploit Path:**
  1. `POST /api/work-items` with minimal payload `{"title":"x","description":"y","type":"bug","priority":"low","source":"manual"}` → receives item with `id=<UUID>` and `status=backlog`.
  2. `POST /api/work-items/<UUID>/route` (no body) → transitions item to `routing`.
  3. `POST /api/work-items/<UUID>/approve` with body `{"reason":"override"}` → item jumps directly to `approved`, skipping assessment pod.
  4. `POST /api/work-items/<UUID>/dispatch` → item dispatched to a team in `in-progress`.
- **Red Team Handoff Notes:**  
  This directly satisfies the security config objective *"Bypass work item state machine to reach an invalid status."* The entire assessment pipeline (requirements-reviewer, domain-expert, work-definer, pod-lead) is silently bypassed. Verify by checking `item.assessments` on the final item — it should be empty (`[]`) despite the item being `approved`.

---

### PEN-003: Unauthenticated Fast-Track Route Override — Assessment Pod Bypass via `overrideRoute`
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (lines 39–64), `Source/Backend/src/services/router.ts` (lines 66–88)
- **Vulnerability Description:**  
  `POST /api/work-items/:id/route` accepts an optional `overrideRoute` field. When set to `"fast-track"`, the `classifyRoute()` function immediately returns `targetStatus: WorkItemStatus.Approved`, transitioning the item from `backlog` directly to `approved` in a single call. There is no authorization check limiting who can supply `overrideRoute`. This is a second, distinct path to bypass the assessment pod from PEN-002.

  ```typescript
  // services/router.ts:67-75
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus: overrideRoute === WorkItemRoute.FastTrack
        ? WorkItemStatus.Approved      // ← jumps straight to approved
        : WorkItemStatus.Proposed,
    };
  }
  ```
- **Potential Exploit Path:**
  1. `POST /api/work-items` → create item (status: `backlog`).
  2. `POST /api/work-items/<UUID>/route` with body `{"overrideRoute": "fast-track"}` → item transitions `backlog → routing → approved` in one call.
  3. `POST /api/work-items/<UUID>/dispatch` → dispatched immediately with no assessment.
- **Red Team Handoff Notes:**  
  Try both payloads: `{"overrideRoute":"fast-track"}` (enum value) and `{"overrideRoute":"FAST-TRACK"}` (case variation). Also try `{"overrideRoute":"full-review"}` to confirm it resolves to `proposed` instead. Verify `item.route === "fast-track"` and `item.assessments === []` on the resulting item.

---

### PEN-004: Webhook Spoofing — No HMAC Signature Verification on Intake Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` (lines 11–54)
- **Vulnerability Description:**  
  `POST /api/intake/zendesk` and `POST /api/intake/automated` are designed to receive trusted external webhook payloads. Neither endpoint validates any authentication token, HMAC signature (e.g., `X-Zendesk-Webhook-Signature`), or API key. Any unauthenticated caller can inject arbitrary work items into the system, forcing them to appear as if they originated from Zendesk or an automated system event.

  Additionally, both endpoints accept `type` and `priority` from the request body **without enum validation** — unlike the main `POST /api/work-items` which validates against `WorkItemType` and `WorkItemPriority` enums. This allows creating work items with arbitrary non-enum string values for these fields, corrupting downstream assessment and routing logic.

  ```typescript
  // intake.ts:19-25 — No type/priority validation
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,       // ← unsanitized
    priority: body.priority || WorkItemPriority.Medium,  // ← unsanitized
    source: WorkItemSource.Zendesk,
  });
  ```
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with body `{"title":"Injected","description":"Spoofed ticket","type":"arbitrary_type","priority":"arbitrary_priority"}` → creates a work item with invalid enum values, bypassing all type/priority validation.
  2. The item enters the workflow with corrupted fields that may break `isFastTrack`, `isFullReview`, `assessAsWorkDefiner` (switch falls through silently for unknown types), and routing classification.
  3. Alternatively, flood the endpoint with high-priority work items impersonating Zendesk to manipulate the work queue.
- **Red Team Handoff Notes:**  
  Test 1 (spoofing): `curl -X POST http://localhost:3001/api/intake/zendesk -H "Content-Type: application/json" -d '{"title":"Injected","description":"Test spoofed ticket"}'` — should create successfully. Test 2 (enum corruption): add `"type":"MALICIOUS","priority":"MALICIOUS"` to the body. Check if the item is created with these values, and then trace what happens when it gets routed and assessed.

---

## High Findings

---

### PEN-005: No Pagination Limit Enforcement — Full Data Set Dump in One Request
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 60–75), `Source/Backend/src/store/workItemStore.ts` (lines 30–64)
- **Vulnerability Description:**  
  `GET /api/work-items?limit=<n>` passes the `limit` value from the query string directly to `findAll()` without imposing a maximum cap. The store applies this limit to an in-memory slice. Any value can be supplied:
  
  ```typescript
  // workItems.ts:69-72 — no max-limit guard
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
  ```
  
  `GET /api/dashboard/activity` (dashboard.ts:17-20) has the same issue — `limit` is parsed directly with no cap.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1` — returns entire in-memory data set in a single response.
  2. Response includes full `WorkItem` objects with `changeHistory`, `assessments`, `blockedBy`, `blocks` arrays.
  3. `GET /api/dashboard/activity?limit=999999` — dumps the full audit trail across all items.
- **Red Team Handoff Notes:**  
  This directly satisfies security config objective *"Enumerate all work items without pagination limit enforcement."* First create 25+ items (default page size is 20), then issue `GET /api/work-items?limit=9999` and verify `total` matches the count of all items and that `data.length` equals the full set. Also verify `GET /api/work-items?limit=0` behavior (limit=0 → `0 || 20 = 20` — falls back to default due to falsy zero).

---

### PEN-006: Prometheus Metrics Endpoint Publicly Exposed — Operational Intelligence Leak
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 34–37), `Source/Backend/src/metrics.ts`
- **Vulnerability Description:**  
  `GET /metrics` is exposed with no authentication. It returns the full Prometheus text format, which includes Node.js default metrics (heap size, event loop lag, CPU seconds, GC pause times) plus domain-specific counters:
  - `workflow_items_created_total` — by source and type
  - `workflow_items_routed_total` — by route type (fast-track vs full-review)
  - `workflow_items_assessed_total` — by verdict
  - `workflow_items_dispatched_total` — by team
  - `dependency_operations_total` — by action
  - `dispatch_gating_events_total` — by event type
  - `cycle_detection_events_total` — with detection result

  This exposes business volume, throughput, team workload distribution, and infrastructure health to any unauthenticated observer.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — retrieves full Prometheus scrape payload.
  2. Attacker extracts team dispatch rates to identify high-activity windows (timing for subsequent attacks).
  3. `cycle_detection_events_total{detected="true"}` reveals dependency graph cycle detection attempts — indicates whether the system is being actively manipulated.
- **Red Team Handoff Notes:**  
  Issue a `curl http://localhost:3001/metrics` and document which label combinations appear. Focus on: whether `workflow_items_dispatched_total{team="TheATeam"}` vs `{team="TheFixer"}` reveals team assignment rationale and workload.

---

### PEN-007: Cascade Dispatch Triggered by Rejection — Unintended Work Item Auto-Dispatch
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (lines 192–203), `Source/Backend/src/services/dependency.ts` (lines 251–315)
- **Vulnerability Description:**  
  When an item is rejected (`POST /api/work-items/:id/reject`), the `onItemResolved()` function is called automatically. `DISPATCH_TRIGGER_STATUSES` includes `Rejected`:
  
  ```typescript
  // workflow.ts (Shared types)
  export const DISPATCH_TRIGGER_STATUSES: WorkItemStatus[] = [
    WorkItemStatus.Completed,
    WorkItemStatus.Rejected,  // ← rejection triggers cascade dispatch
  ];
  ```
  
  If rejected item B blocks item A, and item A is in `Approved` status, rejecting B auto-dispatches A to a team — even though B was rejected for quality reasons. This means rejecting a low-quality blocker unintentionally fast-paths dependent work into production teams.
- **Potential Exploit Path:**
  1. Create item A (target), route it, approve it manually (see PEN-002). Status: `approved`.
  2. Create item B (sacrificial blocker), route it.
  3. `POST /api/work-items/A/dependencies` with `{"action":"add","blockerId":"<B-UUID>"}` — A is now blocked by B.
  4. `POST /api/work-items/B/reject` with `{"reason":"anything"}` — B is rejected.
  5. `onItemResolved(B)` fires, checks A's status (`approved`), checks A's blockers (now all resolved since B is in `rejected` ∈ `RESOLVED_STATUSES`), and auto-dispatches A to a team.
  6. Item A is now `in-progress` without any manual dispatch approval.
- **Red Team Handoff Notes:**  
  Verify by checking the cascade in the response body — the rejection response does NOT include the cascaded item A. Instead, check A's status immediately after rejecting B: `GET /api/work-items/<A-UUID>` should show `status: "in-progress"` and `assignedTeam` populated.

---

### PEN-008: Ghost Blocker DoS — Soft-Delete Creates Permanently Unresolvable Dependency
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` (lines 64–75), `Source/Backend/src/store/workItemStore.ts` (lines 22–26)
- **Vulnerability Description:**  
  When a blocker item is soft-deleted, `store.findById()` returns `undefined`. In `computeHasUnresolvedBlockers()`:
  
  ```typescript
  // dependency.ts:68-74
  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId);
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      return true;  // ← undefined blocker (deleted) is treated as UNRESOLVED
    }
  }
  ```
  
  A deleted blocker is treated as an unresolved blocker. The dependent item is permanently blocked from dispatch because `computeHasUnresolvedBlockers` will always return `true` for that stale link. The ghost link remains in the dependent's `blockedBy` array indefinitely and the dispatch endpoint will reject all dispatch attempts with `"Cannot dispatch: work item has unresolved blocking dependencies"`.
  
  Note: `removeDependency` can technically clean up the ghost link if the caller knows the deleted item's UUID — but the UI may not surface the link for a deleted item, and there's no automated cleanup.
- **Potential Exploit Path:**
  1. Create items A (target) and B (blocker). Route and approve A.
  2. Add dependency: `POST /api/work-items/A/dependencies` with `{"action":"add","blockerId":"<B-UUID>"}`.
  3. Soft-delete B: `DELETE /api/work-items/<B-UUID>`.
  4. Attempt to dispatch A: `POST /api/work-items/A/dispatch` → 400 with `"unresolved blocking dependencies"`.
  5. The ghost link in A's `blockedBy` keeps A permanently blocked.
- **Red Team Handoff Notes:**  
  Verify by checking `GET /api/work-items/<A-UUID>/ready` after deleting B — it should return `{"ready":false,"unresolvedBlockers":[...]}` even though B is deleted. The `unresolvedBlockers` array should contain the stale link with the deleted B's UUID.

---

### PEN-009: Unvalidated `overrideRoute` Value Injects Arbitrary String into `route` Field
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (lines 39–64), `Source/Backend/src/services/router.ts` (lines 66–88)
- **Vulnerability Description:**  
  The `overrideRoute` parameter in `POST /api/work-items/:id/route` is not validated against the `WorkItemRoute` enum before being stored. The `classifyRoute` function branches on `=== WorkItemRoute.FastTrack`, but any other non-null value falls through to the else branch and stores the raw arbitrary string as the item's `route` field:
  
  ```typescript
  // router.ts:67-75
  if (overrideRoute) {   // any truthy value passes
    return {
      route: overrideRoute,  // stored verbatim — no enum check
      targetStatus: overrideRoute === WorkItemRoute.FastTrack
        ? WorkItemStatus.Approved
        : WorkItemStatus.Proposed,
    };
  }
  ```
  
  Result: `item.route = "evil-string"` persisted in the store. Downstream logic that branches on `item.route` values may behave unexpectedly. This could also corrupt serialized state and break frontend rendering.
- **Potential Exploit Path:**
  1. `POST /api/work-items` → create item (status: `backlog`).
  2. `POST /api/work-items/<UUID>/route` with body `{"overrideRoute":"<INJECTED_VALUE>"}`.
  3. `GET /api/work-items/<UUID>` → confirm `route` field contains the injected string.
- **Red Team Handoff Notes:**  
  Try: `{"overrideRoute":"xss_test"}`, `{"overrideRoute":"fast-track-EVIL"}`, `{"overrideRoute":true}` (type confusion). Confirm whether the value is reflected verbatim. Also try `{"overrideRoute":null}` — null should skip the `if (overrideRoute)` check, behaving as if no override was given (auto-classify). Verify that `null` doesn't set `route` to null.

---

### PEN-010: Missing Input Length Limits — Oversized Payloads Accepted
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (line 13), `Source/Backend/src/routes/workItems.ts` (lines 21–57)
- **Vulnerability Description:**  
  `express.json()` is configured without a `limit` option, defaulting to Express's 100kb limit. No field-level length validation is enforced on `title`, `description`, `reason` (reject), `notes`, or any other string field. Extremely large strings degrade in-memory store performance, inflate response sizes (especially `GET /api/dashboard/activity` which returns all change history), and may cause slowdowns in assessment logic that iterates over description text.
  
  More specifically, the `assessAsRequirementsReviewer` only checks `item.description.trim().length < 20` (minimum bound) but sets no upper limit. An 80,000-character description is valid per the current implementation.
- **Potential Exploit Path:**
  1. Craft a `POST /api/work-items` body with `title` of 10,000 characters and `description` of 90,000 characters (within the 100kb Express limit).
  2. Create 100+ such items to exhaust in-memory store memory.
  3. `GET /api/dashboard/activity?limit=999999` — returns a response containing all change history entries, including the oversized strings, potentially producing a very large response payload.
- **Red Team Handoff Notes:**  
  Create one item with maximum-length title and description. Then call `GET /api/dashboard/activity` and measure response time and payload size. Check if the backend process memory grows measurably after creating N large items (observable via `GET /metrics` — `process_resident_memory_bytes`).

---

### PEN-011: `DELETE /api/work-items/:id` Accessible by Soft-Deleted Item Reference Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 141–150), `Source/Backend/src/store/workItemStore.ts` (lines 77–90)
- **Vulnerability Description:**  
  This directly addresses the security config objective *"Access or modify a soft-deleted work item via direct ID reference."*  
  
  `DELETE /api/work-items/:id` calls `store.softDelete(id)`. The store checks `if (!item || item.deleted) return false` and returns 404. So a second soft-delete attempt is rejected. However, there is no route that retrieves or modifies a soft-deleted item via its UUID.
  
  **BUT** — the dependency graph retains references to soft-deleted items in `blockedBy`/`blocks` arrays of OTHER items. The `GET /api/work-items/<active-id>` response includes the full `blockedBy` array, which contains `DependencyLink` objects with the soft-deleted item's `blockerItemId` (UUID) and `blockerItemDocId`. This exposes the UUIDs of deleted items and confirms their existence via dependency graph traversal.

  Additionally, the `removeDependency` operation accepts a `blockerId` that may refer to a soft-deleted item — and successfully removes the link without verifying the blocker is alive:
  ```typescript
  // dependency.ts:172-178
  const blocker = store.findById(blockerId);  // returns undefined if deleted — no throw
  // proceeds with cleanup regardless
  ```
  This is an IDOR variant: a soft-deleted item can be referenced by ID to manipulate dependency data.
- **Potential Exploit Path:**
  1. Create items A and B. Add B as blocker of A.
  2. `DELETE /api/work-items/<B-UUID>` — soft-deletes B.
  3. `GET /api/work-items/<A-UUID>` — response includes B's UUID in `blockedBy[0].blockerItemId`. B's existence and UUID are confirmed via A's data.
  4. `POST /api/work-items/A/dependencies` with `{"action":"remove","blockerId":"<B-UUID>"}` — successfully removes the ghost link referencing the soft-deleted item.
- **Red Team Handoff Notes:**  
  Verify: after deleting B, confirm B's UUID still appears in A's `blockedBy` response. Then verify `action: remove` with the deleted B UUID succeeds (204). This demonstrates soft-deleted items can be accessed and manipulated indirectly.

---

## Medium Findings

---

### PEN-012: No Rate Limiting — Unlimited Request Volume Accepted
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (entire middleware chain)
- **Vulnerability Description:**  
  No rate-limiting middleware (e.g., `express-rate-limit`) is configured. All endpoints accept unlimited requests from any IP. This enables:
  - Work item creation flood (exhausting the in-memory `Map` store)
  - Dependency graph complexity attacks (adding thousands of dependency links)
  - Brute-force UUID enumeration of work item IDs
- **Potential Exploit Path:**
  1. Script 10,000 `POST /api/work-items` requests in parallel.
  2. Monitor `GET /metrics` for `process_resident_memory_bytes` growth.
  3. Confirm application slowdown or OOM condition.
- **Red Team Handoff Notes:**  
  A light-load test (100 sequential creates) may be sufficient to demonstrate the issue without destabilizing the environment. Monitor response times over the sequence.

---

### PEN-013: Full Audit Trail Exposed Unauthenticated via Dashboard Activity
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts` (lines 16–23), `Source/Backend/src/services/dashboard.ts` (lines 32–53)
- **Vulnerability Description:**  
  `GET /api/dashboard/activity` returns a paginated (but uncapped — see PEN-005) feed of `ChangeHistoryEntry` objects for every non-deleted work item. Each entry includes: `field`, `oldValue`, `newValue`, `agent`, `reason`, and timestamps. This exposes:
  - Agent identity strings used in state transitions (`"manual-override"`, `"router-service"`, `"assessment-pod"`, `"dispatcher"`, `"cascade-dispatcher"`)
  - All field values that have ever been set on any item
  - Decision rationale (reason strings from approvals, rejections, dispatches)

  Combined with PEN-005 (no limit cap), `GET /api/dashboard/activity?limit=999999` dumps the full audit trail.
- **Red Team Handoff Notes:**  
  Create several items and run them through the state machine. Then `GET /api/dashboard/activity?limit=999999` and verify the full history appears without authentication.

---

### PEN-014: Error Message Oracle — Internal State Leakage via Workflow Route Errors
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (lines 59–63, 88–91, etc.)
- **Vulnerability Description:**  
  Caught errors in workflow routes are forwarded verbatim to the client:
  
  ```typescript
  // workflow.ts:59-63
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });  // ← raw error message to client
  }
  ```
  
  Error messages such as `"Work item <UUID> not found"` confirm UUID existence (200 = exists, 404 = not found), acting as an **enumeration oracle**. Status mismatch errors like `"Cannot route work item in status 'in-progress'"` leak the current state of the item.
- **Red Team Handoff Notes:**  
  Issue `POST /api/work-items/<random-UUID>/route` — if 404 with "Work item ... not found" you know the UUID doesn't exist. If 400 with a status message, the item exists and you can infer its current state. Use this to enumerate UUIDs by probing `/route` and `/assess` endpoints.

---

### PEN-015: Missing HTTP Security Headers
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (entire middleware stack)
- **Vulnerability Description:**  
  No security headers are configured. Missing headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-XSS-Protection`
  - No CORS policy (`cors` middleware not installed)

  While the backend is primarily a JSON API, missing CORS and content-type headers create risk for cross-origin attacks from any frontend that proxies requests.
- **Red Team Handoff Notes:**  
  `curl -I http://localhost:3001/api/work-items` — confirm absence of security headers. If the frontend at port 5173 makes cross-origin requests, check if the browser blocks them (missing CORS) or passes them through.

---

### PEN-016: No Validation of `limit` / `page` as Positive Integers — Negative and NaN Values Accepted
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 68–72), `Source/Backend/src/store/workItemStore.ts` (lines 56–63)
- **Vulnerability Description:**  
  `parseInt` is applied to `page` and `limit` query parameters with no bounds check. Negative values are accepted:
  - `limit=-1` → stored as -1 (truthy in JS), applied to `result.slice(offset, offset + (-1))` → returns all items except the last (unintended behavior).
  - `page=-99` → `offset = (-99 - 1) * 20 = -2000` → `result.slice(-2000, -1980)` → returns items near the "end" of the array in a non-standard order.
  - `limit=0` → falsy, falls back to default 20 (safe).
  - `page=0` → `offset = (0-1) * 20 = -20` → `result.slice(-20, 0)` → returns empty array.
  
  These edge cases produce unexpected result sets that may confuse pagination state on the frontend or reveal items not expected to appear.
- **Red Team Handoff Notes:**  
  Test: `GET /api/work-items?limit=-1` — verify it returns all items minus the last. Test: `GET /api/work-items?page=-1` — verify unexpected ordering. Verify `GET /api/work-items?page=0` returns an empty data array.

---

## Low Findings

---

### PEN-017: Predictable Sequential Document IDs Enable Work Item Enumeration
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts` (lines 12–15)
- **Vulnerability Description:**  
  `generateDocId()` produces sequential IDs in the format `WI-001`, `WI-002`, ... The counter is global module state, incremented on every item creation. While the primary `id` is a UUID (unpredictable), the `docId` is predictable and returned in every API response, change history entry, and dependency link. An attacker who observes one `docId` can predict all others and infer total item count.
- **Red Team Handoff Notes:**  
  Create three items and observe `docId` values. Confirm they are sequential. If `WI-007` exists, you know items `WI-001` through `WI-006` also exist (or existed). Note: the primary `id` (UUID) is still needed to address items via the API.

---

### PEN-018: Frontend Calls Non-Existent `/api/search` Endpoint
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts` (lines 100–104)
- **Vulnerability Description:**  
  The frontend API client defines `searchItems(q: string)` which calls `GET /api/search?q=<user-input>`. This endpoint does **not exist** in `app.ts` or any backend route file. The request will return a 404 from Express. No search route is registered. Any UI feature relying on this endpoint (e.g., the `DependencyPicker` component) will silently fail.
  
  While not directly exploitable, the `q` parameter is passed without sanitization through `URLSearchParams` to a non-existent endpoint. If a search endpoint is added in the future without input validation, the unsanitized `q` value would flow directly to search logic (potential injection point to monitor).
- **Red Team Handoff Notes:**  
  `GET http://localhost:3001/api/search?q=test` — confirm 404. Check the `DependencyPicker.tsx` component to verify this function is actually called in the UI, and whether any error boundaries catch the failure.

---

### PEN-019: Internal Error Stack Trace Logged but Not Returned (Positive Finding — Partial)
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/middleware/errorHandler.ts` (lines 5–8)
- **Vulnerability Description:**  
  The `errorHandler` middleware logs the full stack trace server-side (`err.stack`) but correctly returns only `"Internal server error"` to the client. This is a **correct** implementation for the global error handler.
  
  **However**, route-level error catches in `workflow.ts` bypass this handler and return `err.message` directly (see PEN-014). The disparity between the two error handling paths means only _unhandled_ errors are properly sanitized, while _handled_ errors in route handlers leak messages.
- **Red Team Handoff Notes:**  
  Focus verification on route-level catch blocks (PEN-014) rather than this handler. Confirm by triggering both a handled route error (e.g., bad transition) and an unhandled one — verify the unhandled case returns generic message while the handled case returns specific message.

---

## Attack Chain Summary for Red-Teamer

The following chains combine multiple findings into single objective-aligned attacks:

### Chain A: Full State Machine Bypass (PEN-001 + PEN-003)
1. `POST /api/work-items` → create item
2. `POST /api/work-items/<id>/route` `{"overrideRoute":"fast-track"}` → instant approval
3. `POST /api/work-items/<id>/dispatch` `{"team":"TheATeam"}` → dispatched to team

**Expected outcome:** Item moves `backlog → routing → approved → in-progress` with zero assessment. `assessments: []`.

### Chain B: Malformed Assessment Verdict via Intake (PEN-001 + PEN-004)
1. `POST /api/intake/zendesk` `{"title":"test","description":"test","type":"INVALID","priority":"INVALID"}` → item created with invalid enum fields
2. `POST /api/work-items/<id>/route` → route item
3. `POST /api/work-items/<id>/assess` → run assessment pod on malformed item

**Expected outcome:** Item created with `type="INVALID"`, `priority="INVALID"`. Assessment pod runs — `assessAsWorkDefiner` switch falls through silently, `isFastTrack` comparisons never match. Observe whether the system crashes or produces a corrupted assessment verdict.

### Chain C: Soft-Deleted Item Access via Dependency Graph (PEN-001 + PEN-011)
1. Create A and B. Add B as blocker of A.
2. `DELETE /api/work-items/<B-UUID>` → soft-delete B.
3. `GET /api/work-items/<A-UUID>` → B's UUID exposed in `blockedBy`.
4. `POST /api/work-items/A/dependencies` `{"action":"remove","blockerId":"<B-UUID>"}` → remove reference to soft-deleted item.

**Expected outcome:** Soft-deleted item's UUID extracted from active item's dependency list. Operations successfully performed against soft-deleted item's ID.

### Chain D: Unlimited Data Enumeration (PEN-001 + PEN-005)
1. `GET /api/work-items?limit=999999` → full data dump
2. `GET /api/dashboard/activity?limit=999999` → full audit log

**Expected outcome:** Both requests return HTTP 200 with complete data sets in a single response.

---

## Mapping to Security Config Objectives

| Objective | Covered By |
|-----------|------------|
| "Bypass work item state machine to reach an invalid status" | PEN-002 (approve from routing), PEN-003 (fast-track override), Chain A |
| "Access or modify a soft-deleted work item via direct ID reference" | PEN-011, Chain C |
| "Submit a malformed assessment verdict that bypasses routing logic" | PEN-004 (intake enum bypass), Chain B |
| "Enumerate all work items without pagination limit enforcement" | PEN-005, Chain D |

---

## OWASP Top 10 Coverage

| OWASP Category | Findings |
|----------------|----------|
| A01: Broken Access Control | PEN-001, PEN-002, PEN-003, PEN-006, PEN-013 |
| A02: Cryptographic Failures | PEN-004 (no HMAC), PEN-015 (no HTTPS/HSTS) |
| A03: Injection | PEN-004 (enum injection via intake), PEN-009 (route field injection) |
| A07: Authentication Failures | PEN-001, PEN-004 |
| A08: Software and Data Integrity Failures | PEN-004 (unauthenticated webhook), PEN-007 (cascade dispatch abuse) |
