# Chaos Monkey Findings — 2026-04-15

## Mode: Dynamic + Static
**Services checked:** backend (http://localhost:3001) — UP, frontend (http://localhost:5173) — UP  
**Faults injected:** 35 (malformed inputs, path traversal, SSRF, pagination abuse, concurrent requests, method tampering)  
**Invariants checked:** 18  
**Prior P1/P2 findings to re-verify:** None (first run)

---

> **Architecture note:** The service running at port 3001 is the **portal backend** (`portal/Backend/`), not the `Source/Backend/` work-item workflow app. The Source/Backend app is not currently running. Dynamic tests targeted the portal backend; static analysis covered both.

---

## CHAOS-001: SSRF via Orchestrator Proxy Path Traversal
- **Severity:** P1
- **Category:** state-invariant / security
- **File:** `portal/Backend/src/index.ts:75`
- **Test:** `GET http://localhost:3001/api/orchestrator/../../health` → HTTP 200 `{"status":"ok"}` (live backend health response)
- **Expected:** 400 Bad Request or path normalised to orchestrator URL only
- **Actual:** The proxy concatenates `req.url` onto the orchestrator base URL without sanitisation. `../../health` resolves to the backend's own `/health` endpoint. Any internal route can be reached: `/api/orchestrator/../../api/bugs`, `/api/orchestrator/../../api/feature-requests`, etc.
- **Recommendation:** Validate that the path after `/api/orchestrator/` does not contain `..` segments and resolves within the orchestrator's allowed path space. Use `URL` + `pathname` to strip traversal sequences before forwarding.
- **Cross-ref:** [ESCALATE → TheGuardians] — SSRF class vulnerability; auth bypass vector if any internal-only endpoints exist.

---

## CHAOS-002: No Timeout on Orchestrator fetch() — Infinite Hang Risk
- **Severity:** P1
- **Category:** missing-timeout
- **File:** `portal/Backend/src/index.ts:112`
- **Test:** Static analysis — `fetch(targetUrl, fetchOpts)` with no `AbortController` or `signal` timeout option.
- **Expected:** Every outbound HTTP call has a configurable timeout (e.g. 30s) with a 502/504 response on expiry.
- **Actual:** If the orchestrator hangs, the portal backend Express handler holds its connection open indefinitely. Under concurrent load, all worker slots fill with hung connections, producing a cascading outage (connection pool exhaustion). The SSE path compounds this — `reader.read()` in the pump loop blocks forever unless the client disconnects.
- **Recommendation:** Wrap `fetch()` with an `AbortController`:
  ```ts
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const response = await fetch(targetUrl, { ...fetchOpts, signal: controller.signal });
  clearTimeout(timer);
  ```
- **Cross-ref:** performance-profiler (latency budgets)

---

## CHAOS-003: No SIGTERM/SIGINT Signal Handlers — No Graceful Shutdown
- **Severity:** P1
- **Category:** recovery-failure
- **File:** `portal/Backend/src/index.ts:155-168`, `Source/Backend/src/app.ts:48-52`
- **Test:** Static analysis — grep for `SIGTERM`, `SIGINT`, `process.on` in both backend source trees → zero matches.
- **Expected:** On `SIGTERM` (Docker stop, Kubernetes eviction, `pm2 reload`): stop accepting new connections, drain in-flight requests, flush SQLite WAL checkpoint, call `closeDb()`, exit cleanly.
- **Actual:** `SIGTERM` kills the process immediately. `closeDb()` is defined in `portal/Backend/src/database/connection.ts:27` but is never called from `index.ts`. SQLite WAL may not be flushed, in-flight requests receive TCP RST, and no log is emitted.
- **Recommendation:**
  ```ts
  const server = app.listen(PORT, ...);
  const shutdown = (signal: string) => {
    logger.info('Graceful shutdown initiated', { signal });
    server.close(() => { closeDb(); process.exit(0); });
    setTimeout(() => process.exit(1), 15_000); // force-kill after 15s
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  ```
- **Cross-ref:** TheFixer

---

## CHAOS-004: No uncaughtException / unhandledRejection Handlers — Silent Process Death
- **Severity:** P2
- **Category:** error-handling
- **File:** `portal/Backend/src/index.ts`, `Source/Backend/src/app.ts`
- **Test:** Static analysis — grep for `uncaughtException`, `unhandledRejection` → zero matches in both backends.
- **Expected:** Top-level handlers log the error with full stack trace, emit a metric, and trigger an orderly shutdown so the crash is observable.
- **Actual:** Any thrown error outside an Express handler (timer callback, event emitter, top-level async) crashes the Node.js process silently. No log, no alert, no cleanup.
- **Recommendation:**
  ```ts
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    process.exit(1);
  });
  ```
- **Cross-ref:** TheFixer

---

## CHAOS-005: GET /api/dashboard Returns 404 — Route Not Registered
- **Severity:** P2
- **Category:** recovery-failure
- **File:** `portal/Backend/src/index.ts:64`
- **Test:** `GET http://localhost:3001/api/dashboard` → HTTP 404 HTML `Cannot GET /api/dashboard`
- **Expected:** HTTP 200 with dashboard data (route is declared in source, imported as `dashboardRouter`)
- **Actual:** The route returns 404. The `dashboardRouter` import and `app.use('/api/dashboard', dashboardRouter)` are in the source file, but the live server is not serving it — possible stale build or import error at startup that was silently swallowed.
- **Recommendation:** Check server startup logs for import errors on `dashboardRouter`. Verify the compiled/transpiled output includes the dashboard route. Confirm `routes/dashboard.ts` exports a valid Router.
- **Cross-ref:** TheFixer, quality-oracle

---

## CHAOS-006: Invalid JSON Body Causes HTTP 500 Instead of 400
- **Severity:** P2
- **Category:** error-handling
- **File:** `portal/Backend/src/middleware/errorHandler.ts`
- **Test:** `POST /api/feature-requests` with body `not-json` → HTTP 500 `{"error":"Internal server error"}`; same for `/api/bugs`.
- **Expected:** HTTP 400 `{"error":"Invalid JSON in request body"}` — Express emits a `SyntaxError` with `status: 400` when JSON parsing fails.
- **Actual:** The `errorHandler` middleware does not check for `SyntaxError` from body-parser and falls through to the generic 500 handler.
- **Recommendation:** In `errorHandler.ts`, add:
  ```ts
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  ```
- **Cross-ref:** TheFixer

---

## CHAOS-007: Pagination Parameters Not Validated — Full Dataset Dump
- **Severity:** P2
- **Category:** resource-leak
- **File:** `portal/Backend/src/routes/featureRequests.ts`, `portal/Backend/src/routes/bugs.ts` (and equivalent list routes)
- **Test:** `GET /api/feature-requests?page=-1&limit=-1` → HTTP 200, full dataset. `?page=99999&limit=99999` → HTTP 200, full dataset. `?page=abc&limit=xyz` → HTTP 200, full dataset. `?limit=0` → HTTP 200, full dataset.
- **Expected:** Negative/zero/non-numeric pagination values rejected with 400, or clamped to a safe range (page ≥ 1, 1 ≤ limit ≤ 100).
- **Actual:** All invalid values are silently ignored and the full dataset is returned on every request. This is a denial-of-service vector: a single `?limit=99999` request dumps the entire table.
- **Recommendation:** Validate and clamp: `page = Math.max(1, parseInt(raw, 10) || 1)`, `limit = Math.min(100, Math.max(1, parseInt(raw, 10) || 20))`. Return 400 for non-numeric inputs.
- **Cross-ref:** performance-profiler

---

## CHAOS-008: Silent .catch() Swallows SSE Stream Errors
- **Severity:** P2
- **Category:** error-handling
- **File:** `portal/Backend/src/index.ts:130`
- **Test:** Static analysis — `pump().catch(() => res.end())`
- **Expected:** Stream errors are logged with context (request URL, error message) before closing the response.
- **Actual:** The catch handler captures no error parameter and calls only `res.end()`. SSE stream failures (orchestrator disconnect, network error, parse error) are completely invisible in logs. The error object is thrown away.
- **Recommendation:**
  ```ts
  pump().catch((err: Error) => {
    logger.error('SSE pump error', { url: targetUrl, error: err.message });
    res.end();
  });
  ```
- **Cross-ref:** TheFixer

---

## CHAOS-009: Race Condition — Read-Then-Write Not Wrapped in Transaction
- **Severity:** P2
- **Category:** state-invariant
- **File:** `portal/Backend/src/services/featureRequestService.ts:251-328`, `portal/Backend/src/services/bugService.ts:184-297`
- **Test:** Static analysis — `updateFeatureRequest` and `updateBug` read current status, validate transition, then write — three separate SQLite operations without a transaction.
- **Expected:** Status transitions use a `db.transaction()` to guarantee atomicity: read + validate + write cannot be interleaved by concurrent requests.
- **Actual:** Two simultaneous PATCH requests for the same item can both read the same `status`, both pass the transition guard, and both write — the second write silently overwrites the first. SQLite WAL allows both writes without a conflict error.
- **Recommendation:** Wrap read-validate-write sequences in `db.transaction(() => { ... })()`. Note: `voteOnFeatureRequest` and `retriggerFeatureRequest` already correctly use transactions — apply the same pattern to `updateFeatureRequest` and `updateBug`.
- **Cross-ref:** TheFixer

---

## CHAOS-010: No busy_timeout Pragma — SQLITE_BUSY on Concurrent Writes
- **Severity:** P2
- **Category:** resource-leak
- **File:** `portal/Backend/src/database/connection.ts:19-22`
- **Test:** Static analysis — `db.pragma('journal_mode = WAL')` but no `db.pragma('busy_timeout = 5000')`.
- **Expected:** When a write lock is held, concurrent write operations wait up to a configured timeout before failing with `SQLITE_BUSY`.
- **Actual:** `busy_timeout` defaults to 0ms. Any concurrent write during a held lock immediately throws `SQLITE_BUSY`, propagating as a 500 to the client.
- **Recommendation:** Add `db.pragma('busy_timeout = 5000')` after connection creation in `getDb()`.
- **Cross-ref:** TheFixer

---

## CHAOS-011: Unbounded Dashboard Activity Queries — 6 Full Table Scans in Memory
- **Severity:** P2
- **Category:** resource-leak
- **File:** `portal/Backend/src/services/dashboardService.ts`
- **Test:** Static analysis — `getDashboardActivity` issues 6 `SELECT *` queries (no LIMIT) across all tables, merges all results in memory, then slices to 200.
- **Expected:** Database-level LIMIT applied per table scan so memory usage is bounded regardless of data volume.
- **Actual:** As the database grows to thousands of rows per table, a single `GET /api/dashboard/activity` request loads tens of thousands of rows into Node.js heap simultaneously. This is O(n·tables) memory growth with no bound.
- **Recommendation:** Add `LIMIT N` (e.g. 500) to each per-table query before the in-memory merge, so the merge input is bounded even at scale.
- **Cross-ref:** performance-profiler, TheFixer

---

## CHAOS-012: No Body Size Limit — Source/Backend
- **Severity:** P3
- **Category:** resource-leak
- **File:** `Source/Backend/src/app.ts:13`
- **Test:** Static analysis — `app.use(express.json())` with no `limit` option.
- **Expected:** Explicit body size limit (e.g. `'100kb'` at most, preferably `'16kb'` to match portal backend).
- **Actual:** Defaults to Express's implicit 100kb limit. No explicit enforcement. Oversized payloads (up to 100kb) are accepted without rejection; payloads above 100kb cause a 500 instead of 413.
- **Recommendation:** `app.use(express.json({ limit: '16kb' }))` — match the portal backend's explicit limit.
- **Cross-ref:** TheFixer

---

## CHAOS-013: Oversized Payload Returns 500 Instead of 413
- **Severity:** P3
- **Category:** error-handling
- **File:** `portal/Backend/src/middleware/errorHandler.ts`
- **Test:** POST with ~40KB JSON body → HTTP 500 `{"error":"Internal server error"}`
- **Expected:** HTTP 413 `{"error":"Request entity too large"}`
- **Actual:** The `errorHandler` does not check for `err.type === 'entity.too.large'` and returns 500.
- **Recommendation:** In `errorHandler.ts`:
  ```ts
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request entity too large' });
  }
  ```
- **Cross-ref:** TheFixer

---

## CHAOS-014: No try/catch in Intake Webhook Route Handlers
- **Severity:** P3
- **Category:** error-handling
- **File:** `Source/Backend/src/routes/intake.ts`
- **Test:** Static analysis — zendesk and automated handlers call `store.createWorkItem()` without try/catch.
- **Expected:** All route handlers wrap store/service calls in try/catch and forward errors to `next(err)`.
- **Actual:** Any unexpected throw from the store propagates as an unhandled Express error, producing an HTML 500 instead of the `{error: "..."}` JSON contract.
- **Recommendation:** Wrap the body of each route handler with `try { ... } catch (err) { next(err); }`.
- **Cross-ref:** TheFixer

---

## CHAOS-015: No Enum Validation in Intake Webhook Routes
- **Severity:** P3
- **Category:** state-invariant
- **File:** `Source/Backend/src/routes/intake.ts:19-26, 40-47`
- **Test:** Static analysis — `body.type` and `body.priority` are accepted from the request body without enum validation.
- **Expected:** `type` and `priority` values are validated against `WorkItemType` and `WorkItemPriority` enums before reaching the store.
- **Actual:** An arbitrary string (e.g. `"type": "malicious"`) is stored without error. The manual work items route (`workItems.ts`) validates correctly — the intake routes do not.
- **Recommendation:** Apply the same enum validation pattern from `workItems.ts` lines 29–47 to the intake webhook handlers.
- **Cross-ref:** TheFixer

---

## CHAOS-016: CORS Advertises Methods That Are Not Implemented
- **Severity:** P3
- **Category:** state-invariant
- **File:** `portal/Backend/src/index.ts:34-39`
- **Test:** `OPTIONS /api/feature-requests` → `Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS`. `PATCH /api/feature-requests` → 404.
- **Expected:** CORS allowed methods match actually implemented methods per route.
- **Actual:** The CORS configuration globally advertises PATCH and DELETE, but the list collection endpoints do not implement those methods. Browsers preflight and see PATCH as allowed; the actual request then 404s.
- **Recommendation:** Restrict CORS allowed methods to `['GET', 'POST', 'OPTIONS']` globally, or configure per-route. Also confirm `Access-Control-Allow-Credentials: true` is appropriate given the `allowedOrigins` configuration.
- **Cross-ref:** TheGuardians (credentials flag review)

---

## CHAOS-017: Method Not Allowed Returns 404 HTML Instead of 405 JSON
- **Severity:** P3
- **Category:** error-handling
- **File:** `portal/Backend/src/middleware/errorHandler.ts`, Express router
- **Test:** `PUT /api/feature-requests` → 404 HTML `Cannot PUT /api/feature-requests`
- **Expected:** HTTP 405 `{"error":"Method not allowed"}` with `Allow: GET, POST` header.
- **Actual:** Express router emits a 404 HTML page for unregistered method+path combinations.
- **Recommendation:** Add a catch-all middleware before the error handler that converts Express 404s with `req.method` not matching any route to 405 responses with an `Allow` header.
- **Cross-ref:** TheFixer

---

## CHAOS-018: closeDb() Defined but Never Called
- **Severity:** P3
- **Category:** recovery-failure
- **File:** `portal/Backend/src/database/connection.ts:27-33`
- **Test:** Static analysis — `closeDb()` exists but `grep -r 'closeDb' portal/Backend/src/` shows zero call sites in production code (only in test fixtures).
- **Expected:** `closeDb()` is called during graceful shutdown to flush WAL and release the file lock.
- **Actual:** `closeDb()` is dead code in production. The SQLite file lock is held until the OS forcibly releases it on process exit.
- **Recommendation:** Call `closeDb()` inside the SIGTERM/SIGINT handler (see CHAOS-003).
- **Cross-ref:** TheFixer

---

## CHAOS-019: No Rate Limiting on Any Endpoint
- **Severity:** P3
- **Category:** resource-leak
- **File:** `portal/Backend/src/index.ts` (no rate-limit middleware registered)
- **Test:** Static analysis — no `express-rate-limit` or equivalent middleware in either backend.
- **Expected:** Rate limiting on write endpoints and especially the orchestrator proxy, which amplifies requests to an external service.
- **Actual:** The orchestrator proxy (`/api/orchestrator`) is particularly exposed — every unauthenticated request is amplified into an upstream request with no throttle.
- **Recommendation:** Add `express-rate-limit` with a conservative limit (e.g. 100 req/min per IP) on the orchestrator proxy and write endpoints.
- **Cross-ref:** TheGuardians

---

## CHAOS-020: Stored XSS — No Input Sanitization
- **Severity:** P3
- **Category:** state-invariant
- **File:** `portal/Backend/src/services/featureRequestService.ts`, `portal/Backend/src/services/bugService.ts`
- **Test:** `POST /api/feature-requests` with `{"title":"<script>alert(1)</script>","description":"<img src=x onerror=alert(1)>"}` → HTTP 201, stored verbatim.
- **Expected:** XSS payloads are either rejected (400) or sanitized before storage.
- **Actual:** Raw HTML/JS is stored and returned verbatim by every list and single-item endpoint. React's default rendering is XSS-safe for text content, but `dangerouslySetInnerHTML` usage anywhere in the frontend would trigger stored XSS.
- **Recommendation:** Reject inputs containing `<script>`, `<iframe>`, or `on*=` patterns at the service layer, or use a server-side sanitizer (e.g. `sanitize-html`).
- **Cross-ref:** TheGuardians

---

## CHAOS-021: updateWorkItem Store Has No Field Whitelist
- **Severity:** P4
- **Category:** state-invariant
- **File:** `Source/Backend/src/store/workItemStore.ts:71`
- **Test:** Static analysis — `Object.assign(item, updates, ...)` applies any `Partial<WorkItem>` with no field restrictions.
- **Expected:** The store's update function either accepts only safe fields, or route handlers are the sole enforcement point.
- **Actual:** Route handlers enforce the whitelist correctly today, but the store offers no protection — any future internal caller passing a `status` or `deleted` field bypasses the state machine entirely.
- **Recommendation:** Either accept a typed `UpdateableFields` interface in `updateWorkItem`, or add an `assert` that `status` and `deleted` are not in `updates`.
- **Cross-ref:** TheFixer

---

## CHAOS-022: NaN from parseInt Not Explicitly Validated in Dashboard Route
- **Severity:** P4
- **Category:** error-handling
- **File:** `portal/Backend/src/routes/dashboard.ts:34`
- **Test:** Static analysis — `parseInt(String(limitParam), 10)` returns `NaN` for non-numeric input, passed to `getDashboardActivity(db, NaN)`.
- **Expected:** Explicit validation of parsed integer before use: `if (isNaN(limit)) return res.status(400).json(...)`.
- **Actual:** `NaN > 0` is `false`, so `dashboardService.ts` accidentally falls back to `DEFAULT_ACTIVITY_LIMIT`. Correct behaviour but fragile — depends on an accidental NaN coercion in a comparison.
- **Recommendation:** Validate with `if (limitParam && (isNaN(parsedLimit) || parsedLimit < 1)) return res.status(400).json({ error: 'Invalid limit' })`.
- **Cross-ref:** TheFixer

---

## CHAOS-023: Unbounded List Queries — No Pagination in Portal Backend
- **Severity:** P4
- **Category:** resource-leak
- **File:** `portal/Backend/src/services/featureRequestService.ts:152-171`, `portal/Backend/src/services/bugService.ts:89-111`
- **Test:** Static analysis — `listFeatureRequests` and `listBugs` have no LIMIT clause; the search route loads all bugs and all FRs into memory for in-memory filtering.
- **Expected:** Database-level pagination on all list operations.
- **Actual:** As data grows, every `GET /api/feature-requests` and `GET /api/bugs` performs a full table scan. The search route compounds this by loading two full tables simultaneously.
- **Recommendation:** Add optional `LIMIT/OFFSET` parameters to `listFeatureRequests` and `listBugs`; implement server-side pagination on the search route.
- **Cross-ref:** performance-profiler, TheFixer

---

## Test Results Summary

| Scenario | Type | Result |
|---|---|---|
| Backend health | Dynamic | PASS |
| Frontend health | Dynamic | PASS |
| Baseline API probing | Dynamic | PASS (except /api/dashboard 404) |
| Invalid JSON body injection | Dynamic | FAIL — 500 instead of 400 |
| XSS payload injection | Dynamic | FAIL — stored verbatim |
| Oversized payload | Dynamic | FAIL — 500 instead of 413 |
| Path traversal (plain) | Dynamic | PASS — Express router safely 404s |
| URL-encoded path traversal in ID | Dynamic | PASS — treated as literal ID string |
| Concurrent creation (5 parallel) | Dynamic | PASS — no race, sequential IDs |
| HTTP method tampering | Dynamic | PARTIAL — wrong status codes (404 vs 405) |
| Pagination abuse | Dynamic | FAIL — full dataset returned on all invalid params |
| Orchestrator SSRF via path traversal | Dynamic | FAIL — P1 SSRF confirmed |
| Orchestrator fetch() timeout | Static | FAIL — no timeout |
| SIGTERM/SIGINT handlers | Static | FAIL — absent from both backends |
| uncaughtException handlers | Static | FAIL — absent |
| SSE error silencing | Static | FAIL — catch swallows error |
| Transaction wrapping on update | Static | FAIL — read-then-write unprotected |
| SQLite busy_timeout | Static | FAIL — not configured |

---

```json
{
  "agent": "chaos-monkey",
  "date": "2026-04-15",
  "mode": "dynamic+static",
  "services_healthy_at_close": ["backend:3001", "frontend:5173"],
  "faults_injected": 35,
  "invariants_checked": 18,
  "findings": {
    "P1": ["CHAOS-001", "CHAOS-002", "CHAOS-003"],
    "P2": ["CHAOS-004", "CHAOS-005", "CHAOS-006", "CHAOS-007", "CHAOS-008", "CHAOS-009", "CHAOS-010", "CHAOS-011"],
    "P3": ["CHAOS-012", "CHAOS-013", "CHAOS-014", "CHAOS-015", "CHAOS-016", "CHAOS-017", "CHAOS-018", "CHAOS-019", "CHAOS-020"],
    "P4": ["CHAOS-021", "CHAOS-022", "CHAOS-023"]
  },
  "escalate_to_TheGuardians": ["CHAOS-001", "CHAOS-016", "CHAOS-019", "CHAOS-020"],
  "escalate_to_TheFixer": ["CHAOS-002", "CHAOS-003", "CHAOS-004", "CHAOS-005", "CHAOS-006", "CHAOS-007", "CHAOS-008", "CHAOS-009", "CHAOS-010", "CHAOS-011", "CHAOS-012", "CHAOS-013", "CHAOS-014", "CHAOS-015", "CHAOS-017", "CHAOS-018", "CHAOS-021", "CHAOS-022", "CHAOS-023"],
  "tests": {
    "pass": ["backend-health", "frontend-health", "baseline-apis", "path-traversal-plain", "url-encoded-path-traversal", "concurrent-creation"],
    "fail": ["invalid-json-500", "xss-stored", "oversized-500", "method-tampering-status", "pagination-unbounded", "ssrf-orchestrator", "fetch-timeout-absent", "sigterm-absent", "uncaught-handlers-absent", "sse-silent-catch", "update-no-transaction", "busy-timeout-absent"]
  }
}
```
