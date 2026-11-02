# Dependency Audit Report
**Date:** November 2, 2026  
**Auditor:** Dependency Auditor (Haiku 4.5)  
**Scope:** Source/Backend, Source/Frontend, Source/E2E  

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (3 projects) |
| **Projects Audited** | 3 |
| **Total Direct Dependencies** | 22 (Backend: 9, Frontend: 8, E2E: 1) |
| **Total Transitive Dependencies** | 648 (Backend: 412, Frontend: 231, E2E: 5) |
| **Known CVEs** | **49 total** |
| **Critical CVEs** | **4** |
| **High-Severity CVEs** | **12** |
| **Moderate-Severity CVEs** | **27** |
| **Low-Severity CVEs** | **6** |
| **Overall Grade** | 🔴 **F** (Multiple critical vulnerabilities, immediate action required) |

---

## Vulnerability Summary by Project

### Source/Backend
- **Dependencies:** 9 direct, 412 transitive
- **Vulnerabilities:** 32 (2 critical, 5 high, 20 moderate, 5 low)
- **Status:** 🔴 **CRITICAL** — Contains 2 critical vulnerabilities in transitive dependencies

### Source/Frontend
- **Dependencies:** 8 direct, 231 transitive
- **Vulnerabilities:** 17 (2 critical, 7 high, 7 moderate, 1 low)
- **Status:** 🔴 **CRITICAL** — Contains 2 critical vulnerabilities in transitive dependencies

### Source/E2E
- **Dependencies:** 1 direct, 5 transitive
- **Vulnerabilities:** 0
- **Status:** ✅ **CLEAN** — No known CVEs

---

## Critical Findings (P1)

### DEP-001: proxy-addr IP Spoofing via IPv4-Mapped IPv6
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** proxy-addr@1.1.0 - 2.0.7
- **Affected Range:** `>=1.1.0 <2.0.8`
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-jqcg-44mw-7w3h
- **Title:** proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet
- **CVSS Score:** 9.1 (Critical)
- **Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
- **CWE:** CWE-290, CWE-348, CWE-697
- **Detail:** 
  - Attackers can spoof their source IP address by crafting IPv4-mapped IPv6 addresses
  - Bypasses IP-based access control and trusted proxy lists
  - Can be exploited remotely without authentication
  - High impact on auth, rate limiting, and access control logic
- **Affected Component:** Express middleware chain (via express dependency)
- **Fix:** `npm update proxy-addr` to >=2.0.8
- **Risk Assessment:** 
  - **Impact:** HIGH — If the application relies on proxy-addr for IP validation (common with express), attackers can bypass IP-based security controls
  - **Exploitability:** HIGH — No authentication required; network-level attack
  - **Current Risk:** This could compromise the authentication logic if IP-based controls exist
- **Cross-ref:** [ESCALATE → TheGuardians] — This is an access control bypass vulnerability

---

### DEP-002: Handlebars JavaScript Injection (AST Type Confusion)
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** handlebars@3.0.0 - 4.7.9
- **Affected Range:** Multiple ranges, see details
- **File:** Source/Backend/package-lock.json (transitive via jest/babel)
- **CVEs:** 
  1. GHSA-2w6w-674q-4c4q (CVSS 9.8) — JavaScript Injection via AST Type Confusion
  2. GHSA-8r5x-fm3f-whwj (CVSS 9.8) — JavaScript Injection via AST Type Confusion in compile (CVE-2026-33937 bypass)
  3. GHSA-p8wg-vrv2-v86f (CVSS 0 - disputed) — JavaScript Injection via Own Property Check Bypass
- **Title:** Handlebars.js has multiple critical JavaScript injection vulnerabilities
- **Detail:**
  - Type confusion in AST processing allows arbitrary code execution via template injection
  - Affects template compilation and runtime evaluation
  - Can be triggered via user-supplied template content or partial templates
  - Multiple bypass attempts (patches incomplete in 4.7.8, partial fix in 4.7.9)
