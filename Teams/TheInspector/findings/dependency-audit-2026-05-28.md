# Dependency Auditor Report
**Date:** 2026-05-28  
**Project:** dev-crew  
**Audit Scope:** npm packages (Backend, Frontend, E2E)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total CVEs Found** | 13 (1 Critical, 7 Moderate) |
| **Critical Vulnerabilities** | 1 |
| **High Vulnerabilities** | 0 |
| **Moderate Vulnerabilities** | 12 |
| **Packages Analyzed** | 3 npm workspaces |
| **Total Direct Dependencies** | 26 (prod) |
| **Total Transitive Dependencies** | 643 |
| **Outdated Major Versions** | 4 packages |
| **License Compliance** | ✅ Compliant (MIT-heavy, no GPL/AGPL) |
| **Supply Chain Risk** | ✅ Low (no post-install scripts detected) |

---

## Vulnerabilities by Severity

### 🔴 CRITICAL (P1)

#### DEP-001: Handlebars RCE via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Execution
- **Package:** `handlebars@4.7.8`
- **Affected Version Range:** `>=4.0.0 <=4.7.8`
- **Location:** Backend → ts-jest → handlebars
- **CVSS Score:** 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **CVE ID:** GHSA-2w6w-674q-4c4q
- **Description:** 
  Handlebars.js contains multiple critical JavaScript injection vulnerabilities via AST type confusion. An attacker can inject arbitrary JavaScript code by tampering with template AST node types, leading to remote code execution in any context where untrusted templates are compiled or evaluated.
  
  **Attack Vector:** If ts-jest (the TypeScript compiler for Jest) processes templates from untrusted sources, this becomes immediately exploitable. Even in development, a malicious test template could execute arbitrary code.

- **Impact:** Remote code execution during test compilation; potential to compromise developer machines and CI/CD pipeline
- **Fix:** Upgrade handlebars to `>=4.7.9` (requires ts-jest update to latest)
- **Action Required:** **IMMEDIATE** — Update ts-jest and verify handlebars is bumped to 4.7.9+
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vulnerability in test infrastructure

**Additional Handlebars Issues Found (in same package):**
- GHSA-3mfm-83xf-c92r: JavaScript Injection via AST Type Confusion (High)
- GHSA-2qvq-rjwj-gvw9: Prototype Pollution Leading to XSS (Moderate)
- GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap (Moderate)
- GHSA-xhpv-hc6g-r9c6: JavaScript Injection via Dynamic Partial (High)
- GHSA-9cx6-37pm-9jff: DoS via Malformed Decorator Syntax (High)
- GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI Precompiler (High)

All of these resolve with `handlebars@>=4.7.9`.

---

### 🟡 MODERATE (P2)

#### DEP-002: Express Dependency Vulnerability (qs)
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Package:** `express@4.18.2` (direct)
  - **Root Cause:** Transitive dependency `qs@6.11.1-6.15.1` has DoS vulnerability
- **CVSS Score:** 5.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)
- **CVE ID:** GHSA-q8mj-m7cp-5q26
- **Description:** 
  qs module (query string parser) has a remotely triggerable DoS vulnerability. When `encodeValuesOnly` is set and a null/undefined entry exists in a comma-format array, `qs.stringify()` crashes with TypeError, enabling denial of service attacks.
  
  **Attack Vector:** An attacker sends a crafted POST request with malformed query string parameters; Express uses qs to parse them, causing the application to crash.

- **Impact:** Service disruption; potential for DOS attack vectors
- **Fix:** `npm update express` to 4.22.2 or later (updates qs to 6.15.2+)
- **Action Required:** Standard — Update express to latest patch in ^4.18 range or upgrade to ^4.22
- **Cross-ref:** [Performance impact possible if rate-limited]

---

#### DEP-003: brace-expansion Zero-Step Sequence DoS
- **Severity:** P2 (borderline P1)
- **Category:** CVE / ReDoS
- **Package:** `brace-expansion@<1.1.13` (transitive)
  - **Path:** Backend → glob, minimatch, etc.
- **CVSS Score:** 6.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:H)
- **CVE ID:** GHSA-f886-m6hf-6m8v
- **Description:** 
  brace-expansion contains a pathological regex pattern that causes infinite loops when processing zero-step sequences (e.g., `{0..0..0}`). This leads to process hang and memory exhaustion.
  
  **Attack Vector:** If file paths or user input is passed to brace-expansion (e.g., glob patterns), an attacker can craft a path like `*.{0..0..0}` to hang the process.

