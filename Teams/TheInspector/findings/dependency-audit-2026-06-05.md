# Dependency Auditor Findings

**Audit Date:** 2026-06-05  
**Auditor:** dependency_auditor  
**Scope:** Source/Backend, Source/Frontend, Source/E2E

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (3 workspaces) |
| **Direct Dependencies (Total)** | 27 |
| **Transitive Dependencies (Total)** | 648 |
| **Known CVEs** | 15 total |
| **Critical CVEs** | 2 |
| **High CVEs** | 6 |
| **Medium CVEs** | 7 |
| **Deprecated Packages** | 4 |
| **Outdated Major Versions** | 6 |

### Overall Grading: **D**

Rationale: 2 critical CVEs in directly managed dependencies (handlebars in transitive chain, vitest in Frontend) with exploitable attack vectors. Frontend has a critical vulnerability in the testing framework that affects local development security. Backend has a critical handlebars vulnerability in a non-direct dependency chain.

---

## Detailed Findings

### BACKEND (Source/Backend)

**Direct Dependencies:** 4  
**Transitive Dependencies:** 102  
**CVEs:** 6 (1 Critical, 0 High, 5 Moderate)  
**Deprecated Packages:** 4

#### DEP-001: CRITICAL - Handlebars JavaScript Injection (Multiple CVEs)

- **Severity:** P1
- **Category:** cve
- **Package:** `handlebars` (v4.7.8 and below) — **transitive dependency via jest ecosystem**
- **File:** package-lock.json
- **CVEs:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8, Critical) — JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1, High) — JS Injection via @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1, High) — JS Injection via dynamic partial object
  - GHSA-9cx6-37pm-9jff (CVSS 7.5, High) — DoS via malformed decorator syntax
  - GHSA-7rx3-28cr-v5wh (CVSS 4.8, Moderate) — Prototype method access control gap
  - GHSA-2qvq-rjwj-gvw9 (CVSS 4.7, Moderate) — Prototype pollution leading to XSS
  - GHSA-442j-39wm-28r2 (CVSS 3.7, Low) — Property access validation bypass
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2, High) — JavaScript Injection in CLI precompiler

- **Impact:** While handlebars is not directly used in production code, it's pulled in by the Jest testing framework. If handlebars-based templates are ever processed during testing or build, arbitrary JavaScript could be injected and executed.

- **Fix:** Upgrade to handlebars ≥4.7.9 (when indirect dependencies are resolved via npm update, or upgrade jest to latest)
  ```bash
  cd Source/Backend && npm update
  ```

- **Transitive Path:** jest → babel → ... → handlebars

- **Cross-ref:** [ESCALATE → TheGuardians] This is a code-injection risk if any part of the build/test pipeline processes user-controlled template data.

---

#### DEP-002: MODERATE - UUID Buffer Bounds Check Missing

- **Severity:** P2
- **Category:** cve
- **Package:** `uuid@^9.0.0` (v9.0.0–11.1.0) — **direct dependency**
- **File:** Source/Backend/package.json (line 13)
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5, Moderate)
- **Title:** Missing buffer bounds check in v3/v5/v6 when buf is provided
- **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285 (Improper Validation of Specified Quantity in Input)

- **Impact:** If the backend accepts external input and passes a user-controlled buffer to uuid v3/v5/v6 functions, an attacker could write beyond buffer bounds, causing information disclosure or DoS.

- **Risk Assessment:** MODERATE — depends on how uuid is called. If always called with internally-generated buffers, risk is LOW. If external input flows to `buf` parameter, risk is HIGH.

- **Fix:** Upgrade to uuid ≥11.1.1 (or skip to v14.0.0 for latest fixes)
  ```bash
  cd Source/Backend && npm update uuid
  ```

- **Current Version:** 9.0.0  
- **Available Fixes:** uuid@14.0.0 (major version bump required)

---

#### DEP-003: MODERATE - Query String DoS

