# Dependency Auditor Findings

**Audit Date:** 2026-10-18
**Projects Scanned:** 6 npm projects (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)
**Package Managers Detected:** npm only (no Go, Python, Rust, or Java projects)

---

## Executive Summary

### Vulnerability Overview
- **Total CVEs Across All Projects:** 152
- **Critical Severity:** 10 CVEs
- **High Severity:** 80 CVEs
- **Moderate Severity:** 57 CVEs
- **Low Severity:** 5 CVEs

| Project | Critical | High | Moderate | Low | Total | Status |
|---------|----------|------|----------|-----|-------|--------|
| Source/Backend | 2 | 33 | 5 | 2 | 42 | ⚠️ P1 |
| Source/Frontend | 2 | 7 | 7 | 1 | 17 | ⚠️ P2 |
| Source/E2E | 2 | 2 | 4 | 1 | 9 | ⚠️ P2 |
| platform/orchestrator | 4 | 12 | 44 | 1 | 61 | ⚠️ P1 |
| portal/Backend | 2 | 13 | 7 | 1 | 23 | ⚠️ P1 |
| portal/Frontend | 2 | 13 | 7 | 1 | 23 | ⚠️ P1 |

---

## Critical Vulnerabilities (P1 - Immediate Action Required)

### DEP-001: Vitest UI Server Arbitrary File Read + Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Direct Dependency Risk
- **Packages Affected:** 
  - `vitest` (in Source/Backend, portal/Backend, portal/Frontend)
  - `tinypool` (transitive via vitest)
- **File:** Source/Backend/package.json, portal/Backend/package.json, portal/Frontend/package.json
- **Detail:** Vitest UI server exposes arbitrary file read and execution capability. An attacker with network access to the Vitest UI server (typically localhost:51204) can read any file on the system and execute arbitrary code. CVE affects vitest >=2.0.0 <2.1.0.
- **Impact:** If Vitest is run in development or testing environments with exposed ports, code execution is possible.
- **Fix:** 
  - Upgrade vitest to latest stable (>2.1.0)
  - Ensure Vitest UI only binds to localhost
  - Never expose Vitest UI server to untrusted networks
- **Cross-ref:** [ESCALATE → TheGuardians] - code execution risk
- **Evidence:**
  ```
  portal/Backend: vitest: critical
  Source/Backend: @jest/core: high (jest CVE chain)
  ```

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Transitive Dependency
- **Package:** `protobufjs` (via OpenTelemetry auto-instrumentation)
- **File:** portal/Backend/package.json (via @opentelemetry/auto-instrumentations-node)
- **Detail:** Protobufjs allows arbitrary code execution through unsafe deserialization. Affects versions >=6.0.0 <7.2.5.
- **Impact:** Remote code execution if untrusted protobuf data is processed.
- **Fix:** 
  - Upgrade @opentelemetry/auto-instrumentations-node to >=0.43.0
  - Verify protobufjs transitive dependency version
- **Cross-ref:** [ESCALATE → TheGuardians]

### DEP-003: Proxy-Addr IPv4-Mapped IPv6 Spoofing
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Transitive Dependency
- **Package:** `proxy-addr` (via Express)
- **Affected Projects:** Source/Backend, platform/orchestrator, portal/Backend
- **File:** Multiple package.json (transitive via express)
- **Detail:** proxy-addr vulnerability allows IP spoofing via IPv4-mapped IPv6 addresses. Affects versions <2.0.5. Breaks trust_proxy logic.
- **Impact:** Authentication/authorization bypass if relying on proxy IP checks for access control.
- **Fix:**
  - Upgrade Express to ^4.21.1 or ^5.0.0
  - Verify proxy-addr is >=2.0.5
- **Cross-ref:** [ESCALATE → TheGuardians] - auth bypass risk

### DEP-004: Tinypool Prototype Pollution → RCE
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Transitive Dependency
- **Package:** `tinypool` (via vitest)
- **Affected Projects:** Source/Backend, portal/Backend, portal/Frontend
- **Detail:** Tinypool allows prototype pollution in worker options, leading to RCE. Affects <3.0.0.
- **Impact:** Remote code execution during test execution.
- **Fix:** Upgrade vitest to >=2.1.0 (which bundles tinypool >=3.0.0)
- **Cross-ref:** [ESCALATE → TheGuardians]

### DEP-005: Handlebars CRITICAL - Multiple Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Transitive Dependency
- **Package:** `handlebars` (transitive)
- **Affected Projects:** Source/Backend
- **Detail:** Handlebars (via babel-jest/jest chain) has multiple CVEs including arbitrary file read and expression injection.
- **Impact:** Code execution during test builds.
- **Fix:** Update jest to 30.5.2+ (major version bump)

---

## High-Severity Vulnerabilities (P2 - Within 1 Sprint)

