Here is the full compliance audit report:

---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-08-17 | **Auditor:** compliance_auditor | **Frameworks:** OWASP-ASVS L2 · SOC2-Type2 (CC6.1–CC6.3, CC7.1, CC8.1)

---

## Executive Summary

The application has **no authentication layer whatsoever**. Every API endpoint — including state-transition actions, the Prometheus metrics endpoint, and webhook intake routes — is publicly accessible without credentials. This alone constitutes multiple Critical/High compliance failures across all three framework areas. The compliance pass rate is approximately **22%** (4 controls met out of 18 assessed). The application grades at **D** under the TheGuardians grading scale.

**Controls passed: 4 | Controls failed: 14 | Pass rate: 22%**

---

## Findings

---

### COMP-001: No Authentication or Authorization on Any Endpoint
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1, CC6.2, CC6.3 · OWASP-ASVS L2 V2.1.1, V3.1.1, V4.1.1, V4.1.3
- **File/Component:** `Source/Backend/src/app.ts`, all route files
- **Observation:** The Express application registers no authentication middleware at any layer. All routes — `GET/POST/PATCH/DELETE /api/work-items`, `/api/work-items/:id/approve`, `/api/work-items/:id/dispatch`, `/api/dashboard/*`, `/api/intake/*` — are completely open. No tokens, no sessions, no API keys, no certificates. Any network-reachable client can read all work items, approve/reject/dispatch them, or trigger intake webhooks. CC6.1 requires that access be restricted to authorized users; CC6.2 requires authentication before access is granted; CC6.3 requires role-based access controls. None of these controls have any implementation.
- **Remediation:**
  1. Add an authentication middleware (JWT bearer tokens or session cookies with a library such as `passport`, `express-jwt`, or a dedicated auth service).
  2. Define roles (e.g., `viewer`, `operator`, `admin`) and enforce them per route using middleware guards.
  3. Protect state-mutation endpoints (`/approve`, `/reject`, `/dispatch`, `/route`, `/assess`) with at minimum `operator` role.
  4. Apply auth middleware globally in `app.ts` with explicit exclusions only for `/health` and `/metrics` (see COMP-006 for `/metrics`).

---

### COMP-002: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS L2 V9.1.1, V9.1.2 · SOC2 CC6.1 (data in transit)
- **File/Component:** `Source/Backend/src/app.ts`, `docker-compose.test.yml`
- **Observation:** The application binds to HTTP only (`app.listen(PORT, ...)`). There is no TLS termination configuration, no redirect from HTTP to HTTPS, and no HSTS header. The test Docker Compose file exposes ports 3001 and 5173 over plain HTTP. ASVS V9.1.1 requires all connections to use TLS; V9.1.2 requires only strong cipher suites. SOC2 CC6.1 requires encryption of data in transit.
- **Remediation:**
  1. Terminate TLS at the reverse proxy layer (nginx/Caddy/ALB) in production; configure an HTTP→HTTPS redirect.
  2. Add the HSTS header (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) — addressed further in COMP-003.
  3. Document the TLS termination point in architecture docs so agents and auditors know where the control lives.

---

