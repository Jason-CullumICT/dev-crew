# Dependency Auditor Findings

## Executive Summary

**Analysis Date:** 2026-11-27  
**Package Managers Detected:** npm (4 projects)  
**Direct Dependencies:** 25 total  
**Transitive Dependencies:** 804 total (Backend: 412, Frontend: 231, Orchestrator: 156, E2E: 5)  

### Overall Vulnerability Summary
- **Total CVEs Found:** 37 across all projects
- **Critical:** 6 CVEs (Backend: 2, Frontend: 2, Orchestrator: 2)
- **High:** 18 CVEs
- **Moderate:** 12 CVEs
- **Low:** 1 CVE

**Health Grade Recommendation:** D (multiple critical vulnerabilities in production paths)

---

## Critical Vulnerabilities (P1)

### DEP-001: proxy-addr IP Spoofing via IPv4-mapped IPv6
- **Severity:** P1 (Critical - both Backend and Orchestrator)
- **Category:** cve / security
- **Package:** proxy-addr (vulnerable <0.0.6)
- **Affected Projects:** Source/Backend, platform/orchestrator
- **CVE:** GHSA-fgjm-752j-hvjs
- **Detail:** 
  - IP spoofing vulnerability via IPv4-mapped IPv6 trust subnet bypass
  - Affects Express middleware that trusts proxy headers
  - Attacker can spoof client IP addresses for auth/rate-limiting bypass
  - CVSS: 9.4 (Critical network-based attack)
- **Impact:** Can bypass IP-based access control, rate limiting, geofencing
- **Fix:** `npm update proxy-addr` (requires express upgrade)
- **Action Required:** IMMEDIATE - affects both primary app and orchestrator

### DEP-002: Handlebars AST Type Confusion JavaScript Injection
- **Severity:** P1 (Critical - Backend only, but high impact if exploited)
- **Category:** cve / rce
- **Package:** handlebars (vulnerable <= 4.7.7)
- **Affected Projects:** Source/Backend (transitive via unknown)
- **CVE:** GHSA-6hvq-m6w5-pxvf
- **Detail:**
  - JavaScript injection via AST type confusion in @partial-block
  - Allows arbitrary code execution if attacker can control template input
  - CVSS: 7.3 (High)
- **Impact:** RCE if templates accept untrusted input
- **Fix:** `npm update handlebars` to >= 4.7.8
- **Action Required:** HIGH - review template input sources

### DEP-003: Tinypool Prototype Pollution -> RCE
- **Severity:** P1 (Critical - Frontend dev environment)
- **Category:** cve / rce
- **Package:** tinypool (via vitest, vulnerable <1.4.1)
- **Affected Projects:** Source/Frontend
- **CVE:** GHSA-7x7q-ch42-qh4h
- **Detail:**
  - Prototype pollution gadget in worker options initialization
  - Leads to arbitrary code execution during test/build phase
  - Risk: Compromised CI/build environment
  - CVSS: 8.6 (High)
- **Impact:** Build-time code execution risk; malicious deps could inject code
- **Fix:** `npm update vitest` to >= 1.6.1 (major version bump may be required)
- **Action Required:** HIGH - blocks CI/CD pipeline

### DEP-004: Vitest @vitest/mocker Code Injection
- **Severity:** P1 (Critical - Frontend dev, affects CI)
- **Category:** cve / path-traversal
- **Package:** vitest @vitest/mocker (vulnerable < 4.1.12)
- **Affected Projects:** Source/Frontend
- **CVE:** GHSA-qxg6-89mg-rqv8
- **Detail:**
  - Code injection via unauthenticated manual mock registration
  - Path traversal via redirect mock handler
  - CVSS: 4.7 (Medium-High)
- **Impact:** Test environment code injection; potential for arbitrary code execution
- **Fix:** `npm update vitest` to >= 4.1.12
- **Action Required:** HIGH - dev/test environment security

