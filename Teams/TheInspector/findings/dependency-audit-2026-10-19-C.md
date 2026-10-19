# Dependency Auditor Findings

**Date:** 2026-10-19
**Scanned Directories:** Source/Backend, Source/Frontend, Source/E2E

## Summary

| Package Set | Direct Deps | Transitive Deps | Critical CVEs | High CVEs | Moderate CVEs | Low CVEs | Total Vulns |
|-------------|------------|-----------------|---------------|-----------|---------------|----------|------------|
| Backend     | 13         | 411             | 2             | 33        | 5             | 2        | 42         |
| Frontend    | 9          | 230             | 2             | 7         | 7             | 1        | 17         |
| E2E         | 4          | 4               | 0             | 0         | 0             | 0        | 0          |
| **TOTAL**   | **26**     | **645**         | **4**         | **40**    | **12**        | **3**    | **59**     |

⚠️ **Grade: C** — 4 critical CVEs with known exploit vectors, multiple high-severity issues in direct/transitive dependencies.

---

## Critical Findings

### DEP-001: Handlebars.js JavaScript Injection (Multiple CVEs)
- **Severity:** P1 (Critical - Multiple exploit vectors)
- **Category:** CVE
- **Package:** handlebars@3.0.0-4.7.9 (Transitive via Backend)
- **File:** Source/Backend/package-lock.json
- **CVE IDs:**
  - GHSA-2w6w-674q-4c4q (Critical) — JavaScript Injection via AST Type Confusion
  - GHSA-8r5x-fm3f-whwj (Critical) — JavaScript Injection via AST Type Confusion (bypass of CVE-2026-33937)
  - GHSA-p8wg-vrv2-v86f (Critical) — JavaScript Injection via Own Property Check Bypass
  - GHSA-3mfm-83xf-c92r (High) — JavaScript Injection via AST Type Confusion by tampering @partial-block
  - GHSA-xhpv-hc6g-r9c6 (High) — JavaScript Injection via dynamic partial
  - GHSA-9cx6-37pm-9jff (High) — DoS via Malformed Decorator Syntax
  - GHSA-xjpj-3mr7-gcpf (High) — JavaScript Injection in CLI Precompiler
- **Details:** Handlebars allows arbitrary JavaScript injection through AST type confusion, property access validation bypass, and decorator syntax manipulation. An attacker can craft malicious templates to execute arbitrary code.
- **Impact:** Template injection → Remote Code Execution in any system using backend templates.
- **Fix:** Upgrade to Handlebars ≥4.7.10. Check dependency chain to identify direct dependent.
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE risk in template engine.

### DEP-002: proxy-addr IPv4-Mapped IPv6 Spoofing
- **Severity:** P1 (Critical - Bypasses security controls)
- **Category:** CVE
- **Package:** proxy-addr@1.1.0-2.0.7 (Transitive via Backend)
- **File:** Source/Backend/package-lock.json
- **CVE IDs:** GHSA-jqcg-44mw-7w3h (Critical)
- **Details:** proxy-addr is vulnerable to IP spoofing when trusting IPv4-mapped IPv6 addresses. An attacker can craft requests with IPv6 addresses like `::ffff:127.0.0.1` to bypass IP trust lists, potentially accessing restricted endpoints.
- **Impact:** Bypass of IP-based access control → Unauthorized access to admin/internal endpoints.
- **Fix:** Upgrade to proxy-addr ≥2.0.8. Review deployed IP allowlists.
- **Cross-ref:** [ESCALATE → TheGuardians] — Access control bypass.

### DEP-003: Vitest UI Server Arbitrary File Read/Execution
- **Severity:** P1 (Critical - Direct dev dependency)
- **Category:** CVE
- **Package:** vitest@≤4.1.10 (Direct - Frontend)
- **File:** Source/Frontend/package.json
- **CVE ID:** GHSA-5xrq-8626-4rwp (Critical)
- **Details:** When Vitest UI server is running (e.g., `vitest --ui` or in CI), arbitrary files can be read and executed from the filesystem. An attacker with access to the dev server can exfiltrate source code and credentials.
- **Impact:** Local/network exposure of source code, secrets, and arbitrary code execution during testing.
- **Fix:** Upgrade to Vitest ≥5.0.5. Do NOT run Vitest UI in production or CI environments.
- **Cross-ref:** [ESCALATE → TheGuardians] — Secrets exposure risk.

### DEP-004: Tinypool Prototype Pollution → RCE
- **Severity:** P1 (Critical - Worker RCE)
- **Category:** CVE
- **Package:** tinypool@≤2.1.1 (Transitive via vitest/vitest.config)
- **File:** Source/Frontend/package-lock.json
- **CVE IDs:**
  - GHSA-5gmw-xhrv-c9v3 (Critical) — Prototype Pollution in worker options
  - GHSA-85c8-ppgw-ccpr (Critical) — Prototype Pollution in run() options
