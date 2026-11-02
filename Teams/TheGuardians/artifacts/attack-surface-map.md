# Attack Surface Map — dev-crew Source App
**Produced by:** pen_tester  
**Date:** 2026-11-02  
**Scope:** White-box static analysis of `Source/Backend/`, `Source/Shared/`, `Source/Frontend/`  
**Config:** `Teams/TheGuardians/security.config.yml`  
**OWASP Focus:** A01 Broken Access Control, A03 Injection, A07 Authentication Failures, A08 Data Integrity Failures

---

## Executive Summary

The application has **zero authentication or authorization** on any endpoint. Every route is fully open to any unauthenticated caller. This single architectural gap makes the entire attack surface trivially exploitable and renders all other controls meaningless. In addition, the business logic contains several bypass paths that allow state-machine manipulation (bypassing the assessment pod) and full data enumeration via unbounded pagination.

---

## Findings

### PEN-001: Complete Absence of Authentication — All API Endpoints Unauthenticated
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (entire file — no auth middleware registered)
- **Vulnerability Description:**  
  `app.ts` registers zero authentication or authorization middleware. There is no `passport`, `express-jwt`, `express-session`, API-key check, or any equivalent on any route. Every endpoint is fully accessible to any unauthenticated HTTP caller. The full list of open routes includes: `POST/GET/PATCH/DELETE /api/work-items`, all workflow actions (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, `/dependencies`, `/ready`), all dashboard endpoints, all intake webhooks, and the Prometheus `/metrics` endpoint.
- **Potential Exploit Path:**
  1. Send any HTTP request to `http://localhost:3001/api/work-items` without any `Authorization` header or cookie.
  2. The request is processed directly by the route handler with no identity check.
  3. Full CRUD, all state transitions, and all dashboard data are accessible with zero credentials.
- **Red Team Handoff Notes:**  
  Start every exploit chain with an unauthenticated request. No token discovery or credential brute-force is needed. Confirm by calling `GET http://localhost:3001/api/work-items` and `GET http://localhost:3001/api/dashboard/summary` from a fresh session with no headers. All subsequent PEN findings assume unauthenticated access.

---

### PEN-002: Unbounded Pagination Enables Full Work-Item Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:69-71`, `Source/Backend/src/store/workItemStore.ts:31-63`
- **Vulnerability Description:**  
  The `GET /api/work-items` endpoint parses the `limit` query parameter with `parseInt` and passes it directly to the store with no upper-bound cap. In `workItemStore.findAll`, the limit is only defaulted (`pagination.limit || 20`) — it is never clamped to a maximum. An attacker can pass `limit=999999` to retrieve all items in a single unauthenticated request. The `pentest.objectives` list explicitly calls out this scenario.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1`
  2. The route passes `limit: 999999` to `store.findAll`.
  3. `store.findAll` applies `result.slice(0, 999999)`, returning the full dataset.
  4. All work items (including their full `changeHistory` and `assessments`) are returned.
- **Red Team Handoff Notes:**  
  - Primary payload: `GET http://localhost:3001/api/work-items?limit=999999`  
  - Secondary: combine with status filter to enumerate by lifecycle stage: `?limit=999999&status=approved`  
  - Confirm response `total` field matches `data.length` to verify bypass.  
  - Also test `limit=0` — store defaults to 20 (safe); test `limit=-1` — `parseInt("-1") = -1`, which is falsy... wait: `-1 || 20` → `-1` is truthy, so `slice(0, -1)` returns all but the last element. This is a secondary bypass vector.

---

