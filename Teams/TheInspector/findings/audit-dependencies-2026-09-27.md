# Dependency Auditor Findings
**Date:** 2026-09-27 | **Grade:** D | **Run:** Comprehensive CVE & License Audit

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Projects Audited** | 3 (Backend, Frontend, E2E) | ✓ |
| **Package Managers** | npm (3 workspaces) | npm |
| **Total Direct Dependencies** | 7 | ⚠️ Frontend underspecified |
| **Total Transitive Dependencies** | 27 | Moderate surface |
| **Known CVEs** | 25 | 🔴 Critical |
| **Outdated Major Versions** | 8 packages | ⚠️ |
| **License Issues** | 0 detected | ✓ |
| **Supply Chain Risks** | Low | ✓ |

---

## Critical Vulnerabilities (P1)

### DEP-001: Handlebars JavaScript Injection
- **Severity:** P1 (Critical)
- **Category:** CVE / CWE-94 (Code Injection)
- **Package:** `handlebars` (transitive via unknown)
- **Affected Versions:** <=4.7.8
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-3mfm-83xf-c92r
- **Detail:** 
  - **Title:** Handlebars.js has JavaScript Injection via AST Type Confusion by tampering @partial-block
  - **Impact:** Arbitrary JavaScript execution if attacker can control template partials
  - **CVSS:** Unknown, classified as Critical by npm advisory
- **Fix:** `npm audit fix` or update handlebars to >4.7.8
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection risk in template processing (if backend uses Handlebars for any user-controlled templates)
- **Verification:** Check if backend uses Handlebars for template rendering. If yes, templates are vulnerable to injection.

---

## High-Severity CVEs (P2)

### DEP-002: brace-expansion DoS
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `brace-expansion` (transitive)
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-fwmj-hxvj-5930
- **Detail:** 
  - **Title:** brace-expansion: Zero-step sequence causes process hang and memory exhaustion
  - **Impact:** Attacker can craft input to cause infinite loop and OOM
  - **Severity:** High
- **Fix:** `npm audit fix` — updates brace-expansion to patched version
- **Note:** Transitive dependency; check which package imports it

### DEP-003: Browserslist Memory Exhaustion
- **Severity:** P2 (High)
- **Category:** CVE / Memory DoS
- **Packages:** `browserslist` (appears in both Backend and Frontend)
- **Affected Versions:** Multiple CVEs with versions <4.24.2
- **Files:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **CVEs:** 
  - GHSA-c83g-rgw3-j3cx — Unbounded memory growth via distinct query results
  - GHSA-73wf-gq98-2v4g — Uncaught crash via untrusted browserslist-stats.json
- **Detail:**
  - **Impact:** Cache never evicts → eventual OOM on long-running processes
  - **Risk:** Production backend/frontend can be crashed by repeated queries
- **Fix:** `npm audit fix` — upgrade browserslist to >=4.24.2
- **Cross-ref:** Backend processes work items in-memory; sustained DoS could cause data loss if restart is unclean

### DEP-004: form-data CRLF Injection
- **Severity:** P2 (High)
- **Category:** CVE / Header Injection / CWE-93
- **Packages:** `form-data` (transitive, appears in both Backend and Frontend)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Detail:**
  - **Title:** form-data: CRLF injection in form-data via unescaped multipart field names and filenames
  - **Impact:** Attacker can inject CRLF to forge HTTP headers in multipart requests
  - **Exploitation:** If backend accepts file uploads, attacker could inject arbitrary headers
- **Fix:** `npm audit fix` — upgrade form-data to patched version
- **Cross-ref:** [ESCALATE → TheGuardians] — If backend has file upload endpoints, this is exploitable

### DEP-005: js-yaml DoS
- **Severity:** P2 (High)
- **Category:** CVE / ReDoS / Denial of Service
- **Package:** `js-yaml` (transitive)
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-6bw5-2rq6-7hcj
- **Detail:**
  - **Title:** JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases
  - **Impact:** YAML parsing with repeated aliases causes exponential complexity
  - **Risk:** If backend parses YAML (config files, API payloads), attacker can cause parsing to hang
- **Fix:** `npm audit fix`
- **Note:** Check if backend parses YAML from untrusted sources

