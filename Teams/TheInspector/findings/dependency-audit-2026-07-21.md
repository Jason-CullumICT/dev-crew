# Dependency Auditor Findings
## 2026-07-21

---

## Executive Summary

**Grade: D**

**Critical findings:** 2 P1 vulnerabilities requiring immediate action  
**High findings:** 6 P2 vulnerabilities (supply chain and security risks)  
**Medium findings:** 10 P3 vulnerabilities (outdated, abandoned, or low-priority CVEs)

### Risk Metrics

| Category | Backend | Frontend | Total |
|----------|---------|----------|-------|
| **Production Dependencies** | 102 | 9 | 111 |
| **Development Dependencies** | 310 | 222 | 532 |
| **Total Dependencies** | 411 | 230 | 641 |
| **Critical CVEs (P1)** | 1 | 1 | 2 |
| **High CVEs (P2)** | 3 | 3 | 6 |
| **Moderate CVEs (P3)** | 4 | 6 | 10 |
| **Low CVEs (P4)** | 1 | 1 | 2 |

---

## Package Managers Detected

- npm (JavaScript/TypeScript)
  - `Source/Backend/` (13 direct dependencies)
  - `Source/Frontend/` (13 direct dependencies)

---

## Critical Findings (P1 - Immediate Action Required)

