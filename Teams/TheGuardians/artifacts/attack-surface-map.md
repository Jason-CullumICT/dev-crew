# Attack Surface Map — dev-crew Source App
**Produced by:** `pen_tester`
**Date:** 2026-05-18
**Scope:** White-box static analysis of `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`
**Config:** `Teams/TheGuardians/security.config.yml`
**Handoff target:** `red-teamer` (dynamic exploitation)

---

## Executive Summary

The application is an Express.js REST API backed by an in-memory store (no database). The **entire API surface has zero authentication or authorization**. Every endpoint—including state-machine transitions, workflow approvals, rejections, dispatches, and intake webhooks—is accessible to any anonymous caller. This is the root finding from which all others derive additional exploitability.

The OWASP focus areas from `security.config.yml` are all confirmed present:
- **A01 Broken Access Control** — PEN-001, PEN-002, PEN-004, PEN-006, PEN-007
- **A03 Injection** — PEN-003 (enum injection via intake), PEN-009 (unbounded inputs)
- **A07 Authentication Failures** — PEN-001, PEN-003
- **A08 Software and Data Integrity** — PEN-002, PEN-004, PEN-008

---

## Findings

---

### PEN-001: Entire API Unauthenticated — No Authentication or Authorization
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (all routes), `Source/Backend/src/routes/*.ts`
- **Vulnerability Description:**
  `app.ts` mounts all routers (`workItemsRouter`, `workflowRouter`, `dashboardRouter`, `intakeRouter`) with no authentication middleware anywhere in the chain. There are no JWT checks, no session guards, no API key validation, no RBAC/ABAC enforcement, and no role concept anywhere in the codebase. Every action—create, read, update, delete, approve, reject, dispatch, and dependency manipulation—is available to any anonymous HTTP client.
- **Potential Exploit Path:**
  1. No credentials needed. Any HTTP client (curl, browser, Postman) can reach all endpoints.
  2. Caller sends `POST /api/work-items/:id/approve` with no Authorization header.
  3. Server approves the item and returns 200 with the updated `WorkItem`.
- **Red Team Handoff Notes:**
  - Verify zero auth on every endpoint in sequence: `GET /api/work-items`, `POST /api/work-items`, `POST /api/work-items/:id/approve`, `POST /api/work-items/:id/dispatch`, `DELETE /api/work-items/:id`.
  - Confirm the `/metrics` endpoint also requires no auth.
  - All subsequent findings (PEN-002 through PEN-013) assume PEN-001 is confirmed.

---

