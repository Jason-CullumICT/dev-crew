Now here is the complete SAST report:

---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — fell back to LLM pattern scan for secrets
- **semgrep**: [TOOL UNAVAILABLE] — fell back to LLM pattern scan for all CWE patterns

No hardcoded secrets found in first-party source code (`Source/`). Secrets are correctly referenced via `process.env` and GitHub Actions `${{ secrets.* }}`.

---

### SAST-001: Complete Absence of Authentication Middleware

- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Code Snippet:**
  ```typescript
  app.use(express.json());
  // No auth middleware registered anywhere
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** The Express application registers zero authentication or authorization middleware. Every route — including workflow state transitions (`/approve`, `/reject`, `/dispatch`), dashboard data, and intake webhooks — is fully open to any unauthenticated caller. Any party with network access to port 3001 can create, modify, approve, reject, or dispatch work items without any credential check.
- **Remediation:** Add authentication middleware (e.g., JWT bearer token validation or session-based auth) registered globally before all `app.use('/api/...')` route mounts. For webhooks specifically, add HMAC signature validation (see SAST-003).
- **Handoff:** [HANDOFF → pen-tester] — verify exploitability via unauthenticated access to all state-transition endpoints.

---

### SAST-002: Internal Error Messages Leaked to API Clients

- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts` — lines 60, 87, 138, 205, 292, 331, 368
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw exception message returned to client
  }
  ```
- **Description:** All seven catch blocks in the workflow routes extract `err.message` directly and include it verbatim in the HTTP 500 response body. Exception messages from the service layer (e.g., `"Work item ${itemId} not found"`, `"Cannot route work item in status '${item.status}'"`) are surfaced to clients. While current messages are benign, any future exception thrown from a lower-level library (ORM, file I/O, network stack) could leak internal paths, data structures, or configuration details. The `errorHandler` middleware (`middleware/errorHandler.ts`) correctly returns a generic message — but it is never reached because these catch blocks short-circuit the error flow.
- **Remediation:** In catch blocks, log the raw `err.message` internally (already done) but return only a generic, fixed string for 500 responses: `res.status(500).json({ error: 'Internal server error' })`. Preserve the structured exception for the logger only.

---

### SAST-003: Webhook Endpoints Accept Unauthenticated Requests With No Signature Validation

- **Severity:** Medium
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-55`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;            // no HMAC validation
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({
      title: body.title,
      description: body.description,
      type: body.type || WorkItemType.Bug,     // ← unvalidated enum
      priority: body.priority || WorkItemPriority.Medium,  // ← unvalidated enum
      source: WorkItemSource.Zendesk,
    });
  ```
- **Description:** Two issues compound here. First, neither `/api/intake/zendesk` nor `/api/intake/automated` validates a webhook secret or HMAC signature — any caller can inject work items claiming to be from Zendesk or an automated system. Second, the `type` and `priority` fields from the webhook body are passed directly to `createWorkItem()` without enum validation. The `/api/work-items` POST endpoint validates these against `WorkItemType` and `WorkItemPriority` enums, but the intake endpoints do not, meaning invalid string values could be stored in the in-memory work item model.
- **Remediation:** (1) Add HMAC-SHA256 webhook signature verification using a shared secret in `ZENDESK_WEBHOOK_SECRET` env var, matching Zendesk's `X-Zendesk-Webhook-Signature` header. (2) Validate `body.type` and `body.priority` against their respective enum values, returning 400 for invalid inputs — consistent with the `/api/work-items` POST handler.

---

### SAST-004: Unbounded Pagination `limit` Parameter (Potential DoS)

- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  // workItems.ts
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,  // no max cap
  };
  ```
- **Description:** The `limit` query parameter is passed to `parseInt()` with no upper-bound validation. An attacker (or misconfigured client) can send `GET /api/work-items?limit=10000000`, causing the store's `findAll()` to allocate and serialize the full in-memory dataset in a single response. As the work item count grows, this becomes a memory and CPU exhaustion vector. The same issue exists in `/api/dashboard/activity`. No validation for negative values either (`?limit=-1` triggers `result.slice(0, -1)`, returning all-but-last items — unintended behavior).
- **Remediation:** Add a bounded validation step before passing to the store:
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = (!isNaN(rawLimit) && rawLimit > 0 && rawLimit <= 100) ? rawLimit : 20;
  ```
  Apply consistently to all paginated routes. Reject or clamp values outside `[1, 100]`.

---

### SAST-005: Missing HTTP Security Headers (No helmet Middleware)

- **Severity:** Medium
- **CWE:** CWE-16 (Configuration), aligns with OWASP A05:2021 (Security Misconfiguration)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet(), no manual security headers set
  ```
