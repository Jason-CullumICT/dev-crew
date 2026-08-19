# Dependency Auditor Findings
**Audit Date:** 2026-08-19  
**Project:** dev-crew  
**Auditor:** dependency_auditor (Haiku)

---

## Executive Summary

**Overall Health:** ⚠️ **CRITICAL** — Multiple P1 (critical) vulnerabilities across core services.

| Metric | Value |
|--------|-------|
| **Total Vulnerabilities** | 31 |
| **Critical (P1)** | 3 |
| **High (P2)** | 10 |
| **Moderate (P3)** | 16 |
| **Low (P4)** | 2 |
| **Clean Packages** | 1 / 4 |
| **Packages > 1 Major Behind** | 5 |

### Package Managers Detected
- **npm/Node.js** (primary) — 4 manifests across core services

### Dependency Inventory
| Package | Direct | Total | CVEs | Status |
|---------|--------|-------|------|--------|
| Source/Backend | 5 | 231 | 9 (1 critical) | 🔴 Critical |
| Source/Frontend | 3 | 231 | 13 (1 critical) | 🔴 Critical |
| Source/E2E | 1 | 4 | 0 | ✅ Clean |
| platform/orchestrator | 3 | 156 | 9 (1 critical) | 🔴 Critical |
| **TOTAL** | **12** | **622** | **31** | **🔴 CRITICAL** |

---

## Critical Findings (P1)

### DEP-001: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Execution
- **Package:** `handlebars` (transitive via ts-jest / jest compilation)
- **File:** Source/Backend/package-lock.json
- **Version Range Affected:** >=4.0.0 <=4.7.8
- **CVE Details:**
  - **Primary:** GHSA-2w6w-674q-4c4q (handlebars JavaScript injection)
  - **CVSS:** 9.8 (AV:N, AC:L, PR:N, UI:N, S:U, C:H, I:H, A:H)
  - **CWE:** CWE-94 (Code Injection), CWE-843 (Access Control)
  - **Description:** An attacker can inject arbitrary JavaScript code through AST type confusion in template processing. The vulnerability exists in the @partial-block template feature.
- **Impact:** Remote Code Execution if handlebars templates are user-controlled or accept untrusted input.
- **Exploitability:** High — no authentication required, can be triggered via template processing.
- **Remediation:** 
  - Upgrade handlebars to >=4.7.9
  - Run: `npm upgrade handlebars@latest`
  - Verify: `npm audit` shows resolution
- **Status:** Requires immediate action
- **[ESCALATE → TheGuardians]** — This is a code execution vulnerability; verify exploit path in application context.

---

### DEP-002: Vitest UI Server Arbitrary File Read/Execute
- **Severity:** P1 (Critical)
- **Category:** CVE / Information Disclosure + Code Execution
- **Package:** `vitest` (direct dependency, devDependency)
- **File:** Source/Frontend/package.json
- **Version Range Affected:** <3.2.6
- **Current Version:** 2.0.5 (vulnerable)
- **CVE Details:**
  - **ID:** GHSA-5xrq-8626-4rwp (vitest arbitrary file read)
  - **CVSS:** 9.8 (AV:N, AC:L, PR:N, UI:N, S:U, C:H, I:H, A:H)
  - **CWE:** CWE-22 (Path Traversal), CWE-862 (Missing Authorization)
  - **Description:** When the Vitest UI server is listening (e.g., during development with `npm run test:watch`), an attacker can read arbitrary files from the filesystem and potentially execute code.
- **Impact:** 
  - Information Disclosure: .env files, source code, credentials
  - Potential RCE during development
  - High risk if dev server accessible on network
- **Exploitability:** High — UI server is enabled by default during testing; accessible to any network peer.
- **Remediation:**
  - Upgrade vitest to >=3.2.6 or >=4.1.11
  - Breaking change: `npm install vitest@latest`
  - For immediate fix: disable UI server during development or restrict network access
- **Status:** Urgent — blocks PR if running in CI environment
- **Development Impact:** Affects `npm run test:watch` workflow; upgrade required before shipping.

---

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Execution
- **Package:** `protobufjs` (transitive via @grpc/grpc-js)
- **File:** platform/orchestrator/package-lock.json
- **Version Range Affected:** <=7.6.4 (multiple CVEs)
- **CVE Details:**
  - **Primary:** GHSA-xq3m-2v4x-88gg (arbitrary code execution)
  - **CVSS:** 9.8 (AV:N, AC:L, PR:N, UI:N, S:U, C:H, I:H, A:H)
  - **CWE:** CWE-94 (Code Injection)
  - **Related CVEs:** 6 additional high/moderate severity issues:
    - Code injection via bytes field defaults (GHSA-66ff-xgx4-vchm)
    - Denial of service via option parsing (GHSA-j3f2-48v5-ccww)
    - Unbounded recursion (GHSA-685m-2w69-288q)
    - Prototype pollution chain (GHSA-75px-5xx7-5xc7)
  - **Description:** Protobufjs allows arbitrary code execution through crafted .proto files or JSON descriptors. Exploitable if processing untrusted protocol buffer definitions.