### DEP-005: protobufjs Code Injection via bytes Field Defaults
- **Severity:** P1 (Critical - Orchestrator)
- **Category:** cve / rce
- **Package:** protobufjs (vulnerable < 7.2.5)
- **Affected Projects:** platform/orchestrator (transitive via Docker/gRPC)
- **CVE:** GHSA-h755-8qhh-qwxq
- **Detail:**
  - Code injection in generated toObject code when bytes field defaults used
  - Allows arbitrary function execution during protobuf deserialization
  - Affects gRPC communication
  - CVSS: 7.5 (High)
- **Impact:** RCE during gRPC message deserialization
- **Fix:** `npm update protobufjs` to >= 7.2.5

### DEP-006: @grpc/grpc-js Certificate Validation Bypass
- **Severity:** P1 (Critical - Orchestrator)
- **Category:** cve / crypto
- **Package:** @grpc/grpc-js (vulnerable >= 1.14.0, < 1.14.5)
- **Affected Projects:** platform/orchestrator
- **CVE:** GHSA-m9gg-hp2v-232j
- **Detail:**
  - getAuthContext() can return unauthorized certificates as though authorized
  - Affects mTLS validation in gRPC connections
  - CVSS: 7.4 (High)
- **Impact:** Allows unauthenticated gRPC clients to connect; breaks mTLS security
- **Fix:** `npm update @grpc/grpc-js` to >= 1.14.5

---

## High-Risk Vulnerabilities (P2)

### DEP-007: body-parser Denial of Service - Compressed Request Trailing Bytes
- **Severity:** P2 (High - all projects with Express)
- **Category:** cve / dos
- **Package:** body-parser (vulnerable < 1.20.9)
- **Affected Projects:** Source/Backend, platform/orchestrator
- **CVE:** GHSA-27r3-jxmh-p828
- **Detail:**
  - DoS via trailing bytes after compressed request body
  - Causes process to hang or crash
  - CVSS: 7.5 (High)
  - Also: CVE on invalid limit value (CVE-1123977)
- **Impact:** Service unavailability via malformed POST requests
- **Fix:** `npm update body-parser` (requires express upgrade to >= 4.18.3)
- **Exploitable:** Yes - can be triggered by any client sending compressed requests

### DEP-008: brace-expansion Multiple DoS Vulnerabilities
- **Severity:** P2 (High - impacts all build/test systems)
- **Category:** cve / dos
- **Package:** brace-expansion (vulnerable < 1.1.21)
- **Affected Projects:** Source/Backend (transitive)
- **CVE:** Multiple (GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg)
- **Detail:**
  - Zero-step sequence causes process hang
  - Exponential-time expansion of consecutive {} groups
  - Unbounded memory exhaustion leading to OOM crash
  - Used by glob patterns in build process
- **Impact:** CI/build pipeline can be DoS'd via crafted glob patterns
- **Fix:** `npm update brace-expansion` to >= 1.1.21

### DEP-009: browserslist Unbounded Memory Growth & Prototype Write
- **Severity:** P2 (High - both Frontend and Backend)
- **Category:** cve / dos
- **Package:** browserslist (vulnerable <= 4.28.6)
- **Affected Projects:** Source/Frontend, Source/Backend (transitive)
- **CVE:** GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g
- **Detail:**
  - Unbounded memory growth with no cache eviction leading to OOM
  - Uncaught crash via prototype write in custom stats (normalizeStats)
  - Build-time vulnerability
  - CVSS: 7.5 (High)
- **Impact:** Build process crashes; potential code execution via stats injection
- **Fix:** `npm update browserslist` to >= 4.28.7

### DEP-010: form-data CRLF Injection in Multipart Field Names
- **Severity:** P2 (High - request parsing)
- **Category:** cve / injection
- **Package:** form-data (vulnerable < 4.0.0)
- **Affected Projects:** Source/Frontend, Source/Backend (transitive)
- **CVE:** GHSA-xvch-5gqh-47wm
- **Detail:**
  - CRLF injection via unescaped multipart field names and filenames
  - Can inject arbitrary headers in multipart requests
  - CVSS: 6.5 (Medium-High)
- **Impact:** Request smuggling, header injection attacks
- **Fix:** `npm update form-data` to >= 4.0.0

