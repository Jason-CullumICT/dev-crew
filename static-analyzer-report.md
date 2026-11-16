---

## Static Analyzer Results

### Tools Run
- **gitleaks:** `[TOOL UNAVAILABLE]` — not installed; fell back to LLM pattern scan
- **semgrep:** `[TOOL UNAVAILABLE]` — not installed; fell back to LLM pattern scan
- **npm postinstall scripts:** clean — no dangerous lifecycle hooks found

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:12–44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No auth middleware added before any route
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Every API endpoint — including state-transition actions (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`) and data-write operations — is completely unauthenticated. Any caller with network access can create, modify, or delete work items and trigger workflow transitions.
- **Remediation:** Add authentication middleware (e.g., JWT Bearer token verification) before the route registrations in `app.ts`. Reject requests without a valid token with HTTP 401. Add role-based access control for sensitive state-transition endpoints.
- **Handoff:** `[HANDOFF → pen-tester]` — confirm unauthenticated access to all state transitions is exploitable.

---

### SAST-002: Webhook Endpoints Accept Payloads Without Signature Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No HMAC signature check, no secret token header validation
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` webhook receivers accept arbitrary POST bodies with no verification that the request originates from a trusted source. An attacker can inject arbitrary work items into the pipeline by posting directly to these endpoints, bypassing the legitimate intake process.
- **Remediation:** Validate the Zendesk webhook HMAC signature (`X-Zendesk-Webhook-Signature` header) using a shared secret from an environment variable. Reject requests with missing or invalid signatures with HTTP 401.
- **Handoff:** `[HANDOFF → pen-tester]` — test injection of fake work items and pipeline poisoning via these endpoints.

---

### SAST-003: Intake Endpoints Do Not Validate Enum Fields
- **Severity:** High
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:19–25`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,       // no enum validation
    priority: body.priority || WorkItemPriority.Medium, // no enum validation
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** The intake routes accept `type` and `priority` from the request body and pass them directly to the store without validating them against `WorkItemType` and `WorkItemPriority` enum values. The main `/api/work-items` POST correctly validates these fields, but the intake paths do not. An attacker can create work items with invalid enum values, corrupting state and potentially causing unexpected behavior in routing/assessment logic downstream.
- **Remediation:** Mirror the enum validation from `workItems.ts` lines 29–42 in both intake handlers. Reject with HTTP 400 if `body.type` is set but not a valid `WorkItemType`, and similarly for `priority`.

---

### SAST-004: Error Messages Expose Internal Details to API Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:59–63, 86–90, 137–141, 204–208, 291–295`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // raw err.message sent to client
  }
  ```
- **Description:** Every catch block in `workflow.ts` sends the raw `err.message` to the client on internal errors (HTTP 500). While the global `errorHandler` correctly returns a generic `"Internal server error"`, these route-level catches bypass it. Internal exception messages can expose file paths, service internals, or logic details useful to an attacker for reconnaissance.
- **Remediation:** Replace `res.status(500).json({ error: message })` with `res.status(500).json({ error: 'Internal server error' })`. Continue to log the full `message` server-side. Alternatively, re-throw unexpected errors and let the global `errorHandler` handle them.

---

### SAST-005: No HTTP Security Headers (Missing Helmet / CSP / HSTS)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts:12`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet(), no CSP, no X-Frame-Options, no HSTS, no X-Content-Type-Options
  ```
- **Description:** The Express application does not set any HTTP security headers. Missing headers leave the API and any browser-rendered responses exposed to clickjacking (`X-Frame-Options`), MIME-type sniffing (`X-Content-Type-Options`), protocol downgrade attacks (`Strict-Transport-Security`), and XSS via script injection (`Content-Security-Policy`).
- **Remediation:** Install and add `helmet()` as the first middleware: `app.use(helmet())`. Configure a strict `Content-Security-Policy` for the frontend's Vite server as well.

---

### SAST-006: Pagination `limit` Parameter Has No Upper Bound
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:69–70`, `Source/Backend/src/routes/dashboard.ts:17–18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
  ```
- **Description:** The `limit` query parameter is accepted with no upper bound and no NaN check. A client can pass `?limit=999999` to dump the entire in-memory store in one response, consuming significant CPU and memory. `parseInt` of a non-numeric string returns `NaN`, which causes `findAll` to return all items (unbounded) since `NaN * anything = NaN` and slice conditions behave unexpectedly.
- **Remediation:** Add validation: cap limit (e.g., `Math.min(Math.max(1, parsedLimit || 20), 100)`) and reject or clamp negative/NaN values. Apply the same pattern to `page`.

---

### SAST-007: Prometheus `/metrics` Endpoint Publicly Accessible
- **Severity:** Low
- **CWE:** CWE-200 (Exposure of Sensitive Information to Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34–37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The Prometheus scrape endpoint is exposed without any access control. While the current metrics (item counts by status, type, team) are operational data rather than PII, exposing internal throughput metrics aids attacker reconnaissance (e.g., timing attacks, understanding pipeline volume, confirming deployment topology).
- **Remediation:** Restrict `/metrics` to internal networks via a network policy, or add a secret bearer token check (`Authorization: Bearer <METRICS_TOKEN>` from an env var) before returning the payload.

---

### SAST-008: iframe in DebugPortalPage Uses Unvalidated Environment-Controlled URL
- **Severity:** Low
- **CWE:** CWE-601 (URL Redirection to Untrusted Site)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5–9`
- **Code Snippet:**
  ```typescript
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
  return (
    <div ...>
      <iframe src={portalUrl} ... />
  ```
- **Description:** The iframe `src` is taken directly from `VITE_PORTAL_URL` with no validation of the protocol or hostname. If the build-time environment is compromised or misconfigured, an attacker-controlled URL could be embedded. Additionally, loading a plain HTTP iframe in a potentially HTTPS-served frontend triggers mixed-content browser warnings and downgrades security guarantees.
- **Remediation:** Validate `portalUrl` is a relative URL or matches an allowlist of trusted origins before using it as an iframe src. At minimum, verify it starts with the expected hostname.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any endpoint | **High** | CWE-306 |
| SAST-002 | Webhook endpoints lack signature verification | **High** | CWE-345 |
| SAST-003 | Intake endpoints skip enum input validation | **High** | CWE-20 |
| SAST-004 | Error messages expose internal details | Medium | CWE-209 |
| SAST-005 | Missing HTTP security headers | Medium | CWE-693 |
| SAST-006 | Pagination limit has no upper bound / NaN not checked | Medium | CWE-400 |
| SAST-007 | Prometheus /metrics endpoint publicly accessible | Low | CWE-200 |
| SAST-008 | iframe src from unvalidated env var | Low | CWE-601 |

**Findings by severity:** High: 3 · Medium: 3 · Low: 2 · Total: 8

**Hardcoded secrets found:** None — `platform/.env.example` has an empty `GITHUB_TOKEN=` with no value. No credentials in first-party source.

**Dangerous API patterns:** No `eval`, `innerHTML`, `dangerouslySetInnerHTML`, shell execution, or unsafe deserialization found in first-party code.

**Cryptography:** No custom or weak cryptography in first-party code. UUID generation uses the `uuid` library correctly.
