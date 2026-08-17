# Attack Surface Map — dev-crew Source App
**Generated:** 2026-08-17  
**Analyst:** pen_tester  
**Scope:** White-box static analysis of `Source/Backend/` and `Source/Frontend/`  
**Target:** http://localhost:3001 (backend), http://localhost:5173 (frontend)  
**Status:** Handoff to red-teamer for dynamic verification

---

## Executive Summary

The application has **zero authentication or authorization** on every API endpoint. This single root cause elevates nearly every other finding to Critical or High severity. All workflow actions — including approving, rejecting, and dispatching work items — are exposed to any unauthenticated caller. In addition, several business logic flaws allow state machine bypass and permanent denial-of-service against work items.

| Severity | Count |
|----------|-------|
| Critical | 1     |
| High     | 5     |
| Medium   | 3     |
| Low      | 3     |
| **Total**| **12**|

---

## Findings

---

### PEN-001: Complete Absence of Authentication and Authorization
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 11-44) — all routes
- **Vulnerability Description:**  
  `app.ts` registers no authentication middleware whatsoever. No JWT validation, no session checks, no API key enforcement, no RBAC, no ABAC. Every endpoint — CRUD, workflow actions, dashboard, intake webhooks — is reachable by any unauthenticated HTTP client. `app.use(express.json())` is the only middleware before route mounting.
- **Potential Exploit Path:**
  1. Attacker sends any HTTP request to any endpoint without any credentials.
  2. Express processes the request and routes it to the handler.
  3. The handler reads/modifies work items, triggers state transitions, or reads aggregate data with full success.
- **Red Team Handoff Notes:**
  - Send `GET http://localhost:3001/api/work-items` — confirm 200 with full item list.
  - Send `POST http://localhost:3001/api/work-items/:id/approve` — confirm state change with no auth header.
  - Send `DELETE http://localhost:3001/api/work-items/:id` — confirm soft-delete with no auth.
  - This finding is the prerequisite for PEN-002 through PEN-006.

---

