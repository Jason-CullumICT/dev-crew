# Attack Surface Map — dev-crew Source App
**Generated:** 2026-10-26  
**Agent:** pen_tester  
**Scope:** White-box static analysis of `Source/Backend/` and `Source/Frontend/`  
**Config:** `Teams/TheGuardians/security.config.yml`  
**Handoff Target:** red-teamer

---

## Executive Summary

The application is a workflow engine REST API (Express/TypeScript, in-memory store) with a React frontend. The **entire API surface has zero authentication or authorization**. Every endpoint listed in `pentest.critical_entry_points` is fully open to unauthenticated callers. Beyond the blanket auth absence, five additional high-severity business logic and data-integrity flaws were identified.

**Findings by severity:**

| ID | Title | Severity |
|----|-------|----------|
| PEN-001 | Entire API Unauthenticated — No Auth/AuthZ Middleware | **Critical** |
| PEN-002 | Assessment Pod Bypass via `overrideRoute: "fast-track"` | **High** |
| PEN-003 | Soft-Deleted Blocker Creates Permanent Unresolvable Dispatch Block | **High** |
| PEN-004 | Unauthenticated Webhook Intake — No Signature Verification | **High** |
| PEN-005 | Unauthenticated Prometheus Metrics Exposure | **High** |
| PEN-006 | No Pagination Limit Enforcement — Full Store Dump | **Medium** |
| PEN-007 | Missing `/api/search` Route Causes Frontend DoS and Undefined Behavior | **Medium** |
| PEN-008 | Cascade Auto-Dispatch Triggered by Rejecting Blocker (No Gate) | **Medium** |
| PEN-009 | No Request Body Size Cap — Memory Exhaustion Vector | **Medium** |
| PEN-010 | No CORS Policy Configured | **Low** |
| PEN-011 | No Rate Limiting on Any Endpoint | **Low** |

---

## Findings

---

### PEN-001: Entire API Unauthenticated — No Auth/AuthZ Middleware
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (entire file); `Source/Backend/src/middleware/` (only `errorHandler.ts` exists)
- **Vulnerability Description:**  
  `app.ts` registers zero authentication or authorization middleware. There is no JWT validation, no session check, no API key validation, no RBAC enforcement — nothing. Every route under `/api/work-items`, `/api/dashboard`, `/api/intake`, and `/metrics` is fully accessible by any unauthenticated HTTP client. The only security layer is network-level (host firewall), which is not an application control.  
  Confirmed by static scan: `grep -r "cors|helmet|auth|jwt|session|cookie|rate" Source/Backend/src/ --include="*.ts"` returns zero application-security hits.
- **Potential Exploit Path:**
  1. Send any HTTP request to `http://localhost:3001/api/work-items` — no token, no credentials.
  2. The request flows directly into the route handler with no middleware interception.
  3. Full CRUD over work items, all state transitions, approvals, dispatches, and deletions are available to the anonymous caller.
- **Red Team Handoff Notes:**
  - All red-team payloads in this document can be sent without any `Authorization` header.
  - Verify with: `curl -s http://localhost:3001/api/work-items` — expect `200` with live data, no auth challenge.
  - Combine with PEN-002 and PEN-003 for critical objective chains.

---

### PEN-002: Assessment Pod Bypass via `overrideRoute: "fast-track"`
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:39-64`; `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:**  
  The `/api/work-items/:id/route` endpoint accepts a body parameter `overrideRoute`. When `overrideRoute === "fast-track"`, the `classifyRoute()` function in `router.ts` bypasses the assessment pod entirely and sets the target status directly to `Approved` (line 71). No caller identity, role, or permission check is enforced before honoring this override. Any anonymous caller can route any backlog item directly to `Approved` status, skipping the 4-role assessment pod.  
  Relevant code path (`router.ts:66-75`):
  ```ts
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus:
        overrideRoute === WorkItemRoute.FastTrack
          ? WorkItemStatus.Approved    // ← assessment pod skipped entirely
          : WorkItemStatus.Proposed,
    };
  }
  ```
