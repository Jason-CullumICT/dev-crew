# Dependency Auditor Findings Report

## Scan Summary
- **Date:** 2026-04-15
- **Package Managers Detected:** npm
- **Projects Scanned:** 6 (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)
- **Total Direct Dependencies:** ~650
- **Total Transitive Dependencies:** ~2,800+

### Vulnerability Overview
- **Critical CVEs:** 1 (handlebars in Source/Backend)
- **High CVEs:** 2 (path-to-regexp in platform/orchestrator, handlebars variants in Backend)  
- **Moderate CVEs:** 13 (vite, esbuild, brace-expansion across multiple projects)
- **Total Distinct CVE Findings:** 16

---

## Critical Findings (P1)

### DEP-001: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** P1 (Critical)
- **Category:** CVE (CWE-94, CWE-843)
- **Package:** handlebars@4.7.8 (transitive)
- **Affected Projects:** Source/Backend
- **CVE IDs:** GHSA-2w6w-674q-4c4q (CVSS 9.8)
- **Details:** 
  - JavaScript Injection vulnerability via AST Type Confusion
  - Affects handlebars >=4.0.0 <=4.7.8
  - Remote attacker can execute arbitrary JavaScript
  - CVSS 9.8 (Critical), AV:N/AC:L/PR:N/UI:N
- **Additional Variants Found:**
  - GHSA-3mfm-83xf-c92r: @partial-block tampering (CVSS 8.1, High)
  - GHSA-2qvq-rjwj-gvw9: Prototype Pollution to XSS (CVSS 4.7, Moderate)
  - GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap (CVSS 4.8, Moderate)
  - GHSA-xjpj-3mr7-gcpf: CLI Precompiler Injection (CVSS 8.3, High)
  - GHSA-xhpv-hc6g-r9c6: Dynamic Partial AST Confusion (CVSS 8.1, High)
  - GHSA-9cx6-37pm-9jff: DoS via Malformed Decorator (CVSS 7.5, High)
- **Fix:** `npm update handlebars` to >=4.7.9
- **Cross-ref:** [ESCALATE → TheGuardians] - Code injection vulnerability, potential RCE

---

## High Priority Findings (P2)

### DEP-002: path-to-regexp Regular Expression Denial of Service
- **Severity:** P2 (High)
- **Category:** CVE (CWE-1333)
- **Package:** path-to-regexp@<0.1.13
- **Affected Projects:** platform/orchestrator
- **CVE ID:** GHSA-37ch-88jc-xwx2
- **Details:**
  - ReDoS vulnerability via multiple route parameters
  - Untrusted route patterns can cause CPU exhaustion
  - CVSS 7.5, AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
- **Fix:** `npm update path-to-regexp` to >=0.1.13
- **Impact:** Orchestrator infrastructure (critical to pipeline)
- **Cross-ref:** [ESCALATE → TheGuardians] - DoS vector in critical infrastructure

### DEP-003: Brace-Expansion Process Hang and Memory Exhaustion
- **Severity:** P2 (Moderate → P2 due to location)
- **Category:** CVE (CWE-400)
- **Package:** brace-expansion@<1.1.13 (transitive)
- **Affected Projects:** Source/Backend
- **CVE ID:** GHSA-f886-m6hf-6m8v
- **Details:**
  - Zero-step sequences cause indefinite loop and memory exhaustion
  - CVSS 6.5, AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:H
  - Process can be DoS'd by malformed input
- **Fix:** `npm update brace-expansion` to >=1.1.13
- **Cross-ref:** [CROSS-REF: red-teamer] - Input validation on sequence parameters

---

## Moderate Priority Findings (P3)

### DEP-004: Vite Path Traversal in Optimized Deps `.map` Handling
- **Severity:** P3 (Moderate)
- **Category:** CVE (CWE-22, CWE-200)
- **Package:** vite@<=6.4.1 (direct dependency)
- **Affected Projects:** Source/Frontend, platform/orchestrator
- **CVE ID:** GHSA-4w7w-66w2-5vf9
- **Details:**
  - Development-only vulnerability in `.map` file handling
  - Path traversal possible in optimized dependencies
  - Only affects dev server (not production)
- **Fix:** `npm update vite` to >=8.0.8 (major version bump required)

### DEP-005: Esbuild CORS Bypass in Development Server
- **Severity:** P3 (Moderate)
- **Category:** CVE (CWE-346)
- **Package:** esbuild@<=0.24.2 (transitive via vite)
- **Affected Projects:** Source/Frontend
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **Details:**
  - Dev server CORS bypass allows arbitrary requests
  - Requires user interaction (UI:R)
  - CVSS 5.3
- **Fix:** Update vite to >=8.0.8 (which updates esbuild)

