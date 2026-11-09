# Attack Surface Map — dev-crew Source App
**Agent:** pen_tester | **Date:** 2026-11-09 | **Scope:** White-box static analysis of `Source/`

---

## Methodology

Traced all external inputs through routes → services → store for auth checks, state-machine validity, and business-logic constraints. Focused on the five OWASP categories from `security.config.yml` and all `pentest.critical_entry_points`. No CWE/secret scanning duplicated from SAST.

**Tech stack:** Node.js / Express, in-memory Map store, TypeScript strict, no DB layer.

---

## Summary Table

| ID | Title | Severity | OWASP | File(s) |
|---|---|---|---|---|
| PEN-001 | No Authentication on Any API Endpoint | **Critical** | A01, A07 | `src/app.ts` |
| PEN-002 | State Machine Bypass via Fast-Track Override | **High** | A01, A04 | `routes/workflow.ts`, `services/router.ts` |
| PEN-003 | Intake Webhooks — No HMAC Validation + Enum Field Injection | **High** | A03, A07 | `routes/intake.ts` |
| PEN-004 | Reject Action Triggers Unintended Auto-Dispatch Cascade | **High** | A04 | `routes/workflow.ts`, `services/dependency.ts` |
| PEN-005 | Approve Endpoint Reachable from `routing` Transient Status | **High** | A04 | `routes/workflow.ts`, `Shared/types/workflow.ts` |
| PEN-006 | No Pagination Upper-Bound → DoS via Memory Exhaustion | **Medium** | A04 | `routes/workItems.ts`, `routes/dashboard.ts` |
| PEN-007 | Soft-Deleted Blocker Permanently Locks Dependent Dispatch | **Medium** | A04 | `services/dependency.ts`, `store/workItemStore.ts` |
| PEN-008 | `NeedsClarification` Verdict Silently Collapses to `Rejected` | **Medium** | A04 | `services/assessment.ts` |
| PEN-009 | Repeated Assessment Calls Accumulate Unbounded Pod Records | **Medium** | A04 | `routes/workflow.ts`, `services/assessment.ts` |
| PEN-010 | Prometheus Metrics Endpoint Exposed Without Authentication | **Low** | A01 | `src/app.ts` |
| PEN-011 | Sequential `docId` Enables Full Work-Item Enumeration | **Low** | A01 | `utils/id.ts` |

---

## Findings

---

### PEN-001: No Authentication on Any API Endpoint
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — all route registrations (lines 22–38)
- **Vulnerability Description:**
  The Express application mounts all routers (`workItemsRouter`, `workflowRouter`, `dashboardRouter`, `intakeRouter`) with zero authentication middleware. There is no JWT validation, session check, API key guard, or any identity mechanism on any route. The only middleware before all routes is a debug-level request logger (line 16–19). Every endpoint — including state-altering workflow transitions (approve, reject, dispatch) and the Prometheus metrics page — is fully open to anonymous access.
- **Potential Exploit Path:**
  1. Send `POST http://localhost:3001/api/work-items/:id/approve` with no headers.
  2. The request reaches the route handler at `routes/workflow.ts:94` unimpeded.
  3. The handler checks only the work item's status, not the caller's identity.
  4. The item is approved. No credential required.
- **Red Team Handoff Notes:**
  - Verify every endpoint in scope rejects unauthenticated requests (expected: they do NOT).
  - Probe all five critical entry points with zero auth headers.
  - Also try the Prometheus endpoint: `GET /metrics` — should return internal counters.
  - Confirm that `POST /api/work-items/:id/reject`, `/approve`, `/dispatch` all succeed without any `Authorization` header.

---

### PEN-002: State Machine Bypass via Fast-Track Override
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57` → `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:**
  `POST /api/work-items/:id/route` accepts an optional `overrideRoute` body field of type `WorkItemRoute`. When `overrideRoute` equals `"fast-track"`, `classifyRoute()` skips all heuristic logic and directly returns `targetStatus: WorkItemStatus.Approved`. This bypasses the entire assessment pod (requirements-reviewer, domain-expert, work-definer, pod-lead). Because there is no authentication (PEN-001) and no authorization check on the override parameter, any anonymous caller can fast-track any work item to `Approved` with a single HTTP request.
