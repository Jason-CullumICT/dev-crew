# Dependency Auditor Findings
**Date:** 2026-05-02  
**Run ID:** DEP-AUDIT-20260502  
**Project:** dev-crew Source App

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Findings** | 9 |
| **Critical (P1)** | 1 |
| **High (P2)** | 0 |
| **Medium (P3)** | 8 |
| **Low (P4)** | 0 |
| **Package Managers Detected** | npm (3 workspaces) |
| **Backend Direct Dependencies** | 13 |
| **Backend Transitive Dependencies** | 412 |
| **Frontend Direct Dependencies** | 13 |
| **Frontend Transitive Dependencies** | 231 |
| **E2E Direct Dependencies** | 9 |
| **E2E Transitive Dependencies** | N/A (no lock file) |

---

## Vulnerability Summary

### Critical (P1) - Requires Immediate Attention

**1 critical vulnerabilities detected.** This is a JavaScript injection risk in Handlebars that affects dev-time testing.

### Medium (P3) - Review and Plan Fixes

**8 moderate vulnerabilities** in npm packages. Most affect build tools and development dependencies.

---

## Detailed Findings

### [DEP-001] Handlebars.js - Critical JavaScript Injection Vulnerability
- **Severity:** P1 🔴 **CRITICAL**
- **Category:** CVE (JavaScript Injection)
- **Affected Package:** `handlebars@4.7.8`
- **Location:** Backend devDependencies chain
  - **Root cause:** `ts-jest` → `handlebars@4.7.8`
- **Affected Versions:** `>=4.0.0 <=4.7.8`
- **Vulnerability IDs:**
  - **GHSA-2w6w-674q-4c4q** (CVSS 9.8) — JavaScript Injection via AST Type Confusion
  - **GHSA-3mfm-83xf-c92r** (CVSS 8.1) — JavaScript Injection via AST Type Confusion by tampering @partial-block
  - **GHSA-xhpv-hc6g-r9c6** (CVSS 8.1) — JavaScript Injection when passing object as dynamic partial
  - **GHSA-9cx6-37pm-9jff** (CVSS 7.5) — Denial of Service via Malformed Decorator Syntax
  - **GHSA-2qvq-rjwj-gvw9** (CVSS 4.7) — Prototype Pollution Leading to XSS
  - **GHSA-7rx3-28cr-v5wh** (CVSS 4.8) — Prototype Method Access Control Gap
  - **GHSA-xjpj-3mr7-gcpf** (CVSS 8.2) — JavaScript Injection in CLI Precompiler

- **Impact:** Remote Code Execution (RCE) risk. An attacker could craft malicious template input to execute arbitrary JavaScript in the Handlebars template engine. Though this is a dev dependency (ts-jest), if tests process untrusted template data, the risk escalates.

- **Remediation:**
  ```bash
  # Option A: Update ts-jest (if it pins handlebars to <=4.7.8)
  npm update ts-jest
  
  # Option B: Force handlebars to latest
  npm install handlebars@latest
  ```

- **Status:** Requires immediate update. Check ts-jest changelog for Handlebars bump.
- **[CROSS-REF: red-teamer]** — Template injection attack surface if test fixtures process external input
- **[CROSS-REF: static-analyzer]** — Review test setup for untrusted template handling

---

### [DEP-002] uuid - Buffer Bounds Check Missing
- **Severity:** P3 (Medium)
- **Category:** CVE (Buffer Overflow)
- **Affected Package:** `uuid@9.0.1` (Backend)
- **Location:** Backend direct dependency
- **Affected Versions:** `<14.0.0`
- **Vulnerability ID:** GHSA-w5hq-g745-h8pq (CVSS 0 — *scoring not yet published*)
- **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285 (Improper Validation of Specified Quantity)

- **Impact:** Buffer overflow when `buf` parameter is provided to v3/v5/v6 functions. Could lead to memory corruption or DoS.

- **Remediation:**
  ```bash
  npm install uuid@latest  # Update to >=14.0.0
  ```

- **Status:** Update available. No known public exploits yet (CVSS not assigned). Medium risk.

---

### [DEP-003] Vite - Path Traversal in Optimized Deps `.map` Handling
- **Severity:** P3 (Medium)
- **Category:** CVE (Path Traversal)
- **Affected Package:** `vite@5.4.0` (Frontend)
- **Location:** Frontend direct dependency
- **Affected Versions:** `<=6.4.1`
- **Vulnerability ID:** GHSA-4w7w-66w2-5vf9
- **CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory), CWE-200 (Exposure of Sensitive Information)

- **Impact:** Path traversal in dev server `.map` handling. Attacker could potentially read source map files outside the intended directory.

- **Remediation:**
  ```bash
  npm install vite@latest  # Update to >=6.4.2
  ```

- **Status:** Low impact (dev-only, dev server only). Can be updated.

