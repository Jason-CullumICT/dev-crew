# Dependency Auditor Findings

## Executive Summary

**Audit Date:** 2026-09-05  
**Package Managers Detected:** npm (JavaScript/TypeScript projects)  
**Projects Scanned:** 4 (Backend, Frontend, E2E, Orchestrator)

### Critical Findings

| Severity | Backend | Frontend | E2E | Orchestrator | Total |
|----------|---------|----------|-----|--------------|-------|
| Critical | 1 | 1 | 0 | 1 | **3** |
| High | 4 | 6 | 0 | 2 | **12** |
| Moderate | 2 | 6 | 0 | 4 | **12** |
| Low | 2 | 1 | 0 | 1 | **4** |
| **Total CVEs** | **9** | **14** | **0** | **8** | **31** |

### Transitive Dependency Overview

| Project | Direct | Transitive | Total | Risk Level |
|---------|--------|-----------|-------|------------|
| Backend | 102 | 309 | 411 | P4 (>300) |
| Frontend | 9 | 221 | 230 | P4 (>200) |
| E2E | 4 | 0 | 4 | P5 |
| Orchestrator | 153 | 2 | 155 | P4 |

---

## CRITICAL VULNERABILITIES (P1)

### DEP-001: handlebars - JavaScript Injection via AST Type Confusion
- **Severity:** P1
- **Category:** cve
- **Package:** handlebars (transitive, via various build tools)
- **Affected Range:** >=4.0.0 <=4.7.8
- **File:** Source/Backend/package-lock.json
- **CVEs:**
  - GHSA-2w6w-674q-4c4q (CRITICAL): Arbitrary code execution via AST manipulation
  - GHSA-3mfm-83xf-c92r (HIGH): JavaScript Injection via @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6 (HIGH): JavaScript Injection when passing object as dynamic partial
  - GHSA-9cx6-37pm-9jff (HIGH): DoS via malformed decorator syntax
  - GHSA-xjpj-3mr7-gcpf (HIGH): JavaScript Injection in CLI Precompiler
- **Detail:**
  - CVSS 9.8 (Critical): Arbitrary code execution possible through AST type confusion
  - CVSS 8.2: CLI precompiler vulnerability via unescaped names
  - CVSS 8.1: Injection via object as dynamic partial
  - **Root Cause:** Handlebars allows attackers to craft templates that exploit type confusion in AST processing
  - **Exploit Path:** Untrusted template input → AST type confusion → arbitrary JavaScript execution
- **Impact:** Requires manual template inspection; low risk if templates are trusted (developer-controlled)
- **Fix:** 
  - `npm update handlebars` (to >=4.7.9 or >=5.0.0)
  - Or remove unused handlebars dependencies
- **Transitive Via:** Build tools (likely @vitejs/plugin-react, vite, babel)

### DEP-002: vitest - Arbitrary File Read & Execution via UI Server
- **Severity:** P1
- **Category:** cve
- **Package:** vitest@2.0.5 (direct, development dependency)
- **Affected Range:** <3.2.6
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-5xrq-8626-4rwp
- **CVSS:** 9.8 (Critical)
- **Detail:**
  - When Vitest UI server is listening on localhost, ANY attacker on the network can:
    - Read arbitrary files from the project filesystem
    - Execute arbitrary JavaScript code
  - **Exploit Path:** `http://localhost:__VITEST__.html?file=../../../../etc/passwd` → file exfiltration
  - **Risk Context:** HIGH if UI server left running in production or shared dev environment
- **Impact:**
  - Full code/config exfiltration
  - Potential RCE if combined with other vulnerabilities
  - Affects development environment; not shipped to production
- **Fix:**
  - Upgrade vitest to >=3.2.6: `npm install vitest@3.2.6`
  - Alternative: Upgrade to vitest 5.0.0 (requires @vitejs/plugin-react update)
  - **IMMEDIATE:** Ensure UI server not exposed beyond localhost, disable in CI

### DEP-003: protobufjs - Multiple Critical Vulnerabilities (Orchestrator)
- **Severity:** P1
- **Category:** cve
- **Package:** protobufjs (transitive via @grpc/grpc-js in platform/orchestrator)
- **File:** platform/orchestrator/package-lock.json
- **CVEs:** Multiple critical issues including:
  - Arbitrary code execution in protobufjs
  - Code injection through bytes field defaults
  - Prototype injection in generated message constructors
  - Unbounded protobuf recursion DoS
  - Process-wide DoS via unsafe option paths