- **Potential Exploit Path:**
  1. Create or identify any work item in `backlog` status.
  2. Send: `POST /api/work-items/{id}/route` with body `{"overrideRoute": "fast-track"}`.
  3. `classifyRoute()` sees the override and returns `{route: "fast-track", targetStatus: "approved"}`.
  4. The item bypasses assessment and transitions directly to `Approved`, ready for immediate dispatch.
- **Red Team Handoff Notes:**
  - Payload: `{"overrideRoute": "fast-track"}`
  - Also attempt `{"overrideRoute": "full-review"}` from a `backlog` item — this should correctly produce `Proposed`. Confirm the fast-track path is the bypass.
  - Attempt to chain: fast-track an item → immediately dispatch it → confirm the entire review process is skipped end-to-end.
  - Confirm the red team objective: *"Bypass work item state machine to reach an invalid status"* — fast-tracking an intentionally rejected/needs-clarification item is the clearest demonstration.

---

### PEN-003: Intake Webhooks — No HMAC Validation + Enum Field Injection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Vulnerability Description:**
  Two intake webhook endpoints exist: `POST /api/intake/zendesk` (line 11) and `POST /api/intake/automated` (line 34). Neither validates an HMAC signature or any secret token. Any external actor can POST to these endpoints and inject work items sourced as `zendesk` or `automated`. More critically, the `type` and `priority` fields from the request body are accepted without enum validation and passed directly to `store.createWorkItem()`. Compare with the main `POST /api/work-items` route which validates both enums (workItems.ts:29-41). The intake routes do not.
- **Potential Exploit Path:**
  1. Send: `POST /api/intake/zendesk` with body `{"title":"x","description":"y","type":"INJECTION","priority":"INJECTION"}`
  2. No validation rejects the arbitrary string values.
  3. The item is stored with `type="INJECTION"` and `priority="INJECTION"`.
  4. Downstream logic that filters by `type` or `priority` may behave unexpectedly (dashboard groupings break, routing misclassifies item, etc.).
- **Red Team Handoff Notes:**
  - Payloads for type injection: `{"title":"T","description":"D12345678901234567890","type":"__proto__","priority":"critical"}`
  - Test without any `X-Zendesk-Webhook-Signature` header — verify the request succeeds.
  - Spam 1000 items via `/api/intake/automated` to test rate limiting (expected: none).
  - Verify items appear in `GET /api/work-items` with invalid enum values and that filtering (`?type=feature`) does not return them (enumeration gap vs. injection gap).

---

### PEN-004: Reject Action Triggers Unintended Auto-Dispatch Cascade
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:192-200` → `Source/Backend/src/services/dependency.ts:251-315`
- **Vulnerability Description:**
  When `POST /api/work-items/:id/reject` succeeds, the route handler calls `onItemResolved(id)` (workflow.ts:193). Inside `onItemResolved`, the code checks `DISPATCH_TRIGGER_STATUSES` which includes both `Completed` **and** `Rejected` (workflow types:234-238). Every item that the rejected item blocks, that is currently in `Approved` state, is then **automatically dispatched to production teams** (dependency.ts:278-305). This is a business logic flaw: rejecting a blocker item signals cancellation/failure, yet it unblocks and dispatches all dependent work items, potentially launching implementation work on items that depended on the now-abandoned blocker.
- **Potential Exploit Path:**
  1. Create item A (`blocker`) and item B (`dependent`).
  2. Add dependency: B is blocked by A via `POST /api/work-items/B/dependencies {action:"add", blockerId:"A"}`.
  3. Advance both items through the workflow until A is in any dispatchable status and B is in `Approved`.
  4. Reject item A: `POST /api/work-items/A/reject {reason:"cancellation"}`.
  5. `onItemResolved(A)` fires → item B transitions automatically to `in-progress` without any explicit dispatch call.
- **Red Team Handoff Notes:**
  - Red team objective: *"Bypass work item state machine to reach an invalid status"* — B going to `in-progress` from `approved` without an explicit dispatch call demonstrates unauthorized state transition.
  - Confirm the cascade by checking B's `changeHistory` after rejecting A — look for entries with `agent: "cascade-dispatcher"`.
  - Also confirm: does `DISPATCH_TRIGGER_STATUSES` including `Rejected` cause cascades even when it shouldn't? The `RESOLVED_STATUSES` constant (which also includes `Rejected`) is what unblocks the dependency gate — so rejecting A is treated identically to completing A for dispatch purposes.

---

### PEN-005: Approve Endpoint Reachable from `routing` Transient Status
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:106` → `Source/Shared/types/workflow.ts:214-224`
- **Vulnerability Description:**
  `VALID_STATUS_TRANSITIONS` explicitly includes `routing → approved` (workflow.ts:217). The `POST /api/work-items/:id/approve` handler uses `isValidTransition(item.status, Approved)` to validate the transition. Since `Routing` is listed as a valid source for `Approved`, any item stuck in the `routing` transient state can be manually approved via the approve endpoint, completely bypassing the router's heuristic classification. `Routing` is designed as a transient internal state — it should not be directly promotable to `Approved` from outside the router service.
