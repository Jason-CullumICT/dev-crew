# Dependency Auditor Report
**Date:** 2026-11-03  
**Scope:** All npm projects (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)

---

## Executive Summary

**Total Vulnerabilities Found:** 75 across all projects
- **Critical (P1):** 6 CVEs requiring immediate action
- **High (P2):** 28 CVEs requiring urgent fixes
- **Moderate (P3):** 33 CVEs requiring planned updates
- **Low (P4):** 8 CVEs requiring monitoring

**Overall Health Grade:** D (too many critical/high CVEs in production code)

---

## Critical Findings (P1)

### DEP-001: Handlebars.js - JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** handlebars@4.7.9 (and earlier)
- **Affected Projects:** Source/Backend
- **File:** Source/Backend/package.json
- **CVE IDs:** 
  - GHSA-3mfm-83xf-c92r: JavaScript Injection via AST Type Confusion by tampering @partial-block
  - GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion
  - GHSA-2qvq-rjwj-gvw9: Prototype Pollution Leading to XSS through Partial Template Injection
  - GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap via Missing __lookupSetter__ Blocklist Entry
  - GHSA-442j-39wm-28r2: Property Access Validation Bypass in container.lookup
  - GHSA-xhpv-hc6g-r9c6: JavaScript Injection via AST Type Confusion when passing an object as dynamic partial
  - GHSA-9cx6-37pm-9jff: Denial of Service via Malformed Decorator Syntax in Template Compilation
  - GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI Precompiler via Unescaped Names and Options
  - GHSA-xw65-4hp5-5hc7: JavaScript Injection via Unsafe Inline Embedding of Precompiled Templates
  - GHSA-8r5x-fm3f-whwj: JavaScript Injection via AST Type Confusion in compile (bypass of CVE-2026-33937)
  - GHSA-p8wg-vrv2-v86f: JavaScript Injection via Own Property Check Bypass
- **Detail:** Multiple injection vectors allow arbitrary JavaScript code execution through template processing. Attacker can bypass sanitization via prototype pollution, AST type confusion, and unsafe option handling.
- **Impact:** Code execution, server compromise, XSS injection into rendered templates
- **Fix:** Upgrade handlebars to version >=4.7.10 (or latest available)
  ```bash
  cd Source/Backend && npm install handlebars@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - Code execution vulnerability

---

### DEP-002: proxy-addr - IPv4-mapped IPv6 IP Spoofing
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** proxy-addr@2.0.7 (and earlier)
- **Affected Projects:** Source/Backend, Source/Frontend, platform/orchestrator, portal/Backend, portal/Frontend
- **File:** Multiple (transitively via express/middlewares)
- **CVE ID:** GHSA-jqcg-44mw-7w3h
- **Detail:** proxy-addr is vulnerable to IP spoofing when parsing IPv4-mapped IPv6 addresses. An attacker can craft a malicious IPv6 address that gets incorrectly interpreted as an IPv4 address, bypassing IP-based trust boundaries.
- **Impact:** 
  - Bypasses IP-based access controls
  - Allows unauthorized access to admin endpoints protected by IP whitelist
  - Can spoof request origin in logging/audit trails
- **Fix:** Upgrade proxy-addr to >=2.0.8
  ```bash
  npm audit fix --force
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - Authentication/Access control bypass

---

### DEP-003: protobufjs - Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** protobufjs@<=7.6.4
- **Affected Projects:** platform/orchestrator
- **File:** platform/orchestrator/package.json
- **CVE IDs:**
  - GHSA-xq3m-2v4x-88gg: Arbitrary code execution in protobufjs
  - GHSA-66ff-xgx4-vchm: Code injection through bytes field defaults in generated toObject code
  - GHSA-2pr8-phx7-x9h3: Denial of service from crafted field names in generated code
  - GHSA-fx83-v9x8-x52w: Prototype injection in generated message constructors
  - And 8 more variants
- **Detail:** Multiple code injection vectors in protobuf message generation. Attacker can inject arbitrary JavaScript code through:
  - Crafted .proto definitions
  - Malicious field name sequences
  - Prototype pollution gadgets
