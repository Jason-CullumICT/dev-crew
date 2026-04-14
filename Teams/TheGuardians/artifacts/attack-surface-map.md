# Attack Surface Map — dev-crew Source App
**Generated:** 2026-04-14  
**Analyst:** pen_tester  
**Scope:** White-box static analysis — Source/Backend/, Source/Frontend/, Source/Shared/  
**OWASP Focus:** A01 (Broken Access Control), A02 (Cryptographic Failures), A03 (Injection), A07 (Auth Failures), A08 (Data Integrity Failures)

---

## Executive Summary

The application is a **completely unauthenticated and unauthorised API**. There is no authentication middleware, no session management, no token validation, and no RBAC anywhere in the codebase. Every state-mutating endpoint is freely callable by any network-accessible client. Combined with several business-logic flaws in the workflow state machine, an attacker has full control over the work item lifecycle with zero credentials required.

**Critical objectives achievable without authentication:**
- Bypass the entire assessment pod and approve any work item directly (fast-track override)
- Create unlimited work items via unauthenticated intake webhooks with corrupt enum data
- Enumerate all work items and change history in a single unauthenticated request
- Force cascade dispatch of approved work items by rejecting their blockers

---

## Findings

### PEN-001: Zero Authentication on All API Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (entire app) — No auth middleware registered
- **OWASP:** A07: Identification and Authentication Failures
- **Vulnerability Description:**
  The Express application mounts all routes with zero authentication or authorization middleware. There is no JWT validation, no session cookie check, no API key, no Basic Auth — nothing. The CLAUDE.md documents credentials (`admin@example.com / admin123`) but no auth implementation exists anywhere in the codebase. Every endpoint is anonymous and world-accessible.
- **Potential Exploit Path:**
  1. No credentials, headers, or session tokens needed
  2. Send any HTTP request directly to `http://localhost:3001/api/*`
  3. Full read/write access to all work items, all workflow transitions, all dashboards, all intake endpoints
- **Red Team Handoff Notes:**
  - Baseline: `curl http://localhost:3001/api/work-items` — expect 200 with data, no auth challenge
  - Confirm write access: `curl -X POST http://localhost:3001/api/work-items -H 'Content-Type: application/json' -d '{"title":"pen-test","description":"unauthorized creation test","type":"bug","priority":"low","source":"manual"}'`
  - Expected: 201 Created — confirms zero authentication enforcement

---

### PEN-002: No Authorization — Any Caller Can Execute Privileged State Transitions
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` — `/approve`, `/reject`, `/dispatch`, `/route` endpoints; no RBAC guard exists anywhere
- **OWASP:** A01: Broken Access Control
- **Vulnerability Description:**
  There is no role-based or attribute-based access control. All workflow transitions — including approve, reject, and dispatch — are available to any anonymous caller. Actions that should be restricted to privileged roles (e.g., "approver", "dispatcher") are callable by anyone. There is no concept of a user identity, role, or permission in the codebase.
- **Potential Exploit Path:**
  1. Create a work item, route it to `proposed` status
  2. Call `POST /api/work-items/:id/approve` with no credentials
  3. Item transitions to `approved` — human review completely bypassed
  4. Call `POST /api/work-items/:id/dispatch` with `{"team": "TheATeam"}`
  5. Item moves to `in-progress` with team assigned, completing full hostile workflow takeover
- **Red Team Handoff Notes:**
  - Approve any item: `curl -X POST http://localhost:3001/api/work-items/{id}/approve -H 'Content-Type: application/json' -d '{"reason":"unauthorized approval"}'`
  - Reject any item: `curl -X POST http://localhost:3001/api/work-items/{id}/reject -H 'Content-Type: application/json' -d '{"reason":"hostile rejection"}'`
  - Dispatch any approved item to either team: `curl -X POST http://localhost:3001/api/work-items/{id}/dispatch -H 'Content-Type: application/json' -d '{"team":"TheATeam"}'`
  - Objective: achieve a full lifecycle (backlog → in-progress) with zero legitimate review activity

