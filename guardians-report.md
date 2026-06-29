# TheGuardians — Security & Compliance Report
**Run:** `run-20260629-083857` · **Date:** 2026-06-29 · **App:** dev-crew Source App

---

## 🏴 Grade: F — Automatic Fail

> The red-teamer achieved **all 4 pentest objectives** against a live ephemeral environment.
> Three Critical exploit chains were fully confirmed. Any confirmed breach of a critical objective
> is an automatic Grade F under `security.config.yml`.

---

## Summary

| | Result |
|---|---|
| **Grade** | **F** |
| Critical findings | 3 |
| High findings | 8 |
| Medium findings | 6 |
| Low findings | 6 |
| Total merged findings | 23 |
| Compliance pass rate | **22%** (4 / 18 controls) |
| SOC2 full-pass rate | **0%** (0 / 5 controls) |
| Red-team objectives achieved | **4 / 4** |
| Confirmed breaches | **9** of 11 chains attempted |
| Theoretical findings (unconfirmed) | 14 |

---

## Top 3 Confirmed Risks

### 1 — M-001 + M-002: Complete API Authentication Absence + State Machine Bypass
**Critical — Confirmed (Live Exploit)**
Sources: SAST-001 · PEN-001 · COMP-001 · RED-001 · RED-002 · RED-003

Every API endpoint is unauthenticated. The state machine can be bypassed with a single `PATCH` request,
approving any item regardless of AI voting outcome. The red-teamer confirmed both paths live.

**Fix:** Add authentication middleware before all routes (`app.ts`). Remove direct PATCH status override.
Centralise all transitions through the state machine validator.

---

### 2 — M-003: CSRF via Form-Encoded Body
**Critical — Confirmed (Live Exploit)**
Sources: SAST-006 · RED-009

A cross-origin CSRF exploit lets any malicious page approve any work item with a single HTTP request —
no credentials, no CSRF token, no authentication required:

```bash
curl -X PATCH http://localhost:3001/api/feature-requests/<id> \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "status=approved"
```

**Fix:** Enforce strict `Content-Type: application/json` on mutations. Install `helmet`. Configure CORS allowlist.

---

### 3 — Compliance Collapse: 22% Pass Rate
Sources: compliance-auditor

14 of 18 OWASP ASVS Level 2 controls fail. SOC2 full-pass rate is 0%. The root cause is the missing
authentication layer, cascading into no RBAC, no session management, no audit events, and no TLS.
Three quick fixes (`helmet` + rate limiting + explicit body limit) would immediately close 5+ controls.

---

## All Findings — Deduplicated & Merged

> 15 overlapping SAST/PEN/COMP findings were merged with their RED confirmations into 23 unique findings.

### Critical (3 — All Confirmed Live)

| ID | Title | Status | Specialists |
|----|-------|--------|-------------|
| M-001 | Complete API Authentication Absence — All Endpoints Public | Confirmed | static-analyzer, pen-tester, compliance-auditor, red-teamer |
| M-002 | State Machine Bypass — PATCH Direct + Fast-Track Override | Confirmed | pen-tester, red-teamer |
| M-003 | CSRF via Form-Encoded Body — Anonymous Approval | Confirmed | static-analyzer, red-teamer |

### High (8)

| ID | Title | Status | Specialists |
|----|-------|--------|-------------|
| M-004 | Unauthenticated Dashboard — Business Intelligence Disclosure | Confirmed | red-teamer |
| M-005 | Ghost Dependency After Soft-Delete — Stalled Downstream Items | Partially Confirmed | pen-tester, red-teamer |
| M-006 | Stored XSS via Free-Text Fields | Partially Confirmed | compliance-auditor, red-teamer |
| M-007 | No Role-Based Access Control | Theoretical | compliance-auditor |
| M-008 | Missing Required Audit Log Events (3/4 absent) | Theoretical | compliance-auditor |
| M-009 | No TLS / HTTPS Enforcement | Theoretical | compliance-auditor |
| M-010 | Missing HTTP Security Headers + CORS | Theoretical | static-analyzer, compliance-auditor |
| M-011 | Intake Webhooks — No HMAC Signature Verification | Theoretical | static-analyzer, pen-tester, compliance-auditor |

### Medium (6)

| ID | Title | Status | Specialists |
|----|-------|--------|-------------|
| M-012 | Pagination Completely Non-Functional | Confirmed | static-analyzer, pen-tester, red-teamer |
| M-013 | Unauthenticated /metrics — Operational Reconnaissance | Confirmed | static-analyzer, pen-tester, compliance-auditor, red-teamer |
| M-014 | Vote Farming via Unlimited Assessment Retrigger | Confirmed | red-teamer |
| M-015 | Enum Injection on Intake Routes | Theoretical | static-analyzer, pen-tester |
| M-016 | No Rate Limiting on Any Endpoint | Theoretical | compliance-auditor |
| M-017 | In-Memory Store — No Persistence or Encryption at Rest | Theoretical | compliance-auditor |

### Low (6 — All Theoretical)

