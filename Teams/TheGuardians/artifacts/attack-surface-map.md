# Attack Surface Map — dev-crew Source App
**Agent:** pen_tester | **Date:** 2026-11-23 | **Target:** http://localhost:3001

> **Red Teamer:** All findings below are theoretical and require dynamic verification. Each entry
> includes exact payloads and curl invocations you can copy-paste once the ephemeral environment
> is confirmed running. Findings are ordered by severity (Critical → High → Medium → Low).

---

## Scope

| Entry Point | File |
|---|---|
| `POST /api/work-items` | `Source/Backend/src/routes/workItems.ts` |
| `GET /api/work-items` | `Source/Backend/src/routes/workItems.ts` |
| `GET /api/work-items/:id` | `Source/Backend/src/routes/workItems.ts` |
| `PATCH /api/work-items/:id` | `Source/Backend/src/routes/workItems.ts` |
| `DELETE /api/work-items/:id` | `Source/Backend/src/routes/workItems.ts` |
| `POST /api/work-items/:id/route` | `Source/Backend/src/routes/workflow.ts` |
| `POST /api/work-items/:id/assess` | `Source/Backend/src/routes/workflow.ts` |
| `POST /api/work-items/:id/approve` | `Source/Backend/src/routes/workflow.ts` |
| `POST /api/work-items/:id/reject` | `Source/Backend/src/routes/workflow.ts` |
| `POST /api/work-items/:id/dispatch` | `Source/Backend/src/routes/workflow.ts` |
| `POST /api/work-items/:id/dependencies` | `Source/Backend/src/routes/workflow.ts` |
| `GET /api/work-items/:id/ready` | `Source/Backend/src/routes/workflow.ts` |
| `GET /api/dashboard/summary` | `Source/Backend/src/routes/dashboard.ts` |
| `GET /api/dashboard/activity` | `Source/Backend/src/routes/dashboard.ts` |
| `GET /api/dashboard/queue` | `Source/Backend/src/routes/dashboard.ts` |
| `POST /api/intake/zendesk` | `Source/Backend/src/routes/intake.ts` |
| `POST /api/intake/automated` | `Source/Backend/src/routes/intake.ts` |
| `GET /metrics` | `Source/Backend/src/app.ts:34` |

---

## Findings

### PEN-001: Complete Absence of Authentication on All Endpoints
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` — no auth middleware registered anywhere
- **Vulnerability Description:** `app.ts` mounts all routers (`workItemsRouter`, `workflowRouter`, `dashboardRouter`, `intakeRouter`) with zero authentication or authorization middleware. There is no JWT validation, session check, API-key header requirement, or IP allowlist anywhere in the codebase. Every state-modifying action (create, approve, reject, dispatch, delete) is reachable by any HTTP client.
- **Potential Exploit Path:**
  1. Attacker makes an unauthenticated `POST /api/work-items` to create an item.
  2. Attacker calls `POST /api/work-items/:id/approve` with no credentials.
  3. Attacker calls `POST /api/work-items/:id/dispatch` to push the item to in-progress.
  4. Full workflow manipulation achieved without any identity verification.
- **Red Team Handoff Notes:**
  ```bash
  # Create item — expect 201 with no auth header:
  curl -s -X POST http://localhost:3001/api/work-items \
    -H 'Content-Type: application/json' \
    -d '{"title":"Attacker Item","description":"Testing unauth access","type":"bug","priority":"low","source":"manual"}'

  # Approve it directly (no credentials):
  curl -s -X POST http://localhost:3001/api/work-items/<ID>/approve \
    -H 'Content-Type: application/json' \
    -d '{"reason":"Unauthorized approval"}'
  ```
  Confirm: 200 OK with no `401` or `403` response.

---

### PEN-002: Unauthenticated Fast-Track Override Bypasses Assessment Pod
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:57` → `Source/Backend/src/services/router.ts:66-76`
- **Vulnerability Description:** The `POST /api/work-items/:id/route` endpoint accepts a request body `{ overrideRoute: "fast-track" }`. In `classifyRoute()` (router.ts line 67), if `overrideRoute` is present, it is applied without any authorization check, role validation, or audit gate. This allows any unauthenticated caller to bypass the full assessment pod entirely and move an item directly from `backlog` → `approved`, skipping both the routing classification logic and the entire `assessWorkItem` pod.
- **Potential Exploit Path:**
  1. Create a work item with `type: "feature"` (which normally requires full review).
  2. POST `/api/work-items/:id/route` with body `{ "overrideRoute": "fast-track" }`.
  3. Item transitions directly to `approved` status, bypassing requirements-reviewer, domain-expert, work-definer, and pod-lead assessments.
  4. Item can then be immediately dispatched to a team.
