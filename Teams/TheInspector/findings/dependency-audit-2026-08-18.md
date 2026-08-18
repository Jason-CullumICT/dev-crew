# Dependency Auditor Report
**Date:** 2026-08-18  
**Audit Scope:** npm packages across dev-crew project  
**Status:** 31 Vulnerabilities Found

---

## Executive Summary

Scanned **4 npm-based projects** with **~800 total dependencies** (production + development):
- **Source/Backend**: 412 dependencies, 9 vulnerabilities
- **Source/Frontend**: 231 dependencies, 13 vulnerabilities  
- **Source/E2E**: 4 dependencies, 0 vulnerabilities (clean)
- **platform/orchestrator**: 153 dependencies, 9 vulnerabilities

**Critical Finding:** 3 P1 (critical) vulnerabilities in production code paths.

---

## Critical Issues (P1)

### DEP-001: Handlebars.js JavaScript Injection
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (CWE-94, CWE-843)
- **Package:** `handlebars@4.0.0-4.7.8`
- **File:** Source/Backend/package-lock.json
- **Vulnerability:** GHSA-2w6w-674q-4c4q
- **Title:** Handlebars.js has JavaScript Injection via AST Type Confusion
- **CVSS Score:** 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Detail:** Template injection allows arbitrary code execution via malformed AST nodes. The vulnerability affects all versions from 4.0.0 to 4.7.8. An attacker can craft a template that bypasses safety checks and executes arbitrary JavaScript.
- **Impact:** CRITICAL - Remote Code Execution possible if user-supplied templates are compiled
- **Fix:** `npm update handlebars` to >=4.7.9
- **Cross-ref:** [ESCALATE → TheGuardians] — if handlebars processes untrusted templates, this is a critical injection vector

---

### DEP-002: Vitest UI Server Arbitrary File Read
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (CWE-22, CWE-862)
- **Package:** `vitest@<=3.2.5`
- **File:** Source/Frontend/package-lock.json
- **Vulnerability:** GHSA-5xrq-8626-4rwp
- **Title:** When Vitest UI server is listening, arbitrary file can be read and executed
- **CVSS Score:** 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Detail:** The Vitest UI server (accessible via `--ui` flag) does not validate incoming requests, allowing attackers on the same network to read arbitrary files and execute code. This is especially dangerous in CI/CD pipelines or shared dev environments.
- **Impact:** CRITICAL - Full filesystem disclosure + code execution if UI server is running during test phase
- **Fix:** `npm update vitest` to >=3.2.6
- **Recommendation:** Do NOT run vitest UI server in CI pipelines or on non-isolated networks. Consider disabling UI server in production/CI builds.
- **Cross-ref:** [ESCALATE → TheGuardians] — if vitest UI is exposed on CI runners, credential files (.env, SSH keys) are at risk

---

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (CWE-94)
- **Package:** `protobufjs@<=7.6.4`
- **File:** platform/orchestrator/package-lock.json
- **Vulnerability:** GHSA-xq3m-2v4x-88gg (+ 9 additional protobufjs CVEs)
- **Title:** Arbitrary code execution in protobufjs
- **CVSS Score:** 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Detail:** Multiple code-generation gadgets in protobufjs allow crafted `.proto` files or JSON schemas to execute arbitrary code during parsing/compilation. Affects all versions <=7.6.4. The orchestrator parses gRPC/protobuf definitions as part of its runtime.
- **Additional CVEs in same package:**
  - GHSA-66ff-xgx4-vchm: Code injection via bytes field defaults
  - GHSA-75px-5xx7-5xc7: Code generation gadget after prototype pollution
  - GHSA-jvwf-75h9-cwgg: Process-wide DoS through unsafe option paths
  - GHSA-685m-2w69-288q: DoS through unbounded protobuf recursion
  - GHSA-wcpc-wj8m-hjx6: DoS via unbounded Any expansion
- **Impact:** CRITICAL - If orchestrator processes untrusted `.proto` definitions or external gRPC services, arbitrary code execution is possible
- **Fix:** `npm update protobufjs` to >=7.7.0 (or latest)
- **Recommendation:** Validate/sandbox all `.proto` file sources. If orchestrator pulls proto definitions from external services, implement strict schema validation.
- **Cross-ref:** [ESCALATE → TheGuardians] — multi-vector injection point; audit how orchestrator consumes protobuf definitions

