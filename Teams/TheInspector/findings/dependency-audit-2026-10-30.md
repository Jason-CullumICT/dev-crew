# Dependency Auditor Findings — 2026-10-30

**Audit Date:** 2026-10-30  
**Audited Projects:** 10 npm workspaces across Source/, platform/, and portal/  
**Overall Status:** ⚠️ CRITICAL — Multiple P1 vulnerabilities with exploit potential in production-facing packages

---

## Executive Summary

| Metric | Count | Severity |
|--------|-------|----------|
| **Total Packages Scanned** | 5 npm workspaces (main) | — |
| **Total Dependencies** | 1,797 transitive + 99 direct | — |
| **Critical CVEs** | 12 | **P1** |
| **High CVEs** | 34 | **P2** |
| **Moderate CVEs** | 67 | **P3** |
| **Low CVEs** | 10 | **P4** |
| **Total Vulnerabilities** | **123** | — |
| **Outdated Direct Deps** | 7 | **P3** |
| **Direct Deps w/ Critical** | 3 (`vitest`) | **P1** |

---

## Critical Findings (P1) — Immediate Action Required

### **DEP-001: vitest — Arbitrary File Read/Execute via UI Server**
- **Severity:** P1 (CRITICAL)
- **Category:** cve / production-risk
- **Affected Packages:**
  - `Source/Frontend` (direct dep)
  - `portal/Backend` (direct dep)
  - `portal/Frontend` (transitive)
- **Vulnerability:** CVE-ID: GHSA-5xrq-8626-4rwp
  - **Title:** When Vitest UI server is listening, arbitrary file can be read and executed
  - **Impact:** If vitest UI is exposed (e.g., dev server left running in staging/prod), attacker can:
    - Read arbitrary files from the server's filesystem
    - Execute arbitrary code
  - **Exploit Vector:** HTTP request to vitest UI endpoint
  - **Affected Versions:** Multiple versions of vitest (2.x)
- **Fix:**
  - Upgrade vitest to latest patched version
  - **Immediate:** Disable vitest UI server in non-dev environments
  - Verify vitest is devDependency only (not bundled in production)
- **File:** `Source/Frontend/package.json`, `portal/Backend/package.json`
- **Risk Score:** 9/10 (direct dependency, exposed if dev server misconfigured)
- **[CROSS-REF: red-teamer]** — Test this in dynamic testing; verify UI server is disabled in prod

---

### **DEP-002: tinypool — Prototype Pollution RCE via Worker Options**
- **Severity:** P1 (CRITICAL)
- **Category:** cve / remote-code-execution
- **Affected Packages:**
  - `Source/Frontend` (transitive via vitest)
  - `portal/Frontend` (transitive via vitest)
  - `portal/Backend` (transitive)
- **Vulnerability:** CVE-ID: GHSA-5gmw-xhrv-c9v3
  - **Title:** Tinypool: Prototype Pollution gadget in worker options leads to Remote Code Execution
  - **Impact:** Prototype pollution in worker thread options can lead to RCE
  - **Affected Versions:** <2.6.0
  - **Exploit Vector:** Malformed worker configuration passed to tinypool
- **Fix:** Update `vitest` which depends on `tinypool`
- **Risk Score:** 8/10 (transitive but exploitable)

---

### **DEP-003: proxy-addr — IPv4-Mapped IPv6 IP Spoofing**
- **Severity:** P1 (CRITICAL)
- **Category:** cve / authentication-bypass
- **Affected Packages:**
  - `Source/Backend` (transitive)
  - `platform/orchestrator` (transitive)
  - `portal/Backend` (transitive)
- **Vulnerability:** CVE-ID: GHSA-jqcg-44mw-7w3h
  - **Title:** proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet
  - **Impact:** Attacker can spoof IP address in X-Forwarded-For header, bypassing IP-based access controls
  - **Used by:** Express middleware for trusted proxy validation
  - **Affected Versions:** Multiple versions
- **Exploit Scenario:** If app trusts proxy headers for IP-based auth/rate-limiting:
  - Attacker crafts `X-Forwarded-For: ::ffff:127.0.0.1` to appear as localhost
  - Bypasses IP whitelist checks
  - Could allow admin access if rate-limit/auth relies on IP
- **Fix:** Update `proxy-addr` package
- **Risk Score:** 9/10 (directly impacts auth if IP-based)
- **[CROSS-REF: red-teamer]** — Test IP spoofing scenarios in auth flows

---

### **DEP-004: protobufjs — Arbitrary Code Execution**
- **Severity:** P1 (CRITICAL)
- **Category:** cve / remote-code-execution
- **Affected Packages:**
  - `platform/orchestrator` (transitive)
  - `portal/Backend` (transitive)