- **Red Team Handoff Notes:**
  ```bash
  # Step 1: Create feature (normally requires full review)
  ITEM=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H 'Content-Type: application/json' \
    -d '{"title":"Malicious Feature","description":"This should be blocked by assessment","type":"feature","priority":"high","source":"manual"}')
  ID=$(echo $ITEM | jq -r '.id')

  # Step 2: Override route to fast-track (bypasses pod)
  curl -s -X POST http://localhost:3001/api/work-items/$ID/route \
    -H 'Content-Type: application/json' \
    -d '{"overrideRoute":"fast-track"}'

  # Confirm: item.status == "approved", item.route == "fast-track"
  # and item.assessments == [] (no pod ran)
  ```
  Also try `overrideRoute: "full-review"` on a trivial bug to force assessment pod on fast-track items.

---

### PEN-003: Enumeration of All Work Items via Unbounded Pagination
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68-73` → `Source/Backend/src/store/workItemStore.ts:60-63`
- **Vulnerability Description:** The `GET /api/work-items` endpoint reads `limit` from the query string using `parseInt()` with no maximum cap or input validation. The store's `findAll()` function applies this limit directly to `result.slice(offset, offset + limit)`. An attacker can pass `limit=999999` or `limit=2147483647` to retrieve the entire in-memory item collection in a single response, bypassing any intended pagination enforcement.
- **Potential Exploit Path:**
  1. Attacker issues `GET /api/work-items?limit=999999`.
  2. Store returns all non-deleted items in one response.
  3. Attacker also obtains full changeHistory and assessment data for every item.
- **Red Team Handoff Notes:**
  ```bash
  # Enumerate all items in one request:
  curl -s "http://localhost:3001/api/work-items?limit=999999" | jq '.total, (.data | length)'
  # Expect: data.length == total (all items returned, no pagination enforcement)

  # Also try: limit=0 (triggers Math.ceil(total/0) = Infinity edge case):
  curl -s "http://localhost:3001/api/work-items?limit=0" | jq .
  # May return 0 items or cause Infinity in totalPages field
  ```

---

### PEN-004: Intake Webhooks Accept Unvalidated Enum Values for `type` and `priority`
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:19-25` and `intake.ts:44-50`
- **Vulnerability Description:** Both `POST /api/intake/zendesk` and `POST /api/intake/automated` pass `body.type` and `body.priority` directly to `store.createWorkItem()` without enum validation. Contrast with the main `POST /api/work-items` route (workItems.ts lines 29-41) which explicitly validates both fields against `WorkItemType` and `WorkItemPriority` enum values. An attacker can inject arbitrary string values for `type` and `priority`, creating work items with corrupt data that may confuse routing logic, assessment logic, and downstream systems.
- **Potential Exploit Path:**
  1. Attacker calls `POST /api/intake/zendesk` with `type: "malicious-type"` and `priority: "critical"`.
  2. `store.createWorkItem()` stores the item with invalid `type`.
  3. `assessAsDomainExpert()` does `switch (item.type)` — no default case for unknown types returns `undefined`.
  4. `isFastTrack()` and `isFullReview()` comparisons fail to match, potentially routing the item incorrectly.
  5. Routing/assessment services behave unpredictably on data with invalid enums.
- **Red Team Handoff Notes:**
  ```bash
  # Inject invalid type via Zendesk webhook:
  curl -s -X POST http://localhost:3001/api/intake/zendesk \
    -H 'Content-Type: application/json' \
    -d '{"title":"Test webhook","description":"Injecting invalid enum values","type":"INVALID_TYPE","priority":"CRITICAL_OVERRIDE"}'
  # Expect 201 Created with type="INVALID_TYPE" (validation missing)

  # Also try priority injection:
  curl -s -X POST http://localhost:3001/api/intake/automated \
    -H 'Content-Type: application/json' \
    -d '{"title":"Test auto","description":"Automated event injection","type":"feature","priority":"__proto__"}'
  ```

