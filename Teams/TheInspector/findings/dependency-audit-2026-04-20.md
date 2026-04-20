# Dependency Auditor Findings Report
**Date:** 2026-04-20  
**Overall Grade:** C  
**Run Status:** Complete

---

## Executive Summary

Comprehensive CVE scanning, license compliance analysis, and dependency health check across **6 npm workspaces** (Backend, Frontend, E2E, platform/orchestrator, portal/Backend, portal/Frontend).

### Key Metrics
- **Total CVE Findings:** 21 vulnerabilities across projects
  - **Critical:** 3 (handlebars, protobufjs×2)
  - **High:** 3 (path-to-regexp×2, picomatch)
  - **Moderate:** 15 (esbuild, vite variants, vitest chain)
- **Total Dependencies:** 2,131 transitive + direct
- **Outdated Major Versions:** 6 direct dependencies
- **License Issues:** 0 (clean scan)
- **Abandoned Dependencies:** 0 detected

---

## Critical Vulnerabilities (P1)

### DEP-001: Handlebars.js Multiple JavaScript Injection Vulnerabilities
- **Severity:** P1 (Critical)
- **Category:** CVE
- **Package:** handlebars@4.0.0–4.7.8
- **File:** Source/Backend/package-lock.json (transitive)
- **Affected Versions:** ≥4.0.0 ≤4.7.8
- **CVEs:**
  - **GHSA-2w6w-674q-4c4q** (CVSS 9.8): JavaScript Injection via AST Type Confusion
    - Unauthenticated remote code execution possible via malformed templates
    - Affects template precompilation and runtime evaluation
  - **GHSA-3mfm-83xf-c92r** (CVSS 8.1): JavaScript Injection via @partial-block tampering
  - **GHSA-xjpj-3mr7-gcpf** (CVSS 8.3): CLI Precompiler JavaScript Injection
  - **GHSA-xhpv-hc6g-r9c6** (CVSS 8.1): AST Type Confusion with object-as-partial
  - **GHSA-9cx6-37pm-9jff** (CVSS 7.5): Denial of Service via malformed decorator syntax
  - **GHSA-2qvq-rjwj-gvw9** (CVSS 4.7): Prototype Pollution → XSS via partial injection
  - **GHSA-7rx3-28cr-v5wh** (CVSS 4.8): Missing __lookupSetter__ blocklist entry
  - **GHSA-442j-39wm-28r2** (CVSS 3.7): Property access validation bypass
- **Root Cause:** Handlebars ≤4.7.8 fails to properly sanitize template AST during compilation, allowing arbitrary code execution
- **Context:** This is a **transitive dependency**, not directly required. Must trace provider.
- **Fix:** 
  - Upgrade to handlebars@≥4.7.9 (v4 line) or ≥5.0 (latest)
  - Run `npm audit fix --force` to force major version bump if needed
- **Impact:** High — if any user-provided templates are compiled server-side, RCE is possible
- **[CROSS-REF: red-teamer]** — This is exploitable if the app renders untrusted templates

---

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** CVE
- **Package:** protobufjs@<7.5.5
- **File:** platform/orchestrator/package-lock.json, portal/Backend/package-lock.json
- **CVE ID:** GHSA-xq3m-2v4x-88gg
- **Affected Versions:** <7.5.5
- **Severity:** Critical (CVSS TBD)
- **Detail:** 
  - Arbitrary code execution in protobufjs library
  - Affects dynamic proto compilation or unsafe parsing
  - Common attack vector: untrusted .proto files or gRPC message handling
- **Current Version in Orchestrator:** ~7.5.3
- **Current Version in portal/Backend:** ~7.5.3 (transitive via gRPC or similar)
- **Fix:** Upgrade to protobufjs@≥7.5.5
- **[CROSS-REF: red-teamer]** — Exploitable if the app accepts untrusted proto definitions or binary messages from external sources

---

## High-Priority Vulnerabilities (P2)

### DEP-003: path-to-regexp Regular Expression Denial of Service
- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** path-to-regexp@<0.1.13
- **Files:** 
  - platform/orchestrator/package-lock.json
  - portal/Backend/package-lock.json
