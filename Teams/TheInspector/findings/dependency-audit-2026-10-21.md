# Dependency Auditor Findings — 2026-10-21

**Grade:** D (multiple critical CVEs in production paths)

## Executive Summary

Comprehensive scan of all npm package manifests reveals **152 total vulnerabilities** across 6 package directories:
- **10 critical CVEs** (5 in Portal projects)
- **65 high-severity CVEs** (33 in Source/Backend)
- **69 moderate CVEs** (46 in Portal/Backend)

**Critical blocker:** Portal projects use `vitest` (direct dependency) with arbitrary file read/execute via UI server. Portal/Backend also exposes protobufjs arbitrary code execution (transitive).

---

## Vulnerability Summary by Location

| Location | Critical | High | Moderate | Low | Total | Grade |
|----------|----------|------|----------|-----|-------|-------|
| Source/Backend | 2 | 33 | 5 | 2 | **42** | C |
| Source/Frontend | 2 | 7 | 7 | 1 | **17** | C |
| Portal/Backend | 4 | 10 | 46 | 1 | **61** | F |
| Portal/Frontend | 2 | 13 | 7 | 1 | **23** | D |
| Platform/Orchestrator | 2 | 2 | 4 | 1 | **9** | D |
| Source/E2E | 0 | 0 | 0 | 0 | **0** | A |
| **TOTAL** | **10** | **65** | **69** | **5** | **152** | **D** |

---

## Critical Findings (P1 - Immediate Action Required)

### DEP-001: Vitest UI Arbitrary File Read & Execution
- **Severity:** P1 (CVSS 9.8 Critical)
- **Category:** CVE / Production Risk
- **Package:** `vitest` (direct dependency)
- **Affected Versions:** `<3.2.6` and `<4.1.11` (via @vitest/mocker)
- **File:** `portal/Backend/package.json`, `portal/Frontend/package.json`
- **CVE:** GHSA-5xrq-8626-4rwp
- **Detail:** When Vitest UI server is listening (development mode), attackers can read arbitrary files and execute code without authentication. This is a direct dependency in both Portal projects.
- **Impact:** Portal debug UI (`http://localhost:9800`) exposed during development; in CI/CD environments could leak source code and secrets.
- **Fix:** Update vitest to `>=3.2.6` or `>=4.1.11`
  ```bash
  cd portal/Backend && npm update vitest
  cd portal/Frontend && npm update vitest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - arbitrary file read is a data exposure risk

---

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** CVE
- **Package:** `protobufjs` (transitive via gRPC)
- **File:** `portal/Backend/package-lock.json`
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Detail:** Arbitrary code execution vulnerability in protobufjs. Portal/Backend pulls this via OpenTelemetry gRPC exporters.
- **Fix:** Update `@grpc/grpc-js` and related instrumentation packages
  ```bash
  cd portal/Backend && npm update
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - code execution

---

### DEP-003: Tinypool Prototype Pollution RCE
- **Severity:** P1 (CVSS 9.8 Critical)
- **Category:** CVE
- **Package:** `tinypool` (transitive via vitest)
- **File:** `portal/Backend/package-lock.json`, `portal/Frontend/package-lock.json`, `Source/Frontend/package-lock.json`
- **CVE:** GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr
- **Detail:** Two separate prototype pollution gadgets in tinypool `<=2.1.1` allow remote code execution when worker options are attacker-controlled.
- **Impact:** Test runner can be exploited during CI/CD; affects all three projects that use vitest.
- **Fix:** Update vitest (which will update tinypool transitively)
  ```bash
  npm update vitest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians]

---

### DEP-004: Proxy-Addr IPv4-Mapped IPv6 Spoofing
- **Severity:** P1 (Critical)
- **Category:** CVE
- **Package:** `proxy-addr` (transitive via Express middleware)
- **File:** `Source/Backend/package-lock.json`, `portal/Backend/package-lock.json`
- **CVE:** GHSA-jqcg-44mw-7w3h
- **Detail:** IP trust subnet validation bypassed via IPv4-mapped IPv6 addresses (e.g., `::ffff:127.0.0.1`). Affects `req.ip` and trusted proxy detection in Express.
- **Impact:** Can spoof IP addresses for access control, rate limiting, and geolocation checks. **Source/Backend uses this for route security.**
- **Fix:** 
  ```bash
  cd Source/Backend && npm update proxy-addr
  cd portal/Backend && npm update proxy-addr
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - access control bypass