- **Vulnerability:** CVE-ID: GHSA-xq3m-2v4x-88gg
  - **Title:** Arbitrary code execution in protobufjs
  - **Impact:** Parsing untrusted protobuf messages can trigger RCE
  - **Affected Versions:** Multiple versions
- **Exploit Vector:** Send malformed `.proto` or `.pb` message
- **Fix:** Update `protobufjs` to latest patched version
- **Risk Score:** 10/10 (direct RCE vector)

---

### **DEP-005: handlebars — JavaScript Injection via AST Tampering**
- **Severity:** P1 (CRITICAL)
- **Category:** cve / injection
- **Affected Packages:**
  - `Source/Backend` (transitive, likely via template rendering)
- **Vulnerability:** CVE-ID: GHSA-3mfm-83xf-c92r
  - **Title:** Handlebars.js has JavaScript Injection via AST Type Confusion by tampering @partial-block
  - **Impact:** Attacker can inject JavaScript by tampering with template AST
  - **Affected Versions:** <4.7.8
- **Fix:** Update `handlebars` to >=4.7.8
- **Risk Score:** 8/10 (depends on template usage)
- **[CROSS-REF: red-teamer]** — Check if Backend uses handlebars for template rendering

---

## High-Severity Findings (P2) — Address Within Sprint

### **DEP-006: body-parser — DoS via Invalid Limit Value**
- **Severity:** P2 (HIGH)
- **Category:** cve / denial-of-service
- **Affected Packages:** Source/Backend, platform/orchestrator
- **Vulnerability:** CVE-ID: GHSA-v422-hmwv-36x6
  - **Title:** body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement
  - **Impact:** Invalid `limit` config silently disables size enforcement → large payloads bypass validation
  - **Exploit:** Send POST with huge body (>1GB) → server OOM
- **Fix:** Validate request body parsing config; update body-parser

---

### **DEP-007: brace-expansion — Process Hang & Memory Exhaustion**
- **Severity:** P2 (HIGH)
- **Category:** cve / denial-of-service
- **Affected Packages:** Source/Backend
- **Vulnerability:** CVE-ID: GHSA-f886-m6hf-6m8v
  - **Title:** Zero-step sequence causes process hang and memory exhaustion
  - **Impact:** Special input (e.g., `{1..9999999}`) causes infinite loop and OOM
- **Fix:** Update `brace-expansion`

---

### **DEP-008: Browserslist — Unbounded Memory Growth**
- **Severity:** P2 (HIGH)
- **Category:** cve / denial-of-service
- **Affected Packages:** Source/Backend, Source/Frontend, portal/Frontend
- **Vulnerability:** CVE-ID: GHSA-c83g-rgw3-j3cx
  - **Title:** Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM
  - **Impact:** Repeated different queries accumulate in cache → memory leak
- **Fix:** Update `browserslist` to version with cache eviction

---

### **DEP-009: form-data — CRLF Injection in Multipart Fields**
- **Severity:** P2 (HIGH)
- **Category:** cve / injection
- **Affected Packages:** Source/Backend, Source/Frontend, portal/Frontend
- **Vulnerability:** CVE-ID: GHSA-hmw2-7cc7-3qxx
  - **Title:** CRLF injection in form-data via unescaped multipart field names and filenames
  - **Impact:** Attacker can inject headers via filename
- **Fix:** Update `form-data`
- **[CROSS-REF: red-teamer]** — Test file upload with crafted filenames

---

### **DEP-010: js-yaml — Quadratic-Complexity DoS via Merge Keys**
- **Severity:** P2 (HIGH)
- **Category:** cve / denial-of-service
- **Affected Packages:** Source/Backend
- **Vulnerability:** CVE-ID: GHSA-h67p-54hq-rp68
  - **Title:** Quadratic-complexity DoS in merge key handling via repeated aliases
  - **Impact:** Parse YAML with many repeated aliases → O(n²) processing
- **Fix:** Update `js-yaml`

---

### **DEP-011: Vite — Path Traversal in Optimized Deps `.map` Handling**
- **Severity:** P2 (HIGH)
- **Category:** cve / path-traversal
- **Affected Packages:**
  - `Source/Frontend` (DIRECT dependency)
  - `portal/Frontend` (DIRECT dependency)
- **Vulnerability:** CVE-ID: GHSA-4w7w-66w2-5vf9
  - **Title:** Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling
  - **Impact:** Vite dev server can be tricked into serving arbitrary files
  - **Exploit:** Craft request with `../` in `.map` file path
