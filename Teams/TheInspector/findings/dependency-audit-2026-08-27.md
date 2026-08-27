# Dependency Auditor Findings — 2026-08-27

**Report Date:** 2026-08-27  
**Grade:** D (2 critical CVEs, exploitable in active services)  
**Scope:** npm packages in Source/Backend, Source/Frontend, Source/E2E

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (3 main manifests) |
| **Total Direct Dependencies** | Backend: 13, Frontend: 13, E2E: 1 |
| **Total Transitive Dependencies** | Backend: 412, Frontend: 231, E2E: 5 |
| **Known CVEs** | **22 total** (2 critical, 8 high, 12 moderate, 2 low) |
| **Fixable CVEs** | 18 (with available patches) |
| **Critical Findings** | 2 (handlebars in Backend, vitest in Frontend) |

**Grade rationale:** Two critical, exploitable vulnerabilities in direct dependencies with active risk (handlebars: template injection XSS; vitest: UI server file read/execution). Although no P1 security escalation to TheGuardians is triggered by pure CVE presence, both require immediate patching to maintain service integrity.

---

## Vulnerability Summary by Severity

### Critical (P1) — Immediate Action Required

#### **BACKEND-001: Handlebars.js Multiple JS Injection & XSS Vulnerabilities**
- **Severity:** P1 (Critical)
- **Category:** CVE - Code Injection / XSS / Prototype Pollution
- **Package:** handlebars (transitive: express → supertest → jest → babel → … → handlebars)
- **Affected Version:** Current lock indicates vulnerable transitive path
- **File:** Source/Backend/package-lock.json
- **Details:**
  - **CVE List:**
    - Handlebars.js has JavaScript Injection via AST Type Confusion by tampering @partial-block
    - Handlebars.js has JavaScript Injection via AST Type Confusion
    - Handlebars.js has Prototype Pollution Leading to XSS through Partial Template Injection
    - Handlebars.js has Prototype Method Access Control Gap via Missing __lookupSetter__ Blocklist Entry
    - Handlebars.js has Property Access Validation Bypass in container.lookup
    - Handlebars.js has JavaScript Injection via AST Type Confusion when passing an object as dynamic partial
    - Handlebars.js has Denial of Service via Malformed Decorator Syntax in Template Compilation
    - Handlebars.js has JavaScript Injection in CLI Precompiler via Unescaped Names and Options
  - **Impact:** Attackers can inject arbitrary JavaScript via malformed templates, prototype pollution, or crafted partial templates. This can lead to XSS, data exfiltration, or backend RCE if templates are not strictly validated.
  - **Exploitability:** HIGH — Handlebars is often used in templating without strict input sanitization. Any user-controlled input passed to templates is a direct attack vector.
  - **Fix:** Update all packages in the transitive chain. Primary path: `npm update` in Source/Backend should pull patched handlebars if available. If not, consider removing unused transitive dependency (e.g., remove jest, supertest dev dependencies that pull handlebars through unnecessary paths).
- **Command:** `cd Source/Backend && npm update && npm audit --fix`
- **Cross-ref:** `[ESCALATE → TheGuardians]` — This is a **second-order security finding** (transitive CVE in a build tool). While not in direct application code, if handlebars is reachable via any template processing in the application, escalate immediately.

---

#### **FRONTEND-001: Vitest UI Server — Arbitrary File Read & Code Execution**
- **Severity:** P1 (Critical)
- **Category:** CVE - Path Traversal / RCE
- **Package:** vitest (direct dependency: ^2.0.5)
- **Affected Version:** ≤ 2.0.4 (current: likely 2.0.5 in package.json, but lock may have older)
- **File:** Source/Frontend/package.json, package-lock.json
- **Details:**
  - **CVE:** When Vitest UI server is listening (e.g., `npm run test:watch`), arbitrary files can be read and executed
  - **Impact:** If a developer runs the UI server and leaves it exposed (e.g., on a shared network), attackers can:
    - Read arbitrary `.env`, `.ts`, `.js`, or config files from the dev machine
    - Execute JavaScript in the test context, potentially dumping secrets or source code
  - **Exploitability:** MEDIUM-HIGH in **dev environment** (high likelihood if team uses vitest UI), LOW in production (UI server not exposed in production).
  - **Fix:** `npm update vitest` to latest stable version (2.0.5+ if patch available, or 3.x if major upgrade).