### DEP-001: Vitest UI Server RCE
- **Severity:** P1 (Critical)
- **Category:** CVE / Security Vulnerability
- **Affected Package:** `vitest` (Frontend)
- **Current Version:** `2.0.5`
- **Vulnerable Range:** `<3.2.6`
- **CVE ID:** [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp)
- **CVSS Score:** 9.8 (Critical)
- **CWE:** CWE-862 (Missing Authorization)
- **Description:** When Vitest UI server is listening, arbitrary files can be read and executed without authorization. An unauthenticated attacker can exploit this to achieve remote code execution.
- **Impact:** Arbitrary code execution on developer machines and CI environments running tests with UI enabled
- **Fix:** 
  ```bash
  cd Source/Frontend && npm install vitest@^3.2.6
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — This is a high-severity RCE in a test tool used across CI/CD pipeline
- **Recommended Action:** Update immediately; audit CI logs for suspicious vitest-ui access

---

### DEP-002: Handlebars.js JavaScript Injection (Critical)
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Injection Vulnerability
- **Affected Package:** `handlebars` (Backend, transitive via dependencies)
- **Current Version:** `4.7.8` (or older)
- **Vulnerable Range:** `>=4.0.0 <=4.7.8`
- **CVE IDs:** 
  - [GHSA-2w6w-674q-4c4q](https://github.com/advisories/GHSA-2w6w-674q-4c4q) (CVSS 9.8)
  - [GHSA-3mfm-83xf-c92r](https://github.com/advisories/GHSA-3mfm-83xf-c92r) (CVSS 8.1)
- **CWE:** CWE-94 (Code Injection), CWE-843 (Type Confusion)
- **Description:** Multiple JavaScript injection vulnerabilities via AST Type Confusion. Attackers can craft malicious template inputs that execute arbitrary code. Affects partial template injection and decorator syntax.
- **Impact:** 
  - Template injection attacks if user-provided templates are compiled
  - Prototype pollution leading to XSS
  - Denial of service via malformed decorator syntax
- **Fix:** 
  ```bash
  cd Source/Backend && npm update handlebars --depth=20
  ```
  Or identify direct dependency chain and update root cause.
- **Root Cause Investigation:**
  - Handlebars is a transitive dependency (not directly in Backend/Frontend package.json)
  - Likely via build tools or documentation generators
  - Run: `npm ls handlebars` to identify chain
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection vulnerability with 9.8 CVSS
- **Recommended Action:** Update handlebars and all packages in its chain; audit any templates compiled from user input

---

## High Severity Findings (P2 - Address Within Sprint)

### DEP-003: Vite Path Traversal & FS Bypass (High)
- **Severity:** P2 (High)
- **Category:** CVE / Path Traversal / Information Disclosure
- **Affected Package:** `vite` (Frontend)
- **Current Version:** `5.4.0`
- **Vulnerable Range:** `<=6.4.2` (also `5.x` affected)
- **CVE IDs:**
  - [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) (CVSS 7.5 - High)
  - [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)
  - [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)
- **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
- **Description:** 
  - `server.fs.deny` bypass on Windows allows attackers to access files outside the configured deny list via alternate paths
  - Path traversal in optimized deps `.map` handling
  - NTLMv2 hash disclosure via UNC path handling
- **Impact:** 
  - Unauthenticated read access to source code, environment files, secrets
  - Credential disclosure on Windows environments
- **Fix:**
  ```bash
  cd Source/Frontend && npm install vite@latest
  ```
  Requires major version update from 5.x to 8.x (breaking changes — review release notes)
- **Testing:** Verify dev server still boots; re-run all Frontend tests
- **Recommended Action:** Update vite and review vite config for security implications

---

### DEP-004: UUID Buffer Overflow (High)
- **Severity:** P2 (High)
- **Category:** CVE / Buffer Overflow
- **Affected Package:** `uuid` (Backend)
- **Current Version:** `9.0.0`
- **Vulnerable Range:** `<11.1.1`
- **CVE ID:** [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- **CVSS Score:** 7.5 (High)
- **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285 (Improper Validation of Specified Quantity in Input)
- **Description:** Missing buffer bounds check in UUID v3/v5/v6 when `buf` parameter is provided. An attacker can trigger a buffer overflow by supplying a smaller buffer than expected.
- **Impact:** 
  - Potential arbitrary code execution
  - Memory corruption
  - Application crash
- **Fix:**
  ```bash
  cd Source/Backend && npm install uuid@^11.1.1
  ```
  Note: This is a major version update (9.x → 11.x) — check changelog for breaking changes
- **Recommended Action:** Update to latest UUID version; test work item ID generation thoroughly

---

### DEP-005: Form-Data CRLF Injection (High)
- **Severity:** P2 (High)
- **Category:** CVE / Header Injection
- **Affected Package:** `form-data` (Backend & Frontend, transitive)
- **Vulnerable Range:** `4.0.0 - 4.0.5`
- **CVE ID:** [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx)
- **CVSS Score:** 7.5 (High)
- **CWE:** CWE-93 (Improper Neutralization of CRLF Sequences in HTTP Headers)
- **Description:** Multipart form field names and filenames are not properly escaped, allowing CRLF injection. An attacker can inject arbitrary HTTP headers by crafting malicious form field names.
- **Impact:** 
  - HTTP response splitting
  - Cache poisoning
  - Session fixation
  - XSS via header injection
- **Fix:**
  ```bash
  cd Source/Backend && npm update form-data
  cd Source/Frontend && npm update form-data
  ```
- **Root Cause:** Identify why form-data is a transitive dependency (likely axios, supertest, or test utilities)
- **Recommended Action:** Update form-data; audit any file upload or multipart endpoints

---

### DEP-006: React Router Open Redirect (High)
- **Severity:** P2 (High)
- **Category:** CVE / Open Redirect
- **Affected Package:** `react-router-dom` (Frontend)
- **Current Version:** `6.26.0`
- **Vulnerable Range:** `6.6.3-pre.0 - 6.30.3`
- **CVE ID:** [GHSA-2j2x-hqr9-3h42](https://github.com/advisories/GHSA-2j2x-hqr9-3h42)
- **CWE:** CWE-601 (URL Redirection to Untrusted Site)
- **Description:** Same-origin redirect with path starting with `//` is reinterpreted as a protocol-relative URL, allowing open redirect attacks. An attacker can redirect users to arbitrary sites.
- **Impact:** 
  - Phishing attacks
  - Malware distribution
  - Session hijacking
- **Fix:**
  ```bash
  cd Source/Frontend && npm install react-router-dom@^6.30.4
  ```
- **Recommended Action:** Update immediately; audit redirect logic in application code

---

### DEP-007: JS-YAML DoS Attack (High)
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Affected Package:** `js-yaml` (Backend, transitive)
- **Vulnerable Range:** `>=3.0.0 <3.15.0`
- **CVE IDs:**
  - [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) (CVSS 7.5)
  - [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) (CVSS 5.3)
