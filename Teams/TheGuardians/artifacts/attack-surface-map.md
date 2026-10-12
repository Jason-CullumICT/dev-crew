# Attack Surface Map
**Team:** TheGuardians  
**Agent:** pen_tester  
**Date:** 2026-10-12  
**Target:** dev-crew Source App — Backend API (`http://localhost:3001`)  
**Analysis Type:** White-box static analysis  
**Scope:** `Source/Backend/`, `Source/Shared/`  

---

## Critical Entry Points Mapped

| Endpoint | File | Risk Level |
|---|---|---|
| `POST /api/work-items` | `routes/workItems.ts:21` | High |
| `GET /api/work-items` | `routes/workItems.ts:60` | High |
| `GET /api/work-items/:id` | `routes/workItems.ts:78` | High |
| `PATCH /api/work-items/:id` | `routes/workItems.ts:88` | High |
| `DELETE /api/work-items/:id` | `routes/workItems.ts:141` | High |
| `POST /api/work-items/:id/route` | `routes/workflow.ts:39` | Critical |
| `POST /api/work-items/:id/assess` | `routes/workflow.ts:67` | High |
| `POST /api/work-items/:id/approve` | `routes/workflow.ts:94` | Critical |
| `POST /api/work-items/:id/reject` | `routes/workflow.ts:145` | Critical |
| `POST /api/work-items/:id/dispatch` | `routes/workflow.ts:212` | Critical |
| `POST /api/work-items/:id/dependencies` | `routes/workflow.ts:302` | High |
| `GET /api/work-items/:id/ready` | `routes/workflow.ts:355` | Medium |
| `POST /api/intake/zendesk` | `routes/intake.ts:11` | High |
| `POST /api/intake/automated` | `routes/intake.ts:34` | High |
| `GET /api/dashboard/summary` | `routes/dashboard.ts:9` | Medium |
| `GET /api/dashboard/activity` | `routes/dashboard.ts:16` | Medium |
| `GET /api/dashboard/queue` | `routes/dashboard.ts:26` | Medium |
| `GET /metrics` | `app.ts:34` | Medium |

---

## Findings

---

### PEN-001: Entire API Exposed Without Authentication or Authorization
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:1-54` — all routes
- **Vulnerability Description:** The Express application has zero authentication middleware applied globally or per-route. Every endpoint — including state-transitioning actions (approve, reject, dispatch), webhook intake, and dashboard — is accessible with no credentials whatsoever. There is no JWT validation, API key check, session middleware, or any access-control layer.
- **Potential Exploit Path:**
  1. Send any HTTP request to any endpoint with no `Authorization` header
  2. Express processes the request; no middleware intercepts or rejects it
  3. Full CRUD, workflow state transitions, and admin actions are executed against the in-memory store
- **Red Team Handoff Notes:**
  - Confirm with: `curl -X POST http://localhost:3001/api/work-items -H "Content-Type: application/json" -d '{"title":"pwned","description":"no auth required at all","type":"bug","priority":"high","source":"manual"}'`
  - Then immediately approve it: `curl -X POST http://localhost:3001/api/work-items/<id>/approve -H "Content-Type: application/json" -d '{}'`
  - No token needed. Every downstream finding assumes this is confirmed — it is the root enabler for all other findings.

---

### PEN-002: Manual Approve Endpoint — Zero Privilege Check, Bypasses Assessment Pod
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:94-142`
- **Vulnerability Description:** `POST /api/work-items/:id/approve` allows any unauthenticated actor to manually approve any work item currently in `proposed`, `reviewing`, or `routing` status. The endpoint accepts an optional `reason` string (no validation) and immediately transitions the item to `approved`, inserting a `manual-override` change history entry. The assessment pod process (FR-WF-005) is entirely skipped. There is no role check, no admin flag, no token — nothing prevents an anonymous actor from approving items.
- **Potential Exploit Path:**
  1. Create any work item (`POST /api/work-items`) → status: `backlog`
  2. Route it (`POST /api/work-items/:id/route`) → status: `proposed` (full-review path)
  3. POST to `/api/work-items/:id/approve` with any body → status: `approved`, bypassing assessment
  4. Dispatch immediately (`POST /api/work-items/:id/dispatch`) → status: `in-progress`
  5. Item has gone from `backlog` to `in-progress` without ever entering the assessment pod
- **Red Team Handoff Notes:**
  - Full chain: create → route → approve → dispatch (four requests, no auth, no assessment)
  - Try with empty body: `curl -X POST http://localhost:3001/api/work-items/<id>/approve -H "Content-Type: application/json" -d '{}'`
  - Confirm `changeHistory` shows `manual-override` agent and `assessment` records are absent
  - This is the primary pentest objective: bypass state machine to reach `in-progress` without assessment

