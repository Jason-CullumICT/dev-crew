# Dependency Auditor Findings Report

**Date:** 2026-10-02  
**Scan Type:** CVE Audit + License Compliance + Outdated Versions  
**Package Manager:** npm  
**Primary Directories Scanned:**
- `Source/Backend/` — Express backend service
- `Source/Frontend/` — React SPA (Vite)
- `Source/E2E/` — End-to-end tests
- `platform/orchestrator/` — Orchestrator infrastructure (critical)
- `portal/Backend/` — Debug portal backend
- `portal/Frontend/` — Debug portal frontend
- Demo directories (secondary): `abac-demo/`, `abac-reimagined/`, `abac-soc-demo/`, `abac-soc-demo-v2/`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total npm packages scanned** | 13 package.json files |
| **Total vulnerabilities** | 118 across all directories |
| **Critical CVEs** | 5 (handlebars, vitest x2, protobufjs) |
| **High severity CVEs** | 31 |
| **Moderate severity CVEs** | 61 |
| **Low severity CVEs** | 21 |
| **Transitive dependencies** | 400+ (estimated) |

**Health Grade: C** (significant critical/high issues, but core application logic not directly affected)

---

## Vulnerability Breakdown by Directory

### Source/Backend — 10 vulnerabilities
| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 4 |
| Moderate | 3 |
| Low | 2 |

**Critical package:** `handlebars` (transitive via template rendering pipeline)

### Source/Frontend — 15 vulnerabilities
| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 6 |
| Moderate | 7 |
| Low | 1 |

**Critical package:** `vitest` (direct dev dependency — test framework)

### Source/E2E — 0 vulnerabilities ✅
Clean audit pass.

### platform/orchestrator — 8 vulnerabilities
| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 2 |
| Moderate | 4 |
| Low | 1 |

**Critical package:** `dockerode` chain (infrastructure component)

### portal/Backend — 54 vulnerabilities
| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 11 |
| Moderate | 40 |
| Low | 1 |

**Critical packages:** `protobufjs`, `vitest`
⚠️ **MAJOR CONCERN** — Heaviest vulnerability load in debug infrastructure.

### portal/Frontend — 16 vulnerabilities
| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 7 |
| Moderate | 6 |
| Low | 2 |

**Critical package:** `vitest` (test framework)

---

## Critical Findings (P1)

### DEP-001: Handlebars.js JavaScript Injection (RCE)
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `handlebars@<=4.7.8`
- **CVE:** GHSA-2w6w-674q-4c4q (CVSS 9.8)
- **File:** `Source/Backend/package-lock.json`
- **Description:** Handlebars.js versions ≤4.7.8 are vulnerable to arbitrary JavaScript code injection via AST Type Confusion. An attacker can inject malicious template code that executes as JavaScript, compromising the application.
- **Exploitability:** High — requires template input under attacker control
- **Impact:** Remote Code Execution if templates are user-controlled
- **Fix:** Update `handlebars` to ≥4.8.0
  ```bash
  cd Source/Backend && npm update handlebars
  ```
- **Status:** Transitive dependency — check which package pulls it in
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vulnerability

### DEP-002: Vitest Arbitrary File Read / UI Server Vulnerability
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `vitest@<3.2.6` (dev dependency)
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Files:** 
  - `Source/Frontend/package-lock.json`
  - `portal/Backend/package-lock.json`
- **Description:** When Vitest UI server is listening on localhost, an attacker can read arbitrary files and execute code via path traversal. This affects local development when the Vitest UI is exposed.
- **Exploitability:** High in development; medium in CI/CD if UI is running
- **Impact:** Information disclosure (source code, secrets), potential code execution
- **Fix:** Update `vitest` to ≥3.2.6:
  ```bash
  cd Source/Frontend && npm update vitest
  cd portal/Backend && npm update vitest
  ```
- **Risk Mitigation:** 
  - Never expose Vitest UI to untrusted networks
  - Run Vitest UI only on localhost during local development
  - Disable UI server in CI/CD environments
- **Cross-ref:** [ESCALATE → TheGuardians] — File disclosure + XSS risk

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `protobufjs@<7.5.5`
- **CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **File:** `portal/Backend/package-lock.json`
- **Description:** Protobufjs <7.5.5 allows arbitrary code execution when parsing untrusted `.proto` files or JSON descriptors. Attackers can inject malicious code via protobuf definitions.
- **Exploitability:** High if parsing user-supplied protobuf data
- **Impact:** Remote Code Execution
- **Fix:** Update `protobufjs` to ≥7.5.5:
  ```bash
  cd portal/Backend && npm update protobufjs
  ```