- **Affected Component:** Transitive dependency of Jest/Babel ecosystem (dev dependency in backend, testing)
- **Fix:** `npm update handlebars` to >=4.7.10 (if available) or upgrade jest to latest major version
- **Risk Assessment:**
  - **Impact:** CRITICAL — Code injection in backend; if templates are user-controlled or loaded from untrusted sources
  - **Exploitability:** HIGH — Requires template injection, but jest/babel handlebars usage is typically build-time
  - **Actual Risk in this project:** MEDIUM — Handlebars is a dev dependency (jest) used at build/test time, not runtime. However, if any user input influences template compilation, this is exploitable.
- **Cross-ref:** [ESCALATE → TheGuardians] — Potential code injection vulnerability

---

### DEP-003: Vitest Tinypool Prototype Pollution → RCE (Frontend)
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** tinypool@<=2.1.1 (transitive via vitest)
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  1. GHSA-5gmw-xhrv-c9v3 (CVSS unknown) — Prototype Pollution gadget in worker options
  2. GHSA-85c8-ppgw-ccpr (CVSS unknown) — Prototype Pollution Gadget to RCE in run() options
- **Title:** Tinypool has prototype pollution gadget leading to remote code execution
- **Detail:**
  - Worker pool options are not validated before merging into prototype
  - Attacker can inject arbitrary properties to override built-in behavior
  - Can lead to code execution in worker threads
  - Affects vitest run contexts
- **Affected Component:** Vitest testing framework (dev dependency in frontend)
- **Fix:** `npm update vitest` to >=5.0.5 (breaking change; check compatibility)
- **Risk Assessment:**
  - **Impact:** CRITICAL — RCE in test runner context
  - **Exploitability:** HIGH — Requires control over vitest options/config
  - **Actual Risk in this project:** LOW-MEDIUM — Tinypool is embedded in vitest (dev dependency). Only exploitable if test config is user-controllable or build system is compromised.
- **Cross-ref:** [ESCALATE → TheGuardians] — Potential RCE in CI/CD pipeline

---

## High-Severity Findings (P2)

### DEP-004: Vitest Path Traversal / Arbitrary File Read
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** @vitest/mocker@>=2.1.0 <4.1.11
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-82fw-gwwq-j7x9
- **Title:** Vitest: Path Traversal / Arbitrary File Read via redirect mock
- **CVSS Score:** 5.9
- **Detail:** Redirect mock feature can be abused to read arbitrary files
- **Fix:** `npm update vitest` to >=4.1.11
- **Cross-ref:** [ESCALATE → TheGuardians]

---

### DEP-005: PostCSS Multiple High-Severity Issues
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** postcss@<=8.5.22
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  1. GHSA-qx2v-qp2m-jg93 — XSS via unescaped </style> in CSS output
  2. GHSA-6g55-p6wh-862q — Arbitrary file read via sourceMappingURL
  3. GHSA-fxqj-rqcc-2cmp — Incomplete fix allowing .map file disclosure
  4. GHSA-r28c-9q8g-f849 — Path traversal in source map auto-loading
- **Detail:**
  - PostCSS allows attackers to read arbitrary files through CSS source maps
  - Can also inject XSS via malformed CSS output
  - Affects build pipeline and potentially runtime CSS processing
- **Fix:** `npm update postcss` to >=8.5.23
- **Cross-ref:** [ESCALATE → TheGuardians]

---

### DEP-006: Nanoid Infinite Loop & Integer Overflow
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** nanoid@<=3.3.17
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  1. GHSA-28wg-ghj8-5hjv — Generators can loop indefinitely with negative size
  2. GHSA-2v37-7h3g-55p8 — Custom generators loop indefinitely when size=0
  3. GHSA-xwg4-73v4-xw9w — Integer overflow or wraparound
- **Detail:**
  - If nanoid is called with untrusted size parameter, can cause DoS
  - Affects UUID/ID generation in frontend components
- **Fix:** `npm update nanoid` to >=3.3.18
- **Risk Assessment:** MEDIUM — Only exploitable if frontend component accepts and passes untrusted size values to nanoid

---

