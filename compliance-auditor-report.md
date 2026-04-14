---

## Compliance Audit Complete

Here is the full summary of findings for **dev-crew Source App** against OWASP-ASVS Level 2 and SOC2-Type2.

---

### Overall Result: Grade D — 24% pass rate (5/21 controls)

---

### 12 Findings

| ID | Title | Severity | Framework/Control |
|---|---|---|---|
| COMP-001 | No authentication on any API endpoint | **High** | OWASP ASVS V4.1.1, SOC2 CC6.1, CC6.2 |
| COMP-002 | No authorisation / RBAC | **High** | OWASP ASVS V4.1.3, SOC2 CC6.3 |
| COMP-003 | Missing 3 of 4 required audit events | **High** | SOC2 CC7.1, OWASP ASVS V7.2.1 |
| COMP-004 | TLS not enforced at application layer | **High** | OWASP ASVS V9.1.1, SOC2 CC6.1 |
| COMP-005 | No security headers (no Helmet/CSP) | Medium | OWASP ASVS V14.4.1, V14.4.3 |
| COMP-006 | No CORS policy | Medium | OWASP ASVS V14.5.3 |
| COMP-007 | No rate limiting on any endpoint | **High** | OWASP ASVS V4.2.2 |
| COMP-008 | Webhook intake has no signature verification | **High** | OWASP ASVS V1.14.1, SOC2 CC6.1 |
| COMP-009 | Soft-delete only — no hard deletion/erasure | Medium | OWASP ASVS V8.3.4, SOC2 CC6.3 |
| COMP-010 | Stack traces logged in production | Low | OWASP ASVS V7.4.1 |
| COMP-011 | No input payload size limits | Medium | OWASP ASVS V5.1.4 |
| COMP-012 | No OpenTelemetry trace context in logs | Low | OWASP ASVS V7.1.2, SOC2 CC7.1 |

---

### SOC2-Type2 Compliance Matrix

| Control | Status | Notes |
|---|---|---|
| CC6.1 — Logical access controls | ❌ FAIL | All endpoints open, no auth |
| CC6.2 — Credential issuance | ❌ FAIL | No user/credential management |
| CC6.3 — Access modification | ❌ FAIL | No RBAC or access lifecycle |
| CC7.1 — Detection & monitoring | ⚠️ PARTIAL | Metrics + logging present; security events missing |
| CC8.1 — Change management | ⚠️ PARTIAL | WorkItem `changeHistory` tracks domain changes |

---

### Key Architectural Notes

- **Sensitive fields** (`email`, `password`, `token`, `secret`, `api_key`) from `security.config.yml` **do not appear in the current data model** — the WorkItem schema stores only workflow metadata. Encryption-at-rest controls are architectural non-issues *for the current domain*. This will change immediately if Zendesk user identity or requester contact data is ever stored.
- The **only required audit event that fires** is `state_transition` (via `changeHistory` + `logger.info`). The other three (`login_attempt`, `permission_denied`, `data_export`) cannot fire until auth/authz infrastructure exists.
- **Quick wins** (COMP-005, COMP-006, COMP-011): Adding `helmet`, `cors`, and a body size limit are ~5-line changes that would close three findings immediately.
- **Root cause of most failures**: Auth was never built. Remediating COMP-001 and COMP-002 unblocks CC6.1, CC6.2, CC6.3, and creates the preconditions for the missing audit events.

Full report written to: `Teams/TheGuardians/findings/compliance-report-20260414.md`  
Learnings updated: `Teams/TheGuardians/learnings/compliance-auditor.md`