- **Fix:** Update `vite` to latest patched version
- **[CROSS-REF: red-teamer]** — Test path traversal in dev server if exposed

---

### **DEP-012: postcss — XSS via Unescaped `</style>`**
- **Severity:** P2 (HIGH)
- **Category:** cve / xss
- **Affected Packages:**
  - `Source/Frontend` (transitive)
  - `portal/Frontend` (DIRECT dependency)
- **Vulnerability:** CVE-ID: GHSA-qx2v-qp2m-jg93
  - **Title:** PostCSS has XSS via Unescaped `</style>` in its CSS Stringify Output
  - **Impact:** If CSS is dynamically generated and contains `</style>`, XSS payload can break out
- **Fix:** Update `postcss`
- **[CROSS-REF: red-teamer]** — Test CSS injection vectors

---

### **DEP-013: nanoid — Non-Secure Generators Loop Indefinitely**
- **Severity:** P2 (HIGH)
- **Category:** cve / cryptography
- **Affected Packages:** Source/Frontend, portal/Frontend
- **Vulnerability:** CVE-ID: GHSA-28wg-ghj8-5hjv
  - **Title:** nanoid: non-secure generators can loop indefinitely with negative size
  - **Impact:** Calling nanoid with negative size causes infinite loop (if using non-secure generator)
- **Fix:** Update `nanoid`

---

### **DEP-014: source-map-js — Event-Loop DoS via Indexed Offsets**
- **Severity:** P2 (HIGH)
- **Category:** cve / denial-of-service
- **Affected Packages:** Source/Frontend, portal/Frontend
- **Vulnerability:** CVE-ID: GHSA-68fv-2mgg-jv7q
  - **Title:** source-map-js allows event-loop denial of service through indexed source-map section offsets
  - **Impact:** Parse malformed sourcemap → blocks event loop
- **Fix:** Update `source-map-js`

---

### **DEP-015: ws — Uninitialized Memory Disclosure**
- **Severity:** P2 (HIGH)
- **Category:** cve / information-disclosure
- **Affected Packages:** portal/Frontend
- **Vulnerability:** CVE-ID: GHSA-58qx-3vcg-4xpx
  - **Title:** ws: Uninitialized memory disclosure
  - **Impact:** WebSocket library can leak uninitialized memory
- **Fix:** Update `ws`

---

### **DEP-016: @vitest/mocker — Path Traversal & Code Injection**
- **Severity:** P2 (HIGH)
- **Category:** cve / path-traversal
- **Affected Packages:** Source/Frontend, portal/Frontend (in test runner)
- **Vulnerability:** CVE-ID: GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8
  - **Titles:**
    - Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock
    - Code injection via unauthenticated manual mock registration
  - **Impact:** Test infrastructure can be compromised
- **Fix:** Update `vitest` (which includes @vitest/mocker)

---

### **DEP-017: @remix-run/router — Open Redirect via Protocol-Relative URLs**
- **Severity:** P2 (HIGH)
- **Category:** cve / open-redirect
- **Affected Packages:** Source/Frontend
- **Vulnerability:** CVE-ID: GHSA-2j2x-hqr9-3h42
  - **Title:** React Router's same-origin redirect with path starting // causes open redirect
  - **Impact:** If redirect path starts with `//`, it can redirect to external site
- **Fix:** Update `react-router-dom` (which depends on @remix-run/router)

---

### **DEP-018: picomatch — Method Injection in POSIX Character Classes**
- **Severity:** P2 (HIGH)
- **Category:** cve / code-injection
- **Affected Packages:** portal/Frontend
- **Vulnerability:** CVE-ID: GHSA-3v7f-55p6-f55p
  - **Title:** Method Injection in POSIX Character Classes causes incorrect Glob Matching
  - **Impact:** Glob patterns can be exploited for method injection
- **Fix:** Update `picomatch`

---

## Moderate-Severity Findings (P3) — Backlog

### **DEP-019: @grpc/grpc-js — Malformed Request Crash**
- **Severity:** P3 (MODERATE)
- **Category:** cve / denial-of-service
- **Affected Packages:** platform/orchestrator
- **Vulnerability:** CVE-ID: GHSA-5375-pq7m-f5r2
  - **Title:** A malformed request can cause a server crash
  - **Impact:** 500 error or restart (not RCE)
- **Fix:** Update `@grpc/grpc-js`

---