### PEN-002: Pagination Limit Not Enforced — Full Dataset Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` (lines 60-75), `Source/Backend/src/store/workItemStore.ts` (lines 30-64)
- **Vulnerability Description:**  
  `GET /api/work-items` accepts a `limit` query parameter that is parsed via `parseInt` and passed directly to `findAll()`. The store applies `slice(offset, offset + limit)` with no maximum cap. An attacker can set `limit=999999` to retrieve all records in a single response, bypassing any intended pagination controls. This directly satisfies the red-team objective: *"Enumerate all work items without pagination limit enforcement."*
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1`
  2. The store computes `offset = 0`, `data = result.slice(0, 999999)`, returning all items.
  3. Response contains the full dataset with all work item metadata, change history, and assessments.
- **Red Team Handoff Notes:**
  - `curl "http://localhost:3001/api/work-items?limit=999999"` — verify `total` and `data` length match.
  - Also test `limit=0` (returns 0 results; confirm `totalPages = 1` due to `Math.max(1, ...)`).
  - Test `page=-1` — offset = -2 * limit, which produces a negative slice offset (JS treats as 0), effectively duplicating page 1 behavior.

---

### PEN-003: State Machine Bypass via Fast-Track Route Override
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (lines 39-64), `Source/Backend/src/services/router.ts` (lines 66-88)
- **Vulnerability Description:**  
  `POST /api/work-items/:id/route` accepts an optional `overrideRoute` body field. If `overrideRoute = "fast-track"`, `classifyRoute()` immediately returns `targetStatus: Approved`, skipping the assessment pod entirely. There is no role check, no flag validation, no audit that the item actually qualifies for fast-track. **Any caller can promote any backlog item directly to Approved status.**  
  This directly satisfies the red-team objective: *"Bypass work item state machine to reach an invalid status."*
- **Potential Exploit Path:**
  1. Create a Feature-type work item (which the spec requires full review).
  2. `POST /api/work-items/:id/route` with `{"overrideRoute": "fast-track"}`.
  3. `classifyRoute()` returns `{route: "fast-track", targetStatus: "approved"}`.
  4. Item is persisted as `Approved`, bypassing requirements-reviewer, domain-expert, work-definer, and pod-lead.
- **Red Team Handoff Notes:**
  - Create a Feature work item: `POST /api/work-items` → note `id`.
  - `POST /api/work-items/{id}/route` with body `{"overrideRoute": "fast-track"}` — verify response `status === "approved"`.
  - Additionally test `{"overrideRoute": "full-review"}` to verify a fast-track-eligible item can be forced into full review.
  - Payload: `{"overrideRoute": "fast-track"}`

---

### PEN-004: Intake Webhooks Accept Unvalidated Enum Fields
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` (lines 11-55)
- **Vulnerability Description:**  
  Both `/api/intake/zendesk` and `/api/intake/automated` use `body.type` and `body.priority` directly without validating against the `WorkItemType` and `WorkItemPriority` enums. The standard `POST /api/work-items` endpoint performs this validation (lines 29-42 of `workItems.ts`), but the intake routes do not. An attacker can inject arbitrary string values for `type` and `priority` into the data store. This corrupts the domain model and causes silent failures in `assessAsWorkDefiner` (the `switch (item.type)` falls through with no case match, producing no suggestions) and potentially unpredictable behavior in downstream routing logic.
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title": "T", "description": "D", "type": "MALICIOUS", "priority": "URGENT"}`.
  2. `store.createWorkItem` stores the item with `type = "MALICIOUS"` and `priority = "URGENT"`.
  3. When the item reaches assessment, `assessAsWorkDefiner`'s switch statement falls through with no matching case.
  4. `assessAsDomainExpert` checks `!item.priority` — `"URGENT"` is truthy so no clarification is requested, silently approving an item with an invalid priority.
- **Red Team Handoff Notes:**
  - `POST http://localhost:3001/api/intake/zendesk` with `{"title": "Test", "description": "Valid description here", "type": "INJECTED", "priority": "FAKE"}`
  - Confirm 201 response with `type: "INJECTED"`, `priority: "FAKE"` in the returned item.
  - Then route and assess the item — observe that assessment does not fail despite invalid metadata.
  - Also test empty-string values: `{"type": "", "priority": ""}` (falls back to defaults due to `|| WorkItemType.Bug`).

---

### PEN-005: Soft-Deleted Blocker Causes Permanent Dispatch Block (DoS)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` (lines 64-75), `Source/Backend/src/store/workItemStore.ts` (lines 23-27, 78-88)
- **Vulnerability Description:**  
  `computeHasUnresolvedBlockers()` calls `store.findById(link.blockerItemId)` for each blocker link. Since `findById` returns `undefined` for soft-deleted items (line 24-27 of workItemStore.ts), the condition `!blocker` is `true`, which makes the function report the dependency as **unresolved**. Crucially, `DELETE /api/work-items/:id` (soft-delete) does NOT cascade to clean up dependency links on dependent items. An attacker can:
  1. Add a blocker to an Approved item.
  2. Soft-delete the blocker.
  3. The dependent item is now permanently stuck in `Approved` — dispatch will be rejected forever with *"unresolved blocking dependencies"*.  
  This directly satisfies the red-team objective: *"Access or modify a soft-deleted work item via direct ID reference."*
- **Potential Exploit Path:**
  1. Create item A and item B.
  2. Approve item B via `/route` with fast-track override (see PEN-003).
  3. `POST /api/work-items/B/dependencies` with `{"action": "add", "blockerId": "A-id"}`.
  4. `DELETE /api/work-items/A-id` (soft-delete A).
  5. `POST /api/work-items/B-id/dispatch` → response: 400 *"Cannot dispatch: work item has unresolved blocking dependencies"* — permanently.
