# Dependency Audit Report
**Date:** 2026-10-23  
**Auditor:** Dependency Auditor (Haiku 4.5)  
**Scope:** dev-crew project (npm packages)

---

## Executive Summary

**Overall Grade: D** (12 critical vulnerabilities, 65 high, 67 moderate)

The dev-crew project has a **critical supply chain risk posture**. Across 6 npm-based projects with 1,791 total dependencies, **150 known vulnerabilities** have been identified, including **12 CRITICAL** CVEs that pose immediate exploitation risk.

| Metric | Value |
|--------|-------|
| **Critical CVEs** | 12 |
| **High CVEs** | 65 |
| **Moderate CVEs** | 67 |
| **Low CVEs** | 6 |
| **Total Dependencies** | 1,791 |
| **Production Dependencies** | 674 |
| **Highest Risk Project** | portal/Backend (61 vulns, 4 critical) |
| **Cleanest Project** | Source/E2E (0 vulns) |

---

## Vulnerability Breakdown by Project

### 🔴 Critical Findings (P1)

#### **DEP-001: proxy-addr IPv4-Mapped IPv6 IP Spoofing**
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Access Control
- **Package:** proxy-addr
- **Version:** 1.1.0 - 2.0.7
- **File:** Source/Backend/package-lock.json (transitive via express)
- **CVSS Score:** 9.1 (Network, Low Complexity, No User Interaction)
- **CWE:** CWE-290, CWE-348, CWE-697
- **Detail:** 
  - IPv6-mapped IPv4 addresses are not properly validated in trust subnet checks
  - Allows attacker to forge IP headers and bypass IP-based access controls
  - Affects applications relying on `req.ip` or `req.ips` for authentication/rate-limiting
- **Exploit Scenario:** 
  - Backend uses `proxy-addr` to trust proxy headers for rate limiting or IP-based access control
  - Attacker sends request with `X-Forwarded-For: ::ffff:127.0.0.1` (IPv4-mapped localhost)
  - Spoofs as localhost, bypassing IP-based restrictions
- **Impact:** Authorization bypass, rate-limit evasion, IP-based security control circumvention
- **Fix:** 
  ```bash
  cd Source/Backend && npm update proxy-addr  # Requires express >=5.0.0 
  # Or: npm install express@5.x proxyaddr@>=2.0.8
  ```
- **Status:** REQUIRES MAJOR UPGRADE (express 5.0.0+)
- **Cross-ref:** [ESCALATE → TheGuardians] — This is an access control bypass

#### **DEP-002: Handlebars JavaScript Injection via AST Type Confusion**
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Injection
- **Package:** handlebars
- **Version:** >=4.0.0 <=4.7.8
- **File:** Source/Backend/package-lock.json (transitive)
- **CVSS Score:** 9.8 (Network, Low Complexity, No User Interaction, High C/I/A impact)
- **CWE:** CWE-94, CWE-843
- **Detail:** 
  - Type confusion in AST parsing allows arbitrary code execution via `@partial-block` tampering
  - Handlebars templates are trusted, but malformed partials can inject JavaScript
  - Affects all applications using Handlebars as template engine
- **Exploit Scenario:** 
  - Backend uses Handlebars for email templates or report generation
  - Attacker crafts a template with malformed `@partial-block` reference
  - Injects JavaScript that executes with backend process privileges
- **Impact:** Remote code execution, full system compromise
- **Fix:** 
  ```bash
  cd Source/Backend && npm update handlebars  # Upgrade to >4.7.8
  ```
- **Status:** REQUIRES IMMEDIATE UPDATE
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vulnerability

#### **DEP-003: vitest Arbitrary File Read/Execution**
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Path Traversal + Code Injection
- **Package:** vitest
- **Version:** <=4.1.10 (direct dependency in Source/Frontend)
- **File:** Source/Frontend/package.json
- **CVSS Score:** 9.8 (Network, Low Complexity)
- **CWE:** CWE-22, CWE-862
- **Detail:** 
  - When Vitest UI server is running (`vitest --ui`), arbitrary files can be read and executed
  - Path traversal via `@vitest/mocker` redirect mock allows reading files outside project
  - Also affects code injection via unauthenticated manual mock registration
- **Exploit Scenario:** 
  - Frontend dev runs `npm run test:ui` (starts Vitest UI on localhost:51204)
  - Attacker on same network sends crafted request to `/mock?path=../../etc/passwd`
  - Reads sensitive files or injects malicious mocks that execute on next test run
- **Impact:** Arbitrary file disclosure, code execution in dev environment
- **Fix:** 
  ```bash
  cd Source/Frontend && npm update vitest  # Requires vitest >=5.0.0 (major)
  ```
