---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — fell back to LLM pattern scan
- **semgrep**: [TOOL UNAVAILABLE] — fell back to LLM pattern scan
- **npm scripts**: No dangerous `postinstall` scripts found (only `build`, `test`, `typecheck`)

---

### SAST-01: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Zero authentication middleware is applied anywhere in the Express application. Any unauthenticated HTTP client can create, route, approve, reject, and dispatch work items; read all dashboard data; and trigger cascade auto-dispatches. There is no JWT validation, session check, API key, or any other identity gate.
- **Remediation:** Add an authentication middleware (e.g., JWT bearer verification) and apply it to all API routes. Use route-level authorization guards for state-transition endpoints (`/route`, `/approve`, `/dispatch`).
- **Handoff:** [HANDOFF → pen-tester] — verify that unauthenticated requests succeed against all critical endpoints.

---

### SAST-02: Webhook Intake Endpoints Lack HMAC Signature Verification
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function) / CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:10–30, 33–50`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({
      title: body.title,
      description: body.description,
      type: body.type || WorkItemType.Bug,      // ← no signature check
      ...
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept arbitrary POST bodies with no webhook signature verification (e.g., Zendesk signs payloads with an HMAC-SHA256 header `X-Zendesk-Webhook-Signature`). Any external party knowing the URL can inject arbitrary work items.
- **Remediation:** Verify the `X-Zendesk-Webhook-Signature` header against a shared secret from environment variables before processing the body. Reject requests that fail verification with HTTP 401.

---

### SAST-03: Unvalidated Enum Fields in Intake Routes (CWE-20)
- **Severity:** High
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22–23, 45–46`
- **Code Snippet:**
  ```typescript
  type: body.type || WorkItemType.Bug,        // no enum membership check
  priority: body.priority || WorkItemPriority.Medium,   // no enum membership check
  ```
- **Description:** `body.type` and `body.priority` from external webhook payloads are accepted with a falsy-fallback only (`|| default`). A non-empty but invalid value like `"pwned-type"` passes through and is stored in the in-memory work item. The main CRUD route (`workItems.ts:29–40`) validates these fields correctly using `Object.values(WorkItemType).includes(body.type)` — the intake routes are inconsistent and insecure.
- **Remediation:** Apply the same enum validation used in `workItems.ts` to both intake routes before calling `store.createWorkItem`. Return HTTP 400 on invalid enum values.

---

### SAST-04: Error Messages Leak Internal State to Clients (CWE-209)
- **Severity:** High
- **CWE:** CWE-209 (Information Exposure Through an Error Message)
- **File:** `Source/Backend/src/routes/workflow.ts:60–62, 87–89, 138–140, 205–207, 292–294, 331–333, 368–370`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw exception text sent to client
  }
  ```
- **Description:** All seven workflow action endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, `/dependencies`, `/ready`) send the raw `err.message` string from caught exceptions back to the HTTP client as JSON. This exposes internal details such as store state, item IDs, and dependency graph messages to any caller.
- **Remediation:** Return a generic `"Internal server error"` message to clients; log the full details (including `err.message` and `err.stack`) only server-side. Reserve specific messages only for known, safe validation errors (already done for the 400/404/409 paths in the dependencies handler).

---

### SAST-05: Prometheus /metrics Endpoint Unauthenticated (CWE-200)
- **Severity:** High
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34–37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The Prometheus metrics endpoint is publicly accessible without authentication. It exposes internal operational data including counters for dispatch events, dependency operations, cycle detections, assessment verdicts, and Node.js runtime statistics (from `collectDefaultMetrics`). This provides an attacker with a detailed map of system activity and workflow state volumes.
- **Remediation:** Protect `/metrics` with IP allowlisting or a bearer token check. In production, bind the metrics server to a separate internal port not exposed externally.

---

### SAST-06: No CORS Configuration (CWE-942)
- **Severity:** Medium
- **CWE:** CWE-942 (Overly Permissive Cross-domain Whitelist)
- **File:** `Source/Backend/src/app.ts`
- **Description:** Express is running without any CORS middleware. By default, browsers apply the Same-Origin Policy, but the API has no explicit CORS response headers — meaning the server silently accepts cross-origin requests from any domain on the network. In a browser context, this allows any malicious page to make authenticated (same-credential) requests against the API if the victim has network access.
- **Remediation:** Install `cors` package and explicitly configure `allowedOrigins` to the frontend origin(s) only. Do not use `origin: '*'` on endpoints that handle state mutations.

---

### SAST-07: Missing HTTP Security Headers — No Helmet (CWE-693)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts`
- **Description:** No security headers are set: no `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`, or `Referrer-Policy`. The `helmet` package is not installed. The frontend also has no CSP `<meta>` tag or server-side header configuration.
- **Remediation:** Install and apply `helmet()` as the first middleware in `app.ts`. Configure CSP to restrict script-src and object-src.

