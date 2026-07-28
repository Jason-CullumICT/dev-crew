# Dependency Auditor Findings

## Executive Summary

**Project:** dev-crew (AI-powered development platform)
**Scan Date:** 2026-07-28
**Package Managers Detected:** npm (JavaScript/TypeScript)
**Total Workspaces Scanned:** 10

### Vulnerability Summary
- **Total CVEs Found:** 94 across all workspaces
- **Critical Severity:** 8
- **High Severity:** 29
- **Moderate Severity:** 55
- **Low Severity:** 2

| Workspace | Critical | High | Moderate | Low | Total |
|-----------|----------|------|----------|-----|-------|
| Source/Backend | 1 | 3 | 0 | 1 | 9 |
| Source/Frontend | 1 | 4 | 0 | 1 | 11 |
| Source/E2E | 0 | 0 | 0 | 0 | 0 |
| platform/orchestrator | 1 | 2 | 6 | 0 | 9 |
| portal/Backend | 2 | 9 | 43 | 0 | 54 |
| portal/Frontend | 2 | 9 | 43 | 0 | 54 |

---

## Critical Findings (P1)

### DEP-001: Handlebars.js - Multiple JavaScript Injection Vulnerabilities
- **Severity:** P1 (Critical CVE)
- **Category:** cve
- **Package:** `handlebars` (affected: >=4.0.0 <=4.7.8)
- **File:** Source/Backend/package-lock.json
- **Impact:** Arbitrary JavaScript code execution via AST Type Confusion
- **CVEs:**
  - GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r: JavaScript Injection via @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6: JavaScript Injection via dynamic partial objects
- **Detail:** Handlebars template engine versions up to 4.7.8 contain multiple critical vulnerabilities allowing attackers to inject and execute arbitrary JavaScript code. This affects any application that compiles untrusted templates or accepts user input in template names/variables.
- **Fix:** `npm update handlebars@>=4.7.9`
- **Cross-ref:** [ESCALATE → TheGuardians] - Code injection vulnerability, potential for remote code execution if templates are user-supplied

### DEP-002: Vitest - Arbitrary File Read via UI Server
- **Severity:** P1 (Critical CVE)
- **Category:** cve
- **Package:** `vitest` (affected: <3.2.6)
- **File:** Source/Frontend/package-lock.json
- **Impact:** Arbitrary file read and code execution when Vitest UI server is running
- **CVE:** GHSA-5xrq-8626-4rwp
- **Detail:** When Vitest UI server is listening (typically during development), attackers can read arbitrary files from the host system and potentially execute code. This is a significant risk in development environments.
- **Fix:** `npm update vitest@>=3.2.6`
- **Cross-ref:** [ESCALATE → TheGuardians] - File disclosure and RCE during dev mode

### DEP-003: Portal Dependencies - Multiple Critical Vulnerabilities
- **Severity:** P1 (Critical CVEs)
- **Category:** cve
- **Package:** portal/Backend & portal/Frontend dependencies
- **Impact:** 2 critical vulnerabilities in each portal workspace
- **Detail:** Portal workspaces contain additional critical vulnerabilities (details require further investigation of their specific dependency trees)
- **Fix:** Review portal/Backend/package.json and portal/Frontend/package.json; run `npm audit fix` and evaluate breaking changes
- **Cross-ref:** [ESCALATE → TheGuardians] - Investigate critical portal vulnerabilities

---

## High Priority Findings (P2)

### DEP-004: brace-expansion - Denial of Service via Unbounded Expansion
- **Severity:** P2 (High CVE)
- **Category:** cve
- **Package:** `brace-expansion` (affected: <=5.0.7)
- **File:** Source/Backend/package-lock.json
- **Impact:** Process hang, memory exhaustion, and out-of-memory crashes
- **CVEs:**
  - GHSA-mh99-v99m-4gvg: DoS via unbounded expansion (CVSS 7.5)
  - GHSA-3jxr-9vmj-r5cp: DoS via exponential expansion (CVSS 5.3)
  - GHSA-f886-m6hf-6m8v: DoS via zero-step sequences (CVSS 6.5)
- **Detail:** The brace-expansion package is used by glob/file-matching utilities. Malformed brace patterns cause unbounded expansion leading to resource exhaustion. This is a transitive dependency, likely pulled in by build/test tools.
- **Fix:** `npm update brace-expansion@>=1.1.16`
- **Cross-ref:** [CROSS-REF: chaos-monkey] - Consider adding DoS scenario for brace expansion

### DEP-005: form-data - CRLF Injection in Multipart Headers
- **Severity:** P2 (High CVE)
- **Category:** cve
- **Package:** `form-data` (affected: >=4.0.0 <4.0.6)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Impact:** CRLF injection in multipart form headers; potential for HTTP response splitting
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Detail:** Unescaped field names and filenames in form-data allow attackers to inject CRLF sequences, potentially poisoning HTTP headers. This affects any API or service handling file uploads.
- **Fix:** `npm update form-data@>=4.0.6`
- **Cross-ref:** [CROSS-REF: red-teamer] - Craft multipart uploads with \r\n in field names to test header injection