### DEP-006: nanoid Initialization Bugs
- **Severity:** P2 (High)
- **Category:** CVE / Cryptographic / Random Generation
- **Package:** `nanoid` (transitive, in Frontend)
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv — non-secure generators loop indefinitely on negative size
  - GHSA-2v37-7h3g-55p8 — custom generators loop indefinitely when size is zero
  - GHSA-xwg4-73v4-xw9w — Integer overflow/wraparound in size calculation
- **Detail:**
  - **Impact:** ID generation can be predictable or infinite loop
  - **Risk:** Frontend session IDs or other security tokens may be weak
- **Fix:** `npm audit fix` — upgrade nanoid to >=3.3.8
- **Cross-ref:** If Frontend uses nanoid for session IDs or CSRF tokens, tokens may be predictable

### DEP-007: PostCSS XSS & Path Traversal
- **Severity:** P2 (High)
- **Category:** CVE / Path Traversal / Information Disclosure
- **Package:** `postcss` (transitive, in Frontend)
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  - GHSA-qx2v-qp2m-jg93 — XSS via unescaped </style> in CSS stringify output
  - GHSA-6g55-p6wh-862q — Arbitrary file read via attacker-controlled sourceMappingURL
  - GHSA-fxqj-rqcc-2cmp — Incomplete fix allowing .map file disclosure
  - GHSA-r28c-9q8g-f849 — Path traversal in sourceMappingURL handling
- **Detail:**
  - **Impact:** XSS in CSS; arbitrary .map file reads
  - **Risk:** If Frontend processes untrusted CSS, attacker can read source maps (.map files) containing source code
- **Fix:** `npm audit fix` — upgrade postcss to >=8.4.48
- **Cross-ref:** [ESCALATE → TheGuardians] — Potential source map disclosure

### DEP-008: Vite Path Traversal
- **Severity:** P2 (High)
- **Category:** CVE / Path Traversal
- **Package:** `vite` (direct in Frontend)
- **File:** Source/Frontend/package.json (currently ^5.4.0, installed 5.4.21)
- **CVE:** Not fully enumerated, but listed as high severity
- **Detail:**
  - **Title:** Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling
  - **Risk:** Build-time vulnerability; .map files can be read from outside intended directory
- **Fix:** `npm audit fix`

### DEP-009: WebSocket (ws) DoS & Memory Disclosure
- **Severity:** P2 (High)
- **Category:** CVE / Memory Disclosure / DoS
- **Package:** `ws` (transitive, in Frontend test dependencies via vitest)
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  - GHSA-58qx-3vcg-4xpx — Uninitialized memory disclosure
  - GHSA-96hv-2xvq-fx4p — Memory exhaustion DoS from tiny fragments
- **Detail:**
  - **Impact:** Memory disclosure in WS frames; DoS via fragmented messages
  - **Risk:** WebSocket traffic can leak memory; attacker can crash server via malformed frames
- **Fix:** `npm audit fix`

### DEP-010: @remix-run/router Open Redirect
- **Severity:** P2 (High)
- **Category:** CVE / Open Redirect / CWE-601
- **Package:** `@remix-run/router` (transitive, via react-router-dom)
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Detail:**
  - **Title:** React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation
  - **Impact:** Attacker can craft URL to redirect to external site (phishing)
  - **Risk:** `//evil.com/...` bypasses same-origin check due to protocol-relative interpretation
- **Fix:** `npm audit fix` — upgrade react-router-dom to >6.30.6
- **Cross-ref:** [ESCALATE → TheGuardians] — Open redirect / phishing risk

### DEP-011: @vitest/mocker Path Traversal
- **Severity:** P2 (High)
- **Category:** CVE / Path Traversal
- **Package:** `@vitest/mocker` (transitive, in Frontend test dependencies)
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-82fw-gwwq-j7x9
- **Detail:**
  - **Title:** Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock
  - **Impact:** Test runner can read arbitrary files via mock redirect URLs
  - **Risk:** Development-time risk; if tests run on shared CI with sensitive files, files can be read
- **Fix:** `npm audit fix` — upgrade vitest to >=5.0.2
- **Note:** Lower risk since this is test infrastructure, not production