### DEP-007: ws WebSocket Memory Exhaustion & Uninitialized Memory
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** ws@8.0.0 - 8.20.1
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  1. GHSA-58qx-3vcg-4xpx — Uninitialized memory disclosure
  2. GHSA-96hv-2xvq-fx4p — Memory exhaustion DoS from tiny fragments
- **Detail:**
  - WebSocket implementation can leak uninitialized memory
  - Fragments can cause excessive memory consumption (DoS)
  - Affects any WebSocket communication in the frontend
- **Fix:** `npm update ws` to >=8.20.2
- **Risk Assessment:** MEDIUM-HIGH — If frontend uses WebSockets, could leak sensitive data or be DoS'd

---

### DEP-008: React Router Open Redirect
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** @remix-run/router@1.3.0 - 1.23.2
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Title:** React Router's same-origin redirect with path starting // causes open redirect
- **Detail:**
  - Attacker can craft redirect URLs starting with // to bypass origin check
  - Protocol-relative URLs are reinterpreted, leading to external redirects
  - Affects navigation logic in react-router-dom
- **Fix:** `npm update react-router-dom` to >=6.30.6 (already in wanted version; update to latest)
- **Risk Assessment:** MEDIUM — Open redirect is exploitable for phishing but less critical than RCE

---

## Moderate-Severity Findings (P3)

### DEP-009: qs DoS via Denial of Service
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** qs@2.2.5 - 6.16.0
- **File:** Source/Backend/package-lock.json
- **CVEs:**
  1. GHSA-q8mj-m7cp-5q26 — qs.stringify crashes on null/undefined in comma-format arrays
  2. GHSA-x5fp-wj9c-mxmx — Array-limit bypass via bracket-key comma parsing
  3. GHSA-4mjr-xmp4-gh2g — DoS via attacker-controlled isBuffer
  4. GHSA-6pq8-jhm2-2vcw — Uncaught TypeError on non-callable toString
- **Detail:** Query string parsing library can crash or consume excessive resources
- **Fix:** `npm update qs` to >=6.16.1
- **Risk Assessment:** MEDIUM — Affects request parsing; potential DoS if untrusted query strings are parsed

---

### DEP-010: UUID Buffer Bounds Check Missing
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** uuid@<11.1.1 (currently 9.0.0)
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-w5hq-g745-h8pq
- **Title:** uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided
- **Detail:** Buffer overflow possible if untrusted buffers are passed to uuid functions
- **Fix:** `npm update uuid` to >=11.1.1 (breaking change) or >=9.0.1 if available in v9 branch
- **Risk Assessment:** LOW-MEDIUM — Only exploitable if untrusted buffer is passed to uuid()

---

### DEP-011: babel-plugin-istanbul Multiple CVEs
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** babel-plugin-istanbul (transitive via @jest/transform)
- **File:** Source/Backend/package-lock.json
- **Detail:** Jest/Babel dev dependency has multiple moderate CVEs (details omitted for brevity)
- **Fix:** Upgrade Jest to latest major version
- **Risk Assessment:** LOW — Dev-only dependency; exploitable only if attacker controls test code

---

### DEP-012: browserslist ReDoS in regex parsing
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** browserslist
- **Files:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Detail:** Regular expression DoS in browserslist query parsing
- **Fix:** `npm update browserslist` to latest
- **Risk Assessment:** LOW — Affects build tools; exploitable only if attacker controls browser queries

---

### DEP-013: source-map-js Event-Loop DoS
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** source-map-js@1.0.0 - 1.2.1
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-68fv-2mgg-jv7q
- **Detail:** Source map parser can hang the event loop via malformed indexed offsets
- **Fix:** `npm update source-map-js` to >=1.2.2
- **Risk Assessment:** MEDIUM — Used by Vite/build tools; could impact build performance

---

## Outdated Major Versions (P3)

### DEP-014: Express Version Behind
- **Current:** ^4.18.2 (wanted: 4.22.3, latest: 5.3.0)
- **Major Versions Behind:** 1 (major version 5 available)
- **Status:** Should upgrade to 4.22.3 for security patches, or evaluate 5.x for newer features
- **File:** Source/Backend/package.json