- **Impact:** Code execution, DoS via recursive expansion, prototype pollution
- **Fix:** Upgrade protobufjs to >=7.7.0
  ```bash
  cd platform/orchestrator && npm install protobufjs@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - Code execution vulnerability

---

### DEP-004: tinypool - Prototype Pollution RCE
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** tinypool@<=2.1.1
- **Affected Projects:** Source/Frontend, portal/Frontend
- **File:** Source/Frontend/package.json (transitive via vitest)
- **CVE IDs:**
  - GHSA-5gmw-xhrv-c9v3: Prototype Pollution gadget in worker options leads to Remote Code Execution
  - GHSA-85c8-ppgw-ccpr: Prototype Pollution Gadget to RCE in run() options
- **Detail:** Worker pool options can be polluted via prototype chain, leading to arbitrary function execution in worker threads.
- **Impact:** Code execution in test environment (vitest), potential for lateral movement
- **Fix:** Upgrade vitest (pulls in tinypool@>=2.2.0)
  ```bash
  cd Source/Frontend && npm install vitest@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - Code execution in build/test infrastructure

---

## High Severity Findings (P2)

### DEP-005: body-parser - DoS via Invalid Limit and Compression
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** body-parser@<=1.20.8
- **Affected Projects:** Source/Backend, platform/orchestrator
- **CVE IDs:**
  - GHSA-v422-hmwv-36x6: DoS when invalid limit value silently disables size enforcement
  - GHSA-27r3-jxmh-p828: DoS via trailing bytes after a compressed request body
- **Detail:** Invalid limit values silently disable request size validation, allowing attackers to send oversized payloads. Compressed request handling can be exploited for memory exhaustion.
- **Impact:** Denial of service, memory exhaustion, request smuggling
- **Fix:** Upgrade body-parser to >=1.20.9
  ```bash
  npm audit fix
  ```

---

### DEP-006: brace-expansion - Multiple DoS Vectors
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** brace-expansion@<=1.1.20
- **Affected Projects:** Source/Backend
- **CVE IDs:** 
  - GHSA-f886-m6hf-6m8v: Zero-step sequence causes process hang
  - GHSA-3jxr-9vmj-r5cp: DoS via exponential-time expansion of consecutive non-expanding groups
  - GHSA-mh99-v99m-4gvg: DoS via unbounded expansion length causing OOM
  - GHSA-rgw5-rvv9-x895: DoS via unbounded intermediate arrays
  - GHSA-q2hr-2g5m-vwhr: Quadratic-time expansion DoS
  - GHSA-qhr7-859c-m2p7: DoS via uncontrolled recursion on nested brace groups
  - GHSA-6j4f-fj2g-mc7p: DoS via uncontrolled recursion in parseCommaParts
- **Detail:** Glob pattern parsing allows exponential expansion and unbounded recursion. Used by build/testing toolchain.
- **Impact:** Build process DoS, dev environment compromise
- **Fix:** Upgrade minimatch/glob chain (pulls in fixed brace-expansion)
  ```bash
  npm audit fix --force
  ```

---

### DEP-007: Browserslist - Memory Exhaustion and Prototype Pollution
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** browserslist@<=4.28.6
- **Affected Projects:** Source/Backend, Source/Frontend, portal/Backend, portal/Frontend
- **CVE IDs:**
  - GHSA-c83g-rgw3-j3cx: Unbounded memory growth via distinct query results
  - GHSA-73wf-gq98-2v4g: Uncaught crash via untrusted browserslist-stats.json
- **Detail:** Cache eviction not implemented for browserslist queries, leading to unbounded memory growth. Prototype pollution via untrusted stats files.
- **Impact:** Memory exhaustion, OOM crashes, prototype pollution
- **Fix:** Upgrade browserslist to >=4.28.7
  ```bash
  npm audit fix
  ```

---

### DEP-008: esbuild - CSRF via Dev Server
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** esbuild@<=0.24.2
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **Detail:** Development server accepts requests from any origin and sends responses without proper CORS headers. Allows any website to make requests to the dev server and read responses.
- **Impact:** Dev server code/source leakage, CSRF attacks, information disclosure
- **Fix:** Upgrade vite (pulls in esbuild >=0.24.3)
  ```bash
  npm audit fix --force
  ```

