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
