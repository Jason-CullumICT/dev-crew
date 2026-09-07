---

## Static Analyzer Results

### Tools Run
- **gitleaks**: `[TOOL UNAVAILABLE: gitleaks]` — LLM pattern scan used for secret detection
- **semgrep**: `[TOOL UNAVAILABLE: semgrep]` — LLM pattern scan used for SAST patterns
- **npm postinstall scripts**: No suspicious scripts found (build/test/typecheck only)

---

### SAST-001: No Authentication or Authorization on Any API Endpoint

- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:1–54`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);   // CRUD — public
  app.use('/api/work-items', workflowRouter);    // approve/reject/dispatch — public
  app.use('/api/dashboard', dashboardRouter);    // metrics — public
  app.use('/api/intake', intakeRouter);          // webhook intake — public
  ```
- **Description:** Zero authentication or authorization middleware is wired into the Express app. All workflow state transition endpoints — including manual approve (`POST /:id/approve`), reject (`POST /:id/reject`), and dispatch (`POST /:id/dispatch`) — are reachable by any unauthenticated caller. No JWT, session, API-key, or any other auth scheme is present anywhere in `Source/Backend/src/`.
- **Remediation:** Add auth middleware (e.g., express-jwt or a custom API-key check) to `app.ts` before the route registrations. Scope workflow mutation endpoints to authenticated roles. At minimum protect state-transition routes.
- **Handoff:** `[HANDOFF → pen-tester]` — verify unauthenticated state manipulation (approve/reject/dispatch any work item without credentials)

---

### SAST-002: Intake Webhooks Accept Unvalidated Enum Values (CWE-20)

- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Code Snippet:**
  ```typescript
  // /api/intake/zendesk — no type/priority validation
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,           // body.type unchecked
    priority: body.priority || WorkItemPriority.Medium, // body.priority unchecked
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints do not validate `body.type` or `body.priority` against the `WorkItemType` / `WorkItemPriority` enums. The regular `POST /api/work-items` endpoint performs full enum validation (lines 29–47 of `workItems.ts`), but the intake routes skip it entirely. A caller can inject arbitrary string values into `type` and `priority` fields that will be persisted to the in-memory store and returned in API responses, breaking assumptions downstream that `type` and `priority` are enum members.
- **Remediation:** Add the same enum guard used in `workItems.ts` to both intake routes:
  ```typescript
  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    return res.status(400).json({ error: 'Invalid type value' });
  }
  ```
  Also add webhook signature verification (HMAC) for the Zendesk endpoint.

---

### SAST-003: No Pagination Limit Cap — Potential Memory Exhaustion (CWE-400)

- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  // workItems.ts:70
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,

  // dashboard.ts:18
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  ```
- **Description:** User-supplied `limit` query parameters are parsed and passed directly to the store with no maximum enforcement. A caller can request `?limit=10000000` and force the server to serialize the entire in-memory dataset in one response, consuming unbounded memory and CPU. No rate limiting is present anywhere in the application.
- **Remediation:** Clamp the limit to a safe maximum:
  ```typescript
  const MAX_LIMIT = 100;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  ```

---

### SAST-004: Unauthenticated Prometheus `/metrics` Endpoint (CWE-200)

- **Severity:** Medium
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **File:** `Source/Backend/src/app.ts:34–37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The Prometheus scrape endpoint is publicly accessible with no authentication. It exposes internal operational telemetry: item counts by team, dispatch counts, assessment verdicts, and prom-client default metrics (Node.js heap usage, event-loop lag, GC timings, open file descriptors). This data can aid an attacker in fingerprinting the system and understanding workflow state.
- **Remediation:** Restrict `/metrics` to internal network access (reverse-proxy or firewall rule), or add a static bearer token check:
  ```typescript
  app.get('/metrics', (req, res, next) => {
    if (req.headers.authorization !== `Bearer ${process.env.METRICS_TOKEN}`) {
      return res.status(401).end();
    }
    next();
  }, async (_req, res) => { ... });
  ```

---

### SAST-005: Missing HTTP Security Headers — No helmet.js or Equivalent (CWE-116)

- **Severity:** Medium
- **CWE:** CWE-116 (Improper Encoding or Escaping of Output), CWE-1021 (Improper Restriction of Rendered UI Layers)
- **File:** `Source/Backend/src/app.ts:1–54` (no headers set)
- **Code Snippet:**
  ```typescript
  // No helmet(), no CORS(), no CSP, no HSTS, no X-Frame-Options
  const app = express();
  app.use(express.json());
  ```
- **Description:** The Express application sets no HTTP security headers. Missing headers include:
  - `Content-Security-Policy` — XSS mitigation
  - `X-Frame-Options` / `frame-ancestors` — clickjacking protection
  - `Strict-Transport-Security` — HSTS (enforces HTTPS)
  - `X-Content-Type-Options: nosniff` — MIME-sniffing protection
  - No explicit CORS policy — any origin can make credentialed requests from a browser
- **Remediation:** Add `helmet` package to enforce sane header defaults, and configure `cors` middleware with an explicit allowlist:
  ```typescript
  import helmet from 'helmet';
  import cors from 'cors';
  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' }));
  ```

---

### SAST-006: Unvalidated `overrideRoute` Parameter Stored as-is (CWE-20)

- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/services/router.ts:66–88`
- **Code Snippet:**
  ```typescript
  export function classifyRoute(item: WorkItem, overrideRoute?: WorkItemRoute): RouteResult {
    if (overrideRoute) {
      return {
        route: overrideRoute,          // stored as-is — no enum membership check
        targetStatus:
          overrideRoute === WorkItemRoute.FastTrack
            ? WorkItemStatus.Approved
            : WorkItemStatus.Proposed,
      };
    }
  ```
