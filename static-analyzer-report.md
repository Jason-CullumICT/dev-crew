---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — not installed; fell back to LLM pattern scan for secrets
- **semgrep**: [TOOL UNAVAILABLE] — not installed; fell back to LLM pattern scan for all SAST patterns
- **LLM Pattern Scan**: Completed across `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

### SAST-001: Complete Absence of Authentication on All API Endpoints
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:22–31`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);   // no auth middleware
  app.use('/api/work-items', workflowRouter);    // no auth middleware
  app.use('/api/dashboard', dashboardRouter);    // no auth middleware
  app.use('/api/intake', intakeRouter);          // no auth middleware
  ```
- **Description:** Every API route — CRUD, workflow transitions (approve/reject/dispatch), dashboard, and intake webhooks — is mounted with zero authentication or authorization middleware. Any unauthenticated caller can create, modify, delete, approve, or dispatch work items.
- **Remediation:** Add an auth middleware (e.g., JWT verification, API key check) before all `/api/*` routes. Apply role-based access control for mutation endpoints (`POST`, `PATCH`, `DELETE`) vs. read-only routes.
- **Handoff:** [HANDOFF → pen-tester] for active privilege-escalation and unauthorized state-transition chains.

---

### SAST-002: Webhook Intake Lacks HMAC/Signature Verification (CWE-346)
- **Severity:** High
- **CWE:** CWE-346 (Origin Validation Error), CWE-290 (Authentication Bypass by Spoofing)
- **File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;           // no signature check
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  ```
- **Description:** The Zendesk and automated intake endpoints accept any POST with a `title` and `description` body — no HMAC-SHA256 signature verification (Zendesk standard), no API key header, no IP allowlist. An attacker can inject arbitrary work items into the workflow queue at will.
- **Remediation:** Verify `X-Zendesk-Webhook-Signature` (HMAC-SHA256) against a shared secret stored in `process.env.ZENDESK_WEBHOOK_SECRET`. For `/automated`, require a bearer token or API key header.

---

### SAST-003: Unvalidated Enum Inputs in Intake Webhook
- **Severity:** High
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22–23`, `45–46`
- **Code Snippet:**
  ```typescript
  type: body.type || WorkItemType.Bug,         // truthy body.type bypasses validation
  priority: body.priority || WorkItemPriority.Medium,
  ```
- **Description:** The `||` fallback only triggers for falsy values (`null`, `undefined`, `""`). Any non-empty truthy string (e.g., `"hacked"`, `"admin"`) is accepted and stored verbatim as the `type` or `priority` field without enum validation. The `/api/work-items` POST route validates enums correctly; the intake routes do not. This inconsistency allows data integrity violations and may bypass routing/assessment logic that trusts these fields.
- **Remediation:** Apply the same enum validation as `workItems.ts` (lines 29–42): check `Object.values(WorkItemType).includes(body.type)` before accepting. Reject with 400 on invalid values.

---

### SAST-004: Prometheus `/metrics` Endpoint Unauthenticated (Information Exposure)
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
- **Description:** The Prometheus metrics endpoint is publicly accessible with no authentication. It exposes internal operational data including workflow throughput, team assignment patterns, dispatch rates, and Go/Node runtime internals (`collectDefaultMetrics`). This provides an attacker with an accurate inventory of application activity and traffic patterns, which aids reconnaissance.
- **Remediation:** Restrict `/metrics` to internal networks (e.g., via reverse-proxy IP allowlist) or require a bearer token (`Authorization: Bearer $METRICS_TOKEN`). At minimum, remove it from public exposure.

---

### SAST-005: Unbounded Pagination `limit` Parameter — Potential Memory/DoS Vector
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** The `limit` query parameter is parsed and passed directly to `store.findAll()` with no upper bound. A caller can set `?limit=1000000` to dump the entire in-memory store in a single response, bypassing the pagination objective noted in the pentest config ("enumerate all work items without pagination limit enforcement"). Additionally `parseInt('abc')` returns `NaN`, which causes `slice(NaN, NaN)` to return an empty array rather than failing gracefully.
- **Remediation:** Enforce `const safeLimit = Math.min(Math.max(1, limit || 20), 100)` before passing to the store. Also add `isNaN(limit)` guard and return 400 for non-numeric input.
- **Handoff:** [HANDOFF → pen-tester] — matches a declared pentest objective for enumeration via unlimited pagination.

---

### SAST-006: Internal Error Messages Leaked to HTTP Clients (CWE-209)
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:62–63`, `88–89`, `139–140`, `206–207`, `293–295`, `349–350`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });   // raw message sent to client
  }
  ```
- **Description:** All six workflow action handlers (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, `/dependencies`) return the raw `Error.message` from caught exceptions in their 500 HTTP responses. While current error messages are relatively benign, this pattern is insecure by design: any future library error, database error, or internal assertion could expose stack paths, configuration details, or internal IDs to clients. The `errorHandler` middleware correctly sanitizes (returns `"Internal server error"`), but these in-handler catches bypass it.
- **Remediation:** Log the full error internally, but return a generic message to the client: `res.status(500).json({ error: 'Internal server error' })`. Map known, safe errors (like "not found", "invalid state") to their proper 4xx responses before the catch-all.

---

### SAST-007: Missing HTTP Security Headers (No Helmet or Equivalent)
- **Severity:** Medium
- **CWE:** CWE-16 (Configuration), OWASP A05:2021 – Security Misconfiguration
- **File:** `Source/Backend/src/app.ts` (entire file)
- **Description:** The Express app mounts no HTTP security header middleware. The following protection headers are absent from all responses:
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options` / `frame-ancestors`
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Permissions-Policy`
  Without CSP, any XSS in the frontend has no browser-level mitigation. Without `X-Frame-Options`, the app can be framed by malicious sites (clickjacking).
- **Remediation:** Install `helmet` (`npm i helmet`) and add `app.use(helmet())` before route registration in `app.ts`. Tune CSP for the application's actual asset origins.

---

### SAST-008: `DebugPortalPage` iframe Missing `sandbox` Attribute
- **Severity:** Medium
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9–15`
- **Code Snippet:**
  ```tsx
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The iframe embeds a URL from the `VITE_PORTAL_URL` env var with no `sandbox` attribute and no Content-Security-Policy `frame-src` directive. The embedded content runs with full origin privileges (same as the parent if same-origin, or with broad browser APIs if cross-origin). If the portal URL could be redirected to an attacker-controlled page (e.g., via open redirect or misconfigured env), it could perform actions within the parent app's DOM.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin"` (minimum needed for the portal), and limit to only what the debug portal requires. Add a CSP `frame-src` directive to restrict to the expected portal origin.

---

### SAST-009: No Rate Limiting on Any API Endpoint
- **Severity:** Medium
- **CWE:** CWE-799 (Improper Control of Interaction Frequency)
- **File:** `Source/Backend/src/app.ts` (all routes)
- **Description:** No rate-limiting middleware (e.g., `express-rate-limit`) is applied to any endpoint. The mutation endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, intake webhooks) can be called indefinitely by any caller. This enables automated abuse: bulk state manipulation, workflow flooding, DoS of the in-memory store, and brute-force enumeration of work item IDs.
- **Remediation:** Apply `express-rate-limit` globally with a sensible limit (e.g., 100 req/min per IP), with tighter limits on state-mutation routes (10 req/min). Consider IP-based allowlisting for intake webhooks.

---

### Summary

| ID | Title | Severity | CWE |
|---|---|---|---|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306 |
| SAST-002 | Webhook intake lacks HMAC verification | **High** | CWE-346 |
| SAST-003 | Unvalidated enum inputs in intake webhook | **High** | CWE-20 |
| SAST-004 | Unauthenticated `/metrics` endpoint | Medium | CWE-200 |
| SAST-005 | Unbounded pagination `limit` parameter | Medium | CWE-770 |
| SAST-006 | Internal error messages leaked to clients | Medium | CWE-209 |
| SAST-007 | Missing HTTP security headers | Medium | CWE-16 |
| SAST-008 | iframe missing `sandbox` attribute | Medium | CWE-1021 |
| SAST-009 | No rate limiting on any endpoint | Medium | CWE-799 |

**Hardcoded secrets:** None found. ✅  
**Dangerous APIs (eval/exec/shell injection):** None found. ✅  
**Insecure cryptography (MD5/SHA1/DES/weak RNG):** None found. ✅  

**Grade implication (per `security.config.yml`):** 3 High findings → **Grade C** at best (max_high for B is 6; Grade A allows ≤2 High). SAST-001 (no auth) is the blocking issue — if combined with a confirmed pen-tester breach it drops to **F**.
