# Dependency Auditor Findings — 2026-07-03

## Executive Summary

**Grade:** C (multiple critical/high CVEs require immediate remediation)

**Audit Scope:**
- Backend: `Source/Backend/` (npm) — 4 direct, 412 transitive dependencies
- Frontend: `Source/Frontend/` (npm) — 3 direct, 231 transitive dependencies
- E2E: `Source/E2E/` (npm) — 4 direct, 5 transitive dependencies

**Total CVE Vulnerabilities:** 20 across all workspaces
- **Critical:** 2 (requires immediate patch)
- **High:** 4 (patch within 1 week)
- **Moderate:** 10 (patch within 2 weeks)
- **Low:** 2 (can be addressed in next release)

**Key Risk:**
- Backend: Handlebars.js critical JavaScript injection (used indirectly)
- Frontend: Vitest critical arbitrary file read vulnerability (UI server)
- Both: Form-data CRLF injection (HTTP multipart handling)

---

## Package Managers Detected

| Manager | Location | Status |
|---------|----------|--------|
| npm     | Source/Backend | ✓ Lock file present |
| npm     | Source/Frontend | ✓ Lock file present |
| npm     | Source/E2E | ✓ Lock file present |

---

## Critical Findings (P1)

### DEP-001: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** P1 (Critical)
- **Category:** CVE / JavaScript Injection
- **Package:** handlebars@4.7.8
- **File:** Source/Backend/package-lock.json
- **Direct Dependency:** No (transitive via unknown path)
- **Affected Versions:** >=4.0.0 <=4.7.8
- **CVE References:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8 critical)
  - GHSA-3mfm-83xf-c92r (CVSS 8.1 high)
  - GHSA-2qvq-rjwj-gvw9 (CVSS 4.7 moderate)
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1 high)
  - GHSA-9cx6-37pm-9jff (CVSS 7.5 high)
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2 high)
  - GHSA-7rx3-28cr-v5wh (CVSS 4.8 moderate)
  - GHSA-442j-39wm-28r2 (CVSS 3.7 low)
- **Detail:** Multiple JS injection vulnerabilities in template compilation and AST processing. Can lead to arbitrary code execution via template manipulation.
- **Fix:** Update handlebars to >=4.7.9
  ```bash
  cd Source/Backend && npm update handlebars
  ```
- **Verify:** Run `npm audit` to confirm remediation
- **Cross-ref:** [ESCALATE → TheGuardians] JavaScript injection is exploitable if backend processes untrusted templates

---

### DEP-002: Vitest UI Server Arbitrary File Read & Execution
- **Severity:** P1 (Critical)
- **Category:** CVE / Information Disclosure / Code Execution
- **Package:** vitest@3.2.5
- **File:** Source/Frontend/package-lock.json
- **Direct Dependency:** Yes (devDependency)
- **Affected Versions:** <3.2.6
- **CVE Reference:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **CWE:** CWE-862 (Missing Authorization)
- **Detail:** When Vitest UI server is listening, an attacker can read and execute arbitrary files without authentication. Critical for development environments that expose the UI server.
- **Fix:** Update vitest to >=3.2.6 (major version bump required)
  ```bash
  cd Source/Frontend && npm update vitest
  ```
- **Impact:** Affects development/testing workflows; production should not expose UI server
- **Verify:** `npm audit` and ensure vitest >=3.2.6

---

## High Severity Findings (P2)

### DEP-003: form-data CRLF Injection via Multipart Field Names
- **Severity:** P2 (High)
- **Category:** CVE / HTTP Header Injection
- **Package:** form-data@4.0.5
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Direct Dependency:** No (transitive)
- **Affected Versions:** >=4.0.0 <4.0.6
- **CVE Reference:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **CWE:** CWE-93 (CRLF Injection)
- **Detail:** Multipart form-data field names and filenames not properly escaped, allowing attacker to inject CRLF sequences into HTTP headers. Can lead to header injection attacks.
- **Fix:** Update form-data to >=4.0.6
  ```bash
  cd Source/Backend && npm update form-data
  cd Source/Frontend && npm update form-data
  ```
- **Verify:** `npm audit`

---

### DEP-004: Vite fs.deny Bypass on Windows Alternate Paths
- **Severity:** P2 (High)
- **Category:** CVE / Path Traversal
- **Package:** vite@6.4.2
- **File:** Source/Frontend/package-lock.json
- **Direct Dependency:** Yes
- **Affected Versions:** <=6.4.2
- **CVE Reference:** GHSA-fx2h-pf6j-xcff (CVSS unknown, reported high)
- **CWE:** CWE-22, CWE-200 (Path Traversal / Information Disclosure)
- **Detail:** On Windows, Vite's server.fs.deny configuration can be bypassed using alternate file paths (UNC paths, short names). Allows access to files outside project root.
- **Fix:** Update vite to >=6.4.3
  ```bash
  cd Source/Frontend && npm update vite
  ```
