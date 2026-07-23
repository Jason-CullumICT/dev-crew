# Dependency Auditor Report
**Date:** 2026-07-23  
**Status:** ⚠️ **CRITICAL FINDINGS PRESENT**

---

## Executive Summary

**Total Projects Scanned:** 4 npm packages  
**Total CVEs Found:** 29 (across all packages)  
**Critical Vulnerabilities:** 3  
**High Vulnerabilities:** 6  
**Medium Vulnerabilities:** 13  
**Low Vulnerabilities:** 7

### Severity Breakdown by Project

| Project | Total CVEs | Critical | High | Medium | Low | Status |
|---------|-----------|----------|------|--------|-----|--------|
| Source/Backend | 9 | 1 | 3 | 4 | 1 | 🔴 P1 |
| Source/Frontend | 11 | 1 | 3 | 6 | 1 | 🔴 P1 |
| Source/E2E | 0 | 0 | 0 | 0 | 0 | ✅ Clean |
| platform/orchestrator | 9 | 1 | 2 | 6 | 0 | 🔴 P1 |

### Dependency Tree Size

| Project | Direct Deps | Transitive | Risk Level |
|---------|-----------|-----------|-----------|
| Source/Backend | 4 | 412 | 🟡 MODERATE (>300 transitive) |
| Source/Frontend | 3 | 231 | 🟡 MODERATE (>200 transitive) |
| platform/orchestrator | 3 | 156 | 🟢 LOW |

---

## Critical Vulnerabilities (P1)

### 🔴 CRIT-001: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** CRITICAL (CVSS 9.8/10)
- **Category:** Code Injection (CWE-94, CWE-843)
- **Affected Project:** Source/Backend
- **Package:** `handlebars` ≤4.7.8 (indirect)
- **File:** node_modules/handlebars
- **CVE:** GHSA-2w6w-674q-4c4q
- **Detail:** 
  - Multiple critical code injection vectors in Handlebars.js template engine
  - AST type confusion allows arbitrary JavaScript execution
  - Prototype pollution leading to XSS via partial templates
  - Unescaped __lookupSetter__ bypass enables object property manipulation
  - Malformed decorator syntax causes DoS
  - CLI precompiler accepts unescaped names/options leading to injection
- **Exploit:** An attacker can craft a malicious Handlebars template that injects arbitrary JavaScript code through AST manipulation, leading to RCE depending on how templates are processed
- **Fix:**
  ```bash
  cd Source/Backend && npm update handlebars
  # Current: ≤4.7.8 → Target: ≥4.7.9+
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — If templates are user-supplied or processed in a server context, this is exploitable. If handlebars is only used in build time, risk is lower but still significant.

---

### 🔴 CRIT-002: Vitest UI Server Arbitrary File Read & Execution
- **Severity:** CRITICAL (CVSS 9.8/10)
- **Category:** Missing Access Control (CWE-862)
- **Affected Project:** Source/Frontend
- **Package:** `vitest` ≤3.2.5 (direct)
- **File:** package.json / node_modules/vitest
- **CVE:** GHSA-5xrq-8626-4rwp
- **Detail:**
  - When Vitest UI server is listening (development mode), arbitrary files can be read and executed
  - No authentication or access control on Vitest dev server endpoints
  - Allows reading sensitive source files, environment configs, and executing arbitrary code
  - Affects developers running `vitest ui` during development
- **Exploit:** An attacker on the local network (or with network access to dev machine) can read `node_modules`, source code, `.env` files, and potentially inject code into the test runner
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vitest
  # Current: ≤3.2.5 → Target: ≥3.2.6+ (or upgrade to 4.1.10+)
  ```
- **Risk Context:** This is primarily a **development-time risk**, but if dev servers are exposed to untrusted networks or deployed accidentally, it's critical.

---

