Here is the full SAST report:

---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — fell back to LLM pattern scan; **0 hardcoded secrets found**
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — fell back to LLM pattern scan; findings below

---

### SAST-001: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:1-54` / all route files
- **Code Snippet:**
  ```typescript
  // app.ts — no auth middleware anywhere before routes
  app.use('/api/work-items', workItemsRouter);   // CRUD + state transitions
  app.use('/api/work-items', workflowRouter);    // approve, reject, dispatch
  app.use('/api/dashboard', dashboardRouter);    // operational data
  app.use('/api/intake', intakeRouter);          // external webhooks
  ```
- **Description:** Zero authentication middleware is configured in `app.ts` or any individual route file. All API endpoints — including state-mutating operations like `POST /api/work-items/:id/approve`, `POST /api/work-items/:id/dispatch`, `DELETE /api/work-items/:id`, and `POST /api/work-items/:id/route?overrideRoute=fast-track` — are fully public. Any unauthenticated caller can approve, reject, dispatch, or delete any work item, or fast-track arbitrary items by supplying `overrideRoute` in the request body.
- **Remediation:** Add an authentication middleware layer (JWT bearer token verification, API key header check, or session-based auth) in `app.ts` before all `/api/*` routes. At minimum, protect all state-mutating endpoints (POST, PATCH, DELETE). Role-based access control (RBAC) should gate approval/dispatch actions to privileged principals.
- **Handoff:** `[HANDOFF → pen-tester]` — verify exploitability of unauthenticated state transitions and fast-track override

---

### SAST-002: Unauthenticated Webhook Endpoints Without Signature Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity) / CWE-306
- **File:** `Source/Backend/src/routes/intake.ts:11-55`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // ← No X-Zendesk-Webhook-Signature HMAC check
    const item = store.createWorkItem({ title: body.title, ... });
  ```
- **Description:** Both `POST /api/intake/zendesk` and `POST /api/intake/automated` accept unauthenticated payloads with no HMAC/secret-header verification. Zendesk webhooks include an `X-Zendesk-Webhook-Signature` header for authenticity; ignoring it allows any external actor to spoof webhook calls and inject arbitrary work items into the pipeline.
- **Remediation:** Verify `X-Zendesk-Webhook-Signature` HMAC-SHA256 using a shared secret stored in environment variables. For the automated intake endpoint, require a bearer token or IP allowlist. Reject requests that fail verification with `401 Unauthorized`.
- **Handoff:** `[HANDOFF → pen-tester]` — test webhook spoofing and mass work item injection

---

### SAST-003: Internal Error Messages Leaked to HTTP Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts` — lines 62, 89, 140, 207, 294, 350, 370
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw err.message sent to client
  }
  ```
- **Description:** In every catch block in `workflow.ts`, the raw `err.message` is forwarded directly to the HTTP response body. Depending on the upstream error source (store, service layer, Node.js internals), this can expose file paths, internal state descriptions, stack fragments, or implementation details that aid an attacker in mapping the system.
- **Remediation:** Return a generic `"Internal server error"` string to the client in all 500 responses; keep the detailed `err.message` in server-side logs only (which already happens via `logger.error`). Pattern: `res.status(500).json({ error: 'Internal server error' })`.

---

### SAST-004: Unvalidated Enum Inputs on Intake Webhook Routes
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22-23, 45-46`
- **Code Snippet:**
  ```typescript
  // intake.ts — no enum validation:
  type: body.type || WorkItemType.Bug,       // body.type can be any arbitrary string
  priority: body.priority || WorkItemPriority.Medium,

  // Compare with workItems.ts — correctly validates:
  if (!body.type || !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Valid type is required ...' });
  }
  ```
- **Description:** The intake webhook handlers pass `body.type` and `body.priority` from the external request directly to `createWorkItem()` without validating them against the enum allowlist. An attacker can create work items with arbitrary string values for `type` and `priority`, corrupting stored data, breaking dashboard aggregations, and potentially bypassing routing logic that switches on `item.type`.
- **Remediation:** Add enum validation to both intake handlers identical to the pattern in `workItems.ts` POST handler: `if (!Object.values(WorkItemType).includes(body.type)) { res.status(400)... }`.

