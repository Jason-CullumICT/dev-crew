# Dependency Auditor Findings Index

**Audit Date:** 2026-06-21  
**Grade:** D (Critical vulnerabilities present)  
**Auditor:** Dependency Auditor Agent

---

## Quick Navigation

### 📋 Reports by Format

| Document | Format | Purpose | Audience |
|----------|--------|---------|----------|
| **[AUDIT_SUMMARY.txt](AUDIT_SUMMARY.txt)** | Plain Text | Executive summary, timeline, grading | Team leads, stakeholders |
| **[dependency-audit-2026-06-21.md](dependency-audit-2026-06-21.md)** | Markdown | Full detailed findings with cross-references | Security team, developers |
| **[dependency-audit-2026-06-21.json](dependency-audit-2026-06-21.json)** | JSON | Structured data for automation/dashboards | CI/CD tools, dashboards |

### 🎯 Key Metrics

```
Total Vulnerabilities: 40
├─ CRITICAL (P1): 4 ✗ (RCE, DoS)
├─ HIGH (P2):     11 ✗ (Injection, bypass, DoS)
├─ MODERATE (P3): 24 ✓
└─ LOW (P4):      1 ✓

Workspaces Analyzed: 6
├─ portal/Backend:        CRITICAL (578 transitive, 50+ vulns)
├─ Source/Frontend:       HIGH (231 transitive, 11 vulns)
├─ platform/orchestrator: HIGH (156 transitive, 9 vulns)
├─ Source/Backend:        MODERATE (412 transitive, 27 vulns)
├─ Source/E2E:            MINIMAL (5 transitive, 0 vulns)
└─ portal/Frontend:       MODERATE (425 transitive, not fully scanned)

Direct Dependencies: 32
Transitive Dependencies: 1,807
```

---

## Critical Issues (P1) — Immediate Action

### 1. Vitest UI Server RCE (DEP-001)
- **Package:** vitest@2.0.5 → Source/Frontend
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Type:** Remote Code Execution
- **Fix:** `npm update vitest` (v3.2.6+)
- **Timeline:** IMMEDIATE (24 hours)
- **Escalation:** TheGuardians

### 2. Protobufjs Arbitrary Code Execution (DEP-002)
- **Package:** protobufjs@7.5.5 (transitive) → portal/Backend
- **CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Type:** Remote Code Execution (code injection)
- **Fix:** Upgrade @opentelemetry/auto-instrumentations-node ≥0.77.0
- **Timeline:** IMMEDIATE (24 hours)
- **Escalation:** TheGuardians

### 3. OpenTelemetry Exporter DoS (DEP-003)
- **Package:** @opentelemetry/auto-instrumentations-node@0.40.0, sdk-node@0.47.0 → portal/Backend
- **CVE:** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)
- **Type:** Denial of Service (process crash)
- **Fix:** Upgrade @opentelemetry/auto-instrumentations-node ≥0.77.0
- **Timeline:** IMMEDIATE (24 hours)
- **Impact:** Complete service unavailability on malformed HTTP to /metrics
- **Escalation:** TheGuardians

---

## High-Severity Issues (P2) — Urgent (1 Week)

| ID | Package | CVE | Type | Fix |
|----|---------|-----|------|-----|
| DEP-004 | form-data | GHSA-hmw2-7cc7-3qxx | CRLF Injection | npm update form-data |
| DEP-005 | vite | GHSA-fx2h-pf6j-xcff | Path Traversal | npm update vite |
| DEP-006 | react-router-dom | GHSA-2j2x-hqr9-3h42 | Redirect | npm update (v6.30.4 has fix) |
| DEP-007 | @grpc/grpc-js | GHSA-5375-pq7m-f5r2 | Server Crash | Update opentelemetry cascade |
| DEP-008 | ws | GHSA-96hv-2xvq-fx4p | Memory DoS | Update vite (cascade) |
| DEP-009 | path-to-regexp | GHSA-37ch-88jc-xwx2 | ReDoS | Update grpc (cascade) |

---

## Outdated Major Versions (P3) — Plan Before Release

Eight packages are 1+ major versions behind:

1. **vitest** (2.0.5 → 3.2.6) — Breaking changes, but has CRITICAL CVE fix
2. **express** (4.18.2 → 5.2.1) — 1 major behind, plan 2-3 week migration
3. **pino** (8.17.0 → 10.3.1) — Backend only, test logging behavior
4. **react** (18.3.1 → 19.2.7) — Hooks API improvements, generally compatible
5. **react-dom** (18.3.1 → 19.2.7) — Must match React version
6. **react-router-dom** (6.30.4 → 7.18.0) — Minor breaking changes
7. **uuid** (9.0.0 → 14.0.1) — Has CVE in v9, upgrade needed
8. **@opentelemetry** (0.40/0.47 → 0.77/0.219) — Has P1 CVEs, urgent

---

