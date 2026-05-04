---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — fell back to LLM pattern scan; **0 hardcoded secrets found**
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — fell back to LLM pattern scan; **12 findings**

---

### SAST-001: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts` — entire middleware stack
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ← No auth middleware anywhere
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Zero authentication or authorization middleware is applied to any route. Every endpoint — CRUD operations, workflow state transitions (approve/reject/dispatch), dashboard aggregates, and intake webhooks — is publicly callable by anyone with network access. `package.json` confirms no `passport`, `jsonwebtoken`, `express-jwt`, or equivalent dependency is present.
- **Remediation:** Add an authentication middleware (e.g., JWT bearer token validation) before all `/api/*` routes. Introduce RBAC so that, for example, only privileged roles can approve, reject, or dispatch items.
- **Handoff:** `[HANDOFF → pen-tester]` — verify that all state-transition endpoints are fully reachable without credentials

---

### SAST-002: Webhook Intake Endpoints Accept Requests Without Signature Verification
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    // No HMAC/signature verification at all
    const item = store.createWorkItem({ ... });
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept webhook payloads with no signature or token verification. A real Zendesk webhook includes an `X-Zendesk-Webhook-Signature` header for HMAC-SHA256 verification. Without it, any party can forge webhook deliveries and inject arbitrary work items into the system.
- **Remediation:** Verify the `X-Zendesk-Webhook-Signature` / `X-Zendesk-Webhook-Signature-Timestamp` headers for Zendesk; add a shared-secret bearer token check for the automated endpoint. Reject requests that fail verification with `401`.

---

### SAST-003: Unauthenticated Route Override Bypasses Assessment Pod
- **Severity:** High
- **CWE:** CWE-285 (Improper Authorization)
- **File:** `Source/Backend/src/routes/workflow.ts:39–63` + `Source/Backend/src/services/router.ts:66–88`
- **Code Snippet:**
  ```typescript
  // workflow.ts
  router.post('/:id/route', (req: Request, res: Response) => {
    const body = req.body as RouteWorkItemRequest;
    const updated = routeWorkItem(id, body?.overrideRoute);
    ...
  });

  // services/router.ts — classifyRoute()
  if (overrideRoute) {         // any caller-supplied string wins
    return {
      route: overrideRoute,
      targetStatus: overrideRoute === WorkItemRoute.FastTrack
        ? WorkItemStatus.Approved   // ← jumps directly to Approved
        : WorkItemStatus.Proposed,
    };
  }
  ```
- **Description:** Any unauthenticated caller can POST `{"overrideRoute": "fast-track"}` to `/api/work-items/:id/route` and immediately move a work item from `backlog` to `approved`, completely bypassing the assessment pod. This directly satisfies the red-team objective "Bypass work item state machine."
- **Remediation:** Restrict the `overrideRoute` parameter to privileged roles only. At minimum, add a server-side authorization guard before the `classifyRoute()` call.
- **Handoff:** `[HANDOFF → pen-tester]`

---

### SAST-004: Missing CORS Policy
- **Severity:** Medium
- **CWE:** CWE-942 (Permissive Cross-domain Policy with Untrusted Domains)
- **File:** `Source/Backend/src/app.ts` (entire file — no CORS middleware)
- **Code Snippet:**
  ```typescript
  // app.ts — no cors() call, no Access-Control-* headers set
  app.use(express.json());
  ```
- **Description:** The backend configures no CORS policy. Without explicit CORS headers, browsers apply the same-origin restriction which will block cross-origin browser requests — but this also means no intentional allow-list is enforced. When authentication is added, the absence of a CORS policy will allow any origin to make credentialed requests if cookies or tokens are used without an explicit `Access-Control-Allow-Origin` allow-list.
- **Remediation:** Add the `cors` npm package with an explicit `origin` allow-list (e.g., only `http://localhost:5173` in development, the production frontend domain in production). Never use `origin: '*'` on authenticated routes.

---