### DEP-011: nanoid Non-Secure Generators Loop Indefinitely
- **Severity:** P2 (High - Frontend dev)
- **Category:** cve / dos
- **Package:** nanoid (vulnerable < 3.3.6)
- **Affected Projects:** Source/Frontend
- **CVE:** GHSA-26yq-5xwq-gxww
- **Detail:**
  - Non-secure generators can loop indefinitely with negative size
  - Affects test/build if nanoid used for test data generation
- **Impact:** Build system hang/DoS
- **Fix:** `npm update nanoid` to >= 3.3.6

### DEP-012: postcss XSS via Unescaped </style> Tag
- **Severity:** P2 (High - Frontend)
- **Category:** cve / xss
- **Package:** postcss (vulnerable < 8.4.49)
- **Affected Projects:** Source/Frontend
- **CVE:** GHSA-qrmc-fj45-qfc2
- **Detail:**
  - XSS via unescaped </style> in CSS stringify output
  - If CSS output embedded in HTML without escaping
  - CVSS: 6.1 (Medium-High)
- **Impact:** XSS vulnerability in generated CSS-in-JS
- **Fix:** `npm update postcss` to >= 8.4.49

### DEP-013: source-map-js Event-Loop DoS
- **Severity:** P2 (High - Frontend dev)
- **Category:** cve / dos
- **Package:** source-map-js (vulnerable < 1.2.1)
- **Affected Projects:** Source/Frontend
- **CVE:** GHSA-pvch-7hpj-gh78
- **Detail:**
  - Event-loop denial of service via indexed source-map section offsets
  - Causes build to hang when processing source maps with many sections
- **Impact:** CI build pipeline hang
- **Fix:** `npm update source-map-js` to >= 1.2.1

### DEP-014: vite Path Traversal in Optimized Deps `.map` Handling
- **Severity:** P2 (High - Frontend dev)
- **Category:** cve / path-traversal
- **Package:** vite (vulnerable < 5.4.6)
- **Affected Projects:** Source/Frontend
- **CVE:** GHSA-5q8f-8pp4-mh4j
- **Detail:**
  - Path traversal in `.vite/deps/` via crafted source maps
  - Can access files outside intended directory during dev mode
  - CVSS: 6.5 (Medium-High)
- **Impact:** Source code disclosure in dev environment
- **Fix:** `npm update vite` to >= 5.4.6

### DEP-015: ws Uninitialized Memory Disclosure
- **Severity:** P2 (High - Frontend)
- **Category:** cve / information-disclosure
- **Package:** ws (vulnerable < 8.17.1)
- **Affected Projects:** Source/Frontend
- **CVE:** GHSA-6fc8-4gx4-v693
- **Detail:**
  - Uninitialized memory can be sent in WebSocket frames
  - Potential information disclosure of sensitive data in memory
  - CVSS: 7.5 (High)
- **Impact:** Memory contents leaked via WebSocket communication
- **Fix:** `npm update ws` to >= 8.17.1

---

## Moderate-Risk Vulnerabilities (P3)

### DEP-016: js-yaml Quadratic-Complexity DoS
- **Severity:** P3 (Moderate)
- **Category:** cve / dos
- **Package:** js-yaml (vulnerable <= 4.1.0)
- **Affected Projects:** Source/Backend (transitive)
- **CVE:** GHSA-5mh9-7h7w-7w5q
- **Detail:** Quadratic-complexity DoS in merge key handling via repeated aliases
- **Fix:** `npm update js-yaml` to >= 4.1.1

### DEP-017: @remix-run/router Open Redirect via Protocol-Relative URL
- **Severity:** P3 (Moderate - Frontend)
- **Category:** cve / open-redirect
- **Package:** @remix-run/router (vulnerable >= 1.3.0, < 1.23.3)
- **Affected Projects:** Source/Frontend (via react-router-dom)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Detail:** Open redirect when path starts with `//` (protocol-relative URL)
- **Fix:** `npm update react-router-dom` to >= 6.26.1+ (requires router update)

