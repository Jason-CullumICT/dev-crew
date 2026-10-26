---

## Static Analyzer Results

### Tools Run
- **gitleaks:** `[TOOL UNAVAILABLE: gitleaks]` — 0 secrets found (LLM fallback used)
- **semgrep:** available but produced no output — LLM pattern scan used as primary

---

### SAST-001: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 — Missing Authentication for Critical Function
- **File:** `Source/Backend/src/app.ts:22-44`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);   // No auth middleware
  app.use('/api/work-items', workflowRouter);    // No auth middleware
  app.use('/api/dashboard', dashboardRouter);    // No auth middleware
  app.use('/api/intake', intakeRouter);          // No auth middleware
  ```
- **Description:** Every API route — including workflow actions (approve, reject, dispatch), CRUD operations, and intake webhooks — is completely unauthenticated. Any network-reachable client can create, modify, or delete work items, approve/reject proposals, and dispatch teams without any credential validation.
- **Remediation:** Add authentication middleware (e.g., JWT bearer tokens via `express-jwt` or session middleware) before all protected route groups. At minimum protect state-mutating endpoints (POST/PATCH/DELETE). Consider separate API key authentication for intake webhooks.
- **Handoff:** `[HANDOFF → pen-tester]` — verify exploitability: access control bypass, privilege escalation via unauthenticated approve/dispatch.

---

### SAST-002: Intake Webhook Endpoints Have No Signature Validation
- **Severity:** High
- **CWE:** CWE-345 — Insufficient Verification of Data Authenticity
- **File:** `Source/Backend/src/routes/intake.ts:11-31`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No HMAC/signature header validation — any caller accepted
    const item = store.createWorkItem({
      title: body.title,
      description: body.description,
      type: body.type || WorkItemType.Bug,
      ...
    });
  ```
- **Description:** The Zendesk webhook endpoint (`/api/intake/zendesk`) and the automated intake endpoint (`/api/intake/automated`) accept POST requests from any caller without verifying a webhook secret or HMAC signature. An attacker can forge Zendesk events or spam the automated intake to flood the work item queue with arbitrary data.
- **Remediation:** Validate the `X-Zendesk-Webhook-Signature` header using an HMAC-SHA256 comparison against a shared secret stored in environment variables. Reject requests where the signature doesn't match. Apply similar shared-secret gating to `/api/intake/automated`.

---

### SAST-003: Intake Routes Accept Unvalidated Enum Values for `type` and `priority`
- **Severity:** Medium
- **CWE:** CWE-20 — Improper Input Validation
- **File:** `Source/Backend/src/routes/intake.ts:19-25, 42-48`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    type: body.type || WorkItemType.Bug,          // No enum membership check
    priority: body.priority || WorkItemPriority.Medium,  // No enum membership check
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** The intake routes accept `type` and `priority` from the request body without validating them against the allowed enum values. The main CRUD route (`workItems.ts:29-40`) correctly validates these fields. If `body.type` is a non-empty truthy string that isn't a valid `WorkItemType`, it is stored directly, corrupting data integrity (e.g., `type: "malicious-payload"` would persist).
- **Remediation:** Apply the same enum validation used in `workItems.ts`:
  ```typescript
  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Invalid type value' }); return;
  }
  ```

---

### SAST-004: No Security Headers (helmet not configured)
- **Severity:** Medium
- **CWE:** CWE-693 — Protection Mechanism Failure
- **File:** `Source/Backend/src/app.ts:11-14`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet(), no CSP, no X-Frame-Options, no HSTS, no X-Content-Type-Options
  ```
- **Description:** The Express application sets no HTTP security headers. Missing headers include: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and `Referrer-Policy`. These headers mitigate clickjacking, MIME sniffing, and protocol downgrade attacks.
- **Remediation:** Install and configure `helmet`: `app.use(helmet())` as the first middleware. Customize CSP to match the frontend's needs.

---

### SAST-005: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 — Allocation of Resources Without Limits or Throttling
- **File:** `Source/Backend/src/app.ts`
- **Description:** No rate limiting middleware is applied to any route. All endpoints — including write operations (`POST /api/work-items`, intake webhooks) and CPU-intensive paths (BFS cycle detection on dependency operations) — can be called unlimited times per second by any client. The test suite itself notes "Add rate limiting" as a suggested security improvement (see `WorkItemDetailPage.test.tsx:76`).
- **Remediation:** Apply `express-rate-limit` globally or per-route group. Example: 100 req/min on read endpoints, 20 req/min on write endpoints, 10 req/min on intake webhooks.

---

### SAST-006: Pagination `limit` Parameter Has No Upper Bound
- **Severity:** Medium
- **CWE:** CWE-400 — Uncontrolled Resource Consumption
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  // No MAX_LIMIT guard — ?limit=999999 returns all items
  ```
