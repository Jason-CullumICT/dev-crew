---

## Compliance Audit Report — dev-crew Source App
**Date:** 2026-08-31 | **Frameworks:** OWASP-ASVS L2, SOC2-Type2 (CC6.1–CC8.1)
**Auditor:** compliance_auditor | **Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

### COMP-001: No Authentication on Any API Endpoint
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1, CC6.2 · OWASP-ASVS V2.1 (Authentication) · OWASP-ASVS V4.1 (Access Control)
- **File/Component:** `Source/Backend/src/app.ts` — all route registrations
- **Observation:** Zero authentication middleware is applied to any route. Every endpoint — including privilege-sensitive operations such as `POST /api/work-items/:id/approve`, `POST /api/work-items/:id/reject`, and `POST /api/work-items/:id/dispatch` — is fully accessible by any unauthenticated caller. There is no JWT validation, API key check, session cookie, or any identity mechanism in the entire backend.
- **Remediation:** Add an authentication middleware (e.g., JWT `Authorization: Bearer <token>`) applied globally in `app.ts` before all route registrations. Exempt only `/health`. For webhook routes in `intake.ts`, apply HMAC-signature verification instead.

---

### COMP-002: No Role-Based Access Control (RBAC) on Privileged State Transitions
- **Severity:** High
- **Framework/Control:** SOC2 CC6.3 · OWASP-ASVS V4.2 (Operation-Level Access Control)
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (approve, reject, dispatch endpoints)
- **Observation:** State transitions with real-world business impact — approve, reject, dispatch — are callable by anyone. There is no concept of roles or permissions. Any caller can approve and dispatch a work item regardless of their authority.
- **Remediation:** After implementing authentication (COMP-001), introduce a role-check middleware. `approve`/`reject`/`dispatch` should require a `reviewer` or `manager` role. Routing and assessment may be `operator` roles. Enforcement should be centralized in middleware, not duplicated in each handler.

---

### COMP-003: Webhook Endpoints Accept Unauthenticated Payloads
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS V1.6.1 (Secret Management in Integrations)
- **File/Component:** `Source/Backend/src/routes/intake.ts` — `/api/intake/zendesk`, `/api/intake/automated`
- **Observation:** Both intake webhook endpoints accept POST requests from any source without verifying the sender's identity. Zendesk webhooks include an `X-Zendesk-Webhook-Signature-Secret` header; this is not validated. An attacker can inject arbitrary work items by POSTing to these endpoints.
- **Remediation:** Implement HMAC-SHA256 signature verification for Zendesk webhooks using a shared secret stored in an environment variable. For the automated intake endpoint, require an API key (`Authorization: Bearer <key>` header) compared against `process.env.INTAKE_API_KEY`.

---

### COMP-004: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V9.1.1 (Communication Security) · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (HTTP listen on port 3001) · `Source/Frontend/vite.config.ts` (HTTP proxy to backend)
- **Observation:** The Express server binds to plain HTTP (`app.listen(PORT, ...)`). The Vite dev proxy proxies `/api` to `http://localhost:3001`. No TLS termination is configured at the application or infrastructure level. All API traffic — work item content, state transitions — travels in plaintext.
- **Remediation:** Enforce HTTPS at the infrastructure layer via a reverse proxy (Nginx/Caddy) configured with TLS certificates. Add a middleware that redirects HTTP to HTTPS in production (`if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') { return res.redirect(301, 'https://...') }`). Vite proxy in production is replaced by the reverse proxy.

---

### COMP-005: Missing Security Headers (No `helmet`)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4 (HTTP Security Headers) · SOC2 CC6.6
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The Express application does not apply `helmet` or equivalent middleware. The following security headers are absent from all responses: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, and `Permissions-Policy`. The frontend receives no protection against clickjacking or MIME-sniffing attacks.
- **Remediation:** Add `npm install helmet` to the backend and apply `app.use(helmet())` as the first middleware in `app.ts`. Customize the CSP to match the frontend's asset sources.

---

