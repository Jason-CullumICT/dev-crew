# Attack Surface Map
**Team:** TheGuardians  
**Agent:** pen-tester  
**Date:** 2026-04-15  
**Target:** dev-crew Source App — Workflow Engine Backend (`http://localhost:3001`)  
**Scope:** White-box static analysis of `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`  
**OWASP Focus:** A01 (Broken Access Control), A03 (Injection), A07 (Auth Failures), A08 (Integrity Failures)

---

## Executive Summary

The application has **zero authentication or authorization** on any API endpoint. Every finding below is compounded by this baseline condition. The entire attack surface is reachable by any unauthenticated HTTP client. Beyond the auth gap, there are critical business-logic bypasses (assessment pod skip, forced status transitions), input validation gaps in the intake path, and no server-hardening middleware whatsoever.

**Finding counts:** Critical: 3 | High: 5 | Medium: 4 | Low: 2  
**Total:** 14

---

## Findings

---

### PEN-001: Complete Absence of Authentication and Authorization
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 1–54) — all route registrations
- **Vulnerability Description:**
  No authentication middleware is applied anywhere in the Express application. `app.ts` registers all routers (`workItemsRouter`, `workflowRouter`, `dashboardRouter`, `intakeRouter`) with zero `authMiddleware`, `verifyJWT`, API-key validation, or session checks. The `package.json` confirms no auth library (passport, jsonwebtoken, express-jwt, etc.) is installed. Every endpoint — including state-mutation endpoints like `/approve`, `/reject`, `/dispatch`, and the intake webhooks — is publicly accessible.
- **Potential Exploit Path:**
  1. Attacker sends any HTTP request to `http://localhost:3001/api/work-items` with no credentials.
  2. Express processes the request through zero auth middleware — the router handles it directly.
  3. Full CRUD access granted; all workflow actions available to any caller.
- **Red Team Handoff Notes:**
  - Baseline verification: `curl http://localhost:3001/api/work-items` — expect 200 with item list, no auth challenge.
  - Attempt all workflow mutation endpoints (approve, reject, dispatch, route) as unauthenticated. All should succeed.
  - This finding is a precondition amplifier for every other finding below.

---

### PEN-002: Fast-Track Route Override Bypasses Entire Assessment Pod
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (line 57); `Source/Backend/src/services/router.ts` (lines 66–88)
- **Vulnerability Description:**
  The `POST /api/work-items/:id/route` endpoint accepts an `overrideRoute` field directly from the request body with no authorization check and no validation that the caller has the right to override routing decisions. In `router.ts`, `classifyRoute()` short-circuits its entire classification logic when `overrideRoute` is truthy:

  ```typescript
  // router.ts line 67-75
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus: overrideRoute === WorkItemRoute.FastTrack ? WorkItemStatus.Approved : WorkItemStatus.Proposed,
    };
  }
  ```

  Sending `{"overrideRoute": "fast-track"}` skips the assessment pod entirely and transitions the item directly to `Approved` status. The legitimate path is `backlog → routing → proposed → reviewing → approved`, requiring assessment pod consensus. The override collapses this to `backlog → approved` in a single API call.

  Secondary: `overrideRoute` is not runtime-validated against the `WorkItemRoute` enum, so any arbitrary string value (e.g., `"admin-bypass"`) is written directly into the `WorkItem.route` field, corrupting the domain model.
- **Potential Exploit Path:**
  1. Create a work item: `POST /api/work-items` with valid fields → receives `{"id": "uuid-here", "status": "backlog"}`.
  2. Call `POST /api/work-items/uuid-here/route` with body `{"overrideRoute": "fast-track"}`.
  3. Item jumps directly to `status: "approved"` — assessment pod never runs.
  4. Item is now dispatchable to a team without any quality review.
- **Red Team Handoff Notes:**
  - Payload A (assessment skip): `{"overrideRoute": "fast-track"}`
  - Payload B (domain corruption): `{"overrideRoute": "INJECTED_VALUE_12345"}` — verify `item.route` is set to the injected string in the response.
  - This directly achieves the red-team objective: **"Bypass work item state machine to reach an invalid status."**

---

