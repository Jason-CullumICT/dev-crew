---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE]` — fell back to LLM pattern scan; 0 hardcoded secrets found
- **semgrep**: `[TOOL UNAVAILABLE]` — fell back to LLM pattern scan; findings below

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-862 (Missing Authorization)
- **File:** `Source/Backend/src/app.ts:11–44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // Only middleware is request logging — no auth anywhere
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** The entire API surface has zero authentication or authorization middleware. Any unauthenticated actor can create work items, trigger state transitions (approve, reject, dispatch), read all dashboard data, and trigger cascade auto-dispatch. The only middleware registered is `errorHandler`. There is no JWT, session, or bearer-token check anywhere in the `middleware/` directory.
- **Remediation:** Add authentication middleware (e.g., JWT validation) before all `/api/*` routes. Apply RBAC — workflow actions like approve/reject/dispatch should require elevated roles.
- **Handoff:** `[HANDOFF → pen-tester]` — confirm exploitability against the running service; test whether state-machine manipulation is achievable without credentials.

---

### SAST-002: Intake Webhooks Have No Signature Verification
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication), CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11–31`, `34–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ title: body.title, ... source: WorkItemSource.Zendesk });
    // No HMAC/signature verification, no IP allowlist, no shared secret check
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept POST requests from any source without verifying the caller's identity. Real Zendesk webhooks include an `X-Zendesk-Webhook-Signature` header that must be verified with an HMAC-SHA256 shared secret. Without this, any actor can spoof Zendesk and inject arbitrary work items into the system.
- **Remediation:** Implement HMAC-SHA256 signature verification against a shared secret stored in an environment variable. Reject requests where the `X-Zendesk-Webhook-Signature` header is absent or invalid.
- **Handoff:** `[HANDOFF → pen-tester]` — verify ability to POST arbitrary work items via the intake endpoints.

---

### SAST-003: Intake Endpoints Skip Enum Validation for `type` and `priority`
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:19–25`, `42–48`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,        // ← not validated against enum
    priority: body.priority || WorkItemPriority.Medium,  // ← not validated against enum
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** The manual `/api/work-items` route validates `type` and `priority` against their enums (lines 29–41 in `workItems.ts`). The intake routes skip these checks entirely. An attacker can store work items with arbitrary string values for `type`/`priority` (e.g., `"__proto__"`, `"<script>"`, or values that break downstream display logic). TypeScript type annotations are compile-time only and provide no runtime protection.
- **Remediation:** Add the same enum validation present in `workItems.ts` to both intake routes:
  ```typescript
  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Invalid type' }); return;
  }
  ```

---

### SAST-004: Raw Exception Messages Leaked to Clients in 500 Responses
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:62, 89, 140, 207, 294, 350, 370`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw exception message to client
  }
  ```
- **Description:** All catch blocks in `workflow.ts` return the raw exception `.message` string to the client in the 500 body. This bypasses the central `errorHandler` middleware which correctly returns only `"Internal server error"`. Exception messages can reveal internal implementation details, file paths, service names, or stack-trace fragments. The `dependency.ts` service throws messages like `"Work item ${itemId} not found"` which leaks internal IDs.
- **Remediation:** In catch blocks, log the full message internally but return a generic error to the client:
  ```typescript
  logger.error({ msg: 'Route action failed', error: message, ... });
  res.status(500).json({ error: 'Internal server error' });
  ```
  For known/expected errors (e.g., "not found"), surface only safe user-facing messages.

---

### SAST-005: All Docker Containers Run as Root (No `USER` Directive)
- **Severity:** High
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `platform/Dockerfile.orchestrator`, `platform/Dockerfile.worker`, `portal/Dockerfile`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim
  # ... installs, WORKDIR, COPY ...
  CMD ["node", "server.js"]   # ← no USER directive; runs as root
  ```
- **Description:** None of the three Dockerfiles specify a `USER` directive. All processes within these containers run as `root` (UID 0). If the application is compromised (e.g., via RCE), the attacker has root inside the container, making container escape significantly easier and giving full write access to all mounted volumes.
- **Remediation:** Add a non-root user before the `CMD` instruction in each Dockerfile:
  ```dockerfile
  RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
  USER appuser
  ```
  Ensure volume mount paths are chowned appropriately.