---

## High Severity Issues (P2)

### DEP-004: brace-expansion DoS via exponential expansion (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-400, CWE-770, CWE-407)
- **Package:** `brace-expansion@<=1.1.17`
- **File:** Source/Backend/package-lock.json
- **Vulnerabilities:** 
  - GHSA-3jxr-9vmj-r5cp: DoS via exponential-time expansion of consecutive {} groups (CVSS 5.3)
  - GHSA-mh99-v99m-4gvg: DoS via unbounded expansion length causing OOM (CVSS 7.5)
  - GHSA-rgw5-rvv9-x895: DoS via unbounded intermediate arrays, bypassing prior fix (CVSS 7.5)
- **Detail:** The brace-expansion library has multiple DoS vectors that cause memory exhaustion or CPU hangs. Affected by all 4 known CVEs for this package. An attacker can craft glob patterns that consume all available memory.
- **Impact:** Denial of Service - Backend process crash during file operations or glob expansion
- **Fix:** `npm update brace-expansion` to >=1.1.18
- **Recommendation:** Review any user-supplied glob patterns in the application; consider sanitization or limits

---

### DEP-005: Form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-93)
- **Package:** `form-data@4.0.0-4.0.5`
- **Files:** Source/Backend, Source/Frontend, platform/orchestrator
- **Vulnerability:** GHSA-hmw2-7cc7-3qxx
- **Title:** form-data: CRLF injection in form-data via unescaped multipart field names and filenames
- **CVSS Score:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N)
- **Detail:** Multipart form field names and filenames are not properly escaped, allowing CRLF injection. An attacker can inject custom headers into multipart requests, potentially bypassing security controls.
- **Impact:** Header injection, request smuggling if form data is relayed to other services
- **Fix:** `npm update form-data` to >=4.0.6
- **Recommendation:** If form-data is used to relay uploads to external services, test with malicious filenames

---

### DEP-006: js-yaml Quadratic CPU DoS (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-407, CWE-400)
- **Package:** `js-yaml@<=3.15.0`
- **File:** Source/Backend/package-lock.json
- **Vulnerabilities:**
  - GHSA-52cp-r559-cp3m: YAML merge-key chains cause quadratic CPU consumption (CVSS 7.5)
  - GHSA-5p4m-2wfm-xmqj: Quadratic CPU in !!omap resolution (CVSS 7.5)
- **Detail:** Malformed YAML input with repeated merge keys or complex omap structures causes O(n²) CPU consumption, leading to process hang or DoS.
- **Impact:** Denial of Service when parsing untrusted YAML (e.g., config files, API payloads)
- **Fix:** `npm update js-yaml` to >=3.15.1

---

### DEP-007: React Router Open Redirect (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-601)
- **Package:** `react-router-dom@6.0.0-7.17.0`
- **File:** Source/Frontend/package-lock.json
- **Vulnerabilities:**
  - GHSA-2j2x-hqr9-3h42: Same-origin redirect with path starting // causes open redirect (CVSS 0 but confirmed exploitable)
  - GHSA-jjmj-jmhj-qwj2: Open redirect leading to XSS (CVSS 6.9)
  - GHSA-wrjc-x8rr-h8h6: Open redirect via backslash in <Link> component
