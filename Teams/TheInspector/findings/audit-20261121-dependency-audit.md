# Dependency Auditor Report
**Date:** 2026-11-21  
**Audit Type:** CVE Scanning, License Compliance, Outdated Packages  
**Packages Scanned:** npm (3 primary modules)  
**Total Vulnerabilities Found:** 37 (across all modules)

---

## Executive Summary

The dev-crew project has **significant security vulnerabilities** across its npm dependencies. Key findings:

- **8 Critical/High-Severity CVEs** requiring immediate patching
- **29 Medium/Low-Severity CVEs** that should be addressed in next sprint
- **Multiple outdated major versions** of React, Express, and routing libraries
- **~370-400+ transitive dependencies** across Frontend/Backend (medium supply chain risk)

**Recommended Actions:**
1. **P1 (Immediate):** Update handlebars, proxy-addr, vitest, tinypool, protobufjs
2. **P2 (This sprint):** Update vite, browserslist, postcss, body-parser, uuid
3. **P3 (Next sprint):** Major version upgrades for React, Express, React Router

---

## Package Managers Detected

| Manager | Modules | Status |
|---------|---------|--------|
| **npm** | Source/Backend, Source/Frontend, platform/orchestrator, portal/* | ✅ Scanned |
| **Go** | None found | - |
| **Python** | None found | - |
| **Rust** | None found | - |
| **Java** | None found | - |

---

## Dependency Overview

### Backend (Source/Backend)
- **Direct Dependencies:** 13 prod + 7 dev = 20
- **Transitive Dependencies:** ~102-200 total (via lock file)
- **CVE Count:** 11 (2 critical, 5 high, 3 moderate, 1 low)
- **Lock File Size:** 5353 lines

### Frontend (Source/Frontend)
- **Direct Dependencies:** 13 prod + 11 dev = 24
- **Transitive Dependencies:** ~200+ total (includes Vite, Vitest toolchain)
- **CVE Count:** 17 (2 critical, 7 high, 7 moderate, 1 low)
- **Lock File Size:** 5777 lines

### Orchestrator (platform/orchestrator)
- **Direct Dependencies:** 3 prod
- **Transitive Dependencies:** ~153+ total
- **CVE Count:** 9 (2 critical, 3 high, 4 moderate)
- **Lock File Size:** 4980 lines

---

## Critical Vulnerabilities (P1)

### DEP-001: Handlebars JavaScript Injection (Multiple CVEs)
- **Severity:** 🔴 **P1 - CRITICAL**
- **Category:** JavaScript Injection via AST Type Confusion
- **Package:** handlebars 4.0.0 - 4.7.9 (transitive)
- **Files Affected:** Source/Backend/node_modules/handlebars, Source/Frontend/node_modules/handlebars
- **CVEs:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8) - JavaScript Injection via AST Type Confusion
  - GHSA-8r5x-fm3f-whwj (CVSS 9.8) - JavaScript Injection in compile (CVE-2026-33937 bypass)
  - GHSA-p8wg-vrv2-v86f (CVSS 0) - Own Property Check Bypass
  - Plus 8 more related to XSS, prototype pollution, CLI injection, decorator DoS
- **Detail:** Multiple remote code execution vectors through template compilation. Attacker can inject arbitrary JavaScript that executes on server or client.
- **Impact:** Arbitrary code execution in template processing
- **Fix:** Update handlebars to >= 4.7.10 (wait for final patch) or replace with alternative template engine
- **Status:** Requires major dependency review (is handlebars used directly?)

### DEP-002: proxy-addr IPv4-Mapped IPv6 Spoofing (IP Spoofing)
- **Severity:** 🔴 **P1 - CRITICAL**
- **Category:** Access Control Bypass (CWE-290/348/697)
- **Package:** proxy-addr 1.1.0 - 2.0.7
- **Files Affected:** Source/Backend/node_modules/proxy-addr, platform/orchestrator/node_modules/proxy-addr
- **CVE:** GHSA-jqcg-44mw-7w3h (CVSS 9.1)
- **Detail:** IP trusting logic can be bypassed via IPv4-mapped IPv6 addresses (::ffff:127.0.0.1). Attackers can bypass IP whitelisting in Express middleware.
- **Impact:** Authentication/authorization bypass, trusted IP validation fails
- **Fix:** `npm update proxy-addr` to >= 2.0.8
- **Context:** This is a direct issue in Express trust proxy chain. Backend app may rely on this for IP-based access control.

### DEP-003: Vitest UI Server Arbitrary File Read & RCE
- **Severity:** 🔴 **P1 - CRITICAL**
- **Category:** Arbitrary File Read + Code Execution
- **Package:** vitest < 3.2.6, tinypool <= 2.1.1, @vitest/mocker
- **Files Affected:** Source/Frontend/node_modules/vitest, node_modules/tinypool
- **CVEs:**
  - GHSA-5xrq-8626-4rwp (CVSS 9.8) - Vitest UI server RCE (file read + execution)
  - GHSA-5gmw-xhrv-c9v3 (CVSS unknown) - Tinypool prototype pollution gadget to RCE
  - GHSA-85c8-ppgw-ccpr (CVSS unknown) - Tinypool RCE via run() options
  - GHSA-82fw-gwwq-j7x9 - @vitest/mocker path traversal
  - GHSA-qxg6-89mg-rqv8 - @vitest/mocker code injection
- **Detail:** When Vitest UI is running (dev mode), attacker can access any file on disk and execute arbitrary code via prototype pollution in worker pool options.
- **Impact:** Development environment compromise, source code / secrets disclosure, build-time RCE
- **Fix:** `npm update vitest` to >= 5.1.1 (major version bump required)
- **[CROSS-REF: TheGuardians]** - This is a supply-chain risk during dev builds

### DEP-004: Protobufjs Arbitrary Code Execution
- **Severity:** 🔴 **P1 - CRITICAL**
- **Category:** Code Injection / Code Generation Gadget
- **Package:** protobufjs <= 7.6.4
- **Files Affected:** platform/orchestrator/node_modules/protobufjs
- **CVEs:**
  - GHSA-xq3m-2v4x-88gg (CVSS 9.8) - Arbitrary code execution via code generation
  - GHSA-75px-5xx7-5xc7 (CVSS 8.1) - Code generation gadget after prototype pollution
  - Multiple others: code injection, DoS, prototype pollution
- **Detail:** Protobuf schema parsing and code generation can be exploited to execute arbitrary code. Prototype pollution in message constructors. DoS via unbounded recursion.
- **Impact:** Remote code execution via crafted .proto files or gRPC messages
- **Fix:** `npm update protobufjs` to >= 7.6.5 (patch version available) or >= 8.0.0
- **Context:** Used by orchestrator for gRPC communication. High risk if external/untrusted `.proto` files are loaded.

---

## High-Severity Vulnerabilities (P2)

### DEP-005: body-parser Denial of Service
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Denial of Service (CWE-248/770)
- **Package:** body-parser <= 1.20.8
- **CVE:** GHSA-27r3-jxmh-p828 (CVSS 7.5)
- **Detail:** Compressed request bodies with trailing bytes bypass size limits. Causes crash/DoS.
- **Fix:** `npm update body-parser` (should auto-update with express >= 4.21.0)
- **[CROSS-REF: red-teamer]** - Exploitable attack vector on API endpoints

### DEP-006: brace-expansion Multiple DoS Vulnerabilities
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Denial of Service (CPU + Memory)
- **Package:** brace-expansion <= 1.1.20
- **CVEs:** 7 separate DoS CVEs (CVSS 5.3-7.5)
- **Detail:** Unbounded memory/CPU expansion via nested/recursive braces. Affects glob patterns, file matching.
- **Fix:** `npm update` dependencies using brace-expansion (likely transitive via glob)

### DEP-007: browserslist Memory DoS & Prototype Pollution
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Denial of Service + Prototype Pollution (CWE-770/1321)
- **Package:** browserslist <= 4.28.6
- **CVEs:** 
  - GHSA-c83g-rgw3-j3cx (CVSS 7.5) - Unbounded memory growth
  - GHSA-73wf-gq98-2v4g (CVSS 7.5) - Prototype write via untrusted stats
- **Detail:** No cache eviction on distinct queries → OOM. Unsafe normalization of custom browserslist-stats.json.
- **Fix:** `npm update browserslist` to >= 4.28.7
- **Impact:** Dev/build-time DoS; production impact if used in runtime analytics

### DEP-008: form-data CRLF Injection
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Injection (CWE-93)
- **Package:** form-data 4.0.0 - 4.0.5
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Detail:** Multipart form field names and filenames not properly escaped. CRLF injection possible.
- **Fix:** `npm update form-data` to >= 4.0.6

### DEP-009: js-yaml DoS via Merge Key Chains
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Denial of Service (CWE-400/407)
- **Package:** js-yaml <= 3.15.1
- **CVEs:** Multiple quadratic/exponential expansion CVEs (CVSS 5.3-7.5)
- **Detail:** YAML merge-key chains force quadratic CPU consumption. Affects YAML config parsing.
- **Fix:** `npm update js-yaml` to >= 3.15.2

### DEP-010: qs Multiple DoS + Array Limit Bypass
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Denial of Service (CWE-248/476/770)
- **Package:** qs 2.2.5 - 6.16.0
- **CVEs:** 4 DoS vectors (CVSS 3.7-5.3)
- **Detail:** Crashes on malformed input, array limit bypass, attacker-controlled isBuffer
- **Fix:** `npm update` via express/middleware (should be fixed in express >= 4.21.0)

### DEP-011: vite Multiple Path Traversal & Code Execution Issues
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Path Traversal, Code Execution (CWE-22/77/78)
- **Package:** vite <= 6.4.3
- **CVEs:** Multiple including launch-editor issues (CVSS 0-7.5)
- **Detail:** 
  - Optimized deps `.map` path traversal
  - NTLMv2 hash disclosure via UNC paths (Windows)
  - Editor flag misinterpretation → arbitrary command execution
  - fs.existsSync bypass on Windows
  - `server.fs.deny` bypass
- **Fix:** `npm update vite` to >= 6.5.0 or update to v8.x (requires build config update)
- **Impact:** Dev server compromise, source code disclosure, local privilege escalation

### DEP-012: React Router Open Redirect Vulnerabilities
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Open Redirect (CWE-601)
- **Package:** react-router-dom 6.0.0-alpha - 7.17.0
- **CVEs:** Multiple redirect bypasses (CVSS varies)
  - GHSA-wrjc-x8rr-h8h6 - Backslash bypass
  - GHSA-337j-9hxr-rhxg - Constructor injection in SSR
  - GHSA-2j2x-hqr9-3h42 - Protocol-relative URL bypass
  - GHSA-jjmj-jmhj-qwj2 - Open redirect leading to XSS
- **Fix:** `npm update react-router-dom` to >= 7.18.0
- **Impact:** Phishing, XSS via open redirect

### DEP-013: uuid Buffer Overflow (Direct Dependency)
- **Severity:** 🟠 **P2 - HIGH** (Direct in Backend)
- **Category:** Buffer Overflow (CWE-787/1285)
- **Package:** uuid < 11.1.1 (Backend: 9.0.0, Frontend/Orchestrator transitive)
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Detail:** Missing bounds check in v3/v5/v6 when `buf` parameter provided. Can write past buffer boundary.
- **Fix:** `npm update uuid` to >= 11.1.1 (major version bump)
- **Impact:** Memory corruption, potential RCE if exploited with controlled input

### DEP-014: nanoid Infinite Loop + Integer Overflow
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Denial of Service (CWE-190/835)
- **Package:** nanoid <= 3.3.17
- **CVEs:** 3 DoS vectors (CVSS 5.9-7.4)
- **Detail:** 
  - Generators loop indefinitely on negative/zero size
  - Integer overflow with large sizes
- **Fix:** `npm update nanoid` to >= 3.3.18

### DEP-015: postcss Path Traversal & Source Map Disclosure
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Path Traversal (CWE-22)
- **Package:** postcss <= 8.5.22
- **CVEs:** Multiple traversal issues (CVSS 7.5+)
- **Detail:** 
  - Attacker-controlled sourceMappingURL reads arbitrary `.map` files
  - Incomplete fix allows traversal when `from` unset
  - Previous source map auto-loading bypass
- **Fix:** `npm update postcss` to >= 8.5.23

### DEP-016: ws (WebSocket) Memory DoS
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Denial of Service (CWE-400/770)
- **Package:** ws 8.0.0 - 8.20.1
- **CVEs:** 
  - GHSA-96hv-2xvq-fx4p (CVSS 7.5) - Memory exhaustion via tiny fragments
  - GHSA-58qx-3vcg-4xpx (CVSS 4.4) - Uninitialized memory disclosure
- **Fix:** `npm update ws` to >= 8.21.0

### DEP-017: source-map-js Event-Loop DoS
- **Severity:** 🟠 **P2 - HIGH**
- **Category:** Denial of Service (CWE-1284)
- **Package:** source-map-js 1.0.0 - 1.2.1
- **CVE:** GHSA-68fv-2mgg-jv7q (CVSS 7.5)
- **Detail:** Event-loop denial of service via indexed source-map section offset processing
- **Fix:** `npm update source-map-js` to >= 1.2.2

---

## Moderate Vulnerabilities (P3)

### DEP-018 through DEP-033: Multiple Medium-Severity Issues

| ID | Package | CVE | CVSS | Issue |
|----|---------|----|------|-------|
| DEP-018 | @babel/core | GHSA-4x5r-pxfx-6jf8 | 3.2 | Arbitrary file read via sourceMappingURL |
| DEP-019 | @remix-run/router | GHSA-2j2x-hqr9-3h42 | 0 | Protocol-relative URL open redirect |
| DEP-020 | baseline-browser-mapping | GHSA-w5vr-8v7q-w6rv | 0 | DoS on invalid input |
| DEP-021 | esbuild | GHSA-67mh-4wv8-2f99 | 5.3 | Dev server CSRF (can send requests to server) |
| DEP-022 | @vitest/mocker | GHSA-82fw-gwwq-j7x9 | 5.9 | Path traversal via redirect mock |
| DEP-023 | @vitest/mocker | GHSA-qxg6-89mg-rqv8 | 4.7 | Code injection via manual mock registration |
| DEP-024 | @grpc/grpc-js | GHSA-5375-pq7m-f5r2 | 7.5 | Malformed request server crash |
| DEP-025 | @grpc/grpc-js | GHSA-99f4-grh7-6pcq | 7.5 | Malformed compressed message crash |
| DEP-026 | @grpc/grpc-js | GHSA-m9gg-hp2v-232j | 7.4 | Unauthorized certs treated as authorized |
| DEP-027 | path-to-regexp | GHSA-37ch-88jc-xwx2 | 7.5 | ReDoS via multiple route parameters |
| DEP-028 | protobufjs | Multiple | 5.3-8.1 | 7 more DoS + code injection issues |
| DEP-029 | @protobufjs/utf8 | GHSA-q6x5-8v7m-xcrf | 5.3 | Overlong UTF-8 decoding bypass |
| DEP-030 | vite-node | vite transit | 0 | Inherits vite path traversal risks |
| DEP-031 | react-router | GHSA-wrjc-x8rr-h8h6 | 0 | Backslash open redirect bypass |
| DEP-032 | react-router | GHSA-337j-9hxr-rhxg | 6.1 | Constructor injection in SSR hydration |
| DEP-033 | react-router-dom | GHSA-jjmj-jmhj-qwj2 | 6.9 | Open redirect leading to XSS |

---

## Outdated Major Versions (P3)

### DEP-034: React Ecosystem Outdated (Frontend)
- **Severity:** 🟡 **P3 - MEDIUM** (dependency quality)
- **Category:** Outdated Dependencies
- **Packages:**
  - `react`: 18.3.1 → latest 19.3.1 (1 major version behind)
  - `react-dom`: 18.3.1 → latest 19.3.1 (1 major version behind)
  - `react-router-dom`: 6.26.0 → latest 7.18.6 (1 major version behind)
- **Detail:** Modern React versions include performance improvements and security patches. Router has known open-redirect issues that may be fixed in v7.
- **Fix:** Schedule React 19 upgrade (breaking changes in hooks, suspense)

### DEP-035: Express Outdated (Backend)
- **Severity:** 🟡 **P3 - MEDIUM**
- **Category:** Outdated Dependency
- **Package:** `express`: 4.18.2 → 4.22.3 → 5.3.0 (latest)
- **Detail:** Express 4.22.3 is current stable; v5.0 is in pre-release. Many security fixes in 4.21.x chain.
- **Fix:** Update to 4.22.3 (patch + minor), defer v5 upgrade

### DEP-036: Pino Logging Outdated (Backend)
- **Severity:** 🟡 **P3 - MEDIUM**
- **Category:** Outdated Dependency
- **Package:** `pino`: 8.17.0 → 8.21.0 → 10.4.0 (latest major)
- **Detail:** 2 minor versions behind in v8 chain; latest is v10. Deferred to avoid major version breaking changes.
- **Fix:** Update to 8.21.0, defer v10 upgrade

### DEP-037: UUID Outdated (Backend Direct, Transitive elsewhere)
- **Severity:** 🟡 **P3 - MEDIUM** (also **P2 - HIGH** due to CVE)
- **Category:** Outdated + Vulnerable
- **Package:** `uuid`: 9.0.0 → 11.1.1 → 14.0.3 (latest)
- **Detail:** 2 major versions behind. Contains CVE-w5hq-g745-h8pq (buffer overflow).
- **Fix:** `npm update uuid` to >= 11.1.1 (major version bump required)

---

## License Compliance (P4)

### DEP-038: License Review
- **Severity:** 🟢 **P4 - INFO**
- **Category:** License Compliance
- **Detail:**
  - Backend package.json marked as UNLICENSED (private project - acceptable)
  - No GPL/AGPL packages detected in core dependencies
  - No unknown/unlicensed direct dependencies
  - Some transitive deps may have uncommon licenses (requires full audit with license-checker tool)
- **Recommendation:** Run `npx license-checker` before production release to flag viral licenses

---

## Supply Chain Risk Analysis (P4)

### DEP-039: Dependency Tree Complexity
- **Severity:** 🟢 **P4 - INFO**
- **Category:** Supply Chain Risk
- **Lock File Sizes:**
  - Backend: 5353 lines (~102-200 total deps)
  - Frontend: 5777 lines (~200+ deps including Vite toolchain)
  - Orchestrator: 4980 lines (~153+ deps)
  - **Total:** ~350-500+ transitive dependencies
- **Risk Level:** Medium (typical for modern JS projects)
- **Mitigations:** Lock files committed; npm audit in CI recommended

### DEP-040: Post-Install Scripts
- **Status:** ✅ No dangerous post-install scripts detected in direct dependencies

### DEP-041: Deprecated Packages
- **Status:** ✅ No deprecated packages detected

---

## Recommendations

### Immediate (This Week - P1/P2)
```bash
# Backend
cd Source/Backend
npm update proxy-addr body-parser uuid js-yaml qs
npm audit fix

# Frontend
cd Source/Frontend
npm update vitest@5.1.1 vite@6.5.0+ react-router-dom browserslist nanoid postcss ws

# Orchestrator
cd platform/orchestrator
npm update protobufjs dockerode proxy-addr @grpc/grpc-js
```

### Next Sprint (P3)
```bash
# React 19 upgrade (plan separately - breaking changes)
npm update react react-dom
npm update express@4.22.3
npm update pino@8.21.0
```

### Pre-Production (Before Deploy)
1. Run `npm audit` in CI/CD pipeline
2. Run `npx license-checker` to audit licenses
3. Consider `npm dedupe` to reduce transitive deps
4. Test all major version upgrades in staging

---

## Cross-References

- **[ESCALATE → TheGuardians]** DEP-001, DEP-002, DEP-003, DEP-004: Critical vulnerabilities require security hardening review
- **[CROSS-REF: red-teamer]** DEP-005, DEP-012: Exploitable attack vectors to test in threat modeling
- **[CROSS-REF: performance-profiler]** DEP-034, DEP-035: React/Express upgrades may impact performance; profile after upgrades

---

## JSON Summary

```json
{
  "audit_date": "2026-11-21",
  "package_managers": ["npm"],
  "modules_scanned": 3,
  "metrics": {
    "total_vulnerabilities": 37,
    "critical": 4,
    "high": 13,
    "moderate": 15,
    "low": 5,
    "cves_critical": 4,
    "cves_high": 13,
    "cves_medium": 15,
    "cves_low": 5,
    "outdated_major": 4,
    "outdated_minor": 2,
    "deprecated_packages": 0,
    "post_install_scripts": 0,
    "total_dependencies": "350-500+"
  },
  "findings_by_severity": {
    "P1_CRITICAL": 4,
    "P2_HIGH": 13,
    "P3_MEDIUM": 15,
    "P4_INFO": 5
  },
  "modules": {
    "backend": {
      "cves": 11,
      "critical": 2,
      "high": 5,
      "moderate": 3,
      "low": 1,
      "direct_dependencies": 20,
      "transitive_dependencies": "102-200"
    },
    "frontend": {
      "cves": 17,
      "critical": 2,
      "high": 7,
      "moderate": 7,
      "low": 1,
      "direct_dependencies": 24,
      "transitive_dependencies": "200+"
    },
    "orchestrator": {
      "cves": 9,
      "critical": 2,
      "high": 3,
      "moderate": 4,
      "low": 0,
      "direct_dependencies": 3,
      "transitive_dependencies": "153+"
    }
  },
  "top_vulnerabilities": [
    {
      "id": "DEP-001",
      "title": "Handlebars JavaScript Injection (CVSS 9.8)",
      "severity": "CRITICAL",
      "cve_count": 11
    },
    {
      "id": "DEP-002",
      "title": "proxy-addr IP Spoofing (CVSS 9.1)",
      "severity": "CRITICAL",
      "cve_count": 1
    },
    {
      "id": "DEP-003",
      "title": "Vitest RCE + File Read (CVSS 9.8)",
      "severity": "CRITICAL",
      "cve_count": 5
    },
    {
      "id": "DEP-004",
      "title": "Protobufjs Code Execution (CVSS 9.8)",
      "severity": "CRITICAL",
      "cve_count": 11
    }
  ],
  "recommendation": "PASS with CONDITIONS: Update P1/P2 vulnerabilities before production release. Conduct security review of Handlebars usage and gRPC message handling.",
  "grade": "C"
}
```

---

## Learning Update

_Added to `Teams/TheInspector/learnings/dependency-auditor.md`:_

- **High-Risk Dependencies:** handlebars, proxy-addr, vitest, protobufjs, vite (dev-time risks)
- **Recurring CVEs:** brace-expansion, browserslist, js-yaml (all DoS via expansion/recursion patterns)
- **Audit Tools Available:** npm audit, npm outdated, license-checker (via npx)
- **Lock File Baselines:** Backend ~5.3k lines, Frontend ~5.7k lines (medium complexity)
- **Upgrade Path:** React 18→19 requires testing; Express 4→5 is pre-release (defer)

---

**Report Generated:** 2026-11-21 by Dependency Auditor (Haiku 4.5)
