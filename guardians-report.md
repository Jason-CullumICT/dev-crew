# TheGuardians Security & Compliance Report
**Date:** 2026-05-11 | **Grade: F** | **Run ID:** run-20260511-065832

> ⛔ **Confirmed Critical Breach.** The red-teamer achieved 4/4 pentest objectives and 8/8 exploit chains,
> all unauthenticated. The application has zero authentication or authorization on any endpoint.
> This codebase must not be exposed on a shared or externally reachable network until CF-001 is remediated.

---

## Executive Summary

| Metric | Value |
|---|---|
| **Grade** | **F** (automatic — confirmed red-team breach of critical objectives) |
| Critical findings | 3 (all confirmed) |
| High findings | 3 (2 confirmed, 1 theoretical) |
| Medium findings | 8 (2 confirmed, 6 theoretical) |
| Low findings | 7 (2 confirmed, 5 theoretical) |
| **Total findings** | **21** |
| Confirmed breaches | 9 |
| Theoretical findings | 12 |
| Compliance pass rate | **~19%** (1 PASS · 3 PARTIAL · 17 FAIL of 21 controls) |
| Red-team objectives achieved | **4 / 4** |

**Root cause:** A single missing `app.use(auth middleware)` call in `Source/Backend/src/app.ts` is the
structural root of all three Critical findings. Every exploit chain chains from `CF-001`.

---

## Top 3 Risks

### 1. CF-001 — No Authentication or Authorization on Any API Endpoint
**Severity: Critical | Status: Confirmed (Live Exploit)**
Sources: SAST-001 · COMP-001 · COMP-002 · PEN-001 · PEN-002 → RED-001, RED-002, RED-003

Every API route — including state-changing workflow operations (approve, reject, dispatch) and
intake webhooks — is fully public. Any client reachable at port 3001 has full CRUD + workflow
control. This is the root cause of all critical exploit chains.

**Remediation:** Implement JWT bearer-token authentication as the first `app.use()` before route
registration. Add RBAC (viewer / triage-agent / approver / dispatcher / admin). All unauthenticated
requests → HTTP 401. Machine callers → API key mechanism.

---

### 2. CF-002 — Unrestricted `overrideRoute: fast-track` Bypasses Entire Assessment Pipeline
**Severity: Critical | Status: Confirmed (Live Exploit)**
Sources: PEN-003 → RED-001

`POST /api/work-items/:id/route` with `{"overrideRoute":"fast-track"}` sets `status: approved`
unconditionally. The assessment pod is never invoked, `assessments: []` remains empty.

**Red-team proof:** 3 unauthenticated HTTP requests advance any item:
```
POST /api/work-items              → WI-001 (backlog)
POST /api/work-items/WI-001/route {"overrideRoute":"fast-track"} → approved
POST /api/work-items/WI-001/dispatch {"team":"TheATeam"} → in-progress
```

**Remediation:** Gate `overrideRoute` to `ops-manager` role. Mandatory audit event with approver
identity. Consider removing the escape hatch from the public API surface entirely.

---

### 3. CF-003 — Unauthorized Cascade Auto-Dispatch via Dependency Injection
**Severity: Critical | Status: Confirmed (Live Exploit)**
Sources: PEN-007 → RED-003

Any caller can (1) add an attacker-controlled blocker onto an `approved` victim item, (2) reject
the blocker, triggering `onItemResolved()`, which auto-dispatches the victim to `in-progress` via
`cascade-dispatcher` — bypassing the explicit `/dispatch` endpoint entirely.

**Red-team proof:** `changeHistory` entry: `agent=cascade-dispatcher | reason: Auto-dispatched after
blocker WI-006 resolved`. Prometheus counter `dispatch_gating_events_total{event="cascade_dispatched"} 1`.

**Remediation:** Restrict dependency injection on approved items to `ops-manager` role. Require
a confirmation step before cascade dispatch fires.

---

## All Findings — Deduplicated

| ID | Title | Severity | Status | Sources | Confirmed By |
|---|---|---|---|---|---|
| CF-001 | No Auth/AuthZ on Any API Endpoint | **Critical** | Confirmed | SAST-001, COMP-001/002, PEN-001/002 | RED-001/002/003 |
| CF-002 | fast-track Override Bypasses Assessment | **Critical** | Confirmed | PEN-003 | RED-001 |
| CF-003 | Unauthorized Cascade Auto-Dispatch | **Critical** | Confirmed | PEN-007 | RED-003 |
| CF-004 | Intake Webhooks: No HMAC + XSS + Enum Injection | **High** | Confirmed | SAST-002, COMP-003, PEN-005/006 | RED-004 |
| CF-005 | Unbounded Pagination → Full Data Exfiltration | **High** | Confirmed | SAST-006, COMP-008, PEN-004/008/010 | RED-002 |
| CF-006 | Missing Audit Events + No Actor Identity | **High** | Theoretical | COMP-004/005 | — |
| CF-007 | Soft-Deleted UUID Disclosure via Readiness Check | Medium | Confirmed | PEN-009 | RED-005 |
| CF-008 | NeedsClarification Bypasses Dispatch Gating | Medium | Confirmed | PEN-012 | RED-006 |
| CF-009 | Missing HTTP Security Headers | Medium | Theoretical | SAST-003, COMP-006 | — |
| CF-010 | No CORS Policy | Medium | Theoretical | SAST-004, COMP-007 | — |
| CF-011 | Unauthenticated /metrics Endpoint | Medium | Theoretical | SAST-005, COMP-009, PEN-011 | — |
| CF-012 | No Rate Limiting | Medium | Theoretical | SAST-007, COMP-012 | — |
| CF-013 | No TLS/HTTPS Enforcement | Medium | Theoretical | COMP-010 | — |
| CF-014 | In-Memory Store: No Persistence / Encryption | Medium | Theoretical | COMP-011 | — |
| CF-015 | Raw Exception Messages in Error Responses | Low | Confirmed | PEN-014 | RED-007 |
| CF-016 | Predictable Sequential Document IDs | Low | Confirmed | PEN-013 | RED-008 |
| CF-017 | Debug Portal iframe Missing sandbox | Low | Theoretical | SAST-008 | — |
| CF-018 | Sensitive Field Values in Change History Logs | Low | Theoretical | SAST-009 | — |
| CF-019 | No Input Length Validation / Body Size Limit | Low | Theoretical | SAST-010, COMP-013 | — |
| CF-020 | Audit Log Lacks Tamper-Evidence | Low | Theoretical | COMP-014 | — |
| CF-021 | No OpenTelemetry Instrumentation | Low | Theoretical | COMP-015 | — |

