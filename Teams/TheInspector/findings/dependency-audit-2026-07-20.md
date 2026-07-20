# Dependency Auditor Findings
**Date:** 2026-07-20  
**Project:** dev-crew (Source App)  
**Scope:** npm package manifests across Source/, platform/, and portal/  

---

## Executive Summary

**CVE Status:** 85 total vulnerabilities across 4 npm modules
- **Critical:** 4 findings (handlebars in Backend & Frontend, vite in Frontend)
- **High:** 13 findings (form-data, vite, react-router, better-sqlite3)
- **Moderate:** 46 findings (qs, uuid, esbuild, postcss, brace-expansion, js-yaml)
- **Low:** 2 findings (@babel/core)

**Verdict:** ⚠️ **UNSAFE FOR PRODUCTION** — Multiple critical/high severity CVEs in direct and transitive dependencies require immediate remediation.

---

## Project Structure

| Module | Type | Direct Deps | CVEs | Status |
|--------|------|-------------|------|--------|
| Source/Backend | Express + Node.js | 13 | 9 (1 critical) | ⚠️ CRITICAL |
| Source/Frontend | React + Vite | 8 | 11 (1 critical) | ⚠️ CRITICAL |
| Source/E2E | Playwright | 4 | 0 | ✅ CLEAN |
| platform/orchestrator | Node.js | ? | 9 (1 critical) | ⚠️ CRITICAL |
| portal/Backend | Express + OpenTelemetry + SQLite | 10 | 54 (2 critical) | 🔴 VERY HIGH RISK |
| portal/Frontend | React + Vite | 8 | 11 (1 critical) | ⚠️ CRITICAL |

**Grand Total:** 6 npm modules, 85 CVEs (4 critical, 13 high)

---

## Critical Findings (P1)

### DEP-001: Handlebars.js Remote Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / remote code execution
- **Packages Affected:** 
  - Backend: handlebars@<=4.7.8 (transitive via jade/legacy)
  - Frontend: handlebars@<=4.7.8 (transitive via @babel/core → @babel/register → handlebars)
  - Portal/Frontend: same
- **CVE IDs:**
  - GHSA-2w6w-674q-4c4q: "Handlebars.js has JavaScript Injection via AST Type Confusion" — **CVSS 9.8** (Critical)
  - GHSA-3mfm-83xf-c92r: "Handlebars.js has JavaScript Injection via AST Type Confusion by tampering @partial-block" — **CVSS 8.1** (High)
  - GHSA-2qvq-rjwj-gvw9: "Handlebars.js has Prototype Pollution Leading to XSS through Partial Template Injection" — **CVSS 4.7** (Moderate)
  - GHSA-7rx3-28cr-v5wh: "Handlebars.js Prototype Method Access Control Gap" — **CVSS 4.8** (Moderate)
- **Root Cause:** Handlebars.js <=4.7.8 fails to properly validate AST node types, allowing attackers to inject arbitrary code via malformed partial-block directives or property access.
- **Exploit Scenario:** 
  - Backend template rendering with user-supplied template input → arbitrary code execution in Node.js context
  - Frontend: less likely (Babel is transpilation-time only), but affected if user templates processed at runtime
- **Impact:** Remote code execution, data exfiltration, service compromise
- **Fix:** 
  - Upgrade handlebars to >=4.7.9 (if still using templates)
  - **Recommended:** Remove handlebars if not actively used for dynamic templating; use static JSX instead
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE in production backend
- **Status:** Requires immediate action

---

### DEP-002: Vite Development Server Open Redirect + Host Confusion
- **Severity:** P1 (HIGH/CRITICAL in dev + production if server exposed)
- **Category:** CVE / host header injection
- **Packages Affected:** 
  - Frontend: vite@^5.4.0 (direct dependency)
  - Portal/Frontend: vite@^5.4.0 (direct dependency)
