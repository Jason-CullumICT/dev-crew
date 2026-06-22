# TheGuardians — Security & Compliance Report

**Date:** 2026-06-22 · **Run:** run-20260622-092803 · **Grade: F**

---

## ⛔ Grade F — Confirmed Red Team Breach

A single unauthenticated HTTP call overrode a 3-agent-deny AI governance decision (**RED-002: force-approve bypasses AI consensus**), constituting a confirmed breach of a critical business objective. This is an automatic F under the grading rubric.

**Operator decision required before any merge or deployment.**

---

## Findings Summary

| Severity | Confirmed (Live) | Theoretical | Total |
|----------|:---:|:---:|:---:|
| 🔴 Critical | 2 | 1 | **3** |
| 🟠 High | 4 | 8 | **12** |
| 🟡 Medium | 1 | 10 | **11** |
| 🟢 Low | 0 | 2 | **2** |
| **Total** | **7** | **21** | **28** |

**Compliance Pass Rate:** 7% (2/28 controls) · OWASP-ASVS L2: 9% · SOC2-Type2: 0%

---

## Top 3 Risks

1. **Complete Authentication Absence + Force-Approve Governance Bypass** (Confirmed Critical)  
   Every endpoint is publicly accessible with zero auth. A 3-agent-deny AI vote was bypassed in one unauthenticated HTTP call. The entire AI governance layer can be negated anonymously.

2. **Webhook Injection — No HMAC Signature Verification** (Critical Theoretical)  
   `POST /api/intake/zendesk` and `/automated` accept any POST body with no HMAC check, enabling pipeline flooding, forged ticket injection, and enum value poisoning.

3. **Permanent Dispatch Sabotage + Mass Data Enumeration** (Confirmed High × 2)  
   Any caller can permanently block an item's dispatch by soft-deleting its blocker (ghost dependency). Separately, pagination limits are completely unenforced — full data dumps in one request.

---

## Confirmed Findings (RED-ID Live Exploits)

| ID | Severity | Title |
|----|----------|-------|
| RED-001 / PEN-001 | 🔴 Critical | Complete authentication absence — all endpoints anonymous |
| RED-002 / PEN-003 | 🔴 Critical | Force-approve overrides 3-deny AI governance consensus **(F-trigger)** |
| RED-003 / PEN-006 | 🟠 High | Permanent dispatch sabotage via soft-deleted blocker |
| RED-004 / PEN-005 | 🟠 High | Mass data enumeration — pagination completely unenforced |
| RED-005 / PEN-004 | 🟠 High | Audit trail XSS — 5,116-char script payload stored verbatim |
| RED-006 / PEN-008 | 🟠 High | Prometheus /metrics unauthenticated — Node.js v22.23.0 fingerprinted |
| RED-007 / PEN-012 | 🟡 Medium | Search returns full corpus on empty query |

---

## Red Team Objective Coverage

| Objective | Result |
|-----------|--------|
| Bypass work item state machine | ✅ ACHIEVED (RED-002) |
| Access/modify soft-deleted item via direct ID | ✅ ACHIEVED (RED-003) |
| Submit malformed assessment verdict bypassing routing | ⚠️ PARTIAL (RED-005, RED-002) |
| Enumerate all work items without pagination limit | ✅ ACHIEVED (RED-004, RED-007) |
| State machine direct-transition enforcement | 🛡 DEFENSE HELD (RED-009) |
| CORS browser-origin restriction (portal) | 🛡 DEFENSE HELD (RED-008) |

---

## Compliance Matrix

| Framework | Pass Rate | Controls Evaluated |
|-----------|:---------:|:------------------:|
| OWASP-ASVS Level 2 | **9%** (2/23) | 23 |
| SOC2-Type2 | **0%** (0/5) | 5 |
| **Overall** | **7%** (2/28) | 28 |

**Root Cause:** `package.json` contains zero security dependencies (`cors`, `helmet`, `jsonwebtoken`, `bcrypt`, `express-rate-limit` all absent). Adding authentication resolves 7 of the 8 high-severity compliance gaps.

---

## Immediate Remediation Priority

| Priority | Action | Resolves |
|----------|--------|---------|
| **P0** | Add JWT/API-key auth middleware to all `/api/*` routes (both services) | RED-001/002, PEN-001–003, COMP-001/002/005/008/009 |
| **P0** | Gate `force-approve` + `overrideRoute:fast-track` behind admin role + audit log | RED-002, PEN-003 |
| **P0** | Add HMAC-SHA256 signature verification to both intake webhook endpoints | PEN-002, SAST-002, COMP-013 |
| **P1** | Fix soft-deleted blocker treated as unresolved in `computeHasUnresolvedBlockers()` | RED-003, PEN-006 |
| **P1** | Enforce pagination cap (`limit ≤ 100`) on all list endpoints | RED-004, PEN-005, SAST-006 |
| **P1** | Add max length + output-encoding to all audit comment/reason fields | RED-005, PEN-004 |
| **P1** | Restrict `/metrics` to internal network or add bearer-token gate | RED-006, PEN-008 |
| **P1** | Fix file upload to verify magic bytes; normalize extensions | SAST-003 |
| **P1** | Add `express-rate-limit` to all write/transition endpoints | COMP-005 |
| **P2** | Add `helmet()`, CORS to Source/Backend, fix 502 URL leak, add proxy allowlist | SAST-005–010 |

---

## Artifacts

| File | Description |
|------|-------------|
| `Teams/TheGuardians/findings/security-report-2026-06-22-F.html` | Full HTML security report |
| `Teams/TheGuardians/findings/security-backlog-2026-06-22.json` | Machine-readable finding backlog (28 items) |
| `Teams/TheGuardians/findings/compliance-audit-20260622.md` | Full compliance audit detail |
| `Teams/TheGuardians/artifacts/attack-surface-map.md` | Pen-tester attack surface map + red team results |

---

## Deduplication Notes

The following findings from multiple specialists were merged:
- **SAST-001 + COMP-001 + PEN-001 + RED-001** → merged as authentication-absence finding (Critical Confirmed)
- **SAST-002 + COMP-013 + PEN-002** → merged as webhook-injection finding (Critical Theoretical)
- **SAST-006 + PEN-005 + RED-004** → merged as pagination-enumeration finding (High Confirmed)
- **SAST-009 + COMP-012 + PEN-008 + RED-006** → merged as metrics-exposure finding (High Confirmed)
- **SAST-005 + COMP-004** → merged as security-headers finding (Medium Theoretical)
- **SAST-008 + COMP-003 + PEN-011** → merged as CORS-missing finding (Medium Theoretical, Source/Backend only — portal/Backend CORS confirmed working by RED-008)
- **SAST-011 + COMP-015 + COMP-017** → merged as input-length finding (Low Theoretical)
- **PEN-009 + COMP-016** → merged as NaN-pagination finding (Medium Theoretical)

---

*Generated by TheGuardians team-leader (sonnet) · run-20260622-092803*  
*Specialists: static-analyzer · compliance-auditor · pen-tester · red-teamer*
