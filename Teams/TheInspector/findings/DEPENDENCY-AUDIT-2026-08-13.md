# Dependency Auditor Findings
**Date:** 2026-08-13  
**Scan Type:** CVE Vulnerabilities, Outdated Packages, License Compliance  
**Total Packages Scanned:** 10 npm workspaces  
**Total Vulnerabilities Found:** 135

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| **Critical CVEs** | 6 | 🔴 IMMEDIATE ACTION REQUIRED |
| **High CVEs** | 42 | 🟠 HIGH PRIORITY |
| **Moderate CVEs** | 73 | 🟡 MEDIUM PRIORITY |
| **Low CVEs** | 4 | 🔵 LOW PRIORITY |

### Critical Risk Assessment

**🔴 CRITICAL FINDINGS:**

1. **`protobufjs` (portal/Backend)** — Arbitrary Code Execution (RCE)
   - **CVSS:** 9.8 (Critical)
   - **Impact:** Complete system compromise possible via crafted protobuf messages
   - **Affected Path:** `portal/Backend/node_modules/protobufjs`
   - **Urgency:** P1 - Remediate immediately

2. **`vitest` UI Server (4 workspaces)** — Arbitrary File Read + Code Execution
   - **CVSS:** 9.8 (Critical)
   - **Impact:** When Vitest UI server is running, any file on disk can be read/executed
   - **Affected Workspaces:** 
     - `Source/Frontend`
     - `portal/Backend` 
     - `portal/Frontend`
     - `platform/orchestrator`
   - **Urgency:** P1 - Disable UI server in production or upgrade

3. **`handlebars` (Source/Backend)** — JavaScript Injection via AST Type Confusion
   - **CVSS:** 9.8 (Critical)
   - **Impact:** Arbitrary code execution via malformed templates
   - **Urgency:** P1 - Upgrade immediately

---

## Vulnerability Breakdown by Workspace

### 🔴 `portal/Backend` (55 vulnerabilities) — HIGHEST RISK
- **Critical:** 2
  - `protobufjs@<6.11.23` — RCE via arbitrary code execution
  - `vitest@<3.2.6` — File read/execute when UI server enabled
- **High:** 10
  - `axios`: Multiple security issues
  - `form-data`: CRLF injection (CWE-93)
  - `postcss`: Arbitrary file read via sourceMappingURL
  - `nanoid`: Infinite loop DoS
  - Others: Authentication, XSS, path traversal issues
- **Moderate:** 43
- **Action Required:** 
  - `npm update protobufjs --save` (→ v6.11.23+)
  - `npm update vitest --save-dev` (→ v3.2.6+)
  - Audit all transitive dependencies from axios

### 🟠 `Source/Frontend` (13 vulnerabilities)
- **Critical:** 1
  - `vitest@<3.2.6` — UI server file read/execute
- **High:** 5
  - `vite@<=6.4.2` — Path traversal + fs.deny bypass
  - `postcss@<=8.5.22` — Arbitrary file read
  - `nanoid@<3.3.17` — Infinite loop DoS
  - `form-data@4.0.0-4.0.5` — CRLF injection
  - `ws` — Unclear from truncated output
- **Moderate:** 6
  - React Router: Multiple open redirects
  - esbuild: CORS bypass on dev server
  - Babel: File read via sourceMappingURL
- **Action Required:**
  - `npm update vitest vite nanoid` (dev only, but still critical)
  - Update `react-router-dom` to 7.18.0+

### 🟡 `Source/Backend` (9 vulnerabilities)
- **Critical:** 1
  - `handlebars@<=4.7.8` — JavaScript injection via AST confusion
- **High:** 3
  - `brace-expansion@<1.1.18` — DoS via unbounded expansion
  - `form-data@4.0.0-4.0.5` — CRLF injection
  - `js-yaml@<3.15.1` — Quadratic CPU via merge keys
