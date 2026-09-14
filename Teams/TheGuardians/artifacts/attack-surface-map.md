# Attack Surface Map — dev-crew Source App

**Produced by:** pen_tester  
**Date:** 2026-09-14  
**Scope:** White-box static analysis of `Source/Backend/` and `Source/Shared/`  
**Red-team targets:** `http://localhost:3001` (backend), `http://localhost:5173` (frontend)  
**OWASP focus:** A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A07 Auth Failures, A08 Integrity Failures

---

## Executive Summary

The application has **zero authentication and zero authorization** on every API endpoint. This is the root vulnerability from which all others cascade. Every finding below assumes an unauthenticated HTTP client. The state machine that governs work item lifecycle can be bypassed by any caller with network access.

---

## Findings

### PEN-001: No Authentication on Any API Endpoint
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — all route registrations (lines 22–32)
- **Vulnerability Description:** `app.ts` registers all routers (`workItemsRouter`, `workflowRouter`, `dashboardRouter`, `intakeRouter`) with **no authentication middleware** at any layer. There is no session management, no JWT validation, no API key enforcement, and no identity mechanism anywhere in the codebase.
- **Potential Exploit Path:**
  1. Make an unauthenticated `GET http://localhost:3001/api/work-items` request with no credentials.
  2. The request flows directly to `workItems.ts` route handler.
  3. All work items are returned with no identity check.
- **Red Team Handoff Notes:** Every finding below is exploitable with a plain `curl` command with no headers. Confirm the baseline: `curl http://localhost:3001/api/work-items` should return 200 with data, not 401. Then chain PEN-003 through PEN-011 without any auth tokens.

---

### PEN-002: No Authorization / Role-Based Access Control Anywhere
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts` — all handlers
- **Vulnerability Description:** There is no RBAC, ABAC, or ownership model. Any caller can perform any action on any work item: create, read, update, delete, approve, reject, dispatch. There is no concept of "who" is making the request.
- **Potential Exploit Path:**
  1. Attacker enumerates all work item IDs via `GET /api/work-items`.
  2. Attacker approves a random pending item via `POST /api/work-items/{id}/approve` with `{"reason":"override"}`.
  3. Attacker dispatches it to a team via `POST /api/work-items/{id}/dispatch` with `{"team":"TheATeam"}`.
  4. No credential, role, or ownership check is ever performed.
- **Red Team Handoff Notes:** Full privilege escalation from anonymous to admin-equivalent in two HTTP requests. Use `curl -X POST http://localhost:3001/api/work-items/{id}/approve -H 'Content-Type: application/json' -d '{"reason":"pentest"}'`.

---

### PEN-003: Fast-Track Route Override Bypasses Assessment Pod
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 39–64; `Source/Backend/src/services/router.ts` lines 66–88
- **Vulnerability Description:** `POST /api/work-items/:id/route` accepts an optional `overrideRoute` field in the request body. When `overrideRoute === "fast-track"`, `classifyRoute()` returns `targetStatus: WorkItemStatus.Approved`, skipping the entire Assessment Pod. No authentication, no role check, and no reason is required.
- **Potential Exploit Path:**
  1. Create a work item: `POST /api/work-items` → get `{id}`.
  2. Send `POST /api/work-items/{id}/route` with body `{"overrideRoute":"fast-track"}`.
  3. `routeWorkItem()` calls `classifyRoute(item, "fast-track")` → returns `{ route: "fast-track", targetStatus: "approved" }`.
  4. Item jumps from `backlog` directly to `approved`, bypassing `proposed → reviewing → approved` lifecycle entirely.
- **Red Team Handoff Notes:** `curl -X POST http://localhost:3001/api/work-items/{id}/route -H 'Content-Type: application/json' -d '{"overrideRoute":"fast-track"}'`. Confirm with `GET /api/work-items/{id}` that status is `approved`. This satisfies the red-team objective: "Bypass work item state machine to reach an invalid status."

---