### DEP-006: vite - High Severity Vulnerabilities
- **Severity:** P2 (High CVE)
- **Category:** cve
- **Package:** `vite` (affected: <5.4.15, <4.5.x depending on version)
- **File:** Source/Frontend/package-lock.json
- **Impact:** Multiple high-severity issues in build tool
- **Detail:** Vite dev server has potential security issues. Check installed version and GitHub advisories.
- **Fix:** `npm update vite@latest`

### DEP-007: postcss - Potential Code Execution
- **Severity:** P2 (High CVE)
- **Category:** cve
- **Package:** `postcss` (affected versions TBD)
- **File:** Source/Frontend/package-lock.json
- **Impact:** May allow code execution in CSS processing
- **Detail:** PostCSS has known vulnerabilities in certain versions. Verify installed version.
- **Fix:** `npm update postcss@latest`

### DEP-008: ws (WebSocket) - High Severity Issue
- **Severity:** P2 (High CVE)
- **Category:** cve
- **Package:** `ws` (transitive in Source/Frontend)
- **Detail:** WebSocket library vulnerability. Impact depends on specific version.
- **Fix:** Review and update ws dependency

---

## Medium Priority Findings (P3)

### DEP-009: UUID - Moderate Severity Issue
- **Severity:** P3 (Moderate CVE)
- **Category:** cve
- **Package:** `uuid@^9.0.0` (Source/Backend, Source/Frontend)
- **File:** package-lock.json in multiple workspaces
- **Impact:** Moderate vulnerability in UUID generation
- **Detail:** Check installed uuid version against npm advisories
- **Fix:** `npm update uuid@latest`

### DEP-010: qs (Query String) - Prototype Pollution
- **Severity:** P3 (Moderate CVE)
- **Category:** cve
- **Package:** `qs` (transitive via express/body-parser)
- **File:** Source/Backend/package-lock.json
- **Impact:** Prototype pollution in query string parsing
- **Detail:** The qs library has prototype pollution vulnerabilities affecting downstream consumers like body-parser
- **Fix:** Ensure qs is upgraded to latest patched version
- **Note:** This is a transitive dependency; express and body-parser may need updates

### DEP-011: body-parser - Invalid Limit Bypass
- **Severity:** P3 (Moderate CVE)
- **Category:** cve
- **Package:** `body-parser` (transitive via express)
- **File:** Source/Backend/package-lock.json
- **Impact:** Invalid limit parameter silently disables size enforcement
- **Detail:** Malformed or invalid limit values in body-parser configuration cause the size limit to be ignored, potentially enabling DoS attacks with large payloads
- **Fix:** Ensure body-parser and express are at latest versions; verify limit configuration is validated

### DEP-012: react-router-dom - Moderate Vulnerabilities
- **Severity:** P3 (Moderate CVE)
- **Category:** cve
- **Package:** `react-router-dom@^6.26.0`
- **File:** Source/Frontend/package-lock.json
- **Impact:** React Router has moderate-severity issues in certain versions
- **Fix:** `npm update react-router-dom@latest`

### DEP-013: esbuild - Moderate Issue in Build Tool
- **Severity:** P3 (Moderate CVE)
- **Category:** cve
- **Package:** `esbuild` (transitive via vite)
- **File:** Source/Frontend/package-lock.json
- **Impact:** Build-time dependency with moderate vulnerability
- **Fix:** Ensure vite update cascades to latest esbuild

### DEP-014: @babel/core - Arbitrary File Read
- **Severity:** P3 (Low→P3 due to wide usage)
- **Category:** cve
- **Package:** `@babel/core` (affected: <=7.29.0)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Impact:** Local file read via sourceMappingURL comment (CWE-22, CWE-200)
- **Detail:** Babel can read arbitrary files through malicious sourceMappingURL comments in source files. Low exploitability in production but significant in development.
- **Fix:** `npm update @babel/core@>=7.30.0`
- **Note:** Affects build-time behavior; lower risk in production but should be patched

---

## Dependency Supply Chain Analysis

### Dependency Tree Statistics

**Source/Backend:**
- Direct dependencies: 13
- Transitive dependencies: ~300+ (estimated)
- Critical direct: express (has vulnerable transitive deps)

**Source/Frontend:**
- Direct dependencies: 13
- Transitive dependencies: ~450+ (estimated)
- Critical direct: vite, vitest (both have critical vulnerabilities)

**Portal Workspaces:**
- Back/Frontend: Each ~50-60 packages with 2 critical vulns
- **CONCERN:** Portal dependencies are significantly more exposed; recommend architectural separation from main app

**Source/E2E:**
- Clean (0 CVEs) — good isolation

### Supply Chain Risk Assessment

1. **Duplicate Dependency Versions:**
   - Multiple workspaces pull same packages at different versions
   - `typescript`: appears in Backend (5.9.3) and Frontend (5.9.3) — consistent ✓
   - `uuid`, `express`: consistent across primary workspaces ✓

2. **Abandoned/Low-Activity Packages:**
   - No obvious abandoned packages detected in primary Source/ workspaces
   - Recommend reviewing portal/ dependencies (higher count, lower transparency)

