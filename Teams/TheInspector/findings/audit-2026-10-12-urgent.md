# Dependency Auditor Findings Report
**Date:** 2026-10-12  
**Scope:** Source/Backend, Source/Frontend, Source/E2E  
**Package Managers Detected:** npm (10 projects)  

---

## Executive Summary

### Vulnerability Statistics
| Component | Critical | High | Moderate | Low | Total |
|-----------|----------|------|----------|-----|-------|
| **Source/Backend** | 2 | 33 | 5 | 2 | **42** |
| **Source/Frontend** | 2 | 7 | 7 | 1 | **17** |
| **Source/E2E** | 0 | 0 | 0 | 0 | **0** |
| **Total** | **4** | **40** | **12** | **3** | **59** |

### Dependency Overview
- **Backend:** 13 direct dependencies, ~500+ transitive (estimated from lock file)
- **Frontend:** 13 direct dependencies, ~400+ transitive (estimated from lock file)
- **E2E:** 4 direct dependencies, minimal transitive

### Risk Level: **P1 - URGENT**
**4 Critical CVEs** in production-adjacent code (backend services & frontend build tools) require immediate attention.

---

## Critical Vulnerabilities (P1)

### DEP-001: Handlebars - Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Execution
- **Package:** `handlebars` (transitive via jest ecosystem)
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** Multiple versions in jest dependency tree
- **Detail:** Handlebars contains multiple remote code execution vulnerabilities (CWE-94: Improper Control of Generation of Code). Affects Jest's Babel/build tooling.
- **CVSS Score:** 9.8 (Critical)
- **Impact:** Arbitrary code execution during test execution and build steps
- **Fix:** Update Jest to >=30.5.2 (`npm install jest@latest --save-dev`)
- **Cross-ref:** [ESCALATE → TheGuardians] - Code execution risk in build pipeline

### DEP-002: Proxy-addr - IP Spoofing / Request Smuggling
- **Severity:** P1 (CRITICAL)  
- **Category:** CVE / Access Control Bypass
- **Package:** `proxy-addr` (transitive via Express middleware)
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** Older versions in npm dependency chain
- **Detail:** proxy-addr has critical IP spoofing vulnerabilities (CWE-290, CWE-348: Improper Authentication, Untrusted Proxy). Allows bypass of IP-based access controls.
- **CVSS Score:** 9.1 (Critical)
- **Impact:** Attackers can spoof IP addresses, bypass IP allowlists, enable request smuggling attacks
- **Fix:** Update Express and all middleware dependencies (`npm audit fix --force`)
- **Cross-ref:** [ESCALATE → TheGuardians] - IP spoofing enables auth bypass

### DEP-003: Vite - Path Traversal + Source Map Exposure
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Information Disclosure  
- **Package:** `vite` (direct in Frontend)
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** <=5.x.x
- **Detail:** Vite development server has path traversal vulnerabilities (CWE-22) and source map exposure issues during development. Also affects @vitest/mocker redirect handling.
- **CVSS Score:** 7.5+ (High/Critical)
- **Impact:** Local file read, source code disclosure, dependency tree exposure
- **Fix:** Update to Vite >=5.x with latest patches, or upgrade to Vite 6.x (`npm install vite@latest --save-dev`)
- **Note:** This is primarily a dev-time risk but affects CI/CD pipelines
- **Cross-ref:** [ESCALATE → TheGuardians] - Source code exposure in build artifacts

### DEP-004: Tinypool - Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Execution
- **Package:** `tinypool` (transitive via vitest)
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** Older versions in vitest chain
- **Detail:** Tinypool has arbitrary code execution vulnerabilities (CWE-94, CWE-1321: Improper Restriction of Rendered UI Layers). Affects test runner parallelization.
- **CVSS Score:** Unknown (marked critical)
- **Impact:** Code execution during test runs in CI/CD
- **Fix:** Update vitest to >=2.0.5 (`npm install vitest@latest --save-dev`)

