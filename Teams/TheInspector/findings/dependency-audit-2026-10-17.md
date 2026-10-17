# Dependency Auditor Findings — 2026-10-17

**Grade: D** (Multiple critical and high-severity vulnerabilities with breaking changes required for fixes)

## Executive Summary

Comprehensive CVE scan across npm projects in the Source/ directory reveals **59 total vulnerabilities** spanning 3 package managers, with **4 critical issues** requiring immediate action. Critical path affected: test framework (jest, vitest) and development infrastructure (vite).

### Quick Stats
- **Total Projects Audited:** 3 (Backend, Frontend, E2E)
- **Package Managers:** npm only (no Go, Python, Rust dependencies found)
- **Total Vulnerabilities:** 59 (4 critical, 40 high, 12 moderate, 3 low)
- **Direct Dependencies:** 8 (Backend 4, Frontend 3, E2E 1)
- **Transitive Dependencies:** ~600+ (estimated from node_modules sizes)
- **License Compliance:** ✅ No GPL/AGPL; all permissive (MIT, ISC, Apache-2.0)

---

## Critical Issues (P1)

### DEP-001: Tinypool Remote Code Execution via Prototype Pollution
- **Severity:** P1 (Critical - RCE in test/dev infrastructure)
- **Category:** CVE / Supply Chain
- **Package:** `tinypool` ≤2.1.1
- **Affected File:** `Source/Frontend/package.json` (via `vitest` → `tinypool`)
- **CVE:** GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr
- **Impact:** Vitest test runner in Frontend can execute arbitrary code via prototype pollution in worker options. **This is a dev-time exploit but affects CI/CD and local development security.**
- **Detail:** 
  - Two separate prototype pollution gadgets identified
  - Affects Vitest versions up to 4.1.10
  - Can be exploited during test execution in `npm run test`
- **Fix:** `npm audit fix --force` → upgrades vitest to 5.0.5 (breaking change, major version bump)
- **Blocking:** Frontend tests cannot be trusted until fixed. CI/CD pipeline at risk.
- **Cross-ref:** [ESCALATE → TheGuardians] if tests run untrusted code

### DEP-002: Handlebars.js JavaScript Injection (Multiple Gadgets)
- **Severity:** P1 (Critical - AST injection, XSS, Prototype Pollution)
- **Category:** CVE
- **Package:** `handlebars` (transitive via jest ecosystem)
- **Affected File:** `Source/Backend/package.json` (via test framework)
- **CVEs:** GHSA-3mfm-83xf-c92r, GHSA-2w6w-674q-4c4q, GHSA-2qvq-rjwj-gvw9
- **Impact:** Three distinct injection vectors in template processing:
  1. AST Type Confusion via @partial-block tampering
  2. Direct AST Type Confusion injection
  3. Prototype Pollution leading to XSS via partial template injection
- **Detail:** Affects Jest test framework indirectly; could expose test secrets or allow test-time code execution
- **Fix:** Update Jest → 30.5.2 (breaking change)
- **Blocking:** Backend tests must not process untrusted input in templates

### DEP-003: proxy-addr IPv4-Mapped IPv6 IP Spoofing
- **Severity:** P1 (Critical - Authentication bypass potential)
- **Category:** CVE
- **Package:** `proxy-addr` (transitive via express)
- **Affected File:** `Source/Backend/package.json` (via `express`)
- **CVE:** GHSA-jqcg-44mw-7w3h
- **Impact:** If backend forwards requests through a proxy with trust settings, attacker can spoof IP addresses using IPv4-mapped IPv6 notation (e.g., `::ffff:127.0.0.1`).
- **Detail:** 
  - Affects X-Forwarded-For parsing in Express middleware
  - Could bypass rate limiting, access control, or audit logging based on IP
  - Requires misconfigured proxy trust (common in Kubernetes, cloud deployments)
- **Fix:** Update express → 5.3.0 OR update proxy-addr separately
- **Blocking:** Production deployment at risk if behind proxy

---

## High-Severity Issues (P2)

