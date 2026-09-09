# Dependency Audit Report
**Date:** 2026-09-09  
**Agent:** Dependency Auditor (haiku)  
**Status:** COMPLETED

---

## Executive Summary

### Package Managers Detected
- **npm** (JavaScript/Node.js)
  - Source/Backend
  - Source/Frontend
  - Source/E2E
  - platform/orchestrator

### Dependency Overview

| Module | Direct Deps | Transitive Deps | Vulnerabilities |
|--------|-------------|-----------------|-----------------|
| Source/Backend | 4 | ~411 | 10 (1 critical, 4 high, 3 moderate, 2 low) |
| Source/Frontend | 3 | ~230 | 15 (1 critical, 6 high, 7 moderate, 1 low) |
| Source/E2E | 4 | ~4 | 0 |
| platform/orchestrator | ? | ~155 | 8 (1 critical, 2 high, 4 moderate, 1 low) |

### Severity Summary
- **CRITICAL:** 3 vulnerabilities (handlebars, vitest, protobufjs)
- **HIGH:** 12 vulnerabilities (brace-expansion, browserslist, form-data, js-yaml, nanoid, postcss, vite, ws, @grpc/grpc-js, path-to-regexp)
- **MODERATE:** 14 vulnerabilities
- **LOW:** 4 vulnerabilities

---

## Critical Findings (P1)

### DEP-001: Handlebars.js JavaScript Injection
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars (transitive, affects Backend)
- **Module:** Source/Backend
- **Vulnerability:** JavaScript Injection via AST Type Confusion by tampering @partial-block
- **Issue ID:** GHSA-3mfm-83xf-c92r
- **Affected Range:** 4.0.0 - 4.7.8
- **URL:** https://github.com/advisories/GHSA-3mfm-83xf-c92r
- **Fix:** Update handlebars to ≥4.7.9
- **Risk:** If handlebars is used for template processing with untrusted input, arbitrary code execution is possible
- **Cross-ref:** [CROSS-REF: red-teamer] — Code execution risk if templates accept user input

### DEP-002: Vitest Path Traversal / Arbitrary File Read
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest@2.0.5 (direct dependency, Frontend)
- **Module:** Source/Frontend
- **Vulnerability:** Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock
- **Issue ID:** GHSA-82fw-gwwq-j7x9
- **Affected Range:** >=2.1.0 <4.1.11
- **URL:** https://github.com/advisories/GHSA-82fw-gwwq-j7x9
- **CVSS:** 5.9 (Medium exploitability)
- **Fix:** Update vitest to ≥4.1.11 OR ≥5.0.0 (semver major bump)
- **Risk:** Test environment can leak files outside project root
- **Impact:** Development-time risk; doesn't affect production but could expose source code

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** protobufjs (transitive, affects Orchestrator)
- **Module:** platform/orchestrator
- **Vulnerability:** Arbitrary code execution in protobufjs
- **Issue ID:** GHSA-xq3m-2v4x-88gg
- **Affected Range:** <=7.6.4
- **URL:** https://github.com/advisories/GHSA-xq3m-2v4x-88gg
- **Fix:** Update protobufjs to >=7.6.5
- **Risk:** If protobufjs processes untrusted .proto files, arbitrary code execution is possible
- **Cross-ref:** [CROSS-REF: red-teamer] — Check gRPC message processing for untrusted input

---

## High Priority Findings (P2)

### DEP-004: Vite Path Traversal in Optimized Deps
- **Severity:** P2 (HIGH + DIRECT)
- **Category:** cve
- **Package:** vite@5.4.0 (direct dependency, Frontend)
- **Module:** Source/Frontend
- **Vulnerability:** Path Traversal in Optimized Deps `.map` Handling
- **Issue ID:** GHSA-4w7w-66w2-5vf9
- **Affected Range:** <=6.4.2 (current: 5.4.0 is affected)
- **URL:** https://github.com/advisories/GHSA-4w7w-66w2-5vf9
- **Fix:** Update vite to ≥5.5.3 OR ≥6.4.3
- **Risk:** Development server path traversal; could leak source files
- **Timeline:** Update immediately

