---

## Compliance Audit Complete

**Overall grade: F — 9% pass rate (1/17 controls passing)**

Here is the executive summary of what was found across the codebase:

### Critical gaps (P1 — must fix before any compliance attestation)

| # | Finding | Frameworks failed |
|---|---|---|
| COMP-001 | **No authentication system** — all 15 API endpoints are completely open, zero identity checks | SOC2 CC6.1 CC6.2 · ASVS V2.x |
| COMP-002 | **No authorisation / RBAC** — approve, dispatch, reject callable by anyone | SOC2 CC6.3 CC8.1 · ASVS V4.1.x |
| COMP-003 | **Audit events missing** — `login_attempt`, `permission_denied`, `data_export` absent; `state_transition` logs info-level only, no actor, no durable store | SOC2 CC7.1 · ASVS V7.2.1 |

### High gaps (P2)

| # | Finding |
|---|---|
| COMP-004 | No TLS enforcement (HTTP only, no HSTS) |
| COMP-005 | No rate limiting — pagination `limit` unbounded, intake webhooks throttle-free |
| COMP-006 | Intake webhooks have no HMAC/origin verification (fake Zendesk events accepted) |
| COMP-009 | No session management (no timeout, no revocation) |

### Medium gaps (P3–P4)

- COMP-007: No Helmet / HTTP security headers (CSP, X-Frame-Options, etc.)
- COMP-008: `/metrics` endpoint unauthenticated — leaks operational data
- COMP-010: Soft-delete only — no right-to-erasure path for GDPR Art. 17
- COMP-011: Pagination `limit` not capped — trivial bulk data extraction

### What passes
- **ASVS V6.2.1** — `uuid` v9 used for all IDs (cryptographic randomness ✅)
- **Prometheus metrics** — operational monitoring is present (partial CC7.1 credit ⚠️)

The learnings file has been updated at `Teams/TheGuardians/learnings/compliance-auditor.md` with findings, framework mapping notes, and the pass-rate baseline for future runs.
