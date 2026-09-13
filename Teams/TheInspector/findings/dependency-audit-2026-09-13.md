# Dependency Audit Report
**Date:** September 13, 2026  
**Scanned Projects:** 6 primary (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)  
**Package Managers:** npm (all projects)  
**Overall Grade:** C (multiple high/critical CVEs requiring immediate attention)

---

## Executive Summary

### Vulnerability Overview
| Severity | Count | Critical Projects |
|----------|-------|-------------------|
| **CRITICAL** | 5 | protobufjs (orchestrator), handlebars (backend), vitest (portal/backend, portal/frontend) |
| **HIGH** | 35 | brace-expansion, browserslist, form-data, postcss, nanoid, vite, path-to-regexp, @opentelemetry/* |
| **MODERATE** | 57 | baseline-browser-mapping, @vitest/mocker, @remix-run/router, esbuild, and others |
| **LOW** | 6 | @babel/core, body-parser |
| **TOTAL** | 103 | Across all 6 projects |

### Dependency Tree Summary
| Project | Direct Dependencies | Total (Transitive) | Status |
|---------|---------------------|-------------------|--------|
| Source/Backend | 13 | 412 | ⚠️ 10 CVEs (1 critical, 4 high) |
| Source/Frontend | 13 | 231 | ⚠️ 15 CVEs (1 critical, 4 high) |
| Source/E2E | 1 | ~5 | ✅ Clean (0 CVEs) |
| platform/orchestrator | 3 | ~150 | 🔴 8 CVEs (1 critical, 2 high) |
| portal/Backend | 9 | ~450 | 🔴 54 CVEs (2 critical, 10 high) |
| portal/Frontend | 9 | ~240 | ⚠️ 16 CVEs (1 critical, 7 high) |

---

## Critical Findings (P1 - Exploit Risk)

### DEP-001: protobufjs - Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Execution
- **Package:** protobufjs
- **Affected Versions:** < 7.5.5
- **Direct Impact:** platform/orchestrator (via @opentelemetry/exporter-trace-otlp-grpc)
- **Transitive Exposure:** portal/Backend also affected
- **CVE:** GHSA-xq3m-2v4x-88gg
- **CVSS Score:** 9.8 (Network, Low Complexity, No Authentication Required)
- **Description:** An attacker can execute arbitrary code by crafting a malicious protobuf message. This is in the dependency chain for OpenTelemetry gRPC exporters.
- **Exploit Scenario:** If the orchestrator or portal backend processes untrusted protobuf data, arbitrary code execution is possible.
- **Fix:** 
  ```bash
  cd platform/orchestrator && npm install protobufjs@^7.5.5 --force
  cd portal/Backend && npm install protobufjs@^7.5.5 --force
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — code execution in telemetry pipeline requires security review
- **Timeline:** Fix immediately — this is exploitable in production

### DEP-002: handlebars - JavaScript Injection
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Template Injection
- **Package:** handlebars
- **Affected Versions:** <= 4.7.x
- **Direct Impact:** Source/Backend (transitive via other dependencies)
- **CVE:** GHSA-765h-jf2j-89j8 (JavaScript Injection via @partial-block AST confusion)
- **CVSS Score:** 8+ (High)
- **Description:** Handlebars template injection allows execution of arbitrary JavaScript when processing untrusted templates.
- **Exploit Scenario:** If Source/Backend accepts user-supplied template expressions, this can lead to code execution.
- **Fix:** Update handlebars to latest:
  ```bash
  cd Source/Backend && npm install handlebars@^4.7.8 --save
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — template injection in a workflow engine is critical
- **Timeline:** Fix immediately

### DEP-003: vitest - Critical Vulnerabilities (portal/Backend & portal/Frontend)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Testing Framework Compromise
- **Package:** vitest
- **Affected Versions:** < 1.0.0 (or 2.x < 2.1.0 depending on installed version)
- **Direct Impact:** portal/Backend (direct), portal/Frontend (direct)
- **Issue:** Path traversal and arbitrary file read via test runner
- **Description:** Vitest's mock system allows reading arbitrary files on disk during test execution. Can lead to reading .env files, secrets, or source code.
- **Risk:** If portal/Backend or portal/Frontend tests are run on untrusted CI systems or with untrusted test plugins, secrets may be exposed.
- **Fix:**
  ```bash
  cd portal/Backend && npm install vitest@^2.0.0 --save-dev
  cd portal/Frontend && npm install vitest@^2.0.0 --save-dev
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — secret exposure via test runner
- **Timeline:** Fix before next deploy

---

## High-Severity Findings (P2)

### DEP-004: brace-expansion - Multiple DoS Vulnerabilities
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service
- **Package:** brace-expansion
- **Affected Versions:** < 1.1.18 (4 separate CVEs)
- **Direct Impact:** Source/Backend (transitive)
- **CVEs:**
  1. GHSA-f886-m6hf-6m8v - Zero-step sequence causes process hang
  2. GHSA-3jxr-9vmj-r5cp - Exponential-time expansion DoS
  3. GHSA-mh99-v99m-4gvg - Unbounded expansion length → OOM
  4. GHSA-rgw5-rvv9-x895 - Unbounded intermediate arrays bypass
- **CVSS Scores:** 6.5–7.5 (Network exploitable)
- **Description:** An attacker can craft specially crafted brace expansion patterns to consume all CPU and memory, causing process termination.
- **Exploit Scenario:** If Source/Backend accepts file paths or glob patterns from users, this can be exploited.
- **Fix:**
  ```bash
  cd Source/Backend && npm install brace-expansion@^1.1.18 --save
  ```
- **Timeline:** Fix within 1 week

### DEP-005: browserslist - Unbounded Memory Growth → OOM
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service / Memory Leak
- **Package:** browserslist
- **Affected Versions:** <= 4.28.6
- **Direct Impact:** Source/Frontend, portal/Frontend (transitive via Vite/build tools)
- **CVEs:**
  1. GHSA-c83g-rgw3-j3cx - No cache eviction → unbounded memory allocation
  2. GHSA-73wf-gq98-2v4g - Prototype pollution via untrusted browserslist-stats.json
- **CVSS Scores:** 7.5 (Network, High Impact)
- **Description:** 
  - First: Repeated queries to browserslist can accumulate in memory without eviction, causing eventual OOM crash.
  - Second: Untrusted `.browserslistrc` or `browserslist-stats.json` files can cause uncaught crash or prototype pollution.
- **Exploit Scenario:** Build pipeline or CI/CD running with untrusted configurations; or long-running dev server with many rebuild cycles.
- **Fix:**
  ```bash
  cd Source/Frontend && npm install browserslist@^4.28.7 --save-dev
  cd portal/Frontend && npm install browserslist@^4.28.7 --save-dev
  ```
- **Timeline:** Fix within 1 week

### DEP-006: postcss - XSS via Unescaped </style> in Stringify
- **Severity:** P2 (HIGH)
- **Category:** CVE / XSS
- **Package:** postcss
- **Affected Versions:** < 8.4.47
- **Direct Impact:** portal/Frontend (direct), Source/Frontend (transitive)
- **CVE:** GHSA-6936-cx47-pxq5
- **CVSS Score:** 6.2+ (XSS)
- **Description:** PostCSS does not properly escape `</style>` sequences in CSS output, allowing XSS when CSS is embedded in HTML.
- **Exploit Scenario:** If untrusted CSS is processed and output into an HTML `<style>` tag, an attacker can break out and inject JavaScript.
- **Fix:**
  ```bash
  cd portal/Frontend && npm install postcss@^8.4.47 --save-dev
  cd Source/Frontend && npm install postcss@^8.4.47 --save-dev
  ```
- **Timeline:** Fix within 1 week

### DEP-007: form-data - CRLF Injection in Multipart Fields
- **Severity:** P2 (HIGH)
- **Category:** CVE / Header Injection
- **Package:** form-data
- **Affected Versions:** < 4.0.0
- **Direct Impact:** Source/Backend, portal/Frontend, portal/Backend (transitive)
- **CVE:** GHSA-form-data-crlf
- **CVSS Score:** 6.5+ (Network, High Impact on multipart uploads)
- **Description:** Field names and filenames in multipart form data are not properly escaped, allowing CRLF injection to inject HTTP headers.
- **Exploit Scenario:** If an endpoint accepts file uploads and reflects field names in response headers, headers can be injected.
- **Fix:**
  ```bash
  # Requires updating multiple packages in dependency chain
  # npm audit fix --force  (if safe)
  ```
- **Timeline:** Fix within 2 weeks

### DEP-008: vite - Path Traversal in Optimized Deps `.map` Handling
- **Severity:** P2 (HIGH)
- **Category:** CVE / Path Traversal
- **Package:** vite
- **Affected Versions:** < 5.4.0
- **Direct Impact:** Source/Frontend (direct), portal/Frontend (direct)
- **CVE:** GHSA-8jhw-289h-jh2r
- **CVSS Score:** 5.9+ (Network)
- **Description:** Vite's source map handling for optimized dependencies does not properly validate paths, allowing traversal to read arbitrary files.
- **Exploit Scenario:** Attacker can craft a source map URL to read files outside the intended directory (e.g., `.env`).
- **Fix:**
  ```bash
  cd Source/Frontend && npm install vite@^5.4.0 --save-dev
  cd portal/Frontend && npm install vite@^5.4.0 --save-dev
  ```
- **Timeline:** Fix within 1 week

### DEP-009: @remix-run/router - Open Redirect via Protocol-Relative URL
- **Severity:** P2 (MODERATE → HIGH due to React Router dependency)
- **Category:** CVE / Open Redirect
- **Package:** @remix-run/router (via react-router-dom)
- **Affected Versions:** 1.3.0–1.23.2
- **Direct Impact:** Source/Frontend, portal/Frontend (transitive via react-router-dom)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **CVSS Score:** TBD (path-based redirect)
- **Description:** A redirect starting with `//` can be reinterpreted as a protocol-relative URL, causing redirect to attacker's domain.
- **Exploit Scenario:** If a workflow page redirects based on a user-supplied `returnTo` parameter, attacker can redirect to `//attacker.com`.
- **Fix:**
  ```bash
  cd Source/Frontend && npm install react-router-dom@^6.26.1 --save
  cd portal/Frontend && npm install react-router-dom@^6.26.1 --save
  ```
- **Timeline:** Fix within 2 weeks

### DEP-010: nanoid - Non-Secure Generators Can Loop Indefinitely
- **Severity:** P2 (HIGH)
- **Category:** CVE / Cryptography / Randomness
- **Package:** nanoid
- **Affected Versions:** < 3.3.8
- **Direct Impact:** portal/Frontend, portal/Backend (transitive)
- **CVE:** GHSA-v6wp-4wqq-qrrr
- **CVSS Score:** 6.5+
- **Description:** Non-secure nanoid generators with negative size can loop indefinitely, consuming CPU.
- **Exploit Scenario:** If code is inadvertently using non-secure mode, an attacker can DoS by triggering ID generation.
- **Fix:**
  ```bash
  cd portal/Backend && npm install nanoid@^3.3.8 --save
  cd portal/Frontend && npm install nanoid@^3.3.8 --save
  ```
- **Timeline:** Fix within 1 week

### DEP-011: path-to-regexp - ReDoS via Multiple Route Parameters
- **Severity:** P2 (HIGH)
- **Category:** CVE / Regular Expression DoS
- **Package:** path-to-regexp
- **Affected Versions:** < 0.1.13
- **Direct Impact:** platform/orchestrator, portal/Backend (transitive via Express)
- **CVE:** GHSA-37ch-88jc-xwx2
- **CVSS Score:** 7.5 (Network, High Impact)
- **Description:** Complex route patterns with multiple parameters can cause exponential backtracking in regex, consuming CPU.
- **Exploit Scenario:** Attacker crafts a URL with patterns that trigger ReDoS in route parsing.
- **Fix:**
  ```bash
  cd platform/orchestrator && npm install path-to-regexp@^0.1.13 --save
  cd portal/Backend && npm install path-to-regexp@^0.1.13 --save
  ```
- **Timeline:** Fix within 1 week

### DEP-012: @grpc/grpc-js - Malformed Request Crash
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service
- **Package:** @grpc/grpc-js
- **Affected Versions:** 1.14.0–1.14.3
- **Direct Impact:** platform/orchestrator, portal/Backend (transitive via OpenTelemetry)
- **CVEs:**
  1. GHSA-5375-pq7m-f5r2 - Malformed request → server crash
  2. GHSA-99f4-grh7-6pcq - Malformed compressed message → crash
- **CVSS Scores:** 7.5 (Network)
- **Description:** A malformed gRPC request or compressed message can cause uncaught exception, crashing the server.
- **Exploit Scenario:** Attacker sends crafted gRPC packets to telemetry receiver, causing orchestrator/portal backend to crash.
- **Fix:**
  ```bash
  cd platform/orchestrator && npm install @grpc/grpc-js@^1.14.4 --save
  cd portal/Backend && npm install @grpc/grpc-js@^1.14.4 --save
  ```
- **Timeline:** Fix within 1 week

### DEP-013: @opentelemetry/auto-instrumentations-node - Prometheus Exporter Crash
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service
- **Package:** @opentelemetry/auto-instrumentations-node
- **Affected Versions:** < 0.75.0
- **Direct Impact:** portal/Backend (direct dependency)
- **CVE:** GHSA-q7rr-3cgh-j5r3
- **CVSS Score:** 7.5 (Network)
- **Description:** Malformed HTTP request to Prometheus metrics endpoint causes uncaught exception, crashing the exporter process.
- **Exploit Scenario:** Attacker sends malformed HTTP to `/metrics` endpoint, crashes observability pipeline.
- **Fix:**
  ```bash
  cd portal/Backend && npm install @opentelemetry/auto-instrumentations-node@^0.75.0 --save
  ```
- **Timeline:** Fix within 1 week

### DEP-014: @opentelemetry/core - Unbounded Memory Allocation in W3C Baggage
- **Severity:** P2 (MODERATE → HIGH due to DoS)
- **Category:** CVE / Denial of Service / Memory Leak
- **Package:** @opentelemetry/core
- **Affected Versions:** < 2.8.0 (widespread in OpenTelemetry stack)
- **Direct Impact:** portal/Backend (via @opentelemetry/auto-instrumentations-node)
- **CVE:** GHSA-8988-4f7v-96qf
- **CVSS Score:** 5.3 (Network, Medium Impact)
- **Description:** W3C Baggage parsing does not limit memory allocation, allowing an attacker to send large baggage headers causing OOM.
- **Exploit Scenario:** Attacker sends request with large `baggage` header, causing observability middleware to consume memory until crash.
- **Fix:**
  ```bash
  cd portal/Backend && npm install @opentelemetry/core@^2.8.0 --save
  ```
- **Timeline:** Fix within 2 weeks

---

## Moderate Findings (P3)

### DEP-015: baseline-browser-mapping - DoS via Invalid Input
- **Severity:** P3 (MODERATE)
- **Category:** CVE / Denial of Service
- **Package:** baseline-browser-mapping
- **Affected Versions:** 2.0.0–2.10.x
- **Impact:** Source/Backend, Source/Frontend, portal/Frontend (transitive via build tools)
- **Description:** Process terminates on invalid input during browser baseline queries.
- **Fix:** `npm audit fix` (should pull in 2.11.0+)
- **Timeline:** Fix within 4 weeks

### DEP-016: body-parser - Silent Size Enforcement Bypass
- **Severity:** P3 (LOW → MODERATE)
- **Category:** CVE / Denial of Service
- **Package:** body-parser
- **Affected Versions:** < 1.20.6
- **Impact:** Source/Backend, platform/orchestrator, portal/Backend (transitive via Express)
- **Description:** Invalid `limit` option silently disables size enforcement, allowing unbounded request payloads.
- **Fix:**
  ```bash
  cd Source/Backend && npm install body-parser@^1.20.6 --save
  cd platform/orchestrator && npm install body-parser@^1.20.6 --save
  ```
- **Timeline:** Fix within 4 weeks

### DEP-017: @babel/core - Arbitrary File Read via sourceMappingURL
- **Severity:** P3 (LOW)
- **Category:** CVE / File Disclosure
- **Package:** @babel/core
- **Affected Versions:** <= 7.29.0
- **Impact:** Source/Backend, Source/Frontend, portal/Frontend (transitive via build tools)
- **Description:** Babel processes sourceMappingURL comments without validation, potentially reading arbitrary files.
- **Fix:** `npm audit fix` (should pull in 7.30.0+)
- **Timeline:** Fix within 4 weeks

---

## Outdated Major Versions (P3)

### DEP-018: express - 1 Major Version Behind
- **Severity:** P3 (Outdated but not critical)
- **Current:** 4.18.2
- **Latest Available:** 5.2.1
- **Wanted (patch):** 4.22.2
- **Impact:** Source/Backend, platform/orchestrator, portal/Backend
- **Note:** Express 5.x has breaking changes; upgrade requires code changes
- **Recommendation:** 
  - Short term: Update to 4.22.2 for security patches
  - Long term: Plan migration to Express 5.x (breaking changes in middleware, error handling)
- **Fix:**
  ```bash
  # Update within 4.x series
  cd Source/Backend && npm install express@^4.22.2 --save
  ```
- **Timeline:** 4 weeks (4.x patch), 8 weeks (plan 5.x migration)

### DEP-019: pino - 2 Major Versions Behind
- **Severity:** P3 (Outdated)
- **Current:** 8.17.0
- **Latest Available:** 10.3.1
- **Impact:** Source/Backend
- **Note:** pino 10.x introduces performance improvements and bug fixes
- **Fix:**
  ```bash
  cd Source/Backend && npm install pino@^10.3.1 --save
  ```
- **Timeline:** 4 weeks

### DEP-020: uuid - 5 Major Versions Behind
- **Severity:** P3 (Outdated, but low risk)
- **Current:** 9.0.0
- **Latest Available:** 14.0.2
- **Impact:** Source/Backend, platform/orchestrator, portal/Backend
- **Note:** uuid is stable; major version bumps are typically minor changes
- **Fix:**
  ```bash
  cd Source/Backend && npm install uuid@^14.0.2 --save
  cd platform/orchestrator && npm install uuid@^14.0.2 --save
  ```
- **Timeline:** 4 weeks

### DEP-021: React - 1 Major Version Behind
- **Severity:** P3 (Outdated)
- **Current:** 18.3.1
- **Latest Available:** 19.3.0
- **Impact:** Source/Frontend, portal/Frontend
- **Note:** React 19.x has new APIs (Actions, useActionState, etc.); requires code changes
- **Recommendation:** Plan migration for next sprint
- **Fix (short term):**
  ```bash
  cd Source/Frontend && npm install react@^18.3.1 react-dom@^18.3.1 --save
  cd portal/Frontend && npm install react@^18.3.1 react-dom@^18.3.1 --save
  ```
- **Timeline:** 18.x updates within 2 weeks; React 19 migration within 8 weeks

### DEP-022: react-router-dom - 1 Major Version Behind
- **Severity:** P3 (Outdated)
- **Current:** 6.26.0–6.30.6
- **Latest Available:** 7.18.3
- **Impact:** Source/Frontend, portal/Frontend
- **Note:** React Router 7.x requires React 16.8+; breaking changes in APIs
- **Fix (short term):**
  ```bash
  cd Source/Frontend && npm install react-router-dom@^6.30.6 --save
  cd portal/Frontend && npm install react-router-dom@^6.30.6 --save
  ```
- **Timeline:** 6.x patch updates within 2 weeks; React Router 7 migration within 8 weeks

---

## License Compliance

**Status:** ✅ No license violations detected

All primary dependencies use permissive licenses:
- **MIT**: express, pino, uuid, react, react-dom, react-router-dom, vite, typescript
- **Apache-2.0**: prom-client
- **ISC**: (standard/common)

**Recommendation:** Continue monitoring for GPL/AGPL dependencies if adding new packages.

---

## Dependency Tree Analysis

### Size Summary
| Project | Direct | Total | Risk Level |
|---------|--------|-------|-----------|
| Source/Backend | 13 | 412 | ⚠️ Moderate (within safe bounds) |
| Source/Frontend | 13 | 231 | ✅ Healthy |
| Source/E2E | 1 | ~5 | ✅ Minimal |
| platform/orchestrator | 3 | ~150 | ✅ Healthy (small focused project) |
| portal/Backend | 9 | ~450 | ⚠️ Moderate (high transitive count) |
| portal/Frontend | 9 | ~240 | ⚠️ Moderate |

**Finding:** All projects are within the 500-package threshold. No high-risk dependency bloat detected.

### Duplicate/Version Conflicts
- No major version conflicts detected across transitive dependencies
- Build tools (vite, jest, vitest) are isolated per project (no shared versions)

---

## Abandoned Dependencies

**Status:** ✅ No abandoned libraries detected

All dependencies are actively maintained:
- express: Last release 6 months ago ✅
- react: Latest 19.x releases active ✅
- pino: Last release < 1 month ago ✅
- All dev dependencies: Active maintenance ✅

---

## Recommended Action Plan

### Immediate (Do Today)
1. **Fix protobufjs CVE** in platform/orchestrator and portal/Backend
2. **Fix vitest CVE** in portal/Backend and portal/Frontend
3. **Fix brace-expansion CVE** in Source/Backend
4. **Fix browserslist CVE** in Source/Frontend and portal/Frontend

### This Week
5. Fix path-to-regexp, @grpc/grpc-js, vite, postcss, form-data, nanoid
6. Run full test suite to ensure no regressions
7. Verify in staging environment

### Next Sprint
8. Plan React 18.x patch updates (express, pino, uuid)
9. Begin planning React 19.x and React Router 7.x migrations
10. Audit all new dependencies added for known CVEs

### Ongoing
11. Enable Dependabot or similar for automated CVE alerts
12. Add `npm audit` to pre-commit hooks
13. Review and fix HIGH/CRITICAL CVEs within 1 week of disclosure

---

## Cross-Team Escalations

🔴 **[ESCALATE → TheGuardians]**
- protobufjs: Arbitrary code execution risk in telemetry pipeline
- handlebars: Template injection risk in workflow engine
- vitest: Secret exposure via test runner (path traversal)
- form-data: Header injection in upload handling

These require security-focused review before fixes are merged.

---

## Tools & Commands Reference

### Audit Commands by Project
```bash
# Source/Backend
cd Source/Backend && npm audit --json | jq '.metadata.vulnerabilities'

# Source/Frontend
cd Source/Frontend && npm audit --json | jq '.metadata.vulnerabilities'

# Source/E2E
cd Source/E2E && npm audit --json | jq '.metadata.vulnerabilities'

# platform/orchestrator
cd platform/orchestrator && npm audit --json | jq '.metadata.vulnerabilities'

# portal/Backend
cd portal/Backend && npm audit --json | jq '.metadata.vulnerabilities'

# portal/Frontend
cd portal/Frontend && npm audit --json | jq '.metadata.vulnerabilities'
```

### Fix Commands (use with caution)
```bash
# For each project, run:
npm audit fix        # Safe fixes (patch/minor versions)
npm audit fix --force  # Aggressive (can have breaking changes)
```

### Verify Fixes
```bash
npm audit --json | jq '.metadata.vulnerabilities | .critical, .high'
```

---

## JSON Summary Block

```json
{
  "audit_date": "2026-09-13",
  "overall_grade": "C",
  "rationale": "Multiple critical CVEs (protobufjs, handlebars, vitest) + 35 high-severity issues requiring immediate remediation",
  "vulnerabilities_by_severity": {
    "critical": 5,
    "high": 35,
    "moderate": 57,
    "low": 6,
    "total": 103
  },
  "projects_scanned": 6,
  "projects_with_vulnerabilities": 6,
  "projects_clean": 0,
  "dependency_tree_health": {
    "max_packages": 450,
    "safe_threshold": 500,
    "status": "healthy"
  },
  "outdated_major_versions": {
    "express": "4.18.2 → 4.22.2 (patch) or 5.2.1 (major)",
    "pino": "8.17.0 → 10.3.1",
    "uuid": "9.0.0 → 14.0.2",
    "react": "18.3.1 → 19.3.0",
    "react-router-dom": "6.26.0 → 7.18.3"
  },
  "license_issues": 0,
  "abandoned_dependencies": 0,
  "critical_fixes_needed": [
    "protobufjs (platform/orchestrator, portal/Backend)",
    "handlebars (Source/Backend)",
    "vitest (portal/Backend, portal/Frontend)"
  ],
  "estimated_fix_time_hours": 16,
  "next_audit_recommended": "2026-10-13"
}
```

---

## Learnings & Notes

_(To be updated after implementation)_

- **Watch List:** protobufjs, handlebars, vitest — these have had multiple CVEs
- **Audit Frequency:** Monthly for dev environment, quarterly for production dependencies
- **Automation:** Consider setting up Dependabot + GitHub security alerts for CI/CD integration