- **Description:** The `overrideRoute` field from `POST /api/work-items/:id/route` is passed through TypeScript type assertions but never validated at runtime. An attacker can send `{"overrideRoute": "arbitrary-string"}` and have it persisted in the `route` field of the work item. TypeScript types do not enforce runtime enum membership. The status transition defaults to `Proposed` for unknown values, so the state machine isn't bypassed, but the `route` field is polluted with unvalidated data.
- **Remediation:**
  ```typescript
  if (body?.overrideRoute && !Object.values(WorkItemRoute).includes(body.overrideRoute)) {
    return res.status(400).json({ error: 'Invalid overrideRoute value' });
  }
  ```
- **Handoff:** `[HANDOFF → pen-tester]` — verify whether a crafted `overrideRoute` value can be used to fast-track items that shouldn't be

---

### SAST-007: Internal Error Messages Surfaced to HTTP Clients (CWE-209)

- **Severity:** Low
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:60–63`, multiple catch blocks
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });  // internal message echoed to client
  }
  ```
- **Description:** Caught error messages from internal services (e.g., `"Work item abc-123 not found"`, `"Failed to update work item"`) are returned verbatim in HTTP 500 responses. While the global `errorHandler` correctly returns a generic message, the try/catch blocks in all workflow route handlers bypass it by replying directly. This leaks internal IDs and system state in error conditions.
- **Remediation:** For unexpected errors, return a generic message to the client and log the detail server-side only. Reserve specific messages for domain errors (400/404):
  ```typescript
  res.status(500).json({ error: 'Internal server error' });
  ```

---

### SAST-008: Docker Socket Mounted in Orchestrator Container (Platform Scope)

- **Severity:** High
- **CWE:** CWE-269 (Improper Privilege Management)
- **File:** `platform/docker-compose.yml:27`
- **Code Snippet:**
  ```yaml
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ```
- **Description:** The orchestrator container is granted access to the host Docker daemon socket. A compromised orchestrator container can spawn privileged containers, mount host filesystems, and achieve full host OS compromise. This is a well-known container escape vector. *Note: this file is in `platform/` (orchestrator infrastructure) — modifying it requires a solo session per project rules.*
- **Remediation:** Assess whether the orchestrator actually needs direct Docker API access. If so, consider using a Docker-in-Docker sidecar or socket proxy (e.g., `docker-socket-proxy`) that limits the available API surface.

---

### SAST-009: Host Claude Credentials File Bind-Mounted into Container (Platform Scope)

- **Severity:** Medium
- **CWE:** CWE-522 (Insufficiently Protected Credentials)
- **File:** `platform/docker-compose.yml:29`
- **Code Snippet:**
  ```yaml
  - ~/.claude/.credentials.json:/root/.claude/.credentials.json:ro
  ```
- **Description:** The operator's local Claude API credentials file is bind-mounted read-only into the orchestrator container. If the orchestrator container is compromised (e.g., via a malicious work item or dependency), the credentials file is readable by the attacker. *Note: platform/ scope — solo session required for remediation.*
- **Remediation:** Pass the credential value as an environment variable or Docker secret rather than mounting the raw file:
  ```yaml
  environment:
    - CLAUDE_API_KEY=${CLAUDE_API_KEY}
  ```

---

### Summary

| ID | Severity | CWE | Title |
|----|----------|-----|-------|
| SAST-001 | **High** | CWE-306 | No auth on any API endpoint |
| SAST-008 | **High** | CWE-269 | Docker socket mounted in orchestrator *(platform/)* |
| SAST-002 | **Medium** | CWE-20 | Intake webhook unvalidated enum values |
| SAST-003 | **Medium** | CWE-400 | No pagination limit cap — DoS |
| SAST-004 | **Medium** | CWE-200 | Unauthenticated `/metrics` endpoint |
| SAST-005 | **Medium** | CWE-116/1021 | Missing security headers (helmet, CORS, CSP, HSTS) |
| SAST-009 | **Medium** | CWE-522 | Host credentials mounted in container *(platform/)* |
| SAST-006 | **Low** | CWE-20 | Unvalidated `overrideRoute` stored as-is |
| SAST-007 | **Low** | CWE-209 | Internal error messages echoed to clients |

**Findings: High=2, Medium=5, Low=2, Total=9**

**No hardcoded secrets found** in first-party source. The `.env.example` file contains only placeholder comments with no token values set.

**No dangerous APIs found**: no `eval`, `exec`, `child_process`, `Math.random` for tokens, unsafe XML parsing, or dynamic code execution patterns in first-party code.
