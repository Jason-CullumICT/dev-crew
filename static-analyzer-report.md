---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — LLM pattern scan substituted for secrets
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — exits 0 with no output (not installed); LLM scan substituted

No hardcoded secrets found in first-party code. `platform/.env.example` has `GITHUB_TOKEN=` intentionally blank.

---

### SAST-001: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-862 (Missing Authorization)
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
- **Description:** The Express application mounts every route — including state-changing operations (approve, reject, dispatch, delete) — with zero authentication or authorization middleware. Any unauthenticated HTTP client can create, read, update, soft-delete, approve, reject, and dispatch work items. There are no tokens, sessions, API keys, or IP restrictions.
- **Remediation:** Add an authentication middleware (e.g. a shared `X-API-Key` header verified against an env var, or JWT validation) before all `/api/*` routes. Authorization checks (e.g. only certain roles may `approve`) should follow once identity is established.
- **Handoff:** [HANDOFF → pen-tester] — verify unauthenticated state transitions are exploitable end-to-end.

---

### SAST-002: `overrideRoute` Parameter Bypasses Assessment Pod Without Authorization
- **Severity:** High
- **CWE:** CWE-862 (Missing Authorization), CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workflow.ts:57` / `Source/Backend/src/services/router.ts:66-75`
- **Code Snippet:**
  ```typescript
  // workflow.ts — any caller can supply overrideRoute
  const updated = routeWorkItem(id, body?.overrideRoute);

  // router.ts — fast-track skips assessment entirely
  if (overrideRoute) {
    return {
      route: overrideRoute,
      targetStatus: overrideRoute === WorkItemRoute.FastTrack
        ? WorkItemStatus.Approved   // ← directly Approved, no assessment pod
        : WorkItemStatus.Proposed,
    };
  }
  ```
- **Description:** The `POST /api/work-items/:id/route` body accepts an `overrideRoute` field. Passing `"fast-track"` skips the entire assessment pod and sets the item directly to `Approved`. Because there is no authentication (SAST-001), any unauthenticated caller can fast-track any work item. Additionally, `overrideRoute` is not validated against the `WorkItemRoute` enum — an arbitrary string is stored as the `route` field, corrupting the type invariant.
- **Remediation:** (1) Require a privileged role/scope to set `overrideRoute`. (2) Validate `overrideRoute` against `Object.values(WorkItemRoute)` before use and reject unknown values with 400.
- **Handoff:** [HANDOFF → pen-tester] — confirm full bypass chain: create item → POST /route with fast-track body → item transitions to Approved without any assessment.

---

### SAST-003: Intake Webhooks Have No Signature Verification
- **Severity:** High
- **CWE:** CWE-290 (Authentication Bypass by Spoofing), CWE-346 (Origin Validation Error)
- **File:** `Source/Backend/src/routes/intake.ts:11-31` and `34-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;          // ← no HMAC / signature check
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept unauthenticated POST requests and immediately create work items from the supplied payload. The Zendesk webhook integration conventionally includes an HMAC-SHA256 signature in `X-Zendesk-Webhook-Signature` for authenticity verification; this is not checked. Any attacker can forge work item creation requests, flooding the queue or injecting malicious content.
- **Remediation:** Implement HMAC signature verification using a shared secret stored in an env var. Reject requests where the computed signature doesn't match.
- **Handoff:** [HANDOFF → pen-tester] — confirm forged Zendesk webhook creates real work items.

---

### SAST-004: Intake Routes Accept Unvalidated Enum Values for `type` and `priority`
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:19-24` and `42-47`
- **Code Snippet:**
  ```typescript
  // intake.ts — no enum validation unlike workItems.ts POST
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,       // ← arbitrary string accepted
    priority: body.priority || WorkItemPriority.Medium,  // ← arbitrary string accepted
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** Unlike the main `POST /api/work-items` route (which validates `type` and `priority` against their enums), the intake endpoints pass `body.type` and `body.priority` directly into the store. An attacker can supply arbitrary string values, creating work items with invalid enum values that may break downstream switch/match logic (e.g. the `assessAsWorkDefiner` type switch) or corrupt dashboard counts.
- **Remediation:** Add the same enum guards as in `workItems.ts`:
  ```typescript
  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }
  ```

---

### SAST-005: Unbounded Pagination — No `limit` Maximum or `NaN` Guard
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation), CWE-770 (Allocation of Resources Without Limits)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    // No isNaN check, no maximum cap
  };
  ```
- **Description:** `parseInt` on an invalid string (e.g. `?limit=abc`) returns `NaN`. `NaN` passed to `Array.slice()` is treated as 0, returning an empty page. More critically, there is no maximum cap on `limit` — an attacker (or accidental client) can pass `?limit=999999` to dump the entire in-memory store in one response, bypassing the intent of pagination and causing a large response payload.
- **Remediation:**
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
  ```

---