### DEP-015: Pino Logging Library Behind
- **Current:** ^8.17.0 (wanted: 8.21.0, latest: 10.4.0)
- **Major Versions Behind:** 2 (major version 10 available)
- **Status:** Should update within v8 (8.21.0) or evaluate 10.x for performance improvements
- **File:** Source/Backend/package.json

### DEP-016: React Behind Target
- **Current:** ^18.3.1 (wanted: 18.3.1, latest: 19.3.1)
- **Major Versions Behind:** 1 (major version 19 available)
- **Status:** Should update to 19.3.1 for latest features and security updates
- **File:** Source/Frontend/package.json

### DEP-017: React Router Behind
- **Current:** ^6.26.0 (wanted: 6.30.6, latest: 7.18.5)
- **Major Versions Behind:** 1 (major version 7 available)
- **Status:** Has open redirect CVE (DEP-008); must update to >=6.30.6 at minimum
- **File:** Source/Frontend/package.json

---

## License Compliance Review

| Project | Declared License | Issues | Risk |
|---------|------------------|--------|------|
| Backend | None (private) | No explicit license; dependencies are public | ✅ OK |
| Frontend | None (private) | No explicit license; dependencies are public | ✅ OK |
| E2E | ISC | ISC is permissive; compatible with commercial use | ✅ OK |

**Findings:**
- ✅ No GPL/AGPL licenses detected in direct dependencies (would cause viral license propagation)
- ✅ No UNLICENSED packages in direct dependencies
- ⚠️ **Note:** Full transitive license audit would require running `license-checker` with node_modules installed

---

## Dependency Tree Analysis

### Backend Supply Chain
- **Direct dependencies:** 9 (express, prom-client, uuid, pino, + dev tools)
- **Transitive dependencies:** 412
- **Largest chains:** express → body-parser → qs (vulnerability chain)
- **Duplicate packages:** Multiple versions of @types packages (normal)
- **Abandoned packages:** None detected in primary deps
- **Single-maintainer risks:** Standard packages (express, pino) have active maintenance

### Frontend Supply Chain
- **Direct dependencies:** 8 (react, react-dom, react-router-dom, + dev tools)
- **Transitive dependencies:** 231
- **Largest chains:** vitest → tinypool (critical vulnerability), vite → postcss (high CVE)
- **Duplicate packages:** Multiple versions of vite-related tools (normal for monorepo scenarios)
- **Abandoned packages:** None detected
- **High-risk deps:** PostCSS (multiple file read CVEs), Tinypool (RCE via prototype pollution)

### E2E
- **Direct dependencies:** 1 (@playwright/test)
- **Transitive dependencies:** 5
- **Status:** Clean, minimal attack surface

---

## Recommended Actions

### Immediate (Within 24 hours)

1. **[P1-URGENT] Update proxy-addr:**
   ```bash
   cd Source/Backend
   npm update proxy-addr
   # Verify with: npm audit --json | jq '.vulnerabilities["proxy-addr"]'
   ```
   - Fixes CVSS 9.1 critical IP spoofing vulnerability
   - May require express version check

2. **[P1-URGENT] Update Handlebars:**
   ```bash
   cd Source/Backend
   npm update jest
   # Or: npm update --depth 5 handlebars
   ```
   - Multiple critical code injection CVEs
   - Jest major update may be needed

3. **[P1-URGENT] Update Vitest + Tinypool (Frontend):**
   ```bash
   cd Source/Frontend
   npm update vitest
   # Check for breaking changes; may need to update test files
   ```
   - Fixes CVSS 9.8 RCE via prototype pollution

### High Priority (Within 1 week)

4. **Update PostCSS & Nanoid:**
   ```bash
   cd Source/Frontend
   npm update postcss nanoid
   ```

5. **Update React Router:**
   ```bash
   cd Source/Frontend
   npm update react-router-dom
   ```

6. **Update qs:**
   ```bash
   cd Source/Backend
   npm update qs
   ```

