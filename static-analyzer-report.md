---

## Static Analyzer Results

### Tools Run
- **gitleaks:** `[TOOL UNAVAILABLE]` — not installed; LLM pattern scan used for secrets
- **semgrep:** `[TOOL UNAVAILABLE]` — not installed; LLM pattern scan used for SAST patterns
- **npm postinstall scripts:** No malicious lifecycle hooks detected in `Source/Backend/package.json`

No hardcoded secrets found in first-party code. No credentials, API keys, or tokens in source files or `.env.example` (example file contains no real values).

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:11-44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No auth middleware — every route is wide open
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** The Express application has zero authentication or authorization middleware. Every endpoint — including privileged operations like manually approving (`POST /api/work-items/:id/approve`), dispatching (`POST /api/work-items/:id/dispatch`), and bulk-deleting work items — is reachable by any unauthenticated caller with network access. There is no JWT validation, no session check, no API key verification.
- **Remediation:** Add an authentication middleware (e.g., JWT verification via `express-jwt` or a custom middleware) early in the middleware chain in `app.ts`, before all route registrations. Apply role-based authorization guards on write operations and state-transition endpoints.
- **Handoff:** `[HANDOFF → pen-tester]` — verify exploitability: can an unauthenticated caller successfully invoke approve/dispatch/delete in the live environment?

---