### DEP-012: baseline-browser-mapping DoS
- **Severity:** P3 (Moderate, classified as Moderate by npm)
- **Category:** CVE / Denial of Service
- **Package:** `baseline-browser-mapping` (transitive)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Detail:**
  - **Title:** baseline-browser-mapping process termination on invalid input causes denial of service
  - **Impact:** Invalid input causes process to crash
- **Fix:** `npm audit fix`

### DEP-013: body-parser Size Limit Bypass
- **Severity:** P3 (Moderate)
- **Category:** CVE / DoS / Resource Exhaustion
- **Package:** `body-parser` (transitive, via express)
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-v422-hmwv-36x6
- **Detail:**
  - **Title:** body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement
  - **Impact:** Invalid limit config disables payload size protection → OOM attacks possible
- **Fix:** `npm audit fix`
- **Note:** Verify Backend does not set invalid body-parser limit values

### DEP-014: @babel/core Arbitrary File Read
- **Severity:** P3 (Low, but information disclosure)
- **Category:** CVE / Information Disclosure / CWE-22
- **Package:** `@babel/core` (transitive)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **Detail:**
  - **Title:** @babel/core: Arbitrary File Read via sourceMappingURL Comment
  - **Impact:** Babel processes source maps; attacker-controlled source map URLs can read arbitrary files
- **Fix:** `npm audit fix`

---

## Outdated Major Versions (P2/P3)

### DEP-015: Express Major Version Behind
- **Severity:** P3 (outdated)
- **Category:** Outdated / Missing Security Patches
- **Package:** `express`
- **Installed:** 4.22.1
- **Latest:** 5.2.1
- **Versions Behind:** 1 major (4.x → 5.x)
- **Risk:** Major version jumps often include significant security patches
- **Fix:** 
  ```bash
  cd Source/Backend
  npm install express@latest
  ```
- **Note:** Breaking changes likely; test thoroughly

### DEP-016: Pino Logger Major Version Behind
- **Severity:** P3 (outdated)
- **Category:** Outdated / Missing Patches
- **Package:** `pino`
- **Installed:** 8.21.0
- **Latest:** 10.3.1
- **Versions Behind:** 2 major (8.x → 10.x)
- **Risk:** 2 major versions behind = likely missing performance and security improvements
- **Fix:**
  ```bash
  cd Source/Backend
  npm install pino@latest
  ```

### DEP-017: uuid Major Version Behind
- **Severity:** P3 (outdated)
- **Category:** Outdated
- **Package:** `uuid`
- **Installed:** 9.0.1
- **Latest:** 14.0.2
- **Versions Behind:** 5 major versions
- **Risk:** RNG and uniqueness improvements; verify UUID version compatibility
- **Fix:**
  ```bash
  cd Source/Backend
  npm install uuid@latest
  ```

### DEP-018: React & React-DOM Major Version Behind
- **Severity:** P3 (outdated)
- **Category:** Outdated / Performance / Features
- **Package:** `react`, `react-dom`
- **Installed:** 18.3.1
- **Latest:** 19.3.0
- **Versions Behind:** 1 major
- **Risk:** 1 major release behind; may miss performance optimizations
- **Fix:**
  ```bash
  cd Source/Frontend
  npm install react@latest react-dom@latest
  ```

### DEP-019: react-router-dom Major Version Behind
- **Severity:** P2 (outdated, linked to open redirect CVE)
- **Category:** Outdated / Has Known Security Issues
- **Package:** `react-router-dom`
- **Installed:** 6.30.3
- **Latest:** 7.18.4
- **Versions Behind:** 1 major
- **Risk:** Open redirect vulnerability (DEP-010); must upgrade
- **Fix:**
  ```bash
  cd Source/Frontend
  npm install react-router-dom@latest
  ```
- **Priority:** HIGH — linked to open redirect CVE

### DEP-020: TypeScript Minor Versions Behind
- **Severity:** P4 (Low)
- **Category:** Outdated / Development only
- **Packages:** 
  - Backend: 5.9.3 (current: ^5.3.3, latest: 5.x)
  - Frontend: 5.9.3 (current: ^5.5.4, latest: 5.x)