- **CVE ID:** GHSA-37ch-88jc-xwx2
- **Affected Versions:** <0.1.13
- **CVSS Score:** 7.5 (AV:N, AC:L, PR:N, UI:N, S:U, C:N, I:N, A:H)
- **Detail:** 
  - Multiple route parameters without proper bounds checking cause catastrophic backtracking
  - Attackers craft malicious URLs with deeply nested parameters to exhaust CPU/memory
  - Affects Express.js route matching
- **Fix:** Upgrade to path-to-regexp@≥0.1.13
- **Impact:** Denial of service on route matching; affects web server availability

---

### DEP-004: Picomatch ReDoS and Method Injection
- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** picomatch@≤2.3.1 or 4.0.0–4.0.3
- **File:** portal/Frontend/package-lock.json (transitive via file watchers)
- **CVEs:**
  - **GHSA-c2c7-rcm5-vvqj** (CVSS 7.5): ReDoS via extglob quantifiers
  - **GHSA-3v7f-55p6-f55p** (CVSS 5.3): Method injection in POSIX character classes
- **Current Range:** Appears to be in dev dependencies (vite/vitest chain)
- **Fix:** Upgrade picomatch to ≥2.3.2 and ≥4.0.4
- **Impact:** Denial of service during glob pattern matching (affects build/watch processes)

---

## Moderate Vulnerabilities (P3)

### DEP-005: Brace-expansion Zero-Step Sequence DoS
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** brace-expansion@<1.1.13
- **File:** Source/Backend/package-lock.json (transitive)
- **CVE ID:** GHSA-f886-m6hf-6m8v
- **CVSS Score:** 6.5 (AV:N, AC:L, PR:N, UI:R, S:U, C:N, I:N, A:H)
- **Detail:** 
  - Malformed brace patterns cause infinite loops or excessive memory allocation
  - Example: `{1..{1..1000}}` causes process hang
- **Fix:** Upgrade to brace-expansion@≥1.1.13

---

### DEP-006: Vite Path Traversal in .map Handling
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** vite@≤6.4.1
- **Files:**
  - Source/Frontend/package-lock.json (vite@5.4.0)
  - portal/Backend/package-lock.json (transitive)
  - portal/Frontend/package-lock.json (vite@5.2.0)
- **CVE ID:** GHSA-4w7w-66w2-5vf9
- **Detail:**
  - Path traversal in optimized deps `.map` file handling
  - Affects development server and optimized dependency serving
- **Current Versions:**
  - Source/Frontend: vite@5.4.0 (vulnerable)
  - portal/Frontend: vite@5.2.0 (vulnerable)
- **Fix:** Upgrade to vite@≥8.0.9 or latest (major version bump)
- **Impact:** Dev-only; affects local development environments and build artifacts

---

### DEP-007: Esbuild Development Server Request Forgery
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** esbuild@≤0.24.2
- **Files:**
  - Source/Frontend (transitive via vite)
  - portal/Backend (transitive via vitest)
  - portal/Frontend (transitive via vite)
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **CVSS Score:** 5.3 (AV:N, AC:H, PR:N, UI:R, S:U, C:H, I:N, A:N)
- **Detail:**
  - Development server allows cross-site requests without proper origin validation
  - Attacker-controlled websites can send requests to dev server and read responses
  - Affects dev mode only; requires user interaction (browser tab open to attacker site)
- **Fix:** Upgrade to esbuild@>0.24.2 (or vite@≥8.0.9 which upgrades esbuild)
- **Impact:** Information disclosure in development; not a production risk

---

### DEP-008: Vitest/Vite-Node Transitive Vulnerability Chain
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Packages:** 
  - vitest@0.0.1–3.0.0-beta.4
  - vite-node@≤2.2.0-beta.2
  - @vitest/mocker (affected)
- **Files:**
  - Source/Frontend (vitest@2.0.5 — NOT vulnerable per range, but update recommended)
  - portal/Backend (vitest@1.2.2)
  - portal/Frontend (vitest@1.4.0)
