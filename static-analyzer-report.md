---

## Static Analyzer Results

### Tools Run
- **gitleaks:** `[TOOL UNAVAILABLE]` — fell back to LLM pattern scan (0 secrets found in Source/)
- **semgrep:** `[TOOL UNAVAILABLE]` — fell back to LLM pattern scan (12 findings)

---

### SAST-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts` — all routes
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** There is no authentication middleware anywhere in the Express application. Every API endpoint — including all CRUD operations, workflow transitions (route, assess, approve, reject, dispatch), and the dashboard — is fully accessible to any unauthenticated caller. The OWASP-ASVS Level 2 target (configured in `security.config.yml`) requires authentication on all state-mutating operations.
- **Remediation:** Add an authentication middleware (JWT, API key, or session) applied globally or at minimum to all `POST`, `PATCH`, and `DELETE` routes before deployment outside a localhost-only context.
- **Handoff:** [HANDOFF → pen-tester] — Verify unauthenticated CRUD and state-machine bypass chains.

---

### SAST-002: Webhook Intake Endpoints Have No Signature Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11, :34`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept POST requests from anyone without verifying a Zendesk webhook signature (`X-Zendesk-Webhook-Signature`) or any shared secret. An attacker who discovers the endpoint URL can flood the system with forged work items.
- **Remediation:** Validate the HMAC-SHA256 signature header provided by Zendesk against a configured `ZENDESK_WEBHOOK_SECRET` env var. For the automated endpoint, require a Bearer token or API key header.
- **Handoff:** [HANDOFF → pen-tester]

---

### SAST-003: Intake Routes Accept Unvalidated Enum Values (CWE-20)
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22-23, :44-45`
- **Code Snippet:**
  ```typescript
  type: body.type || WorkItemType.Bug,       // Truthy invalid string bypasses default
  priority: body.priority || WorkItemPriority.Medium,
  ```
- **Description:** Unlike the main `POST /api/work-items` route which validates `type` and `priority` against enum values, the intake routes use `body.type || default`. A truthy but invalid string (e.g., `"CRITICAL_OVERRIDE"`) passes through the `||` guard and is stored verbatim in the work item's `type` or `priority` fields. This can cause undefined behavior in downstream routing and assessment logic that switch on these enum fields.
- **Remediation:** Add explicit enum validation in both intake handlers, identical to the validation in `workItems.ts`:
  ```typescript
  const validType = Object.values(WorkItemType).includes(body.type) ? body.type : WorkItemType.Bug;
  ```

---

### SAST-004: Unbounded Pagination Parameters — Resource Exhaustion Vector
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** The `limit` parameter is parsed from the query string without an upper-bound guard. A caller can pass `?limit=9999999`, causing the store to slice and serialize all items in memory into a single response. Similarly, passing non-numeric strings produces `NaN`, which propagates to `slice(NaN, NaN)` and returns an empty array — silently masking the issue. The dashboard activity endpoint (`/api/dashboard/activity`) has the same pattern.
- **Remediation:**
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
  const rawPage = parseInt(req.query.page as string, 10);
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  ```

---

### SAST-005: Missing HTTP Security Headers
- **Severity:** High
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts` (no Helmet or equivalent middleware)
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet(), no security headers
  ```
- **Description:** The Express application sets no security headers. Missing headers include: `Content-Security-Policy`, `X-Frame-Options` (clickjacking), `X-Content-Type-Options` (MIME sniffing), `Strict-Transport-Security` (HSTS), and `Referrer-Policy`. This is a gap against OWASP-ASVS Level 2 requirement 14.4 (HTTP Security Headers).
- **Remediation:** Add `helmet` as a dependency and configure at application startup:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
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
- **Description:** The `/metrics` endpoint is publicly accessible and returns Prometheus data including default Node.js process metrics (memory, event loop lag, file descriptor counts) and application-level workflow counters. This exposes internal operational telemetry to any unauthenticated caller, leaking system fingerprint information.
- **Remediation:** Restrict the `/metrics` endpoint to internal network access only (e.g., bind to a separate port, add IP allowlist middleware, or require a bearer token). In Docker, avoid exposing the metrics port externally.

---