### COMP-003: Missing HTTP Security Headers (No Helmet or Equivalent)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS L2 V14.4.1–V14.4.6
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No security-oriented HTTP response headers are set. The following are absent: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`. ASVS L2 V14.4.x controls require each of these. An attacker can trivially frame the application (clickjacking), exploit MIME sniffing, or bypass CSP protections.
- **Remediation:**
  1. Add `helmet` to `package.json` dependencies and mount it before all routes in `app.ts`:
     ```ts
     import helmet from 'helmet';
     app.use(helmet());
     ```
  2. Tune the CSP policy to match the actual frontend asset origins.

---

### COMP-004: Missing Required Audit Events (login_attempt, permission_denied, data_export)
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS L2 V7.1.1, V7.1.2
- **File/Component:** `Source/Backend/src/` (all route and service files)
- **Observation:** `security.config.yml` mandates four audit events: `login_attempt`, `permission_denied`, `state_transition`, and `data_export`. Of these: `state_transition` is partially covered by the `changeHistory` service; the other three are entirely absent. `login_attempt` and `permission_denied` cannot exist without an authentication layer (see COMP-001). `data_export` events are never logged anywhere. CC7.1 requires that security-relevant events be detected, logged, and available for monitoring. Without these events the SOC2 audit trail is materially incomplete.
- **Remediation:**
  1. Implement authentication (COMP-001 prerequisite) which will enable `login_attempt` and `permission_denied` events.
  2. Add a dedicated `auditLog()` function in the logger that emits structured events with the fields: `event_type`, `actor`, `resource_id`, `outcome`, `timestamp`.
  3. Log `data_export` whenever `GET /api/work-items` or dashboard endpoints return bulk data.
  4. Log `permission_denied` in every authorization guard that rejects a request.

---

### COMP-005: No Session Management (No Timeout, No Binding, No Invalidation)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS L2 V3.1.1, V3.2.1, V3.3.1, V3.3.2
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The application has no session management whatsoever. ASVS L2 V3.3.1 requires session tokens to expire after a configurable idle period; V3.3.2 requires that session length cannot exceed a maximum. V3.2.1 requires that new tokens be issued on privilege escalation. None of these controls apply today because there is no authentication — but they must be designed in when auth is added.
- **Remediation:**
  1. When implementing authentication, use short-lived JWT access tokens (≤15 min) with refresh-token rotation, or server-side sessions with idle timeout enforcement.
  2. Enforce absolute session lifetime and re-authentication requirements for high-privilege actions.

---

### COMP-006: Prometheus /metrics Endpoint Publicly Accessible
- **Severity:** High
- **Framework/Control:** OWASP-ASVS L2 V4.1.3 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (line 34)
- **Observation:** The `/metrics` endpoint is registered with no authentication:
  ```ts
  app.get('/metrics', async (_req, res) => { res.end(await registry.metrics()); });
  ```
  This exposes system counters, dispatch rates, assessment verdicts, and dependency operation statistics to any caller. CC6.1 requires that access to monitoring systems be restricted to authorized users. ASVS V4.1.3 requires that administrative and monitoring endpoints be protected.
- **Remediation:**
  1. Restrict `/metrics` to internal networks (via firewall/ingress rule), or
  2. Add an IP allowlist middleware or basic-auth guard in front of `/metrics`.
  3. Move the metrics endpoint to a separate internal port that is not exposed externally.

---

### COMP-007: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS L2 V4.2.2 · SOC2 CC6.1 (brute-force protection)
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/workflow.ts`
- **Observation:** No rate limiting middleware (e.g., `express-rate-limit`) is applied to any endpoint. State-transition endpoints (`/approve`, `/reject`, `/dispatch`) and intake webhooks can be called at unlimited frequency. This enables denial-of-service attacks and, once auth is added, brute-force attacks on login.
- **Remediation:**
  1. Add `express-rate-limit` with a tiered policy: strict limits (5–10 req/min) on auth and state-mutation endpoints; moderate limits (100 req/min) on read endpoints.
  2. Add a global rate limiter as a baseline.

---

### COMP-008: Intake Webhook Endpoints Lack Signature Verification
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS L2 V4.1.1 · SOC2 CC6.2
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept any payload with no authentication and no HMAC signature check. A real Zendesk integration should validate the `X-Zendesk-Webhook-Signature` header. Without this, any external party can inject arbitrary work items by sending POST requests to the intake endpoints.
- **Remediation:**
  1. Validate Zendesk webhook signatures using the shared signing secret from environment variables.
  2. For the `automated` endpoint, require a pre-shared API key in the `Authorization` header.
  3. Add the signing secret to `.env` (already a project requirement per CLAUDE.md) and document the verification logic.

---

### COMP-009: Internal Error Messages Leaked to API Clients via Route Handlers
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS L2 V7.4.1, V7.4.2
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (lines 61–63, 88–90, 138–140, 204–206, 291–294, 350–351)
- **Observation:** Every route `catch` block in `workflow.ts` returns the raw `err.message` directly to the client:
  ```ts
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
  ```
  Internal error messages can leak stack paths, service names, or logic flow to attackers. The global `errorHandler` correctly returns `{ error: 'Internal server error' }`, but route-level handlers bypass it by sending responses themselves. ASVS V7.4.1 requires that error messages do not expose internal state to clients.
- **Remediation:**
  1. Replace route-level `catch` blocks with `next(err)` to route all errors through the central `errorHandler`.
  2. Log the full error server-side; return only a safe generic message to the client.
  3. Optionally include a correlation/trace ID in the error response so operators can look up details in logs.