- **Note:** Major version update may be required. Check compatibility with React 18 and build configuration.
- **Verify:** `npm audit` and test dev server startup

---

### DEP-005: ws WebSocket Memory Exhaustion DoS
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** ws@8.20.1
- **File:** Source/Frontend/package-lock.json
- **Direct Dependency:** No (transitive via vite/vite-node)
- **Affected Versions:** >=8.0.0 <8.21.0
- **CVE Reference:** GHSA-96hv-2xvq-fx4p (CVSS 7.5)
- **CWE:** CWE-400, CWE-770 (Resource Exhaustion)
- **Detail:** Attacker can cause memory exhaustion and DoS by sending tiny fragments and data chunks in WebSocket connections.
- **Fix:** Update ws to >=8.21.0 (indirect; update vite/vitest to resolve)
  ```bash
  cd Source/Frontend && npm update vitest  # will cascade update ws
  ```
- **Verify:** `npm audit`

---

## Moderate Severity Findings (P3)

### DEP-006: Express DoS via qs Query String Parsing
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Package:** express@4.22.1 (affected) / qs@6.15.1
- **File:** Source/Backend/package-lock.json
- **Direct Dependency:** Yes (express)
- **Affected Versions:** express 4.21.0-4.22.1, qs 6.11.1-6.15.1
- **CVE Reference:** GHSA-q8mj-m7cp-5q26 (CVSS 5.3)
- **CWE:** CWE-476 (Null Pointer Dereference)
- **Detail:** qs.stringify crashes with TypeError when processing null/undefined entries in comma-format arrays with encodeValuesOnly=true. Can cause Express request handling to crash.
- **Fix:** Update express to >=4.22.2
  ```bash
  cd Source/Backend && npm update express
  ```
- **Verify:** `npm audit`

---

### DEP-007: uuid Buffer Bounds Check Missing
- **Severity:** P3 (Moderate)
- **Category:** CVE / Buffer Overflow
- **Package:** uuid@9.0.1
- **File:** Source/Backend/package-lock.json
- **Direct Dependency:** Yes
- **Affected Versions:** <11.1.1
- **CVE Reference:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **CWE:** CWE-787, CWE-1285 (Out-of-bounds write)
- **Detail:** When buf parameter is provided to uuid v3/v5/v6 generators, missing bounds check allows writing beyond buffer boundaries.
- **Fix:** Update uuid to >=11.1.1 (major version bump, check for breaking changes)
  ```bash
  cd Source/Backend && npm install uuid@latest --save
  ```
- **Breaking Change:** uuid v11+ has API changes; verify application usage
- **Verify:** Run full test suite after update

---

### DEP-008: brace-expansion DoS via Zero-Step Sequences
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Package:** brace-expansion@<1.1.13 (transitive, used by glob patterns)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Affected Versions:** <1.1.13
- **CVE Reference:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **CWE:** CWE-400 (Resource Exhaustion)
- **Detail:** Zero-step brace sequences cause infinite loops leading to process hang and memory exhaustion. Example: `{1..0}` triggers the bug.
- **Fix:** Update transitive dependency via parent packages
  ```bash
  npm update  # Should cascade to latest brace-expansion
  ```
- **Verify:** `npm audit`

---

### DEP-009: PostCSS XSS via </style> Unescaping
- **Severity:** P3 (Moderate)
- **Category:** CVE / Cross-Site Scripting
- **Package:** postcss@<8.5.10
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** <8.5.10
- **CVE Reference:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **CWE:** CWE-79 (Improper Neutralization of Input in Output)
- **Detail:** PostCSS stringify output doesn't properly escape `</style>` tags in CSS output, allowing XSS if output is inserted into HTML style elements.
- **Fix:** Update postcss to >=8.5.10
  ```bash
  cd Source/Frontend && npm update postcss
  ```
- **Verify:** `npm audit`

---

### DEP-010: js-yaml DoS via Quadratic Complexity Merge Keys
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Package:** js-yaml@<3.15.0
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** <3.15.0
- **CVE Reference:** GHSA-h67p-54hq-rp68 (CVSS 5.3)
- **CWE:** CWE-407 (Algorithmic Complexity)
- **Detail:** YAML parsing with repeated merge key aliases causes quadratic-complexity parsing leading to DoS on large YAML files.
- **Fix:** Update js-yaml to >=3.15.0
  ```bash
  cd Source/Backend && npm update js-yaml
  ```
- **Verify:** `npm audit`

---