### SAST-002: Webhook Intake Endpoints Have No Signature Verification
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
    const item = store.createWorkItem({ title: body.title, ...
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept payloads from any caller, with no HMAC-SHA256 signature verification against a shared webhook secret. This means any attacker who discovers these endpoints can forge Zendesk or automated-system payloads and inject arbitrary work items into the system, poisoning the work queue. Additionally, neither intake endpoint validates the `type` or `priority` fields against their respective enums (`body.type || WorkItemType.Bug`) — an attacker can store arbitrary strings in those fields.
- **Remediation:** (1) For `/zendesk`: verify the `X-Zendesk-Webhook-Signature` HMAC header using a `ZENDESK_WEBHOOK_SECRET` env variable before processing the body. (2) For `/automated`: require a bearer token or API key. (3) Add enum validation for `type` and `priority` on both intake routes, matching the validation on `POST /api/work-items`.
- **Handoff:** `[HANDOFF → pen-tester]` — attempt forged webhook injection against `/api/intake/zendesk`.

---

### SAST-003: Pagination `limit` Parameter Has No Maximum Cap (Resource Exhaustion)
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`, `Source/Backend/src/store/workItemStore.ts:35`
- **Code Snippet:**
  ```typescript
  // workItems.ts — no upper bound enforced
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
  // workItemStore.ts — passed through directly
  const limit = pagination.limit || 20;
  const data = result.slice(offset, offset + limit);
  ```
- **Description:** Both `GET /api/work-items` and `GET /api/dashboard/activity` accept a `limit` query parameter with no enforced maximum. An attacker can pass `limit=9999999` and receive the entire data set in a single response, bypassing pagination and enabling data enumeration and potential DoS under high data volumes. This is also listed as a critical red-team objective in `security.config.yml` ("Enumerate all work items without pagination limit enforcement").
- **Remediation:** Add a `MAX_PAGE_LIMIT = 100` constant and enforce it in both route handlers and the store: `const limit = Math.min(MAX_PAGE_LIMIT, pagination.limit || 20)`.
- **Handoff:** `[HANDOFF → pen-tester]`

---

### SAST-004: Internal Error Messages Returned to HTTP Clients (CWE-209)
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:60-63`, lines 87-90, 138-141, 205-208, 291-295, 349-352, 369-372
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw internal message to client
  }
  ```
- **Description:** All six action endpoints in `workflow.ts` catch errors and return the raw `err.message` to the HTTP client in a 500 response. While the global `errorHandler` middleware correctly returns a generic `"Internal server error"`, these route-level catches intercept errors before they reach the middleware. This can leak internal implementation details — e.g., stack traces disguised as message strings, database path leaks, or service-level error strings. This is a deviation from the project's own architecture rule: *"every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."*
- **Remediation:** Separate internal details from client-facing messages. Log the full error internally (already done), but return a generic `{ error: "An unexpected error occurred" }` for 500 conditions. Only expose the message for 400/404 errors where it is safe and user-facing.

---

### SAST-005: Missing HTTP Security Headers — No Helmet Middleware
- **Severity:** Medium
- **CWE:** CWE-16 (Configuration), OWASP ASVS Level 2
- **File:** `Source/Backend/src/app.ts:11-13`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ← No helmet(), no CORS policy, no security headers
  ```
- **Description:** The Express application has no security header middleware. Missing headers include: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, and `Permissions-Policy`. Express 4 also serves an `X-Powered-By: Express` header by default, disclosing the framework version. Without CSP, the frontend is vulnerable to XSS escalation. Without X-Frame-Options, the app can be embedded in hostile iframes.
- **Remediation:** Add `app.use(helmet())` from the `helmet` npm package immediately after `express()` instantiation. For CORS, define an explicit policy using `cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') })`.

---

### SAST-006: Prometheus Metrics Endpoint Exposed Without Authentication
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
- **Description:** The Prometheus metrics endpoint is publicly accessible with no authentication. It exposes operational intelligence: `workflow_items_created_total`, `workflow_items_dispatched_total`, `workflow_items_assessed_total`, `dispatch_gating_events_total`, and Node.js process-level metrics (heap usage, CPU). This enables an attacker to enumerate system load patterns, data volumes, and team assignments — useful reconnaissance for targeted attacks.
- **Remediation:** Restrict `/metrics` to internal network access via network policy, or add a bearer token check: verify a `METRICS_AUTH_TOKEN` environment variable against the `Authorization` header before serving metrics.

---

### SAST-007: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts` (whole app)
- **Description:** No rate-limiting middleware (e.g., `express-rate-limit`) is applied to any endpoint. All write endpoints (`POST /api/work-items`, `/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, `/intake/zendesk`, `/intake/automated`) and read endpoints are unrestricted. Combined with the total lack of authentication (SAST-001), this enables unlimited request flooding and data creation attacks. An attacker can create thousands of work items in seconds.
- **Remediation:** Add `express-rate-limit` middleware with appropriate windows. A reasonable baseline: 100 req/15 min on read endpoints, 20 req/15 min on write endpoints, 10 req/15 min on intake webhooks.

---

### SAST-008: Docker Container Runs as Root — No Non-Root USER Directive
- **Severity:** Medium
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `portal/Dockerfile`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim
  WORKDIR /app
  # ... (no USER directive anywhere)
  CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & ..."]
  ```
- **Description:** The portal Dockerfile has no `USER` directive, so the Node.js backend and Vite frontend processes run as `root` (uid 0) inside the container. If a container escape vulnerability or a remote code execution bug is found in the application, the attacker immediately has root within the container, making lateral movement and privilege escalation significantly easier.
- **Remediation:** Add a non-root user before the `CMD`:
  ```dockerfile
  RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
  USER appuser
  ```

---

### SAST-009: `<iframe>` Missing `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers — Clickjacking / iframe Injection)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-13`
- **Code Snippet:**
  ```tsx
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
  return (
    <iframe
      src={portalUrl}
      style={{ width: '100%', height: '100%', border: 'none' }}
      title="Debug Portal"
    />  // ← no sandbox attribute
  );
  ```
- **Description:** The `<iframe>` embedding the debug portal has no `sandbox` attribute. Without `sandbox`, the embedded page inherits full privileges: it can run scripts, submit forms, navigate the top-level window, and access parent-frame storage. If `VITE_PORTAL_URL` is misconfigured or an attacker performs URL substitution, this iframe could host a hostile page with access to the outer application's context. Even for the legitimate portal, `sandbox` provides defense-in-depth.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin allow-forms"` to the `<iframe>` element, restoring only the minimum permissions the portal requires.

---

### SAST-010: Query Filter Parameters Cast Directly to Enum Types Without Runtime Validation
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:62-65`
- **Code Snippet:**
  ```typescript
  const filters = {
    status: req.query.status as WorkItemStatus | undefined,
    type: req.query.type as WorkItemType | undefined,
    priority: req.query.priority as WorkItemPriority | undefined,
    source: req.query.source as WorkItemSource | undefined,
  };
  ```
- **Description:** TypeScript `as` casts are compile-time only and provide no runtime protection. At runtime, any string value from `req.query` is accepted without checking membership in the respective enum. Invalid values simply yield no results (the filter compares against enum values that won't match), but this is a validation gap. If filtering logic is ever changed to pass these values further (e.g., into a real database query), injection risks emerge.
- **Remediation:** Add a validation helper: `const isValidEnum = <T>(val: unknown, enumObj: object): val is T => Object.values(enumObj).includes(val);` and apply it before passing filter values to the store.

---

### SAST-011: `overrideRoute` Field Accepted Without Enum Validation
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workflow.ts:57`, `Source/Backend/src/services/router.ts:66-75`
- **Code Snippet:**
  ```typescript
  // workflow.ts — no validation of overrideRoute
  const updated = routeWorkItem(id, body?.overrideRoute);

  // router.ts — stores value directly in item
  if (overrideRoute) {
    return { route: overrideRoute, targetStatus: ... };
  }
  ```
- **Description:** The `overrideRoute` value from the request body is passed unchecked to the routing service, which stores it in the work item's `route` field. An attacker can set `route` to an arbitrary string (not in the `WorkItemRoute` enum), persisting invalid data in the store and potentially confusing downstream logic or the frontend.
- **Remediation:** Validate `body?.overrideRoute` against `Object.values(WorkItemRoute)` before calling `routeWorkItem()`, returning a 400 error if the value is invalid.

---

### SAST-012: `express.json()` Without Body Size Limit
- **Severity:** Low
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/app.ts:13`
- **Code Snippet:**
  ```typescript
  app.use(express.json());  // default 100kb limit, but undocumented / no explicit cap
  ```
- **Description:** `express.json()` defaults to a 100KB body size limit. While this default exists, it is not explicitly configured and could be changed by upstream middleware or proxy configuration. The correct pattern is to explicitly declare the limit to prevent accidental increases: `express.json({ limit: '10kb' })`. For intake webhook endpoints where payloads are expected to be small, a tighter limit is appropriate.
- **Remediation:** Change to `app.use(express.json({ limit: '50kb' }))`. For intake routes, consider a separate, tighter limit via route-level middleware.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No Authentication on Any Endpoint | **High** | CWE-306 |
| SAST-002 | Webhook Intake Has No Signature Verification | **High** | CWE-345 |
| SAST-003 | Pagination `limit` Has No Maximum Cap | **Medium** | CWE-770 |
| SAST-004 | Internal Error Messages Returned to Clients | **Medium** | CWE-209 |
| SAST-005 | Missing HTTP Security Headers | **Medium** | CWE-16 |
| SAST-006 | Prometheus Metrics Endpoint Unauthenticated | **Medium** | CWE-200 |
| SAST-007 | No Rate Limiting on Any Endpoint | **Medium** | CWE-770 |
| SAST-008 | Docker Container Runs as Root | **Medium** | CWE-250 |
| SAST-009 | iframe Missing `sandbox` Attribute | Low | CWE-1021 |
| SAST-010 | Query Params Cast to Enums Without Validation | Low | CWE-20 |
| SAST-011 | `overrideRoute` Not Enum-Validated | Low | CWE-20 |
| SAST-012 | JSON Body Size Limit Not Explicit | Low | CWE-400 |

**Totals:** 2 High · 6 Medium · 4 Low · **12 total**

**Grade indication (SAST-only):** Per `grading` config — 0 Critical, 2 High → within Grade **A** threshold (max 2 High) assuming no critical findings elsewhere in the pipeline.