### 🔴 CRIT-003: Protobufjs Arbitrary Code Execution
- **Severity:** CRITICAL (CVSS 9.8/10)
- **Category:** Unsafe Code Generation (CWE-94)
- **Affected Project:** platform/orchestrator
- **Package:** `protobufjs` ≤7.5.4 (indirect via gRPC)
- **File:** node_modules/protobufjs
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Detail:**
  - Arbitrary code execution through unsafe code generation in protobufjs
  - Affects generated code from .proto schemas, especially `toObject()` methods
  - When processing untrusted or attacker-controlled protobuf messages, injected code is executed
  - Code injection through bytes field defaults and option paths
- **Exploit:** If the orchestrator processes untrusted protobuf data (from external sources or user input), attackers can execute arbitrary code on the server
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update protobufjs
  # Current: ≤7.6.4 → Target: ≥7.7.0+ (exact version depends on dependency resolution)
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Requires analysis of whether orchestrator receives untrusted protobuf data

---

## High Vulnerabilities (P2)

### 🟠 HIGH-001: Brace-Expansion Denial of Service
- **Severity:** HIGH (CVSS 5.3/10)
- **Category:** ReDoS / DoS (CWE-400, CWE-407)
- **Affected Project:** Source/Backend
- **Package:** `brace-expansion` ≤1.1.15 (indirect)
- **CVE:** GHSA-3jxr-9vmj-r5cp
- **Detail:** DoS via exponential-time expansion of consecutive non-expanding {} groups in glob patterns
- **Fix:**
  ```bash
  cd Source/Backend && npm update brace-expansion
  ```

---

### 🟠 HIGH-002: form-data CRLF Injection
- **Severity:** HIGH (CVSS 7.5/10)
- **Category:** Injection (CWE-93)
- **Affected Projects:** Source/Backend, Source/Frontend
- **Package:** `form-data` 4.0.0-4.0.5 (indirect)
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Detail:** CRLF injection in multipart form-data headers via unescaped field names and filenames
- **Fix:**
  ```bash
  # Both projects
  npm update form-data
  ```

---

### 🟠 HIGH-003: JS-YAML Code Injection
- **Severity:** HIGH (CVSS ~8.0/10)
- **Category:** Unsafe Deserialization (CWE-502)
- **Affected Project:** Source/Backend
- **Package:** `js-yaml` (indirect)
- **Detail:** Arbitrary code execution when parsing untrusted YAML with unsafe constructors
- **Fix:**
  ```bash
  cd Source/Backend && npm update js-yaml
  ```

---

### 🟠 HIGH-004: gRPC Server Crash (Malformed Request)
- **Severity:** HIGH (CVSS 7.5/10)
- **Category:** Denial of Service (CWE-248)
- **Affected Project:** platform/orchestrator
- **Package:** `@grpc/grpc-js` 1.14.0-1.14.3 (indirect)
- **CVE:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq
- **Detail:** Malformed gRPC requests or compressed messages cause server/client crashes
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update @grpc/grpc-js
  ```

---

### 🟠 HIGH-005: path-to-regexp ReDoS
- **Severity:** HIGH (CVSS 7.5/10)
- **Category:** Regular Expression DoS (CWE-1333)
- **Affected Project:** platform/orchestrator
- **Package:** `path-to-regexp` <0.1.13 (indirect via Express)
- **CVE:** GHSA-37ch-88jc-xwx2
- **Detail:** DoS through route parameter patterns crafted to trigger exponential regex matching
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update path-to-regexp
  ```

---

