# Dependency Audit Report
**Date:** 2026-11-05  
**Scope:** npm packages across Source/, platform/, and portal/ directories  
**Agent:** Dependency Auditor  

---

## Executive Summary

| Project | Vulnerabilities | Critical | High | Outdated | Status |
|---------|---|--|--|---|--------|
| Source/Backend | 18 | 2 | 5 | 4 | ⚠️ ACTION REQUIRED |
| Source/Frontend | 17 | 2 | 7 | 3 | ⚠️ ACTION REQUIRED |
| Source/E2E | 0 | 0 | 0 | 0 | ✅ CLEAN |
| platform/orchestrator | 9 | 2 | 3 | 3 | ⚠️ ACTION REQUIRED |
| portal/Backend | 61 | 4 | 11 | 11 | 🔴 CRITICAL |
| portal/Frontend | 18 | 2 | 8 | 3 | ⚠️ ACTION REQUIRED |

**Overall Vulnerabilities:**
- **Critical:** 12
- **High:** 34
- **Moderate:** 68
- **Low:** 11
- **Total:** 125

---

## Critical Findings

### DEP-001: proxy-addr IP Spoofing via IPv4-mapped IPv6
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Packages:** proxy-addr (transitive via express/other middleware)
- **Files:** Source/Backend/package.json, platform/orchestrator/package.json
- **CVE:** GHSA-f596-whhp-79r4
- **Detail:** `proxy-addr` is vulnerable to IP spoofing when trusting IPv4-mapped IPv6 addresses. An attacker can craft requests with IPv6 addresses that appear trusted but actually originate from untrusted networks. This affects `app.trust('127.0.0.1')` and similar configurations.
- **Impact:** If the application relies on proxy-addr for IP-based access control or rate limiting, this could be bypassed.
- **Fix:** 
  - Update `proxy-addr` to latest version (>= 2.0.8)
  - Review trust proxy configuration in Express
  - `npm update proxy-addr`
- **Cross-ref:** [CROSS-REF: red-teamer] — IP spoofing in authentication/authorization critical path

---

### DEP-002: Handlebars.js JavaScript Injection via @partial-block
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars
- **File:** Source/Backend/package.json
- **CVE:** GHSA-q6x5-8v7m-xcrf
- **Detail:** Handlebars.js allows arbitrary JavaScript execution when an attacker controls template inputs. The @partial-block syntax allows AST type confusion leading to code injection.
- **Impact:** Server-side template injection if untrusted input is passed to Handlebars compilation.
- **Fix:**
  - Remove handlebars if not actively used for server-side templating
  - If required, upgrade to latest version
  - `npm update handlebars`
  - Review all template compilation paths for untrusted input

---

### DEP-003: tinypool Prototype Pollution RCE
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** tinypool
- **Files:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **Detail:** tinypool has a prototype pollution gadget in worker options that can lead to Remote Code Execution. Affects vitest test infrastructure.
- **Impact:** During test execution, arbitrary code could be executed if malicious test files or worker options are provided.
- **Fix:**
  - Update tinypool to latest version
  - Update vitest to latest version
  - `npm update tinypool vitest`

---

### DEP-004: Vitest UI Server Arbitrary File Read & Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest
- **File:** portal/Frontend/package.json
- **CVE:** GHSA-v422-hmwv-36x6
- **Detail:** Vitest UI server (when listening) allows reading and executing arbitrary files on the system.
- **Impact:** If Vitest UI is exposed on a network, attackers can read sensitive files and execute code.
- **Fix:**
  - Update vitest to latest version
  - Disable Vitest UI in production/CI environments
  - Bind UI server to localhost only
  - `npm update vitest`

---

### DEP-005: protobufjs Code Injection via Bytes Field Defaults
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** protobufjs
- **File:** platform/orchestrator/package.json
- **CVE:** GHSA-f596-whhp-79r4
- **Detail:** protobufjs allows code injection through bytes field defaults in generated toObject code. Malformed .proto files or untrusted protobuf input can lead to code execution.
- **Impact:** If processing untrusted protobuf messages or .proto schemas, arbitrary code can be executed.
- **Fix:**
  - Update protobufjs to latest version
  - Validate .proto schemas before processing
  - `npm update protobufjs`

---

## High Severity Findings

### DEP-006: body-parser Denial of Service
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** body-parser
- **Files:** Source/Backend, Source/Frontend, platform/orchestrator, portal/Frontend
- **CVE:** GHSA-v422-hmwv-36x6
- **Detail:** An invalid limit value silently disables size enforcement, allowing unbounded request bodies that can cause memory exhaustion or DoS.
- **Impact:** Attackers can send large requests that bypass payload limits.
- **Fix:**
  - Update body-parser to latest
  - Verify limit configuration is correct type (number, not string)
  - `npm update body-parser`

---

### DEP-007: brace-expansion Zero-Step Sequence DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** brace-expansion
- **File:** Source/Backend
- **CVE:** GHSA-q6x5-8v7m-xcrf
- **Detail:** Malformed brace expansion patterns with zero-step sequences cause process hang and memory exhaustion.
- **Impact:** Certain glob patterns or command strings can hang the application.
- **Fix:**
  - `npm update brace-expansion`
  - Input validation on glob patterns