- **Moderate:** 4
  - `body-parser`: DoS on invalid limit value
  - `express`: Vulnerable via qs dependency
  - `qs`: DoS on stringify with null entries
  - `uuid@<11.1.1` — Buffer bounds check missing
- **Action Required:**
  - `npm update handlebars --save` (→ 4.7.9+)
  - `npm update brace-expansion js-yaml --save-dev`
  - `npm update uuid --save` (note: v14.0.1 is a major upgrade)

### 🟡 `platform/orchestrator` (9 vulnerabilities)
- **Critical:** 1
  - `vitest` — UI server vulnerability
- **High:** 2
  - `vite` — Path traversal
  - `postcss` — File read via sourceMappingURL
- **Moderate:** 6
- **Note:** Platform infrastructure; changes here affect entire pipeline

### 🟠 `portal/Frontend` (13 vulnerabilities)
- **Critical:** 1
  - `vitest@<3.2.6` — UI server vulnerability
- **High:** 6
  - `postcss@<=8.5.22` — Arbitrary file read (3 separate CVEs)
  - `nanoid@<3.3.17` — Infinite loop DoS
  - `ws` vulnerabilities
- **Moderate:** 5
- **Action Required:** Same as Source/Frontend

### 🟡 `abac-demo`, `abac-reimagined`, `abac-soc-demo`, `abac-soc-demo-v2` (9 each)
- **High:** 7 each (likely same dependencies)
- **Moderate:** 1 each
- **Low:** 1 each
- **Likely CVEs:** postcss, vite, form-data, nanoid, axios, etc.

### 🟢 `Source/E2E` (0 vulnerabilities)
- **Status:** ✅ CLEAN
- **Dependencies:** 4 (minimal test-only dependencies)

---

## Critical CVE Details

### DEP-001: `protobufjs` Arbitrary Code Execution
- **Package:** `protobufjs` (portal/Backend)
- **Severity:** P1 (CRITICAL)
- **Category:** Code Execution / RCE
- **CVE:** GHSA-xq3m-2v4x-88gg
- **URL:** https://github.com/advisories/GHSA-xq3m-2v4x-88gg
- **Description:** Protobufjs allows arbitrary code execution when processing crafted protobuf messages that exploit code generation gadgets.
- **Attack Vector:** Network (AV:N), Low Complexity (AC:L), No Privilege Required (PR:N), No User Interaction (UI:N)
- **CVSS Score:** 9.8
- **Affected Versions:** < 6.11.23
- **Fix:** `npm update protobufjs --save` → 6.11.23+
- **Cross-ref:** [ESCALATE → TheGuardians] — This is exploitable in the runtime if portal/Backend processes untrusted protobuf data.

### DEP-002: `vitest` UI Server Arbitrary File Access
- **Package:** `vitest` (Source/Frontend, portal/Backend, portal/Frontend, platform/orchestrator)
- **Severity:** P1 (CRITICAL)
- **Category:** Information Disclosure / Code Execution
- **CVE:** GHSA-5xrq-8626-4rwp
- **URL:** https://github.com/advisories/GHSA-5xrq-8626-4rwp
- **Description:** When the Vitest UI server is listening (typically on `localhost:51204`), an attacker on the same network can read ANY file on the system and potentially execute code via the server's internal API.
- **CVSS Score:** 9.8
- **Attack Vector:** Network (AV:N), Low Complexity (AC:L)
- **Affected Versions:** < 3.2.6
- **Fix:** 
  - `npm update vitest --save-dev` → 3.2.6+
  - **OR** Disable UI server in production/CI: Remove `test:ui` script or never run it in untrusted environments
- **Notes:** This only affects test environments, but test environments often have access to sensitive data. The vulnerability is in the test runner, not the application itself.

