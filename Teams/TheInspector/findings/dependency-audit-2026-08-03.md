# Dependency Audit Report — 2026-08-03

**Run ID:** dependency-auditor  
**Date:** 2026-08-03  
**Overall Grade:** D ⚠️  

---

## Executive Summary

The dev-crew project contains **29 known CVEs across 3 npm workspaces**, including **2 critical vulnerabilities**:
- **`handlebars@4.7.8`** in Source/Backend (CRITICAL: JavaScript injection via AST type confusion)
- **`protobufjs@7.6.4`** in platform/orchestrator (CRITICAL: arbitrary code execution + 11 additional high/moderate CVEs)
- **`vitest@3.2.5`** in Source/Frontend (CRITICAL: arbitrary file read/execute when UI server listening)

Additionally, **multiple HIGH-severity vulnerabilities** require immediate remediation:
- `brace-expansion` (DoS via exponential expansion)
- `form-data` (CRLF injection in multipart headers)
- `js-yaml` (quadratic-complexity DoS)
- `path-to-regexp` (ReDoS via route parameters)
- `postcss` (arbitrary file read via sourceMappingURL)
- `vite` (path traversal in development server)
- `ws` (memory exhaustion DoS)

**Total Vulns:** 29 (1 info, 0 low, 10 moderate, 11 high, 2 critical)  
**Transitive Dependencies:** 796 (411 Backend + 230 Frontend + 155 Orchestrator)  
**Direct Dependencies:** 17  
**Risk Surface:** HIGH — protobufjs alone affects backend infrastructure; vitest affects development safety.

---

## Detailed Findings

### 🔴 CRITICAL VULNERABILITIES (P1)

#### DEP-001: Handlebars Template Injection (JavaScript Execution)
- **Severity:** P1 (Critical)
- **Category:** CVE (JavaScript Injection)
- **Package:** `handlebars@4.7.8`
- **File:** `Source/Backend/package-lock.json`
- **Direct/Transitive:** Transitive (via build tools)
- **CVE ID:** GHSA-2w6w-674q-4c4q
- **CVSS:** 9.8 (Network, Low Complexity, No Privileges, No User Interaction)
- **Affected Versions:** ≥4.0.0 ≤4.7.8
- **Detail:**  
  Handlebars.js allows arbitrary JavaScript injection via AST type confusion when a template includes partial blocks or dynamic partials. An attacker can inject malicious code into the AST, bypassing template sandbox protections.
- **Impact:** If handlebars processes untrusted template input (e.g., user-provided workflows), attackers can execute arbitrary code on the backend.
- **Fix:** Upgrade to `handlebars@4.7.9+`
  ```bash
  cd Source/Backend && npm update handlebars
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Code execution risk in template processing.

---

#### DEP-002: Protobufjs Arbitrary Code Execution + Multiple Injection Vectors
- **Severity:** P1 (Critical)
- **Category:** CVE (Code Generation & Injection)
- **Package:** `protobufjs@7.6.4`
- **File:** `platform/orchestrator/package-lock.json`
- **Direct/Transitive:** Transitive (via @grpc/grpc-js)
- **Primary CVE:** GHSA-xq3m-2v4x-88gg (Arbitrary Code Execution)
- **CVSS:** 9.8
- **Affected Versions:** ≤7.5.5 (multiple follow-up issues up to 7.6.4)
- **Detail:**  
  protobufjs generates JavaScript code from .proto files. Multiple vulnerabilities exist:
  1. **Code execution** (GHSA-xq3m-2v4x-88gg): Generated code can be exploited to inject and execute arbitrary code.
  2. **Prototype pollution** (GHSA-75px-5xx7-5xc7): Unsafe option paths allow gadget chain execution.
  3. **Unbounded recursion DoS** (GHSA-685m-2w69-288q, GHSA-jvwf-75h9-cwgg): Crafted .proto files or JSON payloads can cause infinite loops or stack exhaustion.
  4. **UTF-8 overlong decoding** (GHSA-q6x5-8v7m-xcrf): Validation bypass allowing unexpected character sequences.
  
  **Total CVEs in protobufjs:** 10 (1 critical, 4 high, 5 moderate).
- **Impact:** gRPC communication in the orchestrator can be exploited to execute arbitrary code or DoS the service.
- **Fix:** Upgrade to `protobufjs@7.7.0+` (requires `@grpc/grpc-js@1.14.4+`)
  ```bash
  cd platform/orchestrator && npm update protobufjs @grpc/grpc-js
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Code execution in protocol buffers. [CROSS-REF: red-teamer] — Exploitable via malformed gRPC requests.