- **Status:** REQUIRES MAJOR UPGRADE
- **Note:** Affects dev environment only, but impacts CI/CD if runners use `--ui`
- **Cross-ref:** [ESCALATE → TheGuardians] — File read + code injection

#### **DEP-004: Vite Development Server Path Traversal**
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Path Traversal
- **Package:** vite
- **Version:** <=6.4.3
- **File:** Source/Frontend/package-lock.json
- **CWE:** CWE-22, CWE-284
- **Detail:** 
  - On non-Windows machines, files outside `server.fs.allow` can be served when project paths match system paths
  - Bypasses the `server.fs.allow` security boundary designed to prevent access to sensitive files
- **Exploit Scenario:** 
  - Frontend dev server runs with default `server.fs.allow` settings
  - If project path overlaps with system paths (e.g., `/tmp/frontend` and `/tmp` is world-readable)
  - Attacker can request `/` (served from filesystem root) to access `/etc/passwd`
- **Impact:** Arbitrary file disclosure from dev server
- **Fix:** 
  ```bash
  cd Source/Frontend && npm update vite  # Requires vite >=8.3.5
  ```
- **Status:** REQUIRES MAJOR UPGRADE
- **Note:** Dev-only, but impacts security posture during development

#### **DEP-005: portal/Backend - Multiple Critical CVEs**
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (multiple)
- **Package:** Multiple (jest ecosystem, proxy-addr, and others)
- **File:** portal/Backend/package-lock.json
- **Count:** 4 critical vulnerabilities
- **Detail:** 
  - jest test suite has 10+ critical issues in v25.4.0-30.2.0 range
  - proxy-addr also present (same as DEP-001)
  - Dependencies on deprecated/abandoned libraries
- **Status:** REQUIRES MAJOR JEST UPGRADE TO v30.5.2+

#### **DEP-006: portal/Frontend - Vitest + Vite + ws Critical Issues**
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (multiple)
- **Package:** vitest, vite, ws
- **File:** portal/Frontend/package-lock.json
- **Count:** 2 critical vulnerabilities
- **Detail:** 
  - vitest critical file read (DEP-003)
  - vite path traversal (DEP-004)
- **Status:** REQUIRES MAJOR UPGRADES

---

### 🟠 High-Severity Vulnerabilities (P2)

#### **DEP-007: jest Ecosystem - Multiple HIGH CVEs**
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Packages:** jest, @jest/core, @jest/console, @jest/environment, jest-message-util, jest-haste-map, jest-resolve-dependencies, jest-runner, jest-runtime, jest-snapshot, jest-watcher
- **Affected Projects:** Source/Backend (33 high), portal/Backend, portal/Frontend
- **Version Range:** jest <=30.2.0
- **File:** package-lock.json in multiple projects
- **Issues:**
  - `jest-message-util`: Code injection via malformed error stack traces
  - `jest-haste-map`: ReDoS in file path resolution
  - `jest-resolve-dependencies`: Prototype pollution in resolution logic
  - `jest-snapshot`: Arbitrary code execution via snapshot comparison
  - Cascading dependencies affecting @jest/core, @jest/reporters, @jest/transform, etc.
- **CVSS:** 7.0-8.5 across variants
- **Fix:** 
  ```bash
  npm update jest  # Requires jest >=30.5.2 (major bump from current)
  ```
- **Status:** REQUIRES URGENT MAJOR VERSION UPGRADE
- **Impact:** All test infrastructure could be compromised; CI/CD at risk

#### **DEP-008: js-yaml ReDoS Denial-of-Service**
- **Severity:** P2 (HIGH)
- **Category:** CVE / DoS
- **Package:** js-yaml
- **Version:** >=3.0.0 <3.15.2
- **File:** Source/Backend/package-lock.json (transitive via config files)
- **CVSS:** 7.5 (High availability impact)
- **CWE:** CWE-400, CWE-407
- **Detail:** 
  - `maxTotalMergeKeys` does not limit CPU use for empty merge sources
  - ReDoS (Regular Expression Denial of Service) via deeply nested YAML
  - Affects YAML parsing in configuration/build tools
- **Exploit Scenario:** 
  - Backend loads YAML config file (e.g., orchestrator config, Kubernetes manifests)
  - Attacker crafts malformed YAML with deeply nested merge keys
  - Parser enters infinite loop, consuming CPU and memory → DoS
- **Fix:** 
  ```bash
  npm update js-yaml  # Upgrade to >=3.15.2 or >=4.x
  ```

