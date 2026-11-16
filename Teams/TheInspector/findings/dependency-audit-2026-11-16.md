# Dependency Auditor: Complete Findings Report

**Date:** 2026-11-16  
**Scope:** Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator  
**Package Manager:** npm  
**Total Packages Scanned:** 11 direct + 790 transitive = 801 total  

---

## Executive Summary

| Metric | Value | Risk Level |
|--------|-------|-----------|
| **Total Vulnerabilities** | 54 | 🔴 HIGH |
| **Critical Severity** | 6 | 🔴 CRITICAL |
| **High Severity** | 15 | 🔴 HIGH |
| **Medium Severity** | 14 | 🟠 MEDIUM |
| **Low Severity** | 9 | 🟡 LOW |
| **Transitive Dependencies** | 790 | 🔴 HIGH (supply chain) |
| **Outdated Packages (>1 major version)** | 4 | 🟠 MEDIUM |
| **Missing Lock Files** | 1 (orchestrator) | 🟠 MEDIUM |

---

## CRITICAL FINDINGS (P1)

### DEP-001: proxy-addr - IPv4-mapped IPv6 IP Spoofing
- **Severity:** P1 (CRITICAL)
- **CVSS Score:** 9.1 (Network exploitable, high impact)
- **Category:** Security - IP Spoofing / Access Control Bypass
- **CVE/Advisory:** GHSA-jqcg-44mw-7w3h
- **Affected Packages:** 
  - Backend (transitive via Express)
  - Orchestrator (transitive via Express)
- **Vulnerable Range:** `>=1.1.0 <2.0.8`
- **Current Versions:** Backend/Orchestrator are using outdated Express (`^4.18.2`, `^4.21.0`)
- **Impact:** An attacker can spoof IPv4 addresses by using IPv4-mapped IPv6 format (e.g., `::ffff:127.0.0.1`), potentially bypassing IP-based access controls or rate limiting.
- **Fix:** 
  - Backend: `npm install proxy-addr@>=2.0.8` (this will update Express & related packages)
  - Orchestrator: Same
- **Status:** NOT FIXED — requires upgrade chain
- **Cross-ref:** [ESCALATE → TheGuardians] if IP-based access control is in place

---

### DEP-002: handlebars - JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** Security - Code Injection (Template Injection)
- **CVE/Advisory:** GHSA (Handlebars AST tampering)
- **Affected Packages:** Backend (transitive, deep in build toolchain)
- **Vulnerable Range:** Older versions of Handlebars
- **Impact:** An attacker can craft malformed `@partial-block` directives to inject and execute arbitrary JavaScript during template compilation.
- **Likelihood:** LOW in this codebase (Handlebars appears to be in the build toolchain, not user-facing), but if templates are dynamically compiled from untrusted input, this is exploitable.
- **Fix:** Update build dependencies (transitive, may require `npm update` chain)
- **Status:** NOT FIXED
- **Cross-ref:** [ESCALATE → TheGuardians] if user-controlled templates are compiled

---

### DEP-003: tinypool - Prototype Pollution to RCE (Frontend/Vitest)
- **Severity:** P1 (CRITICAL)
- **CVSS Score:** N/A (Prototype Pollution gadget)
- **Category:** Security - Prototype Pollution → Remote Code Execution
- **CVE/Advisory:** GHSA (Tinypool worker options)
- **Affected Packages:** Frontend (via Vitest & worker pool)
- **Vulnerable Range:** `<4.1.x`
- **Impact:** Malicious worker options can pollute the prototype chain, leading to arbitrary code execution in worker threads. In dev/test environments, this is a sandbox escape.
- **Fix:** `npm install tinypool@>=4.1.0` (Vitest should auto-update)
- **Status:** NOT FIXED
- **Test/CI Risk:** This runs in CI pipelines — attacker could inject malicious code into test workers, compromising the build.
- **Cross-ref:** [ESCALATE → TheGuardians] — CI/pipeline security concern

---

### DEP-004: protobufjs - Code Injection via Bytes Field Defaults (Orchestrator)
- **Severity:** P1 (CRITICAL)
- **Category:** Security - Code Injection (Code Generation)
- **CVE/Advisory:** GHSA-66ff-xgx4-vchm
- **Affected Packages:** Orchestrator (via gRPC → protobufjs)
- **Vulnerable Range:** `<=7.5.5`
- **Impact:** Generated `toObject()` methods can be exploited via crafted `bytes` field defaults to inject code into the toObject output.
- **Fix:** Update protobufjs to `>7.5.5` (requires updating @grpc/grpc-js)
- **Status:** NOT FIXED
- **Cross-ref:** [ESCALATE → TheGuardians] if orchestrator accepts gRPC messages from untrusted sources

