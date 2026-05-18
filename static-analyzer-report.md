---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE] — no binary installed; LLM pattern scan substituted
- **semgrep**: [TOOL UNAVAILABLE] — no binary installed; LLM pattern scan substituted
- **npm scripts audit**: `build`, `test`, `typecheck` only — no suspicious postinstall hooks ✅

**12 findings across 5 High / 5 Medium / 2 Low.** No hardcoded secrets detected.

---

### SAST-001: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:1-54`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);  // full CRUD, unauthenticated
  app.use('/api/work-items', workflowRouter);   // state transitions, unauthenticated
  app.use('/api/dashboard', dashboardRouter);   // data exposure, unauthenticated
  app.use('/api/intake', intakeRouter);         // webhook injection, unauthenticated
  ```
- **Description:** There is zero authentication middleware in the Express application. All write operations (POST create, PATCH update, DELETE, state transitions like approve/reject/dispatch) are publicly accessible with no identity check. Any network-reachable client can create, modify, delete, or transition work items.
- **Remediation:** Add an authentication middleware (e.g., JWT bearer, API key validation) to the Express pipeline before route registration. Scope sensitive mutation routes behind role checks.
- **Handoff:** [HANDOFF → pen-tester] — verify BOLA/IDOR exploitability on all item IDs without auth

---

### SAST-002: Webhook Intake Routes Lack Signature Verification
- **Severity:** High
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11-55`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ title: body.title, ... });
  });
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept arbitrary POSTs with no HMAC signature verification, API key header check, or IP allowlisting. An attacker can inject unlimited crafted work items, flooding the queue or inserting malicious payloads as titles/descriptions.
- **Remediation:** For Zendesk webhooks, validate `X-Zendesk-Webhook-Signature-256` (HMAC-SHA256). For automated intake, require a shared secret in an `Authorization` or `X-Api-Key` header. Fail with `401` on missing/invalid signatures.
- **Handoff:** [HANDOFF → pen-tester] — probe for queue flooding and malformed payload injection via these endpoints

---

### SAST-003: Intake Routes Accept Unvalidated Enum Fields (type, priority)
- **Severity:** High
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:19-25, 38-48`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,       // ← body.type not validated
    priority: body.priority || WorkItemPriority.Medium,  // ← body.priority not validated
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** Unlike the manual create route (`workItems.ts`) which validates `type` and `priority` against their enums, the intake routes pass `body.type` and `body.priority` directly to `createWorkItem()` without enum validation. An attacker can store arbitrary strings in these fields, bypassing business logic that branches on these values (routing, assessment, dispatch).
- **Remediation:** Add the same enum guards used in `workItems.ts` POST route (lines 29–43) to both intake handlers before calling `createWorkItem()`.

---

### SAST-004: No HTTP Security Headers (Helmet Missing)
- **Severity:** High
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ← No helmet(), no CORS policy, no CSP, no X-Frame-Options, no HSTS
  app.use('/api/work-items', workItemsRouter);
  ```
- **Description:** No `helmet` middleware or equivalent is present. Missing headers include: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`. Additionally, there is no explicit CORS policy — the API inherits browser default behavior, which may allow cross-origin reads from any origin in some configurations.
- **Remediation:** Add `app.use(helmet())` from the `helmet` npm package as the first middleware. Configure CORS via `cors({ origin: allowlist })` and restrict methods/headers explicitly.

---

### SAST-005: Unbounded Pagination `limit` Parameter
- **Severity:** High
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  // workItems.ts:70
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  // dashboard.ts:18
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  ```
- **Description:** The `limit` query parameter is passed directly from `parseInt()` with no upper bound enforced. Requesting `?limit=10000000` would force the server to iterate over and serialize the entire in-memory dataset in a single response, potentially causing a denial of service or extreme memory allocation. Also: `parseInt('abc', 10)` returns `NaN` — not validated, which can silently produce `NaN` offsets (see SAST-011).
- **Remediation:** Cap to a maximum (e.g., 100): `const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);`. Validate `isNaN()` and reject with 400.

---

### SAST-006: Internal Exception Messages Leaked in 500 Responses
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
- **Description:** All workflow action routes return the raw exception `message` to the client in 500 responses. Error messages may contain internal state (e.g., `Work item <id> not found` after an invalid store state), file paths, or stack details. The `errorHandler.ts` correctly returns a generic message (`'Internal server error'`) but the inline catch blocks in `workflow.ts` bypass this safeguard.
- **Remediation:** For 500 responses, return a generic message: `res.status(500).json({ error: 'Internal server error' })`. Log the full `message` server-side only (already done). For domain errors that should surface (item not found, state conflict), handle them as explicit 4xx cases before reaching the catch block.

---