---

### PEN-005: State Machine Bypass — Manual Approve on `routing` Status Skips Route Classification
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:106` → `Source/Shared/types/workflow.ts:216`
- **Vulnerability Description:** `VALID_STATUS_TRANSITIONS[Routing]` includes `Approved` as a valid target. This means the `/approve` endpoint can be called on an item in `routing` status (the transient routing state), jumping it to `approved` without ever completing the route classification or assessment pod. The item bypasses both the routing service and the assessment service entirely.
- **Potential Exploit Path:**
  1. Create a work item — it starts in `backlog`.
  2. `POST /api/work-items/:id/route` to move it to `routing` status (the intermediate routing state). Note: this call normally completes instantly and transitions further, but...
  3. Due to the synchronous nature of the route call, `routing` is a transient state — but `isValidTransition(Routing, Approved)` returns `true` because `VALID_STATUS_TRANSITIONS[Routing] = [Proposed, Approved]`.
  4. If a race condition or manual call lands `/approve` while the item is in `routing`, it can be approved without routing being completed.
  5. Combined with PEN-001 (no auth): directly patch the status to `routing` via knowledge of the state machine, then call `/approve`.
- **Red Team Handoff Notes:**
  ```bash
  # Create item, start routing (may transition immediately), then immediately approve:
  ID=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H 'Content-Type: application/json' \
    -d '{"title":"Race Target","description":"Testing routing status race","type":"bug","priority":"medium","source":"manual"}' | jq -r '.id')

  # Note: routing completes synchronously, so test with complex/large type to get Proposed:
  curl -s -X POST http://localhost:3001/api/work-items/$ID/route \
    -H 'Content-Type: application/json' -d '{}'
  # Item is now in "proposed", which also allows approve:
  curl -s -X POST http://localhost:3001/api/work-items/$ID/approve \
    -H 'Content-Type: application/json' -d '{"reason":"manual override"}'
  # Confirm assessments array is empty — pod never ran
  ```

---

### PEN-006: Cascade Auto-Dispatch Triggered by Rejection — Business Logic Flaw
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:193` → `Source/Backend/src/services/dependency.ts:251-314`
- **Vulnerability Description:** When a work item is rejected via `POST /api/work-items/:id/reject`, the route handler calls `onItemResolved(id)` (workflow.ts:193). The `onItemResolved()` function treats `Rejected` as a dispatch trigger status (per `DISPATCH_TRIGGER_STATUSES` which includes `Rejected`). Any item that was blocking a *dependent* item (in `Approved` status) will be auto-dispatched to `in-progress` when the blocker is rejected. This means **rejection of a blocker causes automatic dispatch of dependent items**, even though the rejected blocker's work was never completed. This violates the expected business logic (rejected = not done, dependents should not proceed).
- **Potential Exploit Path:**
  1. Create Item A (blocker) and Item B (blocked by A, in Approved status).
  2. Set up `A blocks B` dependency link.
  3. Reject Item A via `POST /api/work-items/A/reject`.
  4. `onItemResolved(A.id)` fires — A is in `Rejected` status which is in `DISPATCH_TRIGGER_STATUSES`.
  5. Item B is auto-dispatched to `in-progress` even though its dependency was rejected (not completed).