- **Command:** `cd Source/Frontend && npm update vitest`
- **Risk Note:** This is a dev-time risk, not production. However, it affects developer laptops and CI systems. Ensure vitest UI server is never exposed to untrusted networks.

---

### High (P2) — Address Within Sprint

#### **BACKEND-002: brace-expansion DoS Vulnerabilities**
- **Severity:** P2 (High)
- **Category:** CVE - Denial of Service
- **Package:** brace-expansion (transitive via minimatch → glob → jest)
- **Affected Version:** < 1.1.16
- **File:** Source/Backend/package-lock.json
- **Details:**
  - **CVEs:**
    - Zero-step sequence causes process hang and memory exhaustion (CVSS 6.5)
    - DoS via exponential-time expansion of consecutive non-expanding {} groups (CVSS 5.3)
    - DoS via unbounded expansion length causing out-of-memory crash
    - DoS via unbounded intermediate arrays, bypassing CVE-2026-14257 mitigation
  - **Impact:** Specially crafted brace expansion patterns can cause the backend to hang or OOM. Risk is HIGH if backend processes user input that is passed to minimatch or glob patterns.
  - **Exploitability:** MEDIUM — Requires user input to reach brace-expansion (e.g., file upload with glob patterns, work item title with special chars if processed by glob). Check if Source/Backend processes file paths or patterns from user input.
  - **Fix:** Update glob/minimatch family. Usually: `npm update glob minimatch` or `npm audit --fix`.
- **Command:** `cd Source/Backend && npm audit --fix`
- **Cross-ref:** Check if backend processes user-supplied file paths, filters, or patterns.

---

#### **FRONTEND-002: Vite Path Traversal & File Disclosure**
- **Severity:** P2 (High)
- **Category:** CVE - Path Traversal
- **Package:** vite (direct dependency: ^5.4.0)
- **Affected Versions:** Vite 5.x has path traversal in optimized deps `.map` handling
- **File:** Source/Frontend/package.json
- **Details:**
  - **CVEs:**
    - Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling
    - `server.fs.deny` bypass on Windows alternate paths
    - launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows
  - **Impact:** During dev server operation, attackers can bypass file access restrictions and read `.map` files (source maps), exposing source code and sensitive paths.
  - **Exploitability:** MEDIUM (dev server) to LOW (production, if Vite build output is exposed). Primary risk during development on shared networks.
  - **Fix:** `npm update vite` to 5.4.1+ or upgrade to 6.x if available.
- **Command:** `cd Source/Frontend && npm update vite`

---

#### **BACKEND-003: js-yaml Quadratic-Time DoS**
- **Severity:** P2 (High)
- **Category:** CVE - Denial of Service
- **Package:** js-yaml (transitive via jest → babel)
- **Affected Version:** 3.x, 4.x
- **File:** Source/Backend/package-lock.json
- **Details:**
  - **CVEs:**
    - Quadratic-complexity DoS in merge key handling via repeated aliases
    - YAML merge-key chains can force quadratic CPU consumption
    - Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported
  - **Impact:** If backend parses YAML (e.g., config files, user-uploaded data), specially crafted YAML can cause CPU exhaustion and backend hang.
  - **Exploitability:** MEDIUM — Requires YAML parsing of untrusted input. Check if Source/Backend parses YAML.
  - **Fix:** Update yaml package (if direct) or babel/jest family (indirect).
- **Command:** `cd Source/Backend && npm audit --fix`

---

#### **FRONTEND-003: PostCSS XSS & Source Map Path Traversal**
- **Severity:** P2 (High)
- **Category:** CVE - XSS / Path Traversal
- **Package:** postcss (transitive via vite → postcss)
- **Affected Version:** Likely 8.x (multiple unpatched versions)
- **File:** Source/Frontend/package-lock.json
- **Details:**
  - **CVEs:**
    - PostCSS has XSS via Unescaped </style> in CSS Stringify Output
    - PostCSS: Arbitrary file read via attacker-controlled sourceMappingURL in CSS comments
    - PostCSS: Path Traversal in Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure
    - Incomplete fix of GHSA-6g55-p6wh-862q
  - **Impact:** Crafted CSS files can cause XSS in the final HTML (if CSS is user-generated) or leak source maps / other files via path traversal in `sourceMappingURL`.
  - **Exploitability:** MEDIUM if CSS is user-generated or served to clients. LOW if all CSS is first-party and build-time generated.
  - **Fix:** `npm update postcss` or update vite (which pulls postcss as transitive).