### PEN-003: Intake Webhooks Have No Authentication or Signature Validation
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` (lines 11-31, 34-54)
- **Vulnerability Description:**  
  `POST /api/intake/zendesk` and `POST /api/intake/automated` accept arbitrary JSON bodies and create work items with no authentication, no IP allowlist, and no HMAC signature verification. Real Zendesk webhooks include an `X-Zendesk-Webhook-Signature` header for verification; this implementation ignores it entirely. Additionally, these endpoints do **not** validate the `type` and `priority` fields against their enum values (unlike the main `POST /api/work-items` route which does). Invalid enum values are stored directly in the `WorkItem`.
- **Potential Exploit Path:**
  1. `POST http://localhost:3001/api/intake/zendesk` with body `{"title":"x","description":"y","type":"INJECTED_TYPE","priority":"INJECTED_PRIORITY"}`
  2. No signature check is performed. No enum validation on `type`/`priority`.
  3. `store.createWorkItem` is called with `type: "INJECTED_TYPE"` — a value outside the `WorkItemType` enum — stored directly in the `WorkItem.type` field.
  4. The malformed item now exists in the system and may bypass routing/assessment logic that relies on type-based enum checks.
- **Red Team Handoff Notes:**  
  - Test 1 (spoofed Zendesk): `curl -X POST http://localhost:3001/api/intake/zendesk -H "Content-Type: application/json" -d '{"title":"Injected","description":"Spoofed webhook"}'`  
  - Test 2 (invalid enum): `curl -X POST http://localhost:3001/api/intake/zendesk -H "Content-Type: application/json" -d '{"title":"Test","description":"Test description","type":"hacked","priority":"urgent"}'`  
  - Verify the item is created and `type`/`priority` fields contain the non-enum string values.  
  - Test impact on downstream routing: route the malformed item and observe if `isFastTrack`/`isFullReview` handle the unexpected type.

---

### PEN-004: State Machine Bypass — Manual Approve Skips Assessment Pod
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:94-142`, `Source/Shared/types/workflow.ts:217`
- **Vulnerability Description:**  
  The `VALID_STATUS_TRANSITIONS` map includes `proposed → approved` as a valid transition. The `POST /api/work-items/:id/approve` endpoint enforces only this state-machine check — it does NOT require that assessment was completed first. An item created and routed to `proposed` status (full-review path) can be immediately approved without ever going through the assessment pod. This directly violates the intent of the full-review workflow and is explicitly listed as a red-team objective.
- **Potential Exploit Path:**
  1. `POST /api/work-items` — create any work item (title, description, type=feature, priority=high, source=manual)
  2. `POST /api/work-items/{id}/route` — item routes to `proposed` status (full-review path, since features always go full-review)
  3. `POST /api/work-items/{id}/approve` with body `{"reason":"bypassing assessment"}` — transition `proposed → approved` accepted by state machine
  4. Assessment pod never runs. Item is now in `approved` status, ready for dispatch.
  5. `POST /api/work-items/{id}/dispatch` — item dispatched to a team with no assessment ever completed.
- **Red Team Handoff Notes:**  
  - Use a `feature` type item to guarantee the full-review path is selected by `isFastTrack` (features never fast-track).  
  - After `/route`, confirm status is `proposed` in the response.  
  - Then immediately call `/approve` — confirm 200 response with `status: "approved"` and zero entries in `assessments[]`.  
  - Verify `changeHistory` shows: backlog → routing → proposed → approved (no reviewing entry).  
  - Also test from `routing` status (theoretical, as routing is transient but `routing → approved` is in the map).

---

### PEN-005: Route Override Allows Fast-Track Approval for Any Item Type
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:39-64`, `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:**  
  The `POST /api/work-items/:id/route` endpoint accepts an optional `overrideRoute` field in the request body. If `overrideRoute: "fast-track"` is provided, `classifyRoute` returns `targetStatus: Approved` regardless of item type, priority, or complexity. There is no role check, audit gate, or restriction on who can supply this override. A `feature` item (which should always require full-review and assessment) can be fast-tracked to `approved` by any unauthenticated caller.
- **Potential Exploit Path:**
  1. `POST /api/work-items` — create a `feature` item (high value, requires full assessment normally)
  2. `POST /api/work-items/{id}/route` with body `{"overrideRoute": "fast-track"}`
  3. `classifyRoute` detects `overrideRoute` is set, returns `{route: "fast-track", targetStatus: "approved"}`
  4. Item transitions directly from `backlog → routing → approved`, bypassing assessment entirely.
  5. Dispatch immediately with `POST /api/work-items/{id}/dispatch`.
- **Red Team Handoff Notes:**  
  - Payload: `{"overrideRoute": "fast-track"}`  
  - Confirm `route` field in response is `"fast-track"` and `status` is `"approved"`.  
  - Confirm `assessments[]` array is empty in the returned item.  
  - Combine with PEN-001 (unauthenticated): no credentials needed.

---

### PEN-006: Cascade Auto-Dispatch Triggered by Rejection — Business Logic Abuse
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:190-208`, `Source/Backend/src/services/dependency.ts:251-315`
- **Vulnerability Description:**  
  When `POST /api/work-items/:id/reject` is called and succeeds, `onItemResolved` is called (line 193). This function checks for any items that this item "blocks" and, if those dependents are in `Approved` status with all blockers resolved, **auto-dispatches them** without any human approval. This means: by strategically rejecting a blocker item, an attacker can trigger automatic dispatch of all dependent work items. The reject endpoint has no auth; anyone can reject any item in a rejectable state.
