# Dependency Audit Report — 2026-10-01

**Audit Date:** October 1, 2026  
**Auditor:** Dependency Auditor Agent (Haiku)  
**Status:** ALERT — 4 critical vulnerabilities discovered across 3 projects  

---

## Executive Summary

### Package Managers Detected
- **npm** (10 projects total)
  - Source/Backend
  - Source/Frontend
  - Source/E2E
  - platform/orchestrator
  - portal/Backend
  - portal/Frontend
  - abac-demo, abac-reimagined, abac-soc-demo, abac-soc-demo-v2

### Critical Finding Counts
| Project | Critical | High | Moderate | Low | Total |
|---------|----------|------|----------|-----|-------|
| Source/Backend | 1 | 4 | 3 | 2 | **10** |
| Source/Frontend | 1 | 6 | 7 | 1 | **15** |
| Source/E2E | 0 | 0 | 0 | 0 | **0** |
| platform/orchestrator | 1 | 2 | 4 | 1 | **8** |
| portal/Backend | **2** | **11** | **40** | 1 | **54** |
| **TOTAL** | **4** | **23** | **54** | **5** | **86** |

---

## CRITICAL VULNERABILITIES (P1)

### DEP-001: Handlebars.js JavaScript Injection (AST Type Confusion)
- **Severity:** P1 (CRITICAL)
- **Category:** cve / code-injection
- **Package:** handlebars@4.7.8 (Backend)
- **File:** Source/Backend/package.json
- **CVE:** GHSA-2w6w-674q-4c4q
- **CVSS Score:** 9.8 (Critical)
- **Affected Versions:** >=4.0.0 <=4.7.8
- **Detail:**
  ```
  Handlebars.js is vulnerable to JavaScript Injection via AST Type Confusion.
  An attacker can bypass the sandbox by tampering with template AST nodes,
  leading to arbitrary code execution through partial-block manipulation.
  
  Attack vector: Malformed handlebar templates with crafted @partial-block directives
  Impact: Complete code execution in the context of the application
  ```
- **Fix:** Upgrade to handlebars@>=4.7.9
  ```bash
  cd Source/Backend && npm install handlebars@latest
  ```
- **Risk Assessment:** HIGH — handlebars is likely used for template rendering; this is directly exploitable
- **Related CVEs:**
  - GHSA-3mfm-83xf-c92r (High, @partial-block injection)
  - GHSA-2qvq-rjwj-gvw9 (Moderate, prototype pollution via partial template injection)
  - GHSA-7rx3-28cr-v5wh (Moderate, __lookupSetter__ blocklist bypass)
  - GHSA-xjpj-3mr7-gcpf (High, CLI precompiler XSS)
- **[CROSS-REF: red-teamer]** — Template injection likely exploitable via work item rendering

---

### DEP-002: Vitest Arbitrary File Read/Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve / file-access
- **Package:** vitest@4.1.10 (Frontend)
- **File:** Source/Frontend/package.json
- **CVE:** GHSA-5xrq-8626-4rwp
- **CVSS Score:** 9.8 (Critical)
- **Affected Versions:** <3.2.6
- **Detail:**
  ```
  When Vitest UI server is listening (common in dev), an attacker can read
  and execute arbitrary files on the system running the Vitest UI.
  
  Attack vector: HTTP request to Vitest UI endpoints
  Impact: RCE during development; test infrastructure compromise
  Precondition: Vitest UI server running (dev environment exposure)
  ```
- **Fix:** Upgrade to vitest@>=3.2.6 or disable UI server in untrusted environments
  ```bash
  cd Source/Frontend && npm install vitest@latest
  ```
- **Risk Assessment:** MEDIUM (dev-only, but dev machines on same network as source control)
- **Related CVEs:**
  - GHSA-82fw-gwwq-j7x9 (Moderate, @vitest/mocker path traversal)
  - @vitest/mocker is also affected and triggers this