---

## Compliance Matrix Summary

**Pass rate: ~19%** (1 PASS · 3 PARTIAL · 17 FAIL of 21 controls)

| Status | Controls |
|---|---|
| ✅ PASS (1) | OWASP-ASVS V7.4.1 — errorHandler returns generic message (no stack trace to client) |
| ⚠️ PARTIAL (3) | OWASP-ASVS V13.2.1 (Express default body limit) · SOC2 CC7.1 (ops logs exist, required events missing) · SOC2 CC8.1 (changeHistory exists but mutable/in-memory) |
| ❌ FAIL (17) | All authentication (V2.1.1, V2.2.1, V3.2.1, V3.3.1) · all access control (V4.1.1, V4.1.3, V4.2.1, V4.2.2) · audit (V7.1.2, V7.3.1) · encryption at rest (V8.1.1) · TLS (V9.1.1) · rate limiting (V11.1.4) · security headers (V14.4.1) · CORS (V14.4.8) · SOC2 CC6.1/6.2/6.3 |

---

## Red Team Results

| Chain | Severity | Objective | Status |
|---|---|---|---|
| RED-001: Full Workflow Takeover | Critical | ✅ State machine bypass | Confirmed Breach |
| RED-002: Full Data Exfiltration | High | ✅ Unlimited enumeration | Confirmed Breach |
| RED-003: Cascade Auto-Dispatch | Critical | ✅ Unauthorized dispatch | Confirmed Breach |
| RED-004: Intake XSS + Enum Injection | High | ✅ Malformed intake bypass | Confirmed Breach |
| RED-005: Soft-Delete UUID Disclosure | Medium | ✅ Soft-deleted item access | Confirmed Breach |
| RED-006: Assessment Verdict Bypass | Medium | ✅ Dispatch gating bypass | Confirmed Breach |
| RED-007: Error Message Leakage | Low | Partial | Confirmed |
| RED-008: Sequential Doc ID Enumeration | Low | ✅ Full enumeration | Confirmed |

**Objectives achieved: 4 / 4 · Confirmed breaches: 8 / 8 chains**

---

## Prioritised Remediation Roadmap

| Priority | Finding | Effort | Notes |
|---|---|---|---|
| **P1** | CF-001: Auth layer | High | Root cause — breaks all 3 Critical chains |
| **P1** | CF-002: Gate overrideRoute | Low | Blocks 3-request workflow takeover |
| **P1** | CF-003: Restrict dependency injection on approved items | Medium | Blocks cascade exploit |
| **P2** | CF-004: Webhook HMAC + enum validation | Low | Prevents forged intake + XSS |
| **P2** | CF-005: Cap pagination limit | Very Low | One-liner fix |
| **P2** | CF-006: Required audit events + actor identity | Medium | SOC2 CC7.1 |
| **P3** | CF-009/010/011/012/013/014 | Low–High | Security hygiene + compliance |
| **P3** | CF-007/008 | Low | Logic correctness + UUID disclosure |
| **P4** | CF-015 through CF-021 | Very Low–Medium | Defence in depth |

> **CF-001 is the forcing function.** Fixing it unlocks proper remediation of CF-002, CF-003, CF-006,
> and all compliance controls that depend on authenticated identity.

---

## Phase 2 Status

Red-team executed against `Source/Backend` on an ephemeral `ts-node` process (localhost:3002,
in-memory store — isolated, not shared dev/staging/production). Both gate conditions were satisfied
before dispatch: ephemeral environment confirmed, attack surface map had 14 PEN-ID findings.

---

## Grading Rationale

Per `security.config.yml`:

| Threshold | Requirement | Actual | Pass? |
|---|---|---|---|
| Grade A | 0 Critical, ≤2 High, compliance ≥90% | 3 Critical, 3 High, 19% | ❌ |
| Grade B | 0 Critical, ≤6 High, compliance ≥75% | 3 Critical | ❌ |
| Grade C | ≤1 Critical, ≤12 High, compliance ≥60% | 3 Critical, 19% | ❌ |
| Grade D | ≤2 Critical | 3 Critical | ❌ |
| **Grade F** | **Any confirmed red-team breach of a critical objective** | **RED-001 + RED-003 confirmed** | **✅ Automatic F** |

---

## Output Artifacts

| Artifact | Path |
|---|---|
| Full HTML Report | `Teams/TheGuardians/findings/security-report-2026-05-11-F.html` |
| Security Backlog (JSON) | `Teams/TheGuardians/findings/security-backlog-2026-05-11.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |
| This Summary | `guardians-report.md` |

---

*Generated by TheGuardians (team_leader · static-analyzer · pen-tester · red-teamer · compliance-auditor) · 2026-05-11*