### DEP-011: React Router Open Redirect via Protocol-Relative URLs
- **Severity:** P3 (Moderate)
- **Category:** CVE / Open Redirect
- **Package:** react-router@6.30.3
- **File:** Source/Frontend/package-lock.json
- **Direct Dependency:** react-router-dom@6.30.3
- **Affected Versions:** >=6.7.0 <6.30.4
- **CVE Reference:** GHSA-2j2x-hqr9-3h42 (CVSS 0, reported moderate)
- **CWE:** CWE-601 (Open Redirect)
- **Detail:** Same-origin redirect with path starting `//` (protocol-relative URL) causes open redirect, allowing attacker to redirect to arbitrary external site.
- **Fix:** Update react-router-dom to >=6.30.4
  ```bash
  cd Source/Frontend && npm update react-router-dom
  ```
- **Verify:** `npm audit`

---

### DEP-012: @babel/core Arbitrary File Read via sourceMappingURL
- **Severity:** P3 (Low)
- **Category:** CVE / Information Disclosure
- **Package:** @babel/core@<=7.29.0
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Affected Versions:** <=7.29.0
- **CVE Reference:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **CWE:** CWE-22, CWE-200 (Path Traversal)
- **Detail:** Babel processes sourceMappingURL comments in generated code, allowing arbitrary file read on the local filesystem if compiled code is processed with malicious source maps.
- **Fix:** Update @babel/core to >7.29.0
  ```bash
  npm update @babel/core
  ```
- **Verify:** `npm audit`

---

## Outdated Major Versions (P3 - Supply Chain Risk)

### DEP-013: Express 4.x (Behind 5.x)
- **Severity:** P3
- **Category:** Outdated major version
- **Package:** express@4.18.2
- **File:** Source/Backend/package.json
- **Current:** 4.18.2
- **Latest:** 5.2.1
- **Status:** 1 major version behind
- **Risk:** Express 5.0+ has security improvements; staying on 4.x misses important patches
- **Recommendation:** Plan migration to express 5.x (breaking changes likely)

---

### DEP-014: Pino 8.x (Behind 10.x)
- **Severity:** P3
- **Category:** Outdated major version
- **Package:** pino@8.17.0
- **File:** Source/Backend/package.json
- **Current:** 8.17.0
- **Latest:** 10.3.1
- **Status:** 2 major versions behind
- **Risk:** Missing 2+ years of security patches and performance improvements
- **Recommendation:** Plan phased migration to pino 10.x

---

### DEP-015: UUID 9.x (Behind 14.x)
- **Severity:** P3
- **Category:** Outdated major version
- **Package:** uuid@9.0.1
- **File:** Source/Backend/package.json
- **Current:** 9.0.1
- **Latest:** 14.0.1
- **Status:** 5 major versions behind (CRITICAL SUPPLY CHAIN RISK)
- **Risk:** Combined with DEP-007 (buffer overflow), this requires immediate update
- **Recommendation:** Update to >=11.1.1 minimum (buffer fix), then plan to 14.x

---

### DEP-016: React 18.x (Behind 19.x)
- **Severity:** P3
- **Category:** Outdated major version
- **Package:** react@18.3.1
- **File:** Source/Frontend/package.json
- **Current:** 18.3.1
- **Latest:** 19.2.7
- **Status:** 1 major version behind
- **Risk:** React 19 has performance improvements and bug fixes
- **Recommendation:** Test compatibility with 19.x; breaking changes present

---

### DEP-017: React Router DOM 6.x (Behind 7.x)
- **Severity:** P3
- **Category:** Outdated major version
- **Package:** react-router-dom@6.26.0
- **File:** Source/Frontend/package.json
- **Current:** 6.26.0
- **Latest:** 7.18.1
- **Status:** 1 major version behind
- **Risk:** Includes fix for DEP-011 (open redirect); 7.x has additional security improvements
- **Recommendation:** Update to >=6.30.4 at minimum; plan 7.x migration

---

### DEP-018: Vite 5.x (Behind 8.x)
- **Severity:** P3
- **Category:** Outdated major version
- **Package:** vite@5.4.0
- **File:** Source/Frontend/package.json
- **Current:** 5.4.0
- **Latest:** 8.1.3
- **Status:** 3 major versions behind
- **Risk:** Multiple security patches in 6.x, 7.x, 8.x (includes DEP-004 fixes)
- **Recommendation:** Plan migration; breaking changes likely

---

## License Compliance Analysis

### License Distribution
- **MIT:** 348 packages (safe)
- **ISC:** 34 packages (compatible, BSD-like)
- **BSD-3-Clause:** 15 packages (compatible)
- **Apache-2.0:** 8 packages (compatible)
- **BSD-2-Clause:** 2 packages (compatible)
- **Other:** 5 packages

### Finding: No GPL/AGPL Licenses Detected
✓ **Status:** PASS — No viral licenses found in dependency tree.

---

## Dependency Tree Analysis