- **Severity:** CRITICAL
- **Detail:** Protobufjs has multiple known critical vulnerabilities in serialization/deserialization
- **Impact:** Orchestrator infrastructure can be compromised, crashed, or exploited
- **Fix:** Update @grpc/grpc-js to >=1.14.4; update protobufjs to latest secure version

---

## HIGH-SEVERITY VULNERABILITIES (P2)

### DEP-004: vite - Path Traversal & File Disclosure
- **Severity:** P2
- **Category:** cve
- **Package:** vite@5.4.0 (direct, dev dependency)
- **CVEs:**
  - GHSA-fx2h-pf6j-xcff: `server.fs.deny` bypass on Windows alternate paths (CVSS 7.5)
  - GHSA-6g55-p6wh-862q: Path traversal via attacker-controlled sourceMappingURL (CVSS 7.5)
  - GHSA-r28c-9q8g-f849: Path traversal in source map auto-loading (CVSS 7.5)
  - GHSA-4w7w-66w2-5vf9: Vite path traversal in optimized deps .map handling
- **Affected Range:** <=6.4.2
- **File:** Source/Frontend/package-lock.json
- **Detail:** Vite dev server can be tricked into serving files outside project root
- **Fix:** Upgrade vite to >=8.2.2 (major version jump required)

### DEP-005: brace-expansion - Multiple DoS via Pattern Expansion
- **Severity:** P2
- **Category:** cve
- **Package:** brace-expansion (transitive, via glob/micromatch/minimatch in build tools)
- **Affected Range:** <=1.1.17
- **CVEs:**
  - GHSA-3jxr-9vmj-r5cp: DoS via exponential expansion (CVSS 5.3)
  - GHSA-mh99-v99m-4gvg: DoS via unbounded expansion causing OOM (CVSS 7.5)
  - GHSA-rgw5-rvv9-x895: DoS via unbounded intermediate arrays (CVSS 7.5)
  - GHSA-f886-m6hf-6m8v: Zero-step sequence causes process hang and memory exhaustion
- **Detail:** Patterns like `{a,b}{a,b}{a,b}{a,b}{a,b}` cause exponential CPU/memory consumption
- **Impact:** Build tools may hang or crash when processing certain file patterns
- **Fix:** Update all glob/micromatch/minimatch dependencies to use brace-expansion >=1.1.18

### DEP-006: browserslist - Unbounded Memory Growth & Prototype Pollution
- **Severity:** P2
- **Category:** cve
- **Package:** browserslist (transitive, via postcss/vite/build tools)
- **Affected Range:** <=4.28.6
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx: Unbounded memory growth via cache non-eviction (CVSS 7.5)
  - GHSA-73wf-gq98-2v4g: Prototype write via untrusted browserslist-stats.json (CVSS 7.5)
- **Detail:**
  - Repeated different query results → memory leak in cache
  - Malicious browserslist-stats.json can write to prototype chain
- **Impact:** DoS, potential code execution via prototype pollution
- **Fix:** Update browserslist to >=4.28.7

### DEP-007: form-data - CRLF Injection in Multipart Headers
- **Severity:** P2
- **Category:** cve
- **Package:** form-data (transitive, affects multiple deps)
- **Affected Range:** 4.0.0-4.0.5
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **CVSS:** 7.5
- **Detail:** Field names & filenames not properly escaped → CRLF injection in multipart requests
- **Impact:** Could inject HTTP headers, modify request structure
- **Fix:** Update form-data to >=4.0.6

### DEP-008: js-yaml - Quadratic CPU Consumption in Merge Key Chains
- **Severity:** P2
- **Category:** cve
- **Package:** js-yaml (transitive, via various build deps)
- **Affected Range:** <=3.15.0
- **CVEs:**
  - GHSA-52cp-r559-cp3m: YAML merge-key chains DoS (CVSS 7.5)
  - GHSA-5p4m-2wfm-xmqj: Quadratic CPU in !!omap resolution (CVSS 7.5)
  - GHSA-h67p-54hq-rp68: Quadratic-complexity DoS in merge key handling (CVSS moderate)
- **Detail:** Malicious YAML files with repeated merge keys cause O(n²) parsing
- **Impact:** Build/deploy processes reading untrusted YAML can hang
- **Fix:** Update js-yaml to >=3.15.1

### DEP-009: nanoid - Infinite Loop & Integer Overflow
- **Severity:** P2
- **Category:** cve
- **Package:** nanoid (transitive, via frontend deps)
- **Affected Range:** <=3.3.17
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv: Infinite loop with negative size (CVSS 5.9)
  - GHSA-2v37-7h3g-55p8: Infinite loop when size is zero (CVSS 5.9)
  - GHSA-xwg4-73v4-xw9w: Integer overflow (CVSS 7.4)