- **Potential Exploit Path:**
  1. Create a work item (enters `backlog`).
  2. If the item can be found in `routing` status (e.g., via a future race condition or crash recovery), call `POST /api/work-items/{id}/approve`.
  3. `isValidTransition(Routing, Approved)` returns `true`.
  4. Item transitions to `Approved` without having gone through either fast-track classification or assessment.
- **Red Team Handoff Notes:**
  - In the current synchronous Node.js implementation, the `routing` state is transient and completed within a single event loop tick. However, test the transition directly: create a mock item with `status: "routing"` via any means, then call `/approve`.
  - If the backend can be forced into an error state mid-route (e.g., by calling `/route` on an item and observing a crash), the item may remain in `routing`. Then `/approve` would succeed.
  - Payload: `POST /api/work-items/{id}/approve {}` when item is in `routing` status.
  - Also test: can `routing → rejected` be reached? `VALID_STATUS_TRANSITIONS[Routing]` = `[Proposed, Approved]` — `Rejected` is NOT listed, so reject from `routing` should fail. Verify this.

---

### PEN-006: No Pagination Upper-Bound → DoS via Memory Exhaustion
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:69-71`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Vulnerability Description:**
  The `limit` query parameter is accepted in `GET /api/work-items` and `GET /api/dashboard/activity` without any maximum cap. `parseInt(req.query.limit, 10)` is passed directly to the store/service layer. With a large enough value, the response will attempt to construct and serialize a massive in-memory array. With a large data set, `limit=10000000` could exhaust Node.js heap memory.
- **Potential Exploit Path:**
  1. First, create many work items (or use existing ones).
  2. Send: `GET /api/work-items?limit=10000000`
  3. `store.findAll()` calls `result.slice(0, 10000000)` — if the store has fewer items, this is a no-op. But with many items, the slice plus JSON serialization is expensive.
  4. For the dashboard activity endpoint, `getActivity()` first builds a flat array of ALL change history entries across ALL items before slicing. With `limit=10000000`, the response body grows unbounded.
- **Red Team Handoff Notes:**
  - Confirm the objective: *"Enumerate all work items without pagination limit enforcement"*.
  - Payload: `GET /api/work-items?limit=999999&page=1`
  - For dashboard: `GET /api/dashboard/activity?limit=999999`
  - Also test: `GET /api/work-items?page=-1` → offset = `(-1-1)*20 = -40` → `slice(-40, 0)` returns empty array in JS. Verify the response is `{data:[], total:N, ...}` with correct total but empty data.
  - Test: `GET /api/work-items?limit=abc` → parseInt → NaN → `pagination.limit || 20` defaults to 20. Verify no crash.

---

### PEN-007: Soft-Deleted Blocker Permanently Locks Dependent Dispatch
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64-75`, `Source/Backend/src/store/workItemStore.ts:23-27`
- **Vulnerability Description:**
  `computeHasUnresolvedBlockers(itemId)` iterates over an item's `blockedBy` links and calls `store.findById(link.blockerItemId)` for each. `findById` returns `undefined` for soft-deleted items (workItemStore.ts:24). The check `!blocker || !RESOLVED_STATUSES.includes(blocker.status)` treats a missing (soft-deleted) item as an **unresolved blocker** (dependency.ts:71). Once a blocker item is soft-deleted, the dependency link is never cleaned up from the dependent's `blockedBy` array, so `computeHasUnresolvedBlockers` returns `true` permanently. The dependent item can never be dispatched via the normal `/dispatch` endpoint.