- **Potential Exploit Path:**
  1. Create item A (the blocker) and item B (dependent, blocked by A).
  2. Move both items to their required states: A to `approved`/`in-progress`/etc.; B to `approved` with A as a blocker.
  3. Reject item A via `POST /api/work-items/{A-id}/reject` with any reason string.
  4. `onItemResolved` fires: A is now in `rejected` (a `RESOLVED_STATUS`), B has no unresolved blockers, B is in `approved` → B is auto-dispatched to `in-progress`.
  5. Attacker has forced auto-dispatch of item B to a team without a human dispatcher decision.
- **Red Team Handoff Notes:**  
  - First verify `RESOLVED_STATUSES` includes `rejected` (confirmed: `Source/Shared/types/workflow.ts:227`).  
  - Setup: create two items, add dependency, advance B to `approved` status, A to any rejectable state.  
  - Then reject A. Verify B's status changed to `in-progress` automatically.  
  - Confirm `assignedTeam` was set by `assignTeam(B)` with no human decision.

---

### PEN-007: No Input Length Validation — Title and Description
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:24-26`, `Source/Backend/src/routes/intake.ts:13-15`
- **Vulnerability Description:**  
  `POST /api/work-items` validates that `title` and `description` are present, but imposes no maximum length. Both fields are stored in-memory as strings. A caller can submit a title or description of arbitrary length (e.g., 10MB string), which is accepted, stored, and returned in all list/detail responses. With no rate limiting (PEN-009) and unbounded pagination (PEN-002), this enables a memory exhaustion DoS. The intake routes (`/api/intake/zendesk`, `/api/intake/automated`) have the same flaw.
- **Potential Exploit Path:**
  1. Generate a 5MB string as the `description` value.
  2. `POST /api/work-items` repeatedly with this payload — no rate limiting stops this.
  3. Each item consumes ~5MB of heap. After N requests, the Node.js process exhausts available heap.
  4. Process crashes with OOM error, taking down the entire API.
- **Red Team Handoff Notes:**  
  - Payload example: `{"title":"t","description":"A".repeat(5000000),"type":"bug","priority":"low","source":"manual"}`  
  - Monitor server memory during the test.  
  - Also test `GET /api/work-items?limit=999999` after inserting large items to amplify memory pressure.

---

### PEN-008: Metrics Endpoint Publicly Exposes Operational Intelligence
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`
- **Vulnerability Description:**  
  `GET /metrics` returns Prometheus-format metrics with no authentication. Exposed counters include: `workflow_items_created_total` (by source/type), `workflow_items_routed_total` (by route), `workflow_items_assessed_total` (by verdict), `workflow_items_dispatched_total` (by team), `workflow_dispatch_gating_events_total`, `workflow_dependency_operations_total`, and `workflow_cycle_detection_events_total`. An attacker can infer system activity, team workloads, assessment failure rates, and approximate item counts.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — no credentials.
  2. Parse the Prometheus text format to extract counter values.
  3. Infer: how many items are being created per source (Zendesk vs manual), what percentage are fast-tracked vs full-review, what percentage are rejected by assessment, which team handles more dispatches.
