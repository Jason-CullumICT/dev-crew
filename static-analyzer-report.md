---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — LLM pattern scan substituted
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — LLM pattern scan substituted
- **npm lifecycle scripts**: Clean — no postinstall or suspicious hooks

---

### SAST-01: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:12–44`
- **Code Snippet:**
  ```typescript
  app.use(express.json());
  // No auth middleware registered before routes
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Zero authentication or authorization middleware is present anywhere in the Express app. All CRUD operations, workflow state transitions (approve, reject, dispatch), and the dashboard are fully open to unauthenticated requests. Any caller on the network can create, approve, reject, or dispatch work items.
- **Remediation:** Add an authentication middleware (JWT bearer token, API key, or session check) before all `app.use('/api/...')` mounts. Use `req.user` for authorization decisions on sensitive transitions like approve/dispatch.
- **Handoff:** `[HANDOFF → pen-tester]` — verify unauthenticated access to all transition endpoints in a live run.

---

### SAST-02: Internal Error Messages Leaked to Clients
- **Severity:** High
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:60–63, 87–90, 138–141, 204–207, 291–294, 349–352, 369–372`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw err.message returned to caller
  }
  ```
- **Description:** Every workflow route handler catches exceptions and forwards `err.message` verbatim to the HTTP response. If an internal library throws an error containing a stack trace fragment, file path, or configuration detail (e.g., from a future database layer), that detail is exposed to the caller. The correct `errorHandler` middleware at `middleware/errorHandler.ts` returns only `"Internal server error"`, but these catch blocks bypass it entirely.
- **Remediation:** Replace `res.status(500).json({ error: message })` with `res.status(500).json({ error: 'Internal server error' })`. Log the raw `message` only (already done). Keep specific user-facing errors (400-level) as-is.

---

### SAST-03: Intake Webhooks Lack Signature Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11–31, 34–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No webhook signature check — any caller can POST here
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  ```
- **Description:** The Zendesk webhook endpoint (`POST /api/intake/zendesk`) and the automated intake endpoint (`POST /api/intake/automated`) perform no caller verification. Legitimate Zendesk webhooks carry an HMAC-SHA256 signature in the `X-Zendesk-Webhook-Signature` header. Without verification, any actor on the internet can inject arbitrary work items into the workflow engine by posting to these endpoints.
- **Remediation:** For the Zendesk endpoint: verify the `X-Zendesk-Webhook-Signature` header against the raw request body using a shared HMAC secret stored in an environment variable. For the automated endpoint: require a bearer token or API key in the `Authorization` header.

---

### SAST-04: Prometheus `/metrics` Endpoint Unauthenticated
- **Severity:** High
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34–37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());  // No auth check
  });
  ```
- **Description:** The Prometheus metrics endpoint is publicly accessible. `collectDefaultMetrics()` in `metrics.ts` exposes Node.js runtime internals (heap usage, event loop lag, active handles, file descriptors). Domain metrics (items created, routed, assessed, dispatched per type/team) reveal internal system activity. This intelligence aids enumeration and timing attacks.
- **Remediation:** Restrict `/metrics` to internal network access (e.g., via a separate internal-only port or reverse-proxy ACL) or require a shared bearer token. As a quick fix, add IP-allowlist middleware before the route.

---

### SAST-05: Unbounded Pagination `limit` Parameter Enables Memory DoS
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** No maximum is enforced on the `limit` query parameter. `GET /api/work-items?limit=999999999` causes the backend to attempt to load every stored work item into a single response array, potentially exhausting memory. As the store grows this escalates to a denial-of-service vector.
- **Remediation:** Cap the limit: `const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);`. Also add a guard for `NaN`: `isNaN(parsedLimit) ? 20 : parsedLimit`.

---

### SAST-06: No HTTP Security Headers (Missing `helmet`)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts`
- **Description:** The Express application registers no HTTP security headers. Missing headers include:
  - `Content-Security-Policy` — allows arbitrary script injection in proxied responses
  - `X-Frame-Options` / `frame-ancestors` — clickjacking risk
  - `X-Content-Type-Options: nosniff` — MIME sniffing attacks
  - `Strict-Transport-Security` — no HSTS enforcement
  - `Referrer-Policy` — leaks URL in referer headers
- **Remediation:** Add `helmet` as the first middleware: `import helmet from 'helmet'; app.use(helmet());`. Configure CSP explicitly for the API (no scripts needed: `defaultSrc: ["'none'"]`).

---

### SAST-07: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts`
- **Description:** No rate limiting middleware is applied to any route. Intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) are particularly exposed: a flood attack can fill the in-memory store. Workflow transition endpoints (approve, dispatch) can be called at unlimited rate, causing unbounded store mutation.
- **Remediation:** Add `express-rate-limit` middleware. At minimum, apply a 100 req/min limit per IP globally, with a stricter 20 req/min on intake and workflow transition routes.

---

### SAST-08: `parseInt` on Pagination Parameters — No NaN Guard
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:69–70`, `Source/Backend/src/routes/dashboard.ts:17–18`
- **Code Snippet:**
  ```typescript
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  ```
- **Description:** `parseInt("abc", 10)` returns `NaN`. When `NaN` propagates into `result.slice(NaN, NaN)` it returns `[]` — silently returning an empty data array with no error to the caller. This is surprising behavior that could mask bugs and confuse clients.
- **Remediation:** Use a safe parser: `const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);`.

---

### SAST-09: Unrestricted `overrideRoute` Bypasses Assessment Pod
- **Severity:** Low (elevated to Medium pending auth fix)
- **CWE:** CWE-285 (Improper Authorization)
- **File:** `Source/Backend/src/routes/workflow.ts:57`
- **Code Snippet:**
  ```typescript
  const updated = routeWorkItem(id, body?.overrideRoute);
  ```
- **Description:** Any caller can set `overrideRoute: "fast-track"` in the POST body to bypass the assessment pod entirely and move a work item directly to `Approved` status. Once authentication is added (SAST-01), this requires an additional authorization check (e.g., only `admin` or `manager` roles may supply `overrideRoute`).
- **Remediation:** Add role-based guard: only authenticated users with `router:override` permission may supply a non-null `overrideRoute`. Reject the request with 403 if the caller lacks this permission.
- **Handoff:** `[HANDOFF → pen-tester]` — verify that fast-track bypass reaches `Approved` without assessment in a live run.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-01 | No authentication on any endpoint | **High** | CWE-306 |
| SAST-02 | Internal error messages leaked to clients | **High** | CWE-209 |
| SAST-03 | Intake webhooks lack signature verification | **High** | CWE-345 |
| SAST-04 | `/metrics` endpoint unauthenticated | **High** | CWE-200 |
| SAST-05 | Unbounded `limit` parameter — memory DoS | **Medium** | CWE-400 |
| SAST-06 | No HTTP security headers | **Medium** | CWE-693 |
| SAST-07 | No rate limiting | **Medium** | CWE-770 |
| SAST-08 | `parseInt` — no NaN guard on pagination | Low | CWE-20 |
| SAST-09 | Unrestricted route override bypasses assessment | Low | CWE-285 |

**Total:** 9 findings — 4 High, 3 Medium, 2 Low  
**Hardcoded secrets found:** None  
**Dangerous API patterns (eval/exec/shell injection):** None  
**Weak cryptography:** None  
**Grading impact (per `security.config.yml`):** 4 High findings → Grade **D** under current grading rules (max_high for B is 6, but Critical/High distinction: all 4 are High, not Critical — Grade **B** requires ≤6 High and 0 Critical; these 4 Highs put the project at **Grade B** boundary, contingent on pen-tester results).