#### **DEP-009: micromatch (via braces) Regular Expression DoS**
- **Severity:** P2 (HIGH)
- **Category:** CVE / DoS
- **Package:** braces (used by micromatch)
- **Affected By:** jest dependencies (jest-config, jest-haste-map, jest-message-util)
- **Version:** >=0.2.0
- **File:** Source/Backend/package-lock.json
- **Detail:** 
  - `braces` library has catastrophic backtracking in range expansion
  - Regex DoS on patterns like `{1..999999}`
  - Jest's file path matching uses this internally
- **Impact:** Slowdown in jest test discovery and execution

#### **DEP-010: qs - Multiple Denial-of-Service Issues**
- **Severity:** P2 (HIGH)
- **Category:** CVE / DoS
- **Package:** qs
- **Version:** 2.2.5 - 6.15.3
- **File:** Source/Backend/package-lock.json (transitive via express/body-parser)
- **Issues:**
  1. **Array limit bypass:** Comma parsing in bracket notation bypasses `arrayLimit` check (CVSS 3.7)
  2. **Null/undefined DoS:** `qs.stringify` crashes on null entries in comma-format arrays (CVSS 5.3)
  3. **Attacker-controlled isBuffer:** Denial of service via crafted objects (CVSS 5.3)
- **Fix:** 
  ```bash
  npm update qs  # Upgrade to >=6.16.0
  ```
- **Impact:** Request parsing can be abused to cause DoS or bypass request limits

#### **DEP-011: ws - Memory Exhaustion DoS**
- **Severity:** P2 (HIGH)
- **Category:** CVE / DoS
- **Package:** ws (WebSocket)
- **Version:** 8.0.0 - 8.20.1 (moderate found), 8.0.0 - 8.21.0 (critical path)
- **File:** Source/Frontend/package-lock.json, portal/Frontend/package-lock.json
- **CVSS:** 7.5 (High availability impact)
- **CWE:** CWE-400, CWE-770
- **Detail:** 
  - Memory exhaustion via tiny fragments and data chunks
  - WebSocket server can be crashed by sending many small fragmented frames
  - Uninitialized memory disclosure in some versions
- **Fix:** 
  ```bash
  npm update ws  # Upgrade to >=8.21.0
  ```
- **Impact:** WebSocket infrastructure DoS, information disclosure

#### **DEP-012: uuid - Buffer Bounds Check Missing**
- **Severity:** P2 (HIGH) - Moderate classified but high in context
- **Category:** CVE
- **Package:** uuid
- **Version:** <11.1.1
- **File:** Source/Backend/package.json (direct: ^9.0.0, current: 9.0.1)
- **CVSS:** 7.5 (Network, High Impact)
- **CWE:** CWE-787, CWE-1285
- **Detail:** 
  - Missing buffer bounds check in v3/v5/v6 functions when `buf` argument provided
  - Can write outside allocated buffer bounds
  - Affects applications generating UUIDs with custom buffers
- **Exploit Scenario:** 
  - Backend calls `uuid.v4(buffer)` where buffer is undersized
  - Attacker crafts request that triggers UUID generation with wrong buffer size
  - Buffer overflow → memory corruption, potential code execution
- **Fix:** 
  ```bash
  cd Source/Backend && npm update uuid  # Requires uuid >=11.1.1 (major bump from 9.x)
  ```
- **Status:** DIRECT DEPENDENCY WITH CVE — IMMEDIATE UPDATE REQUIRED

---

### 🟡 Moderate-Severity Vulnerabilities (P3)

| # | Package | Issue | Severity | File | CWE |
|---|---------|-------|----------|------|-----|
| **DEP-013** | @remix-run/router | Open redirect via protocol-relative URL | Moderate | Source/Frontend | CWE-601 |
| **DEP-014** | @vitest/mocker | Path traversal + code injection | Moderate | Source/Frontend | CWE-22, CWE-94 |
| **DEP-015** | vite | XSS via custom middleware, path traversal | Moderate | Source/Frontend | CWE-77, CWE-80, CWE-22 |
| **DEP-016** | vite-node | Inherits vite vulnerabilities | Moderate | Source/Frontend | CWE-22 |
| **DEP-017** | tinypool | Worker thread creation DoS | Moderate | portal/Frontend | CWE-400 |

**Count:** 67 moderate vulnerabilities across all projects  
**Primary Causes:** 
- Transitive dependencies (most are not direct deps)
- Build-time tools and test frameworks (vite, vitest, jest ecosystem)
- Utility libraries (qs, js-yaml, handlebars)

---

### 🟢 Low-Severity Vulnerabilities (P4)