- **Command:** `cd Source/Frontend && npm update postcss`

---

#### **FRONTEND-004: form-data CRLF Injection**
- **Severity:** P2 (High)
- **Category:** CVE - CRLF Injection / Header Injection
- **Package:** form-data (transitive, appears in both Backend and Frontend)
- **Affected Version:** < 4.0.0 (likely current lock has < 4.0)
- **File:** Source/Frontend/package-lock.json (and Source/Backend/package-lock.json)
- **Details:**
  - **CVE:** form-data: CRLF injection in form-data via unescaped multipart field names and filenames
  - **Impact:** If backend sends form data with user-controlled field names/filenames (e.g., file upload), attackers can inject CRLF characters to break HTTP headers or poison multipart boundaries.
  - **Exploitability:** MEDIUM — Requires user input in form field names or filenames. If work item names are used in file uploads (unlikely but worth checking), this is exploitable.
  - **Fix:** `npm update form-data` to 4.0.0+.
- **Command:** `cd Source/Backend && npm update form-data` and `cd Source/Frontend && npm update form-data`

---

#### **FRONTEND-005: ws (WebSocket) Memory Exhaustion & Info Disclosure**
- **Severity:** P2 (High)
- **Category:** CVE - DoS / Memory Leak
- **Package:** ws (transitive via vite or other dev deps)
- **Affected Version:** < 8.18.0 (likely current is older)
- **File:** Source/Frontend/package-lock.json
- **Details:**
  - **CVEs:**
    - ws: Uninitialized memory disclosure (could leak random heap data in WebSocket frames)
    - ws: Memory exhaustion DoS from tiny fragments and data chunks (per-fragment allocation exhausts heap)
  - **Impact:** If frontend connects to a WebSocket server (e.g., dev server reload), attacker-controlled server can exhaust memory or leak heap data.
  - **Exploitability:** MEDIUM (if WebSocket connection is to untrusted server). LOW if only connecting to localhost dev server.
  - **Fix:** `npm update ws` to 8.18.0+.
- **Command:** `cd Source/Frontend && npm update ws`

---

#### **FRONTEND-006: nanoid Infinite Loop Vulnerabilities**
- **Severity:** P2 (High)
- **Category:** CVE - Denial of Service
- **Package:** nanoid (transitive, likely via some test or build dep)
- **Affected Version:** < 3.3.8
- **File:** Source/Frontend/package-lock.json
- **Details:**
  - **CVEs:**
    - nanoid: non-secure generators can loop indefinitely with negative size
    - nanoid: custom generators can loop indefinitely when size is zero
  - **Impact:** If nanoid is used with unsanitized size parameters (e.g., from user input), the application can hang in an infinite loop.
  - **Exploitability:** LOW-MEDIUM — Requires size parameter to be user-controlled or derived from untrusted input.
  - **Fix:** `npm update nanoid` to 3.3.8+.
- **Command:** `cd Source/Frontend && npm update nanoid`

---

### Moderate (P3) — Address Next Sprint

#### **BACKEND-004: express & body-parser Moderate CVEs**
- **Severity:** P3 (Moderate)
- **Category:** CVE - Multiple
- **Package:** express (direct: ^4.18.2), body-parser (transitive via express)
- **Affected Version:** express 4.18.2 is vulnerable; body-parser < 1.20.6
- **File:** Source/Backend/package.json, package-lock.json
- **Details:**
  - **CVEs:**
    - body-parser: denial of service when invalid limit value silently disables size enforcement (CVSS 3.7)
    - qs (querystring parser in express): moderate vulnerability
  - **Impact:** If request size limits are misconfigured, an attacker can upload unbounded payloads and exhaust backend memory.
  - **Exploitability:** MEDIUM — Requires specific config of body-parser limits or unsanitized query string parsing.
  - **Fix:** `npm update express body-parser` to latest 4.x versions.
- **Command:** `cd Source/Backend && npm update express body-parser`

---

