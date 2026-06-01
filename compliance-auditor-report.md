Dashboard updated successfully. Here is the full audit report:

---

# Compliance Audit Report — dev-crew Source App
**Frameworks:** OWASP-ASVS Level 2 · SOC2-Type2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)

## Overall Result: ❌ 2/15 controls PASS — 14% pass rate

The application is a workflow orchestration engine with **no authentication, no authorisation, and no transport security**. Every API endpoint is fully open to anonymous callers. The compliance posture is critical.

---

## Findings (12 controls failing)

### COMP-001 — No Authentication on Any Endpoint 🔴 High
- **SOC2 CC6.1 · OWASP-ASVS V2.1**
- Zero auth middleware. Every endpoint — including approve, reject, dispatch — is callable by any anonymous network client. No JWT, session, API key, or any other credential is required anywhere in the Express application.

### COMP-002 — No Authorisation / Role-Based Access Control 🔴 High
- **SOC2 CC6.3 · OWASP-ASVS V4.1**
- No caller identity or role concept exists. Any caller can approve, reject, or dispatch work items without privilege checks.

### COMP-003 — Missing Required Audit Log Events 🔴 High
- **SOC2 CC7.1 · OWASP-ASVS V7.1**
- `login_attempt` ❌, `permission_denied` ❌, `data_export` ❌ — never emitted (no auth system).
- `state_transition` ⚠️ partially covered in WorkItem `changeHistory[]` but not emitted as a filterable structured log event.

### COMP-004 — No TLS / HTTPS Configuration 🔴 High
- **SOC2 CC6.1 · OWASP-ASVS V9.1**
- Backend listens on plain HTTP only. No TLS certificates, no HTTPS redirect, no HSTS.

### COMP-005 — Missing Security HTTP Headers 🟡 Medium
- **OWASP-ASVS V14.4**
- `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy` all absent. `X-Powered-By: Express` disclosed. Fix: `npm install helmet` + `app.use(helmet())`.

### COMP-006 — No Rate Limiting; Uncapped Pagination 🟡 Medium
- **OWASP-ASVS V13.1**
- No `express-rate-limit`. The `?limit=` parameter accepts any integer — `?limit=9999999` returns the entire dataset in one request.

### COMP-007 — Intake Webhooks Lack Caller Verification 🟡 Medium
- **SOC2 CC6.2 · OWASP-ASVS V13.2**
- `/api/intake/zendesk` and `/api/intake/automated` accept any payload from any IP with no HMAC signature check or API key. Arbitrary work items can be injected.

### COMP-008 — Prometheus `/metrics` Unauthenticated 🟡 Medium
- **SOC2 CC6.1**
- Internal throughput counters exposed to anonymous callers.

### COMP-009 — No Hard Delete / Right to Erasure 🟡 Medium
- **GDPR Art. 17 · SOC2 CC6.3**
- Only soft-delete exists (`deleted: true`). No permanent erasure path. Free-text `title`/`description` fields can contain PII.

### COMP-010 — No CORS Policy Configured 🟡 Medium
- **OWASP-ASVS V14.5**
- No explicit `cors` middleware; allowed origins are undefined.

### COMP-011 — Sensitive Fields Not in Data Model ℹ️ Informational
- `email`, `password`, `token`, `secret`, `api_key` not present in the WorkItem schema today. No encryption gap currently, but any future addition must be encrypted at rest and masked in logs.

### COMP-012 — Error Handling ✅ PASS
- `errorHandler.ts` logs stack traces server-side only; clients receive only `"Internal server error"`. Control passes.

---

## Compliance Matrix Summary

| Control | Status |
|---|---|
| OWASP-ASVS V2.1 Authentication | ❌ FAIL |
| OWASP-ASVS V4.1 Access Control | ❌ FAIL |
| OWASP-ASVS V7.4 Error Handling | ✅ PASS |
| OWASP-ASVS V9.1 TLS | ❌ FAIL |
| OWASP-ASVS V13.1 Rate Limiting | ❌ FAIL |
| OWASP-ASVS V13.2 REST Services | ⚠️ PARTIAL |
| OWASP-ASVS V14.4 Security Headers | ❌ FAIL |
| OWASP-ASVS V14.5 CORS | ❌ FAIL |
| SOC2 CC6.1 Logical Access Controls | ❌ FAIL |
| SOC2 CC6.2 Access Provisioning | ❌ FAIL |
| SOC2 CC6.3 Authorised Access | ❌ FAIL |
| SOC2 CC7.1 Security Event Detection | ❌ FAIL |
| SOC2 CC8.1 Change Management | ✅ PASS (`changeHistory[]`) |

**Pass: 2 · Partial: 1 · Fail: 12 · Pass rate: 14%**

---

## Priority Remediation Order

| # | Fix | Effort | Unblocks |
|---|---|---|---|
| P1 | Add JWT/auth middleware globally in `app.ts` | High | All V2.x + CC6.x controls |
| P1 | Add RBAC (role extraction + permission checks) | Medium | CC6.3, V4.x |
| P1 | Enforce TLS at infra/reverse-proxy layer | Low | V9.1, CC6.1 |
| P2 | Emit structured `auditLog()` for state_transition, login_attempt, permission_denied, data_export | Medium | CC7.1 |
| P2 | `npm install helmet` — one line in `app.ts` | Low | V14.4 |
| P2 | Add `express-rate-limit` + cap pagination `limit` ≤ 100 | Low | V13.1 |
| P2 | HMAC signature validation on intake webhooks | Medium | V13.2, CC6.2 |
| P3 | Restrict `/metrics` to internal network | Low | CC6.1 |
| P3 | Implement hard-delete endpoint (admin role gated) | Medium | GDPR Art. 17 |
| P3 | Configure explicit CORS allowlist | Low | V14.5 |

Full findings saved to: `Teams/TheGuardians/findings/compliance-audit-2026-06-01.md`  
Learnings updated: `Teams/TheGuardians/learnings/compliance-auditor.md`