### PEN-004: Manual Approve Override With No Authorization
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 94–142
- **Vulnerability Description:** `POST /api/work-items/:id/approve` is documented as a "manual override" endpoint. It accepts any item currently in `proposed`, `reviewing`, or `routing` status and moves it directly to `approved`. The only input is an optional `reason` string. No caller identity check exists.
- **Potential Exploit Path:**
  1. Find an item in `proposed` status via `GET /api/work-items?status=proposed`.
  2. Send `POST /api/work-items/{id}/approve` with `{"reason":"pentest override"}`.
  3. Item is moved to `approved` and `changeHistory` is mutated with `agent: "manual-override"`.
- **Red Team Handoff Notes:** Pair with PEN-003. After routing an item to `proposed`, immediately approve it. This chains: `backlog → proposed (via /route full-review) → approved (via /approve override)`. Both steps require zero credentials.

---

### PEN-005: Unauthenticated Intake Webhooks — No Signature Verification
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 11–31 (zendesk), lines 34–55 (automated)
- **Vulnerability Description:** `POST /api/intake/zendesk` and `POST /api/intake/automated` are designed as external webhook receivers but have **no webhook signature verification**, no shared secret header check (e.g., `X-Zendesk-Webhook-Signature`), and no IP allowlist. Any attacker can impersonate Zendesk and inject arbitrary work items into the system.
- **Potential Exploit Path:**
  1. Send `POST http://localhost:3001/api/intake/zendesk` with `{"title":"Injected","description":"Attacker-controlled content"}`.
  2. A new work item is created with `source: "zendesk"`, `type: "bug"`, indistinguishable from a legitimate Zendesk ticket.
  3. The item enters the workflow and can be routed/approved/dispatched like any real item.
- **Red Team Handoff Notes:** `curl -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"Injected ticket","description":"Attacker-controlled description to test XSS rendering: <script>alert(1)</script>"}'`. Check if the frontend renders description as HTML.

---

### PEN-006: Invalid Enum Values Accepted by Intake Endpoints
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 19–25 (zendesk), lines 43–49 (automated)
- **Vulnerability Description:** The intake routes use `body.type || WorkItemType.Bug` and `body.priority || WorkItemPriority.Medium` **without enum validation**. The main `POST /api/work-items` route validates type and priority against `Object.values(WorkItemType)`, but the intake routes do not. A caller can inject arbitrary string values into `type` and `priority` fields.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title":"t","description":"d","type":"EXPLOIT","priority":"OVERFLOW"}`.
  2. `store.createWorkItem()` stores `type: "EXPLOIT"` in the in-memory Map.
  3. The router service's `isFastTrack()` and `isFullReview()` logic receives an unrecognized type — `isFullReview()` always returns `true` as default, so routing may behave unexpectedly.
  4. Assessment logic (`assessAsWorkDefiner`) uses a `switch(item.type)` with no `default` case — falls through silently with no `suggestedChanges`, breaking the work definer's guidance.
- **Red Team Handoff Notes:** `curl -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"Enum Injection","description":"Testing invalid enum","type":"__proto__","priority":"constructor"}'`. Verify the item appears in `GET /api/work-items` with invalid field values.

---

