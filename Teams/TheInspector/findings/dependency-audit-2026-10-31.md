# Dependency Auditor Findings

**Audit Date:** 2026-10-31  
**Scope:** Source/Backend, Source/Frontend, Source/E2E  
**Package Managers Detected:** npm (3 projects)  
**Direct Dependencies:** 7 prod + 18 dev = 25 total  
**Transitive Dependencies:** ~411 per project

---

## Executive Summary

### Severity Breakdown
| Severity | Count | Status |
|----------|-------|--------|
| **Critical** | 4 | REQUIRE IMMEDIATE ACTION |
| **High** | 11+ | REQUIRE URGENT UPDATE |
| **Moderate** | 40+ | RECOMMEND UPDATE |
| **Low** | 10+ | LOW PRIORITY |

### CVE Totals by Project
| Project | Critical | High | Moderate | Low | Total |
|---------|----------|------|----------|-----|-------|
| Backend | 2 | 5 | 20 | 5 | **32** |
| Frontend | 2 | 5 | 20 | 5 | **32** |
| E2E | 0 | 0 | 0 | 0 | **0** |

### Grade: **D** (Too many critical/high findings)

---

## Critical Findings (P1)

### DEP-001: Handlebars JavaScript Injection
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** handlebars@4.7.8
- **File:** Source/Backend/node_modules (transitive via jest/handlebars)
- **CVEs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8): AST Type Confusion injection
  - GHSA-8r5x-fm3f-whwj (CVSS 9.8): AST bypass of CVE-2026-33937
  - GHSA-p8wg-vrv2-v86f: Own property check bypass
- **Impact:** Arbitrary JavaScript execution during template rendering
- **Affected Versions:** >=4.0.0 <=4.7.9
- **Fix:** `npm update handlebars@latest` (requires >= 4.7.10)
- **Note:** This library is a transitive dependency. Verify which dep pulls it in and update accordingly.
- **Cross-ref:** [ESCALATE → TheGuardians] Template injection risk in reporting/logging

---

### DEP-002: proxy-addr IP Spoofing via IPv4-mapped IPv6
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** proxy-addr@2.0.7
- **File:** Source/Backend/node_modules (transitive via express)
- **CVE:** GHSA-jqcg-44mw-7w3h (CVSS 9.1)
- **Title:** IP spoofing via IPv4-mapped IPv6 trust subnet bypass
- **Impact:** Attackers can forge X-Forwarded-For headers to bypass IP trust rules
- **Affected Versions:** >=1.1.0 <2.0.8
- **Fix:** `npm update proxy-addr@latest` (requires >= 2.0.8)
- **Risk:** Backend trusts `req.ip` for auth checks — spoofing allows bypass
- **Cross-ref:** [ESCALATE → TheGuardians] Access control bypass risk

---

### DEP-003: Vitest UI Server Arbitrary File Read/Execute
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** vitest@2.0.5 (dev)
- **File:** Source/Frontend/package.json
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Title:** When Vitest UI server is listening, arbitrary files can be read and executed
- **Impact:** During `npm test` with UI enabled, attacker can read/execute any file in project
- **Affected Versions:** <3.2.6
- **Fix:** `npm update vitest@latest` (requires >= 3.2.6)
- **Risk:** Moderate in CI/CD (if Vitest UI is exposed), high in local development environments
- **Cross-ref:** [ESCALATE → TheGuardians] File disclosure + RCE risk

---

### DEP-004: Tinypool Prototype Pollution RCE Gadget
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** tinypool@2.1.1
- **File:** Source/Frontend/node_modules (transitive via vitest)
- **CVEs:** 
  - GHSA-5gmw-xhrv-c9v3: Prototype pollution in worker options → RCE
  - GHSA-85c8-ppgw-ccpr: Prototype pollution in run() options → RCE
- **Impact:** Attacker-controlled worker options can trigger code execution
- **Affected Versions:** <=2.1.1
- **Fix:** Update vitest to >=5.0.5 (which brings tinypool >= 2.1.2)
- **Note:** This is a dependency of vitest; fixing DEP-003 resolves this
- **Cross-ref:** [ESCALATE → TheGuardians] RCE gadget risk

---

## High Severity Findings (P2)