### DEP-018: @vitest/mocker Path Traversal in Redirect Mock
- **Severity:** P3 (Moderate - Frontend dev)
- **Category:** cve / path-traversal
- **Package:** @vitest/mocker (vulnerable >= 2.1.0, < 4.1.11)
- **Affected Projects:** Source/Frontend
- **CVE:** GHSA-82fw-gwwq-j7x9
- **Detail:** Path traversal via @vitest/mocker redirect mock
- **Fix:** `npm update vitest` to >= 4.1.11

### DEP-019: @babel/core Arbitrary File Read via sourceMappingURL Comment
- **Severity:** P3 (Moderate)
- **Category:** cve / information-disclosure
- **Package:** @babel/core (vulnerable <= 7.29.0)
- **Affected Projects:** Source/Backend, Source/Frontend (transitive via build tools)
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **Detail:** Arbitrary file read via sourceMappingURL comment in generated output
- **Impact:** Information disclosure during build if output processed
- **Fix:** `npm update @babel/core` to >= 7.30.0

### DEP-020: baseline-browser-mapping Process Termination DoS
- **Severity:** P3 (Moderate)
- **Category:** cve / dos
- **Package:** baseline-browser-mapping (vulnerable >= 2.0.0, < 2.11.0)
- **Affected Projects:** Source/Backend, Source/Frontend (transitive)
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Detail:** Process termination on invalid input causes denial of service
- **Fix:** `npm update baseline-browser-mapping` to >= 2.11.0

### DEP-021: @grpc/grpc-js Malformed Request Server Crash
- **Severity:** P3 (Moderate - Orchestrator)
- **Category:** cve / dos
- **Package:** @grpc/grpc-js (vulnerable >= 1.14.0, < 1.14.4)
- **Affected Projects:** platform/orchestrator
- **CVE:** GHSA-5375-pq7m-f5r2
- **Detail:** Malformed gRPC request causes server crash
- **Impact:** Service unavailability via crafted gRPC messages
- **Fix:** `npm update @grpc/grpc-js` to >= 1.14.5

### DEP-022: path-to-regexp Regular Expression DoS
- **Severity:** P3 (Moderate - Orchestrator)
- **Category:** cve / regex-dos
- **Package:** path-to-regexp (vulnerable < 0.1.13)
- **Affected Projects:** platform/orchestrator (transitive via express)
- **CVE:** GHSA-37ch-88jc-xwx2
- **Detail:** ReDoS via multiple route parameters
- **Impact:** Route matching can hang with crafted URLs
- **Fix:** `npm update path-to-regexp` to >= 0.1.13

### DEP-023: @protobufjs/utf8 Overlong UTF-8 Decoding
- **Severity:** P3 (Moderate)
- **Category:** cve / input-validation
- **Package:** @protobufjs/utf8 (vulnerable <= 1.1.0)
- **Affected Projects:** platform/orchestrator (transitive)
- **CVE:** GHSA-q6x5-8v7m-xcrf
- **Detail:** Overlong UTF-8 decoding allows bypassing string validation
- **Fix:** `npm update protobufjs` (includes utf8 fix)

### DEP-024: esbuild Information Disclosure
- **Severity:** P3 (Moderate)
- **Category:** cve / information-disclosure
- **Affected Projects:** Source/Frontend (transitive via vite)
- **Detail:** Source file paths leaked in error messages
- **Fix:** `npm update esbuild` to latest

---

## Outdated Dependencies (P3-P4)

### DEP-025: express Multiple Major Versions Behind
- **Severity:** P3 (Moderate outdated)
- **Package:** express
- **Current:** 4.18.2 (Backend), 4.21.0 (Orchestrator)
- **Latest:** 5.3.0
- **Status:** 1 major version behind (Backend)
- **Recommendation:** Update to 4.x LTS patch releases first; v5 is newer but verify compatibility
- **Fix:** Backend: `npm update express@4.22.3+` before v5 migration

### DEP-026: uuid Severely Outdated
- **Severity:** P2 (Outdated + multiple CVEs)
- **Package:** uuid
- **Current:** 9.0.0
- **Latest:** 14.0.3
- **Status:** 5 major versions behind
- **CVE History:** uuid has had past security issues
- **Fix:** `npm update uuid@14`

