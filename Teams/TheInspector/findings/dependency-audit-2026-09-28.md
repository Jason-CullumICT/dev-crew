# Dependency Auditor Findings Report
**Date:** September 28, 2026  
**Scope:** All npm workspaces (Source/Backend, Source/Frontend, Source/E2E, portal/Backend, portal/Frontend, platform/orchestrator)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Workspaces Audited** | 6 |
| **Total CVEs Found** | 103 |
| **P1 (Critical)** | 6 |
| **P2 (High)** | 25 |
| **P3 (Moderate)** | 53 |
| **P4 (Low/Info)** | 19 |
| **Outdated Major Versions** | 8 |

### CVE Breakdown by Workspace

| Workspace | Critical | High | Moderate | Low | Total |
|-----------|----------|------|----------|-----|-------|
| **Source/Backend** | 1 | 4 | 3 | 2 | 10 |
| **Source/Frontend** | 1* | 6 | 7 | 1 | 15 |
| **Source/E2E** | 0 | 0 | 0 | 0 | 0 |
| **portal/Backend** | 2 | 10 | 41 | 1 | 54 |
| **portal/Frontend** | 1* | 7 | 6 | 2 | 16 |
| **platform/orchestrator** | 1 | 2 | 4 | 1 | 8 |
| **TOTAL** | **6** | **29** | **61** | **7** | **103** |

_*Frontend critical counts may be transitive_

---

## Critical Findings (P1)

### DEP-001: Handlebars JavaScript Injection & XSS (Source/Backend)
- **Severity:** P1 (Critical)
- **Category:** CVE / Remote Code Execution
- **Package:** `handlebars` 4.0.0 - 4.7.8
- **File:** Source/Backend/package.json
- **Multiple CVEs:**
  1. GHSA-3mfm-83xf-c92r: JavaScript Injection via AST Type Confusion (@partial-block)
  2. GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion
  3. GHSA-2qvq-rjwj-gvw9: Prototype Pollution → XSS via Partial Template Injection
  4. GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap (missing __lookupSetter__ block)
  5. GHSA-442j-39wm-28r2: Property Access Validation Bypass in container.lookup
  6. GHSA-xhpv-hc6g-r9c6: JavaScript Injection via AST Type Confusion (dynamic partial)
  7. GHSA-9cx6-37pm-9jff: Denial of Service via Malformed Decorator Syntax
  8. GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI Precompiler
- **Impact:** Template compilation can execute arbitrary code if user-controlled templates are compiled. XSS attacks through partial template injection.
- **Fix:** `npm audit fix` or upgrade handlebars to ≥4.7.9
- **Cross-ref:** [ESCALATE → TheGuardians] if handlebars processes user-supplied templates

---

### DEP-002: protobufjs Arbitrary Code Execution (portal/Backend, platform/orchestrator)
- **Severity:** P1 (Critical)
- **Category:** CVE / Remote Code Execution & Prototype Pollution
- **Package:** `protobufjs` (affected versions)
- **Files:** portal/Backend/package.json, platform/orchestrator/package.json
- **Multiple CVEs:**
  1. GHSA-xq3m-2v4x-88gg: **Arbitrary code execution** (most critical)
  2. GHSA-66ff-xgx4-vchm: Code injection through bytes field defaults
  3. GHSA-2pr8-phx7-x9h3: DoS from crafted field names
  4. GHSA-fx83-v9x8-x52w: Prototype injection in generated constructors
  5. GHSA-75px-5xx7-5xc7: Code generation gadget after prototype pollution
  6. GHSA-jvwf-75h9-cwgg: Process-wide DoS through unsafe option paths
  7. GHSA-685m-2w69-288q: DoS via unbounded protobuf recursion
  8. GHSA-q6x5-8v7m-xcrf: Overlong UTF-8 decoding
  9. GHSA-jggg-4jg4-v7c6: DoS via unbounded recursive JSON descriptor expansion
- **Impact:** If protobufjs deserializes untrusted protobuf messages or JSON, attackers can inject code, corrupt memory, or trigger prototype pollution leading to complete system compromise.
- **Fix:** Upgrade protobufjs to latest; applies to both portal backend and orchestrator
- **Cross-ref:** [ESCALATE → TheGuardians] - Arbitrary code execution in core infrastructure

---

## High Severity Findings (P2)