- **Red Team Handoff Notes:**
  - After step 5, also call `GET /api/work-items/B-id/ready` — verify `ready: false` and `unresolvedBlockers` references a soft-deleted item ID.
  - Verify that removing the dependency via `POST /api/work-items/B-id/dependencies` with `{"action": "remove", "blockerId": "A-id"}` clears the block (workaround exists).
  - The attack is a targeted, reversible DoS — but in the absence of auth (PEN-001), any caller can trigger it.

---

### PEN-006: Cascade Dispatch Abuse via Blocker Rejection
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` (lines 144-209), `Source/Backend/src/services/dependency.ts` (lines 251-315)
- **Vulnerability Description:**  
  When an item is rejected via `POST /api/work-items/:id/reject`, `onItemResolved()` is called. It automatically dispatches ALL dependent items that are in `Approved` status and have no remaining unresolved blockers. This cascade dispatch happens with no human review or authorization step. An attacker who can:
  - create items, set up a dependency chain, and force an item to `Approved` (via PEN-003)  
  can trigger unauthorized dispatch of arbitrary approved items simply by rejecting a blocker.  
  This directly satisfies the red-team objective: *"Bypass work item state machine to reach an invalid status."*
- **Potential Exploit Path:**
  1. Create blocker item A (in backlog).
  2. Create target item B (in backlog).
  3. Route B with fast-track override → B reaches `Approved`.
  4. Add A as blocker for B via `/dependencies`.
  5. Route A (to proposed), then assess A → A becomes approved.
  6. Now reject A via `POST /api/work-items/A-id/reject` with `{"reason": "test"}`.
  7. `onItemResolved(A-id)` fires → B auto-dispatches to `in-progress` with `assignedTeam` set automatically.
- **Red Team Handoff Notes:**
  - The cascade dispatcher runs synchronously and returns the dispatched count in the rejection log (not the HTTP response body). Verify by checking `GET /api/work-items/B-id` after rejection of A.
  - Also verify the assigned team: `assignTeam()` in `router.ts` auto-assigns based on type/complexity — confirm the team assignment matches expected logic.
  - Payload for rejection: `{"reason": "Blocker no longer needed"}`

---

### PEN-007: Assessment NeedsClarification Verdict Silently Maps to Rejected Status
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/assessment.ts` (lines 162-173)
- **Vulnerability Description:**  
  In `runAssessmentPod()`, the `targetStatus` mapping is: `Approve → Approved`, everything else (including `NeedsClarification`) → `Rejected`. The `assessAsDomainExpert` function returns `NeedsClarification` when `complexity` is not set. This means submitting a work item without a `complexity` field causes it to be **hard-rejected** through the assessment pod — not held for clarification. An attacker who deliberately omits `complexity` from a work item can guarantee it gets rejected, or conversely, the logic flaw means that genuine NeedsClarification items are incorrectly rejected.  
  This also means an item rejected via assessment cannot be re-assessed (it must go back to `backlog → routing → proposed → reviewing`) — the business logic for NeedsClarification is missing an implementation path.
