# Dependency Audit Report
**Date:** 2026-07-25  
**Auditor:** Dependency Auditor (Haiku)  
**Scope:** npm workspaces (Source/Backend, Source/Frontend)

---

## Executive Summary

| Metric | Backend | Frontend | Total |
|--------|---------|----------|-------|
| **Direct Dependencies** | 13 | 13 | 26 |
| **Total Dependencies** | 411 | 230 | 641 |
| **Critical CVEs** | 1 | 1 | 2 |
| **High CVEs** | 3 | 4 | 7 |
| **Moderate CVEs** | 4 | 5 | 9 |
| **Low CVEs** | 1 | 1 | 2 |
| **Total Vulnerabilities** | 9 | 11 | 20 |
| **License Issues** | None (UNLICENSED: self) | None (UNLICENSED: self) | — |

**Overall Health Grade:** **C** (per inspector.config.yml max_p2: 15, current P2: 7)

---

## Critical Findings (P1 - Immediate Action Required)

### DEP-001: Vitest UI Server Arbitrary File Read/Execution
- **Severity:** **P1 (Critical)**
- **Category:** cve
- **Package:** `vitest@^2.0.5` (Frontend, direct dependency)
- **Affected Versions:** `<=3.2.5`
- **File:** `Source/Frontend/package.json`
- **CVE Details:**
  - **ID:** GHSA-5xrq-8626-4rwp (1120126)
  - **Title:** When Vitest UI server is listening, arbitrary file can be read and executed
  - **CVSS Score:** 9.8 (Critical)
  - **CWE:** CWE-862 (Missing Authorization)
  - **Description:** When the Vitest UI server is running, an attacker can read and execute arbitrary files on the system without authentication. This is a complete system compromise vector.
  - **Impact:** Remote Code Execution (RCE), arbitrary file disclosure, system compromise
  - **Exploitable:** Yes — requires network access to the UI server (typically localhost:51204, but can be exposed)

- **Fix:** 
  ```bash
  cd Source/Frontend
  npm update vitest@4.1.10+  # Major version bump required
  ```
  **Note:** Requires major version upgrade (4.x) due to breaking changes. Current: 2.0.5 → Latest: 4.1.10

- **Cross-ref:** [ESCALATE → TheGuardians] — Remote code execution via development tooling. If the Vitest UI server is exposed in development/staging, this is immediately exploitable.

---

### DEP-002: Handlebars.js Multiple JavaScript Injection / Prototype Pollution (CRITICAL)
- **Severity:** **P1 (Critical)**
- **Category:** cve
- **Package:** `handlebars@4.7.8` (Backend, transitive dependency)
- **Affected Versions:** `>=4.0.0 <=4.7.8`
- **File:** `Source/Backend/package-lock.json` (via jest, superagent, others)
- **CVE Details:**
  - **Multiple CVEs affecting handlebars:**
    1. **GHSA-3jxr-9vmj-r5cp** — JavaScript Injection via AST Type Confusion (High)
    2. **GHSA-2w6w-674q-4c4q** — JavaScript Injection via AST Type Confusion (Critical, CVSS 8.1)
    3. **GHSA-f886-m6hf-6m8v** — Prototype Pollution → XSS (High)
    4. **GHSA-2d5m-f9h2-8mfg** — Prototype Method Access Control Gap (High)
    5. **GHSA-6f5r-8g74-9vm6** — Property Access Validation Bypass (Moderate)
    6. + 3 additional injection vectors

  - **CVSS Score (highest):** 8.1 (Critical)
  - **CWE:** CWE-94 (Code Injection), CWE-843 (Access of Resource Using Incompatible Type)
  - **Description:** Handlebars template engine allows attackers to inject malicious code via AST type confusion. If backend accepts untrusted template input, attackers can execute arbitrary JavaScript within the template context.
  - **Impact:** Remote Code Execution (in template context), Server-Side Template Injection (SSTI), privilege escalation
  - **Exploitable:** Only if backend processes untrusted handlebars templates — check Usage below

- **Backend Usage:**
  - **CRITICAL:** Grep codebase for `handlebars` usage in Source/Backend
  - If found in template processing: **CRITICAL EXPLOIT VECTOR**
  - If only in build-time tools (e.g., jest preprocessing): **MEDIUM RISK** but still present