---

### PEN-003: Fast-Track Override Bypasses Entire Assessment Pod
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57`, `Source/Backend/src/services/router.ts:66–75`
- **OWASP:** A01: Broken Access Control / A08: Software and Data Integrity Failures
- **Vulnerability Description:**
  The `POST /api/work-items/:id/route` endpoint accepts an optional `overrideRoute` field in the request body. When set to `"fast-track"`, the item skips the entire assessment pod and transitions directly from `backlog` → `approved` in a single call. No assessment, no pod review, no human approval is required. This override is available to any unauthenticated caller with no privilege check.

  Relevant code path (`router.ts:66–75`):
  ```ts
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus:
        overrideRoute === WorkItemRoute.FastTrack
          ? WorkItemStatus.Approved   // ← directly approved, no assessment
          : WorkItemStatus.Proposed,
    };
  }
  ```
- **Potential Exploit Path:**
  1. Create a work item: `POST /api/work-items` (any type/priority/source)
  2. Route with fast-track override: `POST /api/work-items/:id/route` body `{"overrideRoute":"fast-track"}`
  3. Item immediately reaches `approved` status — assessment pod entirely bypassed
  4. Dispatch: `POST /api/work-items/:id/dispatch` body `{"team":"TheATeam"}`
  5. Item is now `in-progress` — full workflow cycle completed in 3 unauthenticated requests
- **Red Team Handoff Notes:**
  - Step 1: `curl -X POST http://localhost:3001/api/work-items -H 'Content-Type: application/json' -d '{"title":"Bypass Test","description":"Testing fast-track override bypass","type":"feature","priority":"critical","source":"manual"}'` — note returned `id`
  - Step 2: `curl -X POST http://localhost:3001/api/work-items/{id}/route -H 'Content-Type: application/json' -d '{"overrideRoute":"fast-track"}'` — verify response shows `status: "approved"`, `route: "fast-track"`
  - Step 3: `curl -X POST http://localhost:3001/api/work-items/{id}/dispatch -H 'Content-Type: application/json' -d '{"team":"TheATeam"}'`
  - **Config objective match:** "Bypass work item state machine to reach an invalid status" — this achieves direct `backlog → approved` in one route call, skipping `routing → proposed → reviewing → approved`

---

### PEN-004: Intake Webhooks Accept Arbitrary Enum Values Without Validation
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:19–26` (Zendesk), `34–42` (Automated)
- **OWASP:** A03: Injection / A08: Data Integrity Failures
- **Vulnerability Description:**
  The intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) pass `body.type` and `body.priority` directly to `store.createWorkItem()` without validating them against the enum allowlist. The standard `POST /api/work-items` endpoint performs explicit enum validation, but the intake routes do not:

  ```ts
  // intake.ts — NO enum validation:
  const item = store.createWorkItem({
    type: body.type || WorkItemType.Bug,      // ← raw user input, not validated
    priority: body.priority || WorkItemPriority.Medium,  // ← raw user input, not validated
    ...
  });

  // workItems.ts — CORRECT validation present:
  if (!Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Valid type is required' });
  }
  ```

  An arbitrary string type/priority is stored in the in-memory model, causing downstream routing logic (`isFastTrack`, `isFullReview`, `assignTeam`) to malfunction silently. The `assignTeam` function has no fallback for unknown types other than defaulting to `TheFixer`, and the type-switch in `assessAsWorkDefiner` produces no suggestions for unknown types, skewing assessment results.
- **Potential Exploit Path:**
  1. Send `POST /api/intake/zendesk` with `{"title":"...","description":"...","type":"POISON","priority":"POISON"}`
  2. Work item is created with corrupt `type` and `priority` values
  3. When routed, `isFastTrack` never matches (unknown type), always falls through to `full-review`
  4. Assessment pod's `assessAsWorkDefiner` switch has no branch for unknown types — no suggestions generated
  5. Data model is polluted; inconsistent UI rendering for type/priority badges
- **Red Team Handoff Notes:**
  - `curl -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"Zendesk Injection Test","description":"Testing enum bypass via intake","type":"HOSTILE_TYPE","priority":"HOSTILE_PRIORITY"}'`
  - Verify: `curl http://localhost:3001/api/work-items/{id}` — confirm `type: "HOSTILE_TYPE"` is stored
  - Also test with `type: null` (to force the fallback) and `type: ""` — both should resolve to defaults, but verify
  - **Bonus objective:** Try extremely long strings (>1000 chars) in `title`/`description` — no length limits exist (`Source/Backend/src/routes/intake.ts` has no length validation at all)

