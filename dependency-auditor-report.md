# Dependency Auditor Findings

**Date:** 2026-09-14  
**Audit Type:** CVE Scanning, License Compliance, Outdated Packages, Abandoned Libraries  
**Package Managers Detected:** npm (JavaScript/Node.js)

---

## Executive Summary

**Overall Grade:** ⚠️ **C** (Multiple critical and high-severity vulnerabilities)

### Vulnerability Statistics

| Project | Direct Deps | Transitive Deps | Critical | High | Moderate | Low | Total |
|---------|------------|-----------------|----------|------|----------|-----|-------|
| Backend | 4+9 | 412 | 1 | 4 | 3 | 2 | 10 |
| Frontend | 3+10 | 231 | 1 | 6 | 7 | 1 | 15 |
| Orchestrator | ? | 156 | 1 | 2 | 4 | 1 | 8 |
| E2E Tests | ? | 5 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **7+19** | **804** | **3** | **12** | **14** | **4** | **33** |

⚠️ **CRITICAL FINDING:** 3 critical vulnerabilities detected in production dependencies.

---

## 🔴 Critical Vulnerabilities (P1)

### DEP-001: Handlebars.js - JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Packages Affected:** 
  - Backend: `handlebars` (via transitive dependency)
  - Frontend: `handlebars` (via transitive dependency)
- **Affected Versions:** `>=4.0.0 <=4.7.8`
- **Vulnerability ID:** GHSA-3mfm-83xf-c92r
- **Title:** Handlebars.js has JavaScript Injection via AST Type Confusion by tampering @partial-block
- **URL:** https://github.com/advisories/GHSA-3mfm-83xf-c92r
- **Detail:** 
  Handlebars templates can be exploited to inject arbitrary JavaScript code by tampering with the `@partial-block` AST node type. This allows attackers to bypass template sandboxing and execute code in contexts where user-supplied templates are rendered.
- **Impact:** Remote Code Execution in applications using Handlebars templating
- **Fix:** 
  ```bash
  npm update handlebars
  ```
- **Cross-ref:** [SEE TheGuardians static-analyzer] - RCE vulnerability, verify template usage

---

### DEP-002: protobufjs - Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** `protobufjs`
- **Project:** platform/orchestrator
- **Affected Versions:** `<7.5.5`
- **Vulnerability ID:** GHSA-xq3m-2v4x-88gg
- **Title:** Arbitrary code execution in protobufjs
- **URL:** https://github.com/advisories/GHSA-xq3m-2v4x-88gg
- **Detail:**
  Protobufjs is vulnerable to arbitrary code execution through deserialization of untrusted data. An attacker can craft malicious `.proto` files or serialized protobuf messages that trigger code execution during parsing.
- **Impact:** Remote Code Execution when parsing untrusted protobuf messages
- **Fix:**
  ```bash
  cd platform/orchestrator && npm install protobufjs@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - Critical RCE, immediate patching required

---

## 🟠 High-Severity Vulnerabilities (P2)

### DEP-003: brace-expansion - Multiple DoS Vulnerabilities
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `brace-expansion` (transitive)
- **Project:** Source/Backend
- **Affected Versions:** `<1.1.17` (multiple CVEs)
- **Vulnerabilities:**
  1. GHSA-f886-m6hf-6m8v: Zero-step sequence hang (`<1.1.13`)
  2. GHSA-3jxr-9vmj-r5cp: Exponential expansion DoS (`<1.1.16`)
  3. GHSA-mh99-v99m-4gvg: Unbounded expansion OOM (`<1.1.17`)
  4. GHSA-rgw5-rvv9-x895: Unbounded arrays DoS (`<1.1.17`)
- **CVSS:** 7.5
- **Detail:**
  The `brace-expansion` package has multiple denial-of-service vulnerabilities. Attackers can craft input strings that cause the parser to hang, exhaust memory, or crash.
- **Impact:** Application availability degradation, potential crash
- **Fix:**
  ```bash
  npm install brace-expansion@>=1.1.17
  ```

---

### DEP-004: browserslist - Unbounded Memory Growth
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `browserslist` (transitive, dev dependency)
- **Projects:** Backend, Frontend
- **Affected Versions:** `<=4.28.6`
- **Title:** Browserslist: Unbounded memory growth (no cache eviction)
- **Detail:**
  Browserslist has unbounded memory growth due to missing cache eviction. Large numbers of distinct browser queries exhaust memory.
- **Impact:** Build process may OOM
- **Fix:**
  ```bash
  npm install browserslist@latest
  ```

---

### DEP-005: form-data - CRLF Injection in Multipart
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `form-data` (transitive)
- **Projects:** Backend, Frontend
- **Affected Versions:** `>=4.0.0 <4.0.6`
- **Title:** form-data: CRLF injection via unescaped multipart field names
- **Detail:**
  Fails to properly escape multipart field names and filenames, allowing CRLF injection. Attackers can inject HTTP headers.
- **Impact:** HTTP response splitting, header injection
- **Fix:**
  ```bash
  npm install form-data@>=4.0.6
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - CRLF injection risk