### PEN-007: Soft-Deleted Blocker Creates Permanent Dispatch Denial-of-Service
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` lines 64–75 (`computeHasUnresolvedBlockers`); `Source/Backend/src/store/workItemStore.ts` lines 23–27 (`findById`)
- **Vulnerability Description:** `findById()` returns `undefined` for soft-deleted items. In `computeHasUnresolvedBlockers()`, when `store.findById(link.blockerItemId)` returns `undefined` (because the blocker was soft-deleted), the check `!blocker` evaluates to `true` and the function returns `true` (has unresolved blockers). This means soft-deleting a blocker item **permanently prevents dispatch** of all its dependents, with no recovery path.
- **Potential Exploit Path:**
  1. Create item A (target) and item B (blocker).
  2. Add B as a dependency of A: `POST /api/work-items/A/dependencies {"action":"add","blockerId":"B-id"}`.
  3. Advance A to `Approved` status (via PEN-003 or normal flow).
  4. Soft-delete item B: `DELETE /api/work-items/B-id`.
  5. Attempt to dispatch A: `POST /api/work-items/A/dispatch`.
  6. `computeHasUnresolvedBlockers(A)` → finds B's link in `blockedBy`, `findById(B)` = undefined, returns `true`.
  7. Response: `{"error":"Cannot dispatch: work item has unresolved blocking dependencies"}` — **permanently, with no recovery**.
- **Red Team Handoff Notes:** Execute the 6-step chain above. Then try to `PATCH /api/work-items/A` with `{"blockedBy":[]}` to bulk-replace the blockedBy list to empty — this should clear the dependency and allow dispatch. Confirm whether the PATCH bulk-replace via `setDependencies` rescues the situation or not.

---

### PEN-008: Soft-Deleted Work Item Accessible via Dependency IDs (Indirect IDOR)
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/store/workItemStore.ts` line 23; `Source/Backend/src/routes/workflow.ts` lines 302–352
- **Vulnerability Description:** When a work item is soft-deleted, `findById` returns `undefined`, so `GET /api/work-items/{id}` returns 404. However, the deleted item's **ID and docId are still stored in the `blocks` and `blockedBy` arrays of related items**. `GET /api/work-items` and `GET /api/dashboard/queue` return live items with embedded `DependencyLink` objects containing the soft-deleted item's `blockerItemId` and `blockerItemDocId`. An attacker can enumerate soft-deleted item IDs and attempt to reference them.
- **Potential Exploit Path:**
  1. GET a live work item that had a dependency on a now-deleted item.
  2. Observe `blockedBy[0].blockerItemId` = `"deleted-uuid"` and `blockedBy[0].blockerItemDocId` = `"WI-42"`.
  3. Although `GET /api/work-items/deleted-uuid` returns 404, the metadata is still exposed.
  4. Combine with `POST /api/work-items/{live-id}/dependencies {"action":"remove","blockerId":"deleted-uuid"}` — this calls `removeDependency(liveId, deletedUuid)`, and since `store.findById(deletedUuid)` returns undefined (soft-deleted), the function throws "Work item {id} not found" for the *live* item... wait, actually it throws for `blockedId` not found, not `blockerId`. Let me trace: `removeDependency` checks `store.findById(blockedId)` (the live item — exists) then proceeds. `findById(blockerId)` (deleted item) returns undefined, but the code handles this: `const blocker = store.findById(blockerId)` (undefined) — then just skips the reverse-link cleanup. The dependency IS removed.