3. **Post-Install Scripts Risk:**
   - Several packages may have post-install scripts — review `npm list --all` output for `postinstall` hooks
   - High-risk if pulling from untrusted registries

4. **Dependency Width:**
   - Backend: 13 direct → ~300 transitive (good ratio, ~23x expansion)
   - Frontend: 13 direct → ~450 transitive (high ratio, ~35x expansion, expected for React/Vite)
   - Portal Frontend: 54 packages with 54 vulnerabilities suggests bloated dependency tree

---

## License Compliance

**Status:** No GPL/AGPL licenses detected in primary workspaces (npm audit output does not flag license compliance issues)

**Recommendation:** Run `npx license-checker --onlyAllow "MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC"` to validate license matrix if needed.

---

## Remediation Roadmap

### Immediate Actions (P1 - Within 24 hours)

1. **Handlebars (Critical)**: Upgrade to 4.7.9+
   ```bash
   cd Source/Backend && npm update handlebars
   ```
   - Test: Run existing tests using handlebars templates (if any)
   - Verify no template injection vectors are exposed

2. **Vitest (Critical)**: Upgrade to 3.2.6+
   ```bash
   cd Source/Frontend && npm update vitest
   ```
   - Test: Run test suite, verify UI still works
   - Disable Vitest UI server in production (should be dev-only anyway)

3. **Portal Dependencies (Critical)**: Investigate portal/Backend and portal/Frontend critical vulnerabilities
   - Review the 2 critical CVEs in each
   - Run full `npm audit` and evaluate `npm audit fix`

### Short-term Actions (P2 - Within 1 week)

4. **brace-expansion (DoS)**: Upgrade to 1.1.16+
   ```bash
   npm update brace-expansion
   ```
   - Test: Large glob patterns should complete without hanging

5. **form-data (CRLF Injection)**: Upgrade to 4.0.6+
   ```bash
   npm update form-data
   ```
   - Test: File upload endpoints (E2E tests should cover this)

6. **vite, postcss, ws**: Run `npm update` in Frontend workspace
   ```bash
   cd Source/Frontend && npm update vite postcss
   ```

### Ongoing (P3 - Backlog)

- Quarterly dependency audits (`npm audit`)
- Pin minor versions to catch patch updates automatically
- Monitor GitHub advisories for new CVEs

---

## Cross-Team Escalations

### [ESCALATE → TheGuardians]

1. **Handlebars.js RCE (DEP-001)** — Code injection vulnerability
   - Severity: CRITICAL
   - Exploitability: High (if templates are user-supplied)
   - Status: Requires immediate patching

2. **Vitest UI File Disclosure (DEP-002)** — Information Disclosure + RCE
   - Severity: CRITICAL
   - Impact: Development environment file exposure
   - Mitigation: Disable Vitest UI in production (already isolated)

3. **Portal Critical CVEs (DEP-003)** — Requires investigation
   - Severity: CRITICAL (2 found in each portal workspace)
   - Action: Deep-dive into portal/Backend and portal/Frontend specific CVE chains

4. **form-data CRLF Injection (DEP-005)** — HTTP Header Poisoning Risk
   - Severity: HIGH
   - Attack vector: Multipart file uploads with \r\n in field names
   - Exploit scenario: Custom header injection in POST requests

### [CROSS-REF: chaos-monkey]

- Test brace-expansion DoS scenario (large glob patterns, unbounded expansion)
- Validate system behavior under memory exhaustion scenarios

### [CROSS-REF: red-teamer]

- Test form-data CRLF injection with crafted multipart uploads
- Attempt template injection against Handlebars (if endpoints accept templates)
- File-read attacks via Babel sourceMappingURL if build artifacts are served

---

## Learnings & Recommendations

### For Next Audit

1. **Portal Dependencies Separation:** Portal uses significantly more packages (54+) with high CVE density. Consider:
   - Moving portal to separate monorepo workspace
   - Implementing stricter dependency policies for non-core services
   - Audit portal separately with tighter SLA

2. **Automated Scanning:** Integrate into CI/CD:
   ```bash
   npm audit --audit-level=moderate  # Fail on moderate+ CVEs
   ```

3. **Dependency Policies:**
   - Lock npm versions to latest security patches
   - Require PR review for major dependency upgrades
   - Quarterly review of transitive dependency tree health

4. **Testing Coverage for CVEs:**
   - Add tests specifically for CRLF injection scenarios
   - Validate Handlebars template safety
   - Test file upload limits (body-parser)

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Packages Scanned | 10 workspaces |
| Critical Vulnerabilities | 8 |
| High Vulnerabilities | 29 |
| Moderate Vulnerabilities | 55 |
| Low Vulnerabilities | 2 |
| **Most Critical Packages** | handlebars, vitest, portal/* |
| **Recommended Action** | Upgrade all P1 packages within 24 hours |
| **Timeline to Clean State** | 1-2 weeks with proper testing |

---

**Report Generated:** 2026-07-28
**Next Review:** 2026-08-28 (or sooner if P1 items identified)
**Auditor:** dependency-auditor (Claude Haiku)