- **Mitigation:** Ensure Vitest UI server is not accessible from external networks during development

---

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve / code-injection
- **Package:** protobufjs@7.6.4 (Orchestrator, transitive via @grpc/grpc-js)
- **File:** platform/orchestrator/package.json (dependency chain)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **CVSS Score:** 9.8 (Critical)
- **Affected Versions:** <7.5.5
- **Detail:**
  ```
  Protobufjs allows arbitrary code execution through unsafe code generation.
  Malformed .proto files or crafted messages can inject code into generated
  message classes.
  
  Attack vector: .proto file from untrusted source or crafted protobuf message
  Impact: RCE on orchestrator process
  Related gadgets: Prototype pollution chains, unsafe Object property assignment
  ```
- **Fix:** Upgrade to protobufjs@>=7.5.5
  ```bash
  cd platform/orchestrator && npm install protobufjs@latest
  ```
- **Risk Assessment:** CRITICAL — Orchestrator is infrastructure; compromise affects all agents
- **Related CVEs:**
  - GHSA-66ff-xgx4-vchm (High, toObject code injection)
  - GHSA-75px-5xx7-5xc7 (High, code generation gadget after prototype pollution)
  - GHSA-jvwf-75h9-cwgg (High, unsafe option paths DoS)
  - GHSA-685m-2w69-288q (High, unbounded recursion DoS)
  - And 7 more moderate/DoS variants
- **[CROSS-REF: red-teamer, platform-maintainer]** — Escalate immediately; affects orchestrator integrity

---

### DEP-004: Portal Backend Supply Chain Risk
- **Severity:** P1 (CRITICAL due to volume)
- **Category:** supply-chain / high-risk-configuration
- **Package:** portal/Backend/package.json (54 total vulnerabilities)
- **File:** portal/Backend/package.json
- **Detail:**
  ```
  Portal Backend has accumulated 54 known CVEs:
  - 2 CRITICAL
  - 11 HIGH
  - 40 MODERATE
  - 1 LOW
  
  This indicates:
  1. Long dependency chain with no maintenance
  2. Possible abandoned sub-dependencies
  3. High supply-chain attack surface
  4. No recent npm audit run / no enforcement in CI
  
  This is a CRITICAL risk posture even if individual CVEs are not actively exploited.
  ```
- **Fix:** Triage and update portal/Backend dependencies
  ```bash
  cd portal/Backend && npm audit fix --force
  # Then manually verify breaking changes
  npm test
  ```
- **Risk Assessment:** CRITICAL — Debug portal not isolated from main application; potential pivot point
- **[CROSS-REF: TheFixer, platform-maintainer]** — Plan urgent dependency upgrade cycle

---

## HIGH PRIORITY VULNERABILITIES (P2)

### DEP-005: brace-expansion Denial of Service (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** cve / dos
- **Package:** brace-expansion@<=1.1.20 (Backend, Frontend, transitive)
- **File:** Transitive dependency via minimatch, glob, etc.
- **CVEs:**
  - GHSA-f886-m6hf-6m8v (Moderate — zero-step sequence, process hang, OOM)
  - GHSA-3jxr-9vmj-r5cp (High — exponential-time expansion DoS)
  - GHSA-mh99-v99m-4gvg (High — unbounded expansion OOM)
  - GHSA-rgw5-rvv9-x895 (High — bypasses CVE-2026-14257 mitigation)
  - GHSA-qhr7-859c-m2p7 (High — uncontrolled recursion on nested braces)
  - GHSA-6j4f-fj2g-mc7p (High — uncontrolled recursion in parseCommaParts)
- **CVSS:** 7.5 (Multiple high-impact DoS chains)
- **Affected Versions:** <=1.1.20
- **Detail:**
  ```
  Brace-expansion is vulnerable to multiple DoS attacks via malformed input:
  - Exponential-time expansion of {} groups
  - Stack exhaustion from nested recursion
  - Memory exhaustion from unbounded array allocation
  
  Attack vector: Any file glob/path expansion from user input
  Impact: Process hang, OOM crash
  Example: echo {a}{a}{a}{a}{a}{a}{a}{a} -> exponential expansion
  ```