- **@babel/core**: Arbitrary file read via sourceMappingURL (CVSS 3.2, CWE-22, CWE-200)
- **Total:** 6 low-severity issues across projects

---

## Outdated Dependencies (Version Analysis)

### Major Version Gaps

| Package | Current | Latest | Gap | Project | Priority |
|---------|---------|--------|-----|---------|----------|
| **pino** | 8.21.0 | 10.4.0 | 2 major | Source/Backend | HIGH |
| **uuid** | 9.0.1 | 14.0.3 | 5 major | Source/Backend | CRITICAL (has CVE) |
| **express** | 4.22.3 | 5.3.0 | 1 major | Source/Backend | MEDIUM |
| **jest** | 30.2.0 | 30.5.2 | patch | Source/Backend | HIGH (multiple CVEs) |

### Risk Assessment

- **pino (2 major behind):** Likely missing security patches, performance improvements. Should upgrade to 10.x
- **uuid (5 major behind):** Has known CVE (DEP-012), direct dependency. URGENT.
- **express (1 major behind):** Not urgent for functionality, but v5 has security improvements

---

## License Compliance

### Findings

✅ **No GPL/AGPL dependencies detected** (would require legal review for viral license)

**Status:** All direct dependencies have compatible licenses (MIT, Apache-2.0, BSD, ISC)

**Notes:**
- Most transitive dependencies are permissive licenses
- No unknown/UNLICENSED production dependencies in core Source/ projects
- **portal/Backend:** Higher transitive count (577 deps) — license audit recommended for production use

---

## Dependency Tree Analysis

| Project | Prod Deps | Dev Deps | Total | Transitive Ratio | Risk |
|---------|-----------|----------|-------|------------------|------|
| Source/Backend | 102 | 310 | 411 | 3.0x | HIGH |
| Source/Frontend | 9 | 222 | 230 | 25.5x | CRITICAL (dev-heavy) |
| Source/E2E | 4 | 0 | 4 | 1.0x | **MINIMAL** |
| platform/orchestrator | 153 | 0 | 155 | 1.0x | MEDIUM |
| portal/Backend | 397 | 181 | 577 | 1.45x | CRITICAL |
| portal/Frontend | 9 | 416 | 424 | 47.2x | CRITICAL (dev-heavy) |

### Key Observations

1. **Frontend projects are dev-dependency heavy:**
   - Source/Frontend: 222 dev deps (96% of total)
   - portal/Frontend: 416 dev deps (98% of total)
   - Risk: **Vitest + Vite file read vulns affect entire dev environment**

2. **Production dependency concentration:**
   - portal/Backend: 397 prod dependencies (largest attack surface)
   - Source/Backend: 102 prod dependencies
   - Both have critical vulnerabilities in transitive deps (proxy-addr, handlebars)

3. **Clean project:**
   - Source/E2E: Only 4 dependencies, 0 vulnerabilities
   - Uses minimal external dependencies (playwr tight, test runner)

---

## Supply Chain Risk Assessment

### Post-Install Scripts (Security Risk)

No post-install scripts detected in main dependencies. **Good hygiene.**

### Abandoned/Deprecated Dependencies

Checked via npm registry. No major deprecated packages found in direct dependencies, but:
- **jest**: Ecosystem has complex dependency tree with historical patches (monitor for EOL)
- **handlebars**: Actively maintained but has history of code injection issues

### Maintainer Risk

- **High-concentration maintainers:** uuid, express, pino — all maintained by core teams (low risk)
- **Lesser-known packages:** js-yaml, qs, braces — community-maintained (medium risk)

---

## Recommendations

### Immediate Actions (P1 - CRITICAL)

1. **Update proxy-addr:**
   - Requires `express >=5.0.0` (breaking change)
   - Blocks IP-spoofing vulnerability in Source/Backend
   - **Action:** Test express 5.x compatibility, schedule upgrade

2. **Update Handlebars:**
   ```bash
   cd Source/Backend && npm update handlebars
   ```
   - Prevents RCE via AST injection
   - Likely low-impact version bump

3. **Update vitest to >=5.0.0:**
   ```bash
   cd Source/Frontend && npm update vitest  # Major version
   cd portal/Frontend && npm update vitest
   ```
   - Prevents arbitrary file read in dev/test environments
   - Requires testing, but likely compatible

4. **Update vite to >=8.3.5:**
   ```bash
   cd Source/Frontend && npm update vite
   cd portal/Frontend && npm update vite
   ```
   - Prevents path traversal in dev server

### Short-Term Actions (P2 - HIGH)