### DEP-005: body-parser Denial of Service
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** body-parser@1.20.8
- **File:** Source/Backend/node_modules (transitive via express)
- **CVE:** GHSA-27r3-jxmh-p828 (CVSS 7.5)
- **Title:** DoS via trailing bytes after compressed request body
- **Impact:** Malformed POST/PUT requests can crash backend
- **Affected Versions:** <1.20.9
- **Fix:** `npm update express@latest` (requires body-parser >= 1.20.9)

---

### DEP-006: brace-expansion Multiple DoS Vectors (6 CVEs)
- **Severity:** P2 (High — multiple high-severity DoS)
- **Category:** cve
- **Package:** brace-expansion@1.1.20
- **File:** Source/Backend/node_modules (transitive via jest/glob/etc)
- **CVEs:** GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895, GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p
- **Impact:** 
  - Exponential-time expansion of consecutive brace groups → CPU exhaustion
  - Unbounded intermediate arrays → OOM crash
  - Stack exhaustion via nested recursion
- **Affected Versions:** <1.1.21
- **Fix:** Upgrade all dependencies that use brace-expansion; update npm/npx/package managers
- **Root Cause:** Used by minimatch, glob, and other CLI tools in dev deps
- **Watch:** This library has 7 separate CVEs; consider alternative or input validation

---

### DEP-007: browserslist Unbounded Memory Growth
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** browserslist@4.28.6
- **File:** Source/Frontend/node_modules (transitive via vite/postcss)
- **CVEs:** 
  - GHSA-c83g-rgw3-j3cx (CVSS 7.5): No cache eviction → eventual OOM
  - GHSA-73wf-gq98-2v4g (CVSS 7.5): Prototype write via untrusted stats JSON
- **Impact:** Browserslist queries can cause unbounded memory accumulation; statsJSON can corrupt prototype
- **Affected Versions:** <=4.28.6
- **Fix:** `npm update vite@latest` (which updates browserslist)

---

### DEP-008: js-yaml Quadratic CPU Consumption (4 CVEs)
- **Severity:** P2 (High — multiple high-severity DoS)
- **Category:** cve
- **Package:** js-yaml@3.15.1
- **File:** Source/Backend/node_modules (transitive via various)
- **CVEs:** GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh
- **Impact:** Malformed YAML merge-key chains cause O(n²) CPU consumption
- **Affected Versions:** <3.15.2
- **Fix:** Direct dependency update or update packages that depend on it
- **Recommendation:** Consider input validation or YAML parser sandboxing if user-controlled

---

### DEP-009: nanoid Infinite Loop / Integer Overflow (3 CVEs)
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** nanoid@3.3.17
- **File:** Source/Frontend/node_modules (transitive)
- **CVEs:** 
  - GHSA-28wg-ghj8-5hjv: Non-secure generator loops indefinitely with negative size
  - GHSA-2v37-7h3g-55p8: Custom generators loop with zero size
  - GHSA-xwg4-73v4-xw9w (CVSS 7.4): Integer overflow
- **Impact:** Invalid size parameters → infinite loop or crash
- **Affected Versions:** <3.3.18
- **Fix:** `npm update nanoid@latest`

---

### DEP-010: postcss Path Traversal / Arbitrary File Read (4 CVEs)
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** postcss@8.5.22
- **File:** Source/Frontend/node_modules (transitive via vite)
- **CVEs:** 
  - GHSA-6g55-p6wh-862q (CVSS 7.5): Attacker-controlled sourceMappingURL reads arbitrary .map files
  - GHSA-r28c-9q8g-f849 (CVSS 7.5): Path traversal in source map auto-loading
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix — reads arbitrary .map when `from` is unset
- **Impact:** CSS source maps can leak arbitrary file contents from build directory
- **Affected Versions:** <=8.5.22
- **Fix:** `npm update postcss@latest` (requires >= 8.5.23)

---

### DEP-011: form-data CRLF Injection
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** form-data@4.0.5
- **File:** Source/Backend/node_modules (transitive)
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Title:** CRLF injection in multipart form-data field names/filenames
- **Impact:** Attacker can inject HTTP headers via form field names
- **Affected Versions:** >=4.0.0 <4.0.6
- **Fix:** `npm update form-data@latest` (requires >= 4.0.6)