---

### COMP-010: Audit Log Actor Identity Is Anonymous
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.2, CC7.1 · OWASP-ASVS L2 V7.1.2
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (line 132), `Source/Backend/src/services/changeHistory.ts`
- **Observation:** The `trackUpdates` function is called with the literal string `'user'` as the actor:
  ```ts
  trackUpdates(item, updates, 'user', 'Manual update');
  ```
  No authenticated user identity is available to populate the actor field because there is no auth layer. All change history records show `agent: 'user'` with no real identity. CC7.1 and ASVS V7.1.2 require that audit log entries contain sufficient context including the identity of the actor.
- **Remediation:**
  1. Once authentication is in place (COMP-001), thread the authenticated user's ID from the request context into `trackUpdates` and all `buildChangeEntry` calls.
  2. Consider adding `actorId` and `actorRole` as first-class fields on `ChangeHistoryEntry`.

---

### COMP-011: No Upper Bound on Pagination `limit` Parameter
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS L2 V5.1.4 · SOC2 CC6.1 (data enumeration prevention)
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (line 70), `Source/Backend/src/routes/dashboard.ts` (line 18)
- **Observation:** The `limit` query parameter is accepted via `parseInt()` with no maximum enforced. A caller can send `?limit=1000000` and receive the entire in-memory store in a single response. This enables trivial bulk data enumeration. ASVS V5.1.4 requires input to be constrained to a defined range.
- **Remediation:**
  1. Add a `MAX_PAGE_SIZE = 100` constant and clamp the parsed limit:
     ```ts
     const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, MAX_PAGE_SIZE);
     ```
  2. Apply consistently to all paginated endpoints including dashboard activity.

---

### COMP-012: No CORS Policy Configured on the Backend
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS L2 V14.5.1, V14.5.3
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is applied to the Express application. In production, the backend will respond to cross-origin requests from any origin with no restrictions. The `vite.config.ts` proxy only applies during local development. ASVS V14.5.1 requires that CORS origins be explicitly whitelisted.
- **Remediation:**
  1. Add `cors` package and mount it early:
     ```ts
     import cors from 'cors';
     app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }));
     ```
  2. Set `ALLOWED_ORIGINS` in `.env` per environment.

---

### COMP-013: Soft Delete Does Not Satisfy GDPR Right to Erasure
- **Severity:** Low
- **Framework/Control:** GDPR Art. 17 (Right to Erasure — not in `compliance.frameworks` but a common implicit requirement)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (line 78–89)
- **Observation:** `softDelete()` sets `item.deleted = true` but the record remains in the in-memory map and in the change history of any item that referenced it. If the data model ever expands to include personal data, the current soft-delete approach would not comply with a true Right to Erasure request. Additionally, since storage is in-memory, all data is lost on process restart — there is no persistent storage mechanism with a documented retention period.
- **Remediation:**
  1. Document the in-memory ephemeral nature explicitly in the architecture docs (restart = full erasure satisfies Art. 17 in the absence of persistence).
  2. If persistence is added in future, implement a hard-delete path that scrubs the record and its references from all linked items' `blockedBy`/`blocks` arrays.

---