- **Description:** The Express application has no security header middleware (`helmet` or equivalent). The following defensive headers are absent from all API responses:
  - `Content-Security-Policy` — no XSS restriction for browser-facing clients
  - `X-Frame-Options` — no clickjacking protection
  - `X-Content-Type-Options: nosniff` — MIME sniffing enabled
  - `Strict-Transport-Security` — HSTS not enforced
  - `Referrer-Policy` — referrer leakage unchecked
  The absence of `X-Content-Type-Options` is particularly relevant since the API already serves JSON; browsers can be tricked into interpreting responses differently.
- **Remediation:** Add `helmet` as the first middleware:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```
  Configure CSP appropriately for the frontend origin. Add `helmet` to Backend `package.json` dependencies.

---

### SAST-006: No Rate Limiting on Any Endpoint

- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts` (global scope)
- **Description:** No rate limiting middleware (`express-rate-limit` or equivalent) is registered on any route or globally. This leaves the application vulnerable to:
  - Bulk work item creation via `/api/intake/*` or `/api/work-items` (resource exhaustion of in-memory store)
  - Repeated state-transition requests triggering CPU-heavy assessment pod logic
  - Enumeration of all work item IDs via sequential `GET /api/work-items/:id` requests
- **Remediation:** Add `express-rate-limit` as a global middleware and tighten limits on write-heavy or CPU-heavy endpoints (intake, assess, route). Example:
  ```typescript
  import rateLimit from 'express-rate-limit';
  app.use(rateLimit({ windowMs: 60_000, max: 100 }));
  ```
  Apply stricter limits (`max: 10`) to the intake webhook routes.

---

### SAST-007: Debug Portal iframe Missing `sandbox` Attribute

- **Severity:** Low
- **CWE:** CWE-668 (Exposure of Resource to Wrong Sphere)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-14`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
    // No sandbox attribute
  />
  ```
- **Description:** The debug portal iframe embeds an external URL (`VITE_PORTAL_URL`, defaulting to `http://localhost:4200`) without a `sandbox` attribute. Without sandboxing, the embedded page runs with full same-origin privileges relative to the parent frame when served from the same origin. The missing `sandbox` attribute means the embedded page can navigate the top-level frame, execute scripts, and access cookies if co-hosted. While this is a developer-facing tool, it should still follow least-privilege principles.
- **Remediation:** Add a restrictive `sandbox` attribute:
  ```tsx
  <iframe
    src={portalUrl}
    sandbox="allow-scripts allow-same-origin allow-forms"
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```

---

### Summary Table

| ID | Title | Severity | CWE | File |
|----|-------|----------|-----|------|
| SAST-001 | No Authentication Middleware | **High** | CWE-306 | `src/app.ts` |
| SAST-002 | Raw Error Messages Returned to Clients | **Medium** | CWE-209 | `routes/workflow.ts` (×7) |
| SAST-003 | Webhook Endpoints: No HMAC Validation + Unvalidated Enums | **Medium** | CWE-345 | `routes/intake.ts` |
| SAST-004 | Unbounded Pagination `limit` | **Medium** | CWE-400 | `routes/workItems.ts`, `routes/dashboard.ts` |
| SAST-005 | Missing HTTP Security Headers | **Medium** | CWE-16 | `src/app.ts` |
| SAST-006 | No Rate Limiting | **Medium** | CWE-770 | `src/app.ts` |
| SAST-007 | iframe Missing `sandbox` Attribute | **Low** | CWE-668 | `DebugPortalPage.tsx` |

**Findings totals:** High: 1 | Medium: 5 | Low: 1 | Total: 7

**Confirmed clean:**
- No hardcoded secrets in first-party code ✅
- No dynamic code execution (`eval`, `execSync`) ✅
- No SQL/NoSQL injection surface (in-memory store, no DB) ✅
- No unsafe deserialization / XXE ✅
- No `dangerouslySetInnerHTML` / XSS sinks in React ✅
- UUID generation uses cryptographically safe `uuid` v4 library ✅
- Stack traces logged internally only, not sent to clients in the global error handler ✅

**Per grading scale in `security.config.yml`:** 1 High + 5 Medium = **Grade B boundary** (≤6 High, pending pen-tester and compliance-auditor results).