---

### SAST-006: Docker Socket Mounted into Orchestrator Container
- **Severity:** Critical
- **CWE:** CWE-250 (Execution with Unnecessary Privileges), CWE-272 (Least Privilege Violation)
- **File:** `platform/docker-compose.yml:24`
- **Code Snippet:**
  ```yaml
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock  # ← full Docker daemon access
    - workspace:/workspace
    - claude-config:/root/.claude
    - ~/.claude/.credentials.json:/root/.claude/.credentials.json:ro
  ```
- **Description:** Mounting the Docker socket into a container is effectively equivalent to granting root access on the host. Any code running inside the orchestrator (including injected prompts processed by Claude Code) can spin up privileged containers, escape to the host filesystem, or exfiltrate secrets. This is by design for the orchestration use case but represents the highest-risk attack surface.
- **Remediation:** Accept this as a deliberate architectural trade-off but document it explicitly. Mitigate by: (1) adding SAST-005 non-root user to reduce lateral blast radius, (2) restricting orchestrator network access, (3) running the orchestrator on a dedicated, hardened host.

---

### SAST-007: Host Claude Credentials File Bind-Mounted into Container
- **Severity:** High
- **CWE:** CWE-522 (Insufficiently Protected Credentials)
- **File:** `platform/docker-compose.yml:27`
- **Code Snippet:**
  ```yaml
  - ~/.claude/.credentials.json:/root/.claude/.credentials.json:ro
  ```
- **Description:** The host's `~/.claude/.credentials.json` — containing Anthropic API credentials — is mounted read-only into the orchestrator container. If the orchestrator container is compromised (see SAST-006), the attacker can read these credentials and use them to make Anthropic API calls under the owner's account. Even `ro` mounts are readable by container processes.
- **Remediation:** Inject the credentials via a Docker secret or CI secret rather than bind-mounting the host file. Alternatively, use environment variables with short-lived tokens.

---

### SAST-008: No Pagination Upper Bound — Denial of Service Risk
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,  // ← no max
  };
  ```
- **Description:** The `limit` parameter is parsed with `parseInt` but never bounded. A caller can send `?limit=9999999` to force loading every work item in memory and returning it in a single response, potentially causing out-of-memory conditions or extreme latency as the store grows.
- **Remediation:**
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = isNaN(rawLimit) ? 20 : Math.min(rawLimit, 100);
  ```

---

### SAST-009: No HTTP Security Headers
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts` (absent), `Source/Frontend/vite.config.ts` (absent)
- **Description:** The Express backend sets no security headers. Missing headers include:
  - `Content-Security-Policy` — XSS mitigation
  - `X-Frame-Options` — clickjacking protection
  - `Strict-Transport-Security` — HTTPS enforcement
  - `X-Content-Type-Options: nosniff` — MIME sniffing prevention
  - `X-XSS-Protection` — legacy XSS filter
  The Vite dev server has no header configuration either.
- **Remediation:** Install and configure `helmet` middleware in `app.ts`:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```

---

### SAST-010: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts), CWE-400
- **File:** `Source/Backend/src/app.ts`
- **Description:** There is no rate-limiting middleware anywhere in the Express application. Any endpoint — including the webhook intake routes and workflow state-transition actions — can be called at arbitrary frequency. This enables brute-force enumeration of work item IDs, flooding the in-memory store, and replay attacks on workflow transitions.
- **Remediation:** Apply `express-rate-limit` globally, with tighter limits on write-heavy or sensitive endpoints:
  ```typescript
  import rateLimit from 'express-rate-limit';
  app.use(rateLimit({ windowMs: 60_000, max: 100 }));
  ```

---

