---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — LLM pattern scan substituted
- **semgrep**: [TOOL UNAVAILABLE] — LLM pattern scan substituted
- **npm scripts audit**: No `postinstall` hooks found in Backend or Frontend — supply chain clean

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts` — entire file (no auth middleware registered)
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No authentication middleware anywhere
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Every API endpoint — including state-transition actions (route, assess, approve, reject, dispatch) and data mutations (create, update, delete) — is fully accessible without any authentication or authorization. Any unauthenticated HTTP client can manipulate the entire system state.
- **Remediation:** Add authentication middleware (e.g., JWT bearer token validation or session cookies) before all `/api/*` routes. Add role-based authorization guards on privileged endpoints (approve, reject, dispatch).
- **Handoff:** [HANDOFF → pen-tester] — verify exploitability of unauthenticated state manipulation and unauthorized dispatch

---

### SAST-002: Intake Webhook Endpoints Accept Forged Requests (No Signature Verification)
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) {
      res.status(400).json({ error: 'title and description are required' });
      return;
    }
    const item = store.createWorkItem({ ... }); // No HMAC verification
  ```
- **Description:** The Zendesk and automated intake webhook endpoints accept POST requests with no HMAC signature verification. Real webhook providers (Zendesk, GitHub, etc.) sign payloads with a shared secret; the receiver must verify the `X-Hub-Signature` or equivalent header. Without this, any attacker can forge webhook payloads and inject arbitrary work items into the pipeline.
- **Remediation:** Implement HMAC-SHA256 signature verification. Store the webhook secret in an environment variable and compare `crypto.timingSafeEqual()` of the computed vs. received signatures before processing the body.

---

### SAST-003: Intake Routes Bypass Enum Validation on `type` and `priority` Fields
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22-25, 44-47`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,      // No enum validation!
    priority: body.priority || WorkItemPriority.Medium, // No enum validation!
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** The main `POST /api/work-items` route validates `type`, `priority`, and `source` against their respective enums before accepting them. The intake routes (`/zendesk`, `/automated`) use `body.type || default` without any enum check — allowing arbitrary strings to be stored as `type` and `priority` values. This can corrupt the state machine's routing logic and classification heuristics.
- **Remediation:** Apply the same enum validation pattern used in `workItems.ts` lines 29–42 to both intake routes.

---

### SAST-004: Error Messages from Internal Exceptions Leaked to HTTP Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:61, 88, 139, 206, 293, 350`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message }); // Raw exception message exposed
  }
  ```
- **Description:** All catch blocks in workflow routes expose the raw `err.message` directly in the HTTP 500 response body. Internal exceptions (e.g., from the store, dependency service, or future DB layer) can leak implementation details, internal state descriptions, or stack information to HTTP clients.
- **Remediation:** Return a generic message (`"Internal server error"`) to clients for all 500 responses. Log the full error internally with context. Only expose domain-level validation errors (e.g., state machine violations) via 4xx responses with safe messages.

---

### SAST-005: Unbounded Pagination `limit` Parameter (Resource Exhaustion)
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** The `limit` query parameter is accepted without a maximum cap. A request with `?limit=9999999` forces the store to allocate and serialize the entire dataset in a single response, which — as item counts grow — can exhaust server memory and cause denial of service.
- **Remediation:** Enforce a maximum limit (e.g., 100 or 200): `const limit = Math.min(parseInt(...) || 20, 200)`. Also validate that `page` and `limit` are positive integers (currently `parseInt("abc")` returns `NaN` which propagates silently).

---

### SAST-006: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts`
- **Description:** The Express application registers no rate-limiting middleware. Any client can hammer the creation endpoint (`POST /api/work-items`) or trigger expensive assessment/routing operations at arbitrary speed. This enables both data flooding and CPU/memory exhaustion via repeated assessment-pod executions.
- **Remediation:** Add `express-rate-limit` middleware at the application level (general limit ~100 req/min/IP) with tighter limits on state-mutating endpoints.

---

### SAST-007: Missing HTTP Security Headers (No `helmet`)
- **Severity:** Medium
- **CWE:** CWE-16 (Configuration)
- **File:** `Source/Backend/src/app.ts`
- **Description:** The Express app does not use `helmet` or equivalent security header middleware. The following headers are absent: `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`. Additionally, Express 4.x emits `X-Powered-By: Express` by default, which leaks the technology stack. A missing CSP amplifies the impact of any XSS finding in the frontend.
- **Remediation:** Install and configure `helmet`: `app.use(helmet())`. At minimum, call `app.disable('x-powered-by')`.

---

### SAST-008: No CORS Policy — All Origins Accepted
- **Severity:** Medium
- **CWE:** CWE-942 (Permissive Cross-domain Policy)
- **File:** `Source/Backend/src/app.ts`
- **Description:** Express serves no `Access-Control-Allow-Origin` response headers — the browser's same-origin policy provides some protection, but any same-origin or proxied request will succeed. More critically, with no authentication on any endpoint, cross-origin state manipulation is trivially achievable. If authentication is later added, the lack of an explicit CORS allowlist will become a critical vulnerability.
- **Remediation:** Add the `cors` package with an explicit allowlist: `app.use(cors({ origin: ['http://localhost:5173'] }))`. Do not use wildcard `*` on endpoints that will carry credentials.

---

### SAST-009: `iframe` Without `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-939 (Improper Authorization in Handler for Custom URL Scheme)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The iframe embedding the debug portal carries no `sandbox` attribute. Content loaded inside runs with full permissions including script execution, form submission, and same-origin navigation. If the `VITE_PORTAL_URL` value were misconfigured to point to an attacker-controlled origin, the embedded page would have unrestricted access.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin allow-forms"` (tune to minimum required permissions). For a debugging portal, `allow-scripts allow-same-origin` is the minimum realistic set.

---

### SAST-010: Prometheus `/metrics` Endpoint Exposed Without Authentication
- **Severity:** Low
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34-37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The `/metrics` endpoint is unauthenticated and publicly reachable. It exposes operational counters (work items created per source/type, dispatch counts by team, assessment verdicts, cycle detection counts). In a production deployment this constitutes information disclosure about internal system activity and traffic patterns.
- **Remediation:** Restrict `/metrics` to internal network access via reverse proxy (e.g., allow only from `127.0.0.1`), or add a static bearer token check for scrape requests.

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306 |
| SAST-002 | Intake webhooks lack signature verification | **High** | CWE-345 |
| SAST-003 | Intake routes skip enum validation | **Medium** | CWE-20 |
| SAST-004 | Internal errors leaked in HTTP 500 responses | **Medium** | CWE-209 |
| SAST-005 | Unbounded pagination `limit` parameter | **Medium** | CWE-400 |
| SAST-006 | No rate limiting anywhere | **Medium** | CWE-770 |
| SAST-007 | Missing security headers (no helmet) | **Medium** | CWE-16 |
| SAST-008 | No CORS policy configured | **Medium** | CWE-942 |
| SAST-009 | iframe without sandbox attribute | **Low** | CWE-939 |
| SAST-010 | /metrics endpoint unauthenticated | **Low** | CWE-200 |

**Findings: 2 High · 6 Medium · 2 Low · 10 Total**

**No hardcoded secrets found** in first-party source code. GitHub Actions correctly uses `${{ secrets.* }}` references. No dangerous dynamic code execution (`eval`, `child_process`, shell injection), unsafe deserialization, or weak cryptography patterns detected.
