# Dependency Auditor Report
**Date:** 2026-08-20  
**Scope:** All npm projects across dev-crew repository  
**Risk Level:** 🔴 **CRITICAL** (6 P1 findings)

---

## Executive Summary

**Vulnerability Status:** 99 total CVEs across 6 npm projects, including **6 critical severity** findings.

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical (P1) | 6 | **REQUIRES IMMEDIATE ATTENTION** |
| 🟠 High (P2) | 26 | Requires urgent patching |
| 🟡 Moderate (P3) | 64 | Should be addressed in next sprint |
| 🟢 Low (P4) | 3 | Monitor and patch in next update cycle |

**Critical Focus Areas:**
1. **Handlebars.js** - JavaScript injection via AST type confusion (CVSS 9.8)
2. **Vitest** - Arbitrary file read/execution via UI server (CVSS 9.8)

---

## Detailed Findings

### 🔴 P1: CRITICAL - Handlebars.js JavaScript Injection
**CVE:** GHSA-2w6w-674q-4c4q  
**CVSS Score:** 9.8 (Critical)  
**CWE:** CWE-94 (Code Injection), CWE-843 (Access of Resource Using Incompatible Type)

**Affected Projects:**
- Source/Backend (transitive dependency)
- Source/Frontend (transitive dependency)

**Technical Details:**
- Vulnerability: JavaScript Injection via AST Type Confusion
- Affected Versions: >= 4.0.0 <= 4.7.8
- Current Version: 4.7.8 (VULNERABLE)
- Attack Vector: Network (AV:N), Low Complexity (AC:L), No Privileges Required (PR:N), No User Interaction (UI:N)
- Impact: Complete confidentiality, integrity, and availability compromise

**Exploit Scenario:**
An attacker can craft malicious Handlebars templates that exploit AST type confusion to execute arbitrary JavaScript code. This could allow:
- Remote code execution if templates are user-supplied
- Information disclosure if template processing is exposed
- Denial of service via expensive operations

**Fix:**
```bash
# Source/Backend
cd Source/Backend && npm update handlebars --depth=999

# Source/Frontend  
cd Source/Frontend && npm update handlebars --depth=999

# Or upgrade to Handlebars 4.7.9 or later
npm install handlebars@latest
```

**URL:** https://github.com/advisories/GHSA-2w6w-674q-4c4q

**Cross-Ref:** [ESCALATE → TheGuardians] - Potential RCE risk in template processing

---

### 🔴 P1: CRITICAL - Vitest UI Server Arbitrary File Access
**CVE:** GHSA-5xrq-8626-4rwp  
**CVSS Score:** 9.8 (Critical)  
**CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)

**Affected Projects:**
- platform/orchestrator
- portal/Backend
- portal/Frontend

**Technical Details:**
- Vulnerability: When Vitest UI server is listening, arbitrary files can be read and executed
- Affected Versions: Multiple versions of vitest (exact range varies by project)
- Attack Vector: Network (AV:N), Low Complexity (AC:L), No Privileges Required (PR:N), No User Interaction (UI:N)
- Impact: Complete confidentiality and integrity compromise, arbitrary code execution

**Exploit Scenario:**
When the Vitest UI server (`vitest --ui`) is running:
- Attackers can request arbitrary files from the system via HTTP requests
- Files are executed in the Node.js context if they're JavaScript
- Source code, environment variables, and configuration are exposed
- Potential lateral movement to other services

**Fix:**
Upgrade vitest to patched version:
```bash
# platform/orchestrator
cd platform/orchestrator && npm update vitest

# portal/Backend
cd portal/Backend && npm update vitest

# portal/Frontend
cd portal/Frontend && npm update vitest
```

**IMPORTANT:** Disable Vitest UI server in production. It should ONLY be used in local development.

**URL:** https://github.com/advisories/GHSA-5xrq-8626-4rwp

**Cross-Ref:** [ESCALATE → TheGuardians] - RCE via test framework in production exposure

---

## High-Severity Findings (P2)

### DEP-003: form-data - CRLF Injection
**CVSS Score:** 7.5 (High)  
**CWE:** CWE-93 (Improper Neutralization of CRLF Sequences in HTTP Headers)

**Affected Versions:** 4.0.0 - 4.0.5  
**Affected Projects:** Source/Backend, Source/Frontend

**Details:** CRLF injection in multipart field names and filenames allows HTTP response splitting and header injection.

**Fix:**
```bash
npm update form-data
```

---