### PEN-002: Unauthenticated Fast-Track Override — State Machine Bypass to `Approved`
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:39-64`, `Source/Backend/src/services/router.ts:66-88`
- **Vulnerability Description:**
  `POST /api/work-items/:id/route` accepts an optional `overrideRoute` field in the request body (`RouteWorkItemRequest.overrideRoute`). When `overrideRoute === "fast-track"`, `classifyRoute()` in `router.ts` returns `targetStatus = WorkItemStatus.Approved` unconditionally—bypassing the entire `isFastTrack()` classification logic and the assessment pod. The route handler does not validate that the caller has any elevated role to use the override. Any item in `backlog` status (any type, any complexity) can be instantly promoted to `Approved` by any unauthenticated caller.

  Relevant code in `router.ts` lines 66-88:
  ```typescript
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus: overrideRoute === WorkItemRoute.FastTrack
        ? WorkItemStatus.Approved   // direct bypass
        : WorkItemStatus.Proposed,
    };
  }
  ```
  No role check precedes this path.
- **Potential Exploit Path:**
  1. Create any work item: `POST /api/work-items` → receive `{id: "uuid-of-item", status: "backlog"}`.
  2. Trigger fast-track override: `POST /api/work-items/{id}/route` with body `{"overrideRoute": "fast-track"}`.
  3. Item transitions directly to `status: "approved"` without assessment.
  4. Immediately dispatch: `POST /api/work-items/{id}/dispatch` (no dependencies → succeeds).
  5. Item is now `in-progress` having bypassed the entire assessment pod.
- **Red Team Handoff Notes:**
  - Payload: `{"overrideRoute": "fast-track"}`
  - Also test `{"overrideRoute": "FAST-TRACK"}` and `{"overrideRoute": "invalid-value"}` to confirm the else-branch behavior (→ `proposed`).
  - Objective match: "Bypass work item state machine to reach an invalid status" — fast-track override skips `proposed` → `reviewing` → assessment.
  - Confirm that a feature-type, complex work item (which should always be full-review) can be approved via this path.

---

### PEN-003: Intake Webhooks — No Signature Verification + Unvalidated Enum Injection
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11-55`
- **Vulnerability Description:**
  Two intake endpoints (`POST /api/intake/zendesk`, `POST /api/intake/automated`) are fully unauthenticated with no HMAC signature verification (as Zendesk's webhook system provides). More critically, the `type` and `priority` fields from the request body are passed directly to `store.createWorkItem()` with no enum validation:

  ```typescript
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,      // NO enum check
    priority: body.priority || WorkItemPriority.Medium,  // NO enum check
    source: WorkItemSource.Zendesk,
  });
  ```

  Compare to the validated `POST /api/work-items` endpoint which checks:
  ```typescript
  if (!body.type || !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Valid type is required ...' });
  }
  ```

  This omission lets attackers inject arbitrary strings as `type` and `priority`, creating work items with values outside the valid enum set. This can break downstream logic (routing, assessment, team assignment) that assumes these fields are always valid enum members.
- **Potential Exploit Path:**
  1. POST to `/api/intake/zendesk` with body:
     ```json
     {"title": "Injected Item", "description": "...", "type": "ADMIN_OVERRIDE", "priority": "CRITICAL_OVERRIDE"}
     ```
  2. `store.createWorkItem()` persists the item with `type: "ADMIN_OVERRIDE"`.
  3. When `routeWorkItem()` runs, `isFastTrack()` and `isFullReview()` compare against TypeScript enums — neither branch matches the injected type, so the item falls through to the default (`isFullReview()` returns `true` as the catch-all, but the route assignment logic may behave unexpectedly).
  4. On the frontend, `TypeBadge.tsx` will receive an unknown type and may render unexpected UI.
- **Red Team Handoff Notes:**
  - Try: `{"title":"X","description":"AAAAAAA...20chars","type":"arbitrary-type","priority":"arbitrary-priority"}`
  - Try: `{"title":"Forge","description":"Forged high-priority Zendesk ticket","type":"feature","priority":"critical"}` — this is a valid forgery of a high-priority feature from the Zendesk source.
  - Objective match: "Submit a malformed assessment verdict that bypasses routing logic" — injected type values bypass classification.
  - Also test with missing `description` to verify error handling.

---

### PEN-004: Cascade Dispatch Manipulation via Unauthenticated Blocker Rejection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:144-208`, `Source/Backend/src/services/dependency.ts:251-315`
- **Vulnerability Description:**
  When a blocker item is rejected, `onItemResolved(resolvedItemId)` is called (line 193 of workflow.ts). This function iterates over all items that the rejected item blocks (`resolvedItem.blocks`), and for any dependent in `Approved` status with no remaining unresolved blockers, it **automatically dispatches** the dependent to a team without any additional human approval.

  Because all endpoints are unauthenticated (PEN-001), an attacker can engineer this cascade:
  1. Enumerate approved items with dependencies (GET list endpoint).
  2. Find or create a blocker item in `proposed/reviewing` state.
  3. Reject the blocker (valid transition from `proposed/reviewing → rejected`).
  4. `onItemResolved` auto-dispatches the dependent to `in-progress`.

  The attacker effectively controls team dispatch without authorization.
- **Potential Exploit Path:**
  1. `GET /api/work-items?status=approved` → find item A that has `blockedBy: [{blockerItemId: "B-uuid"}]`.
  2. `GET /api/work-items/{B-uuid}` → confirm B is in `backlog`.
  3. `POST /api/work-items/{B-uuid}/route` → B moves to `proposed`.
  4. `POST /api/work-items/{B-uuid}/reject` with `{"reason": "attacker controlled"}` → B is rejected.
  5. `onItemResolved("B-uuid")` fires → A is auto-dispatched to `in-progress` (team selected by `assignTeam(A)`).
  6. `GET /api/work-items/{A-uuid}` → confirm A is now `in-progress` with `assignedTeam` set.
- **Red Team Handoff Notes:**
  - Objective match: "Bypass work item state machine to reach an invalid status" and "Access or modify a soft-deleted work item via direct ID reference".
  - Create a test scenario from scratch (no existing items needed): Create A, create B, make A depend on B, route A to approved, route B to proposed, reject B — verify A is auto-dispatched.
  - Also test: does `onItemResolved` fire when `PATCH` changes a blocker's status? (It doesn't — only called from the explicit reject endpoint. But verify.)