### PEN-003: Manual Approve Bypasses Assessment Pod — Unauthenticated
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (lines 94–142)
- **Vulnerability Description:**
  `POST /api/work-items/:id/approve` allows any caller to manually approve a work item in `proposed`, `reviewing`, or `routing` status. No authentication is required and no privilege check verifies the caller is authorized to override the assessment pod. The `reason` field is optional. Combined with PEN-001, any unauthenticated HTTP client can approve any work item in the queue, immediately bypassing the four-role assessment pod (`pod-lead`, `requirements-reviewer`, `domain-expert`, `work-definer`).

  Additionally, the valid source statuses for this endpoint are derived from `VALID_STATUS_TRANSITIONS`, which include `routing` — meaning an item that has just entered the `routing` transient state can be approved before the router service even classifies it.
- **Potential Exploit Path:**
  1. Create a work item (status: `backlog`).
  2. Call `/route` to move it to `proposed` (or `routing`).
  3. Call `POST /api/work-items/:id/approve` with body `{}` or `{"reason": "force approved"}`.
  4. Item is now `approved` without any assessment records.
- **Red Team Handoff Notes:**
  - Test with empty body: `curl -X POST http://localhost:3001/api/work-items/{id}/approve -H "Content-Type: application/json" -d '{}'`
  - Verify response has `status: "approved"` and `assessments: []` (empty — no assessment was run).
  - Attempt to then dispatch the manually-approved item: `POST /api/work-items/{id}/dispatch` with `{"team": "TheATeam"}`.

---

### PEN-004: Intake Webhooks Have No Signature Verification
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` (lines 11–56)
- **Vulnerability Description:**
  `POST /api/intake/zendesk` and `POST /api/intake/automated` are designed to receive webhook payloads from external systems (Zendesk, automated monitors). Neither endpoint performs any form of webhook signature validation (no HMAC-SHA256 verification of `X-Zendesk-Webhook-Signature` or equivalent). Any HTTP client can POST to these endpoints and inject work items into the workflow, impersonating Zendesk or an automated system.

  Furthermore, these endpoints accept `body.type` and `body.priority` from the raw request body **without enum validation** (unlike `POST /api/work-items` which validates both). See PEN-005 for the enum bypass detail.
- **Potential Exploit Path:**
  1. Attacker sends: `POST http://localhost:3001/api/intake/zendesk` with `{"title": "Fake Critical Bug", "description": "...", "priority": "critical", "type": "bug"}`.
  2. No signature check occurs — request is processed.
  3. A new work item with `source: "zendesk"` is created, potentially flooding the backlog with attacker-controlled items.
