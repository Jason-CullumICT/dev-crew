# Dependency Auditor Findings Report

**Date:** 2026-11-04  
**Scope:** npm projects in Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator

---

## Executive Summary

### Vulnerability Overview
- **Backend**: 32 vulnerabilities (2 critical, 5 high, 20 moderate, 5 low)
- **Frontend**: 17 vulnerabilities (2 critical, 7 high, 7 moderate, 1 low)
- **Orchestrator**: 9 vulnerabilities (2 critical, 3 high, 4 moderate)
- **E2E Tests**: 0 vulnerabilities

**Total Identified Issues**: 58 vulnerabilities across 3 active npm projects

### Critical Severity Count
- **Backend**: 2 critical (handlebars, proxy-addr)
- **Frontend**: 2 critical (tinypool, vite indirect)
- **Orchestrator**: 2 critical (protobufjs, proxy-addr)

---

## Detailed Findings

### DEP-001: proxy-addr IP Spoofing via IPv6 Mapped IPv4
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Packages Affected:** proxy-addr (Backend, Orchestrator)
- **CVE:** GHSA-jqcg-44mw-7w3h
- **Affected Versions:** >= 1.1.0 <2.0.8
- **Detail:** proxy-addr is vulnerable to IP spoofing when trusting IPv4-mapped IPv6 addresses. Attackers can bypass access control checks by crafting malicious IPv6 addresses. This is a transitive dependency via express.
- **Fix:** Update express and proxy-addr dependencies to latest versions.
- **Impact:** Can lead to unauthorized access if IP-based access control is in place.
- **Cross-ref:** [ESCALATE → TheGuardians] - Access control violation

### DEP-002: Handlebars JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars
- **File:** Source/Backend/package-lock.json (transitive)
- **CVE:** GHSA-3mfm-83xf-c92r
- **Affected Versions:** >= 4.0.0 <= 4.7.8
- **Detail:** Arbitrary JavaScript code can be injected via AST type confusion when tampering with @partial-block. This affects template rendering security.
- **Fix:** Update handlebars and dependent packages to version > 4.7.8
- **Cross-ref:** [ESCALATE → TheGuardians] - Code injection risk

### DEP-003: Tinypool Prototype Pollution → Remote Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** tinypool
- **File:** Source/Frontend/package-lock.json (transitive via vitest)
- **CVE:** GHSA-5gmw-xhrv-c9v3
- **Affected Versions:** <= 2.1.0
- **Detail:** Prototype pollution gadget chain in worker options can lead to remote code execution during test execution. Affects vitest >= 2.0.
- **Fix:** Update vitest to latest (>= 3.0 when available), which updates tinypool > 2.1.0
- **Cross-ref:** [ESCALATE → TheGuardians] - RCE risk in test framework

### DEP-004: protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** protobufjs
- **File:** platform/orchestrator/package-lock.json (transitive via @grpc/grpc-js)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Affected Versions:** < 7.5.5
- **Detail:** Arbitrary code execution vulnerability in protobufjs library. Transitive dependency via gRPC. Critical for orchestrator infrastructure.
- **Fix:** Update @grpc/grpc-js and ensure protobufjs >= 7.5.5
- **Cross-ref:** [ESCALATE → TheGuardians] - RCE in infrastructure component

### DEP-005: body-parser DoS via Invalid Limit Bypass
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** body-parser
- **Files:** Source/Backend, platform/orchestrator (transitive)
- **Title:** body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement
- **Affected Versions:** Transitive via express
- **Detail:** Invalid limit values in body-parser silently disable size enforcement, allowing unbounded payloads and DoS attacks.
- **Fix:** Update express and body-parser to latest versions

### DEP-006: Vite Path Traversal in Optimized Deps
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** vite (DIRECT DEPENDENCY)
- **File:** Source/Frontend/package.json
- **Title:** Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling
- **Current Version:** ^5.4.0
- **Detail:** Path traversal vulnerability in how Vite handles source map files during dependency optimization. Can be exploited in development environments.
- **Fix:** Update vite to ^5.5.0 or later
- **Action:** This is a DIRECT dependency - update immediately

### DEP-007: brace-expansion Zero-Step Sequence DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** brace-expansion (transitive)
- **File:** Source/Backend (via jest/glob)
- **Title:** brace-expansion: Zero-step sequence causes process hang and memory exhaustion
- **Detail:** Malformed glob patterns can cause indefinite loops and memory exhaustion. Affects test runner glob patterns.
- **Fix:** Update jest and related tools to versions with patched brace-expansion

### DEP-008: browserslist Unbounded Memory Growth (OOM)
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** browserslist (transitive)
- **Files:** Source/Backend, Source/Frontend
- **Title:** Browserslist: Unbounded memory growth via distinct query results
- **Detail:** Lack of cache eviction can cause out-of-memory errors when processing many distinct browserslist queries. Affects build tools.
- **Fix:** Update browserslist and rebuild tools (webpack, vite, babel)