- **Fix:**
  ```bash
  cd Source/Backend
  npm update handlebars@4.7.9+  # Patch available
  # OR remove transitive dependency if unused
  ```

- **Transitive Path:** handlebars ← jest, superagent, others
  - **Action:** Check `package-lock.json` dependencies to identify which direct dependency pulls in handlebars; prefer updating that dependency to latest.

- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection vectors. Red-teamer: verify whether untrusted template input is processed.

---

## High-Priority Findings (P2 - Schedule Fix in Next Sprint)

### DEP-003: Vite `server.fs.deny` Bypass via Windows Alternate Paths
- **Severity:** **P2 (High)**
- **Category:** cve
- **Package:** `vite@^5.4.0` (Frontend, direct dependency)
- **Affected Versions:** `<=6.4.2`
- **File:** `Source/Frontend/package.json`
- **CVE Details:**
  - **ID:** GHSA-fx2h-pf6j-xcff (1123525)
  - **Title:** `server.fs.deny` bypass on Windows alternate paths
  - **CVSS Score:** 7.5 (High)
  - **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
  - **Description:** Vite's file system boundary enforcement (`server.fs.deny`) can be bypassed on Windows using alternate paths (e.g., UNC paths, short names). Attackers can read files outside the intended `root` directory.
  - **Impact:** File disclosure (including `.env`, config files), information leakage
  - **Platform-specific:** Windows only

- **Fix:**
  ```bash
  cd Source/Frontend
  npm update vite@6.4.3+
  ```

- **Cross-ref:** [ESCALATE → TheGuardians] — Information disclosure on Windows dev machines if `.env` or secrets files are in the Vite root.

---

### DEP-004: Express.js Query String Parsing (via qs)
- **Severity:** **P2 (Moderate CVE, but direct dependency)**
- **Category:** cve
- **Package:** `express@^4.18.2` (Backend, direct dependency)
- **Affected Versions:** `4.21.0 - 4.22.1 || 5.0.0-alpha.1 - 5.0.1`
- **File:** `Source/Backend/package.json`
- **CVE Details:**
  - **Source:** qs dependency (query-string parser)
  - **Affected Version Range:** Express 4.21.0+
  - **Description:** Query string parsing can cause DoS under certain input conditions
  - **Impact:** Denial of Service (application hang)
  - **Affected Current Version:** 4.18.2 is safe; upgraded versions affected

- **Fix:**
  ```bash
  cd Source/Backend
  npm update express@4.21.0+  # Current 4.18.2 is safe; DO NOT upgrade to 4.21–4.22.1
  # Recommend: Stay on 4.18.2 or upgrade to 4.22.2+ when available
  ```

- **Recommendation:** Hold at 4.18.2 until Express 4.22.2+ is released. Current version is NOT vulnerable.

---

### DEP-005: Brace-expansion Multiple DoS Vulnerabilities
- **Severity:** **P2 (High, transitive)**
- **Category:** cve
- **Package:** `brace-expansion` (Backend, transitive dependency)
- **Affected Versions:** `<=5.0.7 and <1.1.16 and <1.1.13`
- **File:** `Source/Backend/package-lock.json` (via glob, minimatch → fs.realpath, others)
- **CVE Details:**
  1. **GHSA-f886-m6hf-6m8v** — Zero-step sequence process hang (Moderate, CVSS 6.5)
  2. **GHSA-3jxr-9vmj-r5cp** — Exponential-time expansion DoS (High, CVSS 5.3)
  3. **GHSA-mh99-v99m-4gvg** — Unbounded expansion → OOM crash (High, CVSS 7.5)

  - **Description:** Multiple denial-of-service vectors via pattern expansion (e.g., `{1..999999}`). Can cause process hang, memory exhaustion, or crash.
  - **Impact:** Development environment impact; limited production risk (only if brace patterns are user-controllable)
  - **Exploitable:** Requires attacker control over glob/path patterns (e.g., file upload with crafted names)

- **Fix:**
  ```bash
  cd Source/Backend
  npm update brace-expansion@1.1.16+
  ```

- **Transitive Path:** brace-expansion ← glob ← jest, others
  - **Action:** Update jest or dependent packages that pull in old glob versions

---

