---

## Static Analyzer Results

### Tools Run
- **gitleaks:** `[TOOL UNAVAILABLE: gitleaks]` — fell back to LLM pattern scan
- **semgrep:** `[TOOL UNAVAILABLE: semgrep]` — fell back to LLM pattern scan

No postinstall scripts found in `Source/Backend/package.json` or `Source/Frontend/package.json`. No hardcoded secrets found anywhere in `Source/`.

---

### SAST-001: Complete Absence of Authentication and Authorization
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-862 (Missing Authorization)
- **File:** `Source/Backend/src/app.ts:21-31`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Not a single route is protected by authentication middleware. Any unauthenticated client who can reach port 3001 can create, read, update, soft-delete, approve, reject, or dispatch any work item. Workflow state transitions (approve/reject/dispatch) are particularly sensitive — they are permanently logged in change history. There is no session management, JWT, API key check, or any other access control.
- **Remediation:** Add an authentication middleware (e.g., API key check, JWT validation) before all `/api/` routes. At minimum: `app.use('/api', requireAuth)`. Add role-based access control for state-mutating actions (approve, reject, dispatch).
- **Handoff:** [HANDOFF → pen-tester] — verify bypass via HTTP method overrides, path traversal on `/api/../`.

---

### SAST-002: Webhook Intake Endpoints Lack Signature Verification
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/routes/intake.ts:11-31` (zendesk), `:34-54` (automated)
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ title: body.title, ... source: WorkItemSource.Zendesk });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept any HTTP POST and create work items without verifying the caller is actually Zendesk (or a trusted system). Zendesk webhooks carry an HMAC-SHA256 signature in `X-Zendesk-Webhook-Signature`. Without verification, any attacker can flood the system with fabricated work items, impersonate Zendesk events, or inject malicious titles/descriptions.
- **Remediation:** For `/intake/zendesk`: validate the `X-Zendesk-Webhook-Signature` header against a shared secret using `crypto.timingSafeEqual(hmac, provided)`. For `/intake/automated`: require an API key or shared secret in a header (e.g., `Authorization: Bearer <token>`). Store secrets in environment variables.
- **Handoff:** [HANDOFF → pen-tester]

---

### SAST-003: Internal Error Messages Leaked to API Clients
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:62, 89, 140, 207, 294, 350, 370`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // ← raw err.message to client
  }
  ```
- **Description:** In all seven catch blocks in `workflow.ts`, the raw `err.message` string from any uncaught exception is returned to the API client in the JSON response body. If an unexpected exception occurs (e.g., from a dependency, from the store, or from unexpected input), internal implementation details, file paths, or system identifiers could be disclosed. The global `errorHandler` correctly returns `"Internal server error"`, but these local try/catch blocks bypass it.
- **Remediation:** Replace with a safe fallback for 500-class errors:
  ```typescript
  logger.error({ msg: 'Route action failed', error: message });
  res.status(500).json({ error: 'Internal server error' });
  ```
  Log the full `err.message` (and `err.stack`) server-side only. Reserve `message` passthrough for known, intentional 400/404 errors only.

---

### SAST-004: Unbounded Pagination `limit` Parameter (Denial of Service Vector)
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  // workItems.ts:69-70
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,

  // dashboard.ts:18
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  ```
- **Description:** The `limit` query parameter is parsed and forwarded directly to the store with no upper bound enforced. A caller can issue `GET /api/work-items?limit=2147483647` to force the server to serialize the entire in-memory dataset into a single response, consuming CPU and memory. Additionally, there is no `isNaN` guard — `?page=-1` results in a negative array offset that returns items from the tail of the list rather than a 400 error (negative `Array.slice` offset is valid JavaScript; it silently returns wrong data).
- **Remediation:**
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
  const rawPage = parseInt(req.query.page as string, 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  ```

---

### SAST-005: Unauthenticated Prometheus `/metrics` Endpoint
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
- **Description:** The Prometheus metrics endpoint is publicly accessible without any authentication. The exposed metrics include `workflow_items_created_total`, `workflow_items_dispatched_total{team}`, `workflow_items_assessed_total{verdict}`, and Node.js default metrics (heap size, event loop lag, GC stats, etc.). This provides an attacker with operational intelligence: activity patterns, team capacity, throughput, and VM/container resource state. In a SOC 2 context, this is an information disclosure against CC6.1 (access controls).
- **Remediation:** Restrict `/metrics` access to internal/trusted networks via a separate port or via IP allowlist middleware:
  ```typescript
  app.get('/metrics', requireInternalAccess, async (_req, res) => { ... });
  ```
  Or bind a separate internal metrics server on a non-public port.

---

### SAST-006: Missing HTTP Security Headers (No `helmet`)
- **Severity:** Medium
- **CWE:** CWE-16 (Configuration), maps to OWASP A05:2021 Security Misconfiguration
- **File:** `Source/Backend/src/app.ts` (no helmet/security headers configured)
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ← No helmet(), no CSP, no X-Frame-Options, no HSTS
  ```
- **Description:** The Express application does not set any HTTP security response headers. Missing headers include:
  - `Content-Security-Policy` — allows inline script injection in any served HTML
  - `X-Frame-Options: DENY` — allows clickjacking of the API explorer or any HTML responses
  - `X-Content-Type-Options: nosniff` — allows MIME-type sniffing attacks
  - `Strict-Transport-Security` — missing HSTS means no forced HTTPS
  - `Referrer-Policy` — URLs with item IDs may leak via Referer headers

  The backend is primarily a JSON API, but Express can serve HTML on error pages or if misconfigured, and the frontend consumes these responses.
- **Remediation:** Add `helmet` as early middleware:
  ```bash
  npm install helmet
  ```
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```

---

### SAST-007: No CORS Policy Configured
- **Severity:** Medium
- **CWE:** CWE-942 (Permissive Cross-domain Policy)
- **File:** `Source/Backend/src/app.ts`
- **Description:** The Express server has no explicit CORS configuration. In development, the Vite proxy (`/api → http://localhost:3001`) masks this. In any deployment where the backend is directly accessible (including the Docker ephemeral test environment where port 3001 is exposed), browser-based cross-origin requests are subject only to browser default same-origin restrictions. Without explicit `Access-Control-Allow-Origin` restrictions and credential controls, any origin running in a browser can make unauthenticated requests to the API. Critically absent is `credentials: false` enforcement to prevent cookie forwarding.
- **Remediation:**
  ```bash
  npm install cors
  ```
  ```typescript
  import cors from 'cors';
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? false }));
  ```

---

### SAST-008: `<iframe>` Missing `sandbox` Attribute
- **Severity:** Low
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers — Clickjacking / iframe abuse)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-14`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}          // from VITE_PORTAL_URL env or 'http://localhost:4200'
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
  />
  ```
