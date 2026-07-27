---

## Static Analyzer Results

### Tools Run
- **gitleaks:** `[TOOL UNAVAILABLE]` — fell back to LLM pattern scan for secrets
- **semgrep:** `[TOOL UNAVAILABLE]` — fell back to LLM pattern scan for all SAST patterns

---

### SAST-001: No Authentication Middleware on Any Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts` (entire file — no auth middleware registered)
- **Code Snippet:**
  ```typescript
  app.use(express.json());
  // ← no auth middleware here or anywhere
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** The Express application registers zero authentication or authorization middleware. Every API endpoint — work item CRUD, all workflow state transitions (route, assess, approve, reject, dispatch), dashboard data, and intake webhooks — is fully accessible to any unauthenticated caller. There is no JWT validation, session check, API key guard, or access control at any layer.
- **Remediation:** Add an authentication middleware (e.g., `express-jwt`, `passport`, or a custom API-key guard) as the first `app.use()` call, before any route registrations. Exempt only truly public endpoints (e.g., `/health`).
- **Handoff:** `[HANDOFF → pen-tester]` — actively exploit by calling state-transition endpoints without any credentials.

---

### SAST-002: No CORS Configuration
- **Severity:** High
- **CWE:** CWE-942 (Permissive Cross-domain Policy with Untrusted Domains)
- **File:** `Source/Backend/src/app.ts`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No cors() middleware, no Access-Control-Allow-Origin header
  ```
- **Description:** No CORS middleware (`cors` npm package or manual `Access-Control-Allow-Origin` headers) is configured. Express does not add CORS headers by default, so browser-initiated cross-origin requests from arbitrary domains will be blocked at the browser level — but this means the security boundary is entirely browser-enforced. More critically, non-browser clients (curl, scripts, Postman) have no restriction whatsoever. Without CORS configured, the policy is ambiguous: either too open (if later a wildcard is added) or silently broken for legitimate cross-origin frontend calls.
- **Remediation:** Install and configure the `cors` package. Restrict `origin` to only the known frontend URL (e.g., `http://localhost:5173` in development, the production domain in prod). Do not use `origin: '*'` on endpoints that will carry cookies or tokens.
- **Handoff:** None — this is a configuration gap, not an active exploit chain.

---

### SAST-003: No HTTP Security Headers
- **Severity:** High
- **CWE:** CWE-16 (Configuration), CWE-1021 (Improper Restriction of Rendered UI Layers)
- **File:** `Source/Backend/src/app.ts`
- **Code Snippet:**
  ```typescript
  // No helmet(), no manual header middleware
  app.use(express.json());
  ```
- **Description:** The application ships with no HTTP security headers. Missing headers include:
  - **Content-Security-Policy (CSP):** allows XSS escalation
  - **X-Frame-Options / frame-ancestors CSP:** allows clickjacking
  - **Strict-Transport-Security (HSTS):** allows protocol downgrade
  - **X-Content-Type-Options: nosniff:** allows MIME-type sniffing attacks
  - **Referrer-Policy:** leaks URL information to third parties
- **Remediation:** Add `helmet()` as the first middleware in `app.ts`: `import helmet from 'helmet'; app.use(helmet());`. Tune the CSP policy to match the frontend's actual script and style sources.

---

### SAST-004: Intake Webhooks Accept Unvalidated Requests (No Signature Verification)
- **Severity:** High
- **CWE:** CWE-287 (Improper Authentication), CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No signature header check, no IP allowlist, no API key
    const item = store.createWorkItem({
      title: body.title,
      description: body.description,
      type: body.type || WorkItemType.Bug,      // ← no enum validation
      priority: body.priority || WorkItemPriority.Medium,  // ← no enum validation
      source: WorkItemSource.Zendesk,
    });
  ```
- **Description:** Two intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) accept work item creation from any source with no authentication. Real Zendesk webhooks include an `X-Zendesk-Webhook-Signature` HMAC header for origin verification — this is not checked. Additionally, `body.type` and `body.priority` are used without validating against `WorkItemType` / `WorkItemPriority` enum values, meaning arbitrary strings can be injected into stored work items.
- **Remediation:** (1) Verify the Zendesk webhook signature using the shared secret (HMAC-SHA256 of the raw body). (2) Validate `body.type` and `body.priority` against their respective enums exactly as done in `workItems.ts:29–47`. (3) Consider an API key or IP allowlist for the automated endpoint.
- **Handoff:** `[HANDOFF → pen-tester]` — test injection of malformed `type`/`priority` values and unauthorized work item creation.

---

### SAST-005: Internal Exception Messages Leaked to HTTP Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:62, 89, 140, 207, 294, 350, 370`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw exception message returned to client
  }
  ```
- **Description:** All seven `catch` blocks in `workflow.ts` return the raw `Error.message` from caught exceptions directly in the HTTP 500 response body. If an underlying library throws an error containing internal state (e.g., file paths, stack details, database internals), that information is exposed to the caller. The `errorHandler` middleware in `errorHandler.ts` correctly returns a generic message — but these route-level catches bypass it.
- **Remediation:** Replace `res.status(500).json({ error: message })` with `res.status(500).json({ error: 'Internal server error' })` in all catch blocks. Log the full `message` server-side (already done), but never echo it to clients.

---

### SAST-006: Prometheus `/metrics` Endpoint Is Publicly Accessible
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
- **Description:** The Prometheus metrics endpoint is registered without any authentication or network-level restriction. It exposes internal counters (work item counts by state, dispatch rates, circuit counts) to any unauthenticated caller. This leaks operational intelligence about the system's internal behavior.
- **Remediation:** Either (a) add an auth guard specific to `/metrics` (token or IP allowlist), or (b) move metrics to a separate internal-only port using a second Express listener that is never exposed externally.

---

### SAST-007: Unbounded Pagination `limit` Parameter — No NaN Guard, No Maximum Cap
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation), CWE-770 (Allocation of Resources Without Limits)
- **File:** `Source/Backend/src/routes/workItems.ts:69–70`, `Source/Backend/src/routes/dashboard.ts:17–18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    // No isNaN() guard, no maximum cap
  };
  ```
- **Description:** `parseInt` returns `NaN` when given non-numeric input (e.g., `?limit=abc`). `NaN` propagates through arithmetic in `findAll()`, causing `Math.ceil(total / NaN)` → `NaN` and `result.slice(NaN, NaN)` → `[]`. The response returns with `totalPages: NaN` which corrupts the API contract. Additionally, a caller can send `?limit=999999999` to force the store to serialize all records in one response, a potential denial-of-service on large datasets.
- **Remediation:** Add input guards:
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
  ```

