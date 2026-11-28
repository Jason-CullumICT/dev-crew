# Dependency Auditor Findings Report
**Date:** 2026-11-28  
**Auditor:** Dependency Auditor (Claude Haiku 4.5)  
**Tool:** npm audit + manual analysis

---

## Executive Summary

**Total CVEs Found:** 176 across 6 npm projects  
**Critical (P1):** 12 findings  
**High (P2):** 27 findings  
**Moderate (P3):** 118 findings  
**Low (P4):** 19 findings  

### Risk Assessment: 🔴 HIGH

**Most Critical Issue:** `vitest` and `tinypool` RCE vulnerabilities in Source/Frontend testing environment (CVSS 9.8)

---

## Findings by Severity

### DEP-001: Vitest Arbitrary File Read / Execution (P1 - CRITICAL)
- **Severity:** P1 / Critical
- **Category:** CVE / Direct Dependency
- **Package:** vitest@^2.0.5
- **File:** Source/Frontend/package.json
- **Detail:** 
  - CVE: GHSA-5xrq-8626-4rwp
  - When Vitest UI server is listening, arbitrary files can be read and executed
  - CVSS Score: 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
  - Affected Range: <3.2.6
  - Also affected by tinypool RCE via prototype pollution (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr)
- **Impact:** Test infrastructure compromise → production code execution risk
- **Fix:** 
  ```bash
  cd Source/Frontend
  npm install vitest@5.1.2 --save-dev  # Major version upgrade
  npm audit fix  # Apply all fixes
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - If Vitest UI was exposed during testing, production code may have been compromised

---

### DEP-002: Handlebars JavaScript Injection (P1 - CRITICAL)
- **Severity:** P1 / Critical
- **Category:** CVE / Transitive Dependency
- **Package:** handlebars@<=4.7.9
- **Files:** 
  - Source/Backend/node_modules/handlebars (via @babel/core or other)
  - Source/Frontend/node_modules/handlebars
  - portal/Backend/node_modules/handlebars
- **Detail:**
  - CVE IDs: GHSA-2w6w-674q-4c4q, GHSA-xjpj-3mr7-gcpf, GHSA-8r5x-fm3f-whwj, GHSA-p8wg-vrv2-v86f
  - Multiple JavaScript injection vulnerabilities via AST Type Confusion
  - Affects template compilation and runtime execution
  - CVSS Score: 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
  - Affected Range: 3.0.0 - 4.7.9
- **Impact:** Server-side template injection → arbitrary code execution
- **Fix:**
  ```bash
  npm audit fix  # In each affected project
  # Verify handlebars updated to >=4.7.10 (or latest)
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - If handlebars processes untrusted template input

---

### DEP-003: Proxy-addr IP Spoofing (P1 - CRITICAL)
- **Severity:** P1 / Critical
- **Category:** CVE / Transitive Dependency
- **Package:** proxy-addr@<2.0.8
- **Files:**
  - Source/Backend (via express)
  - platform/orchestrator (via express)
  - portal/Backend (via express)
- **Detail:**
  - CVE: GHSA-jqcg-44mw-7w3h
  - IPv4-mapped IPv6 trust subnet bypass allows IP spoofing
  - CVSS Score: 9.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
  - Affected Range: 1.1.0 - 2.0.7
- **Impact:** Bypass of IP-based access control, trust subnet spoofing
- **Fix:**
  ```bash
  npm audit fix  # Updates express and proxy-addr
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - If IP-based access control is enforced

---

### DEP-004: Protobufjs Arbitrary Code Execution (P1 - CRITICAL)
- **Severity:** P1 / Critical
- **Category:** CVE / Transitive Dependency
- **Package:** protobufjs@<=7.5.5
- **File:** platform/orchestrator (via @grpc/grpc-js)
- **Detail:**
  - CVE: GHSA-xq3m-2v4x-88gg
  - Multiple vulnerabilities leading to arbitrary code execution
  - Includes prototype pollution gadgets, code generation exploitation
  - CVSS Score: 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
  - Affected Range: 7.0.0 - 7.5.5
  - Also includes DoS via recursion, overlong UTF-8 decoding, field name shadowing
- **Impact:** RCE via crafted protobuf messages
- **Fix:**
  ```bash
  npm audit fix  # Updates protobufjs
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] - If processing untrusted protobuf data

---

### DEP-005: Body-parser Denial of Service (P2 - HIGH)
- **Severity:** P2 / High
- **Category:** CVE / Transitive Dependency
- **Package:** body-parser@<1.20.3
- **Files:**
  - Source/Backend (via express)
  - platform/orchestrator (via express)
  - portal/Backend (via express)
- **Detail:**
  - CVE: GitHub Advisory on body-parser
  - Invalid limit value silently disables size enforcement
  - Allows unbounded request body parsing → memory exhaustion DoS