---

### DEP-006: js-yaml - Quadratic-Complexity DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `js-yaml` (transitive)
- **Project:** Source/Backend
- **Affected Versions:** `<3.15.0`
- **Title:** JS-YAML: Quadratic-complexity DoS via repeated aliases in merge keys
- **Detail:**
  Parsing YAML with repeated aliases causes quadratic-complexity behavior, causing the parser to hang.
- **Impact:** Denial of service on YAML parsing
- **Fix:**
  ```bash
  npm install js-yaml@>=3.15.0
  ```

---

### DEP-007: vite - Path Traversal in Optimized Deps
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `vite`
- **Project:** Source/Frontend
- **Affected Versions:** `<=6.4.1`
- **Title:** Vite: Path Traversal in Optimized Deps `.map` Handling
- **Detail:**
  Source maps can be exposed through path traversal in `.vite/deps/` directory.
- **Impact:** Source code exposure via source maps
- **Fix:**
  ```bash
  npm install vite@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - Information disclosure

---

### DEP-008: ws (WebSocket) - Uninitialized Memory Disclosure
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `ws` (transitive)
- **Project:** Source/Frontend
- **Affected Versions:** `>=8.0.0 <8.20.1`
- **Title:** ws: Uninitialized memory disclosure
- **Detail:**
  WebSocket library can leak uninitialized memory in certain conditions.
- **Impact:** Information disclosure
- **Fix:**
  ```bash
  npm install ws@>=8.20.1
  ```

---

### DEP-009: nanoid - Negative Size Loop
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `nanoid` (transitive)
- **Project:** Source/Frontend
- **Affected Versions:** `<3.3.16`
- **Title:** nanoid: non-secure generators loop indefinitely with negative size
- **Detail:**
  Non-secure generators enter infinite loops with negative size parameters.
- **Impact:** Denial of service
- **Fix:**
  ```bash
  npm install nanoid@>=3.3.16
  ```

---

### DEP-010: postcss - XSS via Unescaped </style>
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `postcss` (transitive, dev dependency)
- **Project:** Source/Frontend
- **Affected Versions:** `<8.5.10`
- **Title:** PostCSS XSS via Unescaped </style> in Stringify Output
- **Detail:**
  Fails to escape `</style>` sequences in CSS output, allowing CSS injection.
- **Impact:** Cross-Site Scripting (XSS)
- **Fix:**
  ```bash
  npm install postcss@>=8.5.10
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - XSS vulnerability

---

### DEP-011: @remix-run/router - Open Redirect
- **Severity:** P2 (MODERATE→HIGH)
- **Category:** cve
- **Package:** `@remix-run/router` (transitive via react-router)
- **Project:** Source/Frontend
- **Affected Versions:** `>=1.3.0 <1.23.3`
- **Title:** React Router open redirect via protocol-relative URL reinterpretation
- **Detail:**
  Handles paths starting with `//` as protocol-relative URLs, redirecting to attacker domains.