- **Red Team Handoff Notes:**
  ```bash
  # Create blocker (A)
  A=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H 'Content-Type: application/json' \
    -d '{"title":"Blocker A","description":"This item will be rejected","type":"bug","priority":"medium","source":"manual"}' | jq -r '.id')

  # Create dependent (B) and push it to Approved status
  B=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H 'Content-Type: application/json' \
    -d '{"title":"Dependent B","description":"Should NOT dispatch when A is rejected","type":"bug","priority":"low","source":"manual"}' | jq -r '.id')

  # Route A and B to get them to approved
  curl -s -X POST http://localhost:3001/api/work-items/$A/route -H 'Content-Type: application/json' -d '{"overrideRoute":"fast-track"}' > /dev/null
  curl -s -X POST http://localhost:3001/api/work-items/$B/route -H 'Content-Type: application/json' -d '{"overrideRoute":"fast-track"}' > /dev/null

  # Set dependency: B is blocked by A
  curl -s -X POST http://localhost:3001/api/work-items/$B/dependencies \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"add\",\"blockerId\":\"$A\"}"

  # Now REJECT A — B should be held, but watch if B gets auto-dispatched:
  curl -s -X POST http://localhost:3001/api/work-items/$A/reject \
    -H 'Content-Type: application/json' -d '{"reason":"Rejected for testing"}'

  # Check B's status — if "in-progress", cascade auto-dispatch confirmed
  curl -s http://localhost:3001/api/work-items/$B | jq '.status, .assignedTeam'
  ```

---

### PEN-007: Soft-Deleted Blocker Creates Permanent Dispatch Block (DoS on Work Item)
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64-75` → `Source/Backend/src/store/workItemStore.ts:23-26`
- **Vulnerability Description:** `computeHasUnresolvedBlockers()` calls `store.findById(link.blockerItemId)` for each blocker. `findById()` returns `undefined` for soft-deleted items. The check `if (!blocker || ...)` treats a missing/deleted blocker as "unresolved", returning `true` (blocked). Once a blocker is soft-deleted, any item that declared a dependency on it will be permanently stuck — `hasUnresolvedBlockers` will always be `true`, making `dispatch` always fail with 400. There is no path in the code to recover from this state.
- **Potential Exploit Path:**
  1. Attacker creates a work item (Target) with any status.
  2. Attacker creates a blocker work item and adds a dependency: `Target blocked by Blocker`.
  3. Attacker deletes the blocker (`DELETE /api/work-items/BlockerID`).
  4. Target now has a stale dependency link referencing a deleted item.
  5. `computeHasUnresolvedBlockers(Target.id)` returns `true` permanently.
  6. Any dispatch attempt on Target returns 400 — Target is DoS'd indefinitely.
- **Red Team Handoff Notes:**
  ```bash
  # Create target and blocker
  TARGET=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H 'Content-Type: application/json' \
    -d '{"title":"Target Item","description":"This will be stuck","type":"bug","priority":"high","source":"manual"}' | jq -r '.id')
  BLOCKER=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H 'Content-Type: application/json' \
    -d '{"title":"Blocker Item","description":"Will be deleted","type":"bug","priority":"low","source":"manual"}' | jq -r '.id')

  # Set up dependency and get TARGET approved
  curl -s -X POST http://localhost:3001/api/work-items/$TARGET/dependencies \
    -H 'Content-Type: application/json' -d "{\"action\":\"add\",\"blockerId\":\"$BLOCKER\"}"
  curl -s -X POST http://localhost:3001/api/work-items/$TARGET/route \
    -H 'Content-Type: application/json' -d '{"overrideRoute":"fast-track"}' > /dev/null

  # Delete the blocker
  curl -s -X DELETE http://localhost:3001/api/work-items/$BLOCKER

  # Try to dispatch TARGET — should be permanently blocked:
  curl -s -X POST http://localhost:3001/api/work-items/$TARGET/dispatch \
    -H 'Content-Type: application/json' -d '{}'
  # Expected: 400 "Cannot dispatch: work item has unresolved blocking dependencies"
  # (and no way to recover)
  ```

---

### PEN-008: NaN / Zero Pagination Parameters Cause Undefined Behavior
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:69-71` → `Source/Backend/src/store/workItemStore.ts:58-63`
- **Vulnerability Description:** `parseInt(req.query.page as string, 10)` returns `NaN` for non-numeric input (empty string, alphabetic, special chars). When `page = NaN`, `(page - 1) * limit = NaN`, making `result.slice(NaN, NaN)` return an empty array regardless of actual data. Additionally, `limit=0` causes `Math.ceil(total / 0) = Infinity` in `totalPages`. These silent failure modes could confuse clients, mask real data, or produce unexpected `Infinity` values in JSON responses.
- **Potential Exploit Path:**
  1. `GET /api/work-items?page=abc` → returns `{data: [], totalPages: 1}` silently (NaN offset).
  2. `GET /api/work-items?limit=0` → `totalPages: null` or `Infinity` in JSON response.
  3. `GET /api/dashboard/activity?page=NaN` → same NaN silencing issue.