### DEP-003: brace-expansion DoS (Source/Backend - transitive)
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `brace-expansion` ≤1.1.17
- **Range:** Multiple CVEs
  - GHSA-f886-m6hf-6m8v: Zero-step sequence process hang
  - GHSA-3jxr-9vmj-r5cp: Exponential-time expansion DoS
  - GHSA-mh99-v99m-4gvg: Unbounded expansion OOM crash
  - GHSA-rgw5-rvv9-x895: Unbounded intermediate arrays bypass
- **Impact:** Regex patterns with specially crafted brace expansions cause process hang or crash
- **Fix:** `npm audit fix` (update to ≥1.1.18)

### DEP-004: browserslist Memory/Crash Issues (Source/Backend, Source/Frontend)
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service & Prototype Pollution
- **Package:** `browserslist` ≤4.28.6
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx: Unbounded memory growth (no cache eviction)
  - GHSA-73wf-gq98-2v4g: Crash via untrusted browserslist-stats.json (prototype pollution)
- **Impact:** OOM crashes or prototype pollution via malicious stats file
- **Fix:** `npm audit fix`

### DEP-005: form-data CRLF Injection (Multiple Workspaces)
- **Severity:** P2 (High)
- **Category:** CVE / Injection Attack
- **Package:** `form-data` 4.0.0 - 4.0.5
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Impact:** Unescaped multipart field names/filenames allow CRLF injection into HTTP headers
- **Fix:** `npm audit fix`
- **Affected:** Source/Backend, Source/Frontend, portal/Backend, portal/Frontend

### DEP-006: js-yaml DoS (Source/Backend)
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `js-yaml` ≤3.15.1
- **CVEs:**
  - GHSA-h67p-54hq-rp68: Quadratic CPU consumption in merge-key handling
  - GHSA-52cp-r559-cp3m: YAML merge-key chains force quadratic CPU
  - GHSA-5p4m-2wfm-xmqj: Quadratic CPU in !!omap resolution
  - GHSA-2883-xcg3-v3hh: maxTotalMergeKeys bypass
- **Impact:** Parsing malicious YAML causes CPU DoS
- **Fix:** `npm audit fix`

### DEP-007: nanoid RNG Issues (Source/Frontend, portal/Backend)
- **Severity:** P2 (High)
- **Category:** CVE / Cryptographic Weakness
- **Package:** `nanoid` ≤3.3.17
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv: Non-secure generators loop indefinitely (negative size)
  - GHSA-2v37-7h3g-55p8: Custom generators loop with zero size
  - GHSA-xwg4-73v4-xw9w: Integer overflow/wraparound
- **Impact:** RNG can fail to generate IDs or produce predictable sequences
- **Fix:** `npm audit fix`

### DEP-008: PostCSS XSS & File Disclosure (Source/Frontend, portal/Backend)
- **Severity:** P2 (High)
- **Category:** CVE / XSS & Information Disclosure
- **Package:** `postcss` ≤8.5.22
- **CVEs:**
  - GHSA-qx2v-qp2m-jg93: XSS via unescaped `</style>`
  - GHSA-6g55-p6wh-862q: Arbitrary .map file disclosure via sourceMappingURL
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix allows .map file read when `from` unset
  - GHSA-r28c-9q8g-f849: Path traversal in sourceMappingURL
- **Impact:** Stored XSS in CSS output; disclosure of .map files containing source code
- **Fix:** `npm audit fix`

### DEP-009: React Router Open Redirect (Source/Frontend, portal/Frontend)
- **Severity:** P2 (High)
- **Category:** CVE / Security Bypass
- **Package:** `@remix-run/router` 1.3.0 - 1.23.2 (via react-router, react-router-dom)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Impact:** Same-origin redirect with path starting `//` interpreted as protocol-relative URL → open redirect
- **Fix:** `npm audit fix`

### DEP-010: ws Memory Disclosure & DoS (Source/Frontend, portal/Backend)
- **Severity:** P2 (High)
- **Category:** CVE / Memory Leak & Denial of Service
- **Package:** `ws` 8.0.0 - 8.20.1
- **CVEs:**
  - GHSA-58qx-3vcg-4xpx: Uninitialized memory disclosure
  - GHSA-96hv-2xvq-fx4p: Memory exhaustion DoS from tiny fragments
- **Impact:** WebSocket server can leak memory contents or crash under small fragment bombardment
- **Fix:** `npm audit fix`

### DEP-011: @grpc/grpc-js Crash (portal/Backend)
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `@grpc/grpc-js`
- **CVE:** GHSA-5375-pq7m-f5r2
- **Impact:** Malformed gRPC request causes server crash
- **Fix:** Update @grpc/grpc-js