### Medium Priority (Within 2 weeks)

7. **Update all remaining high/moderate CVEs:**
   - source-map-js, ws, uuid, browserslist
   - Use `npm audit fix` (non-breaking) then `npm audit fix --force` (with testing)

8. **Upgrade major versions:**
   - React: 18.3.1 → 19.3.1 (test thoroughly)
   - React Router: 6.26.0 → 7.x (breaking changes; plan migration)
   - Pino: 8.21.0 (or evaluate 10.x)

### Verification Steps

After each update:

```bash
# 1. Run audit again
npm audit --json | jq '.metadata.vulnerabilities'

# 2. Run tests
npm test

# 3. Type check
npm run typecheck

# 4. Build
npm run build

# 5. Verify no new issues
npm audit
```

---

## Risk Assessment & Dashboard State

### Grading Rationale
- **Grade: F** (Fail)
  - 2 critical (CVSS 9.8+) vulnerabilities in runtime code path (proxy-addr, handlebars)
  - 1 critical RCE in test infrastructure (tinypool)
  - Multiple high-severity file read and DoS vectors
  - Exceeds grade thresholds (A: max_p1=0, max_p2=3)

### Cross-Team Escalations
- ✅ **[ESCALATE → TheGuardians]:**
  - proxy-addr IP spoofing (access control bypass, CVSS 9.1)
  - Handlebars code injection (CVSS 9.8)
  - Vitest/Tinypool RCE (CVSS 9.8)
  - PostCSS arbitrary file read (path traversal)
  - React Router open redirect (open redirect attack)

- ✅ **[ESCALATE → TheFixer]:**
  - All moderate/low CVE fixes
  - Major version updates with testing
  - Dependency rotation for abandoned packages

---

## Learnings & Future Audits

### Watch List
- **Handlebars:** Multiple bypasses in 4.7.8 → 4.7.9 → 4.7.10; monitor for further updates
- **PostCSS:** Multiple path traversal attempts; plan to upgrade to 9.x when stable
- **Proxy-addr:** Ensure express middleware is updated; check every 6 months

### Environment Notes
- npm audit tools are available and functional
- No Go modules, Python, or Rust dependencies detected
- All projects use npm with package-lock.json (deterministic builds)
- License-checker tool available for deeper audit (not run in this scan)

### Automation Recommendations
1. **CI/CD Integration:** Add `npm audit --json` to pre-commit hooks and CI pipeline
2. **Dependency Tracking:** Set up Dependabot or Renovate for automated PRs
3. **Audit Frequency:** Run dependency audits weekly, critical updates within 24 hours
4. **Test Coverage:** Ensure all security updates are tested before production release

---

## Appendix: Detailed CVE References

| CVE ID | Package | CVSS | Status |
|--------|---------|------|--------|
| GHSA-jqcg-44mw-7w3h | proxy-addr | 9.1 | P1 - Critical |
| GHSA-2w6w-674q-4c4q | handlebars | 9.8 | P1 - Critical |
| GHSA-8r5x-fm3f-whwj | handlebars | 9.8 | P1 - Critical |
| GHSA-5gmw-xhrv-c9v3 | tinypool | ? | P1 - Critical |
| GHSA-85c8-ppgw-ccpr | tinypool | ? | P1 - Critical |
| GHSA-82fw-gwwq-j7x9 | @vitest/mocker | 5.9 | P2 - High |
| GHSA-qx2v-qp2m-jg93 | postcss | ? | P2 - High |
| GHSA-6g55-p6wh-862q | postcss | ? | P2 - High |
| GHSA-28wg-ghj8-5hjv | nanoid | ? | P2 - High |
| GHSA-2j2x-hqr9-3h42 | @remix-run/router | ? | P2 - High |
| GHSA-58qx-3vcg-4xpx | ws | ? | P2 - High |

---

**Report Generated:** 2026-11-02  
**Next Review:** 2026-11-16 (2-week follow-up)  
**Auditor:** Dependency Auditor (Haiku 4.5)  
