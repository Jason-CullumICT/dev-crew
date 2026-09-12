# Dependency Auditor Findings
**Date:** 2026-09-12  
**Agent:** dependency_auditor (haiku)  
**Scope:** Source/Backend, Source/Frontend, Source/E2E

---

## Executive Summary

| Category | Backend | Frontend | E2E |
|----------|---------|----------|-----|
| **CVEs (Total)** | 10 | 15 | 0 |
| — Critical | 1 | 1 | 0 |
| — High | 4 | 6 | 0 |
| — Moderate | 3 | 7 | 0 |
| — Low | 2 | 1 | 0 |
| **Direct Dependencies** | 4 | 3 | 1 |
| **Transitive Dependencies** | 411 | 53 | 1 |
| **Outdated Major Versions** | 3 | 3 | 0 |
| **Post-Install Scripts** | None | None | None |

---

## Critical Findings

### DEP-001: Handlebars.js JavaScript Injection (Critical)
- **Severity:** P1 (Critical)
- **Category:** CVE
- **Affected Packages:** 
  - Backend: handlebars (via transitive deps)
  - Frontend: handlebars (via transitive deps)
- **CVE IDs:** Multiple
  - **CRITICAL:** Handlebars.js has JavaScript Injection via AST Type Confusion (range: `>=4.0.0 <=4.7.8`)
  - **HIGH:** JavaScript Injection via AST Type Confusion by tampering @partial-block
  - **HIGH:** JavaScript Injection via AST Type Confusion when passing an object as dynamic partial
  - **HIGH:** Denial of Service via Malformed Decorator Syntax in Template Compilation
  - **HIGH:** JavaScript Injection in CLI Precompiler via Unescaped Names and Options
  - **MODERATE:** Prototype Pollution Leading to XSS through Partial Template Injection
  - **MODERATE:** Prototype Method Access Control Gap via Missing __lookupSetter__ Blocklist Entry
  - **LOW:** Property Access Validation Bypass in container.lookup
- **CVSS Score:** 7.5 (High)
- **Exploit Risk:** Yes — attackers can inject arbitrary JavaScript through template compilation
- **Impact:** Remote code execution if untrusted templates are compiled
- **Current Version Range:** <=4.7.8 (Vulnerable)
- **Fixed Version:** >=4.7.9
- **Fix:** `npm audit fix` will upgrade to 4.7.9
  ```bash
  cd Source/Backend && npm audit fix
  cd Source/Frontend && npm audit fix
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — This is a remote code execution vulnerability. Requires immediate patching.

---

### DEP-002: brace-expansion DoS (High)
- **Severity:** P2 (High)
- **Category:** CVE
- **Affected Packages:** brace-expansion (transitive via dev tooling)
- **CVE IDs:**
  - GHSA-3jxr-9vmj-r5cp: DoS via exponential-time expansion of consecutive non-expanding {} groups (CVSS 5.3)
  - GHSA-mh99-v99m-4gvg: DoS via unbounded expansion length causing out-of-memory process crash (CVSS 7.5)
  - GHSA-rgw5-rvv9-x895: DoS via unbounded intermediate arrays, bypassing prior fix (CVSS 7.5)
- **Affected Range:** <1.1.18 (multiple issues at <1.1.16, <1.1.17)
- **Fixed Version:** >=1.1.18
- **Impact:** Process hang and memory exhaustion on malformed input; attack surface is glob expansion in build tools
- **Fix:** `npm audit fix` will upgrade to 1.1.18

---

### DEP-003: Browserslist OOM/Crash (High)
- **Severity:** P2 (High)
- **Category:** CVE
- **Affected Packages:** browserslist (transitive via Vite/PostCSS tooling)
- **CVE IDs:**
  - GHSA-c83g-rgw3-j3cx: Unbounded memory growth (no cache eviction) via distinct query results → eventual OOM (CVSS 7.5)
  - GHSA-73wf-gq98-2v4g: Uncaught crash via prototype write through untrusted browserslist-stats.json (CVSS 7.5)
- **Affected Range:** <=4.28.6
- **Fixed Version:** >=4.28.9
- **Impact:** Build process DoS or crash during `npm run build`
- **Fix:** `npm audit fix` will upgrade to 4.28.9

---

## High-Severity Findings

### DEP-004: form-data CRLF Injection
- **Severity:** P2 (High)
- **Category:** CVE
- **Affected Packages:** form-data (transitive)
- **CVE ID:** GHSA-v422-hmwv-36x6
- **Title:** CRLF injection in form-data via unescaped multipart field names and filenames
- **Affected Range:** >=4.0.0 <4.0.6
- **Fixed Version:** >=4.0.6
- **CVSS Score:** Not provided (but marked HIGH severity)
- **Impact:** Header injection via form data, could lead to request smuggling
- **Fix:** `npm audit fix`

---

### DEP-005: js-yaml Quadratic DoS
- **Severity:** P2 (High)
- **Category:** CVE
- **Affected Packages:** js-yaml (transitive via build tools)
- **CVE IDs:**
  - GHSA-67yy-7r97-xchv: Quadratic-complexity DoS in merge key handling via repeated aliases
  - GHSA-6bw5-hchj-mh72: YAML merge-key chains can force quadratic CPU consumption
  - CVE-2026-59870: Quadratic CPU consumption in !!omap resolution (3.x and 4.x)
  - Unbounded merge key processing: maxTotalMergeKeys does not limit CPU use for empty merge sources
- **Affected Range:** >=3.0.0 <3.15.2
- **Fixed Version:** >=3.15.2
- **Impact:** CPU exhaustion on malformed YAML input (build process DoS)
- **Fix:** `npm audit fix`

---

## Moderate-Severity Findings

### DEP-006: uuid Buffer Bounds Check (Moderate)
- **Severity:** P2 (Moderate in direct dep)
- **Category:** CVE
- **Package:** uuid (DIRECT DEPENDENCY in both Backend & Frontend)
- **CVE ID:** Buffer bounds check missing in v3/v5/v6 when `buf` is provided
- **Affected Range:** <11.1.1
- **Current Version:** 9.0.0 (Backend), 9.0.1 (Frontend)
- **Fixed Version:** >=11.1.1 (major version bump)
- **Impact:** Buffer overflow if caller provides undersized buffer; unlikely in typical usage
- **Fix:** 
  ```bash
  cd Source/Backend && npm install uuid@latest
  cd Source/Frontend && npm install uuid@latest
  ```
- **Note:** This is a direct dependency, not a transitive. Requires explicit version bump.

---

### DEP-007: @remix-run/router Open Redirect (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Affected Packages:** @remix-run/router (transitive via react-router-dom)
- **CVE ID:** GHSA-2j2x-hqr9-3h42
- **Title:** Same-origin redirect with path starting `//` causes open redirect via protocol-relative URL
- **Affected Range:** >=1.3.0 <1.23.3
- **Fixed Version:** >=1.23.3
- **Impact:** Open redirect vulnerability if application uses routing with untrusted redirect targets
- **Fix:** Upgrade react-router-dom, which will pull in fixed router version