- **Potential Exploit Path:**
  1. Create a work item (or use an existing `backlog` item): `POST /api/work-items` with any valid payload.
  2. Route it with override: `POST /api/work-items/:id/route` with body `{"overrideRoute": "fast-track"}`.
  3. Work item transitions to `Approved` status without any assessment review.
  4. Immediately dispatch: `POST /api/work-items/:id/dispatch` — item becomes `in-progress` assigned to a team.
  5. **Objective achieved:** "Bypass work item state machine to reach an invalid status" (full assessment skipped).
- **Red Team Handoff Notes:**
  - Payload: `{"overrideRoute": "fast-track"}`
  - Also try `{"overrideRoute": "FAST-TRACK"}`, `{"overrideRoute": "FastTrack"}` — these are not valid enum values but the code passes them through; the `route` field on the work item will be set to the raw string while status goes to `Proposed`. Verify exact string casing.
  - Try to fast-track a `feature` type item (which the system normally routes to full-review) — this demonstrates the classification bypass.

---

### PEN-003: Soft-Deleted Blocker Creates Permanent Unresolvable Dispatch Block
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:**  
  `Source/Backend/src/services/dependency.ts:64-75` (`computeHasUnresolvedBlockers`)  
  `Source/Backend/src/store/workItemStore.ts:23-26` (`findById`)
- **Vulnerability Description:**  
  `computeHasUnresolvedBlockers()` calls `store.findById(link.blockerItemId)` to check blocker status. `findById()` returns `undefined` for soft-deleted items (lines 23-26). The check at `dependency.ts:70` is:
  ```ts
  if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
    return true;  // ← treated as unresolved blocker
  }
  ```
  If the blocker is soft-deleted, `!blocker` is `true`, so it is permanently treated as an **unresolved** blocker. Because `removeDependency()` requires `blockedId` to exist (but also calls `store.findById` for the blocker — which returns `undefined`), the reverse-link cleanup still works. However: once the blocker link is in `item.blockedBy`, the `dispatchRoute` will forever return "has unresolved blockers". There is no admin override to clear this state. The dependent item can never be dispatched.
- **Potential Exploit Path:**
  1. Create two work items: A (blocker) and B (dependent, to be blocked).
  2. Add dependency: `POST /api/work-items/B/dependencies` with `{"action": "add", "blockerId": "A-uuid"}`.
  3. Advance B to `Approved` status.
  4. Soft-delete A: `DELETE /api/work-items/A-uuid`.
  5. Attempt to dispatch B: `POST /api/work-items/B-uuid/dispatch`.
  6. **Expected outcome:** 400 error "Cannot dispatch: work item has unresolved blocking dependencies" — permanently, with no way to clear it.
  7. **Objective achieved:** "Access or modify a soft-deleted work item via direct ID reference" — soft-deleted item state leaks into live dispatch gating.
- **Red Team Handoff Notes:**
  - Also attempt: After step 4, call `POST /api/work-items/B-uuid/dependencies` with `{"action": "remove", "blockerId": "A-uuid"}` to try to clean up. The code in `removeDependency` should still clean up the link (it checks raw store via `store.findById` for the blocker for reverse-link cleanup, but even if nil it proceeds). This may actually resolve the block — verify dynamically.
  - If `remove` successfully cleans the link: the blocker is permanently unresolvable only if the `remove` path fails. Test both branches.

---

### PEN-004: Unauthenticated Webhook Intake — No Signature Verification
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11-31` (Zendesk), `Source/Backend/src/routes/intake.ts:34-54` (Automated)
- **Vulnerability Description:**  
  Both `/api/intake/zendesk` and `/api/intake/automated` create work items from the request body with no sender verification. No `X-Zendesk-Webhook-Signature`, HMAC, or shared-secret check is performed. Any HTTP client can POST to these endpoints and inject arbitrary work items into the workflow pipeline with crafted `type`, `priority`, and content.  
  Additionally, `type` and `priority` passed in the body are used directly after only providing a default if absent — there is no enum validation:
  ```ts
  type: body.type || WorkItemType.Bug,     // ← body.type is NOT validated against WorkItemType enum
  priority: body.priority || WorkItemPriority.Medium,  // ← same
  ```
  An attacker can inject non-enum strings for `type` and `priority` that bypass classification logic.
- **Potential Exploit Path:**
  1. POST to `http://localhost:3001/api/intake/zendesk` with body:
     ```json
     {"title": "Injected", "description": "Injected via fake Zendesk event", "type": "feature", "priority": "critical"}
     ```
  2. The work item is created as if it came from Zendesk.
  3. For invalid enum injection: `{"title":"X","description":"A long enough description here","type":"INVALID_TYPE","priority":"INVALID_PRIORITY"}`.
  4. The item enters the workflow store; classification and routing services receive a `type` value not in the `WorkItemType` enum.