- **Status:** Used in debug portal's gRPC instrumentation
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vulnerability

---

## High Severity Findings (P2)

### DEP-004: js-yaml DoS via Quadratic Complexity Merge Keys
- **Severity:** P2 (High — DoS)
- **Category:** cve
- **Package:** `js-yaml@<=3.15.1`
- **CVE:** GHSA-52cp-r559-cp3m (CVSS 7.5)
- **File:** `Source/Backend/package-lock.json`
- **Description:** js-yaml's merge-key chains can force quadratic CPU consumption, leading to Denial of Service. Specially crafted YAML input can exhaust CPU.
- **Exploitability:** Medium — requires parsing untrusted YAML
- **Impact:** DoS attack via malformed YAML
- **Fix:** Update to `js-yaml@>=3.15.2`:
  ```bash
  cd Source/Backend && npm update js-yaml
  ```

### DEP-005: form-data CRLF Injection via Multipart Fields
- **Severity:** P2 (High — Injection)
- **Category:** cve
- **Package:** `form-data@4.0.0-4.0.5`
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Files:** `Source/Backend/package-lock.json`, `Source/Frontend/package-lock.json`
- **Description:** form-data <4.0.6 allows CRLF injection in multipart field names and filenames, potentially enabling request smuggling or header injection attacks.
- **Exploitability:** Medium — requires user-controlled filenames in uploads
- **Impact:** HTTP request smuggling, header injection
- **Fix:** Update to `form-data@>=4.0.6`:
  ```bash
  npm update form-data
  ```

### DEP-006: brace-expansion Multiple DoS Vulnerabilities
- **Severity:** P2 (High — DoS)
- **Category:** cve
- **Package:** `brace-expansion@<=1.1.20`
- **CVEs:** GHSA-4x5r-5xpv-4q5x, GHSA-q6x5-4v9m-xcrf (CVSS 7.5)
- **File:** `Source/Backend/package-lock.json`
- **Description:** Multiple uncontrolled recursion and unbounded array issues in brace-expansion cause stack exhaustion and CPU DoS.
- **Exploitability:** Medium in command-line tools, low in server context
- **Impact:** Denial of Service (CPU exhaustion, stack overflow)
- **Fix:** Update to `brace-expansion@>=1.1.21`:
  ```bash
  cd Source/Backend && npm update brace-expansion
  ```

### DEP-007: browserslist Unbounded Memory Growth & Crash
- **Severity:** P2 (High — DoS + Crash)
- **Category:** cve
- **Package:** `browserslist@<=4.28.6`
- **CVEs:** GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g (CVSS 7.5)
- **File:** `Source/Backend/package-lock.json`
- **Description:** Unbounded memory growth via no cache eviction + potential prototype write via malicious browserslist-stats.json, causing OOM or crash.
- **Exploitability:** Medium — requires attacker control of browserslist-stats.json
- **Impact:** OOM crash, service disruption
- **Fix:** Update to `browserslist@>=4.28.7`:
  ```bash
  npm update browserslist
  ```

### DEP-008: @opentelemetry High-Severity Chain (portal/Backend)
- **Severity:** P2 (High)
- **Category:** cve
- **Packages:** `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-node`
- **File:** `portal/Backend/package-lock.json`
- **Description:** Multiple OpenTelemetry instrumentation packages have high-severity transitive dependency vulnerabilities (gRPC, protobuf chain).
- **Impact:** Depends on underlying transitive CVE chain
- **Fix:** Update OpenTelemetry packages to latest:
  ```bash
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node
  ```

### DEP-009: vite Server.fs.deny Bypass (Windows Paths)
- **Severity:** P2 (High — Path Traversal)
- **Category:** cve
- **Package:** `vite@<=6.4.2`
- **CVE:** GHSA-fx2h-pf6j-xcff (CVSS 7.5)
- **File:** `Source/Frontend/package-lock.json`
- **Description:** Vite's `server.fs.deny` can be bypassed on Windows via alternate path representations (UNC paths, etc.), allowing file disclosure.
- **Exploitability:** High on Windows development machines
- **Impact:** Arbitrary file disclosure from dev server
- **Fix:** Update `vite` to >=6.4.3 or 8.x:
  ```bash
  cd Source/Frontend && npm update vite
  ```
