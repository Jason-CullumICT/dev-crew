# Attack Surface Map — dev-crew Source App
**Generated:** 2026-04-14  
**Agent:** pen_tester  
**Target:** `http://localhost:3001` (Backend) / `http://localhost:5173` (Frontend)  
**Scope:** White-box static analysis of `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`  
**OWASP Focus:** A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A07 Authentication Failures, A08 Data Integrity Failures

---

## Executive Summary

The application has **zero authentication and zero authorization** on every API endpoint. All workflow state transitions, including manual approve, reject, and dispatch of work items, are completely open to unauthenticated callers. The fast-track route override allows any unauthenticated caller to bypass the entire assessment pod and approve any work item in one request. Combined with unauthenticated intake webhooks and unbounded pagination, the attack surface is broad and critical.

---

## Findings

---

### PEN-001: No Authentication on Any API Endpoint
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — all routes; no auth middleware anywhere
- **Vulnerability Description:**
  The Express application mounts all routers (`/api/work-items`, `/api/work-items` (workflow), `/api/dashboard`, `/api/intake`) with no authentication middleware between `express.json()` and the route handlers. There is no JWT validation, no session check, no API key header enforcement. The `/metrics` and `/health` endpoints are also open. Any unauthenticated HTTP client (curl, browser, etc.) has full read/write access to the entire API.
- **Potential Exploit Path:**
  1. Send `GET http://localhost:3001/api/work-items` with no headers.
  2. Response returns full paginated list of all work items.
  3. Send `POST http://localhost:3001/api/work-items/{{any_id}}/approve` with no credentials.
  4. Work item is approved without any identity check.
- **Red Team Handoff Notes:**
  - Confirm with `curl -s http://localhost:3001/api/work-items` — expects 200 with data.
  - Confirm workflow mutation with `curl -s -X POST http://localhost:3001/api/work-items/{{id}}/approve` — expects 200 status change, not 401.
  - Try all five workflow action endpoints: `/route`, `/assess`, `/approve`, `/reject`, `/dispatch`.

---

### PEN-002: No Authorization / RBAC on Workflow State Transitions
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` — all POST handlers (lines 39–296)
- **Vulnerability Description:**
  All workflow action endpoints (`/approve`, `/reject`, `/dispatch`, `/route`, `/assess`) perform state transitions without any role or identity check. There is no RBAC, ABAC, or concept of "who is allowed to approve" vs. "who is allowed to dispatch." Any caller can approve or reject any work item, dispatch it to any team, or trigger the assessment pod. The `body.reason` for approval (`ApproveWorkItemRequest.reason`) is an optional free-text field with no validation, meaning approvals carry zero accountability.
- **Potential Exploit Path:**
  1. Create or find any work item in `proposed` or `reviewing` status.
  2. `POST /api/work-items/{{id}}/approve` with body `{}` (reason is optional).
  3. Item transitions to `approved` without any authorization.
  4. Immediately `POST /api/work-items/{{id}}/dispatch` with `{"team": "TheATeam"}`.
  5. Item enters `in-progress` — full lifecycle bypassed.
- **Red Team Handoff Notes:**
  - Test the full bypass chain: create → route → assess (if needed) → approve (manual) → dispatch, all without any auth headers.
  - Try approving from `proposed` AND `reviewing` states to validate both paths.
  - Check if the `approve` endpoint body accepts unknown/extra fields that are silently accepted.

---

### PEN-003: Fast-Track Override Bypasses Entire Assessment Pod
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` line 57; `Source/Backend/src/services/router.ts` lines 66–88
- **Vulnerability Description:**
  The `/route` endpoint accepts an optional `overrideRoute` body parameter. If `overrideRoute: "fast-track"` is supplied, the `classifyRoute` function short-circuits all heuristics and returns `targetStatus: Approved` directly, skipping the assessment pod entirely. This is an unguarded power-user mechanism with no authentication, no role check, and no audit trail beyond the change history entry. Any unauthenticated caller can fast-track any `backlog` work item directly to `approved` status in a single request.

  ```typescript
  // router.ts lines 66-75
  export function classifyRoute(item: WorkItem, overrideRoute?: WorkItemRoute): RouteResult {
    if (overrideRoute) {   // ← any truthy value short-circuits
      return {
        route: overrideRoute,
        targetStatus: overrideRoute === WorkItemRoute.FastTrack
          ? WorkItemStatus.Approved   // ← jumps directly to approved
          : WorkItemStatus.Proposed,
      };
    }
  ```
