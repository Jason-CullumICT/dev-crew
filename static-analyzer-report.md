---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — fell back to LLM pattern scan
- **semgrep**: [TOOL UNAVAILABLE] — fell back to LLM pattern scan
- **npm scripts check**: No suspicious postinstall scripts found
- **Scope scanned**: `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No auth middleware anywhere in the chain
  app.use('/api/work-items', workItemsRouter);  // Full CRUD + state transitions
  app.use('/api/work-items', workflowRouter);   // Approve/reject/dispatch
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** The entire Express API has zero authentication middleware. All endpoints — including workflow state transitions (approve, reject, dispatch), data mutation (create, update, delete), and the intake webhook receivers — are publicly accessible to any caller. Any unauthenticated actor can approve/reject work items, dispatch teams, or soft-delete records.
- **Remediation:** Add authentication middleware (JWT bearer, API key, or session) before all `/api/*` routes in `app.ts`. For the intake endpoints, add separate webhook secret/HMAC validation.
- **Handoff:** [HANDOFF → pen-tester] to verify exploitability of unauthenticated state manipulation.

---

### SAST-002: Webhook Intake Endpoints Lack Signature Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:10-55`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No Zendesk webhook signature (X-Zendesk-Webhook-Signature) validation
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept arbitrary POST bodies without verifying they originate from the declared source. An attacker can forge Zendesk events to spam the work-item queue with crafted data. Zendesk provides an `X-Zendesk-Webhook-Signature` HMAC-SHA256 header that should be validated against a shared secret.
- **Remediation:** Validate `X-Zendesk-Webhook-Signature` using HMAC-SHA256 against a `ZENDESK_WEBHOOK_SECRET` env variable before processing any Zendesk payload. For `/automated`, require a bearer API key.

---

### SAST-003: Internal Error Messages Returned to Clients (CWE-209)
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:59-63, 86-90, 136-140, 203-208, 291-295`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw err.message to client
  }
  ```
- **Description:** Every workflow route catch-block returns `err.message` verbatim in the 500 HTTP response. While today the messages are fairly generic, this pattern will leak internal implementation details (stack paths, service names, data shapes) if the code evolves or an unexpected exception occurs. The global `errorHandler` middleware correctly returns a generic message, but the per-route catches bypass it.
- **Remediation:** In catch blocks, log the full message server-side but return a sanitized generic response: `res.status(500).json({ error: 'Internal server error' })`. Reserve specific error text for known user-facing errors (400-class) where it is intentional.

---

### SAST-004: Intake Route Accepts Unvalidated `type` and `priority` Values
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22-23, 45-46`
- **Code Snippet:**
  ```typescript
  // Zendesk intake — no enum validation on body.type or body.priority
  const item = store.createWorkItem({
    type: body.type || WorkItemType.Bug,       // ← truthy invalid string passes through
    priority: body.priority || WorkItemPriority.Medium,  // ← same
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** The intake endpoints use `body.type || default` fallback logic. If an attacker provides a non-empty, non-enum string (e.g., `type: "__proto__"` or `type: "exploit"`), it will be stored verbatim. The `/api/work-items` POST route correctly validates against `Object.values(WorkItemType)`, but intake does not. This creates data corruption and inconsistency in downstream filtering/metrics.
- **Remediation:** Add the same enum-guard used in `workItems.ts:29-40` to both intake routes:
  ```typescript
  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Invalid type' }); return;
  }
  ```

---

### SAST-005: Pagination `limit` Parameter Has No Maximum Cap
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70` / `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  // No upper-bound check — ?limit=9999999 dumps entire dataset
  ```
- **Description:** The `limit` query parameter is parsed from user input with no upper-bound validation. An attacker (or misconfigured client) can request `?limit=999999`, forcing the server to serialize the entire in-memory store in a single response. This is a denial-of-service and data-enumeration vector. The same issue exists in the dashboard activity endpoint.
- **Remediation:** Clamp the limit to a maximum value before use:
  ```typescript
  const MAX_LIMIT = 100;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, MAX_LIMIT);
  ```

---

### SAST-006: No Security Headers or CORS Policy Configured
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts:11-20`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet(), no cors(), no Content-Security-Policy, no X-Frame-Options, no HSTS
  ```
- **Description:** The Express application applies no HTTP security headers. The absence of `helmet` means responses lack `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and `Referrer-Policy`. No CORS policy is configured, meaning any origin can make cross-origin API requests — particularly concerning since there is no authentication to otherwise gate access.
- **Remediation:**
  1. Install and configure `helmet`: `app.use(helmet())` at the top of the middleware chain.
  2. Configure `cors` with an allowlist: `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }))`.

---

### SAST-007: Prometheus `/metrics` Endpoint Is Publicly Accessible
- **Severity:** Low
- **CWE:** CWE-200 (Exposure of Sensitive Information)
- **File:** `Source/Backend/src/app.ts:34-37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());  // No auth check
  });
  ```
- **Description:** The Prometheus metrics endpoint exposes operational counters (`workflow_items_created_total`, `workflow_items_dispatched_total`, team assignment labels, etc.) without authentication. This leaks information about workload volume, team names, and system behavior to any caller.
- **Remediation:** Restrict `/metrics` to internal network access (e.g., via a separate port or an IP allowlist) or add a bearer token check:
  ```typescript
  app.get('/metrics', requireMetricsToken, async (_req, res) => { ... });
  ```

---

### SAST-008: No Rate Limiting on Any Endpoint
- **Severity:** Low
- **CWE:** CWE-770 (Allocation of Resources Without Limits)
- **File:** `Source/Backend/src/app.ts` (entire app)
- **Description:** No rate-limiting middleware (`express-rate-limit` or equivalent) is present. All endpoints — including the intake webhooks, workflow actions, and list/search routes — can be hammered without throttling. This enables DoS attacks and brute-force attempts against the state machine.
- **Remediation:** Add `express-rate-limit` as global middleware with sensible per-IP limits (e.g., 100 req/15 min), with stricter limits on mutation endpoints.

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306 |
| SAST-002 | Webhook intake lacks HMAC signature verification | **High** | CWE-345 |
| SAST-003 | Internal error messages returned to clients | **Medium** | CWE-209 |
| SAST-004 | Intake routes accept unvalidated type/priority | **Medium** | CWE-20 |
| SAST-005 | Pagination limit has no maximum cap | **Medium** | CWE-400 |
| SAST-006 | No security headers or CORS policy | **Medium** | CWE-693 |
| SAST-007 | Unauthenticated `/metrics` endpoint | **Low** | CWE-200 |
| SAST-008 | No rate limiting on any endpoint | **Low** | CWE-770 |

**Grade assessment per `security.config.yml` scale:**  
2 High findings + 3 Medium → **Grade B** (≤6 High, no Critical). Would drop to **C** if the pen-tester confirms SAST-001 results in a real authorization bypass of a critical objective.

No hardcoded secrets found in first-party code. `.env.example` contains a placeholder `GITHUB_TOKEN=` (empty, correct pattern). Learnings file updated at `Teams/TheGuardians/learnings/static-analyzer.md`.