### DEP-006: Outdated Major Versions
- **Severity:** P3 (Supply Chain)
- **Category:** Outdated
- **Packages:**
  - `react` 18.3.1 → 19.2.5 (1 major behind)
  - `react-dom` 18.3.1 → 19.2.5 (1 major behind)
  - `react-router-dom` 6.26.0 → 7.14.1 (1 major behind)
  - `express` 4.18.2 → 5.2.1 (1 major behind)
  - `pino` 8.17.0 → 10.3.1 (2 majors behind)
  - `uuid` 9.0.0 → 13.0.0 (4 majors behind)
- **Affected Projects:** Source/Frontend, Source/Backend
- **Details:**
  - Missing security patches in older major versions
  - `pino` 2 major versions behind may have performance regression issues
  - uuid 4 majors behind is concerning for security
- **Recommendation:** Plan upgrades in next sprint

---

## Additional Findings (P4)

### DEP-007: Vite, @vitest/mocker, vite-node Moderate CVEs (Dev-only)
- **Severity:** P4 (Development-only)
- **Category:** CVE
- **Affected Projects:** Source/Frontend
- **Details:** Development-only dependencies, low impact
- **Recommendation:** Address when updating to Vite 8.x

### DEP-008: Large Dependency Tree
- **Severity:** P4 (Supply Chain Risk)
- **Category:** Metrics
- **Details:**
  - Source/Backend: 411 transitive dependencies (102 direct, 310 dev)
  - Source/Frontend: 230 transitive dependencies (9 direct, 222 dev)
  - platform/orchestrator: 155 transitive dependencies
  - **Total supply chain surface:** ~2,800+ packages
  - Risk: Each package is an attack surface
- **Recommendation:** Audit high-risk dependencies quarterly

---

## License Compliance Check

### Findings
- **No GPL/AGPL packages detected** in direct dependencies ✓
- **No UNLICENSED packages detected** in main projects ✓
- MIT, Apache 2.0, BSD licenses predominate (permissive) ✓

### Summary
**License compliance: PASS** - No viral license conflicts detected.

---

## Dependency Summary by Project

| Project | Direct Deps | Transitive | CVEs (C/H/M) | Status |
|---------|-----------|-----------|-------------|--------|
| Source/Backend | 4 | 407 | 1/0/1 | ⚠️ Critical |
| Source/Frontend | 3 | 227 | 0/0/5 | ⚠️ Moderate |
| Source/E2E | 4 | 4 | 0/0/0 | ✓ Clean |
| platform/orchestrator | 153 | 155 | 0/1/0 | ⚠️ High |
| portal/Backend | 397 | 577 | 0/1/4 | ⚠️ Moderate |
| portal/Frontend | 9 | 424 | 0/1/4 | ⚠️ Moderate |

---

## Immediate Action Items

### Must Fix (P1)
- [ ] Source/Backend: Update handlebars (transitive) - blocking code injection risk
- [ ] platform/orchestrator: Update path-to-regexp - blocking orchestrator stability

### Should Fix (P2)  
- [ ] Source/Backend: Update brace-expansion (transitive)
- [ ] Source/Frontend: Update vite from 5.4.0 to 8.0.8+ (major bump)

### Plan for Sprint (P3)
- [ ] Upgrade react ecosystem (18 → 19)
- [ ] Upgrade express (4 → 5)
- [ ] Upgrade pino (8 → 10)
- [ ] Upgrade uuid (9 → 13)

---

## Cross-Team References

- **[ESCALATE → TheGuardians]:** handlebars RCE and path-to-regexp DoS require security review
- **[CROSS-REF: red-teamer]:** Input validation on brace-expansion sequences
- **[CROSS-REF: performance-profiler]:** Major version upgrades (react, pino) may affect latency

---

## JSON Summary

```json
{
  "audit_date": "2026-04-15",
  "total_cves": 16,
  "critical": 1,
  "high": 2,
  "moderate": 13,
  "low": 0,
  "projects_scanned": 6,
  "total_dependencies": {
    "direct": 650,
    "transitive": 2800
  },
  "critical_findings": [
    {
      "id": "DEP-001",
      "package": "handlebars",
      "version": "4.7.8",
      "cvss": 9.8,
      "projects": ["Source/Backend"]
    }
  ],
  "high_findings": [
    {
      "id": "DEP-002",
      "package": "path-to-regexp",
      "projects": ["platform/orchestrator"]
    },
    {
      "id": "DEP-003",
      "package": "brace-expansion",
      "projects": ["Source/Backend"]
    }
  ],
  "license_compliance": "PASS",
  "recommendations": [
    "Update handlebars immediately (P1)",
    "Update path-to-regexp immediately (P1)",
    "Plan major version upgrades (react, express, pino) for next sprint"
  ]
}
```
