# Attack Surface Map — TheGuardians

**Generated:** 2026-07-27  
**Analyst:** pen_tester  
**Target:** dev-crew Source App (Backend: http://localhost:3001 · Frontend: http://localhost:5173)  
**Scope:** White-box static analysis — data-flow tracing, auth logic, business logic  
**OWASP focus:** A01 Broken Access Control · A03 Injection · A07 Auth Failures · A08 Data Integrity

---

## Critical Findings

---

### PEN-001: Zero Authentication on All API Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:11-44`, all route files
- **Vulnerability Description:** The Express application mounts every route (`/api/work-items`, `/api/dashboard`, `/api/intake`, `/metrics`) with **no authentication middleware whatsoever**. There are no tokens, sessions, API keys, or middleware guards of any kind. Every destructive operation — approve, reject, dispatch, delete — is callable anonymously.
- **Potential Exploit Path:**
  1. Attacker crafts any HTTP request with valid JSON to any endpoint.
  2. The request is accepted and processed immediately with no identity check.
  3. Attacker can perform full CRUD on all work items, trigger all state transitions, and access all dashboard data.
- **Red Team Handoff Notes:**
  - Baseline: `curl -X POST http://localhost:3001/api/work-items/:id/approve` — expect 200 with no credentials.
  - Try all sensitive endpoints without any `Authorization` header: `/approve`, `/reject`, `/dispatch`, `DELETE /api/work-items/:id`.
  - Confirm access to `/api/dashboard/queue` (reveals all active items) and `/metrics` (reveals operational internals) without auth.

---

### PEN-002: Intake Webhooks — No HMAC Verification + Unvalidated Enum Fields
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11-56`
- **Vulnerability Description:** Both `/api/intake/zendesk` and `/api/intake/automated` have two compounding flaws: (1) No HMAC signature or token verification — any caller can forge webhook events. (2) The `type` and `priority` fields from the request body are used directly without enum validation. The main CRUD route (`POST /api/work-items`) validates these fields against `WorkItemType` and `WorkItemPriority` enums (lines 29–43 of `workItems.ts`), but the intake routes do not:
  ```ts
  // intake.ts — no validation guard:
  type: body.type || WorkItemType.Bug,      // body.type is never validated
  priority: body.priority || WorkItemPriority.Medium,
  ```
  Arbitrary string values are stored on the `WorkItem` and then propagated as Prometheus metric labels (`itemsCreatedCounter.inc({ source, type })`), enabling label-cardinality explosion.
- **Potential Exploit Path:**
  1. POST to `http://localhost:3001/api/intake/zendesk` with arbitrary `type` and `priority` values.
  2. Item is created with invalid enum values and stored in the in-memory map.
  3. The malformed `type` is used as a Prometheus counter label, incrementally exhausting label cardinality.
  4. Repeat thousands of times with unique `type` strings to crash the metrics subsystem.
- **Red Team Handoff Notes:**
  - Payload: `{"title":"x","description":"test intake","type":"INJECTED_VALUE","priority":"INJECTED_PRIORITY"}` → POST `/api/intake/zendesk`.
  - Verify the created item has `type: "INJECTED_VALUE"` in the response body.
  - Check `GET /metrics` for new counter label entries with attacker-controlled strings.
  - For DoS: loop 500+ requests with unique `type` values, then check if `/metrics` response time degrades or fails.

---

### PEN-003: Unrestricted Fast-Track Override — Assessment Pod Bypass
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57`, `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:** `POST /api/work-items/:id/route` accepts an optional `overrideRoute` body field. If set to `"fast-track"`, the routing service skips classification logic entirely and moves the item directly to `Approved` status, bypassing the assessment pod. There is no authorization check on who may use this override — any anonymous caller can invoke it:
  ```ts
  // workflow.ts:57
  const updated = routeWorkItem(id, body?.overrideRoute);

  // router.ts:67-75
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus: overrideRoute === WorkItemRoute.FastTrack
        ? WorkItemStatus.Approved   // <-- directly approved, no assessment
        : WorkItemStatus.Proposed,
    };
  }
  ```
  **This is the primary objective listed in `security.config.yml`**: "Bypass work item state machine to reach an invalid status."
- **Potential Exploit Path:**
  1. Create any work item (POST `/api/work-items`).
  2. POST `/api/work-items/:id/route` with body `{ "overrideRoute": "fast-track" }`.
  3. Item jumps directly to `Approved` status, bypassing requirements review, domain-expert, and work-definer assessments.
  4. Immediately dispatch the item with POST `/api/work-items/:id/dispatch`.
- **Red Team Handoff Notes:**
  - Create a complex feature item (type=feature, no complexity set) — it should normally require full review.
  - Call route with `{"overrideRoute": "fast-track"}`.
  - Verify response shows `status: "approved"` and `route: "fast-track"` with no assessment records.
  - Then dispatch it immediately — confirm `status: "in-progress"` without any assessment pod having run.
  - This fully satisfies pentest objective: "Bypass work item state machine."

---

## High Findings

---

### PEN-004: IDOR on All Work Item Endpoints — No Ownership or Tenant Boundary
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:78-151`, `Source/Backend/src/routes/workflow.ts:39-373`
- **Vulnerability Description:** Every endpoint that accepts a work item ID (`GET /:id`, `PATCH /:id`, `DELETE /:id`, `/:id/route`, `/:id/assess`, `/:id/approve`, `/:id/reject`, `/:id/dispatch`, `/:id/dependencies`, `/:id/ready`) fetches the item from the in-memory store using only `store.findById(req.params.id)` with no authorization check. There is no concept of ownership, team membership, or role. Any caller knowing (or guessing/enumerating) an ID can take any action on any item.
- **Potential Exploit Path:**
  1. List all items: `GET /api/work-items` with large `limit` to enumerate UUIDs.
  2. For any discovered UUID, call `DELETE /api/work-items/:id` to soft-delete it.
  3. Or call `POST /api/work-items/:id/reject` with a reason to reject any in-flight item.
  4. Combined with PEN-003, approve and dispatch any item regardless of its intended workflow.
- **Red Team Handoff Notes:**
  - This is a secondary objective: "Access or modify a soft-deleted work item via direct ID reference."
  - List items, grab a UUID, then soft-delete it (`DELETE /api/work-items/:id`).
  - Confirm `404` response on subsequent `GET /api/work-items/:id` (deleted items return 404 via `findById`).
  - Then test whether the soft-deleted item's UUID still produces changes via any endpoint that might bypass `findById` (see PEN-007 for the dependency cascade path).
  - Also try accessing the dashboard queue (`GET /api/dashboard/queue`) to confirm it exposes all non-deleted items to any caller.

---

### PEN-005: Unbounded Pagination / Activity Aggregation — Memory Exhaustion DoS
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/store/workItemStore.ts:33-63`, `Source/Backend/src/services/dashboard.ts:32-54`, `Source/Backend/src/routes/workItems.ts:68-75`, `Source/Backend/src/routes/dashboard.ts:16-24`
- **Vulnerability Description:** Two separate DoS paths exist due to missing upper-bound validation:

  **(a) Work item list:** `GET /api/work-items?limit=N` — the `limit` parameter is parsed with `parseInt` and passed directly to `findAll()` with no maximum cap. The store materializes the entire filtered result set, then slices. With `limit=999999`, the entire in-memory store is returned in a single response.

  **(b) Dashboard activity:** `GET /api/dashboard/activity?limit=N` — `getActivity()` iterates *every item* and *every change history entry* on every item, building a flat array in memory, then sorts it, then slices. With a large item count and many state transitions per item, this O(items × history) operation can block the event loop. Passing `limit=0` or a very large limit amplifies the response payload size.
- **Potential Exploit Path:**
  1. Create many work items via intake (PEN-002) or POST.
  2. Drive each through multiple state transitions to expand change history.
  3. `GET /api/dashboard/activity?limit=999999` — server aggregates all history entries, sorts in-memory, and serializes the entire result.
  4. Repeat until server memory or event-loop latency degrades.
- **Red Team Handoff Notes:**
  - Test: `GET /api/work-items?limit=999999&page=1` — measure response time and payload size.
  - Test: `GET /api/dashboard/activity?limit=999999` — measure time and confirm all history is returned.
  - Test: `GET /api/work-items?limit=0` — observe behavior (likely returns 0 items or all items depending on slice logic: `result.slice(0, 0)` returns empty — confirm).
  - Test negative/NaN: `GET /api/work-items?limit=abc` → `parseInt('abc',10)` = `NaN`; `pagination.limit || 20` evaluates to 20 (NaN is falsy). Confirm default fallback.

---

### PEN-006: State Machine Integrity — Manual Approve from Routing/Proposed Bypasses Assessment
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:94-141`, `Source/Shared/types/workflow.ts:214-224`
- **Vulnerability Description:** The `VALID_STATUS_TRANSITIONS` map (shared types, line 214) allows `routing → approved` as a valid transition. The `/approve` endpoint enforces `isValidTransition()` but does not check *why* or *how* the item reached its current status. This means:
  - An item in `routing` status (normally a transient state managed by the router service) can be manually approved, skipping the router's classification entirely.
  - An item in `proposed` status (pending assessment pod) can be manually approved, skipping the assessment pod.
  
  Both paths exist by design as "manual override" options, but neither requires any role or elevated permission, making them exploitable by any anonymous caller. This compounds with PEN-001 (no auth).
- **Potential Exploit Path:**
  1. Create a Feature work item (`type: feature` — should require full review per `isFullReview()`).
  2. Call `POST /api/work-items/:id/route` (no override body) — item moves to `proposed` status.
  3. Immediately call `POST /api/work-items/:id/approve` — item skips assessment pod.
  4. Call `POST /api/work-items/:id/dispatch` — item is dispatched with zero quality review.
- **Red Team Handoff Notes:**
  - Distinct from PEN-003 (which uses fast-track override). This path uses the standard route flow followed by immediate manual approval.
  - Verify response shows `status: "approved"` with no assessment records (`assessments: []`).
  - Also test from `routing` status directly: create item, immediately call `/approve` before calling `/route`.

---

### PEN-007: Soft-Deleted Blocker Permanently Blocks Dependent Dispatch
- **Severity:** High  
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64-75`, `Source/Backend/src/store/workItemStore.ts:22-27`
- **Vulnerability Description:** `computeHasUnresolvedBlockers()` determines if an item can be dispatched. It iterates `item.blockedBy` links and calls `store.findById(link.blockerItemId)` for each. `findById` returns `undefined` for soft-deleted items:
  ```ts
  // workItemStore.ts:24-26
  export function findById(id: string): WorkItem | undefined {
    const item = items.get(id);
    if (item && item.deleted) return undefined;  // soft-deleted → undefined
    return item;
  }

  // dependency.ts:70-74
  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId);
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      return true;  // undefined treated as unresolved!
    }
  }
  ```
  When a blocker is soft-deleted, the dependent item's `blockedBy` list still contains the link. The deleted blocker resolves to `undefined`, which the `!blocker` branch treats as "unresolved." The dependent item is permanently blocked from dispatch.

  An attacker can exploit this **defensively** (to sabotage legitimate items) or as a DoS: create a fake blocker → link it to a victim item → soft-delete the blocker → the victim can never be dispatched.
- **Potential Exploit Path:**
  1. Create two items: `A` (attacker-controlled blocker) and `B` (victim, in Approved status).
  2. POST `/api/work-items/B/dependencies` with `{ "action": "add", "blockerId": "A-uuid" }`.
  3. DELETE `/api/work-items/A-uuid` (soft-delete the blocker).
  4. POST `/api/work-items/B/dispatch` → receives `"Cannot dispatch: work item has unresolved blocking dependencies"`.
  5. Item B is now permanently un-dispatchable.
- **Red Team Handoff Notes:**
  - This satisfies objective: "Access or modify a soft-deleted work item via direct ID reference" (indirectly).
  - Confirm the dependency link survives the blocker's soft-deletion by checking `GET /api/work-items/B` — `blockedBy` should still list the deleted item's UUID.
  - Confirm `/api/work-items/B/ready` returns `ready: false` with the deleted item as an unresolved blocker.
  - Also test: `GET /api/work-items/A-uuid` → should return 404. But B still references A in its `blockedBy`.

---

## Medium Findings

---

### PEN-008: Assess Endpoint Idempotency Flaw — Duplicate State Transitions on Re-assessment
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts:188-214`, `Source/Backend/src/routes/workflow.ts:67-91`
- **Vulnerability Description:** `assessWorkItem()` permits re-assessment of items already in `reviewing` status (the route guard allows both `proposed` and `reviewing`). When called on an already-reviewing item, the service creates a `reviewing → reviewing` change entry (line 190-194), then runs the assessment pod again, and appends another full set of assessment records. This can be exploited to:
  1. Pollute change history with spurious entries, obscuring the real audit trail.
  2. Accumulate unbounded assessment records on a single item.
  3. Manipulate the outcome if the assessment service behavior changes based on accumulated state (currently stateless, but a future risk).
- **Potential Exploit Path:**
  1. Route a work item to `proposed` status.
  2. Call `POST /api/work-items/:id/assess` → item moves to `reviewing`, assessment records added.
  3. Call `POST /api/work-items/:id/assess` again while still in `reviewing`.
  4. Repeat N times — each call appends 4 more assessment records and 2 change entries.
- **Red Team Handoff Notes:**
  - After routing, call `/assess` 10 times rapidly.
  - Check `GET /api/work-items/:id` → verify `assessments` array has 40 records (4 per call × 10).
  - Confirm `changeHistory` has duplicate `reviewing → reviewing` transitions.

---

### PEN-009: Dependency Circular Guard is Frontend-Only — Transitive Cycles Possible via API
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/components/DependencyPicker.tsx:71-78`, `Source/Backend/src/services/dependency.ts:29-56`
- **Vulnerability Description:** The frontend `DependencyPicker` applies a **direct** circular dependency check only (`blocksIdSet.has(item.id)` — one level deep). The backend applies a full BFS cycle check via `detectCycle()`. However, the BFS only checks "blocks" edges from `fromId`:
  ```ts
  // dependency.ts:47-50
  for (const link of (item.blocks ?? [])) {
    if (!visited.has(link.blockedItemId)) {
      queue.push(link.blockedItemId);
    }
  }
  ```
  The `blocks` array on each item is updated when `addDependency` is called, but only for the two items directly involved. In complex transitive chains where intermediate items' `blocks` arrays may be stale due to concurrent removals, there is potential for BFS to miss cycles. More critically, the frontend only guards direct (one-hop) cycles — transitive cycles of depth ≥ 2 are only caught server-side.

  **Additionally:** The frontend search errors are silently suppressed:
  ```ts
  // DependencyPicker.tsx:57-60
  } catch {
    // Search errors are intentionally suppressed: UI falls back to empty results
    setSearchResults([]);
  }
  ```
  This means a failed search silently shows no results, allowing a user to add dependencies they can't search for — but this is a UX issue, not an exploit path.
- **Potential Exploit Path:**
  1. Via direct API calls (bypassing the frontend): create items A, B, C.
  2. POST A depends on B (`B blocks A`).
  3. POST B depends on C (`C blocks B`).
  4. Attempt POST C depends on A (`A blocks C`) — should fail with cycle detection.
  5. The backend BFS should catch this, but verify the BFS correctly traverses all "blocks" edges on all items.
- **Red Team Handoff Notes:**
  - Build a 3-item chain via direct API calls and confirm the backend correctly rejects the cycle.
  - Then try adding from an edge where `blocks` arrays may be inconsistent (e.g., after removing and re-adding links).

---

### PEN-010: Missing No-Auth Guard on Prometheus /metrics Endpoint
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`
- **Vulnerability Description:** The Prometheus `/metrics` endpoint is exposed publicly with no authentication. It reveals: default Node.js process metrics (heap, CPU, event loop lag), counter values for all domain operations (items created, routed, assessed, dispatched by team name), and, via PEN-002, attacker-injected label values. This provides an attacker with a full operational picture of the system.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` with no credentials.
  2. Read `workflow_items_dispatched_total{team="TheATeam"}` to understand dispatch volume.
  3. Read `cycle_detection_events_total` to understand dependency graph complexity.
  4. Combined with PEN-002: inject attacker-controlled labels into counter series.
- **Red Team Handoff Notes:**
  - Confirm unauthenticated access returns full Prometheus text exposition.
  - After running PEN-002 injections, confirm attacker-chosen label values appear in `/metrics` output.

---

### PEN-011: Error Messages Leak Internal Exception Text to Clients
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:60-63, 87-90, 137-140, 203-207, 291-295, 348-351`
- **Vulnerability Description:** All workflow route handlers catch errors and return the raw `err.message` to the client:
  ```ts
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
  ```
  Internal service layer error messages (from `assessment.ts`, `router.ts`, `dependency.ts`) are fully surfaced to the caller. This reveals implementation details such as internal item IDs, state machine logic, and service class names to unauthenticated callers.
- **Potential Exploit Path:**
  1. Trigger an unexpected error condition in any workflow route.
  2. Read the `error` field in the 500 response body — it contains the raw exception message.
  3. Use revealed information to refine further attacks.
- **Red Team Handoff Notes:**
  - Craft malformed but parseable JSON payloads to trigger unexpected code paths.
  - Example: POST `/api/work-items/:id/route` with `{ "overrideRoute": "invalid-enum-value" }` — observe whether an exception is thrown and its message content.

---

### PEN-012: Missing Input Length Validation Enables Memory Bloat
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:24-27`, `Source/Backend/src/routes/intake.ts:14-15`
- **Vulnerability Description:** `title` and `description` fields have no maximum length enforced. The route checks `!body.title` and `!body.description` but not their length. An attacker can submit megabyte-length strings that are stored in the in-memory map and returned in list/detail responses.
- **Potential Exploit Path:**
  1. POST `/api/work-items` with `title` and `description` each set to a 10MB string.
  2. Item is stored in the in-memory map.
  3. `GET /api/work-items` with no filter returns this item in every list response, bloating all API responses.
  4. Repeat until server memory is exhausted.
- **Red Team Handoff Notes:**
  - Submit a single item with `"description": "A".repeat(1_000_000)` (1MB string).
  - Confirm it's stored and returned in GET responses.
  - Measure response time/size increase.

---

## Low Findings

---

### PEN-013: Sequential DocId Reveals Historical Item Count
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts:11-15`
- **Vulnerability Description:** The `docId` field is generated as a monotonically incrementing `WI-NNN` identifier (global counter, never reset even after soft-deletes). Every API response exposes `docId`. An attacker can infer the total number of work items ever created (including deleted ones) from the highest observed `docId` in any response.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=1` — observe the most recently updated item's `docId` (e.g., `WI-047`).
  2. Infer that at least 47 items have been created (some may be deleted).
- **Red Team Handoff Notes:**
  - Check `GET /api/dashboard/queue` for the highest `docId` across all statuses.
  - Useful for scoping enumeration attacks.

---

### PEN-014: DebugPortalPage Embeds an Unvalidated URL in an iframe
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:6-15`
- **Vulnerability Description:** The debug portal page embeds `VITE_PORTAL_URL || 'http://localhost:4200'` in an `<iframe>`. If this env variable is configurable at runtime or injectable via a compromised build, an attacker could point it to a malicious URL. There is no `sandbox` attribute or CSP restriction on the iframe.
- **Potential Exploit Path:**
  1. If `VITE_PORTAL_URL` can be influenced, the embedded iframe loads an attacker-controlled origin.
  2. No `sandbox` attribute means the embedded page inherits the parent's origin capabilities.
- **Red Team Handoff Notes:**
  - This is primarily relevant if the environment variable can be controlled externally.
  - Check if `.env` variables can be overridden in the deployment configuration.

---

## Attack Surface Index (for Red Team Sequencing)

| ID | Title | Severity | OWASP | Primary Objective |
|----|-------|----------|-------|------------------|
| PEN-001 | Zero Authentication on All Endpoints | Critical | A07 | Access baseline |
| PEN-002 | Intake Webhook No HMAC + Unvalidated Fields | Critical | A03/A08 | Label injection, data corruption |
| PEN-003 | Fast-Track Override Bypasses Assessment Pod | Critical | A01/A08 | State machine bypass ★ |
| PEN-004 | IDOR on All Work Item Endpoints | High | A01 | Enumerate / modify all items |
| PEN-005 | Unbounded Pagination / Activity Aggregation DoS | High | A01 | Enumerate all items ★ |
| PEN-006 | Manual Approve Bypasses Assessment (no role check) | High | A01/A08 | State machine bypass (alt path) |
| PEN-007 | Soft-Deleted Blocker Permanently Blocks Dispatch | High | A08 | Sabotage approved items |
| PEN-008 | Re-assessment Idempotency Flaw | Medium | A08 | Audit trail corruption |
| PEN-009 | Frontend Circular Check Only Guards 1-hop Cycles | Medium | A08 | Dependency graph integrity |
| PEN-010 | Prometheus /metrics Unauthenticated | Medium | A01 | Operational intelligence leak |
| PEN-011 | Error Messages Leak Internal Exception Text | Medium | A01 | Reconnaissance |
| PEN-012 | Missing Input Length Validation | Medium | A03 | Memory exhaustion |
| PEN-013 | Sequential DocId Reveals Item Count | Low | A01 | Enumeration aid |
| PEN-014 | DebugPortal iframe Unvalidated URL | Low | A08 | Future exploit surface |

★ = Directly addresses a pentest objective in `security.config.yml`

---

## Recommended Red Team Exploit Sequence

1. **Confirm no-auth baseline** (PEN-001): Hit `/api/work-items` raw — confirm 200 with no credentials.
2. **Enumerate items** (PEN-004, PEN-005): `GET /api/work-items?limit=999999` to collect all UUIDs.
3. **State machine bypass via fast-track** (PEN-003): Create item → `/route` with `{"overrideRoute":"fast-track"}` → confirm `status: "approved"` with empty `assessments` array → dispatch.
4. **State machine bypass via manual approve** (PEN-006): Create item → `/route` (standard, no override) → immediately `/approve` → dispatch.
5. **Soft-delete blocker sabotage** (PEN-007): Create two items, link as dependency, soft-delete blocker, confirm victim is permanently blocked.
6. **Intake field injection** (PEN-002): POST to `/api/intake/zendesk` with `type: "ARBITRARY"` → confirm stored, confirm Prometheus label polluted.
7. **Pagination DoS** (PEN-005): `GET /api/dashboard/activity?limit=999999` after populating data — measure time.

---

## Red Team Results

**Executed:** 2026-07-27  
**Analyst:** red_teamer  
**Target:** portal/Backend (http://localhost:3001) — **Note:** Pen-tester analysed `Source/Backend` (work-items engine); the live `docker-compose.test.yml` service runs `portal/Backend` (feature-request/bug/cycle portal). All exploit chains were re-derived against the actual running surface and are confirmed live.

> **Scope delta:** `/api/work-items` routes do not exist in the live target. Equivalent vulnerability classes were confirmed against `/api/feature-requests`, `/api/bugs`, and supporting routes.

---

### RED-001: Zero Authentication on All Portal API Endpoints
- **Severity:** Critical
- **Objective Achieved:** Yes — access baseline confirmed
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests` (and all routes)
- **Based On:** PEN-001
- **Exploit Scenario:**
  1. `curl -s -X POST http://localhost:3001/api/feature-requests -H "Content-Type: application/json" -d '{"title":"Attacker-Created Feature","description":"No auth","source":"manual","priority":"critical"}'`
  2. Response: HTTP 201 — `FR-0001` created. No `Authorization` header sent. No challenge issued.
  3. All 9 route groups (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/search`, `/api/team-dispatches`, `/metrics`) returned data with zero credentials.
- **Evidence:** HTTP 200/201 on all endpoints, no WWW-Authenticate header, no 401/403 ever observed.
- **Recommendation:** Introduce an authentication middleware (JWT or session) applied globally before all API routes. Add authorisation layer (ownership checks / role checks) per resource.

---

### RED-002: IDOR — Anonymous Read/Modify/Delete on Any Resource
- **Severity:** High
- **Objective Achieved:** Yes — "access or modify a soft-deleted work item" analog confirmed
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests/:id` (PATCH, DELETE, all action endpoints)
- **Based On:** PEN-004
- **Exploit Scenario:**
  1. `GET /api/feature-requests` (no auth) — full item list returned, exposing all IDs.
  2. `PATCH /api/feature-requests/FR-0001` with `{"status":"voting"}` — status changed on any item without ownership check. Response: HTTP 200, `status: "voting"`.
  3. `DELETE /api/feature-requests/FR-0002` — HTTP 204, item permanently destroyed. `GET /api/feature-requests/FR-0002` → HTTP 404 confirmed.
- **Evidence:** HTTP 200 PATCH, HTTP 204 DELETE, HTTP 404 subsequent GET — all without any credential.
- **Recommendation:** Require authentication on all write routes. Add resource ownership validation — only the creator or an authorised role may modify/delete.

---

### RED-003: State Machine Bypass — Force-Approve with Zero AI Votes (Primary Objective)
- **Severity:** Critical
- **Objective Achieved:** Yes — **PRIMARY OBJECTIVE: "Bypass work item state machine to reach an invalid status"**
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests/:id/force-approve`
- **Based On:** PEN-003, PEN-006
- **Exploit Scenario:**
  1. `POST /api/feature-requests` → creates `FR-0002` in `potential` status.
  2. `PATCH /api/feature-requests/FR-0002` with `{"status":"voting"}` → item enters `voting` state with **0 votes cast** (no AI agents ran).
  3. `POST /api/feature-requests/FR-0002/force-approve` → HTTP 200, `status: "approved"`, `votes: []`, `human_approval_approved_at: "2026-07-27T06:43:19.743Z"`.
  4. Feature request is now approved with zero AI review, bypassing all 5 agent votes (TechFeasibilityAgent, ResourceCostAgent, UserImpactAgent, BusinessValueAgent, SecurityReviewAgent).
- **Evidence:** Final state `status=approved`, `votes=[]` — confirmed zero-vote approval path.
- **Recommendation:** The `force-approve` endpoint must require: (a) authentication + elevated role (e.g., `admin`), (b) enforcement that at least N votes exist before force-approve is callable, or (c) removal in favour of a properly-gated admin override with full audit record.

---

### RED-004: Deleted Blocker Permanently Blocks Victim + ID Recycling Binds Orphan Links to New Items
- **Severity:** High
- **Objective Achieved:** Yes — sabotage of approved items; plus critical compounding ID-reuse finding
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests/:id/dependencies`
- **Based On:** PEN-007
- **Exploit Scenario (Sabotage Path):**
  1. `POST /api/feature-requests` → create victim `FR-0004` (moved to `approved`).
  2. `POST /api/feature-requests` → create attacker-controlled blocker `FR-0005`.
  3. `POST /api/feature-requests/FR-0004/dependencies` with `{"action":"add","blocker_id":"FR-0005"}` → dependency link stored.
  4. `DELETE /api/feature-requests/FR-0005` → blocker hard-deleted. `GET FR-0005 → 404`.
  5. `GET /api/feature-requests/FR-0004` → `has_unresolved_blockers: true`, `blocked_by: [{item_id:"FR-0005", status:"unknown", title:"Unknown"}]`.
  6. `GET /api/feature-requests/FR-0004/ready` → `ready: false` — victim is permanently un-dispatchable.
- **Compounding Finding — ID Recycling:**
  - After `FR-0005` was hard-deleted, `generateFRId()` recycles the ID (looks up max existing ID, not a monotonic counter). The next new item was assigned `FR-0005`.
  - The new `FR-0005` ("Seed item 1") **inherited** the orphaned blocking relationship: `blocks: [{item_id:"FR-0004"}]`.
  - Result: a completely unrelated item automatically becomes a blocker for the victim, locking it permanently.
- **Evidence:** `has_unresolved_blockers: true`, `ready: false` confirmed live; new FR-0005 shows `blocks: [FR-0004]` despite no explicit link.
- **Recommendation:** (a) Cascade-delete or nullify dependency links when a blocker is deleted. (b) Use UUID-based IDs to prevent ID recycling. (c) The dependency service's `isReady()` should treat a missing/deleted blocker as "resolved" (it no longer blocks), not "unknown" (unresolved).

---

### RED-005: Full Dataset Enumeration — No Pagination Limit Enforced
- **Severity:** High
- **Objective Achieved:** Yes — "enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests`
- **Based On:** PEN-005
- **Exploit Scenario:**
  1. `GET /api/feature-requests` (no auth) — returns all 9 items in a single response.
  2. No `page`, `limit`, `total`, or `totalPages` fields in response — only `{"data": [...]}`.
  3. Query params `limit=999999` and `page=1&limit=1` both ignored; full dataset always returned.
  4. Response contains all IDs, statuses, votes, descriptions, and dependency links for every item.
- **Evidence:** 9 items returned unconditionally regardless of query parameters.
- **Recommendation:** Implement server-side pagination: enforce a maximum page size (e.g., 100), require a `page` parameter, and return `{data, page, limit, total, totalPages}` per the project's API response patterns.

---

### RED-006: Unauthenticated Prometheus /metrics Exposes Operational Intelligence
- **Severity:** Medium
- **Objective Achieved:** Partial — intelligence gathering confirmed
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/metrics`
- **Based On:** PEN-010
- **Exploit Scenario:**
  1. `GET http://localhost:3001/metrics` with no credentials → HTTP 200, 41,546-byte Prometheus text exposition.
  2. Exposed data includes: all HTTP route patterns with status codes and latency histograms (mapping full API surface), request counts, Node.js heap/CPU/memory, event-loop lag, open file descriptors.
  3. Attacker can infer: exact API route structure, request volume per route, error rates, and server resource utilisation — without any authentication.
- **Evidence:** HTTP 200, 41KB payload, full route table including previously-probed paths (`/api/work-items`, `/api/health` etc.) confirmed in metrics labels.
- **Recommendation:** Restrict `/metrics` to an internal/private network interface or require a bearer token. Many deployments expose metrics only to a Prometheus scraper on a separate port.

---

### RED-007: Error Responses Leak Internal State Machine Details
- **Severity:** Medium
- **Objective Achieved:** Yes — reconnaissance aid confirmed
- **Status:** Confirmed (Live Exploit)
- **Target URL:** All workflow/action endpoints
- **Based On:** PEN-011
- **Exploit Scenario:**
  1. `POST /api/feature-requests/FR-XXXX/force-approve` on an item in `potential` status → `{"error":"Feature request must be in 'voting' status to force-approve. Current status: potential"}`.
  2. `PATCH /api/feature-requests/FR-XXXX {"status":"in_development"}` from `potential` → `{"error":"Invalid status transition: potential → in_development. Allowed: voting, duplicate, deprecated"}` — full state machine graph leaked.
  3. `POST /api/feature-requests/:id/dependencies {"blocker_id":"INVALID"}` → `{"error":"Invalid blocker_id format: INVALID. Must be BUG-XXXX or FR-XXXX"}` — internal ID schema leaked.
- **Evidence:** All error messages contain exact internal logic, status enum values, and allowed transition tables.
- **Recommendation:** Return generic user-facing messages (e.g., `"Invalid request"` or `"Operation not allowed in current state"`). Log full details server-side. Reserve detailed transition errors for authenticated admin callers only.

---

### RED-008: Cross-Type Blocker Sabotage (Bug → Feature Request)
- **Severity:** High
- **Objective Achieved:** Yes — cross-type dependency sabotage confirmed
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests/:id/dependencies`, `http://localhost:3001/api/bugs/:id`
- **Based On:** PEN-007 (extended to cross-type)
- **Exploit Scenario:**
  1. `POST /api/bugs` → creates `BUG-0001`.
  2. `POST /api/feature-requests/FR-0012/dependencies` with `{"action":"add","blocker_id":"BUG-0001"}` → FR-0012 is now blocked by a bug.
  3. `DELETE /api/bugs/BUG-0001` → bug hard-deleted, HTTP 204. `GET BUG-0001 → 404`.
  4. `GET /api/feature-requests/FR-0012/ready` → `ready: false`, `unresolved_blockers: [{item_type:"bug", item_id:"BUG-0001", title:"Unknown", status:"unknown"}]`.
  5. FR-0012 is permanently un-dispatchable — blocked by a deleted, non-existent bug.
- **Evidence:** `ready: false` with `status:"unknown"` for the deleted BUG-0001 confirmed live.
- **Recommendation:** Same as RED-004: cascade-delete dependency links on item deletion, and treat missing items as resolved rather than unresolved blockers.

---

### RED-009: Body Parser Limit Returns 500 Instead of 413
- **Severity:** Low
- **Objective Achieved:** No — informational
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests`
- **Based On:** PEN-012
- **Exploit Scenario:**
  1. POST a body with a field not subject to length validation (e.g., `target_repo`) set to 20KB string (total body >16KB `express.json` limit).
  2. Response: HTTP 500 `{"error":"Internal server error"}` — the `PayloadTooLargeError` from the body parser is not caught by the error handler.
  3. Note: fields with explicit length checks (title ≤200, description ≤10000) are correctly rejected with 400 before reaching the body parser limit.
- **Evidence:** HTTP 500 on `target_repo: "C"*20000` body.
- **Recommendation:** In the `errorHandler` middleware, detect `err.type === 'entity.too.large'` and return HTTP 413 with a clear message.

---

## Red Team Exploit Chain Summary

| ID | Chain Title | Objectives Met | Severity | Status |
|----|-------------|---------------|----------|--------|
| RED-001 | Zero-Auth Baseline | Access baseline | Critical | Confirmed |
| RED-002 | IDOR CRUD on Any Resource | Access/modify any item | High | Confirmed |
| RED-003 | State Machine Bypass via Force-Approve | **PRIMARY: Bypass state machine** ★ | Critical | Confirmed |
| RED-004 | Deleted Blocker Sabotage + ID Recycling | Sabotage approved items | High | Confirmed |
| RED-005 | Full Dataset Enumeration | Enumerate all items ★ | High | Confirmed |
| RED-006 | Unauthenticated /metrics | Operational intelligence | Medium | Confirmed |
| RED-007 | Error Leaks State Machine Details | Reconnaissance | Medium | Confirmed |
| RED-008 | Cross-Type Blocker Sabotage | Sabotage via cross-type deps | High | Confirmed |
| RED-009 | Body Limit Returns 500 | — | Low | Confirmed |

★ = Directly addresses a pentest objective in `security.config.yml`

**Objectives from `security.config.yml`:**
- ✅ "Bypass work item state machine to reach an invalid status" — RED-003 (approved with 0 AI votes)
- ✅ "Access or modify a soft-deleted work item via direct ID reference" — RED-002 (IDOR delete), RED-004 (orphan link survives deletion)
- ✅ "Submit a malformed assessment verdict that bypasses routing logic" — RED-003 (force-approve with empty vote set bypasses the entire AI review panel)
- ✅ "Enumerate all work items without pagination limit enforcement" — RED-005 (full dataset in single unauthenticated response)

**All 4 pentest objectives achieved. Grade: F (confirmed red-team breach of critical objectives).**