---

### PEN-005: No Webhook Authentication — Forged Zendesk Events Accepted
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11–31`
- **OWASP:** A07: Identification and Authentication Failures / A08: Data Integrity Failures
- **Vulnerability Description:**
  The Zendesk webhook endpoint accepts arbitrary POST requests without any form of webhook authentication. Zendesk's standard webhook security uses an HMAC-SHA256 signature in the `X-Zendesk-Webhook-Signature` header. No such verification is implemented. Any actor with network access to the endpoint can forge Zendesk webhook events and inject arbitrary work items into the queue with `source: "zendesk"`.
- **Potential Exploit Path:**
  1. Send `POST /api/intake/zendesk` with any `title` and `description` — no signature required
  2. Work item created with `source: "zendesk"` — indistinguishable from legitimate Zendesk input
  3. Combined with PEN-003, the attacker routes the forged item with `overrideRoute: "fast-track"` to approve it immediately
  4. Work queue is flooded with attacker-controlled items appearing to originate from customer support
- **Red Team Handoff Notes:**
  - `curl -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"Urgent: Deploy backdoor","description":"Critical security patch must be deployed immediately","type":"bug","priority":"critical"}'`
  - No `X-Zendesk-Webhook-Signature` header needed — confirm 201 Created
  - Rate test: fire 100+ requests in rapid succession to confirm no rate limiting exists

---

### PEN-006: Unbounded Pagination Enables Full Dataset Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68–74`, `Source/Backend/src/routes/dashboard.ts:17–20`, `Source/Backend/src/services/dashboard.ts:57–76`
- **OWASP:** A01: Broken Access Control
- **Vulnerability Description:**
  Two compounding issues allow complete data enumeration without pagination controls:

  **Issue A — `/api/work-items` accepts unlimited `limit`:**
  ```ts
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  // No upper bound check — limit=999999 accepted
  ```

  **Issue B — `/api/dashboard/queue` has no pagination at all:**
  ```ts
  export function getQueue(): DashboardQueueResponse {
    const items = getAllItems();  // ALL items, no limit
    // ...returns full dataset grouped by status, no slice()
  }
  ```

  Additionally, `parseInt` with non-numeric values returns `NaN`, and `NaN || 20 = 20` (safe fallback). But negative page values: `page=-1` → `offset = (-1-1)*20 = -40` → `array.slice(-40, -20)` returns items near the end — unintended data access pattern.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999` — dumps entire work item dataset in one response
  2. `GET /api/dashboard/queue` — dumps all work items grouped by status (always unbounded)
  3. `GET /api/dashboard/activity?limit=999999` — dumps entire change history of all items
  4. `GET /api/work-items?page=-1&limit=20` — access "negative page" slice (returns last items)
- **Red Team Handoff Notes:**
  - Full dump: `curl "http://localhost:3001/api/work-items?limit=999999"`
  - Queue dump: `curl http://localhost:3001/api/dashboard/queue`
  - **Config objective match:** "Enumerate all work items without pagination limit enforcement"
  - Verify: check `total` field in response matches item count from queue dump
  - Negative pagination: `curl "http://localhost:3001/api/work-items?page=-1&limit=5"` — note which items are returned