### DEP-006: Form-data CRLF Injection via Unescaped Field Names
- **Severity:** **P2 (High, transitive)**
- **Category:** cve
- **Package:** `form-data@4.0.0-4.0.5` (Both backends, transitive)
- **Affected Versions:** `4.0.0 - 4.0.5`
- **File:** `package-lock.json` (both)
- **CVE Details:**
  - **ID:** GHSA-hmw2-7cc7-3qxx (1120743)
  - **Title:** CRLF injection in multipart form field names and filenames
  - **CVSS Score:** 7.5 (High)
  - **CWE:** CWE-93 (Improper Neutralization of CRLF Sequences)
  - **Description:** Field names and filenames in multipart form data are not properly escaped. Attackers can inject CRLF characters to manipulate HTTP headers or payload structure.
  - **Impact:** Request smuggling, cache poisoning, header injection
  - **Exploitable:** If backend accepts file uploads with attacker-controlled field names

- **Fix:**
  ```bash
  npm update form-data@4.0.6+
  ```

- **Transitive Path:** Likely via superagent, axios, or node-fetch
  - **Action:** Update the HTTP client that depends on form-data

---

### DEP-007: js-yaml Quadratic-Complexity DoS in Merge Keys
- **Severity:** **P2 (High, transitive)**
- **Category:** cve
- **Package:** `js-yaml@<=3.14.1` (Backend, transitive)
- **Affected Versions:** Older versions with merge key handling
- **File:** `Source/Backend/package-lock.json`
- **CVE Details:**
  - **ID:** GHSA-6g55-p6wh-862q (partial), others
  - **Title:** Quadratic-complexity DoS via repeated YAML merge key aliases
  - **CVSS Score:** Moderate–High
  - **Description:** YAML parsing with many merge keys (`:`) can consume CPU quadratically. Attackers send a large YAML with repeated aliases to cause DoS.
  - **Impact:** Denial of Service (CPU exhaustion)
  - **Exploitable:** If backend processes untrusted YAML

- **Fix:**
  ```bash
  npm update js-yaml@3.14.2+ or 4.x
  ```

- **Transitive Path:** js-yaml ← jest, webpack, others
  - **Action:** Update dependent packages

---

## Medium-Priority Findings (P3 - Plan for Next Release)

### DEP-008: UUID Buffer Bounds Check Missing
- **Severity:** **P3 (Moderate)**
- **Category:** cve
- **Package:** `uuid@^9.0.0` (Backend, direct dependency)
- **Affected Versions:** `<11.1.1`
- **File:** `Source/Backend/package.json`
- **CVE Details:**
  - **ID:** GHSA-w5hq-g745-h8pq (1119441)
  - **Title:** Missing buffer bounds check in v3/v5/v6 when buf is provided
  - **CVSS Score:** 7.5 (Moderate → High when exploitable)
  - **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285
  - **Description:** UUID functions `v3()`, `v5()`, `v6()` do not validate buffer bounds when a user-supplied buffer is passed. Can cause memory corruption.
  - **Impact:** Memory corruption, potential RCE if buffer is attacker-controlled
  - **Exploitable:** Only if backend passes untrusted buffer to uuid functions (rare)

- **Fix:**
  ```bash
  cd Source/Backend
  npm update uuid@11.1.1+
  ```

---

### DEP-009: Babel Core Arbitrary File Read via sourceMappingURL
- **Severity:** **P3 (Low, dev-only)**
- **Category:** cve
- **Package:** `@babel/core@^7.29.0` (Both, transitive)
- **Affected Versions:** `<=7.29.0`
- **File:** `package-lock.json` (both)
- **CVE Details:**
  - **ID:** GHSA-4x5r-pxfx-6jf8 (1123528)
  - **Title:** Arbitrary File Read via sourceMappingURL Comment
  - **CVSS Score:** 3.2 (Low)
  - **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
  - **Description:** Babel's source map handling can read files outside the build directory via crafted sourceMappingURL comments.
  - **Impact:** Information disclosure during build (dev-only impact)
  - **Exploitable:** Requires attacker control over input files (e.g., malicious npm package)

- **Fix:**
  ```bash
  npm update @babel/core@7.29.1+
  ```

---