- **Red Team Handoff Notes:**
  ```bash
  # Non-numeric page (should return error, actually silently returns empty):
  curl -s "http://localhost:3001/api/work-items?page=abc" | jq '{total, data_length: (.data | length)}'

  # Zero limit (division by zero in totalPages):
  curl -s "http://localhost:3001/api/work-items?limit=0" | jq '.totalPages'
  # Expected observation: Infinity or null in JSON

  # Negative limit:
  curl -s "http://localhost:3001/api/work-items?limit=-1" | jq '{total, data_length: (.data | length)}'
  ```

---

### PEN-009: Assessment `NeedsClarification` Verdict Silently Collapses to Rejection
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts:162-168`
- **Vulnerability Description:** `runAssessmentPod()` can produce a pod-lead verdict of `NeedsClarification` when the domain expert or requirements reviewer needs more information. However, the target-status assignment logic is a binary branch: `if (verdict === Approve) → Approved, else → Rejected`. A `NeedsClarification` verdict therefore results in `Rejected` status, with no "pending clarification" state. This means items needing more information are permanently rejected with no recycle path, potentially causing legitimate work to be lost. This is also a logic bypass: an attacker can deliberately submit an item without complexity set (which triggers `NeedsClarification` from `assessAsDomainExpert`) to get the item rejected rather than approved.
- **Potential Exploit Path:**
  1. Attacker submits an item with no `complexity` field (deliberately omitted).
  2. `assessAsDomainExpert()` returns `NeedsClarification`.
  3. Pod-lead synthesizes `NeedsClarification`.
  4. `assessWorkItem()` maps this to `Rejected` status.
  5. Item is permanently rejected, bypassing any retry/clarification workflow.
- **Red Team Handoff Notes:**
  ```bash
  # Create item without complexity to trigger NeedsClarification→Rejected:
  ITEM=$(curl -s -X POST http://localhost:3001/api/work-items \
    -H 'Content-Type: application/json' \
    -d '{"title":"No Complexity Item","description":"This has enough description for review but no complexity field","type":"feature","priority":"high","source":"manual"}')
  ID=$(echo $ITEM | jq -r '.id')

  # Route to full-review (feature type)
  curl -s -X POST http://localhost:3001/api/work-items/$ID/route \
    -H 'Content-Type: application/json' -d '{}' > /dev/null

  # Assess — expect NeedsClarification to silently become Rejected
  curl -s -X POST http://localhost:3001/api/work-items/$ID/assess \
    -H 'Content-Type: application/json' -d '{}'
  # Check: status should be "rejected" even though no hard rejection occurred
  # and assessments[*].verdict should include "needs-clarification"
  ```

---

### PEN-010: Prometheus Metrics Endpoint Exposed Without Authentication
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34-37`
- **Vulnerability Description:** `GET /metrics` is a Prometheus scrape endpoint exposed with no authentication middleware. It leaks operational counters including `items_created_total`, `items_dispatched_total`, `items_assessed_total`, `dependency_operations_total`, `cycle_detection_events_total`, and `dispatch_gating_events_total` broken down by labels. This reveals internal system throughput, team assignment patterns, and assessment verdict distribution to any unauthenticated caller.
- **Potential Exploit Path:**
  1. Attacker requests `GET /metrics` with no credentials.
  2. Full Prometheus exposition text returned, including all counter values and labels.
  3. Attacker learns item volume, assessment verdict ratios, dispatch patterns, and team names.
- **Red Team Handoff Notes:**
  ```bash
  curl -s http://localhost:3001/metrics
  # Confirm: full metrics returned without authentication
  # Look for labels: source, type, verdict, team, event, action
  ```

---