- **Detail:** Navigation components can be tricked into redirecting to arbitrary external URLs via protocol-relative paths (//) or backslash escapes. This enables phishing attacks and XSS.
- **Impact:** Open Redirect vulnerabilities allow attackers to craft malicious links that redirect users to phishing sites
- **Fix:** `npm update react-router-dom` to >=7.18.0
- **Recommendation:** Never use user-supplied URLs directly in <Link to={}> — sanitize or whitelist destinations

---

### DEP-008: Vite Server.fs.deny Bypass (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-22, CWE-200)
- **Package:** `vite@<=6.4.2`
- **File:** Source/Frontend/package-lock.json
- **Vulnerabilities:**
  - GHSA-fx2h-pf6j-xcff: server.fs.deny bypass on Windows alternate paths (CVSS 7.5)
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure via UNC path handling (CVSS moderate)
  - GHSA-4w7w-66w2-5vf9: Path traversal in optimized deps .map handling
- **Detail:** Vite's filesystem security (server.fs.deny) can be bypassed using Windows alternate path representations (e.g., `\\?\` UNC paths), allowing access to sensitive files outside the allowed directory. Also leaks NTLMv2 hashes on Windows.
- **Impact:** Information disclosure — read arbitrary files via dev server, hash disclosure for NTLM cracking
- **Fix:** `npm update vite` to >=8.2.1
- **Recommendation:** Do not run Vite dev server on untrusted networks. Windows users should upgrade immediately.

---

### DEP-009: PostCSS Source Map File Read (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-22, CWE-200)
- **Package:** `postcss@<=8.5.22`
- **File:** Source/Frontend/package-lock.json
- **Vulnerabilities:**
  - GHSA-6g55-p6wh-862q: Arbitrary file read via attacker-controlled sourceMappingURL (CVSS 7.5)
  - GHSA-r28c-9q8g-f849: Path traversal in source map auto-loading (CVSS 7.5)
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix allowing .map disclosure when `from` is unset
- **Detail:** CSS comments containing `sourceMappingURL` directives allow reading arbitrary files from the server filesystem. An attacker can craft CSS that references `../../etc/passwd.map` or other sensitive files.
- **Impact:** Information disclosure — leak source code, configuration, or other files during dev server/build phase
- **Fix:** `npm update postcss` to >=8.5.23
- **Recommendation:** Sanitize CSS input if user-supplied; consider disabling source map generation in production

---

### DEP-010: Nanoid Infinite Loop DoS (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-835)
- **Package:** `nanoid@<=3.3.17`
- **File:** Source/Frontend/package-lock.json
- **Vulnerabilities:**
  - GHSA-28wg-ghj8-5hjv: Non-secure generators loop indefinitely with negative size (CVSS 5.9)
  - GHSA-2v37-7h3g-55p8: Custom generators loop indefinitely when size is zero (CVSS 5.9)
- **Detail:** nanoid can enter infinite loops if generated with zero or negative size parameters, causing CPU exhaustion and process hang.
- **Impact:** Denial of Service if ID generation is triggered by untrusted input
- **Fix:** `npm update nanoid` to >=3.3.18

---

### DEP-011: WebSocket Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-400, CWE-770)
- **Package:** `ws@8.0.0-8.20.1`
- **File:** Source/Frontend/package-lock.json
- **Vulnerability:** GHSA-96hv-2xvq-fx4p
- **Title:** ws: Memory exhaustion DoS from tiny fragments and data chunks
- **CVSS Score:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Detail:** The WebSocket library can be abused to cause memory exhaustion by sending many tiny fragmented messages. An attacker on the network can send thousands of small WebSocket frames to exhaust the server's memory.
- **Impact:** Denial of Service — process crash due to memory exhaustion
- **Fix:** `npm update ws` to >=8.21.0

---

### DEP-012: gRPC.js Malformed Request Crash
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-248, CWE-400)
- **Package:** `@grpc/grpc-js@1.14.0-1.14.3`
- **File:** platform/orchestrator/package-lock.json
- **Vulnerabilities:**
  - GHSA-5375-pq7m-f5r2: Malformed request causes server crash (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq: Incoming malformed compressed message causes crash (CVSS 7.5)
- **Detail:** The gRPC library crashes when receiving malformed or compressed messages. An unauthenticated attacker can send crafted gRPC requests to crash the orchestrator.
- **Impact:** Denial of Service — orchestrator crash, pipeline failures
- **Fix:** `npm update @grpc/grpc-js` to >=1.14.4

---

### DEP-013: Path-to-regexp ReDoS via Multiple Parameters
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-1333)
- **Package:** `path-to-regexp@<0.1.13`
- **File:** platform/orchestrator/package-lock.json
- **Vulnerability:** GHSA-37ch-88jc-xwx2
- **Title:** path-to-regexp vulnerable to Regular Expression Denial of Service
- **CVSS Score:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Detail:** Route pattern matching with multiple parameters can trigger ReDoS (regular expression denial of service), causing CPU exhaustion when processing certain URL paths.
- **Impact:** Denial of Service — slow routing, process hang under specific request patterns
- **Fix:** `npm update path-to-regexp` to >=0.1.13

