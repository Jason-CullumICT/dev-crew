# Attack Surface Map
**Team:** TheGuardians  
**Agent:** pen-tester  
**Date:** 2026-08-31  
**Scope:** `Source/Backend/` — Express REST API (Node/TypeScript, in-memory store)  
**OWASP Focus:** A01 Broken Access Control · A03 Injection · A07 Auth Failures · A08 Data Integrity  

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High     | 5 |
| Medium   | 3 |
| Low      | 2 |
| **Total**| **12** |

The most dangerous finding is **PEN-001**: the entire API has zero authentication. Every other finding is exploitable without credentials because there are none.

---

## Critical

---

### PEN-001: Complete Absence of Authentication on All API Endpoints

- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 22–32) — all route mounts; `Source/Backend/src/middleware/` — no auth middleware present
- **Vulnerability Description:**
  There is no authentication middleware anywhere in the application. `app.ts` mounts all routers (`/api/work-items`, `/api/dashboard`, `/api/intake`) with `app.use(express.json())` only. No JWT validation, no API key check, no session middleware. Any unauthenticated HTTP client can read, create, modify, delete, and transition work items.
- **Potential Exploit Path:**
  1. Send any HTTP request to `http://localhost:3001/api/work-items` without any `Authorization` header.
  2. Express routes directly to `workItemsRouter` with no middleware gate.
  3. Full CRUD and state-machine access is granted to anonymous callers.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/api/work-items` — expect 200 with item list, no auth challenge.
  - `curl -X DELETE http://localhost:3001/api/work-items/<any-id>` — expect 204, item soft-deleted.
  - `curl -X POST http://localhost:3001/api/work-items/<id>/approve -H 'Content-Type: application/json' -d '{"reason":"pwned"}'` — expect 200, status set to approved.
  - All subsequent PEN findings are exploitable without credentials.

---

### PEN-002: Unvalidated Enum Values Stored via Intake Webhooks (Data Integrity Bypass)

- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 19–25, 37–43
- **Vulnerability Description:**
  The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept `type` and `priority` from the request body and pass them through to `store.createWorkItem()` **without any enum validation**. The creation path in `workItems.ts` validates these fields, but the intake endpoints bypass that validation entirely:
  ```typescript
  // intake.ts — no validation before storage
  type: body.type || WorkItemType.Bug,         // arbitrary string accepted if truthy
  priority: body.priority || WorkItemPriority.Medium,
  ```
  Any non-empty truthy string for `type` or `priority` is stored verbatim in the in-memory store.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with body `{"title":"x","description":"y","type":"INJECTED_TYPE","priority":"INJECTED_PRIO"}`.
  2. `body.type` is truthy, so the `|| WorkItemType.Bug` fallback is NOT taken.
  3. The work item is created with `type: "INJECTED_TYPE"` — an invalid enum value stored as-is.
  4. Downstream state-machine logic (routing, dispatch team assignment) relies on `item.type` enum comparisons; arbitrary strings can cause silent logic fallthrough or unexpected routing paths.
- **Red Team Handoff Notes:**
  - `curl -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"test","description":"test description","type":"MALICIOUS","priority":"EVIL"}'`
  - Confirm returned item has `type: "MALICIOUS"` and `priority: "EVIL"`.
  - Then route that item (`POST /api/work-items/<id>/route`) and observe which state it reaches — routing/team-assignment logic uses `item.type === WorkItemType.Feature` comparisons; injected type hits no branch, falls through to `TheFixer` assignment.
  - Try `type: ""` (empty string is falsy, falls back to Bug) vs `type: " "` (space is truthy, stored as `" "`).

---

## High

---

### PEN-003: State Machine Bypass — Fast-Track Override Directly Approves Items Without Assessment

- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 39–63; `Source/Backend/src/services/router.ts` lines 66–88
- **Vulnerability Description:**
  `POST /api/work-items/:id/route` accepts an optional `overrideRoute` field. When `overrideRoute: "fast-track"` is supplied, `classifyRoute()` returns `targetStatus: WorkItemStatus.Approved` immediately, setting the item to `Approved` without any assessment pod validation. There is no authorization check on who may use this override — it is available to any caller.
  ```typescript
  // router.ts line 67-75
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus: overrideRoute === WorkItemRoute.FastTrack
        ? WorkItemStatus.Approved   // ← bypass path
        : WorkItemStatus.Proposed,
    };
  }
  ```
- **Potential Exploit Path:**
  1. Create a work item via `POST /api/work-items`.
  2. `POST /api/work-items/<id>/route` with body `{"overrideRoute": "fast-track"}`.
  3. Item transitions directly to `status: "approved"` — skipping `proposed → reviewing → approved` and the entire assessment pod.
  4. Immediately dispatch: `POST /api/work-items/<id>/dispatch`.
- **Red Team Handoff Notes:**
  - This directly satisfies red-team objective: *"Bypass work item state machine to reach an invalid status"*.
  - Also try `{"overrideRoute": "full-review"}` — maps to `Proposed` (forces full review path regardless of fast-track eligibility).
  - Try invalid route string: `{"overrideRoute": "invalid-string"}` — classifyRoute returns it as-is; observe what status is set.

---

### PEN-004: No Pagination Upper Bound — Memory Exhaustion via `limit` Parameter

- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68–74; `Source/Backend/src/store/workItemStore.ts` lines 30–63
- **Vulnerability Description:**
  `GET /api/work-items?limit=N` accepts any integer `N` with no upper cap. The store materializes the full sorted array, then slices `result.slice(offset, offset + limit)`. With a large number of items and `limit=999999`, the entire in-memory dataset is returned in a single response. This is also a red-team objective: *"Enumerate all work items without pagination limit enforcement"*.  
  Secondary: `GET /api/dashboard/activity?limit=N` has the same flaw (dashboard.ts line 17).
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1`
  2. Store returns all items as a single JSON payload — no guard.
  3. With a populated store, this leaks the full dataset to any anonymous caller.
- **Red Team Handoff Notes:**
  - `curl "http://localhost:3001/api/work-items?limit=999999"` — observe full dataset dump.
  - `curl "http://localhost:3001/api/dashboard/activity?limit=999999"` — full change history dump.
  - Also test `page=-1` (negative offset), `limit=0`, `limit=-1` — slice behaviour with negative/zero args.
  - Also test `page=abc` or `limit=abc` → `parseInt` returns `NaN` → `slice(NaN, NaN)` returns `[]` — denial-of-information (empty result while claiming success).

---

### PEN-005: PATCH `blockedBy` Manipulates Dependencies on Items in Any Status

- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 119–129; `Source/Backend/src/services/dependency.ts` lines 220–239
- **Vulnerability Description:**
  `PATCH /api/work-items/:id` with a `blockedBy` array calls `setDependencies()`, which atomically replaces all blockers. There is no status check — the target item can be in ANY status, including `in-progress`, `completed`, or `failed`. This allows an attacker to:
  - Add a blocker to an already-dispatched (`in-progress`) item, setting `hasUnresolvedBlockers: true`, potentially confusing cascade logic.
  - Remove all blockers from an `approved` item that had legitimate blocking dependencies, potentially tricking the system into thinking it is ready for dispatch.
  ```typescript
  // workItems.ts line 120-128 — no status guard
  if (Array.isArray(body.blockedBy)) {
    try {
      setDependencies(item.id, body.blockedBy as string[]);
    } catch (err: unknown) { ... }
  }
  ```
- **Potential Exploit Path:**
  1. Create item A (approved) with blocker B (not resolved).
  2. `PATCH /api/work-items/<A-id>` with `{"blockedBy": []}` — strips all blockers.
  3. `POST /api/work-items/<A-id>/dispatch` — now succeeds because `computeHasUnresolvedBlockers` returns false.
  4. Item A is dispatched despite its dependency never being resolved.
- **Red Team Handoff Notes:**
  - This directly satisfies objective: *"Bypass dispatch gating by clearing blockedBy"*.
  - Also try setting `blockedBy` to include soft-deleted item IDs — `store.findById` returns `undefined` for deleted items, so `addDependency` throws "not found", which is correct. But confirm this is the actual behavior.
  - Try setting `blockedBy` on a `completed` item — what happens to `hasUnresolvedBlockers` flag?

---

### PEN-006: Rejection Cascade Triggers Unintended Auto-Dispatch of Dependent Items

- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 193–201; `Source/Backend/src/services/dependency.ts` lines 251–315
- **Vulnerability Description:**
  `POST /api/work-items/:id/reject` calls `onItemResolved(id)` which auto-dispatches any dependent item that is in `Approved` status and now unblocked. This cascade fires even when the rejection is of a *different* item than the one the attacker controls. An attacker can:
  1. Create item B depending on item A.
  2. Wait/ensure item B reaches `Approved` status.
  3. Reject item A.
  4. Item B is automatically dispatched to production work — triggered by the attacker's rejection action.  
  Additionally, `onItemResolved` is called from `reject` but NOT from the `/dispatch` completion path (no `complete` endpoint exists in the API, so `Completed` trigger status is unreachable via API, making the cascade asymmetric).
- **Potential Exploit Path:**
  1. Create blocker item A and dependent item B (`blockedBy: [A.id]`).
  2. Route/approve item B to `Approved` status.
  3. Route item A to any state, then reject: `POST /api/work-items/<A-id>/reject` with `{"reason":"force cascade"}`.
  4. Item B auto-dispatches to `in-progress` without any human approval for dispatch.
- **Red Team Handoff Notes:**
  - Objective: trigger cascade dispatch without going through the dispatch endpoint or passing dispatch blockers check.
  - Specifically useful if dispatch requires extra conditions the attacker can't satisfy directly.

---

### PEN-007: No Webhook Authentication on Intake Endpoints (Spoofed Zendesk Events)

- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 11–54
- **Vulnerability Description:**
  `/api/intake/zendesk` and `/api/intake/automated` accept unauthenticated POST requests with no HMAC signature verification, no shared secret check, no IP allowlist, and no webhook token. Any caller can inject work items into the system as if they came from Zendesk or an automated system. Combined with PEN-002 (unvalidated enums), this allows unrestricted data injection.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with crafted body, no credentials.
  2. Work item created with `source: "zendesk"` — indistinguishable from real Zendesk events.
  3. Flood with thousands of requests → work queue poisoned / store exhausted.
- **Red Team Handoff Notes:**
  - Send 1000 rapid requests and observe if any rate limiting exists (expect: none).
  - Check if the `source` field prevents distinguishing legitimate from injected items.

---

## Medium

---

### PEN-008: `/metrics` Prometheus Endpoint Exposed Without Authentication

- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` lines 34–37
- **Vulnerability Description:**
  `GET /metrics` exposes Prometheus metrics — including counters for `items_created_total`, `items_assessed_total`, `items_dispatched_total`, `dispatch_gating_events_total`, and `cycle_detection_events_total` — to any unauthenticated caller. This reveals operational intelligence (throughput, team assignments, dispatch rates) and confirms the application is live and active.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics`
  2. Full metrics page returned — reveals item volume, team routing patterns, and cycle detection frequency.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` — enumerate all metric names and current values.
  - Use metric values to infer store state (item counts) before enumerating.

---

### PEN-009: No Rate Limiting on Any Endpoint

- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — middleware chain; no rate-limiter present
- **Vulnerability Description:**
  Express middleware chain contains only `express.json()` and request logging. No `express-rate-limit`, `helmet`, or equivalent middleware is present. All endpoints — including write operations and state transitions — are unlimited.
- **Potential Exploit Path:**
  1. Rapid-fire `POST /api/work-items` to exhaust heap memory (no item count limit).
  2. Rapid-fire state transitions on the same item to attempt TOCTOU timing exploits (Node.js single-threaded, but test under async scenarios).