---

### SAST-08: No Rate Limiting on Any Endpoint (CWE-770)
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts` (global), `Source/Backend/src/routes/intake.ts` (webhook ingestion)
- **Description:** No rate limiting middleware (`express-rate-limit` or equivalent) is applied anywhere. The intake webhook endpoints and all workflow action endpoints can be called arbitrarily fast, enabling DoS via store exhaustion or CPU saturation from assessment pod logic.
- **Remediation:** Apply `express-rate-limit` globally and with tighter limits on the intake routes (e.g., 60 req/min globally, 10 req/min per IP on `/api/intake`).

---

### SAST-09: Unbounded Pagination `limit` Parameter (CWE-400)
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  // No maximum cap — ?limit=999999 returns all items
  ```
- **Description:** Both `GET /api/work-items` and `GET /api/dashboard/activity` parse `limit` from the query string with no upper bound. A caller can pass `?limit=999999` to retrieve the entire in-memory store in a single response, enabling data exfiltration and DoS via large JSON serialization.
- **Remediation:** Enforce `const safeLimit = Math.min(parseInt(...), 100)` before passing to the store. Return HTTP 400 if `limit` is non-numeric or negative.
- **Handoff:** [HANDOFF → pen-tester] — verify enumeration of all items via single oversized limit request.

---

### SAST-10: No Input Length Caps on Free-Text Fields (CWE-400)
- **Severity:** Low
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:24–46`, `Source/Backend/src/routes/intake.ts:14–24`
- **Description:** The `title`, `description`, and `reason` fields accept unbounded string length. No `maxLength` validation exists server-side. Express defaults body parsing to 100KB total, but a series of requests each with long strings fills the in-memory store unboundedly over time.
- **Remediation:** Add max-length checks (e.g., `title.length > 500` → HTTP 400, `description.length > 10_000` → HTTP 400).

---

### SAST-11: `/api/search` Route Referenced but Not Implemented
- **Severity:** Low
- **CWE:** CWE-404 (Improper Resource Shutdown / Missing Route)
- **File:** `Source/Frontend/src/api/client.ts` (calls `/search?q=`); `Source/Backend/src/app.ts` (no `/api/search` route registered)
- **Code Snippet:**
  ```typescript
  searchItems(q: string): Promise<{ data: WorkItem[] }> {
    const params = new URLSearchParams({ q });
    return request(`/search?${params.toString()}`);  // → 404 always
  },
  ```
- **Description:** The `DependencyPicker` component calls `workItemsApi.searchItems()` which issues requests to `/api/search?q=`. No such route exists in the backend — the call always 404s silently. When implemented in the future, if the `q` parameter is not sanitized, it could introduce a search injection vulnerability.
- **Remediation:** Either implement the `/api/search` route with sanitized query filtering, or remove the dead client method. When implemented: enforce a minimum query length, escape regex metacharacters, and add a `limit` cap on results.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-01 | No Authentication on Any Endpoint | **High** | CWE-306 |
| SAST-02 | No Webhook Signature Verification | **High** | CWE-306/345 |
| SAST-03 | Unvalidated Enum Fields in Intake Routes | **High** | CWE-20 |
| SAST-04 | Error Messages Leak Internal State | **High** | CWE-209 |
| SAST-05 | Prometheus /metrics Unauthenticated | **High** | CWE-200 |
| SAST-06 | No CORS Configuration | Medium | CWE-942 |
| SAST-07 | Missing HTTP Security Headers | Medium | CWE-693 |
| SAST-08 | No Rate Limiting | Medium | CWE-770 |
| SAST-09 | Unbounded Pagination `limit` | Medium | CWE-400 |
| SAST-10 | No Input Length Caps | Low | CWE-400 |
| SAST-11 | Unimplemented `/api/search` Route | Low | CWE-404 |

**Counts: High=5, Medium=4, Low=2, Total=11**

No hardcoded secrets found in first-party source. No use of `eval`, `exec`, or dynamic code execution. No weak cryptography patterns detected. Stack traces are correctly logged server-side only (not leaked in HTTP responses by the error handler middleware — the vulnerability is in the per-route catch blocks in `workflow.ts`, not in the global error handler).
