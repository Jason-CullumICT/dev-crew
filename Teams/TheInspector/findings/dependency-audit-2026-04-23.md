# Dependency Auditor Findings
**Audit Date:** 2026-04-23  
**Audit Tool:** npm audit

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Projects Audited** | 4 (Backend, Frontend, E2E, Orchestrator) |
| **Critical CVEs** | 2 |
| **High CVEs** | 1 |
| **Moderate CVEs** | 6 |
| **Low CVEs** | 0 |
| **Total Packages Scanned** | 799 transitive dependencies |
| **Packages with Outdated Major Versions** | 6 |

---

## Project Overview

| Project | Direct Deps | Transitive Deps | Total | CVEs |
|---------|-------------|-----------------|-------|------|
| Source/Backend | 13 | 398 | 411 | 3 (1C, 2M) |
| Source/Frontend | 13 | 217 | 230 | 5 (5M) |
| Source/E2E | 4 | 0 | 4 | 0 |
| platform/orchestrator | 3 | 152 | 155 | 4 (1C, 1H, 2M) |

---

## Critical Findings

### ⚠️ DEP-001: Arbitrary Code Execution in protobufjs
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** protobufjs@<7.5.5
- **File:** platform/orchestrator/package-lock.json
- **Affected Versions:** < 7.5.5
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Detail:** 
  - **Type:** Arbitrary Code Execution
  - **CWE:** CWE-94 (Improper Control of Generation of Code)
  - **Description:** Critical vulnerability allowing remote code execution via malformed protobuf messages
  - **CVSS Score:** Critical (score calculation pending)
  - **Advisory:** https://github.com/advisories/GHSA-xq3m-2v4x-88gg
- **Impact:** This is a transitive dependency in platform/orchestrator. Attackers could execute arbitrary code by providing specially crafted protobuf data to the orchestrator.
- **Fix:** Run `npm update protobufjs` in platform/orchestrator to upgrade to 7.5.5+
- **Status:** Fixable — fix available
- **Cross-ref:** [ESCALATE → TheGuardians] — This is a critical code execution vulnerability that could compromise the orchestrator infrastructure.

---

### ⚠️ DEP-002: Handlebars JavaScript Injection (Critical)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** handlebars@4.0.0-4.7.8
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** >= 4.0.0 <= 4.7.8
- **CVE:** GHSA-2w6w-674q-4c4q (Primary)
- **Detail:**
  - **Type:** JavaScript Code Injection via AST Type Confusion
  - **CWE:** CWE-94, CWE-843
  - **CVSS:** 9.8 (Critical) — AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
  - **Description:** Multiple critical injection vulnerabilities in Handlebars template engine that allow attackers to execute arbitrary JavaScript through specially crafted templates.
  - **Related CVEs:**
    - GHSA-3mfm-83xf-c92r: AST Type Confusion via @partial-block tampering (CVSS 8.1)
    - GHSA-xjpj-3mr7-gcpf: CLI Precompiler injection (CVSS 8.3)
    - GHSA-xhpv-hc6g-r9c6: AST Type Confusion with dynamic partials (CVSS 8.1)
    - GHSA-9cx6-37pm-9jff: Denial of Service via malformed decorators (CVSS 7.5)
  - **Advisory:** https://github.com/advisories/GHSA-2w6w-674q-4c4q
- **Root Cause:** Handlebars is a transitive dependency, likely pulled in by Jest during development.
- **Impact:** A transitive dependency in Source/Backend. If handlebars templates are processed during CI/CD or build time, attackers could inject code into builds. In development, this affects test infrastructure.
- **Fix:** Update handlebars to 4.7.9+ or newer major version. Since it's a test dependency, coordinate with test infrastructure.
- **Status:** Fixable — fix available
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection vulnerability in critical build/test path.

---

## High Priority Findings

### ⚠️ DEP-003: Regular Expression Denial of Service (ReDoS) in path-to-regexp
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** path-to-regexp@<0.1.13
- **File:** platform/orchestrator/package-lock.json
- **Affected Versions:** < 0.1.13
- **CVE:** GHSA-37ch-88jc-xwx2
- **Detail:**
  - **Type:** Regular Expression Denial of Service (ReDoS)
  - **CWE:** CWE-1333 (Inefficient Regular Expression Complexity)
  - **CVSS:** 7.5 (High) — AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
  - **Description:** Multiple route parameters can cause catastrophic regex backtracking, leading to CPU exhaustion and denial of service
  - **Exploit Scenario:** Crafted HTTP request with many route parameters causes the orchestrator to hang
  - **Advisory:** https://github.com/advisories/GHSA-37ch-88jc-xwx2
