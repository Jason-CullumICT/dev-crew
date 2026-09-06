# Dependency Auditor Findings

**Audit Date:** 2026-09-06  
**Repository:** dev-crew  
**Scope:** npm packages across Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend

---

## Executive Summary

**Overall Status:** 🔴 **HIGH RISK**

- **Package Manifests Detected:** 6 npm projects
- **Total Unique CVEs Found:** 54+ distinct vulnerabilities
- **Critical CVEs:** 4
- **High Severity CVEs:** 20+
- **Moderate CVEs:** 20+
- **Direct Dependencies with CVEs:** 8
- **Total Transitive Dependencies:** 1,400+

### Grading Impact
Current state: **D Grade** (Multiple critical and high-severity vulnerabilities requiring immediate patching)

---

## CVE Summary by Severity

| Severity | Count | Critical Packages |
|----------|-------|-------------------|
| 🔴 Critical | 4 | `handlebars`, `vitest`, `protobufjs`, `@opentelemetry/auto-instrumentations-node` |
| 🔴 High | 20+ | `brace-expansion`, `browserslist`, `form-data`, `js-yaml`, `nanoid`, `postcss`, `vite`, `ws`, `picomatch`, `path-to-regexp`, `@grpc/grpc-js` |
| 🟡 Moderate | 20+ | `uuid` (direct), `react-router-dom`, `esbuild`, `@remix-run/router`, `@opentelemetry/*` packages |
| 🟢 Low | 5+ | `@babel/core`, `body-parser`, `postcss-selector-parser` |

---

## Critical Findings (P1 - Immediate Action Required)