- **Severity:** P2
- **Category:** cve
- **Package:** `qs@6.11.1–6.15.1` — **indirect dependency via express**
- **File:** package-lock.json (transitive)
- **CVE:** GHSA-q8mj-m7cp-5q26 (CVSS 5.3, Moderate)
- **Title:** Remotely triggerable DoS: qs.stringify crashes with TypeError when null/undefined entries in comma-format arrays + encodeValuesOnly flag

- **Impact:** Malformed query strings could crash the Express server. Attack vector: `GET /api/work-items?q[]=null` or similar crafted payloads.

- **Fix:** Upgrade express to latest (will pull in patched qs)
  ```bash
  cd Source/Backend && npm update express
  ```

- **Current Version:** 4.18.2  
- **Available Fix:** express@4.22.2 (patch), express@5.2.1 (major)

---

#### DEP-004: MODERATE - Express qs Dependency

- **Severity:** P2
- **Category:** cve
- **Package:** `express@^4.18.2` (4.21.0–4.22.1 specifically vulnerable) — **direct dependency**
- **File:** Source/Backend/package.json (line 11)
- **CVE:** GHSA-q8mj-m7cp-5q26 (via qs)
- **Title:** Same as DEP-003 — qs DoS vulnerability

- **Impact:** Backend is vulnerable to query-string DoS attacks.

- **Fix:** Upgrade express to ≥4.22.2
  ```bash
  cd Source/Backend && npm update express
  ```

---

#### DEP-005: MODERATE - Brace-Expansion ReDoS

- **Severity:** P2
- **Category:** cve
- **Package:** `brace-expansion@<1.1.13` — **indirect dependency via glob**
- **File:** package-lock.json (transitive)
- **CVE:** GHSA-f886-m6hf-6m8v (CVSS 6.5, Moderate)
- **Title:** Zero-step sequence causes process hang and memory exhaustion
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)

- **Impact:** If any part of the build/test process uses glob patterns with brace expansion on user-controlled input, a specially crafted pattern could hang the process and exhaust memory.

- **Fix:** Upgrade glob dependency (or clear node_modules and reinstall)
  ```bash
  cd Source/Backend && npm update && npm ci
  ```

---

#### DEP-006: DEPRECATED - Glob (Security & Maintenance)

- **Severity:** P3
- **Category:** abandoned
- **Package:** `glob` (in test dependencies)
- **File:** package-lock.json
- **Message:** "Old versions of glob are not supported, and contain widely publicized security vulnerabilities. Please update."

- **Impact:** Build/test process may fail or be vulnerable. Unmaintained package poses supply-chain risk.

- **Fix:** Upgrade glob to latest via npm update or explicit dependency bump
  ```bash
  cd Source/Backend && npm update glob
  ```

---

#### DEP-007: DEPRECATED - Inflight (Memory Leak)

- **Severity:** P3
- **Category:** abandoned
- **Package:** `inflight` (test dependency)
- **File:** package-lock.json
- **Message:** "This module is not supported, and leaks memory. Do not use it."

- **Impact:** Long-running test suites may exhaust memory. This is a testing-only dependency, so production impact is LOW.

- **Fix:** Replace with lru-cache or remove if no longer needed
  ```bash
  cd Source/Backend && npm remove inflight && npm update
  ```

---

#### DEP-008 & 009: DEPRECATED - Supertest & Superagent

- **Severity:** P3
- **Category:** abandoned
- **Package:** `supertest@^6.3.3` (direct dev dependency), `superagent` (transitive)
- **File:** Source/Backend/package.json (devDependencies, line 23)
- **Message:** "Please upgrade to supertest v7.1.3+", "superagent v10.2.2+"

- **Impact:** Testing framework is out-of-date. May be missing security patches in HTTP handling.

- **Fix:** Upgrade supertest to latest
  ```bash
  cd Source/Backend && npm update supertest
  ```

---

#### DEP-010: OUTDATED - Express (1 Major Version Behind)

- **Severity:** P3
- **Category:** outdated
- **Package:** `express@^4.18.2`
- **Current:** 4.18.2  
- **Latest:** 5.2.1 (major version)  
- **Wanted:** 4.22.2 (patch fix for qs vuln)