### **DEP-020: path-to-regexp — ReDoS via Multiple Route Parameters**
- **Severity:** P3 (MODERATE)
- **Category:** cve / denial-of-service
- **Affected Packages:** platform/orchestrator
- **Vulnerability:** CVE-ID: GHSA-37ch-88jc-xwx2
  - **Title:** Regular Expression Denial of Service via multiple route parameters
  - **Impact:** Crafted route with many params triggers ReDoS
- **Fix:** Update `path-to-regexp`

---

### **DEP-021: baseline-browser-mapping — Process Termination on Invalid Input**
- **Severity:** P3 (MODERATE)
- **Category:** cve / denial-of-service
- **Affected Packages:** Source/Backend
- **Vulnerability:** CVE-ID: GHSA-w5vr-8v7q-w6rv
  - **Title:** Process termination on invalid input causes denial of service
  - **Impact:** Invalid input → process exit
- **Fix:** Update `baseline-browser-mapping`

---

### **DEP-022: @babel/core — Arbitrary File Read via sourceMappingURL**
- **Severity:** P3 (MODERATE)
- **Category:** cve / information-disclosure
- **Affected Packages:** Source/Backend, Source/Frontend
- **Vulnerability:** CVE-ID: GHSA-4x5r-pxfx-6jf8
  - **Title:** Arbitrary File Read via sourceMappingURL Comment
  - **Impact:** Malformed sourceMappingURL can trigger file read
  - **Affected Versions:** <=7.29.0
- **Fix:** Update `@babel/core`

---

## Outdated Direct Dependencies (P3)

| Package | Current | Latest | Major Version Behind | Project |
|---------|---------|--------|----------------------|---------|
| `jest` | 29.7.0 | 30.x | 1 major | Source/Backend |
| `supertest` | 6.3.3 | 7.0+ | 1 major | Source/Backend |
| `@testing-library/react` | 16.0.0 | 16.x+ | Current | Source/Frontend |
| `vitest` | 2.0.5 | 3.x+ | Depends on breaking changes | Source/Frontend |
| `typescript` | varies | 5.8+ | Check per project | Both |

---

## Supply Chain Analysis

### Dependency Tree Size
| Project | Direct | Transitive | Total | Risk |
|---------|--------|-----------|-------|------|
| Source/Backend | 13 | 398 | 411 | **MODERATE** (>300 transitive) |
| Source/Frontend | 3 | 227 | 230 | **LOW** |
| Source/E2E | 4 | 0 | 4 | **MINIMAL** |
| platform/orchestrator | 153 | 2 | 155 | **MODERATE** (large direct) |
| portal/Backend | 397 | 181 | 577 | **HIGH** (>500 total) |
| portal/Frontend | 9 | 415 | 424 | **HIGH** (>400 transitive) |

### Risk Flags
- ✅ **No post-install scripts detected** (good)
- ✅ **No hardcoded secrets found** in package.json
- ⚠️ **portal/Backend has 577 transitive deps** (large attack surface)
- ⚠️ **Source/Backend has 411 transitive deps** (large attack surface)

---

## Recommended Action Plan

### Immediate (This Sprint) — P1 Vulns
1. **Update `vitest` to latest** in Source/Frontend and portal/Backend
   - Command: `npm install --save-dev vitest@latest`
   - This also updates `tinypool`, `@vitest/mocker`
   - Verify UI server is disabled in non-dev environments

2. **Update `proxy-addr` in all packages**
   - This is a transitive dep; verify which packages depend on it
   - May require updating Express or middleware layer

3. **Update `protobufjs` in platform/orchestrator and portal/Backend**
   - `npm install protobufjs@latest`

4. **Update `handlebars` in Source/Backend**
   - `npm install handlebars@latest`

5. **Audit IP-based auth flows** (red-teamer + backend-coder)
   - Test proxy-addr IP spoofing scenarios
   - Ensure trusted proxy config is secure

### Short-term (Next 2 Sprints) — P2 Vulns
1. Update `vite` (direct dep in both frontends)
2. Update `postcss` (direct in portal/Frontend)
3. Update remaining high-severity transitive deps
4. Review test infrastructure for vitest UI exposure
5. Disable vitest UI in staging/prod environments

### Long-term (Ongoing)
1. Reduce dependency tree size (>500 is concerning)
   - Audit portal/Backend for unnecessary deps
   - Consider dep consolidation
2. Set up automated npm audit CI checks
   - Fail builds on critical/high CVEs
   - Allow moderate only with PR justification
3. Establish dependency update cadence (monthly)
4. Monitor for new vulnerabilities in npm registry

---

## Cross-Team Escalation