- **Impact:** Service DoS via large request bodies
- **Fix:**
  ```bash
  npm audit fix
  ```

---

### DEP-006: Form-data CRLF Injection (P2 - HIGH)
- **Severity:** P2 / High
- **Category:** CVE / Transitive Dependency
- **Package:** form-data@<4.0.1
- **Files:**
  - Source/Backend
  - Source/Frontend
  - platform/orchestrator
  - portal projects
- **Detail:**
  - CRLF injection via unescaped multipart field names and filenames
  - Can bypass security controls in proxies, WAFs
- **Impact:** HTTP request smuggling, header injection
- **Fix:**
  ```bash
  npm audit fix
  ```

---

### DEP-007: Browserslist Unbounded Memory Growth (P2 - HIGH)
- **Severity:** P2 / High
- **Category:** CVE / Transitive Dependency
- **Package:** browserslist@<4.24.2
- **Files:**
  - Source/Frontend (via @vitejs/plugin-react, babel)
  - portal/Frontend
- **Detail:**
  - No cache eviction in query result caching
  - Leads to eventual OOM (Out of Memory) crashes
- **Impact:** Service instability, repeated crashes during builds
- **Fix:**
  ```bash
  npm audit fix
  ```

---

### DEP-008: Nanoid Non-secure RNG Loop (P2 - HIGH)
- **Severity:** P2 / High
- **Category:** CVE / Transitive Dependency
- **Package:** nanoid@<3.3.5
- **File:** Source/Frontend (via other deps)
- **Detail:**
  - Non-secure random generators can loop indefinitely with negative size
  - Affects ID generation security
- **Impact:** Weak ID generation, potential collision
- **Fix:**
  ```bash
  npm audit fix
  ```

---

### DEP-009: PostCSS XSS via Unescaped </style> (P2 - HIGH)
- **Severity:** P2 / High
- **Category:** CVE / Transitive Dependency
- **Package:** postcss@<8.4.32
- **File:** Source/Frontend (via vite, build chain)
- **Detail:**
  - XSS vulnerability in CSS stringify output
  - Affects generated CSS in builds
- **Impact:** XSS in production CSS if attacker controls CSS input
- **Fix:**
  ```bash
  npm audit fix
  ```

---

### DEP-010: Brace-expansion Zero-step Sequence DoS (P2 - HIGH)
- **Severity:** P2 / High
- **Category:** CVE / Transitive Dependency
- **Package:** brace-expansion@<1.1.12
- **File:** Source/Backend (build deps)
- **Detail:**
  - Zero-step sequence causes infinite loops and memory exhaustion
  - Process hang during build/CLI operations
- **Impact:** Build system DoS
- **Fix:**
  ```bash
  npm audit fix
  ```

---

### DEP-011: gRPC malformed request crash (P2 - HIGH)
- **Severity:** P2 / High
- **Category:** CVE / Transitive Dependency
- **Package:** @grpc/grpc-js@<1.11.4
- **File:** platform/orchestrator
- **Detail:**
  - Malformed gRPC requests cause server crash
- **Impact:** Service availability
- **Fix:**
  ```bash
  npm audit fix
  ```

---

### DEP-012: JS-YAML Quadratic-complexity DoS (P2 - HIGH)
- **Severity:** P2 / High
- **Category:** CVE / Transitive Dependency
- **Package:** js-yaml@<4.1.0
- **File:** Source/Backend (via other deps)
- **Detail:**
  - Merge key handling with repeated aliases causes exponential parsing time
- **Impact:** YAML parsing DoS
- **Fix:**
  ```bash
  npm audit fix
  ```

---

## Moderate CVEs (P3)

**Count:** 118 findings across all projects

Representative samples:
- **QS DoS:** Stringify crash with null/undefined in comma-format arrays
- **Vitest mocker path traversal:** Arbitrary file read via mock redirects
- **Esbuild dev server security:** Dev server allows cross-origin requests
- **Remix-run router open redirect:** Protocol-relative URLs bypass same-origin checks
- **Baseline-browser-mapping DoS:** Process termination on invalid input
- **And 113 additional moderate-severity findings**

**Mitigation:** Run `npm audit fix` in each project; many are addressed by patch updates.

---

## Outdated Major Versions (P3 - OPTIMIZATION)

| Package | Current | Latest | Behind | Risk |
|---------|---------|--------|--------|------|
| pino | 8.17.0 | 10.4.0 | 2 majors | 🟠 May miss security patches |
| React | 18.3.1 | 19.3.1 | 1 major | 🟡 Test compatibility |
| React Router | 6.26.0 | 7.18.7 | 1 major | 🟡 Breaking changes |
| Express | 4.18.2 | 5.3.0 | 1 major | 🟡 Breaking changes |
| uuid | 9.0.0 | 14.0.3 | 5 majors | 🔴 **UNUSUAL** |
| dockerode | 4.0.4 | 5.0.1 | 1 major | 🟡 Breaking changes |
| multer | 1.4.5-lts.1 | 2.5.0 | 1 major | 🟡 Breaking changes |

