---

## Compliance Audit Report — dev-crew Source App
**Date:** 2026-07-20 | **Frameworks:** OWASP ASVS L2 · SOC2 Type 2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)
**Auditor:** Compliance Auditor (TheGuardians)

---

### COMP-001: No Authentication or Authorization Layer
- **Severity:** High
- **Framework/Control:** OWASP ASVS V2.1, V4.1 · SOC2 CC6.1, CC6.2, CC6.3
- **File/Component:** `Source/Backend/src/app.ts` — all routes
- **Observation:** The Express application registers zero authentication middleware. Every endpoint — including privileged state-transition actions (`/approve`, `/reject`, `/dispatch`), data-modification operations (`PATCH`, `DELETE`), and the `/metrics` telemetry endpoint — is publicly reachable without any token, session, or credential. Any network-reachable caller can approve/reject/dispatch work items or delete records.
- **Remediation:** Add JWT bearer-token middleware applied globally before all route registrations. Implement RBAC so only authorised roles can invoke `/approve`, `/reject`, `/dispatch`. Protect `/metrics` separately (see COMP-005).

---

### COMP-002: No HTTP Security Headers (Missing Helmet)
- **Severity:** High
- **Framework/Control:** OWASP ASVS V14.4 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No security headers are set on any response: no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, or `Permissions-Policy`. This exposes consumers of the API to clickjacking, MIME-sniffing, and protocol downgrade attacks.
- **Remediation:** `npm install helmet`, then add `app.use(helmet())` as the first middleware in `app.ts`. Tune CSP to the application's actual asset origins.

---

### COMP-003: No CORS Policy Configured
- **Severity:** High
- **Framework/Control:** OWASP ASVS V14.5 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** Express does not restrict cross-origin requests by default. Any web origin can issue credentialed cross-origin requests to the backend and read the responses in a browser context. No `Access-Control-Allow-Origin` allowlist exists.
- **Remediation:** `npm install cors`. Configure with an explicit `origin` allowlist (e.g., `http://localhost:5173` in dev, the production domain in prod), `credentials: true` only if cookies are used, and restrict allowed methods/headers.

---

### COMP-004: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP ASVS V4.2.2 · SOC2 CC7.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** All API endpoints are unthrottled. This enables denial-of-service via request flooding, bulk enumeration of work items (`?limit=999999` is accepted — see COMP-012), and brute-force attacks against any future authentication endpoints.
- **Remediation:** Install `express-rate-limit`. Apply a global limiter (e.g., 200 req/15 min per IP) and a stricter limiter (e.g., 20 req/min) on state-transition and intake endpoints.

---

### COMP-005: Prometheus /metrics Endpoint Is Unauthenticated and Public
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 · OWASP ASVS V4.1
- **File/Component:** `Source/Backend/src/app.ts` line 34
- **Observation:** The `/metrics` endpoint is registered without any auth guard. It exposes default Node.js process metrics (memory, CPU, event-loop lag, GC timing) and domain counters (items created by type/source, dispatch rates by team). This provides an attacker with operational intelligence for planning targeted attacks.
- **Remediation:** Restrict `/metrics` to an internal network segment via network policy, or add a static bearer-token check (`Authorization: Bearer <METRICS_TOKEN>` from an env var) specific to this endpoint. Alternatively, expose it on a separate internal port not reachable from the public network.

---

### COMP-006: No TLS/HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP ASVS V9.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` line 49; `Source/Frontend/vite.config.ts`
- **Observation:** The backend calls `app.listen(PORT)` (plain HTTP). The Vite dev proxy routes to `http://localhost:3001`. No HSTS header is emitted. If no TLS-terminating reverse proxy is deployed in front of this service, all API traffic (state-transition actions, webhook payloads) travels in cleartext. Static analysis cannot confirm whether TLS termination happens at the infrastructure layer.
- **Remediation:** Deploy the backend behind a TLS-terminating load balancer or reverse proxy (nginx/ingress) in all non-local environments. Add `Strict-Transport-Security: max-age=63072000; includeSubDomains` via helmet. Document the TLS topology in the architecture specs.

---

### COMP-007: Required Audit Event "login_attempt" Not Emitted
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP ASVS V7.2.1
- **File/Component:** `Source/Backend/src/` — absent
- **Observation:** `security.config.yml` mandates `login_attempt` events. There is no authentication system, so this event is structurally impossible to emit. Additionally, no distinct audit-log sink exists — operational logs and security events share the same `process.stdout` stream with no event-type discriminator field.
- **Remediation:** Implement authentication (see COMP-001). Emit a `{ event_type: "login_attempt", outcome: "success"|"failure", actor, source_ip, timestamp }` structured log entry on every authentication attempt. Route audit events to a tamper-evident, append-only store separate from operational logs.