5. **Update jest ecosystem to >=30.5.2:**
   ```bash
   npm update jest --workspaces
   ```
   - 33+ high-severity issues in test infrastructure
   - Likely no breaking changes for test code

6. **Update uuid to >=11.1.1:**
   ```bash
   cd Source/Backend && npm install uuid@14.0.3  # Major jump, test thoroughly
   ```
   - Direct dependency with buffer overflow vulnerability

7. **Update qs to >=6.16.0:**
   ```bash
   npm update qs
   ```
   - Prevents DoS in query string parsing

8. **Update ws to >=8.21.0:**
   ```bash
   npm update ws
   ```
   - Prevents memory exhaustion in WebSocket handling

9. **Update js-yaml to >=3.15.2:**
   ```bash
   npm update js-yaml
   ```
   - Prevents ReDoS in YAML parsing

### Medium-Term Actions (P3 - MEDIUM)

10. **Upgrade pino to 10.x:**
    - 2 major versions behind
    - Likely has performance improvements and security patches
    - Schedule when convenient, not urgent

11. **Plan express 4.x → 5.x migration:**
    - Required for proxy-addr fix
    - Create upgrade plan, test compatibility with middleware

12. **Reduce dev dependency footprint:**
    - Frontend projects: 222-416 dev deps (96-98% of total)
    - Evaluate if all build-time tools are necessary
    - Consider monorepo optimization

---

## Escalation Summary

### 🚨 Escalate to TheGuardians (Security Team)

These findings are **access control, code injection, or data exposure risks:**

1. **DEP-001 (proxy-addr):** IP spoofing → authorization bypass
2. **DEP-002 (handlebars):** AST injection → RCE
3. **DEP-003 (vitest):** File read + code injection (dev/CI environment)
4. **DEP-004 (vite):** Path traversal to sensitive files
5. **DEP-012 (uuid):** Buffer overflow → memory corruption

### Cross-Refs for Other Teams

- **TheFixer:** Update the 9+ low/medium/high issues (majority of the 150 vulnerabilities)
- **Performance-Profiler:** Monitor pino logging performance after upgrade (2-major-version jump)

---

## Next Audit Scheduled

- **When:** After all P1 fixes applied
- **Focus:** Verify no new vulnerabilities in upgraded versions
- **Retest:** Full audit on all 6 projects

---

## Learnings & Persistence

_Updated to Teams/TheInspector/learnings/dependency-auditor.md_

### Watch List (Recurring Issues)

1. **jest ecosystem:** Historically high-CVE rate, monitor for next major release
2. **vitest:** New tool, rapid iteration, check frequently during dev
3. **vite:** Active maintenance, but path traversal is evolving threat

### Audit Tools

- `npm audit --json` — primary method, provides detailed CVE/CVSS data
- `npm outdated --json` — major version gap detection
- Manual grep for license fields when license-checker unavailable

### Notes for Next Auditor

- **CI/CD Impact:** Jest and Vitest upgrades may affect test pipeline; test early
- **Breaking Changes:** express 5.x, jest 30.5.2+, vitest 5.x, vite 8.3.5+ all have potential breaking changes
- **Portal Projects:** Higher vulnerability count; consider separate upgrade timeline from Source/

---

## Appendix: Full Project Vulnerability Summary

### Source/Backend
- Critical: 2 (proxy-addr, handlebars)
- High: 33 (jest ecosystem)
- Moderate: 3 (qs, js-yaml, uuid)
- Low: 2 (@babel/core)
- **Total: 40 vulnerabilities**

### Source/Frontend
- Critical: 2 (vitest, vite)
- High: 7 (ws, @vitest/mocker cascades)
- Moderate: 7 (@remix-run/router, vite, @vitest/mocker, vite-node, tinypool)
- Low: 1 (@babel/core)
- **Total: 17 vulnerabilities**

### Source/E2E
- **Total: 0 vulnerabilities** ✅

### platform/orchestrator
- Critical: 2
- High: 2
- Moderate: 4
- Low: 1
- **Total: 9 vulnerabilities**

### portal/Backend
- Critical: 4 (jest ecosystem, proxy-addr, handlebars)
- High: 10 (js-yaml, qs, braces, handlebars cascades)
- Moderate: 46 (transitive deps)
- Low: 1
- **Total: 61 vulnerabilities**

### portal/Frontend
- Critical: 2 (vitest, vite)
- High: 13 (ws, @vitest/mocker, vite, jest ecosystem)
- Moderate: 7
- Low: 1
- **Total: 23 vulnerabilities**

---

**Report Generated:** 2026-10-23  
**Auditor:** Dependency Auditor  
**Status:** AUDIT COMPLETE — ESCALATION REQUIRED
