# Attack Surface Map
**Produced by:** pen_tester  
**Target:** dev-crew Source App — Backend API (`http://localhost:3001`)  
**Scope:** White-box static analysis of `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`  
**OWASP Focus:** A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A07 Auth Failures, A08 Data Integrity  
**Date:** 2026-10-05  

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2     |
| High     | 4     |
| Medium   | 4     |
| Low      | 2     |
| **Total** | **12** |

The application has **zero authentication or authorization** on any endpoint. Every finding below is reachable by any anonymous HTTP client. Authentication and authorization should be treated as a system-wide prerequisite before deploying to any non-ephemeral environment.

---

## Critical Findings

### PEN-001: Complete Absence of Authentication and Authorization — All Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 13–44)
- **Vulnerability Description:**  
  No authentication middleware (JWT, session, API key, OAuth) is mounted anywhere in the Express app. The middleware chain goes directly from `express.json()` parsing to route handlers. Every destructive action — approve, reject, dispatch, delete, create via spoofed webhooks — is reachable by any unauthenticated HTTP client.  
  There is also no authorization layer: no role-based or resource-based access controls exist, so even if authentication were added, the existing code has no mechanism to enforce *who* can approve or dispatch items.
- **Potential Exploit Path:**
  1. Send `POST /api/work-items/:id/approve` with no credentials.
  2. Express parses the body and routes to the approve handler.
  3. Handler checks only business-logic status transition — no identity check.
  4. Item is approved and committed to store; `200 OK` is returned.
- **Red Team Handoff Notes:**  
  Try every state-altering endpoint with no `Authorization` header and no cookies:
  - `POST /api/work-items` — create item
  - `POST /api/work-items/:id/approve` — approve any item
  - `POST /api/work-items/:id/reject` — reject any item with `{"reason":"…"}`
  - `POST /api/work-items/:id/dispatch` — dispatch any approved item
  - `DELETE /api/work-items/:id` — soft-delete any item
  - `POST /api/intake/zendesk` — inject items as if from Zendesk  
  All should succeed with `2xx` responses.

---