### DEP-005: Brace-expansion Denial of Service
- **Severity:** P2 (HIGH, transitive)
- **Category:** cve
- **Package:** brace-expansion (transitive via npm tooling, Backend)
- **Module:** Source/Backend
- **Vulnerability:** Zero-step sequence causes process hang and memory exhaustion
- **Issue ID:** GHSA-f886-m6hf-6m8v
- **Affected Range:** <=1.1.17
- **URL:** https://github.com/advisories/GHSA-f886-m6hf-6m8v
- **Fix:** Update to >=1.1.18
- **Risk:** Build tools or CLI parsing could be DoS'd with crafted patterns
- **Impact:** Moderate; affects build pipeline

### DEP-006: Browserslist Unbounded Memory Growth
- **Severity:** P2 (HIGH, affects 2 modules)
- **Category:** cve
- **Package:** browserslist (transitive)
- **Modules:** Source/Backend, Source/Frontend
- **Vulnerability:** Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM
- **Issue ID:** GHSA-c83g-rgw3-j3cx
- **Affected Range:** <=4.28.6
- **URL:** https://github.com/advisories/GHSA-c83g-rgw3-j3cx
- **Fix:** Update to >=4.28.7
- **Risk:** Memory exhaustion attack if browser query processing accepts untrusted input
- **Impact:** Dev tools + build time

### DEP-007: Form-data CRLF Injection
- **Severity:** P2 (HIGH, affects 2 modules)
- **Category:** cve
- **Package:** form-data (transitive)
- **Modules:** Source/Backend, Source/Frontend
- **Vulnerability:** CRLF injection in form-data via unescaped multipart field names and filenames
- **Issue ID:** GHSA-hmw2-7cc7-3qxx
- **Affected Range:** 4.0.0 - 4.0.5
- **URL:** https://github.com/advisories/GHSA-hmw2-7cc7-3qxx
- **Fix:** Update to >=4.0.6
- **Risk:** HTTP Request Smuggling if multipart forms accept untrusted field names
- **Impact:** Moderate if HTTP client processes user input for form fields

### DEP-008: @grpc/grpc-js Server Crash (DoS)
- **Severity:** P2 (HIGH, Orchestrator)
- **Category:** cve
- **Package:** @grpc/grpc-js (transitive)
- **Module:** platform/orchestrator
- **Vulnerability:** Malformed request can cause server crash + Malformed compressed message causes client/server crash
- **Issue IDs:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq
- **Affected Range:** 1.14.0 - 1.14.3
- **URL:** https://github.com/advisories/GHSA-5375-pq7m-f5r2
- **CVSS:** 7.5 (AV:N/AC:L - Network-accessible DoS)
- **Fix:** Update to >=1.14.4
- **Risk:** Orchestrator can crash if gRPC clients send malformed messages
- **Cross-ref:** [CROSS-REF: chaos-monkey] — Test malformed gRPC payloads

---

## Moderate Priority Findings (P3)

### DEP-009: JS-YAML Quadratic Complexity DoS
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** js-yaml (transitive)
- **Module:** Source/Backend
- **Vulnerability:** Quadratic-complexity DoS in merge key handling via repeated aliases
- **Issue ID:** GHSA-h67p-54hq-rp68
- **Affected Range:** <=3.15.1
- **URL:** https://github.com/advisories/GHSA-h67p-54hq-rp68
- **Fix:** Update to >=3.15.2
- **Risk:** YAML parsing DoS if untrusted YAML is processed

### DEP-010: Nanoid Non-secure Generator Loop
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** nanoid (transitive, Frontend)
- **Module:** Source/Frontend
- **Vulnerability:** Non-secure generators can loop indefinitely with negative size
- **Issue ID:** GHSA-28wg-ghj8-5hjv
- **Affected Range:** <=3.3.17
- **URL:** https://github.com/advisories/GHSA-28wg-ghj8-5hjv
- **Fix:** Update to >=3.3.18
- **Risk:** If nanoid is called with invalid/negative size, infinite loop possible

### DEP-011: PostCSS XSS via Unescaped </style>
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** postcss (transitive, Frontend)
- **Module:** Source/Frontend
- **Vulnerability:** XSS via Unescaped </style> in CSS Stringify Output
- **Issue ID:** GHSA-qx2v-qp2m-jg93
- **Affected Range:** <=8.5.22
- **URL:** https://github.com/advisories/GHSA-qx2v-qp2m-jg93
- **Fix:** Update to >=8.5.23
- **Risk:** If CSS is generated from user input and embedded without escaping