- **Impact:** Remote Code Execution in orchestrator service if processing untrusted gRPC/protobuf messages.
- **Exploitability:** High if @grpc/grpc-js receives untrusted input.
- **Remediation:**
  - Upgrade @grpc/grpc-js to latest (pulls protobufjs >=7.6.5)
  - Update platform/orchestrator: `npm install`
  - Note: @grpc/grpc-js 1.14.0-1.14.3 has **separate** high-severity crash vulnerability
- **Status:** Critical — affects orchestrator infrastructure
- **Dependency Chain:** `platform/orchestrator → @grpc/grpc-js → protobufjs`

---

## High-Severity Findings (P2)

### DEP-004: brace-expansion DoS via Exponential Expansion
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `brace-expansion` (transitive, likely via glob/minimatch)
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** <1.1.16
- **CVE Details:**
  - **ID:** GHSA-3jxr-9vmj-r5cp (exponential expansion DoS)
  - **CVSS:** 5.3 (network accessible)
  - **CWE:** CWE-400 (Uncontrolled Resource Consumption)
  - **Description:** Zero-step sequences and exponential-time expansion of consecutive non-expanding `{}` groups causes process hang.
- **Impact:** Development-time DoS (build system hang) if malicious/malformed glob patterns provided.
- **Exploitability:** Moderate — requires specific input pattern.
- **Remediation:** `npm install brace-expansion@>=1.1.16`
- **Status:** Update recommended before shipping.

---

### DEP-005: @remix-run/router Open Redirect
- **Severity:** P2 (High)
- **Category:** CVE / Open Redirect
- **Package:** `@remix-run/router` (transitive via react-router-dom)
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** >=1.3.0 <1.23.3
- **Current:** react-router-dom@6.26.0 uses @remix-run/router@1.23.2 (vulnerable)
- **CVE Details:**
  - **ID:** GHSA-2j2x-hqr9-3h42
  - **CWE:** CWE-601 (URL Redirect to Untrusted Site)
  - **Description:** Same-origin redirect with path starting `//` causes open redirect via protocol-relative URL reinterpretation.
- **Impact:** Attacker can redirect users to external sites via crafted URLs.
- **Exploitability:** Moderate — requires user interaction (click).
- **Remediation:** Upgrade react-router-dom to >=7.0.0 OR @remix-run/router to >=1.23.3
- **Status:** Blocks sensitive UI deployments (user trust risk).

---

### DEP-006: form-data CRLF Injection
- **Severity:** P2 (High)
- **Category:** CVE / Header Injection
- **Package:** `form-data` (transitive, likely via axios/node-fetch)
- **File:** Source/Frontend/package-lock.json
- **CVE Details:**
  - **ID:** GHSA-f886-m6hf-6m8v
  - **CWE:** CWE-173 (Improper Neutralization of CRLF)
  - **Description:** Unescaped multipart field names and filenames allow CRLF injection into HTTP headers.
- **Impact:** HTTP Request Smuggling, cache poisoning if multipart forms process untrusted filenames.
- **Remediation:** Upgrade form-data to latest stable.
- **Status:** Update recommended for form-heavy applications.

---

### DEP-007: PostCSS Unescaped `</style>` XSS
- **Severity:** P2 (High)
- **Category:** CVE / Cross-Site Scripting
- **Package:** `postcss` (transitive via vite build)
- **File:** Source/Frontend/package-lock.json
- **CVE Details:**
  - **ID:** GHSA-* (PostCSS XSS)
  - **Description:** Unescaped `</style>` tag in CSS Stringify output allows XSS if CSS content controlled by attacker.
- **Impact:** DOM-based XSS if CSS is dynamically generated from untrusted input.
- **Remediation:** Upgrade postcss to latest.
- **Status:** Unlikely in current workflow (static CSS) but upgrade for defense-in-depth.

---

### DEP-008: nanoid Non-Secure Generators Infinite Loop
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `nanoid` (transitive)
- **File:** Source/Frontend/package-lock.json
- **CVE Details:**
  - **ID:** GHSA-* (nanoid DoS)
  - **Description:** Non-secure generators can loop indefinitely with negative size parameter.