- **Description:** The debug portal iframe has no `sandbox` attribute. A sandboxed iframe restricts the embedded document from executing scripts, submitting forms, navigating the top-level frame, or accessing storage. Without sandboxing, if `VITE_PORTAL_URL` is misconfigured or poisoned (e.g., via a compromised `.env` file), the embedded content runs with full origin privileges. Even for a trusted internal tool, defence-in-depth requires sandbox restrictions.
- **Remediation:**
  ```tsx
  <iframe
    src={portalUrl}
    sandbox="allow-scripts allow-same-origin allow-forms"
    title="Debug Portal"
    style={{ ... }}
  />
  ```

---

### SAST-009: No Input Length Limits on Free-Text Fields
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:24-27`, `Source/Backend/src/routes/intake.ts:14-18`
- **Code Snippet:**
  ```typescript
  if (!body.title || !body.description) {
    res.status(400).json({ error: 'title and description are required' });
    return;
  }
  ```
- **Description:** `title` and `description` fields are checked for presence only — no maximum length is enforced. Combined with the default `express.json()` body size limit of 100 KB, a caller could submit a work item with a 100 KB description. This is stored in the in-memory `Map` and returned in every list/detail response, causing downstream memory and serialization pressure. The `express.json()` call at line 13 of `app.ts` uses the default 100 KB limit, but no per-field length validation exists.
- **Remediation:** Add field-level validation:
  ```typescript
  if (body.title.length > 200) { res.status(400).json({ error: 'title must be ≤ 200 characters' }); return; }
  if (body.description.length > 5000) { res.status(400).json({ error: 'description must be ≤ 5000 characters' }); return; }
  ```
  Also consider setting `express.json({ limit: '10kb' })` to reduce the attack surface.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No Authentication on Any Endpoint | **High** | CWE-306, CWE-862 |
| SAST-002 | Webhook Intake Without Signature Verification | **High** | CWE-306 |
| SAST-003 | `err.message` Leaked in HTTP 500 Responses | Medium | CWE-209 |
| SAST-004 | Unbounded Pagination `limit` (DoS Vector) | Medium | CWE-400 |
| SAST-005 | Unauthenticated `/metrics` Endpoint | Medium | CWE-200 |
| SAST-006 | Missing HTTP Security Headers (no helmet) | Medium | CWE-16 |
| SAST-007 | No CORS Policy | Medium | CWE-942 |
| SAST-008 | `<iframe>` Missing `sandbox` Attribute | Low | CWE-1021 |
| SAST-009 | No Input Length Limits on Free-Text Fields | Low | CWE-20 |

**Findings: 2 High, 5 Medium, 2 Low — Total: 9**  
**Hardcoded secrets: None found**  
**Dynamic code execution (eval/exec/shell): None found**  
**Weak crypto (MD5/SHA1/DES): None found**  
**Unsafe deserialization: None found**

*Learnings updated at `Teams/TheGuardians/learnings/static-analyzer.md`.*