### DEP-009: form-data CRLF Injection via Multipart Fields
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data (transitive)
- **Files:** Source/Backend, platform/orchestrator
- **Title:** form-data: CRLF injection via unescaped multipart field names and filenames
- **Detail:** Unescaped field names in multipart form data can inject CRLF sequences, potentially breaking multipart boundaries.
- **Fix:** Update form-data via axios/curl transitive deps

### DEP-010: js-yaml Quadratic Complexity DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** js-yaml (transitive)
- **File:** Source/Backend
- **Title:** JS-YAML: Quadratic-complexity DoS via repeated aliases in merge key handling
- **Detail:** Malformed YAML with repeated merge keys can trigger quadratic-complexity parsing, causing DoS.
- **Fix:** Update js-yaml to latest version

### DEP-011: grpc-js Server Crash via Malformed Request
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** @grpc/grpc-js (transitive via platform/orchestrator)
- **CVE Range:** >= 1.14.0 < 1.14.4
- **Title:** Malformed request can cause gRPC server crash
- **Detail:** Unhandled edge case in gRPC message processing can crash the orchestrator server.
- **Fix:** Update @grpc/grpc-js to >= 1.14.5

### DEP-012: Outdated Major Versions (No Direct Fixes)
- **Severity:** P3
- **Category:** outdated
- **Notes:** Multiple packages are more than 1 major version behind:
  - express: ^4.18.2 → 5.3.0 (1 major update available)
  - react: ^18.3.1 → 19.3.1 (1 major update available)
  - react-router-dom: ^6.26.0 → 7.18.5 (1 major update available)
  - vitest: ^2.0.5 → potentially 3.0+ (check changelogs)

### DEP-013: High Dependency Overhead
- **Severity:** P4
- **Category:** supply-chain
- **Frontend Transitive Count:** ~2901 total files in lock
- **Backend Transitive Count:** ~5353 total files in lock
- **Note:** Large transitive dependency trees increase supply chain attack surface. Consider dependency minimization.

---

## Summary by Project

### Source/Backend
- **Direct Dependencies:** 4 prod + 8 dev = 12 total
- **Total Vulnerabilities:** 32 (2 critical, 5 high, 20 moderate, 5 low)
- **Critical Issues:** proxy-addr (IP spoofing), handlebars (code injection)
- **Action:** Update express, jest, and transitive deps immediately

### Source/Frontend
- **Direct Dependencies:** 3 prod + 7 dev = 10 total
- **Total Vulnerabilities:** 17 (2 critical, 7 high, 7 moderate, 1 low)
- **Critical Issues:** tinypool RCE (via vitest), vite path traversal (DIRECT)
- **Action:** Update vite immediately (direct dep), update vitest for tinypool fix

### Source/E2E
- **Direct Dependencies:** ~5 (minimal)
- **Total Vulnerabilities:** 0
- **Status:** ✅ CLEAN

### platform/orchestrator
- **Direct Dependencies:** 3 prod
- **Total Vulnerabilities:** 9 (2 critical, 3 high, 4 moderate)
- **Critical Issues:** protobufjs (RCE via gRPC), proxy-addr (IP spoofing)
- **Action:** This is infrastructure - critical security updates required
- **Risk:** Affects the CI/CD pipeline itself

---

## Recommendations

### Immediate Actions (P1 - CRITICAL)
1. **Backend & Orchestrator:** Update `express` and related packages to latest
   - Fixes: proxy-addr, body-parser, and transitive deps
2. **Frontend:** Update `vite` to ^5.5.0 (DIRECT dependency)
   - Fixes: path traversal vulnerability
3. **Frontend:** Update `vitest` to latest
   - Fixes: tinypool RCE gadget chain
4. **Orchestrator:** Update `@grpc/grpc-js` to >= 1.14.5
   - Fixes: protobufjs RCE, grpc-js crash vulnerabilities

### Short-term Actions (P2 - High, 1-2 weeks)
1. Update handlebars (review frontend/backend for template use)
2. Run `npm audit fix` in all projects after direct updates
3. Audit the fixed versions against test suite

### Quarterly Review
1. Establish automated CVE scanning in CI/CD
2. Set up Dependabot or similar for automated PRs
3. Review license compliance quarterly
4. Monitor for abandoned dependencies

---

## Cross-References

- [ESCALATE → TheGuardians] - Multiple security findings requiring specialized review
  - IP spoofing in access control path
  - Code injection in template rendering
  - RCE vulnerabilities in test/infrastructure frameworks
  
---

## License & Abandoned Package Analysis

**Status:** No GPL/AGPL licenses detected in direct dependencies.
**Abandoned Packages:** None currently flagged (all vulnerabilities are from actively maintained packages).

---

## Traceability

This audit verifies integrity of third-party supply chain for:
- `Source/Backend` - Production Express API
- `Source/Frontend` - Production React SPA
- `platform/orchestrator` - CI/CD pipeline infrastructure

**Next Audit:** Quarterly or after any P1 fix verification