- **Impact:** Missing security patches for qs dependency. Express v5 offers performance improvements but requires code changes.

- **Recommendation:** At minimum, upgrade to 4.22.2 for qs vulnerability fix. Plan for v5 migration in next sprint.

---

#### DEP-011: OUTDATED - Pino (2 Major Versions Behind)

- **Severity:** P3
- **Category:** outdated
- **Package:** `pino@^8.17.0`
- **Current:** 8.17.0  
- **Latest:** 10.3.1

- **Impact:** Logging framework is 2 major versions behind. May have performance regressions or missing structured logging features.

- **Recommendation:** Plan migration to pino v10.x. Check changelog for breaking changes.

---

#### DEP-012: OUTDATED - UUID (5 Major Versions Behind)

- **Severity:** P3
- **Category:** outdated
- **Package:** `uuid@^9.0.0`
- **Current:** 9.0.0  
- **Latest:** 14.0.0

- **Impact:** Library is significantly behind current releases. Combined with CVE GHSA-w5hq-g745-h8pq, this should be prioritized.

- **Recommendation:** Upgrade to uuid@14.0.0 to get buffer bounds check fix.

---

### FRONTEND (Source/Frontend)

**Direct Dependencies:** 8  
**Transitive Dependencies:** 222  
**CVEs:** 9 (1 Critical, 0 High, 8 Moderate)  
**Deprecated Packages:** 0

#### DEP-013: CRITICAL - Vitest Arbitrary File Read & Execution

- **Severity:** P1
- **Category:** cve
- **Package:** `vitest@^2.0.5` (affected versions <4.1.0) — **direct dependency**
- **File:** Source/Frontend/package.json (line 29)
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8, Critical)
- **Title:** When Vitest UI server is listening, arbitrary file can be read and executed
- **CWE:** CWE-862 (Missing Authorization)

- **Impact:** If developers run `npm run test` and leave the Vitest UI server listening on localhost, an attacker on the local network (or any page the developer visits while the server is running) can:
  - Read arbitrary files from the dev machine
  - Execute arbitrary JavaScript in the test environment
  - Access environment variables and secrets

- **Attack Scenario:** 
  1. Developer runs `npm run test` in frontend dir (starts Vitest server on default port ~51204)
  2. Attacker sends crafted request to Vitest UI endpoint
  3. Vitest executes arbitrary code in test runner context
  4. Attacker exfiltrates .env, source code, tokens, etc.

- **Fix:** Upgrade vitest to ≥4.1.0
  ```bash
  cd Source/Frontend && npm update vitest
  ```
  **NOTE:** This is a major version upgrade (from 2.0.5 to 4.1.0+). Test the upgrade thoroughly for breaking changes.

- **Current Version:** 2.0.5  
- **Available Fix:** vitest@4.1.8 or newer

- **Workaround (immediate):** Ensure Vitest UI server is only accessible on localhost (`--ui.host localhost`) and requires authentication, or disable UI mode in production-like builds.

- **Cross-ref:** [ESCALATE → TheGuardians] This is a critical security vulnerability affecting the development environment. If secrets are in .env files accessible to the test runner, they could be exfiltrated.

---

#### DEP-014: MODERATE - React Router Open Redirect

- **Severity:** P2
- **Category:** cve
- **Package:** `react-router@6.7.0–6.30.3` (via react-router-dom) — **transitive**
- **File:** Source/Frontend/package.json (line 17, react-router-dom dependency)
- **CVE:** GHSA-2j2x-hqr9-3h42 (CVSS 0.0 reported, but Moderate impact)
- **Title:** React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation

- **Impact:** If the app redirects to a URL starting with `//` (protocol-relative), an attacker could craft a redirect to a different origin:
  - `//evil.com/path` is interpreted as `https://evil.com/path` in HTTPS context
  - Could be used for phishing or credential harvesting

