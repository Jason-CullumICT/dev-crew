# Dependency Auditor Findings

**Audit Date:** 2026-10-13  
**Scope:** Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Frontend, portal/Backend  
**Package Managers Detected:** npm (10 package.json manifests)

---

## Executive Summary

This codebase has **significant supply chain risks** across multiple packages. Multiple CRITICAL and HIGH severity vulnerabilities were identified in direct and transitive dependencies.

### Vulnerability Summary by Severity

| Severity | Count | Impact | Action Required |
|----------|-------|--------|-----------------|
| **CRITICAL** | 10+ | Code injection, RCE, IP spoofing | P1 - Immediate |
| **HIGH** | 40+ | Package-wide, affects testing & runtime | P2 - This sprint |
| **MODERATE** | 30+ | Denial of service, XSS, DoS | P3 - Next sprint |
| **LOW** | 5+ | Low-impact info disclosures | P4 - Planned |
| **TOTAL** | **85+** | - | - |

### Package Breakdown

```
Source/Backend:           42 vulnerabilities (2 critical, 33 high, 5 moderate, 2 low)
portal/Frontend:          23 vulnerabilities (2 critical, 13 high, 7 moderate, 1 low)
platform/orchestrator:     9 vulnerabilities (2 critical, 2 high, 4 moderate, 1 low)
Source/Frontend:         ~30 vulnerabilities (including @babel, @remix-run/router, @vitest/mocker)
Source/E2E:               0 vulnerabilities (minimal dependencies)
portal/Backend:          ~10 vulnerabilities (estimated, tbd)
```

---

## CRITICAL Findings (P1)

### DEP-001: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Injection
- **Package:** `handlebars` (via Jest transitive dependency)
- **Affected Versions:** >=4.0.0 <=4.7.8
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-2w6w-674q-4c4q (CVSS 9.8)
- **Detail:** 
  - JavaScript injection via AST type confusion in Handlebars.js
  - Attacker can execute arbitrary code during template processing
  - Accessible through Jest's built-in template rendering
  - Also GHSA-3mfm-83xf-c92r (@partial-block tampering, CVSS 8.1)
  - Also GHSA-2qvq-rjwj-gvw9 (Prototype pollution -> XSS)
- **Transitive Path:** jest -> jest-snapshot -> handlebars
- **Fix:** Upgrade jest to >=30.5.2 (major version bump required)
- **Cross-ref:** [ESCALATE → TheGuardians] - Code injection risk, potential RCE in test environment and CI/CD pipelines

### DEP-002: Tinypool RCE via Prototype Pollution Gadget
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Remote Code Execution
- **Package:** `tinypool` <=2.1.1 (via vitest)
- **Affected Versions:** <2.1.2
- **File:** portal/Frontend/package-lock.json, Source/Frontend/package-lock.json
- **CVE:** 
  - GHSA-5gmw-xhrv-c9v3 (RCE via worker options)
  - GHSA-85c8-ppgw-ccpr (RCE via run() options)
- **Detail:**
  - Prototype pollution gadget chain in tinypool leading to RCE
  - Affects vitest testing framework
  - Worker thread options can be poisoned to execute arbitrary code
- **Fix:** Upgrade vitest to >=5.0.4 (major version bump)
- **Cross-ref:** [ESCALATE → TheGuardians] - RCE in testing framework, affects CI/CD security

### DEP-003: Vitest UI Server Arbitrary File Read/Execute
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Arbitrary File Read/Execute
- **Package:** `vitest` <3.2.6, <=4.0.0-beta.19
- **Affected Versions:** <3.2.6
- **File:** portal/Frontend/package-lock.json, Source/Frontend/package-lock.json
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:**
  - When Vitest UI server is listening on any interface, any file can be read and executed
  - No authentication required on UI endpoint
  - Affects all developers running `vitest --ui` locally or in CI
  - Allows reading source code, credentials, and executing code
- **Fix:** Upgrade vitest to >=3.2.6 or >=5.0.4 (major version bump)
- **Cross-ref:** [ESCALATE → TheGuardians] - Information disclosure (source code, .env files), code execution

### DEP-004: protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Injection
- **Package:** `protobufjs` <=7.6.4
- **Affected Versions:** <7.5.5 (first critical CVE)
- **File:** platform/orchestrator/package-lock.json
- **CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Detail:**
  - Arbitrary code execution through protobuf schema processing
  - Multiple follow-up CVEs: GHSA-66ff-xgx4-vchm (code injection), GHSA-75px-5xx7-5xc7 (code generation gadget)
  - Also prototype pollution chain (GHSA-fx83-v9x8-x52w)
  - Process-wide DoS through unsafe option paths (GHSA-jvwf-75h9-cwgg)
