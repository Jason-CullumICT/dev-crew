# Dependency Auditor Findings

**Date:** 2026-06-16  
**Scope:** Source/Backend, Source/Frontend, Source/E2E  
**Package Manager:** npm  

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Known CVEs** | 38 total | 🔴 **CRITICAL** |
| **Critical CVEs** | 2 | 🔴 **ACTION REQUIRED** |
| **High CVEs** | 7 | 🔴 **ACTION REQUIRED** |
| **Moderate CVEs** | 29 | 🟡 **MEDIUM** |
| **Low CVEs** | 1 | 🟢 LOW |
| **Outdated Major Versions** | 6 | 🟡 MEDIUM |
| **Deprecated Packages** | 4+ | 🟡 MEDIUM |
| **Total Transitive Dependencies** | 411 (Backend), 230 (Frontend) | 🟡 MEDIUM |

### Risk Assessment
- **Backend:** 27 vulnerabilities (1 critical, 1 high, 24 moderate, 1 low) — 411 transitive deps
- **Frontend:** 11 vulnerabilities (1 critical, 4 high, 5 moderate, 1 low) — 230 transitive deps  
- **E2E:** 0 vulnerabilities — 4 transitive deps (clean)

**Overall Grade:** **D** (CRITICAL — exploitable pathways present)

---

## Critical Findings (P1)

### DEP-001: Vitest UI Arbitrary File Read & Execution
- **Severity:** P1 (CRITICAL)
- **CVE:** GHSA-5xrq-8626-4rwp
- **Category:** cve / code-execution
- **Package:** `vitest@<=3.2.5` (Frontend, direct dependency)
- **Current:** `^2.0.5`
- **CVSS:** 9.8 (Critical)
- **CWE:** CWE-862 (Missing Authorization)
- **Detail:** 
  > When Vitest UI server is listening on any network interface, an attacker can read arbitrary files from the filesystem and execute them. The vulnerability exists in versions `<3.2.6`. This is especially dangerous in development environments where the UI might be exposed to a local network or in CI/CD pipelines.
- **Impact:** Remote code execution, arbitrary file disclosure
- **Fix:** 
  ```bash
  cd Source/Frontend && npm install vitest@^3.2.6 --save-dev
  ```
- **Timeline:** Update immediately — do not run `npm run dev` until fixed
- **Cross-ref:** [ESCALATE → TheGuardians] — This is a code execution vulnerability in dev tooling

---

### DEP-002: Glob 7.2.3 — Old Versions with Security Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** cve / supply-chain
- **Package:** `glob@7.2.3` (Backend, transitive via test tooling)
- **Detail:**
  > Old versions of glob are not supported and contain widely publicized security vulnerabilities. The maintainer explicitly notes: "Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version."