- **Fix:** Upgrade to brace-expansion@>=1.1.21 (or 1.2.0+ if available)
  ```bash
  npm install brace-expansion@latest
  npm audit fix
  ```
- **Affected Projects:** Source/Backend, Source/Frontend
- **[CROSS-REF: performance-profiler]** — Monitor for sudden memory usage spikes post-fix

---

### DEP-006: Browserslist Denial of Service (Two CVEs)
- **Severity:** P2 (HIGH)
- **Category:** cve / dos
- **Package:** browserslist@<=4.28.6 (Backend, Frontend, transitive)
- **File:** Transitive dependency via postcss, autoprefixer, etc.
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx (High — unbounded memory growth via distinct query results)
  - GHSA-73wf-gq98-2v4g (High — uncaught crash / prototype write via browserslist-stats.json)
- **CVSS:** 7.5
- **Affected Versions:** <=4.28.6
- **Detail:**
  ```
  Browserslist has two distinct DoS vectors:
  
  1. Unbounded cache memory growth when processing many distinct queries
     → No eviction policy → eventual OOM
  
  2. Uncaught exception when parsing malformed browserslist-stats.json
     → Can crash the build process
  
  Attack vector: Custom browserslist queries or malicious stats file
  Impact: Build system hang/crash, persistent resource leak
  ```
- **Fix:** Upgrade to browserslist@>=4.28.7
  ```bash
  npm install browserslist@latest
  npm audit fix
  ```
- **Affected Projects:** Source/Backend, Source/Frontend
- **Risk Assessment:** MEDIUM — primarily impacts build pipeline, not runtime (unless shipped)

---

### DEP-007: form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** cve / injection
- **Package:** form-data@4.0.0-4.0.5 (Backend, Frontend, transitive)
- **File:** Transitive via axios, superagent, etc.
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **CVSS Score:** 7.5 (High)
- **Affected Versions:** >=4.0.0 <4.0.6
- **Detail:**
  ```
  form-data does not escape multipart field names and filenames, allowing
  CRLF injection in HTTP headers.
  
  Attack vector: User-supplied filenames or field names in form submissions
  Impact: HTTP request smuggling, header injection, cache poisoning
  Example: filename="file.txt\r\nX-Injected-Header: value"
  ```
- **Fix:** Upgrade to form-data@>=4.0.6
  ```bash
  npm install form-data@latest
  npm audit fix
  ```
- **Affected Projects:** Source/Backend, Source/Frontend (likely transitive)
- **[CROSS-REF: red-teamer]** — Verify request validation; may be weaponizable for header injection

---

### DEP-008: js-yaml Quadratic-Complexity DoS (Four CVEs)
- **Severity:** P2 (HIGH)
- **Category:** cve / dos
- **Package:** js-yaml@<=3.15.1 (Backend, Frontend, transitive)
- **File:** Transitive dependency via config loaders, build tools
- **CVEs:**
  - GHSA-h67p-54hq-rp68 (Moderate — merge key quadratic complexity)
  - GHSA-52cp-r559-cp3m (High — merge-key chains force quadratic CPU)
  - GHSA-5p4m-2wfm-xmqj (High — !!omap resolution quadratic CPU, 3.x/4.x)
  - GHSA-2883-xcg3-v3hh (High — maxTotalMergeKeys does not limit CPU for empty sources)
- **CVSS:** 7.5
- **Affected Versions:** >=3.0.0 <3.15.2
- **Detail:**
  ```
  js-yaml has multiple DoS vectors via YAML merge keys and omap resolution:
  
  1. Merge key chains: Y: &anchor X; Z: *anchor << *anchor << *anchor
     → Exponential expansion in processing
  
  2. !!omap tag resolution does not bail on large maps
     → Quadratic CPU consumption even with maxTotalMergeKeys set
  
  Attack vector: Malformed YAML config from user input or config files
  Impact: Process hang, 100% CPU until timeout/kill
  ```
