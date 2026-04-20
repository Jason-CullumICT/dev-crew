---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — fell back to LLM pattern scan
- **semgrep**: [TOOL UNAVAILABLE] — fell back to LLM pattern scan

---

### SAST-001: No Authentication Middleware on Any API Endpoint

- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:11-44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ... no auth middleware anywhere
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** The Express application mounts every API router with zero authentication or authorisation middleware. Any unauthenticated caller can create, update, approve, reject, and dispatch work items. This is a complete absence of access control.
- **Remediation:** Add an authentication middleware (e.g., JWT/Bearer token validation) before all `app.use('/api/...')` mounts. For webhook endpoints at `/api/intake`, use HMAC-SHA256 signature verification of the incoming payload.
- **Handoff:** [HANDOFF → pen-tester] — verify unauthenticated access to every endpoint, including privilege-escalation flows (approve/dispatch without credentials).

---

### SAST-002: Zendesk/Automated Intake Webhooks Accept Unvalidated Enum Fields

- **Severity:** High
- **CWE:** CWE-20 (Improper Input Validation), CWE-306 (Missing Authentication)
- **File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // body.type and body.priority are accepted without enum validation
    const item = store.createWorkItem({
      title: body.title,
      description: body.description,
      type: body.type || WorkItemType.Bug,       // no enum check
      priority: body.priority || WorkItemPriority.Medium,  // no enum check
      source: WorkItemSource.Zendesk,
    });
  ```
- **Description:** The intake endpoints accept `type` and `priority` fields from the raw request body without validating them against their respective enums (`WorkItemType`, `WorkItemPriority`). If these fields are provided with arbitrary strings, invalid enum values are stored in the in-memory store. There is also no Zendesk webhook signature validation (e.g., `X-Zendesk-Webhook-Signature`), meaning any unauthenticated caller can inject work items as if they were from Zendesk.
- **Remediation:** (1) Validate `body.type` against `Object.values(WorkItemType)` and `body.priority` against `Object.values(WorkItemPriority)` — mirror the validation pattern already in `workItems.ts`. (2) Verify the Zendesk HMAC-SHA256 webhook signature on every incoming request.
- **Handoff:** [HANDOFF → pen-tester] — attempt injection of invalid type/priority values and spoofed Zendesk payloads.

---

### SAST-003: Internal Error Messages Leaked to API Clients

- **Severity:** High
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:58-63, 87-90, 137-140, 203-208, 291-295, 349-352`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // raw error message returned to client
  }
  ```
- **Description:** Every `catch` block in `workflow.ts` returns the raw `err.message` in the HTTP 500 response body. Internal error messages can reveal implementation details, file paths, stack frames, or service-specific messages (e.g., "Work item WI-042 not found", dependency cycle messages). This pattern appears in 6 separate route handlers.
- **Remediation:** Return a generic `"Internal server error"` message to clients for 500-class errors. Log the full detail server-side (already done). Only expose safe, structured error messages for 4xx client errors.

---

### SAST-004: No HTTP Security Headers (Missing Helmet)

- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure), CWE-1021 (Improper Restriction of Rendered UI Layers)
- **File:** `Source/Backend/src/app.ts`
- **Description:** No `helmet` or equivalent security-header middleware is configured. The following headers are absent from all responses:
  - `Content-Security-Policy` — allows XSS via inline scripts
  - `X-Frame-Options` — allows clickjacking
  - `Strict-Transport-Security` — no HTTPS enforcement
  - `X-Content-Type-Options: nosniff` — MIME-sniffing attacks
  - `X-XSS-Protection` — legacy XSS filter disabled in some browsers
  - `Referrer-Policy` — leaks URL on cross-origin requests
- **Remediation:** `npm install helmet` and add `app.use(helmet())` as the first middleware in `app.ts`. Configure CSP explicitly for the API (e.g., `defaultSrc: ["'none'"]` for a JSON API).

---

### SAST-005: No CORS Policy Configured

- **Severity:** Medium
- **CWE:** CWE-942 (Permissive Cross-domain Policy)
- **File:** `Source/Backend/src/app.ts`
- **Description:** No CORS middleware is present. Express 4.x does not send CORS headers by default, so browser-originated cross-origin requests are silently blocked — but if `helmet` or any other middleware later adds permissive defaults, or if the app is placed behind a permissive reverse proxy, cross-origin access becomes uncontrolled. There is also no explicit allowlist of trusted origins for the frontend at `http://localhost:5173`.
- **Remediation:** `npm install cors` and configure explicit CORS policy: allow only the frontend origin (`VITE_API_BASE_URL` / `http://localhost:5173` in dev, production domain in prod). Restrict methods and headers. Do not use a wildcard origin.

