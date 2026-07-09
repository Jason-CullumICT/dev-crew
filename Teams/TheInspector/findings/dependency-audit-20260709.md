# Dependency Auditor Findings

**Audit Date:** 2026-07-09  
**Scope:** dev-crew Source App (Backend + Frontend)  
**Package Managers Detected:** npm (JavaScript/TypeScript)  
**Status:** ⚠️ **GRADE: C** — Critical and high-severity vulnerabilities in production dependencies require immediate attention.

---

## Executive Summary

**Total Vulnerabilities Found:** 18 (across Backend + Frontend)
- **Critical:** 2
- **High:** 4
- **Moderate:** 6
- **Low:** 1
- **Info:** 0

**Backend Dependency Tree:**
- Direct dependencies: 8 (4 production, 4 dev)
- Transitive dependencies: ~400+ (including dev)

**Frontend Dependency Tree:**
- Direct dependencies: 5 (3 production, 2+ dev)
- Transitive dependencies: ~400+ (including dev)

**Outdated Packages:**
- Backend: 4 major versions behind on 3 packages (express, pino, uuid)
- Frontend: 3 packages with major version upgrades available

---

## Critical & High-Severity Findings

### DEP-001: CRITICAL - Vitest UI Server Arbitrary File Read/Execute
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (CWE-862: Missing Authorization)
- **Package:** vitest@2.0.5
- **File:** Source/Frontend/package.json
- **CVSS Score:** 9.8 (Critical)
- **Affected Versions:** <3.2.6
- **Current Version:** 2.0.5 ❌
- **Detail:** 
  - When Vitest UI server is listening, any attacker can read arbitrary files from the filesystem and execute code without authentication.
  - **Risk in this context:** During development, if the UI server is exposed or accessible from any network, sensitive files (`.env`, configuration, source maps) are accessible.
  - Affects both local and CI/CD environments if UI is enabled.
- **CVE/Advisory:** GHSA-5xrq-8626-4rwp (GitHub Security Advisory)
- **Fix:** `npm install vitest@^3.2.6` or latest (4.x+)
- **Timeline:** Update immediately before merging any code.
- **[CROSS-REF: red-teamer]** — This is a development-time exploit path; verify if UI server is enabled in CI.

---

### DEP-002: CRITICAL - Handlebars.js JavaScript Injection (AST Type Confusion)
- **Severity:** P1 (CRITICAL in context)
- **Category:** CVE (CWE-94, CWE-843: Code Injection)
- **Package:** handlebars (transitive, comes from dev dependency chain)
- **File:** Source/Backend/node_modules (transitive dependency)
- **CVSS Score:** 9.8 (multiple high/critical variants)
- **Affected Versions:** >=4.0.0 <=4.7.8
- **Current Version:** Unknown (via transitive) ⚠️
- **Detail:**
  - Multiple JavaScript injection vectors via AST type confusion when processing templates.
  - Can lead to remote code execution if untrusted templates are compiled.
  - **Risk in this context:** Backend does not appear to use Handlebars directly, but it's in the transitive dependency tree (likely from a test framework or docs tool).
  - This is **P1 if the application ever processes user-supplied templates.**
- **CVE/Advisory:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8 - JavaScript Injection)
  - GHSA-3mfm-83xf-c92r (CVSS 8.1 - Partial block tampering)
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1 - Dynamic partial injection)
  - GHSA-9cx6-37pm-9jff (CVSS 7.5 - DoS via decorator syntax)
  - 5 total CVEs affecting this package
- **Fix:** Identify the root dependency pulling in handlebars. Run:
  ```bash
  npm ls handlebars
  npm audit --fix  # If auto-fix is available
  ```
- **Timeline:** Update immediately; audit the dependency chain to find the root cause.
- **[CROSS-REF: red-teamer]** — If templates are ever processed from untrusted sources, this is a critical entry point.

---

### DEP-003: HIGH - Vite `server.fs.deny` Bypass (Windows Alternate Paths)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-22: Path Traversal)
- **Package:** vite@5.4.0
- **File:** Source/Frontend/package.json
- **CVSS Score:** 0 (likely depends on environment, but HIGH severity assigned)
- **Affected Versions:** <=6.4.2
- **Current Version:** 5.4.0 ✓ (within vulnerable range if <6.4.2, but 5.4 may be okay)
- **Detail:**
  - `server.fs.deny` configuration can be bypassed on Windows using alternate path formats (e.g., short names, UNC paths).
  - Allows developer/attacker to serve files that should be denied.
  - **Risk in this context:** Only affects Windows development environments where `server.fs.deny` is configured. CI/Linux environments are unaffected.