### COMP-006: No Rate Limiting
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.2.2 (Anti-Automation) · SOC2 CC6.6
- **File/Component:** `Source/Backend/src/app.ts` — all routes
- **Observation:** No rate limiting is applied to any endpoint. The intake endpoints can be called at unlimited frequency, allowing arbitrary data injection. The workflow endpoints have no throttle, enabling abuse of state transitions. There is no protection against brute force or enumeration attacks.
- **Remediation:** Add `express-rate-limit` with a global default (e.g., 100 req/15min per IP) and tighter limits on intake endpoints (e.g., 20 req/min). Example: `app.use('/api/intake', rateLimit({ windowMs: 60_000, max: 20 }))`.

---

### COMP-007: Prometheus Metrics Endpoint is Publicly Accessible
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V8.3.4 (Sensitive Data Exposure) · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` line 34 (`GET /metrics`)
- **Observation:** The Prometheus metrics endpoint is accessible without any authentication. While it doesn't expose PII, it reveals operational internals: queue depths, dispatch rates, error rates, and system resource usage. This information aids an attacker in understanding system capacity and activity patterns.
- **Remediation:** Restrict `/metrics` to an internal network (firewall rule), or apply a bearer-token check: `if (req.headers.authorization !== \`Bearer ${process.env.METRICS_TOKEN}\`) return res.status(401).end()`.

---

### COMP-008: Required Audit Events Missing from Logging Layer
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 (System Monitoring) · OWASP-ASVS V7.2 (Log Events)
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route handlers
- **Observation:** The security config requires four audit events. Status:

  | Required Event | Status | Notes |
  |---|---|---|
  | `login_attempt` | ❌ **MISSING** | No auth layer — cannot emit |
  | `permission_denied` | ❌ **MISSING** | No access control — cannot emit |
  | `state_transition` | ⚠️ **PARTIAL** | Logged as `info` but not as a distinct structured audit event type; no actor identity |
  | `data_export` | ❌ **MISSING** | No data export endpoint exists |

- **Remediation:** (1) Implement authentication (COMP-001) to enable `login_attempt` and `permission_denied` events. (2) Add an `audit` log level or a dedicated structured audit event emitter that tags log entries with `"event_type": "state_transition"`, `"actor": "<user-id>"`, `"resource_id": "<item-id>"`. (3) Ensure all state transition handlers call this emitter.

---

### COMP-009: Audit Logs Lack Actor Identity
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.3.1 (Log Content)
- **File/Component:** All route handlers in `Source/Backend/src/routes/`
- **Observation:** Every log entry records *what* happened but not *who* did it. The `agent` field in change history is hardcoded to `'user'` or `'system'` (e.g., `workflow.ts` line 113: `buildChangeEntry('status', ..., 'manual-override', ...)`). There is no request-scoped user identity injected into logs or audit records. Without actor identity, audit trails are non-compliant for SOC2 and GDPR accountability requirements.
- **Remediation:** Once authentication is in place, inject the authenticated user's ID into a request context (via `AsyncLocalStorage` or `res.locals`). Pass this identity to `buildChangeEntry` and all logger calls.

---

### COMP-010: No Persistent Storage — Data Lost on Restart, No Encryption at Rest
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS V8.1 (General Data Protection) · GDPR Art. 32
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` — in-memory `Map`
- **Observation:** All work item data is stored in a JavaScript `Map` in process memory. On process restart, all data is lost. There is no database, no disk persistence, and no encryption at rest. The audit log is similarly ephemeral (stdout-only). This fails SOC2 requirements for data durability and encryption-at-rest controls.
- **Remediation:** Migrate to a persistent data store (PostgreSQL recommended for ACID compliance). Enable encryption at rest via the database engine (e.g., PostgreSQL TDE or filesystem-level encryption). Persist audit logs to a write-once append log (e.g., a dedicated audit table or a SIEM).

---

### COMP-011: No Right-to-Erasure (Hard Delete) for GDPR Compliance
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 (Right to Erasure) · OWASP-ASVS V8.3.7
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` — `softDelete()`
- **Observation:** The only deletion mechanism is a soft delete that sets `deleted: true` on the item but retains all data in the store. There is no endpoint or mechanism to permanently remove a work item's data. If work items ever contain personal data (submitter name, email, etc.), this violates GDPR Art. 17.
- **Remediation:** Add a `hardDelete(id: string)` function that removes the item entirely from the store/database. Expose a `DELETE /api/work-items/:id/purge` endpoint restricted to an admin role. Document the data retention policy (e.g., soft-deleted items are hard-deleted after 90 days).

---

### COMP-012: Unused `pino` Dependency
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V14.2.1 (Dependency Management)
- **File/Component:** `Source/Backend/package.json`
- **Observation:** `pino ^8.17.0` is listed as a production dependency but is never imported. The actual logging implementation is a custom `process.stdout.write` wrapper in `src/utils/logger.ts`. Unused production dependencies unnecessarily increase the attack surface.
- **Remediation:** Run `npm uninstall pino` in the backend package. If `pino` was intended to replace the custom logger, complete that migration: remove `src/utils/logger.ts`, import pino directly, and use its structured JSON output.

---

## Compliance Matrix

| Framework | Control | Description | Status | Finding |
|-----------|---------|-------------|--------|---------|
| OWASP-ASVS L2 | V2.1 | Authentication verifier requirements | ❌ FAIL | COMP-001 |
| OWASP-ASVS L2 | V3.1 | Fundamental session management security | ❌ FAIL | COMP-001 |
| OWASP-ASVS L2 | V4.1 | General access control design | ❌ FAIL | COMP-002 |
| OWASP-ASVS L2 | V4.2 | Operation-level access control | ❌ FAIL | COMP-002 |
| OWASP-ASVS L2 | V6.1 | Data classification | ⚠️ N/A | Sensitive fields not in data model |
| OWASP-ASVS L2 | V7.2 | Log event requirements | ❌ FAIL | COMP-008 |
| OWASP-ASVS L2 | V7.3 | Log protection requirements | ⚠️ PARTIAL | Logs exist; no actor identity (COMP-009) |
| OWASP-ASVS L2 | V7.4 | Error handling | ✅ PASS | Generic errors to client; no stack leak |
| OWASP-ASVS L2 | V8.1 | General data protection | ❌ FAIL | COMP-010 |
| OWASP-ASVS L2 | V9.1 | Communication security | ❌ FAIL | COMP-004 |
| OWASP-ASVS L2 | V14.4 | HTTP security headers | ❌ FAIL | COMP-005 |
| OWASP-ASVS L2 | V4.2.2 | Anti-automation / rate limiting | ❌ FAIL | COMP-006 |
| SOC2-Type2 | CC6.1 | Logical and physical access controls | ❌ FAIL | COMP-001, COMP-004 |
| SOC2-Type2 | CC6.2 | Prior to issuing credentials, register and authorize | ❌ FAIL | COMP-001 |
| SOC2-Type2 | CC6.3 | Role-based access / least privilege | ❌ FAIL | COMP-002 |
| SOC2-Type2 | CC7.1 | System monitoring and audit logging | ❌ FAIL | COMP-008, COMP-009 |
| SOC2-Type2 | CC8.1 | Change management (audit trail) | ⚠️ PARTIAL | Change history tracked in model; no actor identity, not persistent |

**Controls Assessed: 17 | ✅ Pass: 2 | ⚠️ Partial: 3 | ❌ Fail: 12 | Pass Rate: ~12%**

---

## Summary & Grade Assessment

By the grading rubric in `security.config.yml`:

| Finding | Severity |
|---------|----------|
| COMP-001 (No Auth) | **High** |
| COMP-002 (No RBAC) | **High** |
| COMP-003 (Unauthenticated Webhooks) | **High** |
| COMP-004 (No TLS) | **High** |
| COMP-005 (No Security Headers) | Medium |
| COMP-006 (No Rate Limiting) | Medium |
| COMP-007 (Metrics Exposed) | Medium |
| COMP-008 (Missing Audit Events) | Medium |
| COMP-009 (No Actor Identity) | Medium |
| COMP-010 (No Persistent/Encrypted Storage) | Medium |
| COMP-011 (No Hard Delete / GDPR) | Medium |
| COMP-012 (Unused Dependency) | Low |

**4 High findings, 7 Medium findings, 1 Low finding.** Per the grading scale (`A` requires 0 Critical / ≤2 High / ≥90% pass rate), this application does not meet Grade A or B thresholds on compliance controls alone. Grade **D** applies (>2 High findings).

The root cause of the majority of failures is a single architectural gap: **no authentication layer was ever implemented.** Closing COMP-001 would unblock remediation of CC6.2, CC6.3, CC7.1 (login_attempt, permission_denied events), and V2/V3/V4 ASVS controls. That single effort has the highest compliance leverage of any item in this report.