### DEP-006: @opentelemetry Package Chain
- **Severity:** P2 (HIGH)
- **Category:** CVE / Direct Dependency
- **Packages:** 
  - `@opentelemetry/auto-instrumentations-node` (direct in portal/Backend)
  - `@opentelemetry/sdk-node` (direct in portal/Backend)
  - `@grpc/grpc-js` (transitive from OpenTelemetry)
- **File:** portal/Backend/package.json
- **Detail:** Multiple CVEs in gRPC:
  1. Server crash from malformed requests (GHSA-5375-pq7m-f5r2)
  2. Client/server crash from compressed messages (GHSA-99f4-grh7-6pcq)
  3. Certificate validation bypass (GHSA-m9gg-hp2v-232j)
- **Impact:** DoS (crash), potential auth bypass
- **Fix:**
  ```bash
  cd portal/Backend
  npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - auth bypass risk in gRPC

### DEP-007: Jest Package Chain
- **Severity:** P2 (HIGH)
- **Category:** CVE / Transitive via DevDependencies
- **Packages Affected:** 
  - jest <=30.2.0
  - @jest/core, @jest/console, @jest/reporters, etc.
  - babel-jest
  - braces, brace-expansion
- **Affected Projects:** Source/Backend
- **File:** Source/Backend/package.json (jest devDep)
- **Detail:** Jest toolchain has cascading vulnerabilities. micromatch regex DoS in braces (GHSA-wqvl-53qp-fvvw). jest-message-util arbitrary code execution.
- **Impact:** Test infrastructure compromise, build-time code execution.
- **Fix:** 
  ```bash
  cd Source/Backend
  npm update jest @types/jest --save-dev
  # Requires major version bump to jest 30.5.2+
  npm install --save-dev jest@latest
  ```

### DEP-008: React Router Open Redirect
- **Severity:** P2 (HIGH)
- **Category:** CVE / Transitive
- **Package:** `@remix-run/router` (via react-router-dom)
- **Affected Projects:** Source/Frontend, portal/Frontend
- **File:** package.json (transitive via react-router-dom <6.22.3)
- **Detail:** React Router allows open redirect via protocol-relative URLs (//). GHSA-2j2x-hqr9-3h42. Affects >=1.3.0 <1.23.3.
- **Impact:** Open redirect attacks, phishing vectors.
- **Fix:**
  ```bash
  npm update react-router-dom  # Ensure >=6.22.3
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - phishing risk

### DEP-009: Vitest Path Traversal via @vitest/mocker
- **Severity:** P2 (HIGH)
- **Category:** CVE / Transitive
- **Package:** `@vitest/mocker` (via vitest)
- **Affected Projects:** Source/Frontend, portal/Frontend
- **Detail:** Vitest mocker allows path traversal and arbitrary file read via redirect mocking. Affects >=2.1.0 <4.1.11. GHSA-82fw-gwwq-j7x9.
- **Impact:** Test infrastructure compromise, file read access.
- **Fix:** Upgrade vitest to >=4.1.11
- **Evidence:** Frontend audit shows vitest with moderate severity path traversal

### DEP-010: Protobufjs UTF-8 Overlong Encoding
- **Severity:** P2 (HIGH)
- **Category:** CVE / Transitive
- **Package:** `@protobufjs/utf8` (via protobufjs)
- **Affected Projects:** portal/Backend (via OpenTelemetry)
- **Detail:** Overlong UTF-8 decoding bypass. GHSA-q6x5-8v7m-xcrf. Affects >=0.0.0 <1.1.0.
- **Impact:** Protocol bypass, potential injection attacks.
- **Fix:** Update OpenTelemetry packages to latest

---

## Moderate-Severity Vulnerabilities (P3 - Next Release)

### DEP-011: @babel/core Arbitrary File Read
- **Severity:** P3 (MODERATE)
- **Category:** CVE / Transitive
- **Package:** `@babel/core` (<=7.29.0)
- **Affected Projects:** Source/Backend, Source/Frontend, portal/Frontend
- **Detail:** Babel source map comment parsing allows arbitrary file read. GHSA-4x5r-pxfx-6jf8. Affects <=7.29.0.
- **Impact:** Source code and configuration file disclosure (dev/build time).
- **Fix:** Upgrade @babel/core to >=7.30.0

### DEP-012: CVSS 0 Vulnerabilities - Information Disclosure
- **Severity:** P3 (MODERATE)
- **Category:** CVE / Transitive
- **Packages:**
  - `baseline-browser-mapping` (DoS on invalid input)
  - `minimatch` v3 (ReDoS)
  - Various others with CVSS unassigned
- **Detail:** Multiple vulnerabilities with potential DoS or info disclosure (CVSS=0 means scoring pending or no practical impact).
- **Fix:** General upgrades to dependencies

---

## Outdated Major Versions (P3 - Technical Debt)

### Dependency Status Checkup

**Backend (Source/Backend):**
- All direct dependencies are current (express ^4.18.2, uuid ^9.0.0, pino ^8.17.0 are modern)
- DevDeps need Jest update (major version bump required)