### DEP-004: brace-expansion - DoS via Unbounded Expansion
**CVSS Score:** 7.5 (High)  
**CWE:** CWE-400 (Uncontrolled Resource Consumption), CWE-770 (Allocation of Resources Without Limits or Throttling)

**Affected Versions:** < 1.1.18  
**Affected Projects:** Source/Backend, Source/Frontend

**Details:** Multiple DoS vulnerabilities in glob pattern expansion:
- Zero-step sequence causes process hang and memory exhaustion
- Exponential-time expansion of consecutive {} groups
- Unbounded expansion causing out-of-memory crashes

**Fix:**
```bash
npm update brace-expansion
```

---

### DEP-005: body-parser - Denial of Service via Invalid Limit Value
**CVSS Score:** 3.7 (Low, but affects Direct Dependency)  
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Affected Versions:** < 1.20.6  
**Affected Projects:** Source/Backend

**Details:** Invalid limit values silently disable size enforcement on request body parsing, leading to DoS.

**Fix:**
```bash
npm update body-parser
```

---

### DEP-006: @remix-run/router - Open Redirect via Protocol-Relative URL
**CVSS Score:** 5.3 (Medium, escalated to P2 due to React Router impact)  
**CWE:** CWE-601 (URL Redirection to Untrusted Site / 'Open Redirect')

**Affected Versions:** >= 1.3.0 < 1.23.3  
**Affected Projects:** Source/Frontend

**Details:** Same-origin redirect with path starting `//` causes open redirect via protocol-relative URL reinterpretation. Affects:
- react-router
- react-router-dom

**Fix:**
```bash
cd Source/Frontend && npm update react-router-dom
```

---

### DEP-007: esbuild - CORS Bypass via Development Server
**CVSS Score:** 5.3 (Medium)  
**CWE:** CWE-346 (Origin Validation Error)

**Affected Versions:** <= 0.24.2  
**Affected Projects:** Source/Frontend (via Vite)

**Details:** Development server allows any website to send requests and read responses, bypassing CORS.

**Fix:**
```bash
npm update vite
```

---

### DEP-008: nanoid - Infinite Loop via Negative Size
**CVSS Score:** 5.9 (High)  
**CWE:** CWE-835 (Infinite Loop)

**Affected Versions:** < 3.3.18  
**Affected Projects:** Source/Frontend

**Details:** Non-secure generators can loop indefinitely with negative size, causing DoS. Custom generators loop when size is zero.

**Fix:**
```bash
npm update nanoid
```

---

## Outdated Dependencies (P3)

### Source/Backend - Major Version Gaps
| Package | Current | Latest | Gap | Notes |
|---------|---------|--------|-----|-------|
| express | ^4.18.2 | 5.2.1 | 1 major | Contains moderate vulnerability (via qs) |
| pino | ^8.17.0 | 10.3.1 | 2 major | **P2 - Likely missing security patches** |
| uuid | ^9.0.0 | 14.0.2 | 5 major | Consider updating gradually |
| prom-client | ^15.1.0 | 15.1.3 | Patch | Already up-to-date |

**Recommendation:** 
- 🔴 Upgrade `pino` immediately (2 major versions behind = likely critical patches)
- 🟠 Upgrade `express` to 5.x or at least latest 4.x patch
- 🟡 Plan gradual upgrade of `uuid` (5 major versions is risky in one jump)

### Source/Frontend - Major Version Gaps
| Package | Current | Latest | Gap | Notes |
|---------|---------|--------|-----|-------|
| react | ^18.3.1 | 19.2.8 | 1 major | Stable, safe to upgrade |
| react-dom | ^18.3.1 | 19.2.8 | 1 major | Sync with React upgrade |
| react-router-dom | ^6.26.0 | 7.18.2 | 1 major | Contains open redirect fix (P2) |

**Recommendation:**
- 🟠 Upgrade React + React-DOM to 19.x as a synchronized pair
- 🔴 Upgrade react-router-dom to 7.x for open redirect security fix

---

## Dependency Tree Analysis

### Total Dependencies
- Source/Backend: ~220 transitive dependencies
- Source/Frontend: ~380 transitive dependencies (Vite/React ecosystem)
- portal/Backend: ~450 transitive dependencies
- portal/Frontend: ~400 transitive dependencies

### Supply Chain Risk Indicators

**Post-Install Scripts:** ✅ None detected (good)

**Duplicate Major Versions:** 
- Source/Frontend has multiple versions of `postcss` and build tools - 🟡 Watch for conflicts

**Abandoned Dependencies:** 
- No signs of completely abandoned packages detected
- All critical packages have recent updates available

### License Compliance