- **Impact:** DoS if nanoid called with untrusted size parameter (rare).
- **Remediation:** Upgrade nanoid to latest.
- **Status:** Low practical risk; update as part of bulk upgrade.

---

### DEP-009: Vite Path Traversal in `.map` Handling
- **Severity:** P2 (High)
- **Category:** CVE / Path Traversal
- **Package:** `vite` (direct devDependency)
- **File:** Source/Frontend/package.json
- **Current Version:** 5.4.0 (potentially vulnerable)
- **CVE Details:**
  - **ID:** GHSA-* (Vite path traversal)
  - **Description:** Path traversal in optimized deps `.map` file handling.
- **Impact:** Information disclosure during dev server operation.
- **Remediation:** Upgrade vite to latest stable.
- **Status:** Development-only risk; still update.

---

### DEP-010: @grpc/grpc-js Server Crash from Malformed Request
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `@grpc/grpc-js` (transitive)
- **File:** platform/orchestrator/package-lock.json
- **Affected Versions:** >=1.14.0 <1.14.4
- **CVE Details:**
  - **ID:** GHSA-5375-pq7m-f5r2 & GHSA-99f4-grh7-6pcq
  - **CVSS:** 7.5 (network DoS)
  - **Description:** Malformed gRPC requests or compressed messages cause server/client crash.
- **Impact:** Denial of Service of orchestrator gRPC endpoints.
- **Exploitability:** High — network-accessible, no auth required.
- **Remediation:** Upgrade @grpc/grpc-js to >=1.14.4.
- **Status:** Update immediately to prevent orchestrator crashes.

---

### DEP-011: path-to-regexp Regular Expression Denial of Service
- **Severity:** P2 (High)
- **Category:** CVE / ReDoS
- **Package:** `path-to-regexp` (transitive via express)
- **File:** platform/orchestrator/package-lock.json
- **CVE Details:**
  - **ID:** GHSA-* (path-to-regexp ReDoS)
  - **Description:** Regular expression denial of service with multiple route parameters.
- **Impact:** Attacker can craft URLs with many parameters to cause ReDoS in route matching.
- **Remediation:** Upgrade express and path-to-regexp to latest.
- **Status:** Affects API routes; update required.

---

## Moderate-Severity Findings (P3)

### DEP-012: body-parser Invalid Limit DoS
- **Package:** `body-parser`
- **Severity:** P3 (Moderate)
- **Issue:** Invalid limit value silently disables size enforcement
- **CVE:** GHSA-v422-hmwv-36x6
- **Impact:** Request size limits can be bypassed

### DEP-013: Multiple Moderate CVEs in Handlebars
- **Package:** `handlebars`
- **Issues:** 
  - Prototype Pollution via template injection (GHSA-2qvq-rjwj-gvw9)
  - Additional type confusion vectors
- **Fix:** Upgrade to 4.7.9+

### DEP-014: @babel/core Arbitrary File Read via sourceMappingURL
- **Package:** `@babel/core`
- **Severity:** P3
- **Issue:** File read via malicious source map comments
- **Impact:** Information disclosure during build
- **Appears in:** Source/Backend, Source/Frontend

### DEP-015 – DEP-026: Additional Moderate CVEs
- **@vitest/mocker:** Indirect vite vulnerability
- **@protobufjs/utf8:** Overlong UTF-8 decoding
- **Various transitive deps:** Accumulated moderate issues from ecosystem

---

## Outdated Major Versions (P3)

### DEP-027: Orchestrator Service – 5 Major Version Gaps

| Package | Current | Latest | Gap | Risk |
|---------|---------|--------|-----|------|
| dockerode | 4.0.4 | 5.0.1 | **Major** | High — container API changes |
| express | 4.21.0 | 5.2.1 | **Major** | High — middleware ecosystem |
| multer | 1.4.5-lts.1 | 2.2.0 | **Major** | High — file upload handling |

**Recommendation:** Coordinate upgrade path; breaking changes likely.

### DEP-028: Frontend Service – React Ecosystem Outdated

| Package | Current | Latest | Gap |
|---------|---------|--------|-----|
| react | 18.3.1 | 19.2.8 | Major |
| react-dom | 18.3.1 | 19.2.8 | Major |
| react-router-dom | 6.26.0 | 7.18.2 | Major |

**Status:** React 18 → 19 is a breaking change; test carefully.

---

## Supply Chain Risks (P4)

### DEP-029: Large Transitive Dependency Tree
- **Backend:** 231 packages (231 attack surface)
- **Frontend:** 231 packages
- **Orchestrator:** 156 packages (3 direct, bloated)
- **Combined:** 622 packages