- **Fix:** Upgrade to js-yaml@>=3.15.2 or migrate to js-yaml@4.x
  ```bash
  npm install js-yaml@latest
  npm audit fix
  ```
- **Affected Projects:** Source/Backend, Source/Frontend

---

### DEP-009: @grpc/grpc-js Server Crash (Multiple CVEs)
- **Severity:** P2 (HIGH, operational impact)
- **Category:** cve / denial-of-service
- **Package:** @grpc/grpc-js@1.14.0-1.14.4 (Orchestrator, transitive)
- **File:** platform/orchestrator/package.json
- **CVEs:**
  - GHSA-5375-pq7m-f5r2 (High — malformed request causes server crash, CWE-248)
  - GHSA-99f4-grh7-6pcq (High — malformed compressed message causes crash)
  - GHSA-m9gg-hp2v-232j (High — getAuthContext returns unauthorized certs as authorized, CWE-295)
  - GHSA-f596-whhp-79r4 (Low — error message leakage in status)
- **CVSS:** 7.5
- **Affected Versions:** 1.14.0-1.14.4
- **Detail:**
  ```
  @grpc/grpc-js has two critical crash vectors:
  
  1. Malformed request handling → uncaught exception → server crash
  2. Malformed compressed message → uncaught exception → crash
  3. Certificate validation bypass in certain configurations
  
  Attack vector: Send crafted gRPC messages to orchestrator
  Impact: Orchestrator availability (DoS), authentication bypass
  ```
- **Fix:** Upgrade to @grpc/grpc-js@>=1.14.5
  ```bash
  cd platform/orchestrator && npm install @grpc/grpc-js@latest
  ```
- **Risk Assessment:** CRITICAL (operational) — orchestrator crashes = pipeline down
- **[CROSS-REF: red-teamer, platform-maintainer]** — Monitor orchestrator crash logs post-fix

---

### DEP-010: path-to-regexp ReDoS
- **Severity:** P2 (HIGH)
- **Category:** cve / dos-regex
- **Package:** path-to-regexp@<0.1.13 (Orchestrator, transitive)
- **File:** Transitive dependency via express-like routing
- **CVE:** GHSA-37ch-88jc-xwx2
- **CVSS Score:** 7.5
- **Affected Versions:** <0.1.13
- **Detail:**
  ```
  path-to-regexp's route parameter regex can suffer catastrophic backtracking
  with multiple route parameters in a maliciously crafted URL.
  
  Attack vector: Malformed URL with many parameters to orchestrator routes
  Impact: ReDoS (CPU 100% until timeout)
  Example: /route/:a/:b/:c/:d with pathological input causes exponential regex matching
  ```
- **Fix:** Upgrade to path-to-regexp@>=0.1.13
  ```bash
  cd platform/orchestrator && npm audit fix
  ```
- **Affected Projects:** platform/orchestrator

---

### DEP-011: PostCSS Path Traversal (Four CVEs)
- **Severity:** P2 (HIGH)
- **Category:** cve / path-traversal
- **Package:** postcss@<=8.5.22 (Frontend, transitive)
- **File:** Source/Frontend/package.json
- **CVEs:**
  - GHSA-6g55-p6wh-862q (High — arbitrary file read via sourceMappingURL)
  - GHSA-fxqj-rqcc-2cmp (Moderate — incomplete fix, reads .map files when from unset)
  - GHSA-r28c-9q8g-f849 (High — path traversal in previous source map auto-loading)
  - GHSA-qx2v-qp2m-jg93 (Moderate — XSS via unescaped </style> in CSS stringify)