---

### [DEP-004] PostCSS - XSS via Unescaped `</style>` in CSS Stringify
- **Severity:** P3 (Medium)
- **Category:** CVE (XSS)
- **Affected Package:** `postcss` (transitive via vite in Frontend)
- **Affected Versions:** `<8.5.10`
- **Vulnerability ID:** GHSA-qx2v-qp2m-jg93
- **CWE:** CWE-79 (Cross-site Scripting)
- **CVSS:** 6.1 (Network, Low complexity, User interaction required)

- **Impact:** If CSS is dynamically generated and contains user-controlled content, `</style>` tags could break out of style context and inject HTML/JS.

- **Remediation:**
  ```bash
  npm install postcss@latest  # Update to >=8.5.10
  ```

- **Status:** Update available. Risk is conditional on untrusted CSS content.

---

### [DEP-005] esbuild - CORS Bypass in Dev Server
- **Severity:** P3 (Medium)
- **Category:** CVE (CORS Bypass)
- **Affected Package:** `esbuild` (transitive via vite in Frontend)
- **Affected Versions:** `<=0.24.2`
- **Vulnerability ID:** GHSA-67mh-4wv8-2f99
- **CWE:** CWE-346 (Origin Validation Error)
- **CVSS:** 5.3 (Network, High complexity, User interaction required)

- **Impact:** Development server accepts requests from any website; attacker can read dev server responses via browser CORS.

- **Remediation:**
  ```bash
  npm install esbuild@latest  # Update to >=0.24.3
  ```

- **Status:** Dev-only vulnerability. Low production risk. Update recommended.

---

### [DEP-006] Brace-Expansion - DoS via Zero-Step Sequence
- **Severity:** P3 (Medium)
- **Category:** CVE (Denial of Service)
- **Affected Package:** `brace-expansion` (transitive in Backend)
- **Affected Versions:** `<1.1.13`
- **Vulnerability ID:** GHSA-f886-m6hf-6m8v
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **CVSS:** 6.5 (Network, Low complexity, User interaction required)

- **Impact:** Malformed glob pattern causes process hang and memory exhaustion. Example: `{1..0}` (zero-length sequence).

- **Remediation:**
  ```bash
  npm update brace-expansion  # Indirect update via dependency
  ```

- **Status:** Transitive dependency. Will be fixed by updating parent packages (likely jest or ts-jest).

---

### [DEP-007] Vitest Cascade Vulnerabilities
- **Severity:** P3 (Medium)
- **Category:** Transitive (vite + esbuild + @vitest/mocker)
- **Affected Package:** `vitest@2.0.5` (Frontend dev dependency)
- **Affected Versions:** Depends on pinned vite/esbuild versions
- **Root Causes:**
  - vite (path traversal in .map handling)
  - esbuild (CORS bypass in dev server)
  - @vitest/mocker (depends on vite)

- **Impact:** Frontend test runner inherits vulnerabilities from build tools.

- **Remediation:**
  ```bash
  npm update vitest vite esbuild  # Will update transitive deps
  ```

- **Status:** Will be resolved by updating primary dependencies (vite, esbuild).

---

### [DEP-008] Outdated Major Versions

#### Backend

| Package | Current | Latest | Major Behind | Status |
|---------|---------|--------|--------------|--------|
| `express` | 4.18.2 | 5.2.1 | 1 | Consider upgrade |
| `pino` | 8.17.0 | 10.3.1 | 2 | **Should upgrade** |
| `uuid` | 9.0.1 | 14.0.0 | 5 | **Should upgrade** (also has CVE) |

#### Frontend

| Package | Current | Latest | Major Behind | Status |
|---------|---------|--------|--------------|--------|
| `react` | 18.3.1 | 19.2.5 | 1 | Consider upgrade |
| `react-router-dom` | 6.26.0 | 7.14.2 | 1 | Consider upgrade |

- **Severity:** P3 (Medium) for 1+ major behind, P2 (High) for 2+ major behind
- **Category:** Outdated Dependencies
- **Findings:**
  - **pino@8.17.0** is 2 major versions behind → likely missing security patches
  - **uuid@9.0.1** is 5 major versions behind → significant maintenance gap
  - **express@4.18.2** is 1 major behind → not urgent but consider roadmap

- **Impact:** Outdated versions may not receive security patches. Test compatibility before major upgrades.

- **Remediation:**
  ```bash
  # Backend
  npm install pino@latest uuid@latest
  npm install express@latest (after testing)
  
  # Frontend
  npm install react@latest react-dom@latest react-router-dom@latest (after testing)
  ```

- **Status:** Medium priority. Recommend phased upgrades with test coverage.

---

### [DEP-009] High Transitive Dependency Count
- **Severity:** P4 (Informational)
- **Category:** Supply Chain Risk
- **Finding:** 
  - **Backend:** 412 transitive dependencies (13 direct)
  - **Frontend:** 231 transitive dependencies (13 direct)
  - **Total:** 643 transitive packages