- **Red Team Handoff Notes:**  
  - Fetch `http://localhost:3001/metrics` and parse Prometheus text format.  
  - Look for `workflow_items_created_total`, `workflow_items_assessed_total{verdict="reject"}`, `workflow_items_dispatched_total`.  
  - Confirm no auth header is required.

---

### PEN-009: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no rate-limit middleware registered)
- **Vulnerability Description:**  
  No rate-limiting middleware (e.g., `express-rate-limit`) is registered anywhere. All endpoints accept unlimited requests from a single IP. Combined with the unauthenticated access (PEN-001) and unbounded pagination (PEN-002), this enables: resource exhaustion via rapid creation of large items, enumeration of all work item IDs via rapid sequential requests, and denial-of-service via flooding workflow action endpoints.
- **Potential Exploit Path:**
  1. Loop: `POST /api/work-items` 10,000 times rapidly.
  2. No throttle, no 429 response.
  3. Or loop: `POST /api/work-items/{id}/assess` rapidly for the same item.
  4. Each call runs the assessment pod, accumulating assessment records in `item.assessments[]`, growing memory unboundedly.
- **Red Team Handoff Notes:**  
  - Send 100 concurrent creation requests. Verify all return 201 with no throttling.  
  - For assess DoS: call `/assess` 50 times on the same item (it allows re-assessment from `reviewing` status). Inspect the `assessments[]` array length — each call appends 4 new records. Verify unbounded growth.  
  - Use `wrk` or `ab` for load testing: `ab -n 1000 -c 50 -T application/json -p /tmp/payload.json http://localhost:3001/api/work-items`

---

### PEN-010: Assessment Re-Entry Allows Unbounded Assessment Record Accumulation
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts:183-233`, `Source/Backend/src/routes/workflow.ts:67-91`
- **Vulnerability Description:**  
  The `/assess` endpoint allows calling from both `proposed` and `reviewing` status. The `assessWorkItem` function always appends new assessment records to `item.assessments` (line 208: `[...item.assessments, ...result.assessments]`). An attacker who can manipulate the state (e.g., by cycling proposed → reviewing → proposed via repeated assess calls) can accumulate an unbounded number of `AssessmentRecord` entries on a single item, growing memory and inflating response payloads.
- **Potential Exploit Path:**
  1. Create an item where assessment always produces `NeedsClarification` (no complexity set).
  2. Call `/assess` → item goes from `proposed` to `rejected` (NeedsClarification maps to rejected in `runAssessmentPod`).
  3. Wait — this hits a wall because after rejection, status is `rejected`, not allowing re-assess.
  4. However: the route checks `status !== Proposed && status !== Reviewing` — if the item is already in `reviewing` (first assess transitions to reviewing immediately), calling assess again from reviewing IS valid per line 77 of `workflow.ts`. Multiple sequential assess calls on an item in reviewing status each add 4 new assessment records.
- **Red Team Handoff Notes:**  
  - Create an item, route it to `proposed`, then call `/assess` rapidly. Inspect `assessments[]` length after each call.  
  - The assessment service transitions to `reviewing` on first call (see `assessWorkItem` line 190), then moves to `approved` or `rejected`. A second call would fail the status check after the first completes. Test if race timing matters.  
  - More viable: create item with no complexity → NeedsClarification → rejected → reset to backlog (via `rejected → backlog` transition) → repeat.

---

### PEN-011: Crafted Work Items Can Guarantee Automated Assessment Approval
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts:19-102`
- **Vulnerability Description:**  
  The assessment pod logic is entirely deterministic and can be reverse-engineered. An attacker can craft a work item that is guaranteed to receive `Approve` from all pod members: title ≥ 5 chars, description ≥ 20 chars, any valid `complexity`, and any valid `priority`. The `work-definer` role always approves (line 95: hardcoded `AssessmentVerdict.Approve`). The `requirements-reviewer` approves on title ≥ 5 and description ≥ 20. The `domain-expert` approves when both `complexity` and `priority` are set. Combined with PEN-004 (unauthenticated approve), an attacker can predictably drive items to `approved` status either via guaranteed assessment pass or direct approve bypass.