---

### PEN-005: Unbounded and Negative Pagination Parameters — Data Enumeration and DoS
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68-75`, `Source/Backend/src/store/workItemStore.ts:30-63`
- **Vulnerability Description:**
  The `GET /api/work-items` endpoint parses `page` and `limit` from query strings with `parseInt()` but applies no upper or lower bounds:
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
  ```
  Three exploitable conditions exist:

  **A — Unbounded limit (data dump):** `limit=999999999` causes `result.slice(0, 999999999)`, which returns all items in memory in a single response. With no auth, this dumps the entire work item dataset instantly.

  **B — Negative limit (pagination bypass):** `limit=-1` causes `result.slice(0, 0 + (-1))` = `result.slice(0, -1)` which JavaScript interprets as "all items except the last." This bypasses the intended default limit of 20.

  **C — Zero limit (infinite totalPages):** `limit=0` results in `Math.ceil(total / 0) = Infinity`, setting `totalPages: Infinity` in the response. This is unexpected behavior and may confuse clients.

  **D — NaN inputs:** `limit=abc` → `parseInt("abc", 10) = NaN`. Then `result.slice(0, NaN)` = `[]` and `Math.ceil(total / NaN) = NaN`. The response will contain `{data: [], totalPages: NaN}`.
- **Potential Exploit Path:**
  1. Populate store with many items.
  2. `GET /api/work-items?limit=999999999` → receive all items in one response.
  3. `GET /api/work-items?limit=-1` → receive all items except the last.
  4. Objective match: "Enumerate all work items without pagination limit enforcement."
- **Red Team Handoff Notes:**
  - Test: `limit=0`, `limit=-1`, `limit=-999999`, `limit=999999999`, `limit=abc`, `limit=1.5` (parseInt rounds down to 1).
  - Also test `page=-1` and `page=0`: `offset = (0-1)*20 = -20`, `result.slice(-20, -20+20) = result.slice(-20, 0)` = `[]`.
  - Confirm `GET /api/dashboard/activity` has the same flaw (lines 17-18 of dashboard.ts use the same unbound parseInt pattern).

---

### PEN-006: Soft-Deleted Blocker Creates Permanent Dispatch Block (DoS)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64-75`, `Source/Backend/src/store/workItemStore.ts:23-26`
- **Vulnerability Description:**
  `findById()` returns `undefined` for soft-deleted items:
  ```typescript
  export function findById(id: string): WorkItem | undefined {
    const item = items.get(id);
    if (item && item.deleted) return undefined;  // deleted items invisible
    return item;
  }
  ```
  In `computeHasUnresolvedBlockers()`, a `findById` returning `undefined` is treated as an unresolved blocker:
  ```typescript
  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId);
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      return true;  // undefined → "unresolved"
    }
  }
  ```
  Since dependency links are not cleaned up when a blocker is soft-deleted, a dependent item with a link to a deleted blocker permanently returns `computeHasUnresolvedBlockers = true`. The dispatch endpoint enforces this gate:
  ```typescript
  if (computeHasUnresolvedBlockers(id)) {
    res.status(400).json({ error: 'Cannot dispatch: work item has unresolved blocking dependencies' });
    return;
  }
  ```
  Result: the targeted item can never be dispatched. An admin can call `removeDependency` to fix this, but there is no mechanism that automatically cleans up stale links on deletion.