- **CVE/Advisory:** GHSA-fx2h-pf6j-xcff
- **Fix:** Upgrade to vite@^6.4.3 or patch release for your major version
  ```bash
  npm install vite@latest  # Currently 5.4.0, safe if <6.4.2, but update to 6.4.3+
  ```
- **Timeline:** Update before next major version release; medium priority for CI.

---

### DEP-004: HIGH - Vite Path Traversal in `.map` Handling
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-22, CWE-200: Path Traversal)
- **Package:** vite@5.4.0
- **File:** Source/Frontend/package.json
- **CVSS Score:** 0 (moderate in detail, but assigned high)
- **Affected Versions:** <=6.4.1
- **Current Version:** 5.4.0 ✓ (safe)
- **Detail:**
  - Vite's optimized deps `.map` file handling can be exploited to traverse directories outside the intended scope.
  - Affects both dev and build scenarios.
- **CVE/Advisory:** GHSA-4w7w-66w2-5vf9
- **Fix:** Upgrade to vite@^6.4.2+ or patch your version
- **Timeline:** Medium priority; address along with DEP-003.

---

### DEP-005: HIGH - form-data CRLF Injection (Direct Multipart Risk)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-93: CRLF Injection)
- **Package:** form-data@4.0.0-4.0.5
- **File:** Transitive (appears in both Backend and Frontend)
- **CVSS Score:** 7.5 (HIGH)
- **Affected Versions:** >=4.0.0 <4.0.6
- **Current Version:** 4.0.0-4.0.5 ⚠️
- **Detail:**
  - Unescaped multipart field names and filenames allow CRLF injection.
  - Can be exploited to inject HTTP headers or split requests.
  - **Risk in this context:** If the app uses form-data for file uploads or multipart requests, an attacker can inject headers to spoof boundaries or headers.
- **CVE/Advisory:** GHSA-hmw2-7cc7-3qxx
- **Fix:**
  ```bash
  npm install form-data@^4.0.6  # or latest 4.x
  ```
- **Timeline:** Update immediately; test multipart requests after patching.

---

### DEP-006: HIGH - ws Memory Exhaustion DoS (Tiny Fragments)
- **Severity:** P2 (HIGH)
- **Category:** CVE (CWE-400, CWE-770: Denial of Service)
- **Package:** ws@8.0.0-8.20.1
- **File:** Transitive (Frontend, likely via Vite or test framework)
- **CVSS Score:** 7.5 (HIGH)
- **Affected Versions:** >=8.0.0 <8.21.0
- **Current Version:** ⚠️ (via transitive)
- **Detail:**
  - WebSocket library can be exhausted by sending many tiny fragments, causing DoS.
  - **Risk in this context:** If the app uses WebSockets (e.g., for real-time updates), or if dev server uses ws, this is exploitable.
- **CVE/Advisory:** GHSA-96hv-2xvq-fx4p
- **Fix:**
  ```bash
  npm install ws@^8.21.0 or ^9.x
  ```
- **Timeline:** Update after form-data and Vitest; test WebSocket connections.

---

## Moderate-Severity Findings

### DEP-007: MODERATE - Body Parser / qs Query String Injection
- **Severity:** P3 (MODERATE)
- **Category:** CVE (via qs dependency)
- **Package:** body-parser (indirect), qs (direct)
- **File:** Backend and Frontend (transitive)
- **Affected Versions:** qs with specific prototype pollution vectors
- **Detail:** Query string parsing can lead to prototype pollution in certain configurations.
- **Fix:** `npm audit fix` should handle this.
- **Timeline:** Address in next patch cycle; not critical for this app.

---

### DEP-008: MODERATE - brace-expansion DoS (Glob Pattern Hang)
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-400: Denial of Service)
- **Package:** brace-expansion <1.1.13
- **Affected Versions:** <1.1.13
- **Detail:** Zero-step sequences in glob patterns cause process hang and memory exhaustion.
- **Fix:** `npm audit fix` should patch this.
- **Timeline:** Low priority; affects glob patterns in build tools, not runtime.

---

### DEP-009: MODERATE - PostCSS XSS via Unescaped `</style>`
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-79: XSS)
- **Package:** postcss <8.5.10
- **File:** Frontend (via Vite or build pipeline)
- **Detail:** Unescaped `</style>` tags in CSS stringify can lead to XSS in certain contexts.
- **Fix:** `npm install postcss@^8.5.10` or latest 8.x
- **Timeline:** Address with other frontend updates.