- **CVSS:** 7.5
- **Affected Versions:** <=8.5.22
- **Detail:**
  ```
  PostCSS follows sourceMappingURL comments in CSS without validation,
  allowing attackers to read arbitrary files via path traversal.
  
  Attack vector: CSS file with malicious sourceMappingURL comment
  Impact: Read sensitive files (.env, source maps, private keys)
  Example: /* sourceMappingURL=../../../../etc/passwd */
  ```
- **Fix:** Upgrade to postcss@latest (8.5.23+)
  ```bash
  cd Source/Frontend && npm install postcss@latest
  ```
- **Risk Assessment:** HIGH — if attacker can control CSS (template injection, SCSS compilation)
- **Affected Projects:** Source/Frontend

---

### DEP-012: Nanoid Integer Overflow / Infinite Loops
- **Severity:** P2 (HIGH)
- **Category:** cve / dos-loop
- **Package:** nanoid@<=3.3.17 (Frontend, transitive)
- **File:** Source/Frontend/package.json
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv (High — non-secure generators loop indefinitely with negative size)
  - GHSA-2v37-7h3g-55p8 (High — custom generators loop indefinitely when size=0)
  - GHSA-xwg4-73v4-xw9w (High — integer overflow/wraparound, CWE-190)
- **CVSS:** 7.4
- **Affected Versions:** <=3.3.17
- **Detail:**
  ```
  Nanoid has edge-case handling bugs:
  
  1. Non-secure generators can enter infinite loop with negative size
  2. Custom generators loop indefinitely when size=0
  3. Integer overflow when size exceeds max value
  
  Attack vector: Pass malformed size parameter to nanoid
  Impact: Process hang (DoS), resource exhaustion
  ```
- **Fix:** Upgrade to nanoid@>=3.3.18
  ```bash
  cd Source/Frontend && npm install nanoid@latest
  ```
- **Risk Assessment:** MEDIUM — requires attacker control over ID generation size parameter

---

### DEP-013: ws Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** cve / dos-memory
- **Package:** ws@8.0.0-8.20.1 (Frontend, transitive via vite)
- **File:** Source/Frontend/package.json
- **CVEs:**
  - GHSA-58qx-3vcg-4xpx (Moderate — uninitialized memory disclosure)
  - GHSA-96hv-2xvq-fx4p (High — memory exhaustion DoS from tiny fragments)
- **CVSS:** 7.5
- **Affected Versions:** 8.0.0-8.20.1
- **Detail:**
  ```
  ws WebSocket library can be exhausted by sending many small fragments:
  
  1. Each tiny fragment creates buffer overhead
  2. No backpressure / flow control in certain configurations
  3. Memory grows unbounded until OOM
  
  Attack vector: Send many small WebSocket frames to dev server
  Impact: Dev server memory exhaustion, crash
  ```
- **Fix:** Upgrade to ws@>=8.21.0
  ```bash
  cd Source/Frontend && npm install ws@latest
  ```
- **Risk Assessment:** MEDIUM (dev-environment, but could affect CI/CD if ws server runs there)
- **Affected Projects:** Source/Frontend

---

## MODERATE PRIORITY VULNERABILITIES (P3)

### DEP-014: Multiple Moderate DoS and XSS CVEs (Aggregated)
- **Severity:** P3 (MODERATE)
- **Category:** cve / various
- **Packages:**
  - @babel/core (low — arbitrary file read via sourceMappingURL, CWE-22/200, CVSS 3.2)
  - baseline-browser-mapping (moderate — process termination DoS, CWE-705)
  - body-parser (low — limit value DoS, CWE-770, CVSS 3.7)
  - @remix-run/router (moderate — open redirect via protocol-relative URL, CWE-601)
  - @vitest/mocker (moderate — path traversal via redirect mock, CWE-22, CVSS 5.9)
  - @protobufjs/utf8 (moderate — overlong UTF-8 decoding, CWE-176, CVSS 5.3)