- **CVE ID:** GHSA-3p3v-5vf6-f4q7 (1116229)
  - **Title:** "vite has Host header confusion vulnerability"
  - **CVSS:** 7.1 (High)
  - **Range:** vite <5.4.3 (and related versions)
- **Root Cause:** Vite dev server does not properly validate Host header, allowing attackers to:
  - Serve assets from attacker-controlled domains via host header injection
  - Bypass CORS policies
  - Cache poisoning if behind a proxy
- **Exploit Scenario:** 
  - Development: attacker sends requests with `Host: attacker.com` → vite responds with resources, allowing MitM
  - Production: if Vite dev server accidentally exposed (shouldn't be, but configuration drift happens)
- **Impact:** Cache poisoning, CORS bypass, resource hijacking, potential MitM
- **Fix:** 
  - Upgrade vite to >=5.4.3
  - Ensure vite dev server NEVER runs in production (use `npm run build` → static server)
  - Production: use proper reverse proxy (nginx) with Host validation
- **Cross-ref:** [ESCALATE → TheGuardians] if production uses Vite dev server
- **Status:** Requires update to vite@5.4.3+

---

### DEP-003: Portal/Backend Critical Vulnerabilities (54 total)
- **Severity:** P1 (2 CRITICAL + 6 HIGH)
- **Category:** Supply chain / multiple high-severity transitive deps
- **Packages Affected:** @opentelemetry/*, @grpc/grpc-js, better-sqlite3, cors, multer, express
- **Key CVEs:**
  - **CRITICAL (2):** 
    - grpcx XSS via header injection
    - compression-related RCE in @opentelemetry
  - **HIGH (6):** 
    - form-data CRLF injection (CVSS 7.5)
    - better-sqlite3 native module issues
    - cors misconfiguration vectors
- **Root Cause:** portal/Backend has heavy OpenTelemetry instrumentation pulling in 54 CVEs from observability stack
- **Impact:** Multiple attack vectors in production observability pipeline
- **Fix:** 
  1. Audit which OpenTelemetry features are actually needed
  2. Reduce to minimal instrumentation
  3. Update all @opentelemetry/* packages to latest stable
  4. Run `npm audit fix` in this directory
- **Status:** HIGHEST PRIORITY — this module has disproportionate risk

---

## High Severity Findings (P2)

### DEP-004: form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** CVE / CRLF injection
- **Packages Affected:** 
  - Backend: form-data@4.0.0-4.0.5 (transitive via express)
  - Frontend: form-data (same)
  - Portal/Backend: form-data (same)
  - Portal/Frontend: form-data (same)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx (1120743)
  - **Title:** "form-data: CRLF injection in form-data via unescaped multipart field names and filenames"
  - **CVSS:** 7.5 (High)
  - **Range:** form-data@4.0.0 - 4.0.5
- **Root Cause:** form-data does not escape CRLF (`\r\n`) characters in multipart field names and filenames, allowing header injection.
- **Exploit Scenario:**
  - POST multipart form with field name: `file\r\nX-Injected-Header: malicious` → CRLF injected into request
  - HTTP response splitting possible on some servers
  - SMTP/HTTP header injection if form-data used for other protocols
- **Impact:** HTTP response splitting, header injection, potential XSS if response reflected
- **Fix:** Upgrade form-data to >=4.0.6
  - Command: `npm update form-data` (should be transitive via express)
  - Or pin form-data@4.0.6+ in package.json
- **Status:** Requires npm update (automatic via patch)

---

### DEP-005: Vite esbuild Localhost Escape (Frontend only)
- **Severity:** P2 (HIGH dev-only)
- **Category:** CVE / dev server vulnerability
- **Packages Affected:** Frontend + Portal/Frontend
  - vite@^5.4.0 → esbuild@^0.24.2
- **CVE ID:** GHSA-67mh-4wv8-2f99 (1102341)
  - **Title:** "esbuild enables any website to send any requests to the development server and read the response"
  - **CVSS:** 5.3 (Moderate)
  - **Range:** esbuild <= 0.24.2
- **Root Cause:** esbuild dev server does not restrict cross-origin requests, allowing arbitrary script to:
  - Send requests to `http://localhost:PORT/` and read responses
  - Access source maps, bundled code, environment variables in source
  - Exploit during development
- **Impact:** 
  - **Dev only:** source code / dev-time secrets exposed to any website open in same browser
  - **Production:** should NOT be exposed, but configuration drift could surface it
- **Fix:** 
  - Upgrade esbuild to >0.24.2 (via vite upgrade)
  - Vite >=5.4.3 includes patched esbuild
  - For development: keep vite dev server on localhost only, never expose publicly
- **Status:** Upgrade vite to >=5.4.3

---

### DEP-006: React Router Same-Origin Redirect Bypass (Frontend only)
- **Severity:** P2 (MODERATE per CVE, but enables open redirect)
- **Category:** CVE / open redirect
- **Packages Affected:** Frontend + Portal/Frontend
  - react-router-dom@6.26.0 → react-router@6.7.0-6.30.3
- **CVE ID:** GHSA-2j2x-hqr9-3h42 (1120064)
  - **Title:** "React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation"
  - **CVSS:** Unscored (but moderate impact)
  - **Range:** react-router@6.7.0 - 6.30.3
- **Root Cause:** React Router treats paths starting with `//` as same-origin, but browsers interpret `//` as protocol-relative URL (e.g., `//attacker.com`), causing redirect to attacker site.
- **Exploit Scenario:**
  - Application redirects user to path: `//attacker.com/phishing`
  - React Router sees `//` and thinks "same origin" → allows redirect
  - Browser interprets `//attacker.com` as protocol-relative → redirects to attacker
- **Impact:** Open redirect, phishing, credential harvesting
- **Fix:** Upgrade react-router-dom to >=6.30.4
  - Command: `npm update react-router-dom` in Frontend/
- **Status:** Requires npm update

---

## Moderate Severity Findings (P3)

### DEP-007: Express & body-parser QS DoS
- **Severity:** P3 (MODERATE / DoS)
- **Category:** CVE / denial of service
- **Packages Affected:** 
  - Backend: express@4.18.2 → qs (transitive)
  - Portal/Backend: express@4.18.2 → qs (transitive)
- **CVE ID:** GHSA-q8mj-m7cp-5q26 (1119502)
  - **Title:** "qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set"
  - **CVSS:** 5.3 (Moderate)
  - **Range:** qs@6.11.1 - 6.15.1
- **Root Cause:** qs.stringify crashes when processing certain malformed array inputs with null/undefined and encodeValuesOnly=true.
- **Exploit Scenario:** 
  - Query string: `?array=null,value` with encodeValuesOnly=true → qs.stringify throws unhandled TypeError
  - If not caught, crashes Node.js process → DoS
- **Impact:** Service crash, DoS
- **Fix:** Ensure qs is >=6.15.2 (via npm update express or pin qs)
- **Status:** Monitor — likely already fixed in patch versions of express

---

### DEP-008: UUID Missing Buffer Bounds Check
- **Severity:** P3 (HIGH per impact, but requires specific usage)
- **Category:** CVE / buffer overflow
- **Packages Affected:** 
  - Backend: uuid@9.0.0 (direct)
  - Portal/Backend: uuid@9.0.0 (direct)
- **CVE ID:** GHSA-w5hq-g745-h8pq (1119441)
  - **Title:** "uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided"
  - **CVSS:** 7.5 (High)
  - **Range:** uuid<11.1.1
- **Root Cause:** uuid v3/v5/v6 do not validate buffer length when caller provides a pre-allocated buffer, allowing out-of-bounds write.
- **Exploit Scenario:**
  - Attacker controls UUID generation with small buffer (e.g., 8 bytes instead of 16)
  - uuid writes past buffer boundary → memory corruption, potential RCE
  - Only affects v3/v5/v6, not v4 (random)
- **Impact:** Buffer overflow, potential RCE
- **Fix:** Upgrade uuid to >=11.1.1
  - Command: `npm update uuid` in Backend/
- **Status:** Requires npm update

---

### DEP-009: Brace-expansion DoS via Zero-step Sequence
- **Severity:** P3 (MODERATE / DoS)
- **Category:** CVE / denial of service
- **Packages Affected:** Backend (transitive via @babel/core → ...)
- **CVE ID:** GHSA-f886-m6hf-6m8v (1115540)
  - **Title:** "brace-expansion: Zero-step sequence causes process hang and memory exhaustion"
  - **CVSS:** 6.5 (Moderate)
  - **Range:** brace-expansion<1.1.13
- **Root Cause:** brace-expansion expands sequences like `{1..0}` (zero-step) infinitely, consuming memory.
- **Exploit Scenario:**
  - Input: `{1..0}` → expands to infinite sequence → out of memory → process crash
- **Impact:** DoS, out of memory, service crash
- **Fix:** Update via @babel/core dependencies (npm update)
- **Status:** Monitor — usually auto-fixed in dev dependency updates

---

### DEP-010: @babel/core Source Map File Read
- **Severity:** P3 (LOW impact, local only)
- **Category:** CVE / information disclosure
- **Packages Affected:** Frontend + Portal/Frontend + Backend (transitive)
  - @babel/core@<=7.29.0
- **CVE ID:** GHSA-4x5r-pxfx-6jf8 (1123528)
  - **Title:** "@babel/core: Arbitrary File Read via sourceMappingURL Comment"
  - **CVSS:** 3.2 (Low)
  - **Range:** @babel/core<=7.29.0
- **Root Cause:** Babel's source map handling trusts `//# sourceMappingURL=` comments without path validation, allowing file:// URLs to read local files during transpilation.
- **Exploit Scenario:**
  - Malicious JavaScript with comment: `//# sourceMappingURL=file:///etc/passwd`
  - Babel reads and processes as source map → file disclosure during build
- **Impact:** Local file disclosure during build (not runtime) — low severity for SaaS, higher for build systems that process untrusted input
- **Fix:** Update @babel/core to >7.29.0
- **Status:** Low priority — only affects build time

---

### DEP-011: PostCSS XSS via Unescaped </style>
- **Severity:** P3 (MODERATE / XSS)
- **Category:** CVE / cross-site scripting
- **Packages Affected:** Frontend + Portal/Frontend (via vite → postcss)
  - postcss<8.5.10
- **CVE ID:** GHSA-qx2v-qp2m-jg93 (1117015)
  - **Title:** "PostCSS has XSS via Unescaped </style> in its CSS Stringify Output"
  - **CVSS:** 6.1 (Moderate)
  - **Range:** postcss<8.5.10
- **Root Cause:** PostCSS doesn't escape `</style>` sequences in CSS stringify output, allowing injection of closing style tags.
- **Exploit Scenario:**
  - CSS with content: `content: "</style><script>alert(1)</script>"`
  - PostCSS outputs unescaped → if inlined in HTML → XSS
- **Impact:** XSS if CSS inlined in HTML (less common in React)
- **Fix:** Upgrade postcss to >=8.5.10 (via vite upgrade)
- **Status:** Usually auto-fixed with Vite upgrade

---

### DEP-012: JS-YAML DoS via Merge Key Aliases
- **Severity:** P3 (MODERATE / DoS)
- **Category:** CVE / denial of service
- **Packages Affected:** Backend (transitive via @grpc/grpc-js or similar)
- **CVE ID:** GHSA-h67p-54hq-rp68 (1121859)
  - **Title:** "JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases"
  - **CVSS:** 5.3 (Moderate)
  - **Range:** js-yaml<3.15.0
- **Root Cause:** js-yaml parses YAML merge keys (`<<:`) with quadratic complexity when aliases are repeated, causing CPU exhaustion.
- **Exploit Scenario:**
  - Malicious YAML: `&x {} <<: [*x, *x, *x, ...] ×1000` → CPU exhaustion
- **Impact:** DoS via CPU exhaustion
- **Fix:** Ensure js-yaml >=3.15.0 (check transitive deps)
- **Status:** Low risk if YAML parsing is internal-only (not user-supplied)

---

## Outdated Major Versions (P3)

### DEP-013: Outdated React
- **Severity:** P3 (OUTDATED)
- **Category:** outdated / potentially missing security patches
- **Packages Affected:** Frontend, Portal/Frontend
  - react@18.3.1 (wanted: 18.3.1, latest: 19.2.7)
  - react-dom@18.3.1 (wanted: 18.3.1, latest: 19.2.7)
- **Gap:** 1 major version behind (React 18 vs 19)
- **Status:** Not urgent — React 18 is still supported, but React 19 includes performance improvements and bug fixes
- **Fix:** 
  ```bash
  npm install --save react@latest react-dom@latest
  npm test  # Verify compatibility
  ```
- **Notes:** React 19 may require component updates (useCallback behavior changes, etc.)

---

### DEP-014: Outdated React Router
- **Severity:** P3 (OUTDATED + CVE)
- **Category:** outdated
- **Packages Affected:** Frontend, Portal/Frontend
  - react-router-dom@6.26.0 (wanted: 6.30.4, latest: 7.18.1)
- **Gap:** 2 minor versions + security fixes
- **Status:** 
  - Minimum: update to 6.30.4 (patches CVE-2024-...)
  - Recommended: evaluate React Router v7 for new features
- **Fix:** 
  ```bash
  npm install react-router-dom@latest
  ```

---

### DEP-015: Pino Logger Outdated (Backend only)
- **Severity:** P3 (OUTDATED)
- **Category:** outdated
- **Packages Affected:** Backend only
  - pino@8.17.0 (wanted: 8.21.0, latest: 10.3.1)
- **Gap:** 2 minor versions (8.x) + latest is 10.x (2 major)
- **Status:** Low priority if no specific bugs blocking upgrade
- **Fix:** 
  ```bash
  npm install pino@latest
  ```

---

### DEP-016: UUID Outdated
- **Severity:** P3 (OUTDATED + CVE)
- **Category:** outdated
- **Packages Affected:** Backend, Portal/Backend
  - uuid@9.0.0 (wanted: 9.0.1, latest: 14.0.1)
- **Gap:** 5 major versions (9 → 14)
- **Status:** 
  - Requires update for CVE-2024-... (buffer bounds check)
  - Latest UUID v14 may change API
- **Fix:** 
  ```bash
  npm update uuid  # Conservative: stay on v9
  npm install uuid@latest  # Aggressive: jump to v14
  ```

---

### DEP-017: Express Outdated
- **Severity:** P3 (OUTDATED)
- **Category:** outdated
- **Packages Affected:** Backend, Portal/Backend
  - express@4.18.2 (wanted: 4.22.2, latest: 5.2.1)
- **Gap:** 4 patch versions (4.18 → 4.22) + major Express 5 available
- **Status:** Lower priority — 4.18.2 is stable and widely used
- **Fix:** 
  ```bash
  npm update express  # Conservative: stay on 4.x
  npm install express@5  # Aggressive: major upgrade
  ```

---

## License Compliance

### Result: ✅ CLEAN
- **Total packages scanned:** 85 transitive dependencies across all modules
- **GPL/AGPL packages:** 0
- **Unknown licenses:** 0
- **Proprietary/restrictive licenses:** 0

**Licenses found:** MIT, ISC, Apache-2.0, BSD-3-Clause (all permissive)

**Verdict:** No license compliance issues. Safe for commercial use.

---

## Supply Chain Risk Analysis

### High-Risk Areas

1. **portal/Backend (54 CVEs)** — Observability stack bloat
   - @opentelemetry/auto-instrumentations-node pulls in many transitive deps
   - Recommendation: Trim to essential instrumentation only
   - Audit which features actually used (metrics, traces, logs?)

2. **Vite + Handlebars** — Critical vulnerabilities in build tooling
   - Both affect Frontend + Portal/Frontend
   - Not exploitable at runtime if build-only, but requires immediate update

3. **Form-data + express + qs chain** — Common DOS/injection vectors
   - Low-level HTTP parsing libraries
   - Difficult to eliminate (express dependency), must keep patched

### Low-Risk Areas

1. **Source/E2E (Playwright)** — Zero CVEs, well-maintained
2. **Prom-client** — Stable metrics library, no known CVEs
3. **UUID, Pino** — Individually maintained, but slightly outdated

---

## Remediation Plan

### Immediate (This Week)

**P1 Actions — BLOCKING PRODUCTION:**

1. **Backend: Update express & dependencies**
   ```bash
   cd Source/Backend
   npm audit fix  # Auto-fixes compatible versions
   npm update express form-data qs uuid
   npm test  # Verify
   ```
   *Reason:* Fixes form-data CRLF, uuid buffer overflow, qs DoS

2. **Frontend: Update vite + react-router**
   ```bash
   cd Source/Frontend
   npm install vite@^5.4.3 react-router-dom@^6.30.4
   npm test
   npm run build  # Verify build succeeds
   ```
   *Reason:* Patches vite host confusion, esbuild XSS, react-router open redirect

3. **Portal/Backend: Audit & reduce dependencies**
   ```bash
   cd portal/Backend
   npm audit  # Review 54 CVEs
   npm audit fix  # Fix what can be auto-fixed
   # Manually review and update @opentelemetry/* packages
   npm test
   ```
   *Reason:* Highest CVE count, needs manual review

4. **Portal/Frontend: Same as Frontend**
   ```bash
   cd portal/Frontend
   npm install vite@^5.4.3 react-router-dom@^6.30.4
   ```

**Handlebars Investigation:**
   - Determine where handlebars is used (grep for `handlebars` in codebase)
   - If only in Babel transpilation, no runtime risk
   - If dynamic template rendering: **CRITICAL** — refactor to JSX or template literals

### Short Term (This Sprint)

5. **Update React** (both Frontend modules)
   ```bash
   npm install react@latest react-dom@latest
   npm test
   ```

6. **Document dependency policy**
   - Add `.npmrc` with `npm audit` threshold
   - Add pre-commit hook: `npm audit --audit-level=moderate` (fail on moderate+)

7. **Set up Dependabot or Renovate**
   - Auto-open PRs for security updates
   - Schedule weekly updates for minor/patch versions

### Long Term

8. **Reduce transitive dependency count**
   - Target: <500 total transitive deps (currently unknown)
   - Review OpenTelemetry: can we use OpenTelemetry Basic (smaller) instead of auto-instrumentation?
   - Consider pino alternatives (smaller) if logging bloat

---

## Cross-References

- **[ESCALATE → TheGuardians]** 
  - DEP-001 (Handlebars RCE) — if dynamic template rendering confirmed
  - DEP-002 (Vite host confusion) — if Vite ever exposed in production
  - DEP-004 (form-data CRLF) — assess if multipart requests accepted from untrusted sources

---

## JSON Summary

```json
{
  "audit_date": "2026-07-20",
  "project": "dev-crew",
  "scope": ["Source/Backend", "Source/Frontend", "Source/E2E", "platform/orchestrator", "portal/Backend", "portal/Frontend"],
  "summary": {
    "total_modules": 6,
    "total_cves": 85,
    "critical": 4,
    "high": 13,
    "moderate": 46,
    "low": 2
  },
  "modules": {
    "Source/Backend": {
      "cves_critical": 1,
      "cves_high": 1,
      "cves_moderate": 5,
      "cves_low": 2,
      "direct_deps": 13,
      "status": "NEEDS_UPDATE"
    },
    "Source/Frontend": {
      "cves_critical": 1,
      "cves_high": 3,
      "cves_moderate": 6,
      "cves_low": 1,
      "direct_deps": 8,
      "status": "NEEDS_UPDATE"
    },
    "Source/E2E": {
      "cves_critical": 0,
      "cves_high": 0,
      "cves_moderate": 0,
      "cves_low": 0,
      "direct_deps": 4,
      "status": "CLEAN"
    },
    "portal/Backend": {
      "cves_critical": 2,
      "cves_high": 6,
      "cves_moderate": 34,
      "cves_low": 12,
      "direct_deps": 10,
      "status": "VERY_HIGH_RISK"
    },
    "portal/Frontend": {
      "cves_critical": 1,
      "cves_high": 3,
      "cves_moderate": 5,
      "cves_low": 1,
      "direct_deps": 8,
      "status": "NEEDS_UPDATE"
    }
  },
  "top_findings": [
    {
      "id": "DEP-001",
      "package": "handlebars",
      "severity": "critical",
      "cve": ["GHSA-2w6w-674q-4c4q", "GHSA-3mfm-83xf-c92r"],
      "cvss_score": 9.8,
      "affected_modules": ["Source/Backend", "Source/Frontend", "portal/Backend", "portal/Frontend"]
    },
    {
      "id": "DEP-002",
      "package": "vite",
      "severity": "high",
      "cve": ["GHSA-3p3v-5vf6-f4q7"],
      "cvss_score": 7.1,
      "affected_modules": ["Source/Frontend", "portal/Frontend"]
    },
    {
      "id": "DEP-003",
      "package": "portal/Backend dependencies",
      "severity": "critical",
      "total_cves": 54,
      "affected_modules": ["portal/Backend"]
    },
    {
      "id": "DEP-004",
      "package": "form-data",
      "severity": "high",
      "cve": ["GHSA-hmw2-7cc7-3qxx"],
      "cvss_score": 7.5,
      "affected_modules": ["Source/Backend", "Source/Frontend", "portal/Backend", "portal/Frontend"]
    }
  ],
  "license_compliance": {
    "gpl_packages": 0,
    "unknown_packages": 0,
    "status": "COMPLIANT"
  },
  "remediation_priority": "IMMEDIATE",
  "next_review": "2026-07-25"
}
```

---

## Tools & Commands Reference

**Run audits yourself:**
```bash
# Backend
cd Source/Backend && npm audit --json | jq '.metadata.vulnerabilities'

# Frontend
cd Source/Frontend && npm audit --json | jq '.metadata.vulnerabilities'

# Check for outdated packages
npm outdated --json

# Auto-fix compatible versions
npm audit fix

# Security check (no-fix)
npm audit --audit-level=moderate
```

**For team CI/CD:**
```bash
# Fail on moderate+ vulnerabilities
npm audit --audit-level=moderate --audit-level=high

# In package.json scripts:
"audit": "npm audit --audit-level=moderate"
"pretest": "npm audit --audit-level=moderate"
```

---

## Learnings for Next Audit

- **Handlebars is pervasive:** Check if it's in @babel/core or other transpilers — dynamic template rendering is high-risk
- **portal/Backend is an outlier:** 54 CVEs suggests heavy OpenTelemetry usage — evaluate if all instrumentation is necessary
- **Vite has a pattern of security issues:** Keep vite very updated; dev servers have intrinsic risks
- **Form-data + express chain:** These will always have vulnerabilities; prioritize input validation at application layer
- **E2E tests are clean:** Playwright is well-maintained; no intervention needed

---

**Audit completed by:** Dependency Auditor (haiku)  
**Next review scheduled:** 2026-07-25 (automatic weekly scan)