- **Potential Exploit Path:**
  1. `POST /api/work-items` with `{"title":"Valid title","description":"Description that is at least twenty characters long","type":"feature","priority":"high","source":"manual","complexity":"small"}`
  2. `POST /api/work-items/{id}/route` → goes to `proposed`.
  3. `POST /api/work-items/{id}/assess` → requirements-reviewer approves (title OK, description OK), domain-expert approves (complexity + priority set), work-definer approves (always). Pod lead approves.
  4. Item is now `approved` through the "legitimate" assessment path, but entirely by design — attacker engineered the content to guarantee approval.
- **Red Team Handoff Notes:**  
  - Demonstrate deterministic approval: create the crafted item above, route and assess, confirm `approved` status with all 4 assessment records showing `approve` verdict.  
  - This matters when combined with dispatch: proves the assessment pod provides no security gate against a determined caller.

---

### PEN-012: Dashboard Activity Endpoint Leaks Full Change History Without Authentication
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts:16-22`, `Source/Backend/src/services/dashboard.ts:32-54`
- **Vulnerability Description:**  
  `GET /api/dashboard/activity` returns all `ChangeHistoryEntry` records for all work items, including `oldValue` and `newValue` for every field mutation. These entries contain internal state transitions, agent names, and reasons. There is no authentication. An attacker can reconstruct the full operational history of the system. The `limit` parameter defaults to 20 but accepts arbitrary values (same unbounded pagination pattern as PEN-002).
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/api/dashboard/activity?limit=999999` — no auth.
  2. Receive full chronological change log for all work items.
  3. Extract `oldValue`/`newValue` for status transitions to reconstruct item lifecycle.
  4. Use `workItemId` fields to correlate activity with specific items from PEN-002 enumeration.
- **Red Team Handoff Notes:**  
  - Fetch with large limit and confirm full history is returned.  
  - Look for `oldValue`/`newValue` pairs that may contain sensitive operational data.  
  - Cross-reference `workItemId` with item enumeration to build a full audit trail as an unauthenticated attacker.

---

### PEN-013: No CORS Policy — Browser Security Boundary Undefined
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no cors middleware)
- **Vulnerability Description:**  
  No CORS headers (`Access-Control-Allow-Origin`, etc.) are set. Express without `cors` middleware returns no CORS headers, so cross-origin browser requests are blocked by the Same-Origin Policy. However, since there is no authentication (PEN-001) and the API is fully open, an attacker-controlled web page can still make simple (non-preflighted) cross-origin GET requests and read responses if the server were ever to add permissive CORS in the future without concurrent auth. More critically, the absence of a defined CORS policy means that future auth additions (cookies, tokens) may fail cross-origin without coordinated CORS configuration, creating pressure to open up CORS permissively.
- **Potential Exploit Path:**
  1. Not directly exploitable without auth.
  2. If Basic Auth or session cookies are added later without CORS review, cross-origin requests from attacker-controlled pages could credential-attach to the API.
- **Red Team Handoff Notes:**  
  - `curl -H "Origin: http://evil.example.com" -I http://localhost:3001/api/work-items` — confirm no `Access-Control-Allow-Origin` header returned.  
  - Low priority; note for future auth implementation planning.

---

## Attack Chains (Multi-Step Exploit Sequences)

### Chain A: Full Data Exfiltration (No Auth Required)
1. `GET /api/work-items?limit=999999` → dumps all work items
2. `GET /api/dashboard/activity?limit=999999` → dumps full change history
3. `GET /api/dashboard/queue` → gets real-time queue state
4. **Impact:** Complete data exfiltration of all operational state

