# Attack Surface Map
**Generated:** 2026-06-22  
**Analyst:** pen-tester (static analysis)  
**Target:** dev-crew Source App — Workflow Engine Backend (http://localhost:3001)  
**Scope:** OWASP Top 10, white-box static analysis of Source/Backend, Source/Frontend, Source/Shared  
**Handoff to:** red-teamer for dynamic verification

---

## Executive Summary

The application has **zero authentication or authorization** on any API endpoint. Every operation — including creating, approving, rejecting, dispatching, and deleting work items — is fully anonymous. Three additional critical-severity chains are documented below. The red-teamer should prioritize PEN-001 through PEN-004.

**Findings Count:** 13 total — 3 Critical · 5 High · 4 Medium · 1 Low

---

## Critical Findings

---

### PEN-001: Complete Absence of Authentication on All API Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (entire file — no auth middleware registered)
- **Vulnerability Description:** The Express application mounts all route handlers with no authentication middleware. There is no JWT validation, session checking, API key verification, or any other identity mechanism anywhere in the middleware chain. `app.ts` registers: `express.json()`, a debug logging middleware, and then the route handlers directly. The backend has no dependency on any auth library (`package.json` lists only `express`, `prom-client`, `uuid`, `pino`).
- **Potential Exploit Path:**
  1. Send any HTTP request to any endpoint without any `Authorization` header or credentials.
  2. The server processes the request as fully authorized.
  3. All CRUD, state transitions, approvals, rejections, and dispatches succeed.
- **Red Team Handoff Notes:**
  - Verify that `GET http://localhost:3001/api/work-items` returns 200 with no `Authorization` header.
  - Verify that `POST http://localhost:3001/api/work-items/:id/approve` (on any item in `proposed`/`reviewing` status) succeeds with no credentials.
  - Try every critical entry point from the config: `/api/work-items`, `/api/work-items/:id`, `/api/work-items/:id/transition` (mapped to route/assess/approve/reject/dispatch), `/api/dashboard`.

---

### PEN-002: Intake Webhooks Lack Signature Verification — Arbitrary Work Item Injection
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` Lines 11–54
- **Vulnerability Description:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept any POST body with `title` and `description` fields and immediately create a work item. No `X-Zendesk-Webhook-Signature` HMAC-SHA256 verification is performed. No API key or shared secret is checked. The `type` and `priority` fields are taken from the request body without enum validation (lines 22–23 and 44–45): `type: body.type || WorkItemType.Bug`. If `body.type` is set to an invalid value (e.g., `"malicious_type"`), it is passed directly into the store because `intake.ts` performs no enum check (unlike `workItems.ts` which validates enums explicitly).
- **Potential Exploit Path:**
  1. POST to `http://localhost:3001/api/intake/zendesk` with body: `{"title":"Injected Item","description":"Forged Zendesk webhook","type":"malicious_type","priority":"critical"}`
  2. Server creates a work item with `source: "zendesk"` and `type: "malicious_type"` (bypasses enum constraints).
  3. Attacker floods the intake with thousands of forged tickets to saturate the in-memory store.
  4. Alternatively, inject carefully crafted items designed to be auto-fast-tracked (see PEN-004).
- **Red Team Handoff Notes:**
  - Payload A (forged Zendesk): `curl -s -X POST http://localhost:3001/api/intake/zendesk -H "Content-Type: application/json" -d '{"title":"pwned","description":"test injection","type":"invalid-type-value","priority":"critical"}'` — confirm `201` response and item persisted with invalid type.
  - Payload B (flood): Script 500+ rapid POSTs and confirm server degrades (in-memory Map unbounded).
  - Check response body for the raw `type` field — confirm it holds the unvalidated value.

---

### PEN-003: Unauthenticated Fast-Track Override — Assessment Pod Bypass
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` Lines 39–64; `Source/Backend/src/services/router.ts` Lines 66–88
- **Vulnerability Description:** `POST /api/work-items/:id/route` accepts an optional `overrideRoute` body field. `classifyRoute()` in `router.ts` (line 66) checks: if `overrideRoute` is truthy, it uses it directly with **no caller identity or permission check**. Passing `overrideRoute: "fast-track"` sets `targetStatus = WorkItemStatus.Approved`, bypassing the entire Assessment Pod. Any item in `backlog` status can be pushed directly to `Approved` by any anonymous caller. Combined with PEN-001, this means any user can: create item → immediately fast-track approve it → immediately dispatch it.
- **Potential Exploit Path:**
  1. `POST /api/work-items` → create any item, receive `{id: "uuid-1", status: "backlog"}`.
  2. `POST /api/work-items/uuid-1/route` with body `{"overrideRoute":"fast-track"}` → item jumps to `status: "approved"` (skips proposed/reviewing/assessment).
  3. `POST /api/work-items/uuid-1/dispatch` with body `{"team":"TheATeam"}` → item dispatched to production team with no review.
  4. Full end-to-end pipeline bypass in 3 unauthenticated requests.
- **Red Team Handoff Notes:**
  - Step 1: `curl -s -X POST http://localhost:3001/api/work-items -H "Content-Type: application/json" -d '{"title":"Test bypass","description":"Fast-track exploit","type":"feature","priority":"critical","source":"manual"}'` — capture `id`.
  - Step 2: `curl -s -X POST http://localhost:3001/api/work-items/<id>/route -H "Content-Type: application/json" -d '{"overrideRoute":"fast-track"}'` — confirm `status` is `"approved"` in response.
  - Step 3: `curl -s -X POST http://localhost:3001/api/work-items/<id>/dispatch -H "Content-Type: application/json" -d '{"team":"TheATeam"}'` — confirm `status` is `"in-progress"`.
  - This directly achieves red-team objective: "Bypass work item state machine to reach an invalid status" (skipping proposed/reviewing).

---

## High Findings

---

### PEN-004: Unauthenticated Approve/Reject/Dispatch — Privilege Escalation via Workflow Actions
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` Lines 94–296
- **Vulnerability Description:** All workflow action endpoints — `/approve`, `/reject`, `/dispatch` — are unauthenticated and perform privileged operations. Anyone can: (a) manually approve any item in `proposed`/`reviewing`/`routing` status; (b) reject any item with a forged reason string; (c) dispatch any approved item to either team, overriding the auto-assignment logic. The `reason` field in approve/reject is stored in change history with no sanitization — it becomes part of the audit trail with attacker-controlled content.
- **Potential Exploit Path:**
  1. Find or create any item in `proposed` status (via `GET /api/work-items?status=proposed`).
  2. `POST /api/work-items/<id>/approve` with empty body `{}` — item jumps to `approved`.
  3. `POST /api/work-items/<id>/dispatch` with `{"team":"TheFixer"}` — item dispatched.
  4. Alternatively: `POST /api/work-items/<id>/reject` with `{"reason":"<attacker-controlled string>"}` — reason stored in change history.
- **Red Team Handoff Notes:**
  - Use `GET /api/work-items?status=proposed` to enumerate targets without pagination (combine with PEN-006).
  - Inject an oversized `reason` string (e.g., 50,000 chars) to probe for memory pressure in change history.
  - Verify change history audit trail contains the attacker-controlled `reason` field: `GET /api/work-items/<id>` → inspect `changeHistory[].reason`.

---

### PEN-005: No Upper Bound on Pagination — Full Data Enumeration in One Request
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` Lines 68–73; `Source/Backend/src/services/dashboard.ts` Lines 56–76
- **Vulnerability Description:** `GET /api/work-items?limit=<N>` passes `parseInt(N)` directly to `findAll()` with no cap. The store slices `result.slice(offset, offset + limit)` with no maximum. Similarly, `GET /api/dashboard/queue` calls `getQueue()` which iterates over all non-deleted items and returns them grouped — no pagination parameter accepted at all. `GET /api/dashboard/summary` also scans all items. This directly maps to security config objective: "Enumerate all work items without pagination limit enforcement."
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=9999999&page=1` — server loads ALL work items into a single JSON response.
  2. `GET /api/dashboard/queue` — server returns ALL items grouped by status, no size limit.
  3. Full data dump achieved in a single unauthenticated request.
- **Red Team Handoff Notes:**
  - Verify: `curl "http://localhost:3001/api/work-items?limit=999999"` — confirm `total` and `data.length` match.
  - Verify: `curl "http://localhost:3001/api/dashboard/queue"` — confirm full item list per status group.
  - After seeding 100+ items, confirm single-request retrieval of all items for the "Enumerate without pagination limit" objective.

---

### PEN-006: Soft-Deleted Items Create Permanent Dispatch Block (Dependency DoS)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` Lines 64–75; `Source/Backend/src/store/workItemStore.ts` Lines 22–27
- **Vulnerability Description:** `computeHasUnresolvedBlockers()` uses `store.findById(link.blockerItemId)` which returns `undefined` for soft-deleted items. At line 69: `if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) { return true; }`. A `undefined` (soft-deleted) blocker evaluates as `!blocker = true` → treated as **unresolved**. Therefore: add dependency A→B, then soft-delete A, and B's `hasUnresolvedBlockers` becomes permanently `true`. B can never be dispatched. Since `DELETE /api/work-items/:id` (soft-delete) is also unauthenticated, an attacker can weaponize this to permanently block any work item's dispatch.
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (to be sabotaged).
  2. `POST /api/work-items/B/dependencies` with `{"action":"add","blockerId":"<A-id>"}`.
  3. `DELETE /api/work-items/<A-id>` — soft-deletes A.
  4. `GET /api/work-items/B/ready` — returns `{"ready": false, "unresolvedBlockers": [...]}` permanently.
  5. Any attempt to `POST /api/work-items/B/dispatch` returns 400: "Cannot dispatch: work item has unresolved blocking dependencies".
  6. There is no API endpoint to force-clear `hasUnresolvedBlockers` on B.
- **Red Team Handoff Notes:**
  - Directly achieves red-team objective: "Access or modify a soft-deleted work item via direct ID reference" (variant: exploit it as an unremovable blocker).
  - Verify: after A is soft-deleted, the dependency link from `blockedBy` on B still references A's UUID. Confirm `GET /api/work-items/<B-id>/ready` returns `ready: false`.
  - Verify that `GET /api/work-items/<A-id>` returns 404 (item is hidden) but the reference in B's `blockedBy` array is still present.
  - Note: `removeDependency` in `dependency.ts` requires the `blockedId` to exist — it can be called on B to remove the dead link, but this is an unauthenticated PATCH, not a recovery mechanism — any attacker can re-add the link.

---

### PEN-007: Cascade Auto-Dispatch Triggered by Unauthenticated Rejection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` Lines 144–208; `Source/Backend/src/services/dependency.ts` Lines 251–315
- **Vulnerability Description:** `POST /api/work-items/:id/reject` calls `onItemResolved(id)` after rejection. `onItemResolved` auto-dispatches all dependent items in `Approved` status that are now unblocked — triggered by the `REJECTED` status being in `DISPATCH_TRIGGER_STATUSES`. This means: an attacker who can reject a blocker item causes all of its dependents (if `Approved` and otherwise unblocked) to be **automatically dispatched** to a production team without any human action. The cascade assigns teams via `assignTeam()` with no override or confirmation.
- **Potential Exploit Path:**
  1. Survey items: find a `blocker` item that is blocking several `Approved` items (via `/api/dashboard/queue` or `/api/work-items/:id`).
  2. Reject the blocker: `POST /api/work-items/<blocker-id>/reject` with any `reason` string.
  3. All `Approved` dependent items are immediately auto-dispatched.
  4. Result: batch dispatch of multiple items with no human authorization, potentially deploying incomplete work.
- **Red Team Handoff Notes:**
  - Directly achieves objective: "Bypass work item state machine to reach an invalid status" (auto-dispatch via rejection cascade).
  - Set up: create blocker B and 3 dependent items D1, D2, D3 in `Approved` status with B as their blocker.
  - Reject B → verify D1, D2, D3 all move to `in-progress` automatically.
  - Check `changeHistory` on D1–D3 — `agent` field will say `"cascade-dispatcher"`.

---

### PEN-008: Prometheus Metrics Endpoint Unauthenticated — System Reconnaissance
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` Lines 34–37; `Source/Backend/src/metrics.ts`
- **Vulnerability Description:** `GET /metrics` returns the full Prometheus registry output with no authentication. This includes `collectDefaultMetrics` which exports: `nodejs_version_info`, `process_cpu_seconds_total`, `process_open_fds`, `nodejs_heap_size_bytes_total`, `nodejs_gc_duration_seconds`, `nodejs_eventloop_lag_seconds`, plus all custom domain counters (`workflow_items_created_total`, `workflow_items_dispatched_total`, etc.). This exposes runtime internals, throughput data, and node.js version to any requester.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — no auth required.
  2. Extract `nodejs_version_info` → identify exact Node.js version for targeted CVE lookup.
  3. Extract `workflow_items_created_total` by source/type to understand system utilization patterns.
  4. Extract GC and memory metrics to time resource-exhaustion attacks during peak GC pressure.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` — record Node.js version and item counters.
  - Note: `process_open_fds` reveals file descriptor count — useful for DoS timing.

---

## Medium Findings

---

### PEN-009: Integer Parsing — No Validation on `page`/`limit` Query Parameters
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` Lines 69–70; `Source/Backend/src/routes/dashboard.ts` Lines 17–18
- **Vulnerability Description:** Both routes use `parseInt(req.query.X as string, 10)` with no validation for the result. Non-numeric strings produce `NaN`. In `findAll()`: `offset = (NaN - 1) * limit = NaN`; `result.slice(NaN, NaN + limit)` returns an empty array with no error. Additionally, `limit=0` causes `Math.ceil(total / 0) = Infinity` in `totalPages`, producing a JSON response with an `Infinity` value which is serialized as `null` in JSON. Negative `page` values produce negative offsets, also resulting in silently empty responses.
- **Potential Exploit Path:**
  1. `GET /api/work-items?page=abc&limit=-1` — server returns `{data:[], total:N, page:NaN, limit:-1, totalPages:NaN}` with HTTP 200.
  2. `GET /api/work-items?limit=0` — `totalPages` serializes as `null` in JSON response.
  3. These edge cases may confuse client-side pagination logic or hide available items.
- **Red Team Handoff Notes:**
  - Verify: `curl "http://localhost:3001/api/work-items?page=abc"` returns 200 with `data: []` and `page: null`.
  - Verify: `curl "http://localhost:3001/api/work-items?limit=0"` returns `totalPages: null`.

---

### PEN-010: `overrideRoute` Lacks Runtime Enum Validation
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` Line 57; `Source/Backend/src/services/router.ts` Lines 66–88
- **Vulnerability Description:** The route handler passes `body?.overrideRoute` to `routeWorkItem` with no runtime validation that it is a valid `WorkItemRoute` enum member. TypeScript's compile-time type safety doesn't apply to runtime request bodies. In `classifyRoute()`, the check is `if (overrideRoute === WorkItemRoute.FastTrack)` — if an invalid string is passed, it falls through to `FullReview` silently. While the blast radius is limited (invalid values don't cause fast-tracking), unexpected string values are stored in `item.route` field, corrupting data integrity.
- **Potential Exploit Path:**
  1. `POST /api/work-items/<backlog-id>/route` with body `{"overrideRoute":"INVALID_VALUE"}`.
  2. Server responds 200 with item now in `proposed` status (FullReview path).
  3. Item's `route` field is set to the invalid string `"INVALID_VALUE"` in the store.
  4. Subsequent clients reading `item.route` receive unexpected values.
- **Red Team Handoff Notes:**
  - `curl -X POST http://localhost:3001/api/work-items/<id>/route -H "Content-Type: application/json" -d '{"overrideRoute":"NOT_A_VALID_ROUTE"}'` — confirm `item.route` is `"NOT_A_VALID_ROUTE"` in response.

---

### PEN-011: Missing CORS Configuration — Cross-Origin API Access
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no `cors` middleware present)
- **Vulnerability Description:** No `cors` middleware is installed or configured. Express default behavior does not set `Access-Control-Allow-Origin` headers, meaning browsers enforce same-origin policy for standard cross-origin requests. However, since the API has no authentication and accepts any request, an attacker hosting a malicious page can use fetch with `mode: 'no-cors'` to fire state-modifying requests (POST/PATCH/DELETE). More critically: the Vite dev server (`vite.config.ts` line 13) proxies `/api → http://localhost:3001`, meaning the frontend served at `localhost:5173` can make arbitrary cross-origin requests to the backend.
- **Potential Exploit Path:**
  1. Attacker hosts a page at `http://evil.example.com` with JavaScript that fires `fetch("http://localhost:3001/api/work-items/<id>/approve", {method:"POST"})`.
  2. Since there's no auth and no CSRF tokens, the server processes the forged request.
  3. If victim has the frontend open and the attacker knows work item IDs (trivially enumerable), CSRF-style attacks work.
- **Red Team Handoff Notes:**
  - Attempt `fetch("http://localhost:3001/api/work-items", {credentials:"include"})` from browser devtools at a different origin.
  - Verify no `Access-Control-Allow-Origin` header in responses.

---

### PEN-012: `/api/search` Endpoint Referenced but Not Implemented — Future Attack Surface
- **Severity:** Medium
- **Status:** Theoretical — documents unimplemented endpoint for pre-emptive scoping
- **Target/File:** `Source/Frontend/src/api/client.ts` Lines 101–104; `Source/Backend/tests/routes/search.test.ts` (documents expected contract)
- **Vulnerability Description:** `DependencyPicker.tsx` calls `workItemsApi.searchItems(q)` → `GET /api/search?q=<user-input>`. This endpoint is NOT yet wired in `app.ts`. The test file (`search.test.ts`) explicitly notes: "these tests will FAIL until the route is implemented." When implemented, the query parameter `q` will be user-controlled input searched against work item titles/descriptions. Without parameterized filtering: (a) large `q` values may cause ReDoS if regex is used; (b) an undersized result cap could return all items on `q=` (empty); (c) no pagination limit in the search contract.
- **Potential Exploit Path:**
  1. Once implemented: `GET /api/search?q=` (empty) — if server returns all items, bypasses pagination.
  2. `GET /api/search?q=<ReDoS-pattern>` (e.g., `(a+)+b`) — if regex used, may cause CPU spike.
  3. `GET /api/search?q=<10000-char-string>` — unbounded input without length limit.
- **Red Team Handoff Notes:**
  - Currently: confirm `GET http://localhost:3001/api/search?q=test` returns 404 (not implemented).
  - Monitor for implementation and re-test immediately on availability.
  - The test contract shows expected `{data: WorkItem[]}` response — ensure pagination is enforced when implemented.

---

## Low Findings

---

### PEN-013: Change History Agent Field — Unattributed Audit Trail (Identity Spoofing)
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` Line 132; `Source/Backend/src/services/changeHistory.ts` Lines 31–50
- **Vulnerability Description:** `trackUpdates()` hardcodes `agent: 'user'` for all PATCH operations (workItems.ts line 132). No caller identity is attached. Any attacker modifying a work item via `PATCH /api/work-items/:id` appears in the audit trail as `"agent": "user"` — indistinguishable from a legitimate change. Combined with the `reason: 'Manual update'` hardcode, there is zero attribution in the audit trail for external modifications.
- **Potential Exploit Path:**
  1. `PATCH /api/work-items/<id>` with `{"title": "Tampered by attacker"}`.
  2. `GET /api/work-items/<id>` → `changeHistory` shows `agent: "user", reason: "Manual update"`.
  3. Forensic analysis cannot distinguish attacker action from legitimate operator action.
- **Red Team Handoff Notes:**
  - Confirm: PATCH an item and inspect `changeHistory` — verify `agent` is `"user"` with no IP, token, or session identifier.
  - This establishes that no forensic attribution is possible post-incident.

---

## Exploit Chain Summary for Red-Teamer

### Chain A: Full Pipeline Bypass (3 requests)
```
POST /api/work-items            → create item (status: backlog)
POST /api/work-items/:id/route  + {"overrideRoute":"fast-track"}  → skip assessment (status: approved)
POST /api/work-items/:id/dispatch + {"team":"TheATeam"}            → deploy to team (status: in-progress)
```
_Covers objectives: "Bypass work item state machine", "Bypass assessment routing"_

### Chain B: Mass Enumeration (1 request)
```
GET /api/work-items?limit=999999&page=1  → full data dump
GET /api/dashboard/queue                 → all items grouped by status
```
_Covers objective: "Enumerate all work items without pagination limit enforcement"_

### Chain C: Permanent Dispatch Sabotage
```
POST /api/work-items             → create blocker A
POST /api/work-items/B/dependencies + {"action":"add","blockerId":"<A-id>"}  → add as blocker
DELETE /api/work-items/<A-id>    → soft-delete A
GET /api/work-items/B/ready      → confirms B is permanently blocked
```
_Covers objective: "Access or modify a soft-deleted work item via direct ID reference"_

### Chain D: Cascade Dispatch Abuse
```
POST /api/work-items/<blocker-id>/reject + {"reason":"pwned"}
→ auto-dispatches all Approved dependents of that blocker
```
_Covers objective: "Submit a malformed assessment verdict that bypasses routing logic" (by triggering cascade via rejection)_

---

## Files Analyzed
| File | Lines | Notes |
|------|-------|-------|
| `Source/Backend/src/app.ts` | 55 | No auth/cors/rate-limit middleware |
| `Source/Backend/src/routes/workItems.ts` | 152 | CRUD, no auth |
| `Source/Backend/src/routes/workflow.ts` | 374 | All action endpoints, no auth |
| `Source/Backend/src/routes/dashboard.ts` | 33 | No auth, no pagination cap |
| `Source/Backend/src/routes/intake.ts` | 56 | No webhook sig verification |
| `Source/Backend/src/store/workItemStore.ts` | 101 | In-memory store |
| `Source/Backend/src/services/dependency.ts` | 315 | Soft-delete blocker DoS |
| `Source/Backend/src/services/assessment.ts` | 233 | Deterministic — can be gamed |
| `Source/Backend/src/services/router.ts` | 162 | overrideRoute unvalidated |
| `Source/Backend/src/services/changeHistory.ts` | 51 | Hardcoded agent identity |
| `Source/Backend/src/services/dashboard.ts` | 77 | No pagination on queue |
| `Source/Backend/src/models/WorkItem.ts` | 66 | Factory — no sanitization |
| `Source/Backend/src/middleware/errorHandler.ts` | 9 | Generic handler — OK |
| `Source/Backend/src/metrics.ts` | 63 | Unprotected /metrics |
| `Source/Shared/types/workflow.ts` | 237 | Shared types |
| `Source/Frontend/src/api/client.ts` | 119 | API client |
| `Source/Frontend/src/pages/WorkItemDetailPage.tsx` | 427 | React — auto-escaping OK |
| `Source/Frontend/src/components/DependencyPicker.tsx` | 377 | Calls unimplemented /search |
