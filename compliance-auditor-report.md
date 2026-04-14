---

## Compliance Audit Complete

### Summary

The **dev-crew Source App** scores **26% compliance** (Grade D) against OWASP-ASVS L2 and SOC2-Type2. The dominant issue is structural: **the application has zero authentication, zero authorisation, and zero access control.** This single architectural gap causes cascading failures across CC6.1, CC6.2, CC6.3, V2.x, V3.x, V4.x, and prevents the required audit events (login_attempt, permission_denied) from ever being emitted.

### Critical Path to Compliance

The project needs these five changes before any meaningful compliance score is achievable:

| # | Change | Frameworks Unblocked |
|---|---|---|
| 1 | **Add authentication middleware** (JWT bearer) | ASVS V2.x, SOC2 CC6.1, CC6.2 |
| 2 | **Add RBAC** (role-checked middleware on write endpoints) | ASVS V4.x, SOC2 CC6.1, CC6.3 |
| 3 | **Add Helmet + CORS** (2 npm installs + 2 lines in app.ts) | ASVS V14.4.x, V14.5.3 |
| 4 | **Add rate limiting** (`express-rate-limit`) | ASVS V11.1.2 |
| 5 | **Protect /metrics + add webhook signature verification** | ASVS V14.3.3, SOC2 CC8.1 |

Items 3 and 4 are each **< 30 minutes of work** and would immediately move the pass rate from 26% to ~47%. Items 1 and 2 are the large architectural investments that unlock the remaining controls.

15 findings filed. Learnings written to `Teams/TheGuardians/learnings/compliance-auditor.md`.