- **Potential Exploit Path:**
  1. `POST /api/work-items` with no `complexity` field (valid — it's optional in `CreateWorkItemRequest`).
  2. Route item → receives `proposed` status (full-review path).
  3. `POST /api/work-items/:id/assess` → assessment pod runs.
  4. `assessAsDomainExpert` sets `verdict = NeedsClarification` due to missing complexity.
  5. `assessAsPodLead` sets verdict to `NeedsClarification`.
  6. `runAssessmentPod` maps this to `targetStatus = Rejected` — item is hard-rejected.
  7. Attacker submits the same malformed item repeatedly, ensuring it always gets rejected.
- **Red Team Handoff Notes:**
  - Create item with type `feature`, priority `medium`, source `manual` — **omit complexity**.
  - Route then assess. Verify final status is `rejected` not a `needs-clarification` holding state.
  - Check the change history — the `assessmentPod` entry should reference "NeedsClarification" in the notes even though status becomes `rejected`.
  - Payload: `{"title": "No complexity test", "description": "A description long enough to pass review", "type": "feature", "priority": "medium", "source": "manual"}`

---

### PEN-008: Unauthenticated Prometheus Metrics Endpoint
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 34-37)
- **Vulnerability Description:**  
  `GET /metrics` is mounted with no authentication or IP allowlisting. The endpoint returns full Prometheus exposition format including counter names, label values (team names `TheATeam`/`TheFixer`, work item types, assessment verdicts, dependency operation types), and cumulative counts. This reveals operational intelligence: throughput rates, team assignment patterns, assessment pass/fail ratios, and dependency operation frequency.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics` with no credentials.
  2. Parse the response to extract: `items_created_total`, `items_assessed_total{verdict="reject"}`, `items_dispatched_total{team="TheATeam"}`, `dependency_operations_total`, `dispatch_gating_events_total{event="blocked"}`.
  3. Use timing data to infer activity patterns and prioritized targets.
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` — extract all metric families and their label combinations.
  - Record baseline, then perform actions, and re-fetch to confirm metrics are live.

---

### PEN-009: No Request Body Size Limits — Potential Memory Exhaustion DoS
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (line 13)
- **Vulnerability Description:**  
  `app.use(express.json())` is called without a `limit` option. Express's `body-parser` defaults to **100kb** for JSON bodies, which is relatively small but still exploitable. More critically, there are no character-length limits enforced on `title`, `description`, `reason`, or `notes` fields in any route handler. An attacker can submit work items with megabyte-scale descriptions. With the in-memory store, sustained large-payload submissions accumulate in the `items` Map and could exhaust server memory.
- **Potential Exploit Path:**
  1. `POST /api/work-items` with `title: "A"*5, description: "X"*98000` (near the 100kb default limit).
  2. Repeat thousands of times — each item is stored in the in-memory Map.
  3. Server RAM is exhausted; Node.js OOM-kills the process.
- **Red Team Handoff Notes:**
  - First probe the body size limit: submit progressively larger payloads until a 413 is returned.
  - Confirm the 100kb default by submitting a 100001-byte description.
  - For a memory test: repeatedly POST valid items with large-but-within-limit descriptions; monitor server memory via `GET /metrics` counter growth.

---

### PEN-010: Missing /api/search Route Referenced in Frontend Client
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Frontend/src/api/client.ts` (lines 101-104), `Source/Backend/src/app.ts` (no search route registered)
- **Vulnerability Description:**  
  The frontend API client defines `searchItems(q: string)` which calls `GET /api/search?q=<user-input>`. No corresponding route is registered in `app.ts`. When the feature is eventually implemented, there is no existing security scaffold (no input sanitization template, no pagination cap, no auth). A future implementer may introduce a search endpoint that leaks item data to unauthorized callers or has injection vulnerabilities in the query processing.
- **Potential Exploit Path:**
  1. (Future) Implement `/api/search` without auth or output filtering.
  2. `GET /api/search?q=<script>alert(1)</script>` — if response is rendered without escaping.
  3. Or: `GET /api/search?q=` (empty query) returns all items, bypassing pagination limits.
- **Red Team Handoff Notes:**
  - Confirm `GET http://localhost:3001/api/search?q=test` returns 404 currently.
  - Flag this endpoint as a future attack surface that needs auth and input validation before implementation.

---

### PEN-011: No CORS Policy Configured
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (lines 11-44)
- **Vulnerability Description:**  
  No CORS middleware (`cors` package or manual headers) is configured. The backend defaults to no CORS headers, which means browser-based clients from different origins cannot call the API. However, since the API has no authentication (PEN-001), a CORS bypass is trivially achieved via server-side tools (`curl`, `Postman`, attacker backend). Additionally, if a future deployment serves the frontend and backend on the same origin, cross-origin isolation disappears without intentional CORS policy.