### PEN-002: Intake Webhook Endpoints — No Signature or Token Verification
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` (lines 11–56)
- **Vulnerability Description:**  
  `POST /api/intake/zendesk` and `POST /api/intake/automated` accept arbitrary JSON payloads with no HMAC signature check, no shared secret validation, and no source-IP allowlist. A real Zendesk integration signs webhook payloads with `X-Zendesk-Webhook-Signature`; this endpoint ignores it completely. Any actor who discovers the endpoint URL can spoof Zendesk or automated events, injecting arbitrary work items into the pipeline. Additionally, `type` and `priority` fields from the webhook body are passed directly to `store.createWorkItem()` without enum validation (see PEN-004).
- **Potential Exploit Path:**
  1. Attacker sends `POST /api/intake/zendesk` with `{"title": "...", "description": "...", "type": "malicious-type", "priority": "CRITICAL-OVERRIDE"}`.
  2. No signature check occurs; item is created immediately.
  3. Item with invalid enum values for `type` and `priority` is persisted to the store.
  4. Downstream assessment and routing logic encounters unexpected enum values.
- **Red Team Handoff Notes:**  
  ```bash
  curl -X POST http://localhost:3001/api/intake/zendesk \
    -H "Content-Type: application/json" \
    -d '{"title":"Injected via spoofed webhook","description":"Red team test","type":"arbitrary_invalid_type","priority":"PWNED"}'
  ```  
  Verify: (a) `201` returned, (b) item persisted in store with non-enum `type`/`priority` values, (c) dashboard shows the item.  
  Also attempt without title/description to test error handling and confirm `400` is returned.

---

## High Findings

### PEN-003: State Machine Bypass via Unauthenticated `overrideRoute` Parameter
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (line 57); `Source/Backend/src/services/router.ts` (lines 66–88)
- **Vulnerability Description:**  
  The `POST /api/work-items/:id/route` endpoint accepts a body parameter `overrideRoute` (typed `WorkItemRoute`). When provided, `classifyRoute()` unconditionally applies it and skips all business-logic classification (bug type, complexity checks). Supplying `overrideRoute: "fast-track"` sets the item status directly to `Approved`, bypassing the entire assessment pod review cycle. There is no authorization check on who can supply an override, and no runtime validation that the string matches the `WorkItemRoute` enum — an arbitrary string in `overrideRoute` is accepted (TypeScript-only enforcement).  
  Combined with PEN-001 (no auth), any anonymous user can fast-track any `Backlog` item directly to `Approved` status.
- **Potential Exploit Path:**
  1. Attacker creates a new work item (`POST /api/work-items`) → item is in `Backlog` status.
  2. Attacker sends `POST /api/work-items/{id}/route` with body `{"overrideRoute": "fast-track"}`.
  3. `classifyRoute` takes the override path, sets `targetStatus = WorkItemStatus.Approved`.
  4. Item skips `Proposed → Reviewing → Approved` pipeline; ends in `Approved` state.
  5. Attacker then dispatches the item: `POST /api/work-items/{id}/dispatch`.
- **Red Team Handoff Notes:**  
  ```bash
  # 1. Create item
  ITEM=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H "Content-Type: application/json" \
    -d '{"title":"Bypass test","description":"Attacker-controlled feature","type":"feature","priority":"critical","source":"manual"}')
  ID=$(echo $ITEM | jq -r '.id')

  # 2. Fast-track to Approved (bypasses assessment pod)
  curl -s -X POST http://localhost:3001/api/work-items/$ID/route \
    -H "Content-Type: application/json" \
    -d '{"overrideRoute":"fast-track"}'

  # 3. Dispatch immediately
  curl -s -X POST http://localhost:3001/api/work-items/$ID/dispatch \
    -H "Content-Type: application/json" \
    -d '{"team":"TheATeam"}'
  ```  
  Also test `overrideRoute` with a value not in the enum (e.g., `"invalid-route"`) — the service should reject it but currently has no runtime validation. Confirm whether the string is stored as-is.

---

### PEN-004: Unbounded Pagination Limit — Full Work Item Store Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 68–70); `Source/Backend/src/store/workItemStore.ts` (lines 33–63)
- **Vulnerability Description:**  
  The `GET /api/work-items` endpoint reads `limit` from the query string and passes it directly to `findAll()` with no upper-bound cap. An attacker can set `limit=9999999` to retrieve the entire contents of the in-memory store in a single response. This defeats pagination as a data exposure control and enables complete enumeration of all work items, including their full internal UUIDs, docIds, titles, descriptions, change histories, and assessment records.  
  The red-team objective "Enumerate all work items without pagination limit enforcement" maps directly to this finding.
- **Potential Exploit Path:**
  1. Attacker sends `GET /api/work-items?limit=999999&page=1` with no credentials.
  2. `findAll` slices `result.slice(0, 999999)` — returns all items.
  3. Complete store dump returned in one HTTP response.
- **Red Team Handoff Notes:**  
  ```bash
  curl "http://localhost:3001/api/work-items?limit=999999&page=1"
  ```  
  Verify total count in response `.total` matches total returned in `.data` array. Also test `limit=0`, `limit=-1`, `limit=NaN`, and `limit=Infinity` to probe edge cases.

---

### PEN-005: Dashboard Endpoints — Unauthenticated Full System State Exposure
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts` (lines 9–31); `Source/Backend/src/services/dashboard.ts`
- **Vulnerability Description:**  
  Three dashboard endpoints expose the complete system state to unauthenticated callers:  
  - `GET /api/dashboard/queue` — returns **all** non-deleted work items grouped by status, including full item data (IDs, content, assessments).  
  - `GET /api/dashboard/activity` — returns ALL change history entries across all items with `workItemId` and `workItemDocId` in the response, enabling item ID enumeration.  
  - `GET /api/dashboard/summary` — exposes counts by status, team, and priority.  
  The queue and activity endpoints expose the internal UUID (`workItemId`) of every item, allowing an attacker to build a complete map of the store and target specific items with subsequent PATCH/workflow actions.
- **Potential Exploit Path:**
  1. `GET /api/dashboard/queue` — extract all item IDs from `data[*].items[*].id`.
  2. `GET /api/dashboard/activity` — extract `workItemId` from every history entry.
  3. Use collected IDs to approve, dispatch, or delete targeted items without needing to enumerate them through pagination.
- **Red Team Handoff Notes:**  
  ```bash
  # Enumerate all item IDs via queue endpoint
  curl http://localhost:3001/api/dashboard/queue | jq '[.data[].items[].id]'
  
  # Enumerate via activity endpoint (includes soft-deleted items' historical entries)
  curl http://localhost:3001/api/dashboard/activity | jq '[.data[].workItemId]'
  ```  
  Confirm that soft-deleted item IDs still appear in activity history (even if the item itself is hidden from `GET /api/work-items`).

---

## Medium Findings