---

### DEP-008: @vitest/mocker Path Traversal (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Affected Packages:** @vitest/mocker (transitive via vitest in Frontend)
- **CVE ID:** GHSA-82fw-gwwq-j7x9
- **Title:** Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock
- **Affected Range:** >=2.1.0 <4.1.11
- **CVSS Score:** 5.9 (Medium)
- **Impact:** Test framework vulnerability; affects build/test environment, not production code
- **Fix:** Upgrade vitest to >=5.0.0 (major bump) or wait for downstream fix

---

### DEP-009: Remaining Moderate CVEs (qs, baseline-browser-mapping, @babel/core, body-parser)
- **Severity:** P3
- **Category:** CVE
- **Packages:**
  - **qs:** Multiple DoS vulnerabilities (CVE impact on request parsing)
  - **baseline-browser-mapping:** DoS on invalid input
  - **@babel/core:** Arbitrary file read via sourceMappingURL comment
  - **body-parser:** DoS when invalid limit value disables size enforcement
- **Fix:** `npm audit fix` will address these

---

## Outdated Major Versions

### DEP-010: Outdated Direct Dependencies (P3)
- **Severity:** P3 (Risk of accumulated security patches)
- **Category:** Outdated

#### Backend
| Package | Current | Latest | Major Gap | Risk |
|---------|---------|--------|-----------|------|
| **express** | ^4.18.2 | 5.2.1 | 1 major | Low (stable line) |
| **pino** | ^8.17.0 | 10.3.1 | 2 majors | **Medium** (may have security backports) |
| **uuid** | ^9.0.0 | 14.0.2 | 5 majors | Medium |

**Recommendation:** Update express to v5, pino to v10 in next maintenance cycle.

#### Frontend
| Package | Current | Latest | Major Gap | Risk |
|---------|---------|--------|-----------|------|
| **react** | ^18.3.1 | 19.3.0 | 1 major | Low (stable line) |
| **react-dom** | ^18.3.1 | 19.3.0 | 1 major | Low (stable line) |
| **react-router-dom** | ^6.26.0 | 7.18.3 | 1 major | **Medium** (has CVE fix — see DEP-007) |