- **Impact:** Open redirect vulnerability
- **Fix:**
  ```bash
  npm install react-router-dom@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - Open redirect

---

### DEP-012: @vitest/mocker - Path Traversal / Arbitrary File Read
- **Severity:** P2 (MODERATE→HIGH)
- **Category:** cve
- **Package:** `@vitest/mocker` (dev dependency via vitest)
- **Project:** Source/Frontend
- **Affected Versions:** `>=2.1.0 <4.1.11`
- **Title:** Vitest: Path Traversal via @vitest/mocker Redirect Mock
- **CVSS:** 5.9
- **Detail:**
  Vitest's mocking system allows path traversal, enabling arbitrary file reads on developer machines.
- **Impact:** Information disclosure on dev machines
- **Fix:**
  ```bash
  npm install vitest@>=4.2.0
  ```

---

## 🟡 Moderate & Low-Severity Vulnerabilities (P3)

### DEP-013: @babel/core - Arbitrary File Read via sourceMappingURL
- **Severity:** P3 (LOW)
- **Category:** cve
- **Package:** `@babel/core` (dev dependency, transitive)
- **Projects:** Backend, Frontend
- **Affected Versions:** `<=7.29.0`
- **Detail:** Source map handling doesn't properly validate sourceMappingURL comments
- **Fix:** `npm install @babel/core@latest`

---

### DEP-014: baseline-browser-mapping - Process Termination on Invalid Input
- **Severity:** P3 (MODERATE→DoS)
- **Category:** cve
- **Package:** `baseline-browser-mapping` (transitive)
- **Projects:** Backend, Frontend, Orchestrator
- **Affected Versions:** `>=2.0.0 <2.11.0`
- **Detail:** Crashes when given invalid input
- **Fix:** `npm install baseline-browser-mapping@>=2.11.0`

---

### DEP-015: body-parser - Denial of Service via Invalid Limit
- **Severity:** P3 (LOW)
- **Category:** cve
- **Package:** `body-parser` (transitive via express)
- **Project:** Source/Backend
- **Affected Versions:** `<1.20.6`
- **Detail:** Invalid limit value disables size enforcement
- **Fix:** `npm install body-parser@>=1.20.6`

---

### DEP-016: @protobufjs/utf8 - Overlong UTF-8 Decoding
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** `@protobufjs/utf8` (transitive via grpc)
- **Project:** platform/orchestrator
- **Affected Versions:** `<=1.1.0`
- **Detail:** Accepts non-canonical (overlong) UTF-8 encodings
- **Fix:** `npm install protobufjs@latest`

---

### DEP-017: @grpc/grpc-js - Multiple Crash Vulnerabilities
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** `@grpc/grpc-js` (transitive)
- **Project:** platform/orchestrator
- **Affected Versions:** `>=1.14.0 <1.14.4`
- **Vulnerabilities:**
  - Malformed request causes server crash (CVSS 7.5)
  - Malformed compressed message causes crash
- **Impact:** Server crash via gRPC protocol abuse
- **Fix:** `npm install @grpc/grpc-js@>=1.14.4`

---

## 🔵 Deprecated Packages (P3)

### DEP-018: glob - Deprecated with Security Vulnerabilities
- **Package:** `glob`
- **Project:** Source/Backend (dev)
- **Status:** Deprecated
- **Issue:** "Old versions have widely publicized security vulnerabilities"
- **Fix:** `npm install glob@latest`

### DEP-019: inflight - Deprecated with Memory Leak
- **Package:** `inflight`
- **Project:** Source/Backend (transitive)
- **Status:** Deprecated
- **Issue:** Memory leak, unsupported
- **Recommendation:** Replace with `lru-cache`
- **Fix:** `npm uninstall inflight && npm install lru-cache`

### DEP-020: superagent & supertest - Deprecated
- **Packages:** `superagent` (v10.2.2+), `supertest` (v7.1.3+)
- **Project:** Source/Backend (dev)
- **Status:** Deprecated
- **Fix:** `npm install superagent@latest supertest@latest`

### DEP-021: multer - Deprecated (1.x)
- **Package:** `multer`
- **Project:** platform/orchestrator
- **Status:** v1.x has vulnerabilities, upgrade to 2.x
- **Fix:** `npm install multer@2.x`

---

## Outdated Packages (1+ Major Versions Behind)

### Backend Production Dependencies
- `express`: 4.18.2 → 5.2.1 (+2 major versions)
- `pino`: 8.17.0 → 10.3.1 (+2 major versions, missing 2+ patch cycles) ⚠️
- `uuid`: 9.0.0 → 14.0.2 (+5 major versions)

### Frontend Production Dependencies
- `react`: 18.3.1 → 19.3.0 (+1 major)
- `react-dom`: 18.3.1 → 19.3.0 (+1 major)
- `react-router-dom`: 6.26.0 → 7.18.3 (+1 major)

---

## 📊 Dependency Tree Statistics

| Project | Direct Deps | Transitive Deps | CVEs |
|---------|------------|-----------------|------|
| Backend | 13 | 412 | 10 |
| Frontend | 13 | 231 | 15 |
| Orchestrator | ~10 | 156 | 8 |
| E2E Tests | ~4 | 5 | 0 |
| **Total** | **26** | **804** | **33** |

### Supply Chain Risk Indicators
- ✅ **No post-install scripts detected** (low script-based risk)
- ⚠️ **804 total transitive dependencies** (large attack surface)
- 🔴 **4 deprecated packages** (maintenance risk)
- ⚠️ **Backend: 412 packages** (oversized tree)

---

## 🎯 Immediate Actions Required (P1 - Next 24 Hours)

```bash
# 1. Update protobufjs (platform/orchestrator) - CRITICAL RCE
cd /home/runner/work/dev-crew/dev-crew/platform/orchestrator
npm install protobufjs@latest