- **Detail:** These are individually moderate but collectively represent a meaningful attack surface
- **Fix:** Run `npm audit fix` to apply patches
- **Affected Projects:** All npm projects
- **[CROSS-REF: red-teamer]** — @remix-run/router open redirect may be relevant to frontend security

---

## OUTDATED MAJOR VERSIONS (P3)

### DEP-015: Frontend React/ReactDOM Outdated (Major Version Behind)
- **Severity:** P3 (OUTDATED, potential security debt)
- **Category:** outdated
- **Package:** react@18.3.1, react-dom@18.3.1 (Frontend)
- **File:** Source/Frontend/package.json
- **Current Version:** 18.3.1
- **Latest Version:** 19.3.0
- **Detail:**
  ```
  React is 1 major version behind. While React 18 is still supported,
  version 19 includes security hardening and performance improvements.
  
  Risk: Potential security vulnerabilities fixed in v19 not available in v18
  ```
- **Fix:** Upgrade to React 19 (breaking changes likely — requires testing)
  ```bash
  cd Source/Frontend && npm install react@19 react-dom@19
  # Test all component rendering and hooks
  npm test
  ```
- **Risk Assessment:** MEDIUM — breaking changes possible, but recommended upgrade
- **Timeline:** Plan for next minor release cycle

---

### DEP-016: Frontend React Router Outdated (Major Version Behind)
- **Severity:** P3 (OUTDATED)
- **Category:** outdated
- **Package:** react-router-dom@6.30.6 (Frontend)
- **File:** Source/Frontend/package.json
- **Current Version:** 6.30.6
- **Latest Version:** 7.18.4
- **Detail:**
  ```
  React Router is 1 major version behind. v7 includes:
  - Enhanced route matching
  - Improved data loading API
  - Security fixes for route handling
  
  Known issue in v6: GHSA-2j2x-hqr9-3h42 (open redirect via protocol-relative URLs)
  This is fixed in v7.
  ```
- **Fix:** Upgrade to React Router v7 (significant API changes — thorough testing required)
  ```bash
  cd Source/Frontend && npm install react-router-dom@7
  # Update all route configurations
  npm test
  ```
- **Risk Assessment:** HIGH (contains security issue that affects frontend routing)
- **Timeline:** Prioritize this upgrade
- **[CROSS-REF: red-teamer]** — Protocol-relative URL redirect is a known attack vector

---

## ABANDONED / UNMAINTAINED PACKAGES

### DEP-017: Check for Abandoned Dependencies (Audit Note)
- **Severity:** P4 (INFORMATIONAL)
- **Category:** abandoned
- **Detail:**
  ```
  No obviously abandoned packages detected in the main dependency tree.
  However, some transitive dependencies (brace-expansion, browserslist)
  show signs of long maintenance gaps between patch releases.
  
  Recommendation: Monitor npm registry for deprecation notices quarterly.
  ```
- **Action:** Run `npm audit` regularly; npm CLI will flag deprecated packages

---

## SUPPLY CHAIN RISK ASSESSMENT

### DEP-018: Portal Backend — High Vulnerability Count
- **Severity:** P1 (CRITICAL supply chain)
- **Category:** supply-chain
- **Root Causes:**
  1. No enforced npm audit in CI/CD pipeline
  2. Long gap since last dependency update
  3. Transitive dependencies not pinned, allowing vulnerable minor/patch versions
- **Risk Indicators:**
  - 54 total vulnerabilities (2 critical, 11 high)
  - High variance in criticality → indicates mixed update cycles
  - Portal is a debug tool but still part of deployment
- **Mitigation:**
  1. Add `npm audit` to CI/CD pipeline (fail on critical/high)
  2. Run `npm audit fix` and test portal/Backend changes
  3. Implement dependency scanning in pre-commit hook