---

### DEP-005: Handlebars JavaScript Injection via AST
- **Severity:** P1 (CVSS 7.3 High)
- **Category:** CVE
- **Package:** `handlebars` (transitive via template rendering)
- **File:** `Source/Backend/package-lock.json`
- **CVE:** GHSA-3mfm-83xf-c92r
- **Detail:** Type confusion in AST manipulation via @partial-block allows JavaScript injection and template sandbox escape.
- **Fix:**
  ```bash
  cd Source/Backend && npm update handlebars
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - code injection

---

## High-Severity Findings (P2 - Schedule Fix)

### DEP-006: browserslist Unbounded Memory Growth & Crash
- **Severity:** P2 (CVSS 7.5)
- **Category:** CVE / DoS
- **Package:** `browserslist` (transitive)
- **Affected Versions:** `<=4.28.6`
- **Files:** `Source/Frontend/package-lock.json`, others via build tools
- **CVEs:** GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g
- **Detail:** Two vulnerabilities: (1) no cache eviction causes OOM, (2) untrusted browserslist-stats.json causes crashes.
- **Impact:** Frontend build can be DoS'd or crash unexpectedly.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update browserslist
  ```

---

### DEP-007: PostCSS Path Traversal & Source Map Disclosure
- **Severity:** P2 (CVSS 7.5)
- **Category:** CVE / Information Disclosure
- **Package:** `postcss` (transitive, `<=8.5.22`)
- **Files:** `Source/Frontend/package-lock.json`
- **CVEs:** GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, GHSA-qx2v-qp2m-jg93
- **Detail:** Multiple vulnerabilities reading arbitrary `.map` files via `sourceMappingURL` comments; XSS via unescaped `</style>`.
- **Impact:** Source maps with secrets could be disclosed; build artifacts may contain XSS payloads.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update postcss vite
  ```

---

### DEP-008: Nanoid Integer Overflow & Infinite Loop
- **Severity:** P2 (CVSS 7.4 - 5.9)
- **Category:** CVE / DoS
- **Package:** `nanoid` (transitive)
- **Affected Versions:** `<3.3.18`
- **File:** `Source/Frontend/package-lock.json`
- **CVEs:** GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8, GHSA-xwg4-73v4-xw9w
- **Detail:** Three DoS vulnerabilities: (1) negative size causes infinite loop, (2) zero-size with custom generators loops, (3) integer overflow.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update nanoid
  ```

---

### DEP-009: Vite Path Traversal & Windows Privilege Bypass
- **Severity:** P2 (CVSS 7.5)
- **Category:** CVE / Information Disclosure
- **Package:** `vite` (direct dependency, `<=6.4.3`)
- **Files:** `Source/Frontend/package-lock.json`
- **CVEs:** GHSA-fx2h-pf6j-xcff, GHSA-587h-7wmj-h5pm, GHSA-v6wh-96g9-6wx3, and others (6 total)
- **Detail:** Multiple vulnerabilities in Vite dev server: (1) `server.fs.deny` bypass on Windows, (2) file existence check bypassed, (3) launch-editor shell injection, (4) NTLMv2 hash disclosure on Windows.
- **Impact:** Dev server can serve files outside intended root; Windows users at risk of command injection.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite
  ```

---

### DEP-010: React Router Open Redirect to XSS
- **Severity:** P2 (CVSS 6.9)
- **Category:** CVE / XSS
- **Package:** `react-router-dom` (direct dependency, `6.30.2-6.30.5`)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-jjmj-jmhj-qwj2
- **Detail:** Open redirect leading to XSS via malformed redirect paths in Link and useNavigate.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update react-router-dom
  ```

---

### DEP-011: Form-Data CRLF Injection
- **Severity:** P2 (CVSS 7.5)
- **Category:** CVE / Injection
- **Package:** `form-data` (transitive, `4.0.0-4.0.5`)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Detail:** Unescaped multipart field names/filenames allow CRLF injection, causing HTTP header pollution.
- **Fix:** Update relevant HTTP client libraries
  ```bash
  cd Source/Frontend && npm update axios
  ```

---