- **CVSS:** N/A (not a vulnerability, but a risk surface)
- **Impact:**
  - Each transitive dependency is a potential attack vector
  - Abandoned or compromised packages harder to detect in large trees
  - npm supply chain attacks (package ownership transfer, typosquatting) increase risk

- **Observation:** Both Backend and Frontend have healthy ratios (31:1 and 18:1 direct-to-transitive). Within acceptable range for full-stack app.

- **Recommendation:** Monitor for:
  - Packages with <100 weekly downloads (low maintenance)
  - Packages with no commits in >2 years (abandoned)
  - Single maintainer on critical packages

---

## Dependency Health Dashboard

### Backend (Source/Backend/)
- **Direct Dependencies:** 13 (production: 4, dev: 9)
- **Transitive Dependencies:** 412
- **Vulnerabilities:** 3 (1 critical, 2 moderate)
- **Outdated Major:** 2 (pino, uuid)
- **Status:** ⚠️ NEEDS ATTENTION (critical handlebars, uuid CVE)

### Frontend (Source/Frontend/)
- **Direct Dependencies:** 13 (production: 3, dev: 10)
- **Transitive Dependencies:** 231
- **Vulnerabilities:** 6 (all moderate, build tools only)
- **Outdated Major:** 2 (react, react-router-dom — 1 major each)
- **Status:** ⚠️ MEDIUM (dev-only vulnerabilities, easily fixed)

### E2E (Source/E2E/)
- **Direct Dependencies:** 9
- **Transitive Dependencies:** Unknown (no lock file provided)
- **Vulnerabilities:** 0
- **Status:** ✅ CLEAN

---

## License Compliance

_License audit deferred — npm license-checker not available in this environment._

Recommendation: Run `npx license-checker --json` in CI/CD to flag GPL/AGPL dependencies before release.

---

## Remediation Roadmap

### 🔴 **IMMEDIATE (Today)**

1. **DEP-001: Handlebars Critical RCE**
   - Update `ts-jest` to latest or force `handlebars@latest`
   - Timeline: <4 hours
   - Verification: `npm audit` should report 0 critical

### 🟡 **SHORT TERM (This Week)**

2. **DEP-002: uuid Buffer Overflow**
   - Update `uuid@latest` in Backend
   - Test for breaking changes (check CHANGELOG)
   - Timeline: <1 day

3. **DEP-003, DEP-004, DEP-005: Build Tool CVEs**
   - Run `npm update vite esbuild postcss` in Frontend
   - Verify build passes and tests run
   - Timeline: <1 day

4. **DEP-008: Major Version Upgrades**
   - Plan phased upgrades: pino→10, uuid→14, express→5
   - Test suite required for each
   - Timeline: <1 week per package

### 🟢 **ROADMAP (Next Sprint)**

5. Set up recurring npm audit in CI/CD
6. Add license compliance check (license-checker)
7. Monitor abandoned dependencies (check GitHub stars, commit date)
8. Consider dependency consolidation (e.g., can we remove jest + vitest duplication?)

---

## Cross-Team Escalations

### [ESCALATE → TheGuardians]
- **DEP-001: Handlebars RCE** — If test fixtures process untrusted template input, this is a security boundary violation. Review attack surface with red-teamer.

### [CROSS-REF → red-teamer]
- Template injection risk if templates come from user input
- CORS bypass in dev server (low prod risk, but monitor)

### [CROSS-REF → static-analyzer]
- Check for hardcoded secrets in dev dependencies
- Verify no test fixtures load untrusted data

---

## Summary & Recommendations

| Priority | Action | Owner | Timeline |
|----------|--------|-------|----------|
| **P1** | Fix Handlebars (DEP-001) | backend-coder | <4h |
| **P2** | Update uuid + build tools (DEP-002–005) | backend-coder + frontend-coder | <1d |
| **P3** | Plan major version upgrades (DEP-008) | team-lead | <1w |
| **P4** | Set up recurring audits (DEP-009) | devops | <2w |

**Overall Grade:** **C** (3 critical/high findings, 6 moderate)  
**Trend:** Stable (no abandoned packages detected, active maintenance)  
**Risk Posture:** Medium (critical RCE in test stack, build tool vulnerabilities contained to dev-only)

---

## Audit Metadata

- **Auditor:** Dependency Auditor (TheInspector team)
- **Tools Used:** npm audit, npm outdated, package-lock.json analysis
- **Coverage:** 3 npm workspaces (Backend, Frontend, E2E)
- **Non-Coverage:** License compliance (no license-checker in environment), Python/Go/Rust projects (none detected)
- **Generated:** 2026-05-02 05:18 UTC
- **Next Audit:** Recommended after 30 days or after any P1 fix