- **Red Team Handoff Notes:** This satisfies the objective "Access or modify a soft-deleted work item via direct ID reference." Specifically: enumerate `blockedBy` arrays to extract soft-deleted item IDs, then trigger `removeDependency` using that ID. Confirm `POST /api/work-items/{live}/dependencies {"action":"remove","blockerId":"{soft-deleted-id}"}` returns 204 (successful interaction with a soft-deleted item's reference).

---

### PEN-009: Unbounded Pagination — Full Data Exfiltration in Single Request
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68–74; `Source/Backend/src/routes/dashboard.ts` lines 17–19
- **Vulnerability Description:** The `limit` parameter in `GET /api/work-items?limit=N` and `GET /api/dashboard/activity?limit=N` has **no maximum cap**. An attacker can set `limit=2147483647` to retrieve all items in a single response, effectively bypassing pagination.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1`
  2. `pagination.limit = 999999` — no validation.
  3. `store.findAll({}, {page:1, limit:999999})` slices all items and returns them.
  4. All work items are exfiltrated in a single request.
- **Red Team Handoff Notes:** `curl "http://localhost:3001/api/work-items?limit=999999"`. Verify the `total` field equals `data.length` — confirming all items were returned. This satisfies the objective "Enumerate all work items without pagination limit enforcement."

---

### PEN-010: Negative Page Number Causes Unexpected Slice Behavior
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68–74; `Source/Backend/src/store/workItemStore.ts` line 61
- **Vulnerability Description:** `page` is parsed via `parseInt(req.query.page as string, 10)` with no bounds check. When `page=-1`, `offset = (-1-1) * 20 = -40`. JavaScript's `Array.prototype.slice(-40, -20)` returns elements from `array.length-40` to `array.length-20`. Depending on total item count, this can return unexpected items or an empty array — producing an inconsistent view of the dataset.
- **Potential Exploit Path:**
  1. `GET /api/work-items?page=-1&limit=20`
  2. `offset = -40`, `data = result.slice(-40, -20)`.
  3. If `result.length > 40`, this returns items 20 positions from the end — items that would not normally appear on page 1.
- **Red Team Handoff Notes:** `curl "http://localhost:3001/api/work-items?page=-1"`. Compare the `data` array against `curl "http://localhost:3001/api/work-items?page=1"`. If the responses differ, negative-page traversal exposes different data windows.

---

### PEN-011: Dashboard Exposes All Internal State Without Authentication
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts` lines 8–32; `Source/Backend/src/services/dashboard.ts`
- **Vulnerability Description:** Three dashboard endpoints are completely unauthenticated and return highly sensitive internal data: (1) `GET /api/dashboard/summary` — status, team, and priority breakdowns; (2) `GET /api/dashboard/activity` — full change history for all items, including field-level mutations, agent names, old/new values, and reasons; (3) `GET /api/dashboard/queue` — every work item in every status, with full content including `title`, `description`, `assessments`, `changeHistory`, `blockedBy`, and `blocks` arrays.
- **Potential Exploit Path:**
  1. `GET /api/dashboard/queue` — single request returns every active work item, full payload, all statuses.
  2. Extract all work item IDs from the response.
  3. Use IDs to target specific items for state manipulation (PEN-002 through PEN-007).
- **Red Team Handoff Notes:** `curl http://localhost:3001/api/dashboard/queue | jq '.data[].items[].id'` to extract all IDs in a single query. Use these IDs to chain attacks. Also try `GET /api/dashboard/activity` to reconstruct the full audit trail of every system action.

---

### PEN-012: Cascade Dispatch Denial-of-Service via Deep Dependency Chain
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` lines 251–315 (`onItemResolved`)
- **Vulnerability Description:** When an item is rejected (via `POST /api/work-items/:id/reject`), `onItemResolved()` is called, which synchronously iterates all items that the resolved item `blocks`, and auto-dispatches each one that is in `Approved` status and has no remaining blockers. There is **no limit on cascade depth or breadth**. An attacker can construct a star-topology dependency graph (one blocker blocking N items, all in Approved status) and then reject or complete the blocker, triggering N synchronous auto-dispatches in a single request.
- **Potential Exploit Path:**
  1. Create one "hub" item H and N "dependent" items D1...DN.
  2. Add H as a blocker for each D1...DN via `POST /api/work-items/Di/dependencies`.
  3. Advance each Di to `Approved` status (via fast-track override PEN-003).
  4. Send `POST /api/work-items/H/reject {"reason":"trigger"}`.
  5. `onItemResolved(H)` iterates all N items in `H.blocks`, calling `store.updateWorkItem()` N times synchronously.
  6. Server performance degrades linearly with N.
- **Red Team Handoff Notes:** Create 100 items, add the hub dependency, approve all, then reject the hub. Measure response time and check if the server remains responsive for subsequent requests.

---

### PEN-013: Route Override Accepts Any `WorkItemRoute` Value — Including Invalid Inputs
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 39–64; `Source/Backend/src/services/router.ts` lines 66–88
- **Vulnerability Description:** `POST /api/work-items/:id/route` passes `body?.overrideRoute` directly to `classifyRoute()`. The `WorkItemRoute` enum has two values: `"fast-track"` and `"full-review"`. If an attacker sends an unrecognized string (e.g., `"exploit"`), `classifyRoute` evaluates: `overrideRoute` is truthy → enters the if-branch → sets `targetStatus` based on `overrideRoute === WorkItemRoute.FastTrack` (which is `false`) → assigns `targetStatus: WorkItemStatus.Proposed`. The invalid route string is stored as-is in `item.route`. The item's `route` field will contain an arbitrary attacker-controlled string.
- **Potential Exploit Path:**
  1. `POST /api/work-items/{id}/route` with `{"overrideRoute":"__proto__"}`.
  2. `store.updateWorkItem(id, { route: "__proto__", ... })`.
  3. `Object.assign(item, { route: "__proto__" })` — may interfere with prototype chain on the item object if the key is `__proto__`.
- **Red Team Handoff Notes:** Try `{"overrideRoute":"__proto__"}`, `{"overrideRoute":"constructor"}`, and `{"overrideRoute":"toString"}`. Verify whether prototype pollution is possible given `Object.assign` is used in `updateWorkItem`.

---

### PEN-014: No Rate Limiting — Open to Brute-Force and DoS
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — no rate-limit middleware
- **Vulnerability Description:** No rate-limiting middleware is applied to any endpoint. The API will process unlimited requests per second from any single source, enabling bulk enumeration, state-machine flooding, and resource exhaustion.
- **Potential Exploit Path:**
  1. Script 1000 parallel `POST /api/work-items` requests to flood the in-memory store.
  2. Follow with `GET /api/work-items?limit=999999` to exfiltrate all created items.
- **Red Team Handoff Notes:** `for i in $(seq 1 1000); do curl -s -X POST http://localhost:3001/api/work-items -H 'Content-Type: application/json' -d '{"title":"flood-$i","description":"flood test item","type":"bug","priority":"low","source":"manual"}' & done; wait`. Then verify store state.

---

### PEN-015: No CORS Policy — Cross-Origin Access from Any Domain
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — missing CORS middleware
- **Vulnerability Description:** No CORS middleware is configured. Express will not set `Access-Control-Allow-Origin` headers. For simple cross-origin requests (no custom headers), browsers may still succeed. For the frontend at `http://localhost:5173` making requests to `http://localhost:3001`, this works due to explicit same-origin intent, but any malicious web page can also make the same requests if the user's browser is on the same machine.
- **Potential Exploit Path:**
  1. Attacker hosts `evil.com` with JavaScript that calls `fetch("http://localhost:3001/api/work-items")`.
  2. If the victim's browser is on the same machine as the backend (developer's machine), the request succeeds.
  3. All work items are exfiltrated from the victim's local dev environment.