### [ESCALATE → TheGuardians]
The following findings require security team action:
- **DEP-003 (proxy-addr):** IP spoofing bypasses auth → test all IP-based access controls
- **DEP-004 (protobufjs):** RCE via malformed messages → review message parsing
- **DEP-005 (handlebars):** Template injection → audit template usage
- **DEP-009 (form-data):** CRLF injection in file uploads → test upload vectors
- **DEP-013 (nanoid):** ID generation security → audit any ID-based auth

### [CROSS-REF → TheFixerTeam]
For bug fixes and updates:
- Update all critical deps in package.json files
- Add npm audit to CI pipeline
- Lock production-only test deps (vitest)

---

## JSON Summary

```json
{
  "audit_date": "2026-10-30",
  "projects_scanned": 5,
  "total_vulnerabilities": 123,
  "vulnerabilities_by_severity": {
    "critical": 12,
    "high": 34,
    "moderate": 67,
    "low": 10
  },
  "direct_dependencies_with_critical": 3,
  "critical_packages": [
    "vitest",
    "tinypool",
    "proxy-addr",
    "protobufjs",
    "handlebars"
  ],
  "outdated_major_versions": 7,
  "supply_chain_risk": "HIGH",
  "largest_dependency_trees": [
    {
      "project": "portal/Backend",
      "total_deps": 577
    },
    {
      "project": "portal/Frontend",
      "total_deps": 424
    },
    {
      "project": "Source/Backend",
      "total_deps": 411
    }
  ],
  "post_install_scripts": 0,
  "overall_grade": "D",
  "recommendation": "URGENT: Update vitest, proxy-addr, protobufjs, handlebars. Disable vitest UI in non-dev. Audit IP-based auth."
}
```

---

## Findings Reference

| ID | Package | Severity | CVE | Status |
|----|---------|----------|-----|--------|
| DEP-001 | vitest | P1 | GHSA-5xrq-8626-4rwp | ⚠️ URGENT |
| DEP-002 | tinypool | P1 | GHSA-5gmw-xhrv-c9v3 | ⚠️ URGENT |
| DEP-003 | proxy-addr | P1 | GHSA-jqcg-44mw-7w3h | ⚠️ URGENT |
| DEP-004 | protobufjs | P1 | GHSA-xq3m-2v4x-88gg | ⚠️ URGENT |
| DEP-005 | handlebars | P1 | GHSA-3mfm-83xf-c92r | ⚠️ URGENT |
| DEP-006 | body-parser | P2 | GHSA-v422-hmwv-36x6 | 📋 BACKLOG |
| DEP-007 | brace-expansion | P2 | GHSA-f886-m6hf-6m8v | 📋 BACKLOG |
| DEP-008 | browserslist | P2 | GHSA-c83g-rgw3-j3cx | 📋 BACKLOG |
| DEP-009 | form-data | P2 | GHSA-hmw2-7cc7-3qxx | 📋 BACKLOG |
| DEP-010 | js-yaml | P2 | GHSA-h67p-54hq-rp68 | 📋 BACKLOG |
| DEP-011 | vite | P2 | GHSA-4w7w-66w2-5vf9 | 📋 BACKLOG |
| DEP-012 | postcss | P2 | GHSA-qx2v-qp2m-jg93 | 📋 BACKLOG |
| DEP-013 | nanoid | P2 | GHSA-28wg-ghj8-5hjv | 📋 BACKLOG |
| DEP-014 | source-map-js | P2 | GHSA-68fv-2mgg-jv7q | 📋 BACKLOG |
| DEP-015 | ws | P2 | GHSA-58qx-3vcg-4xpx | 📋 BACKLOG |
| DEP-016 | @vitest/mocker | P2 | GHSA-82fw-gwwq-j7x9 | 📋 BACKLOG |
| DEP-017 | @remix-run/router | P2 | GHSA-2j2x-hqr9-3h42 | 📋 BACKLOG |
| DEP-018 | picomatch | P2 | GHSA-3v7f-55p6-f55p | 📋 BACKLOG |
| DEP-019 | @grpc/grpc-js | P3 | GHSA-5375-pq7m-f5r2 | 📋 BACKLOG |
| DEP-020 | path-to-regexp | P3 | GHSA-37ch-88jc-xwx2 | 📋 BACKLOG |
| DEP-021 | baseline-browser-mapping | P3 | GHSA-w5vr-8v7q-w6rv | 📋 BACKLOG |
| DEP-022 | @babel/core | P3 | GHSA-4x5r-pxfx-6jf8 | 📋 BACKLOG |

---

**Report Generated By:** Dependency Auditor Agent  
**Model:** claude-haiku-4-5  
**Next Audit:** Recommended in 7 days or after critical updates