### SAST-007: Prometheus `/metrics` Endpoint Unauthenticated
- **Severity:** Medium
- **CWE:** CWE-200 (Exposure of Sensitive Information to Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34-37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The Prometheus metrics endpoint is publicly accessible with no authentication. It exposes counter labels including work item `source`, `type`, `verdict`, and `team` values, providing reconnaissance information about workflow volumes and team assignments. In a production deployment, this endpoint should not be reachable by untrusted clients.
- **Remediation:** Either: (a) restrict the `/metrics` route to an internal network or localhost interface, (b) require a scrape token via `Authorization: Bearer <token>`, or (c) bind metrics to a separate port not exposed externally.

---

### SAST-008: Dockerfile Runs as Root (No USER Directive)
- **Severity:** Medium
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `portal/Dockerfile:1-23`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim
  WORKDIR /app
  # ... npm install, copy source ...
  CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & ..."]
  # ← No USER directive — runs as root
  ```
- **Description:** The Docker image has no `USER` instruction. Both the build process and the running application execute as `root` (UID 0). If a code execution vulnerability is exploited (e.g., via the `eval`-equivalent route `SAST-001`), the attacker gains root access within the container, simplifying container escape or lateral movement.
- **Remediation:** Add before `CMD`:
  ```dockerfile
  RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
  USER appuser
  ```

---

### SAST-009: Vite Dev Server Binds to All Interfaces (`0.0.0.0`)
- **Severity:** Medium
- **CWE:** CWE-923 (Improper Restriction of Communication Channel to Intended Endpoints)
- **File:** `portal/Dockerfile:23`
- **Code Snippet:**
  ```dockerfile
  CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & cd /app/Frontend && npx vite --host 0.0.0.0 --port 5173 & wait"]
  ```
- **Description:** The Vite development server is explicitly started with `--host 0.0.0.0`, binding on all container interfaces. Vite dev servers expose Hot Module Replacement (HMR) WebSocket connections and detailed source maps. In a networked container environment, this means the raw development frontend (with source maps) is reachable from any network peer, not just localhost.
- **Remediation:** For production-equivalent environments, build the frontend (`npm run build`) and serve it via a static file server, not Vite dev server. If dev mode is intentional, add network-level controls (firewall, private Docker network) to restrict port 5173 to trusted clients.

---

### SAST-010: `iframe` Missing `sandbox` Attribute in DebugPortalPage
- **Severity:** Medium
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:9-15`
- **Code Snippet:**
  ```tsx
  <iframe
    src={portalUrl}                // configurable via VITE_PORTAL_URL env var
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Debug Portal"
    // ← no sandbox attribute
  />
  ```
- **Description:** The iframe embedding the debug portal has no `sandbox` attribute. A sandboxed iframe with minimal permissions (`allow-scripts allow-same-origin` or less) would restrict what the embedded page can do. Without sandboxing, the embedded page (loaded from `VITE_PORTAL_URL`) inherits full browser context — it can navigate the parent, access cookies, and execute arbitrary scripts. If `VITE_PORTAL_URL` can be influenced (e.g., via build-time env injection or misconfiguration), this becomes an XSS/clickjacking vector.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin"` (or the minimum permissions required) to the iframe element.

---

### SAST-011: `parseInt` on Query Params — NaN Not Validated
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
- **Description:** `parseInt('abc', 10)` returns `NaN`. Neither `page` nor `limit` is validated with `isNaN()`. When `page = NaN`, the arithmetic `(NaN - 1) * limit = NaN` is passed to `Array.slice(NaN, NaN)` which returns `[]` (empty array) — no crash, but silently incorrect pagination behavior. An attacker can reliably suppress list responses by passing `?page=AAAA`.
- **Remediation:** Use a safe parse helper: `const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)`. Reject `NaN` or default gracefully.

---

### SAST-012: No Rate Limiting on Any Endpoint
- **Severity:** Low
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts`
- **Description:** No rate-limiting middleware (e.g., `express-rate-limit`) is applied to any route. Intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) are particularly exposed — a client can POST thousands of work items per second, flooding the in-memory store. Workflow action routes are equally unprotected against replay/flooding.
- **Remediation:** Add `express-rate-limit` as a dependency and configure at minimum: a global rate limit (e.g., 100 req/IP/minute) and a stricter limit on intake endpoints (e.g., 10 req/IP/minute).

---

### Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No authentication on any endpoint | **High** | CWE-306 |
| SAST-002 | Webhook intake lacks signature verification | **High** | CWE-345 |
| SAST-003 | Intake routes skip enum validation | **High** | CWE-20 |
| SAST-004 | No HTTP security headers / Helmet missing | **High** | CWE-693 |
| SAST-005 | Unbounded pagination `limit` parameter | **High** | CWE-400 |
| SAST-006 | Internal exception messages in 500 responses | Medium | CWE-209 |
| SAST-007 | Prometheus `/metrics` unauthenticated | Medium | CWE-200 |
| SAST-008 | Dockerfile runs as root | Medium | CWE-250 |
| SAST-009 | Vite dev server binds to 0.0.0.0 | Medium | CWE-923 |
| SAST-010 | iframe missing sandbox attribute | Medium | CWE-1021 |
| SAST-011 | parseInt NaN not validated on query params | Low | CWE-20 |
| SAST-012 | No rate limiting on any endpoint | Low | CWE-770 |

**Not Found:** No hardcoded secrets/API keys, no eval/exec patterns, no SQL injection surfaces, no unsafe deserialization, no MD5/SHA1/DES usage, no `dangerouslySetInnerHTML`, no unvalidated redirects.

> **Per grading scale in `security.config.yml`**: 5 High findings maps to **Grade B** (≤6 High, 0 Critical). SAST-001 (no auth) is structurally critical from a OWASP A01 perspective and warrants escalation even if not a confirmed exploit — `[HANDOFF → pen-tester]` on findings SAST-001 and SAST-002 for live verification.
