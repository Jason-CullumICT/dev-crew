---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE]` — no secrets found via LLM pattern scan
- **semgrep**: `[TOOL UNAVAILABLE]` — LLM pattern scan performed across all Source/ dirs

Scope: `Source/Backend/`, `Source/Frontend/`, `Source/Shared/` — 8 findings total.

---

### SAST-001: No Authentication or Authorization on Any API Endpoint

- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:11–44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No auth middleware registered here or on any router
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Zero authentication or authorization middleware is applied. Every endpoint — including state-mutating actions like `approve`, `dispatch`, `reject`, and `overrideRoute` (which bypasses the assessment pod and fast-tracks an item directly to `Approved`) — is fully accessible to any unauthenticated caller. The `overrideRoute: 'fast-track'` parameter in `POST /api/work-items/:id/route` can be sent by anyone to promote any backlog item to `Approved` status while bypassing the entire assessment workflow.
- **Remediation:** Add an authentication middleware (e.g., JWT verification) to the Express app before the route registrations. Enforce role-based checks for state-transition endpoints (`approve`, `dispatch`, `overrideRoute`).
- **Handoff:** `[HANDOFF → pen-tester]` — Confirm unauthenticated approval/dispatch exploit chain and overrideRoute bypass against running instance.

---

### SAST-002: Webhook Intake Routes Accept Unauthenticated Requests Without Signature Verification

- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No X-Hub-Signature / HMAC verification — any caller accepted
    const item = store.createWorkItem({
      title: body.title,
      description: body.description,
      type: body.type || WorkItemType.Bug,   // enum not validated
      priority: body.priority || WorkItemPriority.Medium,  // enum not validated
      source: WorkItemSource.Zendesk,
    });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints create work items from any HTTP caller without verifying the request origin. Zendesk webhooks typically sign payloads with an HMAC-SHA256 signature (the `X-Zendesk-Webhook-Signature` header). The absence of signature verification allows an attacker to flood the system with fabricated work items. Additionally, the `type` and `priority` fields are accepted from the request body without enum validation (unlike the `POST /api/work-items` route which validates both), allowing arbitrary string values to be injected into the store.
- **Remediation:** (1) Verify the `X-Zendesk-Webhook-Signature` header using a shared secret. (2) Validate `body.type` and `body.priority` against `Object.values(WorkItemType)` and `Object.values(WorkItemPriority)`, returning 400 on invalid values, matching the pattern in `workItems.ts:29–43`.

---

### SAST-003: Internal Error Messages Exposed in HTTP 500 Responses

- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:60,87,140,207,294,350,370`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw exception message sent to client
  }
  ```
- **Description:** Every `catch` block in `workflow.ts` forwards the raw `Error.message` from the service layer to the HTTP client in the 500 response body. While the global `errorHandler.ts` correctly returns a generic `"Internal server error"`, these inline handlers bypass it. Currently the error messages are relatively benign (e.g., `"Work item WI-001 not found"`), but this pattern will leak internal implementation details — stack frame info, internal IDs, service state — as soon as a deeper exception propagates. The global error handler (line 7 of `errorHandler.ts`) already demonstrates the correct pattern.
- **Remediation:** Replace `res.status(500).json({ error: message })` with `res.status(500).json({ error: 'Internal server error' })` in all catch blocks. The detailed `message` is already logged server-side; it must not reach the client.

---

### SAST-004: No Maximum Bound on Pagination `limit` Parameter

- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:17`
- **Code Snippet:**
  ```typescript
  // workItems.ts:70
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,

  // dashboard.ts:17
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  ```
- **Description:** The `limit` query parameter is passed directly to the store layer without an upper bound. A caller can set `?limit=1000000` to force the server to serialize and transmit the entire in-memory dataset in a single response, consuming CPU and memory proportional to total record count. This is a denial-of-service vector that becomes more severe as data grows.
- **Remediation:** Clamp the parsed limit to a maximum (e.g., 100): `const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);`. Apply the same cap in the dashboard activity endpoint.

---

### SAST-005: Missing HTTP Security Headers

- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts:11`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet, no CORS restriction, no CSP, no X-Frame-Options
  ```