- **Potential Exploit Path:**
  1. Create items A (blocker) and B (dependent).
  2. Add dependency: B blocked by A.
  3. Advance B to `Approved` status.
  4. Soft-delete item A: `DELETE /api/work-items/A`.
  5. Attempt to dispatch B: `POST /api/work-items/B/dispatch`.
  6. `computeHasUnresolvedBlockers(B)` → `findById(A)` → `undefined` → returns `true` → dispatch blocked with error "unresolved blocking dependencies".
  7. Item B is now permanently stuck in `Approved` and can never be dispatched.
- **Red Team Handoff Notes:**
  - Red team objective: *"Access or modify a soft-deleted work item via direct ID reference"* — this inverts the objective: soft-deleting an item causes permanent denial-of-dispatch for dependents.
  - Also verify: after soft-deleting A, can `addDependency` or `removeDependency` clean up the stale link? `removeDependency(B, A)` checks `findById(B)` (must exist) but only does best-effort cleanup on A. The `blockedBy` on B is correctly cleaned up. So the fix is simply calling `removeDependency` first — but no code path does this automatically.
  - Test the cascade: does `onItemResolved` for a soft-deleted item run? No — `findById` returns `undefined` and the cascade exits early. So cascade cannot rescue B either.

---

### PEN-008: `NeedsClarification` Assessment Verdict Silently Collapses to `Rejected`
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts:162-173`
- **Vulnerability Description:**
  The assessment pod can produce three verdicts: `Approve`, `Reject`, and `NeedsClarification`. In `runAssessmentPod`, the pod-lead can return `NeedsClarification` when the domain-expert or requirements-reviewer returns that verdict. However, in `assessWorkItem()` (assessment.ts:162-173), the target status logic is binary: `if approve → Approved, else → Rejected`. A `NeedsClarification` verdict falls through to the `else` branch and the item is permanently moved to `Rejected` status. The `Rejected` state can only transition back to `Backlog`, not to a "clarification pending" state. This silently discards the nuance of the clarification request.
- **Potential Exploit Path:**
  1. Create a work item with no complexity set and no priority set (or a title < 5 chars — but priority/complexity checks are more reliable).
  2. Advance the item to `proposed` status (create → route → note: routing requires `backlog` status).
  3. Actually: create item with valid fields, route it to `proposed` (full-review path).
  4. Call `POST /api/work-items/{id}/assess`.
  5. `assessAsDomainExpert` sees no `complexity` → returns `NeedsClarification`.
  6. `assessAsPodLead` aggregates → returns `NeedsClarification`.
  7. `assessWorkItem` maps `NeedsClarification` → `Rejected`.
  8. Item is now `Rejected` — the caller asked for clarification but received a rejection.
- **Red Team Handoff Notes:**
  - Red team objective: *"Submit a malformed assessment verdict that bypasses routing logic"*.
  - Create a work item with `priority: "medium"`, `type: "feature"`, but intentionally omit `complexity`.
  - Route it (goes to `proposed` via full-review path since it's a feature).
  - Assess it → check the response `status` field. Expected: `"rejected"`. Actual assessment records should show `"needs-clarification"` for domain-expert but `"rejected"` as final status.
  - Confirm by checking `changeHistory` — the status entry should show `reviewing → rejected` with the pod-lead note containing "Clarification needed."
  - This demonstrates a verdict bypass: the assessment verdict label (`NeedsClarification`) is different from the actual workflow outcome (`Rejected`).

---

### PEN-009: Repeated Assessment Calls Accumulate Unbounded Pod Records
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:77-80`, `Source/Backend/src/services/assessment.ts:206-213`
- **Vulnerability Description:**
  `POST /api/work-items/:id/assess` can be called on any item in `proposed` or `reviewing` status. When called, `assessWorkItem()` transitions the item to `Reviewing`, runs the full assessment pod (4 records), then moves to `Approved` or `Rejected`. The resulting assessments are appended: `allAssessments = [...item.assessments, ...result.assessments]`. However, if the item is in `Reviewing` status (i.e., the first assess call just started), the route handler at workflow.ts:77 allows another concurrent call with status `reviewing`. Each repeated call appends 4 more `AssessmentRecord` objects indefinitely. There is no deduplication or cap on the number of assessment records per item.
