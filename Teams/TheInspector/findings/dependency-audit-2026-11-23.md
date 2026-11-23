# Dependency Audit Report
**Date:** 2026-11-23  
**Agent:** Dependency Auditor (TheInspector)  
**Status:** ⚠️ CRITICAL FINDINGS DETECTED

---

## Executive Summary

**Grade: D** (Exploitable critical vulnerabilities in production dependencies)

| Metric | Value | Status |
|--------|-------|--------|
| **Known CVEs** | 28 total | 🔴 4 CRITICAL |
| **Backend CVEs** | 11 | 2 Critical, 5 High, 3 Moderate, 1 Low |
| **Frontend CVEs** | 17 | 2 Critical, 7 High, 7 Moderate, 1 Low |
| **Backend Outdated** | 4 majors | Express (3→5), Pino (8→10), UUID (9→14) |
| **Frontend Outdated** | 3 majors | React (18→19), React Router (6→7) |
| **Supply Chain Size** | 641 packages | Medium risk (411 Backend, 230 Frontend) |
| **Post-install Scripts** | 0 detected | ✅ Low risk |
| **License Issues** | 0 (automated check unavailable) | ⚠️ Manual review needed |

---

## 🔴 CRITICAL VULNERABILITIES (P1 - Immediate Action Required)

### DEP-001: handlebars - Multiple JavaScript Injection Flaws
- **Severity:** P1 (Critical)
- **Category:** CVE - Remote Code Execution via AST Type Confusion
- **Package:** handlebars
- **File:** Source/Backend/package-lock.json
- **Affected Range:** >=3.0.0 <=4.7.9
- **Fix Available:** Yes (upgrade to >=4.7.10)

**Details:**
- **GHSA-2w6w-674q-4c4q**: JavaScript Injection via AST Type Confusion (CVSS 9.8)
  - Allows arbitrary code execution through template manipulation
  - Attack vector: Network, no authentication required
  - **Fix:** Upgrade handlebars to >=4.7.10

- **GHSA-8r5x-fm3f-whwj**: JavaScript Injection via AST Type Confusion (bypass of CVE-2026-33937) (CVSS 9.8)
  - Even newer bypass of previous fix
  - Requires upgrade to >=4.8.0 (if available) or evaluate alternatives

- **8+ additional vulnerabilities** including template injection, prototype pollution (CVSS 4.7-8.2)

**Risk Assessment:**
- Used as transitive dependency via build tools
- Affects rendering of untrusted templates
- Exploitable by attackers who can influence template content

**Fix:**
```bash
cd Source/Backend
npm update handlebars --save
```

**Cross-ref:** [ESCALATE → TheGuardians] - If handlebars processes untrusted input, this is an immediate RCE risk

---

### DEP-002: proxy-addr - IPv4-mapped IPv6 IP Spoofing
- **Severity:** P1 (Critical)
- **Category:** CVE - Trust Boundary Bypass
- **Package:** proxy-addr
- **File:** Source/Backend/package-lock.json
- **Affected Range:** >=1.1.0 <2.0.8
- **Fix Available:** Yes (upgrade to >=2.0.8)

**Details:**
- **GHSA-jqcg-44mw-7w3h**: IP spoofing via IPv4-mapped IPv6 (CVSS: Critical)
  - Express middleware for parsing proxy headers
  - Allows spoofing client IP via crafted IPv6 addresses
  - Affects any IP-based access control, rate limiting, or logging
  
**Impact:**
- Bypass of IP-based security restrictions
- Incorrect logging/attribution of requests
- Circumvention of geographic or network-based policies

**Fix:**
```bash
cd Source/Backend
npm update proxy-addr --save
```

**Root Cause:** `proxy-addr` is a transitive dependency from `express`. Upgrade path:
1. Check if Express 4.22+ is compatible
2. If yes: `npm update express proxy-addr`
3. If no: Pin proxy-addr explicitly to ^2.0.8

---

### DEP-003: vitest - Multiple Code Injection Flaws (Frontend)
- **Severity:** P1 (Critical)
- **Category:** CVE - Test Harness Escape via Code Injection
- **Package:** vitest
- **File:** Source/Frontend/package-lock.json
- **Affected Range:** <=4.1.11 (Vitest 2.x has critical issues)
- **Fix Available:** Partial (upgrade to latest, check breaking changes)

**Details:**
- **@vitest/mocker code injection** (GHSA-qxg6-89mg-rqv8): Manual mock registration allows code injection
  - Affects test environment isolation
  - Can execute arbitrary code during test runs
  
**Risk:** 
- Developer workstations and CI/CD pipelines vulnerable
- Malicious packages or PR modifications can escape test sandbox
- Affects code review process (tests can be manipulated)

**Fix:**
```bash
cd Source/Frontend
npm update vitest @vitest/mocker --save-dev
# Check for breaking changes in migration guide
```