---

#### DEP-003: Vitest UI Server — Arbitrary File Read & Execution
- **Severity:** P1 (Critical)
- **Category:** CVE (Unauthorized File Access)
- **Package:** `vitest@3.2.5`
- **File:** `Source/Frontend/package-lock.json`
- **Direct/Transitive:** Direct (dev dependency)
- **CVE ID:** GHSA-5xrq-8626-4rwp
- **CVSS:** 9.8
- **Affected Versions:** <3.2.6
- **Detail:**  
  When the Vitest UI server is running (typically on `localhost:5173` during development), an attacker can read and execute arbitrary files from the project directory via the unsecured `/api/` endpoints. No authentication required.
- **Impact:** **Development environment only**, but exposes source code, `.env` files, and test data. If dev server is exposed to network or a developer's machine is compromised, production credentials and application logic are at risk.
- **Fix:** Upgrade to `vitest@3.2.6+`
  ```bash
  cd Source/Frontend && npm update vitest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Credentials and source code exposure in dev environment.

---

### 🟠 HIGH-SEVERITY VULNERABILITIES (P2)

#### DEP-004: Brace-Expansion DoS (Exponential Expansion & Memory Exhaustion)
- **Severity:** P2 (High)
- **Category:** CVE (Denial of Service)
- **Package:** `brace-expansion@1.1.16`
- **File:** `Source/Backend/package-lock.json`
- **Direct/Transitive:** Transitive (via glob, used by build tools)
- **CVE IDs:** GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg
- **CVSS:** 7.5 (Unbounded expansion OOM), 5.3 (Exponential-time expansion)
- **Affected Versions:** <1.1.16 (multiple vulnerabilities; current is still affected by GHSA-mh99-v99m-4gvg <1.1.17)
- **Detail:**  
  `brace-expansion` can be exploited with crafted input like `{1..1000000}` or nested expansions to cause:
  - Out-of-memory process crashes (GHSA-mh99-v99m-4gvg)
  - Exponential CPU consumption via zero-step sequences (GHSA-3jxr-9vmj-r5cp)
  - Affected versions up to 1.1.16; latest fix is 1.1.17.
- **Impact:** If build tools or CLI utilities process untrusted glob patterns, the backend build could be DoS'd.
- **Fix:** Upgrade to `brace-expansion@1.1.17+` (indirectly via glob update)
  ```bash
  cd Source/Backend && npm update glob
  ```
- **Cross-ref:** — Build-time vulnerability, lower production risk but critical for CI/CD resilience.

---

#### DEP-005: Form-Data CRLF Injection in Multipart Headers
- **Severity:** P2 (High)
- **Category:** CVE (HTTP Header Injection)
- **Package:** `form-data@4.0.5`
- **File:** `Source/Backend/package-lock.json` & `Source/Frontend/package-lock.json`
- **Direct/Transitive:** Transitive (via http request libraries)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx
- **CVSS:** 7.5
- **Affected Versions:** ≥4.0.0 <4.0.6
- **Detail:**  
  Multipart form field names and filenames are not properly escaped. An attacker can inject carriage-return/line-feed (`\r\n`) sequences to craft malicious HTTP headers, leading to:
  - HTTP response splitting
  - Header injection attacks
  - Cache poisoning
- **Impact:** If the backend or frontend uploads files with untrusted filenames, attackers can inject arbitrary headers.
- **Fix:** Upgrade to `form-data@4.0.6+`
  ```bash
  cd Source/Backend && npm update form-data
  cd Source/Frontend && npm update form-data
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Header injection / response splitting.

---

