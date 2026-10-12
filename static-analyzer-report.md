## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — LLM pattern scan used for secret detection
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — LLM pattern scan used for SAST patterns
- **Manual pattern scan**: 8 findings across Backend source

---

### SAST-001: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Code Snippet:**
  ```typescript
  app.use(express.json());
  // No auth middleware here
  app.use('/api/work-items', workItemsRouter);   // CRUD + workflow actions
  app.use('/api/work-items', workflowRouter);    // approve/reject/dispatch
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);          // webhook receivers
  ```
- **Description:** Zero authentication middleware is registered. All endpoints — including sensitive workflow operations (approve, reject, dispatch work items) and intake webhooks — are fully accessible to any unauthenticated caller on the network. There is no JWT, session, API key, or any other access control mechanism in the request pipeline.
- **Remediation:** Add authentication middleware (e.g., JWT validation via `express-jwt`) before sensitive route groups. At minimum, protect workflow mutation endpoints (`POST /:id/approve`, `/:id/reject`, `/:id/dispatch`) and intake webhooks. Consider separate auth levels for read-only dashboard vs. state-mutating workflow actions.
- **Handoff:** `[HANDOFF → pen-tester]` — active exploitation of unauthenticated routes should be verified dynamically.

---

### SAST-002: Unauthenticated Intake Webhooks with No Origin Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-31` and `:34-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No signature verification (e.g., X-Zendesk-Webhook-Signature)
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  });
  ```
- **Description:** The Zendesk and automated intake webhook endpoints accept any POST request without verifying the webhook origin. Zendesk (and similar platforms) provide an HMAC-SHA256 signature header that must be validated against a shared secret. Without this, any actor who can reach the endpoint can inject arbitrary work items into the workflow system.
- **Remediation:** Implement webhook signature verification using an HMAC-SHA256 check against `X-Zendesk-Webhook-Signature` (or equivalent). Store the shared secret in an environment variable. Reject requests where the computed HMAC does not match the header value.

---

### SAST-003: Internal Error Messages Leaked to API Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:62, 89, 140, 207, 294, 350, 370` (every catch block)
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw error message to client
  }
  ```
- **Description:** Every catch block in `workflow.ts` serializes the raw `Error.message` string directly into the HTTP 500 response body. Error messages from thrown exceptions may expose internal state, data model details, service names, or database paths. Compare to `errorHandler.ts` (correct pattern) which logs the full error but returns only the generic string `"Internal server error"`.
- **Remediation:** Replace `res.status(500).json({ error: message })` with `res.status(500).json({ error: 'Internal server error' })` in all catch blocks, relying on the logger (which already captures `message`) for the detailed context. For user-facing business errors (invalid transitions), use specific, crafted messages — not raw exception text.

---

### SAST-004: Missing Enum Validation on Intake Webhook Type/Priority Fields
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22-23` and `:45-46`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,       // truthy invalid string passes through
    priority: body.priority || WorkItemPriority.Medium,
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** The `||` fallback only substitutes defaults for falsy values (empty string, `null`, `undefined`). A truthy but invalid value (e.g., `type: "hacker"`) bypasses validation and is stored directly. The main work item creation route (`POST /api/work-items`) correctly validates using `Object.values(WorkItemType).includes(body.type)`, but the intake routes do not apply the same check.
- **Remediation:** Add explicit enum validation in both intake routes before calling `createWorkItem`, mirroring the pattern in `workItems.ts` lines 29-41:
  ```typescript
  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Invalid type value' });
    return;
  }
  ```

---

### SAST-005: Unbounded Pagination `limit` Parameter (DoS Vector)
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70` and `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,  // no cap
  };
  ```
- **Description:** The `limit` query parameter is parsed with no upper bound. An attacker can request `?limit=1000000`, causing the server to serialize the entire in-memory store into a single JSON response. This exhausts CPU for serialization and memory for the response buffer. The store iterates all items and slices without capping first.
- **Remediation:** Clamp `limit` to a maximum safe value before passing to the store:
  ```typescript
  const MAX_LIMIT = 100;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  ```

---

### SAST-006: Unprotected Prometheus `/metrics` Endpoint
- **Severity:** Medium
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34-37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());  // no auth check
  });
  ```
- **Description:** The Prometheus metrics endpoint is exposed on the same port as the application API (`3001`) with no access control. Metrics reveal operational counters (`workflow_items_dispatched_total` by team name, `workflow_items_assessed_total` by verdict, etc.), which can expose internal system activity patterns and volume to unauthorized observers.
- **Remediation:** Either (a) restrict this endpoint to localhost/internal network via reverse proxy or firewall rule, (b) add a simple Bearer token or IP allowlist middleware on this route, or (c) expose metrics on a separate, internally-only-accessible port.

---

### SAST-007: Missing HTTP Security Headers (No CORS Policy, No Helmet)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Description:** The Express application registers no security headers middleware (`helmet` is not installed or used). The following protections are absent:
  - **Content-Security-Policy**: No CSP — XSS mitigation is left to the browser default.
  - **X-Frame-Options / frame-ancestors**: The frontend embeds an iframe in `DebugPortalPage.tsx` but the backend has no `X-Frame-Options` or `frame-ancestors` CSP directive to prevent the backend being framed by malicious sites.
  - **X-Content-Type-Options**: Missing `nosniff`, allowing MIME type sniffing.
  - **CORS**: No explicit CORS policy is configured; this relies on browser defaults blocking cross-origin requests but provides no defence-in-depth for non-browser API callers.
- **Remediation:** Add `helmet` package and configure it:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```
  Additionally, add an explicit CORS policy using the `cors` package, restricting origins to the known frontend URL.

---

### SAST-008: NaN Injection via Pagination Parameters (No `isNaN` Guard)
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  ```
- **Description:** If `req.query.page` is a non-numeric string (e.g., `?page=abc`), the truthiness check passes (non-empty string is truthy) and `parseInt("abc", 10)` returns `NaN`. `NaN` propagates through arithmetic operations (`(NaN - 1) * limit = NaN`, `result.slice(NaN, NaN)` returns `[]`). The result is a silently empty response for any alphabetic page value, which could mask integration errors.
- **Remediation:** Add `isNaN` guards:
  ```typescript
  const rawPage = parseInt(req.query.page as string, 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  ```

---

### Summary Table

| ID | Severity | CWE | Title |
|----|----------|-----|-------|
| SAST-001 | **High** | CWE-306 | No Authentication on Any API Endpoint |
| SAST-002 | **High** | CWE-345 | Unauthenticated Intake Webhooks — No Origin Verification |
| SAST-003 | **Medium** | CWE-209 | Internal Error Messages Leaked to API Clients |
| SAST-004 | **Medium** | CWE-20 | Missing Enum Validation on Intake Webhook Type/Priority |
| SAST-005 | **Medium** | CWE-400 | Unbounded Pagination `limit` (DoS Vector) |
| SAST-006 | **Medium** | CWE-200 | Unprotected Prometheus `/metrics` Endpoint |
| SAST-007 | **Medium** | CWE-693 | Missing HTTP Security Headers (No Helmet, No CORS) |
| SAST-008 | **Low** | CWE-20 | NaN Injection via Pagination Parameters |

**Totals:** 2 High · 5 Medium · 1 Low · 0 Critical · **8 Total**  
**No hardcoded secrets found** in first-party source code.  
`[TOOL UNAVAILABLE: gitleaks]` `[TOOL UNAVAILABLE: semgrep]` — fallback LLM scan completed.