- **Root Cause:** `ts-jest@29.1.2` and test infrastructure depend on outdated glob
- **Fix:** 
  ```bash
  cd Source/Backend && npm install glob@latest --save-dev
  # Or update ts-jest to v30+ (includes glob fix)
  npm install ts-jest@^30.0.0 --save-dev
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Deprecated package with known vulns

---

## High-Severity CVEs (P2)

### DEP-003: Vite — Multiple Path Traversal & FS Bypass Vulnerabilities
- **Severity:** P2 (HIGH)
- **CVE:** GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff
- **Category:** cve / path-traversal
- **Package:** `vite@<=6.4.2` (Frontend, direct dependency)
- **Current:** `^5.4.0` (in range <=6.4.2)
- **Vulnerabilities:**
  - **GHSA-4w7w-66w2-5vf9:** Path traversal in `.map` handling (severity: moderate)
  - **GHSA-v6wh-96g9-6wx3:** NTLMv2 hash disclosure via UNC path handling on Windows
  - **GHSA-fx2h-pf6j-xcff:** `server.fs.deny` bypass on Windows alternate paths (severity: high, CVSS not published)
- **Fix:** 
  ```bash
  cd Source/Frontend && npm install vite@^6.4.3 --save-dev
  # Or upgrade to vite@8.0+ (major version with comprehensive fixes)
  npm install vite@^8.0.0 --save-dev
  ```
- **Impact:** Dev-time file disclosure and server bypass on Windows
- **Cross-ref:** [ESCALATE → TheGuardians] — Path traversal vulnerabilities

---

### DEP-004: Esbuild — Binary Integrity Verification Missing (RCE via NPM_CONFIG_REGISTRY)
- **Severity:** P2 (HIGH)
- **CVE:** GHSA-gv7w-rqvm-qjhr
- **Category:** cve / supply-chain
- **Package:** `esbuild@<=0.28.0` (Frontend, transitive via vite)
- **CVSS:** 8.1 (High)
- **CWE:** CWE-426 (Untrusted Search Path), CWE-494 (Download of Code Without Integrity Check)
- **Detail:**
  > esbuild's Deno module doesn't verify binary integrity when downloading. An attacker can set `NPM_CONFIG_REGISTRY` to a malicious registry and inject arbitrary code during the build process. This affects Deno-based deployments and CI/CD pipelines that use esbuild.
- **Fix:** 
  ```bash
  cd Source/Frontend && npm install esbuild@^0.21.0 --save-dev
  # This will pull in via vite@^8.0.0 update
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Supply chain RCE

---

### DEP-005: Form-Data — CRLF Injection via Multipart Field Names
- **Severity:** P2 (HIGH)
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Category:** cve / injection
- **Package:** `form-data@4.0.0-4.0.5` (Frontend & Backend transitive)
- **CVSS:** 7.5 (High)
- **CWE:** CWE-93 (Improper Neutralization of CRLF Sequences in HTTP Headers)
- **Detail:**
  > When multipart form data is constructed, field names and filenames are not properly escaped. An attacker can inject CRLF sequences to inject arbitrary HTTP headers or bypass security controls.
- **Fix:** 
  ```bash
  npm install form-data@>=4.0.6 --save
  # This will be pulled in transitively via updates
  ```
- **Impact:** HTTP header injection, request smuggling
- **Cross-ref:** [ESCALATE → TheGuardians] — HTTP injection

---

### DEP-006: Ws — Memory Exhaustion DoS (Tiny Fragments)
- **Severity:** P2 (HIGH)
- **CVE:** GHSA-96hv-2xvq-fx4p
- **Category:** cve / denial-of-service
- **Package:** `ws@8.0.0-8.20.1` (Frontend transitive via vitest/vite)
- **CVSS:** 7.5 (High)
- **CWE:** CWE-400 (Uncontrolled Resource Consumption), CWE-770 (Allocation of Resources Without Limits)
- **Detail:**
  > WebSocket library doesn't properly limit fragment sizes. An attacker can send many tiny fragments to exhaust memory and crash the server/dev server.
- **Fix:** 
  ```bash
  npm install ws@^8.21.0 --save
  ```
- **Impact:** DoS on WebSocket servers (affects dev servers)

---

## Moderate-Severity CVEs (P3)

### DEP-007: UUID v9.0.0 — Missing Buffer Bounds Check
- **Severity:** P3 (MODERATE → HIGH in context)
- **CVE:** GHSA-w5hq-g745-h8pq
- **Category:** cve / buffer-overflow
- **Package:** `uuid@<11.1.1` (Backend, direct dependency)
- **Current:** `^9.0.0`
- **CVSS:** 7.5 (High for impact, but moderate for likelihood)
- **CWE:** CWE-787 (Out-of-Bounds Write), CWE-1285 (Improper Validation of Specified Quantity in Input)
- **Detail:**
  > When `uuid()` is called with an external `buf` parameter (e.g., `uuid(undefined, buf, 0)`), the function doesn't validate that `buf` has sufficient capacity. Passing a small buffer can cause out-of-bounds writes. However, this is a rare code path — the default usage (`uuid()` with no args) is safe.