### Chain B: Unauthenticated State Machine Compromise
1. `POST /api/work-items` (create item)
2. `POST /api/work-items/{id}/route` with `{"overrideRoute":"fast-track"}` (bypass assessment)
3. `POST /api/work-items/{id}/dispatch` with `{"team":"TheATeam"}` (force dispatch to specific team)
4. **Impact:** Arbitrary work items injected into team queues without any review

### Chain C: Spoofed Zendesk Webhook with Invalid Enum Injection
1. `POST /api/intake/zendesk` with `{"title":"Injected","description":"Malicious ticket","type":"INVALID","priority":"CRITICAL"}`
2. Work item created with non-enum type value
3. Route the item — `isFastTrack` and `isFullReview` both fail to match on unknown type; `isFullReview` returns `true` by default
4. Item enters full-review path with corrupted type field
5. **Impact:** Data integrity corruption; potential downstream logic errors

### Chain D: Cascade Dispatch Abuse via Rejection
1. Create blocker item A, dependent item B with A as blocker
2. Advance B to `approved` status (via fast-track override)
3. Advance A to a rejectable state (e.g., `proposed`)
4. `POST /api/work-items/{A-id}/reject` with any reason
5. `onItemResolved` triggers, auto-dispatches B to a team
6. **Impact:** Arbitrary dispatch of approved items without explicit dispatcher action

---

## IDOR Analysis
- **Work item IDs** are UUIDs (`generateId()`). Direct ID guessing is impractical, but with unauthenticated list enumeration (PEN-002), all IDs are disclosed. Once IDs are known, any operation can be performed on any item.
- **No authorization context**: there is no concept of "this item belongs to user X" — any caller can perform any operation on any item by ID.
- **Soft-deleted items**: `findById` correctly returns `undefined` for items with `deleted: true`. `updateWorkItem` also checks `item.deleted`. Soft-deleted items are not directly accessible via the API.

---

## Entry Points Mapped (per security.config.yml)

| Entry Point | Auth Required | Findings |
|---|---|---|
| `POST /api/work-items` | None | PEN-001, PEN-007, PEN-009 |
| `GET /api/work-items` | None | PEN-001, PEN-002 |
| `GET /api/work-items/:id` | None | PEN-001 |
| `PATCH /api/work-items/:id` | None | PEN-001 |
| `DELETE /api/work-items/:id` | None | PEN-001 |
| `POST /api/work-items/:id/route` | None | PEN-001, PEN-005 |
| `POST /api/work-items/:id/assess` | None | PEN-001, PEN-010, PEN-011 |
| `POST /api/work-items/:id/approve` | None | PEN-001, PEN-004 |
| `POST /api/work-items/:id/reject` | None | PEN-001, PEN-006 |
| `POST /api/work-items/:id/dispatch` | None | PEN-001 |
| `POST /api/work-items/:id/dependencies` | None | PEN-001 |
| `GET /api/work-items/:id/ready` | None | PEN-001 |
| `GET /api/dashboard/summary` | None | PEN-001 |
| `GET /api/dashboard/activity` | None | PEN-001, PEN-012 |
| `GET /api/dashboard/queue` | None | PEN-001 |
| `POST /api/intake/zendesk` | None | PEN-001, PEN-003 |
| `POST /api/intake/automated` | None | PEN-001, PEN-003 |
| `GET /metrics` | None | PEN-008 |

---

## Red Team Objectives Mapping (per security.config.yml)

| Objective | Finding(s) | Exploit Chain |
|---|---|---|
| Bypass work item state machine to reach invalid status | PEN-004, PEN-005 | Chain B |
| Access or modify a soft-deleted work item via direct ID reference | Not achievable via current code — `findById` returns undefined for deleted items | N/A |
| Submit a malformed assessment verdict that bypasses routing logic | PEN-003 (invalid enum via intake) | Chain C |
| Enumerate all work items without pagination limit enforcement | PEN-002 | Chain A |

---

## Red Team Results

