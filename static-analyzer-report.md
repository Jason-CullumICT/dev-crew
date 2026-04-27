---

## Static Analyzer Results

### Tools Run
- **gitleaks:** `[TOOL UNAVAILABLE]` — LLM pattern scan substituted for secret detection
- **semgrep:** `[TOOL UNAVAILABLE]` — LLM pattern scan substituted for SAST patterns
- **npm scripts check:** No `postinstall` hooks found in `Source/Backend/package.json` ✅

> Dashboard: RUN_ID unavailable in this invocation (no active Guardian pipeline run). Learnings written to `Teams/TheGuardians/learnings/static-analyzer.md`.

---

### SAST-001: No Authentication or Authorization on Any Endpoint

- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-862 (Missing Authorization)
- **File:** `Source/Backend/src/app.ts:11-44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // Only middleware: request logger and error handler
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** The entire Express application has **zero authentication middleware**. There are no JWT verification, session checks, API key validation, or any form of identity enforcement anywhere in the middleware chain or route handlers. Any unauthenticated HTTP client can create, update, transition, approve, reject, and dispatch work items — including triggering the full workflow state machine. The CLAUDE.md lists `admin@example.com / admin123` as login credentials, but there is no implementation of any login endpoint or auth gate protecting the API.
- **Remediation:** Add an authentication middleware (e.g., JWT via `jsonwebtoken`, or API key check) applied globally before any route handler. At minimum: `app.use(authMiddleware)` before the route registrations. Role-based authorization should gate state-mutating endpoints (approve, reject, dispatch).
- **Handoff:** [HANDOFF → pen-tester] — Verify full bypass of all workflow transitions is achievable unauthenticated.

---

### SAST-002: Missing HTTP Security Headers (No helmet / CSP / HSTS)

- **Severity:** High
- **CWE:** CWE-693 (Protection Mechanism Failure), CWE-116 (Improper Encoding or Escaping)
- **File:** `Source/Backend/src/app.ts:11-44`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // No helmet(), no CORS policy, no security headers set
  ```
- **Description:** The Express server sets no HTTP security headers. Missing headers include:
  - `Content-Security-Policy` — no XSS mitigation for any HTML responses
  - `X-Frame-Options` — no clickjacking protection
  - `Strict-Transport-Security` — no HSTS
  - `X-Content-Type-Options: nosniff` — MIME-sniffing attacks possible
  - `Referrer-Policy` — internal paths may leak in Referer headers
  - No CORS policy — Express's default permits cross-origin requests implicitly when no CORS middleware is set
- **Remediation:** Install and configure `helmet` as the first middleware: `app.use(helmet())`. Add `cors()` with an explicit `origin` allowlist for the frontend domain. Review `Content-Security-Policy` against actual frontend asset origins.
- **Handoff:** [HANDOFF → pen-tester]

---

### SAST-003: Unauthenticated Webhook Intake — No HMAC Signature Verification

- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({
      title: body.title,
      description: body.description,
      type: body.type || WorkItemType.Bug,    // ← no enum validation
      priority: body.priority || WorkItemPriority.Medium,  // ← no enum validation
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept arbitrary POST requests from any source with no webhook authentication. Legitimate Zendesk webhooks sign their payloads with an HMAC-SHA256 signature in the `X-Zendesk-Webhook-Signature` header. Without verifying this signature, any attacker can inject arbitrary work items into the workflow. Additionally, `type` and `priority` values from the request body are passed directly to `createWorkItem` without enum validation (unlike the main `/api/work-items` POST which validates all enums). An invalid enum value will be stored without error.
- **Remediation:** (1) Add HMAC-SHA256 signature verification middleware for the Zendesk endpoint using `X-Zendesk-Webhook-Signature`. (2) Add enum validation for `body.type` and `body.priority` in both intake routes, mirroring the validation in `workItems.ts` POST handler.
- **Handoff:** [HANDOFF → pen-tester] — Confirm invalid enum values are accepted and stored.

---

### SAST-004: Prometheus `/metrics` Endpoint — Unauthenticated Operational Data Exposure

- **Severity:** High
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34-37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The Prometheus metrics endpoint is publicly accessible with no authentication. It exposes operational metrics including: total work items created (by source and type), items dispatched (by team), assessment verdicts, cycle detection events, and dispatch gating counts. In production this reveals internal business throughput and, critically, confirms operational details (which teams exist, what types of work are processed). The Prometheus scrape endpoint should be restricted to the monitoring system only.
- **Remediation:** Restrict `/metrics` to internal network requests or add an auth check (e.g., check a `Bearer` token from the Prometheus scraper config). At minimum, ensure the port is not exposed externally in production Docker/Kubernetes configs.
- **Handoff:** [HANDOFF → pen-tester]

---

### SAST-005: Error Message Information Disclosure in Workflow Routes

- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:60-62, 87-89, 138-140, 205-207, 292-294, 349-350, 368-370`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw err.message sent to client
  }
  ```
- **Description:** All six workflow action endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, `/ready`) return the raw `err.message` string to HTTP clients on 500 errors. If an internal exception includes stack information, file paths, database connection strings, or system details in its message, these will be disclosed to any caller. The global `errorHandler` middleware correctly returns `'Internal server error'` without leaking details, but the per-route catch blocks bypass it.
- **Remediation:** In each catch block, log the full `err.message` (as is done), but return a generic message to the client: `res.status(500).json({ error: 'Internal server error' })`. Only return specific messages for known/expected business errors.

---

### SAST-006: Missing Pagination Upper-Bound Validation — Potential Data Dump

- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation), CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
  ```
- **Description:** The `limit` query parameter is parsed and passed directly to the store without any upper-bound check. A caller can set `?limit=999999999` to retrieve all work items in a single request. While the store is currently in-memory, this pattern is a data dump risk and a denial-of-service vector if the dataset grows. There is also no `NaN` guard — `parseInt('abc', 10)` returns `NaN`, which would propagate to the slice logic.
- **Remediation:** Cap `limit` to a maximum (e.g., 100): `const limit = Math.min(parseInt(...) || 20, 100)`. Add NaN guard: `const page = parseInt(...) || 1`.

---

### SAST-007: No Rate Limiting on Any Endpoint

- **Severity:** Medium
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts` (middleware chain — absent)
- **Description:** There is no rate limiting middleware anywhere in the Express application. Endpoints that trigger expensive computation — particularly `POST /:id/assess` (which runs a 4-role assessment pod sequentially) and `POST /:id/dependencies` (which triggers BFS cycle detection) — are unbounded. A malicious caller can submit thousands of concurrent requests to exhaust CPU and memory. The intake endpoints are especially exposed since they are unauthenticated (SAST-001).
- **Remediation:** Add `express-rate-limit` as middleware: `app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))`. Apply stricter limits to intake routes and state-transition endpoints.

---

### SAST-008: Predictable Sequential Document IDs — Resource Enumeration

- **Severity:** Medium
- **CWE:** CWE-200 (Exposure of Sensitive Information), CWE-330 (Use of Insufficiently Random Values)
- **File:** `Source/Backend/src/utils/id.ts:11-14`
- **Code Snippet:**
  ```typescript
  let docIdCounter = 0;
  export function generateDocId(): string {
    docIdCounter += 1;
    return `WI-${String(docIdCounter).padStart(3, '0')}`;
  }
  ```
- **Description:** Work items are assigned sequential, predictable human-readable IDs (`WI-001`, `WI-002`, ...). While the internal UUID `id` is random, the `docId` is exposed in all API responses and logged. An attacker can use this to enumerate total work item count, understand system load, and guess relative timing of work item creation. Combined with the complete absence of authentication, this trivially enables full data enumeration.
- **Remediation:** Consider randomizing `docId` generation, or if sequential IDs are required for UX, ensure they are only meaningful to authenticated users.

---

### SAST-009: Docker Container Runs as Root

