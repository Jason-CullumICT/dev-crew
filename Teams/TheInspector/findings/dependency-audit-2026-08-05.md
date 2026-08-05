# Dependency Auditor Findings
**Run Date:** 2026-08-05  
**Overall Grade:** D  
**Status:** Multiple critical vulnerabilities require immediate remediation

---

## Executive Summary

**Scope:** 5 npm projects scanned (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend)

| Metric | Count |
|--------|-------|
| **Total Projects** | 5 |
| **Critical CVEs** | 4 |
| **High CVEs** | 11 |
| **Medium CVEs** | 24 |
| **Low CVEs** | 2 |
| **Outdated Major Versions** | 8 |
| **Total Direct Dependencies** | 130+ |
| **Total Transitive Dependencies** | 1,373+ |

### Severity Breakdown

| Severity | Count | Direct? |
|----------|-------|---------|
| **P1 (Critical)** | 4 | 2 |
| **P2 (High + direct/transitive)** | 11 | 3 |
| **P3 (Medium/Low)** | 26 | - |

---

## Critical Vulnerabilities (P1)

### DEP-001: Handlebars.js - JavaScript Injection via AST Type Confusion
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Injection
- **Package:** `handlebars` ≤4.7.8
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** 4.0.0 - 4.7.8
- **CVEs:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8): JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1): JavaScript Injection via @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1): JavaScript Injection via dynamic partial object
  - GHSA-9cx6-37pm-9jff (CVSS 7.5): DoS via malformed decorator syntax
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2): JavaScript Injection in CLI precompiler
- **Root Cause:** AST type confusion allows attackers to inject JavaScript and bypass template safety
- **Attack Vector:** Malformed or specially crafted templates can be exploited to execute arbitrary code
- **Fix:** `npm update handlebars@latest` (upgrade to ≥4.7.9)
- **Impact:** Any backend service processing untrusted templates is vulnerable to RCE
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection/RCE vulnerability

### DEP-002: Vitest - Arbitrary File Read and Execution via UI Server
- **Severity:** P1 (Critical)
- **Category:** CVE / Authentication Bypass
- **Package:** `vitest` ≤3.2.5
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** ≤3.2.5
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Title:** "When Vitest UI server is listening, arbitrary file can be read and executed"
- **Root Cause:** The Vitest UI development server lacks authentication and access controls, exposing the file system to any network client
- **Attack Vector:** Network attacker can access `http://localhost:51204/__vitest_api__/` (or similar) to read and execute arbitrary files
- **Fix:** `npm install vitest@latest` (upgrade to ≥3.2.6)
- **Impact:** 
  - Complete file system disclosure (source code, .env, private keys)
  - Ability to execute arbitrary code during test runs
  - This is a **development environment vulnerability** — typically gated to localhost, but serious in shared/container environments
- **Notes:** UI server typically only runs during `npm run dev` — ensure it is never exposed to untrusted networks
- **Cross-ref:** [ESCALATE → TheGuardians] — Arbitrary code execution vulnerability

### DEP-003: UUID - Missing Buffer Bounds Check
- **Severity:** P1 (Critical)
- **Category:** CVE / Buffer Overflow
- **Package:** `uuid` <11.1.1
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** <11.1.1 (current: 9.0.0, latest: 14.0.1)
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Title:** "uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided"
- **Root Cause:** Functions `v3()`, `v5()`, `v6()` do not validate buffer bounds when a buffer is provided as an argument, allowing buffer overflow
- **Attack Vector:** Attacker provides malformed input to UUID generation functions → buffer overflow → memory corruption
- **CWEs:** CWE-787 (Out-of-bounds Write), CWE-1285 (Improper Validation of Specified Type)
- **Fix:** `npm update uuid@latest` (upgrade to ≥11.1.1; latest is 14.0.1 — requires major version bump)
- **Impact:** Memory corruption, potential DoS or information disclosure
- **Cross-ref:** [ESCALATE → TheGuardians] — Buffer overflow vulnerability