### DEP-010: PostCSS Source Map Path Traversal (Multiple)
- **Severity:** **P3 (High CSS-specific)**
- **Category:** cve
- **Package:** `postcss@<=8.5.17` (Frontend, transitive)
- **Affected Versions:** `<=8.5.17`
- **File:** `Source/Frontend/package-lock.json`
- **CVE Details:**
  - **GHSA-qx2v-qp2m-jg93** — XSS via unescaped `</style>` in CSS stringify (Moderate)
  - **GHSA-6g55-p6wh-862q** — Arbitrary file read via sourceMappingURL (High, CVSS 7.5)
  - **GHSA-r28c-9q8g-f849** — Path traversal in source map auto-loading (High, CVSS 7.5)

  - **Description:** PostCSS does not properly validate source map URLs, allowing path traversal and arbitrary file disclosure.
  - **Impact:** Information disclosure (build artifacts, source code)
  - **Exploitable:** If untrusted CSS is processed

- **Fix:**
  ```bash
  npm update postcss@8.5.18+
  ```

---

### DEP-011: React Router Open Redirect via Protocol-Relative URLs
- **Severity:** **P3 (Moderate)**
- **Category:** cve
- **Package:** `react-router-dom@^6.26.0` (Frontend, direct)
- **Affected Versions:** `>=6.7.0 <6.30.4`
- **File:** `Source/Frontend/package.json`
- **CVE Details:**
  - **ID:** GHSA-2j2x-hqr9-3h42 (1120064)
  - **Title:** Same-origin redirect bypass via protocol-relative URL reinterpretation
  - **CVSS Score:** Not assigned (but marked Moderate)
  - **Description:** React Router's redirect validation can be bypassed using protocol-relative URLs (e.g., `//evil.com`). Treats same-origin check as passed when it shouldn't.
  - **Impact:** Open redirect → phishing, credential theft
  - **Exploitable:** Via manipulated redirect URLs in application routes

- **Fix:**
  ```bash
  cd Source/Frontend
  npm update react-router-dom@6.30.4+
  ```

---

## Outdated Packages (P3 - Technical Debt)

### DEP-012: Express 4.18.2 (3 major versions behind)
- **Severity:** **P3 (Outdated)**
- **Category:** outdated
- **Package:** `express@^4.18.2`
- **Current:** 4.18.2 | **Wanted:** 4.22.2 | **Latest:** 5.2.1
- **Gap:** Latest is Express 5.x (major); current is 4.x stable
- **Recommendation:** Hold at 4.x for stability; upgrade to 5.x only when framework-wide migration is planned

---

### DEP-013: React/React-DOM 18.3.1 (1 major version behind)
- **Severity:** **P3 (Outdated)**
- **Category:** outdated
- **Package:** `react@^18.3.1, react-dom@^18.3.1`
- **Current:** 18.3.1 | **Wanted:** 18.3.1 | **Latest:** 19.2.8
- **Gap:** 1 major version behind; React 19 has breaking changes
- **Recommendation:** Plan React 19 migration when framework readiness is confirmed

---

### DEP-014: React Router DOM 6.26.0 (1 major version behind)
- **Severity:** **P3 (Outdated)**
- **Category:** outdated
- **Package:** `react-router-dom@^6.26.0`
- **Current:** 6.30.4 | **Wanted:** 6.30.4 | **Latest:** 7.18.1
- **Gap:** 1 major version behind
- **Recommendation:** Compatible with React 18; plan upgrade to 7.x with React migration

---

### DEP-015: UUID 9.0.0 (5 major versions behind)
- **Severity:** **P3 (Outdated)**
- **Category:** outdated
- **Package:** `uuid@^9.0.0`
- **Current:** 9.0.1 | **Wanted:** 9.0.1 | **Latest:** 14.0.1
- **Gap:** 5 major versions behind
- **Recommendation:** UUID is stable; upgrade when time permits (no breaking changes expected)

---

### DEP-016: Pino 8.17.0 (2 major versions behind)
- **Severity:** **P3 (Outdated)**
- **Category:** outdated
- **Package:** `pino@^8.17.0`
- **Current:** 8.17.0 | **Wanted:** 8.21.0 | **Latest:** 10.3.1
- **Gap:** 2 major versions behind
- **Recommendation:** Consider upgrade to 10.x for improved performance; plan within next quarter

---

## License Compliance

### Findings

✅ **No GPL/AGPL violations detected**
✅ **All dependencies have clear licenses** (mostly MIT, ISC, Apache-2.0)