---

## Moderate Severity Issues (P3)

### DEP-014: qs Remote DoS via Null/Undefined Handling
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-476)
- **Package:** `qs@6.11.1-6.15.1`
- **Files:** Source/Backend, platform/orchestrator (via express)
- **Vulnerability:** GHSA-q8mj-m7cp-5q26
- **Title:** qs has a remotely triggerable DoS
- **CVSS Score:** 5.3
- **Detail:** `qs.stringify()` crashes with TypeError when processing null/undefined values in comma-format arrays with `encodeValuesOnly` flag set.
- **Impact:** Denial of Service if untrusted query parameters are processed
- **Fix:** `npm update qs` to >=6.15.2

---

### DEP-015: body-parser DoS via Invalid Limit
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-770)
- **Package:** `body-parser@<=1.20.5 || 2.0.0-beta.1-2.0.2`
- **Files:** Source/Backend, platform/orchestrator (via express)
- **Vulnerability:** GHSA-v422-hmwv-36x6
- **Title:** body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement
- **CVSS Score:** 3.7
- **Detail:** An invalid `limit` configuration value (e.g., negative number, non-numeric string) silently disables payload size checking, allowing unbounded uploads.
- **Impact:** Denial of Service via large request payloads
- **Fix:** `npm update body-parser` to >=1.20.6

---

### DEP-016: UUID Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-787, CWE-1285)
- **Package:** `uuid@<11.1.1`
- **Files:** Source/Backend, platform/orchestrator
- **Vulnerability:** GHSA-w5hq-g745-h8pq
- **Title:** uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided
- **CVSS Score:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N)
- **Detail:** When providing a pre-allocated buffer to uuid v3/v5/v6 functions, the library doesn't validate buffer size, leading to buffer overflow and memory corruption.
- **Impact:** Memory corruption, potential code execution if buffer overflows into controlled memory
- **Fix:** `npm update uuid` to >=11.1.1 (or later)
- **Note:** This requires major version bump (currently ^9.0.0 in Backend); evaluate compatibility before upgrading

---

### DEP-017: @babel/core Source Map File Read
- **Severity:** P3 (LOW to MODERATE)
- **Category:** CVE (CWE-22, CWE-200)
- **Package:** `@babel/core@<=7.29.0`
- **Files:** Source/Backend, Source/Frontend (indirect)
- **Vulnerability:** GHSA-4x5r-pxfx-6jf8
- **Title:** @babel/core: Arbitrary File Read via sourceMappingURL Comment
- **CVSS Score:** 3.2
- **Detail:** Babel doesn't validate sourceMappingURL references in JavaScript comments, allowing read of arbitrary `.map` files from the filesystem during transpilation.
- **Impact:** Information disclosure — leak transpiled source maps or related files
- **Fix:** `npm update @babel/core` to >=7.30.0

---

### DEP-018-025: Additional Moderate CVEs in Vite/Vitest stack
- **Severity:** P3 (MODERATE)
- **Category:** CVEs in development dependencies
- **Package:** `esbuild`, `@vitest/mocker`, `vite-node` (transitive chain)
- **File:** Source/Frontend/package-lock.json
- **Detail:** Multiple moderate CVEs in the Vite/Vitest build toolchain (esbuild CORS issue, vite-node transitive path traversal, etc.)
- **Impact:** Low — these affect dev environment only, not production deployments
- **Fix:** `npm update vite` and `vitest` to latest versions

---

### DEP-026: React Router Constructor Injection
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-470)
- **Package:** `react-router@6.4.0-7.17.0`
- **File:** Source/Frontend/package-lock.json
- **Vulnerability:** GHSA-337j-9hxr-rhxg
- **Title:** React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration
- **CVSS Score:** 6.1
- **Detail:** During server-side rendering hydration, deserialized error objects can instantiate arbitrary constructors, leading to injection attacks.
- **Impact:** XSS or SSRF if error objects are user-controlled in SSR context
- **Fix:** `npm update react-router-dom` to >=7.18.0
- **Note:** Only affects SSR deployments; CSR-only apps are unaffected

---