- **Red Team Handoff Notes:**
  - Send bulk requests to both intake endpoints to test for rate limiting (there is none — see PEN-009).
  - Attempt to inject items with `source` spoofing by using intake endpoints (they hardcode the source, so this won't spoof source, but it bypasses the `source` enum check on the main endpoint).
  - Test with `type` and `priority` set to invalid enum values (see PEN-005).

---

### PEN-005: Intake Endpoints Accept Invalid Enum Values (type/priority Bypass)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` (lines 19–25, 41–47)
- **Vulnerability Description:**
  The main work-item creation endpoint (`POST /api/work-items`) validates `type` and `priority` against their enum values:

  ```typescript
  // workItems.ts line 29-31
  if (!body.type || !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Valid type is required...' });
  }
  ```

  The intake endpoints perform **no such validation**:

  ```typescript
  // intake.ts line 22-23 — NO enum check
  type: body.type || WorkItemType.Bug,
  priority: body.priority || WorkItemPriority.Medium,
  ```

  Any non-falsy string provided for `type` or `priority` is passed directly to `store.createWorkItem()`, corrupting the domain model with out-of-enum values. These values propagate into the in-memory store, the Prometheus metrics counters (injecting arbitrary label values), and all downstream services that switch on `item.type` (e.g., assessment logic in `assessment.ts` line 78–95 which has a type `switch` that would miss unexpected values).
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title": "test", "description": "test desc", "type": "superadmin", "priority": "nuclear"}`.
  2. Response includes `{"type": "superadmin", "priority": "nuclear"}` — invalid values stored.
  3. These items corrupt the dashboard summary counters, fail assessment pod type-switches silently, and may cause metric cardinality explosion in Prometheus.
- **Red Team Handoff Notes:**
  - Payload: `{"title": "Enum Bypass", "description": "Testing enum validation gap", "type": "INVALID_TYPE_XSS_TEST", "priority": "INVALID_PRIORITY"}`
  - Verify the item is created and stored with the invalid values.
  - Check `GET /api/dashboard/summary` — the invalid `type`/`priority` values should appear in `statusCounts`/`priorityCounts`.
  - Also test with very long strings as type/priority values.

---

### PEN-006: Unbounded Pagination Enables Full Dataset Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 68–73); `Source/Backend/src/routes/dashboard.ts` (lines 17–18)
- **Vulnerability Description:**
  `GET /api/work-items` and `GET /api/dashboard/activity` accept `limit` as an unbounded integer query parameter. There is no maximum cap enforced:

  ```typescript
  // workItems.ts line 70-71
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```

  An attacker can pass `limit=999999999` to retrieve the entire dataset in a single response. Combined with PEN-001 (no auth), this enables complete unauthenticated enumeration of all work items — IDs, descriptions, change histories, assessment records, team assignments — in a single request. This directly achieves the red-team objective: **"Enumerate all work items without pagination limit enforcement."**

  The `parseInt` call also has no `NaN` guard: if `limit=abc` is supplied, `parseInt('abc', 10) === NaN`, and `result.slice(NaN, NaN)` returns `[]` — causing silent data truncation with a 200 response.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/api/work-items?limit=999999&page=1` — receives all items in one response.
  2. `GET http://localhost:3001/api/dashboard/activity?limit=999999` — receives full change history of all items.
- **Red Team Handoff Notes:**
  - Primary: `curl "http://localhost:3001/api/work-items?limit=999999"` — verify `total` equals `data.length`.
  - NaN test: `curl "http://localhost:3001/api/work-items?limit=abc&page=xyz"` — verify response has `data: []` with a 200 (silent failure).
  - NaN test for page: `curl "http://localhost:3001/api/work-items?page=abc"` — `(NaN-1)*20 = NaN`, offset is NaN, slice returns empty.

---

### PEN-007: Forced Invalid Status Transition via `updateWorkItem` — PATCH status Field
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/store/workItemStore.ts` (lines 67–75); `Source/Backend/src/routes/workItems.ts` (lines 88–138)
- **Vulnerability Description:**
  The `PATCH /api/work-items/:id` handler correctly restricts updates to `['title', 'description', 'type', 'priority', 'complexity']`. However, `store.updateWorkItem()` accepts `Partial<WorkItem>` — a fully open update object:

  ```typescript
  // workItemStore.ts line 71
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  ```

  The field allowlist in the route handler is enforced in the route layer, not in the store layer. However, this is also the attack surface: if a future caller adds a field to the route's `allowedFields` array, or calls `store.updateWorkItem` directly from another service path, `status`, `deleted`, `changeHistory`, `assessments`, etc. can all be overwritten arbitrarily.

  More immediately: the `PATCH` route does not validate `blockedBy` array entries as valid UUIDs before calling `setDependencies`. Arbitrary strings in the `blockedBy` array pass through to `addDependency`, which calls `store.findById(blockerId)` — if not found, it throws an error. But this reveals internal error messaging including the blocker ID format expectations.

  **Secondary:** `store.updateWorkItem` is called in `onItemResolved` (cascade dispatch, `dependency.ts` lines 294–299) with `status: WorkItemStatus.InProgress` and `assignedTeam: team` — these are set by the cascade logic without any status-transition validation against `VALID_STATUS_TRANSITIONS`. An item could be cascaded to `InProgress` from statuses other than `Approved` if the check at line 274 is bypassed.
- **Potential Exploit Path:**
  1. Create two work items A and B.
  2. `POST /api/work-items/A/dependencies` with `{"action": "add", "blockerId": "B"}`.
  3. Approve A manually (PEN-003).
  4. Reject B via `POST /api/work-items/B/reject` with `{"reason": "done"}`.
  5. Cascade `onItemResolved` fires — A gets auto-dispatched to `InProgress` without going through the normal dispatch endpoint's team validation.
- **Red Team Handoff Notes:**
  - Test `PATCH /api/work-items/{id}` with `{"status": "completed"}` in the body — the allowedFields check should block this, but verify the store is not updated.
  - Test `PATCH /api/work-items/{id}` with `{"blockedBy": ["not-a-uuid", "also-not-valid"]}` — verify error messages don't expose internals.
  - Execute the cascade-dispatch exploit path above; verify that item A reaches `InProgress` without a manual dispatch call.

---

### PEN-008: Unauthenticated Prometheus Metrics Endpoint Leaks Operational Intelligence
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 34–37)
- **Vulnerability Description:**
  `GET /metrics` exposes a Prometheus-format metrics endpoint with no authentication. It reports operational counters including:
  - `workflow_items_created_total{source, type}` — reveals item creation rates by source and type
  - `workflow_items_routed_total{route}` — reveals how often fast-track vs full-review is used
  - `workflow_items_assessed_total{verdict}` — reveals assessment rejection rates
  - `workflow_items_dispatched_total{team}` — reveals team workload distribution
  - Default Node.js process metrics (heap size, GC stats, event loop lag)

  This information enables an attacker to time attacks (e.g., during low-activity periods), infer organizational workflow patterns, and identify reconnaissance opportunities.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — full Prometheus metrics dump.
  2. Parse label values to enumerate valid `source`, `type`, `team`, `route`, `verdict` values.
  3. Use metric deltas over time to detect when new items are being processed.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` and parse the output.
  - After creating work items or triggering workflow actions, diff the metrics to confirm counter increments reveal internal state.

---

### PEN-009: No Input Length Validation — Memory Exhaustion DoS
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 24–25); `Source/Backend/src/routes/intake.ts` (lines 14–15)
- **Vulnerability Description:**
  Neither `POST /api/work-items` nor the intake webhook endpoints validate the length of `title` or `description`. `express.json()` accepts the default 100KB body limit, which means a request body up to 100KB is valid. However, `title` and `description` values are stored in the in-memory `Map` and included in every `findAll()` result set, every `getActivity()` result set (via `changeHistory` entries), and every `getQueue()` result set. Submitting many items with maximum-size descriptions causes unbounded memory growth.

  No rate limiting middleware is installed (confirmed via `package.json` — no `express-rate-limit` or similar).