### SAST-005: Missing HTTP Security Headers
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts`
- **Code Snippet:**
  ```typescript
  // No helmet(), no manual header-setting for:
  // Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
  // Strict-Transport-Security, Referrer-Policy
  ```
- **Description:** No security headers are configured. Missing headers leave the API open to clickjacking (`X-Frame-Options`), MIME sniffing (`X-Content-Type-Options: nosniff`), and make the frontend embeddable in arbitrary frames. HSTS is absent, so downgrade attacks are possible in non-localhost deployments.
- **Remediation:** Add `helmet` middleware: `app.use(helmet())`. This sets all critical headers with secure defaults in a single line. Review and tune CSP for the specific application.

---

### SAST-006: Intake Routes Skip Enum Validation on `type` and `priority`
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:19–24` and `38–43`
- **Code Snippet:**
  ```typescript
  // intake.ts — no validation of body.type / body.priority
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,       // arbitrary string accepted
    priority: body.priority || WorkItemPriority.Medium, // arbitrary string accepted
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** The manual `POST /api/work-items` correctly validates `type` and `priority` against their enums. The intake webhook routes (`/api/intake/zendesk` and `/api/intake/automated`) perform no such validation, allowing arbitrary strings to be stored in those fields. This can break downstream filtering, metrics labelling (`itemsCreatedCounter.inc({ source, type })`), and status-machine logic that compares `item.type`.
- **Remediation:** Add the same enum validation present in `workItems.ts` lines 29–42 to both intake routes. Reject with `400` if `body.type` or `body.priority` is provided but invalid.

---

### SAST-007: Unbounded Pagination `limit` Parameter (Potential DoS)
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:69–70`, `Source/Backend/src/routes/dashboard.ts:17–18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page:  req.query.page  ? parseInt(req.query.page  as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    // ← no maximum cap on limit
  };
  ```
- **Description:** The `limit` query parameter is passed directly to the in-memory store with no maximum cap. An attacker can request `?limit=999999` to force the backend to serialize and return the entire dataset in a single response. Additionally, `parseInt` returns `NaN` for non-numeric values (e.g., `?limit=abc`), which propagates silently through `Array.slice(NaN, NaN)` returning `[]` — incorrect but non-crashing behaviour.
- **Remediation:** Clamp `limit` to a maximum (e.g., 100): `const limit = Math.min(parseInt(...) || 20, 100)`. Add an `isNaN` guard with a fallback default.

---

### SAST-008: Prometheus `/metrics` Endpoint Publicly Accessible
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
- **Description:** The Prometheus scrape endpoint is exposed without authentication. It reveals internal operational counters: total items created/routed/assessed/dispatched by type, verdict breakdowns, dependency operation counts, and dispatch-gating event rates. This information helps an attacker profile system activity, enumerate team names, and infer workflow state without touching the application API.
- **Remediation:** Restrict `/metrics` to internal network access only (via reverse proxy ACL) or add IP allowlist/bearer-token middleware. A simple approach: check for a secret via `Authorization: Bearer <METRICS_TOKEN>` and return `403` otherwise.

---

### SAST-009: Internal Error Messages Returned to Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts` — multiple catch blocks (e.g., lines 59–63, 86–90, 137–141, 292–296)
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw internal message sent to client
  }
  ```
- **Description:** Service-layer exception messages are returned verbatim in `500` JSON responses. If an unexpected internal error occurs (e.g., from a third-party library, ORM, or future persistence layer), the stack trace or internal state could leak implementation details to unauthenticated clients. The `errorHandler` middleware (`errorHandler.ts:7`) correctly returns a generic message, but the workflow route catch-blocks bypass it by sending a response before `next(err)` is called.
- **Remediation:** In catch blocks that produce 500 responses, log the full error but respond with a generic message: `res.status(500).json({ error: 'Internal server error' })`. Reserve detailed messages only for 4xx client errors where revealing the reason is intentional.

---

### SAST-010: `DebugPortalPage` Embeds `iframe` Without `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-1022 (Use of Web Link to Untrusted Target with window.opener Access)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9–12`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}     // from VITE_PORTAL_URL env var, defaults to http://localhost:4200
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
    // ← no sandbox attribute
  />
  ```