### SAST-006: Prometheus `/metrics` Endpoint Exposed Without Authentication
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
- **Description:** The Prometheus metrics endpoint is mounted on the same public port (3001) as the application API with no authentication. It exposes operational counters (items created, dispatched, assessed, dependency operations, cycle detection events) that reveal internal usage patterns and system behavior. In a production environment this endpoint should be protected or served on an internal-only port.
- **Remediation:** Either (a) require a bearer token for `/metrics`, (b) serve metrics on a separate internal-only port (e.g. 9091), or (c) use an IP allowlist middleware.

---

### SAST-007: Missing HTTP Security Headers (No `helmet`)
- **Severity:** Medium
- **CWE:** CWE-16 (Configuration), CWE-1021 (Improper Restriction of Rendered UI)
- **File:** `Source/Backend/src/app.ts:11`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ← No helmet() or manual security headers
  ```
- **Description:** The Express app does not use `helmet` or set any security headers manually. The following are absent: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Permissions-Policy`. Additionally, Express's default `X-Powered-By: Express` header is still being sent, advertising the framework and version to attackers.
- **Remediation:**
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());  // sets all security headers with safe defaults
  ```
  Add `helmet` to `package.json` dependencies.

---

### SAST-008: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts` (global scope)
- **Description:** There is no rate-limiting middleware anywhere in the application. Combined with the missing authentication (SAST-001), any unauthenticated caller can flood all endpoints — including expensive operations like dependency cycle detection (BFS graph traversal) — without any throttling. The `POST /api/work-items/:id/assess` endpoint in particular runs multiple assessment functions per call.
- **Remediation:** Add `express-rate-limit` globally or per-route:
  ```typescript
  import rateLimit from 'express-rate-limit';
  app.use(rateLimit({ windowMs: 60_000, max: 100 }));
  ```

---

### SAST-009: Internal Error Messages Returned to Clients in 500 Responses
- **Severity:** Low
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:60-63`, `:87-90`, `:138-141`, `:204-208`, `:291-295`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw err.message sent to client
  }
  ```
- **Description:** Catch blocks in all workflow route handlers return `err.message` directly to the HTTP client in 500 responses. While the global `errorHandler.ts` middleware correctly returns a generic message, these route-level catches bypass it and expose raw error strings. If an unexpected error (database error, internal exception) propagates, internal state details may be exposed.
- **Remediation:** For 500-class errors, return a generic client message while logging the detail server-side only:
  ```typescript
  logger.error({ msg: 'Action failed', error: message, workItemId: ... });
  res.status(500).json({ error: 'Internal server error' });
  ```
  Business-logic errors (400/404) may still return descriptive messages.

---

### SAST-010: `DebugPortalPage` iframe Lacks `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-693 (Protection Mechanism Failure), CWE-1021 (Improper Restriction of Rendered UI)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-15`
- **Code Snippet:**
  ```tsx
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
  return (
    <div ...>
      <iframe
        src={portalUrl}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Debug Portal"
      />   {/* ← no sandbox attribute, http:// URL */}
    </div>
  );
  ```
- **Description:** The iframe has no `sandbox` attribute, granting the embedded content the same origin permissions as the parent page. The default URL uses `http://` which is unencrypted. If `VITE_PORTAL_URL` is misconfigured to an attacker-controlled URL, the embedded content can execute scripts, access the parent DOM, and perform form submissions.
- **Remediation:**
  ```tsx
  <iframe
    src={portalUrl}
    sandbox="allow-scripts allow-same-origin"
    title="Debug Portal"
  />
  ```
  Also ensure `VITE_PORTAL_URL` is validated to only allow trusted origins.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306, CWE-862 |
| SAST-002 | `overrideRoute` bypasses assessment pod without authorization | **High** | CWE-862, CWE-20 |
| SAST-003 | Intake webhooks have no signature verification | **High** | CWE-290, CWE-346 |
| SAST-004 | Intake routes accept unvalidated enum fields | Medium | CWE-20 |
| SAST-005 | Unbounded pagination — no `limit` max or NaN guard | Medium | CWE-20, CWE-770 |
| SAST-006 | `/metrics` endpoint exposed without authentication | Medium | CWE-200 |
| SAST-007 | Missing HTTP security headers (no helmet) | Medium | CWE-16, CWE-1021 |
| SAST-008 | No rate limiting | Medium | CWE-770 |
| SAST-009 | Internal error messages returned in 500 responses | Low | CWE-209 |
| SAST-010 | `DebugPortalPage` iframe lacks sandbox attribute | Low | CWE-693, CWE-1021 |

**Totals:** 3 High · 5 Medium · 2 Low · 0 Critical · **10 findings total**

**Grading per `security.config.yml`:** 3 High → falls in Grade **B** (max_high: 6).

> **Dependency audit scope note:** No third-party CVEs were scanned (`npm audit` not run for package CVEs). The `pino` package is imported in `package.json` but not used in the bundled `utils/logger.ts` — if it is used elsewhere, its version should be checked by `[SEE dependency-auditor]`.