- **Potential Exploit Path:**
  1. Create an item and advance to `proposed` status (create → route).
  2. Rapidly send multiple `POST /api/work-items/{id}/assess` requests while the item is in `reviewing` state.
  3. Each accepted call appends 4 more `AssessmentRecord` objects to `item.assessments`.
  4. With many calls, the item's `assessments` array grows unboundedly, consuming memory and bloating GET responses.
- **Red Team Handoff Notes:**
  - In the synchronous Node.js model, this is not a true race condition. Test serially: call assess, verify status is `Reviewing` or `Approved/Rejected`, then call again if still in a valid state.
  - If the item is re-submitted to `backlog` after rejection (via the state machine `rejected → backlog` path, if implemented), and then re-routed and re-assessed, each cycle accumulates more records.
  - Script: create item → route → assess → verify rejection → (if rejected → backlog transition exists) → re-route → assess again → check `assessments.length`.
  - Confirm that there is no deduplication or idempotency key on assessment records.

---

### PEN-010: Prometheus Metrics Endpoint Exposed Without Authentication
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`
- **Vulnerability Description:**
  The `/metrics` endpoint returns Prometheus-formatted telemetry including counters for work items created by source/type, items routed by route, items assessed by verdict, items dispatched by team, dependency operations, dispatch gating events, and cycle detection events. No authentication is applied. This provides an attacker with real-time reconnaissance: operational scale, team assignment patterns, rejection rates, and dependency complexity.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics`
  2. Response contains counters like `workflow_items_created_total{source="zendesk",type="bug"} 42` revealing system usage.
- **Red Team Handoff Notes:**
  - Request `/metrics` with no headers and verify full Prometheus output is returned.
  - Note which metrics reveal business-sensitive information (team dispatch counts, verdict patterns).

---

### PEN-011: Sequential `docId` Enables Work-Item Enumeration
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts:12-15`
- **Vulnerability Description:**
  Work items are assigned sequential human-readable document IDs in the format `WI-001`, `WI-002`, etc. via a module-level counter. These docIds are exposed in every API response. While routes use UUID-based internal IDs (not guessable), the docId reveals the total number of work items ever created and can be used to identify high-value targets (e.g., WI-001 is likely the first ever item). Combined with PEN-001 (no auth), this provides full enumeration context.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=1` → note docId of most recent item (e.g., `WI-047`).
  2. Determine approximately 47 total items have been created.
  3. Use the dashboard endpoint to get all items sorted by updatedAt and cross-reference.
- **Red Team Handoff Notes:**
  - Use `GET /api/dashboard/queue` to retrieve all items grouped by status (no pagination on this endpoint).
  - Confirm that the dashboard returns all items without any limit, satisfying the objective *"Enumerate all work items without pagination limit enforcement"*.

---

## Attack Chain Synthesis

The following chained exploit demonstrates the most critical path for the red-teamer:

```
1. [PEN-001] No auth         → Caller is anonymous
2. [PEN-003] Intake injection → POST /api/intake/automated with type="__proto__", priority="critical"
                              → item created with invalid enum values (WI-XXX)
3. [PEN-002] Fast-track bypass→ POST /api/work-items/{id}/route {"overrideRoute": "fast-track"}
                              → item jumps to "approved", skips assessment
4. [PEN-001] No auth         → POST /api/work-items/{id}/dispatch {"team":"TheATeam"}
                              → item dispatched to production team
5. [PEN-004] Reject cascade  → If a dependent item exists and its blocker is now rejected,
                              → dependent auto-dispatches without explicit dispatch call
```

**Expected outcome:** An unauthenticated user can inject, bypass review, and dispatch a work item in 3 HTTP requests.

---

## Coverage of Pentest Objectives

| Objective | Covered By | Status |
|---|---|---|
| Bypass work item state machine to reach invalid status | PEN-002, PEN-005, PEN-004 | Mapped |
| Access or modify a soft-deleted work item via direct ID reference | PEN-007 | Mapped (inverse: deletion causes cascade effect) |
| Submit a malformed assessment verdict that bypasses routing logic | PEN-008 | Mapped |
| Enumerate all work items without pagination limit enforcement | PEN-006, PEN-011 (via `/api/dashboard/queue`) | Mapped |

---

## Out of Scope (SAST Domain)

- Hardcoded secrets / credentials → `[SEE SAST findings]`
- CWE-116 encoding issues
- Dependency CVEs in `node_modules`