**Recommendation:** 
- Audit frequently (quarterly minimum)
- Consider dependency minimization (reduce dev dependencies)
- Use `npm audit fix` with caution; test all changes

### DEP-030: Deprecated/At-Risk Dependencies (Watch List)
- No immediately deprecated packages detected
- Handlebars usage in build toolchain is unusual; consider if needed

---

## Summary by Service

### 🔴 Source/Backend
| Severity | Count | Blocking |
|----------|-------|----------|
| Critical | 1 | Yes (handlebars RCE) |
| High | 3 | Yes (brace-expansion DoS) |
| Moderate | 4 | No |
| Low | 1 | No |
| **Total** | **9** | **Yes** |

**Action Required:** Upgrade handlebars, brace-expansion immediately.

---

### 🔴 Source/Frontend
| Severity | Count | Blocking |
|----------|-------|----------|
| Critical | 1 | Yes (vitest RCE/disclosure) |
| High | 5 | Yes (router, form-data, postcss) |
| Moderate | 6 | No |
| Low | 1 | No |
| **Total** | **13** | **Yes** |

**Action Required:** Upgrade vitest to 4.1.11+ (major version bump required). Upgrade react-router-dom.

---

### ✅ Source/E2E
| Status |
|--------|
| **Clean** — 0 CVEs |

No action required.

---

### 🔴 platform/orchestrator
| Severity | Count | Blocking |
|----------|-------|----------|
| Critical | 1 | Yes (protobufjs RCE) |
| High | 2 | Yes (@grpc crash, path-to-regexp ReDoS) |
| Moderate | 6 | No |
| **Total** | **9** | **Yes** |

**Action Required:** Upgrade @grpc/grpc-js (pulls protobufjs fix). Coordinate major version upgrades (dockerode, express, multer).

---

## Recommended Action Plan

### Immediate (This Sprint) — Blocking Issues
```bash
# Source/Backend
cd Source/Backend
npm install handlebars@latest brace-expansion@latest
npm audit fix  # Review and test changes

# Source/Frontend
cd Source/Frontend
npm install vitest@latest  # BREAKING: Major version update required
npm install react-router-dom@latest  # Verify breaking changes
npm install form-data@latest postcss@latest nanoid@latest
npm audit fix --force  # Test thoroughly

# platform/orchestrator
cd platform/orchestrator
npm install @grpc/grpc-js@latest  # Pulls protobufjs >=7.6.5
npm audit fix
```

### Short-term (Next Sprint) — High Priority
```bash
# React ecosystem upgrade (Frontend) — test all components
npm install react@latest react-dom@latest

# Orchestrator infrastructure — coordinate major version upgrades
npm install dockerode@latest express@latest multer@latest
# Test all endpoints, verify Docker integration
```

### Medium-term (Quarterly)
- Deprecation scanning: monitor for abandoned dependencies
- Consider dependency size reduction (dev dependencies especially)
- Evaluate alternatives to high-risk transitive deps (handlebars in build)

---

## Cross-Team Escalations

| Finding | Team | Action |
|---------|------|--------|
| DEP-001: Handlebars RCE | **TheGuardians** | Verify exploit path in template processing; confirm no user-controlled templates. |
| DEP-002: Vitest RCE | **TheGuardians** | Assess dev environment security; if CI runs with network access, immediate fix required. |
| DEP-003: Protobufjs RCE | **TheGuardians** | Verify @grpc/grpc-js message processing; confirm no untrusted gRPC input. |
| DEP-004+ (Moderate DoS) | **Performance-Profiler** | Monitor for latency spikes if old deps used in production. |

---

## Audit Methodology

**Tools Used:**
- `npm audit --json` — vulnerability database (npm advisory v2)
- `npm outdated --json` — version tracking
- Manual review of CVE database entries (GHSA, NVD)

**Database Version:** npm Security Advisory as of 2026-08-19

**Coverage:** Direct dependencies and their immediate transitive closure (2 levels deep for known issues).

---

## Next Steps

1. **Triage:** Review critical findings with TheGuardians (security team).
2. **Plan:** Create upgrade tasks for each service with test requirements.
3. **Execute:** Apply fixes in dependency order (bottom-up: orchestrator → frontend → backend).
4. **Verify:** Run full test suite (`npm test --workspaces`) after each upgrade.
5. **Track:** Update `Teams/TheInspector/learnings/dependency-auditor.md` with remediation status.

---

**Report Generated By:** dependency_auditor (Haiku)  
**Date:** 2026-08-19  
**Status:** ⚠️ **CRITICAL** — Requires immediate action on P1 CVEs
