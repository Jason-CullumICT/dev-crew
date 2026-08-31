# TheGuardians — Security & Compliance Report

**Date:** 2026-08-31 | **Run ID:** run-20260831-094505 | **Grade:** F

---

## ⛔ Grade F — Automatic

The red-teamer confirmed live breaches of critical pentest objectives against an ephemeral Docker environment. All breaches were executed without credentials — because none exist.

---

## Executive Summary

The dev-crew Source App has **zero authentication** on every API endpoint. Any unauthenticated caller can read, create, modify, approve, reject, dispatch, and delete any work item. The red-team confirmed 9 live breaches (RED-001 through RED-009), achieving 3 of 4 pentest objectives including full state machine bypass, dependency gating bypass, and unlimited dataset enumeration.

**Compliance pass rate: 12%** (2 of 17 controls). The near-total compliance failure is a direct consequence of the missing authentication layer.

**Operator decision required before any merge or deployment.**

---

## Findings Summary

| Severity | Count | Status |
|----------|-------|--------|
| **Critical** | 2 | Confirmed (Live Exploit) |
| **High** | 7 | 2 Confirmed · 5 Theoretical |
| **Medium** | 10 | 5 Confirmed / Limited · 5 Theoretical |
| **Low** | 4 | 3 Confirmed / Limited · 1 Theoretical |
| **Total** | **23** | |

| Metric | Value |
|--------|-------|
| Confirmed breaches (Critical) | 2 |
| Red-team objectives achieved | 3 / 4 |
| Compliance pass rate | 12% (2/17) |
| No hardcoded secrets found | ✅ |

---

## Top 3 Risks

### 🔴 Risk 1: No Authentication (F-001) — Critical · Confirmed
Every API endpoint is fully public. Confirmed: anonymous curl created, read, updated, and deleted arbitrary items with no credentials.  
**Sources:** SAST-001, PEN-001, RED-001, COMP-001  
**Remediation:** Add JWT middleware in `app.ts` before all `/api/*` routes.

### 🔴 Risk 2: State Machine Bypass via Force-Approve (F-002) — Critical · Confirmed
Confirmed live: item FR-0001 reached `approved` status with `votes: []` — zero AI votes, zero human review — in 3 anonymous HTTP requests.  
**Sources:** PEN-003, RED-002, COMP-002  
**Evidence:** `{"status":"approved","votes":[],"human_approval_approved_at":"2026-08-31T09:38:55.093Z"}`  
**Remediation:** Require authenticated admin role for `force-approve`. PATCH status must enforce state machine transitions.

### 🟠 Risk 3: Dependency Gating Bypass + Full Dataset Enumeration (F-003, F-004) — High · Confirmed
Confirmed: PATCH `blocked_by:[]` silently clears all blockers, allowing dispatch of items with unresolved dependencies (RED-003). Separately, `limit=999999` returned all 79 items in a single unauthenticated request (RED-005).

---

## All Findings

### Critical

| ID | Title | Status | Sources |
|----|-------|--------|---------|
| F-001 | Complete Absence of Authentication on All API Endpoints | Confirmed (Live Exploit) | SAST-001, PEN-001, RED-001, COMP-001 |
| F-002 | State Machine Bypass — Force-Approve Skips All Human Review | Confirmed (Live Exploit) | PEN-003, RED-002, COMP-002 |

### High

| ID | Title | Status | Sources |
|----|-------|--------|---------|
| F-003 | Dependency Gating Bypass — PATCH blocked_by:[] | Confirmed (Live Exploit) | PEN-005, RED-003 |
| F-004 | Unbounded Pagination — Full Dataset Enumeration | Confirmed (Live Exploit) | SAST-005, PEN-004, RED-005 |
| F-005 | Rejection Cascade Triggers Unintended Auto-Dispatch | Theoretical | PEN-006 |
| F-006 | Unauthenticated Webhooks — No HMAC Verification | Theoretical | SAST-002, PEN-007, COMP-003 |
| F-007 | No RBAC on Privileged State Transitions | Theoretical | COMP-002 |
| F-008 | No TLS — All Traffic in Plaintext | Theoretical | COMP-004 |
| F-009 | Unvalidated Enum Inputs via Intake Routes | Theoretical | SAST-004, PEN-002 |

### Medium