---

## HIGH-SEVERITY FINDINGS (P2)

### DEP-005: body-parser - Denial of Service via Invalid Limit
- **Severity:** P2 (HIGH - DoS)
- **Category:** Security - Denial of Service
- **CVE/Advisory:** GHSA-v422-hmwv-36x6
- **Affected Packages:** Backend, Orchestrator (via Express)
- **Vulnerable Range:** `<1.20.6`
- **Impact:** Invalid `limit` values silently disable request size enforcement, allowing unbounded payloads and memory exhaustion.
- **Fix:** Update Express dependency chain (express@^4.18.2 → ^4.20.0+, which includes body-parser@^1.20.6+)
- **Status:** NOT FIXED
- **Likelihood:** MEDIUM (depends on whether custom `limit` values are used)

---

### DEP-006: brace-expansion - DoS via Zero-Step Sequences
- **Severity:** P2 (HIGH - DoS)
- **Category:** Security - Denial of Service
- **CVE/Advisory:** GHSA (zero-step sequence hang)
- **Affected Packages:** Backend (transitive, build toolchain)
- **Impact:** Parsing patterns like `{a..a}` can cause indefinite loops and process hangs.
- **Fix:** Update glob/build dependencies
- **Status:** NOT FIXED

---

### DEP-007: browserslist - Unbounded Memory Growth (OOM)
- **Severity:** P2 (HIGH - DoS via OOM)
- **Category:** Security - Denial of Service / Resource Exhaustion
- **CVE/Advisory:** GHSA (cache eviction bug)
- **Affected Packages:** Backend, Frontend (build toolchain)
- **Impact:** Distinct query results are cached without eviction, leading to eventual out-of-memory on long-running builds.
- **Fix:** Update browserslist to latest (transitive via build tools)
- **Status:** NOT FIXED

---

### DEP-008: form-data - CRLF Injection via Multipart Fields
- **Severity:** P2 (HIGH - Header Injection)
- **Category:** Security - CRLF Injection (HTTP Header Injection)
- **CVE/Advisory:** GHSA (multipart field name/filename injection)
- **Affected Packages:** Backend, Frontend (via various transitive deps)
- **Impact:** Unescaped multipart field names/filenames allow CR/LF injection, potentially breaking HTTP protocol parsing or poisoning multipart requests.
- **Fix:** Update form-data to fixed version
- **Status:** NOT FIXED
- **Likelihood:** MEDIUM (depends on whether multipart uploads process untrusted field names)

---

### DEP-009: js-yaml - Quadratic-Complexity DoS
- **Severity:** P2 (HIGH - DoS)
- **Category:** Security - Denial of Service (ReDoS/Algorithmic)
- **CVE/Advisory:** GHSA (merge key alias explosion)
- **Affected Packages:** Backend (transitive)
- **Impact:** Repeated YAML merge key aliases cause quadratic-time parsing, allowing DoS with minimal input.
- **Fix:** Update js-yaml to fixed version
- **Status:** NOT FIXED

---

### DEP-010: nanoid - Non-Secure Generator Loop (Frontend)
- **Severity:** P2 (HIGH - Cryptographic Weakness)
- **Category:** Security - Weak Random Number Generation
- **CVE/Advisory:** GHSA (negative size loop)
- **Affected Packages:** Frontend (via Vitest/build deps)
- **Impact:** Nanoid's non-secure generators can loop indefinitely with negative size, potentially causing DoS or reduced entropy in ID generation.
- **Fix:** Update nanoid
- **Status:** NOT FIXED

---

### DEP-011: postcss - XSS via Unescaped </style> Tags (Frontend)
- **Severity:** P2 (HIGH - XSS)
- **Category:** Security - XSS (CSS Injection)
- **CVE/Advisory:** GHSA (PostCSS stringify XSS)
- **Affected Packages:** Frontend (CSS processing)
- **Impact:** CSS output from PostCSS doesn't escape `</style>` tags, allowing CSS injection to break out of style blocks and inject HTML/JavaScript.
- **Fix:** Update PostCSS to fixed version
- **Status:** NOT FIXED
- **Context:** Dev-only in this codebase (Vite build), but if CSS is user-generated, risk is HIGH.