- **Potential Exploit Path:**
  1. Create a new work item → starts in `backlog` status.
  2. `POST /api/work-items/{{id}}/route` with body `{"overrideRoute": "fast-track"}`.
  3. Item transitions directly from `backlog` to `approved`, bypassing routing classification and all four assessment pod roles.
  4. `POST /api/work-items/{{id}}/dispatch` with `{"team": "TheATeam"}` → item is in `in-progress`.
  5. Entire workflow (routing → proposed → reviewing → approved) skipped in two requests.
- **Red Team Handoff Notes:**
  - Payload: `{"overrideRoute": "fast-track"}`.
  - Confirm item goes from `backlog` directly to `approved` (check status in response).
  - Also try `{"overrideRoute": "full-review"}` to verify the non-fast-track override path works too.
  - This maps directly to the security.config objective: *"Bypass work item state machine to reach an invalid status."*

---

### PEN-004: Intake Webhooks Accept Arbitrary Type/Priority Values (No Enum Validation)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 11–55
- **Vulnerability Description:**
  The intake endpoints (`POST /api/intake/zendesk`, `POST /api/intake/automated`) accept `type` and `priority` from the request body without validating them against the `WorkItemType` and `WorkItemPriority` enums. The regular `/api/work-items` POST endpoint validates these values (lines 29–44 of `workItems.ts`), but the intake routes use `body.type || WorkItemType.Bug` — if `body.type` is a truthy non-enum string, it is stored verbatim.

  Additionally, there is **no webhook signature verification** (no HMAC-SHA256, no `X-Zendesk-Webhook-Secret` header check). Any client can POST to these endpoints pretending to be Zendesk or an automated system.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with body:
     ```json
     {
       "title": "Injected item",
       "description": "Spoofed from Zendesk",
       "type": "ARBITRARY_TYPE",
       "priority": "GOD_TIER"
     }
     ```
  2. Work item is created with `type: "ARBITRARY_TYPE"` and `priority: "GOD_TIER"`.
  3. The item may not match any filtering, display, or routing logic — corrupting dashboard counts and potentially bypassing routing heuristics.
- **Red Team Handoff Notes:**
  - Try invalid enum values: `"type": "exploit"`, `"priority": "none"`, `"priority": "0"`.
  - Try missing fields: omit `type` (defaults to `Bug`) and `priority` (defaults to `Medium`). Confirm defaults apply.
  - Try `"type": ""` (falsy) — should default to `Bug`.
  - Try `"type": null` — falsy, should default.
  - Try `"type": "feature"` (valid enum) to confirm normal path still works.

---

### PEN-005: Unbounded Pagination Allows Full Data Dump in One Request
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68–73; `Source/Backend/src/store/workItemStore.ts` lines 30–63; `Source/Backend/src/routes/dashboard.ts` lines 17–22
- **Vulnerability Description:**
  The `GET /api/work-items` and `GET /api/dashboard/activity` endpoints accept a `limit` query parameter that is passed directly to the store's `findAll` / `getActivity` without any upper-bound validation. There is no cap (e.g., `Math.min(limit, 100)`). An attacker can request `?limit=999999` to receive the entire in-memory data set in a single HTTP response.

  This maps to the security.config objective: *"Enumerate all work items without pagination limit enforcement."*
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999` — returns all work items in one response.
  2. `GET /api/dashboard/activity?limit=999999` — returns all change history entries (including agent names, status transitions, reject reasons).
  3. Change history can leak internal reasoning from the assessment pod (e.g., "Assessment pod rejected: [requirements-reviewer]: Title is too short").
- **Red Team Handoff Notes:**
  - Seed a few hundred items, then confirm `?limit=999999` returns them all.
  - Check `X-Total-Count` or `total` field confirms count matches the full store.
  - Also try `?limit=0` to verify the fallback logic (`0 || 20`) kicks in safely.
  - Try `?page=0` — `(0-1) * 20 = -20`, `slice(-20, 0)` → returns empty array. Not exploitable but documents the edge case.

---

### PEN-006: Non-Atomic `setDependencies` Strips Existing Blockers on Partial Failure
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` lines 220–239; `Source/Backend/src/routes/workItems.ts` lines 120–129
- **Vulnerability Description:**
  The `PATCH /api/work-items/:id` endpoint allows bulk-replacing the `blockedBy` list via `{"blockedBy": [...]}`. This calls `setDependencies`, which first **removes all existing blockers** and then adds the new list. This is not atomic: if adding any new blocker fails (e.g., cycle detected, non-existent ID), an exception is thrown and caught by the PATCH handler — but the removal already committed to the store. The item ends up with a partially stripped blocker list.

  ```typescript
  // dependency.ts setDependencies — non-atomic
  for (const link of current) {
    removeDependency(itemId, link.blockerItemId);  // ← irreversible side effect
  }
  for (const blockerId of blockerIds) {
    const link = addDependency(itemId, blockerId);  // ← may throw mid-loop
    links.push(link);
  }
  ```