---

### PEN-007: Cascade Auto-Dispatch Triggered by Hostile Rejection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:192–202`, `Source/Backend/src/services/dependency.ts:251–315`
- **OWASP:** A01: Broken Access Control / A08: Data Integrity Failures
- **Vulnerability Description:**
  The `POST /api/work-items/:id/reject` endpoint calls `onItemResolved(id)` after rejection. This function checks all items blocked by the rejected item: if a dependent is in `Approved` status with no other unresolved blockers, it is **automatically dispatched** to a team without any human dispatch action. This cascade bypasses the manual dispatch step.

  Critically, `DISPATCH_TRIGGER_STATUSES` includes `Rejected` — rejection of a blocker is intentionally designed to unblock dependents. An attacker can exploit this:
  1. Create a legitimate-looking blocker item
  2. Create a target item, get it to `Approved` status
  3. Add a dependency: target is blocked by the decoy blocker
  4. Reject the blocker → cascade fires → target auto-dispatches

  This achieves dispatch of an approved item without the normal `POST /dispatch` call, skipping any dispatch-time gating checks (although the dispatch gating in `onItemResolved` does re-check `computeHasUnresolvedBlockers`).

  ```ts
  // dependency.ts:284-295 — cascade fires silently
  const updated = store.updateWorkItem(dependent.id, {
    status: WorkItemStatus.InProgress,
    assignedTeam: team,   // ← auto-assigned, no human decision
    ...
  });
  ```
- **Potential Exploit Path:**
  1. Create item A (decoy blocker) — any valid fields, route to `approved` via fast-track override
  2. Create item B (target) — route to `proposed`, assess (ensure passes: title≥5, desc≥20, complexity set)
  3. Item B should reach `approved` status
  4. `POST /api/work-items/B/dependencies` body `{"action":"add","blockerId":"A.id"}`
  5. `POST /api/work-items/A/reject` body `{"reason":"cascade trigger"}`
  6. B auto-dispatches to a team without `POST /B/dispatch` being called
- **Red Team Handoff Notes:**
  - Verify cascade in response: the reject response for A should not show B's dispatch, but a subsequent `GET /api/work-items/B` should show `status: "in-progress"`
  - Also check: `GET /api/dashboard/activity` — look for `cascade-dispatcher` agent entries
  - **Config objective match:** "Bypass work item state machine to reach an invalid status" — specifically the dispatch step being triggered by rejection rather than dispatch action

---