| ID | Title | Sources |
|----|-------|---------|
| M-018 | Raw Error Messages Returned to Clients | SAST-007 |
| M-019 | Dockerfile Runs Processes as Root | SAST-008 |
| M-020 | Debug Portal iframe Missing sandbox Attribute | SAST-009 |
| M-021 | JSON Body Size Limit Not Explicitly Set | SAST-010 |
| M-022 | Soft-Delete Does Not Satisfy Hard-Deletion Requirements | COMP-011 |
| M-023 | No Session Timeout Mechanism | COMP-012 |

---

## Red Team Summary

| Metric | Value |
|--------|-------|
| Environment | `docker-compose.test.yml` (ephemeral, torn down post-run) |
| Chains attempted | 11 |
| Confirmed | 8 |
| Partially confirmed | 2 |
| No breach | 1 |
| Objectives achieved | **4 / 4** |

| Chain | Title | Severity | Result |
|-------|-------|----------|--------|
| RED-001 | Baseline Auth Bypass | Critical | Confirmed |
| RED-002 | Force-Approve Overrides Deny Majority | Critical | Confirmed |
| RED-003 | PATCH State Machine Bypass | Critical | Confirmed |
| RED-004 | Ghost Dependency After Soft-Delete | High | Partial |
| RED-005 | Stored XSS in Free-Text Fields | High | Partial |
| RED-006 | Pagination Completely Non-Functional | Medium | Confirmed |
| RED-007 | Unauthenticated Metrics Exposure | Medium | Confirmed |
| RED-008 | Dashboard Business Intelligence Disclosure | High | Confirmed |
| RED-009 | CSRF via Form-Encoded Body | Critical | Confirmed |
| RED-010 | Vote Farming via Unbounded Retrigger | Medium | Confirmed |
| RED-011 | Race Condition Delete+Approve | Low | No Breach |

---

## Compliance Matrix (Summary)

### SOC2-Type2

| Control | Description | Status |
|---------|-------------|--------|
| CC6.1 | Logical access controls / authentication | FAIL |
| CC6.2 | Auth credentials management | FAIL |
| CC6.3 | Role-based access control | FAIL |
| CC7.1 | Security monitoring | PARTIAL |
| CC8.1 | Audit trail / change management | PARTIAL |

**SOC2 full-pass rate: 0% (0/5)**

### OWASP ASVS L2 (18 controls assessed)

| Control | Area | Status |
|---------|------|--------|
| 7.1.1 | No credentials in logs | PASS |
| 8.1.1 | No sensitive data in logs | PASS |
| 2.1.1, 2.2.1, 2.7.1 | Authentication | FAIL |
| 3.3.1, 3.3.2 | Session timeout | FAIL |
| 4.1.1, 4.1.2, 4.3.1 | Access control | FAIL |
| 5.2.1 | Input sanitisation | FAIL |
| 7.2.1 | Required events logged | FAIL |
| 8.2.1 | Sensitive data at rest | PARTIAL |
| 9.1.1, 9.1.2 | TLS | FAIL |
| 11.1.6 | Rate limiting | FAIL |
| 14.4.1, 14.4.2 | Security headers / CORS | FAIL |

**OWASP ASVS pass rate: 11% (2/18)**

---

## Grading Rationale

```
Grade F — Automatic
Trigger: Red-teamer confirmed all 4 critical pentest objectives.
         security.config.yml: "F: reserved for confirmed red-team breach of a critical objective"

For reference (all thresholds failed):
  Grade A: 0 Critical, <=2 High, compliance >=90%  -- 3 Critical, 8 High, 22% compliance
  Grade B: 0 Critical, <=6 High, compliance >=75%  -- 3 Critical, 8 High, 22% compliance
  Grade C: <=1 Critical, <=12 High, compliance >=60% -- 3 Critical fails C-critical threshold
  Grade D: <=2 Critical                            -- 3 Critical fails D threshold
  Grade F: Automatic (confirmed red-team breach)   -- Triggered
```

---

## What Is Working Well (Preserve)

- Structured JSON logger (`utils/logger.ts`) — well-built; needs audit-event layer added on top
- Prometheus metrics instrumentation — comprehensive; needs access control
- Enum validation on main `POST /api/work-items` — correctly rejects invalid values
- `changeHistory` tracking on work items — audit foundation exists
- React frontend escapes output by default — reduces XSS rendering risk
- No hardcoded secrets found in first-party source code
- Clean supply-chain: no `postinstall`/`preinstall` hooks in `package.json`

---

## Prioritised Remediation (Top 4 Unblock Everything Else)

1. **M-001** — Add authentication middleware + JWT login endpoint
2. **M-002** — Remove PATCH direct status override; restrict fast-track to admin role
3. **M-003** — Enforce `Content-Type: application/json`; reject form-encoded mutation bodies
4. **M-010** — Install `helmet` + configure CORS allowlist (one `npm install` closes 5+ ASVS controls)

Full roadmap: `Teams/TheGuardians/findings/security-report-2026-06-29-F.html` section 5.

---

## Artifacts

| Artifact | Path |
|----------|------|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-06-29-F.html` |
| JSON Backlog | `Teams/TheGuardians/findings/security-backlog-2026-06-29.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

## Next Step

**Confirmed breach — operator decision required before any merge.**

Theoretical findings are ready to route to TheFixer once the operator has reviewed the confirmed
breaches and cleared the branch for remediation work.

_TheGuardians team-leader · `run-20260629-083857` · 2026-06-29_