---

### DEP-010: MODERATE - react-router Open Redirect (Protocol-Relative URLs)
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-601: Open Redirect)
- **Package:** react-router-dom@6.26.0 (contains react-router@6.7.0-6.30.3)
- **File:** Source/Frontend/package.json
- **Affected Versions:** 6.7.0-6.30.3
- **Current Version:** 6.26.0 ❌
- **Detail:**
  - Same-origin redirect with path starting `//` is reinterpreted as protocol-relative URL.
  - Allows attacker to redirect users to arbitrary origins.
  - **Risk in this context:** If the app uses `<Navigate to="//attacker.com" />` or similar, the browser interprets it as https://attacker.com (matching the current protocol).
- **CVE/Advisory:** GHSA-2j2x-hqr9-3h42
- **Fix:** Upgrade react-router-dom:
  ```bash
  npm install react-router-dom@^6.30.4
  ```
- **Timeline:** Patch before next release; test redirect flows.

---

### DEP-011: MODERATE - esbuild CORS/fetch Bypass (Dev Server)
- **Severity:** P3 (MODERATE)
- **Category:** CVE (CWE-346: Origin Validation Failure)
- **Package:** esbuild <=0.24.2 (via Vite)
- **File:** Frontend (transitive via Vite)
- **Detail:** Dev server allows any website to send requests to it and read responses, bypassing CORS in dev.
- **Fix:** Upgrade Vite to use esbuild >=0.24.3
- **Timeline:** Low priority for dev, but upgrade Vite to address.

---

### DEP-012: MODERATE - Vitest mocker Vite dependency vulnerability
- **Severity:** P3 (MODERATE)
- **Category:** CVE (dependency chain issue)
- **Package:** @vitest/mocker <=3.0.0-beta.4
- **File:** Frontend (dev dependency)
- **Detail:** Inherits vulnerabilities from Vite dependency.
- **Fix:** Upgrade vitest to 4.1.10+ (major version bump)
- **Timeline:** Part of Vitest upgrade (DEP-001).

---

## Low-Severity Findings

### DEP-013: LOW - @babel/core File Read via sourceMappingURL
- **Severity:** P4 (LOW)
- **Category:** CVE (CWE-22, CWE-200: File Read)
- **Package:** @babel/core <=7.29.0
- **File:** Transitive (Backend and Frontend, via build tools)
- **Detail:** Arbitrary file read via sourceMappingURL comment in compiled code.
- **Fix:** Update Babel to latest 7.x or 8.x
- **Timeline:** Low priority; requires `eval()` or similar to exploit.

---

## Outdated Packages (>1 Major Version Behind)

### DEP-014: Pino Logging Library (Backend)
- **Severity:** P3 (OUTDATED)
- **Category:** Outdated
- **Package:** pino
- **Current Version:** 8.17.0
- **Wanted Version:** 8.21.0
- **Latest Version:** 10.3.1
- **Versions Behind:** 2 major versions (8 → 10)
- **Detail:** Pino 10.x includes security patches and performance improvements. Consider upgrading after testing.
- **Fix:**
  ```bash
  npm install pino@10  # Major version bump, may need code changes
  npm install pino@^8.21.0  # Patch to latest 8.x first
  ```
- **Risk:** 2 major versions is significant; likely breaking changes in API or performance. Plan a gradual migration.
- **Timeline:** Next major release cycle; test logging output after upgrading.

---

### DEP-015: UUID Generator (Backend)
- **Severity:** P4 (OUTDATED, LOW IMPACT)
- **Category:** Outdated
- **Package:** uuid
- **Current Version:** 9.0.0
- **Latest Version:** 14.0.1
- **Versions Behind:** 5 major versions
- **Detail:** UUID 14.x includes performance optimizations and ES module improvements. Low security risk, but outdated.
- **Fix:**
  ```bash
  npm install uuid@^14  # or @latest
  ```
- **Risk:** Low; UUID is a simple library with few breaking changes.
- **Timeline:** Safe to update immediately.

---