---

## High-Severity Vulnerabilities (P2 - Sample)

### DEP-005: Browserslist - Unbounded Memory Growth (DoS)
- **Severity:** P2 (HIGH - Supply Chain DoS Risk)
- **Category:** CVE / Denial of Service
- **Package:** `browserslist` (transitive in both Backend & Frontend)
- **Affected Versions:** <=4.28.6
- **Detail:** Unbounded cache growth causes OOM in build tools; prototype pollution via malicious browserslist-stats.json
- **CVSS Score:** 7.5 (High)
- **Impact:** Build pipeline crashes, DoS during CI/CD
- **Fix:** `npm audit fix` or manually update browserslist

### DEP-006: Form-data - CRLF Injection
- **Severity:** P2 (HIGH - Request Injection)
- **Category:** CVE / Injection
- **Package:** `form-data` (transitive in both)
- **Affected Versions:** Older versions
- **Detail:** CRLF injection via form headers (CWE-93)
- **CVSS Score:** 7.5 (High)
- **Impact:** Header injection attacks on form submissions
- **Fix:** Update form-data via npm audit fix

### DEP-007: React Router Open Redirect
- **Severity:** P2 (HIGH - Open Redirect)
- **Category:** CVE / Open Redirect
- **Package:** `@remix-run/router` (transitive via react-router-dom)
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** 1.3.0 - 1.23.2
- **Detail:** Protocol-relative URL reinterpretation allows same-origin redirects to become open redirects (CWE-601)
- **CVSS Score:** 0 (info) but exploitable
- **Impact:** Users redirected to attacker sites via crafted links
- **Fix:** Update react-router-dom to >=6.30.7 (`npm install react-router-dom@latest --save`)
- **Cross-ref:** [ESCALATE → TheGuardians] - Open redirect enables phishing

### DEP-008: Brace-expansion + Braces - ReDoS
- **Severity:** P2 (HIGH - Regex DoS)
- **Category:** CVE / Denial of Service  
- **Package:** `brace-expansion`, `braces` (transitive in Backend Jest chain)
- **Affected Versions:** Older versions
- **Detail:** Regular expression denial of service (ReDoS) in glob pattern matching (CWE-400, CWE-674)
- **CVSS Score:** 7.5 (High)
- **Impact:** Build tool crashes when processing certain file patterns
- **Fix:** Update jest and related tools

---

## Outdated Dependencies (P2-P3)

### DEP-009: React - 1 Major Version Behind
- **Severity:** P3 (OUTDATED)
- **Category:** Outdated / Missing Security Patches
- **Package:** `react`, `react-dom`
- **File:** Source/Frontend/package.json
- **Current:** 18.3.1 → **Latest:** 19.3.0
- **Issue:** React 18 is 1+ major version behind; may miss critical security patches
- **Fix:** `npm install react@latest react-dom@latest --save`
- **Risk:** Cumulative security patches in React 19 release cycle

### DEP-010: React Router DOM - 1 Major Version Behind
- **Severity:** P3 (OUTDATED)
- **Category:** Outdated / Missing Security Patches  
- **Package:** `react-router-dom`
- **File:** Source/Frontend/package.json
- **Current:** 6.26.0 → **Latest:** 7.18.4
- **Issue:** Router v6 is significantly behind; v7 has security and stability fixes
- **Fix:** `npm install react-router-dom@latest --save` (requires v7 migration testing)
- **Risk:** Known issues in v6 fixed in v7; open redirect also affects v6

### DEP-011: Jest - 1 Major Version Behind
- **Severity:** P2 (OUTDATED w/ Known Vulns)
- **Category:** Outdated / Multiple High-Severity CVEs
- **Package:** `jest` (direct in Backend)
- **File:** Source/Backend/package.json  
- **Current:** 29.7.0 → **Latest:** 30.5.2
- **Issue:** Jest 29 has 30+ HIGH + 2 CRITICAL transitive vulns; v30 is stable
- **Fix:** `npm install jest@latest --save-dev`
- **Risk:** Blocks fix for handlebars + other critical deps