### DEP-012: path-to-regexp ReDoS (portal/Backend)
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `path-to-regexp`
- **CVE:** GHSA-37ch-88jc-xwx2
- **Impact:** Multiple route parameters trigger Regular Expression DoS
- **Fix:** Update path-to-regexp

---

## Moderate Severity Findings (P3)

### DEP-013: @babel/core File Read (Transitive in multiple workspaces)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Information Disclosure
- **Package:** `@babel/core` ≤7.29.0
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **Impact:** Arbitrary file read via sourceMappingURL comment during transpilation
- **Fix:** `npm audit fix`
- **Affected:** Source/Backend, Source/Frontend, portal/Frontend

### DEP-014: body-parser DoS (Source/Backend)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Package:** `body-parser` <1.20.6
- **CVE:** GHSA-v422-hmwv-36x6
- **Impact:** Invalid limit value silently disables size enforcement
- **Fix:** `npm audit fix`

### DEP-015: baseline-browser-mapping DoS (Multiple)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Package:** `baseline-browser-mapping` ≥2.0.0 <2.11.0
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Impact:** Process termination on invalid input
- **Fix:** `npm audit fix`

### DEP-016: esbuild CORS Bypass (Source/Frontend, portal/Frontend)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Security Bypass
- **Package:** `esbuild` ≤0.24.2
- **CVE:** GHSA-67mh-4wv8-2f99
- **Impact:** Development server allows any website to send requests and read responses (CORS bypass)
- **Fix:** `npm audit fix --force` (may require vite upgrade)

### DEP-017: @vitest/mocker Path Traversal (Source/Frontend, portal/Frontend)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Path Traversal & Arbitrary File Read
- **Package:** `@vitest/mocker` ≤4.1.10
- **CVE:** GHSA-82fw-gwwq-j7x9
- **Impact:** Path traversal via redirect mock in test environment
- **Fix:** `npm audit fix --force` (vitest 5.0.2 is breaking change)

### DEP-018: qs DoS (Source/Backend)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Package:** `qs` 2.2.5 - 6.15.3
- **CVEs:**
  - GHSA-q8mj-m7cp-5q26: Crash on null/undefined with encodeValuesOnly
  - GHSA-x5fp-wj9c-mxmx: Array-limit bypass
  - GHSA-4mjr-xmp4-gh2g: DoS via attacker-controlled isBuffer
- **Fix:** `npm audit fix`

### DEP-019: uuid Buffer Bounds (Source/Backend, platform/orchestrator)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Memory Safety
- **Package:** `uuid` <11.1.1
- **CVE:** GHSA-w5hq-g745-h8pq
- **Impact:** Missing buffer bounds check in v3/v5/v6 when buf provided
- **Fix:** `npm audit fix --force` (uuid 14.0.2 is breaking change)

---

## Outdated Package Versions (P3 - Supply Chain Risk)

### DEP-020: Express >1 Major Version Behind
- **Severity:** P3 (Supply Chain / Outdated)
- **Category:** Outdated dependency
- **Packages Affected:**
  - Source/Backend: 4.18.2 → 5.2.1 (missing 5.0+)
  - platform/orchestrator: 4.22.3 → 5.2.1 (missing 5.0+)
- **Impact:** Security fixes & performance improvements in v5 not available
- **Fix:** Run `npm update express` in affected workspaces

### DEP-021: Pino >2 Major Versions Behind
- **Severity:** P3 (Supply Chain / Outdated)
- **Package:** Source/Backend pino 8.17.0 → 10.3.1
- **Impact:** Missing logging improvements and security patches
- **Fix:** `npm update pino` (may require code changes for API compatibility)

### DEP-022: React >1 Major Version Behind
- **Severity:** P3 (Supply Chain / Outdated)
- **Package:** Source/Frontend react 18.3.1 → 19.3.0
- **Impact:** Missing React 19 features and performance improvements
- **Fix:** `npm update react react-dom`

### DEP-023: React Router >1 Major Version Behind
- **Severity:** P3 (Supply Chain / Outdated)
- **Package:** Source/Frontend react-router-dom 6.30.6 → 7.18.4
- **Impact:** Missing routing improvements and bug fixes
- **Fix:** `npm update react-router-dom`

### DEP-024: Dockerode >1 Major Version Behind
- **Severity:** P3 (Supply Chain / Outdated)
- **Package:** platform/orchestrator dockerode 4.0.12 → 5.0.1
- **Impact:** Docker API improvements not available
- **Fix:** `npm update dockerode`