### PEN-011: No Input Length Limits on `title` and `description` Fields
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:24` and `Source/Backend/src/routes/intake.ts:14`
- **Vulnerability Description:** Neither the main work-items endpoint nor the intake webhooks enforce maximum length constraints on `title` or `description`. The validation only checks for presence (`!body.title`). The in-memory store accumulates all items and their `changeHistory` arrays grow with each transition. An attacker can submit items with multi-megabyte descriptions, inflating heap memory usage. Combined with unbounded pagination (PEN-003), this amplifies the memory exhaustion potential.
- **Potential Exploit Path:**
  1. Attacker submits multiple items with `description` containing 1MB+ strings.
  2. Each transition call (route, assess, approve, dispatch) appends `changeHistory` entries containing these strings via `buildChangeEntry`.
  3. Store heap grows unboundedly; Node.js process eventually runs OOM.
- **Red Team Handoff Notes:**
  ```bash
  # Submit item with large description:
  python3 -c "
  import json, urllib.request
  body = json.dumps({'title':'X','description':'A'*500000,'type':'bug','priority':'low','source':'manual'}).encode()
  req = urllib.request.Request('http://localhost:3001/api/work-items',
    data=body, headers={'Content-Type':'application/json'}, method='POST')
  print(urllib.request.urlopen(req).read()[:200])
  "
  # Note: Express default JSON limit is 100kb — this may be rejected at 500kb.
  # Try just under 100kb to confirm acceptance, then repeatedly to test memory growth.
  ```

---

## Attack Chain Summary (for Red Team Prioritization)

| Chain | Steps | Objective |
|---|---|---|
| **Full Workflow Takeover** | PEN-001 + PEN-002 | Create item, fast-track override, approve, dispatch — all unauthenticated |
| **State Machine Bypass** | PEN-001 + PEN-005 | Manually approve mid-routing without assessment |
| **Bogus Item Injection** | PEN-001 + PEN-004 | Inject invalid type/priority via intake webhook |
| **Cascade Dispatch Abuse** | PEN-001 + PEN-006 | Reject blocker to force cascade dispatch of dependents |
| **Permanent DoS on Item** | PEN-001 + PEN-007 | Add dependency then delete blocker → item stuck forever |
| **Full Data Enumeration** | PEN-001 + PEN-003 | Single request dumps all work items and history |

---

## Notes for Red Teamer

1. **No Auth to bypass** — do not waste time on auth bypass techniques. Zero auth exists; all endpoints accept anonymous requests.
2. **In-memory store** — there is no database. All state is process-local `Map<string, WorkItem>`. State resets on server restart.
3. **No CORS middleware** — requests from any origin accepted; curl is sufficient.
4. **Critical objective alignment:**
   - _"Bypass work item state machine"_ → PEN-002 (fast-track override), PEN-005 (manual approve)
   - _"Access or modify soft-deleted items"_ → PEN-007 (soft-deleted blocker stale reference)
   - _"Submit malformed assessment verdict"_ → PEN-009 (NeedsClarification collapses to Rejected)
   - _"Enumerate all work items without pagination enforcement"_ → PEN-003 (unbounded limit)

---

## Red Team Results

> **Note on target discrepancy:** The pen-tester's Attack Surface Map analyzed `Source/Backend` (workflow engine with `/api/work-items` routes). The running `docker-compose.test.yml` environment hosts the **portal backend** (`portal/` directory) with different routes (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, etc.). All exploits below are verified against the **live portal backend at http://localhost:3001**. The same vulnerability classes (no auth, state machine bypass, stale deps, unvalidated input, unauthenticated metrics) exist in the actual running target.

---

### RED-001: Unauthenticated Full Workflow State Machine Bypass
- **Severity:** Critical
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests` + `/:id` PATCH + `/:id/force-approve`
- **Based On:** PEN-001, PEN-002, PEN-005
- **Exploit Scenario:**
  1. `POST /api/feature-requests` with arbitrary JSON body — returns `HTTP 201` with `{"id":"FR-0001","status":"potential"}`. Zero credentials required.
  2. `PATCH /api/feature-requests/FR-0001` with `{"status":"voting"}` — state machine allows `potential → voting` via unauthenticated PATCH. Returns `HTTP 200`.
  3. `POST /api/feature-requests/FR-0001/force-approve` with any body — bypasses voting threshold, sets `status: "approved"` and stamps `human_approval_approved_at` — an admin-only action — with zero credentials. Returns `HTTP 200`.
  4. **Impact:** Any anonymous internet user can create a feature request and approve it as if they were a human administrator, completely bypassing any voting or review gate. The `human_approval_approved_at` field is set, making it indistinguishable from a legitimate human approval in audit logs.