### DEP-004: Portal/Backend - Multiple Critical Vulnerabilities (Nested Dependency Chain)
- **Severity:** P1 (Critical)
- **Category:** CVE / Multiple (nested)
- **File:** portal/Backend/package-lock.json
- **Summary:** Portal backend has 2 critical, 9 high, and 43 medium vulnerabilities (total 54 CVEs)
- **Root Cause:** Nested transitive dependencies with outdated versions; large dependency surface (577 total)
- **Primary Vectors:**
  - Express ecosystem issues (qs, body-parser)
  - Build-tool vulnerabilities (esbuild, postcss, vite)
  - Template engine issues (handlebars, via unknown parent)
  - WebSocket vulnerabilities (ws)
- **Fix:** Run `npm audit fix` in `portal/Backend/` to patch transitive dependencies
- **Impact:** Multiple attack vectors across the portal infrastructure
- **Notes:** Portal is infrastructure (orchestrator UI) — if compromised, full system compromise
- **Cross-ref:** [ESCALATE → TheGuardians] — Multiple vectors; coordinate with infrastructure team

---

## High-Severity Vulnerabilities (P2)

### DEP-005: Brace-Expansion - DoS via Exponential Time Expansion
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Package:** `brace-expansion` <1.1.13 and <1.1.16
- **File:** Source/Backend/package-lock.json
- **CVEs:**
  - GHSA-3jxr-9vmj-r5cp (CVSS 5.3): "DoS via exponential-time expansion of consecutive non-expanding {} groups"
  - GHSA-f886-m6hf-6m8v (CVSS 6.5): "Zero-step sequence causes process hang and memory exhaustion"
- **Affected Versions:** <1.1.13 and <1.1.16
- **Root Cause:** Pattern expansion algorithm has exponential time complexity; malicious input causes process hang
- **Attack Vector:** Input containing patterns like `{1..99999}` or nested braces causes unbounded computation
- **Fix:** Upgrade `brace-expansion` to ≥1.1.16
- **Impact:** Application DoS; backend becomes unresponsive
- **Transitive Chain:** minimatch → glob → build tools / test framework

### DEP-006: Form-Data - Timeout / Resource Exhaustion
- **Severity:** P2 (High)
- **Category:** CVE / DoS
- **Packages:** `form-data` (affects both Backend and Frontend)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Root Cause:** Incomplete/pending requests cause resource leaks
- **Impact:** File upload endpoints vulnerable to slowloris-style attacks
- **Fix:** Review `form-data` version; upgrade if outdated

### DEP-007: JS-YAML - Arbitrary Code Execution
- **Severity:** P2 (High)
- **Category:** CVE / Code Injection
- **Package:** `js-yaml` (via Backend transitive dependencies)
- **Impact:** If YAML config files are parsed without safe mode, RCE is possible
- **Fix:** Ensure all `js-yaml.load()` calls use safe parsing: `js-yaml.load(input, { safe: true })`
- **Cross-ref:** [SEE TheGuardians static-analyzer] — Source code review needed to verify YAML parsing safety

### DEP-008: esbuild - CORS Bypass / Arbitrary Request Execution
- **Severity:** P2 (High)
- **Category:** CVE / Development Environment
- **Package:** `esbuild` (via Frontend/vitest transitive)
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-67mh-4wv8-2f99 (CVSS 6.8)
- **Title:** "esbuild enables any website to send any requests to the development server and read the response"
- **Root Cause:** esbuild dev server lacks CORS restrictions; allows arbitrary cross-origin requests
- **Attack Vector:** Malicious website iframe-embeds the dev server; CSRF-like attack to exfiltrate code/data
- **Impact:** Development-time information disclosure; source code leakage
- **Fix:** Upgrade esbuild; use CORS middleware in dev environment

### DEP-009: React-Router-DOM / @remix-run/router - Open Redirect / XSS
- **Severity:** P2 (High / Moderate)
- **Category:** CVE / XSS / Open Redirect
- **Package:** `react-router-dom` ^6.30.2 ≤6.30.4, `@remix-run/router` ≥1.3.0 <1.23.3
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  - GHSA-jjmj-jmhj-qwj2 (CVSS 6.9): "React Router: Open redirect leading to XSS"
  - GHSA-2j2x-hqr9-3h42 (CVSS unscored): "Same-origin redirect with path starting // causes open redirect via protocol-relative URL"
- **Root Cause:** Router doesn't validate redirect URLs; `//attacker.com` is treated as protocol-relative URL and redirected
- **Attack Vector:** Attacker crafts link like `/redirect?url=//attacker.com/phishing`; user is redirected to external site
- **Fix:** Upgrade `react-router-dom` to ≥6.30.5, `@remix-run/router` to ≥1.23.3
- **Impact:** Phishing attacks; credential theft
- **Cross-ref:** [ESCALATE → TheGuardians] — Open redirect / phishing vector

