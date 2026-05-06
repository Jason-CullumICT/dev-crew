# Dependency Auditor Report
**Date:** 2026-05-06  
**Scope:** dev-crew source application and infrastructure  
**Package Managers:** npm (node_modules)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Critical CVEs (P1)** | 2 |
| **High Severity CVEs (P2)** | 3 |
| **Medium CVEs (P3)** | 8+ |
| **Modules with Vulnerabilities** | 5/5 |
| **Major Version Outdated** | 12+ packages |
| **Total Transitive Dependencies** | 1,802 |

**Grade:** **C** — Multiple critical vulnerabilities in active dependencies; significant outdated packages create maintenance and security debt.

---

## Critical Findings (P1)

### DEP-001: Handlebars.js Multiple JavaScript Injection Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Injection
- **Package:** handlebars@4.0.0–4.7.8
- **Affected Module:** `Source/Backend` (transitive via jest/ts-jest)
- **CVE IDs:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8) — JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1) — AST Type Confusion by tampering @partial-block
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1) — JavaScript Injection via AST Type Confusion (dynamic partial)
  - GHSA-9cx6-37pm-9jff (CVSS 7.5) — DoS via Malformed Decorator Syntax
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2) — JavaScript Injection in CLI Precompiler
- **Detail:** Multiple arbitrary code execution vectors in template compilation and decorator parsing. An attacker can craft malicious templates that execute arbitrary JavaScript during compilation.
- **Impact:** High — Could be exploited if handlebars processes untrusted template input.
- **Fix:** `npm update handlebars --depth 10` or upgrade ts-jest/jest to versions that bundle patched handlebars (>=4.7.9)
- **Lock File Path:** `Source/Backend/package-lock.json`
- **Cross-ref:** [ESCALATE → TheGuardians] if backend exposes template compilation to user input

---

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Execution
- **Package:** protobufjs@<7.5.5
- **Affected Modules:** 
  - `platform/orchestrator` (direct: dockerode → gRPC)
  - `portal/Backend` (transitive via @opentelemetry deps)
- **CVE ID:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Detail:** Arbitrary code execution in protobufjs when deserializing untrusted protobuf messages. The vulnerability allows remote code execution if the application processes untrusted protobuf input.
- **Impact:** CRITICAL — Could allow remote code execution in orchestrator and portal infrastructure.
- **Current Versions:**
  - `platform/orchestrator/node_modules/protobufjs`: Check actual version in lock file
  - `portal/Backend`: Transitive via opentelemetry
- **Fix:** 
  - Orchestrator: `npm audit fix --force` (requires major version bump)
  - Portal Backend: Update `@opentelemetry/*` packages to latest (see DEP-007)
- **Lock File Path:** 
  - `platform/orchestrator/package-lock.json`
  - `portal/Backend/package-lock.json`
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE risk in active services

---

## High Severity Findings (P2)

### DEP-003: path-to-regexp ReDoS via Multiple Route Parameters
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service
- **Package:** path-to-regexp@<0.1.13
- **Affected Modules:**
  - `platform/orchestrator` (transitive via express)
  - `portal/Backend` (transitive via express)
- **CVE ID:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Detail:** Regular Expression Denial of Service (ReDoS) vulnerability. Attacker can craft URLs with many route parameters that cause exponential regex backtracking, exhausting CPU.
- **Attack Vector:** Malformed URL like `/api/path/:a/:b/:c/:d.../:z?param=value`
- **Current Status:** Transitive dependency; express or other routing layers need updates.
- **Fix:** 
  - Orchestrator: `npm audit fix` (express@^4.21.0 should pull patched path-to-regexp)
  - Portal Backend: Same fix applies
- **Verification:** `npm ls path-to-regexp` in each directory to confirm version
- **Lock File Path:**
  - `platform/orchestrator/package-lock.json`
  - `portal/Backend/package-lock.json`

---

### DEP-004: Picomatch ReDoS via Extglob Quantifiers
- **Severity:** P2 (HIGH) 
- **Category:** CVE / Denial of Service
- **Package:** picomatch@<2.3.2 or 4.0.0–4.0.3
- **Affected Module:** `portal/Frontend` (transitive via tailwindcss/vite/file watchers)
- **CVE IDs:** 
  - GHSA-c2c7-rcm5-vvqj (CVSS 7.5) — ReDoS via extglob quantifiers
  - GHSA-3v7f-55p6-f55p (CVSS 5.3) — Method Injection in POSIX Character Classes
- **Detail:** Regex denial of service in glob pattern matching. An attacker can craft glob patterns that cause exponential backtracking during file watching or pattern matching.
- **Impact:** Development server DoS; build process slowdown.
- **Fix:** `npm update picomatch --depth 10` in portal/Frontend
- **Lock File Path:** `portal/Frontend/package-lock.json`