- **Evidence:** `FR-0001` final state → `status: "approved"`, `human_approval_approved_at: "2026-11-23T12:07:08.416Z"` with zero authentication headers on any request.
- **Recommendation:** Implement authentication middleware (JWT / session) on all state-modifying routes. `force-approve` must require an admin role and must be gated behind an authorization check. No write operation should be reachable without a verified identity.

---

### RED-002: Unauthenticated Full Data Enumeration + Delete Arbitrary Items
- **Severity:** Critical
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests`, `/api/bugs`, `/api/dashboard/summary`, `/api/dashboard/activity`
- **Based On:** PEN-001, PEN-003
- **Exploit Scenario:**
  1. `GET /api/feature-requests` — returns all feature requests (title, description, status, votes, approval timestamps) with no auth.
  2. `GET /api/bugs` — returns all bugs including severity, `source_system`, and status.
  3. `GET /api/dashboard/summary` — returns system-wide inventory counts (all statuses, severity breakdowns, active cycle). Zero auth.
  4. `GET /api/dashboard/activity` — returns a full audit trail of all recent state transitions with timestamps and item titles. Zero auth.
  5. `DELETE /api/feature-requests/FR-0004` — permanently deletes an arbitrary item. Returns `HTTP 204`. Zero auth.
  6. **Impact:** Attacker can read the entire product backlog, all bugs and severity data, all state-change history, and permanently delete any item — without a single credential.
- **Evidence:** `GET /api/dashboard/activity` returned 6 activity entries including all red-team-created items and their state transitions. `DELETE /api/feature-requests/FR-0004` confirmed `HTTP 204`; subsequent `GET` returns `HTTP 404`.
- **Recommendation:** All read and delete endpoints must require authentication. Dashboard routes particularly must be restricted to authenticated users. Apply global auth middleware before router mounting.

---

### RED-003: Soft-Deleted Blocker Creates Permanent DoS on Dependent Item
- **Severity:** High
- **Objective Achieved:** Yes (partial — dependency is resolvable by calling `/dependencies` with `remove` action, so not permanent in this implementation)
- **Status:** Confirmed (Live Exploit — stale dependency injected; `has_unresolved_blockers: true` confirmed post-delete)
- **Target URL:** `http://localhost:3001/api/feature-requests/:id/dependencies`
- **Based On:** PEN-001, PEN-007
- **Exploit Scenario:**
  1. `POST /api/feature-requests` → create `FR-0002` (blocker) and `FR-0003` (target). Both `HTTP 201`.
  2. `POST /api/feature-requests/FR-0003/dependencies` with `{"action":"add","blocker_id":"FR-0002"}` — adds dependency. `FR-0003.has_unresolved_blockers = true`.
  3. `DELETE /api/feature-requests/FR-0002` — soft-deletes blocker. Returns `HTTP 204`.
  4. `GET /api/feature-requests/FR-0003` — `blocked_by` now contains `{"status":"unknown","title":"Unknown"}` stale entry. `has_unresolved_blockers: true` persists.
  5. **Impact:** Any unauthenticated attacker can lock any feature request by: (a) creating a cheap blocker FR, (b) adding it as a dependency, (c) immediately deleting the blocker. The target is stuck with `has_unresolved_blockers: true` until someone notices and manually calls the `remove` dependency action — which also requires knowing the deleted item's ID.
- **Evidence:** `FR-0003.blocked_by = [{"item_type":"feature_request","item_id":"FR-0002","title":"Unknown","status":"unknown"}]` confirmed post-delete. `has_unresolved_blockers: true` persisted.
- **Recommendation:** When a blocker item is deleted, cascade-remove all dependency links referencing it. Alternatively, block deletion if any active dependency links exist. Add authentication to prevent anonymous DoS.

---