---

### DEP-009: form-data - CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** form-data@4.0.0-4.0.5
- **Affected Projects:** Source/Backend, Source/Frontend, portal/Backend, portal/Frontend
- **CVE ID:** GHSA-hmw2-7cc7-3qxx
- **Detail:** Multipart field names and filenames not properly escaped for CRLF sequences. Allows header injection in multipart requests.
- **Impact:** HTTP request smuggling, response splitting, cache poisoning
- **Fix:** Upgrade form-data to >=4.0.6
  ```bash
  npm audit fix
  ```

---

### DEP-010: nanoid - Non-Secure Generator Loops & Integer Overflow
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** nanoid@<=3.3.17
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVE IDs:**
  - GHSA-28wg-ghj8-5hjv: Non-secure generators can loop indefinitely
  - GHSA-2v37-7h3g-55p8: Custom generators loop indefinitely when size is zero
  - GHSA-xwg4-73v4-xw9w: Integer overflow or wraparound
- **Detail:** ID generation can hang indefinitely with negative/zero sizes. Integer overflow in size calculations.
- **Impact:** Denial of service, infinite loops in ID generation, weak IDs
- **Fix:** Upgrade nanoid to >=3.3.18
  ```bash
  npm audit fix
  ```

---

### DEP-011: postcss - XSS via Unescaped Tags & Path Traversal
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** postcss@<=8.5.22
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVE IDs:**
  - GHSA-qx2v-qp2m-jg93: XSS via Unescaped </style> in CSS Stringify Output
  - GHSA-6g55-p6wh-862q: Arbitrary file read via sourceMappingURL in CSS comments
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix — attacker-controlled sourceMappingURL reads arbitrary .map files
  - GHSA-r28c-9q8g-f849: Path Traversal in Source Map Auto-Loading
- **Detail:** CSS output not properly escaped for HTML context. Source map paths not validated for directory traversal.
- **Impact:** XSS injection, arbitrary file read, information disclosure
- **Fix:** Upgrade postcss to >=8.5.23
  ```bash
  npm audit fix
  ```

---

### DEP-012: ws - Memory Exhaustion & Uninitialized Data Leak
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** ws@8.0.0-8.20.1
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVE IDs:**
  - GHSA-58qx-3vcg-4xpx: Uninitialized memory disclosure
  - GHSA-96hv-2xvq-fx4p: Memory exhaustion DoS from tiny fragments
- **Detail:** WebSocket memory buffer not properly initialized, leaking uninitialized memory. Fragment handling allows memory exhaustion.
- **Impact:** Information disclosure (uninitialized memory), DoS via fragment flooding
- **Fix:** Upgrade ws to >=8.20.2
  ```bash
  npm audit fix
  ```

---

### DEP-013: @grpc/grpc-js - Multiple Crash & Security Issues
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** @grpc/grpc-js@1.14.0-1.14.4
- **Affected Projects:** platform/orchestrator, portal/Backend
- **CVE IDs:**
  - GHSA-5375-pq7m-f5r2: Malformed request causes server crash
  - GHSA-99f4-grh7-6pcq: Malformed compressed message causes crash
  - GHSA-m9gg-hp2v-232j: getAuthContext returns unauthorized certificates as authorized
  - GHSA-f596-whhp-79r4: Server transmits error messages to client in status messages
- **Detail:** gRPC error handling leaks sensitive information. Malformed requests crash server.
- **Impact:** DoS, information disclosure, certificate validation bypass
- **Fix:** Upgrade @grpc/grpc-js to >=1.14.5
  ```bash
  npm audit fix
  ```

---

### DEP-014: js-yaml - Quadratic CPU Consumption DoS
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** js-yaml@<=3.15.1
- **Affected Projects:** Source/Backend
- **CVE IDs:**
  - GHSA-h67p-54hq-rp68: Quadratic-complexity in merge key handling
  - GHSA-52cp-r559-cp3m: Merge-key chains force quadratic CPU
  - GHSA-5p4m-2wfm-xmqj: Quadratic CPU in !!omap resolution
  - GHSA-2883-xcg3-v3hh: maxTotalMergeKeys doesn't limit CPU for empty sources