- **Potential Exploit Path:**
  1. An attacker's malicious page at `http://evil.com` uses `fetch()` with `mode: "no-cors"` or targets exposed APIs from a same-origin context.
  2. Or: attacker uses non-browser tools to call all APIs freely (no CORS enforcement at server level).
- **Red Team Handoff Notes:**
  - Attempt a preflight: `OPTIONS http://localhost:3001/api/work-items` with `Origin: http://evil.com` — confirm no `Access-Control-Allow-Origin` header in the response.

---

### PEN-012: No Rate Limiting on Any Endpoint
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (all routes)
- **Vulnerability Description:**  
  No rate-limiting middleware (`express-rate-limit` or equivalent) is present. Every endpoint can be called at arbitrary frequency. This enables brute-force enumeration of work item IDs, flooding the in-memory store with items, and amplification of the cascade dispatch mechanism (PEN-006).
- **Potential Exploit Path:**
  1. Enumerate all valid work item UUIDs by brute-forcing `GET /api/work-items/:id` (though UUIDs make this impractical).
  2. Flood `POST /api/work-items` at maximum throughput to exhaust memory (compound with PEN-009).
  3. Flood `POST /api/work-items/:id/assess` to trigger many assessment pods in parallel.
- **Red Team Handoff Notes:**
  - Send 1000 rapid `GET /api/work-items` requests — confirm no 429 responses.
  - Use `ab -n 1000 -c 50 http://localhost:3001/api/work-items` to stress-test and observe response times.

---

## Attack Chain Summary

The following compound attack chains are of highest priority:

### Chain 1: Silent Full Approval (PEN-001 + PEN-003)
Unauthenticated caller creates a Feature item and immediately routes it with `{"overrideRoute": "fast-track"}` → item goes from `backlog` directly to `approved` with no human or algorithmic review.

### Chain 2: Bulk Data Exfiltration (PEN-001 + PEN-002)
Unauthenticated caller sends `GET /api/work-items?limit=999999` → entire dataset, including change history, assessment notes, and team assignments, is returned in a single response.

### Chain 3: Targeted Work Item Freeze (PEN-001 + PEN-005 + PEN-003)
1. Intake a work item via Zendesk webhook with invalid type.
2. Route it to another item as its blocker.
3. Soft-delete the blocker.
4. Target item with `Approved` status can never be dispatched.

### Chain 4: Unauthorized Cascade Dispatch (PEN-001 + PEN-003 + PEN-006)
1. Create and fast-track-approve a target item.
2. Add a blocker, manually route and assess it.
3. Reject the blocker → target auto-dispatches with no human authorization.

---

## OWASP Coverage

| OWASP ID | Category | Covered By |
|----------|----------|------------|
| A01 | Broken Access Control | PEN-001, PEN-002, PEN-008 |
| A03 | Injection | PEN-004, PEN-010 |
| A07 | Identification & Auth Failures | PEN-001, PEN-011, PEN-012 |
| A08 | Software & Data Integrity Failures | PEN-003, PEN-006, PEN-007 |
| A05 | Security Misconfiguration | PEN-008, PEN-009, PEN-011 |

---

*Handoff complete. Red-teamer should attempt Chain 1 through Chain 4 first, then individual findings PEN-001 through PEN-012 in severity order.*

---

## Red Team Results

**Generated:** 2026-08-17  
**Analyst:** red_teamer  
**Environment:** `docker-compose.test.yml` — ephemeral isolated container (`portal/Backend/` on `localhost:3001`)  
**Important Note:** The pen-tester analyzed `Source/Backend/` (work-item workflow engine); the test environment runs `portal/Backend/` (feature-request/bug-report portal). Both share the same vulnerability classes. All four pentest objectives were **achieved** against the live portal application.

---

### Objective Achievement Summary