---

### PEN-003: Fast-Track Route Override Allows Immediate Approval Without Review
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:39-64`, `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:** `POST /api/work-items/:id/route` accepts an `overrideRoute` field. When set to `"fast-track"`, `classifyRoute()` skips all classification logic and returns `targetStatus: WorkItemStatus.Approved` directly. This transitions the item from `backlog` → `approved` in a single request, bypassing the assessment pod entirely. No privilege check gates the use of `overrideRoute`. Any unauthenticated actor on any item type (including `feature`, which should always require full review per spec FR-WF-004) can force fast-track.
- **Potential Exploit Path:**
  1. Create a `feature` work item (normally requires full-review + assessment)
  2. POST `{ "overrideRoute": "fast-track" }` to `/api/work-items/:id/route`
  3. `classifyRoute()` at `router.ts:67-74` returns `Approved` regardless of item type/complexity
  4. Item status becomes `approved` — spec-mandated full-review bypassed
  5. Dispatch immediately → item in-progress with no review
- **Red Team Handoff Notes:**
  - Payload: `{"overrideRoute": "fast-track"}`
  - Test specifically with `type: "feature"` which the spec mandates always goes full-review
  - Confirm item's `route` field shows `fast-track` in response and status is `approved`
  - This directly satisfies the objective: "Bypass work item state machine to reach an invalid status"

---

### PEN-004: Unbounded Pagination `limit` — Mass Data Extraction / Memory DoS
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68-74`, `Source/Backend/src/routes/dashboard.ts:18`
- **Vulnerability Description:** The `GET /api/work-items` and `GET /api/dashboard/activity` endpoints read the `limit` query parameter directly via `parseInt` with no maximum cap. A single request with `?limit=1000000` forces the server to serialize and return every work item in memory as a single JSON payload. For the dashboard activity endpoint, this is compounded: `getActivity()` flattens ALL change history entries from ALL items before slicing, so the in-memory allocation scales as `O(items × historyEntries)`.
- **Potential Exploit Path:**
  1. Seed the store with items (or use pre-existing items)
  2. `GET /api/work-items?limit=999999999&page=1`
  3. Server loads all items, serializes them to JSON, and returns in one response
  4. For dashboard: `GET /api/dashboard/activity?limit=999999999` — server builds a flat array of all history entries across all items before slicing
  5. Memory exhaustion or extreme latency under load
- **Red Team Handoff Notes:**
  - Confirm: `curl "http://localhost:3001/api/work-items?limit=999999"` — verify no cap is enforced in the response `limit` field
  - Also satisfies pentest objective: "Enumerate all work items without pagination limit enforcement"
  - `page=-1` causes `result.slice(-40, -20)` — returns items from the END of the sorted array, reversing expected ordering without error. Test this as a secondary probe.
  - `page=abc` → `parseInt('abc')` = `NaN` → `result.slice(NaN, NaN)` = `[]` — returns empty `data` with `total > 0`, a potential oracle for probing item existence.

---

### PEN-005: Intake Webhook Endpoints Skip Enum Validation on `type` and `priority`
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:19-25`, `Source/Backend/src/routes/intake.ts:42-48`
- **Vulnerability Description:** `POST /api/intake/zendesk` and `POST /api/intake/automated` use `body.type || WorkItemType.Bug` and `body.priority || WorkItemPriority.Medium` without validating the provided values against the `WorkItemType` and `WorkItemPriority` enums. This means arbitrary string values for `type` and `priority` are stored verbatim in the in-memory store. By contrast, `POST /api/work-items` (lines 29-36 of workItems.ts) validates both fields against enum values. The intake paths have no such guard.
- **Potential Exploit Path:**
  1. POST to `/api/intake/zendesk` with `{ "title": "test", "description": "test desc", "type": "admin", "priority": "zero-day" }`
  2. The `||` fallback only triggers on falsy values — a non-empty string passes through
  3. `store.createWorkItem()` accepts the raw strings without validation
  4. Work item is created with `type: "admin"` and `priority: "zero-day"`
  5. Routing logic in `router.ts` may behave unexpectedly: `isFastTrack()` checks `item.type === WorkItemType.Bug` which won't match, so it falls through to `isFullReview()` → full-review always returns `true` as default. Assessment logic similarly has `switch (item.type)` with no `default` case in `assessAsWorkDefiner()` — silently emits no suggestions.