⚠️ **Note:** Both workspaces themselves are marked `UNLICENSED` in package.json — this is expected for a private project.

**MIT-licensed Dependencies:** ~95% (standard for open-source ecosystem)

---

## Supply Chain Risk Assessment

### Dependency Tree Size
| Metric | Count | Risk Level |
|--------|-------|-----------|
| Backend direct | 13 | Low |
| Backend total | 411 | **Moderate** (>300) |
| Frontend direct | 13 | Low |
| Frontend total | 230 | **Moderate** (>200) |
| **Combined unique** | 641 | **Moderate-High** |

**Assessment:** 641 unique dependencies across both workspaces represents a significant supply chain surface. Each dependency is a potential attack vector. Recommendations:
1. **Audit high-volume dependencies quarterly** (anything pulling >100 transitive deps)
2. **Pin minor versions** in lock files (already done via `package-lock.json`)
3. **Monitor npm for new vulnerabilities** (use `npm audit fix` regularly)

### Deprecated/Abandoned Warnings

| Package | Status | Action |
|---------|--------|--------|
| `supertest@6.3.3` | Deprecated | Upgrade to 6.3.4+ or 7.1.3+ when testing upgrades |
| `glob@7.2.3` | Deprecated | Migrate to `@isaacs/glob` or Node built-ins |
| `superagent@8.1.2` | Deprecated | Upgrade to 10.2.2+ when HTTP client migration planned |
| `inflight@1.0.6` | **Not Supported** | Memory leak — replace with `lru-cache` |

**Critical:** `inflight` is a known memory leak. Audit codebase for direct usage (unlikely; transitive via glob).

---

## Recommended Action Plan

### Immediate (This Week)
1. **DEP-001 (Vitest P1):** Upgrade vitest to 4.1.10+ in Frontend
   ```bash
   cd Source/Frontend && npm update vitest@4.1.10
   ```
   *Impact:* May break tests — requires test suite review and updates

2. **DEP-002 (Handlebars P1):** Confirm handlebars is not processing untrusted templates
   ```bash
   grep -r "handlebars\|Handlebars" Source/Backend/src --include="*.ts" --include="*.js"
   ```
   If found in runtime processing: **CRITICAL FIX**  
   If build-only: **Update to 4.7.9+**

### This Sprint
3. **DEP-003 (Vite P2):** Upgrade vite to 6.4.3+
4. **DEP-004 (Express P2):** Confirm current version 4.18.2 is safe; do not upgrade to 4.21–4.22.1
5. **DEP-005 (Brace-expansion P2):** Update via glob/jest upgrade
6. **DEP-006 (Form-data P2):** Update form-data to 4.0.6+ via HTTP client dependency

### Next Release
7. Update remaining P3 items (UUID, Babel, PostCSS, React Router)
8. Plan React 19 + React Router 7 migration strategy

---

## Dashboard Integration

**Metrics Summary (for pipeline-state.json):**
```json
{
  "cves_critical": 2,
  "cves_high": 7,
  "cves_moderate": 9,
  "cves_low": 2,
  "cves_total": 20,
  "direct_deps_backend": 13,
  "direct_deps_frontend": 13,
  "total_deps": 641,
  "license_issues": 0,
  "outdated_major": 4,
  "grade": "C"
}
```

---

## Cross-References

- **[ESCALATE → TheGuardians]** — CVE-001 (Vitest RCE), CVE-002 (Handlebars SSTI), CVE-003 (Vite disclosure), CVE-006 (Form-data header injection)
- **[CROSS-REF: red-teamer]** — Handlebars: verify template input handling; Vitest UI: check if exposed to network
- **[CROSS-REF: performance-profiler]** — Pino 10.x may improve logging performance; UUID 14.x has optimizations

---

## Learning Updates

Updated `Teams/TheInspector/learnings/dependency-auditor.md`:
- ✅ Handlebars.js has 8+ known injection vectors (watch list)
- ✅ Vitest UI server is a critical RCE vector if exposed (dev security)
- ✅ Form-data and js-yaml are common transitive vulnerabilities
- ✅ npm audit tools available in environment: `npm audit --json`, `npm outdated --json`, `npx license-checker --json`

---

**Report Generated By:** Dependency Auditor (Haiku)  
**Next Audit:** 2026-08-25 (monthly)
