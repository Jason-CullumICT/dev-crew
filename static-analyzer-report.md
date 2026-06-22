---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — LLM pattern scan substituted
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — LLM pattern scan substituted
- **No hardcoded secrets found** in first-party source code (credentials use `process.env` throughout; `.env.example` contains no real values)

---

### SAST-001: Complete Absence of Authentication and Authorization
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:21-32` / all route files
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);   // no auth middleware
  app.use('/api/work-items', workflowRouter);    // no auth middleware
  app.use('/api/dashboard', dashboardRouter);    // no auth middleware
  app.use('/api/intake', intakeRouter);          // no auth middleware
  ```
- **Description:** Every route — including state-machine transitions (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`) and data mutation — is publicly accessible with no authentication, session validation, or role check. Any caller with network access can create, modify, soft-delete, or force-transition any work item.
- **Remediation:** Add an authentication middleware (e.g. JWT Bearer or API key) before all `/api/*` routes. Separate public read endpoints from protected write/transition endpoints.
- **Handoff:** `[HANDOFF → pen-tester]` — verify unauthenticated access to all state-transition endpoints

---

### SAST-002: Webhook Intake Endpoints Accept Unauthenticated Payloads
- **Severity:** High
- **CWE:** CWE-346 (Origin Validation Error), CWE-306
- **File:** `Source/Backend/src/routes/intake.ts:11-31` (Zendesk), `:34-54` (Automated)
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;          // No HMAC-SHA256 signature check
    if (!body.title || !body.description) {
      res.status(400).json({ error: 'title and description are required' });
      return;
    }
    const item = store.createWorkItem({ ... });  // creates work item from any caller
  ```
- **Description:** Neither `/api/intake/zendesk` nor `/api/intake/automated` validates a webhook secret or HMAC signature. Any external actor can POST arbitrary data and inject work items directly into the pipeline, bypassing the normal creation path. Real Zendesk webhooks include a `X-Zendesk-Webhook-Signature` header for verification.
- **Remediation:** Verify `X-Zendesk-Webhook-Signature` (HMAC-SHA256) against a shared secret from env before processing. Apply equivalent secret-token auth for the automated endpoint.

---

### SAST-003: File Upload Trusts Client-Supplied MIME Type — Stored XSS Risk
- **Severity:** High
- **CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type), CWE-79 (Stored XSS)
- **File:** `portal/Backend/src/middleware/upload.ts:24-35` + `portal/Backend/src/index.ts:58`
- **Code Snippet:**
  ```typescript
  // upload.ts — MIME check trusts client Content-Type header, not file content
  const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {  // ← client-controlled
      cb(null, true);
    } else { cb(new Error('Invalid file type...')); }
  };
  // Extension from user-supplied filename:
  const ext = path.extname(file.originalname);  // ← attacker controls .html / .svg / .js
  cb(null, `${uuidv4()}${ext}`);

  // index.ts — uploaded files served as static content:
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  ```
- **Description:** `multer` populates `file.mimetype` from the request's `Content-Type` header — it does **not** inspect actual file bytes. An attacker can upload an HTML or SVG file with `Content-Type: image/jpeg` (passes the allowlist) while naming it `exploit.html` or `xss.svg`. The stored file acquires a `.html`/`.svg` extension; `express.static` serves it with `text/html` / `image/svg+xml` content-type; browsers execute embedded `<script>` tags, achieving persistent XSS against any user who follows the `/uploads/<uuid>.html` URL.
- **Remediation:** (1) Use `file-type` or `magic-bytes` library to verify actual file content against allowed image formats. (2) Strip/normalize the file extension to the verified type (`.jpg`, `.png`, `.gif`, `.webp` only — never preserve user-supplied extension). (3) Serve uploads from a separate origin or with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.

---

### SAST-004: Docker Socket Mounted Inside Orchestrator Container
- **Severity:** High
- **CWE:** CWE-269 (Improper Privilege Management), CWE-284 (Improper Access Control)
- **File:** `platform/docker-compose.yml:26`
- **Code Snippet:**
  ```yaml
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock   # full Docker daemon access
    - workspace:/workspace
    - ~/.claude/.credentials.json:/root/.claude/.credentials.json:ro
  ```
- **Description:** Mounting the Docker socket inside the orchestrator grants root-equivalent host access — any code running in that container (or any container it spawns) can use the Docker API to mount host filesystems, spawn privileged containers, or read host secrets. The `~/.claude/.credentials.json` mount compounds this: if the orchestrator container is compromised, Anthropic API credentials are exposed. Note: `platform/` is out of my primary scope — flagging for team leader.
- **Remediation:** Use Docker-in-Docker with a rootless daemon, or restrict socket access via authorization plugins (e.g. `authz`). Evaluate whether the socket is truly required or if a smaller-scope API (like Podman or a task queue) can replace it. Move credentials to a secrets manager.

---

### SAST-005: No HTTP Security Response Headers on Either Service
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure), CWE-1021 (Improper Restriction of Rendered UI Layers)
- **File:** `Source/Backend/src/app.ts` (all middleware), `portal/Backend/src/index.ts` (all middleware)
- **Code Snippet:**
  ```typescript
  // Source/Backend/src/app.ts — no helmet, no CSP, no X-Frame-Options
  app.use(express.json());
  app.use(workItemsRouter);
  // ...no security headers middleware
  ```
- **Description:** Neither service sets any of the standard defensive HTTP headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, or `Referrer-Policy`. The absence of `X-Content-Type-Options: nosniff` is especially relevant alongside SAST-003 (uploaded files will be MIME-sniffed by older browsers). The absence of CSP removes a critical last-defence layer against the XSS attack in SAST-003.
- **Remediation:** Add `helmet` middleware as the **first** middleware in both apps. Minimum: `helmet({ contentSecurityPolicy: true, xFrameOptions: { action: 'deny' }, xContentTypeOptions: true, hsts: { maxAge: 31536000 } })`.

---

### SAST-006: Pagination Limit Has No Upper-Bound Enforcement — Memory DoS
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  const pagination = {
    page:  req.query.page  ? parseInt(req.query.page  as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    // ↑ no Math.min(limit, MAX_LIMIT) clamp
  };
  ```
- **Description:** The `limit` query parameter is accepted without an upper bound. A caller can send `?limit=10000000` to force the server to allocate and serialize the entire in-memory work-item dataset in a single response. Given the in-memory store design, this is an effective memory/CPU denial-of-service.
- **Remediation:** Clamp to a sane maximum: `const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100)`. Apply consistently to all paginated endpoints.

---

### SAST-007: Internal Network Address Leaked in Orchestrator Proxy Error Response
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `portal/Backend/src/index.ts:139-141`
- **Code Snippet:**
  ```typescript
  } catch (err) {
    logger.error('Orchestrator proxy error', { url: targetUrl, error: (err as Error).message });
    const orchUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:9800';
    res.status(502).json({ error: `Orchestrator unreachable at ${orchUrl}` });
                                              // ↑ exposes internal host:port to client
  }
  ```
- **Description:** When the orchestrator is unreachable, the HTTP 502 response body includes the full internal `ORCHESTRATOR_URL` (e.g. `http://orchestrator:8080`). This reveals internal network topology and service names to any caller, aiding SSRF reconnaissance.
- **Remediation:** Return a generic message: `res.status(502).json({ error: 'Service temporarily unavailable' })`. Log the URL internally only.

---

### SAST-008: Source/Backend Has No CORS Policy — Cross-Origin Requests Permitted
- **Severity:** Medium
- **CWE:** CWE-942 (Permissive Cross-domain Policy with Sensitive Data)
- **File:** `Source/Backend/src/app.ts` (no CORS middleware present)
- **Description:** The workflow engine backend has no `cors()` middleware. Express's default allows all cross-origin requests. Combined with the lack of authentication (SAST-001), any page on any origin loaded in a user's browser can silently make authenticated API calls to the backend using the user's network context (e.g., on an internal network), perform CSRF-equivalent attacks, and exfiltrate or modify data. Contrast with `portal/Backend/src/index.ts` which correctly restricts origins via `ALLOWED_ORIGINS`.
- **Remediation:** Add `cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'], credentials: true })` before all route handlers. Match the pattern already used in the portal backend.

---

### SAST-009: Prometheus `/metrics` Endpoints Exposed Without Authentication
- **Severity:** Medium
- **CWE:** CWE-306 (Missing Authentication), CWE-200 (Exposure of Sensitive Information)
- **File:** `Source/Backend/src/app.ts:34`, `portal/Backend/src/index.ts:50`
- **Code Snippet:**
  ```typescript
  // Source/Backend/src/app.ts
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());   // no auth check
  });
  ```
- **Description:** Both services expose the full Prometheus metrics payload without any authentication. Metrics reveal dispatch rates, assessment verdicts, error rates, work-item creation velocity, and HTTP response patterns. This information aids an attacker in profiling the system, confirming exploits, and timing attacks. In production, metrics endpoints should be accessible only to the internal observability stack.
- **Remediation:** Either (a) restrict `/metrics` to an internal network segment via firewall/ingress rules, or (b) add a `Bearer` token middleware: `if (req.headers.authorization !== \`Bearer ${process.env.METRICS_TOKEN}\`) return res.status(401).end()`.

---

### SAST-010: Orchestrator Proxy Forwards Unvalidated Client-Controlled URL Path
- **Severity:** Medium
- **CWE:** CWE-918 (Server-Side Request Forgery)
- **File:** `portal/Backend/src/index.ts:75-78`
- **Code Snippet:**
  ```typescript
  app.use('/api/orchestrator', async (req, res) => {
    const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:9800';
    const targetUrl = `${orchestratorUrl}${req.url}`;  // req.url is client-controlled path
    // ... fetch(targetUrl, fetchOpts)
  ```
- **Description:** `req.url` within an `app.use('/api/orchestrator', ...)` handler contains the path *after* `/api/orchestrator`, which is fully client-controlled. The proxy passes it verbatim to `fetch()`. While path normalization in Express prevents naive `../` traversal, unusual encodings or edge cases may still reach unintended internal routes on the orchestrator (e.g., `/api/orchestrator/admin`, `/api/orchestrator/%2e%2e/internal`). There is no allowlist of permitted forwarded paths.
- **Remediation:** Define an explicit allowlist of forwarded path prefixes (e.g., `/api/cycles`, `/api/runs`). Reject any `req.url` that does not match: `if (!ALLOWED_PROXY_PATHS.some(p => req.url.startsWith(p))) return res.status(403).json({ error: 'Forbidden' })`.
- **Handoff:** `[HANDOFF → pen-tester]` — verify path traversal encodings against live proxy

---

### SAST-011: No Input Length Limits on Free-Text Fields
- **Severity:** Low
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:24-27`, `Source/Backend/src/routes/intake.ts:14-17`
- **Code Snippet:**
  ```typescript
  if (!body.title || !body.description) {
    res.status(400).json({ error: 'title and description are required' });
    return;                    // ↑ presence-only check, no max length
  }
  ```
- **Description:** `title` and `description` fields are checked for presence but not maximum length. An attacker can submit megabyte-sized strings that are stored in the in-memory Map and echoed back in list/detail responses, contributing to memory exhaustion over time.
- **Remediation:** Enforce `title.length <= 200` and `description.length <= 10000` (or similar per-domain limits) and return `400` if exceeded.

---

### SAST-012: Math.random() Used in Business-Logic Simulation
- **Severity:** Low
- **CWE:** CWE-338 (Use of Cryptographically Weak Pseudo-Random Number Generator)
- **File:** `portal/Backend/src/services/votingService.ts:111`, `portal/Backend/src/services/cycleService.ts:467`
- **Code Snippet:**
  ```typescript
  const rng = options.random ?? Math.random;  // injectable but defaults to Math.random
  ```
- **Description:** `Math.random()` is used as the RNG for AI vote simulation and cycle-routing logic. While this is not directly a security token (no passwords or session IDs generated this way), it is predictable and non-cryptographic. If an attacker can observe enough outputs, they can predict future routing or vote outcomes. Low severity given the simulation context.
- **Remediation:** Substitute `crypto.randomFloat()` (Node 20+) or `crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF` for production randomness. The injectable RNG pattern already makes this easy to swap.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any API endpoint | **High** | CWE-306 |
| SAST-002 | Webhook intake has no signature verification | **High** | CWE-346 |
| SAST-003 | File upload trusts client MIME → Stored XSS | **High** | CWE-434, CWE-79 |
| SAST-004 | Docker socket mounted in orchestrator | **High** | CWE-269 |
| SAST-005 | No HTTP security headers on either service | Medium | CWE-693 |
| SAST-006 | Pagination limit has no upper bound | Medium | CWE-400 |
| SAST-007 | Internal URL leaked in error response | Medium | CWE-209 |
| SAST-008 | Source/Backend has no CORS policy | Medium | CWE-942 |
| SAST-009 | /metrics endpoints unauthenticated | Medium | CWE-306 |
| SAST-010 | Orchestrator proxy forwards unvalidated paths | Medium | CWE-918 |
| SAST-011 | No input length limits on free-text fields | Low | CWE-400 |
| SAST-012 | Math.random() in vote/routing simulation | Low | CWE-338 |

**Totals: 4 High · 5 Medium · 3 Low · 0 Hardcoded secrets found**