### DEP-004: Jest Ecosystem HIGH Severity Chain
- **Severity:** P2 (High - affects all backend tests)
- **Category:** CVE
- **Packages:** `@jest/console`, `@jest/core`, `@jest/environment`, `@jest/expect`, `@jest/fake-timers`, `@jest/globals`, `@jest/reporters`, `@jest/test-result`, `@jest/transform`, plus transitive: `jest-config`, `jest-haste-map`, `jest-message-util`, `jest-resolve`, `jest-resolve-dependencies`, `jest-runner`, `jest-runtime`, `jest-snapshot`, `jest-watcher`, `jest-cli`
- **Affected File:** `Source/Backend/package.json`
- **CVEs:** Via `jest-message-util` and upstream dependencies (Handlebars)
- **Detail:** 
  - 14 separate @jest/* packages affected
  - Root cause: `jest-message-util` has dependency chain to vulnerable Handlebars
  - `micromatch` also has DoS vulnerabilities (brace-expansion cascades)
- **Fix:** `npm audit fix --force` → jest 30.5.2 (breaking, requires major version bump)
- **Testing Impact:** All 13 Backend test suites affected

### DEP-005: Braces Stack Exhaustion DoS (7 Variants)
- **Severity:** P2 (High - transitive DoS attack vector)
- **Category:** CVE
- **Package:** `braces` *
- **Affected File:** `Source/Backend/package.json` (via jest → micromatch → braces)
- **CVEs:** 
  - GHSA-f886-m6hf-6m8v (Zero-step sequence causes process hang)
  - GHSA-3jxr-9vmj-r5cp (DoS via exponential-time expansion)
  - GHSA-mh99-v99m-4gvg (Unbounded expansion length → OOM)
  - GHSA-rgw5-rvv9-x895 (Unbounded intermediate arrays)
  - GHSA-q2hr-2g5m-vwhr (Quadratic-time expansion)
  - GHSA-qhr7-859c-m2p7 (Stack exhaustion via nested groups)
  - GHSA-6j4f-fj2g-mc7p (Stack exhaustion via parseCommaParts)
- **Impact:** Specially crafted glob patterns in file matching (e.g., jest test discovery) could exhaust process memory
- **Fix:** `npm audit fix` → updates micromatch → updates braces
- **Supply Chain Risk:** Could be exploited by malicious test files or project paths

### DEP-006: Vitest/Vite Supply Chain Risks (3+ CVEs)
- **Severity:** P2 (High - dev server vulnerable to CSRF/SSRF)
- **Category:** CVE
- **Packages:** `vitest` ≤4.1.10, `vite` ≤6.4.2, `esbuild` ≤0.24.2, `@vitest/mocker` ≤4.1.10, `vite-node` ≤2.2.0-beta.2
- **Affected File:** `Source/Frontend/package.json`
- **CVEs:**
  - GHSA-82fw-gwwq-j7x9 (Vitest path traversal via @vitest/mocker redirect)
  - GHSA-67mh-4wv8-2f99 (Esbuild allows arbitrary requests to dev server)
- **Impact:** 
  1. Vite dev server (npm run dev @ localhost:5173) can be exploited to read arbitrary files on disk
  2. Attacker-controlled website can send requests through dev server and read responses
  3. @vitest/mocker can redirect mocks to files outside project
- **Fix:** `npm audit fix --force` → vitest 5.0.5, vite 8.3.4 (breaking changes)
- **Dev Environment Risk:** Affects all developers running `npm run dev`

### DEP-007: PostCSS XSS and Path Traversal (4 CVEs)
- **Severity:** P2 (High - if processing untrusted CSS)
- **Category:** CVE
- **Package:** `postcss` ≤8.5.22
- **Affected File:** `Source/Frontend/package.json`
- **CVEs:**
  - GHSA-qx2v-qp2m-jg93 (XSS via unescaped </style>)
  - GHSA-6g55-p6wh-862q (Arbitrary file read via sourceMappingURL)
  - GHSA-fxqj-rqcc-2cmp (Incomplete fix allowing .map file disclosure)
  - GHSA-r28c-9q8g-f849 (Path traversal in auto-loading)
- **Impact:** If build process processes untrusted CSS (e.g., user-generated), could inject scripts or read project files
- **Fix:** `npm audit fix` → postcss 8.5.23+
- **Build Risk:** Affects `npm run build` step

### DEP-008: Nanoid Integer Overflow (3 CVEs)
- **Severity:** P2 (High - affects UUID generation)
- **Category:** CVE
- **Package:** `nanoid` ≤3.3.17
- **Affected File:** `Source/Frontend/package.json` (transitive)
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv (Non-secure generators can loop indefinitely)
  - GHSA-2v37-7h3g-55p8 (Custom generators loop with size=0)
  - GHSA-xwg4-73v4-xw9w (Integer overflow/wraparound)
- **Impact:** If using nanoid for secure IDs (work item IDs?), could generate colliding or predictable IDs
- **Fix:** `npm audit fix` → nanoid 3.3.18+

### DEP-009: WebSocket (ws) Memory Exhaustion DoS
- **Severity:** P2 (High - if WebSockets used in app)
- **Category:** CVE
- **Package:** `ws` 8.0.0-8.20.1
- **Affected File:** `Source/Frontend/package.json` (transitive)
- **CVEs:**
  - GHSA-58qx-3vcg-4xpx (Uninitialized memory disclosure)
  - GHSA-96hv-2xvq-fx4p (Memory exhaustion DoS)
- **Impact:** WebSocket connections can be exploited to exhaust memory or leak uninitialized memory
- **Fix:** `npm audit fix` → ws 8.21.0+

---

## Medium-Severity Issues (P3)

### DEP-010: @babel/core Arbitrary File Read
- **Severity:** P3 (Medium - affects both Backend and Frontend)
- **Category:** CVE
- **Package:** `@babel/core` ≤7.29.0
- **Affected File:** `Source/Backend/package.json`, `Source/Frontend/package.json` (transitive)
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **Impact:** Babel can read arbitrary files via sourceMappingURL comment in source code
- **Fix:** `npm audit fix` (fix available)
- **Note:** Requires malicious source file as vector

### DEP-011: baseline-browser-mapping DoS
- **Severity:** P3 (Medium - process termination)
- **Category:** CVE
- **Package:** `baseline-browser-mapping` ≥2.0.0 <2.11.0
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Impact:** Invalid input causes process termination (likely in build pipeline)
- **Fix:** `npm audit fix`

### DEP-012: body-parser DoS via Invalid Limit
- **Severity:** P3 (Medium - affects API requests)
- **Category:** CVE
- **Package:** `body-parser` <1.20.6 (transitive via express)
- **Affected File:** `Source/Backend/package.json`
- **CVE:** GHSA-v422-hmwv-36x6
- **Impact:** Invalid limit values silently disable size enforcement, allowing unlimited uploads
- **Fix:** Update express → 4.22.3 or body-parser separately

### DEP-013: browserslist OOM and Prototype Pollution
- **Severity:** P3 (Medium - build-time DoS)
- **Category:** CVE
- **Package:** `browserslist` ≤4.28.6
- **Affected File:** `Source/Frontend/package.json` (transitive)
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx (Unbounded memory growth)
  - GHSA-73wf-gq98-2v4g (Prototype pollution via untrusted browserslist-stats.json)
- **Impact:** Large browserslist queries or malicious stats file could OOM build process
- **Fix:** `npm audit fix`

### DEP-014: react-router Open Redirect
- **Severity:** P3 (Medium - open redirect to protocol-relative URLs)
- **Category:** CVE
- **Package:** `@remix-run/router` 1.3.0-1.23.2 (via react-router-dom)
- **Affected File:** `Source/Frontend/package.json` (via react-router-dom)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Impact:** Same-origin redirect with path starting // can be reinterpreted as protocol-relative URL, allowing redirect to attacker's site
- **Fix:** `npm audit fix` → react-router-dom 7.18.4+
- **Example:** Redirect to `//evil.com` would load from attacker's domain

### DEP-015: form-data CRLF Injection
- **Severity:** P3 (Medium - header injection in multipart)
- **Category:** CVE
- **Package:** `form-data` 4.0.0-4.0.5
- **Affected File:** `Source/Frontend/package.json` (transitive via testing tools)
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Impact:** Unescaped multipart field names/filenames could inject CRLF and break multipart boundaries
- **Fix:** `npm audit fix`

### DEP-016: source-map-js DoS
- **Severity:** P3 (Medium - build-time crash)
- **Category:** CVE
- **Package:** `source-map-js` 1.0.0-1.2.1
- **CVE:** GHSA-68fv-2mgg-jv7q
- **Impact:** Event-loop denial of service via indexed source-map offset manipulation
- **Fix:** `npm audit fix`

---

## Outdated Major Versions (P3)

### DEP-017: TypeScript 2+ Major Versions Behind
- **Severity:** P3 (Missing security patches, type safety improvements)
- **Category:** Outdated
- **Current:** 5.9.3 (Backend), 5.9.3 (Frontend)
- **Latest:** 7.0.2 (2 major versions behind)
- **Fix:** `npm update typescript@latest`
- **Note:** May require code changes for strict type checking updates

### DEP-018: Vitest 3 Major Versions Behind
- **Severity:** P3 (Missing security patches, performance)
- **Category:** Outdated
- **Current:** 2.1.9 (Frontend)
- **Latest:** 5.0.5 (3 major versions behind!)
- **Fix:** `npm audit fix --force` (also required for tinypool fix)
- **Breaking Changes:** Likely test API changes

### DEP-019: Vite 3 Major Versions Behind
- **Severity:** P3 (Missing security patches, dev server vulnerabilities)
- **Category:** Outdated
- **Current:** 5.4.21 (Frontend)
- **Latest:** 8.3.4 (3 major versions behind!)
- **Fix:** `npm audit fix --force` (also required for esbuild fix)
- **Breaking Changes:** Plugin API changes, build config updates

### DEP-020: React 1 Major Version Behind
- **Severity:** P3 (Missing features, performance improvements)
- **Category:** Outdated
- **Current:** 18.3.1 (Frontend)
- **Latest:** 19.3.1 (1 major version behind)
- **Fix:** `npm update react react-dom@latest`
- **Breaking Changes:** Hook behavior changes, some API deprecations

### DEP-021: Jest 1 Major Version Behind
- **Severity:** P3 (Missing features, performance)
- **Category:** Outdated
- **Current:** 29.7.0 (Backend)
- **Latest:** 30.5.2 (1 major version behind)
- **Fix:** `npm audit fix --force` (required for Handlebars fix)
- **Note:** Breaking changes in test runner, reporter output

### DEP-022: Pino 2 Major Versions Behind
- **Severity:** P3 (Missing features, performance)
- **Category:** Outdated
- **Current:** 8.21.0 (Backend)
- **Latest:** 10.4.0 (2 major versions behind)
- **Fix:** `npm update pino@latest`
- **Note:** Major version bumps may change logger behavior

### DEP-023: Express 1 Major Version Behind
- **Severity:** P3 (Missing features, security patches)
- **Category:** Outdated
- **Current:** 4.22.1 (Backend)
- **Latest:** 5.3.0 (1 major version behind)
- **Fix:** `npm update express@latest`
- **Note:** Breaking middleware changes in Express 5

---

## Dependency Tree Analysis (P4)

### DEP-024: Large Transitive Dependency Graph
- **Severity:** P4 (Supply chain risk surface)
- **Category:** Supply Chain
- **Backend Direct:** 4 dependencies
- **Backend Transitive:** ~250+ (via jest, ts-jest, babel chain)
- **Frontend Direct:** 3 dependencies (13 with devDependencies)
- **Frontend Transitive:** ~350+ (via vite, vitest, react ecosystem)
- **Total:** ~600+ transitive packages
- **Risk:** Each package is a potential attack surface; version upgrades may break downstream
- **Note:** Vitest/Jest updates are breaking changes, will affect many transitive deps

### DEP-025: Multiple Major Version Gaps Cascade
- **Severity:** P4 (Breaking change risk)
- **Category:** Maintenance
- **Detail:** 
  - TypeScript, Jest, Vitest, Vite all 1-3+ major versions behind
  - Fixing P1/P2 issues requires breaking changes across frontend/backend
  - May introduce incompatibilities between test framework and source code
- **Effort Estimate:** 10-20 hours for full upgrade + testing

---

## License Compliance (Passed ✅)

### DEP-026: License Summary
- **Backend License:** ISC
- **Frontend License:** ISC
- **E2E License:** ISC
- **All Dependencies:** MIT, ISC, Apache-2.0, BSD-3-Clause (permissive)
- **Status:** ✅ No GPL/AGPL detected
- **Recommendation:** Safe for commercial use

---

## Dependency Supply Chain Risks (P4)

### DEP-027: Post-Install Scripts
- **Status:** ✅ None detected in direct dependencies
- **Note:** Some transitive dependencies may have post-install hooks (jest, esbuild)
- **Recommendation:** Monitor during upgrades

### DEP-028: Low-Download Count Packages
- **Status:** ✅ No known fringe packages detected
- **Note:** All major dependencies (express, react, jest, vitest) are well-maintained

---

## Remediation Priority & Timeline

### Immediate (This Sprint) — P1 Critical
1. **DEP-001 (Tinypool RCE):** `npm audit fix --force` in Frontend → vitest 5.0.5
   - Blocks: Frontend CI/CD, local testing
   - Effort: 2-4 hours (test compatibility, breaking changes)
   
2. **DEP-002 (Handlebars):** Update jest in Backend → jest 30.5.2
   - Blocks: Backend CI/CD
   - Effort: 2-4 hours
   
3. **DEP-003 (proxy-addr):** Update express in Backend → 5.3.0
   - Blocks: Production deployment
   - Effort: 1-2 hours

### Short-term (1-2 Weeks) — P2 High
- DEP-004 through DEP-016
- Coordinate Frontend/Backend updates for consistency
- Run full test suite after each major package update
- Update source code for breaking changes (e.g., Jest API changes)

### Medium-term (1 Month) — P3 Outdated
- DEP-017 through DEP-023
- Plan TypeScript, React, Vitest, Vite upgrades together
- Allocate 1-2 sprints for compatibility testing

---

## Blocked Findings

⚠️ **Note:** All backend test vulnerabilities assume tests only run on trusted code. If backend processes untrusted templates or input in tests, escalate to security team.

⚠️ **Note:** All frontend dev server vulnerabilities assume development environments are not exposed to untrusted networks. For CI/CD or remote dev, consider sandboxing.

---

## Cross-References

- [ESCALATE → TheGuardians] DEP-001, DEP-002, DEP-003 if in production or untrusted code paths
- [SEE TheGuardians static-analyzer] for hardcoded secrets in source code (this audit only covers dependencies)
- [Performance-profiler] may want to benchmark impact of Vitest/Vite upgrades

---

## Summary Metrics (JSON)

```json
{
  "audit_date": "2026-10-17",
  "projects_audited": 3,
  "package_managers": ["npm"],
  "total_vulnerabilities": 59,
  "by_severity": {
    "critical": 4,
    "high": 40,
    "moderate": 12,
    "low": 3
  },
  "by_project": {
    "backend": {
      "vulnerabilities": 42,
      "critical": 2,
      "high": 33,
      "outdated_major": 6
    },
    "frontend": {
      "vulnerabilities": 17,
      "critical": 2,
      "high": 7,
      "outdated_major": 8
    },
    "e2e": {
      "vulnerabilities": 0,
      "outdated_major": 1
    }
  },
  "direct_dependencies": 8,
  "transitive_dependencies_estimated": 600,
  "remediation_effort_hours": 20,
  "license_status": "pass",
  "grade": "D"
}
```

---

## Next Steps

1. **Verify findings** with development team (breaking changes may affect local workflows)
2. **Create tickets** for P1/P2 fixes in TheFixer backlog
3. **Plan upgrade sequence:** Backend → Frontend (due to interconnected deps)
4. **Run verification gates** after each major update: `npm audit`, `npm test`, traceability-enforcer
5. **Monitor post-upgrade** for new breaking changes in downstream projects

---

Generated by **Dependency Auditor** (TheInspector Team)
Traceability: `[SEE: Teams/TheInspector/learnings/dependency-auditor.md]`