| Project | Direct | Transitive | Total | Risk |
|---------|--------|-----------|-------|------|
| Backend | 4 | 408 | 412 | 9 CVEs |
| Frontend | 3 | 228 | 231 | 11 CVEs |
| E2E | 4 | 1 | 5 | 0 CVEs |
| **Total** | **11** | **637** | **648** | **20 CVEs** |

### Supply Chain Risk Assessment

**Finding DEP-019: Large Transitive Dependency Tree**
- **Category:** Supply Chain risk (informational)
- **Backend:** 408 transitive dependencies = 102x direct dependencies
- **Frontend:** 228 transitive dependencies = 76x direct dependencies
- **Risk Level:** Medium (>100 transitive deps = expanded attack surface)
- **Recommendation:** Audit dependency usage; consider reducing unnecessary deps

---

## Abandoned/Deprecated Packages

- **Status:** No packages detected with >2 years without updates in active ecosystem packages
- **Note:** Check npm registry deprecation flags periodically

---

## Remediation Roadmap

### Immediate (This Week)
1. **Backend DEP-001:** Update handlebars to >=4.7.9
2. **Frontend DEP-002:** Update vitest to >=3.2.6
3. **All DEP-003:** Update form-data to >=4.0.6
4. **Backend DEP-006:** Update express to >=4.22.2

### Short-term (Next 2 Weeks)
5. **Frontend DEP-004:** Update vite to >=6.4.3 (test for breaking changes)
6. **Frontend DEP-005:** Update ws to >=8.21.0 (via vitest update)
7. **Backend DEP-007:** Update uuid to >=11.1.1 (test for breaking changes)
8. **All DEP-008:** Update brace-expansion to >=1.1.13 (cascade via npm update)
9. **Frontend DEP-009:** Update postcss to >=8.5.10
10. **Frontend DEP-011:** Update react-router-dom to >=6.30.4

### Medium-term (1-2 Months)
11. **Backend DEP-010:** Update js-yaml to >=3.15.0
12. **All DEP-012:** Update @babel/core to >7.29.0
13. **Plan DEP-013:** Express 4.x → 5.x migration
14. **Plan DEP-014:** Pino 8.x → 10.x migration
15. **Plan DEP-015:** UUID 9.x → 14.x migration
16. **Plan DEP-016:** React 18.x → 19.x migration
17. **Plan DEP-017:** React Router 6.x → 7.x migration
18. **Plan DEP-018:** Vite 5.x → 8.x migration

---

## Cross-Referencing

### [ESCALATE → TheGuardians]
- **DEP-001** (Handlebars.js JavaScript injection) — Exploitable if backend processes untrusted templates; coordinate exploit scenario assessment
- **DEP-002** (Vitest arbitrary file read) — Only critical if UI server exposed in production/CI; verify dev-only usage
- **DEP-003** (form-data CRLF injection) — Exploitable if multipart form submission is used; check for untrusted filename/field handling
- **DEP-004** (Vite path traversal) — Windows-specific; assess if dev servers run on Windows
- **DEP-011** (React Router open redirect) — Exploitable if app uses same-origin redirect with user-controlled paths

### [SEE TheGuardians static-analyzer]
- No hardcoded secrets detected in dependency manifests
- No suspicious post-install scripts found

---

## Verification Steps

**For each CVE fix:**

```bash
# Backend
cd Source/Backend
npm audit fix  # Auto-patch minor/patch versions
npm audit      # Verify critical/high CVEs are resolved
npm test       # Run test suite
git diff package-lock.json

# Frontend
cd Source/Frontend
npm audit fix
npm audit
npm test
git diff package-lock.json

# Verify builds
npm run build
npm run typecheck
```

---

## Dashboard Metrics Summary

```json
{
  "audit_date": "2026-07-03",
  "project": "dev-crew",
  "package_managers": ["npm"],
  "vulnerabilities": {
    "critical": 2,
    "high": 4,
    "moderate": 10,
    "low": 2,
    "total": 18
  },
  "dependencies": {
    "direct": 11,
    "transitive": 637,
    "total": 648
  },
  "outdated_major_versions": 6,
  "license_compliance": "PASS",
  "post_install_scripts": 0,
  "risk_grade": "C"
}
```

---

## Learning & Follow-up

See `Teams/TheInspector/learnings/dependency-auditor.md` for:
- Packages requiring continuous monitoring (handlebars, vitest, vite)
- License decisions and exemptions
- Prior audit comparisons
- Audit tools available in this environment

---

**Report Generated:** 2026-07-03  
**Auditor Agent:** dependency_auditor (Haiku model)  
**Status:** Complete — 18 vulnerabilities identified, 6 outdated major versions, 0 GPL/AGPL licenses  
**Recommendation:** Grade C warrants immediate remediation of P1/P2 findings.