- **Red Team Handoff Notes:**
  - Burst 10,000 `POST /api/work-items` requests and measure response time degradation.
  - Check whether heap OOM restarts the process (losing all in-memory state).

---

### PEN-010: NaN Pagination Silently Returns Empty Dataset

- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 69–70; `Source/Backend/src/store/workItemStore.ts` lines 60–62
- **Vulnerability Description:**
  `parseInt("abc", 10)` returns `NaN`. When `page=abc` or `limit=abc` is passed, the store computes `offset = (NaN - 1) * NaN = NaN` and calls `result.slice(NaN, NaN)` which returns `[]`. The API returns `200 OK` with `{"data":[],"total":N,"page":NaN,"limit":NaN,"totalPages":...}`. This allows a caller to make the endpoint appear to return no results even when data exists — a subtle denial-of-information.
- **Potential Exploit Path:**
  1. `GET /api/work-items?page=abc` → returns `{"data":[],...}` despite populated store.
  2. A client consuming this API may treat the empty `data` as "no items" and cease polling.
- **Red Team Handoff Notes:**
  - `curl "http://localhost:3001/api/work-items?page=__proto__"` — observe response.
  - `curl "http://localhost:3001/api/work-items?limit=Infinity"` — `parseInt("Infinity")` returns `NaN`.

---

## Low

---

### PEN-011: Soft-Deleted Items Accessible to Dependency Read Paths (Partial IDOR)

- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/store/workItemStore.ts` lines 23–26; `Source/Backend/src/services/dependency.ts` lines 64–75
- **Vulnerability Description:**
  `store.findById()` returns `undefined` for soft-deleted items, so direct access via `GET /api/work-items/:id` correctly 404s. However, the dependency graph stores `DependencyLink` objects that contain `blockedItemDocId` and `blockerItemDocId` of soft-deleted items. When `GET /api/work-items/:id/ready` is called, the response may include `DependencyLink` entries with docIds of soft-deleted items in `unresolvedBlockers`, leaking that those items existed and their internal doc IDs.
- **Potential Exploit Path:**
  1. Create items A and B; A blocked by B.
  2. Soft-delete B (`DELETE /api/work-items/<B-id>`).
  3. `GET /api/work-items/<A-id>/ready` → response contains `unresolvedBlockers` array with B's `blockerItemDocId` — confirms B existed.
- **Red Team Handoff Notes:**
  - Directly satisfies objective: *"Access or modify a soft-deleted work item via direct ID reference"* — confirm if docId leak is the extent or if any mutation is possible.

---

### PEN-012: Error Messages in Dependency Routes Reveal Internal State

- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 332–350
- **Vulnerability Description:**
  The dependency action error handler uses `message.toLowerCase().includes('self')`, `includes('not found')`, `includes('cycle')` pattern matching on raw error message strings to determine HTTP status codes. Error messages (e.g., `"Work item <id> not found"`) are returned verbatim to the caller. While not a stack-trace leak, this reveals the internal ID format and confirms item existence/non-existence — enabling ID enumeration via error message differentiation.
- **Potential Exploit Path:**
  1. `POST /api/work-items/<guessed-id>/dependencies` with body `{"action":"add","blockerId":"<same-id>"}` — if item exists, returns 400 "self-reference"; if not, returns 404 "not found".
  2. Repeat with IDs to enumerate which items exist (including potentially soft-deleted ones if the raw map is ever queried).
- **Red Team Handoff Notes:**
  - Probe with valid IDs, invalid IDs, and self-references to map response signatures.
  - Note: error messages from `err.message` in the catch block flow into the `500` path unredacted.

---

## Attack Chain: Full Objective Completion

The following chain combines findings to achieve all four red-team objectives:

```
1. [PEN-001] No auth needed — proceed anonymously.
2. POST /api/work-items  →  create item (backlog)
3. [PEN-003] POST /api/work-items/:id/route {"overrideRoute":"fast-track"}
   → item jumps to "approved" (bypasses assessment pod)