### PEN-008: Soft-Deleted Item IDs Leaked via Dependency Gating Error
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:231–244`, `Source/Backend/src/services/dependency.ts:64–75`
- **OWASP:** A01: Broken Access Control
- **Vulnerability Description:**
  When a work item with a soft-deleted blocker attempts dispatch, the dispatch gating error response includes the full `unresolvedBlockers` array, which contains the soft-deleted item's `blockerItemId` (UUID) and `blockerItemDocId` (e.g., `WI-007`). Direct access to `GET /api/work-items/{deleted_id}` returns 404, but the ID is exposed in this error response.

  Additionally, `computeHasUnresolvedBlockers` treats soft-deleted blockers as unresolved (since `findById` returns `undefined` for deleted items, and `!blocker` → `true` → "unresolved"). This creates an implicit blocker that prevents dispatch without being visible to the user through normal list endpoints.

  ```ts
  // dependency.ts:68-74
  const blocker = store.findById(link.blockerItemId);
  if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
    return true;  // soft-deleted blocker = unresolved = dispatch blocked
  }
  ```
- **Potential Exploit Path:**
  1. Create item A (blocker) and item B (blocked)
  2. Set B blocked by A: `POST /api/work-items/B/dependencies`
  3. Soft-delete A: `DELETE /api/work-items/A` (204 No Content)
  4. Get B to `approved` status
  5. Attempt dispatch: `POST /api/work-items/B/dispatch` → 400 with `unresolvedBlockers: [{blockerItemId: "A-uuid", blockerItemDocId: "WI-XXX", ...}]`
  6. A's ID and docId are revealed in error response despite A being soft-deleted
- **Red Team Handoff Notes:**
  - **Config objective match:** "Access or modify a soft-deleted work item via direct ID reference"
  - The leaked ID from step 5 can be used to attempt: `GET /api/work-items/{A-uuid}` (expect 404), `PATCH /api/work-items/{A-uuid}` (expect 404 via store guard)
  - Determine if the recovered ID can be used as a dependency reference: try `POST /api/work-items/C/dependencies` with `{"action":"add","blockerId":"{A-uuid}"}` — `addDependency` calls `findById` so expect "not found" error
  - Note: `removeDependency` DOES allow removal of a soft-deleted blocker's link because it only requires `blockedId` to exist (comment in code: "blocker may be soft-deleted"). So `POST /api/work-items/B/dependencies` with `{"action":"remove","blockerId":"{A-uuid}"}` should succeed and unblock B

---

### PEN-009: NeedsClarification Verdict Silently Maps to Rejected Status
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts:162–168`
- **OWASP:** A08: Software and Data Integrity Failures
- **Vulnerability Description:**
  The assessment pod can produce three verdicts: `approve`, `reject`, and `needs-clarification`. However, the status mapping in `assessWorkItem` only handles `approve`; any other verdict (including `needs-clarification`) defaults to `Rejected` status:

  ```ts
  if (podLeadAssessment.verdict === AssessmentVerdict.Approve) {
    targetStatus = WorkItemStatus.Approved;
  } else {
    targetStatus = WorkItemStatus.Rejected;  // NeedsClarification → Rejected (bug)
  }
  ```

  A `needs-clarification` verdict is produced when `complexity` is not set on the item (domain expert check). An attacker can exploit this predictable logic:
  - Items WITHOUT `complexity` set → domain expert returns `NeedsClarification` → pod lead returns `NeedsClarification` → item is Rejected
  - Items WITH `complexity` set AND title≥5 AND desc≥20 → all assessors approve → item is Approved

  This makes the assessment pod entirely predictable and manipulable by crafting item fields.
- **Potential Exploit Path:**
  1. Create item without `complexity` field → assess → gets `NeedsClarification` → becomes `Rejected`
  2. Move back to Backlog (valid transition: Rejected → Backlog)  
  3. PATCH with `complexity: "trivial"` → assess again → all assessors approve → item `Approved`
  4. This is a reliable, repeatable approval path that requires no human review
- **Red Team Handoff Notes:**
  - Create with no complexity: `POST /api/work-items` with no `complexity` field
  - Route to proposed: `POST /api/work-items/{id}/route`  
  - Assess: `POST /api/work-items/{id}/assess` — verify `status` is `rejected` and assessments contain `needs-clarification` verdict
  - **Config objective match:** "Submit a malformed assessment verdict that bypasses routing logic"
  - Resubmit to Backlog: `POST /api/work-items/{id}/approve` (from routing, should be valid since Routing→Approved is in VALID_STATUS_TRANSITIONS) — then re-route, re-assess with complexity set

---