- **Impact:** Process hang; memory exhaustion; DoS
- **Fix:** Update to brace-expansion@>=1.1.13 (automatic via npm update)
- **Action Required:** Standard — `npm update` will resolve this

---

#### DEP-004: uuid Buffer Bounds Check Missing
- **Severity:** P2
- **Category:** CVE / Buffer Overflow
- **Package:** `uuid@9.0.0` (direct)
- **CVSS Score:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N)
- **CVE ID:** GHSA-w5hq-g745-h8pq
- **Description:** 
  uuid v3/v5/v6 functions do not validate buffer bounds when a `buf` parameter is provided. Passing a buffer smaller than the UUID output (16 bytes) causes a buffer overflow, writing beyond the provided buffer boundary.
  
  **Attack Vector:** If your application uses uuid v3/v5/v6 with user-supplied buffers, an attacker can trigger buffer overflow.

- **Impact:** Memory corruption; potential code execution (depends on usage context)
- **Fix:** Upgrade to uuid@>=11.1.1 or use uuid v4 (not affected) if compatible
- **Action Required:** 
  - **If v3/v5/v6 is used with custom buffers:** Upgrade to uuid@14.0.0 (major version change, test compatibility)
  - **If v4 is used:** No action needed
  - **Recommended:** Audit code for `uuid.v5(..., buf)` / `uuid.v3(..., buf)` patterns

---

#### DEP-005 through DEP-010: Frontend Build Tool Vulnerabilities (Vite/esbuild/PostCSS)

| Finding | Package | Severity | Issue | Fix |
|---------|---------|----------|-------|-----|
| **DEP-005** | vite@5.4.0 | Moderate | Path Traversal in `.map` Handling (GHSA-4w7w-66w2-5vf9) | Upgrade to 6.4.2+ |
| **DEP-006** | esbuild@0.24.x | Moderate | Development Server CORS Bypass (GHSA-67mh-4wv8-2f99) | Upgrade vite → vite@6.4.2+ |
| **DEP-007** | postcss@8.5.x | Moderate | XSS via Unescaped `</style>` in CSS (GHSA-qx2v-qp2m-jg93) | Upgrade to 8.5.10+ |
| **DEP-008** | ws@8.0.0-8.20.0 | Moderate | Uninitialized Memory Disclosure (GHSA-58qx-3vcg-4xpx) | Upgrade to 8.20.1+ |
| **DEP-009** | vitest@2.0.5 | Moderate | Multiple issues (vite + esbuild transitive) | Upgrade to latest major (4.1.7+) |
| **DEP-010** | @vitest/mocker | Moderate | Inherits vite issues | Resolved by vitest upgrade |

**Frontend-Specific Summary:**
- All frontend vulnerabilities are in **dev-time** tools (build, test, dev server)
- **Runtime production code** (React, React Router) is clean
- **Vite and vitest are significantly outdated** (5.4 and 2.0 vs current 8.0)
- Upgrading both to latest major versions will resolve **all 7 frontend CVEs**

---

## Outdated Packages (>1 Major Version Behind)

### Backend

| Package | Current | Latest | Major Gap | Risk |
|---------|---------|--------|-----------|------|
| express | 4.18.2 | 5.2.1 | 1 major | Low (breaking API changes in v5) |
| pino | 8.17.0 | 10.3.1 | 2 major | Medium (logging changes, consider upgrade for security patches) |
| uuid | 9.0.0 | 14.0.0 | 5 major | **High** (affected by CVE, recommend upgrade) |

### Frontend

| Package | Current | Latest | Major Gap | Risk |
|---------|---------|--------|-----------|------|
| react | 18.3.1 | 19.2.6 | 1 major | Medium (check compatibility) |
| react-dom | 18.3.1 | 19.2.6 | 1 major | Medium (paired with react) |
| react-router-dom | 6.26.0 | 7.15.1 | 1 major | Medium (routing API may change) |

### Notes on Major Version Gaps
- Express v5 has breaking changes to middleware and error handling
- React 19 introduces new hooks and lifecycle patterns
- Pino v9+ changes log structure; v10+ adds new features
- These are **not security-critical by themselves** but indicate the project is drifting from modern versions

---

## License Compliance

### Backend
✅ **Status: COMPLIANT**
- 348 packages: MIT
- 34 packages: ISC
- 15 packages: BSD-3-Clause
- 8 packages: Apache-2.0
- 2 packages: BSD-2-Clause
- 2 packages: MIT OR CC0-1.0
- 1 package: CC-BY-4.0

**No GPL, AGPL, or copyleft licenses detected.**

