---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — LLM fallback used for secret scanning
- **semgrep**: [TOOL UNAVAILABLE] — LLM fallback used for SAST pattern scanning

No hardcoded secrets found in first-party source code. `platform/.env.example` intentionally has empty values for `GITHUB_TOKEN` — correct.

---

### SAST-001: No Authentication or Authorization Middleware
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:12-44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No auth middleware registered
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Zero authentication or authorization middleware is registered. Any unauthenticated caller can create, read, update, soft-delete, route, approve, reject, and dispatch work items. The entire state machine is publicly writable. Approving, rejecting, or dispatching a work item requires no credentials.
- **Remediation:** Add an authentication middleware (e.g., JWT Bearer token validation via `express-jwt` or API key middleware) before all `/api/*` route registrations. Add RBAC checks in workflow-mutation routes (approve, reject, dispatch).
- **Handoff:** [HANDOFF → pen-tester] — verify exploitability: unauthenticated state transitions, unauthenticated creation.

---

### SAST-002: `overrideRoute` Not Validated Against Enum — Allows Fast-Track Bypass
- **Severity:** High
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workflow.ts:57`, `Source/Backend/src/services/router.ts:66-88`
- **Code Snippet:**
  ```typescript
  // workflow.ts — no enum validation before passing body.overrideRoute
  const updated = routeWorkItem(id, body?.overrideRoute);

  // router.ts — classifyRoute accepts any truthy string
  export function classifyRoute(item: WorkItem, overrideRoute?: WorkItemRoute): RouteResult {
    if (overrideRoute) {             // any truthy string passes this check
      return {
        route: overrideRoute,        // arbitrary string stored as route
        targetStatus:
          overrideRoute === WorkItemRoute.FastTrack
            ? WorkItemStatus.Approved   // "fast-track" bypasses assessment pod
            : WorkItemStatus.Proposed,
      };
    }
  ```
- **Description:** The `POST /api/work-items/:id/route` handler passes `body.overrideRoute` directly to `classifyRoute` without checking whether the value is a member of the `WorkItemRoute` enum. An unauthenticated attacker can submit `{ "overrideRoute": "fast-track" }` to instantly approve any backlog item, bypassing the entire assessment pod (CWE-284). Additionally, any non-empty string value is accepted and persisted as the `route` field, corrupting data integrity.
- **Remediation:** Add an enum validation guard in the route handler before calling `routeWorkItem`:
  ```typescript
  if (body?.overrideRoute && !Object.values(WorkItemRoute).includes(body.overrideRoute)) {
    res.status(400).json({ error: 'Invalid overrideRoute value' });
    return;
  }
  ```
- **Handoff:** [HANDOFF → pen-tester] — verify that sending `{"overrideRoute":"fast-track"}` bypasses assessment on a live instance.

---

### SAST-003: Intake Webhook Endpoints Accept Unvalidated Enum Values
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    // No enum validation on body.type or body.priority:
    const item = store.createWorkItem({
      type: body.type || WorkItemType.Bug,          // unvalidated
      priority: body.priority || WorkItemPriority.Medium,  // unvalidated
      source: WorkItemSource.Zendesk,
    });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept `body.type` and `body.priority` from untrusted webhook payloads without validating them against the `WorkItemType` and `WorkItemPriority` enums. The CRUD route (`POST /api/work-items`) correctly validates these fields, but the intake routes do not, allowing arbitrary strings to be stored in enum fields.
- **Remediation:** Add enum validation matching the pattern used in `Source/Backend/src/routes/workItems.ts:29-42`:
  ```typescript
  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Invalid type value' });
    return;
  }
  ```

---

### SAST-004: Internal Error Messages Returned Verbatim to API Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:62,89,140,207,294,350,370`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // raw internal message sent to client
  }
  ```
- **Description:** All catch blocks in `workflow.ts` return the raw exception message directly in 500-level HTTP responses. Internal service error messages may contain sensitive information such as internal IDs, code paths, store state, or data layer details that assist attackers in reconnaissance.
- **Remediation:** Return a generic message to clients while logging the full error server-side:
  ```typescript
  res.status(500).json({ error: 'Internal server error' });
  // Keep: logger.error({ msg: '...', error: message, ... });
  ```

---

### SAST-005: No Webhook Signature Validation on Intake Endpoints
- **Severity:** Medium
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Description:** The `/api/intake/zendesk` endpoint accepts POST requests with no verification that they originate from Zendesk. There is no `X-Zendesk-Webhook-Secret` or HMAC-SHA256 signature check. An unauthenticated attacker can forge arbitrary Zendesk webhook payloads and inject work items into the system.
- **Remediation:** Implement HMAC-based signature verification using the `crypto` module. Zendesk signs webhooks with a shared secret in the `X-Zendesk-Webhook-Secret-Token` or `X-Hub-Signature` header. Reject requests where the computed HMAC does not match.

---

### SAST-006: No Rate Limiting on Any API Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts`
- **Description:** No rate-limiting middleware is applied to any endpoint. The intake webhook routes (`/api/intake/zendesk`, `/api/intake/automated`) are especially vulnerable: an attacker or misconfigured integration can flood the system with work items, exhausting the in-memory store and degrading service.
- **Remediation:** Add `express-rate-limit` middleware globally or per-route:
  ```typescript
  import rateLimit from 'express-rate-limit';
  const limiter = rateLimit({ windowMs: 60_000, max: 100 });
  app.use('/api/', limiter);
  ```