- **Description:** The iframe has no `sandbox` attribute, meaning the embedded content inherits full JavaScript execution, form submission, and same-origin privileges if served from the same domain. If `VITE_PORTAL_URL` is misconfigured to point at a non-localhost URL (e.g., via environment injection in CI), the iframe loads external content with full permissions.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin allow-forms"` to restrict embedded content to the minimum needed. Validate that `VITE_PORTAL_URL` only allows known origins.

---

### SAST-011: `parseInt` Without `isNaN` Guard on Pagination Parameters
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:69`, `Source/Backend/src/routes/dashboard.ts:17`
- **Code Snippet:**
  ```typescript
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  // If req.query.page = "abc", parseInt returns NaN
  // (page - 1) * limit = NaN → slice(NaN, NaN) = []
  ```
- **Description:** Non-numeric values for `page` (e.g., `?page=abc`) produce `NaN`, which silently results in an empty data array being returned. While not exploitable for code execution, it causes incorrect API behaviour that is invisible to the caller who receives `{data: [], total: N}` with no error indication.
- **Remediation:** Use a validated parse helper: `const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)`.

---

### SAST-012: Change History Logs Potentially Sensitive Field Values
- **Severity:** Low
- **CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
- **File:** `Source/Backend/src/services/changeHistory.ts:25`
- **Code Snippet:**
  ```typescript
  logger.info({
    msg: 'Field change tracked',
    workItemId: item.id,
    field,
    oldValue,   // ← logged as-is
    newValue,   // ← logged as-is
    agent
  });
  ```
- **Description:** `trackFieldChange` logs `oldValue` and `newValue` for any field. Currently the tracked fields are `title, description, type, priority, complexity, status, route, assignedTeam` — none are sensitive today. However, if the field list expands (e.g., `email`, `apiKey`, `secret` per `security.config.yml` sensitive_fields), sensitive data will be written to structured logs verbatim, violating SOC2-Type2 controls CC6.1 and CC6.3.
- **Remediation:** Add a redaction check: before logging, replace the value with `[REDACTED]` if `field` is in the sensitive fields list defined in `security.config.yml`.

---

### Summary

| ID | Severity | CWE | Title |
|----|----------|-----|-------|
| SAST-001 | **High** | CWE-306 | No authentication on any API endpoint |
| SAST-002 | **High** | CWE-306 | Webhook intake lacks signature verification |
| SAST-003 | **High** | CWE-285 | Unauthenticated route override bypasses approval workflow |
| SAST-004 | Medium | CWE-942 | Missing CORS policy |
| SAST-005 | Medium | CWE-693 | Missing HTTP security headers (no helmet) |
| SAST-006 | Medium | CWE-20 | Intake routes skip enum validation on `type`/`priority` |
| SAST-007 | Medium | CWE-400 | Unbounded pagination `limit` (no max cap) |
| SAST-008 | Medium | CWE-200 | `/metrics` endpoint publicly accessible |
| SAST-009 | Medium | CWE-209 | Internal error messages returned to clients |
| SAST-010 | Low | CWE-1022 | `iframe` without `sandbox` attribute |
| SAST-011 | Low | CWE-20 | `parseInt` without `isNaN` guard |
| SAST-012 | Low | CWE-532 | Change history logs sensitive field values |

**Hardcoded secrets:** None found. CI/CD secrets use GitHub Secrets correctly. `.env.example` contains no real values.
**Dangerous APIs (eval, shell injection, XXE, unsafe deserialization):** None found.
**Insecure crypto (MD5, SHA1, weak RNG):** None found. UUID v4 used for ID generation (cryptographically appropriate).
**XSS patterns (`dangerouslySetInnerHTML`, `innerHTML`):** None found in React components.

**Metrics:** `findings_high: 3`, `findings_medium: 6`, `findings_low: 3`, `findings_total: 12`