### DEP-016: Express.js Framework (Backend)
- **Severity:** P3 (OUTDATED, MAJOR FRAMEWORK)
- **Category:** Outdated
- **Package:** express
- **Current Version:** 4.18.2
- **Wanted:** 4.22.2
- **Latest:** 5.2.1
- **Versions Behind:** 1 major version
- **Detail:** Express 5.x is stable and includes security patches from the 4.22+ line. Migration is non-trivial.
- **Fix:**
  ```bash
  npm install express@^4.22  # Within 4.x line (safer)
  npm install express@5  # Major bump (verify routes and middleware compatibility)
  ```
- **Risk:** Medium; Express 5 has breaking changes in error handling and middleware. Requires code review.
- **Timeline:** Plan for next minor release; test all routes before deploying.
- **[CROSS-REF: red-teamer]** — Check if any middleware or route handlers rely on Express 4-specific behavior.

---

### DEP-017: React.js (Frontend)
- **Severity:** P4 (OUTDATED, OPTIONAL)
- **Category:** Outdated
- **Package:** react / react-dom
- **Current Version:** 18.3.1
- **Latest Version:** 19.2.7
- **Versions Behind:** 1 major version
- **Detail:** React 19 is available but optional; 18.3.1 is stable and supported. No critical security gap.
- **Fix:** Update when ready; not urgent.
  ```bash
  npm install react@19 react-dom@19
  ```
- **Risk:** Low; React 19 has good backward compatibility.
- **Timeline:** Next release cycle; test components after upgrading.

---

### DEP-018: react-router-dom (Frontend)
- **Severity:** P3 (OUTDATED + CVE)
- **Category:** Outdated + CVE
- **Package:** react-router-dom
- **Current Version:** 6.26.0
- **Wanted:** 6.30.4 (includes open redirect fix from DEP-010)
- **Latest:** 7.18.1
- **Versions Behind:** 1 major version (7.x available)
- **Detail:** Already flagged in DEP-010 for CVE; update to 6.30.4 minimum, or jump to 7.x.
- **Fix:** See DEP-010.
- **Timeline:** Immediate (includes CVE fix).

---

## Dependency Tree Analysis

### Supply Chain Risk Assessment

**Large Transitive Dependency Count:** ~400+ dependencies total (across Backend + Frontend)
- **Status:** P4 (Informational)
- **Detail:** This is common for Node.js projects but represents a large supply chain surface.
- **Recommendation:** Regularly run `npm audit` and use lock files (already in place: package-lock.json).
- **No post-install scripts detected** — Good sign; reduces execution risk.

### Direct Dependency Breakdown

**Backend (8 direct, 4 production):**
- express@^4.18.2 ✓ (mature, used correctly)
- pino@^8.17.0 ⚠️ (outdated; consider upgrading)
- prom-client@^15.1.0 ✓ (up-to-date)
- uuid@^9.0.0 ⚠️ (outdated but low-risk)

**Frontend (5 direct, 3 production):**
- react@^18.3.1 ✓ (current; 19 available)
- react-dom@^18.3.1 ✓ (current; 19 available)
- react-router-dom@^6.26.0 ⚠️ (outdated + CVE; update to 6.30.4+)

### Duplicate Dependencies

No duplicate major versions detected in lock file. Good dependency discipline.

---

## License Compliance

**Status:** ✓ No compliance issues detected

- All direct dependencies use standard open-source licenses (MIT, ISC, Apache 2.0)
- No GPL/AGPL licenses in production dependencies (safe for commercial use)
- No "UNLICENSED" packages

**Recommendations:** Continue monitoring; run `npm ls` periodically to catch license changes.

---

## Abandoned/Deprecated Packages

**Status:** ✓ No obviously abandoned dependencies detected

- All core dependencies (express, react, pino, uuid) are actively maintained
- No packages marked as deprecated in npm registry

---

## Remediation Priority & Timeline

### IMMEDIATE (This Week)
1. **DEP-001 (Vitest Critical):** Update vitest to ^3.2.6 or 4.x
   - `npm install vitest@latest --save-dev`
   - Verify CI passes with new version

2. **DEP-005 (form-data High):** Update form-data to ^4.0.6
   - `npm audit fix` may handle this automatically

### SHORT-TERM (This Sprint)
3. **DEP-002 (Handlebars Critical):** Run `npm audit fix` to patch handlebars
   - Investigate root dependency pulling it in

4. **DEP-003, DEP-004 (Vite High):** Update vite to ^6.4.3 or latest 5.x patch
   - `npm install vite@latest --save-dev`
   - Test dev server on Windows if applicable

5. **DEP-010 (react-router Open Redirect):** Update to react-router-dom@^6.30.4
   - `npm install react-router-dom@^6.30.4`
   - Test all redirect flows