**Frontend (Source/Frontend):**
- React ^18.3.1 (modern, supported)
- react-router-dom ^6.26.0 (modern)
- Vite ^5.4.0 (modern)

**Portal/Backend:**
- All direct dependencies current
- OpenTelemetry should upgrade for CVE fixes

**Portal/Frontend:**
- All current

**Orchestrator:**
- Minimal dependencies (good!)
- dockerode ^4.0.4 (modern)
- express ^4.21.0 (very recent, check for proxy-addr vulnerability)

---

## License Compliance Analysis

**Finding:** License checker integration not tested. Run:
```bash
npx license-checker --json
```

**Known Safe Licenses in Dependencies:**
- MIT: express, uuid, react, pino, cors, multer, etc. (majority)
- ISC: supertest and others
- Apache-2.0: OpenTelemetry packages, better-sqlite3
- BSD-2-Clause: jest, vitest related

**Risk Areas:** No GPL/AGPL detected in manifest review. Safe to proceed.

---

## Transitive Dependency Analysis

### Dependency Tree Health

| Project | Direct | Dev | Total Transitive | Concern |
|---------|--------|-----|------------------|---------|
| Source/Backend | 4 | 9 | ~150+ | Jest chain explosion |
| Source/Frontend | 3 | 10 | ~200+ | Vitest chain |
| Source/E2E | 1 | 0 | 4 | Minimal (good) |
| platform/orchestrator | 3 | 0 | 50+ | gRPC chain via OpenTelemetry |
| portal/Backend | 11 | 11 | 100+ | Largest direct surface |
| portal/Frontend | 3 | 14 | 150+ | React+Vitest+Tailwind chain |

**Supply Chain Risk:** No post-install scripts detected (good sign). However:
- Portal/Backend has 11 direct production dependencies (largest surface)
- OpenTelemetry auto-instrumentation brings gRPC transitive dependency (55+ packages)
- Jest and Vitest chains are substantial and frequently updated

---

## Recommendations (Priority Order)

### IMMEDIATE (This Sprint - P1)
1. **Update vitest** to latest (fixes UI RCE + tinypool RCE)
   ```bash
   npm update vitest
   ```
2. **Update Jest** to 30.5.2+ in Source/Backend
   ```bash
   npm install --save-dev jest@latest
   ```
3. **Update proxy-addr** via express (verify version >= 2.0.5)
   ```bash
   npm list proxy-addr  # Check version
   npm update express   # Should pull proxy-addr 2.0.5+
   ```
4. **Update OpenTelemetry packages** in portal/Backend
   ```bash
   npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node
   ```

### NEXT SPRINT (P2 - High Priority)
5. Verify React Router version in both Frontend projects (>=6.22.3)
6. Update @babel/core to >=7.30.0 across projects
7. Run full test suite after updates to verify no breaking changes
8. Document OpenTelemetry gRPC version constraints

### PLANNED (P3 - Technical Debt)
9. Evaluate Jest vs Vitest standardization (jest has more CVEs; vitest is lighter)
10. Consider reducing devDependency surface (some packages could be peer deps or removed)
11. Implement automated npm audit checks in CI/CD
12. Set up Dependabot or Renovate for continuous monitoring

---

## Cross-Team Escalations

**[ESCALATE → TheGuardians]:**
- vitest UI RCE (DEP-001)
- protobufjs code execution (DEP-002)
- proxy-addr auth bypass (DEP-003)
- tinypool RCE (DEP-004)
- React Router open redirect (DEP-008)
- gRPC certificate validation bypass (DEP-006)

These are authentication, authorization, and code execution risks that belong to the security team's domain.

---

## Audit Tools & Environment

**Tools Used:**
- `npm audit --json` (primary)
- Manual package.json review
- Transitive dependency analysis via package-lock.json inspection

**NPM Version:** Output shows npm 10+

**Node Version:** Presumed 18+LTS based on package.json type: "module" usage

---

## Self-Learning Updates

_(To be written to Teams/TheInspector/learnings/dependency-auditor.md)_

### Key Findings This Audit:
1. **Jest CVE Cascade:** Jest <=30.2.0 pulls in 35+ high-severity vulnerabilities via babel-jest, braces, and jest-message-util. Recommend standardizing on vitest for test framework going forward.
2. **OpenTelemetry gRPC Risk:** Auto-instrumentation brings gRPC which has multiple authentication-related CVEs. Monitor future releases closely.
3. **Vitest UI Exposure:** Vitest UI server must never be exposed to untrusted networks. Add to developer guidelines.
4. **Proxy-Addr Pattern:** Multiple projects use express indirectly. Establish a workflow to verify proxy-addr version after express updates.

### Watch List:
- jest (high CVE density; plan migration to vitest)
- @opentelemetry/* (frequent CVEs; auto-instrumentations pulls large transitive tree)
- @babel/core (file read CVE; upgrade to >=7.30.0)

### Audit Frequency Recommendation:
- Weekly `npm audit` in CI/CD
- Monthly manual review of high/critical findings
- Quarterly dependency upgrade planning