### DEP-027: @remix-run/router Open Redirect
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-601)
- **Package:** `@remix-run/router@1.3.0-1.23.2`
- **File:** Source/Frontend/package-lock.json
- **Vulnerability:** GHSA-2j2x-hqr9-3h42
- **Title:** React Router's same-origin redirect with path starting // causes open redirect
- **CVSS Score:** 0 (unscored but confirmed exploitable)
- **Detail:** Redirect logic fails to handle protocol-relative URLs (//), allowing open redirect attacks
- **Impact:** Open redirect phishing attacks
- **Fix:** `npm update @remix-run/router` via `npm update react-router-dom`

---

### DEP-028: @protobufjs/utf8 Overlong Encoding
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-176)
- **Package:** `@protobufjs/utf8@<=1.1.0`
- **File:** platform/orchestrator/package-lock.json (via protobufjs)
- **Vulnerability:** GHSA-q6x5-8v7m-xcrf
- **Title:** protobufjs has overlong UTF-8 decoding
- **CVSS Score:** 5.3
- **Detail:** UTF-8 decoding accepts overlong byte sequences that should be rejected, potentially allowing encoding-based bypasses or data corruption.
- **Impact:** Unicode normalization bypass, potential injection vector
- **Fix:** Upgrade protobufjs to >=7.7.0

---

### DEP-029: Dockerode UUID Transitive
- **Severity:** P3 (MODERATE)
- **Category:** Transitive CVE
- **Package:** `dockerode@4.0.3-4.0.12`
- **File:** platform/orchestrator/package-lock.json
- **Vulnerability:** GHSA-w5hq-g745-h8pq (via uuid)
- **Detail:** Dockerode depends on vulnerable uuid version
- **Fix:** `npm update dockerode` to >=5.0.1 (requires major version bump)

---

### DEP-030: PostCSS XSS via CSS Stringify
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-79)
- **Package:** `postcss@<8.5.10`
- **File:** Source/Frontend/package-lock.json
- **Vulnerability:** GHSA-qx2v-qp2m-jg93
- **Title:** PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
- **CVSS Score:** 6.1
- **Detail:** CSS output doesn't escape closing </style> tags, allowing XSS injection if CSS is embedded in HTML.
- **Impact:** XSS if user-controlled CSS is compiled and embedded in HTML responses
- **Fix:** `npm update postcss` to >=8.5.10

---

## Outdated Packages (No Known CVEs, but 1+ major versions behind)

### DEP-031-035: Express (3 major versions behind)
- **Severity:** P3 (MAINTENANCE)
- **Package:** `express@^4.18.2` (current: 4.x, latest: 5.2.1)
- **Files:** Source/Backend, platform/orchestrator
- **Detail:** Express 5.x introduces breaking changes including:
  - Removal of some deprecated middleware
  - Updated error handling
  - Improved performance
- **Recommendation:** Plan migration to Express 5.x; evaluate breaking changes in your codebase
- **Fix:** `npm update express` (may require code changes)

---

### DEP-036: Pino (2 major versions behind)
- **Severity:** P3 (MAINTENANCE)
- **Package:** `pino@^8.17.0` (current: 8.x, latest: 10.3.1)
- **File:** Source/Backend/package-lock.json
- **Detail:** Pino 10.x offers performance improvements and API refinements
- **Recommendation:** Test compatibility; consider upgrading to 10.x
- **Fix:** `npm update pino` (may require API adjustments)

---

### DEP-037: UUID (5 major versions behind)
- **Severity:** P3 (MAINTENANCE + SECURITY)
- **Package:** `uuid@^9.0.0` (current: 9.x, latest: 14.0.1)
- **Files:** Source/Backend, platform/orchestrator
- **Detail:** UUID 11.1.1+ fixes the buffer bounds check vulnerability (DEP-016)
- **Recommendation:** Upgrade to >=11.1.1 to fix CVE-GHSA-w5hq-g745-h8pq
- **Fix:** `npm update uuid` (major version bump; verify compatibility)

---