#### DEP-006: JS-YAML DoS via Merge Key Expansion
- **Severity:** P2 (High)
- **Category:** CVE (Denial of Service)
- **Package:** `js-yaml@3.14.2`
- **File:** `Source/Backend/package-lock.json`
- **Direct/Transitive:** Transitive (via config parsing)
- **CVE ID:** GHSA-52cp-r559-cp3m
- **CVSS:** 7.5
- **Affected Versions:** ≥3.0.0 <3.15.0
- **Detail:**  
  YAML merge keys (`<<`) can be chained with repeated aliases to force quadratic time complexity during parsing. A specially crafted YAML document can cause the parser to hang or consume excessive CPU.
- **Impact:** If the backend parses user-supplied or external YAML configuration (e.g., workflow specs), attackers can trigger resource exhaustion.
- **Fix:** Upgrade to `js-yaml@3.15.0+`
  ```bash
  cd Source/Backend && npm update js-yaml
  ```
- **Cross-ref:** — Potential attack vector if workflow specs are YAML-based.

---

#### DEP-007: Path-to-Regexp ReDoS (Regular Expression Denial of Service)
- **Severity:** P2 (High)
- **Category:** CVE (ReDoS)
- **Package:** `path-to-regexp@0.1.12`
- **File:** `platform/orchestrator/package-lock.json`
- **Direct/Transitive:** Transitive (via Express route handling)
- **CVE ID:** GHSA-37ch-88jc-xwx2
- **CVSS:** 7.5
- **Affected Versions:** <0.1.13
- **Detail:**  
  Multiple route parameters in a single path pattern can trigger ReDoS, causing catastrophic backtracking in the regex engine. A malicious route parameter value can hang the request handler.
- **Impact:** An attacker can craft URLs with specific parameter values to exhaust CPU and DoS the orchestrator.
- **Fix:** Upgrade to `path-to-regexp@0.1.13+` (indirectly via Express)
  ```bash
  cd platform/orchestrator && npm update express
  ```
- **Cross-ref:** — Production route handling vulnerability.

---

#### DEP-008: PostCSS Arbitrary File Read via sourceMappingURL
- **Severity:** P2 (High)
- **Category:** CVE (Information Disclosure / Path Traversal)
- **Package:** `postcss@8.5.17`
- **File:** `Source/Frontend/package-lock.json`
- **Direct/Transitive:** Transitive (via Vite)
- **Primary CVE:** GHSA-6g55-p6wh-862q
- **CVSS:** 7.5
- **Affected Versions:** ≤8.5.11 (multiple follow-up issues; current is still affected by GHSA-r28c-9q8g-f849)
- **Detail:**  
  When PostCSS processes CSS files, it automatically loads `.map` files referenced in `sourceMappingURL` comments. An attacker can craft a CSS file with a malicious sourceMappingURL pointing to:
  - `.env` files
  - Configuration files
  - Source maps containing sensitive code
  
  PostCSS will read and parse these files, potentially leaking their contents.
- **Impact:** During frontend build, if an attacker-controlled CSS is processed, build secrets and configuration could be leaked.
- **Fix:** Upgrade to `postcss@8.5.18+` (or latest 8.x / 9.x)
  ```bash
  cd Source/Frontend && npm update postcss
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Information disclosure in build pipeline.

---

#### DEP-009: Vite Dev Server Path Traversal (Windows Alternate Paths)
- **Severity:** P2 (High)
- **Category:** CVE (Path Traversal / File Access)
- **Package:** `vite@6.4.2`
- **File:** `Source/Frontend/package-lock.json`
- **Direct/Transitive:** Direct (dev dependency)
- **CVE ID:** GHSA-fx2h-pf6j-xcff
- **CVSS:** 7.5
- **Affected Versions:** ≤6.4.2
- **Detail:**  
  On Windows, Vite's `server.fs.deny` protection can be bypassed using alternate path representations (e.g., `\\?\`, UNC paths, symlinks). An attacker can access files outside the intended project root during development.
- **Impact:** **Development environment on Windows**. Developers' source code, `.env`, credentials exposed.
- **Fix:** Upgrade to `vite@6.4.3+` or 7.x / 8.x
  ```bash
  cd Source/Frontend && npm update vite
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Credential exposure in dev environment (Windows).