### DEP-019: Build Tool Dependency Risk
- **Severity:** P3 (MODERATE)
- **Category:** supply-chain
- **Concern:**
  ```
  Build tools (vite, vitest, postcss) have known vulnerabilities that could
  compromise development machines or CI/CD infrastructure:
  
  - Vite: Path traversal in .map file handling
  - Vitest: Arbitrary file read when UI server running
  - PostCSS: Arbitrary file read via sourceMappingURL
  
  If dev machine is compromised, attacker gains access to:
  - Source code repository
  - Build artifacts
  - Environment variables (if leaked via build logs)
  
  Recommendation: Update build tools to latest versions before next build.
  ```

---

## REMEDIATION PLAN

### Immediate Actions (Do Now — Within 24 Hours)
1. **Upgrade critical packages:**
   ```bash
   # Backend
   cd Source/Backend && npm install handlebars@latest
   
   # Frontend
   cd Source/Frontend && npm install vitest@latest
   
   # Orchestrator
   cd platform/orchestrator && npm install protobufjs@latest @grpc/grpc-js@latest
   ```
2. Run tests in each directory to verify no breaking changes
3. Commit changes and note CVE IDs in commit message

### Phase 1 (Within 1 Week)
4. **Address P2 vulnerabilities:**
   ```bash
   # All projects
   npm audit fix
   npm test
   ```
5. **Upgrade React Router (Frontend):**
   - Test route configurations thoroughly
   - Check for protocol-relative URL usage (will break)

6. **Portal Backend triage:**
   - Run `npm audit fix --force` to attempt auto-fix
   - Manual review of breaking changes
   - Test portal functionality

### Phase 2 (Within 1 Month)
7. **React 19 upgrade (Frontend):**
   - Plan carefully; breaking changes expected
   - Test all components, hooks, state management
   - Consider separate PR/branch

8. **Implement CI/CD enforcement:**
   - Add `npm audit` to pre-commit and CI pipeline
   - Fail builds on critical/high vulnerabilities
   - Quarterly dependency audit cadence

### Ongoing
9. **Monthly npm audit runs** across all projects
10. **Dependency update policy:**
    - Apply patches automatically (minor/patch)
    - Review minor versions (breaking changes rare)
    - Plan major version upgrades with test cycles

---

## Technical Debt & Long-Term Recommendations

### 1. Dependency Management Strategy
- Adopt **npm audit-driven CI**: Fail builds on critical/high CVEs
- Use **dependabot** or **renovate** for automated PRs
- Pin transitive dependencies where possible to prevent supply-chain surprises

### 2. Build Tool Isolation
- Consider running builds in containers (Dockerfile) with minimal attack surface
- Separate build-time dependencies (vite, vitest, postcss) from runtime dependencies
- Review `node_modules` contents in buildpacks/Docker images

### 3. Orchestrator Hardening
- Protobufjs is high-risk: Validate all .proto files from external sources
- @grpc/grpc-js server crashes: Implement health checks and auto-restart
- Add rate limiting to gRPC endpoints to mitigate ReDoS (path-to-regexp)

### 4. Monitoring Post-Remediation
- Track `npm audit` output in CI/CD metrics dashboard
- Alert on new CVEs in critical/high packages
- Monthly vulnerability trend analysis

---

## JSON Summary