### PEN-010: Unauthenticated Prometheus /metrics Endpoint — Operational Intelligence
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34–37`
- **OWASP:** A01: Broken Access Control
- **Vulnerability Description:**
  The Prometheus metrics endpoint is publicly accessible with no authentication:

  ```ts
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```

  Exposed data includes:
  - `workflow_items_dispatched_total{team="TheATeam"}` — reveals team assignment rates
  - `workflow_items_assessed_total{verdict="approve|reject|needs-clarification"}` — reveals assessment pass rate
  - `dispatch_gating_events_total{event="blocked|cascade_dispatched"}` — reveals dependency patterns
  - Node.js default metrics: heap size, event loop lag, GC statistics, active handles — reveals server load and potential memory pressure
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — returns full Prometheus text format
  2. Parse counter values to understand system load, approval rates, and dispatch patterns
  3. Use temporal analysis (poll repeatedly) to detect when new items enter the queue
  4. Use heap/GC metrics to time attacks when server is under load
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` — confirm full metrics output without auth
  - Key metrics to extract: `workflow_items_created_total`, `workflow_items_dispatched_total`, `dispatch_gating_events_total`
  - Check for `nodejs_heap_size_used_bytes` — baseline memory usage for DoS timing

---

### PEN-011: Stored Content Injection via Unrestricted Text Fields
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:24–56` (POST), `Source/Backend/src/routes/intake.ts` (intake), `Source/Backend/src/routes/workflow.ts:115`, `150` (approve/reject reason)
- **OWASP:** A03: Injection
- **Vulnerability Description:**
  Multiple endpoints accept free-text fields with no length validation:
  - `title`, `description` in all creation/update endpoints (no `maxLength`)
  - `reason` in approve and reject endpoints
  - Intake webhook `title` and `description`

  While React's JSX rendering prevents traditional XSS (no `dangerouslySetInnerHTML`), the stored content surfaces in:
  1. **Change history** rendered in `WorkItemDetailPage` (`HistoryEntry` component, `entry.reason` field)
  2. **Assessment notes** rendered in `AssessmentCard` component
  3. **All list/detail API responses** — other integrations consuming the API may not be React-based

  The `approve` and `reject` reason is stored verbatim in `changeHistory` and returned in all future reads of the item.

  Additionally: no upper length bound means arbitrarily large payloads can inflate in-memory store size:
  ```ts
  // No validation — title of 1MB accepted:
  if (!body.title || !body.description) { ... }  // Only checks non-empty
  ```
- **Potential Exploit Path:**
  1. `POST /api/work-items` with `title` = 1MB string, `description` = 1MB string
  2. Item stored in memory; repeated creation causes heap inflation
  3. `POST /api/work-items/{id}/reject` with `reason` = arbitrary long string → stored in changeHistory → returned in every future read
  4. `GET /api/dashboard/activity` must serialize all changeHistory entries — large payloads amplify response size
- **Red Team Handoff Notes:**
  - Payload size test: `curl -X POST http://localhost:3001/api/work-items -H 'Content-Type: application/json' -d "{\"title\":\"$(python3 -c 'print("A"*10000)')\",\"description\":\"$(python3 -c 'print("B"*50000)')\",\"type\":\"bug\",\"priority\":\"low\",\"source\":\"manual\"}"`
  - Check `/metrics` for heap growth after large item creation
  - Stored text via rejection: `curl -X POST http://localhost:3001/api/work-items/{id}/reject -H 'Content-Type: application/json' -d "{\"reason\":\"$(python3 -c 'print(\"X\"*100000)')\"}"` — confirm stored and returned in GET

---