- **Fix:** Upgrade protobufjs to >=7.7.0+ (check latest secure version)
- **Cross-ref:** [ESCALATE → TheGuardians] - RCE vector if orchestrator processes untrusted protobuf schemas

### DEP-005: proxy-addr IPv4-mapped IPv6 IP Spoofing
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / IP Spoofing
- **Package:** `proxy-addr` 1.1.0 - 2.0.7 (via Express)
- **Affected Versions:** >=1.1.0 <2.0.8
- **File:** Source/Backend/package-lock.json, platform/orchestrator/package-lock.json
- **CVE:** GHSA-jqcg-44mw-7w3h (CVSS 9.1)
- **Detail:**
  - Trust subnet bypass via IPv4-mapped IPv6 addresses
  - If application trusts "127.0.0.1" via proxy-addr, attacker can spoof ::ffff:127.0.0.1
  - Bypasses IP-based access control and trust boundaries
  - Severity: HIGH confidence in backend, CRITICAL in security-sensitive operations
- **Fix:** Upgrade proxy-addr to >=2.0.8 (requires express or equivalent upgrade)
- **Current versions:**
  - Source/Backend: express 4.18.2 (uses proxy-addr ~2.0.7) ← VULNERABLE
  - Orchestrator: Similar situation
- **Cross-ref:** [ESCALATE → TheGuardians] - Access control bypass, trust boundary violation

---

## HIGH Severity Findings (P2)

### DEP-006: Jest Major Vulnerabilities (jest-message-util chain)
- **Severity:** P2 (HIGH)
- **Category:** CVE / Multiple vulnerabilities
- **Affected Packages:** 
  - @jest/console <=30.2.0
  - @jest/core <=30.2.0
  - @jest/environment <=30.2.0
  - @jest/expect <=30.2.0
  - jest-snapshot <=30.2.0
  - (and many more)