### PEN-006: `NeedsClarification` Assessment Verdict Silently Mapped to `Rejected`
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts` (lines 162–168)
- **Vulnerability Description:**  
  In `assessWorkItem()`, the pod-lead verdict is mapped to a final status:  
  ```typescript
  if (podLeadAssessment.verdict === AssessmentVerdict.Approve) {
    targetStatus = WorkItemStatus.Approved;
  } else {
    targetStatus = WorkItemStatus.Rejected;  // ← catches BOTH Reject AND NeedsClarification
  }
  ```  
  A `NeedsClarification` verdict (triggered when `complexity` or `priority` is unset) is silently treated identically to a hard `Rejected` verdict. The item is moved to `Rejected` status, and the only recovery path is `Rejected → Backlog → re-route → re-assess`. An attacker who understands this flaw can exploit it to create a denial-of-service pattern: repeatedly triggering clarification verdicts on items they did not create (if they can trigger re-assessment), causing legitimate items to cycle endlessly between `Backlog` and `Rejected`.  
  The red-team objective "Submit a malformed assessment verdict that bypasses routing logic" maps to this.
- **Potential Exploit Path:**
  1. Create an item without `complexity` set.
  2. Route it (`POST /api/work-items/:id/route`) → `Proposed` status.
  3. Trigger assessment (`POST /api/work-items/:id/assess`).
  4. Domain expert returns `NeedsClarification`; pod-lead sets `NeedsClarification`.
  5. `assessWorkItem` maps this to `WorkItemStatus.Rejected`.
  6. Item is now `Rejected` despite only needing clarification, not being fundamentally flawed.
- **Red Team Handoff Notes:**  
  ```bash
  # Create item without complexity
  ITEM=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H "Content-Type: application/json" \
    -d '{"title":"Test clarity","description":"This needs clarification","type":"feature","priority":"medium","source":"manual"}')
  ID=$(echo $ITEM | jq -r '.id')
  curl -s -X POST http://localhost:3001/api/work-items/$ID/route
  curl -s -X POST http://localhost:3001/api/work-items/$ID/assess
  ```  
  Confirm: status is `rejected` despite no hard rejection reason; pod-lead notes say "Clarification needed" but status says `rejected`.

---

### PEN-007: No Security HTTP Headers — Clickjacking, MIME Sniffing, Information Disclosure
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (line 11–44)
- **Vulnerability Description:**  
  No security headers middleware (e.g., Helmet.js) is configured. The API responses lack:  
  - `X-Frame-Options` / `Content-Security-Policy: frame-ancestors` — allows the API to be framed.  
  - `X-Content-Type-Options: nosniff` — allows MIME-type sniffing.  
  - `X-Powered-By` is present (Express default) — discloses framework and version.  
  - `Strict-Transport-Security` — no HSTS if served over HTTPS.  
  The `X-Powered-By: Express` header discloses the framework, enabling targeted framework-specific exploit enumeration.
- **Potential Exploit Path:**
  1. `curl -I http://localhost:3001/health` — observe `X-Powered-By: Express` in response.
  2. Absence of `X-Frame-Options` allows embedding the API responses in iframes (relevant if cookies are added later).
- **Red Team Handoff Notes:**  
  ```bash
  curl -I http://localhost:3001/api/work-items
  ```  
  Check response headers for presence of `X-Powered-By`, absence of `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`.

---

### PEN-008: Prometheus Metrics Endpoint — Unauthenticated Operational Intelligence Disclosure
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (line 34); `Source/Backend/src/metrics.ts`
- **Vulnerability Description:**  
  `GET /metrics` exposes Prometheus-format metrics to any unauthenticated caller. Metrics include `items_created_total` (by source and type), `items_routed_total` (by route), `items_assessed_total` (by verdict), `items_dispatched_total` (by team), `dependency_operations_total`, and `dispatch_gating_events_total`. This provides an adversary with an operational intelligence feed: item velocity, team assignment rates, rejection rates, and whether fast-tracking is being used extensively. This information can be used to time attacks or understand usage patterns.
- **Potential Exploit Path:**
  1. `GET /metrics` — parse Prometheus output.
  2. Observe `items_dispatched_total{team="TheATeam"}` count to determine team load.
  3. Observe `dispatch_gating_events_total{event="blocked"}` to gauge dependency complexity.
- **Red Team Handoff Notes:**  
  ```bash
  curl http://localhost:3001/metrics
  ```  
  Verify all metric families are returned without authentication. Note whether metric labels disclose any PII or sensitive item identifiers.

---

### PEN-009: Computational DoS via Unbounded `blockedBy` Array in PATCH
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 120–129); `Source/Backend/src/services/dependency.ts` (`setDependencies`, `addDependency`)
- **Vulnerability Description:**  
  `PATCH /api/work-items/:id` accepts a `blockedBy` array without any size limit. `setDependencies()` first removes all current blockers (O(n) operations), then adds each new one (O(m) operations). Each `addDependency` call performs a **BFS cycle detection** on the entire dependency graph before adding the link. Supplying a large `blockedBy` array triggers O(n × E) BFS traversals where E is the number of dependency edges. An attacker can send a PATCH with `blockedBy` containing hundreds of valid item IDs, causing expensive graph traversal on each addition and saturating the Node.js event loop.