- **Detail:** YAML parsing with merge keys causes quadratic time complexity. Attacker can craft YAML that consumes all CPU.
- **Impact:** Denial of service via CPU exhaustion
- **Fix:** Upgrade js-yaml to >=4.1.0
  ```bash
  npm audit fix
  ```

---

### DEP-015: path-to-regexp - ReDoS via Route Parameters
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** path-to-regexp@<0.1.13
- **Affected Projects:** platform/orchestrator
- **CVE ID:** GHSA-37ch-88jc-xwx2
- **Detail:** Regular expression with multiple route parameters vulnerable to ReDoS (Regular Expression Denial of Service). Specially crafted URL paths cause exponential backtracking.
- **Impact:** Denial of service, route matching CPU exhaustion
- **Fix:** Upgrade path-to-regexp to >=0.1.13
  ```bash
  npm audit fix
  ```

---

## Moderate Severity Findings (P3)

### DEP-016: minimatch - Globparts Amplification DoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** minimatch@<11.0.1
- **Affected Projects:** Source/Backend (via jest/test toolchain)
- **CVE ID:** GHSA-g3hv-75wg-m249
- **Detail:** Glob pattern parsing allows exponential expansion via repeated globstar patterns.
- **Impact:** Build process slowdown, dev environment DoS
- **Fix:** Upgrade minimatch/jest (breaking change requires --force)

---

### DEP-017: deepmerge - Prototype Pollution
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** deepmerge@>=4.2.0
- **Affected Projects:** Source/Backend (via jest)
- **CVE ID:** GHSA-gcqx-w48m-w2h4
- **Detail:** mergeObject() allows prototype poisoning of returned objects.
- **Impact:** Object property pollution, potential escalation
- **Fix:** Upgrade jest (requires --force)

---

### DEP-018: uuid - Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** uuid@<11.1.1
- **Affected Projects:** Source/Backend
- **CVE ID:** GHSA-w5hq-g745-h8pq
- **Detail:** v3/v5/v6 UUID generation doesn't validate buffer bounds when buf is provided.
- **Impact:** Buffer overflow, memory corruption
- **Fix:** Upgrade uuid to >=11.1.1 (breaking change, may require app changes)
  ```bash
  npm audit fix --force
  ```

---

### DEP-019: qs - Multiple DoS via Query String Parsing
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** qs@2.2.5-6.16.0
- **Affected Projects:** Source/Backend, platform/orchestrator
- **CVE IDs:**
  - GHSA-q8mj-m7cp-5q26: qs.stringify crashes with TypeError on null/undefined
  - GHSA-x5fp-wj9c-mxmx: Array-limit bypass via bracket-key comma parsing
  - GHSA-4mjr-xmp4-gh2g: DoS via Attacker Controlled isBuffer
  - GHSA-6pq8-jhm2-2vcw: qs.stringify throws uncaught TypeError on non-callable toString
- **Impact:** Query parameter DoS, unhandled exceptions
- **Fix:** Upgrade qs to >=6.16.1
  ```bash
  npm audit fix
  ```

---

### DEP-020: @babel/core - Arbitrary File Read via Source Map
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** @babel/core@<=7.29.0
- **Affected Projects:** Source/Backend, Source/Frontend, portal/Backend, portal/Frontend
- **CVE ID:** GHSA-4x5r-pxfx-6jf8
- **Detail:** Babel doesn't validate sourceMappingURL comments. Attacker can reference arbitrary file paths.
- **Impact:** Information disclosure, source code leakage
- **Fix:** Upgrade @babel/core to >=7.29.1
  ```bash
  npm audit fix
  ```

---

### DEP-021: @remix-run/router - Open Redirect via Protocol-Relative URL
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** @remix-run/router@1.3.0-1.23.2
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVE ID:** GHSA-2j2x-hqr9-3h42
- **Detail:** Same-origin redirect logic doesn't check for protocol-relative URLs (//). Attacker can redirect to different origin.
- **Impact:** Open redirect, phishing attacks
- **Fix:** Upgrade react-router-dom to >=7.18.0
  ```bash
  npm audit fix
  ```