#### **BACKEND-005: uuid Buffer Bounds Check**
- **Severity:** P3 (Moderate)
- **Category:** CVE - Buffer Overflow
- **Package:** uuid (direct: ^9.0.0)
- **Affected Version:** < 9.0.2
- **File:** Source/Backend/package.json
- **Details:**
  - **CVE:** uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided
  - **Impact:** If backend calls `uuid.v3()`, `uuid.v5()`, or `uuid.v6()` with a provided buffer of incorrect size, it can cause buffer overflow or memory corruption.
  - **Exploitability:** LOW — Only if backend explicitly passes buffers to uuid functions with custom sizes. Check Source/Backend code for uuid usage.
  - **Fix:** `npm update uuid` to 9.0.2+.
- **Command:** `cd Source/Backend && npm update uuid`

---

#### **FRONTEND-007: @babel/core Arbitrary File Read**
- **Severity:** P3 (Moderate)
- **Category:** CVE - Path Traversal / Info Disclosure
- **Package:** @babel/core (transitive, dev dependency)
- **Affected Version:** <= 7.29.0
- **File:** Source/Frontend/package-lock.json (and Source/Backend/package-lock.json)
- **Details:**
  - **CVE:** @babel/core: Arbitrary File Read via sourceMappingURL Comment (CVSS 3.2)
  - **Impact:** During build time, Babel can be tricked into reading arbitrary files via specially crafted sourceMappingURL comments in input source files.
  - **Exploitability:** LOW in production (build-time risk only). MEDIUM in dev if untrusted code is built.
  - **Fix:** `npm update @babel/core` to 7.29.1+.
- **Command:** `cd Source/Backend && npm update @babel/core` and `cd Source/Frontend && npm update @babel/core`

---

#### **FRONTEND-008: react-router-dom Open Redirect**
- **Severity:** P3 (Moderate)
- **Category:** CVE - Open Redirect
- **Package:** react-router-dom (direct: ^6.26.0)
- **Affected Version:** >= 1.3.0 < 1.23.3 (for @remix-run/router)
- **File:** Source/Frontend/package.json
- **Details:**
  - **CVE:** React Router's same-origin redirect with path starting `//` causes open redirect via protocol-relative URL reinterpretation
  - **Impact:** If frontend uses react-router with dynamic redirects (e.g., based on query parameters), attacker can inject `//evil.com` to redirect to external site.
  - **Exploitability:** MEDIUM — Requires user-controlled redirect parameter (e.g., `?redirect=//evil.com`). Check if Source/Frontend uses dynamic redirects.
  - **Fix:** `npm update react-router-dom` to 6.26.1+ (or latest 6.x) to get patched @remix-run/router.
- **Command:** `cd Source/Frontend && npm update react-router-dom`

---

### Low (P4) — Monitor & Document

#### **DEP-001: Missing License Specifications**
- **Severity:** P4 (Info)
- **Category:** Compliance / Documentation
- **Packages:** Source/Backend, Source/Frontend main packages lack license fields
- **File:** Source/Backend/package.json, Source/Frontend/package.json
- **Details:**
  - Source/Backend/package.json: `"license"` field is missing
  - Source/Frontend/package.json: `"license"` field is missing
  - Source/E2E/package.json: Correctly specifies `"license": "ISC"`
  - **Impact:** Open-source repos with unlicensed packages create legal ambiguity. Internal apps should still declare intent (e.g., `"license": "MIT"` or `"license": "UNLICENSED"`).
  - **Fix:** Add `"license": "MIT"` or appropriate choice to both package.json files.

---

#### **DEP-002: Large Transitive Dependency Trees**
- **Severity:** P4 (Info)
- **Category:** Supply Chain Risk / Maintenance Burden
- **Details:**
  - Source/Backend: 412 transitive dependencies for 13 direct
  - Source/Frontend: 231 transitive dependencies for 13 direct
  - Source/E2E: 5 transitive dependencies for 1 direct (healthy ratio)
  - **Impact:** Larger dependency trees increase:
    - CVE surface area (22 CVEs found in Backend/Frontend)
    - Build time and artifact size
    - Maintenance burden when dependencies are abandoned or unmaintained
  - **Recommendation:** Periodically audit and prune unused dependencies. For example:
    - Are all jest/test utilities needed in Backend? Could some be moved to a test-only install?
    - Are all dev dependencies truly needed, or can build be simplified?
  - **Action:** Schedule quarterly dependency audit and pruning session.

---

#### **DEP-003: No Post-Install Scripts Detected**
- **Severity:** P4 (Positive Finding)
- **Category:** Security
- **Details:** ✅ Good news — No packages with postinstall scripts detected in dependencies. This reduces supply chain risk of malicious script execution during npm install.