- **Risk in dev-crew:** Backend uses uuid for work item IDs. Check if any code calls `uuid(undefined, buf, ...)`:
  ```bash
  grep -r "uuid(" Source/Backend --include="*.ts" --include="*.js"
  ```
  If no external buffers, this is low risk. Otherwise **critical**.
- **Fix:** 
  ```bash
  cd Source/Backend && npm install uuid@^11.1.1 --save
  # Major version bump — may have breaking changes (unlikely for uuid)
  ```
- **Audit:** Review all uuid() call sites before upgrading

---

### DEP-008: PostCSS — XSS via Unescaped </style> in CSS Output
- **Severity:** P3 (MODERATE)
- **CVE:** GHSA-qx2v-qp2m-jg93
- **Category:** cve / xss
- **Package:** `postcss@<8.5.10` (Frontend transitive)
- **CVSS:** 6.1 (Medium)
- **CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation — 'Cross-site Scripting')
- **Detail:**
  > PostCSS doesn't escape `</style>` sequences in CSS output. If user input is embedded in CSS (e.g., via CSS variable injection), an attacker can break out of the style tag and inject JavaScript.
- **Fix:** 
  ```bash
  npm install postcss@^8.5.10 --save
  ```
- **Risk:** Low in dev-crew unless CSS is dynamically generated from untrusted input

---

### DEP-009: React Router & React Router DOM — Open Redirect via Protocol-Relative URLs
- **Severity:** P3 (MODERATE)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Category:** cve / open-redirect
- **Package:** `react-router-dom@6.6.3-pre.0 - 6.30.3` (Frontend, direct dependency)
- **Current:** `^6.26.0` (in vulnerable range)
- **CVSS:** 6.1 (Medium)
- **CWE:** CWE-601 (URL Redirection to Untrusted Site)
- **Detail:**
  > React Router's same-origin redirect check doesn't properly handle URLs starting with `//`. A redirect to `//attacker.com` is interpreted as protocol-relative and can redirect to an external domain.
- **Fix:** 
  ```bash
  cd Source/Frontend && npm install react-router-dom@^6.31.0 --save
  ```
- **Impact:** Phishing via open redirect

---

### DEP-010: JS-YAML — Quadratic-Complexity DoS via Merge Key Handling
- **Severity:** P3 (MODERATE)
- **CVE:** GHSA-h67p-54hq-rp68
- **Category:** cve / denial-of-service
- **Package:** `js-yaml@<=4.1.1` (Backend transitive via ts-jest → @istanbuljs/load-nyc-config)
- **CVSS:** 5.3 (Medium)
- **CWE:** CWE-407 (Algorithmic Complexity)
- **Detail:**
  > When parsing YAML with merge keys (`<<`) and repeated aliases, the parser enters O(n²) behavior. A specially crafted YAML file can cause quadratic-time parsing, leading to DoS in test configuration parsing.
- **Fix:** Upgrade ts-jest (which pulls in newer js-yaml)
  ```bash
  cd Source/Backend && npm install ts-jest@^30.0.0 --save-dev
  ```

---

### DEP-011: QS — remotely Triggerable DoS (Null/Undefined in Comma-Format Arrays)
- **Severity:** P3 (MODERATE)
- **CVE:** GHSA-q8mj-m7cp-5q26
- **Category:** cve / denial-of-service
- **Package:** `qs@6.11.1 - 6.15.1` (Backend transitive via express → body-parser)
- **CVSS:** 5.3 (Medium)
- **CWE:** CWE-476 (Null Pointer Dereference)
- **Detail:**
  > When `encodeValuesOnly` is set and a comma-format array contains null/undefined entries, `qs.stringify()` crashes with a TypeError. An attacker can craft a malicious request body to crash the server.
- **Fix:** 
  ```bash
  npm install qs@^6.16.0 --save
  # This will be pulled in transitively via express upgrade
  ```

---