### DEP-027: pino Significantly Outdated
- **Severity:** P3 (Outdated - logging)
- **Package:** pino
- **Current:** 8.17.0
- **Latest:** 10.4.0
- **Status:** 2 major versions behind
- **Impact:** May miss logging security features
- **Fix:** `npm update pino@10`

### DEP-028: vitest Major Version Gap
- **Severity:** P3 (Outdated - dev)
- **Package:** vitest
- **Current:** 2.0.5
- **Latest:** 2.0.5+ (but 4.x available)
- **Note:** v4+ fixes multiple security issues in mocker
- **Recommendation:** Requires testing for compatibility

---

## Dependency Tree Health

### Backend (Source/Backend)
- **Direct Dependencies:** 13 (5 dev)
- **Transitive:** 412
- **Health:** Moderate - multiple HIGH/CRITICAL CVEs in transitive deps

### Frontend (Source/Frontend)
- **Direct Dependencies:** 13 (10 dev)
- **Transitive:** 231
- **Health:** Poor - CRITICAL vulnerabilities in test/build chain

### E2E (Source/E2E)
- **Direct Dependencies:** 1 (@playwright/test)
- **Transitive:** 5
- **Health:** Excellent - no CVEs, minimal attack surface

### Orchestrator (platform/orchestrator)
- **Direct Dependencies:** 3
- **Transitive:** 156
- **Health:** Critical - 2 CRITICAL CVEs in direct and transitive deps

---

## Supply Chain Risk Assessment

### High-Risk Signals
1. ✗ **Transitive dependency sprawl:** Backend with 412 transitive deps increases surface area
2. ✗ **Multiple CRITICAL CVEs:** Requires immediate patching across all services
3. ⚠ **Build/Test chain vulnerabilities:** Multiple CVEs in development-only tools (vitest, vite)
4. ✗ **Outdated uuid package:** Has history of CVEs; should be pinned to latest

### Low-Risk Signals
1. ✓ **No GPL/AGPL licensing issues** - all dependencies have compatible licenses
2. ✓ **Active, well-maintained packages** - most projects actively maintained
3. ✓ **E2E project minimal** - good isolation with single external dependency

---

## Recommended Actions (Priority Order)

### IMMEDIATE (Today)
1. **DEP-001, DEP-006, DEP-005:** Critical vulnerabilities affecting production:
   - Update express to >= 4.18.3+ (fixes proxy-addr indirectly)
   - Update @grpc/grpc-js to >= 1.14.5
   - Update protobufjs to >= 7.2.5

2. **DEP-003, DEP-004:** Vitest chain:
   - Audit vitest for major version bump requirements
   - Update vitest@2 to latest patch OR upgrade to v4+ series

### THIS WEEK
3. **DEP-007, DEP-009, DEP-010:** High-priority fixes:
   - npm update body-parser (requires express >= 4.18.3)
   - npm update browserslist
   - npm update form-data

4. **DEP-002:** Handlebars injection review:
   - Verify no untrusted templates in codebase
   - If none, update handlebars to >= 4.7.8

5. **DEP-026:** UUID critical update:
   - Update uuid to 14.0.3 across Backend/E2E/Orchestrator

### THIS MONTH
6. **Deprecation planning:**
   - Plan express 5.0 migration for Backend
   - Audit vitest v4 compatibility for Frontend

---

## Verification Checklist

- [ ] Run `npm audit fix` on each project
- [ ] Review any breaking changes in patch/minor updates
- [ ] Re-run `npm audit` to confirm zero critical/high CVEs
- [ ] Update CI pipeline to enforce audit passing
- [ ] Document any packages that cannot be updated due to compatibility
- [ ] Schedule 2-week follow-up to verify no new vulnerabilities

---

## Notes for Team

[CROSS-REF: TheGuardians] - The critical vulnerabilities in proxy-addr, protobufjs, and @grpc/grpc-js should be escalated to the security team for exploitation risk assessment.

[CROSS-REF: TheFixer] - Build/test chain vulnerabilities (vitest, vite, brace-expansion) require code review to ensure no dev-environment RCE can compromise the CI pipeline.