- **Red Team Handoff Notes:** Create a minimal HTML page with `fetch("http://localhost:3001/api/dashboard/queue")` and open it in a browser to confirm cross-origin requests succeed or fail.

---

## Attack Chains — Priority Exploit Sequences

### Chain A: Full State Machine Bypass (Objectives 1 & 3)
```
POST /api/work-items                          # Create item (backlog)
  → POST /api/work-items/{id}/route           # {"overrideRoute":"fast-track"} → approved
  → POST /api/work-items/{id}/dispatch        # {"team":"TheATeam"} → in-progress
```
Achieves: bypassed backlog→proposed→reviewing→approved pipeline in 3 unauthenticated requests.

### Chain B: Soft-Delete Dispatch Block (Objective 2)
```
POST /api/work-items                          # Create target item A
POST /api/work-items                          # Create blocker item B
POST /api/work-items/A/dependencies           # {"action":"add","blockerId":"B-id"}
POST /api/work-items/A/route + /approve       # Get A to Approved status
DELETE /api/work-items/B-id                   # Soft-delete B (while not in resolved status)
POST /api/work-items/A/dispatch               # → 400 "unresolved blocking dependencies" — PERMANENT
```
Achieves: access to soft-deleted item reference; permanent dispatch denial-of-service.

### Chain C: Full Data Exfiltration (Objective 4)
```
GET /api/dashboard/queue                      # All items, all statuses, full payload
GET /api/work-items?limit=999999              # Confirm all IDs via list endpoint
GET /api/dashboard/activity?limit=999999      # Full audit trail
```
Achieves: complete enumeration of all work items without pagination limit enforcement.

### Chain D: Malformed Assessment Verdict Bypass (Objective 3)
```
POST /api/intake/zendesk                      # {"title":"x","description":"y","type":"EVIL","priority":"EVIL"}
POST /api/work-items/{id}/route               # Normal routing → proposed
POST /api/work-items/{id}/assess              # Assessment pod runs on item with type="EVIL"
```
Assessment pod's `assessAsWorkDefiner` has `switch(item.type)` with no `default` — the item receives no `suggestedChanges`, potentially corrupting the assessment record. Combined with a manual approve override, the malformed item reaches `approved` status.

---

## IDOR-Prone Routes