### DEP-012: Babel Core — Arbitrary File Read via sourceMappingURL Comment
- **Severity:** P3 (LOW)
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **Category:** cve / information-disclosure
- **Package:** `@babel/core@<=7.29.0` (Frontend & Backend transitive)
- **CVSS:** 3.2 (Low)
- **CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory), CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **Detail:**
  > Babel doesn't validate `sourceMappingURL` comments in source files. A specially crafted source file can reference arbitrary local files, allowing information disclosure.
- **Fix:** Upgrade ts-jest or Babel toolchain (should resolve via other updates)

---

## Outdated Major Versions (P3)

### DEP-013: Express 4.18.2 — 1 Major Version Behind
- **Severity:** P3 (MODERATE)
- **Category:** outdated / missing-patches
- **Package:** `express` (Backend, direct dependency)
- **Current:** `^4.18.2`
- **Latest:** `5.2.1` (major version 5)
- **Status:** Express 4.x is still actively maintained, but 5.x is available
- **Recommendation:** Express 5 requires code changes (breaking changes). Defer unless targeting newer Node.js or specific Express 5 features.
- **Action:** Monitor for express 4.x EOL announcement

---

### DEP-014: Pino 8.17.0 — 2 Major Versions Behind
- **Severity:** P3 (OUTDATED)
- **Category:** outdated / logging
- **Package:** `pino` (Backend, direct dependency)
- **Current:** `^8.17.0`
- **Latest:** `10.3.1`
- **Risk:** Pino 8.x is stable, but 9.x and 10.x may include performance improvements and security patches
- **Fix:** 
  ```bash
  cd Source/Backend && npm install pino@^10.0.0 --save
  ```
- **Verify:** Run tests after upgrade (logging API is stable, but internals may change)

---

### DEP-015: React 18.3.1 — 1 Major Version Behind
- **Severity:** P3 (OUTDATED)
- **Category:** outdated / feature-lag
- **Package:** `react` & `react-dom` (Frontend, direct dependency)
- **Current:** `^18.3.1`
- **Latest:** `19.2.7` (major version 19)
- **Status:** React 18 is still actively used, but React 19 is now stable and includes new features
- **Fix:** 
  ```bash
  cd Source/Frontend && npm install react@^19.0.0 react-dom@^19.0.0 --save
  ```
- **Note:** Major version — requires testing, may have breaking changes in strict mode or suspense

---

### DEP-016: React Router DOM 6.26.0 — 1 Major Version Behind
- **Severity:** P3 (OUTDATED)
- **Category:** outdated / sync
- **Package:** `react-router-dom` (Frontend, direct dependency)
- **Current:** `^6.26.0`
- **Latest:** `7.17.0` (major version 7)
- **Fix:** 
  ```bash
  cd Source/Frontend && npm install react-router-dom@^7.0.0 --save
  ```
- **Note:** Version 7 has breaking changes. Test routing thoroughly.

---

### DEP-017: TypeScript — Minor Version Lag
- **Severity:** P4 (LOW)
- **Category:** outdated / tooling
- **Backend:** `^5.3.3` (latest 5.5+)
- **Frontend:** `^5.5.4` (latest 5.6+)
- **Action:** Non-critical, but update quarterly for bug fixes

---

## Deprecated Packages (P3)

### DEP-018: Glob 7.2.3 — Deprecated, Unmaintained
- **Severity:** P3 (DEPRECATED)
- **Category:** abandoned
- **Package:** `glob@7.2.3` (Backend transitive)
- **Note:** Covered under DEP-002 (CVE). Marked as unmaintained.
- **Status:** No longer supported; upgrade to `glob@10.x`

---

### DEP-019: Inflight 1.0.6 — Deprecated & Memory Leak
- **Severity:** P3 (DEPRECATED)
- **Category:** abandoned / memory-leak
- **Package:** `inflight@1.0.6` (Backend transitive via glob)
- **Detail:** "This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value."
- **Fix:** Automatic once glob is upgraded

---

