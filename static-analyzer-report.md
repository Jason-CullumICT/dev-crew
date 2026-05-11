---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE]` — LLM pattern scan substituted; **0 hardcoded secrets found**
- **semgrep**: `[TOOL UNAVAILABLE]` — LLM pattern scan substituted; all source dirs manually reviewed
- **npm postinstall scripts**: Clean — only `build`, `test`, `typecheck` scripts present

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:21-31`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);   // Full CRUD — no auth guard
  app.use('/api/work-items', workflowRouter);    // State transitions — no auth guard
  app.use('/api/dashboard', dashboardRouter);    // Aggregated data — no auth guard
  app.use('/api/intake', intakeRouter);          // Webhook ingestion — no auth guard
  ```
- **Description:** Every API route is exposed without any authentication or authorization middleware. Any client that can reach port 3001 can create, read, update, delete, approve, reject, or dispatch any work item. There is no token, session, or IP-restriction layer anywhere in the Express application.
- **Remediation:** Add an authentication middleware (JWT bearer token, API key, or session) as the first `app.use()` call before route registration. For internal tooling, at minimum use a shared API key checked in middleware.
- **Handoff:** [HANDOFF → pen-tester] — verify exploitability of cross-user data access and unauthorized state transitions.

---

### SAST-002: Webhook Intake Endpoints Have No Signature Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    // No HMAC/signature check — any caller can inject work items
    const item = store.createWorkItem({ ... });
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept unauthenticated POST requests with no verification that the payload originates from the claimed source. Zendesk webhooks support HMAC-SHA256 signatures via the `X-Zendesk-Webhook-Signature` header, but this is never checked. Any party that discovers this endpoint can flood the system with arbitrary work items.
- **Remediation:** Verify the `X-Zendesk-Webhook-Signature` HMAC header using a shared secret stored in an environment variable. Use `crypto.timingSafeEqual()` for the comparison to prevent timing attacks. Apply similar signing to the `/automated` endpoint.

---

### SAST-003: Missing HTTP Security Headers (No helmet)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts` (entire file — no security header middleware)
- **Description:** The Express application sets no security headers. Absent headers include:
  - `Content-Security-Policy` — enables XSS exploitation
  - `X-Frame-Options` — enables clickjacking
  - `Strict-Transport-Security` — allows downgrade to HTTP
  - `X-Content-Type-Options` — allows MIME sniffing
  - `Referrer-Policy` — leaks URLs in Referer header
- **Remediation:** Add `helmet` as the first middleware: `app.use(helmet())`. The `helmet` package is not in `package.json`; add it as a dependency. For the CSP, configure it to allow only the necessary origins and `self` for scripts.

---

### SAST-004: No CORS Configuration — Open to Any Origin
- **Severity:** Medium
- **CWE:** CWE-942 (Permissive Cross-Origin Policy)
- **File:** `Source/Backend/src/app.ts`
- **Description:** The Express backend has no `cors` middleware and sets no `Access-Control-Allow-Origin` headers. In a development proxy setup this is transparent, but if the backend is ever exposed standalone, browsers will block cross-origin requests (CORs default-deny). More importantly, if later misconfigured with a wildcard `cors()` call without reviewing it, all origins will be permitted on authenticated routes. Currently the gap is: *no* CORS policy at all.
- **Remediation:** Install `cors` and configure it explicitly with an allowlist: `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }))`.

---

### SAST-005: Prometheus `/metrics` Endpoint is Unauthenticated
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
- **Description:** The Prometheus metrics endpoint exposes operational counters (work items created by source/type, routing decisions, dispatch counts, dependency cycle detections) to any unauthenticated caller. This reveals business-process throughput and system internals that should be protected.
- **Remediation:** Restrict the `/metrics` route to `localhost` (check `req.ip === '127.0.0.1'`), add a bearer token check, or bind the metrics server to a separate internal-only port.

---