- **Potential Exploit Path:**
  1. Script sends 1,000+ `POST /api/work-items` requests with 99KB descriptions.
  2. In-memory Map grows without bound, consuming all available heap.
  3. Node.js OOM kill or severe performance degradation for all subsequent requests.
- **Red Team Handoff Notes:**
  - Payload: `{"title": "x", "description": "A".repeat(99000), "type": "bug", "priority": "low", "source": "manual"}`.
  - Monitor `GET /metrics` → `nodejs_heap_used_bytes` before and after batch insertion.
  - Also attempt via intake: `POST /api/intake/automated` with same oversized description (no length check there either).

---

### PEN-010: NaN Injection via Pagination Parameters — Silent Data Truncation
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 68–71); `Source/Backend/src/routes/dashboard.ts` (lines 17–18)
- **Vulnerability Description:**
  `parseInt(req.query.page as string, 10)` returns `NaN` when the query parameter is non-numeric. The `findAll` function uses the resulting `NaN` in arithmetic:

  ```typescript
  const offset = (page - 1) * limit; // NaN
  const data = result.slice(NaN, NaN); // returns []
  ```

  The API returns `HTTP 200 {"data": [], "total": N, "page": NaN, "limit": NaN, "totalPages": N}` — a confusing response that could cause client-side logic errors or mask actual data. An attacker can use this to obscure enumeration (a client that trusts `data.length === 0` to mean no results would not retry). Also `totalPages: Infinity` if both total and limit are NaN.
- **Potential Exploit Path:**
  1. `GET /api/work-items?page=INJECT&limit=INJECT` → 200 with empty data array.
  2. Client receives `{data: [], total: 47, page: NaN, limit: NaN}` — client assumes no data.
- **Red Team Handoff Notes:**
  - `curl "http://localhost:3001/api/work-items?page=NaN&limit=abc"` — verify response body.
  - `curl "http://localhost:3001/api/work-items?page=-1&limit=-1"` — negative page/limit: `slice(-20, -20)` returns empty array.
  - `curl "http://localhost:3001/api/work-items?page=0"` — page 0: offset = (0-1)*20 = -20, `slice(-20, 0)` returns `[]`.

---