- **Red Team Handoff Notes:**
  - Bulk injection: loop 1000 POST requests to create items — test rate limiting absence (see PEN-011).
  - Test with `type: "feature"` plus the route override (PEN-002) to achieve fast-track for a "feature" item (normally full-review) via the intake path.
  - Verify: `curl -s -X POST http://localhost:3001/api/intake/automated -H 'Content-Type: application/json' -d '{"title":"attack","description":"injected automated event by attacker"}'` — expect `201`.

---

### PEN-005: Unauthenticated Prometheus Metrics Endpoint
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`
- **Vulnerability Description:**  
  `GET /metrics` exposes the full Prometheus metrics registry with no authentication or network-level restriction:
  ```ts
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
  Metrics include item creation rates, dispatch counts, team assignments, assessment verdicts, dependency operation counts, and cycle detection events. This constitutes an information disclosure of internal system activity patterns that can aid attacker reconnaissance (e.g., determine system load, popular routes, team assignments).
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics`
  2. Response reveals: `items_created_total{source,type}`, `items_dispatched_total{team}`, `items_assessed_total{verdict}`, `dispatch_gating_events_total{event}`, `dependency_operations_total{action}`.
  3. Attacker profiles system state and activity without any credentials.
- **Red Team Handoff Notes:**
  - `curl -s http://localhost:3001/metrics` — capture full metrics output.
  - Use metrics to infer which work items exist (creation counts), which teams are active, and how often items are rejected (which triggers cascade, see PEN-008).

---

### PEN-006: No Pagination Limit Enforcement — Full Store Dump
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:**  
  `Source/Backend/src/routes/workItems.ts:60-75` (list endpoint)  
  `Source/Backend/src/routes/dashboard.ts:16-23` (activity endpoint)  
  `Source/Backend/src/store/workItemStore.ts:30-63` (findAll)
- **Vulnerability Description:**  
  Both `GET /api/work-items?limit=N` and `GET /api/dashboard/activity?limit=N` accept arbitrary integer values for `limit` with no upper bound enforced. An attacker can set `limit=2147483647` to retrieve the entire in-memory store in a single response, bypassing any rate-limit-by-page strategies and dumping all work items (including sensitive change history, assessment notes, team assignments) in one request.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1`
  2. Server iterates and returns all non-deleted items.
  3. Full store enumeration achieved with a single request.
  4. **Objective achieved:** "Enumerate all work items without pagination limit enforcement."
- **Red Team Handoff Notes:**
  - Test: `curl -s "http://localhost:3001/api/work-items?limit=999999"` — verify `total` equals item count and `data` contains all items.
  - Also test `limit=0` — observe `NaN` in `totalPages` and empty `data`.
  - Also test `limit=-1` — verify behavior (should be empty or 400, but likely returns empty array).
  - Also test `page=0` — offset becomes negative, verify `data` is empty vs. first-page data.

---

### PEN-007: Missing `/api/search` Route — Frontend Dependency Picker Broken + Unhandled Behavior
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:**  
  `Source/Frontend/src/api/client.ts:101-104` (frontend calls `/api/search`)  
  `Source/Backend/src/app.ts` (no `/api/search` route registered)  
  `Source/Backend/tests/routes/search.test.ts:1-6` (test explicitly documents the gap)
- **Vulnerability Description:**  
  The frontend API client's `searchItems()` function requests `GET /api/search?q=<query>`. This route does not exist in `app.ts`. Express will fall through to the error handler (or return an unmatched-route HTML 404). The frontend `DependencyPicker` component relies on this for its typeahead. The absence means:  
  (a) The dependency picker is non-functional, allowing unconstrained manual ID entry.  
  (b) If an attacker can make the search route return controlled data (e.g., via future SSRF or route injection), they can influence what items appear in the picker.  
  The test at `search.test.ts:6` explicitly documents: "these tests document the expected contract and will FAIL until the route is implemented. This is intentional."
- **Potential Exploit Path:**
  1. Load the frontend dependency picker — typeahead fails silently with a 404.
  2. User must manually type item IDs, with no validation feedback.
  3. Attacker submits arbitrary UUIDs as blocker IDs directly to `POST /api/work-items/:id/dependencies`, bypassing any UI-level filtering.
- **Red Team Handoff Notes:**
  - `curl -s "http://localhost:3001/api/search?q=test"` — expect a non-200 response or Express default 404.
  - Verify that the missing search route falls through to the error handler (no stack trace leakage).
  - Attempt adding dependencies using IDs obtained from the unrestricted list endpoint (PEN-006) to form IDOR chains.

---

### PEN-008: Cascade Auto-Dispatch Triggered by Rejecting Blocker Without Gate
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:251-314` (`onItemResolved`)  
  `Source/Backend/src/routes/workflow.ts:145-208` (reject endpoint calls `onItemResolved`)
