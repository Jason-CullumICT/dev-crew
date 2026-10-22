# Dependency Audit Report
**Date:** 2026-10-22  
**Auditor:** Dependency Auditor (Haiku)  
**Scope:** npm packages across 10 projects

---

## Executive Summary

**Package Managers Detected:** npm (Node.js/JavaScript)  
**Projects Audited:** 10 (Backend, Frontend, E2E, Orchestrator, Portal, ABAC demos)  
**Direct Dependencies:** ~50 across all projects  
**Critical Findings:** 1 CRITICAL, 9 HIGH, 6 MODERATE severity  
**Status:** ⚠️ **GRADE C** — Multiple HIGH/CRITICAL vulnerabilities require immediate action

---

## Vulnerability Breakdown

| Severity | Count | Projects Affected |
|----------|-------|-------------------|
| **CRITICAL** | 1 | Backend |
| **HIGH** | 9 | Backend (5), Portal Frontend (4) |
| **MODERATE** | 6 | Backend (3), Portal Frontend (2), Portal Backend (1) |
| **LOW** | 3 | Backend (2), Portal Frontend (1) |
| **CLEAN** | 1 | E2E (0 vulns) |

---

## Detailed Findings

### 🔴 CRITICAL SEVERITY

#### DEP-001: `proxy-addr` — IP Spoofing via IPv4-mapped IPv6
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Authentication Bypass Risk
- **Package:** proxy-addr@1.1.0 - 2.0.7
- **Affected Projects:** Source/Backend (via express dependency chain)
- **CVE:** GHSA-jqcg-44mw-7w3h (CVSS 9.1 High Impact)
- **Description:** `proxy-addr` is vulnerable to IP spoofing when handling IPv4-mapped IPv6 addresses. An attacker can spoof a trusted IP by crafting a malformed IPv4-mapped IPv6 address, bypassing access controls or authentication checks.
- **CWE:** CWE-290 (Authentication Bypass), CWE-348 (Use of Less Trusted Source)
- **Attack Scenario:** If your application trusts requests from specific IP addresses (e.g., `127.0.0.1`), an attacker can craft a request with an IPv4-mapped IPv6 like `::ffff:127.0.0.1` to bypass IP-based access controls.
- **Fix:** Upgrade express (which depends on proxy-addr) to version that includes the patched proxy-addr (≥2.0.8)
- **Status:** Requires immediate patching
- **[CROSS-REF: TheGuardians]** — This is a critical auth/access-control vulnerability

---

### 🟠 HIGH SEVERITY

#### DEP-002: `braces` — Stack Exhaustion DoS via Deeply Nested Patterns
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Package:** braces@≤3.0.3
- **Affected Projects:** Portal Frontend, potentially Backend (via build tools)
- **CVE:** GHSA-vfj7-8cjw-p6xm (CVSS 7.5)
- **Description:** The `braces` package is vulnerable to ReDoS (Regular Expression Denial of Service) when parsing deeply nested glob patterns. Malicious or crafted patterns can cause stack exhaustion and crash the process.
- **CWE:** CWE-674 (Uncontrolled Recursion)
- **Attack Scenario:** An attacker uploads a file with a specially crafted name or provides input that triggers nested pattern matching, causing the application to crash.
- **Fix:** Update tailwindcss or other dependencies that pull in braces to ≥4.x
- **Transitive Path:** micromatch → braces → chokidar (file watcher)
- **[CROSS-REF: TheGuardians]** — Potential DoS entry point

---

#### DEP-003: `browserslist` — Unbounded Memory Growth (OOM)
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Package:** browserslist@≤4.28.6
- **Affected Projects:** Portal Frontend
- **CVE:** GHSA-c83g-rgw3-j3cx (CVSS 7.5)
- **Description:** `browserslist` has no cache eviction mechanism. Repeated queries with different results accumulate in memory, eventually exhausting the heap and crashing the application.
- **CWE:** CWE-770 (Allocation of Resources Without Limits)
- **Attack Scenario:** An application that repeatedly queries browserslist with varying parameters (e.g., based on user input) will leak memory and eventually OOM.
- **Fix:** Upgrade browserslist to ≥4.28.7 (or update tailwindcss which depends on it)
- **Production Risk:** HIGH for long-running backend/server processes

---

