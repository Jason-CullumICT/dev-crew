# Dependency Auditor Findings

## Executive Summary

**Scan Date:** 2026-09-17  
**Packages Scanned:** npm (4 projects)  
**Known CVEs Found:** 79 total across all projects  
**Critical Issues:** 4 projects have critical vulnerabilities  
**Outdated Packages:** Multiple major versions behind current  

### Package Managers Detected
- **npm**: Source/Backend, Source/Frontend, Source/E2E, portal/Backend, portal/Frontend, platform/orchestrator

### Scope Focus
Analysis focuses on **Source/** (main application). Portal and Platform are noted for completeness.

---

## PRIMARY APPLICATION: Source/

### Source/Backend
- **Direct Dependencies:** 13
- **Transitive Dependencies:** 412 total
- **CVE Summary:** 10 vulnerabilities (1 CRITICAL, 4 HIGH, 3 MODERATE, 2 LOW)

### Source/Frontend  
- **Direct Dependencies:** 13
- **Transitive Dependencies:** 231 total
- **CVE Summary:** 15 vulnerabilities (1 CRITICAL, 6 HIGH, 7 MODERATE, 1 LOW)

### Source/E2E
- **Direct Dependencies:** 4
- **CVE Summary:** 0 vulnerabilities (clean)

---

## CRITICAL FINDINGS (P1)

### DEP-001: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars@4.7.8 (Backend transitive)
- **File:** Source/Backend/package-lock.json
- **CVEs:**
  - GHSA-2w6w-674q-4c4q: **CVSS 9.8** — JavaScript Injection via AST Type Confusion (remote, no auth required)
  - GHSA-3mfm-83xf-c92r: **CVSS 8.1** — JavaScript Injection via @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6: **CVSS 8.1** — JavaScript Injection when passing object as dynamic partial
  - GHSA-9cx6-37pm-9jff: **CVSS 7.5** — Denial of Service via malformed decorator syntax
  - GHSA-2qvq-rjwj-gvw9: **CVSS 4.7** — Prototype Pollution leading to XSS
  - GHSA-7rx3-28cr-v5wh: **CVSS 4.8** — Prototype Method Access Control Gap
  - GHSA-442j-39wm-28r2: **CVSS 3.7** — Property Access Validation Bypass
- **Detail:** Handlebars 4.0.0-4.7.8 allows arbitrary JavaScript execution through multiple code paths (AST type confusion, @partial-block injection, dynamic partials, decorator syntax). No authentication required. An attacker can submit a malicious template or parameter that injects code into template compilation.
- **Fix:** `npm update handlebars@4.7.9+` (no action yet — handlebars is transitive, check which dep pulls it)
- **Exploitability:** HIGH — template inputs from untrusted sources (if any) are direct attack vector
- **Cross-ref:** [ESCALATE → TheGuardians] if templates accept user input; [CROSS-REF: red-teamer] for feasibility assessment

### DEP-002: Vitest UI Server — Arbitrary File Read / Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest@4.1.10 (Frontend direct dev dependency)
- **File:** Source/Frontend/package.json
- **CVEs:**
  - GHSA-5xrq-8626-4rwp: **CVSS 9.8** — When Vitest UI server is listening, arbitrary file read and execution (remote, no auth)
  - GHSA-82fw-gwwq-j7x9: **CVSS 5.9** — Path Traversal via @vitest/mocker Redirect Mock
- **Detail:** Vitest <3.2.6 and <4.1.11 allow arbitrary file read and code execution if the Vitest UI server (`vitest --ui`) is listening. This is a dev-time vulnerability but poses a risk if UI is exposed or if dev environment is accessible to untrusted users.
- **Fix:** `npm update vitest@3.2.6+` or `@5.0.1+` (major version bump to 5.x available)
- **Exploitability:** MEDIUM in dev, HIGH if UI exposed to network
- **Cross-ref:** [ESCALATE → TheGuardians] if dev environment is shared or network-accessible

---

## HIGH PRIORITY FINDINGS (P2)

### DEP-003: Brace-Expansion DoS — Multiple CVEs
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** brace-expansion@1.1.17 (Backend transitive)
- **File:** Source/Backend/package-lock.json
- **CVEs:**
  - GHSA-f886-m6hf-6m8v: **CVSS 6.5** — Zero-step sequence hangs process and exhausts memory
  - GHSA-3jxr-9vmj-r5cp: **CVSS 5.3** — DoS via exponential-time expansion of consecutive {} groups
  - GHSA-mh99-v99m-4gvg: **CVSS 7.5** — DoS via unbounded expansion length causing OOM crash
  - GHSA-rgw5-rvv9-x895: **CVSS 7.5** — DoS via unbounded intermediate arrays (CVE-2026-14257 bypass)
- **Detail:** brace-expansion <1.1.18 is vulnerable to multiple Denial of Service attacks via malformed brace patterns, leading to process hang or memory exhaustion.
- **Fix:** `npm update brace-expansion@1.1.18+`
- **Exploitability:** MEDIUM — requires attacker to control input to brace expansion (glob patterns, filename expansion)
- **Cross-ref:** [CROSS-REF: red-teamer] if glob/path patterns accept user input

### DEP-004: Browserslist Memory Exhaustion & Crash
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** browserslist@4.28.6 (both Backend and Frontend transitive)
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx: **CVSS 7.5** — Unbounded memory growth via distinct query results, no cache eviction → OOM
  - GHSA-73wf-gq98-2v4g: **CVSS 7.5** — Uncaught crash via untrusted browserslist-stats.json (prototype write)
- **Detail:** browserslist ≤4.28.6 doesn't evict cache entries, leading to memory exhaustion with many queries. Also crashes on malformed stats.json. Affects build-time and dev-time tooling.
- **Fix:** `npm update browserslist@4.28.7+` or latest `4.x` or `4.23.x`
- **Exploitability:** MEDIUM (build/dev-time), LOW in production if build-time only

### DEP-005: Form-Data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data@4.0.5 (both Backend and Frontend transitive)
- **CVEs:**
  - GHSA-hmw2-7cc7-3qxx: **CVSS 7.5** — CRLF injection via unescaped multipart field names/filenames
- **Detail:** form-data 4.0.0-4.0.5 doesn't escape CRLF characters in field names or filenames, allowing header injection in multipart/form-data requests. Can be exploited to inject custom headers or split HTTP messages.
- **Fix:** `npm update form-data@4.0.6+`
- **Exploitability:** HIGH if application sends user-controlled form field names in multipart requests

### DEP-006: js-yaml Quadratic CPU Consumption (DoS)
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** js-yaml@3.15.1 (Backend transitive)
- **CVEs:**
  - GHSA-52cp-r559-cp3m: **CVSS 7.5** — YAML merge-key chains force quadratic CPU consumption
  - GHSA-5p4m-2wfm-xmqj: **CVSS 7.5** — Quadratic CPU in !!omap resolution (3.x and 4.x)
  - GHSA-2883-xcg3-v3hh: **CVSS 7.5** — maxTotalMergeKeys mitigation bypass with empty merge sources
  - GHSA-h67p-54hq-rp68: **CVSS 5.3** — Quadratic-complexity DoS via merge key aliases
- **Detail:** js-yaml <3.15.2 allows crafted YAML documents to consume quadratic CPU time via merge keys. Can be used for DoS against any service that parses YAML from untrusted sources.
- **Fix:** `npm update js-yaml@3.15.2+` or `4.1.0+`
- **Exploitability:** HIGH if YAML is parsed from user input or external sources
- **Cross-ref:** [CROSS-REF: red-teamer] for attack surface analysis

---

## MEDIUM PRIORITY FINDINGS (P3)

### DEP-007: Nanoid Infinite Loop & Integer Overflow
- **Severity:** P3 (HIGH in Frontend)
- **Category:** cve
- **Package:** nanoid@3.3.17 (Frontend transitive via vitest)
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv: **CVSS 5.9** — Non-secure generators loop indefinitely with negative size
  - GHSA-2v37-7h3g-55p8: **CVSS 5.9** — Custom generators loop indefinitely when size is zero
  - GHSA-xwg4-73v4-xw9w: **CVSS 7.4** — Integer Overflow or Wraparound
- **Detail:** nanoid <3.3.18 doesn't validate input size properly, allowing infinite loops or integer overflow. Risk if size parameter is user-controlled.
- **Fix:** `npm update nanoid@3.3.18+`

### DEP-008: PostCSS Path Traversal — Arbitrary File Read
- **Severity:** P3 (HIGH in Frontend)
- **Category:** cve
- **Package:** postcss@8.5.22 (Frontend transitive via vitest/build)
- **CVEs:**
  - GHSA-6g55-p6wh-862q: **CVSS 7.5** — Arbitrary .map file read via sourceMappingURL
  - GHSA-r28c-9q8g-f849: **CVSS 7.5** — Path Traversal in source map auto-loading
  - GHSA-qx2v-qp2m-jg93: **CVSS 6.1** — XSS via unescaped </style> in CSS stringify
- **Detail:** postcss ≤8.5.22 reads arbitrary .map files based on attacker-controlled sourceMappingURL comments in CSS. Can leak source maps containing sensitive info.
- **Fix:** `npm update postcss@8.5.23+`

### DEP-009: Vite Path Traversal & fs.deny Bypass
- **Severity:** P3 (HIGH in Frontend)
- **Category:** cve
- **Package:** vite@6.4.2 (Frontend direct, also affects vitest)
- **CVEs:**
  - GHSA-fx2h-pf6j-xcff: **CVSS 7.5** — `server.fs.deny` bypass on Windows alternate paths
  - GHSA-4w7w-66w2-5vf9: **CVSS moderate** — Path Traversal in optimized deps .map handling
- **Detail:** vite ≤6.4.2 allows bypassing filesystem restrictions via alternate path representations on Windows. Dev-time issue but affects dev environment security.
- **Fix:** `npm update vite@8.3.0+` (major version bump) or wait for 6.5.0+

### DEP-010: WebSocket Memory Exhaustion DoS
- **Severity:** P3 (HIGH in Frontend)
- **Category:** cve
- **Package:** ws@8.20.1 (Frontend transitive via vite/vitest)
- **CVEs:**
  - GHSA-96hv-2xvq-fx4p: **CVSS 7.5** — Memory exhaustion from tiny fragments and data chunks
  - GHSA-58qx-3vcg-4xpx: **CVSS 4.4** — Uninitialized memory disclosure
- **Detail:** ws 8.0.0-8.20.1 doesn't properly handle small frame fragments, exhausting memory. Can be used for DoS against WebSocket endpoints.
- **Fix:** `npm update ws@8.21.0+`

### DEP-011: Babel Source Map File Read
- **Severity:** P4 (LOW)
- **Category:** cve
- **Package:** @babel/core@7.29.0 (both Backend/Frontend transitive via build tools)
- **CVEs:**
  - GHSA-4x5r-pxfx-6jf8: **CVSS 3.2** — Arbitrary File Read via sourceMappingURL comment
- **Detail:** Similar to PostCSS issue — reads arbitrary files based on source map URLs. Low severity due to require local access in many cases.
- **Fix:** `npm update @babel/core@7.30.0+`

---

## OUTDATED PACKAGES (P2/P3)

### DEP-012: Backend Express Version Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** express@4.18.2 (Backend direct)
- **Current:** 4.18.2 → Available: 5.2.1 (+2 major versions)
- **Detail:** Express 5.x contains security patches and bug fixes. Staying on 4.x means missing ~2 years of updates.
- **Fix:** `npm update express@5.x` (requires testing for breaking changes; review Express 5.0 migration guide)
- **Risk:** Missing security patches for middleware vulnerabilities

### DEP-013: Backend Pino Logging Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** pino@8.17.0 (Backend direct)
- **Current:** 8.17.0 → Available: 10.3.1 (+2 major versions)
- **Detail:** Pino 9.x and 10.x have performance improvements and security fixes. On 8.x means ~2 years behind.
- **Fix:** `npm update pino@9.x` or `@10.x` (review changelog for breaking changes)

### DEP-014: Backend UUID Far Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** uuid@9.0.0 (Backend direct)
- **Current:** 9.0.0 → Available: 14.0.2 (+5 major versions!)
- **Detail:** UUID is severely outdated. While typically low-risk, staying this far behind is a maintenance burden.
- **Fix:** `npm update uuid@14.x` (should be a safe upgrade; review minor breaking changes)

### DEP-015: Frontend React Major Version Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** react@18.3.1, react-dom@18.3.1 (Frontend direct)
- **Current:** 18.3.1 → Available: 19.3.0 (+1 major)
- **Detail:** React 19 available; 18.x is no longer actively developed. Missing latest features and optimizations.
- **Fix:** `npm update react@19 react-dom@19` (requires testing for hook/component compatibility)

### DEP-016: Frontend React-Router Major Version Behind
- **Severity:** P3
- **Category:** outdated
- **Package:** react-router-dom@6.30.6 (Frontend direct)
- **Current:** 6.30.6 → Available: 7.18.4 (+1 major)
- **Detail:** React-Router 7.x is current; 6.30 is several versions behind within 6.x. Also has #GHSA-2j2x-hqr9-3h42 (same-origin redirect bypass).
- **Fix:** `npm update react-router-dom@7.x` (review migration guide)
- **Risk:** The outdated 6.x version has a redirect vulnerability (GHSA-2j2x-hqr9-3h42)

---

## AUXILIARY SYSTEMS (for reference)

### Portal/Backend
- **CVE Summary:** 54 vulnerabilities (2 CRITICAL, 10 HIGH, 41 MODERATE, 1 LOW)
- **Status:** Requires urgent attention (2 CRITICAL found)
- **Note:** Portal is debug UI, less critical than main app but should still be secured

### Platform/Orchestrator
- **CVE Summary:** 8 vulnerabilities (1 CRITICAL, 2 HIGH, 4 MODERATE, 1 LOW)
- **Status:** Requires attention (1 CRITICAL found)
- **Note:** Orchestrator is infrastructure — vulnerabilities here affect all pipelines

---

## DEPENDENCY TREE COMPLEXITY

### Backend
- Direct: 13 dependencies
- Transitive: 412 total (399 indirect)
- **Complexity:** MODERATE — well-controlled for a backend

### Frontend
- Direct: 13 dependencies  
- Transitive: 231 total (218 indirect)
- **Complexity:** MODERATE — reasonable for a React SPA

### Analysis
- No duplicate major versions detected (good)
- No evidence of abandoned dependencies in main build chain
- Post-install scripts: None detected in main projects

---

## LICENSE COMPLIANCE

**Status:** Deferred — license-checker not installed, and Frontend/Backend do not declare any GPL/AGPL dependencies based on quick scan.

**Recommendation:** Run `npm install --legacy-peer-deps && npx license-checker --json` to audit licenses comprehensively if stricter compliance is needed.

---

## RECOMMENDATIONS

### IMMEDIATE (Week 1)
1. **DEP-001 (Handlebars)**: Identify which dependency pulls handlebars and update it
   - `cd Source/Backend && npm why handlebars`
   - Update the parent dep or upgrade handlebars directly if it's a direct dep
   
2. **DEP-002 (Vitest)**: Upgrade vitest to 4.1.11+ or 5.0.1+
   - `cd Source/Frontend && npm update vitest`

3. **DEP-003 (Brace-Expansion)**: Update brace-expansion to 1.1.18+
   - Likely transitive via glob/rimraf dependencies

### URGENT (Week 1-2)
4. **DEP-004 to DEP-010**: Run `npm audit fix` in each directory to auto-patch HIGH CVEs
   - Backend: `cd Source/Backend && npm audit fix`
   - Frontend: `cd Source/Frontend && npm audit fix --force` (if needed for major deps)

### SHORT-TERM (Week 2-3)
5. **DEP-012 to DEP-016**: Plan major version upgrades with testing
   - express 4 → 5 (most effort)
   - React 18 → 19 (medium effort, test all components)
   - pino, uuid, react-router (lower effort)

### ONGOING
- Set up `npm audit` in CI/CD to block on HIGH/CRITICAL CVEs
- Schedule monthly dependency updates
- Subscribe to security advisories for key packages

---

## CROSS-TEAM ESCALATIONS

| Finding | Escalate To | Action |
|---------|-------------|--------|
| DEP-001 (Handlebars injection) | TheGuardians | Assess if templates accept user input; if yes, treat as CRITICAL security bug |
| DEP-002 (Vitest UI file read) | TheGuardians | Verify dev environment isolation; restrict network access if possible |
| DEP-005 (Form-Data CRLF) | TheGuardians | Check if form field names are user-controlled; if yes, upgrade immediately |
| DEP-006 (js-yaml DoS) | TheGuardians | Check if YAML is parsed from user input; if yes, upgrade immediately |

---

## JSON SUMMARY

```json
{
  "timestamp": "2026-09-17",
  "package_managers": ["npm"],
  "projects_scanned": {
    "Source": {
      "Backend": {"direct": 13, "transitive": 412, "cves": {"critical": 1, "high": 4, "moderate": 3, "low": 2, "total": 10}},
      "Frontend": {"direct": 13, "transitive": 231, "cves": {"critical": 1, "high": 6, "moderate": 7, "low": 1, "total": 15}},
      "E2E": {"direct": 4, "transitive": 0, "cves": {"critical": 0, "high": 0, "moderate": 0, "low": 0, "total": 0}}
    },
    "Portal": {
      "Backend": {"cves": {"critical": 2, "high": 10, "moderate": 41, "low": 1, "total": 54}}
    },
    "Platform": {
      "Orchestrator": {"cves": {"critical": 1, "high": 2, "moderate": 4, "low": 1, "total": 8}}
    }
  },
  "critical_findings": 4,
  "high_findings": 10,
  "medium_findings": 2,
  "low_findings": 4,
  "outdated_major_packages": 6,
  "action_items": {
    "p1": ["Handlebars upgrade (DEP-001)", "Vitest upgrade (DEP-002)"],
    "p2": ["npm audit fix (DEP-003 to DEP-010)", "Express/Pino/UUID/React upgrades planned"],
    "p3": ["License audit", "CI/CD integration"]
  }
}
```