- **Red Team Handoff Notes:**
  - Payload: `{"title":"T","description":"D","type":"__proto__","priority":"constructor"}`
  - Also test prototype pollution angle: `{"title":"T","description":"D","type":"__proto__","priority":"high"}`
  - Check response — if item is created, confirm `type` field in response shows the injected value
  - Check downstream routing and assessment behavior with invalid type values

---

### PEN-006: Soft-Deleted Blocker Permanently Blocks Dependent Item Dispatch
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64-75`, `Source/Backend/src/store/workItemStore.ts:23-27`
- **Vulnerability Description:** When a blocker work item is soft-deleted via `DELETE /api/work-items/:id`, its `deleted` flag is set but the reverse index (`blockedBy` arrays in dependent items) is NOT cleaned up. `findById()` returns `undefined` for deleted items. In `computeHasUnresolvedBlockers()` at `dependency.ts:64-75`:
  ```typescript
  const blocker = store.findById(link.blockerItemId); // returns undefined for deleted items
  if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
    return true; // !blocker → true — deleted item treated as still blocking!
  }
  ```
  A soft-deleted blocker is indistinguishable from a missing (never existed) blocker, both causing `computeHasUnresolvedBlockers` to return `true`. The dependent item's dispatch is permanently blocked with no recovery path via the API.
- **Potential Exploit Path:**
  1. Create items A (blocker) and B (dependent, to be blocked by A)
  2. Add dependency: B is blocked by A
  3. Route and approve B
  4. Soft-delete A via `DELETE /api/work-items/A_id`
  5. Attempt to dispatch B: `computeHasUnresolvedBlockers(B)` finds `link.blockerItemId = A_id`, calls `findById(A_id)` → `undefined`, returns `true` → dispatch blocked
  6. B is in `approved` status but cannot be dispatched — permanently stuck
- **Red Team Handoff Notes:**
  - Confirm the block by: create A, create B, set B blockedBy A, approve B, delete A, try `POST /api/work-items/B_id/dispatch`
  - Expected response: `400 Cannot dispatch: work item has unresolved blocking dependencies`
  - This satisfies objective: "Access or modify a soft-deleted work item via direct ID reference" (inverse — the deleted item's ghost reference is the exploit)
  - Note: `onItemResolved()` is only called during rejection, not during soft-delete, so no cascade cleanup occurs

---

### PEN-007: Unauthenticated Bulk Dependency Replacement via PATCH
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:120-129`
- **Vulnerability Description:** The `PATCH /api/work-items/:id` endpoint accepts a `blockedBy` array in the request body and calls `setDependencies(item.id, body.blockedBy)`, which atomically replaces ALL existing dependencies. This is a workflow-critical operation — modifying dependencies affects whether items can be dispatched — yet it is accessible to any unauthenticated actor. An attacker can silently clear all blocking dependencies from any approved item to force it through dispatch, or inject new blocker references to deny-of-service a target item.
- **Potential Exploit Path:**
  1. Create items A (blocker) and B (waiting, in approved status, blocked by A)
  2. Attacker PATCHes B with `{ "blockedBy": [] }` → `setDependencies` removes all blockers
  3. B's `hasUnresolvedBlockers` is now `false`; `blockedBy` is empty
  4. Attacker dispatches B: `computeHasUnresolvedBlockers` returns `false` → dispatch succeeds
  5. B is dispatched to `in-progress` despite its blocker (A) not being resolved
- **Red Team Handoff Notes:**
  - Payload: `PATCH /api/work-items/<B_id>` with body `{"blockedBy": []}`
  - Verify B's readiness check before and after: `GET /api/work-items/<B_id>/ready`
  - Then dispatch B and confirm it succeeds

---