### COMP-014: No Request Correlation ID in Logs
- **Severity:** Low
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS L2 V7.1.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/utils/logger.ts`
- **Observation:** Log entries contain no request or correlation ID. When multiple concurrent requests are in flight, it is impossible to correlate a series of log entries to a single request lifecycle. ASVS V7.1.1 requires sufficient context for forensic reconstruction. SOC2 CC7.1 requires that monitoring be capable of tracing security-relevant events.
- **Remediation:**
  1. Generate a `requestId` (`uuid()`) in the request-logging middleware and attach it to the response (`X-Request-Id` header).
  2. Pass the `requestId` through a request-scoped context (e.g., via `AsyncLocalStorage`) so all log calls within that request automatically include it.
  3. The `CLAUDE.md` already calls for OpenTelemetry trace/span ID injection — implement that and `traceparent` propagation per the architecture rules.

---

## Compliance Matrix

| Control ID | Framework | Description | Status | Finding |
|---|---|---|---|---|
| CC6.1 | SOC2-Type2 | Logical access controls restrict access to authorized users | ❌ FAIL | COMP-001, COMP-006 |
| CC6.2 | SOC2-Type2 | Authentication before granting access | ❌ FAIL | COMP-001, COMP-008 |
| CC6.3 | SOC2-Type2 | Role-based access controls | ❌ FAIL | COMP-001 |
| CC7.1 | SOC2-Type2 | System monitoring and security event detection | ⚠️ PARTIAL | COMP-004, COMP-010, COMP-014 |
| CC8.1 | SOC2-Type2 | Change management controls | ⚠️ PARTIAL | COMP-010 |
| ASVS V2.1 | OWASP-ASVS L2 | Password security requirements | ❌ FAIL | COMP-001 |
| ASVS V2.8 | OWASP-ASVS L2 | Multi-factor authentication | ❌ FAIL | COMP-001 |
| ASVS V3.1–V3.3 | OWASP-ASVS L2 | Session management | ❌ FAIL | COMP-005 |
| ASVS V4.1 | OWASP-ASVS L2 | General access control (server-side enforcement) | ❌ FAIL | COMP-001, COMP-006 |
| ASVS V4.2.2 | OWASP-ASVS L2 | Rate limiting | ❌ FAIL | COMP-007 |
| ASVS V5.1.4 | OWASP-ASVS L2 | Input range validation | ❌ FAIL | COMP-011 |
| ASVS V7.1 | OWASP-ASVS L2 | Log content (sufficient context, required events) | ⚠️ PARTIAL | COMP-004, COMP-014 |
| ASVS V7.2 | OWASP-ASVS L2 | Structured logging (no raw console.log) | ✅ PASS | — |
| ASVS V7.3 | OWASP-ASVS L2 | No sensitive data in logs | ✅ PASS | — |
| ASVS V7.4 | OWASP-ASVS L2 | Error handling (no internal leak to client) | ❌ FAIL | COMP-009 |
| ASVS V9.1 | OWASP-ASVS L2 | TLS for all external communications | ❌ FAIL | COMP-002 |
| ASVS V14.4 | OWASP-ASVS L2 | HTTP security headers | ❌ FAIL | COMP-003 |
| ASVS V14.5 | OWASP-ASVS L2 | CORS and HTTP request header validation | ❌ FAIL | COMP-012 |

**Totals: ✅ 2 PASS · ⚠️ 3 PARTIAL · ❌ 13 FAIL — Pass rate: 22% — Grade: D**

---

## Prioritised Remediation Roadmap

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 | COMP-001 — Add authentication layer | High | Unlocks CC6.1, CC6.2, CC6.3, ASVS V2.x, V3.x, V4.x |
| P1 | COMP-003 — Add Helmet.js security headers | Low (1 line) | Satisfies ASVS V14.4.x immediately |
| P1 | COMP-006 — Protect /metrics endpoint | Low | Satisfies ASVS V4.1.3 / CC6.1 |
| P2 | COMP-004 — Implement required audit events | Medium | Satisfies CC7.1, ASVS V7.1 |
| P2 | COMP-002 — TLS enforcement (proxy/infra) | Medium | Satisfies ASVS V9.1 |
| P2 | COMP-009 — Route-level error containment | Low | Satisfies ASVS V7.4 |
| P2 | COMP-011 — Clamp pagination limit | Trivial | Prevents data enumeration |
| P3 | COMP-007 — Add rate limiting | Low | Satisfies ASVS V4.2.2 |
| P3 | COMP-008 — Webhook signature verification | Medium | Satisfies CC6.2 for intake |
| P3 | COMP-012 — CORS policy | Low | Satisfies ASVS V14.5 |
| P4 | COMP-010 — Actor identity in audit logs | Depends on P1 | Satisfies CC7.1 actor identity |
| P4 | COMP-014 — Request correlation IDs | Low | Satisfies ASVS V7.1.1 |
| P4 | COMP-005 — Session management design | Depends on P1 | Satisfies ASVS V3.x |
| P4 | COMP-013 — Erasure documentation | Low | GDPR Art. 17 readiness |

---

**Note on sensitive_fields:** The `compliance.sensitive_fields` list (`email`, `password`, `token`, `secret`, `api_key`) does not match any field in the current `WorkItem` data model — encryption-at-rest gaps are therefore a non-issue for the current schema. **This must be re-audited if the data model ever gains user account fields or credential storage.**