### SAST-011: Unauthenticated Prometheus `/metrics` Endpoint
- **Severity:** Low
- **CWE:** CWE-200 (Exposure of Sensitive Information to Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34-37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());  // ← no auth check
  });
  ```
- **Description:** The Prometheus metrics endpoint is publicly accessible without any authentication. While the current metrics are business counters (work items created, dispatched, etc.), they reveal system usage patterns and throughput. In a production deployment this endpoint should be network-restricted or require a token.
- **Remediation:** Restrict `/metrics` to internal networks via network policy, or add a simple bearer token check. Alternatively, expose it on a separate internal port.

---

### SAST-012: Debug Portal `iframe` Lacks `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-16 (Configuration), CWE-79 (XSS — indirect risk)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-13`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
    // ← no sandbox attribute
  />
  ```
- **Description:** The iframe embedding the debug portal at `VITE_PORTAL_URL` has no `sandbox` attribute. A sandboxed iframe restricts the embedded content from executing scripts, accessing parent-frame DOM, submitting forms, or navigating the top frame. Without `sandbox`, any XSS in the portal page can access the parent application's cookies and DOM if they share the same origin.
- **Remediation:**
  ```tsx
  <iframe src={portalUrl} sandbox="allow-scripts allow-same-origin" ... />
  ```
  Restrict further based on actual portal needs.

---

### SAST-013: `ANTHROPIC_API_KEY` Exposed at Workflow-Level `env` in CI/CD
- **Severity:** Low
- **CWE:** CWE-522 (Insufficiently Protected Credentials)
- **File:** `.github/workflows/run-ateam.yml:44-45`, `.github/workflows/run-guardians.yml:41`
- **Code Snippet:**
  ```yaml
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}  # workflow-level
  ```
- **Description:** Declaring secrets at the `env:` workflow level makes them available to ALL jobs and ALL steps, including third-party actions (`actions/checkout`, `actions/upload-artifact`, etc.). GitHub Actions best practice is to declare secrets only at the step level where they are needed to minimize exposure scope.
- **Remediation:** Move `ANTHROPIC_API_KEY` to the specific step `env:` blocks that require it, rather than the top-level workflow `env:`.

---

### SAST-014: Frontend Calls `/api/search` — Backend Route Not Implemented
- **Severity:** Informational
- **CWE:** N/A (feature gap)
- **File:** `Source/Frontend/src/api/client.ts:101-104`
- **Code Snippet:**
  ```typescript
  searchItems(q: string): Promise<{ data: WorkItem[] }> {
    const params = new URLSearchParams({ q });
    return request(`/search?${params.toString()}`);  // ← no /api/search route in backend
  },
  ```
- **Description:** The frontend API client has a `searchItems()` function used by `DependencyPicker` for typeahead search, but no corresponding `/api/search` (or `/api/work-items/search`) route exists in the backend. All calls to this function will result in 404 responses. This is either dead code or an incomplete feature that could confuse users.
- **Remediation:** Either implement the search endpoint in the backend or remove the dead code from the frontend.

---

**Findings summary:** 1 Critical · 4 High · 5 Medium · 3 Low · 1 Informational = **14 total**

| ID | Title | Severity |
|----|-------|----------|
| SAST-001 | No authentication/authorization on any API endpoint | **High** |
| SAST-002 | Intake webhooks — no signature verification | **High** |
| SAST-003 | Intake endpoints — unvalidated `type`/`priority` enum fields | Medium |
| SAST-004 | Raw exception messages leaked to clients | Medium |
| SAST-005 | Dockerfiles — all containers run as root | **High** |
| SAST-006 | Docker socket mounted into orchestrator container | **Critical** |
| SAST-007 | Host Claude credentials bind-mounted into container | **High** |
| SAST-008 | Pagination has no upper bound (DoS) | Medium |
| SAST-009 | No HTTP security headers | Medium |
| SAST-010 | No rate limiting | Medium |
| SAST-011 | Unauthenticated `/metrics` endpoint | Low |
| SAST-012 | Debug portal `iframe` lacks `sandbox` | Low |
| SAST-013 | `ANTHROPIC_API_KEY` at workflow-level env in CI/CD | Low |
| SAST-014 | `/api/search` called by frontend but not implemented | Info |

**Per grading scale:** 4 High + 1 Critical → **Grade: C or lower** (grading rubric allows max 0 critical for A/B; 1 critical = C-floor at best, but SAST-006 is a platform infrastructure finding, not a first-party source code bug — final grade pending pen-tester and compliance-auditor synthesis).