- **Potential Exploit Path:**
  1. `POST /api/work-items` → create target item A (victim).
  2. `POST /api/work-items` → create decoy blocker B.
  3. `POST /api/work-items/{A.id}/dependencies` with `{"action":"add","blockerId":"{B.id}"}`.
  4. `DELETE /api/work-items/{B.id}` → B is soft-deleted.
  5. Route A through full workflow to `Approved` status.
  6. `POST /api/work-items/{A.id}/dispatch` → receives 400 `"unresolved blocking dependencies"` forever.
  7. A can never be dispatched without manual intervention.
- **Red Team Handoff Notes:**
  - Objective match: "Access or modify a soft-deleted work item via direct ID reference."
  - After step 4, verify `GET /api/work-items/{B.id}` returns 404 (deleted), but `GET /api/work-items/{A.id}` still shows `blockedBy: [{blockerItemId: B.id}]`.
  - Confirm `GET /api/work-items/{A.id}/ready` returns `{ready: false}` even after B is deleted.
  - Also test: can `removeDependency` recover A? (`POST /api/work-items/{A.id}/dependencies` with `{"action":"remove","blockerId":"{B.id}"}`) — this is the manual fix path.

---

### PEN-007: Prometheus Metrics Endpoint — Unauthenticated Information Disclosure
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`, `Source/Backend/src/metrics.ts`
- **Vulnerability Description:**
  `GET /metrics` is mounted at the app level with no authentication middleware. It exposes:
  - `workflow_items_created_total` (labels: `source`, `type`) — reveals intake volume by channel
  - `workflow_items_routed_total` (labels: `route`) — fast-track vs full-review ratios
  - `workflow_items_assessed_total` (labels: `verdict`) — approval/rejection rates
  - `workflow_items_dispatched_total` (labels: `team`) — team workload distribution
  - `dispatch_gating_events_total` — how often dispatch is blocked
  - `cycle_detection_events_total` — dependency graph complexity signals
  - Default Node.js metrics: heap usage, CPU time, GC events, active handles, process uptime

  This endpoint reveals operational state, workflow throughput, and system health to any unauthenticated client. In a threat model where the app is publicly reachable, this aids attacker reconnaissance.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` with no headers.
  2. Parse Prometheus text format for all counter values.
  3. Infer: number of items created, approval rates, which team handles most work, whether dispatch is frequently blocked.
- **Red Team Handoff Notes:**
  - Confirm: `curl http://localhost:3001/metrics` returns a 200 with Prometheus text.
  - Note the specific label values present (these confirm what sources/types/verdicts/teams are in use).
  - Also check: `/health` endpoint (app.ts:40) — confirm it returns system status without auth.

---