# 2. Update handlebars in both Backend and Frontend - CRITICAL RCE
cd /home/runner/work/dev-crew/dev-crew/Source/Backend
npm install handlebars@latest

cd /home/runner/work/dev-crew/dev-crew/Source/Frontend
npm install handlebars@latest

# 3. Run full test suite to verify no regressions
npm test --workspaces --if-present
```

---

## 📋 High Priority Actions (P2 - This Week)

1. **Update all High-severity dependencies:**
   ```bash
   # Backend
   npm install brace-expansion@latest form-data@latest js-yaml@latest body-parser@latest

   # Frontend
   npm install vite@latest ws@latest nanoid@latest postcss@latest react-router-dom@latest

   # Orchestrator
   npm install @grpc/grpc-js@latest
   ```

2. **Replace deprecated packages:**
   ```bash
   # Backend
   npm install glob@latest supertest@latest superagent@latest
   npm uninstall inflight
   npm install lru-cache

   # Orchestrator
   npm install multer@2.x
   ```

3. **Verify with full test suite**
   ```bash
   npm test --workspaces --if-present
   ```

---

## 🔄 Medium Priority (This Month) - P3

1. **Update minor versions:** express, pino, react, react-router-dom
2. **Reduce dependency footprint:** Audit and remove unused dev dependencies
3. **Add to CI/CD:** `npm audit --audit-level=moderate` in pipeline

---

## License Compliance

✅ **No GPL/AGPL licenses detected** - Project is compliant with MIT/Apache-2.0 model.

---

## Cross-Team Escalation

**[ESCALATE → TheGuardians]**
- DEP-001: Handlebars RCE - template usage context verification needed
- DEP-002: protobufjs RCE - message source validation needed
- DEP-005: form-data CRLF - multipart form handling verification
- DEP-010: PostCSS XSS - CSS processing pipeline verification
- DEP-011: Open redirect - redirect validation verification
- DEP-017: gRPC DoS - gRPC server hardening verification

---

## Learnings & Follow-up

_First audit run. Critical vulnerabilities detected in production dependencies. Recommend:_
1. Establish monthly dependency update cadence
2. Add npm audit to CI/CD (fail on high/critical)
3. Reduce Backend dependency tree from 412 → target 300 packages

---

**Report Generated:** 2026-09-14  
**Audit Tool:** npm audit + lock file analysis  
**Next Audit:** After P1/P2 updates (1 week)