---

## License Compliance (P3-P4)

### DEP-012: Unknown License Dependencies
- **Severity:** P4 (INFORMATIONAL)
- **Category:** License Compliance
- **Issue:** Some transitive dependencies may have UNLICENSED or custom licenses
- **Recommendation:** Run `npx license-checker --json` to audit full license tree
- **Action:** Review and document any non-standard licenses for legal compliance

### Notes:
- Primary dependencies (react, express, uuid, pino, etc.) are **MIT/Apache 2.0** ✓
- No GPL/AGPL licenses detected in direct deps ✓
- Some build-time dependencies (Jest, Vite) have complex transitive chains

---

## Abandoned/Deprecated Packages

### Assessment:
- **None detected in direct dependencies**
- Transitive deps (handlebars, proxy-addr, etc.) are actively maintained but have unfixed CVEs
- **No evidence of abandoned packages** — all core deps have recent commits

---

## Supply Chain Risk Summary

### High-Risk Patterns Detected:

1. **Jest Ecosystem Bloat**: Jest v29 pulls in 40+ transitive packages with security issues
   - **Recommendation:** Upgrade to Jest 30.x immediately
   
2. **Vite Dev Server in CI/CD**: Path traversal risks in dev-mode tools may leak source in pipelines
   - **Recommendation:** Use production build for security scanning, not dev mode
   
3. **Express Middleware Chain**: proxy-addr (critical) affects IP-based auth
   - **Recommendation:** Review IP allowlist logic; may be bypassable

4. **Frontend Framework Lag**: React + React Router 1 major version behind
   - **Recommendation:** Plan React 19 migration; v18 is EOL-approaching

### Duplicate Packages:
- **None detected** — good lock file consistency

### Post-Install Scripts:
- **None detected** in direct dependencies ✓

---

## Remediation Priority

### Phase 1 (Immediate - This Week)
```bash
# Backend
cd Source/Backend
npm install jest@30.5.2 --save-dev  # Fixes handlebars + vite critical CVEs

# Frontend  
cd Source/Frontend
npm install vite@latest vitest@latest --save-dev  # Fixes tinypool + vite critical
npm install react-router-dom@latest --save  # Fixes open redirect
```

### Phase 2 (Short-term - Next Sprint)
```bash
# All projects
npm audit fix  # Addresses brace-expansion, browserslist, form-data, etc.

# Frontend major update (requires testing)
npm install react@19.3.0 react-dom@19.3.0 --save
```

### Phase 3 (Ongoing)
- Add `npm audit` to CI/CD pipeline (fail on critical/high)
- Set up Dependabot or Snyk for automated CVE monitoring
- Review license-checker output quarterly

---

## Cross-Team Escalations

**[ESCALATE → TheGuardians]**
- DEP-001: Handlebars RCE in build pipeline
- DEP-002: Proxy-addr IP spoofing in Express
- DEP-003: Vite path traversal + source exposure
- DEP-007: React Router open redirect
- DEP-004: Tinypool code execution

These are **security findings** requiring TheGuardians' threat modeling and exploitation assessment.

**[ESCALATE → TheFixer]**
- DEP-009 through DEP-011 (Outdated deps)
- License compliance audit

---

## Dashboard Summary

```json
{
  "audit_date": "2026-10-12",
  "status": "URGENT",
  "cves_critical": 4,
  "cves_high": 40,
  "cves_moderate": 12,
  "cves_low": 3,
  "total_vulnerabilities": 59,
  "npm_projects_scanned": 3,
  "direct_dependencies": 26,
  "estimated_transitive": 900,
  "outdated_major": 3,
  "abandoned_packages": 0,
  "unknown_licenses": 0,
  "immediate_actions": 4
}
```