---

### SAST-005: Unbounded Pagination `limit` Parameter — DoS Vector
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70` / `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  // workItems.ts — no upper bound
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,

  // dashboard.ts — same pattern
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  ```
- **Description:** The `?limit=` query parameter is parsed with `parseInt` and passed directly to the store layer with no maximum cap. An unauthenticated caller can request `?limit=999999` and force the server to serialize and transmit the entire in-memory dataset in a single response, exhausting memory and network bandwidth.
- **Remediation:** Clamp the limit to a safe maximum: `const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100)`. Apply consistently across `workItems.ts` and `dashboard.ts`.

---

### SAST-006: Prometheus `/metrics` Endpoint Exposed Without Authentication
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
- **Description:** The Prometheus scrape endpoint is publicly accessible. It exposes operational telemetry including work item counts by source/type, dispatch team assignments, routing decisions, and assessment verdict distributions. This allows any external party to enumerate system activity patterns and infer business data without authentication.
- **Remediation:** Restrict the `/metrics` endpoint to an internal network or scrape CIDR range (preferred at the network/ingress level). If code-level protection is needed, add an `Authorization` header check using a scrape bearer token from an environment variable.

---

### SAST-007: Missing HTTP Security Headers (No helmet.js or Equivalent)
- **Severity:** Medium
- **CWE:** CWE-16 (Configuration)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ← No helmet(), no CORS config, no CSP, no X-Frame-Options
  ```
- **Description:** No security headers are configured on the Express application. Missing headers include: `Content-Security-Policy`, `X-Frame-Options` (clickjacking), `X-Content-Type-Options` (MIME sniffing), `Strict-Transport-Security` (HSTS), and `Referrer-Policy`. CORS is not explicitly configured (relies on browser defaults); an explicit allowlist should be enforced.
- **Remediation:** Add `helmet` middleware (`npm install helmet`) as the first `app.use()` call. For CORS, use the `cors` package with an explicit `origin` allowlist rather than the implicit default. Apply before all other middleware.

---

### SAST-008: `Object.assign` on Untrusted Updates Without Prototype Guard
- **Severity:** Low
- **CWE:** CWE-915 (Improperly Controlled Modification of Dynamically-Determined Object Attributes)
- **File:** `Source/Backend/src/store/workItemStore.ts:71`
- **Code Snippet:**
  ```typescript
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  ```
- **Description:** `Object.assign` is used to merge the `updates` parameter directly onto the stored work item object. While the callers in `workItems.ts` use an `allowedFields` whitelist (mitigating the main risk), this pattern is one missed whitelist check away from prototype pollution. If a future caller passes user-controlled data without a whitelist, keys like `__proto__` or `constructor` could corrupt the prototype chain.
- **Remediation:** Use `structuredClone` or spread syntax `{ ...item, ...updates }` instead of `Object.assign`. Alternatively, add an explicit `__proto__` key guard in the store: `delete (updates as any).__proto__`.

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No Authentication on Any API Endpoint | **High** | CWE-306 |
| SAST-002 | Unauthenticated Webhooks — No Signature Verification | **High** | CWE-345 |
| SAST-003 | Internal Error Messages Leaked to Clients | **Medium** | CWE-209 |
| SAST-004 | Unvalidated Enum Inputs on Intake Routes | **Medium** | CWE-20 |
| SAST-005 | Unbounded Pagination `limit` — DoS Vector | **Medium** | CWE-400 |
| SAST-006 | `/metrics` Endpoint Unauthenticated | **Low** | CWE-200 |
| SAST-007 | Missing HTTP Security Headers | **Medium** | CWE-16 |
| SAST-008 | `Object.assign` Without Prototype Guard | **Low** | CWE-915 |

**Totals: 0 Critical · 2 High · 4 Medium · 2 Low**

**No hardcoded secrets found** in first-party source code. The `.env.example` contains only empty placeholders (as expected). No `eval`, `exec`, dynamic code execution, SQL/NoSQL injection surface (in-memory store), weak cryptography, or `dangerouslySetInnerHTML` usage was detected.