- **Potential Exploit Path:**
  1. Item A is blocked by items B and C (both unresolved — dispatch is gated).
  2. Attacker sends `PATCH /api/work-items/A` with `{"blockedBy": ["B", "FAKE_ID_THAT_DOESNT_EXIST"]}`.
  3. `setDependencies` removes both B and C, then adds B successfully, then throws on FAKE_ID.
  4. PATCH handler returns 400 (appears to fail), but the store now only has B as a blocker. C is gone.
  5. Repeat with `{"blockedBy": ["FAKE_ID"]}` → removes B; throws on add. Item A now has NO blockers.
  6. Item A is now dispatchable even though C's work is incomplete.
- **Red Team Handoff Notes:**
  - Setup: create items A, B, C. Add B and C as blockers for A. Verify dispatch is blocked.
  - Attack: `PATCH /api/work-items/A {"blockedBy": ["B", "00000000-nonexistent"]}` → expect 400.
  - After the 400, `GET /api/work-items/A` and inspect `blockedBy` — verify C is stripped.
  - Final step: attempt `POST /api/work-items/A/dispatch` (after routing A to approved) — verify dispatch now succeeds.
  - This maps to security.config objective: *"Access or modify a soft-deleted work item via direct ID reference"* and *"Bypass work item state machine."*

---

### PEN-007: Soft-Deleted Blocker Creates Permanent Unresolvable Dispatch Block (DoS)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` lines 64–75; `Source/Backend/src/store/workItemStore.ts` lines 23–27
- **Vulnerability Description:**
  `computeHasUnresolvedBlockers` determines if a work item can be dispatched. It loops through `blockedBy` links and calls `store.findById(link.blockerItemId)`. The store's `findById` returns `undefined` for soft-deleted items. If a blocker is soft-deleted, `!blocker` is `true`, and the function treats the missing item as an **unresolved blocker**, permanently blocking dispatch.

  ```typescript
  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId);
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      return true;  // ← soft-deleted blocker → treats as unresolved
    }
  }
  ```

  There is no endpoint to re-resolve or remove a dependency to a deleted item. `removeDependency` requires the blocked item to exist — it does — but the blocker's reverse-index cleanup is best-effort and doesn't affect the blocked item's `blockedBy` array.
- **Potential Exploit Path:**
  1. Item A is blocked by item B.
  2. Attacker (or legitimate user) calls `DELETE /api/work-items/B` — B is soft-deleted.
  3. `store.findById(B.id)` now returns `undefined`.
  4. `computeHasUnresolvedBlockers(A.id)` returns `true` (deleted blocker treated as unresolved).
  5. `POST /api/work-items/A/dispatch` returns 400: "unresolved blocking dependencies."
  6. Item A is permanently blocked and cannot be dispatched. No recovery path exists.