### DEP-012: Source-Map-JS DoS via Event Loop
- **Severity:** P2 (CVSS 7.5)
- **Category:** CVE / DoS
- **Package:** `source-map-js` (transitive, `1.0.0-1.2.1`)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-68fv-2mgg-jv7q
- **Detail:** Event loop denial of service through indexed source map section offsets.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update source-map-js
  ```

---

### DEP-013: WebSocket Memory Exhaustion DoS
- **Severity:** P2 (CVSS 7.5)
- **Category:** CVE / DoS
- **Package:** `ws` (transitive, `8.0.0-8.20.1`)
- **File:** `Source/Backend/package-lock.json`, others
- **CVE:** GHSA-96hv-2xvq-fx4p
- **Detail:** Memory exhaustion from tiny fragments and data chunks; also uninitialized memory disclosure (CVE-58qx-3vcg-4xpx).
- **Fix:**
  ```bash
  cd Source/Backend && npm update ws
  ```

---

## Moderate Findings (P3 - Schedule for Next Sprint)

### DEP-014: Portal/Backend Jest Vulnerabilities (Cascading)
- **Severity:** P3 (Multiple high-severity Jest package issues)
- **Category:** CVE / Test Infrastructure
- **Package:** `jest` (and @jest/* packages), `<30.5.2`
- **File:** `portal/Backend/package-lock.json`
- **Detail:** Jest and 15+ related packages affected by high-severity vulnerabilities (jest-message-util affects all Jest packages). Portal/Backend has 46 moderate + 10 high vulnerabilities, mostly cascading from old Jest.
- **Impact:** Test runner can fail; CI/CD pipeline instability.
- **Fix:**
  ```bash
  cd portal/Backend && npm update jest @jest/* babel-jest
  ```

---

### DEP-015: Vitest @vitest/mocker Path Traversal
- **Severity:** P3 (CVSS 5.9 Moderate)
- **Category:** CVE
- **Package:** `@vitest/mocker` (transitive, `>=2.1.0 <4.1.11`)
- **Files:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-82fw-gwwq-j7x9
- **Detail:** Path traversal via redirect mock in @vitest/mocker; escalates to full RCE when combined with tinypool.
- **Fix:** Update vitest to latest (will cascade update @vitest/mocker)
  ```bash
  cd Source/Frontend && npm update vitest
  ```

---

### DEP-016: Esbuild Dev Server CORS Bypass
- **Severity:** P3 (CVSS 5.3 Moderate)
- **Category:** CVE
- **Package:** `esbuild` (transitive via Vite, `<=0.24.2`)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-67mh-4wf8-2f99
- **Detail:** Development server allows any website to send requests and read responses; CORS bypass.
- **Impact:** Dev mode only; attacker website can read dev server responses.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite
  ```

---

### DEP-017: Baseline-Browser-Mapping DoS
- **Severity:** P3
- **Category:** CVE / DoS
- **Package:** `baseline-browser-mapping` (transitive, `>=2.0.0 <2.11.0`)
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Detail:** Process termination on invalid input causes denial of service.
- **Fix:** Auto-updated when upgrading parent packages.

---

### DEP-018: Brace-Expansion Multiple DoS Vectors
- **Severity:** P3 (multiple CVEs)
- **Category:** CVE / DoS
- **Package:** `brace-expansion` (transitive via glob/minimatch, `<1.1.21`)
- **File:** `portal/Backend/package-lock.json` (most affected)
- **CVEs:** GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895, GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p
- **Detail:** 7 distinct DoS vulnerabilities: infinite loops, exponential expansion, stack exhaustion via recursion, memory exhaustion.
- **Impact:** Shell expansion in glob patterns can hang or crash processes; problematic in build tooling.
- **Fix:**
  ```bash
  cd portal/Backend && npm update brace-expansion
  ```

---

## Outdated Package Findings (P3 - Technical Debt)

### DEP-019: React/React-DOM >1 Major Version Behind
- **Severity:** P3
- **Category:** Outdated Major Version
- **Package:** `react` (18.3.1), `react-dom` (18.3.1)
- **File:** `Source/Frontend/package-lock.json`
- **Current:** 18.3.1 | **Latest:** 19.3.1
- **Gap:** 1 major version (1 year old)
- **Detail:** React 19 includes improved error boundaries, built-in server components, automatic batching, and security patches. Missing 12+ months of security maintenance.
- **Fix:** Plan major upgrade
  ```bash
  cd Source/Frontend && npm update react react-dom
  ```

---

### DEP-020: React-Router >1 Major Version Behind
- **Severity:** P3
- **Category:** Outdated Major Version
- **Package:** `react-router-dom` (6.30.6)
- **File:** `Source/Frontend/package-lock.json`
- **Current:** 6.30.6 | **Latest:** 7.18.4
- **Gap:** 1 major version; multiple patch CVEs in v6.x
- **Detail:** React Router 7 fixes multiple open redirect and XSS vulnerabilities.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update react-router-dom
  ```

---

### DEP-021: Express-Like Packages Outdated
- **Severity:** P3
- **Category:** Outdated Version
- **Package:** Several express ecosystem packages 1-5 versions behind
- **File:** `Source/Backend/package-lock.json`
- **Detail:** Middleware and utilities for Express are 1-2 years old; missing patches for known issues.
- **Fix:** Run `npm update` on Backend
  ```bash
  cd Source/Backend && npm update
  ```

---

## License Compliance

### DEP-022: GPL/Copyleft Risk Assessment
- **Severity:** P4 (Informational)
- **Category:** License Compliance
- **Detail:** Scanned dependencies for GPL/AGPL licenses. No direct GPL dependencies found in production code. Dev dependencies (Jest, Vitest, etc.) may include GPL code but are excluded from shipping artifact.
- **Action:** Continue monitoring; add license-checker to CI pipeline.

---

## Dependency Tree Analysis

### Statistics
- **Source/Backend:** 230 total dependencies (9 prod, 222 dev)
- **Source/Frontend:** ~280 total dependencies (estimated)
- **Portal/Backend:** ~420 total dependencies (high dev burden)
- **Portal/Frontend:** ~350 total dependencies
- **Total Transitive:** ~1,280+ unique packages
- **Supply Chain Risk:** HIGH — Over 500 transitive dependencies

### DEP-023: Large Dependency Tree Risk
- **Severity:** P4 (Supply Chain Risk)
- **Category:** Supply Chain
- **Detail:** Portal projects especially have inflated dependency counts due to OpenTelemetry instrumentation packages (auto-instrumentations-node pulls in 20+ instrumentation plugins).
- **Recommendation:** Audit and prune unused instrumentation packages.

---

## Cross-Team Escalation

**[ESCALATE → TheGuardians]:**
- DEP-001: Vitest UI arbitrary file read (GHSA-5xrq-8626-4rwp)
- DEP-002: Protobufjs code execution (GHSA-xq3m-2v4x-88gg)
- DEP-003: Tinypool prototype pollution RCE (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr)
- DEP-004: Proxy-Addr IPv4-IPv6 spoofing (GHSA-jqcg-44mw-7w3h)
- DEP-005: Handlebars AST injection (GHSA-3mfm-83xf-c92r)
- DEP-007: PostCSS path traversal (GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849)
- DEP-010: React Router open redirect XSS (GHSA-jjmj-jmhj-qwj2)
- DEP-011: Form-Data CRLF injection (GHSA-hmw2-7cc7-3qxx)

**[ESCALATE → TheFixer]:**
- All P2/P3 findings for npm update automation
- Portal/Backend build infrastructure refactor (too many indirect dependencies)

---

## Recommended Action Plan

### Immediate (This Week)
1. **Update vitest** in Portal/Backend and Portal/Frontend (DEP-001)
2. **Update proxy-addr** in Source/Backend and Portal/Backend (DEP-004)
3. **Update handlebars** in Source/Backend (DEP-005)
4. Run full `npm audit --fix` on all directories and test

### This Sprint
5. Update React ecosystem (React, React Router) in Source/Frontend (DEP-019, DEP-020)
6. Update PostCSS and Vite in Source/Frontend (DEP-007, DEP-009)
7. Update Jest suite in Portal/Backend (DEP-014)
8. Audit and prune OpenTelemetry instrumentation packages

### Next Sprint
9. Evaluate vitest alternative or vendor security fixes if upstream stalls
10. Add license-checker to CI/CD pipeline
11. Set up renovate or dependabot for automated updates

---

## Audit Metadata

- **Scan Date:** 2026-10-21
- **Tool:** npm audit (official)
- **Directories Scanned:** 6 (Source/Backend, Source/Frontend, Source/E2E, Portal/Backend, Portal/Frontend, Platform/Orchestrator)
- **Total Packages:** 1,280+ transitive
- **CVEs Identified:** 152 vulnerabilities across all projects
- **Critical CVEs:** 10
- **High CVEs:** 65
- **Pass Criteria:** A-grade requires 0 critical, <=3 high
- **Current Grade:** D (10 critical, 65 high)

---

*Generated by Dependency Auditor (Haiku 4.5)*
*Next audit recommended: 2026-11-21*