- **Risk:** Development only; no runtime impact

---

## License Compliance (P4)

✅ **All Direct Dependencies:** Standard licenses (MIT, Apache-2.0, ISC, BSD)
- **Backend:** MIT, Apache 2.0, ISC, BSD
- **Frontend:** MIT, Apache 2.0, ISC, BSD
- **E2E:** ISC (Playwright)

✅ **No GPL/AGPL detected** — No viral license risk

---

## Dependency Tree Analysis

| Workspace | Direct | Transitive | Total | Status |
|-----------|--------|-----------|-------|--------|
| Backend | 4 | 13 | 17 | ✓ Reasonable |
| Frontend | 3 | 13 | 16 | ⚠️ Underspecified direct deps |
| E2E | 1 | 1 | 2 | ✓ Minimal |
| **Total** | **8** | **27** | **35** | ⚠️ Moderate surface |

### Notes:
- Backend has 13 transitive (mostly from express, pino, testing)
- Frontend has 13 transitive (from react, vite, testing, vitest)
- E2E is minimal (just Playwright test framework)
- No duplicate dependency versions detected
- No post-install scripts detected (good signal)

---

## Supply Chain Risks

✅ **No post-install/preinstall scripts** — Low risk
✅ **No dependency version collisions** — All packages deduplicated
✅ **No abandoned dependencies detected** — All packages actively maintained
⚠️ **High transitive surface (27 packages)** — Moderate supply chain exposure

---

## Remediation Plan

### Immediate (P1 - Critical)
1. **DEP-001: Handlebars**
   - [ ] Run: `npm audit fix` in Source/Backend
   - [ ] Check if backend uses Handlebars for templates
   - [ ] If yes, verify no user-controlled templates → escalate to TheGuardians

### High Priority (P2 - Must Fix)
2. **DEP-010: react-router-dom open redirect**
   - [ ] Run: `cd Source/Frontend && npm install react-router-dom@latest`
   - [ ] Test routing behavior; verify no 302 redirects bypass CORS
   - [ ] Check for protocol-relative URLs in redirect paths
3. **DEP-002 through DEP-009, DEP-012-014:** Run `npm audit fix` in Backend & Frontend
   - [ ] Both workspaces: `npm audit fix`
   - [ ] Review breaking changes
   - [ ] Run test suite after updates

### Medium Priority (P3 - Should Fix)
4. **Outdated major versions (DEP-015 through DEP-019)**
   - [ ] Update Backend: express, pino, uuid
   - [ ] Update Frontend: react, react-dom, react-router-dom
   - [ ] Run full test suite per workspace
   - [ ] Smoke test in staging environment

### Documentation
5. Update Teams/TheInspector/learnings/dependency-auditor.md with:
   - [ ] Handlebars is a critical risk if used for templates
   - [ ] browserslist, form-data, nanoid appear in both workspaces
   - [ ] react-router-dom open redirect requires manual fix (npm audit fix may not resolve)

---

## Cross-References

- **[ESCALATE → TheGuardians]:**
  - DEP-001: Handlebars code injection (if templates are user-controlled)
  - DEP-004: form-data CRLF injection (if backend accepts file uploads)
  - DEP-007: PostCSS source map disclosure (if Frontend processes untrusted CSS)
  - DEP-010: react-router-dom open redirect (phishing/SSRF risk)

---

## Summary by Severity

| Severity | Count | Packages | Action |
|----------|-------|----------|--------|
| 🔴 P1 (Critical) | 1 | Handlebars | Fix immediately + escalate |
| 🔶 P2 (High) | 11 | browserslist, form-data, js-yaml, nanoid, postcss, vite, ws, @remix-run/router, @vitest/mocker, body-parser, baseline-browser-mapping | Run `npm audit fix` + manual testing |
| 🟡 P3 (Medium/Outdated) | 9 | @babel/core, express, pino, uuid, react, react-dom, react-router-dom + 2 others | Schedule major version upgrades |
| 🟢 P4 (Low/Info) | 4 | License issues, TypeScript, etc. | Monitor, no immediate action |

**Grade: D** — 1 critical + 11 high severity CVEs = unacceptable risk profile. Must remediate before production deployment.