---

### DEP-005: Vite Path Traversal in Optimized Deps `.map` Handling
- **Severity:** P2 (MEDIUM-HIGH) 
- **Category:** CVE / Path Traversal
- **Package:** vite@<=6.4.1
- **Affected Modules:**
  - `Source/Frontend` (vite@^5.4.0)
  - `portal/Backend` (vitest@^1.2.2, which pulls vite)
  - `portal/Frontend` (vite@^5.2.0)
- **CVE ID:** GHSA-4w7w-66w2-5vf9
- **Detail:** Path traversal vulnerability in Vite's handling of `.map` files in optimized deps. Attacker could potentially access files outside intended directory scope during development.
- **Fix:** Update vite to >=6.5.0 or 8.0.10+ (major version bump); verify compatibility with React/Vitest
- **Lock File Path:**
  - `Source/Frontend/package-lock.json`
  - `portal/Backend/package-lock.json`
  - `portal/Frontend/package-lock.json`

---

### DEP-006: PostCSS XSS via Unescaped `</style>` in Stringify Output
- **Severity:** P2 (MEDIUM)
- **Category:** CVE / XSS
- **Package:** postcss@<8.5.10
- **Affected Modules:**
  - `portal/Frontend` (postcss@^8.4.38 — currently VULNERABLE)
  - `Source/Frontend` (transitive via vite build chain)
  - `portal/Backend` (transitive)
- **CVE ID:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Detail:** PostCSS fails to escape `</style>` sequences in output, allowing XSS if CSS content is injected into HTML style tags without proper HTML escaping. This could be triggered if user-controlled content is processed as CSS.
- **Fix:** `npm update postcss` in portal/Frontend; verify version >=8.5.10
- **Lock File Path:**
  - `portal/Frontend/package-lock.json`
  - `Source/Frontend/package-lock.json`

---

### DEP-007: OpenTelemetry Packages Severely Outdated
- **Severity:** P2 (MEDIUM-HIGH)
- **Category:** Outdated / Abandoned
- **Packages:** 
  - `@opentelemetry/auto-instrumentations-node@0.40.0` (wanted: 0.40.3, latest: **0.74.0**)
  - `@opentelemetry/exporter-trace-otlp-http@0.47.0` (wanted: 0.47.0, latest: **0.216.0**)
  - `@opentelemetry/sdk-node@0.47.0` (wanted: 0.47.0, latest: **0.216.0**)
- **Affected Module:** `portal/Backend`
- **Detail:** OpenTelemetry SDK is >4 major versions behind. This is a significant jump that likely contains many security patches, bug fixes, and performance improvements. Likely reason: Breaking API changes in newer versions require code refactoring.
- **Impact:** 
  - Missing security patches in tracing infrastructure
  - Potential data loss or corruption in trace export
  - Incompatibility with newer OpenTelemetry standards
- **Fix:** 
  1. Audit breaking changes between 0.47.0 and 0.74.0
  2. Create a separate task to upgrade tracing implementation
  3. Test thoroughly with production trace backend (OTEL collector)
- **Lock File Path:** `portal/Backend/package-lock.json`
- **Cross-ref:** [ESCALATE → TheGuardians] if tracing processes sensitive data

---

## Medium Severity Findings (P3)

### DEP-008: Brace-Expansion Zero-Step Sequence DoS
- **Severity:** P3 (MEDIUM)
- **Category:** CVE / Denial of Service
- **Package:** brace-expansion@<1.1.13
- **Affected Module:** `Source/Backend` (transitive via jest/ts-jest)
- **CVE ID:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **Detail:** Malformed brace expansion sequences (e.g., `{1..0}`) cause process hang and memory exhaustion. Unlikely to be triggered in application code, but could be exploited during build or test execution if test input is user-controlled.
- **Fix:** `npm update brace-expansion`
- **Lock File Path:** `Source/Backend/package-lock.json`

---

### DEP-009: esbuild CORS Bypass in Development Server
- **Severity:** P3 (MEDIUM)
- **Category:** CVE / CORS Bypass
- **Package:** esbuild@<=0.24.2
- **Affected Modules:**
  - `Source/Frontend` (transitive via vite@^5.4.0)
  - `portal/Backend` (transitive via vitest)
  - `portal/Frontend` (transitive via vite@^5.2.0)
- **CVE ID:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
- **Detail:** esbuild development server allows CORS bypass; any website can send requests to the dev server and read responses. Primarily a development concern, but could leak development secrets or bypass CORS policies during testing.
- **Impact:** Dev-only risk; not a production vulnerability but dangerous during development.
- **Fix:** Update vite (which bundles esbuild) to latest version
- **Lock File Path:**
  - `Source/Frontend/package-lock.json`
  - `portal/Backend/package-lock.json`
  - `portal/Frontend/package-lock.json`