---

### COMP-008: Required Audit Event "permission_denied" Not Emitted
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP ASVS V7.2.1
- **File/Component:** `Source/Backend/src/` — absent
- **Observation:** No RBAC or authorization layer exists, so access denials never occur and `permission_denied` events cannot be emitted. Every action succeeds for every caller.
- **Remediation:** Implement RBAC (see COMP-001). Every 403-class rejection from the authorization layer must emit `{ event_type: "permission_denied", actor, resource, action, timestamp }`.

---

### COMP-009: Required Audit Event "state_transition" Not Emitted as Structured Audit Entry
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/services/router.ts`, `Source/Backend/src/services/assessment.ts`
- **Observation:** Status transitions are recorded in two places: (1) the `changeHistory` array inside each `WorkItem` (in-memory, volatile — lost on restart), and (2) `logger.info` operational log messages. Neither place uses a structured `event_type: "state_transition"` field that compliance tooling can filter and retain. There is no durable audit store.
- **Remediation:** Add an `event_type` discriminator to all transition log entries: `{ event_type: "state_transition", workItemId, from_status, to_status, actor, reason, timestamp }`. Persist these to a durable, append-only audit log (not just stdout).

---

### COMP-010: Required Audit Event "data_export" Not Emitted
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1
- **File/Component:** `Source/Backend/src/routes/dashboard.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** The dashboard endpoints (`/api/dashboard/summary`, `/api/dashboard/activity`, `/api/dashboard/queue`) and the paginated work items list return potentially bulk datasets. No `data_export` audit event is emitted for any read operation returning aggregate or paginated data.
- **Remediation:** Define the threshold for what constitutes a reportable "data export" (recommendation: any list response exceeding 50 items, or any dashboard endpoint call). Emit `{ event_type: "data_export", actor, endpoint, record_count, timestamp }` at that threshold.

---

### COMP-011: Intake Webhooks Have No Source Authentication
- **Severity:** High
- **Framework/Control:** OWASP ASVS V4.1, V4.2 · SOC2 CC6.2
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept any request body without verifying origin. Zendesk signs webhook deliveries with HMAC-SHA256 over the payload using a shared secret in the `X-Zendesk-Webhook-Signature` header. Without this verification, any actor can inject arbitrary work items into the workflow pipeline.
- **Remediation:** For the Zendesk endpoint: verify the `X-Zendesk-Webhook-Signature` header using `crypto.createHmac('sha256', process.env.ZENDESK_WEBHOOK_SECRET)`. For the automated endpoint: require a static API token in the `Authorization: Bearer <token>` header (token sourced from environment variable).

---

### COMP-012: No Maximum Pagination Limit Enforcement
- **Severity:** Low
- **Framework/Control:** OWASP ASVS V4.2.2
- **File/Component:** `Source/Backend/src/routes/workItems.ts` line 70; `Source/Backend/src/store/workItemStore.ts` line 35
- **Observation:** The `limit` query parameter is passed through without a server-side ceiling. A request with `?limit=9999999` will cause the store to attempt to slice the entire in-memory dataset into a single response, enabling bulk enumeration and potential memory pressure.
- **Remediation:** Cap the limit in the route handler: `const limit = Math.min(req.query.limit ? parseInt(req.query.limit as string, 10) : 20, 100);`. Apply the same cap inside `workItemStore.findAll`.

---

### COMP-013: In-Memory Store — No Persistence, No GDPR Hard-Erasure Path
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 (Right to Erasure) · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** All data lives in a JavaScript `Map`. Soft-delete (`deleted: true`) keeps the record in memory and in-process — it is not erased. There is no durable storage, so a restart destroys all data, but there is also no GDPR-compliant erasure mechanism for legitimate deletion requests. **Mitigating factor:** The current `WorkItem` data model contains no PII fields (no email, password, token — consistent with the sensitive_fields config). If the model expands to include user identity, this gap becomes critical.
- **Remediation:** Migrate to a persistent store (PostgreSQL, etc.) with encryption at rest. Implement a hard-delete or scrubbing path (zero-out sensitive fields, remove record from DB) to satisfy GDPR Art. 17. Document data retention periods in a Data Processing Agreement.

---