- **Red Team Handoff Notes:**
  - Create item A and item B. Add B as a blocker for A. Route and approve both.
  - `DELETE /api/work-items/B` → soft-deletes B.
  - `POST /api/work-items/A/dispatch` → verify it returns 400 even though B no longer exists.
  - `GET /api/work-items/A/ready` → verify it reports B as an unresolved blocker despite deletion.
  - Confirm there is no endpoint to unblock A by removing the dead dependency reference.

---

### PEN-008: Full Work Item Data Exposed via Dashboard Queue Without Auth
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/dashboard.ts` line 26; `Source/Backend/src/services/dashboard.ts` lines 57–76
- **Vulnerability Description:**
  `GET /api/dashboard/queue` returns every non-deleted work item in the store, grouped by status. Each item in the response includes the **complete work item object**: `changeHistory` (all transitions with agent names and reasons), `assessments` (pod role verdicts and notes), `blockedBy`/`blocks` dependency graphs, `assignedTeam`, and all metadata. There is no authentication, no field-level filtering, and no rate limiting. Combined with unbounded pagination on `/api/work-items`, this endpoint enables complete data exfiltration of the application's state.
- **Potential Exploit Path:**
  1. `GET /api/dashboard/queue` — returns all items with full assessment records and change history.
  2. Attacker can reconstruct the entire workflow state, identify which items are `approved` and ready to dispatch, and see all rejection reasons.
  3. Cross-reference with `GET /api/dashboard/activity?limit=999999` to get a complete audit timeline.
- **Red Team Handoff Notes:**
  - `curl -s http://localhost:3001/api/dashboard/queue | jq '.data[].items[].changeHistory'`
  - Verify assessment notes (rejection reasons, pod feedback) are present in the response.
  - Verify `assignedTeam` values are visible, enabling team enumeration.
  - Also check `GET /api/dashboard/summary` — confirms status/team/priority distribution without individual item details.

---

### PEN-009: Missing `/api/search` Endpoint — Frontend DependencyPicker Non-Functional / Errors
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts` lines 101–104; `Source/Backend/src/app.ts` (no `/api/search` route registered)
- **Vulnerability Description:**
  The frontend API client calls `GET /api/search?q=...` for the DependencyPicker typeahead component. This endpoint is **not registered** in `app.ts`. The search test file (`tests/routes/search.test.ts`) explicitly documents: *"As of this review cycle the GET /api/search endpoint is NOT wired into app.ts."* Every search request from the frontend returns an unhandled Express 404, which the client propagates as an uncaught error. This breaks the dependency management UI entirely and may expose raw Express 404 responses that leak routing information.
- **Potential Exploit Path:**
  1. Access `/work-items/:id` detail page for any item.
  2. Use the DependencyPicker to search — every keystroke fires `GET /api/search?q=<input>`.
  3. Express returns 404 (no route match) — no structured error, raw HTML or empty response.
  4. The UI error state may expose internal API path information.
  5. An attacker can also probe `GET /api/search` directly to confirm the missing route and infer the unimplemented surface.
- **Red Team Handoff Notes:**
  - `curl -v http://localhost:3001/api/search?q=test` — confirm 404 response.
  - Check response body — does it leak Express version, stack trace, or routing table?
  - In the browser, use DependencyPicker search and inspect the network tab for the 404 and error rendering.

---

### PEN-010: Negative `limit` Parameter Returns `slice(0, -N)` — Near-Complete Data Dump
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/store/workItemStore.ts` lines 58–62; `Source/Backend/src/routes/workItems.ts` line 71
- **Vulnerability Description:**
  The `limit` query parameter is parsed with `parseInt` and passed directly to `Array.slice()` with no non-negative validation. With `limit=-1`, the expression becomes `result.slice(0, -1)`, which returns all items **except the last one**. With large negative values like `limit=-999999`, `slice(0, -999999)` returns an empty array (no useful data, but no error either). With `limit=-1`, this effectively dumps all but one record without triggering the 20-item default.

  ```typescript
  const data = result.slice(offset, offset + limit);
  // limit=-1, offset=0 → result.slice(0, -1) → all items except last
  ```
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=-1` — returns all items except the last created (by updatedAt sort).
  2. No error response, no indication of anomaly in logs.
  3. Combine with `page=1` (default) to get maximum coverage.