**Status:** ✅ No GPL/AGPL licenses detected that would create viral license conflicts

**Note:** Projects are marked as private/UNLICENSED. Ensure license headers are added if these become public.

---

## Remediation Roadmap

### Phase 1: CRITICAL (This Week)
**Effort:** 4-6 hours  
**Risk:** High complexity due to potential breaking changes

- [ ] Update Handlebars in Source/Backend and Source/Frontend (dependency deep)
- [ ] Update Vitest in platform/orchestrator, portal/Backend, portal/Frontend
- [ ] Run full test suite after each update
- [ ] Verify no application logic depends on vulnerable behavior

**Commands:**
```bash
# Handlebars (transitive)
cd Source/Backend && npm install handlebars@latest --save-dev --depth=999
cd Source/Frontend && npm install handlebars@latest --save-dev --depth=999

# Vitest (direct and transitive)
cd platform/orchestrator && npm update vitest
cd portal/Backend && npm update vitest
cd portal/Frontend && npm update vitest

# Run all tests
npm test --workspaces --if-present
```

### Phase 2: HIGH (This Sprint)
**Effort:** 6-8 hours

- [ ] Update form-data, brace-expansion, body-parser
- [ ] Update react-router-dom to fix open redirect
- [ ] Update esbuild/Vite stack
- [ ] Update nanoid
- [ ] Regression testing

### Phase 3: MODERATE (Next Sprint)
**Effort:** 8-10 hours

- [ ] Plan React 18→19 upgrade strategy
- [ ] Plan pino 8→10 upgrade (2 major version jump)
- [ ] Plan express 4→5 upgrade
- [ ] Create feature branch for each major update
- [ ] Coordinate with frontend-coder and backend-coder agents

---

## Dashboard Metrics

| Metric | Value |
|--------|-------|
| Total Vulnerabilities | 99 |
| Critical | 6 |
| High | 26 |
| Moderate | 64 |
| Low | 3 |
| Projects Audited | 6 |
| Projects with P1 Findings | 5 |
| Projects Clean | 1 (Source/E2E) |
| Outdated Major Versions | 11 |
| Abandoned Packages | 0 |
| License Issues | 0 |
| Supply Chain Red Flags | 0 |

---

## Tools & Methods Used

- **npm audit** - CVE scanning
- **npm outdated** - Version gap detection
- **license-checker** - License compliance
- **package-lock.json analysis** - Dependency tree inspection

---

## Learning & Recommendations

### For Future Audits

1. **Dependency Pinning Strategy:**
   - Consider tighter pinning for critical packages (handlebars, vitest)
   - Use npm audit in CI/CD pipeline to catch issues early
   - Automate Dependabot or Renovate for patch updates

2. **Development vs Production:**
   - Separate devDependencies from production dependencies
   - Only vitest (dev tool) should be in devDependencies
   - Ensure vitest UI server is never exposed in production

3. **Update Cadence:**
   - Schedule monthly audit reviews
   - Patch security updates immediately
   - Plan major version upgrades quarterly

4. **Testing Gaps:**
   - Add security-focused integration tests
   - Test with known payloads for handlebars and form-data
   - Verify router behavior with open redirect payloads

### Watch List (For Next Audit)

- **handlebars** - History of template injection bugs; monitor closely
- **vitest** - Testing tools expose dev servers; careful with deployment
- **pino** - Logging is critical infrastructure; keep current
- **React ecosystem** - React 19.x adoption; ensure all packages stay in sync

---

## Cross-References & Escalations

### [ESCALATE → TheGuardians]
- **Handlebars RCE (P1):** Requires security review of template handling in codebase
- **Vitest RCE (P1):** Requires audit of Vitest UI server exposure in deployed systems
- **Form-data CRLF Injection (P2):** Requires header validation audit in request handlers

### [COORDINATE → Frontend-Coder]
- React 18→19 migration planning
- react-router-dom security update (open redirect fix)
- Build tool stack (Vite/esbuild) updates

### [COORDINATE → Backend-Coder]
- Express.js update strategy (4→5)
- Pino logging framework upgrade (8→10)
- UUID version strategy (9→14)

---

## Verification Status

- ✅ npm audit scan completed for all 6 projects
- ✅ Outdated package analysis completed
- ✅ License compliance check completed
- ✅ Supply chain risk assessment completed
- ✅ Transitive dependency analysis completed

**Next Audit Due:** 2026-09-20 (30 days)

---

*Report Generated by Dependency Auditor | TheInspector Team*  
*Audit ID: dep-audit-2026-08-20-001*