---

### DEP-004: tinypool - Denial of Service via Worker Exhaustion (Frontend)
- **Severity:** P1 (Critical)
- **Category:** CVE - Resource Exhaustion
- **Package:** tinypool
- **File:** Source/Frontend/package-lock.json
- **Affected Range:** Undetermined (version not shown)
- **Fix Available:** Yes (update Vitest which pins tinypool)

**Details:**
- Used by Vitest for parallel test execution
- Worker pool exhaustion causes test hangs or crashes
- Could cause CI/CD failures and prevent deployment

**Fix:** Addressed by Vitest upgrade (DEP-003)

---

## 🔴 HIGH SEVERITY VULNERABILITIES (P2 - Urgent)

### Backend High-Risk Packages

| Package | Issue | CVSS | Recommended Action |
|---------|-------|------|-------------------|
| **body-parser** | Denial of Service via invalid limit value + compressed body trailing bytes (GHSA-27r3-jxmh-p828) | 7.5 | Update to >=1.20.9 |
| **brace-expansion** | 7 DoS issues via unbounded expansion (GHSA-mh99-v99m-4gvg) | 7.5 | Update to >=1.1.21 |
| **browserslist** | Unbounded memory growth + prototype write (GHSA-73wf-gq98-2v4g) | 7.5 | Update to >=4.28.7 |
| **form-data** | CRLF injection in multipart fields (GHSA-hmw2-7cc7-3qxx) | 7.5 | Update to >=4.0.6 |
| **js-yaml** | Arbitrary code execution via YAML parsing | High | Update to >=3.15.2 |

### Frontend High-Risk Packages

| Package | Issue | CVSS | Recommended Action |
|---------|-------|------|-------------------|
| **browserslist** | Same as backend: OOM + prototype write | 7.5 | Update to >=4.28.7 |
| **form-data** | Same as backend: CRLF injection | 7.5 | Update to >=4.0.6 |
| **nanoid** | Integer overflow, infinite loops (GHSA-xwg4-73v4-xw9w) | 7.4 | Update to >=3.3.18 |
| **postcss** | Arbitrary file read via sourceMappingURL (GHSA-6g55-p6wh-862q) | 7.5 | Update to >=8.5.23 |
| **source-map-js** | DoS via source map parsing | High | Update to latest |
| **vite** | esbuild dependency vulnerability (GHSA-67mh-4wv8-2f99) | 5.3 | Update Vite (may require Node 18+) |
| **ws** | ReDoS via compression header parsing | High | Update to latest |

---

## 🟡 MODERATE SEVERITY VULNERABILITIES (P3 - Plan Updates)

### Common Issues (Both Backend & Frontend)
- **@babel/core**: Arbitrary file read via sourceMappingURL (CVSS 3.2)
- **baseline-browser-mapping**: DoS on invalid input (CVSS 0 - low actual risk)

### React Router Ecosystem Issues (Frontend)
- **@remix-run/router**: Open redirect via protocol-relative URLs
- **react-router**: Multiple open redirect bypasses (CVE-2025-68470)
- **react-router-dom**: Open redirect to XSS (GHSA-jjmj-jmhj-qwj2)

**Root Cause:** React Router 6.x has known open redirect issues. Requires upgrade to 7.x, but check for breaking changes.

### Backend-Specific
- **qs**: Prototype pollution (transitive via express/body-parser)
- **uuid**: Insufficient entropy (GHSA-v86g-96j9-m7ch)

---

## 📊 DEPENDENCY ANALYSIS

### Direct Dependencies

**Backend (13 direct):**
```
✓ express@^4.18.2
✓ prom-client@^15.1.0
✓ uuid@^9.0.0
✓ pino@^8.17.0
+ 9 @types/* (TypeScript)
```

**Frontend (13 direct):**
```
✓ react@^18.3.1
✓ react-dom@^18.3.1
✓ react-router-dom@^6.26.0
+ 10 dev dependencies (testing, build)
```

### Transitive Dependencies
- **Backend:** 411 total (high supply chain complexity)
- **Frontend:** 230 total (medium supply chain complexity)
- **Combined:** 641 unique packages
- **Duplicates:** Likely (react-router-dom pulls in @remix-run/router)

**Supply Chain Risk:** 
- P4 (Medium): Total >500 transitive deps in Backend alone
- Recommend: Regularly audit top 50 most-downloaded transitive dependencies

---

## 📈 OUTDATED MAJOR VERSIONS (P3)

### Backend
| Package | Current | Latest | Major Gap | Recommendation |
|---------|---------|--------|-----------|-----------------|
| **express** | 4.18.2 | 5.3.0 | 1 major | Update to 4.22+ for security, skip to 5 when ready for breaking changes |
| **pino** | 8.17.0 | 10.4.0 | 2 majors | 🔴 Update urgently (8→9→10 may have critical fixes) |
| **uuid** | 9.0.0 | 14.0.3 | 5 majors | Low priority (pure function, no CVEs if current version safe) |
| **prom-client** | 15.1.3 | 15.1.3 | Current | ✅ Up to date |