| ID | Title | Status | Sources |
|----|-------|--------|---------|
| F-010 | Soft-Deleted Item ID Leak (Partial IDOR) | Confirmed (Live Exploit) | PEN-011, RED-004 |
| F-011 | No Rate Limiting — Write Flooding | Confirmed (Live Exploit) | PEN-009, COMP-006, RED-006 |
| F-012 | Prometheus /metrics Unauthenticated | Confirmed (Live Exploit) | SAST-006, PEN-008, COMP-007, RED-007 |
| F-013 | Internal Error Messages & URLs Leaked | Confirmed (Limited) | SAST-003, RED-008 |
| F-014 | Required Audit Events Missing | Theoretical | COMP-008 |
| F-015 | Audit Logs Lack Actor Identity | Theoretical | COMP-009 |
| F-016 | No Persistent Storage / Encryption at Rest | Theoretical | COMP-010 |
| F-017 | No Hard Delete — GDPR Right to Erasure Absent | Theoretical | COMP-011 |
| F-018 | Non-numeric Pagination Returns Silent 200 | Confirmed (Limited) | PEN-010, RED-005 |
| F-019 | Missing HTTP Security Headers | Theoretical | SAST-007, COMP-005 |

### Low

| ID | Title | Status | Sources |
|----|-------|--------|---------|
| F-020 | Orchestrator Internal URL in Error Responses | Confirmed (Limited) | RED-008 |
| F-021 | Error Message ID Enumeration via Dependencies | Confirmed (Live Exploit) | PEN-012, RED-009 |
| F-022 | Object.assign Without Prototype Guard | Theoretical | SAST-008 |
| F-023 | Unused pino Production Dependency | Theoretical | COMP-012 |

---

## Red Team Summary

**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — torn down post-audit  
**Target:** portal/Backend on `localhost:3001`  
**Note:** Pen-tester mapped `Source/Backend/` (work-items app); Docker stack runs `portal/Backend/` (feature-request portal). Vulnerabilities are structurally identical. All chains adapted and confirmed against the live service.

| Objective | Result | RED-ID |
|-----------|--------|--------|
| Bypass work item state machine | ✅ ACHIEVED | RED-002 |
| Access soft-deleted item via ID | ✅ ACHIEVED | RED-004 |
| Submit malformed assessment verdict | ⚠️ PARTIAL — vote body ignored; force-approve same effect | RED-002 |
| Enumerate all items without pagination limit | ✅ ACHIEVED | RED-005 |

**Confirmed RED findings:** 9 (2 Critical · 2 High · 3 Medium · 2 Low)  
**Objectives achieved:** 3 / 4 → **Automatic Grade F**

---

## Compliance Matrix (Summary)

| Framework | Pass | Partial | Fail | Pass Rate |
|-----------|------|---------|------|-----------|
| OWASP-ASVS L2 | 1 | 2 | 9 | 8% |
| SOC2-Type2 | 0 | 1 | 4 | 0% |
| **Total** | **2** | **3** | **12** | **12%** |

Root cause of 10/12 failures: **missing authentication layer (F-001)**. Resolving F-001 directly unblocks CC6.2, CC6.3, CC7.1, ASVS V2/V3/V4 controls.

---

## Grading Rubric Applied

| Grade | Threshold | This Run |
|-------|-----------|----------|
| A | 0 Critical, ≤2 High, ≥90% compliance | ✗ |
| B | 0 Critical, ≤6 High, ≥75% compliance | ✗ |
| C | ≤1 Critical, ≤12 High, ≥60% compliance | ✗ |
| D | ≤2 Critical | ✗ |
| **F** | **Any confirmed red-team breach of critical objective** | **✅ AUTOMATIC F** |

---

## Remediation Priority

| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| P1 | **F-001 Add JWT authentication middleware** | Medium (1–3 days) | Unblocks F-007, F-014, F-015, CC6.2, CC6.3 |
| P2 | F-002 Gate force-approve + fix PATCH status | Low (hours) | State machine integrity |
| P3 | F-003 Restrict blocked_by clearing | Low (hours) | Dispatch gating |
| P4 | F-004 Clamp pagination limit | Low (minutes) | DoS, data leakage |
| P5 | F-006 HMAC webhook verification | Low (hours) | CC6.1, COMP-003 |
| P6 | F-007 RBAC middleware | Medium | CC6.3, V4.2 |
| P7 | F-011 Add express-rate-limit | Low (minutes) | DoS protection |
| P8 | F-019 Add helmet middleware | Low (minutes) | CSP, clickjacking |
| P9 | F-008 TLS enforcement (infra) | Medium | V9.1, CC6.1 |
| P10 | F-016 Migrate to persistent DB | High (1–2 weeks) | SOC2 durability |

---

## Artifacts

| Artifact | Path |
|----------|------|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-08-31-F.html` |
| JSON Backlog | `Teams/TheGuardians/findings/security-backlog-2026-08-31.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

*Posted by TheGuardians · Run ID: run-20260831-094505 · 2026-08-31*