---

### SAST-007: No JSON Body Size Limit
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts:13`
- **Code Snippet:**
  ```typescript
  app.use(express.json()); // no { limit: '...' } option
  ```
- **Description:** `express.json()` is called without a body size limit. Express defaults to 100 kb, but this is not explicit and is easily overlooked when the team upgrades Express. An attacker can send very large JSON bodies to cause memory pressure.
- **Remediation:** Explicitly set a size limit:
  ```typescript
  app.use(express.json({ limit: '100kb' }));
  ```

---

### SAST-008: Prometheus `/metrics` Endpoint Publicly Accessible
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
- **Description:** The Prometheus metrics endpoint is exposed without authentication. While current metrics are counters for workflow operations (low sensitivity), the endpoint also includes default Node.js runtime metrics (memory, CPU, event loop lag, file descriptors) that provide system-level reconnaissance information to attackers.
- **Remediation:** Restrict `/metrics` to internal network access (e.g., via reverse proxy allow-list), or add IP-based middleware to block external callers.

---

### SAST-009: Pagination Parameters Not Range-Validated
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** The `page` and `limit` query parameters are parsed with `parseInt` but never validated for range. A request with `?limit=999999999` would attempt to return the entire in-memory store in one response. A negative `page` would produce an offset of `(page-1)*limit` that could be a large negative number (though `Array.slice` is safe with negative offsets in this implementation, the logic isn't defensive). `parseInt("abc")` returns `NaN`, which propagates silently.
- **Remediation:** Add range guards:
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = Number.isNaN(rawLimit) || rawLimit < 1 || rawLimit > 100 ? 20 : rawLimit;
  const rawPage = parseInt(req.query.page as string, 10);
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  ```

---

### Summary

| ID | Severity | CWE | Title |
|----|----------|-----|-------|
| SAST-001 | **High** | CWE-306 | No authentication/authorization on any API endpoint |
| SAST-002 | **High** | CWE-20 | `overrideRoute` unvalidated — assessment pod bypass possible |
| SAST-003 | Medium | CWE-20 | Intake webhooks accept unvalidated enum fields |
| SAST-004 | Medium | CWE-209 | Internal error messages leaked to clients |
| SAST-005 | Medium | CWE-345 | No webhook signature verification on Zendesk intake |
| SAST-006 | Medium | CWE-770 | No rate limiting on any API endpoint |
| SAST-007 | Medium | CWE-770 | No JSON body size limit |
| SAST-008 | Low | CWE-200 | Prometheus `/metrics` accessible without auth |
| SAST-009 | Low | CWE-20 | Pagination parameters not range-validated |

**Totals:** 2 High, 5 Medium, 2 Low — **Grade: B** (≤2 High, ≤6 Medium per grading scale)