### DEP-003: `handlebars` JavaScript Injection via AST Type Confusion
- **Package:** `handlebars` (Source/Backend)
- **Severity:** P1 (CRITICAL)
- **Category:** Code Injection / Template Injection
- **CVE:** GHSA-2w6w-674q-4c4q
- **URL:** https://github.com/advisories/GHSA-2w6w-674q-4c4q
- **Description:** Handlebars.js allows arbitrary JavaScript injection when processing templates with specially crafted partial names or decorators. An attacker can inject code by manipulating AST nodes during compilation.
- **CVSS Score:** 9.8
- **Attack Vector:** Network (AV:N), Low Complexity (AC:L), No Privilege Required (PR:N)
- **Affected Versions:** 4.0.0 - 4.7.8
- **Fix:** `npm update handlebars --save` → 4.7.9+
- **Impact:** If user-supplied data is used in template names or options, code execution is possible.

---

## High-Severity CVE Summary

### DEP-004: `brace-expansion` DoS via Unbounded Expansion
- **Package:** `brace-expansion` (Source/Backend transitive)
- **Severity:** P2 (HIGH)
- **Category:** Denial of Service
- **Multiple CVEs:**
  - GHSA-f886-m6hf-6m8v — Zero-step sequences cause process hang
  - GHSA-3jxr-9vmj-r5cp — Exponential-time expansion
  - GHSA-mh99-v99m-4gvg — Unbounded expansion → OOM crash
  - GHSA-rgw5-rvv9-x895 — Intermediate arrays bypass (CVE-2026-14257 regression)
- **Affected Versions:** < 1.1.18
- **Fix:** `npm update brace-expansion` → 1.1.18+
- **Impact:** Attacker sends specially crafted input to file globbing operations; backend crashes due to memory exhaustion.

### DEP-005: `form-data` CRLF Injection
- **Package:** `form-data` (Source/Backend, Source/Frontend, portal/Frontend transitive)
- **Severity:** P2 (HIGH)
- **Category:** Header Injection / CRLF Injection
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **URL:** https://github.com/advisories/GHSA-hmw2-7cc7-3qxx
- **Description:** form-data library fails to escape multipart field names and filenames, allowing CRLF injection which can craft malicious HTTP headers.
- **CVSS Score:** 7.5
- **Affected Versions:** 4.0.0 - 4.0.5
- **Fix:** `npm update form-data` → 4.0.6+
- **Impact:** Attacker can inject HTTP headers via form field names, potentially leading to request smuggling or header-based attacks.

### DEP-006: `js-yaml` Quadratic CPU DoS
- **Package:** `js-yaml` (Source/Backend transitive)
- **Severity:** P2 (HIGH)
- **Category:** Denial of Service
- **CVEs:**
  - GHSA-52cp-r559-cp3m — Merge-key chains cause quadratic CPU (CVSS 7.5)
  - GHSA-5p4m-2wfm-xmqj — Unbounded !!omap resolution (CVSS 7.5)
- **Affected Versions:** < 3.15.1
- **Fix:** `npm update js-yaml` → 3.15.1+
- **Impact:** Attacker sends YAML with deeply nested merge keys → quadratic CPU consumption → service DoS.

### DEP-007: `vite` Path Traversal & fs.deny Bypass
- **Package:** `vite` (Source/Frontend, portal/Frontend, platform/orchestrator)
- **Severity:** P2 (HIGH)
- **Category:** Path Traversal / Arbitrary File Read
- **CVE:** GHSA-fx2h-pf6j-xcff (fs.deny bypass on Windows alternate paths)
- **URL:** https://github.com/advisories/GHSA-fx2h-pf6j-xcff
- **CVSS Score:** 7.5
- **Affected Versions:** <= 6.4.2
- **Fix:** `npm update vite` → 6.4.3+ or 8.2.1+ (major bump)
- **Impact:** Dev server can be tricked into serving files outside the allowed root directory via alternate path syntax (e.g., `?import=c:\\..\\..\\..\\windows\\system32\\config\\sam`).