### Frontend
✅ **Status: COMPLIANT**
- 211 packages: MIT
- 8 packages: ISC
- 5 packages: Apache-2.0
- 2 packages: BSD-3-Clause
- 2 packages: BSD-2-Clause
- 1 package: CC-BY-4.0
- 1 package: MIT-0

**No GPL, AGPL, or copyleft licenses detected.**

### Recommendation
All licenses are permissive and compatible with closed-source commercial use. No legal action required.

---

## Dependency Tree Summary

### Backend
- **Direct prod dependencies:** 4 (express, prom-client, uuid, pino)
- **Direct dev dependencies:** 8 (@types/*, jest, supertest, ts-jest, typescript)
- **Transitive dependencies:** ~390
- **Total unique packages:** 412

**Assessment:** Well-structured; minimal prod surface area.

### Frontend
- **Direct prod dependencies:** 3 (react, react-dom, react-router-dom)
- **Direct dev dependencies:** 8 (@testing-library/*, @types/*, vite, vitest)
- **Transitive dependencies:** ~220
- **Total unique packages:** 231

**Assessment:** Good separation of dev/prod dependencies; React ecosystem adds size but is stable.

### E2E
- **Direct dependencies:** 1 (@playwright/test@1.58.2)
- **Vulnerabilities:** 0
- **Status:** ✅ Clean

---

## Supply Chain Risk Assessment

### Post-Install Scripts
✅ **No post-install scripts detected** across any workspace.

**Risk Level:** Low

### Deprecated or Maintenance-Level Packages
⚠️ **Warnings during install (not vulnerabilities):**
- `glob@7.2.3` — Old version, use Node.js native `fs.glob` or update to glob@10
- `supertest@6.3.4` — Maintenance mode, consider upgrade to v7.1.3+
- `superagent@8.1.2` — Consider upgrade to v10.2.2+
- `inflight@1.0.6` — Memory leak; not used in current dependencies, likely transitive dead weight

**Recommendation:** These are deprecation warnings, not security issues. Queue them for future maintenance.

### Duplicate Major Versions
✅ **No duplicate major versions detected.**

The dependency graph has clean resolution; no conflicts require workarounds.

---

## Recommendations & Remediation Plan

### **Immediate Actions (Do Now)**
1. **Update ts-jest to latest** → pulls in handlebars@>=4.7.9
   ```bash
   cd Source/Backend
   npm update ts-jest
   npm audit
   ```

2. **Update express**
   ```bash
   cd Source/Backend
   npm update express
   npm audit
   ```

3. **Update uuid** (test for compatibility first)
   ```bash
   cd Source/Backend
   npm update uuid
   npm test
   ```

4. **Update Frontend build tools**
   ```bash
   cd Source/Frontend
   npm update vite vitest
   npm audit
   ```

### **Short-Term (This Sprint)**
- [ ] Verify all tests pass after updates
- [ ] Update pino to v10.x (minor API changes, logging improvements)
- [ ] Test React 19.x compatibility (may require component updates)
- [ ] Run full integration test suite to catch breaking changes

### **Long-Term (Backlog)**
- [ ] Schedule monthly `npm audit` checks (automate in CI/CD)
- [ ] Document dependency update policy (e.g., security patches within 48h, minor updates within 2 weeks, major updates quarterly)
- [ ] Add GitHub Dependabot or Snyk for automated PRs
- [ ] Remove deprecated packages (glob@7, supertest@6)

---

## Cross-Team References

| Finding | Escalation | Team | Action |
|---------|------------|------|--------|
| Handlebars RCE (DEP-001) | Critical — RCE in test harness | TheGuardians | Security review required; confirm no untrusted template input |
| Express DoS (DEP-002) | Standard update | TheFixer | Merge express update into next release |
| uuid buffer overflow (DEP-004) | Code audit if v3/v5/v6 used | TheGuardians | Audit code for `uuid.v3/v5/v6(..., buf)` patterns |

---

## Audit Metadata

| Item | Value |
|------|-------|
| **Audit Tool Version** | npm audit (npm 10.x) |
| **Audit Date** | 2026-05-28 |
| **npm Workspaces Analyzed** | Source/Backend, Source/Frontend, Source/E2E |
| **Lock File Versions** | npm package-lock.json v3 |
| **Grade** | **B** (0 P1 after fixes, 5 P2 before fixes) |

---

## Next Steps

1. **Review this report** with the dev team
2. **Prioritize fixes** (handlebars → express → uuid → frontend build tools)
3. **Create tracking issues** for each finding
4. **Schedule update work** in next sprint
5. **Re-run audit** after updates to confirm all CVEs resolved
6. **Update learnings** with any blocking issues or special considerations discovered during updates