**Note on uuid:** 5+ major versions behind latest is highly unusual. Verify if pinning to v9 is intentional (feature freeze?) or oversight.

---

## Supply Chain Risk Assessment

### ✅ Positive Findings
- **No post-install scripts** detected in any project
- **All projects use ^versioning** (caret ranges allow patch updates)
- **No obvious abandoned dependencies** in core stack

### ⚠️ Risk Factors

#### Transitive Dependency Explosion
| Project | Total Deps | Risk Level |
|---------|-----------|-----------|
| portal/Backend | 653 | 🔴 CRITICAL |
| portal/Frontend | 474 | 🔴 HIGH |
| Source/Backend | 414 | 🟡 MEDIUM |
| Source/Frontend | 281 | 🟡 MEDIUM |
| platform/orchestrator | 153 | 🟡 MEDIUM |
| Source/E2E | 5 | 🟢 LOW |

**Analysis:** Each additional dependency increases:
- CVE surface area
- Supply chain attack surface
- Build complexity and audit burden
- Maintenance cost per update

**Recommendation:** Audit portal/Backend (653 deps) for unused dev dependencies.

#### High Dev Dependency Counts
- Source/Backend: 310 dev deps vs 102 prod (3x ratio)
- Source/Frontend: 222 dev deps vs 9 prod (25x ratio!)
- portal/Frontend: 416 dev deps vs 9 prod (46x ratio!)

**Analysis:** Unusual ratios suggest bundlers, build tools, linters, test frameworks are pulling in heavy transitive deps.

---

## License Compliance

**Status:** ✅ No red flags detected

Reviewed package.json files:
- All direct dependencies use standard licenses (MIT, Apache-2.0, ISC, etc.)
- No GPL/AGPL viral licenses in production dependencies (which is good for proprietary apps)
- No "UNLICENSED" or missing license fields in direct deps

**Recommendation:** Run `npx license-checker --json` annually to track transitive license changes.

---

## Abandoned Dependency Check

**Status:** ✅ No abandoned packages in direct dependencies

All direct dependencies (express, react, pino, etc.) are actively maintained. However:
- Some transitive deps may be deprecated (e.g., `brace-expansion` is replaced by modern alternatives)
- Keep watch on dev-only dependencies for abandonment

---

## Summary of Findings

| Severity | Count | Status |
|----------|-------|--------|
| P1 (Critical) | 12 | 🔴 **ACTION REQUIRED** |
| P2 (High) | 27 | 🟠 **URGENT** |
| P3 (Moderate) | 118 | 🟡 **SOON** |
| P4 (Low) | 19 | 🟢 **BACKLOG** |

---

## Action Plan

### Immediate (This Sprint)
1. **Source/Frontend:** `npm install vitest@5.1.2 --save-dev` + test suite
2. **All projects:** `npm audit fix` to patch all fixable CVEs
3. **Re-audit** after fixes to confirm reductions

### Within 1 Week
1. Test breaking changes from major version updates (Express, React Router)
2. Update pino in Source/Backend (2 majors behind)
3. Run full test suite on each project after updates
4. Update lockfiles in git

### Within 1 Month
1. Plan React 18 → 19 migration (monitor compatibility)
2. Audit portal/Backend for unused dev dependencies
3. Consider uuid@9 pinning intention (verify with team)
4. Implement automated dependency auditing in CI/CD

### Ongoing
- Schedule weekly `npm audit` runs in CI
- Automated PRs for security patch updates
- Annual license compliance review

---

## Cross-Team Escalations

**→ TheGuardians (Security Specialists):**
- Vitest UI arbitrary file read (if exposed during CI)
- Handlebars server-side template injection (if untrusted input)
- Protobufjs RCE (if processing gRPC messages)
- Proxy-addr IP spoofing (if IP-based access control in use)

**→ TheFixer (Code Quality):**
- Multiple high-severity DoS vulnerabilities (body-parser, browserslist, brace-expansion)
- Build system resilience (OOM risk in portal/Frontend builds)
- Dependency explosion audit (portal/Backend 653 deps)

---

## Audit Methodology

✅ Ran `npm audit --json` on all 6 npm projects  
✅ Analyzed CVE severity (CVSS scores, CWE categorization)  
✅ Traced transitive dependencies to root cause  
✅ Checked for post-install scripts (supply chain risk)  
✅ Reviewed for abandoned/deprecated packages  
✅ License compliance check on direct dependencies  
✅ Outdated version analysis  

**Tools Used:**
- npm audit (native)
- npm outdated (native)
- npm ls (native)
- Manual GitHub Advisory cross-reference

---

**Report Generated:** 2026-11-28  
**Next Review:** After `npm audit fix` completion (within 3 days)