### DEP-008: `postcss` Arbitrary File Read via sourceMappingURL
- **Package:** `postcss` (Source/Frontend, portal/Frontend transitive)
- **Severity:** P2 (HIGH)
- **Category:** Arbitrary File Read / Path Traversal
- **Multiple CVEs:**
  - GHSA-6g55-p6wh-862q — Attacker-controlled sourceMappingURL reads arbitrary .map files
  - GHSA-r28c-9q8g-f849 — Path traversal in sourceMappingURL auto-loading
  - GHSA-fxqj-rqcc-2cmp — Incomplete fix; still reads arbitrary .map when `from` unset
- **CVSS Scores:** 7.5 (multiple)
- **Affected Versions:** <= 8.5.22
- **Fix:** `npm update postcss` → 8.5.23+
- **Impact:** If attacker-controlled CSS is processed (e.g., from user uploads), arbitrary files can be read from disk.

### DEP-009: `nanoid` Infinite Loop DoS
- **Package:** `nanoid` (Source/Frontend, portal/Frontend transitive)
- **Severity:** P2 (HIGH)
- **Category:** Denial of Service
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv — Non-secure generators loop with negative size
  - GHSA-2v37-7h3g-55p8 — Custom generators loop when size is zero
- **CVSS Score:** 5.9 (High)
- **Affected Versions:** < 3.3.17
- **Fix:** `npm update nanoid` → 3.3.17+
- **Impact:** If nanoid is called with zero or negative size, process loops indefinitely and consumes 100% CPU → service DoS.

### DEP-010: `react-router-dom` Open Redirect Leading to XSS
- **Package:** `react-router-dom` (Source/Frontend)
- **Severity:** P2 (HIGH)
- **Category:** Open Redirect / XSS
- **CVEs:**
  - GHSA-jjmj-jmhj-qwj2 — Open redirect leading to XSS (CVSS 6.9)
  - GHSA-2j2x-hqr9-3h42 — Protocol-relative URL reinterpretation (CWE-601)
  - GHSA-wrjc-x8rr-h8h6 — Backslash bypass of prior fix
- **Affected Versions:** 6.0.0 - 7.17.0
- **Fix:** `npm update react-router-dom` → 7.18.2+
- **Impact:** If React Router is used to redirect based on user input, attackers can redirect to malicious sites or inject JavaScript.

---

## Outdated Package Status

### Major Version Gaps (>1 major version behind)

| Package | Current | Wanted | Latest | Gap | Risk |
|---------|---------|--------|--------|-----|------|
| `uuid` (Backend) | 9.0.0 | 9.0.1 | 14.0.1 | +5 | Major — likely missing critical fixes |
| `pino` (Backend) | 8.17.0 | 8.21.0 | 10.3.1 | +2 | High — new security patches |
| `express` (Backend) | 4.18.2 | 4.22.2 | 5.2.1 | +1 | Medium — compatibility required |
| `react` (Frontend) | 18.3.1 | 18.3.1 | 19.2.8 | +1 | Medium — new features/fixes |
| `react-dom` (Frontend) | 18.3.1 | 18.3.1 | 19.2.8 | +1 | Medium — paired with react |

### Packages Requiring Attention
- **`uuid`** — Gap of 5 major versions. Current v9.0.0 has the buffer bounds check bug (DEP-004).
- **`pino`** — Logger; gap of 2 major versions suggests possible security improvements.
- **`react`/`react-dom`** — Gap of 1 major version; not critical but represents staleness.

---

## License Compliance Issues

### Status: ⚠️ REVIEW REQUIRED
**Note:** License checker tool not available in this environment. Performed manual inspection of lock files for known issues.

- **No GPL/AGPL packages detected** (good)
- **No UNLICENSED packages detected** (good)
- **No known license conflicts** (good)

**Recommendation:** Run `npx license-checker --json` in CI to validate before release.

---

## Dependency Tree Analysis

### Transitive Dependency Load

