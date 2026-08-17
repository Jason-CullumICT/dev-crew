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