- **Red Team Handoff Notes:**
  - Test `?limit=-1`, `?limit=-5`, `?limit=-100`.
  - Verify the response contains more than the default 20 items when more exist in the store.
  - Also test `?limit=NaN` and `?limit=abc` — both should fall back to 20 via the `|| 20` guard.

---

### PEN-011: Cascade Auto-Dispatch Skips Team Validation and Dispatch Gating Audit
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` lines 251–315 (`onItemResolved`)
- **Vulnerability Description:**
  When a work item is rejected, `onItemResolved` is called to auto-dispatch dependent items that are now unblocked. This cascade dispatch calls `assignTeam(dependent)` and directly calls `store.updateWorkItem(dependent.id, { status: InProgress, assignedTeam: team })` — bypassing the dispatch endpoint's team name validation (`team !== 'TheATeam' && team !== 'TheFixer'`). More critically, the `assignTeam` function heuristic assigns teams based on item type and complexity, but the cascade does not check if the dependent was explicitly intended for manual dispatch with a specific team override.

  Additionally, cascade dispatch is triggered by **rejection** (not just completion). An attacker who can reject a blocking item can trigger immediate auto-dispatch of all dependents in `approved` status, potentially rushing items into `in-progress` ahead of schedule.
- **Potential Exploit Path:**
  1. Item A blocks items B, C, D (all in `approved` status).
  2. Attacker calls `POST /api/work-items/A/reject` (no auth, any reason).
  3. `onItemResolved(A.id)` fires: B, C, D are all auto-dispatched to `in-progress`.
  4. The rejection of A causes an unintended mass cascade dispatch.
  5. Items B, C, D now have `assignedTeam` set by heuristic, overriding any intended manual team assignment.
- **Red Team Handoff Notes:**
  - Create item A (blocker). Create items B, C, D (blocked by A, each in `approved` status).
  - `POST /api/work-items/A/reject` with `{"reason": "test"}`.
  - Verify B, C, D now have `status: in-progress` and `assignedTeam` was auto-assigned.
  - Check the `dispatchGatingEventsCounter` on `/metrics` to verify cascade dispatch was recorded.

---

### PEN-012: Prometheus Metrics Endpoint Leaks Operational Intelligence Without Auth
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` lines 34–37; `Source/Backend/src/metrics.ts`
- **Vulnerability Description:**
  `GET /metrics` exposes Prometheus-format metrics without any authentication. The metrics include: `workflow_items_created_total` (by source/type), `workflow_items_routed_total` (by route type), `workflow_items_assessed_total` (by verdict), `workflow_items_dispatched_total` (by team), `workflow_dispatch_gating_events_total` (by event type), `workflow_dependency_operations_total`, and `workflow_cycle_detection_events_total`. An unauthenticated attacker can use this to determine the volume and distribution of work items, assess team workloads, and infer business activity patterns.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — returns full Prometheus text.
  2. Parse `workflow_items_dispatched_total{team="TheATeam"}` to enumerate team activity.
  3. Parse `workflow_items_assessed_total{verdict="reject"}` to infer rejection rate and pod behavior.
- **Red Team Handoff Notes:**
  - `curl -s http://localhost:3001/metrics` — confirm no auth required.
  - Note all metric names and labels exposed.

---

### PEN-013: Debug Portal iframe Without `sandbox` Attribute
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/pages/DebugPortalPage.tsx` lines 8–11
- **Vulnerability Description:**
  The `/debug` route renders an iframe loading `VITE_PORTAL_URL || 'http://localhost:4200'` with no `sandbox` attribute. An iframe without `sandbox` runs with the same permissions as the parent page, including: access to parent's `localStorage`/`sessionStorage`, ability to execute scripts, and ability to navigate the parent frame. If `VITE_PORTAL_URL` were set to an attacker-controlled URL (possible via environment misconfiguration in CI/CD), this becomes a cross-origin data theft vector. Even at the default localhost URL, the lack of sandboxing is a defense-in-depth failure.
- **Potential Exploit Path:**
  1. If `VITE_PORTAL_URL` can be influenced (misconfigured environment, supply chain), set it to an attacker-controlled URL.
  2. The iframe at `/debug` loads the attacker page with full parent-frame permissions.
  3. Attacker page reads `localStorage`, `sessionStorage`, and can navigate the parent to a phishing page.
- **Red Team Handoff Notes:**
  - Check if `VITE_PORTAL_URL` is set in any `.env` files in the repo or CI config.
  - In the browser, navigate to `http://localhost:5173/debug` and inspect the iframe element for `sandbox` attribute.
  - Attempt `window.parent.localStorage` from the browser console inside the iframe context.