- **Description:** The `limit` query parameter is parsed and passed directly to the store with no maximum cap. A caller can pass `?limit=999999` to enumerate all work items in a single request, bypassing intended pagination and enabling bulk data exfiltration. The `findAll()` store function slices by the raw limit value.
- **Remediation:** Apply a maximum cap:
  ```typescript
  const MAX_LIMIT = 100;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, MAX_LIMIT);
  ```

---

### SAST-007: Raw Internal Error Messages Returned to Clients in Workflow Routes
- **Severity:** Low
- **CWE:** CWE-209 — Generation of Error Message Containing Sensitive Information
- **File:** `Source/Backend/src/routes/workflow.ts:60-63, 87-90, 138-140, 204-208, 291-294, 349-351`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message });
    res.status(500).json({ error: message });  // Raw exception text to client
  }
  ```
- **Description:** Every `catch` block in `workflow.ts` returns the raw `err.message` to the HTTP client in the 500 response body. The global `errorHandler.ts` correctly returns only `"Internal server error"`, but per-route catches bypass it and leak internal exception details (file paths, stack frames from V8, internal data structure information) to unauthenticated callers.
- **Remediation:** Replace `{ error: message }` with `{ error: 'Internal server error' }` in 500 responses. Log `message` internally. Only return specific user-facing messages for known error conditions (which the code already does correctly for 400/404/409 cases).

---

### SAST-008: Prometheus `/metrics` Endpoint is Unauthenticated
- **Severity:** Low
- **CWE:** CWE-200 — Exposure of Sensitive Information to an Unauthorized Actor
- **File:** `Source/Backend/src/app.ts:34-37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The Prometheus metrics endpoint is exposed without authentication. It reveals operational details including work item creation rates by source/type, dispatch counts by team, and dependency cycle detection frequency. This information could aid an attacker in mapping system behavior.
- **Remediation:** Restrict `/metrics` to internal network access via firewall/network policy, or add IP allowlist middleware, or require a shared scrape token header.

---

### SAST-009: Debug Portal iframe Lacks `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-1021 — Improper Restriction of Rendered UI Layers or Frames
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-14`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}        // VITE_PORTAL_URL or http://localhost:4200
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
    // No sandbox attribute
  />
  ```
- **Description:** The debug portal iframe is rendered without a `sandbox` attribute. Without sandboxing, the framed content inherits full script execution capability and can navigate the top-level browsing context. The `portalUrl` comes from a build-time environment variable which, if misconfigured, could embed an unintended page with elevated trust.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin"` (or narrower permissions) to the iframe. If the portal requires form submission or popups, add only those specific permissions. If this page is dev-only, consider gating it behind a build flag.

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306 |
| SAST-002 | No webhook signature validation on intake | **High** | CWE-345 |
| SAST-003 | Unvalidated enum inputs in intake routes | **Medium** | CWE-20 |
| SAST-004 | Missing HTTP security headers (no helmet) | **Medium** | CWE-693 |
| SAST-005 | No rate limiting on any endpoint | **Medium** | CWE-770 |
| SAST-006 | Pagination `limit` has no upper bound | **Medium** | CWE-400 |
| SAST-007 | Raw internal errors returned to clients | **Low** | CWE-209 |
| SAST-008 | Unauthenticated Prometheus `/metrics` endpoint | **Low** | CWE-200 |
| SAST-009 | Debug portal iframe lacks `sandbox` attribute | **Low** | CWE-1021 |

**Totals:** 0 Critical · 2 High · 4 Medium · 3 Low (9 findings total)

**No hardcoded secrets found** in first-party code. Environment variables are used correctly (`process.env.PORT`, `VITE_API_BASE_URL`). ID generation uses `uuid.v4()` (cryptographically safe) not `Math.random()`. The global error handler (`errorHandler.ts`) is safe. Package scripts contain no supply-chain hooks.
