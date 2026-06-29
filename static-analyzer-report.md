---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — fell back to LLM pattern scan
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — fell back to LLM pattern scan
- **npm scripts check**: Clean — no `postinstall` or `preinstall` supply-chain hooks

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:11-44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No auth middleware anywhere
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Every API endpoint — including workflow state transitions (`/approve`, `/reject`, `/dispatch`), intake webhooks, and the full CRUD surface — is unauthenticated. There is no JWT validation, session check, API key requirement, or any middleware that gates access. Anyone with network access to port 3001 can perform any operation.
- **Remediation:** Add an authentication middleware (e.g., `express-jwt`, bearer token, or API key header check) before all route groups. For the intake webhooks, see also SAST-003. Role-based access control (RBAC) should govern who can approve/reject/dispatch.
- **Handoff:** [HANDOFF → pen-tester] — verify exploitability of unauthorized state transitions (e.g., direct dispatch bypass of assessment)

---

### SAST-002: Prometheus `/metrics` Endpoint Publicly Accessible
- **Severity:** Medium
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34-37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The `/metrics` endpoint exposes Prometheus default metrics (process memory RSS, heap usage, file descriptor counts, event loop lag, Node.js version) alongside custom business metrics (items created/routed/dispatched by team name, dependency operations). No authentication is required. This enables internal system reconnaissance — an attacker learns team names, workflow throughput, and system resource state.
- **Remediation:** Restrict `/metrics` to localhost or an internal network, add a bearer token check, or serve it on a separate port not exposed externally. Use `app.get('/metrics', requireInternalAuth, ...)`.

---

### SAST-003: Intake Webhooks Accept Payloads Without Source Authentication
- **Severity:** Medium
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ title: body.title, ... });
  ```
- **Description:** Neither `/api/intake/zendesk` nor `/api/intake/automated` verify that the inbound request originates from a legitimate source. Zendesk signs its webhook payloads with HMAC-SHA256; this endpoint ignores that signature. Any unauthenticated caller can inject arbitrary work items into the workflow engine.
- **Remediation:** Verify the `X-Zendesk-Webhook-Signature` header using HMAC-SHA256 with a shared secret for the Zendesk endpoint. For `/automated`, require a static shared API key in a request header.

---

### SAST-004: Intake Endpoints Skip Enum Validation on `type` and `priority`
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22-24`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,       // no enum check
    priority: body.priority || WorkItemPriority.Medium,  // no enum check
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** `POST /api/work-items` (the manual creation route) validates `type` and `priority` against their enums and rejects invalid values (lines 29-44 of `workItems.ts`). The intake routes do not. A crafted webhook payload with `type: "arbitrary_string"` will be stored and returned, potentially breaking downstream state-machine logic or causing assertion errors in consuming code.
- **Remediation:** Apply the same enum validation as in `workItems.ts:29-45` to both intake routes, or extract a shared `validateWorkItemEnums()` helper.

---

### SAST-005: Unbounded Pagination `limit` Parameter
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
- **Description:** The `limit` query parameter is passed to the store with no upper-bound cap. A request like `GET /api/work-items?limit=9999999` will cause the server to serialize the entire in-memory store into a single JSON response. As the store grows, this degrades into an OOM or severe latency spike. This is especially relevant for the in-memory store design where all data lives in one Node.js process.
- **Remediation:**
  ```typescript
  const MAX_LIMIT = 100;
  const limit = Math.min(MAX_LIMIT, req.query.limit ? parseInt(req.query.limit as string, 10) || 20 : 20);
  ```

---