- **Risk Mitigation:** Never expose Vite dev server to untrusted networks

### DEP-010: react-router-dom Open Redirect + XSS
- **Severity:** P2 (High — Open Redirect)
- **Category:** cve
- **Package:** `react-router-dom@6.0.0-7.17.0`
- **CVEs:** GHSA-2j2x-hqr9-3h42, GHSA-jjmj-jmhj-qwj2 (CVSS varies)
- **File:** `Source/Frontend/package-lock.json`
- **Description:** Multiple open redirect vulnerabilities in react-router-dom via protocol-relative URLs and backslash handling. Can redirect users to attacker sites or enable XSS.
- **Exploitability:** Medium — requires crafted URL or Link component
- **Impact:** Phishing attacks, XSS via open redirect
- **Fix:** Update to `react-router-dom@>=7.18.0`:
  ```bash
  cd Source/Frontend && npm update react-router-dom
  ```

### DEP-011: postcss Path Traversal via sourceMappingURL
- **Severity:** P2 (High — Path Traversal)
- **Category:** cve
- **Package:** `postcss@<=8.5.22`
- **CVEs:** GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 (CVSS 7.5)
- **File:** `portal/Frontend/package-lock.json`
- **Description:** PostCSS fails to properly validate sourceMappingURL in CSS comments, allowing attackers to read arbitrary `.map` files from the filesystem.
- **Exploitability:** High — can read source maps containing sensitive info
- **Impact:** Information disclosure (source code, paths, module structure)
- **Fix:** Update to `postcss@>=8.5.23`:
  ```bash
  cd portal/Frontend && npm update postcss
  ```

### DEP-012: nanoid Integer Overflow + Infinite Loop
- **Severity:** P2 (High — DoS)
- **Category:** cve
- **Package:** `nanoid@<=3.3.17`
- **CVEs:** GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8 (CVSS 5.9-7.4)
- **File:** `portal/Frontend/package-lock.json`
- **Description:** Custom or non-secure generators can loop indefinitely with zero/negative size, or integer overflow with large size values, causing DoS.
- **Exploitability:** Medium — depends on usage pattern
- **Impact:** Infinite loops, service hang
- **Fix:** Update to `nanoid@>=3.3.18`:
  ```bash
  cd portal/Frontend && npm update nanoid
  ```

---

## Moderate Severity Findings (P3)

### DEP-013: uuid Buffer Bounds Check Missing
- **Severity:** P3 (Moderate — Buffer Overflow)
- **Category:** cve
- **Package:** `uuid@<11.1.1`
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **File:** `Source/Backend/package-lock.json`
- **Description:** uuid v3/v5/v6 functions fail to validate buffer bounds when a user-provided buffer is passed, allowing out-of-bounds write.
- **Exploitability:** Low — requires application to pass untrusted buffer
- **Impact:** Memory corruption, potential crash or information leak
- **Fix:** Update to `uuid@>=11.1.1`:
  ```bash
  cd Source/Backend && npm update uuid
  ```

### DEP-014-018: Additional Moderate DoS & Info Disclosure
Multiple moderate CVEs in:
- `@babel/core@<=7.29.0` — sourceMappingURL arbitrary file read
- `@remix-run/router` — open redirect with protocol-relative URLs
- `body-parser@<1.20.6` — DoS via invalid limit value
- `baseline-browser-mapping@>=2.0.0 <2.11.0` — process termination on invalid input
- `qs@>=6.14.2 <=6.15.3` — array-limit bypass, DoS via attacker-controlled isBuffer

**Fix:** Run `npm update` in affected directories to bring all dependencies to latest patch versions.

---

## Outdated Major Versions (P3)

### React ecosystem versions
| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| `react` | 18.3.1 | 19.3.0 | 1 major behind |
| `react-dom` | 18.3.1 | 19.3.0 | 1 major behind |
| `react-router-dom` | 6.26.0 | 7.18.4 | 1 major behind |

**Recommendation:** React 19 is stable but requires testing. Plan a major version upgrade for `react`, `react-dom`, and `react-router-dom` together.

### Development tooling versions
| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| `vite` | 5.4.0 | 8.3.2 | 2+ majors behind ⚠️ |
| `vitest` | 2.0.5 | 5.0.3+ | 2+ majors behind ⚠️ |
| `typescript` | 5.3.3-5.5.4 | 5.6+ | Patch updates available |