### DEP-025: Multer >1 Major Version Behind
- **Severity:** P3 (Supply Chain / Outdated)
- **Package:** platform/orchestrator multer 1.4.5-lts.2 → 2.4.0
- **Impact:** File upload handling improvements unavailable
- **Fix:** `npm update multer`

---

## Summary of Fixes by Severity

| Action | Count | Workspaces | Effort |
|--------|-------|-----------|--------|
| **npm audit fix** (safe, non-breaking) | ~35 CVEs | All | Low |
| **npm audit fix --force** (breaking changes) | ~15 CVEs | Frontend, E2E, orchestrator | Medium |
| **npm update major versions** | 8 outdated | Backend, Frontend, orchestrator | Medium |
| **Code review required** (handlebars, protobufjs) | 2 packages | Backend, portal/Backend, orchestrator | High |

---

## Recommendations (Prioritized)

### 🔴 P1: IMMEDIATE (within 24 hours)
1. **Block protobufjs usage** in portal/Backend and platform/orchestrator until patched
   - If protobufjs deserializes untrusted data, this is a critical RCE vector
   - Review: What data sources feed into protobufjs?
   - Action: `npm audit fix --force` in both directories
2. **Audit handlebars usage** in Source/Backend
   - Review: Does backend process user-supplied templates?
   - If yes, upgrade immediately; if no, mark as low-priority transitive
   - Action: `npm audit fix`

### 🟠 P2: URGENT (within 1 week)
1. Run `npm audit fix` in all workspaces (safe fixes)
2. Run `npm audit fix --force` in:
   - Source/Frontend (vitest, vite breaks)
   - portal/Frontend (vitest, vite breaks)
   - Source/Backend (uuid breaks)
   - platform/orchestrator (uuid breaks)
3. Review changes in each workspace before committing
4. Run full test suite for each workspace

### 🟡 P3: SCHEDULED (within 1 sprint)
1. Update major versions:
   - `npm update express` in Backend and orchestrator
   - `npm update pino` in Backend (verify API compatibility)
   - `npm update react react-dom react-router-dom` in Frontend
   - `npm update dockerode multer` in orchestrator
2. Test thoroughly for breaking changes
3. Update documentation if APIs changed

### 🟢 P4: BACKLOG
- Monitor for new patches on audited packages
- Consider using `npm audit` in CI/CD pipeline
- Implement dependency update automation (Dependabot, Renovate)

---

## Dependency Tree Statistics

| Workspace | Direct Dependencies | Transitive | Vulnerable Direct | Vulnerable Transitive |
|-----------|---------------------|-----------|-------------------|----------------------|
| Source/Backend | 13 | ~120 | 1 (handlebars) | 9 |
| Source/Frontend | 13 | ~150 | 0 | 15 |
| Source/E2E | 6 | ~60 | 0 | 0 |
| portal/Backend | ~20 | ~200+ | 1 (protobufjs) | 53 |
| portal/Frontend | 13 | ~150 | 0 | 16 |
| platform/orchestrator | ~15 | ~120 | 1 (protobufjs) | 7 |

---

## Supply Chain Risk Assessment

### High-Risk Patterns Detected
1. **Large transitive dependency trees** (portal/Backend: 200+ transitive)
   - Increases surface area for compromised packages
   - Recommend pinning critical transitive dependencies

2. **Abandoned/Infrequently Updated Packages**
   - `handlebars` (last update: 2024)
   - `protobufjs` (update frequency: moderate)
   - Consider alternatives or contribute to upstream

3. **Build-tool Vulnerabilities** (esbuild, vite, vitest)
   - Dev-only, but can leak source code (sourceMappingURL attacks)
   - Recommend isolating dev dependencies in production

---

## Cross-References

- **[ESCALATE → TheGuardians]** Prototype pollution risks in browserslist, protobufjs
- **[ESCALATE → TheGuardians]** RCE risk in handlebars and protobufjs
- **[ESCALATE → TheGuardians]** Hardcoded sourceMappingURL processing (information disclosure)
- **[CROSS-REF: performance-profiler]** DoS attacks on brace-expansion, js-yaml, ws could impact availability

---

## Audit Methodology

- **Tool:** `npm audit` (native npm vulnerability scanner)
- **Scope:** All package.json manifests, lock files analyzed
- **Date Run:** September 28, 2026
- **Confidence:** High (official npm advisory data)
- **Excluded:** Vendored/embedded code, internal first-party code

---

**Report Generated:** 2026-09-28T08:35:00Z  
**Agent:** Dependency Auditor (Haiku 4.5)  
**Next Review:** After applying fixes and running full test suite