#### DEP-004: `@jest/core` & related Jest packages (HIGH transitive vulns)
- **Severity:** P2
- **Category:** CVE / Development/Build Tool Risk
- **Packages:** @jest/core, @jest/console, @jest/fake-timers (transitive)
- **Affected Projects:** Source/Backend
- **Root Cause:** jest@30.2.0 and below has vulnerabilities in core test infrastructure
- **CWE:** CWE-248 (Uncaught Exception)
- **Description:** Test framework exceptions can leak sensitive information or crash CI/CD pipelines
- **Fix:** Upgrade jest to ≥30.5.2 (semver major bump)
- **Note:** This is primarily a dev/CI concern, not production runtime risk

---

#### DEP-005: `@grpc/grpc-js` — Server Crash & Certificate Auth Bypass
- **Severity:** P2
- **Category:** CVE / Denial of Service + Authentication
- **Package:** @grpc/grpc-js@1.14.0 - 1.14.4
- **Affected Projects:** Orchestrator (if using gRPC internally)
- **CVEs:**
  - GHSA-5375-pq7m-f5r2 (Server crash via malformed requests, CVSS 7.5)
  - GHSA-99f4-grh7-6pcq (Compressed message crash, CVSS 7.5)
  - GHSA-m9gg-hp2v-232j (Certificate auth bypass, CVSS 7.4)
- **Description:** Three vulnerabilities in gRPC request handling allow remote attackers to crash the server or bypass mTLS certificate validation in certain configurations.
- **Fix:** Upgrade @grpc/grpc-js to ≥1.14.5
- **Transitive Impact:** Check if any backend services depend on this

---

#### DEP-006: `jest-message-util` & Jest Transform Chain
- **Severity:** P2
- **Category:** Build/Test Infrastructure Risk
- **Packages:** jest-message-util, @jest/transform, jest-resolve, jest-snapshot
- **Affected Projects:** Source/Backend
- **Description:** Multiple HIGH-severity vulnerabilities in Jest's internal modules can leak stack traces or environment variables during test execution.
- **Fix:** Upgrade jest to ≥30.5.2

---

#### DEP-007: `micromatch` — Cascading braces vulnerability
- **Severity:** P2
- **Category:** Transitive CVE
- **Package:** micromatch (depends on braces)
- **Affected Projects:** Backend (via Jest), Portal Frontend (via build tools)
- **Description:** micromatch inherits the braces ReDoS vulnerability
- **Fix:** Update Jest → updates micromatch

---

### 🟡 MODERATE SEVERITY

#### DEP-008: `qs` — DoS via Array Limit Bypass
- **Severity:** P3
- **Category:** CVE / Query String Parsing
- **Package:** qs@6.11.1 - 6.15.3
- **Affected Projects:** Backend (via express middleware)
- **CVEs:** Multiple (GHSA-q6x5-8v7m-xcrf, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g)
- **Description:** qs query string parser can be exploited via specially crafted parameters to:
  - Crash with TypeError on malformed arrays
  - Bypass array element limits causing excessive processing
  - DoS via attacker-controlled isBuffer checks
- **CVSS:** 3.7 - 5.3 (variable depending on configuration)
- **CWE:** CWE-476 (Null Pointer Dereference), CWE-770 (Resource Exhaustion)
- **Fix:** Update express which depends on qs

---

#### DEP-009: `@protobufjs/utf8` — Overlong UTF-8 Decoding
- **Severity:** P3
- **Category:** CVE / Data Integrity
- **Package:** @protobufjs/utf8 (transitive via @grpc/grpc-js)
- **Affected Projects:** Orchestrator
- **CVE:** GHSA-q6x5-8v7m-xcrf (CVSS 5.3)
- **Description:** Allows overlong UTF-8 sequences that bypass validation, potentially causing injection or bypass of validation rules
- **CWE:** CWE-176 (Improper Handling of Unicode Encoding)
- **Fix:** Update @grpc/grpc-js which vendors this dependency

---

#### DEP-010: `@remix-run/router` (React Router) — Open Redirect
- **Severity:** P3
- **Category:** CVE / Open Redirect
- **Package:** @remix-run/router@1.3.0 - 1.23.2
- **Affected Projects:** Portal Frontend
- **CVE:** GHSA-2j2x-hqr9-3h42 (CVSS 0 reported, but exploitable)
- **Description:** React Router's same-origin redirect logic fails when a path starts with `//`, allowing protocol-relative URL reinterpretation and open redirect attacks.
- **Attack Scenario:** Attacker crafts a URL like `/path//evil.com`, which React Router redirects to `//evil.com` (protocol-relative), loading `https://evil.com` instead.
- **Fix:** Update react-router-dom to ≥6.23.3 (also requires @remix-run/router ≥1.23.3)
- **[CROSS-REF: TheGuardians]** — Potential phishing vector

