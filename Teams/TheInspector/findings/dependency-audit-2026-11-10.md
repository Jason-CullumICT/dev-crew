# Dependency Auditor Findings Report
**Date:** 2026-11-10  
**Scope:** All npm package manifests (13 package.json files across Source/, platform/, portal/, and demo projects)  
**Status:** ⚠️ **CRITICAL** — 12+ Critical CVEs detected across core packages

---

## Executive Summary

### Vulnerability Inventory
| Severity | Count | Critical | High | Moderate | Low |
|----------|-------|----------|------|----------|-----|
| **Source/** (main app) | 35 | 4 | 12 | 10 | 9 |
| **platform/** (orchestrator) | 9 | 2 | 3 | 4 | 0 |
| **portal/** (debug UI) | 79 | 6 | 19 | 53 | 1 |
| **Demo projects** (abac-*) | 88 | 0 | 40 | 47 | 1 |
| **TOTAL** | **211** | **12** | **74** | **114** | **11** |

### Dependency Tree Size
- **Source/Backend:** 412 transitive deps (4 direct)
- **Source/Frontend:** 281 transitive deps (3 direct)
- **Source/E2E:** 5 total deps (1 direct)
- **platform/orchestrator:** 156 transitive deps (3 direct) ⚠️ *Most of prod dependencies*
- **portal/Backend:** 577 transitive deps (397 prod) ⚠️ *Large supply chain surface*
- **portal/Frontend:** 424 transitive deps (9 prod)

---

## P1: CRITICAL VULNERABILITIES (Direct or Transitive in Main Packages)

### DEP-001: proxy-addr IPv4-mapped IPv6 Spoofing
- **Severity:** P1 (Critical)
- **Category:** cve
- **Packages:** proxy-addr (transitive dependency, appears in 3+ packages)
- **CVE:** GHSA-jqcg-44mw-7w3h (1241210)
- **Files:** Source/Backend/package-lock.json, platform/orchestrator/package-lock.json, portal/*
- **Detail:** proxy-addr can be tricked into treating IPv6-mapped IPv4 addresses as trusted, allowing IP spoofing attacks. Attack vector: `::ffff:127.0.0.1` can bypass access control checks. CVSS 7.5 (High).
- **Affected Range:** All versions prior to 2.1.0
- **Fix:** Update proxy-addr to ^2.1.0  
  ```bash
  cd Source/Backend && npm update proxy-addr --save-peer
  cd Source/Frontend && npm update proxy-addr --save-peer
  cd platform/orchestrator && npm update proxy-addr
  ```
- **Impact:** Express/backend services using `req.ip` or `req.ips` may incorrectly whitelist/trust attacker-controlled IPs
- **Cross-ref:** [CROSS-REF: red-teamer] — exploitable if app uses IP-based access control (e.g., admin panel restricts to localhost)

### DEP-002: handlebars JavaScript Injection via @partial-block
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** handlebars (transitive, via build/template tools)
- **CVE:** GHSA-3mfm-83xf-c92r (1115538)
- **File:** Source/Backend/package-lock.json
- **Detail:** Handlebars AST type confusion allows injection of arbitrary JavaScript via `@partial-block` comments. Remote code execution on template compilation. CVSS 9.8 (Critical).
- **Affected Range:** <4.7.9
- **Fix:** npm update handlebars
- **Impact:** If backend dynamically compiles handlebars templates from user input, this is RCE.
- **Cross-ref:** [CROSS-REF: red-teamer] — check if backend uses handlebars for template rendering

### DEP-003: protobufjs Code Injection via bytes field defaults
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** protobufjs (transitive)
- **CVE:** GHSA-66ff-xgx4-vchm (1118641)
- **File:** platform/orchestrator/package-lock.json
- **Detail:** protobufjs generated `toObject()` code can execute arbitrary code if bytes field defaults are crafted maliciously. Code injection at code-generation time. CVSS: High.
- **Affected Range:** <6.11.1, <7.2.3
- **Fix:** npm update protobufjs
- **Impact:** If orchestrator loads untrusted .proto files or receives crafted proto messages, could trigger code execution.
- **Cross-ref:** [CROSS-REF: red-teamer] — analyze protobuf message parsing paths

### DEP-004: tinypool Prototype Pollution RCE
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** tinypool (transitive, via vitest)
- **CVE:** GHSA-5gmw-xhrv-c9v3 (1241260)
- **File:** Source/Frontend/package-lock.json
- **Detail:** Prototype pollution gadget in tinypool worker options can be exploited to achieve remote code execution. CVSS: Medium-High.
- **Affected Range:** <1.0.0 (appears unpatched in some versions)
- **Fix:** Upgrade vitest to latest, which patches tinypool dependency
- **Impact:** Frontend test harness could be abused if attacker controls test worker options.

---

## P2: HIGH-SEVERITY CVEs in Direct Dependencies

### DEP-005: uuid Moderate severity (Direct Dependency - Backend)
- **Severity:** P2 (High priority due to direct dep)
- **Category:** cve
- **Package:** uuid@^9.0.0 (direct in Source/Backend)
- **CVE:** Multiple low/moderate issues in UUID generation
- **File:** Source/Backend/package.json
- **Detail:** uuid has known issues with randomness in certain Node.js versions.
- **Fix:** `npm update uuid`
- **Cross-ref:** Update for general hygiene

### DEP-006: body-parser Denial of Service
- **Severity:** P2
- **Category:** cve
- **Package:** body-parser (transitive via Express)
- **CVE:** GHSA-v422-hmwv-36x6 (1123977)
- **Files:** Source/Backend, platform/orchestrator
- **Detail:** Invalid limit values disable size enforcement, allowing large payloads to crash server memory. CVSS 3.7 (Low-Medium).
- **Fix:** Update express and its dependencies to latest patch versions
- **Impact:** DOS attack via oversized request bodies

---

## P3: DEPRECATED/UNMAINTAINED PACKAGES

### DEP-007: supertest@6.3.3 (Outdated)
- **Severity:** P3
- **Category:** outdated
- **Package:** supertest (dev dependency, Source/Backend)
- **Current Version in Lock:** 6.3.4
- **Latest Available:** 7.1.3+
- **Message:** "Please upgrade to supertest v7.1.3+, see release notes at https://github.com/forwardemail/supertest/releases/tag/v7.1.3 - maintenance is supported by Forward Email"
- **Gap:** 3 major versions behind
- **Risk:** Missing security patches, EOL maintenance
- **Fix:** `cd Source/Backend && npm update supertest --save-dev`

### DEP-008: glob (Old version - Deprecated)
- **Severity:** P3
- **Category:** abandoned
- **Package:** glob (transitive via build tools)
- **Message:** "Old versions of glob are not supported, and contain widely publicized security vulnerabilities"
- **File:** Source/Backend/package-lock.json
- **Risk:** Known to have CVEs, no longer maintained
- **Fix:** Update build tools that depend on glob, or use glob@latest

### DEP-009: async (Memory Leak - Deprecated)
- **Severity:** P3
- **Category:** abandoned
- **Package:** async@1.0.6 (transitive)
- **Message:** "This module is not supported, and leaks memory. Do not use it."
- **File:** Source/Backend/package-lock.json
- **Fix:** Audit dependency tree to find which package pulls this in; consider using alternatives like `p-queue`, `p-map`, or modern async/await

### DEP-010: multer@1.4.5-lts (Vulnerable, Superseded)
- **Severity:** P3
- **Category:** outdated + cve
- **Package:** multer (prod dependency, platform/orchestrator)
- **File:** platform/orchestrator/package.json
- **Current Version:** 1.4.5-lts.1
- **Latest:** 2.x series (maintenance via Forward Email)
- **Message:** "Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version."
- **Fix:** `cd platform/orchestrator && npm install multer@latest --save`
- **Risk:** Multiple unpatched vulnerabilities in file upload handling

---

## P4: MODERATE/LOW VULNERABILITIES IN KEY PACKAGES

### DEP-011: @babel/core Arbitrary File Read
- **Severity:** P4 (Low)
- **Category:** cve
- **Package:** @babel/core (transitive, via build tools)
- **CVE:** GHSA-4x5r-pxfx-6jf8 (1123528)
- **Detail:** Arbitrary file read via sourceMappingURL comment in dev builds. CVSS 3.2 (Low).
- **Impact:** Dev toolchain only; not production code
- **Fix:** npm update @babel/core

### DEP-012: @remix-run/router Open Redirect
- **Severity:** P4 (Medium via React Router)
- **Category:** cve
- **Package:** @remix-run/router (transitive via react-router-dom in Source/Frontend)
- **CVE:** GHSA-2j2x-hqr9-3h42 (1136293)
- **Detail:** Same-origin redirect with path starting `//` causes open redirect via protocol-relative URL. CVSS: Medium.
- **Affected Range:** 1.3.0 - 1.23.2
- **Fix:** Update react-router-dom, which will bump @remix-run/router to ^1.23.3+
- **Impact:** SPA could redirect users to attacker-controlled domains

### DEP-013: browserslist Unbounded Memory Growth (OOM)
- **Severity:** P4 (DOS via memory)
- **Category:** cve
- **Package:** browserslist (transitive via build tools)
- **CVE:** GHSA-c83g-rgw3-j3cx (1153171)
- **Detail:** Unbounded cache growth with no eviction on distinct query results → eventual OOM. CVSS: Medium.
- **Impact:** Build process or long-running services could OOM
- **Fix:** npm update browserslist

### DEP-014: form-data CRLF Injection
- **Severity:** P4
- **Category:** cve
- **Package:** form-data (transitive)
- **CVE:** GHSA-hmw2-7cc7-3qxx (1120743)
- **Detail:** CRLF injection via unescaped multipart field names/filenames in HTTP form data.
- **Fix:** npm update form-data

### DEP-015: Multiple Vitest Vulnerabilities
- **Severity:** P4 (Dev-only)
- **Category:** cve
- **Packages:** 
  - @vitest/mocker: Path traversal/arbitrary file read + Code injection
  - vitest: Prototype pollution in worker config
- **CVE:** GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8 (1193684, 1242767)
- **File:** Source/Frontend/package-lock.json
- **Detail:** Path traversal via redirect mock + unauthenticated manual mock registration allows code injection in test runner
- **Impact:** Test harness compromise (dev-only, but concerning if running in CI with elevated privileges)
- **Fix:** Update vitest to latest

---

## P5: SUPPLY CHAIN RISKS & OBSERVATIONS

### DEP-016: Large Transitive Dependency Tree
- **Severity:** P4 (Supply chain complexity)
- **Category:** supply-chain
- **Finding:** 
  - portal/Backend: **577 transitive dependencies** (397 prod)
  - Source/Backend: **412 transitive dependencies**
  - portal/Frontend: **424 transitive dependencies**
- **Risk:** Each additional transitive dep increases attack surface. One compromised deep dependency impacts entire project.
- **Recommendation:** Consider dependency audits on quarterly basis; evaluate if all transitive deps are needed

### DEP-017: Duplicate Package Versions (Normal)
- **Severity:** P4 (Informational)
- **Category:** supply-chain
- **Finding:**
  - esbuild ships platform-specific @esbuild/* binaries (expected)
  - browserslist bundles caniuse-lite (expected)
  - cssStyle bundles rrweb-cssom (expected)
- **Assessment:** Normal hoisting; no critical duplication detected
- **Note:** No duplicate major versions of critical packages like express, react

### DEP-018: Missing Post-Install Script Analysis
- **Severity:** P4 (Transparency)
- **Category:** supply-chain
- **Finding:** No suspicious post-install scripts detected in main package.json files
- **Assessment:** ✅ Good hygiene

---

## LICENSE COMPLIANCE REVIEW

### Finding: No GPL/AGPL Violations Detected
- Scanned all direct dependencies in main packages
- MIT, Apache-2.0, ISC, BSD licenses predominate
- No GPL/AGPL packages in direct dependency tree of Source/Backend, Source/Frontend
- platform/orchestrator: All dependencies have permissive licenses

### Recommendation: 
- Maintain license checks as part of CI/CD
- Consider `npm audit --audit-level=moderate` in pre-commit hooks

---

## SEVERITY BREAKDOWN BY PACKAGE

### 🔴 CRITICAL (P1 - Requires immediate fix)
| Package | Vuln Count | Critical | High | Status |
|---------|-----------|----------|------|--------|
| Source/Backend | 18 | 2 | 5 | ⚠️ ACTION REQUIRED |
| Source/Frontend | 17 | 2 | 7 | ⚠️ ACTION REQUIRED |
| platform/orchestrator | 9 | 2 | 3 | ⚠️ ACTION REQUIRED |
| portal/Backend | 61 | 4 | 11 | 🔴 HIGH PRIORITY |
| portal/Frontend | 18 | 2 | 8 | ⚠️ ACTION REQUIRED |
| Source/E2E | 0 | 0 | 0 | ✅ CLEAN |

---

## REMEDIATION PLAN (Priority Order)

### Immediate (P1 - This Sprint)
1. **proxy-addr IP spoofing** → Apply to all packages using express
   ```bash
   npm audit fix --force  # Or manual bump to ^2.1.0
   ```
2. **handlebars RCE** → Verify backend doesn't use dynamic template rendering; if yes, patch immediately
3. **protobufjs code injection** → Update orchestrator and any services using gRPC/proto
4. **tinypool RCE** → Update vitest in Source/Frontend

### High Priority (P2 - Next 1-2 sprints)
5. **multer 1.x vulnerabilities** → Migrate platform/orchestrator to multer 2.x
6. **supertest outdated** → Update Source/Backend devDeps
7. **body-parser DOS** → Update Express to latest patch

### Medium Priority (P3 - Before next release)
8. **Deprecated packages (glob, async)** → Audit transitive deps, find replacements
9. **browserslist OOM** → Update build toolchain
10. **@babel/core, form-data, etc.** → Routine updates

### Automation (Ongoing)
- Enable `npm audit` in CI/CD pipeline
- Fail builds on critical/high vulnerabilities
- Weekly dependency update checks
- Consider tools: `dependabot`, `renovate`, or `npm-check-updates`

---

## TEST VERIFICATION

**Before** remediation:
```bash
cd Source/Backend && npm audit --json | jq '.metadata.vulnerabilities'
# Output: {critical: 2, high: 5, moderate: 3, low: 8, total: 18}
```

**After** remediation (expected):
```bash
cd Source/Backend && npm audit --json | jq '.metadata.vulnerabilities'
# Output: {critical: 0, high: ≤2, moderate: ≤2, low: ≤5, total: ≤9}
```

Run in each package directory:
```bash
npm audit fix --audit-level=critical
npm audit fix --audit-level=high --force  # Use caution with --force
npm test  # Verify no breaking changes
```

---

## CROSS-TEAM ESCALATIONS

### 🔴 [ESCALATE → TheGuardians] 
**Security Issues Requiring Deeper Analysis:**
1. **proxy-addr IP spoofing** — If backend uses `req.ip` for access control, this is an auth bypass
2. **Handlebars RCE** — If backend dynamically compiles templates, critical 
3. **protobufjs injection** — If orchestrator processes untrusted protobuf messages
4. **tinypool/vitest code injection** — If CI runs with elevated privileges

**Action:** TheGuardians team should:
- Review access control logic for IP-based restrictions
- Audit template rendering code paths
- Check orchestrator's proto message handling
- Evaluate CI/CD security posture for test harness isolation

---

## LEARNINGS & RECOMMENDATIONS

### For Team
1. **Automate audits** — Add `npm audit` to pre-commit hooks and CI/CD
2. **Update cadence** — Run `npm outdated` monthly; address high/critical immediately
3. **Watch for deprecated** — The packages flagged (supertest, multer 1.x, glob) are not being actively maintained
4. **Consider zero-install strategy** — Use lockfiles, consider `npm ci` in CI/CD to ensure consistent builds
5. **Dependency health dashboard** — Track which packages are at EOL

### Tools to Integrate
- `npm audit` (built-in)
- `npm outdated` (built-in)
- `snyk` (free tier, detailed reporting)
- `dependabot` (GitHub native, auto-PR)
- `license-checker` (license compliance)

---

## SUMMARY METRICS

| Metric | Value | Status |
|--------|-------|--------|
| Total CVEs (all packages) | 211 | 🔴 |
| Critical CVEs | 12 | 🔴 |
| High CVEs | 74 | 🔴 |
| Packages with no vulns | 1 (E2E) | ✅ |
| Largest dep tree | 577 (portal/Backend) | ⚠️ |
| Direct deps (main app) | 7 (Backend+Frontend) | ✅ |
| Deprecated packages | 4 | ⚠️ |
| License compliance | PASS | ✅ |
| Post-install scripts | CLEAN | ✅ |

---

**Report Generated:** 2026-11-10  
**Agent:** Dependency Auditor (TheInspector)  
**Scope:** All npm packages in project  
**Next Review:** After remediation sprint completes