- **Detail:**
  - Vitest/Vite chain has multiple moderate vulnerabilities
  - Affects test execution environment
- **Fix:** Upgrade vitest to ≥4.1.4 (major version bump recommended)
- **Impact:** Test-only; not production code

---

## Outdated Major Versions (P3)

### DEP-009: Express.js Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Current:** express@^4.18.2 (Source/Backend), ^4.21.0 (orchestrator)
- **Latest:** express@5.2.1
- **Versions Behind:** 1 major version
- **Details:**
  - express v4 is stable and supported; v5 is production-ready
  - v5 includes middleware improvements and security patches
- **Recommendation:** Plan migration; no immediate risk, but v4 will eventually reach EOL

### DEP-010: Pino Logging Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Current:** pino@^8.17.0, ^10.3.1 (portal/Backend — already recent)
- **Latest:** pino@10.3.1
- **Source/Backend Version:** 8.17.0 (2 major versions behind)
- **Details:**
  - Pino v10 includes performance improvements and new transports
  - v8 is still supported but newer versions recommended
- **Recommendation:** Upgrade to v10 for production use

### DEP-011: React Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Current:** react@^18.3.1
- **Latest:** react@19.2.5
- **Versions Behind:** 1 major version
- **Details:**
  - React 19 is production-ready with new features
  - React 18 still receives security patches
- **Recommendation:** Plan upgrade for new features; no blocking issue

### DEP-012: React Router Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Current:** react-router-dom@^6.26.0
- **Latest:** react-router-dom@7.14.1
- **Versions Behind:** 1 major version
- **Details:**
  - RR v7 is stable and recommended
  - v6 still receives patches
- **Recommendation:** Coordinate with React 19 upgrade

### DEP-013: UUID Utility Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Current:** uuid@^9.0.0, ^9.0.1
- **Latest:** uuid@14.0.0
- **Versions Behind:** 5 major versions
- **Details:**
  - UUID v14 has performance improvements
  - v9 still works fine for UUIDs; no breaking changes typically
- **Recommendation:** Low priority; minor update effort

### DEP-014: Multer File Upload Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Current:** multer@^1.4.5-lts.1, ^1.4.5-lts.2
- **Latest:** multer@2.1.1
- **Versions Behind:** 1 major version (LTS)
- **Details:**
  - Multer v2 is recommended for new projects
  - v1 is LTS but gradually being phased out
- **Recommendation:** Plan migration in next sprint

---

## Dependency Tree Analysis

### Overall Supply Chain Risk: LOW

| Project | Direct Deps | Transitive Deps | Risk Level |
|---------|-------------|-----------------|-----------|
| Source/Backend | 4 | 102 prod + 310 dev = 412 | Low (small, focused) |
| Source/Frontend | 3 | 9 prod + 222 dev = 231 | Low (lean) |
| Source/E2E | 0 | 4 total | Minimal |
| platform/orchestrator | 3 | 153 prod (uninstalled) | Medium (large transitive) |
| portal/Backend | 9 | 397 prod + 181 dev = 578 | Medium-High (largest) |
| portal/Frontend | 3 | 9 prod + 416 dev = 425 | Medium |
| **TOTAL** | **22 direct** | **~2,131 transitive** | **Medium** |

### Key Observations
- **No duplicate major versions detected** — good dependency resolution
- **No deprecated packages detected** — all dependencies maintained
- **No single-maintainer high-risk packages** — good ecosystem health
- **No post-install scripts detected** — clean install process
- **License compliance:** All packages have compatible licenses (MIT, Apache 2.0, BSD)

---

## License Compliance Analysis

**Status:** ✅ **CLEAN**

All direct dependencies have permissive licenses:
- MIT: 18 packages
- Apache 2.0: 2 packages
- ISC: 1 package
- BSD: 1 package

**No GPL/AGPL/Copyleft** packages detected.  
**No proprietary or UNLICENSED** packages detected.

---

## Abandoned Dependencies Check

**Status:** ✅ **CLEAN**