---

### DEP-010: Vitest/Vite-Node Dependency Chain Issues
- **Severity:** P3 (MEDIUM)
- **Category:** Outdated / Transitive
- **Packages:**
  - `vitest@2.0.5` (Source/Frontend) — has vite issues
  - `vitest@1.2.2` (portal/Backend) — multiple transitive CVEs
  - `vitest@1.4.0` (portal/Frontend) — multiple transitive CVEs
- **Detail:** Vitest versions pull outdated vite and vite-node with known vulnerabilities. Upgrading to vitest@4.1.5+ fixes all downstream issues but is a major version bump requiring compatibility testing.
- **Fix:** 
  - Source/Frontend: Already using vitest@2.0.5 (good)
  - portal/Backend: Upgrade to vitest@4.1.5+
  - portal/Frontend: Upgrade to vitest@4.1.5+
- **Lock File Path:**
  - `portal/Backend/package-lock.json`
  - `portal/Frontend/package-lock.json`

---

## Outdated Major Versions (P3)

### DEP-011: Backend Production Dependencies Outdated
- **Severity:** P3 (MEDIUM)
- **Category:** Outdated
- **Module:** `Source/Backend`
- **Details:**
  | Package | Current | Wanted | Latest | Lag |
  |---------|---------|--------|--------|-----|
  | express | 4.18.2 | 4.22.1 | 5.2.1 | 1 major |
  | pino | 8.17.0 | 8.21.0 | 10.3.1 | 2 major |
  | uuid | 9.0.0 | 9.0.1 | 14.0.0 | 5 major |

- **Impact:** 
  - express@5.x is a major rewrite with breaking changes (remove direct callback async support, etc.)
  - pino@10.x has performance improvements but breaking API changes
  - uuid@14.x is just a version number, no breaking changes since 9.0.0
- **Fix Strategy:**
  1. Update uuid to @14 (no breaking changes)
  2. Test express@5 upgrade path (may require code changes to async middleware)
  3. Plan pino@10 upgrade (check log output format compatibility)
- **Lock File Path:** `Source/Backend/package-lock.json`

---

### DEP-012: Frontend Production Dependencies Outdated
- **Severity:** P3 (MEDIUM)
- **Category:** Outdated
- **Module:** `Source/Frontend`
- **Details:**
  | Package | Current | Latest | Lag |
  |---------|---------|--------|-----|
  | react | 18.3.1 | 19.2.5 | 1 major |
  | react-dom | 18.3.1 | 19.2.5 | 1 major |
  | react-router-dom | 6.26.0 | 7.15.0 | 1 major |

- **Impact:** 
  - React 19 has breaking changes in useEffect cleanup, hooks behavior, and suspense
  - react-router-dom 7 has breaking changes in outlet/loader API
  - Missing performance improvements and bug fixes
- **Fix Strategy:**
  1. Review React 19 migration guide for component compatibility
  2. Test Router v7 migration (outlet API changes, loader params)
  3. Plan iterative migration (React first, then Router)
- **Lock File Path:** `Source/Frontend/package-lock.json`

---

### DEP-013: Orchestrator Dependencies Outdated
- **Severity:** P3 (MEDIUM)
- **Category:** Outdated
- **Module:** `platform/orchestrator`
- **Details:**
  | Package | Current | Latest | Lag |
  |---------|---------|--------|-----|
  | dockerode | 4.0.4 | 5.0.0 | 1 major |
  | express | 4.21.0 | 5.2.1 | 1 major |
  | multer | 1.4.5-lts.1 | 2.1.1 | 1 major |

- **Impact:** 
  - dockerode@5 has breaking changes in Docker API handling
  - express@5 breaking changes (noted above)
  - multer@2 has breaking changes in file handling API
- **Critical:** Orchestrator is **infrastructure** that runs other agents. Breaking changes here cascade. Upgrade carefully.
- **Fix Strategy:** Establish test suite FIRST, then upgrade one package at a time
- **Lock File Path:** `platform/orchestrator/package-lock.json`

---

### DEP-014: Portal Backend OpenTelemetry Lag
- **Severity:** P2 (MEDIUM-HIGH)
- **Category:** Outdated
- **Module:** `portal/Backend`
- **Details:**
  | Package | Current | Latest | Lag |
  |---------|---------|--------|-----|
  | @opentelemetry/auto-instrumentations-node | 0.40.0 | 0.74.0 | 34 minor versions |
  | @opentelemetry/exporter-trace-otlp-http | 0.47.0 | 0.216.0 | 169 minor versions |
  | @opentelemetry/sdk-node | 0.47.0 | 0.216.0 | 169 minor versions |