- **Details:** Tinypool's worker initialization accepts untrusted worker options that allow prototype pollution gadgets, leading to Remote Code Execution in worker threads.
- **Impact:** RCE in test worker processes, data exfiltration, build pipeline compromise.
- **Fix:** Upgrade to Tinypool ≥2.1.2 (and Vitest ≥5.0.5).
- **Cross-ref:** [ESCALATE → TheGuardians] — Worker RCE.

---

## High-Severity Findings

### DEP-005: Jest ≥30.2.0 — Multiple High-Risk CVEs
- **Severity:** P2 (High - Many transitive deps, direct)
- **Category:** CVE
- **Package:** jest@29.7.0 (Direct - Backend) + 9 transitive jest packages
- **File:** Source/Backend/package.json and package-lock.json
- **Affected Packages:** @jest/core, @jest/console, @jest/reporters, @jest/transform, @jest/environment, jest-message-util, jest-haste-map, jest-snapshot, micromatch, babel-jest
- **CVE Impact:** jest-message-util contains information disclosure; micromatch has DoS via glob expansion.
- **Fix:** Upgrade Jest to ≥30.5.2 and @types/jest to ≥30.0.0.
- **Status:** Requires major version bump.

### DEP-006: brace-expansion DoS (Multiple variants)
- **Severity:** P2 (High - Multiple active DoS CVEs)
- **Category:** CVE
- **Package:** brace-expansion@<1.1.21 (Transitive)
- **File:** Source/Backend/package-lock.json
- **CVE IDs:**
  - GHSA-f886-m6hf-6m8v (Moderate) — Zero-step sequence causes process hang
  - GHSA-3jxr-9vmj-r5cp (High) — DoS via exponential-time expansion
  - GHSA-mh99-v99m-4gvg (High) — DoS via unbounded expansion
  - GHSA-rgw5-rvv9-x895 (High) — DoS via unbounded intermediate arrays
  - GHSA-qhr7-859c-m2p7 (High) — DoS via uncontrolled recursion
  - GHSA-6j4f-fj2g-mc7p (High) — DoS via recursion in parseCommaParts
- **Fix:** Upgrade brace-expansion to ≥1.1.21.

### DEP-007: React Router Open Redirect (Multiple)
- **Severity:** P2 (High - XSS/Open Redirect)
- **Category:** CVE
- **Package:** react-router-dom@≤7.17.0 (Direct - Frontend)
- **File:** Source/Frontend/package.json
- **CVE IDs:**
  - GHSA-jjmj-jmhj-qwj2 (Moderate) — Open redirect leading to XSS in ≤6.30.5
  - GHSA-2j2x-hqr9-3h42 (Moderate) — Protocol-relative URL reinterpretation
  - GHSA-wrjc-x8rr-h8h6 (Moderate) — Backslash bypass
  - GHSA-337j-9hxr-rhxg (Moderate) — Arbitrary constructor injection via hydration
- **Details:** Multiple open redirect vulnerabilities allow attackers to redirect users to external sites or craft XSS payloads.
- **Impact:** User redirection to phishing sites, XSS attacks, auth token theft.
- **Fix:** Upgrade to react-router-dom ≥7.18.0 (major version bump required).

### DEP-008: PostCSS Arbitrary File Read via sourceMappingURL
- **Severity:** P2 (High - Information Disclosure)
- **Category:** CVE
- **Package:** postcss@≤8.5.22 (Transitive - Frontend)
- **File:** Source/Frontend/package-lock.json
- **CVE IDs:**
  - GHSA-6g55-p6wh-862q (High) — Arbitrary file read via sourceMappingURL
  - GHSA-r28c-9q8g-f849 (High) — Path Traversal in Source Map Auto-Loading
  - GHSA-fxqj-rqcc-2cmp (Moderate) — Incomplete fix when `from` is unset
- **Details:** PostCSS parses and follows sourceMappingURL comments, allowing attacker-controlled CSS to read arbitrary .map files on the filesystem.
- **Impact:** Source code disclosure, secrets in source maps, build artifact exposure.
- **Fix:** Upgrade to PostCSS ≥8.5.23.

### DEP-009: Browserslist Memory DoS
- **Severity:** P2 (High - Memory exhaustion)
- **Category:** CVE
- **Package:** browserslist@≤4.28.6 (Transitive - Both Backend & Frontend)
- **CVE IDs:**
  - GHSA-c83g-rgw3-j3cx (High) — Unbounded memory growth, no cache eviction
  - GHSA-73wf-gq98-2v4g (High) — Prototype write via untrusted browserslist-stats.json