**Recommendation:** Vite 8 is a major jump; test thoroughly. Vitest 5.0+ has breaking changes; review changelog.

---

## License Compliance Analysis

**Status:** No GPL/AGPL viral licenses detected in production dependencies. All primary dependencies use permissive licenses (MIT, Apache 2.0, ISC).

⚠️ **Note:** Some dev dependencies may have different terms; verify license-checker output if licensing review is required for distribution.

---

## Supply Chain Risk Assessment

### Direct Dependencies at Risk
- `vitest@<3.2.6` — **DIRECT** dev dependency in Frontend & Portal/Backend
- `@opentelemetry/auto-instrumentations-node` — **DIRECT** in Portal/Backend
- `@opentelemetry/sdk-node` — **DIRECT** in Portal/Backend
- `react-router-dom@<7.18.0` — **DIRECT** in Frontend (open redirect risk)

### Transitive Dependencies Pulling High-Severity Packages
- Handlebars pulled via test/build tooling
- form-data pulled via HTTP client chains
- brace-expansion, browserslist pulled via build tools (Vite, Rollup)

### Dependency Tree Health
- **Source/Backend:** 102 prod deps, 310 dev deps, 411 total (reasonable)
- **Source/Frontend:** 9 prod deps, 222 dev deps, 230 total (dev-heavy, expected)
- **portal/Backend:** Large dependency footprint due to OpenTelemetry instrumentation chain
- **Overall:** High transitive dependency count (400+); surface area for supply-chain attacks

---

## Remediation Priority

### Immediate (Within 48 hours)
1. ✅ **Vitest:** Update all instances to ≥3.2.6 (critical UI server vuln)
2. ✅ **Handlebars:** Update to ≥4.8.0 (critical RCE)
3. ✅ **Protobufjs:** Update to ≥7.5.5 in portal/Backend (critical RCE)

### Short-term (Within 1 week)
4. ✅ **form-data:** Update to ≥4.0.6
5. ✅ **js-yaml, brace-expansion, browserslist:** Update to latest patch
6. ✅ **react-router-dom:** Update to >=7.18.0 (fixes open redirect)
7. ✅ **vite:** Evaluate and update to 8.x (path traversal fix)

### Medium-term (Within 2 weeks)
8. Plan major version upgrades (React 19, Vitest 5.x)
9. Evaluate OpenTelemetry instrumentation strategy in portal/Backend
10. Consider reducing transitive dependency count

### Long-term
11. Implement automated dependency scanning (e.g., Dependabot, Renovate)
12. Establish policy: security patches within 7 days, feature upgrades within 30 days

---

## Recommendations

### 1. Automated Scanning
Set up CI/CD gate: `npm audit --audit-level=moderate` (fail on moderate+)

```bash
npm audit --audit-level=moderate --production
```

### 2. Dependency Pinning Strategy
- **Production deps:** Pin to exact versions (no `^` or `~`)
- **Dev deps:** Allow minor updates via caret ranges
- **Lock files:** Always commit `package-lock.json`

### 3. Regular Audits
- Run `npm audit` weekly
- Review and update monthly
- Patch critical/high immediately

### 4. Monorepo Coordination
Multiple `package.json` files create duplication risk. Consider:
- `npm workspaces` to deduplicate shared dependencies
- Unified audit policy across all packages

### 5. Development Environment Security
- Vitest UI should **never** be exposed externally
- Vite dev server should only bind to localhost
- Do not expose metrics ports to untrusted networks

---

## Cross-Team Escalations

✅ **[ESCALATE → TheGuardians]**
- **DEP-001:** Handlebars RCE — verify no user-controlled templates
- **DEP-002:** Vitest file disclosure — critical for dev environment security
- **DEP-003:** Protobufjs RCE — verify untrusted data handling
- **DEP-009:** Vite path traversal — Windows dev machine risk
- **DEP-010:** react-router open redirect — XSS attack vector

---

## Learnings & Future Audits

_(To be updated after fixes are applied)_

- **Watch-list packages:** Handlebars, Vitest, OpenTelemetry chain (frequent CVEs)
- **License decisions:** All current prod deps are safe; no viral GPL/AGPL
- **Audit tools available:** npm audit (native), license-checker (optional)
- **CI/CD integration:** Add `npm audit --json` to pipeline reporting

---

**Report Generated:** 2026-10-02  
**Auditor:** Dependency Auditor Agent (Haiku 4.5)  
**Status:** Ready for remediation planning