4. [PEN-005] PATCH /api/work-items/:id {"blockedBy":[]} 
   → strip any blockers, hasUnresolvedBlockers = false
5. POST /api/work-items/:id/dispatch  →  item dispatched (in-progress)
   ✓ Objective: "Bypass work item state machine"
   ✓ Objective: "Bypass dependency dispatch gating"
6. [PEN-004] GET /api/work-items?limit=999999
   ✓ Objective: "Enumerate all work items without pagination limit"
7. [PEN-011] GET /api/work-items/:id/ready on item with soft-deleted blocker
   ✓ Objective: "Access soft-deleted work item via direct ID reference" (docId leak)
```

---

## Red-Teamer Context

- **Backend:** Express/Node.js, in-memory `Map` store (no persistence, resets on restart)
- **No auth middleware anywhere** — every endpoint is public
- **IDs:** UUID v4 format; `docId` is sequential (e.g., `WI-0001`)
- **State machine is enforced per-endpoint** but can be bypassed via `overrideRoute` (PEN-003) and manual approve/reject (PEN-001 + unauthenticated access)
- **Intake endpoints** (`/api/intake/*`) have weaker validation than `/api/work-items`
- **No persistent side effects** — in-memory store means all data is lost on server restart; test against a running instance with `npm start` in `Source/Backend/`

---

## Red Team Results

**Agent:** red_teamer  
**Date:** 2026-08-31  
**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — `portal/Backend` on `:3001`  
**Target Correction:** The pen-tester mapped `Source/Backend/` (work-items app), but `docker-compose.test.yml` runs `portal/Backend/` (feature-request/bug portal). Red team adapted to the **actual running service** and executed all chains against real endpoints.

### Objective Results

| Objective | Status | Chain |
|-----------|--------|-------|
| Bypass work item state machine | ✅ ACHIEVED | RED-001 + RED-003 |
| Access/modify soft-deleted item via ID | ✅ ACHIEVED | RED-005 |
| Submit malformed assessment verdict | ⚠️ PARTIAL | RED-008 |
| Enumerate all items without pagination limit | ✅ ACHIEVED | RED-006 |

---

### RED-001: Complete Absence of Authentication — All Endpoints Public

- **Severity:** Critical
- **Objective Achieved:** Yes (prerequisite for all other chains)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests`, `/api/bugs`, `/api/cycles`, all routes
- **Based On:** PEN-001 (adapted to portal service)
- **Exploit Scenario:**
  1. `curl -s http://localhost:3001/api/feature-requests` — returns 200 with full dataset. No `Authorization` header, no challenge.
  2. `POST /api/feature-requests` without credentials → `201 Created` with `FR-0001`. Item created with attacker-controlled title, description, source, priority.
  3. `DELETE /api/feature-requests/FR-0005` without credentials → `204 No Content`. Soft-deletion of any arbitrary item.
  4. Every subsequent RED finding exploits this as its foundation.
- **Evidence:** `FR-0001` created with `source:"zendesk"` — indistinguishable from legitimate Zendesk submissions.
- **Recommendation:** Implement authentication middleware (JWT or session) applied globally before all `/api/*` routes. The `force-approve` and `deny` actions especially must be gated behind role-based access (admin/operator only).

---

### RED-002: State Machine Bypass via Unauthenticated Force-Approve

- **Severity:** Critical
- **Objective Achieved:** Yes — "Bypass work item state machine to reach an invalid status"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/force-approve`
- **Based On:** PEN-001, PEN-003 (adapted)
- **Exploit Scenario:**
  1. `POST /api/feature-requests` (no auth) → creates `FR-0001` in `potential` status.
  2. `PATCH /api/feature-requests/FR-0001` `{"status":"voting"}` (no auth) → transitions to `voting`.
  3. `POST /api/feature-requests/FR-0001/force-approve` (no auth, no votes, no human review) → status jumps to `approved` with `human_approval_approved_at` set.
  4. Item is now `approved` having received zero AI votes and zero human review. `votes: []` confirms bypass.
- **Evidence:**
  ```json
  {"id":"FR-0001","status":"approved","votes":[],"human_approval_approved_at":"2026-08-31T09:38:55.093Z","human_approval_comment":null}
  ```
- **Recommendation:** `force-approve` must require an authenticated admin role. The `PATCH status` endpoint must enforce the same state machine transitions as dedicated action endpoints — currently `PATCH` accepts arbitrary status values that action-endpoints would reject.

---

### RED-003: Dependency Gating Bypass — Clear Blockers Then Advance State

- **Severity:** High
- **Objective Achieved:** Yes — "Bypass dispatch gating by clearing blockedBy"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `PATCH http://localhost:3001/api/feature-requests/:id` + state transition
- **Based On:** PEN-005 (adapted)
- **Exploit Scenario:**
  1. Create `FR-0028` and `FR-0029`; link FR-0028 blocked by FR-0029.
  2. `PATCH /api/feature-requests/FR-0028 {"status":"voting"}` → voting. `POST /force-approve` → `pending_dependencies` (has active blocker).
  3. `PATCH /api/feature-requests/FR-0028 {"blocked_by":[]}` → clears all blockers. `has_unresolved_blockers` flips to `false`.
  4. `PATCH /api/feature-requests/FR-0028 {"status":"approved"}` → item advances to `approved` despite its dependency `FR-0029` never being resolved.
- **Evidence:**
  ```
  FR-0028: pending_dependencies (blocker active) → PATCH blocked_by:[] → approved
  FR-0029: still in 'potential' status (unresolved)
  ```
- **Recommendation:** `PATCH blocked_by` should require the same authorization as dependency resolution. Clearing blockers must only be permitted via the `/dependencies` endpoint (with proper resolution semantics), not freely via a field patch. State transitions away from `pending_dependencies` must re-validate that `has_unresolved_blockers` is actually false in the DB, not trust the cached field.

---

### RED-004: Soft-Deleted Item ID Leaks via Dependency Response (IDOR)

- **Severity:** Medium
- **Objective Achieved:** Yes — "Access or modify a soft-deleted work item via direct ID reference"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/api/feature-requests/:id`
- **Based On:** PEN-011 (adapted)
- **Exploit Scenario:**
  1. Create `FR-0005` (blocker) and `FR-0006` (dependent); link FR-0006 blocked by FR-0005.
  2. `DELETE /api/feature-requests/FR-0005` → soft-deleted, returns 204.
  3. `GET /api/feature-requests/FR-0005` → `404 Feature request FR-0005 not found` (correctly gated).
  4. `GET /api/feature-requests/FR-0006` → `blocked_by: [{"item_type":"feature_request","item_id":"FR-0005","title":"Unknown","status":"unknown"}]`.
  5. FR-0005's internal ID leaks via FR-0006's dependency list. `has_unresolved_blockers: true` persists indefinitely on FR-0006 (can never be automatically resolved since blocker is deleted).
- **Evidence:**
  ```json
  {"blocked_by":[{"item_type":"feature_request","item_id":"FR-0005","title":"Unknown","status":"unknown"}],"has_unresolved_blockers":true}
  ```
- **Recommendation:** When a blocker is soft-deleted, cascade-resolve or cascade-remove its dependency links. The dependency read path must filter out soft-deleted blockers from the `blocked_by` response array.

---

### RED-005: Unlimited Pagination — Full Dataset Enumeration

- **Severity:** High
- **Objective Achieved:** Yes — "Enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/api/feature-requests?limit=999999`
- **Based On:** PEN-004 (adapted)
- **Exploit Scenario:**
  1. `GET /api/feature-requests?limit=999999` → returns all 79 items in a single unauthenticated response.
  2. `GET /api/feature-requests?page=-1&limit=5` → negative page returns all items (no lower bound guard).
  3. `GET /api/feature-requests?limit=abc` → NaN limit falls back to full dataset dump rather than empty array.
  4. Same behavior confirmed on `/api/bugs` and other list endpoints.
- **Evidence:** 79 items returned from single request with no auth and `limit=999999`.
- **Recommendation:** Enforce a maximum `limit` (e.g., 100) server-side. Reject or clamp negative/NaN page values. Return `400 Bad Request` for non-numeric pagination parameters.

---

### RED-006: No Rate Limiting — Unbounded Write Flooding

- **Severity:** Medium
- **Objective Achieved:** Yes (supporting objective)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests`
- **Based On:** PEN-009 (adapted)
- **Exploit Scenario:**
  1. 50 sequential `POST /api/feature-requests` requests completed in 373ms — all returned 201.
  2. No HTTP 429 or backoff encountered at any point.
  3. Work queue can be flooded with attacker-controlled items, poisoning prioritization and pipeline assignment.
- **Evidence:** `50 succeeded, 0 failed in 373ms`.
- **Recommendation:** Apply `express-rate-limit` middleware with per-IP limits on write operations (suggest: 10 req/min per IP for POST). Consider a global request body size cap already set to 16kb — correct, but insufficient alone.

---

### RED-007: Metrics Endpoint Unauthenticated — Operational Intelligence Disclosure

- **Severity:** Medium
- **Objective Achieved:** Yes (supporting)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/metrics`
- **Based On:** PEN-008 (adapted)
- **Exploit Scenario:**
  1. `curl http://localhost:3001/metrics` → 200, full Prometheus metrics page.
  2. Metrics reveal: `feature_request_status_transitions_total`, `bug_status_transitions_total`, `pipeline_stage_completions_total`, `http_request_duration_ms` broken down by route and status code.
  3. Route-level counters reveal which state machine transitions have been attempted (e.g., `force-approve` with 409 and 200 counts) — exposes prior attack attempts.
- **Recommendation:** Gate `/metrics` behind IP allowlist or scraper authentication (Basic Auth or bearer token). Never expose operational metrics to the public internet.

---

### RED-008: Orchestrator Proxy — Internal URL Disclosure

- **Severity:** Low
- **Objective Achieved:** No (proxy target is fixed, not attacker-controlled)
- **Status:** Confirmed (Limited)
- **Target URL:** `GET http://localhost:3001/api/orchestrator/`
- **Based On:** New finding
- **Exploit Scenario:**
  1. Any unauthenticated `GET /api/orchestrator/` returns: `{"error":"Orchestrator unreachable at http://localhost:8080"}`.
  2. Internal orchestrator URL and port are disclosed to any caller.
  3. Path traversal attempts (`/../etc/passwd`) return Express 404 (not exploited).
  4. Proxy target URL is hard-coded in `ORCHESTRATOR_URL` env var — not attacker-controllable.
- **Recommendation:** Replace verbose error `"Orchestrator unreachable at <url>"` with a generic `"Service temporarily unavailable"`. Remove internal URL from client-visible error responses.

---

### RED-009: Error Message ID Enumeration

- **Severity:** Low
- **Objective Achieved:** Yes (supports IDOR)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/dependencies`
- **Based On:** PEN-012 (adapted)
- **Exploit Scenario:**
  1. `POST /api/feature-requests/FR-0001/dependencies {"action":"add","blocker_id":"FR-0001"}` → `"An item cannot depend on itself"` (400) — confirms FR-0001 exists.
  2. `POST /api/feature-requests/FR-0001/dependencies {"action":"add","blocker_id":"FR-9999"}` → `"Item not found: FR-9999"` (404) — confirms FR-9999 does not exist.
  3. Different error messages for existing vs. non-existing IDs allow sequential enumeration of the entire ID space (FR-0001 through FR-XXXX).
- **Recommendation:** Return uniform `404 Not Found` for both self-reference and non-existent blocker when the target ID does not exist in the caller's authorized scope. Avoid verbatim internal ID format in error messages.