**Executed by:** red_teamer  
**Date:** 2026-11-02  
**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — portal backend at `http://localhost:3001`  
**Note:** The pen-tester's attack surface map was produced against `Source/Backend/` (work-item/workflow domain). The running service is `portal/Backend/` (feature-request/bug/cycle domain). Exploit chains were adapted to the live target; PEN finding numbers are mapped by analogy where the vulnerability class is identical.

---

### RED-001: Unauthenticated Force-Approve Bypasses Entire Voting Process
- **Severity:** Critical
- **Objective Achieved:** Yes — "Bypass work item state machine to reach an invalid status"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/force-approve`
- **Based On:** PEN-001 (no auth), PEN-004/PEN-005 analogs (state machine bypass)
- **Exploit Scenario:**
  1. `POST /api/feature-requests` — create any feature request (no credentials); item starts in `potential` status.
  2. `PATCH /api/feature-requests/FR-0007` with `{"status":"voting"}` — no auth required; item transitions to `voting`.
  3. `POST /api/feature-requests/FR-0007/force-approve` — no auth required; route handler has zero authentication middleware. The "human override" function is callable by any anonymous HTTP client.
  4. **Result:** FR-0007 status = `"approved"`, `votes: []` (zero votes cast), `human_approval_approved_at` timestamp set. The entire community voting process is bypassed without any credentials.
  5. The `deny` endpoint (`POST /:id/deny`) is equally unprotected — an anonymous caller can deny any feature request in `voting` status.
- **Evidence:** `curl -X POST http://localhost:3001/api/feature-requests/FR-0007/force-approve` → `{"status":"approved","votes":[],"human_approval_approved_at":"2026-11-02T10:52:17.920Z"}`
- **Recommendation:** All human-decision endpoints (`/force-approve`, `/deny`, `/approve`) must require authentication and role-based authorization (e.g., `role: "admin"` or `role: "product-manager"`). Add auth middleware before the router or use an API gateway policy.

---

### RED-002: Cycle Completion Without Lifecycle Phase Progression
- **Severity:** High
- **Objective Achieved:** Yes — "Bypass work item state machine to reach an invalid status"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/cycles/:id/complete`
- **Based On:** PEN-001 (no auth), PEN-004 analog (state machine bypass)
- **Exploit Scenario:**
  1. `POST /api/cycles` — create a new development cycle; it starts in `spec_changes` status (initial phase).
  2. `POST /api/cycles/CYCLE-0001/complete` — no auth required; no status guard in `completeCycle()`. The only guard checks incomplete tickets, but a freshly created cycle has zero tickets so the check trivially passes.
  3. **Result:** Cycle status jumps directly from `spec_changes` → `complete`, skipping all intermediate phases (`in_development`, `testing`, etc.). The service also auto-creates a `Feature` record and a `Learning` record as if work was properly done, and marks the associated work item as `completed`.
  4. An attacker can fabricate completed development cycles for arbitrary work items, polluting the feature and learning records without any real work being performed.
- **Evidence:** `curl -X POST http://localhost:3001/api/cycles/CYCLE-0001/complete` → `{"status":"complete","completed_at":"2026-11-02T10:54:05.608Z"}` from `spec_changes` initial status.
- **Recommendation:** Add a status guard in `completeCycle()` requiring the cycle to be in an expected terminal state (e.g., `testing` or `ready_to_deploy`) before accepting completion. Add authentication middleware to all mutation endpoints.

---

### RED-003: Full Data Exfiltration — All Items Enumerable Without Auth or Pagination Limit
- **Severity:** High
- **Objective Achieved:** Yes — "Enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/api/feature-requests`, `GET /api/bugs`, `GET /api/dashboard/summary`, `GET /metrics`
- **Based On:** PEN-001 (no auth), PEN-002 (unbounded pagination), PEN-008 (metrics exposure), PEN-012 (dashboard leakage)
- **Exploit Scenario:**
  1. `GET /api/feature-requests` — returns ALL feature requests in a single response with no authentication. No `limit` parameter accepted; the service performs a full table scan. During testing, 31 items were returned in one request.
  2. `GET /api/dashboard/summary` — returns real-time operational counts by status and severity (confirmed: `{"feature_requests":{"potential":27,"voting":0,"approved":2,...},"bugs":{...}}`).
  3. `GET /metrics` — 531-line Prometheus dump including `feature_request_status_transitions_total`, `bug_status_transitions_total`, HTTP request counts per route and status code. Reveals system activity patterns without credentials.
  4. Full dataset, operational state, and internal activity metrics are exfiltrated with three unauthenticated GET requests.