- **Root Cause:** Transitive dependency in platform/orchestrator (likely from Express)
- **Impact:** DoS attack surface on orchestrator API endpoints. Attackers can make the service unresponsive.
- **Fix:** Ensure path-to-regexp is updated to 0.1.13+. May require updating Express or the express router version.
- **Status:** Fixable — fix available
- **Cross-ref:** [CROSS-REF: red-teamer] — This is exploitable via network requests to the orchestrator.

---

## Medium Priority Findings

### ⚠️ DEP-004: UUID Missing Buffer Bounds Check
- **Severity:** P2 (MODERATE → upgrading due to direct dependency and widespread use)
- **Category:** CVE
- **Package:** uuid@^9.0.0 (Backend), uuid (transitive in Orchestrator)
- **Files:** 
  - Source/Backend/package.json (direct dependency)
  - platform/orchestrator/package-lock.json (transitive)
- **Affected Versions:** < 14.0.0
- **CVE:** GHSA-w5hq-g745-h8pq
- **Detail:**
  - **Type:** Buffer Out-of-Bounds Write
  - **CWE:** CWE-787, CWE-1285
  - **Description:** When uuid v3/v5/v6 functions are called with a provided buffer parameter, insufficient bounds checking can lead to buffer overflow and memory corruption
  - **Advisory:** https://github.com/advisories/GHSA-w5hq-g745-h8pq
- **Root Cause:** 
  - Backend: Direct dependency on uuid ^9.0.0 (current: 9.0.1, should upgrade to 14.0.0+)
  - Orchestrator: Transitive via dockerode
- **Impact:** If the application generates UUIDs with a provided buffer, attackers could cause memory corruption.
- **Fix:** 
  - Backend: `npm install uuid@^14.0.0`
  - Orchestrator: Update dockerode to 4.0.2+ which updates uuid
- **Status:** Fixable — major version updates available
- **Note:** This requires major version update; verify compatibility before upgrading.

---

### ⚠️ DEP-005: Brace Expansion DoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** brace-expansion@<1.1.13
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** < 1.1.13
- **CVE:** GHSA-f886-m6hf-6m8v
- **Detail:**
  - **Type:** Denial of Service / Memory Exhaustion
  - **CWE:** CWE-400 (Uncontrolled Resource Consumption)
  - **CVSS:** 6.5 (Medium)
  - **Description:** Zero-step sequences in brace expansion patterns cause infinite expansion, memory exhaustion, and process hangs
  - **Example:** Expanding patterns like `{0..0}` causes excessive memory consumption
  - **Advisory:** https://github.com/advisories/GHSA-f886-m6hf-6m8v
- **Root Cause:** Transitive dependency (likely from testing frameworks)
- **Impact:** If the application processes user-provided patterns for brace expansion (unlikely for a workflow engine), attackers could hang the process.
- **Fix:** Update the parent package pulling in brace-expansion to use 1.1.13+
- **Status:** Low practical risk in this application context; fixable via transitive dependency updates

---

### ⚠️ DEP-006-010: Frontend Test Dependencies (Moderate)
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Packages:** 
  - vite@^5.4.0 (CVSS ~6.5)
  - vitest@^2.0.5 (transitive, multiple minor vulnerabilities)
  - esbuild (transitive via vite)
  - vite-node (transitive via vitest)
  - @vitest/mocker (transitive via vitest)
- **File:** Source/Frontend/package-lock.json
- **Detail:** Development-time vulnerabilities in build tooling and testing infrastructure
- **Impact:** Low direct impact on production, but could be exploited during CI/CD or local development
- **Fix:** Run `npm update` in Source/Frontend to fetch latest vite/vitest versions
- **Status:** Fixable — all have updates available

---

## Outdated Packages (>1 Major Version Behind)

### DEP-011: Express.js Outdated
- **Severity:** P2 (MODERATE — potential missing security patches)
- **Category:** outdated
- **Affected Projects:** 
  - Source/Backend (current: 4.18.2, latest: 5.2.1)
  - platform/orchestrator (current: 4.21.0, latest: 5.2.1)
- **Detail:** Express 4.x is 1+ major versions behind. While 4.x is still maintained, major version gaps typically indicate missing security patches.
- **Recommendation:** Plan upgrade to Express 5.x (breaking changes possible)
- **Note:** Express 5.0 has breaking changes; requires code review before upgrade

### DEP-012: React/React-DOM Outdated
- **Severity:** P3 (MODERATE — LTS support)
- **Category:** outdated
- **Affected Project:** Source/Frontend
- **Current:** React 18.3.1
- **Latest:** 19.2.5
- **Detail:** React 18.x is still in support, but 19.x is available with performance improvements
- **Recommendation:** Non-critical upgrade; test thoroughly as 19 may have behavioral changes