| Workspace | Prod Deps | Dev Deps | Total | Risk |
|-----------|-----------|----------|-------|------|
| Source/Backend | 102 | 310 | 412 | Moderate |
| Source/Frontend | 9 | 222 | 231 | Moderate |
| Source/E2E | 4 | 0 | 4 | ✅ Low |
| platform/orchestrator | ? | ? | ? | Unknown |
| portal/Backend | ? | ? | ? | ⚠️ Likely 200+ |
| portal/Frontend | ? | ? | ? | Unknown |

### Supply Chain Risk Indicators

1. **Front-End Build Tool Chain (Vite, Esbuild, PostCSS)**
   - Multiple vulnerabilities in critical dev dependencies
   - Dev tools have access to source code and can affect builds
   - **Action:** Isolate dev environments from production

2. **Testing Tools (Vitest, Jest)**
   - Vitest UI server is critical RCE vector
   - Jest used in Backend (potentially safer if not UI-exposed)
   - **Action:** Never run test UI servers in shared/networked environments

3. **Transitive Dependency Exposure**
   - 230+ transitive deps in Frontend alone
   - New vulnerabilities discovered regularly
   - **Action:** Implement `npm audit` in CI pipeline; block on critical/high

---

## Remediation Plan

### Phase 1: Critical (48 hours)
1. **protobufjs** (portal/Backend)
   - `npm update protobufjs --save` → 6.11.23+
   - Verify no breaking changes in portal API
   - Test thoroughly before deployment

2. **handlebars** (Source/Backend)
   - `npm update handlebars --save` → 4.7.9+
   - Check if used directly; likely transitive via another package
   - Search codebase for `handlebars` usage

3. **vitest** (all workspaces)
   - `npm update vitest --save-dev` → 3.2.6+
   - Ensure test scripts don't expose UI server in CI
   - Add `--reporter=verbose` to CI test commands (no UI)

### Phase 2: High (1 week)
1. Update brace-expansion, js-yaml, form-data, postcss, nanoid
2. Update vite/esbuild (may require major version bump)
3. Update react-router-dom

### Phase 3: Medium (2 weeks)
1. Address all moderate CVEs
2. Update uuid (major bump from 9 → 14)
3. Audit transitive dependencies for abandoned packages

### Phase 4: Ongoing
1. Add `npm audit` to CI pipeline; block on critical/high
2. Set up dependency update automation (e.g., Dependabot)
3. Monthly CVE re-scans

---

## Findings Reference

| ID | Package | Severity | Category | Status |
|----|---------|----------|----------|--------|
| DEP-001 | protobufjs | P1 | RCE | Awaiting fix |
| DEP-002 | vitest | P1 | File Read/RCE | Awaiting fix |
| DEP-003 | handlebars | P1 | Code Injection | Awaiting fix |
| DEP-004 | brace-expansion | P2 | DoS | Awaiting fix |
| DEP-005 | form-data | P2 | Header Injection | Awaiting fix |
| DEP-006 | js-yaml | P2 | DoS | Awaiting fix |
| DEP-007 | vite | P2 | Path Traversal | Awaiting fix |
| DEP-008 | postcss | P2 | File Read | Awaiting fix |
| DEP-009 | nanoid | P2 | DoS | Awaiting fix |
| DEP-010 | react-router-dom | P2 | Open Redirect | Awaiting fix |

---

## Learnings & Next Steps

1. **Portal/Backend has critical exposure** — protobufjs RCE is business-critical if portal processes untrusted data
2. **Test infrastructure security gaps** — vitest UI server should never be exposed; ensure CI scripts don't enable it
3. **React Router ecosystem drift** — Multiple releases behind current; needs systematic updating
4. **No Go/Python/Rust dependencies detected** — npm-only project reduces scope
5. **E2E suite is clean** — Minimal dependencies = minimal attack surface

---

**Report Generated:** 2026-08-13  
**Scan Tool:** npm audit 10.0+  
**Next Audit:** 2026-09-13 (Monthly)