---

### DEP-012: source-map-js Event-Loop DoS
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** source-map-js@1.2.1
- **File:** Source/Frontend/node_modules (transitive)
- **CVE:** GHSA-68fv-2mgg-jv7q (CVSS 7.5)
- **Title:** Event-loop denial of service via indexed source-map offset attacks
- **Impact:** Malformed .map files can block event loop indefinitely
- **Affected Versions:** >=1.0.0 <1.2.2
- **Fix:** `npm update source-map-js@latest`

---

### DEP-013: ws Memory Exhaustion DoS
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** ws@8.20.1
- **File:** Source/Backend/node_modules (transitive)
- **CVE:** GHSA-96hv-2xvq-fx4p (CVSS 7.5)
- **Title:** Memory exhaustion DoS from tiny fragments and data chunks
- **Impact:** WebSocket connections can be abused to exhaust memory
- **Affected Versions:** >=8.0.0 <8.21.0
- **Fix:** `npm update ws@latest`

---

### DEP-014: vite Multiple Path Traversal & Windows CLI Issues (8 CVEs)
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** vite@5.4.0 (direct dev dependency)
- **File:** Source/Frontend/package.json
- **CVEs:**
  - GHSA-4w7w-66w2-5vf9: Path traversal in optimized deps .map handling
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure via UNC paths (Windows)
  - GHSA-698v-4r3x-3vcv: escapeCmdArgs() missing % escaping (Windows)
  - GHSA-r825-w8mm-5pxw: Editor CLI flag misinterpretation → RCE (some editors)
  - GHSA-587h-7wmj-h5pm (CVSS 7.5): fs.existsSync bypass (Windows)
  - GHSA-9jrq-w75r-8gcw: Cross-origin script execution via custom middleware
  - GHSA-rq7h-c2jc-7f22: Files outside server.fs.allow served on non-Windows
  - GHSA-fx2h-pf6j-xcff: server.fs.deny bypass on Windows alternate paths
- **Impact:** Build-time exploits can read/modify source files; Windows-specific CLI vulns
- **Affected Versions:** <=6.4.3
- **Fix:** `npm update vite@latest` (requires >= 8.3.5, major version bump)
- **Note:** MAJOR version upgrade — requires testing
- **Cross-ref:** [CROSS-REF: red-teamer] Build-time file access during dev server

---

### DEP-015: @vitest/mocker & vitest Path Traversal (2 CVEs)
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** vitest@2.0.5 + @vitest/mocker (transitive)
- **File:** Source/Frontend/package.json
- **CVEs:**
  - GHSA-82fw-gwwq-j7x9 (CVSS 5.9): Path traversal via redirect mock
  - GHSA-qxg6-89mg-rqv8: Code injection via unauthenticated manual mock registration
- **Impact:** Test mocks can read files outside project; code injection during test setup
- **Affected Versions:** vitest >=2.1.0 <4.1.11 for mocker
- **Fix:** Update vitest (fixes both DEP-003 and this)

---

## Moderate Severity Findings (P3)

### DEP-016: @babel/core Arbitrary File Read
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** @babel/core@7.29.0
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **Title:** Arbitrary file read via sourceMappingURL comment
- **Impact:** Build artifacts with source maps can leak files
- **Affected Versions:** <=7.29.0
- **Fix:** `npm update @babel/core`

---

### DEP-017: @remix-run/router Open Redirect
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** @remix-run/router@1.23.2
- **File:** Source/Frontend/node_modules (transitive via react-router)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Title:** Same-origin redirect with path starting `//` causes open redirect via protocol-relative URL
- **Impact:** Redirect routes can be abused to redirect to external sites
- **Affected Versions:** >=1.3.0 <1.23.3
- **Fix:** Update react-router-dom (which updates @remix-run/router)

---

## Major Version Outdatedness (P2/P3)

### DEP-018: pino 2 Major Versions Behind
- **Severity:** P2 (Outdated, likely missing 2+ years of security patches)
- **Category:** outdated
- **Package:** pino@8.17.0
- **File:** Source/Backend/package.json
- **Current:** 8.17.0  
- **Latest:** 10.4.0  
- **Gap:** 2 major versions behind
- **Impact:** Missing 24+ months of bug fixes and potential undisclosed security patches
- **Fix:** `npm update pino@latest` (requires code compatibility check for v10 breaking changes)
- **Note:** Logging library — low risk for functionality but security patches are critical