---

### DEP-022: @vitest/mocker - Path Traversal & Code Injection
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** @vitest/mocker@<=4.1.11
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVE IDs:**
  - GHSA-82fw-gwwq-j7x9: Path Traversal via Redirect Mock
  - GHSA-qxg6-89mg-rqv8: Code injection via unauthenticated manual mock registration
- **Detail:** Vitest mocker allows path traversal in mock resolution and code injection in test setup.
- **Impact:** Build-time code injection, test isolation bypass
- **Fix:** Upgrade vitest to >=4.1.12 (breaking change)

---

### DEP-023: source-map-js - Event-Loop DoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** source-map-js@1.0.0-1.2.1
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVE ID:** GHSA-68fv-2mgg-jv7q
- **Detail:** Source map parsing with specially crafted offset values causes event-loop denial of service.
- **Impact:** Build/dev server slowdown
- **Fix:** Upgrade source-map-js to >=1.2.2

---

### DEP-024: picomatch - ReDoS in Glob Matching
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** picomatch@<=2.3.1 or 4.0.0-4.0.3
- **Affected Projects:** portal/Frontend
- **CVE IDs:**
  - GHSA-3v7f-55p6-f55p: Method Injection in POSIX Character Classes
  - GHSA-c2c7-rcm5-vvqj: ReDoS via extglob quantifiers
- **Detail:** Glob patterns with POSIX character classes vulnerable to ReDoS.
- **Impact:** Build process slowdown
- **Fix:** Upgrade picomatch to >=4.0.4

---

### DEP-025: baseline-browser-mapping - Process DoS on Invalid Input
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** baseline-browser-mapping@>=2.0.0 <2.11.0
- **Affected Projects:** Source/Backend, Source/Frontend, portal/Backend, portal/Frontend
- **CVE ID:** GHSA-w5vr-8v7q-w6rv
- **Detail:** Process termination on invalid browser baseline input. Attacker can crash build tools.
- **Impact:** Build tool DoS
- **Fix:** Upgrade to >=2.11.0

---