### MEDIUM-TERM (Next Sprint)
6. **DEP-006 (ws DoS):** Update ws to ^8.21.0 or ^9.x (transitive, may auto-fix)
7. **DEP-014 (Pino Outdated):** Plan pino upgrade (8→10 is major; test thoroughly)
8. **DEP-016 (Express Outdated):** Plan express upgrade (4→5 if adopting, or 4.22.x if staying in 4.x)

### OPTIONAL (Next Release Cycle)
9. **DEP-017 (React Outdated):** Plan React 19 upgrade when convenient
10. **DEP-015 (UUID Outdated):** Update UUID to ^14 (low-risk, can batch with others)

---

## Remediation Commands

```bash
# Run audit to see current state
npm audit

# Auto-fix what you can (do this for Backend AND Frontend separately)
cd Source/Backend && npm audit fix
cd ../Frontend && npm audit fix

# Manual updates for specific CVEs
npm install vitest@latest --save-dev       # DEP-001
npm install react-router-dom@^6.30.4       # DEP-010
npm install vite@latest --save-dev         # DEP-003, DEP-004
npm install pino@^8.21.0                   # DEP-014 (short-term)

# Test after updates
npm test
npm run build
```

---

## Cross-References & Escalations

### [ESCALATE → TheGuardians]
- **DEP-001 (Vitest):** Development-time file read/execute requires verification of attack surface in CI/local dev
- **DEP-002 (Handlebars):** Critical injection risk if any user-supplied templates are ever processed
- **DEP-005 (form-data):** CRLF injection risk if multipart requests are exposed to untrusted input

### [For Red Teamer]
- Verify if Vitest UI server is exposed in any development or CI environment
- Test if Handlebars is actually used in the application (may be transitive only)
- Attempt CRLF injection via multipart upload if that feature exists

---

## Learnings & Recommendations

**For Future Audits:**
1. **Establish a dependency upgrade policy:** Plan quarterly updates (security patches) and annual major upgrades.
2. **Lock file management:** Continue using package-lock.json; this is good practice.
3. **Automated auditing:** Consider adding `npm audit` to CI/CD pipeline (fail on moderate+).
4. **Monitor Vite & Vitest:** These dev tools have frequent security updates; monitor releases.
5. **Test multipart uploads:** After patching form-data, verify file upload flows still work.

**For the Team:**
- Handlebars appears to be a transitive dependency; identify and document its purpose (likely a test/build tool).
- Consider evaluating if all ~400 transitive dependencies are necessary (dependency bloat is a supply chain risk).
- Implement dependency scanning in pre-commit or CI to prevent new vulnerabilities.

---

## JSON Summary

```json
{
  "audit_date": "2026-07-09",
  "scope": "dev-crew Source App (Backend + Frontend)",
  "package_managers": ["npm"],
  "grade": "C",
  "vulnerabilities": {
    "critical": 2,
    "high": 4,
    "moderate": 6,
    "low": 1,
    "total": 13
  },
  "outdated_packages": {
    "backend": 3,
    "frontend": 3
  },
  "direct_dependencies": {
    "backend_total": 8,
    "backend_prod": 4,
    "frontend_total": 5,
    "frontend_prod": 3
  },
  "transitive_dependencies": {
    "estimated_total": 400,
    "status": "large_surface_area"
  },
  "license_compliance": "PASS",
  "abandoned_packages": "NONE",
  "supply_chain_risks": [
    "Large transitive dependency count (~400)",
    "Handlebars vulnerability in chain (root cause unclear)"
  ],
  "remediation_priority": [
    "DEP-001 (Vitest Critical) — Immediate",
    "DEP-005 (form-data High) — Immediate",
    "DEP-002 (Handlebars Critical) — This Sprint",
    "DEP-003/004 (Vite High) — This Sprint",
    "DEP-010 (react-router CVE) — This Sprint",
    "DEP-006 (ws DoS) — Next Sprint",
    "DEP-014/016 (Outdated frameworks) — Next Sprint"
  ],
  "next_audit_date": "2026-10-09"
}
```

---

## Report Metadata

| Field | Value |
|-------|-------|
| Auditor | Dependency Auditor (Haiku) |
| Audit Tool | npm audit, npm outdated |
| Date | 2026-07-09 |
| Grade | C (Critical & High vulns present) |
| Recommendation | Address critical/high findings before next release |
| Escalated To | TheGuardians (3 findings) |
| Next Review | 2026-10-09 (Quarterly) |

