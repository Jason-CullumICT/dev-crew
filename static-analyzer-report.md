---

## Static Analyzer Results

### Tools Run
- **gitleaks**: [TOOL UNAVAILABLE: gitleaks] — not installed (exit 127); LLM pattern scan substituted
- **semgrep**: [TOOL UNAVAILABLE: semgrep] — not installed; LLM pattern scan substituted
- **No hardcoded secrets found** in first-party source code; all credentials use env vars / GitHub Secrets correctly

---

### SAST-001: No Authentication on Any API Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **File:** `Source/Backend/src/app.ts:21-44`
- **Code Snippet:**
  ```typescript
  app.use('/api/work-items', workItemsRouter);   // No auth guard
  app.use('/api/work-items', workflowRouter);    // No auth guard
  app.use('/api/dashboard', dashboardRouter);    // No auth guard
  app.use('/api/intake', intakeRouter);          // No auth guard
  ```
- **Description:** The entire Express application has no authentication or authorization middleware. All API routes — including work item CRUD, workflow state transitions (approve/reject/dispatch), and intake webhooks — are publicly accessible to anyone with network access to port 3001. There is no session validation, JWT check, API key, or any other access control layer. An unauthenticated caller can create, modify, approve, and dispatch work items, or force-transition items through the state machine.
- **Remediation:** Add an authentication middleware (e.g., JWT verification or API key check) applied globally before all routes. For the intake webhooks, at minimum add HMAC signature verification matching the Zendesk webhook signing secret (`req.headers['x-zendesk-webhook-signature']`).
- **Handoff:** [HANDOFF → pen-tester] — confirm exploitability of state machine bypass and unauthorized dispatch via unauthenticated endpoints.

---

### SAST-002: Intake Webhooks Accept Unvalidated Enum Values
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation)
- **File:** `Source/Backend/src/routes/intake.ts:22-23, 45-46`
- **Code Snippet:**
  ```typescript
  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,       // ← no enum validation
    priority: body.priority || WorkItemPriority.Medium, // ← no enum validation
    source: WorkItemSource.Zendesk,
  });
  itemsCreatedCounter.inc({ source: WorkItemSource.Zendesk, type: item.type }); // ← label poisoning
  ```
- **Description:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints use `body.type || default` and `body.priority || default` without validating against the `WorkItemType` and `WorkItemPriority` enums. Arbitrary string values are stored directly in the data store. This has two impacts: (1) corrupted data with non-enum status values can break downstream filtering logic; (2) `itemsCreatedCounter.inc({ type: item.type })` creates unbounded Prometheus label cardinality — an attacker sending distinct `type` strings for each request will exhaust memory (label cardinality attack). Contrast with `POST /api/work-items` which correctly validates via `Object.values(WorkItemType).includes(body.type)`.
- **Remediation:** Apply the same enum validation used in `workItems.ts` to both intake routes:
  ```typescript
  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Invalid type' }); return;
  }
  ```

---

### SAST-003: Unbounded Pagination `limit` — No Maximum Cap and No NaN Guard
- **Severity:** Medium
- **CWE:** CWE-20 (Improper Input Validation) / CWE-770 (Allocation of Resources Without Limits)
- **File:** `Source/Backend/src/routes/workItems.ts:69-70`, `Source/Backend/src/routes/dashboard.ts:17-18`
- **Code Snippet:**
  ```typescript
  // workItems.ts
  page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  // ← no isNaN check, no maximum bound
  ```
- **Description:** Two issues: (1) **No upper bound** — `?limit=999999` returns the entire in-memory store in one response, enabling a data-exfiltration or DoS scenario when the store grows large. (2) **No NaN guard** — `parseInt("abc", 10)` returns `NaN`; `store.findAll` receives `NaN` as the limit; `Array.slice(0, NaN)` silently returns an empty array, making the endpoint return no data with a 200 OK (silent failure). The same pattern occurs in `dashboard.ts` for the activity endpoint.
- **Remediation:**
  ```typescript
  const rawLimit = parseInt(req.query.limit as string, 10);
  const limit = (!isNaN(rawLimit) && rawLimit > 0) ? Math.min(rawLimit, 100) : 20;
  ```

---

### SAST-004: Missing HTTP Security Headers
- **Severity:** Medium
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **File:** `Source/Backend/src/app.ts` (entire file — no helmet or equivalent)
- **Description:** The Express backend does not set any HTTP security headers. Missing headers include:
  - `Content-Security-Policy` — XSS mitigation
  - `X-Frame-Options: DENY` — clickjacking protection
  - `X-Content-Type-Options: nosniff` — MIME-sniffing protection
  - `Strict-Transport-Security` — HTTPS enforcement
  - `Referrer-Policy`
  Additionally, there is no CORS policy configured. While the Vite dev proxy hides this in development, the production API on port 3001 has no cross-origin restrictions.
- **Remediation:** Add `helmet` as a dependency and apply it before all routes:
  ```typescript
  import helmet from 'helmet';
  app.use(helmet());
  ```
  Add CORS middleware with an explicit allowlist:
  ```typescript
  import cors from 'cors';
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }));
  ```

---

### SAST-005: Docker Containers Run as Root
- **Severity:** Medium
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **File:** `portal/Dockerfile`, `platform/Dockerfile.orchestrator`, `platform/Dockerfile.worker`
- **Code Snippet:**
  ```dockerfile
  # portal/Dockerfile — no USER directive
  FROM node:22-slim
  WORKDIR /app
  ...
  CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & ..."]
  ```