### PEN-008: Prometheus Metrics Endpoint Publicly Accessible
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`
- **Vulnerability Description:** `GET /metrics` is mounted without any authentication guard. It exposes Prometheus-formatted operational metrics including: item creation counts broken down by source and type (`items_created_total`), dispatch counts by team, assessment verdicts, dependency operation counts, and dispatch gating events. This provides an attacker with intelligence about system scale, team assignments, and operational patterns without any credentials.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics`
  2. Response includes `items_created_total{source="zendesk",type="bug"}`, `items_dispatched_total{team="TheATeam"}`, cycle detection rates, etc.
  3. Attacker can infer relative volume, active teams, error rates, and timing patterns
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` — confirm no auth required
  - Document which counters are exposed and what operational intelligence they leak

---

### PEN-009: Cascade Dispatch Exploit — Force Auto-Dispatch via Reject-After-Approve Pattern
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:192-208`, `Source/Backend/src/services/dependency.ts:251-315`
- **Vulnerability Description:** When an item is rejected, `onItemResolved()` automatically dispatches any dependent items that are (a) in `Approved` status and (b) no longer have unresolved blockers. An attacker can exploit this cascade mechanism to force auto-dispatch of a target item without going through the normal dispatch endpoint. Combined with PEN-002 (unauthenticated approve) and PEN-003 (fast-track override), the attacker can construct a chain that bypasses the entire intended dispatch authorization model.
- **Potential Exploit Path:**
  1. Create item A (sacrificial blocker) — any type, route it normally → approved
  2. Create item B (target) — route → approve via PEN-002 (unauthenticated manual approve)
  3. Add dependency: B is blocked by A (`POST /api/work-items/B_id/dependencies` with `{action:"add", blockerId: A_id}`)
  4. B is now `approved` but blocked by A
  5. Reject A: `POST /api/work-items/A_id/reject` with `{"reason":"exploit"}`
  6. `onItemResolved(A_id)` fires → B is now unblocked, in `Approved` status → auto-dispatches B
  7. B transitions to `in-progress` via cascade dispatcher, bypassing the `/dispatch` endpoint's team validation
- **Red Team Handoff Notes:**
  - The cascade dispatch at `dependency.ts:278-297` does NOT validate the team name — it calls `assignTeam(dependent)` directly, but the returned team string also isn't re-validated. This differs from the `/dispatch` endpoint which validates `team !== 'TheATeam' && team !== 'TheFixer'`
  - Confirm: item B transitions to `in-progress` after step 5 without calling `POST /api/work-items/B_id/dispatch`
  - Check `changeHistory` — `agent` field should show `cascade-dispatcher`

---