- **Details:** Browserslist cache has no eviction policy, allowing memory exhaustion. Untrusted stats files can trigger prototype pollution.
- **Impact:** Out-of-memory crashes in build processes, build pipeline DoS.
- **Fix:** Upgrade to Browserslist ≥4.28.7.

### DEP-010: Nanoid Loop Indefinitely → DoS
- **Severity:** P2 (High - DoS in ID generation)
- **Category:** CVE
- **Package:** nanoid@≤3.3.17 (Transitive - Frontend)
- **CVE IDs:**
  - GHSA-28wg-ghj8-5hjv (High) — Non-secure generators loop with negative size
  - GHSA-2v37-7h3g-55p8 (High) — Custom generators loop when size is zero
  - GHSA-xwg4-73v4-xw9w (High) — Integer overflow/wraparound
- **Fix:** Upgrade to Nanoid ≥3.3.18.

### DEP-011: form-data CRLF Injection
- **Severity:** P2 (High - Header injection)
- **Category:** CVE
- **Package:** form-data@4.0.0-4.0.5 (Transitive - Both)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx (High)
- **Details:** CRLF injection in multipart field names/filenames allows request smuggling, header injection.
- **Fix:** Upgrade to form-data ≥4.0.6.

### DEP-012: source-map-js DoS via Indexed Offsets
- **Severity:** P2 (High - Build-time DoS)
- **Category:** CVE
- **Package:** source-map-js@1.0.0-1.2.1 (Transitive - Frontend)
- **CVE ID:** GHSA-68fv-2mgg-jv7q (High)
- **Details:** Event-loop denial of service through indexed source-map section offsets.
- **Fix:** Upgrade to source-map-js ≥1.2.2.

### DEP-013: WebSocket (ws) Memory Exhaustion DoS
- **Severity:** P2 (High - Network DoS)
- **Category:** CVE
- **Package:** ws@8.0.0-8.20.1 (Transitive - Frontend via vitest)
- **CVE ID:** GHSA-96hv-2xvq-fx4p (High)
- **Details:** Memory exhaustion from tiny fragments and data chunks in WebSocket messages.
- **Fix:** Upgrade to ws ≥8.21.0.

### DEP-014: Vite esbuild CORS Bypass
- **Severity:** P2 (High - Information Disclosure)
- **Category:** CVE
- **Package:** vite@≤6.4.2 (Direct - Frontend) contains esbuild vulnerability
- **CVE ID:** GHSA-67mh-4wv8-2f99 (Moderate)
- **Details:** Vite's dev server allows any website to send requests and read responses, bypassing CORS.
- **Impact:** Local dev server information disclosure if accessed from remote site.
- **Fix:** Upgrade to Vite ≥8.3.4 (major version).

### DEP-015: @vitest/mocker Path Traversal
- **Severity:** P2 (Moderate - Dev environment)
- **Category:** CVE
- **Package:** @vitest/mocker@≤4.1.10 (Transitive via Vitest)
- **CVE ID:** GHSA-82fw-gwwq-j7x9 (Moderate)
- **Details:** Path traversal in redirect mock allows arbitrary file reads during test runs.
- **Fix:** Upgrade to Vitest ≥5.0.5.

---

## Moderate Severity Findings

### DEP-016: js-yaml RCE / ReDoS
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** js-yaml@≤3.15.2 (Transitive - Backend)
- **Details:** Contains both ReDoS and potential code execution vulnerabilities.
- **Fix:** Upgrade to js-yaml ≥4.0.0.

### DEP-017: baseline-browser-mapping DoS
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** baseline-browser-mapping@2.0.0-2.10.9 (Transitive - Both)
- **CVE ID:** GHSA-w5vr-8v7q-w6rv
- **Details:** Process termination on invalid input causes denial of service.
- **Fix:** Upgrade to ≥2.11.0.

### DEP-018: esbuild CORS Bypass (in Vite)
- **Severity:** P3 (Moderate - Dev only)
- **Category:** CVE
- **Package:** esbuild@≤0.24.2 (via Vite)
- **CVE ID:** GHSA-67mh-4wv8-2f99

### DEP-019: @remix-run/router Open Redirect
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** @remix-run/router@1.3.0-1.23.2 (Transitive - Frontend)
- **CVE ID:** GHSA-2j2x-hqr9-3h42

### DEP-020: body-parser Silent Limit Bypass
- **Severity:** P3 (Low)
- **Category:** CVE
- **Package:** body-parser@<1.20.6 (Transitive - Backend)
- **CVE ID:** GHSA-v422-hmwv-36x6