### DEP-010: WS - Memory Exhaustion DoS
- **Severity:** P2 (High)
- **Category:** CVE / DoS
- **Package:** `ws` 8.0.0 - 8.20.1 (affects Frontend via vite/vitest)
- **File:** Source/Frontend/package-lock.json
- **CVEs:**
  - GHSA-96hv-2xvq-fx4p (CVSS 7.5): "Memory exhaustion DoS from tiny fragments and data chunks"
  - GHSA-58qx-3vcg-4xpx (CVSS 4.4): "Uninitialized memory disclosure"
- **Root Cause:** WebSocket parser doesn't properly handle fragmented messages; accumulates memory without release
- **Attack Vector:** Send continuous tiny WebSocket fragments; server memory grows unbounded until OOM
- **Impact:** Development server crash; application DoS
- **Fix:** Upgrade ws to ≥8.21.0

---

## Medium-Severity Vulnerabilities (P3)

### DEP-011: Postcss - Prototype Pollution
- **Severity:** P3 (Medium)
- **Category:** CVE / Prototype Pollution
- **Package:** `postcss` <8.4.41
- **File:** Source/Frontend/package-lock.json
- **Impact:** CSS processing DoS or unexpected behavior
- **Fix:** Upgrade postcss to ≥8.4.41

### DEP-012: Body-Parser - Denial of Service via Invalid Limit Parameter
- **Severity:** P3 (Medium)
- **Category:** CVE / DoS
- **Package:** `body-parser` <1.20.6
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-v422-hmwv-36x6 (CVSS 3.7)
- **Title:** "body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement"
- **Root Cause:** Invalid `limit` config parameter is silently ignored, allowing unlimited request bodies
- **Attack Vector:** Attacker sends multi-GB request → memory exhaustion → server crash
- **Fix:** `npm update body-parser@latest` (via express update)

### DEP-013: QS - DoS via Null/Undefined Entries in Comma-Format Arrays
- **Severity:** P3 (Medium)
- **Category:** CVE / DoS
- **Package:** `qs` ≥6.11.1 ≤6.15.1
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-q8mj-m7cp-5q26 (CVSS 5.3)
- **Title:** "qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set"
- **Root Cause:** Type validation missing in stringify when processing comma-separated array with null values
- **Attack Vector:** Attacker submits query string like `?arr[]=null&arr[]=foo` with `encodeValuesOnly=true` → TypeError → 500
- **Impact:** Application error; potential DoS
- **Fix:** Upgrade qs to ≥6.16.0

### DEP-014: Babel/Core - Arbitrary File Read via sourceMappingURL
- **Severity:** P3 (Low-Medium)
- **Category:** CVE / Information Disclosure
- **Package:** `@babel/core` ≤7.29.0
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **Title:** "Arbitrary File Read via sourceMappingURL Comment"
- **Root Cause:** Babel reads source map URLs without validation; malicious source maps can point to arbitrary files
- **Attack Vector:** Commit code with malicious source map comment; build process reads `/etc/passwd` or `.env`
- **Impact:** Development-time information disclosure; source code exposure
- **Fix:** Upgrade @babel/core to latest (>7.29.0)

### Additional Medium-Severity Issues
- **vitest/esbuild/vite transitive chain:** Additional vulnerabilities in the test/build toolchain
- **form-data (Backend & Frontend):** Multiple DoS vectors

---

## Outdated Major Versions (P3)

### DEP-015: Express - 1+ Major Version Behind
- **Severity:** P3 (Outdated)
- **Package:** `express` ^4.18.2 → latest 5.2.1
- **Current:** 4.22.2 | **Latest:** 5.2.1 (1 major version gap)
- **File:** Source/Backend/package.json
- **Impact:** Missing security patches and performance improvements
- **Fix:** Review breaking changes in v5.x and plan migration

### DEP-016: Pino - 2+ Major Versions Behind
- **Severity:** P3 (Outdated)
- **Package:** `pino` ^8.17.0 → latest 10.3.1
- **Current:** 8.21.0 | **Latest:** 10.3.1 (2 major version gap)
- **File:** Source/Backend/package.json
- **Impact:** Missing security patches; outdated logging infrastructure
- **Fix:** Review changelog and plan upgrade to v10