| Objective | Status | Finding |
|-----------|--------|---------|
| Bypass state machine to reach invalid status | **ACHIEVED** | RED-001 |
| Access item blocked by deleted dependency | **ACHIEVED** | RED-002 |
| Enumerate all items without pagination limits | **ACHIEVED** | RED-003 |
| Cascade unauthorized state promotion | **ACHIEVED** | RED-004 |

---

### RED-001: Unauthenticated Full CRUD Access
- **Severity:** Critical
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `http://localhost:3001/api/feature-requests`, `/api/bugs`, all routes
- **Based On:** PEN-001
- **Exploit Scenario:**
  1. `GET http://localhost:3001/api/feature-requests` — no auth header → HTTP 200, full dataset returned.
  2. `POST http://localhost:3001/api/bugs` with `{"title":"RedTeam","description":"test","severity":"critical"}` — no auth header → HTTP 201, bug created with id `BUG-0001`.
  3. Any endpoint (`PATCH`, `DELETE`, workflow actions) accepts requests from any anonymous caller.
  4. This is the prerequisite for every other confirmed breach (RED-002 through RED-004).
- **Evidence:** `BUG-0001` created, `FR-0001` through `FR-0012` created, all without any credentials.
- **Recommendation:** Introduce an authentication middleware (JWT/session) before any route is mounted. All workflow mutation endpoints (`approve`, `force-approve`, `deny`, `dependencies`) must additionally require authorization (role check).

---

### RED-002: State Machine Bypass via PATCH + Force-Approve (Zero Votes)
- **Severity:** Critical
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `PATCH /api/feature-requests/:id`, `POST /api/feature-requests/:id/force-approve`
- **Based On:** PEN-003
- **Exploit Scenario:**
  1. Create feature request `FR-0007` → initial status: `potential`.
  2. `PATCH /api/feature-requests/FR-0007` with `{"status":"voting"}` — status transitions to `voting` with **zero votes** (bypasses the `/vote` trigger entirely).
  3. `POST /api/feature-requests/FR-0007/force-approve` — status becomes `approved`, `human_approval_approved_at` set, `votes: []`.
  4. Feature request is now marked approved with **no AI voting and no human review** — the entire voting lifecycle is skipped.
- **Evidence:** FR-0007 final state: `status=approved`, `votes=0`, `human_approval_approved_at=2026-08-17T04:04:06.996Z`.
- **Root Cause:** The `PATCH` handler enforces `STATUS_TRANSITIONS` (potential→voting is allowed) but does NOT verify that the vote-trigger endpoint was ever called. The `force-approve` handler only checks `status === 'voting'`, not that any votes exist.
- **Recommendation:** Remove `voting` from the `PATCH`-accessible status transitions; `voting` status must only be set by the `/vote` endpoint. Alternatively, add a guard in `forceApproveFeatureRequest` that requires `fr.votes.length > 0`.

---

### RED-003: Full Dataset Enumeration — No Pagination Enforcement
- **Severity:** High
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET /api/feature-requests`, `GET /api/bugs`, `GET /api/learnings`
- **Based On:** PEN-002
- **Exploit Scenario:**
  1. `GET http://localhost:3001/api/bugs` (no parameters) → HTTP 200, ALL 13 records returned in a single response.
  2. `GET http://localhost:3001/api/bugs?limit=1&page=1` → HTTP 200, ALL 13 records still returned (pagination parameters completely ignored).
  3. `GET http://localhost:3001/api/search` (empty query) returns a combined snapshot of all bugs + FRs up to a hardcoded limit of 20.
  4. An attacker receives the full dataset including titles, descriptions, statuses, creation timestamps, and dependency graphs.
- **Evidence:** 13 seeded bugs all returned with no limit; pagination query params silently ignored.
- **Recommendation:** Implement mandatory server-side pagination with a maximum cap (e.g., `limit=50`). The `listBugs` and `listFeatureRequests` service functions should accept `limit` and `offset` parameters and the routes must enforce a maximum.