### PEN-011: Assessment Records Accumulate Unboundedly on Repeated Calls
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts` (lines 207–210)
- **Vulnerability Description:**
  The `POST /api/work-items/:id/assess` endpoint allows re-assessment of items already in `reviewing` status. Each call appends a new set of 4 assessment records (`requirements-reviewer`, `domain-expert`, `work-definer`, `pod-lead`) to the item's `assessments` array:

  ```typescript
  // assessment.ts line 208
  const allAssessments = [...item.assessments, ...result.assessments];
  ```

  Since `Reviewing` is an allowed input status, calling assess repeatedly (100+ times) bloats the `assessments` array to thousands of entries. All assessment records are returned in every `GET /api/work-items/:id` response and included in `getActivity()` aggregation. This enables a targeted memory/bandwidth exhaustion attack against specific items.
- **Potential Exploit Path:**
  1. Create a work item, route it (ends in `proposed`), call `assess` once (ends in `rejected` or `approved`).
  2. If rejected: the item can be transitioned back to `backlog` (per `VALID_STATUS_TRANSITIONS`), then re-routed to `proposed`, then `assess` again — each cycle adds 4 assessment records.
  3. Alternatively, if the item ends in `reviewing` (due to repeated assess calls), each assess call adds 4 more records directly.

  Wait — on closer inspection: `assess` in `assessment.ts` immediately transitions `reviewing → approved/rejected`. So the only way to re-assess is to cycle through `rejected → backlog → routing → proposed → reviewing` again. But this is still exploitable.
- **Red Team Handoff Notes:**
  - Automate the cycle: create → route → assess (rejected) → [there's no rejected→backlog endpoint visible in workflow routes — verify if this transition is achievable].
  - Check if `PATCH` can force `status: "backlog"` (should be blocked by allowedFields, but verify).
  - Check size of item payload after N assess cycles via `GET /api/work-items/{id}`.

---

### PEN-012: Soft-Deleted Items Leak Internal IDs via Dependency Error Messages
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` (lines 172–210); `Source/Backend/src/routes/workflow.ts` (lines 330–351)
- **Vulnerability Description:**
  `store.findById()` returns `undefined` for soft-deleted items (treating them as non-existent). When `removeDependency` is called with a `blockerId` that refers to a soft-deleted item, `store.findById(blockerId)` returns `undefined` — but the code continues silently (comment: "blocker may be soft-deleted"). However, in `addDependency`, calling with a soft-deleted `blockerId` throws:

  ```
  Error: Work item {blockerId} not found
  ```

  This error is surfaced to the client via the dependency endpoint's error handler (workflow.ts lines 337–340), which returns `{"error": "Work item {blockerId} not found"}`. This confirms the existence of a previously-deleted item — an IDOR enumeration oracle. An attacker can probe UUIDs to determine which IDs exist (or existed) in the system.

  Additionally, soft-deleted items that are `blockerItemId` in dependency links on other items may never be cleaned up — `computeHasUnresolvedBlockers` calls `store.findById(link.blockerItemId)` which returns `undefined` for deleted items, and the code treats `undefined` as "unresolved":
  ```typescript
  if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
    return true; // treat deleted blocker as unresolved!
  }
  ```
  This means deleting a blocker causes its dependents to be permanently blocked from dispatch.
- **Potential Exploit Path:**
  1. Enumerate UUIDs by sending `POST /api/work-items/{guessed-uuid}/dependencies` with `{"action": "add", "blockerId": "{target-uuid}"}`.
  2. If response is `404 {"error": "Work item {target-uuid} not found"}` — target never existed.
  3. If response is `404 {"error": "Work item {target-uuid} not found"}` — same message for deleted items. (The oracle is less useful here since the error message is identical for "never existed" and "soft-deleted".)
  4. More critically: `DELETE /api/work-items/{blocker-id}` — verify that all items blocked by the now-deleted item are stuck in `hasUnresolvedBlockers: true` and cannot be dispatched.
- **Red Team Handoff Notes:**
  - Create item A (blocker) and item B (blocked by A). Verify dispatch of B is blocked.
  - Soft-delete A via `DELETE /api/work-items/A`.
  - Attempt dispatch of B: `POST /api/work-items/B/dispatch` — expect `400: unresolved blocking dependencies` even though A is deleted.
  - This directly achieves the red-team objective: **"Access or modify a soft-deleted work item via direct ID reference."**

---

### PEN-013: No Complete/Fail Endpoint — InProgress Items Are Permanently Stuck
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (all endpoints); `Source/Shared/types/workflow.ts` (line 221)
- **Vulnerability Description:**
  `VALID_STATUS_TRANSITIONS` defines that `InProgress` items can transition to `Completed` or `Failed`. However, no API endpoint implements these transitions:
  - `POST /api/work-items/:id/complete` — does not exist
  - `POST /api/work-items/:id/fail` — does not exist

  Once an item reaches `InProgress` (via dispatch or cascade-dispatch), it cannot be advanced further through the state machine via any documented API endpoint. The cascade auto-dispatch in `onItemResolved` only fires on `Completed` or `Rejected` status, but `Completed` is unreachable via the API. This means:
  1. Items that depend on an `InProgress` blocker will never be cascade-dispatched.
  2. The state machine is effectively incomplete.
  3. A malicious actor could use cascade dispatch (via reject) to move items to `InProgress`, then no further state changes are possible.