### SAST-006: Unbounded Pagination `limit` Parameter — Denial-of-Service Risk
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  // workItems.ts
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  // No upper bound check — limit=999999999 is accepted
  ```
- **Description:** Both the work-items list and dashboard activity endpoints accept user-supplied `page` and `limit` query parameters with no maximum value enforcement. A caller sending `?limit=999999999` will trigger allocation of a slice over the entire in-memory store. Additionally, `parseInt` returns `NaN` for non-numeric strings; `NaN` propagates through arithmetic silently (e.g., `(page-1) * limit === NaN`).
- **Remediation:** Clamp values: `const limit = Math.min(Math.max(parseInt(...) || 20, 1), 100)`. Validate `!isNaN(limit)` before use.

---

### SAST-007: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits)
- **File:** `Source/Backend/src/app.ts` (global — no rate-limit middleware)
- **Description:** The entire API surface has no rate limiting. An attacker can create thousands of work items per second against `POST /api/work-items` or `POST /api/intake/*`, exhausting in-memory store capacity, or hammer workflow transitions to enumerate system behaviour. The `express-rate-limit` package is not present in `package.json`.
- **Remediation:** Add `express-rate-limit` with sensible defaults (e.g., 100 requests/minute per IP on all routes, stricter on mutation endpoints).

---

### SAST-008: `DebugPortalPage` iframe Has No `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers / Clickjacking)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-15`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}          // defaults to http://localhost:4200
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
    // No sandbox, no allow attribute, no referrerpolicy
  />
  ```
- **Description:** The iframe embedding the debug portal has no `sandbox` attribute, granting the embedded page full DOM access, form submission, script execution, and navigation of the top-level browsing context. If the `VITE_PORTAL_URL` env var is ever pointed at an untrusted origin, or if the portal application itself is compromised, it has full access to the parent page. Additionally, the default URL uses `http://` (not `https://`), creating a mixed-content risk in non-localhost deployments.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin allow-forms"` to the iframe. Validate `portalUrl` against an allowlist of trusted origins.

---

### SAST-009: Sensitive Field Values Logged in Change History
- **Severity:** Low
- **CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
- **File:** `Source/Backend/src/services/changeHistory.ts:25`
- **Code Snippet:**
  ```typescript
  logger.info({ msg: 'Field change tracked', workItemId: item.id, docId: item.docId,
    field, oldValue, newValue, agent });
  // oldValue/newValue are `unknown` — could be large text blobs or sensitive data
  ```
- **Description:** Every field update logs `oldValue` and `newValue` at `INFO` level. For free-text fields like `title` and `description`, this emits potentially-PII-containing content to stdout logs with no masking or truncation. Log aggregation systems (e.g., CloudWatch, Splunk) will index and retain these values indefinitely.
- **Remediation:** Truncate large string values before logging (e.g., `String(val).slice(0, 100)`), and for fields in `security.config.yml sensitive_fields`, mask or omit the value entirely.

---

### SAST-010: Missing Input Length Validation on Free-Text Fields
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:24-26`, `Source/Backend/src/routes/intake.ts:14-16`
- **Code Snippet:**
  ```typescript
  if (!body.title || !body.description) {
    res.status(400).json({ error: 'title and description are required' });
  }
  // No maxLength check — a 50 MB title string passes validation
  ```
- **Description:** The presence check (`!body.title`) does not enforce a maximum length. A malicious caller could submit a work item with a multi-megabyte `title` or `description`, which is stored in the in-memory Map, logged via the change history service, and serialized into JSON responses for every list/detail request. This degrades performance and could exhaust heap memory.
- **Remediation:** Add explicit length bounds: `title.length <= 500` and `description.length <= 10000`, returning `400` if exceeded.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication/authorization on any API route | **High** | CWE-306 |
| SAST-002 | No webhook HMAC signature verification on intake endpoints | **High** | CWE-345 |
| SAST-003 | Missing HTTP security headers (no helmet) | Medium | CWE-693 |
| SAST-004 | No CORS policy configured | Medium | CWE-942 |
| SAST-005 | Unauthenticated Prometheus `/metrics` endpoint | Medium | CWE-200 |
| SAST-006 | Unbounded pagination `limit` parameter — DoS risk | Medium | CWE-400 |
| SAST-007 | No rate limiting on any endpoint | Medium | CWE-770 |
| SAST-008 | Debug portal iframe missing `sandbox` attribute | Low | CWE-1021 |
| SAST-009 | Sensitive field values emitted in change history logs | Low | CWE-532 |
| SAST-010 | No input length validation on title/description fields | Low | CWE-20 |

**Totals:** 0 Critical · 2 High · 5 Medium · 3 Low · **10 total findings**

**No hardcoded secrets found.** No dangerous code execution patterns (eval/exec/spawn). No XSS sinks (dangerouslySetInnerHTML). No weak crypto (MD5/SHA1/Math.random for tokens). Error handler correctly returns a generic `"Internal server error"` message to clients — stack traces are logged server-side only.