---

### SAST-006: Unauthenticated Prometheus Metrics Endpoint

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
- **Description:** The `GET /metrics` Prometheus endpoint is publicly accessible with no authentication. It exposes operational counters (work item throughput, team dispatch rates, assessment verdicts, cycle detection rates). This leaks system behavior and throughput data to any unauthenticated caller and can be used to infer internal state (e.g., team workload, assessment rejection rates).
- **Remediation:** Restrict `/metrics` to internal network access (via reverse proxy IP allowlist), or require a `Authorization: Bearer <scrape-token>` header checked against an environment variable.

---

### SAST-007: Pagination Parameters Not Validated for NaN or Range Overflow

- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation), CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** `parseInt()` silently returns `NaN` if the input is non-numeric (e.g., `?page=abc`), and there is no guard against `NaN`, negative values, zero, or arbitrarily large limits (e.g., `?limit=999999`). A large `limit` value causes the store to allocate a slice containing all in-memory items in a single response, which is a DoS vector as data grows.
- **Remediation:** Validate that parsed values are finite positive integers: `const page = Math.max(1, parseInt(...) || 1)`. Cap `limit` to a maximum (e.g., 100). Return `400 Bad Request` for non-numeric inputs.

---

### SAST-008: DebugPortalPage iframe Missing `sandbox` Attribute

- **Severity:** Medium
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-14`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The debug portal iframe has no `sandbox` attribute, granting the framed content full JavaScript execution, form submission, and same-origin access privileges. The `portalUrl` is sourced from `import.meta.env.VITE_PORTAL_URL`, which if misconfigured or injected via the environment could load an attacker-controlled URL with full browser capabilities. Even with a legitimate URL, the lack of `sandbox` violates least-privilege for iframe embedding.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin allow-forms"` (or a minimally required subset). Validate that `VITE_PORTAL_URL` matches a trusted origin allowlist at build time.

---

### SAST-009: No Rate Limiting on Any API Endpoint

- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts` (absence of middleware)
- **Description:** No rate-limiting middleware (`express-rate-limit` or similar) is configured on any endpoint. The intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) and workflow mutation endpoints can be called at unlimited frequency. This enables resource exhaustion via rapid work item creation, and amplifies the impact of missing authentication (SAST-001).
- **Remediation:** Add `express-rate-limit` globally or per-route. Webhook intake endpoints should have stricter limits (e.g., 60 req/min). Combine with authentication (SAST-001) for defence in depth.
- **Handoff:** [HANDOFF → pen-tester] — stress-test unauthenticated intake endpoint to confirm resource exhaustion.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication middleware | **High** | CWE-306 |
| SAST-002 | Intake webhooks: no auth + no input validation | **High** | CWE-20, CWE-306 |
| SAST-003 | Internal error messages leaked to clients | **High** | CWE-209 |
| SAST-004 | No HTTP security headers (Helmet missing) | Medium | CWE-693, CWE-1021 |
| SAST-005 | No CORS policy | Medium | CWE-942 |
| SAST-006 | Unauthenticated /metrics endpoint | Medium | CWE-200 |
| SAST-007 | Unvalidated pagination parameters | Medium | CWE-20, CWE-770 |
| SAST-008 | Debug iframe missing `sandbox` attribute | Medium | CWE-1021 |
| SAST-009 | No rate limiting on any endpoint | Medium | CWE-770 |

**Totals:** 3 High · 6 Medium · 0 Low · 0 Critical  
**No hardcoded secrets found** in first-party source code.  
**No dangerous API patterns** (eval, exec, shell injection, unsafe deserialization) detected.