### DEP-012: Path-to-regexp ReDoS
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** path-to-regexp (transitive, Orchestrator)
- **Module:** platform/orchestrator
- **Vulnerability:** Regular Expression Denial of Service via multiple route parameters
- **Issue ID:** GHSA-37ch-88jc-xwx2
- **Affected Range:** <0.1.13
- **URL:** https://github.com/advisories/GHSA-37ch-88jc-xwx2
- **Fix:** Update to >=0.1.13
- **Risk:** Route parsing DoS if untrusted route patterns are accepted

### DEP-013: WebSocket (ws) Possible DoS
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** ws (transitive, Frontend)
- **Module:** Source/Frontend
- **Vulnerability:** Details pending — high severity flag in audit
- **Fix:** Update to latest
- **Risk:** WebSocket server DoS

### DEP-014: Baseline-browser-mapping Process Termination
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** baseline-browser-mapping (transitive, Backend)
- **Module:** Source/Backend
- **Vulnerability:** Process termination on invalid input causes denial of service
- **Issue ID:** GHSA-w5vr-8v7q-w6rv
- **Affected Range:** >=2.0.0 <2.11.0
- **URL:** https://github.com/advisories/GHSA-w5vr-8v7q-w6rv
- **Fix:** Update to >=2.11.0
- **Risk:** Build tool crash if invalid browser query

### DEP-015: Body-parser Limit Bypass
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** body-parser (transitive)
- **Modules:** Source/Backend, Source/Frontend
- **Vulnerability:** Vulnerable to denial of service when invalid limit value silently disables size enforcement
- **Issue ID:** GHSA-v422-hmwv-36x6
- **Affected Range:** <1.20.6
- **URL:** https://github.com/advisories/GHSA-v422-hmwv-36x6
- **Fix:** Update to >=1.20.6
- **Risk:** Request size limits could be bypassed if body-parser is misconfigured

### DEP-016: @vitest/mocker Path Traversal (test-time)
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** @vitest/mocker (transitive, Frontend)
- **Module:** Source/Frontend
- **Vulnerability:** Path Traversal / Arbitrary File Read
- **Issue ID:** GHSA-82fw-gwwq-j7x9
- **Affected Range:** >=2.1.0 <4.1.11
- **URL:** https://github.com/advisories/GHSA-82fw-gwwq-j7x9
- **Fix:** Update vitest to >=5.0.0

### DEP-017: @remix-run/router Open Redirect
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** @remix-run/router (affects react-router-dom, Frontend)
- **Module:** Source/Frontend
- **Vulnerability:** Same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation
- **Issue ID:** GHSA-2j2x-hqr9-3h42
- **Affected Range:** 1.3.0 - 1.23.2
- **URL:** https://github.com/advisories/GHSA-2j2x-hqr9-3h42
- **Fix:** Update react-router-dom to use @remix-run/router >=1.23.3
- **Risk:** Redirect validation bypass if URL parameters accepted from untrusted source

---

## Low Priority Findings (P4)

### DEP-018: @babel/core Arbitrary File Read
- **Severity:** P4 (LOW)
- **Category:** cve
- **Package:** @babel/core (transitive)
- **Modules:** Source/Backend, Source/Frontend
- **Vulnerability:** Arbitrary File Read via sourceMappingURL Comment
- **Issue ID:** GHSA-4x5r-pxfx-6jf8
- **Affected Range:** <=7.29.0
- **URL:** https://github.com/advisories/GHSA-4x5r-pxfx-6jf8
- **CVSS:** 3.2 (Low; local access required)
- **Fix:** Update to >=7.30.0

---

## Outdated Major Versions (P3)

The following dependencies are **1+ major version behind** their latest release:

### Backend
```
express:        4.18.2 -> 5.2.1      (1 major behind)
pino:           8.17.0 -> 10.3.1     (2 majors behind) [missing security patches]
uuid:           9.0.0  -> 14.0.2     (5 majors behind)
```