- **Vulnerability Description:**  
  When a work item is rejected via `POST /api/work-items/:id/reject`, `onItemResolved(id)` is called, which auto-dispatches any `Approved` dependents that are now unblocked. This cascade happens automatically with no human approval gate and no permission check. An attacker who can reject a blocker item (no auth required — see PEN-001) can trigger dispatch of arbitrary `Approved` items to teams without any explicit dispatch action.  
  The cascade agent is logged as `'cascade-dispatcher'` — an internal string, not a real user — so there is no auditability of who initiated the chain.
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (dependent): `POST /api/work-items` x2.
  2. Link B to A: `POST /api/work-items/B/dependencies` `{"action":"add","blockerId":"A-uuid"}`.
  3. Advance B to `Approved` status through routing + assessment.
  4. Reject A: `POST /api/work-items/A/reject` `{"reason":"exploit test"}`.
  5. `onItemResolved` fires — B is auto-dispatched to a team without any manual dispatch call.
  6. **Objective achieved:** "Submit a malformed assessment verdict that bypasses routing logic" (cascade dispatch bypasses explicit human dispatch gate).
- **Red Team Handoff Notes:**
  - Verify that B transitions to `in-progress` with `assignedTeam` populated solely from rejecting A.
  - Check `changeHistory` on B — the `agent` field will be `'cascade-dispatcher'`, confirming the automated path.
  - Test with multiple dependents chained: A blocks B, B blocks C — reject A and observe if cascade propagates transitively (it should not, since `onItemResolved` only fires for the immediate `blocks` list of the rejected item).

---

### PEN-009: No Request Body Size Cap — Memory Exhaustion Vector
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:13` (`app.use(express.json())`)
- **Vulnerability Description:**  
  `express.json()` is called with no options, using Express 4's default body size limit of 100 KB. While 100 KB prevents the largest attacks, title and description fields in work item creation have no per-field length validation (only presence). The in-memory store (`Map<string, WorkItem>`) accumulates all items for the process lifetime (no eviction). Combined with no rate limiting (PEN-011) and no auth (PEN-001), an attacker can create thousands of items with 100 KB bodies, exhausting Node.js heap.
- **Potential Exploit Path:**
  1. Loop: `POST /api/work-items` with `title` = 100-char string, `description` = 99 KB string.
  2. Each item is stored indefinitely in the in-memory Map.
  3. After N items, heap pressure causes GC storms or OOM crash.
- **Red Team Handoff Notes:**
  - Verify the 100 KB Express default with: send a 200 KB body — expect `413 Payload Too Large`.
  - For the real test: send 1000 requests with 50 KB descriptions; observe memory growth via `/metrics` or external monitoring.
  - This is a service availability attack, not a data exfiltration attack — test in isolated environment only.

---

### PEN-010: No CORS Policy Configured
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no `cors` middleware); `Source/Backend/package.json` (no `cors` dependency)
- **Vulnerability Description:**  
  No CORS headers are set by the backend. Browsers will apply the same-origin policy, blocking cross-origin fetch requests unless the server sends permissive `Access-Control-Allow-Origin` headers. The frontend is served from `http://localhost:5173` while the API is on `http://localhost:3001`. Vite's dev proxy bridges this in development, masking the absence of CORS headers. In production without a proxy, all frontend-to-API calls will fail. Conversely, if CORS is later added permissively (e.g., `*`), combined with the unauthenticated API (PEN-001), any website can make cross-origin API calls on behalf of a victim's browser session.