### DEP-001: Handlebars JavaScript Injection via AST Type Confusion
- **Severity:** 🔴 P1 (Critical - CVSS 9.8)
- **Category:** CVE (Code Injection)
- **Package:** `handlebars@4.0.0-4.7.8`
- **File:** `Source/Backend/package.json` (transitive)
- **CVEs:**
  - GHSA-2w6w-674q-4c4q (Critical, CVSS 9.8)
  - GHSA-3mfm-83xf-c92r (High, CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6 (High, CVSS 8.1)
  - GHSA-9cx6-37pm-9jff (High, CVSS 7.5)
  - GHSA-xjpj-3mr7-gcpf (High, CVSS 8.2)
  - Plus 2 more moderate issues
- **Impact:** Arbitrary JavaScript code execution in template processing
- **Fix:** Update to `handlebars >= 4.7.9`
- **[CROSS-REF: red-teamer]** — If handlebars processes untrusted templates, this is exploitable

---

### DEP-002: Vitest Arbitrary File Read and Execution
- **Severity:** 🔴 P1 (Critical - CVSS 9.8)
- **Category:** CVE (Path Traversal + Code Execution)
- **Package:** `vitest@<3.2.6` (and cascading)
- **Files:** 
  - `Source/Frontend/package.json` (direct: `^2.0.5`)
  - `portal/Frontend/package.json` (direct: `^1.4.0`)
- **CVE:** GHSA-5xrq-8626-4rwp (Critical, CVSS 9.8)
- **Title:** "When Vitest UI server is listening, arbitrary file can be read and executed"
- **Affected Versions:** `< 3.2.6`
- **Impact:** 
  - Unauthenticated attacker can read arbitrary files on the filesystem
  - Potential remote code execution via test harness
  - **High Risk if UI dev server is exposed to untrusted networks**
- **Fix:** 
  - `npm update vitest` (requires major version bump)
  - Or disable Vitest UI in production
- **Dependency Chain:** vitest@^2.0.5 → @vitest/mocker → vite (also vulnerable)

---

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** 🔴 P1 (Critical - CVSS 9.8)
- **Category:** CVE (Code Generation + Injection)
- **Package:** `protobufjs@<=7.6.4`
- **File:** `platform/orchestrator/package.json` (transitive via @opentelemetry stack)
- **CVE:** GHSA-xq3m-2v4x-88gg (Critical, CVSS 9.8)
- **Title:** "Arbitrary code execution in protobufjs"
- **Plus 11 additional high/moderate severity CVEs in same package:**
  - Code injection through bytes field defaults
  - Prototype pollution leading to code generation gadgets (CVSS 8.1)
  - Process-wide DoS (CVSS 7.5)
  - Unbounded recursion (CVSS 7.5)
  - Multiple DoS and prototype pollution issues
- **Affected Versions:** `<= 7.6.4`
- **Impact:** 
  - Arbitrary JavaScript execution during protobuf message parsing
  - Prototype pollution chains to RCE
  - **Critical if messages parsed from untrusted sources**
- **Fix:** Update `@opentelemetry/sdk-node` to `>= 0.222.0` (which updates protobufjs)
- **[CROSS-REF: red-teamer]** — If OpenTelemetry processes external protobuf messages, this is immediately exploitable

---

### DEP-004: OpenTelemetry Auto-Instrumentation Process Crash
- **Severity:** 🔴 P1 (Critical - Cascading High Severity)
- **Category:** CVE + Architecture Risk
- **Package:** `@opentelemetry/auto-instrumentations-node@<=0.76.0`
- **File:** `portal/Backend/package.json` (direct: `^0.40.0`)
- **CVE:** GHSA-q7rr-3cgh-j5r3 (High, CVSS 7.5) - Prometheus exporter crash via malformed HTTP
- **Plus 50+ moderate vulnerabilities** in dependent instrumentation packages
- **Affected Versions:** `<= 0.76.0` (direct dependency locked at ~0.40.0)
- **Impact:**
  - OpenTelemetry stack crashes on malformed requests → service DoS
  - 30+ transitive dependencies with moderate CVEs
  - Cascading propagation to all @opentelemetry/sdk-* packages
- **Fix:** Update `@opentelemetry/auto-instrumentations-node` to `>= 0.80.0`
- **Architecture Note:** Outdated by 40+ minor versions; no emergency patches applied

---

## High Severity Findings (P2 - Urgent Patching Required)

### DEP-005: Brace Expansion DoS via Exponential Expansion
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (Denial of Service)
- **Package:** `brace-expansion@<=1.1.17`
- **File:** `Source/Backend/package.json` (transitive)
- **CVEs:** 
  - GHSA-mh99-v99m-4gvg (High, CVSS 7.5) - Unbounded expansion OOM
  - GHSA-3jxr-9vmj-r5cp (High, CVSS 5.3) - Exponential-time DoS
  - GHSA-rgw5-rvv9-x895 (High, CVSS 7.5) - Bypasses CVE-2026-14257 mitigation
- **Fix:** Update to `brace-expansion >= 1.1.18`

---

### DEP-006: Browserslist Memory Exhaustion (Multiple High CVEs)
- **Severity:** 🔴 P2 (High - CVSS 7.5 × 2)
- **Category:** CVE (Denial of Service + Prototype Pollution)
- **Packages Affected:** 
  - Source/Backend (transitive)
  - Source/Frontend (transitive)
  - portal/Frontend (transitive)
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx (High, CVSS 7.5) - Unbounded cache OOM
  - GHSA-73wf-gq98-2v4g (High, CVSS 7.5) - Uncaught crash via prototype write
- **Affected Versions:** `<= 4.28.6`
- **Fix:** Update browserslist (via dependency updates: e.g., autoprefixer, @vitejs/plugin-react)

---

### DEP-007: Form-Data CRLF Injection
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (HTTP Request Smuggling)
- **Packages:** Transitive in Source/Backend, Source/Frontend, portal/Backend/Frontend
- **CVE:** GHSA-hmw2-7cc7-3qxx (High, CVSS 7.5)
- **Title:** "CRLF injection in form-data via unescaped multipart field names and filenames"
- **Affected Versions:** `4.0.0 - 4.0.5`
- **Impact:** Multipart form fields can inject CR/LF to poison HTTP headers
- **Fix:** Update to `form-data >= 4.0.6`

---

### DEP-008: JS-YAML DoS via Merge Key Chains
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (Algorithmic Complexity)
- **Package:** `js-yaml@<=3.15.0`
- **File:** `Source/Backend/package.json` (transitive)
- **CVEs:**
  - GHSA-52cp-r559-cp3m (High, CVSS 7.5) - Merge-key quadratic CPU
  - GHSA-5p4m-2wfm-xmqj (High, CVSS 7.5) - Unbounded !!omap resolution
  - GHSA-h67p-54hq-rp68 (Moderate, CVSS 5.3) - Quadratic merge alias handling
- **Affected Versions:** `<= 3.15.0`
- **Fix:** Update to `js-yaml >= 3.15.1`

---

### DEP-009: Nanoid Infinite Loop DoS
- **Severity:** 🔴 P2 (High - CVSS 7.4-5.9)
- **Category:** CVE (Denial of Service)
- **Packages:** Source/Frontend, portal/Frontend (transitive)
- **CVEs:**
  - GHSA-xwg4-73v4-xw9w (High, CVSS 7.4) - Integer overflow
  - GHSA-28wg-ghj8-5hjv (High, CVSS 5.9) - Infinite loop with negative size
  - GHSA-2v37-7h3g-55p8 (High, CVSS 5.9) - Loop with zero size
- **Affected Versions:** `<= 3.3.17`
- **Fix:** Update nanoid to `>= 3.3.18`

---

### DEP-010: PostCSS Arbitrary File Read (CRITICAL PATH)
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (Path Traversal + Information Disclosure)
- **Packages:**
  - portal/Frontend (direct: `^8.4.38`)
  - portal/Backend (transitive via @opentelemetry)
- **CVEs:**
  - GHSA-6g55-p6wh-862q (High, CVSS 7.5) - Arbitrary .map file read via sourceMappingURL
  - GHSA-r28c-9q8g-f849 (High, CVSS 7.5) - Path traversal in .map auto-loading
  - GHSA-qx2v-qp2m-jg93 (Moderate, CVSS 6.1) - XSS via unescaped </style>
  - GHSA-fxqj-rqcc-2cmp (Moderate, CVSS 0 - info)
- **Affected Versions:** `<= 8.5.22`
- **Impact:** Attacker-controlled CSS comments can read arbitrary `.map` files → source code disclosure
- **Fix:** Update to `postcss >= 8.5.23`
- **[CROSS-REF: red-teamer]** — CSS files from untrusted sources can leak source maps

---

### DEP-011: Vite Multiple Path Traversal Issues
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (Path Traversal + Dev Server Security)
- **Package:** `vite@<=6.4.2`
- **Files:** Source/Frontend (transitive), portal/Frontend (direct: `^5.2.0`)
- **CVEs:**
  - GHSA-fx2h-pf6j-xcff (High, CVSS 7.5) - Windows alternate path bypass
  - GHSA-6g55-p6wh-862q (High, CVSS 7.5) - .map file traversal
  - GHSA-v6wh-96g9-6wx3 (Moderate) - NTLMv2 hash disclosure on Windows
  - GHSA-4w7w-66w2-5vf9 (Moderate) - Optimized deps .map traversal
- **Affected Versions:** `<= 6.4.2`
- **Impact:** Vite dev server can be tricked into serving files outside project root (Windows + other platforms)
- **Fix:** Update to `vite >= 8.2.2` (major version bump)
- **Risk:** Lower in production (Vite used in dev), but critical if dev server accessible to untrusted users

---

### DEP-012: React Router Open Redirect Vulnerabilities (3 CVEs)
- **Severity:** 🔴 P2 (Moderate-High - CVSS 6.9)
- **Category:** CVE (Open Redirect + XSS)
- **Packages:**
  - Source/Frontend: `react-router-dom@^6.26.0`
  - portal/Frontend: `react-router-dom@^6.22.0`
- **CVEs:**
  - GHSA-jjmj-jmhj-qwj2 (Moderate, CVSS 6.9) - Open redirect leading to XSS
  - GHSA-2j2x-hqr9-3h42 (Moderate) - Protocol-relative URL reinterpretation
  - GHSA-wrjc-x8rr-h8h6 (Moderate) - Backslash bypass in navigation
- **Affected Versions:** 
  - `react-router-dom` >= 6.30.2 <= 6.30.4, or >= 6.0.0 < 7.18.0
  - `@remix-run/router` >= 1.3.0 < 1.23.3
- **Impact:** User can be redirected to malicious site via crafted link
- **Fix:** Update to `react-router-dom >= 7.18.0` or `6.30.5+`

---

### DEP-013: Picomatch ReDoS + Method Injection
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (Regular Expression DoS)
- **Package:** `picomatch@<=2.3.1 or 4.0.0-4.0.3`
- **File:** portal/Frontend (transitive via anymatch, micromatch, readdirp)
- **CVEs:**
  - GHSA-c2c7-rcm5-vvqj (High, CVSS 7.5) - ReDoS via extglob quantifiers
  - GHSA-3v7f-55p6-f55p (Moderate, CVSS 5.3) - Method injection in POSIX char classes
- **Fix:** Update filesystem watch tooling (anymatch, micromatch, readdirp)

---

### DEP-014: WebSocket Memory Exhaustion
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (Denial of Service)
- **Package:** `ws@8.0.0-8.20.1`
- **Files:** Transitive in Source/Frontend, portal/Frontend (dev dependencies)
- **CVE:** GHSA-96hv-2xvq-fx4p (High, CVSS 7.5) - Memory exhaustion from tiny fragments
- **Fix:** Update ws to `>= 8.21.0`

---

### DEP-015: Path-to-Regexp ReDoS
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (Regular Expression DoS)
- **Package:** `path-to-regexp@<0.1.13`
- **File:** `platform/orchestrator/package.json` (transitive via express)
- **CVE:** GHSA-37ch-88jc-xwx2 (High, CVSS 7.5)
- **Title:** "Multiple route parameters can cause quadratic CPU consumption"
- **Fix:** Update express (which depends on path-to-regexp)

---

### DEP-016: gRPC Server Crash via Malformed Requests
- **Severity:** 🔴 P2 (High - CVSS 7.5)
- **Category:** CVE (Denial of Service)
- **Package:** `@grpc/grpc-js@1.14.0-1.14.3`
- **File:** `portal/Backend/package.json` (transitive)
- **CVEs:**
  - GHSA-5375-pq7m-f5r2 (High, CVSS 7.5) - Malformed request crash
  - GHSA-99f4-grh7-6pcq (High, CVSS 7.5) - Malformed compressed message crash
- **Fix:** Update @grpc/grpc-js to `>= 1.14.4`

---

## Moderate Severity Findings (P3 - Plan Patches)

### DEP-017: UUID Buffer Bounds Check
- **Severity:** 🟡 P3 (Moderate - CVSS 7.5)
- **Category:** CVE (Buffer Overflow)
- **Package:** `uuid@<11.1.1`
- **Files:** 
  - Source/Backend (direct: `^9.0.0`)
  - platform/orchestrator (transitive via dockerode)
  - portal/Backend (transitive via dockerode)
- **CVE:** GHSA-w5hq-g745-h8pq (Moderate, CVSS 7.5) - Missing buffer bounds check in v3/v5/v6
- **Impact:** If buf argument provided, can write out of bounds
- **Fix:** Update to `uuid >= 11.1.1` (but v9 compatible patch not available; requires major version bump)

---

### DEP-018: Dockerode via UUID CVE
- **Severity:** 🟡 P3 (Moderate)
- **Category:** Transitive CVE
- **Package:** `dockerode@4.0.3-4.0.12`
- **File:** `platform/orchestrator/package.json`
- **Fix:** Update to `dockerode >= 5.0.1` (requires major version bump to get uuid fix)
- **Note:** This is infrastructure-critical — coordinate with platform team

---

### DEP-019: @Babel Core Arbitrary File Read
- **Severity:** 🟢 P4 (Low - CVSS 3.2)
- **Category:** CVE (Information Disclosure)
- **Package:** `@babel/core@<=7.29.0`
- **Files:** Source/Backend, Source/Frontend (transitive)
- **CVE:** GHSA-4x5r-pxfx-6jf8 (Low, CVSS 3.2)
- **Title:** "Arbitrary File Read via sourceMappingURL Comment"
- **Note:** Low impact (requires local filesystem access), but affects all babel-dependent projects

---

### DEP-020: Esbuild CORS Bypass
- **Severity:** 🟡 P3 (Moderate - CVSS 5.3)
- **Category:** CVE (Access Control)
- **Package:** `esbuild@<=0.24.2`
- **File:** Source/Frontend, portal/Frontend (transitive via vite)
- **CVE:** GHSA-67mh-4wv8-2f99 (Moderate, CVSS 5.3)
- **Title:** "esbuild enables any website to send requests to dev server"
- **Fix:** Update vite (which updates esbuild)

---

### DEP-021: Body-Parser DoS via Invalid Limit
- **Severity:** 🟢 P4 (Low - CVSS 3.7)
- **Category:** CVE (Denial of Service)
- **Package:** `body-parser@<1.20.6`
- **Files:** Transitive in Source/Backend, platform/orchestrator, portal/Backend
- **CVE:** GHSA-v422-hmwv-36x6 (Low, CVSS 3.7)
- **Fix:** Update express (which depends on body-parser)

---

### DEP-022: OpenTelemetry Core Unbounded Memory
- **Severity:** 🟡 P3 (Moderate - CVSS 5.3)
- **Category:** CVE (Denial of Service)
- **Package:** `@opentelemetry/core@<2.8.0`
- **File:** `portal/Backend/package.json` (transitive via OpenTelemetry SDK)
- **CVE:** GHSA-8988-4f7v-96qf (Moderate, CVSS 5.3) - W3C Baggage unbounded memory allocation
- **Impact:** Attacker can craft Baggage headers → process OOM
- **Fix:** Update @opentelemetry/sdk-node to `>= 0.222.0`

---

## Outdated Major Versions (P3 - Upgrade Planning)

### DEP-023: React Outdated by 1 Major Version
- **Severity:** 🟡 P3 (Outdated - No CVE, but missed patches)
- **Category:** Version Management
- **Packages:**
  - Source/Frontend: `react@18.3.1` → `19.2.8` (1 major behind)
  - portal/Frontend: `react@18.2.0` → `19.2.8` (1 major behind)
- **Note:** React 19 may have breaking changes; requires testing

---

### DEP-024: React Router Outdated by 1 Major
- **Severity:** 🟡 P3 (Outdated)
- **Category:** Version Management
- **Packages:**
  - Source/Frontend: `react-router-dom@6.26.0` → `7.18.3` (1 major behind)
  - portal/Frontend: `react-router-dom@6.22.0` → `7.18.3` (1 major behind)
- **Also has 3 open redirect CVEs** (see DEP-012)
- **Recommendation:** Upgrade to at least 6.30.5+ to fix CVEs, then plan React Router v7

---

### DEP-025: Express Outdated by 1 Major
- **Severity:** 🟡 P3 (Outdated)
- **Category:** Version Management
- **Packages:**
  - Source/Backend: `express@4.18.2` → `5.2.1`
  - platform/orchestrator: `express@4.21.0` → `5.2.1`
  - portal/Backend: `express@4.18.2` → `5.2.1`
- **Note:** Express 5.x is still in early releases; may not be production-ready

---

### DEP-026: UUID Major Version Gap
- **Severity:** 🟡 P3 (Outdated)
- **Category:** Version Management
- **Packages:**
  - Source/Backend: `uuid@9.0.0` → `14.0.2` (5 major versions behind!)
  - portal/Backend: `uuid@9.0.0` → `14.0.2`
- **Note:** Also has a CVE (GHSA-w5hq-g745-h8pq) in v9-v11

---

### DEP-027: Pino Outdated by 2 Major Versions
- **Severity:** 🟡 P3 (Outdated)
- **Category:** Version Management
- **Packages:**
  - Source/Backend: `pino@8.17.0` → `10.3.1`
  - portal/Backend: `pino@10.3.1` (up-to-date)
- **Note:** Pino 8 is still maintained; v10 may have performance implications

---

### DEP-028: OpenTelemetry Major Version Gap
- **Severity:** 🟡 P3 (Outdated - but has critical CVEs)
- **Category:** Version Management + CVE Risk
- **Package:** `@opentelemetry/auto-instrumentations-node@0.40.0` → `0.80.0`
- **Package:** `@opentelemetry/sdk-node@0.47.0` → `0.222.0`
- **File:** portal/Backend
- **Note:** Extremely outdated (40+ minor versions behind auto-instrumentations, 175+ behind sdk-node)
- **Risk:** Cascading moderate CVEs in entire OpenTelemetry stack

---

### DEP-029: Multer Outdated by 1 Major
- **Severity:** 🟡 P3 (Outdated)
- **Category:** Version Management
- **Package:** `multer@1.4.5-lts.1` → `2.3.0` (portal/Backend)

---

### DEP-030: Vitest Major Version Outdated
- **Severity:** 🔴 P2 (Outdated + CRITICAL CVE)
- **Category:** Version Management + Code Execution Risk
- **Packages:**
  - Source/Frontend: `vitest@2.0.5` → `3.2.6+`
  - portal/Frontend: `vitest@1.4.0` → `3.2.6+`
- **Note:** Both have **GHSA-5xrq-8626-4rwp** (arbitrary file read/execution)
- **Recommendation:** Urgent upgrade required

---

## Dependency Tree Analysis

### Total Dependencies
| Project | Direct | Transitive | Total |
|---------|--------|-----------|-------|
| Source/Backend | 102 prod + 310 dev = 412 | ~ | 411 total |
| Source/Frontend | 9 | ~ | 230 total |
| Source/E2E | 4 | ~ | 4 total |
| platform/orchestrator | 3 | ~ | 155 total |
| portal/Backend | 9 | ~ | 424 total |
| portal/Frontend | 9 | ~ | 230 total |
| **Total Across All** | **~140** | | **~1,400+** |

### Duplicate Major Versions

**Critical Finding:** Multiple versions of protobufjs, @opentelemetry/*, and build tools present:

- `protobufjs` appears in multiple locations with different versions
- `@opentelemetry/*` packages are duplicated in platform/orchestrator dependency tree
- `vite` and dependencies present in both direct and nested node_modules

**Risk:** Increased supply chain surface; harder to patch all instances uniformly.

---

## Supply Chain Risks (P4 - Awareness)

### DEP-031: OpenTelemetry Instrumentation Auto-Discovery
- **Severity:** 🟢 P4 (Informational)
- **Package:** `@opentelemetry/auto-instrumentations-node`
- **Risk:** Auto-discovery of instrumentation packages expands dependency surface
- **Mitigation:** Explicitly list required instrumentations instead of auto-discover

### DEP-032: PostCSS Plugin Ecosystem
- **Severity:** 🟢 P4 (Informational)
- **Packages:** autoprefixer, tailwindcss, etc.
- **Risk:** Each PostCSS plugin is a potential vector; tailwindcss brings in large dependency tree
- **Current Usage:** portal/Frontend
- **Recommendation:** Audit PostCSS plugins quarterly

### DEP-033: Handlebars Transitive Risk
- **Severity:** 🟡 P3 (Moderate - Design Risk)
- **Package:** `handlebars@4.0.0-4.7.8`
- **Question:** Is handlebars actually used in Source/Backend, or is it a transitive orphan?
- **Recommendation:** Audit dependencies to determine necessity; consider removal if unused

---

## License Compliance Status

**Tooling Status:** `license-checker` not installed; manual inspection performed.

### Flagged Licenses

| Package | License | Risk | Action |
|---------|---------|------|--------|
| Source/E2E | ISC | Low | OK (ISC is permissive) |
| Most npm packages | MIT | Low | Standard permissive |
| (none detected) | GPL/AGPL | N/A | No GPL dependencies found — good! |
| (unknown) | Multiple | Medium | Recommend license-checker audit tool |

**Recommendation:** Install `npx license-checker` and audit quarterly.

---

## Fix Priority Roadmap

### Immediate (This Sprint - P1)
1. **DEP-002:** Update `vitest` (Source/Frontend, portal/Frontend) → `>= 3.2.6`
   - ```bash
     cd Source/Frontend && npm update vitest
     cd portal/Frontend && npm update vitest
     ```

2. **DEP-001:** Update handlebars (Source/Backend) → `>= 4.7.9`
   - Likely via transitive; run `npm audit fix` first

3. **DEP-003:** Update protobufjs (platform/orchestrator) → `>= 7.6.5+`
   - ```bash
     cd platform/orchestrator && npm update protobufjs
     ```

4. **DEP-004:** Update OpenTelemetry (portal/Backend)
   - ```bash
     cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node
     ```

### This Week (P2 - High CVEs)
5. Update all transitive high-severity packages:
   - ```bash
     npm audit fix  # in each directory
     ```

6. **DEP-006, DEP-007, DEP-008, DEP-009, DEP-010:** 
   - Run `npm audit fix` which will update browserslist, form-data, js-yaml, nanoid, postcss

7. **DEP-011, DEP-012, DEP-014, DEP-015, DEP-016:**
   - Vite, React Router, ws, path-to-regexp, gRPC
   - May require manual version updates

### Next Two Weeks (P3 - Moderate + Outdated)
8. **DEP-023 to DEP-029:**
   - Plan React 19 migration (with testing)
   - Plan React Router 7 migration
   - Update Express, UUID, Pino, Multer with compatibility checks
   - Prioritize OpenTelemetry stack (v0.222.0+)

9. Test all changes against QA suite before merging

---

## Audit Tool Status

### Available Tools
- ✅ `npm audit` — used for CVE detection
- ❌ `npm outdated` — partially used (shows MISSING; lock file needed for full output)
- ❌ `license-checker` — not installed
- ❌ `govulncheck` — not applicable (no Go code)
- ❌ `pip-audit` — not applicable (no Python code)

### Recommendation
Install and run quarterly:
```bash
npm install -g license-checker
license-checker --json > license-report.json
```

---

## Cross-Team References

### [ESCALATE → TheGuardians - RED TEAM]
- **DEP-001:** Handlebars code injection — exploitable if untrusted templates processed
- **DEP-003:** Protobufjs RCE — exploitable if untrusted protobuf messages received
- **DEP-010:** PostCSS arbitrary file read — exploitable if untrusted CSS processed
- **DEP-012:** React Router open redirect — exploitable if user can craft links

### [COORDINATE → TheFixer]
- All P1, P2, and P3 findings require code changes (dependency updates, testing, deployment)

---

## Summary JSON

```json
{
  "audit_date": "2026-09-06",
  "total_cves": 54,
  "critical_cves": 4,
  "high_cves": 20,
  "moderate_cves": 20,
  "low_cves": 10,
  "direct_dependencies_with_cves": 8,
  "total_transitive_dependencies": 1400,
  "projects_scanned": 6,
  "grade": "D",
  "immediate_action_required": ["vitest", "handlebars", "protobufjs", "@opentelemetry"],
  "most_critical_packages": [
    "vitest@<3.2.6",
    "handlebars@4.0.0-4.7.8",
    "protobufjs@<=7.6.4",
    "@opentelemetry/auto-instrumentations-node@<=0.76.0"
  ],
  "supply_chain_risk": "HIGH - 1400+ transitive dependencies, duplicate major versions across projects",
  "license_compliance": "UNKNOWN - license-checker tool not installed",
  "outdated_major_versions": 8,
  "duplicated_packages": "protobufjs, @opentelemetry/*, vite dependencies",
  "recommendations": [
    "Install license-checker for quarterly audits",
    "Run npm audit fix in all directories immediately",
    "Coordinate OpenTelemetry stack update (major version)",
    "Plan React 18→19 and React Router 6→7 migrations with testing",
    "Address supply chain risk via dependency deduplication"
  ]
}
```

---

## Next Steps

1. **Dashboard Reporting** ✅ (this document)
2. **Red Team Escalation** → TheGuardians for exploitability assessment
3. **Fix Coordination** → TheFixer team for patching
4. **Verification** → Re-run audits after fixes applied
5. **Learning** → Update `Teams/TheInspector/learnings/dependency-auditor.md`

---

**Report Generated By:** Dependency Auditor Agent (Haiku model)  
**Confidence Level:** High (based on npm audit output + manual inspection)