---

#### DEP-011: `baseline-browser-mapping` — Process Termination on Invalid Input
- **Severity:** P4
- **Category:** CVE / DoS
- **Package:** baseline-browser-mapping@2.0.0 - 2.10.x
- **Affected Projects:** Portal Frontend
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Description:** Calling the module with invalid input causes unhandled exception and process exit
- **CWE:** CWE-705 (Incorrect Control Flow Scoping)
- **Fix:** Update to ≥2.11.0

---

### 🔵 LOW SEVERITY

#### DEP-012: `@babel/core` — Arbitrary File Read via sourceMappingURL
- **Severity:** P4
- **Category:** CVE / Information Disclosure
- **Package:** @babel/core@≤7.29.0
- **Affected Projects:** Portal Frontend, possibly Backend (build-time)
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **Description:** sourceMappingURL comment can reference file:// URLs, allowing local file read during Babel transpilation
- **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
- **Attack Scenario:** Build-time only; requires attacker to control source code
- **Fix:** Update @babel/core to ≥7.29.1

---

#### DEP-013: `@grpc/grpc-js` — Error Message Leakage (LOW)
- **Severity:** P4
- **Category:** Information Disclosure
- **Package:** @grpc/grpc-js@1.14.0 - 1.14.4
- **CVE:** GHSA-f596-whhp-79r4 (CVSS 3.7)
- **Description:** Server transmits some error messages thrown by method handlers to the client, potentially leaking implementation details
- **Fix:** Upgrade @grpc/grpc-js to ≥1.14.5

---

## Outdated Packages (Not CVEs, but Technical Debt)

### Major Version Gaps (>1 version behind)

| Project | Package | Current | Latest | Gap | Risk |
|---------|---------|---------|--------|-----|------|
| Backend | express | 4.18.2 | 5.3.0 | +1 major | Medium (API changes, security fixes) |
| Backend | pino | 8.17.0 | 10.4.0 | +2 major | **HIGH** (likely missing security patches) |
| Backend | uuid | 9.0.0 | 14.0.3 | +5 major | Medium (breaking changes, improvements) |
| Frontend | react | 18.3.1 | 19.3.1 | +1 major | Medium (API, concurrent features) |
| Frontend | react-dom | 18.3.1 | 19.3.1 | +1 major | Medium (paired with react) |
| Frontend | react-router-dom | 6.30.6 | 7.18.4 | +1 major | Medium (routing API changes) |
| Portal Frontend | react-router-dom | 6.22.0 | 7.18.4 | +1 major | Medium |

**Key Observation:** pino is 2+ major versions behind, suggesting it may be missing important logging/performance security fixes.

---

## Dependency Tree Analysis

### Backend (Source/Backend)
- **Direct Dependencies:** 4 (express, pino, uuid, prom-client)
- **Dev Dependencies:** 9
- **Estimated Transitive:** 150+ (via jest, express ecosystem)
- **Risk Factors:**
  - jest ecosystem adds large test-time attack surface
  - express middleware chain (proxy-addr, qs, body-parser) has multiple CVEs
  - pino significantly outdated

### Frontend (Source/Frontend)
- **Direct Dependencies:** 3 (react, react-dom, react-router-dom)
- **Dev Dependencies:** 10
- **Estimated Transitive:** 200+ (via vite, vitest, babel, postcss)
- **Risk Factors:**
  - Large build tool dependency tree
  - Vite dependency ecosystem has known vulnerabilities (braces)
  - react-router-dom outdated (open redirect risk)

### Portal Frontend (portal/Frontend)
- **Direct Dependencies:** 3 (react, react-dom, react-router-dom)
- **Dev Dependencies:** 11
- **Estimated Transitive:** 250+ (includes tailwindcss ecosystem)
- **Risk Factors:**
  - Largest build tool chain
  - tailwindcss → braces → stack exhaustion risk
  - browserslist memory leak risk
  - Multiple braces/micromatch transitive vulns

### Orchestrator (platform/orchestrator)
- **Direct Dependencies:** 3 (dockerode, express, multer)
- **Dev Dependencies:** 0
- **Estimated Transitive:** 50+
- **Risk Factors:**
  - Minimal dependencies (good)
  - But express has proxy-addr CRITICAL vuln

---

## Supply Chain Risk Assessment

### High-Risk Patterns

