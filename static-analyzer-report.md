---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — fell back to LLM-based secret scan → **0 secrets found**
- **semgrep**: [TOOL UNAVAILABLE] — fell back to LLM-based pattern scan → **12 findings**

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** The Express application registers all API routers with zero authentication middleware. Every endpoint — including state-mutating actions like approve, reject, dispatch, soft-delete, and dependency management — is publicly accessible without any token, session, or credential check. There is no `authMiddleware`, `requireAuth`, or equivalent anywhere in the codebase.
- **Remediation:** Introduce authentication middleware (e.g., JWT bearer token validation or session-based auth) applied globally before route handlers, or per-route using `router.use(requireAuth)`. At minimum, protect all `/api/*` routes.
- **Handoff:** [HANDOFF → pen-tester]

---

### SAST-002: Unauthenticated Intake Webhooks Without Signature Verification
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function) / CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... source: WorkItemSource.Zendesk });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` webhook receivers accept any HTTP POST with a `title` and `description` and creates work items tagged as if they came from Zendesk or automated systems. There is no HMAC signature verification (e.g., `X-Zendesk-Webhook-Signature`), no shared secret, and no IP allowlist. An attacker can spam the intake with arbitrary work items, poisoning the workflow queue.
- **Remediation:** Verify Zendesk webhook signatures using the `X-Zendesk-Webhook-Signature` header and a shared secret stored in an environment variable. For the automated intake, require a bearer token. Reject requests that fail verification with HTTP 401.
- **Handoff:** [HANDOFF → pen-tester]

---

### SAST-003: Docker Socket Bind-Mounted into Orchestrator Container
- **Severity:** High
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `platform/docker-compose.yml:23`
- **Code Snippet:**
  ```yaml
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ```
- **Description:** The orchestrator service mounts the host Docker daemon socket directly. Any process that can reach this socket inside the container has full control of the Docker host — it can start privileged containers, read all container filesystems, and effectively achieve root on the host machine. This is a critical container escape vector.
- **Remediation:** Use Docker-in-Docker (DinD) with socket isolation rather than a bind-mounted host socket. If host socket access is architecturally required, scope access using a Docker socket proxy (e.g., `tecnativa/docker-socket-proxy`) with allowlist-only operations (e.g., `POST /containers/*` only).
- **Note:** `platform/` is read-only for this agent — finding reported for team review only.

---

### SAST-004: Host Credentials File Mounted into Container
- **Severity:** High
- **CWE:** CWE-312 (Cleartext Storage of Sensitive Information) / CWE-522 (Insufficiently Protected Credentials)
- **File:** `platform/docker-compose.yml:27`
- **Code Snippet:**
  ```yaml
  - ~/.claude/.credentials.json:/root/.claude/.credentials.json:ro
  ```
- **Description:** The host user's Claude credentials file is bind-mounted directly into the orchestrator container. If the container is compromised (e.g., via the Docker socket, a vulnerability in the orchestrator, or a malicious agent task), an attacker can exfiltrate the credentials JSON file and use it to impersonate the Claude API account. The `:ro` flag prevents writes but not reads.
- **Remediation:** Use Docker secrets (`docker secret create`) or a secrets management solution (Vault, AWS Secrets Manager) to inject credentials at runtime. Never bind-mount credential files from the host filesystem.
- **Note:** `platform/` is read-only for this agent — finding reported for team review only.

---

### SAST-005: Internal Error Messages Leaked to API Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:63, 89, 138, 207, 294, 350, 370`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw error message sent to client
  }
  ```
- **Description:** Every `catch` block in `workflow.ts` extracts the raw exception message and returns it directly to the HTTP client. Error messages from internal services, the data store, or dependency logic may reveal implementation details, internal data structures, item IDs, or stack-trace-adjacent information. The `errorHandler` middleware correctly returns a generic message, but route-level catches bypass it.
- **Remediation:** Replace `res.status(500).json({ error: message })` with `res.status(500).json({ error: 'Internal server error' })` and keep the detailed message server-side in the logger only. Propagate specific, user-safe error messages for known failure modes (e.g., not found, validation errors) as distinct status codes.

---

### SAST-006: Missing HTTP Security Headers (No Helmet.js)
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet(), no security headers
  ```
- **Description:** No security headers are configured. The application is missing: `Content-Security-Policy`, `X-Frame-Options` (clickjacking protection), `X-Content-Type-Options`, `Strict-Transport-Security` (HSTS), `Referrer-Policy`, and `Permissions-Policy`. These are standard defensive headers recommended by OWASP and required by OWASP ASVS Level 2.
- **Remediation:** Install and enable `helmet` middleware (`app.use(helmet())`) immediately after `app.use(express.json())`. Customise the CSP directive for the application's specific requirements.

---

### SAST-007: No CORS Policy Configured
- **Severity:** Medium
- **CWE:** CWE-942 (Overly Permissive Cross-Origin Resource Sharing Policy)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Description:** The Express application has no `cors()` middleware. Without explicit CORS configuration, browsers apply default same-origin policy, which means the API is not reachable cross-origin from the frontend. However, if the app is later proxied or run without a same-origin reverse proxy, the absence of explicit CORS policy creates a risk of either breakage or misconfigured open access. OWASP ASVS v4 §14.5 requires that CORS policies be explicitly defined and restricted to allowlisted origins.
- **Remediation:** Install the `cors` package and configure it with an explicit `origin` allowlist (e.g., `ALLOWED_ORIGINS` env var). Never use `cors({ origin: '*' })` for endpoints that will serve authenticated data.

---

### SAST-008: Prometheus `/metrics` Endpoint Exposed Without Authentication
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
- **Description:** The Prometheus metrics endpoint is publicly accessible with no authentication. While it exposes operational counters (work items created, dispatched, assessed, dependency operations), this information can reveal business logic flow rates, team names (`TheATeam`, `TheFixer`), and application internals to unauthenticated observers.
- **Remediation:** Protect `/metrics` behind network-level access control (e.g., bind only to an internal network interface, use a Prometheus scrape token, or place it behind an IP allowlist via a reverse proxy). At minimum, add a middleware that checks a `METRICS_TOKEN` env var against a bearer token.

---

### SAST-009: Portal Dockerfile Runs as Root
- **Severity:** Medium
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `portal/Dockerfile:1-23`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim
  WORKDIR /app
  # No USER directive — runs as root
  CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & ..."]
  ```
- **Description:** The portal container runs all processes as `root` because no `USER` instruction is present. If an attacker achieves code execution inside the container (e.g., via a dependency vulnerability in the portal backend), they run with root privileges inside the container, which dramatically increases the blast radius.
- **Remediation:** Add a non-root user to the Dockerfile:
  ```dockerfile
  RUN addgroup --system app && adduser --system --ingroup app app
  USER app
  ```
  Ensure the `WORKDIR` and file permissions are compatible with this user.

---

### SAST-010: Unbounded Pagination `limit` Parameter
- **Severity:** Low
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** The `limit` query parameter is parsed as an integer and passed directly to the store's pagination logic with no upper bound cap. A caller can request `?limit=1000000`, causing the server to serialize every work item in memory into a single response. With the in-memory store this is a CPU/memory amplification DoS risk. If the backend ever migrates to a database, this becomes an unbounded `LIMIT` query.
- **Remediation:** Clamp the limit to a maximum (e.g., `const limit = Math.min(parseInt(...) || 20, 100)`) before passing to the store layer.

---

### SAST-011: Query Filter Parameters Not Validated Against Enum Values
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:62-66`
- **Code Snippet:**
  ```typescript
  const filters = {
    status: req.query.status as WorkItemStatus | undefined,
    type: req.query.type as WorkItemType | undefined,
    ...
  };
  ```
- **Description:** Query filter parameters are TypeScript-cast to enum types without runtime validation. TypeScript casts are compile-time only — at runtime, any string can be passed as `status` (e.g., `?status=__proto__`). The in-memory filter will simply fail to match any items (benign), but this represents a gap in input validation that could become a real issue if query params are ever logged with PII context or used in a database `WHERE` clause.
- **Remediation:** Validate each filter against its corresponding enum's `Object.values()` before use, returning a 400 error for invalid values (consistent with how POST body enums are validated).

---

### SAST-012: No Input Length Limits on Free-Text Fields
- **Severity:** Low
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:24-27`, `Source/Backend/src/routes/intake.ts:14-15`
- **Code Snippet:**
  ```typescript
  if (!body.title || !body.description) {
    res.status(400).json({ error: 'title and description are required' });
    return;
  }
  // No max-length check
  ```
- **Description:** The `title` and `description` fields are validated for presence only. An attacker or misbehaving webhook can submit multi-megabyte strings as `description`, which are stored in the in-memory `Map`, included in every list response, serialized into every activity log entry, and returned in dashboard queue responses. Combined with the unbounded pagination issue (SAST-010), this creates a compounded memory amplification vector.
- **Remediation:** Add maximum length validation: `title` ≤ 200 chars, `description` ≤ 10,000 chars. Return HTTP 400 with a clear error message if exceeded.

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306 |
| SAST-002 | Intake webhooks lack signature verification | **High** | CWE-306/345 |
| SAST-003 | Docker socket bind-mounted in orchestrator | **High** | CWE-250 |
| SAST-004 | Host credentials file mounted into container | **High** | CWE-312/522 |
| SAST-005 | Internal error messages leaked to API clients | **Medium** | CWE-209 |
| SAST-006 | Missing HTTP security headers (no Helmet.js) | **Medium** | CWE-693 |
| SAST-007 | No CORS policy configured | **Medium** | CWE-942 |
| SAST-008 | Prometheus `/metrics` exposed without auth | **Medium** | CWE-200 |
| SAST-009 | Portal Dockerfile runs as root | **Medium** | CWE-250 |
| SAST-010 | Unbounded pagination `limit` parameter | **Low** | CWE-400 |
| SAST-011 | Query filter params not validated vs. enums | **Low** | CWE-20 |
| SAST-012 | No input length limits on free-text fields | **Low** | CWE-400 |

**Totals: 4 High · 5 Medium · 3 Low · 0 secrets found in first-party source**

**No hardcoded secrets, no dynamic code execution patterns, no XSS vectors, no SQL/NoSQL injection surface (in-memory store), and no dangerous deserialization found.**