- **Potential Exploit Path:**
  1. Dispatch a work item to `InProgress` status.
  2. Attempt all known endpoints against it — none accept `InProgress` as valid input.
  3. Item is permanently stuck. The only recovery is a hard restart (in-memory store reset).
- **Red Team Handoff Notes:**
  - After dispatching an item, attempt `POST /api/work-items/{id}/route`, `assess`, `approve`, `reject` — all should 400 (wrong status).
  - Verify no hidden endpoint handles `Complete` or `Fail` transitions (check Express route registration in `app.ts` — no additional routers beyond the four registered).
  - Attempt `PATCH /api/work-items/{id}` with `{"status": "completed"}` — should be blocked by `allowedFields`, but verify.

---

## Attack Surface Summary Table

| ID | Title | Severity | Entry Point | Key Exploit |
|----|-------|----------|-------------|-------------|
| PEN-001 | No Authentication/Authorization | **Critical** | All endpoints | Unauthenticated full access |
| PEN-002 | Fast-Track Override Bypasses Assessment | **Critical** | `POST /api/work-items/:id/route` | `{"overrideRoute":"fast-track"}` |
| PEN-003 | Manual Approve Bypasses Assessment | **Critical** | `POST /api/work-items/:id/approve` | Empty body, no auth |
| PEN-004 | Intake Webhook No Signature Verification | **High** | `POST /api/intake/zendesk`, `/automated` | Unauthenticated item injection |
| PEN-005 | Intake Invalid Enum Values Accepted | **High** | `POST /api/intake/*` | Arbitrary type/priority strings |
| PEN-006 | Unbounded Pagination Full Enumeration | **High** | `GET /api/work-items`, `/dashboard/activity` | `?limit=999999` |
| PEN-007 | Cascade Dispatch Bypasses Team Validation | **High** | `POST /api/work-items/:id/reject` (indirect) | Delete blocker → blocked item stuck |
| PEN-008 | Prometheus Metrics Unauthenticated | **Medium** | `GET /metrics` | Operational intelligence leak |
| PEN-009 | No Input Length Validation — DoS | **Medium** | `POST /api/work-items`, `/intake/*` | 99KB description × N requests |
| PEN-010 | NaN Pagination Injection | **Medium** | `GET /api/work-items` | `?page=abc&limit=xyz` |
| PEN-011 | Assessment Records Accumulate Unboundedly | **Medium** | `POST /api/work-items/:id/assess` | Repeated assess cycles |
| PEN-012 | Soft-Delete Blocker Permanently Blocks Dependents | **Low** | `DELETE /api/work-items/:id` | Delete blocker → dependents stuck |
| PEN-013 | Missing Complete/Fail Endpoints — State Machine Gap | **Low** | `POST /api/work-items/:id/dispatch` | Items stuck in InProgress forever |

---

## Red-Team Objective Mapping

| Red-Team Objective | Mapped Finding(s) | Likelihood |
|---|---|---|
| Bypass work item state machine to reach invalid status | PEN-002, PEN-003 | **High** — trivial with `overrideRoute: "fast-track"` |
| Access or modify a soft-deleted work item via direct ID | PEN-012 | **Medium** — deleted blockers permanently block dependents |
| Submit malformed assessment verdict bypassing routing logic | PEN-005, PEN-002 | **High** — invalid enum via intake; fast-track skips assess entirely |
| Enumerate all work items without pagination limit enforcement | PEN-006 | **High** — `?limit=999999` works with no auth |

---

## Notes for Red-Teamer

1. **Start with PEN-001 baseline confirmation** before chaining exploits — confirm all endpoints require no auth.
2. **PEN-002 is the highest-value exploit**: a single `POST /route` call with `{"overrideRoute":"fast-track"}` directly achieves the state-machine bypass objective.
3. **PEN-006** is trivially verifiable and achieves the enumeration objective.
4. **PEN-012** requires a two-step setup (create dependency then delete blocker) but permanently breaks the dependent's dispatch capability.
5. The in-memory store resets on server restart — exploits must be chained within a single server session unless the server is persistent.
6. No CSRF protection, no rate limiting, no helmet.js headers — all requests can be made via plain `curl`.