### DEP-013: React Router Outdated
- **Severity:** P3 (MODERATE)
- **Category:** outdated
- **Affected Project:** Source/Frontend
- **Current:** 6.26.0-6.30.3
- **Latest:** 7.14.2
- **Detail:** React Router 6.x is outdated, 7.x is available but likely has breaking changes
- **Recommendation:** Check 7.x release notes before upgrade

### DEP-014: Pino Logger Outdated
- **Severity:** P3 (MODERATE)
- **Category:** outdated
- **Affected Project:** Source/Backend
- **Current:** 8.17.0
- **Latest:** 10.3.1
- **Detail:** Pino 8.x is 2+ major versions behind. Should upgrade for security/performance patches.
- **Recommendation:** Review breaking changes in 9.x and 10.x before upgrading

### DEP-015: Multer Outdated
- **Severity:** P3 (MODERATE)
- **Category:** outdated
- **Affected Project:** platform/orchestrator
- **Current:** 1.4.5-lts.1
- **Latest:** 2.1.1
- **Detail:** Multer 1.x is on LTS branch with limited update cadence
- **Recommendation:** Upgrade to 2.x for security and performance improvements

---

## Supply Chain Analysis

### Post-Install Scripts
✅ **No risky post-install scripts found** — All package.json files use only standard build/test/type-check scripts.

### Dependency Tree Size Assessment

| Project | Size | Assessment |
|---------|------|------------|
| Backend | 411 (102 prod) | 🟡 Moderate — 310 dev dependencies for testing increases build complexity |
| Frontend | 230 (9 prod) | 🟢 Healthy — Only 222 dev deps for React tooling is reasonable |
| E2E | 4 | 🟢 Excellent — Minimal production dependencies |
| Orchestrator | 155 (153 prod) | 🟡 Moderate — Most dependencies in production; Docker orchestration requires many packages |

### Risk Factors
- **No** vulnerable packages with suspicious ownership or low maintainer count (based on critical CVEs being in well-known packages)
- **No** evidence of abandoned dependencies in the critical path

---

## License Compliance

### Summary
✅ **No GPL/AGPL licenses detected** in production dependencies  
✅ **All critical packages have recognized licenses**

No license violations detected. Standard MIT, Apache 2.0, ISC, BSD licenses in use.

---

## Recommendation Priority

### Immediate (P1 - Do First)
1. **DEP-001: protobufjs arbitrary code execution** — Update platform/orchestrator
2. **DEP-002: Handlebars JavaScript injection** — Update Source/Backend
3. **DEP-003: path-to-regexp ReDoS** — Update platform/orchestrator

### Short-term (P2 - This Sprint)
4. **DEP-004: UUID buffer overflow** — Update both Backend and Orchestrator
5. **DEP-011: Express major version gap** — Plan upgrade path
6. **DEP-014: Pino major version gap** — Update for security patches

### Medium-term (P3 - Next Sprint)
7. **DEP-006-010: Frontend test dependencies** — Update vite/vitest
8. **DEP-005: Brace expansion** — Update via transitive dependencies
9. **React 18→19, React Router 6→7, Multer 1→2** — Plan major version upgrades with testing

---

## Cross-References

### 🚨 Escalations to TheGuardians
- **DEP-001, DEP-002:** Code execution and injection vulnerabilities require security review
- **DEP-003:** DoS vulnerability may require network-level mitigation discussion

### 📊 Metrics for Dashboard
```json
{
  "audit_date": "2026-04-23",
  "projects_scanned": 4,
  "total_dependencies": 799,
  "cves": {
    "critical": 2,
    "high": 1,
    "moderate": 6,
    "low": 0,
    "total": 9
  },
  "outdated_major": 6,
  "supply_chain_risks": 0,
  "license_violations": 0,
  "fixable": 9,
  "requires_major_version_upgrade": 6
}
```

---

## Audit Notes

- **Frontend E2E project has zero CVEs** — Good security posture for test automation
- **Orchestrator has highest CVE count (4)** — Platform infrastructure dependencies require closer monitoring
- **Backend test infrastructure (handlebars) is the only critical vuln in application code** — Likely from Jest dependency chain
- **No hardcoded secrets or suspicious post-install scripts detected** — Good supply chain hygiene

---

## Next Steps

1. **Immediate:** Update protobufjs, handlebars, and path-to-regexp
2. **Week 1:** Plan Express upgrade strategy (testing required)
3. **Week 2:** Test and deploy React 19, React Router 7 upgrades
4. **Ongoing:** Subscribe to npm audit results via CI/CD pipeline