### SAST-006: Missing HTTP Security Headers (No `helmet` or Equivalent)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json()); // only middleware before routes
  ```
- **Description:** The Express app sets no security-relevant HTTP response headers. The following are absent:
  - `Content-Security-Policy` — browser XSS mitigation
  - `X-Frame-Options` / `frame-ancestors` — clickjacking protection
  - `X-Content-Type-Options: nosniff` — MIME sniffing prevention
  - `Strict-Transport-Security` — HTTPS enforcement
  - `Referrer-Policy` — referrer information leakage
- **Remediation:** Install and add `helmet` as the first middleware: `app.use(require('helmet')())`. Review and tune CSP for the frontend's API usage patterns.

---

### SAST-007: Raw Error Messages from Internal Services Returned to Clients
- **Severity:** Low
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts` (lines 60–62, 87–89, 138–140, 204–206, 292–294)
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
  ```
- **Description:** Internal service errors (from `routeWorkItem`, `assessWorkItem`, etc.) have their `.message` forwarded verbatim in 500 responses. Current messages like `"Work item ${itemId} not found"` are benign, but this pattern is fragile — if a future dependency throws an error containing a connection string, file path, or stack frame, it will leak to clients.
- **Remediation:** Log the full error server-side and return a generic message to the client: `res.status(500).json({ error: 'Internal server error' })`. Use the existing `errorHandler` middleware pattern for unhandled exceptions.

---

### SAST-008: Dockerfile Runs Processes as Root
- **Severity:** Low
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `portal/Dockerfile:6-23`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim
  WORKDIR /app
  # ... no USER directive
  CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & ..."]
  ```
- **Description:** The Dockerfile has no `USER` directive. Both the backend and frontend processes execute as `root` inside the container. If an attacker achieves remote code execution through the application, they would have root access to the container filesystem, potentially escalating to the host if the Docker socket or privileged volumes are mounted.
- **Remediation:**
  ```dockerfile
  RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
  USER appuser
  ```
  Add this before the `CMD` directive.

---

### SAST-009: `<iframe>` in DebugPortalPage Missing `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The iframe embedding the debug portal has no `sandbox` attribute. Without sandboxing, the embedded page has full script execution capabilities, can navigate the top-level frame, access cookies/storage from the parent origin (if same-origin), and submit forms. `VITE_PORTAL_URL` defaults to `http://localhost:4200` — but if misconfigured or if the portal is compromised, there is no containment layer.
- **Remediation:**
  ```tsx
  <iframe
    src={portalUrl}
    sandbox="allow-scripts allow-same-origin allow-forms"
    title="Debug Portal"
  />
  ```

---

### SAST-010: `express.json()` Body Size Limit Not Explicitly Set
- **Severity:** Low
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/app.ts:13`
- **Code Snippet:**
  ```typescript
  app.use(express.json());
  ```
- **Description:** Express defaults to a 100kb JSON body limit, but this is implicit and undocumented in the codebase. The intake webhook routes accept arbitrary JSON from external systems. Making the limit explicit prevents silent surprises if Express defaults change and documents the intended constraint.
- **Remediation:**
  ```typescript
  app.use(express.json({ limit: '100kb' }));
  ```

---

### Summary Table

| ID | Severity | CWE | Title |
|----|----------|-----|-------|
| SAST-001 | **High** | CWE-306 | No Authentication on Any API Endpoint |
| SAST-002 | Medium | CWE-200 | Prometheus `/metrics` Publicly Accessible |
| SAST-003 | Medium | CWE-345 | Intake Webhooks — No Source Authentication |
| SAST-004 | Medium | CWE-20 | Intake Routes Skip Enum Validation |
| SAST-005 | Medium | CWE-400 | Unbounded Pagination `limit` Parameter |
| SAST-006 | Medium | CWE-693 | Missing HTTP Security Headers |
| SAST-007 | Low | CWE-209 | Raw Error Messages Returned to Clients |
| SAST-008 | Low | CWE-250 | Dockerfile Runs as Root |
| SAST-009 | Low | CWE-1021 | iframe Missing `sandbox` Attribute |
| SAST-010 | Low | CWE-400 | JSON Body Size Limit Implicit |

**Totals:** 1 High · 5 Medium · 4 Low = **10 findings**

**Projected Grade:** B (1 High ≤ 2, 0 Critical — satisfies Grade A threshold on highs, but the breadth of medium findings around authentication perimeter suggests the system needs structural hardening before A can be awarded with confidence)

**No hardcoded secrets found** in first-party source code. The `platform/.env.example` contains only empty placeholder values (`GITHUB_TOKEN=`).