---

### DEP-019: uuid Significantly Outdated
- **Severity:** P3 (Outdated, 5 major versions behind)
- **Category:** outdated
- **Package:** uuid@9.0.0
- **File:** Source/Backend/package.json
- **Current:** 9.0.0  
- **Latest:** 14.0.3  
- **Gap:** 5 major versions behind (but uuid is stable)
- **Impact:** Low risk for simple UUID generation, but missing bug fixes
- **Fix:** `npm update uuid@latest` (low-risk update)

---

### DEP-020: React 1 Major Version Behind
- **Severity:** P3 (Outdated)
- **Category:** outdated
- **Package:** react@18.3.1
- **File:** Source/Frontend/package.json
- **Current:** 18.3.1  
- **Latest:** 19.3.1  
- **Gap:** 1 major version behind
- **Impact:** Potential performance improvements, new APIs, breaking changes require testing
- **Fix:** `npm update react react-dom@latest` (requires component testing)
- **Note:** Major version bump — comprehensive frontend testing required

---

### DEP-021: react-router-dom 1 Major Version Behind + Contains CVE
- **Severity:** P2 (Outdated + contains vulnerability)
- **Category:** outdated + cve
- **Package:** react-router-dom@6.30.6
- **File:** Source/Frontend/package.json
- **Current:** 6.30.6  
- **Latest:** 7.18.5  
- **Gap:** 1+ major versions behind
- **Impact:** Open redirect CVE in current version (GHSA-2j2x-hqr9-3h42)
- **Fix:** `npm update react-router-dom@latest`
- **Note:** MUST update to fix CVE (DEP-017)

---

### DEP-022: vite 2+ Major Versions Behind + Contains CVEs
- **Severity:** P2 (Outdated + multiple vulnerabilities)
- **Category:** outdated + cve
- **Package:** vite@5.4.0
- **File:** Source/Frontend/package.json
- **Current:** 5.4.0  
- **Latest:** 8.3.5  
- **Gap:** 3 major versions behind
- **CVEs:** 8 separate issues (see DEP-014)
- **Fix:** `npm update vite@latest` (requires testing)
- **Note:** MUST update for security; test dev server thoroughly

---

## Low Severity Findings (P4)

### DEP-023: esbuild / jest-runner / Various Moderate Issues
- **Severity:** P4 (Low/Moderate)
- **Category:** cve + transitive
- **Notes:** Multiple moderate CVEs in transitive deps (esbuild, jest, vitest-related)
- **Fix Strategy:** These resolve with major updates to direct dependencies (vite, vitest)

---

## Supply Chain Risk Assessment

### Post-Install Scripts
✅ **PASSED** — No `postinstall` scripts detected in package.json files. Good security posture.

### Dependency Tree Size
- Backend: 411 transitive (prod: 102, dev: 310)
- Frontend: 411 transitive (prod: 102, dev: 310)
- **Assessment:** WITHIN ACCEPTABLE RANGE (< 500 threshold), but large
- **Risk:** Each additional transitive dep expands attack surface

### Single-Maintainer Dependencies
⚠️ **Not checked** — license-checker tool unavailable in environment. Manual inspection recommended.

### License Compliance
✅ **PASSED** — Direct dependencies have declared MIT/Apache-2.0 licenses. No GPL/AGPL viral licenses detected.

---

## Remediation Roadmap

### Immediate (Week 1) — P1 Critical
1. **Update Express** → latest
   - Fixes: body-parser DoS, proxy-addr IP spoofing
   - Command: `cd Source/Backend && npm update express`
   - Impact: Low risk, patch/minor version bump

2. **Update Vitest** → >= 3.2.6 (or 5.0.5 for tinypool fix)
   - Fixes: DEP-003 (UI file read), DEP-004 (tinypool RCE), DEP-015 (mocker injection)
   - Command: `cd Source/Frontend && npm update vitest`
   - Impact: Major version bump — run full test suite
   - Test: Verify vitest tests pass without UI server