### SAST-007: All Docker Containers Run as Root (No `USER` Directive)
- **Severity:** High
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `platform/Dockerfile.orchestrator`, `platform/Dockerfile.worker`, `portal/Dockerfile`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim      # No USER directive before CMD
  WORKDIR /app
  CMD ["node", "server.js"]
  ```
- **Description:** None of the three Dockerfiles include a `USER` directive. All containers execute as `root` (UID 0). If any container is compromised via a code execution vulnerability, the attacker immediately has root inside the container — maximising the blast radius and simplifying container escape attempts.
- **Remediation:** Add a least-privilege user to each Dockerfile:
  ```dockerfile
  RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
  USER appuser
  ```

---

### SAST-008: Docker Socket Mounted in Root-Running Orchestrator Container
- **Severity:** High (escalates to Critical in context of SAST-007)
- **CWE:** CWE-284 (Improper Access Control)
- **File:** `platform/docker-compose.yml:24`
- **Code Snippet:**
  ```yaml
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ```
- **Description:** The orchestrator container mounts the host Docker socket and runs as `root`. Combined, these mean that any code execution inside the orchestrator is equivalent to root access on the Docker host. An attacker who exploits the orchestrator API can spin up privileged containers, mount host filesystem paths, and achieve full host compromise. This is a well-documented host escape pattern.
- **Remediation:** If the socket must be mounted (for spawning worker containers), mitigate by: (1) running the orchestrator as a non-root user with the `docker` group, (2) using Docker-in-Docker with restricted socket proxies (e.g., `docker-socket-proxy`), or (3) switching to an API-based worker spawning model that doesn't require host socket access.
- **Handoff:** [HANDOFF → pen-tester]

---

### SAST-009: Debug Portal `<iframe>` Missing `sandbox` Attribute
- **Severity:** Medium
- **CWE:** CWE-116 (Improper Encoding or Escaping of Output) / Iframe Injection
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-14`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The iframe embedding `http://localhost:4200` (or the value of `VITE_PORTAL_URL`) has no `sandbox` attribute. Without sandboxing, the embedded page inherits the full permissions of the parent frame: it can execute scripts, navigate the top-level window, access the parent-origin cookies, and submit forms. If `VITE_PORTAL_URL` can ever be influenced by an attacker or misconfigured to a malicious URL, this becomes an XSS vector.
- **Remediation:**
  ```tsx
  <iframe
    src={portalUrl}
    sandbox="allow-scripts allow-same-origin allow-forms"
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```

---

### SAST-010: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts`
- **Description:** No rate-limiting middleware (e.g., `express-rate-limit`) is present. All endpoints — including the intake webhooks and workflow action endpoints — can be called at unbounded frequency. Combined with the absence of authentication (SAST-001), this enables unauthenticated DoS, automated spam of work items via intake, and brute-force of any future authentication layer.
- **Remediation:** Add `express-rate-limit` with appropriate tiers: stricter limits on mutating endpoints (`POST`, `PATCH`, `DELETE`) and looser limits on read endpoints.

---

### SAST-011: Error Messages in Route Handlers May Leak Internal State
- **Severity:** Low
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts` (multiple catch blocks), `Source/Backend/src/routes/workItems.ts`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
  ```
- **Description:** Route handler catch blocks forward the raw `err.message` to API clients in a 500 response. While the global `errorHandler` correctly returns only `"Internal server error"`, these route-level handlers propagate service-level error messages (e.g., `"Work item WI-042 not found"`, cycle detection messages, state machine error text) directly to callers. This can reveal internal identifiers, state machine logic, and data-model details.
- **Remediation:** Classify errors into client-safe (4xx — return as-is) vs. internal (5xx — return generic message). Log the full error internally and return a generic `"Internal server error"` for unexpected exceptions.

---

### SAST-012: `CLAUDE.md` Documents Plaintext Dev Credential (Low — Dev Context Only)
- **Severity:** Low
- **CWE:** CWE-798 (Use of Hard-coded Credentials)
- **File:** `CLAUDE.md:66`
- **Code Snippet:**
  ```
  | Login credentials | `admin@example.com / admin123` |
  ```
- **Description:** The CLAUDE.md documentation file hard-codes a plaintext credential (`admin123`) intended for development use. While this is not in executable source code, it is committed to the repository and visible to all contributors and CI environments. If these credentials are ever reused in a real deployment or staging environment, they represent an immediate authentication bypass.
- **Remediation:** Replace with a reference to an environment variable or secrets manager: `| Login credentials | See \`.env\` (never committed) |`. Ensure `admin123` is not used in any deployed environment.

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306 |
| SAST-002 | Webhook endpoints — no signature verification | **High** | CWE-345 |
| SAST-003 | Intake routes — unvalidated enum values | Medium | CWE-20 |
| SAST-004 | Unbounded pagination parameters | Medium | CWE-400 |
| SAST-005 | Missing HTTP security headers | **High** | CWE-693 |
| SAST-006 | `/metrics` exposed without auth | Medium | CWE-200 |
| SAST-007 | All containers run as root | **High** | CWE-250 |
| SAST-008 | Docker socket in root container | **High** | CWE-284 |
| SAST-009 | iframe missing sandbox attribute | Medium | CWE-116 |
| SAST-010 | No rate limiting | Medium | CWE-770 |
| SAST-011 | Error messages leaking internal state | Low | CWE-209 |
| SAST-012 | Plaintext dev credential in CLAUDE.md | Low | CWE-798 |

**Counts — High: 5 · Medium: 5 · Low: 2 · Total: 12**

**No hardcoded secrets found in `Source/`** (no API keys, DB passwords, tokens, or cryptographic material in first-party code).

**No dangerous API patterns found** (no `eval`, `exec`, `dangerouslySetInnerHTML`, SQL injection surfaces, or weak crypto usage).

**Learnings updated** at `Teams/TheGuardians/learnings/static-analyzer.md`.
