---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE]` — fell back to LLM pattern scan (0 hardcoded secrets found)
- **semgrep**: `[TOOL UNAVAILABLE]` — fell back to LLM pattern scan

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:12–44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No auth middleware registered anywhere
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Every API endpoint — including state-machine transitions (approve, reject, dispatch), dashboard data, and intake webhooks — is fully unauthenticated. Any client with network access can approve or dispatch any work item, read all data, or trigger any workflow action.
- **Remediation:** Add an authentication middleware layer (e.g., JWT Bearer token or API-key validation) before all `app.use('/api/...')` route registrations. At minimum protect mutation endpoints (POST/PATCH/DELETE) and all workflow transitions. Consider per-role authorization for sensitive transitions (dispatch, approve).
- **Handoff:** `[HANDOFF → pen-tester]` — confirm exploitability via active probing of unauthenticated transition endpoints.

---

### SAST-002: Missing Webhook Signature Validation on Intake Endpoints
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No X-Zendesk-Webhook-Signature or HMAC verification
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept arbitrary POST requests without verifying any webhook signature (e.g., Zendesk's `X-Zendesk-Webhook-Signature` HMAC-SHA256 header). Any party with knowledge of the endpoint URL can forge webhook payloads and inject arbitrary work items into the system.
- **Remediation:** Validate the HMAC signature against a shared `WEBHOOK_SECRET` env variable before processing the body. For Zendesk, verify `X-Zendesk-Webhook-Signature` using SHA-256. For the automated intake, require a static bearer token or signed payload.

---

### SAST-003: No Maximum Pagination `limit` — Potential Denial of Service
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  // workItems.ts
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  // dashboard.ts
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  ```
- **Description:** Both `GET /api/work-items` and `GET /api/dashboard/activity` accept user-controlled `limit` and `page` parameters with no upper cap. A single request with `?limit=999999999` forces the server to serialize and transmit the entire in-memory dataset, potentially exhausting memory and CPU.
- **Remediation:** Clamp `limit` to a safe maximum (e.g., `const limit = Math.min(parseInt(...) || 20, 100)`). Also validate `page` is a positive integer.

---

### SAST-004: Missing Enum Validation on User-Supplied `type`/`priority` in Intake Routes
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22–23, 45–46`
- **Code Snippet:**
  ```typescript
  // No validation — body.type could be any string
  type: body.type || WorkItemType.Bug,
  priority: body.priority || WorkItemPriority.Medium,
  ```
- **Description:** The intake routes accept `type` and `priority` from the webhook body and pass them directly to `store.createWorkItem()` without validating against the allowed enum values (`WorkItemType`, `WorkItemPriority`). The main `/api/work-items` POST route correctly validates these (lines 29–41), but intake routes bypass this. Invalid enum values can propagate through the state machine, causing undefined behavior in routing/assessment logic.
- **Remediation:** Add the same `Object.values(WorkItemType).includes(body.type)` guards used in `workItems.ts` to both intake handlers, or extract shared validation into a utility function.

---

### SAST-005: Missing HTTP Security Headers (No helmet or equivalent)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts`
- **Description:** The Express application has no security headers configured — no Content Security Policy (CSP), no `X-Frame-Options`, no `X-Content-Type-Options`, no `Strict-Transport-Security` (HSTS). This enables clickjacking attacks against the API, MIME-type sniffing exploits, and protocol downgrade attacks when deployed over HTTPS.
- **Remediation:** Add `helmet` as a dependency and register it as the first middleware: `app.use(helmet())`. Tune CSP to match the application's script/style origins.

---

### SAST-006: Unauthenticated Prometheus Metrics Endpoint
- **Severity:** Medium
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34–37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The `/metrics` endpoint exposes Prometheus counters (item creation rates by type/source, dispatch rates by team, assessment verdicts, dispatch gating events) with no authentication. This data reveals internal operational state useful for reconnaissance (e.g., which teams receive the most dispatches, rejection rates).
- **Remediation:** Restrict `/metrics` to internal/trusted networks via IP allowlist in a reverse proxy, or add a bearer-token check to the route handler. If Prometheus scrapes from inside the same network, an IP restriction is simplest.

---

### SAST-007: `iframe` Missing `sandbox` Attribute in Debug Portal
- **Severity:** Low
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The debug portal iframe has no `sandbox` attribute. Without sandboxing, the embedded page can execute scripts, navigate the top-level frame, and (if same-origin) access the parent's cookies and localStorage. While `portalUrl` defaults to `localhost:4200`, the absence of sandboxing is a defence-in-depth failure.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin allow-forms"` (adjust as needed for portal functionality). This restricts the embedded frame from navigating the top-level frame and from accessing parent-origin resources.

---

### SAST-008: Container Runs as Root — No `USER` Directive in Dockerfile
- **Severity:** Low
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `portal/Dockerfile`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim
  WORKDIR /app
  # ... no USER directive
  CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & ..."]
  ```
- **Description:** The Dockerfile has no `USER` directive, so all processes inside the container run as `root`. If any service is compromised (e.g., via RCE through an API vulnerability), the attacker gets root-level access within the container, increasing the blast radius of a breach.
- **Remediation:** Add `RUN useradd -r -u 1001 appuser && chown -R appuser /app` and `USER appuser` before the `CMD` instruction.

---

### SAST-009: Internal Service Error Messages Returned Directly to HTTP Clients
- **Severity:** Low
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:62, 89, 140, 207, 292, 331, 368`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    // ...
    res.status(500).json({ error: message });  // Service internals exposed
  }
  ```
- **Description:** Every `catch` block in `workflow.ts` extracts `err.message` from the thrown error and returns it verbatim in the HTTP 500 response. Service layer errors (from `dependency.ts`) include internal work item IDs and graph state descriptions. While not as severe as stack trace exposure, this leaks internal service vocabulary and aids targeted enumeration.
- **Remediation:** For 500-class errors, return a generic message (`"Internal server error"`) to the client and log the full error server-side with a correlation ID. For 400/404 errors that intentionally surface user-facing messages (e.g., "Work item not found"), the current behaviour is acceptable.

---

### Summary

| ID | Title | Severity | CWE |
|---|---|---|---|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306 |
| SAST-002 | Missing webhook signature validation | **High** | CWE-345 |
| SAST-003 | No max pagination limit — DoS risk | Medium | CWE-400 |
| SAST-004 | Missing enum validation in intake routes | Medium | CWE-20 |
| SAST-005 | No HTTP security headers | Medium | CWE-693 |
| SAST-006 | Unauthenticated `/metrics` endpoint | Medium | CWE-200 |
| SAST-007 | iframe missing sandbox attribute | Low | CWE-693 |
| SAST-008 | Container runs as root (no USER) | Low | CWE-250 |
| SAST-009 | Internal error messages in HTTP responses | Low | CWE-209 |

**Totals:** 2 High · 4 Medium · 3 Low · 0 secrets found · 0 dynamic code execution patterns · 0 weak crypto

**No hardcoded secrets, no eval/exec patterns, no weak cryptography (MD5/SHA1/DES), no SQL injection surface (in-memory store), no XXE vectors, no unvalidated redirects, and no dangerouslySetInnerHTML usage detected.**