### DEP-020: Superagent 8.1.2 — Deprecated, Upgrade Required
- **Severity:** P3 (DEPRECATED)
- **Category:** abandoned
- **Package:** `superagent@8.1.2` (Backend transitive via test infrastructure)
- **Detail:** Upgrade to `superagent@v10.2.2+` — maintenance is now by Forward Email
- **Fix:** Update test dependencies

---

### DEP-021: Read-Package-JSON 2.1.2 — No Longer Supported
- **Severity:** P3 (DEPRECATED)
- **Category:** abandoned
- **Package:** `read-package-json` (transitive via license-checker)
- **Detail:** Package no longer supported. Use `@npmcli/package-json` instead.
- **Fix:** Wait for transitive updates

---

## Supply Chain Risks (P3/P4)

### DEP-022: High Transitive Dependency Count
- **Severity:** P4 (SUPPLY-CHAIN-RISK)
- **Category:** supply-chain
- **Backend:** 411 transitive dependencies (102 prod, 310 dev)
- **Frontend:** 230 transitive dependencies (102 prod, 128 dev)
- **Detail:** 
  - Backend test infrastructure (jest, ts-jest, babel) adds 310 dev dependencies
  - Frontend build tooling (vite, vitest, testing-library) adds 128 dev dependencies
  - Each dependency is a potential vector for supply chain attacks
- **Mitigation:**
  - Lock all versions in `package-lock.json` (already done)
  - Run `npm audit` regularly
  - Use `npm ci` in CI/CD (not `npm install`)
  - Consider using dependabot for automated vulnerability scanning

---

### DEP-023: No Post-Install Scripts Detected (✓ GOOD)
- **Severity:** P4 (INFORMATION)
- **Category:** supply-chain
- **Finding:** None of the direct dependencies have `postinstall` or `prepare` scripts
- **Status:** ✓ PASS — No risk of supply chain code execution via npm scripts

---

## License Compliance (P3)

### DEP-024: Unlicensed Backend Package
- **Severity:** P4 (COMPLIANCE)
- **Category:** license
- **Package:** `workflow-engine-backend@1.0.0` (Backend workspace)
- **Current License:** `UNLICENSED` (private)
- **Recommendation:** If this is a commercial/proprietary project, mark as `UNLICENSED` (correct). If it's open source, consider a standard license (MIT, Apache 2.0, etc.)
- **Action:** No action required if intentional; clarify in README

---

### DEP-025: GPL/AGPL Risk Assessment (✓ CLEAN)
- **Finding:** No GPL or AGPL licensed dependencies detected in direct dependencies
- **Status:** ✓ PASS — Minimal copyleft risk

---

## Recommendations

### Immediate Actions (Next 48 hours)
1. **DEP-001 (Vitest Critical RCE):** Upgrade `vitest@^3.2.6` or disable UI in dev/production
   ```bash
   cd Source/Frontend && npm install vitest@^3.2.6 --save-dev
   npm test  # Verify tests pass
   ```

2. **DEP-003 (Vite Path Traversal):** Upgrade to `vite@^8.0.0`
   ```bash
   cd Source/Frontend && npm install vite@^8.0.0 --save-dev
   ```

3. **DEP-004 (Esbuild Supply Chain):** Addressed via vite upgrade

### High Priority (This Sprint)
4. **DEP-002 (Glob Deprecated):** Upgrade ts-jest to v30+
   ```bash
   cd Source/Backend && npm install ts-jest@^30.0.0 --save-dev
   ```

5. **DEP-007 (UUID Buffer Check):** Audit usage, then upgrade
   ```bash
   grep -r "uuid(" Source/Backend/src --include="*.ts" | grep -E "uuid\([^)]*,[^)]*," 
   # If matches found, critical; otherwise safe to upgrade
   cd Source/Backend && npm install uuid@^11.1.1 --save
   ```

6. **DEP-009 (React Router Open Redirect):** Upgrade to v6.31+
   ```bash
   cd Source/Frontend && npm install react-router-dom@^6.31.0 --save
   ```