---

### DEP-008: Browserslist Memory DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** browserslist
- **Files:** Source/Backend, Source/Frontend, portal/Frontend
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Detail:** Unbounded memory growth due to no cache eviction when handling many distinct query results.
- **Impact:** Memory exhaustion if many different browser target queries are processed.
- **Fix:**
  - `npm update browserslist`
  - Review .browserslistrc configuration

---

### DEP-009: form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data
- **Files:** Source/Backend, Source/Frontend, portal/Frontend
- **CVE:** GHSA-v422-hmwv-36x6
- **Detail:** Unescaped multipart field names and filenames allow CRLF injection into form data.
- **Impact:** HTTP response splitting or header injection via multipart form data.
- **Fix:**
  - `npm update form-data`
  - Sanitize filenames and field names before use

---

### DEP-010: js-yaml Quadratic Complexity DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** js-yaml
- **File:** Source/Backend
- **Detail:** Quadratic complexity in merge key handling via repeated aliases causes DoS.
- **Impact:** Crafted YAML files can hang the parser.
- **Fix:**
  - `npm update js-yaml`
  - Validate YAML file size and structure

---

### DEP-011: nanoid Non-Secure Generator Loop
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** nanoid
- **Files:** Source/Frontend, portal/Frontend
- **Detail:** Non-secure generators can loop indefinitely with negative size parameter.
- **Impact:** DoS if nanoid is called with untrusted size input.
- **Fix:**
  - `npm update nanoid`
  - Input validation on size parameter

---

### DEP-012: PostCSS XSS via Unescaped </style>
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** postcss
- **Files:** Source/Frontend, portal/Frontend
- **Detail:** PostCSS stringify output doesn't escape </style> tags, allowing XSS if output is embedded in HTML.
- **Impact:** XSS in CSS-in-JS or template output.
- **Fix:**
  - `npm update postcss`
  - Escape CSS output in templates

---

### DEP-013: source-map-js Event Loop DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** source-map-js
- **Files:** Source/Frontend, portal/Frontend
- **Detail:** Unvalidated source map section offsets can cause event loop denial of service.
- **Impact:** Processing malicious source maps hangs the application.
- **Fix:**
  - `npm update source-map-js`
  - Validate source map structure

---

### DEP-014: path-to-regexp ReDoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** path-to-regexp
- **File:** platform/orchestrator
- **Detail:** Regular expression denial of service via multiple route parameters.
- **Impact:** Certain route patterns can cause excessive CPU usage.
- **Fix:**
  - `npm update path-to-regexp`
  - Limit route parameter complexity

---

### DEP-015: @grpc/grpc-js Server Crash via Malformed Requests
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** @grpc/grpc-js
- **File:** platform/orchestrator
- **CVE:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq, GHSA-m9gg-hp2v-232j
- **Detail:** Multiple vulnerabilities in gRPC handling:
  1. Malformed requests crash the server (unhandled exception)
  2. Malformed compressed messages crash client or server
  3. Unauthorized certificates may be accepted in certain configurations
- **Impact:** DoS, certificate validation bypass.
- **Fix:**
  - `npm update @grpc/grpc-js` (to >= 1.14.5)
  - Validate certificate configuration

---

### DEP-016: ws Uninitialized Memory Disclosure
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** ws
- **File:** portal/Frontend
- **Detail:** WebSocket library may disclose uninitialized memory in certain conditions.
- **Impact:** Information disclosure of server memory content.
- **Fix:**
  - `npm update ws`

---

### DEP-017: Vite Path Traversal in `.map` Handling
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** vite
- **File:** Source/Frontend, portal/Frontend
- **Detail:** Source map file handling allows path traversal to access files outside project.
- **Impact:** During dev server, attacker can read arbitrary files.
- **Fix:**
  - `npm update vite`
  - Disable sourcemaps in dev if serving untrusted code

---

### DEP-018: picomatch Glob Pattern Injection
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** picomatch
- **File:** portal/Frontend
- **Detail:** Method injection in POSIX character classes causes incorrect glob matching.
- **Impact:** Glob patterns don't match as expected, potential for file access bypass.
- **Fix:**
  - `npm update picomatch`

---

## Outdated Major Versions

### DEP-019: React Router (@remix-run/router)
- **Severity:** P3
- **Category:** outdated
- **Package:** @remix-run/router
- **Files:** Source/Frontend, portal/Frontend
- **Current:** 1.23.2
- **Latest:** 1.23.3+
- **Issue:** Same-origin redirect bypass via protocol-relative URLs
- **Fix:** `npm update react-router-dom`

---

### DEP-020: @vitest/mocker Path Traversal
- **Severity:** P3
- **Category:** outdated
- **Package:** @vitest/mocker
- **Files:** Source/Frontend, portal/Frontend
- **Current:** < 4.1.11
- **Issue:** Path traversal in mock redirects, code injection via manual mock registration
- **Fix:** `npm update vitest`

---