- **CWE:** CWE-400 (Uncontrolled Resource Consumption), CWE-407 (Inefficient Algorithmic Complexity)
- **Description:** YAML merge-key chains can force quadratic CPU consumption. Specially crafted YAML inputs can cause exponential-time expansion, leading to DoS.
- **Impact:** 
  - Application becomes unresponsive
  - Resource exhaustion
  - Service unavailability
- **Fix:**
  ```bash
  cd Source/Backend && npm update js-yaml --depth=20
  ```
- **Root Cause:** Identify if YAML parsing is done on user input or only on configuration files
- **Recommended Action:** Update js-yaml; validate YAML input size/complexity

---

### DEP-008: WebSocket Memory Exhaustion DoS (High)
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Affected Package:** `ws` (Frontend, transitive)
- **Vulnerable Range:** `8.0.0 - 8.20.1`
- **CVE IDs:**
  - [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) (CVSS 7.5)
  - [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) (CVSS 4.4)
- **CWE:** CWE-400 (Uncontrolled Resource Consumption), CWE-770 (Allocation of Resources Without Limits)
- **Description:** Memory exhaustion from tiny fragments and data chunks. Attacker sends fragmented WebSocket frames to exhaust server memory.
- **Impact:** 
  - Server memory exhaustion
  - Crash/restart
  - Denial of service
- **Fix:**
  ```bash
  npm update ws
  ```
- **Recommended Action:** Update ws; consider adding frame size limits in WebSocket config

---

## Moderate Findings (P3 - Address in Next Sprint)

### DEP-009: Express Query Parser DoS (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Affected Package:** `express` (Backend)
- **Current Version:** `4.18.2`
- **Vulnerable Range:** `4.21.0 - 4.22.1 || 5.0.0-alpha.1 - 5.0.1` (not currently affected)
- **Root Cause:** Express depends on `qs` package which has DoS vulnerability
- **Impact:** Transitive risk; current version not directly affected
- **Status:** Monitor; fix when upgrading to Express 5.x

---