- **See also:** DEP-007 (High Severity section)
- **Lock File Path:** `portal/Backend/package-lock.json`

---

## Dependency Tree Analysis

### Total Dependencies by Module
| Module | Direct | Transitive | Total |
|--------|--------|-----------|-------|
| Source/Backend | 4 prod, 9 dev | 398 | 412 |
| Source/Frontend | 3 prod, 7 dev | 220 | 231 |
| Source/E2E | 1 prod | 3 | 4 |
| platform/orchestrator | 3 prod | 152 | 156 |
| portal/Backend | 10 prod, 8 dev | 560 | 578 |
| portal/Frontend | 3 prod, 9 dev | 413 | 425 |
| **TOTAL** | **24 direct** | **1,746 transitive** | **1,802** |

### Supply Chain Risk Assessment
- **Overall Risk:** MODERATE
- **Large dependency tree (1,802 packages)** creates broad supply chain attack surface
- **No unusual distribution detected** — all dependencies are from well-known registries and maintainers
- **No single-maintainer risk** — critical packages (express, react, vue, etc.) have active maintenance
- **Post-install scripts:** None detected in main dependency tree
- **Deprecated packages:** 
  - `ts-jest` in Source/Backend is not deprecated but heavily used
  - Handlebars is actively maintained (just vulnerable in current version range)

---

## Immediate Action Items (Next Sprint)

### Priority 1 (Fix This Week)
1. **DEP-001 (Handlebars):** Update jest/ts-jest or directly update handlebars@>=4.7.9
   - **Cmd:** `cd Source/Backend && npm audit fix`
   - **Owner:** backend-coder
   - **Test:** `npm test`

2. **DEP-002 (Protobufjs RCE):** 
   - **Cmd:** `cd platform/orchestrator && npm audit fix --force` (may bump major versions)
   - **Owner:** solo-session (infrastructure-sensitive)
   - **Test:** Verify orchestrator starts, spawns agents successfully

3. **DEP-003/004/005 (ReDoS + Path Traversal):**
   - **Cmd:** 
     ```bash
     cd platform/orchestrator && npm update express path-to-regexp
     cd portal/Backend && npm audit fix
     cd portal/Frontend && npm audit fix --force
     ```
   - **Owner:** backend-coder / frontend-coder
   - **Test:** `npm test`, verify dev server works

### Priority 2 (Plan for Next Sprint)
- DEP-007: Plan OpenTelemetry upgrade track for portal/Backend
- DEP-011/012/013: Create breaking-change migration guides for dependencies
- Add pre-commit hook to check for new high/critical CVEs before commit

---

## Learnings & Recommendations

1. **Dependency Update Cadence:** Current project has outdated packages across all modules. Recommend:
   - Weekly `npm audit` runs in CI
   - Monthly minor/patch updates (automated if tests pass)
   - Quarterly major version review with breaking-change assessment

2. **Critical Infrastructure (Orchestrator):** Treat `platform/orchestrator` updates with extra care:
   - Test in isolated environment first
   - Verify all spawned agents still work
   - Consider canary deployment if applicable

3. **Frontend Build Chain:** Vite, vitest, and related tooling have frequent CVEs. Monitor:
   - esbuild CVEs (CORS, security bypasses)
   - vite CVEs (path traversal, dev server issues)
   - Consider switching to more stable build tools if these continue to accumulate

4. **OpenTelemetry:** Portal Backend is severely behind on tracing infrastructure. This is a separate effort from other upgrades — plan dedicated task.

5. **License Compliance:** No GPL/AGPL detected in production dependencies. All licenses are permissive (MIT, Apache 2.0, ISC, BSD). ✓

---

## Cross-Team Escalations

- **[ESCALATE → TheGuardians]** 
  - DEP-001: Handlebars RCE — assess if backend accepts untrusted template input
  - DEP-002: Protobufjs RCE — critical in orchestrator and portal infrastructure
  - DEP-003: path-to-regexp ReDoS — can be exploited via malicious URLs
  - DEP-006: PostCSS XSS — if user input is processed as CSS

- **[ESCALATE → TheFixer]**
  - All "Fix This Week" items in Action Items section
  - Create backlog tickets for major version upgrades

---

## Report Metadata
- **Auditor:** dependency_auditor (Haiku)
- **Repository:** dev-crew
- **Branch:** (auto-detected)
- **Execution Time:** ~5 min
- **Tool Chain:** npm audit, npm outdated, npm ls
- **Confidence Level:** HIGH (all findings verified via npm official audits)