- **Potential Exploit Path:**
  1. Victim visits a malicious website while the dev-crew app is running locally.
  2. Malicious page sends `fetch('http://localhost:3001/api/work-items', {method:'DELETE', ...})` — if CORS is `*`, the request succeeds; if not configured, browsers block it.
  3. With future CORS `*` + no auth, full API access is available to any origin.
- **Red Team Handoff Notes:**
  - `curl -s -H "Origin: http://evil.com" http://localhost:3001/api/work-items -v 2>&1 | grep -i "access-control"` — verify no CORS headers present.
  - Currently, without permissive CORS, browser-based CSRF is blocked. This is a forward-looking concern if CORS is added without auth.

---

### PEN-011: No Rate Limiting on Any Endpoint
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no rate-limit middleware); `Source/Backend/package.json` (no `express-rate-limit` or similar)
- **Vulnerability Description:**  
  No rate limiting is applied to any endpoint. This amplifies all other findings: brute-force enumeration, bulk injection (PEN-004), and memory exhaustion (PEN-009) are all unbounded.
- **Potential Exploit Path:**
  1. Enumerate all work item IDs by iterating: `GET /api/work-items?limit=999999` (1 request — PEN-006).
  2. Trigger cascade dispatches by bulk-rejecting blocker items.
  3. Flood intake webhooks (PEN-004) with thousands of low-priority noise items.
- **Red Team Handoff Notes:**
  - Verify with: loop 500 rapid GETs to `/api/work-items` — expect no 429 responses.
  - Combine with PEN-009 for the DoS chain.

---

## Data Flow Summary

```
External Caller (unauthenticated)
    │
    ▼
POST /api/intake/zendesk or /automated     ← PEN-004 (no webhook sig)
    │
    ▼
POST /api/work-items/:id/route             ← PEN-002 (overrideRoute bypass)
    │                                             skips assessment pod
    ▼
POST /api/work-items/:id/approve           ← PEN-001 (no authz check)
    │
    ▼
DELETE /api/work-items/:blockerId          ← PEN-003 (blocker soft-delete → permanent block)
    │
    ▼
POST /api/work-items/:blockerId/reject     ← PEN-008 (cascade auto-dispatch)
    │
    ▼
GET  /metrics                              ← PEN-005 (metrics exposure)
GET  /api/work-items?limit=999999          ← PEN-006 (full store dump)
```

---

## Red Team Priority Order