### PEN-012: Frontend References Non-Existent /api/search Backend Route
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts:101–104`; no corresponding route in `Source/Backend/src/app.ts`
- **OWASP:** A05: Security Misconfiguration (missing implementation / broken feature)
- **Vulnerability Description:**
  The frontend API client defines a `searchItems` function that calls `GET /api/search?q=...`. This endpoint does not exist in the backend. Express falls through to the generic error handler, which returns `Cannot GET /api/search` (default Express 404), leaking the framework identity. The `DependencyPicker` component likely uses this — if invoked, the typeahead search is broken, potentially causing the UI to silently swallow errors.
- **Potential Exploit Path:**
  1. Trigger `GET http://localhost:3001/api/search?q=test`
  2. Response reveals Express framework 404 body format: `"Cannot GET /api/search"`
  3. Framework fingerprinting — confirms Express.js, version range can be inferred from response headers
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/api/search?q=test` — confirm 404 and note response body/headers
  - Check `X-Powered-By: Express` header (if not disabled) for version fingerprinting
  - Note: If `DependencyPicker` component surfaces in UI — attempt to trigger it and observe network calls for the failing search request

---

## Attack Chain Summary

### Chain Alpha — Full Workflow Takeover (3 requests, no credentials)
> Achieves backlog → in-progress bypassing all review gates

```
1. POST /api/work-items            → Create item (any valid fields)
2. POST /api/work-items/{id}/route {"overrideRoute":"fast-track"}  → Instant Approved
3. POST /api/work-items/{id}/dispatch {"team":"TheATeam"}          → In-Progress
```

### Chain Beta — Covert Cascade Dispatch (uses dependency system)
> Approved items auto-dispatched without calling the dispatch endpoint

```
1. Create item A (decoy blocker), fast-track to Approved
2. Create item B (target), assess to Approved (title≥5, desc≥20, complexity set)
3. POST /api/work-items/B/dependencies {"action":"add","blockerId":"A.id"}
4. POST /api/work-items/A/reject {"reason":"cascade trigger"}
   → B auto-dispatches via onItemResolved() cascade
```

### Chain Gamma — Full Data Exfiltration (2 requests)
> Dumps entire work item dataset with no pagination

```
1. GET /api/work-items?limit=999999        → All items, all fields, all IDs
2. GET /api/dashboard/queue               → All items grouped by status (unbounded)
3. GET /api/dashboard/activity?limit=999999 → Full change history of all items
```

### Chain Delta — Corrupt Queue via Forged Zendesk Webhooks
> Injects hostile work items appearing as Zendesk tickets

```
1. POST /api/intake/zendesk {"title":"...","description":"...","type":"HOSTILE","priority":"HOSTILE"}
   → Item created with corrupt enum values, source="zendesk"
2. Route item with fast-track override → Approved
3. Dispatch to any team → In-Progress
```

---

## Red Team Objectives Matrix

| Config Objective | PEN IDs | Achievable? |
|---|---|---|
| Bypass work item state machine to reach invalid status | PEN-001, PEN-002, PEN-003 | Yes — fast-track override: backlog→approved in 1 call |
| Access or modify a soft-deleted work item via direct ID reference | PEN-008 | Partial — ID leaked via dispatch error; GET returns 404 |
| Submit malformed assessment verdict that bypasses routing logic | PEN-009 | Yes — crafted item fields guarantee approve/reject outcome |
| Enumerate all work items without pagination limit enforcement | PEN-006 | Yes — `limit=999999` or `/dashboard/queue` |

---

## Findings Index

| ID | Title | Severity |
|---|---|---|
| PEN-001 | Zero Authentication on All API Endpoints | **Critical** |
| PEN-002 | No Authorization — Privileged Transitions Unenforced | **Critical** |
| PEN-003 | Fast-Track Override Bypasses Assessment Pod | **High** |
| PEN-004 | Intake Webhooks Accept Unvalidated Enum Values | **High** |
| PEN-005 | No Webhook Authentication — Forged Events Accepted | **High** |
| PEN-006 | Unbounded Pagination Enables Full Dataset Enumeration | **High** |
| PEN-007 | Cascade Auto-Dispatch Triggered by Hostile Rejection | **High** |
| PEN-008 | Soft-Deleted Item IDs Leaked via Dependency Gating Error | **Medium** |
| PEN-009 | NeedsClarification Verdict Silently Maps to Rejected | **Medium** |
| PEN-010 | Unauthenticated /metrics Endpoint — Operational Intelligence | **Medium** |
| PEN-011 | Stored Content Injection via Unrestricted Text Fields | **Medium** |
| PEN-012 | Frontend References Non-Existent /api/search Route | **Low** |

**Totals: 2 Critical, 5 High, 4 Medium, 1 Low — 12 findings**