---

#### DEP-010: WebSocket (ws) Memory Exhaustion DoS
- **Severity:** P2 (High)
- **Category:** CVE (Denial of Service)
- **Package:** `ws@8.20.1`
- **File:** `platform/orchestrator/package-lock.json`
- **Direct/Transitive:** Transitive (WebSocket server)
- **CVE ID:** GHSA-96hv-2xvq-fx4p
- **CVSS:** 7.5
- **Affected Versions:** ≥8.0.0 <8.21.0
- **Detail:**  
  WebSocket server does not validate frame fragmentation. An attacker can send many tiny fragments or partial frames, causing unbounded memory allocation until the process crashes.
- **Impact:** If the orchestrator exposes WebSocket endpoints (for real-time agent communication), attackers can exhaust memory.
- **Fix:** Upgrade to `ws@8.21.0+`
  ```bash
  cd platform/orchestrator && npm update ws
  ```
- **Cross-ref:** — Production WebSocket vulnerability in orchestrator.

---

### 🟡 MODERATE-SEVERITY VULNERABILITIES (P3)

Eight additional moderate CVEs affect the project:

#### DEP-011: @grpc/grpc-js — Server Crash from Malformed Requests
- **Severity:** P3 (Moderate)
- **Package:** `@grpc/grpc-js@1.14.3`
- **CVE IDs:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq
- **Issue:** Malformed or compressed gRPC messages cause server crashes (CWE-248: Uncaught Exception)
- **Fix:** Upgrade to `@grpc/grpc-js@1.14.4+`

#### DEP-012: Body-Parser DoS via Invalid Limit Value
- **Severity:** P3 (Moderate)
- **Package:** `body-parser@1.20.5`
- **CVE ID:** GHSA-v422-hmwv-36x6
- **Issue:** Invalid `limit` configuration silently disables size enforcement, allowing unbounded request bodies
- **Fix:** Upgrade to `body-parser@1.20.6+`

#### DEP-013: qs DoS via Null/Undefined Array Entries
- **Severity:** P3 (Moderate)
- **Package:** `qs@6.15.1`
- **CVE ID:** GHSA-q8mj-m7cp-5q26
- **Issue:** Malformed comma-format arrays crash qs.stringify
- **Fix:** Upgrade to `qs@6.15.2+` or latest