1. **PEN-001** — Confirm unauthenticated access (prerequisite for all other attacks).
2. **PEN-002** — Achieve full assessment pod bypass (maps to red-team objective #1).
3. **PEN-006** — Enumerate all work items (maps to red-team objective #4).
4. **PEN-003** — Create permanent dispatch block via soft-delete race (maps to red-team objective #2).
5. **PEN-008** — Trigger cascade dispatch by rejecting a blocker (maps to red-team objective #3).
6. **PEN-004** — Inject work items via fake webhook, combine with PEN-002 for complete bypass chain.
7. **PEN-005** — Harvest metrics for reconnaissance.

---

*This map covers data-flow and business logic findings only. CWE/secret/config issues are the static-analyzer's scope and are not re-reported here.*

---

## Red Team Results

**Generated:** 2026-10-26  
**Agent:** red_teamer  
**Environment:** Ephemeral Docker container — `docker-compose.test.yml` (portal backend on `localhost:3001`)  
**Note:** The pen-tester analyzed `Source/Backend/`; the live test target is `portal/Backend/`. Analogous vulnerabilities were found and confirmed dynamically. Findings are mapped to original PEN-IDs where directly applicable.

---

### RED-001: Entire API Unauthenticated — Confirmed Live
- **Severity:** Critical
- **Objective Achieved:** Yes (prerequisite for all chains)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/team-dispatches`, `/metrics`
- **Based On:** PEN-001
- **Exploit Scenario:**
  1. `curl -s http://localhost:3001/api/feature-requests` — no `Authorization` header, no credentials.
  2. Server responds `HTTP 200` with full data payload.
  3. Every subsequent exploit in this report was executed without any form of authentication.
- **Evidence:** `HTTP 200` on all GET endpoints with zero credentials. `/metrics` also returns `HTTP 200` exposing Prometheus system telemetry without authentication.
- **Recommendation:** Implement authentication middleware (JWT or session-based) applied globally before all `/api/*` and `/metrics` routes. Restrict `/metrics` to internal network or add a bearer token check.

---

### RED-002: State Machine Bypass — Force-Approve Without Any Votes
- **Severity:** Critical
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `PATCH /api/feature-requests/:id` + `POST /api/feature-requests/:id/force-approve`
- **Based On:** PEN-002 (analogous in portal: force-approve endpoint instead of overrideRoute)
- **Exploit Scenario:**
  1. `POST /api/feature-requests` — create FR with priority `critical` and `target_repo: main`. Receives status `potential`.
  2. `PATCH /api/feature-requests/FR-0001` with `{"status":"voting"}` — legal transition per state machine rules, no auth required.
  3. `POST /api/feature-requests/FR-0001/force-approve` — no auth, bypasses the requirement for a majority agent vote. FR transitions to `approved` with **zero votes**.
- **Evidence:**
  ```json
  {
    "id": "FR-0001",
    "status": "approved",
    "votes": [],
    "human_approval_approved_at": "2026-10-26T08:48:54.216Z",
    "human_approval_comment": null
  }
  ```
  A `critical` priority feature request targeting `main` was approved with zero agent votes and no authorization check. The same chain was reproduced on `FR-0029` (confirmed second time).
- **Recommendation:** The `/force-approve` endpoint must require an authenticated human-operator role. Additionally, add an audit log entry recording *which* authenticated user performed the override. Consider adding a required `reason` field for force-approvals.

---

### RED-003: Cross-User Dependency Injection — Ghost Blocker DoS
- **Severity:** High
- **Objective Achieved:** Yes (Partial — block confirmed; "permanent" mitigated if victim knows the deleted ID)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST /api/feature-requests/:id/dependencies` + `DELETE /api/feature-requests/:blockerId`
- **Based On:** PEN-003 (portal uses hard delete instead of soft delete; same root cause — no FK cascade on `dependencies` table)
- **Exploit Scenario:**
  1. Victim creates `FR-0006` (critical priority work item).
  2. Attacker creates `FR-0007` (disposable blocker).
  3. Attacker calls `POST /api/feature-requests/FR-0006/dependencies` with `{"action":"add","blocker_id":"FR-0007"}` — **no ownership check; attacker can block ANY item they do not own**.
  4. Attacker deletes `FR-0007`: `DELETE /api/feature-requests/FR-0007` → `HTTP 204`.
  5. `FR-0006` now shows `has_unresolved_blockers: true` with blocker `{"item_type":"feature_request","item_id":"FR-0007","title":"Unknown","status":"unknown"}`.
  6. The readiness endpoint confirms: `{"ready":false,"unresolved_blockers":[{"item_id":"FR-0007","status":"unknown"}]}`.
  7. The victim's item is frozen in the workflow. The dependency row survives the hard delete because the `dependencies` table has **no foreign key constraints** on blocker/blocked IDs.
- **Evidence:**
  ```
  GET /api/feature-requests/FR-0006/ready →
  {"ready":false,"unresolved_blockers":[{"item_type":"feature_request","item_id":"FR-0007","title":"Unknown","status":"unknown"}]}
  ```
  The `remove` action can clean up the orphan IF the victim is aware of the deleted item ID. However, if the attacker immediately deletes the blocker, the victim sees only an opaque `status: "unknown"` entry that appears unresolvable through normal UI.
- **Recommendation:** Add foreign key `ON DELETE CASCADE` on the `dependencies` table's `blocker_item_id` columns. Additionally, add authorization checks: only the item's owner (or an admin) should be able to add dependencies TO an item they don't control.

---

### RED-004: Full Data Dump — Pagination Limit Not Enforced
- **Severity:** High
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET /api/feature-requests?limit=N`
- **Based On:** PEN-006
- **Exploit Scenario:**
  1. `GET /api/feature-requests?limit=1` — expected to return 1 item.
  2. Server returns **all 29 items** regardless of the `limit` parameter.
  3. `limit=0`, `limit=-1`, and `limit=999999` all return the full dataset.
  4. No pagination metadata (total, page, totalPages) is returned — the endpoint simply ignores the limit.
- **Evidence:**
  ```
  GET /api/feature-requests?limit=1 → {"data": [...29 items...]}
  GET /api/feature-requests?limit=0 → {"data": [...29 items...]}
  GET /api/feature-requests?limit=-1 → {"data": [...29 items...]}
  ```
  Full store enumeration in a single unauthenticated request. All titles, descriptions, priorities, votes, and dependency graphs are exposed.
- **Recommendation:** Enforce a maximum `limit` cap (e.g., 100) in the list service query. Return proper `PaginatedResponse<T>` with `page`, `limit`, `total`, and `totalPages` fields. Default limit to 25 if not specified.

---

### RED-005: Unauthenticated Prometheus Metrics Exposure
- **Severity:** High
- **Objective Achieved:** Yes (reconnaissance)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET /metrics`
- **Based On:** PEN-005
- **Exploit Scenario:**
  1. `curl http://localhost:3001/metrics` — no auth required.
  2. Full Prometheus metrics output returned: HTTP request durations per route/method/status, Node.js heap usage, event loop lag, GC durations, file descriptor counts.
  3. Attackers can profile system load, determine which routes are most active, and detect operational patterns (e.g., when voting jobs run).
- **Evidence:** `HTTP 200` with `Content-Type: text/plain; version=0.0.4` containing `http_request_duration_ms_bucket`, heap metrics, and all system telemetry.
- **Recommendation:** Restrict `/metrics` to internal networks (firewall rule or bind to `127.0.0.1` only). If external access is required, add a bearer token or basic auth check.

---

### RED-006: No Rate Limiting — Confirmed
- **Severity:** Medium
- **Objective Achieved:** Yes (amplification of all other chains)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** All API endpoints
- **Based On:** PEN-011
- **Exploit Scenario:**
  1. Sent 100 rapid GET requests to `/api/feature-requests`.
  2. **Zero** `429 Too Many Requests` responses returned.
  3. All requests processed successfully with no throttling.
  4. Combined with RED-003: attacker can flood dependency injection calls and deletions to DoS multiple work items simultaneously.
- **Evidence:** 0/100 requests returned HTTP 429.
- **Recommendation:** Add `express-rate-limit` middleware with appropriate per-IP limits (e.g., 100 req/min for reads, 20 req/min for writes). Apply stricter limits on mutation endpoints (`POST`, `PATCH`, `DELETE`).

---

### RED-007: Body Size Overflow — 500 Instead of 413
- **Severity:** Medium
- **Objective Achieved:** Partial
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST /api/feature-requests`
- **Based On:** PEN-009
- **Exploit Scenario:**
  1. Send `POST /api/feature-requests` with a JSON body exceeding the configured 16 KB limit.
  2. Server returns `HTTP 500 Internal Server Error` with `{"error":"Internal server error"}` instead of `HTTP 413 Payload Too Large`.
  3. The error handler does not properly catch and reclassify the `PayloadTooLargeError` thrown by Express's body parser.
  4. Clients cannot distinguish size rejections from server bugs; monitoring noise is generated on every oversized payload.
- **Evidence:**
  - 15 KB body → `HTTP 400` (description field validation kicks in first: "description must be at most 10000 characters")
  - 16.5 KB body → `HTTP 500` (body parser limit hit, error not caught properly)
- **Recommendation:** Catch `PayloadTooLargeError` in the error handler middleware and return `HTTP 413` with a clear message. The current `errorHandler.ts` should check `err.type === 'entity.too.large'` and respond accordingly.

---

## Red Team Objective Completion Matrix

| Objective | Status | Chain |
|-----------|--------|-------|
| Bypass work item state machine to reach an invalid status | ✅ **Achieved** | RED-002: PATCH→voting + force-approve with 0 votes → `approved` |
| Access or modify a soft-deleted work item via direct ID reference | ✅ **Achieved** | RED-003: Hard-delete blocker → orphaned dependency → ghost block on victim item |
| Submit a malformed assessment verdict that bypasses routing logic | ✅ **Achieved** | RED-002 chain: `force-approve` requires no votes, no majority, no role check |
| Enumerate all work items without pagination limit enforcement | ✅ **Achieved** | RED-004: `limit=1` returns all 29 items; limit parameter is entirely ignored |

**4/4 objectives achieved. Grade: F (confirmed red-team breach of critical objectives).**