- **Potential Exploit Path:**
  1. Create 100+ work items.
  2. Link them in a chain to build a wide dependency graph.
  3. Send `PATCH /api/work-items/{id}` with `{"blockedBy": ["id1","id2",...,"id100"]}`.
  4. Each `addDependency` call traverses the entire graph via BFS — event loop is blocked during computation.
- **Red Team Handoff Notes:**  
  Create 50 items, then send a single PATCH to one item with all 50 IDs in `blockedBy`. Measure response time. Try progressively larger arrays.  
  ```bash
  # Create items, then
  curl -X PATCH http://localhost:3001/api/work-items/$ID \
    -H "Content-Type: application/json" \
    -d '{"blockedBy":["id1","id2",...,"id50"]}'
  ```

---

## Low Findings

### PEN-010: Soft-Deleted Item IDs Enumerable via Change History in Dashboard Activity
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dashboard.ts` (lines 35–53)
- **Vulnerability Description:**  
  When a work item is soft-deleted, its change history entries (including the `deleted` entry) remain accessible in the dashboard activity feed. The `getActivity()` service iterates over `getAllItems()` which filters out deleted items, so deleted items' histories are NOT exposed. However, the `findById()` filter means that `GET /api/work-items/:id` returns 404 for deleted items — but deletion is recorded in the change history of the item which, once deleted, cannot be retrieved by ID. The risk here is indirect: if an item was referenced as a dependency and is now deleted, the `DependencyLink.blockerItemId` still contains the UUID, which could be used to test for existence of formerly-deleted items via 404 probing.
- **Potential Exploit Path:**
  1. Create an item A, create item B that blocks A.
  2. Delete item A.
  3. `GET /api/work-items/B` returns B with `blockedBy` containing A's ID.
  4. `GET /api/work-items/{A.id}` returns 404, confirming deletion state.
- **Red Team Handoff Notes:**  
  Use the `blockedBy` array from a retrieved item to probe existence of related (potentially deleted) items.

---

### PEN-011: Missing `/api/search` Endpoint — 404 Instead of Defined Contract
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts` (line 102); `Source/Backend/src/app.ts` (confirmed absent)
- **Vulnerability Description:**  
  The frontend `DependencyPicker` component calls `workItemsApi.searchItems(q)` which hits `GET /api/search?q=...`. This endpoint is not mounted in `app.ts`. Express returns a generic 404 with an HTML error page for unregistered routes (depending on configuration). The missing endpoint causes the dependency picker typeahead to silently fail. Additionally, when this endpoint is implemented in the future, if the `q` parameter is passed directly into a string-matching function without sanitization, it could be used for RegExp injection or to enumerate item content.  
  The test file `Source/Backend/tests/routes/search.test.ts` explicitly documents this gap.
- **Potential Exploit Path:**
  1. `GET /api/search?q=` — currently returns 404 or falls through to errorHandler.
  2. When implemented, `GET /api/search?q=.*` or `GET /api/search?q=(a+)+` could trigger ReDoS if regex is used for matching.
- **Red Team Handoff Notes:**  
  ```bash
  curl "http://localhost:3001/api/search?q=test"
  ```  
  Confirm current 404. Once implemented, test with `q=` (empty), `q=.*`, `q=<script>alert(1)</script>`, and `q=(a+)+aaaaaaaaaaaab` (ReDoS payload).

---

## Red Team Priority Order

Based on the objectives in `security.config.yml`, prioritize in this order:

| Priority | Finding | Config Objective |
|----------|---------|-----------------|
| 1 | PEN-001 + PEN-003 | Bypass work item state machine / fast-track to invalid status |
| 2 | PEN-003 (overrideRoute) | Reach Approved/Dispatched bypassing assessment pod |
| 3 | PEN-004 + PEN-005 | Enumerate all work items without pagination limit |
| 4 | PEN-002 | Submit spoofed webhook verdict; access via soft-delete direct ID ref |
| 5 | PEN-006 | Submit malformed assessment verdict that bypasses routing logic |

---

## Codebase Attack Patterns (For Red Teamer)

- **All IDs are UUIDs** (unpredictable) — enumerate via dashboard endpoints (PEN-005) first
- **DocIDs are sequential** (`WI-001`, `WI-002`, ...) — useful for human targeting but not usable as API keys
- **Store is in-memory** — restarting the server resets all state; attacks that require persistence across restarts will fail
- **No authentication** — every curl command below works with zero headers beyond `Content-Type`
- **State machine entry points:** `Backlog → route → (Proposed | Approved) → assess → (Approved | Rejected) → dispatch → InProgress`
- **Fast-track shortcut:** `Backlog → route(overrideRoute:"fast-track") → Approved → dispatch` (bypasses everything)