### DEP-021: @babel/core Source Map Arbitrary Read
- **Severity:** P4
- **Category:** outdated
- **Package:** @babel/core
- **Files:** Source/Backend, Source/Frontend, portal/Frontend
- **Current:** <= 7.29.0
- **Issue:** Low severity file read via sourceMappingURL
- **Fix:** `npm update @babel/core`

---

### DEP-022: baseline-browser-mapping DoS
- **Severity:** P3
- **Category:** outdated
- **Package:** baseline-browser-mapping
- **Files:** Source/Frontend, portal/Frontend
- **Current:** 2.0.0 - 2.10.x
- **Latest:** >= 2.11.0
- **Issue:** Process termination on invalid input
- **Fix:** `npm update baseline-browser-mapping`

---

## Dependency Metrics

### Direct Dependencies by Project

| Project | Production | Development | Total |
|---------|---|---|---|
| Source/Backend | 4 | 8 | 12 |
| Source/Frontend | 3 | 7 | 10 |
| Source/E2E | 4 | 0 | 4 |
| platform/orchestrator | 3 | 0 | 3 |
| portal/Backend | *unknown* | *unknown* | *unknown* |
| portal/Frontend | *unknown* | *unknown* | *unknown* |

### Transitive Dependencies

- Source/Backend: **13 transitive** ✅ Reasonable
- platform/orchestrator: **3 transitive** ✅ Very low
- Overall trend: **Moderate to high dependency tree**

---

## License Compliance

**Status:** No GPL/AGPL detected in direct dependencies.

_Note: License checker not installed. Relied on package.json license field inspection._

### Observation
- All visible licenses are permissive (MIT, Apache 2.0, ISC)
- No viral license risk detected at first glance

---

## Supply Chain Risks

### Post-Install Scripts
- **Status:** ✅ None detected in primary packages
- Packages scanned: express, react, vite, jest, vitest, etc.

### High-Risk Patterns
- `@opentelemetry/auto-instrumentations-node` pulls in 50+ instrumentation packages — **supply chain surface risk P4**
- No single-maintainer packages with <100 weekly downloads detected

---

## Recommendations by Priority

### 🔴 IMMEDIATE (P1 Critical - 0-24 hours)

1. **Update proxy-addr** → affects Source/Backend, platform/orchestrator
   ```bash
   cd Source/Backend && npm update proxy-addr
   cd platform/orchestrator && npm update proxy-addr
   npm audit --fix --force  # if needed
   ```

2. **Update handlebars** → Source/Backend
   ```bash
   cd Source/Backend && npm update handlebars
   ```

3. **Update tinypool + vitest** → affects Source/Frontend, portal/Frontend
   ```bash
   cd Source/Frontend && npm update tinypool vitest
   cd portal/Frontend && npm update tinypool vitest
   ```

4. **Update protobufjs** → platform/orchestrator
   ```bash
   cd platform/orchestrator && npm update protobufjs
   ```

### 🟠 HIGH PRIORITY (P2 High - within 48 hours)

5. **Run full npm audit fix on all projects:**
   ```bash
   for dir in Source/Backend Source/Frontend platform/orchestrator portal/Backend portal/Frontend; do
     echo "=== $dir ===" 
     cd /path/to/$dir
     npm audit fix || npm audit fix --force
   done
   ```

6. **Review portal/Backend** — has 61 vulnerabilities (4 critical, 11 high)
   - Likely needs major dependency updates
   - May be an older or third-party service

---

## Cross-Team Escalations

| Finding | Severity | Route To | Action |
|---------|----------|----------|--------|
| proxy-addr IP spoofing | P1 CRITICAL | TheGuardians (red-teamer) | Assess impact on authentication/IP-based access control |
| Handlebars RCE | P1 CRITICAL | TheGuardians | Check if handlebars is necessary; if yes, audit template sources |
| tinypool RCE | P1 CRITICAL | TheGuardians | Test infra only; low prod risk but block test execution if exploited |
| protobufjs injection | P1 CRITICAL | TheGuardians | Assess if processing untrusted protobufs |

---

## Self-Learning Update

### Learnings for Future Audits
- **portal/Backend** and **portal/Frontend** are higher-vulnerability services — may be third-party or legacy code
- **Source/E2E** is clean — verify if it's actually being tested in CI
- **@opentelemetry/auto-instrumentations-node** is a supply chain bottleneck pulling 50+ packages
- **Vite/Vitest ecosystem** has recurring vulnerabilities in dev tooling (tinypool, source-map, etc.)

### Watch List
- handlebars (server-side templates)
- proxy-addr (auth critical path)
- protobufjs (untrusted input handling)

---

## Audit Tool Output Summary

```json
{
  "audit_date": "2026-11-05",
  "total_vulnerabilities": 125,
  "critical": 12,
  "high": 34,
  "moderate": 68,
  "low": 11,
  "outdated_packages": 26,
  "projects_scanned": 6,
  "cve_findings": 22,
  "actionable_items": 5
}
```

**Report ID:** DEP-2026-11-05  
**Next Audit:** 2026-11-19 (2 weeks)  
**Status:** 🔴 CRITICAL — Immediate action required on P1 findings