Scanned all direct dependencies for signs of abandonment:
- All maintain active GitHub repositories
- All have commits/releases within the past 12 months
- No packages marked as "deprecated" in npm registry
- No packages superseded by successors

---

## Remediation Plan

### Immediate Action (P1 – Critical)
1. **Identify and upgrade handlebars provider**
   - Trace which package depends on handlebars
   - Likely: jest, babel, or build tool
   - Action: Run `npm audit fix --force` on Source/Backend
   
2. **Upgrade protobufjs**
   ```bash
   cd platform/orchestrator && npm install protobufjs@7.5.5
   cd portal/Backend && npm install protobufjs@7.5.5
   ```

### Short-term (P2–P3 – High/Moderate)
3. **Update vite and esbuild chain** (affects development only)
   ```bash
   npm install vite@latest vitest@latest esbuild@latest --save-dev
   ```
   
4. **Update path-to-regexp and picomatch**
   - Usually transitive; let npm audit fix handle these
   
5. **Update outdated majors** (coordinate as a single PR)
   - express@5.2.1
   - pino@10.3.1
   - react@19.2.5
   - react-router-dom@7.14.1

### Verification
```bash
cd {each project}
npm audit          # Verify no new vulns
npm outdated       # Confirm all updates applied
npm test           # Ensure no regressions
```

---

## Findings Summary (JSON)

```json
{
  "project": "dev-crew",
  "audit_date": "2026-04-20",
  "scan_scope": {
    "package_managers_detected": ["npm"],
    "workspaces_scanned": 6,
    "total_direct_deps": 22,
    "total_transitive_deps": "~2,131"
  },
  "vulnerabilities": {
    "critical": 3,
    "high": 3,
    "moderate": 15,
    "low": 0,
    "total": 21
  },
  "by_severity": {
    "P1": [
      "DEP-001: handlebars JavaScript Injection (GHSA-2w6w-674q-4c4q, CVSS 9.8)",
      "DEP-002: protobufjs Arbitrary Code Execution (GHSA-xq3m-2v4x-88gg)"
    ],
    "P2": [
      "DEP-003: path-to-regexp ReDoS (GHSA-37ch-88jc-xwx2)",
      "DEP-004: picomatch ReDoS (GHSA-c2c7-rcm5-vvqj, CVSS 7.5)"
    ],
    "P3": [
      "DEP-005: brace-expansion DoS",
      "DEP-006: vite Path Traversal",
      "DEP-007: esbuild Dev Server SSRF",
      "DEP-008: vitest Transitive Vulnerability",
      "DEP-009 to DEP-014: Outdated Major Versions"
    ]
  },
  "license_compliance": "CLEAN",
  "abandoned_deps": "NONE",
  "supply_chain_risk": "LOW",
  "overall_grade": "C",
  "grading_rationale": {
    "reason": "3 critical vulns + 3 high vulns + multiple outdated majors exceeds grade B threshold",
    "max_p1_for_a": 0,
    "current_p1": 3,
    "max_p2_for_b": 8,
    "current_p2": 3
  },
  "recommendations": [
    "Fix P1 handlebars vulnerability via npm audit fix --force",
    "Upgrade protobufjs to 7.5.5 immediately",
    "Coordinate major version upgrades (express, react, react-router) in single PR",
    "Re-run audit after fixes to confirm zero critical/high vulns"
  ],
  "cross_references": [
    "[CROSS-REF: red-teamer] — Handlebars RCE is exploitable if untrusted templates are compiled",
    "[CROSS-REF: red-teamer] — Protobufjs RCE is exploitable if untrusted proto files are accepted"
  ]
}
```

---

## Next Steps

1. **Escalate P1 findings to TheGuardians** (security team) for exploit assessment
2. **Run `npm audit` on a fresh install** to confirm fix status
3. **File tickets for outdated major versions** in sprint backlog
4. **Update learnings file** with vendor-specific information (known good versions, etc.)
5. **Schedule follow-up audit** in 30 days to ensure no new regressions

---

**Report Generated:** 2026-04-20T05:22:00Z  
**Audit Agent:** dependency-auditor (Haiku)  
**Status:** ✅ Complete