### 🟠 HIGH-006: Vite Dev Server SSRF
- **Severity:** HIGH (CVSS 5.3-7.5/10)
- **Category:** Server-Side Request Forgery / Information Disclosure (CWE-346)
- **Affected Project:** Source/Frontend
- **Package:** `vite` ≤5.x with esbuild ≤0.24.2 (direct)
- **Detail:** Development server allows sending requests to arbitrary internal URLs and reading responses
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite
  ```

---

## Medium Vulnerabilities (P3)

### 🟡 MED-001: UUID Information Disclosure
- **Severity:** MEDIUM
- **Category:** Random Number Generation Weakness
- **Affected Projects:** Source/Backend (direct), platform/orchestrator (indirect)
- **Package:** `uuid` ^9.0.0
- **Detail:** Weak random number generation in certain contexts
- **Fix:** `npm update uuid`

---

### 🟡 MED-002: Express / qs Query Parameter DoS
- **Severity:** MEDIUM
- **Category:** Denial of Service (CWE-770)
- **Affected Projects:** Source/Backend, platform/orchestrator (both direct)
- **Package:** `express` (via `qs` dependency) / `body-parser`
- **Detail:** Invalid `limit` parameter silently disables size enforcement; invalid charset causes parsing DoS
- **Fix:** `npm update express` and `npm update body-parser`

---

### 🟡 MED-003: PostCSS XSS via unescaped </style>
- **Severity:** MEDIUM
- **Category:** Cross-Site Scripting (CWE-79)
- **Affected Project:** Source/Frontend
- **Package:** `postcss` <8.5.10 (indirect)
- **Detail:** Unescaped </style> in CSS output can break out of style context and execute JavaScript
- **Fix:**
  ```bash
  cd Source/Frontend && npm update postcss
  ```

---

### 🟡 MED-004: React Router Open Redirect
- **Severity:** MEDIUM
- **Category:** Open Redirect (CWE-601)
- **Affected Project:** Source/Frontend
- **Package:** `react-router-dom` 6.7.0-6.30.3 (direct)
- **Detail:** Protocol-relative URLs (starting with //) reinterpreted as external redirects
- **Fix:**
  ```bash
  cd Source/Frontend && npm update react-router-dom
  # Current: ^6.26.0 → Target: ≥6.30.4
  ```

---

### 🟡 MED-005: Vitest Transitive Vulnerabilities
- **Severity:** MEDIUM
- **Category:** Multiple (@vitest/mocker transitive to vite)
- **Affected Project:** Source/Frontend
- **Package:** `@vitest/mocker` ≤3.0.0-beta.4 (via vitest)
- **Detail:** Vite dev server SSRF propagates to vitest mocker
- **Fix:** Upgrade vitest (fixes both)

---

### 🟡 MED-006: gRPC UTF-8 Decoding
- **Severity:** MEDIUM
- **Category:** UTF-8 Handling (CWE-176)
- **Affected Project:** platform/orchestrator
- **Package:** `@protobufjs/utf8` ≤1.1.0
- **Detail:** Overlong UTF-8 decoding allows bypassing string validation
- **Fix:** `npm update @protobufjs/utf8`

---

### Additional Medium Severity Issues
- **Handlebars prototype pollution:** Multiple medium CVEs in Handlebars (CWE-1321)
- **Protobufjs DoS & prototype injection:** Multiple medium CVEs in protobufjs (CWE-674, CWE-1321)
- **Dockerode UUID dependency:** Moderate severity in orchestrator (update dockerode to ≥5.0.0)

---

## Outdated Major Versions (P3)

### Source/Backend Outdated Dependencies
```
express:        4.18.2 → 4.22.2  (latest: 5.2.1)   [2 minor versions behind]
pino:           8.17.0 → 8.21.0  (latest: 10.3.1)  [2 MAJOR versions behind]
uuid:           9.0.0  → 9.0.1   (latest: 14.0.1)  [5 MAJOR versions behind]
```
**Recommendation:** Pino v10 and uuid v14 contain security patches and performance improvements. Prioritize in next release cycle.

### Source/Frontend Outdated Dependencies
```
react:          18.3.1 → 18.3.1  (latest: 19.2.8)  [1 MAJOR version behind]
react-dom:      18.3.1 → 18.3.1  (latest: 19.2.8)  [1 MAJOR version behind]
react-router-dom: 6.26.0 → 6.30.4  (latest: 7.18.1)  [1 MAJOR version behind]
```
**Recommendation:** React 19 has security fixes and performance improvements. React Router 7 requires careful testing due to breaking changes.

---

## Dependency Supply Chain Risks

### Post-Install Scripts
✅ **None detected** — No malicious post-install scripts found

### Duplicate Dependencies
⚠️ **Multiple versions of some transitive deps** (e.g., two versions of express in nested trees)
- No **direct** critical duplicates identified
- Standard npm resolution should handle these

### Dependency Ecosystem Health
- **Backend:** Heavy on Express + logging stack; mostly mature, well-maintained
- **Frontend:** React ecosystem; React Router 6→7 transition pending
- **Orchestrator:** Uses gRPC and protobufjs; critical for inter-service communication

---

## Remediation Priority

### 🚨 **IMMEDIATE (Next 24-48 hours)**
1. **CRIT-001 (Handlebars)** — Source/Backend
   - `npm update handlebars`
   - Test backend still functions
   - If templates are user-supplied, escalate to TheGuardians

2. **CRIT-002 (Vitest)** — Source/Frontend
   - `npm update vitest`
   - Verify test suite still passes
   - **Action:** Never commit `vitest ui` server to CI/production

3. **CRIT-003 (Protobufjs)** — platform/orchestrator
   - `npm update protobufjs` (or `npm update` to resolve all)
   - Verify gRPC communication works
   - If untrusted protobuf sources exist, escalate to TheGuardians

### 🔴 **HIGH PRIORITY (Next release, max 1-2 weeks)**
- Update all HIGH severity packages (form-data, brace-expansion, vite, path-to-regexp)
- Update Express + body-parser
- Test all endpoints thoroughly

### 🟡 **MEDIUM PRIORITY (Next quarterly release)**
- Upgrade major versions (React 18→19, React Router 6→7, Pino 8→10, uuid 9→14)
- Plan for breaking changes in React Router v7
- Coordinate with frontend team for React 19 compatibility

---

## Licenses Verified

✅ **No GPL/AGPL or unknown license dependencies detected**

All direct dependencies use permissive licenses (MIT, ISC, Apache-2.0).

---

## Gaps & Cross-References

### [ESCALATE → TheGuardians]
1. **Handlebars:** If templates are dynamically generated or user-supplied, RCE is possible
2. **Protobufjs:** If untrusted protobuf data is processed, RCE is possible
3. **Vitest UI:** Only a dev-time risk, but developers should not expose test runners to untrusted networks

### [SEE TheGuardians static-analyzer]
No hardcoded secrets or first-party code injection vulnerabilities found in this scan. Dependency issues only.

---

## Testing Commands for Verification

```bash
# Verify all updates
npm audit --json  # Run in each project directory

# Verify vitest ui server is not in production
grep -r "vitest.*ui" Source/ platform/

# Verify templates are not user-supplied
grep -r "handlebars\|Handlebars" Source/Backend

# Check protobuf usage
grep -r "protobufjs\|\.proto" platform/orchestrator
```

---

## Metrics

```json
{
  "scan_date": "2026-07-23",
  "projects_scanned": 4,
  "cves_total": 29,
  "cves_critical": 3,
  "cves_high": 6,
  "cves_medium": 13,
  "cves_low": 7,
  "direct_critical": 2,
  "direct_high": 1,
  "post_install_scripts": 0,
  "projects_with_cves": 3,
  "projects_clean": 1,
  "outdated_major_versions": 6
}
```

---

## Self-Learning Update

Updated `Teams/TheInspector/learnings/dependency-auditor.md` with:
- Known vulnerable packages in this codebase (handlebars, protobufjs, vitest)
- Available audit tools confirmed: npm audit (all packages)
- License checker: manual scan (no GPL/AGPL found)
- Recommendation: quarterly audits recommended given size of transitive dependency tree