- **Detail:** Generators can loop indefinitely with invalid input sizes
- **Impact:** Frontend logic using nanoid with untrusted size input could hang
- **Fix:** Update nanoid to >=3.3.18

### DEP-010: uuid - Buffer Bounds Check Missing
- **Severity:** P2
- **Category:** cve
- **Package:** uuid@9.0.0 (direct dependency in Backend)
- **Affected Range:** <11.1.1
- **CVE:** GHSA-w5hq-g745-h8pq
- **CVSS:** 7.5
- **CWE:** CWE-787 (Out-of-bounds write)
- **Detail:** When `buf` parameter provided to v3/v5/v6 UUID functions, bounds not validated
- **Impact:** Buffer overflow possible if attacker controls buffer size/address
- **Fix:** Update uuid to >=11.1.1 (major version bump)
- **Note:** Also appears in orchestrator as transitive dependency

### DEP-011: @grpc/grpc-js - Server Crash on Malformed Requests
- **Severity:** P2
- **Category:** cve
- **Package:** @grpc/grpc-js (direct, platform/orchestrator)
- **Affected Range:** >=1.14.0 <1.14.4
- **CVEs:**
  - GHSA-5375-pq7m-f5r2: Malformed request crash (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq: Malformed compressed message crash (CVSS 7.5)
- **Detail:** Orchestrator's gRPC server crashes on malformed protocol buffer messages
- **Impact:** DoS attack on orchestrator infrastructure
- **Fix:** Update @grpc/grpc-js to >=1.14.4

### DEP-012: postcss - Path Traversal & Information Disclosure
- **Severity:** P2
- **Category:** cve
- **Package:** postcss (transitive, via vite/build tools)
- **Affected Range:** <=8.5.22
- **CVEs:**
  - GHSA-6g55-p6wh-862q: Arbitrary .map file read via sourceMappingURL (CVSS 7.5)
  - GHSA-r28c-9q8g-f849: Path traversal in source map auto-loading (CVSS 7.5)
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix of sourceMappingURL bypass
- **Detail:** Attacker can read arbitrary .map files and source code via CSS sourceMappingURL
- **Impact:** Source code disclosure
- **Fix:** Update postcss to latest (>=8.5.23 or higher)

### DEP-013: react-router-dom - Open Redirect & Constructor Injection Issues
- **Severity:** P2
- **Category:** cve
- **Package:** react-router-dom@6.26.0 (direct, Frontend)
- **Affected Range:** Multiple (see details)
- **CVEs:**
  - GHSA-2j2x-hqr9-3h42: Open redirect via protocol-relative URLs
  - GHSA-jjmj-jmhj-qwj2: Open redirect leading to XSS (CVSS 6.9)
  - GHSA-337j-9hxr-rhxg: Arbitrary constructor injection in SSR (CVSS 6.1)
  - GHSA-wrjc-x8rr-h8h6: Open redirect via backslash in Link (CVE-2025-68470 bypass)
- **Detail:** Router misconfigures redirects, allowing attacker to chain to arbitrary URLs
- **Impact:** Session hijacking, phishing (if app uses redirect for auth)
- **Fix:** Update react-router-dom to >=7.18.3

### DEP-014: path-to-regexp - Regular Expression Denial of Service
- **Severity:** P2
- **Category:** cve
- **Package:** path-to-regexp (transitive, express/orchestrator)
- **CVE:** Regex DoS via multiple route parameters
- **Impact:** Express routing could be exploited with malformed paths to cause CPU exhaustion
- **Fix:** Ensure path-to-regexp is current, update express dependencies

### DEP-015: ws - Memory Exhaustion DoS
- **Severity:** P2
- **Category:** cve
- **Package:** ws (transitive, via socket.io or vite)
- **Affected Range:** >=8.0.0 <8.21.0
- **CVE:** GHSA-96hv-2xvq-fx4p
- **CVSS:** 7.5
- **Detail:** WebSocket connections can be exhausted via malformed frames
- **Fix:** Update to ws >=8.21.0

---

## MODERATE-SEVERITY VULNERABILITIES (P3)

### DEP-016: @remix-run/router - Protocol-Relative URL Open Redirect
- **Severity:** P3
- **Category:** cve
- **Package:** @remix-run/router (transitive, via react-router-dom)
- **Affected Range:** >=1.3.0 <1.23.3
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Detail:** Paths starting with `//` reinterpreted as protocol-relative URLs
- **Fix:** Update react-router-dom (includes @remix-run/router)

### DEP-017: esbuild - CORS Bypass in Dev Server
- **Severity:** P3
- **Category:** cve
- **Package:** esbuild (transitive, via vite)
- **Affected Range:** <=0.24.2
- **CVE:** GHSA-67mh-4wv8-2f99
- **CVSS:** 5.3
- **Detail:** Dev server allows any website to send requests and read responses
- **Impact:** Source code, config exfiltration during development
- **Fix:** Update vite (which bundles esbuild) to latest

### DEP-018: qs - Array Limit Bypass & DoS
- **Severity:** P3
- **Category:** cve
- **Package:** qs (transitive, via express/body-parser)
- **Affected Range:** 2.2.5 - 6.15.3
- **CVEs:**
  - GHSA-4mjr-xmp4-gh2g: DoS via attacker-controlled isBuffer (CVSS 5.3)
  - GHSA-q8mj-m7cp-5q26: Remotely triggerable DoS (CVSS 5.3)
  - GHSA-x5fp-wj9c-mxmx: Array-limit bypass via bracket-key comma parsing (CVSS 3.7)
- **Detail:** Query string parser can be exploited for DoS
- **Fix:** Update qs to latest (>=6.16.0)

### DEP-019: @protobufjs/utf8 - Overlong UTF-8 Decoding
- **Severity:** P3
- **Category:** cve
- **Package:** @protobufjs/utf8 (transitive, via @grpc/grpc-js)
- **Affected Range:** <=1.1.0
- **CVE:** GHSA-q6x5-8v7m-xcrf
- **CVSS:** 5.3
- **Detail:** UTF-8 validation bypassed, allowing invalid sequences
- **Impact:** Protocol buffer parsing confusion
- **Fix:** Update protobufjs/grpc-js

### DEP-020: dockerode - Moderate Vulnerability
- **Severity:** P3
- **Category:** cve
- **Package:** dockerode (direct, platform/orchestrator)
- **File:** platform/orchestrator/package.json
- **Detail:** Docker client library has a moderate vulnerability in version 4.0.4
- **Fix:** Update dockerode to latest stable

### DEP-021: vite-node - Moderate via Vite Transitive Issues
- **Severity:** P3
- **Category:** cve
- **Package:** vite-node (transitive)
- **Detail:** Inherits vite vulnerabilities
- **Fix:** Fixed by updating vite

### DEP-022: @vitest/mocker - Transitive Vite Vulnerability
- **Severity:** P3
- **Category:** cve
- **Package:** @vitest/mocker (transitive, via vitest)
- **Detail:** Affected by vite vulnerabilities
- **Fix:** Fixed by updating vitest/vite

---

## OUTDATED MAJOR VERSIONS (P3)

### DEP-023: express - 4+ Minor Versions Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** express
- **Current:** 4.18.2 → **Wanted:** 4.22.2 → **Latest:** 5.2.1
- **File:** Source/Backend/package.json
- **Detail:** 4 minor releases missed (4.19, 4.20, 4.21, 4.22)
- **Risk:** Missing security patches, performance improvements
- **Fix:** `npm install express@4.22.2` (or 5.2.1 for major bump)

### DEP-024: pino - 2+ Minor Versions Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** pino
- **Current:** 8.17.0 → **Wanted:** 8.21.0 → **Latest:** 10.3.1
- **File:** Source/Backend/package.json
- **Detail:** 4 minor releases + major release missed
- **Risk:** Logging bugs, performance issues
- **Fix:** `npm install pino@8.21.0` (or 10.3.1 for major bump)

### DEP-025: uuid - 5+ Major Versions Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** uuid
- **Current:** 9.0.0 → **Latest:** 14.0.2
- **File:** Source/Backend/package.json
- **Detail:** 5 major versions behind (9.0.0 → 14.0.2)
- **Risk:** Buffer overflow vulnerability (DEP-010) unpatched
- **Fix:** `npm install uuid@11.1.1` (major version bump to get patch)

### DEP-026: react & react-dom - 1 Major Version Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** react, react-dom
- **Current:** 18.3.1 → **Latest:** 19.2.8
- **File:** Source/Frontend/package.json
- **Detail:** 1 major version (18.x → 19.x)
- **Risk:** Missing performance optimizations, concurrent rendering fixes
- **Fix:** `npm install react@19.2.8 react-dom@19.2.8` (requires testing)

### DEP-027: react-router-dom - 1 Major Version Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** react-router-dom
- **Current:** 6.26.0 → **Latest:** 7.18.3
- **File:** Source/Frontend/package.json
- **Detail:** 1 major version (6.x → 7.x)
- **Risk:** Open redirect vulnerabilities (DEP-013) not fixed
- **Fix:** `npm install react-router-dom@7.18.3` (breaking changes, requires testing)

---

## LOW-SEVERITY VULNERABILITIES (P4)

### DEP-028: @babel/core - Arbitrary File Read via sourceMappingURL
- **Severity:** P4
- **Category:** cve
- **Package:** @babel/core (transitive)
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **CVSS:** 3.2 (Low)
- **Detail:** Local file read via comment in source maps
- **Fix:** Minor update to babel

### DEP-029: body-parser - Size Limit Bypass
- **Severity:** P4
- **Category:** cve
- **Package:** body-parser (transitive)
- **CVE:** GHSA-v422-hmwv-36x6
- **CVSS:** 3.7 (Low)
- **Detail:** Invalid limit values silently disable size enforcement
- **Risk:** Low in practice if requests validated elsewhere
- **Fix:** Minor update to body-parser

### DEP-030: launch-editor (vite transitive) - NTLMv2 Hash Disclosure
- **Severity:** P4
- **Category:** cve
- **Package:** launch-editor (transitive via vite)
- **CVE:** GHSA-v6wh-96g9-6wx3
- **Detail:** NTLMv2 hash disclosure via UNC path handling on Windows
- **Fix:** Fixed by updating vite

---

## SUPPLY CHAIN RISKS (P5)

### DEP-031: Excessive Transitive Dependency Count
- **Severity:** P5
- **Category:** supply-chain
- **Detail:**
  - **Backend:** 411 total (102 direct, 309 transitive)
  - **Frontend:** 230 total (9 direct, 221 transitive)
  - **Orchestrator:** 155 total (153 direct, 2 transitive)
- **Risk:** Each transitive dependency is a potential vulnerability vector
- **Recommendation:** 
  - Audit most critical transitive deps (handlebars, vitest, vite in top tier)
  - Consider dependency consolidation (e.g., do we need both pino AND prom-client for logging?)
  - Use npm `audit` regularly in CI

### DEP-032: No GPL/AGPL Licenses Detected
- **Severity:** P5 (Informational)
- **Category:** license
- **Detail:** All dependencies use permissive licenses (MIT, Apache, BSD, ISC)
- **Status:** PASS - No viral license risks

### DEP-033: No Post-Install Scripts Found
- **Severity:** P5 (Informational)
- **Category:** supply-chain
- **Detail:** Scanned for `scripts.postinstall` in node_modules - none found
- **Status:** PASS - Low supply chain build-time risk

---

## PRIORITY REMEDIATION ROADMAP

### IMMEDIATE (P1 - Critical, Do Now)
1. **DEP-003 (protobufjs):** Update @grpc/grpc-js to >=1.14.4, protobufjs to latest
2. **DEP-002 (vitest):** Upgrade to vitest@3.2.6 or 5.0.0; disable UI server in prod/CI
3. **DEP-001 (handlebars):** Remove unused or update to >=4.7.9

### SHORT-TERM (P2 - High, This Sprint)
1. **DEP-010 (uuid):** Upgrade to >=11.1.1 (major version) in backend
2. **DEP-004 (vite):** Upgrade to >=8.2.2 (major version) in frontend
3. **DEP-008 (js-yaml):** Update to >=3.15.1
4. **DEP-013 (react-router-dom):** Update to >=7.18.3 (requires testing)
5. **DEP-011 (@grpc/grpc-js):** Update to >=1.14.4 in orchestrator

### MEDIUM-TERM (P3 - Moderate, Next Sprint)
1. **DEP-023-027 (Outdated Majors):** Plan React 18→19, react-router 6→7 migrations
2. **DEP-014-020 (Remaining High CVEs):** Update to latest minor versions
3. **Dependency consolidation:** Review if all 400+ transitive deps are necessary

---

## CROSS-REFERENCES

- `[CROSS-REF: red-teamer]` — DEP-001 (handlebars), DEP-002 (vitest UI), DEP-004 (vite path traversal), DEP-013 (react-router open redirect)
- `[SEE TheGuardians static-analyzer]` — N/A (no hardcoded secrets or app-level CWEs found in this audit)

---

## SUMMARY METRICS

| Metric | Value |
|--------|-------|
| Total CVEs Found | 33 |
| Critical | 3 |
| High | 14 |
| Moderate | 12 |
| Low | 4 |
| Outdated Major Versions | 5 |
| Supply Chain Observations | 3 (dependency count, licenses, post-install) |
| Projects at Risk | 3/4 (E2E is clean) |
| Estimated Remediation Time | 6-8 hours (full stack audit + integration testing) |

---

_Report generated by Dependency Auditor | dev-crew project_
_Audit scope: npm audit on 4 projects, license check, outdated version analysis_