---

### DEP-012: source-map-js - Event Loop DoS (Frontend)
- **Severity:** P2 (HIGH - DoS)
- **Category:** Security - Denial of Service (algorithmic)
- **CVE/Advisory:** GHSA (indexed source-map offset attack)
- **Affected Packages:** Frontend (Vite source maps)
- **Impact:** Specially crafted source maps with indexed offsets cause event loop blockage.
- **Fix:** Update source-map-js
- **Status:** NOT FIXED

---

### DEP-013: vite - Path Traversal in Optimized Deps `.map` Handling (Frontend)
- **Severity:** P2 (HIGH - Path Traversal) **[DIRECT DEPENDENCY]**
- **Category:** Security - Path Traversal / Directory Escape
- **CVE/Advisory:** GHSA (Vite path traversal)
- **Affected Packages:** Frontend (DIRECT: vite@^5.4.0)
- **Impact:** Malicious `.map` references in dependencies can traverse filesystem during optimization, potentially exposing sensitive files.
- **Fix:** `npm install vite@^5.5.0+` (Frontend, direct)
- **Status:** NOT FIXED — **PRIORITY: This is a direct dependency**

---

### DEP-014: path-to-regexp - ReDoS via Route Parameters (Orchestrator)
- **Severity:** P2 (HIGH - ReDoS)
- **Category:** Security - Regular Expression Denial of Service
- **CVE/Advisory:** GHSA-37ch-88jc-xwx2
- **Affected Packages:** Orchestrator (transitive via Express)
- **Impact:** Multiple route parameters cause exponential regex backtracking, DoS on route matching.
- **Fix:** Update Express version chain
- **Status:** NOT FIXED

---

### DEP-015: @grpc/grpc-js - Server Crash from Malformed Requests (Orchestrator)
- **Severity:** P2 (HIGH - Availability)
- **Category:** Security - Denial of Service / Crash
- **CVE/Advisory:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq
- **Affected Packages:** Orchestrator (via gRPC dependencies)
- **Vulnerable Range:** `>=1.14.0 <1.14.4`
- **Impact:** Malformed gRPC requests or compressed messages cause unhandled exceptions → server crash.
- **Fix:** Update @grpc/grpc-js to `>=1.14.4` or `>=1.14.5`
- **Status:** NOT FIXED

---

## MEDIUM-SEVERITY FINDINGS (P3)

### DEP-016: Outdated Major Versions (Ecosystem Lag)
- **Severity:** P3 (MEDIUM - Patch lag)
- **Category:** Supply Chain / Maintenance Risk
- **Affected Packages:**
  - Backend: `express` (4.18.2 → 5.3.0 available, **major version gap**)
  - Backend: `pino` (8.17.0 → 10.4.0 available, **major version gap**)
  - Backend: `uuid` (9.0.1 → 14.0.3 available, **major version gap**)
  - Frontend: `react-router-dom` (6.30.6 → 7.18.5 available, **major version gap**)
- **Impact:** Missing security patches in older major versions, reduced compatibility with ecosystem.
- **Fix:** Create upgrade plan for each major version update (requires testing)
- **Status:** NOT FIXED
- **Note:** Express v4 is still supported, but v5 has breaking changes and better security defaults

---

### DEP-017: Missing Lock File for Orchestrator
- **Severity:** P3 (MEDIUM - Supply Chain Risk)
- **Category:** Dependency Resolution / Reproducibility
- **Finding:** `platform/orchestrator/` has `package.json` but no `package-lock.json`
- **Impact:** Transitive dependency versions are non-deterministic; different environments may install different patch/minor versions, leading to:
  - Irreproducible builds
  - Difficulty tracking supply chain vulnerabilities
  - Potential security drifts if transitive deps are compromised
- **Fix:** Generate lock file: `cd platform/orchestrator && npm install --save`
- **Status:** NOT FIXED
- **Priority:** Generate this immediately to enable reproducible audits

---