### PEN-010: Missing CORS Headers — Cross-Origin Request Exposure
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:1-54`
- **Vulnerability Description:** No CORS middleware (`cors` package or equivalent) is configured. Express defaults do not add `Access-Control-Allow-Origin` headers, which means browser-based CORS preflight requests may be rejected — but this also means no explicit CORS policy exists. Since all API endpoints accept `application/json` and no CSRF token is required, a malicious page using `fetch()` with pre-flight credentials from a same-origin context could make unauthenticated state-changing requests.
- **Potential Exploit Path:**
  1. Host malicious page that performs `fetch('http://localhost:3001/api/work-items/<id>/approve', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'})`
  2. Since there is no auth and no CSRF token, the request succeeds from any origin that can reach the server
- **Red Team Handoff Notes:**
  - Test with a `curl -H "Origin: http://evil.example.com"` preflight: `curl -X OPTIONS http://localhost:3001/api/work-items -H "Origin: http://evil.example.com" -H "Access-Control-Request-Method: POST" -v`
  - Check response headers for `Access-Control-Allow-Origin`

---

### PEN-011: Sequential Predictable Document IDs Enable Enumeration
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts:12-16`
- **Vulnerability Description:** `generateDocId()` produces sequential identifiers `WI-001`, `WI-002`, `WI-003`, etc. from a server-side counter. The primary `id` field uses UUID v4 (non-predictable), but `docId` is returned in all API responses and is predictable. While the primary lookups use UUID, the predictable `docId` enables an attacker to enumerate the total number of items ever created (even deleted ones, since the counter never resets) and estimate system activity. More critically, `docId` values appear in change history `notes` fields, revealing internal operational events.
- **Potential Exploit Path:**
  1. Create one item → observe `docId: "WI-001"` in response
  2. Create a second item → observe `docId: "WI-002"`
  3. Attacker now knows the server has allocated at least N work items (counter is monotonically increasing, never reset between items)
  4. Check dashboard `activity` endpoint — `docId` values in history notes reveal which items interacted with each other
- **Red Team Handoff Notes:**
  - Create a fresh item and check its `docId` to determine total historical item count (counter ≠ current active items — deleted items increment the counter too)
  - This is an IDOR-adjacent finding since it provides enumeration capability

---

### PEN-012: No Length Validation on Free-Text Fields — Potential Memory Pressure
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:24`, `Source/Backend/src/routes/workflow.ts:150`
- **Vulnerability Description:** Text fields `title`, `description` (create/update), and `reason` (reject) have no maximum length validation. Express's `express.json()` default body size limit is 100KB, which partially mitigates this. However, there is no per-field character limit, and the `description` field in particular is stored in memory and included in every `findAll()` result, change history export, and dashboard activity response.
- **Potential Exploit Path:**
  1. Create items with 99KB `description` values
  2. `getActivity()` in `dashboard.ts` iterates ALL items and ALL their change history, building a flat array — large descriptions in change history notes multiply the memory footprint
- **Red Team Handoff Notes:**
  - Test with `description` near the 100KB Express limit
  - Combine with PEN-004 (no pagination cap) for amplified effect

---

### PEN-013: NaN / Negative Pagination Values Not Validated — Response Oracle
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:69-72`, `Source/Backend/src/routes/dashboard.ts:18`
- **Vulnerability Description:** Pagination parameters `page` and `limit` are parsed via `parseInt` with no validation for NaN, negative values, or zero:
  - `page=abc` → `parseInt('abc')` = `NaN` → `offset = (NaN-1)*20 = NaN` → `result.slice(NaN, NaN)` = `[]` — returns empty data despite `total` being non-zero, creating a response oracle
  - `page=-1` → `offset = (-1-1)*20 = -40` → `result.slice(-40, -20)` — returns items from the END of the sorted array (most recently created), bypassing expected LIFO ordering
  - `limit=0` → `totalPages = Math.ceil(total/0) = Infinity` — returns 0 items per page with infinite `totalPages` in response
- **Potential Exploit Path:**
  1. `GET /api/work-items?page=-1` — receives items from end of sorted array without indication this is non-standard behavior
  2. `GET /api/work-items?page=abc` — receives `{data:[], total: N}` confirming N items exist without viewing any
- **Red Team Handoff Notes:**
  - Test all three cases: `page=abc`, `page=-1`, `limit=0`
  - Verify `total` field leaks item count even when `data` is empty (NaN case)

---

## Summary

| ID | Severity | Title |
|---|---|---|
| PEN-001 | Critical | No Authentication/Authorization on Entire API |
| PEN-002 | Critical | Manual Approve Bypasses Assessment Pod — No Privilege Check |
| PEN-003 | Critical | Fast-Track Override Forces Immediate Approval on Any Item |
| PEN-004 | High | Unbounded Pagination `limit` — Mass Extraction / DoS |
| PEN-005 | High | Intake Webhooks Skip Enum Validation — Arbitrary Type/Priority Stored |
| PEN-006 | High | Soft-Deleted Blocker Permanently Blocks Dependent Dispatch |
| PEN-007 | High | Unauthenticated Bulk Dependency Replacement via PATCH |
| PEN-008 | Medium | Prometheus `/metrics` Publicly Accessible |
| PEN-009 | High | Cascade Dispatch Exploit — Auto-Dispatch via Reject-After-Approve |
| PEN-010 | Medium | No CORS Headers — Cross-Origin Request Policy Absent |
| PEN-011 | Medium | Sequential Predictable Document IDs Enable Item Count Enumeration |
| PEN-012 | Low | No Length Validation on Free-Text Fields |
| PEN-013 | Medium | NaN/Negative Pagination Values — Response Oracle |

**Total:** 13 findings — 3 Critical, 5 High, 4 Medium, 1 Low

---

## Red Team Priority Order

1. **PEN-001** — Confirm zero-auth baseline (required for all others)
2. **PEN-002** → **PEN-003** — State machine bypass chains (primary pentest objectives)
3. **PEN-009** — Cascade dispatch exploit (secondary state machine bypass)
4. **PEN-006** — Soft-deleted blocker locking (data integrity objective)
5. **PEN-004** + **PEN-013** — Pagination abuse (enumeration objective)
6. **PEN-007** — Dependency manipulation (workflow integrity)
7. **PEN-005** — Intake enum bypass (data corruption)
8. **PEN-008** — Metrics intelligence leak
9. **PEN-010** — CORS/CSRF (browser-based attack surface)
10. **PEN-011**, **PEN-012** — Lower severity, confirm as time permits