### DEP-010: Body Parser Denial of Service (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Affected Package:** `body-parser` (Backend, transitive)
- **Vulnerable Range:** `<1.20.6`
- **CVE ID:** [GHSA-v422-hmwv-36x6](https://github.com/advisories/GHSA-v422-hmwv-36x6)
- **CVSS Score:** 3.7 (Low)
- **CWE:** CWE-770 (Allocation of Resources Without Limits)
- **Description:** Invalid limit value silently disables size enforcement. If a malformed `limit` option is passed, size checks are bypassed, allowing large payloads.
- **Impact:** 
  - Bypass of request size limits
  - Potential DoS via large payloads
  - Memory exhaustion
- **Fix:** Update body-parser (via express update) or configure limit explicitly
- **Recommendation:** Set explicit limits: `app.use(express.json({ limit: '1mb' }))`

---

### DEP-011: Brace Expansion DoS (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Affected Package:** `brace-expansion` (Backend, transitive)
- **Vulnerable Range:** `<=1.1.15`
- **CVE IDs:**
  - [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) (CVSS 5.3 - High)
  - [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) (CVSS 6.5 - Moderate)
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **Description:** DoS via exponential-time expansion of consecutive non-expanding `{}` groups. Malformed glob patterns can cause process hang and memory exhaustion.
- **Impact:** 
  - Process hang
  - Memory exhaustion
  - Service unavailability
- **Fix:** Update brace-expansion (via minimatch)
- **Recommendation:** Update all glob-related dependencies

---

### DEP-012: QS Query String DoS (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Affected Package:** `qs` (Backend, transitive)
- **Vulnerable Range:** `6.11.1 - 6.15.1`
- **CVE ID:** [GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26)
- **CVSS Score:** 5.3 (Moderate)
- **CWE:** CWE-476 (NULL Pointer Dereference)
- **Description:** `qs.stringify()` crashes with TypeError when null/undefined entries in comma-format arrays are processed with `encodeValuesOnly=true`.
- **Impact:** 
  - Application crash on malformed input
  - Denial of service
- **Fix:** Update qs via express/body-parser update
- **Recommendation:** Validate query string input

---

### DEP-013: PostCSS XSS (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Cross-Site Scripting (XSS)
- **Affected Package:** `postcss` (Frontend, transitive)
- **Vulnerable Range:** `<8.5.10`
- **CVE ID:** [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
- **CVSS Score:** 6.1 (Moderate)
- **CWE:** CWE-79 (Cross-site Scripting)
- **Description:** Unescaped `</style>` in CSS Stringify output. If user-provided CSS is processed, the output may contain unescaped style tags that break out of CSS context.
- **Impact:** 
  - XSS in generated CSS
  - Potential payload injection
- **Fix:**
  ```bash
  cd Source/Frontend && npm update postcss
  ```
- **Recommendation:** Update postcss; review any user-provided CSS processing

---

### DEP-014: Babel Core File Read (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Information Disclosure
- **Affected Package:** `@babel/core` (Frontend, transitive)
- **Vulnerable Range:** `<=7.29.0`
- **CVE ID:** [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8)
- **CVSS Score:** 3.2 (Low)
- **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
- **Description:** Arbitrary file read via sourceMappingURL comment. If source maps are processed, specially crafted source map URLs can read arbitrary files.
- **Impact:** 
  - Unauthorized file access
  - Source code/config disclosure
- **Fix:** Update @babel/core via vite/typescript update
- **Recommendation:** Update build tools

---

### DEP-015: Vitest Transitive Issues (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Multiple Transitive Vulnerabilities
- **Affected Package:** `vitest` (Frontend)
- **Current Version:** `2.0.5`
- **Issues:**
  - Depends on Vite with path traversal issues
  - Depends on esbuild with development server CSRF vulnerability
  - Depends on @vitest/mocker with transitive vite issues
- **Impact:** Test environment compromise
- **Fix:** Update to vitest@^3.2.6 (fixes primary RCE; verify transitive deps)
- **Recommended Action:** Update vitest and run full test suite

---

### DEP-016: ESBuild Development Server CSRF (Moderate)
- **Severity:** P3 (Moderate)
- **Category:** CVE / Cross-Site Request Forgery
- **Affected Package:** `esbuild` (Frontend, transitive)
- **Vulnerable Range:** `<=0.24.2`
- **CVE ID:** [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- **CVSS Score:** 5.3 (Moderate)
- **CWE:** CWE-346 (Origin Validation Error)
- **Description:** Development server allows any website to send requests and read responses. Attacker-controlled website can make cross-origin requests to dev server and exfiltrate data.
- **Impact:** 
  - Source code disclosure
  - Environment variable exposure
  - CSRF attacks during development
- **Fix:** Update esbuild (via vite update)
- **Recommendation:** Only use dev servers in isolated environments; update vite

---

## Outdated Major Versions (P3-P4)

### DEP-017: Express 2 Major Versions Behind
- **Severity:** P3 (Moderate)
- **Current:** `4.18.2`
- **Wanted:** `4.22.2`
- **Latest:** `5.2.1` (2 major versions ahead)
- **Recommendation:** 
  - Short-term: Update to Express 4.22.2 for security patches
  - Medium-term: Plan migration to Express 5.x
  - Review: Breaking changes in 5.x

---

### DEP-018: Pino 2 Major Versions Behind
- **Severity:** P3 (Moderate)
- **Current:** `8.17.0`
- **Wanted:** `8.21.0`
- **Latest:** `10.3.1` (2 major versions ahead)
- **Recommendation:** 
  - Update to Pino 10.x for latest features and security patches
  - Review breaking changes

---

### DEP-019: UUID 5 Major Versions Behind
- **Severity:** P3 (Moderate) → P2 (High) due to CVE
- **Current:** `9.0.0`
- **Wanted:** `9.0.1`
- **Latest:** `14.0.1` (5 major versions ahead)
- **Recommendation:** 
  - URGENT: Update to UUID 11.x+ to fix buffer overflow CVE
  - Review UUID API changes across major versions
  - Patch work item ID generation

---

### DEP-020: React 1 Major Version Behind
- **Severity:** P4 (Low)
- **Current:** `18.3.1`
- **Latest:** `19.2.7` (1 major version ahead)
- **Recommendation:** 
  - Monitor React 19; consider migration after stabilization
  - Currently on current major version (18.x)

---

### DEP-021: React Router 1 Major Version Behind
- **Severity:** P3 (Moderate) → P2 (High) due to CVE
- **Current:** `6.26.0`
- **Wanted:** `6.30.4`
- **Latest:** `7.18.1` (1 major version ahead)
- **Recommendation:** 
  - URGENT: Update to 6.30.4+ to fix open redirect CVE
  - Plan React Router 7.x migration (significant breaking changes)

---

## Dependency Tree Analysis

### Backend (`Source/Backend/`)
- **Direct Production Dependencies:** 4
  - `express@4.18.2` (HTTP framework)
  - `prom-client@15.1.0` (Prometheus metrics)
  - `uuid@9.0.0` (ID generation)
  - `pino@8.17.0` (Logging)
- **Direct Development Dependencies:** 9
  - TypeScript, Jest, Supertest, types
- **Total Transitive:** 411 packages
  - Production tree: 102 packages
  - Development tree: 310 packages
  - **Supply chain surface:** 411 potential compromise vectors

### Frontend (`Source/Frontend/`)
- **Direct Production Dependencies:** 3
  - `react@18.3.1` (UI library)
  - `react-dom@18.3.1` (DOM rendering)
  - `react-router-dom@6.26.0` (Routing)
- **Direct Development Dependencies:** 10
  - Vite, Vitest, TypeScript, testing libraries
- **Total Transitive:** 230 packages
  - Production tree: 9 packages (minimal!)
  - Development tree: 222 packages
  - **Supply chain surface:** 230 potential compromise vectors

### Combined Risk
- **Total dependencies across project:** 641 packages
- **Median package size:** Unknown (npm doesn't report)
- **Duplicate packages:** Likely significant between Backend (Jest+ts-jest) and Frontend (Vitest)

---

## Supply Chain Risk Assessment

### Postinstall Scripts
✅ **CLEAN** — No postinstall/preinstall scripts detected in direct dependencies.

### Deprecated Packages
⚠️ **REVIEW NEEDED** — Handlebars is vulnerable and likely deprecated in newer versions.

### Single-Maintainer Dependencies
🔍 **TODO** — npm doesn't provide maintainer count in audit output. Manual review recommended for:
- `uuid` (critical functionality)
- `pino` (logging)
- `prom-client` (observability)

### Recently Released Packages
✅ **ACCEPTABLE** — All direct dependencies are from established projects with active maintenance.

---

## Escalation & Cross-References

### Security Escalations → TheGuardians
1. **DEP-001: Vitest RCE** — Test environment compromise, code execution
2. **DEP-002: Handlebars Code Injection** — Template injection, arbitrary code execution
3. **DEP-003: Vite Path Traversal** — Source code disclosure, bypass of security controls
4. **DEP-004: UUID Buffer Overflow** — Memory corruption, potential RCE
5. **DEP-005: Form-Data CRLF Injection** — HTTP header injection, response splitting
6. **DEP-006: React Router Open Redirect** — Phishing vector, attacker-controlled redirects

### Code Quality Escalations → TheFixer
- DEP-017, DEP-018, DEP-019, DEP-020, DEP-021: Outdated versions (will create separate tickets)

---

## Remediation Roadmap

### Immediate (This Sprint) — P1 & P2 CVEs

**Priority 1: Fix Vitest RCE (DEP-001)**
```bash
cd Source/Frontend
npm install vitest@^3.2.6
npm test  # Verify tests still pass
npm run build  # Verify build still works
```

**Priority 2: Update UUID (DEP-004)**
```bash
cd Source/Backend
npm install uuid@^11.1.1
npm test  # Verify ID generation doesn't break
# Manually test: node -e "const {v4} = require('uuid'); console.log(v4())"
```

**Priority 3: Update React Router (DEP-006)**
```bash
cd Source/Frontend
npm install react-router-dom@^6.30.4
npm test  # Verify routing works
npm run build
```

**Priority 4: Update Vite (DEP-003)**
```bash
cd Source/Frontend
npm install vite@latest  # Or specific version
npm test
npm run dev  # Verify dev server security
```

**Priority 5: Update Handlebars Transitive Chain**
```bash
cd Source/Backend
npm ls handlebars  # Identify root cause
npm install {root-package}@latest  # Update to get newer handlebars
npm test
```

### Near-term (Next Sprint) — Remaining P3 CVEs
- Update form-data (DEP-005)
- Update js-yaml (DEP-007)
- Update ws (DEP-008)
- Update postcss (DEP-013)
- Update @babel/core (DEP-014)
- Update body-parser/express (DEP-010)
- Update qs/brace-expansion (DEP-009, DEP-011, DEP-012)

### Long-term — Major Version Upgrades
- Express 4.x → 5.x (breaking changes)
- Pino 8.x → 10.x (features, performance)
- React Router 6.x → 7.x (breaking changes)
- React 18.x → 19.x (after stabilization)

---

## Testing Checklist

After applying updates:

- [ ] Backend tests pass: `npm test` in Source/Backend/
- [ ] Frontend tests pass: `npm test` in Source/Frontend/
- [ ] E2E tests pass (if applicable)
- [ ] Dev server starts without errors: `npm run dev` in Source/Frontend/
- [ ] Build succeeds: `npm run build` in both directories
- [ ] Type checking passes: `npm run typecheck` in both directories
- [ ] Work item CRUD operations work (uuid fix verification)
- [ ] Routing works correctly (react-router fix verification)
- [ ] No new security warnings: `npm audit`

---

## JSON Summary

```json
{
  "audit_date": "2026-07-21",
  "project_name": "dev-crew Source App",
  "grade": "D",
  "findings": {
    "critical_p1": 2,
    "high_p2": 6,
    "moderate_p3": 10,
    "low_p4": 2,
    "total": 20
  },
  "dependencies": {
    "backend": {
      "direct_prod": 4,
      "direct_dev": 9,
      "total_transitive": 411,
      "prod_tree": 102,
      "dev_tree": 310
    },
    "frontend": {
      "direct_prod": 3,
      "direct_dev": 10,
      "total_transitive": 230,
      "prod_tree": 9,
      "dev_tree": 222
    },
    "project_total": 641
  },
  "cve_summary": {
    "backend_critical": 1,
    "backend_high": 3,
    "backend_moderate": 4,
    "backend_low": 1,
    "backend_total": 9,
    "frontend_critical": 1,
    "frontend_high": 3,
    "frontend_moderate": 6,
    "frontend_low": 1,
    "frontend_total": 11,
    "project_total": 20
  },
  "supply_chain": {
    "postinstall_scripts": "CLEAN",
    "deprecated_packages": "REVIEW_NEEDED",
    "high_risk_dependencies": [
      "uuid",
      "pino",
      "prom-client",
      "express",
      "react",
      "vite"
    ]
  },
  "remediation_status": "NOT_STARTED",
  "immediate_action_items": 5,
  "estimated_effort_hours": 8
}
```

---

## Learnings & Next Steps

### For Dependency Auditor (Self-Learning)
1. **npm audit limitations:** JSON output doesn't include:
   - Maintainer counts
   - Package download frequencies
   - Community activity metrics
   - Suggested fixes for transitive deps

2. **Tools available in this environment:**
   - `npm audit --json` ✅
   - `npm outdated --json` ✅
   - `npm ls` ✅
   - npm doesn't have built-in license-checker; consider installing globally

3. **Watch list for next audit:**
   - Handlebars (repeatedly vulnerable)
   - Vite (platform-specific CVEs on Windows)
   - Vitest (recent RCE)
   - UUID (version 11.x+ required)

### Recommendations for Team
1. **Implement automatic dependency updates:** Use Dependabot or Renovate
2. **Set policy:** Max 30 days to update P1/P2 CVEs
3. **Establish version strategy:** 
   - Security: Latest patch
   - Features: Within 1-2 major versions of latest
4. **Create SLA:**
   - P1: 24 hours
   - P2: 1 week
   - P3: 1 sprint
5. **Add to CI/CD:** Fail build if P1/P2 CVEs exist

---

**Report Generated:** 2026-07-21  
**Auditor:** Dependency Auditor (Haiku)  
**Next Review:** Recommended after P1/P2 fixes (within 48 hours)