### Frontend
```
react:          18.3.1 -> 19.2.8     (1 major behind)
react-dom:      18.3.1 -> 19.2.8     (1 major behind)
react-router-dom: 6.26.0 -> 7.18.3  (1 major behind)
```

**Recommendation:** 
- React upgrade should be tested thoroughly (breaking changes likely)
- Express upgrade requires careful migration (breaking API changes)
- Pino upgrade (2 majors) should be prioritized for security updates

---

## Dependency Tree Size

| Module | Total Deps | Supply Chain Risk |
|--------|-----------|------------------|
| Source/Backend | ~411 | **MODERATE** — large transitive tree |
| Source/Frontend | ~230 | **MODERATE** — build tool dependencies bloat |
| platform/orchestrator | ~155 | **LOW-MODERATE** |
| Source/E2E | ~4 | **LOW** |

**Findings:**
- Backend has very large dependency tree (411 transitive)
- Frontend has moderate tree but includes dev tools (vite, vitest, etc.)
- No >500 transitive deps threshold exceeded, but still significant supply chain surface

---

## License Compliance

**Status:** No GPL/AGPL licenses detected. No License compliance issues flagged.

All modules use standard permissive licenses (MIT, Apache-2.0, ISC, BSD).

---

## Supply Chain Risks

### Post-Install Scripts
- ✅ **NONE DETECTED** — No `scripts.postinstall` in any module

### Known Risks
1. **Large transitive tree in Backend** — increase likelihood of downstream CVE
2. **Direct dependency on vite (Frontend)** — must stay updated (build-time code)
3. **Direct dependency on vitest (Frontend)** — test-time sandbox escape possible

---

## Dependency Audit Summary

| Category | Count | Severity |
|----------|-------|----------|
| Critical CVEs (P1) | 3 | **MUST FIX** |
| High CVEs (P2) | 12 | **MUST FIX SOON** |
| Moderate CVEs (P3) | 14 | Fix in next release |
| Low CVEs (P4) | 4 | Fix when convenient |
| Outdated Major Versions | 6 | Plan upgrades |
| **TOTAL FINDINGS** | **39** | |

---

## Recommended Action Plan

### Immediate (This Sprint)
1. **Update Frontend vite** to >=5.5.3 (DEP-004: path traversal in dev)
2. **Update Backend handlebars** to >=4.7.9 (DEP-001: code execution) OR audit usage
3. **Update Orchestrator protobufjs** to >=7.6.5 (DEP-003: code execution)
4. **Update Orchestrator @grpc/grpc-js** to >=1.14.4 (DEP-008: DoS)

### This Week
5. **Update Frontend vitest** to >=5.0.0 (DEP-002: arbitrary file read in tests)
6. **Update all modules browserslist** to >=4.28.7 (DEP-006: OOM)
7. **Update all modules form-data** to >=4.0.6 (DEP-007: CRLF injection)

### Next Sprint
8. Plan **React major upgrade** (18.x -> 19.x)
9. Plan **Express major upgrade** (4.x -> 5.x)
10. Audit **pino upgrade path** (8.x -> 10.x)

---

## Cross-Team Escalations

- **[CROSS-REF: TheGuardians]** — DEP-001, DEP-003 (code execution risks) require threat modeling
- **[CROSS-REF: red-teamer]** — Verify gRPC message handling (protobufjs, @grpc/grpc-js)
- **[CROSS-REF: chaos-monkey]** — Test malformed gRPC payloads, YAML parsing DoS
- **[CROSS-REF: quality-oracle]** — Test React/Express major upgrades for breaking changes

---

## Audit Tools Status

- ✅ npm audit — working (npm 10.x)
- ❌ npm audit --fix — not run (requires approval)
- ⚠️ No lock file freezing in place — recommend pre-commit hook

---

## Notes for Next Audit

1. **Handlebars usage:** Check if backend actually uses handlebars templating. If not, may be transitive only.
2. **gRPC production usage:** Verify orchestrator uses gRPC; if so, prioritize @grpc/grpc-js update.
3. **Vite in production:** Frontend dev tool; build artifacts should be safe, but dev server vulnerable.
4. **Post-install scripts:** Continue monitoring for supply chain risks.