### DEP-021: @babel/core Arbitrary File Read
- **Severity:** P3 (Low)
- **Category:** CVE
- **Package:** @babel/core@≤7.29.0 (Transitive - Both)
- **CVE ID:** GHSA-4x5r-pxfx-6jf8

---

## Dependency Tree Analysis

### Backend (Source/Backend)
- **Direct Dependencies:** 13 (4 prod, 9 dev)
- **Transitive Dependencies:** 411 total
- **Dependency Distribution:**
  - TypeScript ecosystem: 45% (ts-jest, typescript, @types/*)
  - Jest ecosystem: 35% (jest, @jest/*, babel-jest, ts-jest)
  - Express ecosystem: 8% (express, supertest)
  - Logging: 5% (pino)
  - Other: 7%
- **Supply Chain Risk:** Moderate
  - Large Jest dependency tree (30+ packages)
  - Jest ecosystem has cascading vulnerabilities
  - Handlebars pulled in via jest dependencies

### Frontend (Source/Frontend)
- **Direct Dependencies:** 9 (3 prod, 6 dev)
- **Transitive Dependencies:** 230 total
- **Dependency Distribution:**
  - React ecosystem: 25% (react, react-dom, react-router-dom, @testing-library/*)
  - Vitest ecosystem: 40% (vitest, @vitest/*, vite)
  - TypeScript/Build: 25% (typescript, @vitejs/plugin-react)
  - Other: 10%
- **Supply Chain Risk:** Moderate-High
  - Vitest has critical RCE vulnerabilities
  - Tinypool RCE in worker threads
  - Build-time exposure to arbitrary file reads

### E2E (Source/E2E)
- **Direct Dependencies:** 4 (all small, no dev dependencies)
- **Total Vulnerabilities:** 0 ✅
- **Supply Chain Risk:** Low

---

## License Compliance

### Scanned Packages
- Backend: 13 direct deps, 411 total
- Frontend: 9 direct deps, 230 total
- **Status:** No GPL/AGPL packages detected in direct dependencies
- **Recommendation:** Run license-checker periodically to track compliance

### Notes
- All major dependencies are ISC, MIT, or Apache-2.0
- No viral license risk identified
- Consider license audit as part of CI/CD

---

## Remediation Priority

| Priority | Count | Examples | Timeline |
|----------|-------|----------|----------|
| **P1 (Critical - Immediate)** | 4 | Handlebars (RCE), proxy-addr (IP spoofing), Vitest (arbitrary file read), Tinypool (worker RCE) | 1-2 days |
| **P2 (High - This sprint)** | 40 | Jest, React Router, PostCSS, Browserslist, Nanoid, form-data, ws, etc. | 3-7 days |
| **P3 (Moderate - Next sprint)** | 12 | js-yaml, baseline-browser-mapping, @babel/core, body-parser | 2-3 weeks |
| **P4 (Informational)** | 3 | Non-security concerns | As-is |

---

## Recommended Actions

### Immediate (1-2 days)
1. **Upgrade Handlebars** — Identify which package depends on handlebars and upgrade to ≥4.7.10
2. **Upgrade proxy-addr** — Likely via Express ecosystem; upgrade express transitive deps
3. **Upgrade Vitest** — Frontend: `npm install --save-dev vitest@>=5.0.5`
4. **Review Vitest CI usage** — Disable Vitest UI server in CI pipelines

### Short-term (3-7 days)
1. **Jest major version bump** — Backend: `npm install --save-dev jest@>=30.5.2`
2. **React Router upgrade** — Frontend: `npm install --save react-router-dom@>=7.18.0`
3. **Build tool updates** — Vite, PostCSS, Browserslist, etc.

### Medium-term (Next sprint)
1. Set up automated dependency audits in CI/CD
2. Implement dependency update automation (Dependabot, Renovate)
3. Establish security patch SLA (critical: 1-2 days, high: 1 week)

---

## Cross-Team Escalation

| Finding | Team | Severity | Action |
|---------|------|----------|--------|
| Handlebars RCE | TheGuardians | P1 | Template injection → code execution risk assessment |
| proxy-addr IP spoofing | TheGuardians | P1 | Security review of IP allowlist logic |
| Vitest file read | TheGuardians | P1 | CI/CD secrets exposure assessment |
| Tinypool RCE | TheGuardians | P1 | Worker process security audit |
| All upgrades | TheFixer | P1-P3 | Patch management and testing |

---

## Notes for Next Audit

- Frontend had fewer vulnerabilities than Backend (17 vs 42) due to simpler tech stack
- Jest ecosystem is the largest vulnerability surface in Backend
- Vitest has critical security issues but is only in dev dependencies
- No abandoned packages detected (all major packages actively maintained)
- No license compliance issues in direct dependencies