#### DEP-014: React Router Multiple Open Redirect Vectors
- **Severity:** P3 (Moderate)
- **Package:** `react-router-dom@6.30.4`
- **CVE IDs:** GHSA-2j2x-hqr9-3h42, GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg
- **Issues:** Protocol-relative URLs (`//`), backslashes (`\`), and SSR deserialization can enable open redirects or XSS
- **Fix:** Upgrade to `react-router-dom@7.18.0+`

#### DEP-015: UUID Buffer Bounds Check Missing
- **Severity:** P3 (Moderate)
- **Package:** `uuid@11.0.x`
- **CVE ID:** GHSA-w5hq-g745-h8pq
- **Issue:** v3/v5/v6 UUID generation with a provided buffer doesn't validate bounds, allowing buffer overflow
- **Fix:** Upgrade to `uuid@11.1.1+`

#### DEP-016: @Babel/Core Arbitrary File Read via sourceMappingURL
- **Severity:** P3 (Low, but critical in context)
- **Package:** `@babel/core@7.29.0`
- **CVE ID:** GHSA-4x5r-pxfx-6jf8
- **Issue:** Babel source maps can reference arbitrary files, leaking contents
- **Fix:** Upgrade to `@babel/core@7.30.0+`

#### DEP-017: Esbuild Dev Server Allows Cross-Origin Requests
- **Severity:** P3 (Moderate)
- **Package:** `esbuild@0.24.2`
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **Issue:** Development server doesn't enforce same-origin policy, allowing any website to make requests and read responses
- **Fix:** Upgrade to `esbuild@0.25.0+`

#### DEP-018: Vitest/Vite-Node Indirect Vulnerabilities
- **Severity:** P3 (Moderate, cascading from vite)
- **Packages:** `@vitest/mocker@3.0.0-beta.4`, `vite-node@2.2.0-beta.2`
- **Issue:** Transitive dependencies of vite; fixed by upgrading vite to 8.2.0+

---

### 📊 Summary Table

| ID | Package | Severity | CVE(s) | Status |
|---|---------|----------|--------|--------|
| DEP-001 | handlebars | P1/Critical | GHSA-2w6w-674q | ❌ Unfixed |
| DEP-002 | protobufjs | P1/Critical | GHSA-xq3m (+ 9 more) | ❌ Unfixed |
| DEP-003 | vitest | P1/Critical | GHSA-5xrq-8626 | ❌ Unfixed |
| DEP-004 | brace-expansion | P2/High | GHSA-3jxr + GHSA-mh99 | ❌ Unfixed |
| DEP-005 | form-data | P2/High | GHSA-hmw2-7cc7 | ❌ Unfixed |
| DEP-006 | js-yaml | P2/High | GHSA-52cp-r559 | ❌ Unfixed |
| DEP-007 | path-to-regexp | P2/High | GHSA-37ch-88jc | ❌ Unfixed |
| DEP-008 | postcss | P2/High | GHSA-6g55-p6wh | ❌ Unfixed |
| DEP-009 | vite | P2/High | GHSA-fx2h-pf6j | ❌ Unfixed |
| DEP-010 | ws | P2/High | GHSA-96hv-2xvq | ❌ Unfixed |
| DEP-011 | @grpc/grpc-js | P3/Moderate | GHSA-5375 + GHSA-99f4 | ❌ Unfixed |
| DEP-012 | body-parser | P3/Moderate | GHSA-v422-hmwv | ❌ Unfixed |
| DEP-013 | qs | P3/Moderate | GHSA-q8mj-m7cp | ❌ Unfixed |
| DEP-014 | react-router-dom | P3/Moderate | GHSA-2j2x + 2 more | ❌ Unfixed |
| DEP-015 | uuid | P3/Moderate | GHSA-w5hq-g745 | ❌ Unfixed |
| DEP-016 | @babel/core | P3/Low | GHSA-4x5r-pxfx | ❌ Unfixed |
| DEP-017 | esbuild | P3/Moderate | GHSA-67mh-4wv8 | ❌ Unfixed |
| DEP-018 | vitest/vite-node | P3/Moderate | (cascading) | ❌ Unfixed |

---

## Outdated Major Versions

Two packages are 1+ major versions behind current:

1. **`dockerode@4.0.12`** (orchestrator)
   - Current: `5.0.1` (1 major version behind)
   - Risk: Unknown breaking changes; potential unpatched vulnerabilities
   - Recommendation: Review changelog, test upgrade in development

2. **`multer@1.4.5-lts.2`** (orchestrator)
   - Current: `2.2.0` (0 minor versions behind, but on LTS)
   - Risk: LTS branch may have limited security updates
   - Recommendation: Monitor LTS timeline; consider upgrading for new features

3. **`express@4.22.2`** (orchestrator)
   - Current: `5.2.1` (1 major version behind)
   - Risk: Express 5.x is stable; 4.x will eventually reach EOL
   - Recommendation: Plan upgrade to Express 5.x

---

## Dependency Tree Analysis

| Workspace | Direct Deps | Transitive Deps | Total | CVEs |
|-----------|-------------|-----------------|-------|------|
| Backend | 4 | 407 | 411 | 9 |
| Frontend | 3 | 227 | 230 | 11 |
| Orchestrator | 3 | 152 | 155 | 9 |
| **TOTAL** | **10** | **786** | **796** | **29** |

**Risk surface:** 796 transitive dependencies is typical for Node.js projects but requires active monitoring.

---

## License Compliance

All direct dependencies carry permissive or proprietary licenses. No GPL/AGPL viral licenses detected.

- **Backend:** express (MIT), uuid (MIT), pino (MIT), prom-client (Apache 2.0)
- **Frontend:** react (MIT), react-dom (MIT), react-router-dom (MIT), vite (MIT)
- **Orchestrator:** express (MIT), dockerode (Apache 2.0), multer (MIT)

**Verdict:** ✅ **No license compliance violations.**

---

## Supply Chain Risk Assessment

### Positive Signals
- ✅ No postinstall scripts in any workspace
- ✅ All packages are from well-known maintainers (Facebook, Vite core, Express.js foundation)
- ✅ No deprecated packages detected

### Risk Factors
- ⚠️ **protobufjs**: Multiple critical vulnerabilities; used indirectly via gRPC. Urgent upgrade required.
- ⚠️ **handlebars**: Template injection; if custom templates are supported, this is critical.
- ⚠️ **vitest**: Critical dev-only vulnerability; affects development safety and CI/CD.
- ⚠️ **vite**: Multiple vulnerabilities in build system; could leak secrets during build.

---

## Remediation Plan

### Phase 1: Immediate (This Week)
1. **Upgrade vitest** to 3.2.6+ in Source/Frontend
   ```bash
   cd Source/Frontend && npm install vitest@latest
   ```
2. **Upgrade protobufjs** to 7.7.0+ in platform/orchestrator
   ```bash
   cd platform/orchestrator && npm install protobufjs@latest @grpc/grpc-js@latest
   ```
3. **Upgrade handlebars** in Source/Backend (audit step will detect)
   ```bash
   cd Source/Backend && npm audit fix
   ```

### Phase 2: This Sprint
4. Upgrade remaining HIGH-severity packages: form-data, js-yaml, path-to-regexp, postcss, vite, ws
   ```bash
   cd Source/Frontend && npm audit fix
   cd Source/Backend && npm audit fix
   cd platform/orchestrator && npm audit fix
   ```
5. Run full test suites after upgrades

### Phase 3: Next Sprint
6. Plan major version upgrades: express 5.x, react-router-dom 7.x, dockerode 5.x
7. Test in development; coordinate with backend/frontend teams

---

## Escalations

The following findings require coordination with **TheGuardians** security team:

- [ESCALATE → TheGuardians] **DEP-001** (Handlebars code execution)
- [ESCALATE → TheGuardians] **DEP-002** (Protobufjs code execution)
- [ESCALATE → TheGuardians] **DEP-003** (Vitest file read/execution)
- [ESCALATE → TheGuardians] **DEP-005** (Form-data header injection)
- [ESCALATE → TheGuardians] **DEP-008** (PostCSS file read)
- [ESCALATE → TheGuardians] **DEP-009** (Vite path traversal)

---

## Self-Learning Notes

**Updated:** `Teams/TheInspector/learnings/dependency-auditor.md`

### Watch List
- **protobufjs**: HIGH churn. Multiple vulnerabilities across versions. Recommend pinning to latest stable (7.7.0+) and auditing quarterly.
- **handlebars**: Template engine; if the project dynamically compiles user-provided templates, audit changes carefully.
- **vitest**: Dev-only, but critical. Keep current with releases (currently 4.1.10 safe).

### Available Audit Tools
- ✅ `npm audit --json` (works; provides detailed CVE info)
- ✅ `npm outdated --json` (works; identifies version drift)
- ✅ `npx license-checker --json` (works; identifies licenses)

### Environment Notes
- Lock files present for all three workspaces (package-lock.json)
- No custom audit scripts in place; recommend adding `npm audit` to pre-commit hooks

---

## Grading Criteria vs. Findings

Per `inspector.config.yml`:
- **A:** max 0 P1, max 3 P2
- **B:** max 0 P1, max 8 P2
- **C:** max 2 P1, max 15 P2
- **D:** max 999 P1 (anything worse)

**This audit:** 2 P1 (critical) + 9 P2 (high) → **GRADE: D** ⚠️

This is the lowest passing grade. Immediate remediation required before production deployment.

---

## Attachments

- `Teams/TheInspector/learnings/dependency-auditor.md` — Updated with findings and audit methodology
- `tools/pipeline-state-TheInspector.json` — Dashboard state updated

---

**Audit completed by:** Dependency Auditor (Claude Haiku)  
**Report version:** 1.0  
**Recommended follow-up:** Run `npm audit fix` in each workspace after review; re-audit in 30 days.