- **Severity:** Medium
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `portal/Dockerfile:6-23`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim
  WORKDIR /app
  # ... no USER directive ...
  CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & ..."]
  ```
- **Description:** The portal Dockerfile has no `USER` directive, meaning the Node.js application runs as `root` inside the container. If an attacker achieves code execution (e.g., via a dependency vulnerability — `[SEE dependency-auditor]`), they would have root access within the container, making container escape attacks more impactful.
- **Remediation:** Add a non-root user before the `CMD`:
  ```dockerfile
  RUN addgroup --gid 1001 appgroup && adduser --uid 1001 --gid 1001 --no-create-home appuser
  USER appuser
  ```

---

### SAST-010: CI Workflows Use `--dangerously-skip-permissions`

- **Severity:** Medium
- **CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)
- **File:** `.github/workflows/run-guardians.yml:142`, `.github/workflows/run-ateam.yml` (multiple), all workflow files
- **Code Snippet:**
  ```yaml
  bash tools/claude-with-retry.sh --model claude-sonnet-4-6 \
    --system-prompt "..." \
    --allowedTools "Read,Glob,Grep,Bash" \
    --print \
    --dangerously-skip-permissions \   # ← skips all permission prompts
    "$(cat /tmp/prompt.txt)"
  ```
- **Description:** Every CI workflow invokes Claude Code with `--dangerously-skip-permissions`, which bypasses the interactive permission prompt for file system, shell, and network access. While this is intentional for CI automation, it means a prompt-injected or misbehaving AI agent has no friction barrier before executing arbitrary `Bash` commands, reading sensitive files, or making network requests. The `ANTHROPIC_API_KEY` and `CLAUDE_CREDENTIALS` secrets are in scope in the same environment.
- **Remediation:** (1) Scope `--allowedTools` as narrowly as possible per agent role (e.g., read-only agents should not include `Bash`). (2) Ensure `ANTHROPIC_API_KEY` and `CLAUDE_CREDENTIALS` are not readable from within the `Bash` tool execution environment when the model has that tool. (3) Consider sandbox mode for particularly sensitive pipelines.

---

### SAST-011: DebugPortalPage — iframe Source Controllable via Build-Time Env Var

- **Severity:** Low
- **CWE:** CWE-16 (Configuration), CWE-601 (URL Redirection to Untrusted Site — partial analogy)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5-6`
- **Code Snippet:**
  ```typescript
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
  return <iframe src={portalUrl} ... />;
  ```
- **Description:** The iframe `src` is set from a build-time environment variable. If a CI/build pipeline is compromised and an attacker can inject `VITE_PORTAL_URL=https://attacker.com`, the debug portal will silently embed a malicious page in the application UI. This is low severity because it requires build system compromise, but it is worth documenting. The debug portal is also accessible via the `/debug` route in the production app bundle.
- **Remediation:** (1) Validate `portalUrl` against an allowlist of trusted origins at build time. (2) Consider removing the `/debug` route from production builds (`import.meta.env.PROD` guard). (3) Add `sandbox="allow-scripts allow-same-origin"` attribute to the iframe to limit capabilities.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No Auth/Authz on Any Endpoint | **High** | CWE-306, CWE-862 |
| SAST-002 | Missing HTTP Security Headers | **High** | CWE-693, CWE-116 |
| SAST-003 | Unauthenticated Webhook + No Enum Validation | **High** | CWE-306, CWE-345, CWE-20 |
| SAST-004 | Prometheus Metrics Publicly Exposed | **High** | CWE-200 |
| SAST-005 | Error Message Disclosure in 500 Responses | Medium | CWE-209 |
| SAST-006 | Pagination `limit` Unbounded / NaN Unguarded | Medium | CWE-20, CWE-770 |
| SAST-007 | No Rate Limiting | Medium | CWE-770 |
| SAST-008 | Sequential Predictable DocIDs | Medium | CWE-200, CWE-330 |
| SAST-009 | Docker Container Runs as Root | Medium | CWE-250 |
| SAST-010 | `--dangerously-skip-permissions` in All CI Workflows | Medium | CWE-732 |
| SAST-011 | DebugPortalPage iframe Env-Controlled URL | Low | CWE-16, CWE-601 |

**Totals: 4 High, 6 Medium, 1 Low — 11 findings**

---

### Grading Estimate (per `security.config.yml`)

Based on the grading scale: `A: max_high=2`, `B: max_high=6`. With **4 High** findings, the codebase is currently in **grade C territory** (max_high=12, max_critical=1). No Critical findings were identified by SAST (no hardcoded secrets, no eval/RCE patterns, no SQL injection) — the most severe gap is the complete absence of authentication, which is a structural architectural issue rather than a code-level CWE like CWE-89 or CWE-78.

**Highest priority remediation:** SAST-001 (Authentication) is the prerequisite for almost all other findings — many Medium findings become significantly less exploitable once auth is in place.