### PEN-008: Assessment Logic Flaw — `NeedsClarification` Verdict Hard-Rejects Items
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts:162-173`
- **Vulnerability Description:**
  In `runAssessmentPod()`, the pod-lead verdict of `NeedsClarification` is mapped to `WorkItemStatus.Rejected`:
  ```typescript
  if (podLeadAssessment.verdict === AssessmentVerdict.Approve) {
    targetStatus = WorkItemStatus.Approved;
  } else {
    targetStatus = WorkItemStatus.Rejected;  // NeedsClarification falls here
  }
  ```
  `NeedsClarification` is triggered when the domain expert finds no `complexity` field set (lines 52-57):
  ```typescript
  if (!item.complexity) {
    suggestions.push('Set complexity to help with routing and estimation');
    verdict = AssessmentVerdict.NeedsClarification;
  }
  ```
  A work item without `complexity` that is routed to full-review and then assessed will be permanently rejected rather than held for clarification. The `VALID_STATUS_TRANSITIONS` map allows `Rejected → Backlog`, so the item can be recycled, but all assessment records accumulate, and the item re-enters the queue with no automated clarification workflow.

  An attacker can exploit this to sabotage specific work items: create items without complexity, route them to full-review, then trigger assessment — items are hard-rejected unnecessarily.
- **Potential Exploit Path:**
  1. `POST /api/work-items` with no `complexity` field, `type: "feature"` (always full-review).
  2. `POST /api/work-items/{id}/route` (no override → full-review → `proposed`).
  3. `POST /api/work-items/{id}/assess` → domain expert returns `NeedsClarification` → pod-lead returns `NeedsClarification` → `targetStatus = Rejected`.
  4. Item is now in `rejected` status despite only needing clarification.
  5. Objective match: "Submit a malformed assessment verdict that bypasses routing logic."
- **Red Team Handoff Notes:**
  - Confirm: create a feature item with a good title/description (satisfies requirements-reviewer) but no `complexity` → assess → verify final status is `rejected` not `needs-clarification`.
  - Check: what happens if BOTH `complexity` is missing AND description is short? (Both domain-expert and requirements-reviewer reject/clarify — pod-lead verdict = Reject, same outcome but via rejection not clarification.)

---

### PEN-009: No Input Length Validation on Free-Text Fields
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:24`, `Source/Backend/src/routes/intake.ts:14-16`, `Source/Backend/src/routes/workflow.ts:150-151`
- **Vulnerability Description:**
  The `title`, `description`, and `reason` fields accept arbitrarily long strings with no maximum length validation:
  - `POST /api/work-items`: checks `body.title` is truthy and `body.description` is truthy, but no `maxLength`.
  - `POST /api/intake/zendesk` and `/automated`: no length check at all.
  - `POST /api/work-items/:id/reject`: `body.reason` stored in `changeHistory` with no limit.
  - `POST /api/work-items/:id/approve`: `body.reason` stored in `changeHistory` with no limit.

  In an in-memory store, extremely large payloads cause memory pressure proportional to the number of items created. Additionally, the `changeHistory` array grows unboundedly as items accumulate audit entries.
- **Potential Exploit Path:**
  1. Generate a 10 MB string.
  2. `POST /api/work-items` with `{"title":"x","description":"<10MB string>","type":"bug","priority":"low","source":"manual"}`.
  3. Item stored in memory; repeat to exhaust heap.
  4. Node.js process hits OOM or slows significantly.
- **Red Team Handoff Notes:**
  - Test with 1 KB, 100 KB, 1 MB description strings to identify the threshold.
  - Also inject `reason` strings of extreme length via approve/reject to check changeHistory memory growth.
  - Attempt a 50 MB description; verify whether the Express `express.json()` body parser's default 100 KB limit (`bodyParser` default) rejects it before it reaches the handler. If `express.json()` is called without a `limit` option (app.ts:13 — it isn't specified), the default limit is 100 KB, which mitigates very large payloads but is not explicitly configured.

---