---

### PEN-014: In-Memory Store — Unlimited Work Item Creation (Memory Exhaustion DoS)
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/store/workItemStore.ts` line 12; `Source/Backend/src/routes/workItems.ts` lines 21–57; `Source/Backend/src/routes/intake.ts`
- **Vulnerability Description:**
  The application uses an in-memory `Map<string, WorkItem>` as its data store with no upper-bound on item count and no rate limiting on creation endpoints. Each work item can have unbounded `changeHistory` entries (array of `ChangeHistoryEntry`) and `assessments` arrays. An attacker can:
  1. Call `POST /api/work-items` in a tight loop to fill the Node.js heap.
  2. Call `POST /api/work-items/:id/assess` repeatedly (if item is in `proposed` state) — though assessment always moves status to `approved`/`rejected`, so it's limited to one call per item.
  3. Use `POST /api/intake/zendesk` (no auth, no rate limit) to mass-create items.

  When the heap is exhausted, the process crashes, causing a complete service outage.
- **Potential Exploit Path:**
  1. Loop: `for i in $(seq 1 100000); do curl -s -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"x","description":"y"}'; done`
  2. Monitor Node.js heap growth via `/metrics` (process memory metrics from `prom-client`).
  3. Service crashes when heap limit is reached; all in-memory data is lost.
- **Red Team Handoff Notes:**
  - Send 1,000 items via intake and check heap via process metrics.
  - Verify no rate limiting header (`X-RateLimit-*`) in responses.
  - Confirm all data is lost on server restart (no persistence).

---

## Attack Chain Summary (Critical Path)

The most damaging single chain achievable without any credentials:

```
1. POST /api/work-items                    → Create item (returns id)
2. POST /api/work-items/:id/route          → {"overrideRoute":"fast-track"}
                                             → item jumps to "approved" (skips all assessment)
3. POST /api/work-items/:id/dispatch       → {"team":"TheATeam"}
                                             → item enters "in-progress"
```

Full lifecycle bypassed in **3 unauthenticated requests** in under 1 second.

---

## OWASP Coverage

| OWASP Category | Findings |
|----------------|----------|
| A01: Broken Access Control | PEN-001, PEN-002, PEN-003, PEN-008 |
| A02: Cryptographic Failures | PEN-004 (no HMAC) |
| A03: Injection | PEN-004 (enum injection), PEN-010 (parameter injection) |
| A07: Auth Failures | PEN-001, PEN-004 |
| A08: Data Integrity Failures | PEN-003, PEN-006, PEN-011 |

---

## Security Config Objective Mapping

| Objective | Finding |
|-----------|---------|
| Bypass work item state machine to reach an invalid status | **PEN-003** (fast-track override) |
| Access or modify a soft-deleted work item via direct ID reference | **PEN-007** (dead blocker DoS) |
| Submit a malformed assessment verdict that bypasses routing logic | **PEN-004** (intake enum injection) |
| Enumerate all work items without pagination limit enforcement | **PEN-005** (unbounded limit), **PEN-010** (negative limit) |

---

## Red Team Priority Order

1. **PEN-001** — Confirm zero-auth on all endpoints (prerequisite for all others)
2. **PEN-003** — Fast-track override chain (2 requests → full bypass)
3. **PEN-005** — Data dump via `?limit=999999`
4. **PEN-006** — Strip blockers via PATCH partial failure
5. **PEN-007** — Permanent DoS via soft-deleted blocker
6. **PEN-004** — Intake enum injection
7. **PEN-011** — Cascade dispatch via rejection
8. **PEN-008** — Dashboard full data exfiltration
9. Remaining findings (PEN-009 through PEN-014)