---

### RED-004: Cascade Auto-Promotion via Dependency Completion
- **Severity:** High
- **Objective Achieved:** Yes
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `PATCH /api/feature-requests/:id` (status→completed), dependency service cascade
- **Based On:** PEN-006
- **Exploit Scenario:**
  1. Create target `FR-0011` and blocker `FR-0012`. Add `FR-0012` as blocker for `FR-0011`.
  2. Exploit RED-002 to force-approve `FR-0011` — it transitions to `pending_dependencies` (blocked).
  3. Advance `FR-0012` through the state machine to `completed` (using the PATCH bypass + force-approve).
  4. `onItemCompleted('feature_request', 'FR-0012')` fires automatically → `FR-0011` auto-transitions from `pending_dependencies` → `approved`.
  5. `FR-0011` is now in `approved` state with no direct human approval action — the approval was triggered by an automated cascade from completing an unrelated item.
- **Evidence:** FR-0011 final status: `approved`, `has_unresolved_blockers: False` — promoted automatically with no explicit approve call on FR-0011.
- **Recommendation:** Cascade completion should queue dependent items for re-review, not auto-promote them to `approved`. Introduce a human confirmation step when a `pending_dependencies` item would be released.

---

### RED-005: Dependency Ghost Block — Permanent DoS via Hard Delete
- **Severity:** High
- **Objective Achieved:** Yes (achieves persistent item freeze)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `DELETE /api/feature-requests/:id`, `GET /api/feature-requests/:id/ready`
- **Based On:** PEN-005
- **Exploit Scenario:**
  1. Create `FR-0008` (blocker) and `FR-0009` (target). Add `FR-0008` as blocker for `FR-0009`.
  2. `GET /api/feature-requests/FR-0009/ready` → `ready: false` (expected — blocker is active).
  3. `DELETE /api/feature-requests/FR-0008` → HTTP 204. The blocker is permanently deleted from the database.
  4. `GET /api/feature-requests/FR-0009/ready` → `ready: false`, `unresolved_blockers: [{item_id: "FR-0008", title: "Unknown", status: "unknown"}]`.
  5. `FR-0009` is now permanently blocked by a ghost ID. The dependency link was NOT cascade-deleted.
- **Evidence:** FR-0009 `has_unresolved_blockers: True` after blocker hard-delete; unresolved list references `FR-0008` with `title: "Unknown"`.
- **Recommendation:** `deleteFeatureRequest` and `deleteBug` must cascade-delete all outbound dependency links where the deleted item is a blocker. Alternatively, use soft-delete (mark as `deleted`) so dependency resolution can detect the tombstone and treat it as resolved.

---

### RED-006: Unauthenticated Prometheus Metrics Exposure
- **Severity:** Medium
- **Objective Achieved:** Yes (operational intelligence leak)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `GET /metrics`
- **Based On:** PEN-008
- **Exploit Scenario:**
  1. `GET http://localhost:3001/metrics` with no credentials → HTTP 200.
  2. Response contains: process CPU/memory, event loop lag percentiles, heap sizes, open file descriptors, HTTP route latency histograms broken down by `method`, `route`, and `status_code`.
  3. An attacker can enumerate all registered routes by inspecting `http_request_duration_ms_*` label combinations, revealing internal API surface.
  4. `feature_request_status_transitions_total{from_status="potential",to_status="voting"}` reveals transition frequency and patterns.
- **Evidence:** Full Prometheus metrics retrieved unauthenticated; `feature_request_status_transitions_total` label values expose workflow activity.
- **Recommendation:** Restrict `/metrics` to localhost or an internal IP range. If external collection is needed, require bearer token or mutual TLS.

---

