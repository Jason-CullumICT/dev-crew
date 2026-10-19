---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — LLM pattern scan substituted
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — LLM pattern scan substituted

---

### SAST-001: No Authentication Middleware on Any API Route

- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:12-33`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ... request logging ...
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** There is no authentication middleware anywhere in the application. Every API endpoint — including sensitive write operations (`approve`, `dispatch`, `reject`, `route`) and all CRUD operations — is publicly accessible without any credentials, tokens, or session. Any network-reachable client can approve, dispatch, or delete work items.
- **Remediation:** Add an authentication middleware (e.g., JWT bearer token check or API-key verification) applied to all `/api/*` routes before the route handlers. Sensitive mutation endpoints (approve, dispatch, reject) should additionally enforce role-based authorization.
- **Handoff:** `[HANDOFF → pen-tester]` — Verify exploitability: unauthenticated approve/dispatch/delete of work items.

---

### SAST-002: Webhook Intake Endpoints Lack Signature Verification

- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-31`, `Source/Backend/src/routes/intake.ts:34-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ title: body.title, ... });
  });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept work item creation from unauthenticated callers with no webhook signature verification. Zendesk webhooks normally include a signed token (`X-Zendesk-Webhook-Signature`) for HMAC validation. Without this check, any client can forge Zendesk or automated events and inject arbitrary work items into the backlog.
- **Remediation:** Validate the `X-Zendesk-Webhook-Token` header (or HMAC-SHA256 signature) against a pre-shared secret loaded from `process.env`. Reject requests with invalid or missing signatures with HTTP 401.
- **Handoff:** `[HANDOFF → pen-tester]` — Verify that unauthenticated POST to `/api/intake/zendesk` succeeds and creates backlog items.

---

### SAST-003: Unvalidated `type` and `priority` Fields in Intake Routes

- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22-23`, `Source/Backend/src/routes/intake.ts:45-46`
- **Code Snippet:**
  ```typescript
  type: body.type || WorkItemType.Bug,
  priority: body.priority || WorkItemPriority.Medium,
  ```
- **Description:** The `type` and `priority` values from the request body are passed directly to `store.createWorkItem()` without enum validation. The main `POST /api/work-items` route validates these against `Object.values(WorkItemType)` and `Object.values(WorkItemPriority)`, but the intake routes skip this check entirely. An attacker can inject arbitrary strings as `type` and `priority`, resulting in work items with invalid enum values that may break downstream filtering, routing logic, and Prometheus metrics.
- **Remediation:** Add the same enum guards used in `workItems.ts` (lines 29–42) to both intake route handlers before calling `store.createWorkItem()`.

---

### SAST-004: No Maximum Bound on Pagination `limit` Parameter

- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** The `limit` pagination parameter is parsed from the query string with no upper-bound enforcement. A caller can request `?limit=999999`, causing the store to load and serialize all work items in a single response. This can exhaust server memory and network bandwidth, acting as a denial-of-service vector. `parseInt` also returns `NaN` for non-numeric input (e.g., `?limit=abc`), causing downstream arithmetic to produce `NaN` in the response JSON.
- **Remediation:** Clamp and validate the `limit` parameter:
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = (!isNaN(rawLimit) && rawLimit > 0) ? Math.min(rawLimit, 100) : 20;
  ```

---

### SAST-005: Missing HTTP Security Headers (No Helmet)

- **Severity:** Medium
- **CWE:** CWE-16 (Configuration)
- **File:** `Source/Backend/src/app.ts:11-13`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  ```
- **Description:** No security headers middleware (e.g., `helmet`) is applied. The application is missing the following response headers on all routes: `Content-Security-Policy`, `X-Frame-Options` (clickjacking), `X-Content-Type-Options` (MIME sniffing), `Strict-Transport-Security` (HSTS), and `Referrer-Policy`. Express does not set these by default.
- **Remediation:** Install and apply `helmet` as the first middleware:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```

---

### SAST-006: No Request Body Size Limit on `express.json()`

- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts:13`
- **Code Snippet:**
  ```typescript
  app.use(express.json());
  ```
- **Description:** `express.json()` is called without a `limit` option. The default limit is 100KB (as of Express 4.x), but this is not explicitly set and could vary with framework upgrades. An attacker can send megabyte-sized JSON payloads to exhaust heap memory. Explicit configuration makes the policy intentional and resistant to version drift.
- **Remediation:**
  ```typescript
  app.use(express.json({ limit: '100kb' }));
  ```

---

### SAST-007: Prometheus `/metrics` Endpoint Exposed Without Authentication

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
- **Description:** The Prometheus metrics endpoint is publicly accessible without any authentication. It exposes internal telemetry including work item counts by source and type, dispatch volumes by team, and assessment verdicts. This leaks behavioral and operational information about the system to unauthenticated actors.
- **Remediation:** Restrict the `/metrics` endpoint to a separate internal port or add IP allowlist/bearer-token middleware. In Kubernetes deployments, expose metrics only on the pod network.

---

### SAST-008: Internal Error Messages Returned to API Clients

- **Severity:** Low
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:61-63`, `workflow.ts:88-90`, and other catch blocks
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
  ```
- **Description:** When an unexpected error occurs in workflow action handlers, the raw `err.message` from the service layer is sent verbatim to the API client. While current service error messages are mostly benign state-machine messages, this pattern could leak internal implementation details, stack information, or sensitive data (e.g., database connection strings, file paths) if the codebase grows.
- **Remediation:** Log the full error server-side, return only a generic message to the client for 500 errors:
  ```typescript
  logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
  res.status(500).json({ error: 'Internal server error' });
  ```
  (The dependency error disambiguation at lines 333–350 in `workflow.ts` — where specific 400/404/409 messages are forwarded — is intentional and safe as-is.)

---

### SAST-009: Debug Portal iframe Missing `sandbox` Attribute

- **Severity:** Low
- **CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-13`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The debug portal iframe has no `sandbox` attribute. The URL is sourced from `VITE_PORTAL_URL` env variable (defaulting to `http://localhost:4200`). Without sandboxing, the embedded page inherits the full origin context and can run scripts, submit forms, and access same-origin resources. If `VITE_PORTAL_URL` were misconfigured to an external URL, the embedded content would run with no restrictions.
- **Remediation:** Add a `sandbox` attribute with only required permissions:
  ```tsx
  <iframe
    src={portalUrl}
    sandbox="allow-scripts allow-same-origin"
    title="Debug Portal"
  />
  ```

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No Authentication on Any API Route | **High** | CWE-306 |
| SAST-002 | Webhook Intake Endpoints Lack Signature Verification | **High** | CWE-345 |
| SAST-003 | Unvalidated `type`/`priority` in Intake Routes | **Medium** | CWE-20 |
| SAST-004 | No Max Bound on Pagination `limit` Parameter | **Medium** | CWE-770 |
| SAST-005 | Missing HTTP Security Headers | **Medium** | CWE-16 |
| SAST-006 | No Body Size Limit on `express.json()` | **Medium** | CWE-770 |
| SAST-007 | `/metrics` Unauthenticated | **Low** | CWE-200 |
| SAST-008 | Internal Error Messages Leaked to Clients | **Low** | CWE-209 |
| SAST-009 | Debug Portal iframe Missing `sandbox` | **Low** | CWE-829 |

**Grade estimate:** C (2 High, 4 Medium — exceeds A/B thresholds; no critical findings)

**No hardcoded secrets, `eval`, `exec`, dangerous deserialization, dynamic code execution, or unsafe XML parsing was found in the first-party source code.**