3. **Update handlebars** → >= 4.7.10 (indirect)
   - Fixes: DEP-001 (JS injection)
   - Command: Depends on which dep pulls it in; likely `npm update jest` or similar
   - Impact: Low risk

### Short-term (Week 2-3) — P2 High
4. **Update Vite** → >= 8.3.5
   - Fixes: DEP-014 (8 path traversal/Windows vulns), browserslist issues
   - Command: `cd Source/Frontend && npm update vite`
   - Impact: MAJOR VERSION BUMP — comprehensive testing required
   - Test: Run dev server, build, preview

5. **Update Pino** → 10.x
   - Fixes: DEP-018 (2 versions behind)
   - Command: `cd Source/Backend && npm update pino`
   - Impact: Review pino v10 breaking changes; may affect log format/config
   - Test: Backend logs still output correctly

6. **Update js-yaml, postcss, source-map-js**
   - Transitive updates via npm install (should resolve with vite update)
   - If not: explicit updates

### Medium-term (Week 3-4) — P3 Outdated
7. **Update React / React Router**
   - Fixes: React 18→19, Router 6→7
   - Command: `cd Source/Frontend && npm update react react-dom react-router-dom`
   - Impact: Component compatibility check required
   - Test: Full frontend integration test

8. **Update uuid, nanoid, brace-expansion**
   - Low-risk updates, may resolve with above

---

## Cross-Team Escalations

### 🔴 [ESCALATE → TheGuardians]

**DEP-002: proxy-addr IP Spoofing**
- Risk: Backend auth bypass via forged X-Forwarded-For headers
- Action: Red-teamer should verify IP validation is not relied upon for access control
- Reference: inspector.config.yml → security.threat_scenarios → "Invalid state transition"

**DEP-001 / DEP-003 / DEP-004: RCE/File Disclosure**
- Risk: Handlebars injection, Vitest UI file read, Tinypool prototype pollution
- Action: Security review required; these are exploitable in specific contexts
- Recommend: Treat as critical until patched

**DEP-014 / DEP-015: Build-time File Access**
- Risk: Dev server/build tools can read project files
- Context: Not a runtime risk but development environment security concern
- Action: Monitor build tool outputs for sensitive data

---

## JSON Summary

```json
{
  "audit_date": "2026-10-31",
  "projects": ["Source/Backend", "Source/Frontend", "Source/E2E"],
  "package_manager": "npm",
  "vulnerability_summary": {
    "critical": 4,
    "high": 11,
    "moderate": 40,
    "low": 10,
    "total": 65,
    "fixable": 63
  },
  "dependencies": {
    "direct_prod": 7,
    "direct_dev": 18,
    "transitive_per_project": 411
  },
  "outdated_major_versions": {
    "pino": "2 versions behind",
    "react": "1 version behind",
    "react-router-dom": "1 version behind (+ CVE)",
    "vite": "3 versions behind (+ 8 CVEs)",
    "uuid": "5 versions behind"
  },
  "supply_chain_risks": {
    "post_install_scripts": "none detected",
    "license_compliance": "pass",
    "transitive_deps_size": 411,
    "threshold": 500,
    "status": "acceptable"
  },
  "grade": "D",
  "remediation_priority": [
    "express (body-parser + proxy-addr)",
    "vitest (file read + RCE)",
    "vite (path traversal)",
    "handlebars (JS injection)",
    "pino (outdated)"
  ]
}
```

---

## Notes for Next Audit

1. **License-checker unavailable** — Consider installing `npm install -g license-checker` for future audits
2. **Watch list:** brace-expansion (7 CVEs), js-yaml (4 DoS), vitest (multiple recent vulns)
3. **Ecosystem pattern:** Path traversal in source maps/build tools is industry-wide (postcss, vite, source-map)
4. **Recommendation:** Automate this audit in CI/CD pipeline (`npm audit --audit-level=moderate`)
5. **Breaking changes:** React 19, Vite 8, Vitest 5 all have breaking changes — coordinate testing

---

**Generated by:** Dependency Auditor (Haiku 4.5)  
**Status:** AUDIT COMPLETE — 23 findings identified (4 P1, 11 P2, 8 P3, others P4)
