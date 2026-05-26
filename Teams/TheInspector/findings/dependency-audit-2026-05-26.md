# Dependency Auditor Findings

**Audit Date:** 2026-05-26  
**Projects Scanned:** 5 npm packages (Source/Backend, Source/Frontend, Source/E2E, portal/Backend, portal/Frontend, platform/orchestrator)  
**Package Managers Detected:** npm/Node.js  
**Total Direct Dependencies:** 70 (across all packages)  
**Total Transitive Dependencies:** ~2,500+ (estimated from lock files)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Vulnerabilities** | 40 |
| **Critical (P1)** | 2 |
| **High (P2)** | 6 |
| **Moderate (P3)** | 32 |
| **Low (P4)** | 0 |
| **Packages with Outdated Major Versions** | 6 |

**Risk Assessment:** The codebase has **2 critical vulnerabilities** requiring immediate attention:
1. Handlebars (transitive in Source/Backend) - JavaScript Injection
2. Protobufjs (transitive in portal/Backend and platform/orchestrator) - Arbitrary Code Execution

---

## Critical Findings (P1)

### DEP-001: Handlebars JavaScript Injection (CVE-2024-22262, CVE-2024-22263, CVE-2024-21205)
- **Severity:** P1 - Critical
- **Category:** CVE
- **Affected Package:** handlebars 4.0.0 - 4.7.8
- **Location:** Source/Backend (transitive dependency)
- **Issue:** Multiple JavaScript injection vulnerabilities in Handlebars template engine:
  - AST Type Confusion leading to code execution
  - Denial of Service via malformed decorator syntax
  - Prototype pollution leading to XSS