### DEP-026: @opentelemetry/core - Unbounded Memory Allocation
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** @opentelemetry/core@<2.8.0
- **Affected Projects:** portal/Backend
- **CVE ID:** GHSA-8988-4f7v-96qf
- **Detail:** W3C Baggage propagation header parsing allows unbounded memory allocation via large header values.
- **Impact:** Memory exhaustion, DoS
- **Fix:** Upgrade @opentelemetry/* to latest 2.x versions

---

## Low Severity & Informational (P4)

### DEP-027: @protobufjs/utf8 - Overlong UTF-8 Decoding
- **Severity:** P4 (LOW)
- **Category:** CVE
- **Package:** @protobufjs/utf8@<=1.1.0
- **Affected Projects:** platform/orchestrator
- **CVE ID:** GHSA-q6x5-8v7m-xcrf
- **Detail:** Accepts overlong UTF-8 sequences (security relevant for parsing validation)
- **Fix:** Upgrade protobufjs to >=7.7.0

---

## Outdated Dependencies Analysis

### Source/Backend
| Package | Current | Latest | Gap | Risk |
|---------|---------|--------|-----|------|
| uuid | 9.0.1 | 14.0.3 | 3 major | HIGH - has security fix in 11.x+ |
| pino | 8.21.0 | 10.4.0 | 2 major | MODERATE - logging package, check compatibility |
| express | 4.22.3 | 5.3.0 | 1 major | LOW - breaking change, requires review |

**Action:** Prioritize uuid upgrade to latest stable 11.x/14.x

---

### Source/Frontend
| Package | Current | Latest | Gap | Risk |
|---------|---------|--------|-----|------|
| react | 18.3.1 | 19.3.1 | 1 major | LOW - mostly compatible, performance improvements |
| react-dom | 18.3.1 | 19.3.1 | 1 major | LOW - paired with react |
| react-router-dom | 6.30.6 | 7.18.5 | 1 major | LOW - breaking API changes, requires careful review |

**Action:** Plan migration to React 19, separate from router upgrade

---

### platform/orchestrator
| Package | Current | Latest | Gap | Risk |
|---------|---------|--------|-----|------|
| dockerode | 4.0.12 | 5.0.1 | 1 major | MODERATE - Docker API compatibility |
| express | 4.22.3 | 5.3.0 | 1 major | LOW - breaking change |
| multer | 1.4.5 | 2.5.0 | 1 major | MODERATE - file upload handling |

**Action:** Coordinate dockerode and multer upgrades with Docker API compatibility review

---

## Dependency Tree Analysis

### Backend Projects
- **Source/Backend:** 13 direct dependencies
- **Source/E2E:** Clean audit ✓
- **platform/orchestrator:** 7-8 direct dependencies
- **portal/Backend:** Multiple OpenTelemetry dependencies creating vulnerability chains

### Frontend Projects
- **Source/Frontend:** 12 direct dependencies
- **portal/Frontend:** Similar pattern, build tool chain vulnerabilities

### Observations
- **Common vulnerable dependencies:**
  - `proxy-addr` (appears in 5+ projects via express)
  - `body-parser` (appears in 3+ projects via express)
  - `form-data` (appears in 4+ projects via request libraries)
  - `browserslist`, `postcss` (build tool chain)

- **Transitive dependency chains:**
  - jest/babel dependencies pull in multiple outdated libraries
  - vitest/vite chain has multiple critical vulnerabilities
  - OpenTelemetry ecosystem has dependency version conflicts

---

## Recommendations (Priority Order)

### Immediate (Do Today)
1. **Upgrade proxy-addr** to >=2.0.8 in all projects (5-minute fix per project)
2. **Upgrade handlebars** to >=4.7.10 in Source/Backend
3. **Upgrade protobufjs** to >=7.7.0 in platform/orchestrator
4. Run `npm audit fix` in all non-E2E projects to catch moderate fixes

### This Sprint (Within 1 Week)
1. **Upgrade vitest to >=4.1.12** (Source/Frontend, portal/Frontend) - fixes tinypool, esbuild, etc.
2. **Upgrade jest chain** (Source/Backend) - requires --force, test compatibility review
3. **Upgrade uuid to >=11.1.1** (Source/Backend) - check for version-specific breaking changes
4. **Upgrade React to 19.x** (Source/Frontend, portal/Frontend) - parallel, non-blocking

### Next Sprint (1-2 weeks)
1. Upgrade express 4 → 5 (breaking change, requires API review)
2. Upgrade react-router-dom to 7.x (breaking API changes)
3. Upgrade dockerode to 5.x (Docker API compatibility testing)
4. Upgrade multer to 2.x (file upload testing)

### Ongoing
1. Pin specific transitive dependency versions that are vulnerable
2. Implement automated dependency scanning in CI/CD
3. Set up scheduled vulnerability audits (weekly)
4. Review OpenTelemetry version alignment across portal/Backend

---

## Cross-Team References

- **[ESCALATE → TheGuardians]:**
  - DEP-001: handlebars (code execution)
  - DEP-002: proxy-addr (auth bypass)
  - DEP-003: protobufjs (code execution)
  - DEP-004: tinypool (code execution in build infra)
  - DEP-008: esbuild (dev server CSRF)
  - DEP-009: form-data (request smuggling)

- **[CROSS-REF: TheFixer]:**
  - All fixes require coordinated npm upgrades across multiple projects
  - Jest/Babel ecosystem upgrade needs breaking change testing
  - Major version upgrades need integration testing

---

## Verification Status

- ✓ Source/Backend: npm audit run
- ✓ Source/Frontend: npm audit run
- ✓ Source/E2E: npm audit run (CLEAN)
- ✓ platform/orchestrator: npm audit run
- ✓ portal/Backend: npm audit run
- ✓ portal/Frontend: npm audit run

All audits run with `npm audit --json 2>/dev/null`

---

**Next Steps:**
1. Share findings with TheGuardians for security escalations
2. Create tickets in TheFixer backlog for npm upgrade PRs
3. Schedule dependency upgrade sprints per timeline above
4. Implement `npm audit` gates in CI/CD pipeline