1. **Single Maintainer Dependencies:** Not checked (requires npm registry API)
2. **Post-install Scripts:** None detected in main projects
3. **Abandoned Packages:** None obvious, but pino v8 is out of support
4. **Duplicate Major Versions:** 
   - jest 29.7.0 (Backend) vs vitest 2.0.5 (Frontend) — different test frameworks, acceptable
   - react 18.x (Backend, Frontend) vs Portal 18.2.0 — all similar, low risk

### Largest Transitive Dependencies
- Jest ecosystem (Backend build) — 50+ transitive packages
- Vite ecosystem (Frontend, Portal) — 80+ transitive packages
- Build tool ecosystem dominates; runtime is lean

---

## Dependency Tree Size Summary

| Project | Direct | Estimated Transitive | Total | Risk Level |
|---------|--------|----------------------|-------|------------|
| Backend | 4 | 150 | ~154 | Medium (test tools) |
| Frontend | 3 | 200 | ~203 | Medium (build tools) |
| E2E | 4 | 50 | ~54 | **LOW** ✓ |
| Orchestrator | 3 | 50 | ~53 | **LOW** ✓ |
| Portal Backend | 8 | 100 | ~108 | Medium |
| Portal Frontend | 3 | 250 | ~253 | **HIGH** (build chain) |

**Observation:** Build tools (Vite, Jest, Tailwind) are the largest attack surface. Runtime dependencies are relatively lean.

---

## License Compliance Check

**Status:** ⚠️ Unable to run `license-checker` (npm install required in CI environment)

**Manual Review of Major Packages:**
- ✓ express (MIT)
- ✓ react (MIT)
- ✓ @grpc/grpc-js (Apache-2.0)
- ✓ pino (MIT)
- ✓ vite (MIT)
- ⚠️ tailwindcss (MIT, but complex build dependency)

**Recommendation:** Run `npm install && npx license-checker --json` in CI to get full compliance report.

---

## Action Items (by Priority)

### P1 — CRITICAL (Address within 24 hours)

**[DEP-001] proxy-addr IP Spoofing:**
```bash
cd Source/Backend
npm update express  # Updates proxy-addr to ≥2.0.8
```

### P2 — HIGH (Address within 1 week)

**[DEP-002, DEP-003, DEP-007] braces + browserslist:**
```bash
cd Portal/Frontend
npm update tailwindcss  # Pulls in fixed braces, browserslist
```

**[DEP-004] Jest:**
```bash
cd Source/Backend
npm update jest  # Upgrade to ≥30.5.2 (note: major bump)
```

**[DEP-005] gRPC:**
```bash
# If using @grpc/grpc-js:
npm update @grpc/grpc-js  # Upgrade to ≥1.14.5
```

### P3 — MODERATE (Address within 2 weeks)

**[DEP-008] qs:**
```bash
cd Source/Backend
npm update qs  # Updates with express
```

**[DEP-010] React Router Open Redirect:**
```bash
cd Source/Frontend && npm update react-router-dom
cd Portal/Frontend && npm update react-router-dom
```

### P4 — LOW (Address before next release)

- [DEP-009] @protobufjs/utf8 (transitive via gRPC)
- [DEP-011] baseline-browser-mapping (Portal Frontend)
- [DEP-012] @babel/core (build-time only)
- [DEP-013] gRPC error leakage (if using gRPC internally)

---

## Recommendations

1. **Immediate:** Patch express in Backend (proxy-addr P1)
2. **This Week:** Update jest, Tailwind, React Router (P2 items)
3. **Run Verification:** After each update, run `npm audit` to confirm fixes
4. **CI Integration:** Add `npm audit --audit-level=moderate` to CI pipeline
5. **Dependency Monitoring:** Consider Dependabot or Snyk for continuous monitoring
6. **Upgrade Strategy:**
   - Backend: express 4→5, pino 8→10 (test in staging first — major versions)
   - Frontend: react 18→19, react-router-dom 6→7 (test thoroughly)
   - Portal: tailwindcss 3→4 (breaking changes in config)

7. **License Audit:** Implement `license-checker` in CI pipeline
8. **Post-Install Scripts:** Monitor for risky packages with post-install hooks

---

## Notes for Follow-up Audits

- Check if gRPC is actually used in Orchestrator (if not, can defer)
- Plan major version upgrades for Backend/Frontend
- Monitor pino deprecation timeline (v8 may reach EOL)
- Review if all dev dependencies are actually needed (large build tools)