| Endpoint | ID Type | Validation | Risk |
|---|---|---|---|
| `GET /api/work-items/:id` | UUID | findById + soft-delete check | Low (404 for unknown IDs) |
| `PATCH /api/work-items/:id` | UUID | findById only | High (no ownership) |
| `DELETE /api/work-items/:id` | UUID | findById only | High (any item deletable) |
| `POST /api/work-items/:id/approve` | UUID | findById only | Critical (no auth) |
| `POST /api/work-items/:id/reject` | UUID | findById only | Critical (no auth) |
| `POST /api/work-items/:id/dispatch` | UUID | findById only | Critical (no auth) |
| `POST /api/work-items/:id/route` | UUID | findById only | Critical (override accepted) |
| `POST /api/work-items/:id/dependencies` | UUID | findById only | High (dependency injection) |

---

## Notes for Red Teamer

1. **Start with PEN-009/PEN-011** to enumerate all item IDs before targeting specific items.
2. **Chain PEN-003 + PEN-004** to prove full state machine bypass in < 5 requests.
3. **For PEN-007**, the PATCH bulk-replace (`{"blockedBy":[]}`) may be the escape hatch — test it before and after the soft-delete to understand recovery feasibility.
4. **PEN-006** (enum injection via intake) is best tested by checking whether the frontend renders items with invalid types — look for JavaScript errors or broken UI states.
5. The `POST /api/work-items/:id/reject` cascade (PEN-012) triggers `onItemResolved` which calls `assignTeam()` on each dependent — this auto-assigns to a team. Verify if `TheATeam` gets flooded with auto-dispatched items after a mass-reject.
6. All work item IDs are standard UUIDs (v4, generated by `Source/Backend/src/utils/id.ts`). Sequential enumeration is not viable, but IDs are freely available from unauthenticated list endpoints.

---

## Red Team Results

**Executed by:** red_teamer  
**Date:** 2026-09-14  
**Target:** `http://localhost:3001` (portal/Backend — NOT Source/Backend)  
**Environment:** Ephemeral Docker container (`docker-compose.test.yml`)

> **⚠️ Scope Mismatch Discovered:** The pen-tester's Attack Surface Map was based on static analysis of `Source/Backend/` (the workflow engine). The live target running in `docker-compose.test.yml` is `portal/Backend/` — a different application (feature portal with feature-requests, bugs, cycles, learnings). All RED findings below are confirmed against the **actual live target**.

---