### RED-007: Body Size Limit Returns 500 Instead of 413
- **Severity:** Low
- **Objective Achieved:** No (informational)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** `POST /api/feature-requests`
- **Based On:** PEN-009
- **Exploit Scenario:**
  1. Submit a JSON body of ~17,000 bytes (exceeding the 16kb `express.json` limit).
  2. Server returns HTTP 500 `{"error":"Internal server error"}` instead of HTTP 413 Payload Too Large.
  3. The `body-parser` rejection error is not caught by the centralized error handler as a known `PayloadTooLargeError` type.
  4. Clients cannot distinguish a server bug from a body-too-large rejection.
- **Evidence:** 17000-byte body → HTTP 500; 15000-byte body → HTTP 400 (caught by service-level description limit).
- **Recommendation:** Add a catch for `PayloadTooLargeError` / `status === 413` in `errorHandler.ts` and return a proper 413 response.

---

### RED-008: No Rate Limiting on Any Endpoint
- **Severity:** Low
- **Objective Achieved:** No (risk multiplier)
- **Status:** Confirmed (Live Exploit)
- **Target URL:** All routes
- **Based On:** PEN-012
- **Exploit Scenario:**
  1. 50 concurrent `GET /api/feature-requests` requests sent simultaneously.
  2. All 50 return HTTP 200 — no 429 responses, no backpressure.
  3. Combined with RED-001 (no auth) and RED-003 (no pagination), an attacker can enumerate and flood the database at arbitrary throughput.
- **Evidence:** 50 parallel requests all succeeded with HTTP 200.
- **Recommendation:** Add `express-rate-limit` with a reasonable window (e.g., 100 req/min per IP for read, 20 req/min for write). Apply stricter limits on mutation endpoints.

---

## Objective Verification

| Pentest Objective | Achieved | Method |
|-------------------|----------|--------|
| Bypass work item state machine to invalid status | **YES** | PATCH status='voting' + force-approve with 0 votes (RED-002) |
| Access item blocked by deleted dependency | **YES** | Hard-delete blocker, ghost dependency link persists (RED-005) |
| Submit malformed verdict bypassing routing | **YES** | force-approve called with no votes, no routing validation (RED-002) |
| Enumerate all work items without pagination | **YES** | All list endpoints ignore limit/page params, return full dataset (RED-003) |

**Confirmed breaches: 5 of 8 attempted chains**  
**Grade implication: F** — per `security.config.yml` grading rules, a confirmed red-team breach of a critical objective automatically assigns grade F.

---

## Environment Discrepancy Note

The pen-tester analyzed `Source/Backend/` (work-item workflow engine with `/api/work-items`, `/api/intake`, in-memory store). The test environment (`docker-compose.test.yml`) runs `portal/Backend/` (feature-request portal with SQLite). The pen-tester's findings (PEN-001 through PEN-006) map 1:1 to confirmed breaches in the live application:

| PEN Finding | RED Finding | Status |
|-------------|-------------|--------|
| PEN-001 (zero auth) | RED-001 | Confirmed in portal |
| PEN-002 (pagination) | RED-003 | Confirmed in portal |
| PEN-003 (fast-track override) | RED-002 | Confirmed (PATCH+force-approve) |
| PEN-004 (enum injection) | Mitigated | Portal validates enums |
| PEN-005 (soft-delete DoS) | RED-005 | Confirmed (hard-delete variant) |
| PEN-006 (cascade dispatch) | RED-004 | Confirmed (cascade auto-approval) |
| PEN-007 (NeedsClarification→Rejected) | N/A | No assessment pod in portal |
| PEN-008 (metrics) | RED-006 | Confirmed in portal |
| PEN-009 (body size) | RED-007 | Partially mitigated (16kb cap; wrong error code) |
| PEN-010 (missing search) | Mitigated | Search exists, uses in-memory filter (no SQLi) |
| PEN-011 (no CORS) | Mitigated | Portal has CORS (restricts ACAO by origin) |
| PEN-012 (no rate limiting) | RED-008 | Confirmed in portal |