### PEN-010: Missing CORS Policy — Cross-Origin Request Exposure
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts`
- **Vulnerability Description:**
  No CORS middleware is configured in `app.ts`. Express does not set `Access-Control-Allow-Origin` headers by default. While browsers enforce the Same-Origin Policy for cross-origin requests, the absence of explicit CORS configuration means:
  1. If the API is ever co-hosted at the same origin as a malicious page (or if the frontend port changes), cross-origin API calls will succeed.
  2. Simple GET requests (no preflight) from any origin succeed silently for API endpoints returning public data.
  3. If CORS headers are later added incorrectly (e.g., `Access-Control-Allow-Origin: *`), all endpoints become CSRF-exploitable since there's no auth token to steal.
  4. The `GET /metrics` and `GET /health` endpoints are GET requests with no preflight — any cross-origin page can read them.
- **Potential Exploit Path:**
  1. Host a malicious page at `http://attacker.com`.
  2. Page uses `fetch("http://localhost:3001/api/work-items")` — if the victim's browser has the app running on localhost, the GET request will be blocked by browser SOP if response doesn't include CORS headers. BUT: simple GET requests to `GET /api/work-items` will be blocked by CORS only if the response doesn't include `Access-Control-Allow-Origin`. Without the header, the browser blocks the read — but the request IS sent to the server (SOP blocks the response, not the request for GETs).
  3. State-changing requests (POST/PATCH/DELETE) would require a preflight unless they meet "simple request" criteria.
- **Red Team Handoff Notes:**
  - This is a low-priority CORS verification test. From a browser context at a different origin, try: `fetch("http://localhost:3001/api/work-items").then(r=>r.json()).then(console.log)`.
  - Focus on: does the API return CORS headers? If not, confirm browser blocks cross-origin reads.
  - More important: if `Access-Control-Allow-Origin: *` is later added naively, combine with PEN-001 for a full cross-origin exploit chain.

---

### PEN-011: Sequential Predictable DocIDs — Item Enumeration Oracle
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts:12-15`
- **Vulnerability Description:**
  Work items receive sequentially incrementing `docId` values (`WI-001`, `WI-002`, `WI-003`, ...) via a module-level counter:
  ```typescript
  let docIdCounter = 0;
  export function generateDocId(): string {
    docIdCounter += 1;
    return `WI-${String(docIdCounter).padStart(3, '0')}`;
  }
  ```
  While the primary `id` (UUID v4) is unguessable, `docId` values are strictly sequential. An attacker observing any `docId` in a response can infer:
  - The total number of items ever created (the current counter value).
  - The gap between observed docIds indicates creation activity.
  
  Combined with the absence of auth (PEN-001), the work item list endpoint already exposes all items. However, docId predictability is a GDPR/audit concern: leaked docIds reveal operational throughput and could be used in external correlation attacks.
- **Potential Exploit Path:**
  1. `POST /api/work-items` (create one item) → receive `docId: "WI-042"` → infer 41 items were previously created.
  2. `GET /api/work-items` to enumerate all active items.
  3. Correlate docIds across API responses to reconstruct item creation history.
- **Red Team Handoff Notes:**
  - Create two items back-to-back. Confirm `docId` of second = first + 1.
  - After `resetStore()` equivalent (server restart), confirm counter resets to `WI-001` — this means restarts create docId collisions.

---

### PEN-012: Audit Reason Field — No Content Sanitization or Length Limit
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:114-116, 169-171`, `Source/Backend/src/models/WorkItem.ts:51-65`
- **Vulnerability Description:**
  The `reason` field in approve and reject requests is passed verbatim into `buildChangeEntry()` and stored in `changeHistory`. There is no:
  - Length validation
  - Content sanitization (no HTML/script stripping)
  - Character allowlist
  
  If the frontend ever renders `changeHistory.reason` values as raw HTML (or if a logging system interprets them), stored XSS or log injection is possible.

  Currently, the frontend appears to display change history as text (not raw HTML), limiting immediate exploitability. But the data persists in all API responses that include `WorkItem.changeHistory`.
- **Potential Exploit Path:**
  1. `POST /api/work-items/:id/approve` with `{"reason": "<script>alert(1)</script>"}`.
  2. Item's `changeHistory` now contains the script payload.
  3. `GET /api/work-items/:id` — payload is returned in the `changeHistory` array.
  4. If frontend renders `entry.reason` via `dangerouslySetInnerHTML` or equivalent, XSS fires.