- **Evidence:** `curl http://localhost:3001/api/feature-requests` returned 31 items; `curl http://localhost:3001/api/dashboard/summary` returned full status breakdown; `curl http://localhost:3001/metrics` returned 531 lines of operational data.
- **Recommendation:** All list and dashboard endpoints require authentication. Metrics endpoint (`/metrics`) must be protected with network policy (scrape-only from internal Prometheus) or a bearer token. Implement server-side pagination with a hard maximum page size.

---

### RED-004: No Rate Limiting — Unbounded Request Flooding Confirmed
- **Severity:** High
- **Objective Achieved:** Partial (DoS risk confirmed; no OOM achieved in test time)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests` (and all endpoints)
- **Based On:** PEN-009 (no rate limiting)
- **Exploit Scenario:**
  1. Sent 20 rapid sequential `POST /api/feature-requests` requests with no throttle. All 20 returned HTTP 201.
  2. No `Retry-After` header, no `429 Too Many Requests` response, no IP-based rate limiting observed.
  3. Combined with full data enumeration (RED-003), an attacker can flood item creation to exhaust database storage and inflate list-endpoint response sizes (body limit is 16KB on input but no limit on DB or output size).
  4. All workflow mutation endpoints (approve, deny, force-approve, complete) are equally unprotected.
- **Evidence:** 20/20 POST requests returned 201 with no throttling signal.
- **Recommendation:** Deploy `express-rate-limit` middleware (or API gateway rate limiting) with per-IP limits. Apply stricter limits to state-mutation endpoints. Consider a global request budget per session/token once auth is added.

---

### RED-005: Unauthenticated Deny — Adversarial Feature Request Rejection
- **Severity:** High
- **Objective Achieved:** Yes — "Submit a malformed assessment verdict that bypasses routing logic" (analog)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST http://localhost:3001/api/feature-requests/:id/deny`
- **Based On:** PEN-001 (no auth), PEN-004 analog
- **Exploit Scenario:**
  1. Move any feature request to `voting` status via unauthenticated PATCH.
  2. `POST /api/feature-requests/FR-0032/deny` with `{"comment":"Denying without any credentials"}` — no auth check.
  3. **Result:** Feature request status = `"denied"`. Any competitor or malicious actor can systematically deny competitor-submitted feature requests without any credentials.
  4. Symmetric with RED-001: both force-approve and deny are available to anonymous callers, allowing complete manipulation of the approval outcome.
- **Evidence:** `curl -X POST http://localhost:3001/api/feature-requests/FR-0032/deny -d '{"comment":"..."}'` → `{"status":"denied"}` with no `Authorization` header.
- **Recommendation:** Same as RED-001 — require authentication and role authorization on all approval-decision endpoints.

---

## Red Team Objectives Summary

| Objective | Status | RED Finding |
|---|---|---|
| Bypass work item state machine to reach an invalid status | **ACHIEVED** | RED-001, RED-002 |
| Access or modify a soft-deleted work item via direct ID reference | Not applicable to live portal backend (soft-delete not implemented here) | N/A |
| Submit a malformed assessment verdict that bypasses routing logic | **ACHIEVED (analog)** | RED-005 (unauthenticated deny/force-approve) |
| Enumerate all work items without pagination limit enforcement | **ACHIEVED** | RED-003 |

**Overall Grade Impact:** Multiple Critical/High confirmed breaches. Per `security.config.yml` grading scale: any confirmed red-team breach of a critical objective → **Grade F**.