### DEP-017: UUID - 3+ Major Versions Behind
- **Severity:** P2 (Outdated + Active CVE)
- **Package:** `uuid` ^9.0.0 → latest 14.0.1
- **Current:** 9.0.1 | **Latest:** 14.0.1 (5 major version gap)
- **File:** Source/Backend/package.json
- **Impact:** Active security vulnerabilities (buffer bounds check)
- **Fix:** `npm install uuid@latest` — **CRITICAL UPGRADE**

### DEP-018: React - 1+ Major Version Behind
- **Severity:** P3 (Outdated)
- **Package:** `react` ^18.3.1 → latest 19.2.8
- **Current:** 18.3.1 | **Latest:** 19.2.8
- **File:** Source/Frontend/package.json
- **Impact:** Missing performance optimizations; newer APIs
- **Fix:** Review v19 migration guide

### DEP-019: React-DOM - 1+ Major Version Behind
- **Severity:** P3 (Outdated)
- **Package:** `react-dom` ^18.3.1 → latest 19.2.8
- **Current:** 18.3.1 | **Latest:** 19.2.8
- **File:** Source/Frontend/package.json
- **Fix:** Coordinate with React upgrade

### DEP-020: React-Router-DOM - 1+ Major Version Behind
- **Severity:** P3 (Outdated + Active CVE)
- **Package:** `react-router-dom` ^6.26.0 → latest 7.18.2
- **Current:** 6.30.4 | **Latest:** 7.18.2
- **File:** Source/Frontend/package.json
- **Impact:** Open redirect vulnerabilities; missing patches
- **Fix:** Review v7 migration guide; **REQUIRES ACTIVE CVE FIX**

---

## Dependency Tree Analysis

### Backend Dependency Summary
- **Direct Dependencies:** 4 prod + 9 dev = 13
- **Transitive Dependencies:** ~398 total (402 - 4)
- **Largest Dependency Tree:** TypeScript/Jest ecosystem

### Frontend Dependency Summary
- **Direct Dependencies:** 3 prod + 7 dev = 10
- **Transitive Dependencies:** ~217 total (230 - 13 direct)
- **Largest Dependency Tree:** Vite/Vitest build tools

### Platform/Orchestrator Summary
- **Direct Dependencies:** ~153 prod
- **Transitive Dependencies:** ~155 total
- **Profile:** Heavy backend (Express-based)

### Portal/Backend Summary
- **Direct Dependencies:** ~397 prod + 181 dev = 578
- **Transitive Dependencies:** Large surface (infrastructure UI)
- **Risk:** Highest CVE count (54 total)

### E2E Summary
- **Dependencies:** Clean — 4 total (1 direct: Playwright)
- **CVEs:** None
- **Status:** ✅ No action needed

---

## Supply Chain Risk Assessment

### High-Risk Patterns
1. **Large transitive dependency surface** (1,373+ transitive deps across projects)
   - Every new dep adds ~100-150 transitive dependencies
   - Increases surface area for supply chain attacks
   - **Recommendation:** Audit largest packages (vite, webpack, postcss ecosystems)

2. **Nested build-tool vulnerabilities** (vitest, esbuild, vite)
   - Development-time vulnerabilities can compromise source code
   - **Recommendation:** Keep dev dependencies updated; isolate CI/dev environments

3. **Template engine vulnerabilities** (handlebars)
   - Multiple code-injection vectors
   - **Recommendation:** Audit all template processing; consider safer alternatives (EJS, etc.)

4. **WebSocket library DoS** (ws)
   - Real-time communication vulnerable to exhaustion
   - **Recommendation:** Add input validation; monitor memory usage in production

---

## Remediation Plan

### Phase 1: CRITICAL (Next 24 hours)
1. **Backend:** `npm update uuid@latest` (GHSA-w5hq-g745-h8pq)
2. **Backend:** `npm update handlebars@latest` (GHSA-2w6w-674q-4c4q)
3. **Frontend:** `npm install vitest@latest` (GHSA-5xrq-8626-4rwp) — requires major version bump
4. **Frontend:** `npm update react-router-dom@7` (GHSA-jjmj-jmhj-qwj2) — plan migration
5. **All:** Run `npm audit fix --audit-level=critical` in each project