- **Red Team Handoff Notes:**
  - Store payload: `{"reason": "<img src=x onerror=alert(1)>"}` and `{"reason": "'; DROP TABLE items; --"}`.
  - Check the frontend `WorkItemDetailPage.tsx` to see how `changeHistory` entries are rendered — if via React's default text rendering, XSS is prevented by React's automatic escaping.
  - This becomes Critical if a future admin dashboard renders history as HTML without sanitization.

---

### PEN-013: Unimplemented `/api/search` Endpoint — Future Attack Surface
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/tests/routes/search.test.ts:1-7`, `Source/Frontend/src/api/client.ts:101-105`
- **Vulnerability Description:**
  The frontend API client calls `GET /api/search?q=<query>` for the `DependencyPicker` typeahead. This endpoint is **not registered** in `app.ts` (confirmed by `grep` finding no `search` routes). The test file explicitly acknowledges this:
  > "NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts."

  When implemented, the `q` parameter will be used to filter work items by title/description match. The risk is:
  - **ReDoS:** If the future implementation uses a RegExp built from the user-controlled `q` parameter without anchoring/escaping, a catastrophic backtracking pattern could freeze the Node.js event loop.
  - **Information Disclosure:** Full-text search over work item descriptions could expose data that filtered list endpoints don't.
  - **Unbounded Results:** If not paginated, a single-character query returns all items.
- **Potential Exploit Path (for when implemented):**
  1. `GET /api/search?q=` (empty string) → if search returns all items, this is an enumeration bypass.
  2. `GET /api/search?q=(a+)+$` → ReDoS payload targeting a naive regex.
- **Red Team Handoff Notes:**
  - Current state: `GET /api/search?q=test` returns 404 (unregistered route). Confirm this.
  - Flag for re-testing once the endpoint is implemented. Fuzz with: empty string, single char, 1000-char string, regex metacharacters `(.*)`, `(a+)+`, `[a-z]{99}`.

---

## Attack Chain Summary

The following chained exploit achieves the red team objective "Bypass work item state machine to reach an invalid status":

```
1. POST /api/work-items
   → Creates item A in backlog (no auth needed)

2. POST /api/work-items/{A.id}/route  {"overrideRoute": "fast-track"}
   → Bypasses classification; A goes to Approved directly (PEN-002)

3. POST /api/work-items/{A.id}/dispatch
   → A dispatched to in-progress (team auto-assigned)

Full state path: backlog → approved (bypass) → in-progress
Missing states: routing → proposed → reviewing (entire assessment pod skipped)
```

The following chained exploit achieves "Access or modify a soft-deleted work item via direct ID reference":

```
1. POST /api/work-items → create blocker B
2. POST /api/work-items → create target A
3. POST /api/work-items/{A.id}/dependencies {"action":"add","blockerId":"{B.id}"}
4. DELETE /api/work-items/{B.id}   → B soft-deleted
5. GET /api/work-items/{B.id}      → 404 (deleted)
6. GET /api/work-items/{A.id}/ready → {ready: false} (stale link to deleted B)
7. A permanently blocked from dispatch while referencing deleted B (PEN-006)
```

---

## Metrics Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 4 |
| Medium   | 4 |
| Low      | 2 |
| **Total** | **13** |

---

## Notes for Red Teamer

1. **No auth at all** — do not attempt to acquire credentials. All endpoints respond to unauthenticated requests.
2. **In-memory store** — state does not persist across server restarts. Build exploit chains in a single session.
3. **Backend URL:** `http://localhost:3001` per `security.config.yml`.
4. **Health check:** `GET http://localhost:3001/health` returns `{"status":"ok"}` — use this to confirm the server is running before starting.
5. **Critical test order:** Confirm PEN-001 first (unauthenticated access), then PEN-002 (fast-track override), then PEN-003 (intake injection), then PEN-004 (cascade dispatch).
6. **Tools:** curl, HTTPie, or any HTTP client. No browser automation needed for backend tests.