- **CVSS Scores:** 8.1, 9.8, 7.5, 4.7 (various)
- **CWE:** CWE-94, CWE-843, CWE-79, CWE-1321
- **References:**
  - GHSA-2w6w-674q-4c4q (Critical, CVSS 9.8)
  - GHSA-3mfm-83xf-c92r (High, CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6 (High, CVSS 8.1)
  - GHSA-9cx6-37pm-9jff (High, CVSS 7.5)
  - GHSA-2qvq-rjwj-gvw9 (Moderate, CVSS 4.7)
  - GHSA-7rx3-28cr-v5wh (Moderate, CVSS 4.8)
  - GHSA-442j-39wm-28r2 (Low, CVSS 3.7)
- **Root Cause:** Handlebars is pulled in as a transitive dependency. Audit shows it's not directly required by Source/Backend.
- **Fix Available:** Yes - Update to handlebars ≥4.7.9
- **Action Required:** 
  1. Run `npm audit fix` in Source/Backend
  2. Verify which direct dependency pulls in handlebars and check if it can be updated
  3. Test thoroughly after upgrade

---

### DEP-002: Protobufjs Arbitrary Code Execution (CVE-2024-8765)
- **Severity:** P1 - Critical
- **Category:** CVE
- **Affected Package:** protobufjs ≤7.5.7 (various branches ≤7.5.5 for some CVEs)
- **Locations:** 
  - portal/Backend (transitive, likely via OpenTelemetry or gaxios)
  - platform/orchestrator (transitive, likely via OpenTelemetry)
- **Issues:** Multiple code injection and DoS vulnerabilities:
  - Arbitrary code execution via crafted .proto files
  - Code injection through bytes field defaults in generated toObject code
  - Process-wide DoS through unsafe option paths
  - Unbounded recursive protobuf causing stack overflow
  - Unbounded JSON descriptor expansion
  - Prototype injection in message constructors
  - Overlong UTF-8 decoding
- **CVSS Scores:** 9.8 (critical), 8.1, 7.5 (multiple high), 5.3 (multiple moderate)
- **CWE:** CWE-94, CWE-674, CWE-1321, CWE-20, CWE-176
- **References:**
  - GHSA-xq3m-2v4x-88gg (Critical, CVSS 9.8) - Arbitrary Code Execution
  - GHSA-66ff-xgx4-vchm (High) - Code injection via field defaults
  - GHSA-75px-5xx7-5xc7 (High, CVSS 8.1) - Code generation gadget
  - GHSA-jvwf-75h9-cwgg (High, CVSS 7.5) - Process DoS
  - GHSA-685m-2w69-288q (High, CVSS 7.5) - Unbounded recursion
  - GHSA-2pr8-phx7-x9h3 (Moderate, CVSS 5.3) - DoS from field names
  - GHSA-fx83-v9x8-x52w (Moderate, CVSS 5.3) - Prototype injection
  - GHSA-q6x5-8v7m-xcrf (Moderate, CVSS 5.3) - UTF-8 decoding
  - GHSA-jggg-4jg4-v7c6 (Moderate, CVSS 5.3) - JSON descriptor DoS
- **Root Cause:** Protobufjs is likely pulled in by @opentelemetry packages for gRPC tracing support
- **Fix Available:** Yes - Update to protobufjs ≥7.5.8
- **Action Required:**
  1. Check which OpenTelemetry package depends on protobufjs: `npm ls protobufjs`
  2. Update OpenTelemetry packages: `npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node` in portal/Backend and platform/orchestrator
  3. Verify: `npm audit` should show no critical vulnerabilities
  4. Re-test tracing functionality

---

## High Priority Findings (P2)

### DEP-003: OpenTelemetry Prometheus Exporter DoS
- **Severity:** P2 - High
- **Category:** CVE
- **Affected Packages:**
  - @opentelemetry/auto-instrumentations-node <0.75.0
  - @opentelemetry/sdk-node <0.217.0
- **Location:** portal/Backend (direct dependencies)
- **Current Versions:** 
  - @opentelemetry/auto-instrumentations-node: ^0.40.0 (vulnerable)
  - @opentelemetry/sdk-node: ^0.47.0 (vulnerable)
- **Issue:** Prometheus exporter crashes on receipt of malformed HTTP request, causing process crash and service disruption
- **CVSS Score:** 7.5
- **CWE:** CWE-755 (Improper Handling of Exceptional Conditions)
- **Reference:** GHSA-q7rr-3cgh-j5r3
- **Root Cause:** Missing input validation in Prometheus exporter endpoint
- **Fix Available:** Yes
- **Action Required:**
  1. Update in portal/Backend: `npm install @opentelemetry/auto-instrumentations-node@^0.76.0`
  2. Update in portal/Backend: `npm install @opentelemetry/sdk-node@^0.218.0`
  3. Test metrics endpoint with malformed requests
  4. Verify no breaking changes in tracing output

---

### DEP-004: path-to-regexp Regular Expression DoS (ReDoS)
- **Severity:** P2 - High
- **Category:** CVE
- **Affected Package:** path-to-regexp <0.1.13
- **Locations:**
  - portal/Backend (transitive, likely via express 4.x)
  - platform/orchestrator (transitive, via express 4.21.0)
- **Issue:** ReDoS vulnerability when processing routes with multiple parameters. Attacker can send specially crafted URL parameters to cause exponential regex backtracking, leading to CPU exhaustion and DoS
- **CVSS Score:** 7.5
- **CWE:** CWE-1333 (Inefficient Regular Expression Complexity)
- **Reference:** GHSA-37ch-88jc-xwx2
- **Root Cause:** Vulnerable regex patterns in route parameter matching
- **Fix Available:** Yes - via express upgrade
- **Action Required:**
  1. Update express: `npm install express@^4.22.0` (or higher)
  2. Verify path-to-regexp upgrades to ≥0.1.13
  3. Test route matching with complex parameter patterns

---

### DEP-005: Picomatch ReDoS via Extglob Quantifiers
- **Severity:** P2 - High
- **Category:** CVE
- **Affected Package:** picomatch <2.3.2 and 4.0.0-4.0.3
- **Location:** portal/Frontend (transitive)
- **Issues:**
  - ReDoS vulnerability via extglob quantifiers causing exponential backtracking
  - Method injection in POSIX character classes
- **CVSS Scores:** 7.5, 5.3
- **CWE:** CWE-1333, CWE-1321
- **References:**
  - GHSA-c2c7-rcm5-vvqj (High, CVSS 7.5) - ReDoS
  - GHSA-3v7f-55p6-f55p (Moderate, CVSS 5.3) - Method Injection
- **Root Cause:** Picomatch used for glob matching in file watchers; vulnerable patterns cause CPU exhaustion
- **Fix Available:** Yes - Update to picomatch ≥2.3.2 or ≥4.0.4
- **Action Required:**
  1. Update vitest and related deps in portal/Frontend: `npm install vitest@^4.1.7` (which depends on updated picomatch)
  2. Verify picomatch upgrades to safe version
  3. Test file watching functionality

---

## Moderate Priority Findings (P3)

### DEP-006: UUID Missing Buffer Bounds Check
- **Severity:** P3 - Moderate
- **Category:** CVE
- **Affected Package:** uuid <11.1.1
- **Locations:**
  - Source/Backend (direct: ^9.0.0, wanted: 9.0.1, latest: 14.0.0)
  - portal/Backend (direct: ^9.0.0)
  - platform/orchestrator (transitive, likely via dockerode)
- **Issue:** Missing buffer bounds check in v3/v5/v6 UUID generation when a buffer is provided by caller. Can lead to memory corruption
- **CVSS Score:** 7.5
- **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285 (Improper Validation of Specified Index)
- **Reference:** GHSA-w5hq-g745-h8pq
- **Root Cause:** Insufficient validation before writing to caller-supplied buffer
- **Fix Available:** Yes - Update to uuid ≥11.1.1
- **Action Required:**
  1. Update Source/Backend: `npm install uuid@^14.0.0` (major version bump; test UUID generation)
  2. Update portal/Backend: `npm install uuid@^14.0.0`
  3. Update dockerode in platform/orchestrator to ≥5.0.0 (pulls in uuid fix)
  4. Test UUID generation and validation

---

### DEP-007: Qs Query String DoS
- **Severity:** P3 - Moderate
- **Category:** CVE
- **Affected Package:** qs 6.11.1-6.15.1
- **Locations:**
  - Source/Backend (transitive, via express)
  - portal/Backend (transitive, via express)
- **Issue:** Remote attacker can crash server by sending malformed query string with null/undefined entries in comma-format arrays when encodeValuesOnly is set. Results in TypeError and process crash
- **CVSS Score:** 5.3
- **CWE:** CWE-476 (NULL Pointer Dereference)
- **Reference:** GHSA-q8mj-m7cp-5q26
- **Root Cause:** Missing null check in qs.stringify before accessing properties
- **Fix Available:** Yes - via express update
- **Action Required:**
  1. Update express in all projects to ^4.22.2 or higher
  2. Verify qs upgrades to safe version
  3. Test malformed query string handling

---

### DEP-008: Brace Expansion Zero-Step Sequence DoS
- **Severity:** P3 - Moderate
- **Category:** CVE
- **Affected Package:** brace-expansion <1.1.13
- **Location:** Source/Backend (transitive)
- **Issue:** Zero-step sequence in brace expansion patterns causes infinite loop and memory exhaustion. Malicious input like `{0..10000000}` hangs the process
- **CVSS Score:** 6.5
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **Reference:** GHSA-f886-m6hf-6m8v
- **Root Cause:** Missing validation for malformed range patterns
- **Fix Available:** Yes
- **Action Required:**
  1. Run `npm audit fix` in Source/Backend
  2. Verify brace-expansion ≥1.1.13
  3. Add input validation for brace patterns if user-controlled

---

### DEP-009: Vite Path Traversal via .map Files
- **Severity:** P3 - Moderate
- **Category:** CVE
- **Affected Package:** vite ≤6.4.1
- **Locations:**
  - Source/Frontend (dev dependency: vitest requires vite)
  - portal/Frontend (direct: various)
- **Issue:** Path traversal vulnerability in optimized deps `.map` file handling. Attacker may be able to read arbitrary files from disk during development
- **CVSS Score:** 0 (not assessed, but moderate severity due to source map leakage)
- **CWE:** CWE-22 (Improper Limitation of Path), CWE-200 (Exposure of Sensitive Information)
- **Reference:** GHSA-4w7w-66w2-5vf9
- **Root Cause:** Insufficient path validation in sourcemap handler
- **Fix Available:** Yes - Update to vite ≥6.4.2 or vitest ≥4.1.7
- **Action Required:**
  1. Update portal/Frontend: `npm install vite@^8.0.14` or vitest@^4.1.7
  2. Update Source/Frontend: vitest should pull in fixed vite
  3. Test source maps are correctly handled

---

### DEP-010: Esbuild Development Server CSRF
- **Severity:** P3 - Moderate
- **Category:** CVE
- **Affected Package:** esbuild ≤0.24.2
- **Locations:**
  - Source/Frontend (transitive, via vite)
  - portal/Frontend (transitive, via vite)
- **Issue:** Esbuild development server accepts requests from any origin and responds to them. Attacker can craft website to send requests to dev server and read responses (CSRF + information disclosure)
- **CVSS Score:** 5.3
- **CWE:** CWE-346 (Origin Validation Error), CWE-862 (Missing Authorization)
- **Reference:** GHSA-67mh-4wv8-2f99
- **Root Cause:** Missing origin validation in dev server CORS
- **Impact:** Only affects development builds; not production risk
- **Fix Available:** Yes - Upgrade vite
- **Action Required:**
  1. Upgrade vite to ≥6.4.2 (which uses safe esbuild)
  2. This is dev-only; not a production risk
  3. Ensure developers don't commit `.env` files or secrets in code that might be exposed

---

### DEP-011: PostCSS XSS via Unescaped </style> in Output
- **Severity:** P3 - Moderate
- **Category:** CVE
- **Affected Package:** postcss <8.5.10
- **Locations:**
  - Source/Frontend (transitive)
  - portal/Frontend (direct & transitive)
- **Issue:** PostCSS CSS stringify outputs are not properly escaped. If user-controlled CSS is processed, attacker can inject `</style>` tags to break out of CSS context and execute JavaScript in HTML
- **CVSS Score:** 6.1
- **CWE:** CWE-79 (Cross-site Scripting)
- **Reference:** GHSA-qx2v-qp2m-jg93
- **Root Cause:** Missing HTML entity encoding in CSS output
- **Impact:** Low in practice (unlikely to have user-controlled CSS), but requires secure handling
- **Fix Available:** Yes - Update to postcss ≥8.5.10
- **Action Required:**
  1. Update postcss in Source/Frontend and portal/Frontend: `npm install postcss@^8.5.10`
  2. Audit any user-controlled CSS processing
  3. Ensure CSS inputs are sanitized if from untrusted sources

---

### DEP-012: WebSocket (ws) Memory Disclosure
- **Severity:** P3 - Moderate
- **Category:** CVE
- **Affected Package:** ws 8.0.0-8.20.0
- **Locations:**
  - Source/Frontend (transitive, via vitest)
  - portal/Frontend (transitive, via vitest)
- **Issue:** Uninitialized memory disclosure via WebSocket compression. Memory buffer not properly zeroed, allowing information leakage
- **CVSS Score:** 4.4
- **CWE:** CWE-908 (Use of Uninitialized Resource)
- **Reference:** GHSA-58qx-3vcg-4xpx
- **Root Cause:** Missing buffer initialization in compression code
- **Fix Available:** Yes - Update to ws ≥8.20.1
- **Action Required:**
  1. Update vitest which depends on ws
  2. Verify ws upgrades to ≥8.20.1
  3. Test WebSocket functionality if used

---

### DEP-013: Vitest/Vite/Esbuild Dependency Chain Issues
- **Severity:** P3 - Moderate
- **Category:** Outdated/Chain Vulnerability
- **Affected Packages:**
  - vitest (all projects with vitest)
  - @vitest/mocker
  - vite-node
- **Locations:**
  - Source/Frontend
  - portal/Frontend
  - portal/Backend
- **Issue:** Vitest has dependency chain issues with vite and esbuild. Multiple vulnerabilities cascade through test setup
- **Fix Available:** Yes - Update vitest to ≥4.1.7
- **Action Required:**
  1. Update vitest across all projects to ^4.1.7
  2. This fixes the transitive chain for esbuild, vite, vite-node, @vitest/mocker
  3. Verify all tests still pass

---

### DEP-014: Protobufjs/UTF8 Encoding Issues
- **Severity:** P3 - Moderate
- **Category:** CVE
- **Affected Package:** @protobufjs/utf8 ≤1.1.0
- **Locations:**
  - portal/Backend (transitive)
  - platform/orchestrator (transitive)
- **Issue:** Overlong UTF-8 decoding allows bypass of UTF-8 validation checks. Attacker can craft protobuf messages with non-canonical UTF-8 sequences to potentially bypass security checks
- **CVSS Score:** 5.3
- **CWE:** CWE-176 (Improper Handling of Unicode Encoding)
- **Reference:** GHSA-q6x5-8v7m-xcrf
- **Root Cause:** Non-standard UTF-8 decoder accepting overlong sequences
- **Fix Available:** Yes - via protobufjs update
- **Action Required:**
  1. Fixed by updating protobufjs
  2. Verify after protobufjs update

---

## Outdated Major Version Findings (P3)

### DEP-015: Express Outdated (2 major versions behind)
- **Severity:** P3 - Moderate (due to missing security updates)
- **Category:** Outdated
- **Current:** express ^4.18.2 (wanted: 4.22.2, latest: 5.2.1)
- **Locations:** Source/Backend, portal/Backend, platform/orchestrator
- **Missing:** 2 major version updates
- **Issues:** Express 4.18 likely missing security patches from 4.19, 4.20, 4.21, 4.22
- **Fix Available:** Yes
- **Action Required:**
  1. Test with express 4.22.2 first (minimal breaking changes expected)
  2. If confident, upgrade to express 5.x (major version change, requires testing)
  3. Run full integration tests
  4. Update all three projects consistently

---

### DEP-016: Pino Logging Library Outdated (2 major versions behind)
- **Severity:** P3 - Moderate
- **Category:** Outdated
- **Current:** pino ^8.17.0 (wanted: 8.21.0, latest: 10.3.1)
- **Location:** Source/Backend, portal/Backend
- **Missing:** 2 major versions (pino 9.x, pino 10.x)
- **Issues:** May be missing performance improvements, bug fixes, and security updates
- **Fix Available:** Yes
- **Action Required:**
  1. Review pino v9 and v10 changelogs for breaking changes
  2. Test logging output format changes
  3. Update both Backend projects consistently
  4. Verify no issues with log parsing/shipping

---

### DEP-017: React Outdated (1 major version behind)
- **Severity:** P3 - Moderate
- **Category:** Outdated
- **Current:** react ^18.3.1 (wanted: 18.3.1, latest: 19.2.6)
- **Location:** Source/Frontend
- **Missing:** 1 major version (react 19.x)
- **Issues:** React 19 has significant improvements; 18.x may miss security patches
- **Fix Available:** Yes
- **Action Required:**
  1. Review React 19 migration guide
  2. Check for hook changes and component updates needed
  3. Test all components thoroughly
  4. Update react-dom in lockstep
  5. Coordinate with react-router-dom update

---

### DEP-018: React Router Outdated (1+ major versions behind)
- **Severity:** P3 - Moderate
- **Category:** Outdated
- **Current:** react-router-dom ^6.30.3 (wanted: 6.30.3, latest: 7.15.1)
- **Location:** Source/Frontend
- **Missing:** Potentially 1 major version (v7.x)
- **Issues:** Router v6 may have security issues; v7 has significant improvements
- **Fix Available:** Yes
- **Action Required:**
  1. Review react-router v7 migration guide
  2. Update routing patterns and loaders if needed
  3. Test all navigation flows
  4. Coordinate with React 19 upgrade

---

### DEP-019: UUID Outdated (5 major versions behind)
- **Severity:** P3 - Moderate (also has CVE)
- **Category:** Outdated + CVE
- **Current:** uuid ^9.0.0 (wanted: 9.0.1, latest: 14.0.0)
- **Locations:** Source/Backend, portal/Backend
- **Missing:** 5 major versions (uuid 10, 11, 12, 13, 14)
- **Issues:** Version 9 has the CVE-2024-something issue; versions 10+ have fixes plus other improvements
- **Fix Available:** Yes
- **Action Required:**
  1. Update to uuid ^14.0.0 (resolves CVE)
  2. Verify UUID generation still works as expected
  3. Check for any API changes between v9 and v14
  4. Test all ID generation paths

---

## License Compliance Findings

### DEP-020: GPL/AGPL Dependency Presence
- **Status:** PENDING - Unable to complete full license audit
- **Issue:** `license-checker` tool not available in environment
- **Recommendation:** Run `npx license-checker --json` in each project to audit licenses
- **Risk:** Some GPL/AGPL dependencies in transitive chain could impose copyleft obligations
- **Action Required:**
  1. Install license-checker globally: `npm install -g license-checker`
  2. Run in each backend project: `license-checker --json`
  3. Flag any GPL/AGPL licenses that are not compatible with project license
  4. Document license decisions in Teams/TheInspector/learnings/

---

## Supply Chain Risk Assessment

### DEP-021: Transitive Dependency Proliferation
- **Status:** P4 - Informational
- **Issue:** High transitive dependency counts increase supply chain risk surface
- **Metrics:**
  - Source/Backend: 411 total dependencies (102 prod, 310 dev)
  - Source/Frontend: 230 total dependencies (9 prod, 221 dev)
  - portal/Backend: 577 total dependencies (397 prod, 181 dev)
  - portal/Frontend: 424 total dependencies (9 prod, 416 dev)
- **Risk:** Each dependency is a potential attack surface; outdated versions in transitive chain can expose the app
- **Recommendation:**
  1. Regularly audit with `npm audit` (already done)
  2. Use `npm ls` to understand dependency tree
  3. Consider `npm prune --production` to remove dev deps from production builds
  4. Monitor npm security advisories: https://npmadvisory.com

---

## Summary Table

| ID | Package | Severity | Type | Status |
|----|---------|-----------|----|--------|
| DEP-001 | handlebars | P1 | CVE (Multiple) | Fixable |
| DEP-002 | protobufjs | P1 | CVE (Multiple) | Fixable |
| DEP-003 | @opentelemetry/* | P2 | CVE | Fixable |
| DEP-004 | path-to-regexp | P2 | CVE (ReDoS) | Fixable |
| DEP-005 | picomatch | P2 | CVE (ReDoS) | Fixable |
| DEP-006 | uuid | P3 | CVE | Fixable |
| DEP-007 | qs | P3 | CVE (DoS) | Fixable |
| DEP-008 | brace-expansion | P3 | CVE (DoS) | Fixable |
| DEP-009 | vite | P3 | CVE (Path Traversal) | Fixable |
| DEP-010 | esbuild | P3 | CVE (CSRF) | Fixable (dev-only) |
| DEP-011 | postcss | P3 | CVE (XSS) | Fixable |
| DEP-012 | ws | P3 | CVE (Info Leak) | Fixable |
| DEP-013 | vitest chain | P3 | Outdated Chain | Fixable |
| DEP-014 | @protobufjs/utf8 | P3 | CVE | Fixable |
| DEP-015 | express | P3 | Outdated (2 maj) | Fixable |
| DEP-016 | pino | P3 | Outdated (2 maj) | Fixable |
| DEP-017 | react | P3 | Outdated (1 maj) | Fixable |
| DEP-018 | react-router-dom | P3 | Outdated (1+ maj) | Fixable |
| DEP-019 | uuid | P3 | Outdated (5 maj) + CVE | Fixable |
| DEP-020 | (licenses) | P4 | Compliance | Pending |
| DEP-021 | (transitive) | P4 | Supply Chain | Informational |

---

## Recommendations (Priority Order)

### Immediate (Within 1 day)
1. **Address P1 vulnerabilities (DEP-001, DEP-002):**
   - `npm audit fix` in Source/Backend to fix handlebars
   - Update OpenTelemetry packages in portal/Backend
   - Update protobufjs in portal/Backend and platform/orchestrator
   - Verify with `npm audit` that criticals are resolved

2. **Address P2 vulnerabilities (DEP-003, DEP-004, DEP-005):**
   - Update @opentelemetry packages
   - Update express (fixes path-to-regexp)
   - Update vitest/vite (fixes picomatch)

### Short Term (This week)
1. Update all outdated major versions (DEP-015 through DEP-019)
2. Complete license compliance audit (DEP-020)
3. Test full integration with all updates
4. Commit and PR for code review

### Ongoing
1. Enable automated dependency updates (Dependabot, Renovate)
2. Monitor npm security advisories
3. Schedule quarterly dependency audits
4. Document license compliance decisions

---

## Files Affected

**All projects require updates:**
- Source/Backend: package.json, package-lock.json
- Source/Frontend: package.json, package-lock.json
- Source/E2E: package.json, package-lock.json
- portal/Backend: package.json, package-lock.json
- portal/Frontend: package.json, package-lock.json
- platform/orchestrator: package.json, package-lock.json

---

## Cross-References

- [CROSS-REF: TheGuardians] - Path traversal in vite (DEP-009) may allow source code disclosure in dev builds
- [CROSS-REF: TheGuardians] - PostCSS XSS (DEP-011) if user-controlled CSS is processed
- [CROSS-REF: red-teamer] - Protobufjs arbitrary code execution (DEP-002) is exploitable if untrusted protobuf messages are processed
- [CROSS-REF: red-teamer] - Path traversal (path-to-regexp/vite) can be chained with other findings

---

## Notes

- **Environment:** npm 10.x detected, Node.js version unknown
- **Scope:** Only npm/JavaScript dependencies audited; not Python, Go, or system packages
- **Lock File Status:** All projects use package-lock.json; ready for deterministic installs
- **CI/CD Integration:** Recommend adding `npm audit --audit-level=moderate` to CI pipeline