### Frontend
| Package | Current | Latest | Major Gap | Recommendation |
|---------|---------|--------|-----------|-----------------|
| **react** | 18.3.1 | 19.3.1 | 1 major | Plan for React 19 migration (Q2 2027) |
| **react-dom** | 18.3.1 | 19.3.1 | 1 major | Synchronize with react |
| **react-router-dom** | 6.26.0 | 7.18.6 | 1 major | 🔴 Urgent (6.x has known vulnerabilities) |
| **typescript** | 5.5.4 | 5.6+ | Current | Upgrade to get bug fixes |

---

## 🛡️ LICENSE COMPLIANCE

**Status:** ⚠️ License checker not available in this environment

**Manual Review Needed For:**
- **GPL/AGPL in dependencies**: Would require entire project to be GPL-licensed
- **Custom/unknown licenses**: Undefined legal liability
- **Commercial licenses**: Unlicensed commercial use risk

**Recommended Action:**
```bash
# Install license-checker globally
npm install -g license-checker
# Run in each directory
cd Source/Backend && license-checker --json > licenses.json
cd Source/Frontend && license-checker --json > licenses.json
```

---

## 🔧 REMEDIATION STEPS

### Phase 1: Critical Fixes (This Sprint)
```bash
cd Source/Backend
npm update handlebars proxy-addr

cd Source/Frontend
npm update vitest tinypool
```

### Phase 2: High-Risk Packages (Next Sprint)
```bash
cd Source/Backend
npm update body-parser brace-expansion browserslist form-data js-yaml

cd Source/Frontend
npm update nanoid postcss source-map-js ws vite
```

### Phase 3: React Router Ecosystem (Plan for Breakage)
```bash
cd Source/Frontend
# Plan major version bump
npm install react-router-dom@^7.0.0 --save
# Test all routing scenarios
npm run test -- --grep "routing"
```

### Phase 4: Long-term Modernization (Backlog)
- Upgrade Express 4 → 5 (requires application code review)
- Upgrade Pino 8 → 10 (review breaking changes)
- Plan React 18 → 19 migration

---

## 📋 FINDINGS SUMMARY (JSON)

```json
{
  "audit_date": "2026-11-23",
  "package_managers": ["npm"],
  "summary": {
    "total_cves": 28,
    "critical": 4,
    "high": 12,
    "moderate": 11,
    "low": 1,
    "total_dependencies": 641,
    "backend_packages": 412,
    "frontend_packages": 231
  },
  "severity_distribution": {
    "backend": {
      "critical": 2,
      "high": 5,
      "moderate": 3,
      "low": 1
    },
    "frontend": {
      "critical": 2,
      "high": 7,
      "moderate": 7,
      "low": 1
    }
  },
  "top_risks": [
    "handlebars:4.7.9 - RCE via template injection (CVSS 9.8)",
    "proxy-addr:2.0.7 - IP spoofing trust bypass (Critical)",
    "vitest:4.1.11 - Code injection in test harness",
    "tinypool - Worker DoS in Vitest"
  ],
  "supply_chain_risk": "medium",
  "post_install_scripts": false,
  "license_check_status": "manual_review_needed"
}
```

---

## 🎯 Recommended Grade Rubric

| Grade | Criteria | Status |
|-------|----------|--------|
| **A** | 0 P1, ≤3 P2 | ❌ FAIL (4 P1 detected) |
| **B** | 0 P1, ≤8 P2 | ❌ FAIL (4 P1, 12 P2 detected) |
| **C** | ≤2 P1, ≤15 P2 | ❌ FAIL (4 P1 detected) |
| **D** | >2 P1 OR critical exploits | ✅ **CURRENT** (4 P1 with RCE/spoofing) |
| **F** | Auth bypass + domain failure | ❌ Not yet |

**Current Grade: D** (Failing, urgent action required)

---

## Cross-Team Escalation

[ESCALATE → TheGuardians]
- **DEP-001 (handlebars RCE)**: If backend processes untrusted templates → immediate exploitation risk
- **DEP-002 (proxy-addr spoofing)**: IP-based access control bypassed → affects all IP-based security
- **DEP-003 (Vitest injection)**: Test environment escape → affects code review integrity

---

## Next Audit

Recommend re-audit in **30 days** after applying Phase 1 & 2 fixes, or immediately after:
- New npm audit alerts on GitHub
- Security advisory from npm security team
- Production incident related to dependency

---

**Report Generated By:** Dependency Auditor (Claude Haiku 4.5)  
**Expected Action:** Immediate remediation of P1 issues  
**Assigned To:** Backend & Frontend team leads