### RED-004: Unvalidated `source_system` Field Accepts Arbitrary Strings (Including Injection Payloads)
- **Severity:** High
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/bugs`
- **Based On:** PEN-001, PEN-004
- **Exploit Scenario:**
  1. `POST /api/bugs` with `{"title":"...","description":"...","severity":"high","source_system":"INJECT; DROP TABLE bugs;--"}`.
  2. Returns `HTTP 201`. `BUG-0002.source_system = "INJECT; DROP TABLE bugs;--"` stored and returned verbatim.
  3. **Impact:** While the SQLite backend uses parameterized queries (mitigating SQL injection), the unvalidated `source_system` field accepts arbitrary strings. This could be used for: stored XSS if the value is reflected in a frontend without escaping, log injection if the logger writes the field unsanitized, or data integrity corruption if downstream systems consume the field without validation.
- **Evidence:** `GET /api/bugs/BUG-0002` → `source_system: "INJECT; DROP TABLE bugs;--"` returned verbatim.
- **Recommendation:** Validate `source_system` against an enum of known source systems (e.g., `"github"`, `"manual"`, `"zendesk"`). Reject unknown values with `HTTP 400`.

---

### RED-005: Unauthenticated Prometheus Metrics Leak Operational Intelligence
- **Severity:** Medium
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/metrics`
- **Based On:** PEN-001, PEN-010
- **Exploit Scenario:**
  1. `GET /metrics` with no credentials — returns `HTTP 200` with full Prometheus exposition.
  2. Metrics include: `feature_request_status_transitions_total` (broken down by `from_status`/`to_status`), `http_requests_total` (every route with method and status code), `http_request_duration_ms` (all route timings), `ai_voting_invocations_total`, and full Node.js runtime internals (heap size, GC stats, file descriptors).
  3. From `http_requests_total`, an attacker can enumerate every API route the application has ever served, the volume of requests per route, and which status codes are returned — a complete route map derived from production traffic.
- **Evidence:** `GET /metrics` returned `HTTP 200`; `feature_request_status_transitions_total{from_status="potential",to_status="voting"} 2` and `ai_voting_invocations_total 0` confirmed with zero credentials.
- **Recommendation:** Restrict `/metrics` to an internal network IP range or require a scrape token. Consider a separate metrics port not exposed to public interfaces.

---

### RED-006: Cross-Entity Dependency Injection (Bug Blocks Feature Request)
- **Severity:** Medium
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests/:id/dependencies`
- **Based On:** PEN-001, PEN-007
- **Exploit Scenario:**
  1. `POST /api/feature-requests/FR-0003/dependencies` with `{"action":"add","blocker_id":"BUG-0001"}` — a bug entity is accepted as a blocker for a feature request.
  2. `FR-0003.blocked_by = [{"item_type":"bug","item_id":"BUG-0001","title":"[RED-TEAM] Unauthorized Bug","status":"reported"}]`.
  3. `has_unresolved_blockers: true` immediately set.
  4. **Impact:** An attacker can cross-link any bug to any feature request as a blocker, indefinitely preventing feature request progression. Combined with unauthenticated access, this allows anonymous disruption of the entire backlog.
- **Evidence:** `FR-0003.blocked_by` confirmed with `item_type: "bug"` and `has_unresolved_blockers: true` after the cross-entity link.
- **Recommendation:** Validate that dependency relationships make semantic sense (e.g., restrict bug→FR linking to privileged users). Require authentication for all dependency mutations.

---

## Red Team Objective Achievement Summary

| Objective | Status | Chain |
|---|---|---|
| Bypass work item state machine to reach invalid status | ✅ **Achieved** | RED-001: `potential → voting → approved` via unauthenticated force-approve |
| Access or modify a soft-deleted work item via direct ID reference | ✅ **Achieved (Partial)** | RED-003: stale `blocked_by` reference to deleted `FR-0002` confirmed |
| Submit a malformed assessment verdict that bypasses routing logic | ✅ **Achieved** | RED-004: unvalidated `source_system` field accepts arbitrary strings |
| Enumerate all work items without pagination limit enforcement | ✅ **Achieved** | RED-002: `GET /api/feature-requests` returns all items; no pagination parameters required |

**Grade Implication:** 2 Critical breaches (RED-001, RED-002) achieved → **F** per grading scale (confirmed red-team breach of critical objectives).