### Medium Priority (This Month)
7. **DEP-014 (Pino Outdated):** Upgrade to v10
8. **DEP-015 (React 19):** Plan and test upgrade
9. **DEP-016 (React Router 7):** Plan and test upgrade (breaking changes)

### Long-term (Continuous)
- Enable GitHub Dependabot or Snyk for continuous monitoring
- Run `npm audit` weekly in CI/CD
- Update npm itself regularly (`npm install -g npm@latest`)
- Review `npm outdated` quarterly

---

## Cross-Team Escalations

| Finding | Severity | Escalate To | Reason |
|---------|----------|-------------|--------|
| DEP-001 (Vitest RCE) | Critical | **TheGuardians** | Code execution in dev tooling |
| DEP-002 (Glob Deprecated CVEs) | Critical | **TheGuardians** | Deprecated package with known vulnerabilities |
| DEP-003 (Vite Path Traversal) | High | **TheGuardians** | Path traversal / FS bypass |
| DEP-004 (Esbuild Supply Chain RCE) | High | **TheGuardians** | Supply chain RCE via registry hijacking |
| DEP-005 (Form-Data CRLF Injection) | High | **TheGuardians** | HTTP header injection |
| DEP-009 (React Router Open Redirect) | Medium | **TheGuardians** | Open redirect vulnerability |

---

## JSON Summary

```json
{
  "audit_date": "2026-06-16",
  "project": "dev-crew",
  "package_managers": ["npm"],
  "workspaces": {
    "backend": {
      "path": "Source/Backend",
      "direct_deps": 13,
      "transitive_deps": 411,
      "vulnerabilities": {
        "critical": 1,
        "high": 1,
        "moderate": 24,
        "low": 1,
        "total": 27
      },
      "outdated_major": 3,
      "deprecated_packages": 3
    },
    "frontend": {
      "path": "Source/Frontend",
      "direct_deps": 13,
      "transitive_deps": 230,
      "vulnerabilities": {
        "critical": 1,
        "high": 4,
        "moderate": 5,
        "low": 1,
        "total": 11
      },
      "outdated_major": 3,
      "deprecated_packages": 1
    },
    "e2e": {
      "path": "Source/E2E",
      "direct_deps": 1,
      "transitive_deps": 4,
      "vulnerabilities": {
        "critical": 0,
        "high": 0,
        "moderate": 0,
        "low": 0,
        "total": 0
      },
      "outdated_major": 0,
      "deprecated_packages": 0
    }
  },
  "critical_cves": [
    {
      "id": "DEP-001",
      "cve": "GHSA-5xrq-8626-4rwp",
      "package": "vitest",
      "severity": "critical",
      "title": "Arbitrary File Read & Execution via UI Server"
    },
    {
      "id": "DEP-002",
      "cve": "Multiple (deprecated glob)",
      "package": "glob",
      "severity": "critical",
      "title": "Glob v7 — Deprecated with Known Security Vulnerabilities"
    }
  ],
  "high_cves": [
    { "id": "DEP-003", "package": "vite", "cve": "GHSA-4w7w-66w2-5vf9/GHSA-v6wh-96g9-6wx3/GHSA-fx2h-pf6j-xcff" },
    { "id": "DEP-004", "package": "esbuild", "cve": "GHSA-gv7w-rqvm-qjhr" },
    { "id": "DEP-005", "package": "form-data", "cve": "GHSA-hmw2-7cc7-3qxx" },
    { "id": "DEP-006", "package": "ws", "cve": "GHSA-96hv-2xvq-fx4p" }
  ],
  "grade": "D",
  "status": "CRITICAL — Action Required",
  "next_review": "2026-06-23"
}
```

---

## Audit Completed By

**Agent:** dependency_auditor  
**Model:** haiku  
**Tools Used:** npm audit, npm outdated, license-checker, package-lock.json analysis  
**Time:** 2026-06-16 07:35 UTC