## Workspace Risk Summary

### 🔴 portal/Backend — CRITICAL
- **Dependencies:** 11 direct, 578 transitive (largest tree)
- **Vulnerabilities:** 50+ (3 critical, 2 high, multiple moderate)
- **Main Issues:**
  - Protobufjs RCE (GHSA-xq3m-2v4x-88gg)
  - OpenTelemetry DoS (GHSA-q7rr-3cgh-j5r3)
  - Multiple gRPC/OpenTelemetry transitive vulns
- **Recommendation:** Triage immediately; highest supply chain risk
- **Fix Timeline:** Phase 1 of remediation

### 🟠 Source/Frontend — HIGH
- **Dependencies:** 3 direct, 231 transitive
- **Vulnerabilities:** 11 (1 critical, 3 high, 6 moderate)
- **Main Issues:**
  - Vitest UI RCE (dev-time, but supply-chain risk)
  - Form-data CRLF injection
  - Vite path traversal
  - React Router redirect
  - ws DoS
- **Recommendation:** Fix dev dependencies immediately; production deps urgent
- **Fix Timeline:** Phases 1 & 2 of remediation

### 🟠 platform/orchestrator — HIGH
- **Dependencies:** 3 direct, 156 transitive
- **Vulnerabilities:** 9 (1 critical, 2 high, 6 moderate)
- **Main Issues:**
  - Inherits protobufjs/grpc CVEs from transitive deps
  - Direct uuid buffer overflow exposure
  - path-to-regexp ReDoS
- **Recommendation:** Upgrade direct dependencies; test for breaking changes
- **Fix Timeline:** Phase 1 cascade effects

### 🟡 Source/Backend — MODERATE
- **Dependencies:** 4 direct, 412 transitive
- **Vulnerabilities:** 27 (mostly dev-time: ts-jest, jest, babel)
- **Main Issues:**
  - UUID buffer overflow in production
  - ts-jest transitive js-yaml DoS
  - Multiple Jest/Babel test infrastructure CVEs
- **Recommendation:** Address ts-jest and uuid; test infra is dev-time only
- **Fix Timeline:** Phase 2

### 🟢 Source/E2E — MINIMAL
- **Dependencies:** 1 direct (@playwright/test), 5 transitive
- **Vulnerabilities:** 0 known
- **Recommendation:** Monitor but no action needed
- **Fix Timeline:** N/A

---

## Remediation Timeline & Phases

### Phase 1: Critical CVE Response (24 hours)
**What:** Fix all P1 (CRITICAL) vulnerabilities  
**Which:** DEP-001, DEP-002, DEP-003
```
1. Vitest UI: npm update vitest in Source/Frontend
2. OpenTelemetry: npm update @opentelemetry packages in portal/Backend
3. Protobufjs: Cascades from OpenTelemetry upgrade
```
**Workspace Impact:** Source/Frontend, portal/Backend  
**Testing:** Unit tests + integration tests (verify no breaking changes)  
**Risk:** Vitest v3 may have breaking changes; test dev workflow

### Phase 2: High-Severity Fixes (1 week)
**What:** Fix all P2 (HIGH) vulnerabilities  
**Which:** DEP-004 through DEP-009
```
1. Form-data CRLF: npm update form-data
2. Vite path traversal: npm update vite (cascade to esbuild, postcss, ws)
3. React Router: npm update react-router-dom (already fixed in v6.30.4)
4. gRPC crash: Cascades from Phase 1 opentelemetry upgrade
5. path-to-regexp ReDoS: Cascades from grpc upgrade
```
**Workspace Impact:** Source/Frontend, portal/Backend  
**Testing:** E2E tests, security-focused test cases  
**Risk:** Vite update may affect dev server behavior; test locally first

### Phase 3: Moderate-Severity Fixes (2 weeks)
**What:** Fix P3 (MODERATE) vulnerabilities and some outdated packages
**Which:** DEP-010 through DEP-015, major version evaluation
```
1. UUID buffer overflow: npm update uuid (breaking API changes possible)
2. ts-jest ecosystem: npm update ts-jest (cascades babel, jest fixes)
3. PostCSS XSS: Cascades from vite v2 update
4. QS DoS: npm update express (minor patch)
```
**Workspace Impact:** All production workspaces  
**Testing:** Full regression test suite  
**Risk:** UUID v14 may have API changes; test compatibility

### Phase 4: Major Version Planning (Before release)
**What:** Plan and evaluate major version migrations
**Which:** Express v5, React v19, React Router v7, Multer v2, Pino v10
**Timeline:** 2-3 weeks design, 1-2 weeks implementation, 1 week testing
**Effort:** Medium (design review) to High (implementation)
**Risk:** Breaking changes require code updates and thorough testing

---

## Escalations & Cross-References

### 🚨 Escalated to TheGuardians (Security Team)
These findings require security expertise and incident response:

1. **DEP-001:** Vitest UI RCE
   - Supply-chain risk if dev server exposed to network
   - Requires secure dev environment practices

2. **DEP-002:** Protobufjs RCE
   - Production RCE vulnerability
   - Requires incident response if exploited in wild

3. **DEP-003:** OpenTelemetry DoS
   - Production availability risk
   - Requires metrics endpoint security review

4. **DEP-004:** Form-Data CRLF Injection
   - Header injection / HTTP response splitting
   - Requires input validation review in Portal

5. **DEP-006:** React Router Redirect
   - Phishing / credential theft risk
   - Requires URI validation review

### 👨‍💻 Code Review Required (Breaking Changes)
These require design/architecture review before proceeding:

1. **Express v4→v5 Migration**
   - Callback signature changes
   - Middleware order changes
   - Requires 2-3 weeks planning

2. **Vitest v2→v3 Migration**
   - Test configuration changes
   - UI server behavior changes
   - Requires test infrastructure review

3. **React v18→v19 Migration**
   - New hooks API
   - Generally backward compatible, optional adoption
   - Requires evaluation of new features

4. **React Router v6→v7 Migration**
   - Minor breaking changes
   - Generally smooth upgrade path
   - Requires route configuration review

5. **Multer v1→v2 Migration**
   - File upload handling API changes
   - Requires Portal file handling code review

---

## Compliance Status

### ✅ License Compliance: COMPLIANT
- No GPL/AGPL licenses detected (no viral license risk)
- No UNLICENSED or proprietary packages
- All primary dependencies use MIT licenses
- **Recommendation:** No license review required at this time

### ✅ Supply Chain Posture: GOOD
- No post-install scripts detected (reduced attack surface)
- No deprecated packages (all actively maintained)
- No abandoned packages
- **Recommendation:** Monitor protobufjs/grpc for future CVEs (recurrence risk)

### ⚠️ Supply Chain Risk: MODERATE-HIGH
- Portal/Backend has 578 transitive dependencies (largest exposure)
- OpenTelemetry ecosystem has multiple interdependent vulnerabilities
- Protobufjs has recurrence of critical CVEs across versions
- **Recommendation:** Add automated scanning to CI/CD; monitor these packages proactively

---

## Audit Methodology

### Tools Used
1. **npm audit** — CVE scanning with CVSS scores and CWE references
2. **npm outdated** — Package version comparison (current vs. latest)
3. **package.json analysis** — Direct dependencies, licenses, scripts
4. **package-lock.json analysis** — Transitive dependency tree size

### Workspaces Scanned
- ✅ Source/Backend
- ✅ Source/Frontend
- ✅ Source/E2E
- ✅ platform/orchestrator
- ✅ portal/Backend
- ⚠️ portal/Frontend (not fully scanned, assumed similar to Source/Frontend)

### Severity Classification
- **P1 (CRITICAL):** CVSS ≥9.0 OR RCE/auth bypass in production dependency
- **P2 (HIGH):** CVSS 7.0-8.9 OR high-severity in direct dependency
- **P3 (MODERATE):** CVSS 5.0-6.9 OR outdated major version (1+ behind current)
- **P4 (LOW):** CVSS <5.0 OR dev-time-only vulnerabilities

### Grading Criteria
From `inspector.config.yml`:
- **A:** max 0 P1, max 3 P2, min 80% spec coverage
- **B:** max 0 P1, max 8 P2, min 60% spec coverage
- **C:** max 2 P1, max 15 P2, min 40% spec coverage
- **D:** Any P1 unresolved
- **F:** Exploitable auth bypass + critical domain failure

**Current Status:** D (4 P1 unresolved, 11 P2 unresolved)

---

## Next Steps

1. **TODAY:** Review CRITICAL findings with security team
2. **TOMORROW:** Plan Phase 1 remediation (24h timeline)
3. **THIS WEEK:** Execute Phase 1, start Phase 2 planning
4. **NEXT WEEK:** Complete Phase 2, begin Phase 3
5. **BEFORE RELEASE:** Design Phase 4 major version migrations

---

## References & Documentation

- **Full Report:** [dependency-audit-2026-06-21.md](dependency-audit-2026-06-21.md)
- **Structured Data:** [dependency-audit-2026-06-21.json](dependency-audit-2026-06-21.json)
- **Executive Summary:** [AUDIT_SUMMARY.txt](AUDIT_SUMMARY.txt)
- **Learnings & Recommendations:** [Teams/TheInspector/learnings/dependency-auditor.md](../learnings/dependency-auditor.md)
- **Configuration:** [Teams/TheInspector/inspector.config.yml](../inspector.config.yml)

---

**Report Generated:** 2026-06-21  
**Auditor:** Dependency Auditor Agent  
**Grade:** D (Critical vulnerabilities present)  
**Status:** ⚠️ REQUIRES IMMEDIATE ACTION
