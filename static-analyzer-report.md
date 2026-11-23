## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — LLM pattern scan performed instead (0 hardcoded secrets found in first-party code)
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — LLM pattern scan performed instead — 8 findings

---

### SAST-01: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-862 (Missing Authorization)
- **File:** `Source/Backend/src/app.ts:1-54`
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
- **Description:** The entire Express API has zero authentication or authorization middleware. Any unauthenticated caller can create, read, update, soft-delete, approve, reject, or dispatch any work item. The `/approve` endpoint is particularly critical — it allows any anonymous HTTP client to bypass the Assessment Pod and manually approve a work item, violating the core business control.
- **Remediation:** Add an authentication middleware (e.g., JWT Bearer token validation via `express-jwt` or `passport-jwt`) applied globally before all routes. Add role-based authorization guards on state-mutating endpoints (`/approve`, `/reject`, `/dispatch`, `/route`).
- **Handoff:** `[HANDOFF → pen-tester]` — Verify exploit chains: unauthenticated approve/dispatch bypass, unauthorized state machine manipulation.

---

### SAST-02: Webhook Endpoints Accept Requests Without Signature Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-56`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No X-Zendesk-Webhook-Signature or HMAC-SHA256 verification
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept arbitrary POST requests with no cryptographic verification that requests originate from the legitimate webhook source. An attacker can forge Zendesk webhook payloads to inject arbitrary work items, potentially poisoning the workflow with crafted or malicious content.
- **Remediation:** Implement HMAC-SHA256 signature verification for Zendesk webhooks using the `X-Zendesk-Webhook-Signature` header and a shared secret stored in an environment variable. For the automated endpoint, require a pre-shared bearer token in the `Authorization` header.
- **Handoff:** `[HANDOFF → pen-tester]` — Verify forged webhook injection via unauthenticated POST to `/api/intake/zendesk`.

---

### SAST-03: Internal Error Messages Returned to Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:59-63` (and lines 87-90, 137-140, 203-207, 291-295, 348-351)
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw err.message to client
  }
  ```
- **Description:** Every try/catch block in `workflow.ts` returns the raw `err.message` string to the client in the HTTP 500 response body. This can expose internal implementation details, file paths, library internals, or database error specifics to an attacker. Note: `errorHandler.ts` correctly returns a generic message, but individual route handlers bypass it.
- **Remediation:** Replace `res.status(500).json({ error: message })` with `res.status(500).json({ error: 'Internal server error' })`. Log the full `err.message` server-side only (which already happens on the preceding line).

---

### SAST-04: Missing HTTP Security Headers (No Helmet)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts:11-18`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet(), no manual security headers
  ```
- **Description:** The Express application does not set any HTTP security headers. Missing headers include: `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options`, `X-XSS-Protection`, and `Referrer-Policy`. This leaves the application and its users exposed to clickjacking, MIME-sniffing, and cross-site scripting attacks.
- **Remediation:** Install and configure `helmet`: `import helmet from 'helmet'; app.use(helmet());` before any route registration. Customize the CSP to match the application's trusted sources.

---

### SAST-05: Unbounded Pagination `limit` Parameter — Denial of Service
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation), CWE-770 (Allocation of Resources Without Limits)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70` and `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,  // no max cap
  };
  ```
- **Description:** The `limit` query parameter is accepted without an upper-bound cap. An attacker can pass `?limit=99999999` to force the server to serialize the entire in-memory store into a single response, exhausting server memory and CPU under load.
- **Remediation:** Clamp the limit to a maximum: `const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);`. Apply the same fix in `dashboard.ts`.

---

### SAST-06: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Description:** No rate limiting middleware (e.g., `express-rate-limit`) is applied to any endpoint. The API is vulnerable to brute-force attacks, DoS via high-frequency requests, and memory exhaustion via unbounded work item creation. The in-memory store grows indefinitely with no eviction, making repeated `POST /api/work-items` calls a viable DoS vector.
- **Remediation:** Install `express-rate-limit` and apply a global limiter (`app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))`). Apply stricter limits on mutation endpoints (`POST`, `PATCH`, `DELETE`).

---

### SAST-07: Prometheus `/metrics` Endpoint Exposed Without Authentication
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
- **Description:** The Prometheus scrape endpoint is accessible to any unauthenticated client. While the metrics do not contain PII directly, they expose operational counters (item creation rates, dispatch team labels, cycle detection events) that reveal internal system behavior and could aid reconnaissance.
- **Remediation:** Restrict `/metrics` to internal networks via firewall rules or IP allowlisting, or add a `Bearer` token check using an env-variable secret.

---

### SAST-08: `<iframe>` Without `sandbox` Attribute in DebugPortalPage
- **Severity:** Low
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-13`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The embedded iframe has no `sandbox` attribute. Without sandboxing, the embedded origin (`VITE_PORTAL_URL`, defaulting to `http://localhost:4200`) can execute scripts, submit forms, and access the top-level window context. If the portal URL is misconfigured or the embed target is compromised, this enables script injection into the parent frame.
- **Remediation:** Add a restrictive sandbox: `sandbox="allow-scripts allow-same-origin allow-forms"`. Remove individual permissions only as specifically required.

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-01 | No Authentication or Authorization | **High** | CWE-306, CWE-862 |
| SAST-02 | Webhook Endpoints Without Signature Verification | **High** | CWE-345 |
| SAST-03 | Internal Error Messages Returned to Clients | Medium | CWE-209 |
| SAST-04 | Missing HTTP Security Headers (No Helmet) | Medium | CWE-693 |
| SAST-05 | Unbounded Pagination `limit` — DoS | Medium | CWE-20, CWE-770 |
| SAST-06 | No Rate Limiting | Medium | CWE-770 |
| SAST-07 | Unauthenticated `/metrics` Endpoint | Low | CWE-200 |
| SAST-08 | iframe Without `sandbox` Attribute | Low | CWE-1021 |

**Totals:** 2 High · 4 Medium · 2 Low · 0 hardcoded secrets found in first-party code

**Grade contribution (per `security.config.yml`):** 2 High findings puts this at grade **B** threshold (max 6 High allowed for B). The two High findings should be prioritized for immediate remediation.