**Recommendation:** Upgrade react-router-dom to v7 to fix open redirect CVE.

---

## Dependency Tree Health

### Backend
- **Direct Dependencies:** 4 (express, pino, prom-client, uuid)
- **Transitive Dependencies:** 411
- **Lock File Size:** 5,353 lines
- **Supply Chain Risk:** Moderate — large transitive tree primarily from dev tooling
- **Duplicates:** Likely yes (multiple versions of shared tools)

### Frontend
- **Direct Dependencies:** 3 (react, react-dom, react-router-dom)
- **Transitive Dependencies:** 53
- **Lock File Size:** 2,901 lines
- **Supply Chain Risk:** Lower — smaller transitive tree but still includes build tools
- **Duplicates:** To be verified

### E2E
- **Direct Dependencies:** 1 (@playwright/test)
- **Transitive Dependencies:** 1
- **Vulnerabilities:** 0 ✅
- **Status:** Clean

---

## Supply Chain Assessment

### Positive Indicators ✅
- **No post-install scripts** detected in any package.json
- **No deprecated packages** in direct dependencies
- **E2E test suite is clean** (zero CVEs)

### Risk Factors ⚠️
- **Handlebars.js** has critical RCE vulnerability; check if actually used in production (may be dev-only)
- **Large transitive tree in Backend** (411 packages) — high surface area for supply chain attacks
- **Build tool dependencies** have accumulated multiple CVEs (brace-expansion, browserslist, js-yaml, babel)

### Recommendation
1. **Run `npm audit fix`** in Backend and Frontend immediately to patch build-time vulnerabilities
2. **Verify Handlebars.js usage** — if it's only in dev tooling (Webpack/Babel), priority is lower; if in production templates, this is critical
3. **Upgrade direct dependencies** in next feature cycle (express→5, pino→10, react-router-dom→7)

---

## Audit Tooling & Environment

- **npm audit:** ✅ Available and functional
- **npx license-checker:** ⚠️ Encountered issues (not fully evaluated)
- **Manual lock file inspection:** ✅ Used for transitive dependency counting
- **Supported Package Managers:** npm only (no Go, Python, Rust, Java detected in Source/)

---

## Action Items

| ID | Title | Priority | Owner | Deadline |
|----|-------|----------|-------|----------|
| A-001 | Run `npm audit fix` in Backend and Frontend | P0 | Backend/Frontend-coder | ASAP |
| A-002 | Review Handlebars.js in production code | P1 | TheGuardians | Same sprint |
| A-003 | Upgrade react-router-dom to v7 | P2 | Frontend-coder | Next sprint |
| A-004 | Plan express/pino major version upgrades | P3 | Backend-coder | Next maintenance cycle |
| A-005 | Evaluate alternative to large transitive tree | P4 | Architect | Future |

---

## Cross-References

- **[ESCALATE → TheGuardians]** — Handlebars.js RCE (DEP-001); verify production impact
- **[ESCALATE → TheGuardians]** — CRLF injection in form-data (DEP-004); check if reachable from untrusted input
- **[CROSS-REF: red-teamer]** — If Handlebars templates are user-controlled, RCE is exploitable
- **[CROSS-REF: performance-profiler]** — Build time may worsen until brace-expansion/browserslist/js-yaml are patched

---

## JSON Summary

```json
{
  "audit_date": "2026-09-12",
  "scope": ["Source/Backend", "Source/Frontend", "Source/E2E"],
  "package_managers": ["npm"],
  "summary": {
    "backend": {
      "cves_critical": 1,
      "cves_high": 4,
      "cves_moderate": 3,
      "cves_low": 2,
      "cves_total": 10,
      "direct_deps": 4,
      "transitive_deps": 411,
      "outdated_major": 3
    },
    "frontend": {
      "cves_critical": 1,
      "cves_high": 6,
      "cves_moderate": 7,
      "cves_low": 1,
      "cves_total": 15,
      "direct_deps": 3,
      "transitive_deps": 53,
      "outdated_major": 3
    },
    "e2e": {
      "cves_total": 0,
      "direct_deps": 1,
      "transitive_deps": 1,
      "outdated_major": 0
    }
  },
  "critical_findings": [
    {
      "id": "DEP-001",
      "title": "Handlebars.js JavaScript Injection",
      "severity": "P1",
      "cvss": 7.5,
      "escalation": "TheGuardians"
    }
  ],
  "high_findings": [
    "DEP-002: brace-expansion DoS",
    "DEP-003: Browserslist OOM/Crash",
    "DEP-004: form-data CRLF Injection",
    "DEP-005: js-yaml Quadratic DoS"
  ],
  "remediation": "npm audit fix (both Backend and Frontend)"
}
```