- **Description:** All three Dockerfiles are missing a `USER` directive. Containers run as root (UID 0). For the worker container (`Dockerfile.worker`), this is particularly risky: it runs Claude Code with `--dangerously-skip-permissions` and has access to the Docker socket (mounted in `docker-compose.yml` as `/var/run/docker.sock:/var/run/docker.sock`). A compromise of the worker process would give root-level access to the host Docker daemon.
- **Remediation:** Add a non-root user to each Dockerfile:
  ```dockerfile
  RUN groupadd -r appuser && useradd -r -g appuser appuser
  USER appuser
  ```

---

### SAST-006: Prometheus `/metrics` Endpoint Publicly Accessible
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
- **Description:** The Prometheus metrics endpoint exposes operational telemetry (work item counts, dispatch rates, team assignments, cycle detection events) with no authentication. This leaks internal system state to unauthenticated callers. In conjunction with SAST-001 (no auth anywhere), an external observer can monitor system activity in real time via `GET /metrics`.
- **Remediation:** Restrict the `/metrics` endpoint to internal networks via firewall/proxy rules, or add a bearer-token check:
  ```typescript
  app.get('/metrics', requireInternalToken, async (_req, res) => { ... });
  ```

---

### SAST-007: CI/CD Workflow — `inputs.focus` Free-Text Injected into Shell
- **Severity:** Medium
- **CWE:** CWE-78 (Improper Neutralization of Special Elements used in OS Command — Command Injection)
- **File:** `.github/workflows/run-guardians.yml:134-136`
- **Code Snippet:**
  ```yaml
  printf 'SAST scan: ...\nFocus: %s' \
    "$TEAM_DIR" "${{ inputs.scope || 'full' }}" "${{ inputs.focus || 'all' }}" > /tmp/prompt.txt
  ```
- **Description:** The `inputs.focus` `workflow_dispatch` parameter is a free-text field with no constraints. GitHub Actions evaluates `${{ inputs.focus }}` and substitutes the value into the YAML before the shell runs. A value containing `"` can break out of the quoted argument. While `printf` with `%s` limits the direct injection, a crafted value containing a double-quote followed by shell metacharacters could alter the argument list and the resulting prompt file. This pattern repeats in `run-ateam.yml`, `run-fixer.yml`, and others. Combined with `--dangerously-skip-permissions` on the subsequent Claude Code invocation, a poisoned prompt file could instruct Claude to perform unintended file operations or exfiltration within the runner environment.
- **Remediation:** Sanitize workflow inputs before use, or use `${{ github.event.inputs.focus }}` with a step that validates the value against an allowlist before writing to `/tmp/prompt.txt`. Alternatively, scope `--allowedTools` on Claude Code invocations more tightly.
- **Handoff:** [HANDOFF → pen-tester] — evaluate whether a crafted `inputs.focus` value with `"` or `\n` can materially alter Claude's behavior in the runner context.

---

### SAST-008: No Rate Limiting on Any Endpoint
- **Severity:** Low
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **File:** `Source/Backend/src/app.ts`
- **Description:** There is no rate limiting middleware (e.g., `express-rate-limit`). Any endpoint can be called at unlimited frequency. Combined with SAST-001 (no auth) and SAST-002 (unbounded limit param), a caller can flood the intake endpoints to fill the in-memory store, or hammer the assessment/dispatch workflow endpoints.
- **Remediation:** Add `express-rate-limit` with appropriate limits per IP for public-facing routes, and per token for authenticated routes once auth is added.

---

### SAST-009: `err.stack` Logged Server-Side — Client Exposure Correctly Suppressed ✓
- **Severity:** Informational (no action required)
- **File:** `Source/Backend/src/middleware/errorHandler.ts:6`
- **Code Snippet:**
  ```typescript
  logger.error({ msg: 'Unhandled error', err: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });  // ← stack NOT sent to client
  ```
- **Description:** The error handler correctly logs the stack trace server-side for debugging while returning only a generic `"Internal server error"` message to the client. **This is correct behaviour and not a finding.** Noted here to confirm the pattern was verified.

---

## Summary

| ID | Title | Severity | CWE |
|----|-------|----------|-----|
| SAST-001 | No Authentication on Any API Endpoint | **High** | CWE-306 |
| SAST-002 | Intake Webhooks Accept Unvalidated Enum Values | **Medium** | CWE-20 |
| SAST-003 | Unbounded Pagination `limit` — No Max Cap or NaN Guard | **Medium** | CWE-20/770 |
| SAST-004 | Missing HTTP Security Headers (no helmet, no CORS) | **Medium** | CWE-693 |
| SAST-005 | Docker Containers Run as Root | **Medium** | CWE-250 |
| SAST-006 | Prometheus `/metrics` Endpoint Publicly Accessible | **Medium** | CWE-200 |
| SAST-007 | CI `inputs.focus` Free-Text Injected into Shell | **Medium** | CWE-78 |
| SAST-008 | No Rate Limiting on Any Endpoint | **Low** | CWE-770 |

**Totals:** 2 High · 5 Medium · 1 Low · 1 Informational (confirmed safe)

**Grading impact (per `security.config.yml`):** 2 High findings → borderline Grade A/B. Requires remediation of SAST-001 (auth) to achieve Grade A.

**No hardcoded secrets** were found in first-party source code. All credentials reference environment variables or GitHub Actions secrets.