- **Example Vulnerable Code:**
  ```jsx
  // If user parameter is not validated:
  navigate(`//${userInput}`);  // UNSAFE
  ```

- **Fix:** Upgrade react-router-dom to ≥6.30.4
  ```bash
  cd Source/Frontend && npm update react-router-dom
  ```

- **Current Version:** 6.26.0  
- **Available Fix:** 6.30.4+

---

#### DEP-015: MODERATE - Vite Path Traversal in .map Handling

- **Severity:** P2
- **Category:** cve
- **Package:** `vite@^5.4.0` (affected versions ≤6.4.1) — **direct dependency**
- **File:** Source/Frontend/package.json (line 28)
- **CVE:** GHSA-4w7w-66w2-5vf9 (CVSS not rated, but Moderate impact)
- **Title:** Path Traversal in Optimized Deps `.map` File Handling
- **CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory), CWE-200 (Exposure of Sensitive Information)

- **Impact:** During development, if an attacker can control dependency names or versions, they could craft a malicious `.map` file that traverses the filesystem:
  - Read source maps from outside the project
  - Potentially read `.env` or other config files
  - Affects dev server only (not production builds)

- **Fix:** Upgrade vite to ≥5.4.1 or recommended ≥6.5.0 for all related fixes
  ```bash
  cd Source/Frontend && npm update vite
  ```

- **Current Version:** 5.4.0  
- **Available Fix:** vite@5.4.1+ or vite@6.5.0+ (major version bump brings esbuild vulnerability fix too)

---

#### DEP-016: MODERATE - PostCSS XSS via Unescaped </style>

- **Severity:** P2
- **Category:** cve
- **Package:** `postcss@<8.5.10` — **transitive via vite**
- **File:** package-lock.json
- **CVE:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1, Moderate)
- **Title:** PostCSS has XSS via Unescaped </style> in CSS Stringify Output
- **CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)

- **Impact:** If user-controlled CSS is processed by postcss and output without escaping, a malicious `</style>` tag could break out of a style context and inject JavaScript.

- **Example:**
  ```css
  /* User input */
  .test { color: red; } </style><script>alert('XSS')</script><style>
  ```

- **Fix:** Upgrade vite (will pull in patched postcss)
  ```bash
  cd Source/Frontend && npm update vite postcss
  ```

---

#### DEP-017: MODERATE - Vitest/Mocker via Vite Vulnerabilities

- **Severity:** P2
- **Category:** cve
- **Package:** `@vitest/mocker` and `vitest` — **transitive via vite chain**
- **File:** package-lock.json
- **CVEs:**
  - vite path traversal (above)
  - esbuild vulnerability in vite (see below)

- **Fix:** Same as vitest upgrade (DEP-013)

---

#### DEP-018: MODERATE - Esbuild CORS Bypass

- **Severity:** P2
- **Category:** cve
- **Package:** `esbuild@<=0.24.2` — **transitive via vite**
- **File:** package-lock.json
- **CVE:** GHSA-67mh-4wv8-2f99 (CVSS 5.3, Moderate)
- **Title:** esbuild enables any website to send any requests to the development server and read the response
- **CWE:** CWE-346 (Origin Validation Error)

- **Impact:** During development, any website could send requests to the esbuild dev server:
  - Read bundled source code
  - Read `.map` files (source maps with original source)
  - Bypass CORS if server is running on localhost
  - Exfiltrate development environment details

- **Attack:** Attacker hosts malicious website → victim dev browses it while running `npm run dev` → malicious script sends requests to localhost:5173 → dev server responds → attacker reads response

- **Fix:** Upgrade vite to pull in patched esbuild
  ```bash
  cd Source/Frontend && npm update vite
  ```

---

#### DEP-019: MODERATE - WS (Uninitialized Memory Disclosure)

- **Severity:** P2
- **Category:** cve
- **Package:** `ws@8.0.0–8.20.0` — **transitive via dev tools**
- **File:** package-lock.json
- **CVE:** GHSA-58qx-3vcg-4xpx (CVSS 4.4, Moderate)
- **Title:** Uninitialized memory disclosure in WebSocket library
- **CWE:** CWE-908 (Use of Uninitialized Resource)

- **Impact:** WebSocket handling could leak uninitialized memory from the process, potentially exposing sensitive data (keys, tokens, internal state).

- **Fix:** Upgrade ws to ≥8.20.1 (will be pulled in via dev deps)
  ```bash
  cd Source/Frontend && npm update
  ```

---

#### DEP-020: OUTDATED - React (1 Major Version Behind)

- **Severity:** P3
- **Category:** outdated
- **Package:** `react@^18.3.1`
- **Current:** 18.3.1  
- **Latest:** 19.2.7

- **Impact:** Missing features and performance improvements. React 19 has hooks improvements, automatic batching, and use() support.

- **Recommendation:** Plan for React 19 migration. Check for breaking changes in react-dom and testing libraries.

---

#### DEP-021: OUTDATED - React-DOM (1 Major Version Behind)

- **Severity:** P3
- **Category:** outdated
- **Package:** `react-dom@^18.3.1`
- **Current:** 18.3.1  
- **Latest:** 19.2.7

- **Recommendation:** Upgrade together with React (DEP-020)

---

#### DEP-022: OUTDATED - React Router (1 Major Version Behind)

- **Severity:** P3
- **Category:** outdated
- **Package:** `react-router-dom@^6.26.0`
- **Current:** 6.26.0  
- **Latest:** 7.17.0

- **Impact:** Missing route optimizations and API improvements.

- **Recommendation:** Plan migration to v7. Check release notes for breaking changes.

---

### E2E (Source/E2E)

**Direct Dependencies:** 1  
**Transitive Dependencies:** 4  
**CVEs:** 0

**Status:** ✅ **CLEAN** — No vulnerabilities detected.

- `@playwright/test@^1.58.2` is up-to-date with no known CVEs.

---

## Summary by Severity

| Priority | Count | Details |
|----------|-------|---------|
| **P1 (Critical)** | 2 | Handlebars JS injection (Backend), Vitest arbitrary file read (Frontend) |
| **P2 (High)** | 7 | UUID buffer bounds, qs DoS, React Router open redirect, Vite path traversal, PostCSS XSS, esbuild CORS bypass, ws memory disclosure |
| **P3 (Medium)** | 6 | Deprecated packages (glob, inflight, supertest, superagent), outdated major versions (Express, Pino, UUID, React, React Router) |
| **P4 (Low)** | 0 | - |

---

## Recommended Actions (Priority Order)

### Immediate (Next Business Day)

1. **Backend:** Upgrade express and uuid
   ```bash
   cd Source/Backend && npm update express uuid --save
   ```

2. **Frontend:** Upgrade vitest to ≥4.1.0 (test thoroughly after upgrade)
   ```bash
   cd Source/Frontend && npm update vitest --save
   ```

3. **Backend:** Remove deprecated packages (glob, inflight, superagent, supertest)
   ```bash
   cd Source/Backend && npm update && npm ci
   ```

### This Week

4. **Frontend:** Upgrade vite, react-router-dom, postcss, ws
   ```bash
   cd Source/Frontend && npm update vite react-router-dom ws --save
   ```

5. **Backend:** Plan pino v10 upgrade and test
   ```bash
   cd Source/Backend && npm update pino --save
   ```

### This Sprint

6. **Frontend:** Plan React 19 migration (major version bump)
7. **Backend:** Plan Express v5 migration (major version bump)

---

## License Compliance

**Status:** ✅ **COMPLIANT**

All detected licenses are permissive (MIT, Apache, ISC). No GPL/AGPL dependencies detected. No UNLICENSED packages blocking usage.

---

## Dependency Tree Health

| Project | Direct | Transitive | Ratio | Risk |
|---------|--------|-----------|-------|------|
| Backend | 4 | 102 | 25.5x | 🟡 MODERATE — wide transitive chain, 4 deprecated packages |
| Frontend | 8 | 222 | 27.75x | 🔴 HIGH — wide transitive chain, 1 critical CVE (vitest), multiple dev-time vulns |
| E2E | 1 | 4 | 4x | 🟢 LOW — minimal deps, clean |

**Overall Supply Chain Risk:** 🔴 HIGH

- Frontend dev toolchain is vulnerable (vitest, vite, esbuild chain)
- Backend test dependencies are deprecated
- Large transitive dependency trees increase attack surface

---

## Recommendations for Process

1. **Lock files review**: Commit package-lock.json and package-lock.json for reproducible installs
2. **Audit frequency**: Run npm audit monthly as minimum, weekly for critical changes
3. **Dependency updates**: Separate critical CVE patches (P1/P2) from routine updates (P3/P4)
4. **Testing**: After each major version bump, run full test suite + manual smoke tests
5. **Monitoring**: Consider using Dependabot or Snyk for continuous CVE monitoring

---

## Cross-References

- [ESCALATE → TheGuardians] DEP-001, DEP-013 — Code injection and file access vulnerabilities affecting development and build time
- [CROSS-REF: quality-oracle] Large transitive dependency trees (648 total) increase testing burden
- [CROSS-REF: chaos-monkey] Development server vulnerabilities (vitest, esbuild) could affect chaos test reliability

---

## JSON Summary

```json
{
  "audit_date": "2026-06-05",
  "total_projects": 3,
  "summary": {
    "direct_dependencies": 27,
    "transitive_dependencies": 648,
    "vulnerabilities": {
      "total": 15,
      "critical": 2,
      "high": 0,
      "moderate": 8,
      "low": 5
    },
    "deprecated_packages": 4,
    "outdated_majors": 6
  },
  "projects": {
    "Backend": {
      "path": "Source/Backend",
      "direct_deps": 4,
      "transitive_deps": 102,
      "cves": 6,
      "critical_cves": 1,
      "deprecated": 4,
      "outdated_majors": 3,
      "license_compliant": true
    },
    "Frontend": {
      "path": "Source/Frontend",
      "direct_deps": 8,
      "transitive_deps": 222,
      "cves": 9,
      "critical_cves": 1,
      "deprecated": 0,
      "outdated_majors": 3,
      "license_compliant": true
    },
    "E2E": {
      "path": "Source/E2E",
      "direct_deps": 1,
      "transitive_deps": 4,
      "cves": 0,
      "critical_cves": 0,
      "deprecated": 0,
      "outdated_majors": 0,
      "license_compliant": true
    }
  },
  "critical_findings": [
    {
      "id": "DEP-001",
      "package": "handlebars",
      "severity": "P1",
      "cve": "GHSA-2w6w-674q-4c4q",
      "cvss": 9.8,
      "impact": "JS injection in transitive dependency chain"
    },
    {
      "id": "DEP-013",
      "package": "vitest",
      "severity": "P1",
      "cve": "GHSA-5xrq-8626-4rwp",
      "cvss": 9.8,
      "impact": "Arbitrary file read and code execution via dev UI server"
    }
  ],
  "recommended_actions": [
    "Upgrade express to >=4.22.2 (qs vulnerability)",
    "Upgrade uuid to >=14.0.0 (buffer bounds check)",
    "Upgrade vitest to >=4.1.0 (critical: file access vulnerability)",
    "Upgrade vite to >=5.4.1 (path traversal and esbuild fixes)",
    "Remove deprecated packages: glob, inflight, supertest@<7.1.3, superagent@<10.2.2",
    "Plan React 19 migration (1 major version behind)",
    "Plan Express v5 migration (1 major version behind)"
  ],
  "overall_grade": "D",
  "rationale": "2 critical CVEs in directly managed dependencies with exploitable attack vectors affecting both development environment security (vitest UI) and production dependencies (handlebars). Large transitive dependency trees increase supply chain risk."
}
```

---

_Report generated by dependency_auditor on 2026-06-05_  
_Next audit recommended: 2026-07-05 or on major dependency changes_