### COMP-014: No Session Management
- **Severity:** High
- **Framework/Control:** OWASP ASVS V3.1, V3.3 · SOC2 CC6.2
- **File/Component:** `Source/Backend/src/app.ts` — absent
- **Observation:** No session management infrastructure exists. ASVS L2 requires: session tokens with ≥128 bits of entropy; absolute session timeout; idle session timeout; secure, HttpOnly cookie flags or equivalent bearer-token revocation. None of these controls are present.
- **Remediation:** When authentication is implemented (COMP-001), adopt JWT with short expiry (≤1 hour) plus a refresh-token rotation scheme, or use `express-session` with a persistent session store. Enforce idle timeout via last-activity tracking.

---

## Compliance Matrix

| Control ID | Framework | Description | Status | Finding |
|---|---|---|---|---|
| V2.1 | OWASP ASVS L2 | Password / credential security | ❌ FAIL | COMP-001 |
| V3.1 | OWASP ASVS L2 | Session management fundamentals | ❌ FAIL | COMP-014 |
| V3.3 | OWASP ASVS L2 | Session timeouts | ❌ FAIL | COMP-014 |
| V4.1 | OWASP ASVS L2 | General access control design | ❌ FAIL | COMP-001 |
| V4.2 | OWASP ASVS L2 | Operation-level access control | ❌ FAIL | COMP-001, COMP-011, COMP-012 |
| V5.1 | OWASP ASVS L2 | Input validation (enum fields) | ⚠️ PARTIAL | Enum whitelists present; no max-length on free text |
| V6.2 | OWASP ASVS L2 | Algorithm strength (encryption at rest) | ✅ N/A | No PII fields in data model |
| V6.4 | OWASP ASVS L2 | Secret management | ✅ PASS | No hardcoded credentials; env vars used |
| V7.1 | OWASP ASVS L2 | Log content / audit events | ❌ FAIL | COMP-007–010 |
| V7.2 | OWASP ASVS L2 | No sensitive data in logs | ✅ PASS | No PII fields logged |
| V7.4 | OWASP ASVS L2 | Error messages to clients | ✅ PASS | `errorHandler.ts` returns generic 500 message |
| V9.1 | OWASP ASVS L2 | TLS for all communications | ❌ FAIL | COMP-006 |
| V14.4 | OWASP ASVS L2 | HTTP security headers | ❌ FAIL | COMP-002 |
| V14.5 | OWASP ASVS L2 | CORS policy | ❌ FAIL | COMP-003 |
| CC6.1 | SOC2 Type 2 | Logical access controls / least privilege | ❌ FAIL | COMP-001, COMP-003, COMP-005 |
| CC6.2 | SOC2 Type 2 | User credential / identity management | ❌ FAIL | COMP-001, COMP-014 |
| CC6.3 | SOC2 Type 2 | Role-based access model | ❌ FAIL | COMP-001 |
| CC7.1 | SOC2 Type 2 | Anomaly detection / security event logging | ❌ FAIL | COMP-007–010 |
| CC8.1 | SOC2 Type 2 | Change management controls | ✅ PASS | Git-based; spec-first traceability |

**Summary: 4 PASS / 1 PARTIAL / 14 FAIL — Pass rate: ~22%**

---

## Overall Assessment

| Metric | Value |
|---|---|
| Total controls evaluated | 19 |
| Passed | 4 (V6.4, V7.2, V7.4, CC8.1) |
| Partial | 1 (V5.1) |
| Failed | 14 |
| Compliance pass rate | ~22% |
| High severity findings | 8 (COMP-001, 002, 003, 006, 007, 008, 011, 014) |
| Medium severity findings | 4 (COMP-004, 005, 009, 010, 013) |
| Low severity findings | 1 (COMP-012) |
| **Grade (per security.config.yml)** | **D** — compliance pass rate (22%) is below the C-grade minimum (60%) |

### Root Cause Summary

The application is a functional workflow engine that implements good operational practices (structured logging, Prometheus metrics, enum validation, soft-delete, traceability comments). However, it appears to have been built as an internal tooling API without a threat model for external exposure. The entire access-control and authentication layer is absent — this single architectural gap cascades into failures across ~70% of the required compliance controls.

**The three highest-priority remediation items, in order, are:**
1. **COMP-001** — Authentication middleware (JWT/bearer) + RBAC: unblocks CC6.1–CC6.3 and V2–V4
2. **COMP-002 + COMP-003** — `helmet` + CORS allowlist: one-day effort, broad coverage
3. **COMP-007–010** — Structured audit event emission with a durable, append-only audit store: satisfies CC7.1 and all four required audit events