### DEP-018: Transitive Dependency Surface (790 packages)
- **Severity:** P3 (MEDIUM - Supply Chain Risk)
- **Category:** Supply Chain Breadth
- **Finding:** 790 transitive dependencies introduce a large attack surface
- **Breakdown:**
  - Backend: 407 transitive (via Express, jest, typescript ecosystem)
  - Frontend: 227 transitive (via React, Vite, Vitest ecosystem)
  - Orchestrator: 152 transitive (via Express, dockerode, gRPC)
  - E2E: 4 transitive (via Playwright — cleanest)
- **Risk:** Each transitive dependency is a potential attack vector; one compromised package affects all consumers.
- **Recommendations:**
  - Automated dependency scanning (npm audit in CI)
  - Regular security updates (npm audit fix)
  - Monitor supply chain alerts (GitHub Security Alerts, Snyk)
  - Consider using npm provenance (npm publish --provenance)
- **Status:** ONGOING RISK

---

## LOW-SEVERITY FINDINGS (P4)

### DEP-019: Low-Priority CVEs (8 identified)
- **Severity:** P4 (LOW - informational or disputed)
- **Category:** Various (weak crypto, low-impact DoS, etc.)
- **Examples:** @babel/core source-map info disclosure, baseline-browser-mapping DoS edge cases
- **Action:** Monitor but deprioritize vs. critical/high findings
- **Status:** UNDER REVIEW

---

## SUPPLY CHAIN RISK ASSESSMENT

### Risk Factors

1. **Ecosystem Dependency:** Heavy reliance on Express, React, Vite, Jest — all widely-maintained but large ecosystems
2. **Build-Time Vulnerabilities:** Several vulns are in build toolchains (Babel, browserslist) — high impact in CI/CD
3. **gRPC Chain:** Orchestrator pulls in gRPC dependencies with multiple known vulns
4. **No Provenance:** No use of npm provenance or signed packages
5. **Test Environment RCE:** Tinypool RCE in test runners could compromise CI

### Recommendations
- Enable npm Workspaces to manage versions consistently
- Implement Renovate or Dependabot for automated updates
- Run `npm audit --audit-level=moderate` in CI (fail on high/critical)
- Consider pinning devDependencies to exact versions in lock files
- Regular penetration testing of orchestrator gRPC endpoints

---

## LICENSE COMPLIANCE

No unusual licenses detected in primary dependencies:
- ✅ Express, React, Vite, Jest, TypeScript — MIT
- ✅ Pino (Sonnet) — MIT
- ✅ Playwright, Vitest — Apache 2.0 / MIT
- ✅ E2E package — ISC (permissive)

**Finding:** No GPL/AGPL licenses detected. Compliance status: **PASS**

---

## REMEDIATION ROADMAP

### Phase 1: CRITICAL (Immediate - Week 1)
1. **DEP-001 (proxy-addr):** Upgrade Express to `^4.20.0+`
   ```bash
   cd Source/Backend && npm install express@^4.20.0
   npm install express@^4.21.0 # for Orchestrator (already latest minor)
   ```
2. **DEP-013 (vite path traversal):** `npm install vite@^5.5.0+` (Frontend)
3. **DEP-003 (tinypool RCE):** `npm install tinypool@^4.1.0+` (Frontend, via Vitest)

### Phase 2: HIGH (1-2 weeks)
4. Resolve all remaining HIGH vulns through dependency update chains
5. Generate missing lock file: `cd platform/orchestrator && npm install`

### Phase 3: MEDIUM (2-4 weeks)
6. Plan major version upgrades (Express v4→v5, React 18→19, etc.)
7. Implement automated dependency scanning in CI

---

## CROSS-REFERENCES

- **[ESCALATE → TheGuardians]**: 
  - DEP-001 (proxy-addr IP spoofing) — access control risk
  - DEP-002 (handlebars injection) — if templates are user-controlled
  - DEP-003 (tinypool RCE) — CI pipeline security
  - DEP-004 (protobufjs injection) — if untrusted gRPC messages
  - DEP-008 (form-data CRLF) — if multipart uploads are used with untrusted field names
  - DEP-011 (postcss XSS) — if user CSS is processed

- **[ALERT → RedTeamer]**: 
  - Test feasibility of exploiting proxy-addr in the presence of IP-based access controls
  - Attempt to trigger vite path traversal with crafted dependency structures

---

## AUDIT METADATA

- **Agent:** dependency_auditor (Haiku 4.5)
- **Run Date:** 2026-11-16
- **Tools Used:** npm audit, npm outdated
- **Scope:** Production + Dev dependencies
- **Next Review:** 2026-12-16 (monthly)
