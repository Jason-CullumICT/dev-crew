---

## Static Analyzer Results

### Tools Run
- **gitleaks:** [TOOL UNAVAILABLE] — fell back to LLM pattern scan for secrets
- **semgrep:** [TOOL UNAVAILABLE] — fell back to LLM pattern scan for SAST patterns
- **npm scripts audit:** no `postinstall`/`prepare` scripts found in backend or frontend packages — ✅ clean

---

### SAST-01: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:22–31`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);
  app.use('/api/work-items', workflowRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/intake', intakeRouter);
  ```
- **Description:** Every API endpoint — including work item creation, state transitions (route/assess/approve/reject/dispatch), dashboard data, and intake webhooks — is mounted with zero authentication middleware. Any unauthenticated caller with network access can create, modify, delete, and transition work items. There is no bearer token check, no session middleware, and no API key guard anywhere in the application.
- **Remediation:** Add an authentication middleware (e.g., JWT verification via `express-jwt` or a custom API-key guard) before the route registrations. Apply it globally via `app.use(authMiddleware)` placed before the first `app.use('/api/...')` call. Exempt only `/health` and `/metrics` if internal-network-only.
- **Handoff:** `[HANDOFF → pen-tester]` — verify whether unauthenticated access to all state-transition endpoints can be exploited to fulfill the red-team objective of bypassing the work-item state machine.

---

### SAST-02: No HTTP Security Headers
- **Severity:** High
- **CWE:** CWE-693 (Protection Mechanism Failure), CWE-1021 (Improper Restriction of Rendered UI Layers)
- **File:** `Source/Backend/src/app.ts:1–54`
- **Code Snippet:**
  ```typescript
  const app = express();
  app.use(express.json());
  // ← No helmet(), no CORS config, no CSP, no X-Frame-Options
  app.use('/api/work-items', workItemsRouter);
  ```
- **Description:** The Express application has no HTTP security headers configured. Missing headers include:
  - `Content-Security-Policy` — enables XSS mitigation in the browser
  - `X-Frame-Options` / `frame-ancestors` — prevents clickjacking
  - `Strict-Transport-Security` — enforces HTTPS in browsers
  - `X-Content-Type-Options: nosniff` — prevents MIME sniffing
  - `Referrer-Policy` — controls referer leakage

  No `cors` middleware is configured either. By default Express serves no `Access-Control-Allow-Origin` header; however, without explicit restriction a misconfiguration could surface later.
- **Remediation:** Install and enable [`helmet`](https://helmetjs.github.io/): `app.use(helmet())` immediately after `const app = express()`. Explicitly configure CORS origins with `cors({ origin: [...allowedOrigins] })`.

---

### SAST-03: Intake Webhooks Accept Unauthenticated Requests with No Signature Verification
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-345 (Insufficient Verification of Data Authenticity)
- **File:** `Source/Backend/src/routes/intake.ts:11–54`
- **Code Snippet:**
  ```typescript
  router.post('/zendesk', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.title || !body.description) { ... }
    const item = store.createWorkItem({ ... type: body.type || WorkItemType.Bug, ... });
  ```
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept POST requests from any caller without verifying the request source. Zendesk signs outgoing webhooks with an HMAC-SHA256 signature in the `X-Zendesk-Webhook-Signature` header. This endpoint does not verify that signature, so any actor can forge a Zendesk webhook and inject arbitrary work items into the backlog. The same applies to the `automated` endpoint.
- **Remediation:** For the Zendesk endpoint, read `ZENDESK_WEBHOOK_SECRET` from the environment and validate the HMAC-SHA256 signature of the raw request body before processing. Reject requests that fail signature verification with HTTP 401. For `automated`, require a pre-shared bearer token or API key in the `Authorization` header.

---

### SAST-04: No Pagination Limit Cap — Potential Denial of Service
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`
- **Code Snippet:**
  ```typescript
  // workItems.ts
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,

  // dashboard.ts
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  ```
- **Description:** The `limit` query parameter is parsed and passed directly to the store's pagination logic with no upper-bound check. A caller can set `?limit=999999999`, causing the store to serialize every item in memory into the HTTP response. With the in-memory store this degrades to O(n) memory allocation for the response body on every request — an easy unauthenticated DoS vector given finding SAST-01.
- **Remediation:** Clamp the limit on ingress: `const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100)`. Apply the same clamp in the dashboard activity endpoint.

---

### SAST-05: Intake Routes Do Not Validate `type` and `priority` Enum Values
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22–24`, `intake.ts:45–47`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    type: body.type || WorkItemType.Bug,       // body.type is unvalidated
    priority: body.priority || WorkItemPriority.Medium,  // body.priority is unvalidated
    source: WorkItemSource.Zendesk,
  });
  ```
- **Description:** Unlike the main `POST /api/work-items` route which validates `type`, `priority`, and `source` against their enum values, the intake routes apply no such validation. A forged webhook body with `type: "MALICIOUS_TYPE"` would store an invalid enum string in the work item. This pollutes the in-memory store with out-of-spec data that can break downstream routing logic (the router service's `isFastTrack` and `isFullReview` type checks would behave unexpectedly).
- **Remediation:** Add the same enum validation guards as the main creation route before calling `store.createWorkItem`. Reject with `400` if `body.type` is present but not a member of `WorkItemType`.

---

### SAST-06: Raw Error Messages Returned to Clients in 500 Responses
- **Severity:** Medium
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **File:** `Source/Backend/src/routes/workflow.ts:59–63`, `:86–90`, `:137–140`, `:203–207`, `:291–294`, `:347–350`
- **Code Snippet:**
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });   // ← raw message to client
  }
  ```
- **Description:** Every route catch block in `workflow.ts` forwards the raw exception message to the HTTP client as the `error` field of the 500 response. If an unexpected error from a library or system call surfaces, internal details (stack fragments, file paths, internal state) may be included. The global `errorHandler` middleware correctly returns `{ error: 'Internal server error' }`, but that middleware is bypassed because the routes respond before reaching it.
- **Remediation:** Log the full `message` (as already done) but return a generic `{ error: 'Internal server error' }` to the client in catch blocks. Re-throw domain-level errors as typed error classes with client-safe messages if specific feedback is needed.

---

### SAST-07: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **File:** `Source/Backend/src/app.ts:1–54`
- **Description:** No rate-limiting middleware (e.g., `express-rate-limit`) is applied globally or per-route. Combined with the absence of authentication (SAST-01), any unauthenticated caller can issue unlimited concurrent requests to any endpoint. This enables both resource exhaustion DoS and high-frequency automated attacks against state-transition endpoints.
- **Remediation:** Apply `express-rate-limit` globally with a baseline limit (e.g., 100 req/min per IP). Apply stricter limits on mutation endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, `/intake/*`).

---

### SAST-08: Prometheus `/metrics` Endpoint Exposed Without Authentication
- **Severity:** Medium
- **CWE:** CWE-497 (Exposure of Sensitive System Information to an Unauthorized Control Sphere)
- **File:** `Source/Backend/src/app.ts:34–37`
- **Code Snippet:**
  ```typescript
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
  ```
- **Description:** The Prometheus metrics endpoint reveals internal operational counters (`workflow_items_created_total`, `dispatch_gating_events_total`, `cycle_detection_events_total`, Node.js heap metrics, etc.) to any unauthenticated caller. This aids reconnaissance — an attacker can observe system load, item throughput, and state-machine event rates without any credentials.
- **Remediation:** Restrict `/metrics` to localhost or an internal network segment at the network level (firewall/reverse-proxy). If it must be Internet-accessible, require a bearer token or basic auth header.

---

### SAST-09: Unvalidated Query Filter Parameters Cast to Enum Types
- **Severity:** Low
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/workItems.ts:62–65`
- **Code Snippet:**
  ```typescript
  const filters = {
    status: req.query.status as WorkItemStatus | undefined,
    type:   req.query.type   as WorkItemType   | undefined,
    ...
  };
  ```
- **Description:** TypeScript `as` casts are compile-time only; at runtime `req.query.status` is an arbitrary string. Passing `?status=INVALID` sends the string `"INVALID"` into the store's filter, which does a strict equality comparison (`item.status === filters.status`), so no item matches and the result set is silently empty. While not exploitable in the current in-memory implementation, this violates the principle of validating all external input and will become a correctness issue if the store is replaced with a SQL/NoSQL backend that interpolates the filter value.
- **Remediation:** Validate enum filter values before passing them to the store. Return `400` with an `error` message listing valid values for any unrecognized filter string.

---

### SAST-10: Docker Container Runs as Root
- **Severity:** Low
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `portal/Dockerfile:6–23`
- **Code Snippet:**
  ```dockerfile
  FROM node:22-slim
  WORKDIR /app
  COPY ...
  RUN cd Backend && npm install
  # ← No USER directive
  CMD ["bash", "-c", "cd /app/Backend && npx tsx ..."]
  ```
- **Description:** The portal Dockerfile installs dependencies and runs both the backend and frontend server processes as root (the default for the `node:22-slim` base image). If any dependency or application code achieves code execution (e.g., via a compromised package), it runs with full container-root privileges, making container escape or volume mount abuse more impactful.
- **Remediation:** Add `RUN groupadd -r appgroup && useradd -r -g appgroup appuser` then `USER appuser` before the `CMD` directive. Ensure `WORKDIR` permissions are set accordingly.

---

### SAST-11: Sequential, Predictable Document IDs Enable Enumeration
- **Severity:** Low
- **CWE:** CWE-340 (Generation of Predictable Numbers or Identifiers)
- **File:** `Source/Backend/src/utils/id.ts:12–15`
- **Code Snippet:**
  ```typescript
  export function generateDocId(): string {
    docIdCounter += 1;
    return `WI-${String(docIdCounter).padStart(3, '0')}`;
  }
  ```
- **Description:** Human-readable document IDs (`WI-001`, `WI-002`, …) are globally sequential and monotonically increasing. An authenticated (or currently, unauthenticated per SAST-01) user can infer the total number of work items ever created by observing the highest `docId` in any response. The primary `id` field correctly uses UUIDv4 and is not predictable.
- **Remediation:** This is by-design for human readability and acceptable at low severity as long as SAST-01 (authentication) is addressed. If business-confidentiality of item count is a concern, consider using a non-sequential format or restricting exposure of `docId` in listing responses.

---

### Summary Table

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-01 | No Authentication on Any Endpoint | **High** | CWE-306 |
| SAST-02 | No HTTP Security Headers | **High** | CWE-693, CWE-1021 |
| SAST-03 | Intake Webhooks — No Signature Verification | **High** | CWE-306, CWE-345 |
| SAST-04 | No Pagination Limit Cap | Medium | CWE-400 |
| SAST-05 | Intake Routes Missing Enum Validation | Medium | CWE-20 |
| SAST-06 | Raw Error Messages Returned to Clients | Medium | CWE-209 |
| SAST-07 | No Rate Limiting | Medium | CWE-400 |
| SAST-08 | `/metrics` Endpoint Unauthenticated | Medium | CWE-497 |
| SAST-09 | Query Filter Params Not Validated | Low | CWE-20 |
| SAST-10 | Docker Container Runs as Root | Low | CWE-250 |
| SAST-11 | Sequential Predictable DocIDs | Low | CWE-340 |

**Counts:** High: 3 · Medium: 5 · Low: 3 · Total: 11

**Grade projection (per security.config.yml):** Requires 0 Critical and ≤2 High for grade A; current 3 High findings place the static analysis contribution at **grade B** (0 critical, 3 high ≤ 6).

**Scan exclusions confirmed clean:**
- No `eval`, `Function()`, `child_process`, `exec`, `spawn` in first-party code
- No `dangerouslySetInnerHTML` or raw DOM writes in the React frontend
- No hardcoded secrets, tokens, or passwords found in any source file
- `uuid/v4` used for primary IDs (not `Math.random()`) — ✅ cryptographically appropriate
- No SQL/NoSQL database in use — SQL injection and NoSQL injection patterns are N/A
- No third-party dependency CVEs scanned — `[SEE dependency-auditor]`