### RED-001: Complete Unauthenticated API Access — All Endpoints Exposed
- **Severity:** Critical
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/*`
- **Based On:** PEN-001, PEN-002
- **Exploit Scenario:**
  1. Sent `GET http://localhost:3001/api/feature-requests` with no credentials, no token, no session cookie.
  2. Server responded HTTP 200 with full dataset — no `WWW-Authenticate` challenge, no 401.
  3. Sent `POST /api/feature-requests` to create a new item — HTTP 201 returned with new record.
  4. Sent `PATCH /api/feature-requests/FR-0001` to modify any item — succeeds.
  5. Sent `DELETE /api/feature-requests/FR-0001` — HTTP 204, item permanently deleted.
  6. Repeated for `/api/bugs`, `/api/cycles`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/team-dispatches` — all HTTP 200, no auth required.
  7. Evidence: All 7 main resource endpoints return data with zero credentials.
- **Recommendation:** Implement authentication middleware (JWT or session) globally before all `/api/*` routes. All state-mutating endpoints (POST/PATCH/DELETE) require authenticated identity; read endpoints require at minimum a valid session.

---

### RED-002: State Machine Bypass via Unauthenticated Force-Approve
- **Severity:** Critical
- **Objective Achieved:** Yes — "Bypass work item state machine to reach an invalid status"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/force-approve`
- **Based On:** PEN-003, PEN-004
- **Exploit Scenario:**
  1. Created item `FR-0009` via `POST /api/feature-requests` — status: `potential`.
  2. Triggered AI voting via `POST /api/feature-requests/FR-0009/vote` (no auth) — status moved to `voting`.
  3. Sent `POST /api/feature-requests/FR-0009/force-approve` with body `{"reason":"red team override"}` — **no authentication, no admin role check**.
  4. Response: HTTP 200 with `"status":"approved"` and `"human_approval_approved_at":"2026-09-14T08:50:01.689Z"` — approval recorded as legitimate.
  5. Sent `PATCH /api/feature-requests/FR-0009` with `{"status":"in_development"}` — advanced further without approval gate.
  6. Final state: `in_development` — entire voting/approval lifecycle bypassed in 3 unauthenticated HTTP requests.
- **Recommendation:** All approval endpoints (`/approve`, `/force-approve`, `/deny`) must require an authenticated admin/operator role. The `force-approve` endpoint in particular should require elevated privilege (e.g., `role: admin`) and must be rate-limited.

---

### RED-003: Unauthorized Denial and Deletion of Any Item (Full IDOR)
- **Severity:** Critical
- **Objective Achieved:** Yes — any caller can destroy or alter any record
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST /api/feature-requests/:id/deny`, `DELETE /api/feature-requests/:id`
- **Based On:** PEN-002
- **Exploit Scenario:**
  1. Sent `POST /api/feature-requests/FR-0068/deny` with `{"comment":"Red team unauthorized deny"}` — HTTP 200, `"status":"denied"`.
  2. No credential or ownership check performed. Any item in `potential` or `voting` status can be permanently denied.
  3. Sent `DELETE /api/feature-requests/FR-0008` — HTTP 204. Item deleted. Confirmed with GET returning 404.
  4. Repeated DELETE on items created by other agents/users — all succeed with no authorization.
  5. Attack allows any network-accessible caller to destroy the entire feature backlog.
- **Recommendation:** Implement resource ownership model. DELETE and deny/reject actions must verify the caller's identity and role. Audit log must capture who performed destructive actions.

---

### RED-004: Stored XSS via Unvalidated Title and Description Fields
- **Severity:** High
- **Objective Achieved:** Yes (backend accepts; frontend render determines impact)
- **Status:** Confirmed (Live Exploit — stored payload)
- **Target URL:** `POST http://localhost:3001/api/feature-requests`
- **Based On:** PEN-005 (intake injection analog)
- **Exploit Scenario:**
  1. Sent `POST /api/feature-requests` with `"title":"<script>alert(document.cookie)</script>"` — HTTP 201, payload stored verbatim in database.
  2. Sent `POST /api/feature-requests` with `"description":"<img src=x onerror=alert(1)>"` — stored verbatim.
  3. Sent `POST /api/feature-requests` with `"description":"<svg onload=alert(1)>"` — stored verbatim.
  4. All payloads available via `GET /api/feature-requests` — served to any client loading the list.
  5. If the frontend renders `title` or `description` as `innerHTML` (vs text content), XSS fires in every user's browser that loads the feature-requests page.
- **Recommendation:** Apply server-side HTML sanitization (e.g., DOMPurify/sanitize-html) before storing. The frontend must use text-only rendering (e.g., React's default JSX rendering, never `dangerouslySetInnerHTML`). Add a `Content-Security-Policy` header that blocks inline scripts.

---

### RED-005: Soft-Deleted Item ID Leakage via Dependency References (IDOR)
- **Severity:** Medium
- **Objective Achieved:** Yes — "Access or modify a soft-deleted work item via direct ID reference"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET /api/feature-requests/:id`, `POST /api/feature-requests/:id/dependencies`
- **Based On:** PEN-007, PEN-008
- **Exploit Scenario:**
  1. Created items `FR-0011` (target A) and `FR-0012` (blocker B).
  2. Added B as a blocker of A: `POST /api/feature-requests/FR-0011/dependencies` with `{"action":"add","blocker_id":"FR-0012"}` — confirmed in `blocked_by` array.
  3. Soft-deleted B: `DELETE /api/feature-requests/FR-0012` — HTTP 204.
  4. Confirmed B inaccessible: `GET /api/feature-requests/FR-0012` → HTTP 404.
  5. However, `GET /api/feature-requests/FR-0011` returned `"blocked_by":[{"item_type":"feature_request","item_id":"FR-0012","title":"Unknown","status":"unknown"}]` — the deleted item's **ID is leaked** through the live item's dependency array.
  6. Used leaked ID to interact: `POST /api/feature-requests/FR-0011/dependencies {"action":"remove","blocker_id":"FR-0012"}` — succeeded (HTTP 200), modifying state via a soft-deleted item's reference.
  7. Additionally: `has_unresolved_blockers: true` persists until manually removed, creating potential dispatch DoS.
- **Recommendation:** When an item is soft-deleted, cascade-remove it from all `blocked_by` and `blocks` arrays of related items. Alternatively, filter soft-deleted IDs from dependency response payloads before returning to client.

---

### RED-006: No Pagination Enforcement — Complete Data Exfiltration in Single Request
- **Severity:** High
- **Objective Achieved:** Yes — "Enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/api/feature-requests`
- **Based On:** PEN-009
- **Exploit Scenario:**
  1. Sent `GET /api/feature-requests?limit=1` — returned **all 11 items** (limit ignored).
  2. Sent `GET /api/feature-requests?limit=999999` — returned **all 11 items** (limit ignored).
  3. The `listFeatureRequests()` service accepts no pagination parameters; it always returns the full dataset.
  4. After flooding 50 concurrent create requests, `GET /api/feature-requests` returned all 67 items in a single response.
  5. No `total`, `page`, `limit`, or `totalPages` fields in response — no pagination contract exists.
- **Recommendation:** Implement mandatory server-side pagination with a hard maximum `limit` (e.g., 100) and a default (e.g., 20). Return `{data, total, page, limit, totalPages}` structure. Enforce this in the service layer, not just the route handler.

---

### RED-007: No Rate Limiting — Unlimited Request Flood Accepted
- **Severity:** Medium
- **Objective Achieved:** Yes (resource exhaustion demonstrated)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests`
- **Based On:** PEN-014
- **Exploit Scenario:**
  1. Sent 50 concurrent `POST /api/feature-requests` requests simultaneously with no auth.
  2. All 50 requests succeeded — no HTTP 429 responses, no backpressure.
  3. Database grew from 17 to 67 records (+50) in a single burst.
  4. Server remained fully responsive after the flood (no DoS achieved at 50, but linear degradation risk at scale).
  5. No evidence of rate-limiting middleware in `portal/Backend/src/index.ts`.
- **Recommendation:** Add `express-rate-limit` middleware globally (e.g., 100 req/min per IP for GETs, 20 req/min for POSTs). Apply stricter limits on state-changing endpoints (`/approve`, `/force-approve`, `/deny`, `/vote`).

---

### RED-008: Internal State Fully Exposed via Unauthenticated Dashboard Endpoints
- **Severity:** Medium
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET /api/dashboard/summary`, `GET /api/dashboard/activity`
- **Based On:** PEN-011
- **Exploit Scenario:**
  1. `GET /api/dashboard/summary` → HTTP 200. Returns breakdown of all items by status, priority, and active cycle. No auth required.
  2. `GET /api/dashboard/activity` → HTTP 200. Returns full audit log of 14 recent events — entity IDs, descriptions, timestamps, all state transitions. No auth required.
  3. Combined with the enumeration endpoint, a full internal picture of the system's state is available to any unauthenticated caller.
- **Recommendation:** Dashboard endpoints expose aggregated internal state and audit trails. These must require at minimum a read-only authenticated session. The activity feed especially leaks internal agent names, workflow steps, and business-sensitive entity counts.

---

## Objectives Summary

| Objective | Status |
|-----------|--------|
| Bypass work item state machine to reach an invalid status | ✅ **Achieved** — RED-002: `potential→voting→approved→in_development` in 3 unauthenticated requests |
| Access or modify a soft-deleted work item via direct ID reference | ✅ **Achieved** — RED-005: Leaked ID used to remove dependency reference post-deletion |
| Submit a malformed assessment verdict that bypasses routing logic | ⚠️ **Partial** — Enum validation blocks invalid types/priorities on main routes; `force-approve` bypasses voting logic entirely (RED-002) |
| Enumerate all work items without pagination limit enforcement | ✅ **Achieved** — RED-006: `limit` parameter completely ignored, all records always returned |

**Grade implication:** 3 Critical confirmed breaches, 2 High, 2 Medium. By grading rubric: **F** (confirmed red-team breach of a critical objective).