### DEP-038-040: React & React-DOM (1 major version behind)
- **Severity:** P3 (MAINTENANCE)
- **Package:** `react@^18.3.1` (current: 18.x, latest: 19.2.8)
- **Files:** Source/Frontend/package-lock.json
- **Detail:** React 19.x includes new compiler optimizations and stricter rules
- **Recommendation:** Test React 19.x compatibility; consider upgrading
- **Fix:** `npm update react react-dom` (may require component changes)

---

### DEP-041: React-Router-DOM (1 major version behind)
- **Severity:** P3 (MAINTENANCE + SECURITY)
- **Package:** `react-router-dom@^6.26.0` (current: 6.x, latest: 7.18.2)
- **File:** Source/Frontend/package-lock.json
- **Detail:** React Router 7.x fixes multiple open redirect CVEs (DEP-007, DEP-027)
- **Recommendation:** Upgrade to >=7.18.0 to fix open redirect vulnerabilities
- **Fix:** `npm update react-router-dom` (major version bump; test routing behavior)

---

### DEP-042: Multer (1 major version behind)
- **Severity:** P3 (MAINTENANCE)
- **Package:** `multer@^1.4.5-lts.1` (current: 1.x, latest: 2.2.0)
- **File:** platform/orchestrator/package-lock.json
- **Detail:** Multer 2.x has API improvements and better streaming support
- **Recommendation:** Evaluate compatibility and upgrade
- **Fix:** `npm update multer` (may require code refactoring)

---

## Supply Chain Risk Assessment

### Post-Install Scripts
✅ **GOOD:** No post-install or pre-install scripts detected across all package.json files. This eliminates a common supply chain attack vector (arbitrary code execution during `npm install`).

### Dependency Metrics
- **Backend:** 102 prod + 310 dev = 412 total
- **Frontend:** 9 prod + 222 dev = 231 total
- **E2E:** 4 prod + 0 dev = 4 total
- **Orchestrator:** 153 prod + 0 dev = 153 total
- **Total:** ~800 dependencies (high surface area for vulnerabilities)

### Risk Assessment
- **High:** protobufjs (10+ CVEs, critical RCE)
- **High:** Orchestrator has 9 vulnerabilities including critical protobufjs
- **Moderate:** Backend and Frontend both have multiple high-severity CVEs
- **Moderate:** Outdated package pins (express, pino, uuid, react) suggest infrequent dependency updates

### Recommendations
1. **Immediate:** Update handlebars, vitest, protobufjs to fix P1 vulnerabilities
2. **This Week:** Update form-data, js-yaml, vite, postcss, react-router
3. **This Month:** Plan major version upgrades (express, uuid, react, react-router-dom)
4. **Ongoing:** Enable Dependabot or Renovate for automated PR creation on new CVEs

---

## Missing Audits

**Not Audited (No manifest files found):**
- Go modules (go.mod)
- Python packages (requirements.txt / pyproject.toml)
- Rust crates (Cargo.toml)
- Java/Maven (pom.xml)

If the project uses these languages, extend the audit scope.

---

## JSON Summary

```json
{
  "audit_date": "2026-08-18",
  "scan_scope": "npm packages (4 projects)",
  "total_findings": 42,
  "vulnerabilities": {
    "critical": 3,
    "high": 10,
    "moderate": 14,
    "low": 1,
    "maintenance": 14
  },
  "by_severity": {
    "P1": 3,
    "P2": 10,
    "P3": 29
  },
  "affected_projects": [
    "Source/Backend",
    "Source/Frontend",
    "platform/orchestrator"
  ],
  "clean_projects": [
    "Source/E2E"
  ],
  "supply_chain_risks": {
    "post_install_scripts": 0,
    "total_dependencies": 800,
    "high_risk_packages": [
      "protobufjs@<=7.6.4",
      "handlebars@<=4.7.8",
      "vitest@<=3.2.5"
    ]
  },
  "next_steps": [
    "Fix 3 critical vulnerabilities immediately",
    "Update 10 high-severity packages this week",
    "Plan major version upgrades for outdated dependencies",
    "Enable automated dependency scanning (Dependabot/Renovate)"
  ]
}
```

---

**Report Generated:** Dependency Auditor (Haiku)  
**Severity Grading:** A=0 P1s, B=1-3 P2s, C=4+ P2s or 1+ P1s with mitigations  
**Current Grade:** **D** (3 P1 vulnerabilities without mitigations)