- **Description:** The Express application registers no security headers middleware. Missing headers include: `Content-Security-Policy` (XSS mitigation), `X-Frame-Options: DENY` (clickjacking), `Strict-Transport-Security` (force HTTPS), `X-Content-Type-Options: nosniff` (MIME-sniffing), `Referrer-Policy`, and `Permissions-Policy`. There is also no CORS policy, meaning any origin can make cross-origin requests to the API. For OWASP ASVS Level 2 (configured in `security.config.yml`), security headers are required.
- **Remediation:** Install and apply `helmet` (`npm install helmet`), then `app.use(helmet())` before route registrations. Add an explicit CORS policy using the `cors` package, restricting `origin` to known frontend domains.

---

### SAST-006: Unsandboxed `<iframe>` in DebugPortalPage

- **Severity:** Medium
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9–15`
- **Code Snippet:**
  ```tsx
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
  return (
    <div style={{ margin: '-24px', height: 'calc(100vh - 56px)' }}>
      <iframe
        src={portalUrl}       // configurable URL, no sandbox
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Debug Portal"
      />
    </div>
  );
  ```
- **Description:** The iframe renders content from a URL supplied by the `VITE_PORTAL_URL` environment variable at build time (defaulting to `http://localhost:4200`). No `sandbox` attribute is set, so the embedded document inherits full script execution privileges within the parent's origin context and can access `window.parent`, make same-origin requests, and read cookies. If the portal URL is misconfigured to point to an untrusted host, or if that host is compromised, the embedded page gains significant access.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin allow-forms"` to the iframe element. If the portal origin differs from the app origin, remove `allow-same-origin` to enforce cross-origin isolation. Additionally, restrict the iframe with a Content-Security-Policy `frame-src` directive.

---

### SAST-007: Prometheus `/metrics` Endpoint Publicly Accessible Without Authentication

- **Severity:** Low
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34–37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());  // no auth check
  });
  ```
- **Description:** The Prometheus metrics endpoint is registered on the same public port (3001) as the API without any authentication. It exposes operational metrics including queue depths by status, dispatch counts by team, cycle detection event rates, and default Node.js process metrics (heap usage, event loop lag, active handles). This information aids adversary reconnaissance — revealing work item throughput, team names, and processing rate anomalies.
- **Remediation:** Either move the metrics endpoint to a separate internal-only port (e.g., 9090) bound to `127.0.0.1`, or add a bearer token check (compare `Authorization` header against an env-configured secret) before returning metrics.

---

### SAST-008: `pino` Dependency Declared but Unused — Phantom Attack Surface

- **Severity:** Low
- **CWE:** N/A (configuration hygiene)
- **File:** `Source/Backend/package.json:12`
- **Code Snippet:**
  ```json
  "dependencies": {
    "pino": "^8.17.0"   // imported nowhere in Source/Backend/src/
  }
  ```
- **Description:** `pino` is listed as a production dependency but is not imported anywhere in the codebase — the actual logger is a custom implementation in `src/utils/logger.ts` using `process.stdout.write`. Unused production dependencies expand the dependency tree and attack surface without contributing functionality. `[SEE dependency-auditor]` for CVE status of the installed pino version.
- **Remediation:** Remove `pino` from `dependencies` in `Source/Backend/package.json` and run `npm install` to update the lockfile.

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No auth/authz on any API endpoint | **High** | CWE-306 |
| SAST-002 | Webhook intake accepts unauthenticated requests; no signature verification; missing enum validation | **High** | CWE-345 / CWE-20 |
| SAST-003 | Internal `err.message` returned in HTTP 500 responses | Medium | CWE-209 |
| SAST-004 | Unbounded pagination `limit` parameter | Medium | CWE-400 |
| SAST-005 | No HTTP security headers (CSP, X-Frame-Options, HSTS, CORS) | Medium | CWE-693 |
| SAST-006 | Unsandboxed `<iframe>` in DebugPortalPage | Medium | CWE-1021 |
| SAST-007 | Unauthenticated Prometheus `/metrics` endpoint | Low | CWE-200 |
| SAST-008 | Unused `pino` production dependency | Low | — |

**No hardcoded secrets found** in first-party source code. No dynamic code execution, shell injection, or unsafe deserialization patterns detected.