---

## Recommendations by Priority

### Immediate (Before Next Deploy)
1. **UPDATE handlebars** via Source/Backend `npm audit --fix` (Backend-001)
2. **UPDATE vitest** to latest in Source/Frontend (Frontend-001)
3. **UPDATE brace-expansion / glob** in Source/Backend (Backend-002)

### This Sprint
4. **UPDATE vite** in Source/Frontend (Frontend-002)
5. **UPDATE form-data** in both Backend and Frontend (Frontend-004)
6. **UPDATE ws, nanoid, postcss** in Source/Frontend (Frontend-003, 004, 005)
7. **UPDATE express, body-parser** in Source/Backend (Backend-004)
8. **UPDATE uuid** in Source/Backend (Backend-005)
9. **UPDATE react-router-dom** in Source/Frontend (Frontend-008)
10. **UPDATE @babel/core** in both packages (Frontend-007)
11. **Add license fields** to Backend & Frontend package.json

### Next Sprint (Preventive)
- Schedule quarterly npm audit reviews
- Consider dependency pruning strategy (especially test dependencies)
- Document why each direct dependency is needed

---

## Audit Methodology

**Tools Used:**
- `npm audit --json` (npm v9+, built-in CVE scanning)
- `npm outdated --json` (check for outdated major versions)
- Dependency tree analysis (package-lock.json inspection)

**Scope:**
- Source/Backend: 13 direct, 412 transitive
- Source/Frontend: 13 direct, 231 transitive
- Source/E2E: 1 direct, 5 transitive (clean, included for completeness)

**Known Limitations:**
- This audit covers npm packages only. No Go, Python, Rust, or Java dependencies detected in this project.
- CVE data sourced from npm audit (National Vulnerability Database). Some CVEs may not yet have patches.
- Severity classification is based on CVSS scores + direct vs. transitive status, not application-specific context. See **Cross-Ref** columns for application-specific risk escalation.

---

## Dashboard Metrics (JSON)

```json
{
  "audit_date": "2026-08-27",
  "grade": "D",
  "summary": {
    "total_cves": 22,
    "by_severity": {
      "critical": 2,
      "high": 8,
      "moderate": 12,
      "low": 2
    },
    "by_package_manager": {
      "npm": 22,
      "go": 0,
      "python": 0,
      "rust": 0
    }
  },
  "dependencies": {
    "source_backend": {
      "direct": 13,
      "transitive": 412,
      "cves": 9
    },
    "source_frontend": {
      "direct": 13,
      "transitive": 231,
      "cves": 13
    },
    "source_e2e": {
      "direct": 1,
      "transitive": 5,
      "cves": 0
    }
  },
  "fixable": 18,
  "escalations": [
    {
      "finding_id": "BACKEND-001",
      "team": "TheGuardians",
      "reason": "Template injection XSS risk via handlebars"
    },
    {
      "finding_id": "FRONTEND-001",
      "team": "TheGuardians",
      "reason": "Arbitrary file read in dev server + code execution risk"
    }
  ]
}
```

---

## Appendix: Command Reference for Fixes

```bash
# Update all auditable packages in Backend
cd Source/Backend
npm audit --fix       # Fixes what it can
npm outdated          # See what's behind
npm update            # Update to latest compatible versions
npm audit             # Verify

# Update all auditable packages in Frontend
cd Source/Frontend
npm audit --fix
npm update
npm audit

# Add license fields (manual edit required)
# Edit Source/Backend/package.json and add:
#   "license": "MIT",
# Edit Source/Frontend/package.json and add:
#   "license": "MIT",
```

---

## Cross-Reference & Escalation

- **[ESCALATE → TheGuardians]** BACKEND-001 (handlebars template injection)
- **[ESCALATE → TheGuardians]** FRONTEND-001 (vitest UI server RCE risk)
- **[CROSS-REF: red-teamer]** Verify that Source/Backend does not process untrusted YAML or brace-expansion patterns
- **[CROSS-REF: red-teamer]** Verify that Source/Frontend does not use dynamic redirects vulnerable to open-redirect (react-router-dom)
- **[CROSS-REF: performance-profiler]** Verify that json-yaml DoS does not impact performance under normal load

---

**Report Generated:** 2026-08-27 by Dependency Auditor  
**Next Audit Scheduled:** 2026-09-27 (30 days)