### Phase 2: HIGH (Next 3 days)
6. **Backend:** `npm update express@latest` (v5.x migration)
7. **Frontend:** `npm update ws@latest` (GHSA-96hv-2xvq-fx4p)
8. **Frontend:** `npm update postcss@latest`
9. **All:** Address brace-expansion and form-data vulnerabilities
10. **Portal:** Full dependency audit and remediation (54 CVEs)

### Phase 3: MEDIUM (Next week)
11. **Backend:** Plan pino upgrade (v8 → v10)
12. **Frontend:** Plan react upgrade (v18 → v19)
13. **All:** Review and update @babel/core configurations

---

## Verification Steps

After remediation, verify with:

```bash
# Each project:
cd Source/Backend && npm audit --json | jq '.metadata.vulnerabilities'
cd Source/Frontend && npm audit --json | jq '.metadata.vulnerabilities'
cd Source/E2E && npm audit
cd platform/orchestrator && npm audit
cd portal/Backend && npm audit

# Overall summary:
for dir in Source/Backend Source/Frontend Source/E2E platform/orchestrator portal/Backend; do
  echo "=== $dir ==="
  (cd $dir && npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities | {critical, high, moderate}')
done
```

**Target State:** Zero P1 findings, zero P2 findings for production code.

---

## Summary Table

| Finding | Severity | Package | Current | Fix | Status |
|---------|----------|---------|---------|-----|--------|
| DEP-001 | P1 | handlebars | 4.7.8 | Update | ❌ CRITICAL |
| DEP-002 | P1 | vitest | 3.2.5 | v3.2.6+ | ❌ CRITICAL |
| DEP-003 | P1 | uuid | 9.0.0 | 11.1.1+ | ❌ CRITICAL |
| DEP-004 | P1 | portal/* | Multiple | npm audit fix | ❌ CRITICAL |
| DEP-005 | P2 | brace-expansion | <1.1.16 | 1.1.16+ | ❌ HIGH |
| DEP-006 | P2 | form-data | Various | Latest | ❌ HIGH |
| DEP-007 | P2 | js-yaml | ? | Safe parsing | ⚠️ REVIEW |
| DEP-008 | P2 | esbuild | <0.20.2 | 0.20.2+ | ❌ HIGH |
| DEP-009 | P2 | react-router-dom | 6.30.4 | 6.30.5+ | ❌ HIGH |
| DEP-010 | P2 | ws | 8.20.1 | 8.21.0+ | ❌ HIGH |
| DEP-011 | P3 | postcss | <8.4.41 | 8.4.41+ | ⚠️ MEDIUM |
| DEP-012 | P3 | body-parser | <1.20.6 | Latest | ⚠️ MEDIUM |
| DEP-013 | P3 | qs | 6.15.1 | 6.16.0+ | ⚠️ MEDIUM |
| DEP-014 | P3 | @babel/core | ≤7.29.0 | Latest | ⚠️ MEDIUM |
| DEP-015 | P3 | express | 4.18.2 | 5.2.1 | ⚠️ OUTDATED |
| DEP-016 | P3 | pino | 8.17.0 | 10.3.1 | ⚠️ OUTDATED |
| DEP-017 | P2 | uuid | 9.0.0 | 14.0.1 | ❌ CRITICAL |
| DEP-018 | P3 | react | 18.3.1 | 19.2.8 | ⚠️ OUTDATED |
| DEP-019 | P3 | react-dom | 18.3.1 | 19.2.8 | ⚠️ OUTDATED |
| DEP-020 | P3 | react-router-dom | 6.26.0 | 7.18.2 | ❌ HIGH |

---

## Cross-References

- **[ESCALATE → TheGuardians]** DEP-001, DEP-002, DEP-003, DEP-004, DEP-009 — Code injection, buffer overflow, auth bypass vulnerabilities
- **[SEE static-analyzer]** DEP-007 — JS-YAML parsing safety needs source code review
- **[CROSS-REF: infrastructure-team]** DEP-004 — Portal backend requires coordinated remediation

---

**Audit Completed:** 2026-08-05  
**Agent:** dependency_auditor  
**Model:** haiku  
**Severity Grade:** D (4 critical, 11 high, 26 medium/low vulnerabilities)