---

### SAST-008: Query String Filter Parameters Cast Without Runtime Enum Validation
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:62–65`
- **Code Snippet:**
  ```typescript
  const filters = {
    status: req.query.status as WorkItemStatus | undefined,
    type:   req.query.type   as WorkItemType   | undefined,
    // ... TypeScript cast only, no runtime check
  };
  ```
- **Description:** TypeScript `as` casts are compile-time only and provide zero runtime protection. An arbitrary string for `?status=INJECTED` is silently accepted and passed to `store.findAll()`. The filter simply fails to match any items (no data leakage), but it silently accepts invalid enum values rather than returning a `400 Bad Request`, making the API inconsistent and masking client bugs.
- **Remediation:** Validate each filter value against the corresponding `Object.values(Enum)` before use, and return `400` for invalid values, consistent with the POST validation pattern already used in the same file.

---

### SAST-009: Debug Portal `<iframe>` Lacks `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9–13`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
    // No sandbox attribute
  />
  ```
- **Description:** The iframe embedding the debug portal runs with full browser privileges: it can execute scripts, navigate the parent frame, access `window.top`, submit forms, and open popups. If `VITE_PORTAL_URL` is misconfigured to point to a malicious URL, the embedded page could exfiltrate session data from the parent application.
- **Remediation:** Add a restrictive `sandbox` attribute: `sandbox="allow-scripts allow-same-origin"`. Remove `allow-top-navigation` and `allow-forms` unless explicitly required.

---

### SAST-010: No Rate Limiting on Any Endpoint
- **Severity:** Low
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts`
- **Description:** No rate-limiting middleware (`express-rate-limit` or similar) is applied to any endpoint. All state-transition endpoints (route, assess, approve, reject, dispatch) and the intake webhooks can be called at unlimited frequency, enabling resource exhaustion and operational abuse.
- **Remediation:** Add `express-rate-limit` as a global middleware with a reasonable default (e.g., 100 req/min per IP), with stricter limits on state-mutation endpoints and the intake webhook routes.

---

### Additional Observations (Non-Findings)

- **No hardcoded secrets found** in any first-party source file (`Source/`). Environment variables are used correctly (`process.env.PORT`, `VITE_API_BASE_URL`, `VITE_PORTAL_URL`).
- **No dangerous code execution patterns** (`eval`, `Function()`, `child_process`, `innerHTML`) found in any source file.
- **No weak cryptography** (MD5, SHA1, DES, `Math.random()` for tokens) detected.
- **Error handler is correct** in `errorHandler.ts` — it returns a generic `'Internal server error'` message and logs internally. The issue is that route-level catches bypass it (SAST-005 above).
- **Missing `/api/search` route:** The frontend `api/client.ts:101` calls `GET /api/search?q=...` but no corresponding backend route file exists. This is an unimplemented feature, not a security issue — flagging for pen-tester awareness.
- **`[SEE dependency-auditor]`** for `express@^4.18.2` — check for known CVEs in Express 4.x range.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication middleware | **High** | CWE-306 |
| SAST-002 | No CORS configuration | **High** | CWE-942 |
| SAST-003 | No HTTP security headers | **High** | CWE-16 |
| SAST-004 | Unauthenticated intake webhooks + no enum validation | **High** | CWE-287, CWE-20 |
| SAST-005 | Internal exception messages leaked to clients | Medium | CWE-209 |
| SAST-006 | Unauthenticated `/metrics` endpoint | Medium | CWE-200 |
| SAST-007 | Unbounded pagination `limit` (NaN + no max cap) | Medium | CWE-20, CWE-770 |
| SAST-008 | Query filters cast without runtime enum validation | Low | CWE-20 |
| SAST-009 | Debug portal iframe missing `sandbox` attribute | Low | CWE-1021 |
| SAST-010 | No rate limiting on any endpoint | Low | CWE-770 |

**Totals: 4 High, 3 Medium, 3 Low — 10 confirmed findings**