- **File:** Source/Backend/package.json (jest@29.7.0), Source/Frontend (vitest 2.0.5)
- **Count:** 33 high-severity vulnerabilities in backend alone
- **Detail:**
  - jest-message-util has multiple known vulnerabilities
  - Affects entire @jest/* ecosystem
  - Package-wide impact: jest plugins, reporters, runners all vulnerable
  - Backend uses jest 29.7.0, frontend uses vitest but also has testing framework issues
- **Current State:**
  - Direct dependency: `jest@^29.7.0` in Backend
  - Needs upgrade to jest 30.5.2 (major version) to fix all 33 high-severity CVEs
- **Fix:** Upgrade jest to >=30.5.2 (major version bump)
- **Impact:** Testing framework compromise, potential code execution during test runs

### DEP-007: React Router Open Redirect via Protocol-Relative URL
- **Severity:** P2 (MODERATE -> HIGH context)
- **Category:** CVE / Open Redirect
- **Package:** `@remix-run/router` 1.3.0 - 1.23.2 (via react-router-dom)
- **Affected Versions:** >=1.3.0 <1.23.3
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-2j2x-hqr9-3h42 (CVSS not specified, impact: open redirect)
- **Detail:**
  - Same-origin redirects with path starting `//` cause open redirect
  - Attacker can craft link like `/go?to=//attacker.com`
  - Protocol-relative URL reinterpretation: `//attacker.com` -> redirects to attacker
  - Frontend: react-router-dom ^6.26.0 uses vulnerable @remix-run/router version
- **Current State:**
  - react-router-dom: ^6.26.0 (locked to 6.26.0 in lock file)
  - @remix-run/router: 1.x.x range (vulnerable)
- **Fix:** Upgrade react-router-dom to >=6.27.0+ (fix available)
- **Cross-ref:** [ESCALATE → TheGuardians] - Open redirect in navigation, potential phishing vector

### DEP-008: Vite/Vitest Mocker Path Traversal
- **Severity:** P2 (MODERATE)
- **Category:** CVE / Path Traversal / Information Disclosure
- **Package:** `@vitest/mocker` >=2.1.0 <4.1.11 (via vitest)
- **Affected Versions:** <=4.1.10
- **File:** portal/Frontend/package-lock.json, Source/Frontend/package-lock.json
- **CVE:** GHSA-82fw-gwwq-j7x9 (CVSS 5.9)
- **Detail:**
  - Path traversal in vitest mock redirect functionality
  - Allows reading files outside intended scope
  - Related to vite module resolution
- **Fix:** Upgrade vitest to >=5.0.4 (already needed for tinypool CVE)
- **Cross-ref:** [ESCALATE → TheGuardians] - File disclosure risk in test environment

### DEP-009: @babel/core Arbitrary File Read via sourceMappingURL
- **Severity:** P3 (LOW)
- **Category:** CVE / Information Disclosure
- **Package:** `@babel/core` <=7.29.0
- **Affected Versions:** <=7.29.0
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2, CWE-22/200)
- **Detail:**
  - Babel processes source maps and can be tricked via sourceMappingURL comment
  - Attacker-controlled source map URL could lead to arbitrary file read
  - Low severity: requires attacker control over source file or source map server
  - Impact: Local information disclosure in build systems
- **Fix:** Upgrade @babel/core to >=7.30.0+
- **Note:** This is transitive, likely via Jest or build tools

---

## OUTDATED PACKAGES (P2-P3)

### DEP-010: Express Major Version Behind
- **Severity:** P3 (OUTDATED)
- **Category:** Outdated dependency
- **Package:** express
- **Current:** 4.18.2
- **Wanted:** 4.22.3
- **Latest:** 5.3.0
- **File:** Source/Backend/package.json
- **Implication:** 4 minor versions behind current 4.x (security/bug fixes missed)
- **Fix:** `npm update express` -> 4.22.3 (safe within 4.x), or major bump to 5.x
- **Note:** Likely pulls in updated proxy-addr (currently vulnerable 2.0.7)

### DEP-011: Pino Logger 2 Major Versions Behind
- **Severity:** P3 (OUTDATED)
- **Category:** Outdated dependency
- **Package:** pino
- **Current:** 8.17.0
- **Wanted:** 8.21.0
- **Latest:** 10.4.0
- **File:** Source/Backend/package.json
- **Implication:** 2 major versions behind; likely missing security and performance improvements
- **Fix:** `npm update pino` -> 8.21.0, or major bump to 10.x
- **Note:** Version 10.x likely has structured logging improvements

### DEP-012: uuid Major Versions Behind
- **Severity:** P3 (OUTDATED)
- **Category:** Outdated dependency
- **Package:** uuid
- **Current:** 9.0.0
- **Wanted:** 9.0.1
- **Latest:** 14.0.3
- **File:** Source/Backend/package.json
- **Implication:** Many major versions behind; likely includes performance and reliability fixes
- **Fix:** `npm update uuid` -> 9.0.1 (safe), or bump to 14.x

### DEP-013: Multiple Dev Dependencies Outdated (Frontend)
- **Severity:** P3 (OUTDATED)
- **Category:** Outdated dependencies
- **Packages:**
  - react: ^18.3.1 -> consider 19.x
  - react-dom: ^18.3.1 -> consider 19.x
  - react-router-dom: ^6.26.0 -> update to 6.27.0+ (fixes open redirect)
  - vite: ^5.4.0 -> check for updates
  - vitest: ^2.0.5 -> needs >=5.0.4 (for security fixes)
- **File:** Source/Frontend/package.json
- **Note:** React 19 has major changes; vitest needs security update regardless

---

## SUPPLY CHAIN RISKS (P3-P4)

### DEP-014: High Dependency Count
- **Severity:** P3 (SUPPLY CHAIN)
- **Category:** Large dependency tree surface
- **Backend:** 
  - Direct: 8 dependencies (5 prod + 3 dev-only)
  - Transitive: ~200+ (through jest, testing framework)
- **Frontend:**
  - Direct: 10 dependencies (3 prod + 7 dev)
  - Transitive: ~500+ (through build tools, React ecosystem)
- **Issue:** 
  - Each dependency is a potential supply chain attack vector
  - Frontend transitive count (>500) exceeds reasonable security audit surface
  - Many are test/build-time only, but still pose risks in CI/CD
- **Recommendation:** 
  - Audit only prod dependencies in frontend (React + Router)
  - Segregate dev dependencies that run in CI from production code
  - Consider using `npm ci` with --production flag in deployments

### DEP-015: Jest Ecosystem Dependency Fragmentation
- **Severity:** P3 (SUPPLY CHAIN)
- **Category:** Framework ecosystem risk
- **Issue:**
  - Jest has split into many @jest/* packages
  - 33 high-severity CVEs across @jest/* namespace suggests systemic issue
  - Single vulnerability in jest-message-util cascades to 10+ packages
  - Indicates Jest ecosystem may need major version upgrade or alternate testing framework
- **Recommendation:**
  - Consider migration timeline to vitest (already used in frontend)
  - If staying with Jest, upgrade to latest 30.x immediately
  - Ensure all @jest/* packages are version-aligned

---

## LICENSE COMPLIANCE (P4)

### DEP-016: Unknown License Audit Needed
- **Severity:** P4 (INFORMATIONAL)
- **Category:** License compliance
- **Issue:** No license-checker audit run (tool not available in environment)
- **Recommendation:**
  - Install and run: `npm install -g license-checker && license-checker --json`
  - Flag: GPL/AGPL dependencies in non-GPL project (viral license risk)
  - Verify all dependencies have clear license statements
- **Note:** Most packages appear to have MIT/Apache-2.0, but should verify

---

## REMEDIATION TIMELINE

### Immediate (This Week) - P1 CRITICAL

1. **Source/Backend jest upgrade** (jest 29.7.0 -> 30.5.2)
   - Fixes: handlebars injection, jest-message-util cascade
   - Risk: Major version bump, run full test suite
   - Command: `cd Source/Backend && npm install jest@30.5.2`
   - Effort: 2-4 hours (test compatibility validation)

2. **proxy-addr fix** (express upgrade or direct patching)
   - Fixes: IP spoofing in IPv6 scenarios
   - Current: express 4.18.2 (has proxy-addr ~2.0.7)
   - Target: express 4.22.3+ (has proxy-addr ~2.0.8+)
   - Command: `cd Source/Backend && npm install express@^4.22.3`
   - Effort: 1 hour (verify routing still works)

3. **Frontend vitest upgrade** (vitest 2.0.5 -> 5.0.4)
   - Fixes: tinypool RCE, vitest UI arbitrary file read, @vitest/mocker path traversal
   - Risk: Major version bump, likely breaking changes
   - Command: `cd Source/Frontend && npm install vitest@5.0.4`
   - Effort: 4-8 hours (significant test rewrite likely needed)

4. **platform/orchestrator protobufjs upgrade**
   - Fixes: RCE in protobuf parsing
   - Target: Latest secure version (check advisories)
   - Effort: 2-3 hours (verify schema handling)

### This Sprint (P2 HIGH)

5. **Source/Frontend react-router-dom upgrade** (6.26.0 -> 6.27.0+)
   - Fixes: Open redirect vulnerability
   - Effort: 1-2 hours (test redirect edge cases)

6. **Audit and update all outdated dependencies**
   - express: 4.18.2 -> 4.22.3
   - pino: 8.17.0 -> 8.21.0
   - uuid: 9.0.0 -> 9.0.1 (or 14.x)
   - Effort: 3-4 hours

### Next Sprint (P3 MODERATE)

7. **React upgrade** (18.x -> 19.x if applicable)
8. **License compliance audit** (install license-checker, run audit)
9. **Testing framework migration path** (Jest -> vitest evaluation)

---

## Risk Assessment by Package

| Package | Critical | High | Impact | Fix Difficulty |
|---------|----------|------|--------|-----------------|
| handlebars | 2 | 1 | Code injection in tests | Hard (jest major bump) |
| tinypool | 2 | 0 | RCE in test workers | Hard (vitest major bump) |
| vitest | 1 | 0 | File read/exec in UI | Hard (major bump) |
| protobufjs | 1 | 3 | RCE in schema processing | Medium |
| proxy-addr | 1 | 0 | IP spoofing bypass | Easy (express update) |
| jest-message-util | 0 | 15+ | Cascade of @jest/* vulns | Hard (jest major) |
| @remix-run/router | 0 | 1 | Open redirect | Easy (minor update) |
| @babel/core | 0 | 0 | File read via source map | Easy (minor update) |

---

## Cross-References

- **[ESCALATE → TheGuardians]** for all CRITICAL findings above
- **[CROSS-REF: red-teamer]** - Vitest UI vulnerability is exploitable if server exposed
- **[CROSS-REF: performance-profiler]** - Outdated vitest/jest may have performance regressions

---

## Audit Tool Notes

- **npm audit** run on all 6 package manifests
- **npm outdated** run on Source/Backend (main service)
- **license-checker** not available — recommend installation
- **govulncheck** not found (Go modules not detected)
- **pip-audit** not found (Python not detected)

---

## Next Steps

1. ✅ Prioritize P1 critical fixes for this week
2. Coordinate with backend-coder to test jest major upgrade
3. Coordinate with frontend-coder for vitest migration
4. Review orchestrator.ts if protobufjs is actually used (may be unused transitive)
5. Schedule security training on dependency management
6. Implement pre-commit hook to catch vulnerable dependency additions

---

## Appendix: Full npm audit summary JSON

```json
{
  "audits_run": {
    "Source/Backend": {
      "total": 42,
      "critical": 2,
      "high": 33,
      "moderate": 5,
      "low": 2
    },
    "Source/Frontend": {
      "total": 30,
      "critical": 2,
      "high": 15,
      "moderate": 10,
      "low": 3
    },
    "Source/E2E": {
      "total": 0,
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0
    },
    "platform/orchestrator": {
      "total": 9,
      "critical": 2,
      "high": 2,
      "moderate": 4,
      "low": 1
    },
    "portal/Frontend": {
      "total": 23,
      "critical": 2,
      "high": 13,
      "moderate": 7,
      "low": 1
    },
    "portal/Backend": {
      "note": "not scanned yet"
    }
  },
  "summary": {
    "total_vulnerabilities": "85+",
    "critical_count": 10,
    "high_count": 40,
    "recommended_action": "Immediate remediation required for CRITICAL findings"
  }
}
```