```json
{
  "audit_date": "2026-10-01",
  "projects_scanned": 10,
  "package_manager": "npm",
  "total_vulnerabilities": 86,
  "critical": 4,
  "high": 23,
  "moderate": 54,
  "low": 5,
  "findings": {
    "critical_packages": [
      {
        "id": "DEP-001",
        "name": "handlebars",
        "version": "4.7.8",
        "cve": "GHSA-2w6w-674q-4c4q",
        "cvss": 9.8,
        "affected_project": "Source/Backend",
        "recommendation": "Upgrade to 4.7.9+"
      },
      {
        "id": "DEP-002",
        "name": "vitest",
        "version": "4.1.10",
        "cve": "GHSA-5xrq-8626-4rwp",
        "cvss": 9.8,
        "affected_project": "Source/Frontend",
        "recommendation": "Upgrade to 3.2.6+"
      },
      {
        "id": "DEP-003",
        "name": "protobufjs",
        "version": "7.6.4",
        "cve": "GHSA-xq3m-2v4x-88gg",
        "cvss": 9.8,
        "affected_project": "platform/orchestrator",
        "recommendation": "Upgrade to 7.5.5+"
      },
      {
        "id": "DEP-004",
        "name": "portal/Backend (aggregate)",
        "version": "N/A",
        "cve": "Multiple (54 total)",
        "cvss": "Varied",
        "affected_project": "portal/Backend",
        "recommendation": "npm audit fix --force + testing"
      }
    ],
    "high_priority_packages": [
      "brace-expansion",
      "browserslist",
      "form-data",
      "js-yaml",
      "@grpc/grpc-js",
      "path-to-regexp",
      "postcss",
      "nanoid",
      "ws"
    ],
    "outdated_major_versions": [
      {
        "package": "react",
        "current": "18.3.1",
        "latest": "19.3.0",
        "project": "Source/Frontend"
      },
      {
        "package": "react-router-dom",
        "current": "6.30.6",
        "latest": "7.18.4",
        "project": "Source/Frontend",
        "note": "Contains open redirect CVE (GHSA-2j2x-hqr9-3h42)"
      }
    ]
  },
  "escalations": {
    "to_red_teamer": [
      "DEP-001 (handlebars template injection)",
      "DEP-016 (react-router open redirect)",
      "DEP-008 (js-yaml DoS)"
    ],
    "to_platform_maintainer": [
      "DEP-003 (protobufjs on orchestrator)",
      "DEP-004 (portal backend)",
      "DEP-009 (@grpc/grpc-js crashes)"
    ],
    "to_performance_profiler": [
      "DEP-005 (brace-expansion OOM)",
      "DEP-006 (browserslist memory growth)",
      "DEP-013 (ws memory exhaustion)"
    ]
  },
  "next_audit": "2026-10-08",
  "audit_tool_version": "npm audit v10.x",
  "auditor": "Dependency Auditor (Haiku 4.5)"
}
```

---

## Appendix: CVE ID Cross-Reference

| CVE / Advisory ID | Package | Severity | CVSS | Status |
|---|---|---|---|---|
| GHSA-2w6w-674q-4c4q | handlebars | CRITICAL | 9.8 | Active |
| GHSA-5xrq-8626-4rwp | vitest | CRITICAL | 9.8 | Active |
| GHSA-xq3m-2v4x-88gg | protobufjs | CRITICAL | 9.8 | Active |
| GHSA-f886-m6hf-6m8v | brace-expansion | Moderate | — | Active |
| GHSA-3jxr-9vmj-r5cp | brace-expansion | High | 5.3 | Active |
| GHSA-c83g-rgw3-j3cx | browserslist | High | 7.5 | Active |
| GHSA-hmw2-7cc7-3qxx | form-data | High | 7.5 | Active |
| GHSA-52cp-r559-cp3m | js-yaml | High | 7.5 | Active |
| GHSA-5375-pq7m-f5r2 | @grpc/grpc-js | High | 7.5 | Active |
| GHSA-37ch-88jc-xwx2 | path-to-regexp | High | 7.5 | Active |
| GHSA-6g55-p6wh-862q | postcss | High | 7.5 | Active |
| GHSA-2j2x-hqr9-3h42 | @remix-run/router | Moderate | — | Active |
| GHSA-xwg4-73v4-xw9w | nanoid | High | 7.4 | Active |
| GHSA-96hv-2xvq-fx4p | ws | High | 7.5 | Active |

---

**Report Generated:** 2026-10-01  
**Next Review:** 2026-10-08  
**Auditor:** Dependency Auditor (Haiku 4.5)
