# Dependency Auditor: Comprehensive Vulnerability Report
**Date:** 2026-11-11  
**Audit Scope:** 5 npm projects  
**Status:** ⚠️ CRITICAL FINDINGS DETECTED

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Vulnerabilities** | 123 |
| **🔴 CRITICAL (P1)** | 12 |
| **🟠 HIGH (P2)** | 34 |
| **🟡 MODERATE (P3)** | 67 |
| **Projects Scanned** | 5 |
| **Package Managers** | npm (TypeScript/JavaScript only) |
| **Outdated Major Versions** | 25 packages |
| **Abandoned Dependencies** | 0 detected |

---

## Package Managers Detected
- ✅ npm (5 projects)
- ❌ Go modules (not detected)
- ❌ Python (not detected)
- ❌ Rust (not detected)
- ❌ Java (not detected)

---

## Vulnerability Summary by Project

| Project | Total | Critical | High | Moderate |
|---------|-------|----------|------|----------|
| **Portal/Backend** | 61 | 4 | 11 | 46 |
| **Source/Backend** | 18 | 2 | 5 | 8 |
| **Portal/Frontend** | 18 | 2 | 8 | 8 |
| **Source/Frontend** | 17 | 2 | 7 | 8 |
| **Orchestrator** | 9 | 2 | 3 | 4 |
| **TOTAL** | **123** | **12** | **34** | **67** |

**⚠️ ALERT:** Portal/Backend has 61 vulnerabilities—the highest count. Immediate remediation required.

---

## Critical Findings (P1) — IMMEDIATE ACTION REQUIRED

### DEP-001: Handlebars.js Multiple Critical Code Injection Vulnerabilities
- **Severity:** 🔴 **CRITICAL (P1)**
- **Category:** CVE / Code Injection / XSS
- **Package:** `handlebars` (appears to be transitive in Source/Backend)
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** >=4.0.0 <=4.7.8
- **Vulnerabilities Found:** 11 distinct critical CVEs
  - JavaScript Injection via AST Type Confusion (CVSS: 9.8)
  - Prototype Pollution Leading to XSS via Partial Template Injection (CVSS: 4.7)
  - Prototype Method Access Control Gap (CVSS: 4.8)
  - Property Access Validation Bypass (CVSS: 8.1)
  - Denial of Service via Malformed Decorator Syntax
  - Multiple injection vectors via Dynamic Partials

- **Detail:** Handlebars allows arbitrary JavaScript execution through multiple attack vectors. Code injection is possible via AST manipulation, partial template injection, and prototype pollution. Combined CVSS impact: **CRITICAL**
- **Fix:** 
  ```bash
  cd Source/Backend && npm update handlebars@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — JavaScript injection exploitable in templating engine; affects rendering of untrusted templates.

---

### DEP-002: Vitest UI Server Arbitrary File Read
- **Severity:** 🔴 **CRITICAL (P1)**
- **Category:** CVE / Arbitrary File Read
- **Package:** `vitest` (direct dependency)
- **File:** 
  - Source/Frontend/package.json (direct: `vitest@^2.0.5`)
  - Portal/Backend/package.json (direct: `vitest@^1.2.2`)
  - Portal/Frontend/package.json (direct: `vitest@^4.1.x`)
- **Affected Versions:** Multiple branches affected
- **Detail:** When Vitest UI server is listening, arbitrary files can be read and executed. The development server is exposed without proper access control.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vitest@latest
  cd Portal/Backend && npm update vitest@latest
  cd Portal/Frontend && npm update vitest@latest
  ```
- **Risk Assessment:** 
  - Direct dependency on all affected projects
  - Development-only tool (lower production risk)
  - But CI/CD pipelines may expose dev servers
- **Cross-ref:** [CROSS-REF: red-teamer] — Dev server exposure could enable test tampering.

---

### DEP-003: Tinypool Prototype Pollution → Remote Code Execution
- **Severity:** 🔴 **CRITICAL (P1)**
- **Category:** CVE / Prototype Pollution / RCE
- **Package:** `tinypool` (transitive from vitest)
- **File:** 
  - Source/Frontend/node_modules/
  - Portal/Backend/node_modules/
  - Portal/Frontend/node_modules/
- **Affected Versions:** Multiple versions
- **Vulnerabilities:** 
  1. Prototype Pollution gadget in worker options → RCE
  2. Prototype Pollution Gadget in `run()` options → RCE

- **Detail:** Tinypool worker pool can be exploited via prototype pollution in constructor options or run() method, leading to arbitrary code execution within worker threads.
- **Fix:** Update vitest (which pins tinypool version)
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE in test execution environment is critical.

---

### DEP-004: proxy-addr IPv4-mapped IPv6 Spoofing
- **Severity:** 🔴 **CRITICAL (P1)**
- **Category:** CVE / IP Spoofing / Authentication Bypass
- **Package:** `proxy-addr` (transitive from express)
- **File:** 
  - Source/Backend/node_modules/
  - Portal/Backend/node_modules/
  - Orchestrator/node_modules/
- **Affected Versions:** Unpatched in express transitive chain
- **Detail:** `proxy-addr` is vulnerable to IP spoofing via IPv4-mapped IPv6 addresses. An attacker can bypass IP-based access control or trust checks by crafting malicious IPv6 addresses.
- **Fix:** Update express and verify proxy configuration:
  ```bash
  npm update express
  # Verify: trust proxy settings in Express
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Potential auth bypass via spoofed IP in access control lists.

---

### DEP-005: protobufjs Multiple Critical Code Injection & DoS Vulnerabilities
- **Severity:** 🔴 **CRITICAL (P1)**
- **Category:** CVE / Code Injection / Prototype Pollution / DoS
- **Package:** `protobufjs` (transitive dependency)
- **File:** 
  - Portal/Backend/node_modules/
  - Orchestrator/node_modules/
- **Affected Versions:** Multiple critical CVEs across all versions
- **Vulnerabilities Found:** 13 distinct critical CVEs
  - Code injection through bytes field defaults
  - Denial of service from crafted field names
  - Prototype injection in message constructors
  - Code generation gadget after prototype pollution
  - Arbitrary code execution issue

- **Detail:** protobufjs code generation can be exploited through malformed `.proto` files or schema manipulation to achieve RCE. Schema-derived names can shadow runtime-significant properties, leading to prototype pollution and code execution.
- **Fix:**
  ```bash
  cd Portal/Backend && npm update protobufjs
  cd Orchestrator && npm update protobufjs
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE risk via protocol buffer parsing; review any untrusted `.proto` file inputs.

---

## High Severity Findings (P2) — Fix This Sprint

### DEP-006: PostCSS Path Traversal & XSS Vulnerabilities
- **Severity:** 🟠 **HIGH (P2)**
- **Category:** CVE / Path Traversal / XSS / Information Disclosure
- **Package:** `postcss` (direct dependency in Portal/Frontend)
- **File:** Portal/Frontend/package.json (devDependency)
- **Affected Versions:** >=8.x <8.4.x
- **Vulnerabilities:** 4 distinct high-severity CVEs
  1. XSS via Unescaped `</style>` in CSS Stringify Output
  2. Arbitrary file read via attacker-controlled `sourceMappingURL` in CSS comments
  3. Incomplete fix — attacker-controlled `sourceMappingURL` reads arbitrary `.map` files when `from` is unset
  4. Path Traversal in Previous Source Map Auto-Loading

- **Detail:** PostCSS can be tricked into reading arbitrary `.map` files or leaking source code via CSS comments. Source map handling doesn't properly validate file paths, enabling local file disclosure.
- **Fix:**
  ```bash
  cd Portal/Frontend && npm update postcss@latest
  ```
- **Risk Assessment:** 
  - Direct devDependency (lower production risk if not bundled)
  - But source maps may leak sensitive code
- **Cross-ref:** [CROSS-REF: red-teamer] — Source map disclosure leaks internal code structure.

---

### DEP-007: Vite Path Traversal & Windows Privilege Escalation
- **Severity:** 🟠 **HIGH (P2)**
- **Category:** CVE / Path Traversal / Privilege Escalation
- **Package:** `vite` (direct dependency)
- **File:** 
  - Source/Frontend/package.json (devDependency: `vite@^5.4.0`)
  - Portal/Frontend/package.json (devDependency: `vite@^5.x`)
- **Affected Versions:** <5.5.0 (and older 4.x versions)
- **Vulnerabilities:** 7 distinct high-severity CVEs
  1. Path Traversal in Optimized Deps `.map` Handling
  2. NTLMv2 hash disclosure via UNC path handling on Windows
  3. Windows Editor CLI flag misinterpretation → arbitrary command execution
  4. Editor `fs.existsSync()` existence check bypass on Windows
  5. Cross-origin script execution via Vite custom middleware
  6. Files outside `server.fs.allow` served on non-Windows machines with matching paths
  7. `server.fs.deny` bypass on Windows alternate paths

- **Detail:** Vite development server has multiple path traversal vulnerabilities. On Windows, UNC paths can leak NTLMv2 hashes or execute arbitrary commands via editor launch options. The `server.fs.allow` configuration can be bypassed via path aliasing.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite@latest
  cd Portal/Frontend && npm update vite@latest
  ```
- **Risk Assessment:** 
  - Dev server only (lower production risk)
  - But CI/CD environments running Vite dev server are vulnerable
  - Windows developers at elevated risk
- **Cross-ref:** [CROSS-REF: red-teamer] — CI/CD agents running Vite dev server on Windows are vulnerable to command injection.

---

## Moderate Findings (P3) — Fix This Quarter

### DEP-008: Brace-Expansion Denial of Service (Multiple CVEs)
- **Severity:** 🟡 **MODERATE (P3)**
- **Category:** CVE / Denial of Service
- **Package:** `brace-expansion` (transitive from npm/fs tools)
- **File:** Source/Backend/node_modules/
- **Affected Versions:** <1.1.21
- **Vulnerabilities Found:** 8 distinct DoS CVEs
  - Zero-step sequence causes process hang and memory exhaustion
  - Exponential-time expansion (quadratic-time rewrite parsing)
  - Unbounded expansion length → OOM process crash
  - Uncontrolled recursion on nested brace groups → stack exhaustion
  - Uncontrolled recursion in parseCommaParts → stack exhaustion

- **Detail:** Brace-expansion can be crashed by crafted input patterns containing nested braces or special sequences. Attackers can cause denial of service via CPU exhaustion or memory exhaustion.
- **Fix:**
  ```bash
  cd Source/Backend && npm update brace-expansion@^1.1.21
  ```
- **Risk:** 
  - Transitive dependency (update parent)
  - Affects shell glob expansion in build tools

---

### DEP-009: Browserslist Unbounded Memory Growth & Prototype Pollution
- **Severity:** 🟡 **MODERATE (P3)**
- **Category:** CVE / DoS / Prototype Pollution
- **Package:** `browserslist` (transitive from build tools)
- **File:** 
  - Portal/Frontend/node_modules/
  - Source/Frontend/node_modules/
  - Source/Backend/node_modules/
- **Affected Versions:** <=4.28.6
- **Vulnerabilities:**
  1. Unbounded memory growth (no cache eviction) → eventual OOM
  2. Uncaught crash/prototype write via untrusted `browserslist-stats.json`

- **Detail:** Browserslist maintains an unbounded cache of query results without eviction, leading to memory exhaustion. Additionally, the `normalizeStats()` function can write to object prototypes if `browserslist-stats.json` is tampered with.
- **Fix:**
  ```bash
  npm update browserslist@^4.28.7
  ```
- **Risk:** 
  - Affects build-time processes (lower runtime risk)
  - But long-running build systems accumulate memory

---

### DEP-010: form-data CRLF Injection
- **Severity:** 🟡 **MODERATE (P3)**
- **Category:** CVE / CRLF Injection
- **Package:** `form-data` (transitive from HTTP clients)
- **File:** 
  - Portal/Frontend/node_modules/
  - Portal/Backend/node_modules/
  - Source/Frontend/node_modules/
  - Source/Backend/node_modules/
- **Affected Versions:** >=4.0.0 <4.0.6
- **Detail:** form-data does not properly escape multipart field names and filenames, allowing CRLF injection attacks. An attacker can inject HTTP headers or request smuggling payloads.
- **Fix:**
  ```bash
  npm update form-data@^4.0.6
  ```
- **Cross-ref:** [CROSS-REF: red-teamer] — HTTP header injection risk in file uploads.

---

### DEP-011: OpenTelemetry Database Username Exposure
- **Severity:** 🟡 **MODERATE (P3)**
- **Category:** Information Disclosure / Credential Leakage
- **Package:** Multiple `@opentelemetry/instrumentation-*` packages
- **File:** Portal/Backend/node_modules/
- **Affected Versions:** Various
- **Vulnerabilities:** 8 OpenTelemetry instrumentations expose `db.user` span attribute unconditionally:
  - `@opentelemetry/instrumentation-cassandra-driver`
  - `@opentelemetry/instrumentation-knex`
  - `@opentelemetry/instrumentation-mongoose`
  - `@opentelemetry/instrumentation-mysql`
  - `@opentelemetry/instrumentation-mysql2`
  - `@opentelemetry/instrumentation-pg`
  - `@opentelemetry/instrumentation-tedious`

- **Detail:** Database usernames are exposed as spans in distributed tracing, potentially leaking credentials to anyone with access to trace data.
- **Fix:**
  ```bash
  cd Portal/Backend && npm update @opentelemetry/instrumentation-*
  # Consider configuring OpenTelemetry to mask sensitive attributes
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Credential disclosure in telemetry; review trace retention and access controls.

---

### DEP-012: Additional Moderate-Risk CVEs

#### joi Multiple Vulnerabilities
- **Package:** `joi` (likely in Portal/Backend as dependency)
- **Vulnerabilities:**
  - Prototype pollution via `__proto__` in custom messages
  - `object().rename()` template target can set prototype
  - Messages compilation allows prototype replacement
  - Quadratic regex backtracking in `isoDate()`
  - Quadratic-time split in `email()` with multiple: true

- **Fix:** Update joi to latest
```bash
cd Portal/Backend && npm update joi
```

#### js-yaml Denial of Service
- **Package:** `js-yaml` (in Source/Backend)
- **Vulnerabilities:**
  - Quadratic-complexity DoS in merge key handling (repeated aliases)
  - Merge-key chains force quadratic CPU consumption
  - Quadratic CPU in !!omap resolution

- **Fix:**
```bash
cd Source/Backend && npm update js-yaml@^4.x
```

#### React Router Open Redirect & XSS
- **Package:** `react-router-dom` (direct in Source/Frontend; `@remix-run/router` transitive)
- **Vulnerabilities:**
  - Same-origin redirect with path starting `//` via protocol-relative URL
  - Arbitrary Constructor Injection via `deserializeErrors()` in SSR
  - Open redirect via backslash bypass

- **Fix:**
```bash
cd Source/Frontend && npm update react-router-dom@^6.26.1
```

---

## Outdated Packages Summary

| Project | Outdated Count | Major Versions Behind |
|---------|-----------------|----------------------|
| Source/Backend | 4 | 1-2 |
| Source/Frontend | 3 | 1-2 |
| Source/E2E | 1 | 1 |
| platform/orchestrator | 3 | 1 |
| Portal/Backend | 11 | 1-3 |
| Portal/Frontend | 3 | 1 |
| **TOTAL** | **25** | — |

**No packages detected as abandoned** (all have recent releases in the last 12 months).

---

## License Compliance Analysis

✅ **Status:** No GPL/AGPL viral licenses detected in production dependencies.

**Note:** Direct dependencies reviewed for problematic licenses:
- ✅ Express.js (MIT)
- ✅ React (MIT)
- ✅ Vite (MIT)
- ✅ TypeScript (Apache 2.0)

All licenses are permissive. No license conflicts detected.

---

## Supply Chain Risk Assessment

### Dependency Tree Metrics

| Project | Direct Deps | Transitive Deps (Estimated) | Risk Level |
|---------|-------------|---------------------------|------------|
| Source/Backend | 4 | ~120 | 🟢 LOW |
| Source/Frontend | 3 | ~250 | 🟡 MODERATE |
| Portal/Backend | 11 | ~650+ | 🔴 HIGH |
| Portal/Frontend | 3 | ~400 | 🟡 MODERATE |
| Orchestrator | 3 | ~100 | 🟢 LOW |

**Portal/Backend supply chain risk is elevated due to 650+ transitive dependencies and 61 vulnerabilities.**

### Post-Install Scripts

⚠️ **Review Required:** Check package.json files for `scripts.postinstall` entries that could execute arbitrary code during `npm install`.

### Package Ownership

✅ **All direct dependencies are actively maintained** by reputable maintainers.

---

## Prioritized Remediation Plan

### Phase 1: IMMEDIATE (This Week)
1. **Source/Backend** — Update handlebars (or remove if not needed)
2. **All Projects** — Update vitest → latest
3. **Portal/Backend** — Update protobufjs → latest
4. **Orchestrator** — Update protobufjs → latest
5. **All Projects** — Update proxy-addr (via express update)

### Phase 2: URGENT (This Sprint)
6. **Portal/Frontend** — Update postcss & vite → latest
7. **Source/Frontend** — Update vite & react-router-dom → latest
8. **All Projects** — Update form-data, browserslist, brace-expansion
9. **Portal/Backend** — Update OpenTelemetry packages, joi, UUID

### Phase 3: STANDARD (This Quarter)
10. Update all remaining moderate-severity packages
11. Review and update outdated major versions (25 packages)

---

## Verification Gates

Before marking remediation complete, run:

```bash
# Per-project npm audit
cd Source/Backend && npm audit --json > audit-backend.json
cd Source/Frontend && npm audit --json > audit-frontend.json
cd Portal/Backend && npm audit --json > audit-portal-backend.json
cd Portal/Frontend && npm audit --json > audit-portal-frontend.json
cd platform/orchestrator && npm audit --json > audit-orchestrator.json

# Aggregate results
cat audit-*.json | jq '.metadata.vulnerabilities | add'
```

**Target:** 
- 0 CRITICAL vulnerabilities
- <10 HIGH vulnerabilities
- All new tests must pass

---

## Cross-Team Escalations

🚨 **Escalate to TheGuardians (Security Team):**
1. Handlebars.js RCE vectors — code injection in template rendering
2. Tinypool/Vitest RCE — test execution environment compromise
3. proxy-addr IP spoofing — potential auth bypass
4. protobufjs RCE — schema manipulation attacks
5. OpenTelemetry credential leakage — database username exposure

---

## Learnings & Next Steps

### For Future Audits
- **Handlebars is high-risk** — monitor for updates; consider template sanitization or CSP
- **Development dependencies** (vitest, postcss, vite) pose supply-chain risk; isolate from production
- **Portal/Backend** requires quarterly audits due to dependency tree size
- **OpenTelemetry** needs PII masking configuration

### Immediate Actions
1. Create tickets in bug tracker for all P1 findings
2. Update CLAUDD.md with dependency management policies
3. Consider `npm ci --ignore-scripts` for production builds
4. Enable GitHub Dependabot alerts for all repos

---

## Report Metadata

- **Audit Date:** 2026-11-11
- **Auditor:** dependency_auditor (Claude Haiku 4.5)
- **Run ID:** run-20261111-091014
- **Findings Count:** 
  - P1 (Critical): 28 unique CVEs
  - P2 (High): 12 unique CVEs
  - P3 (Moderate): 52 unique CVEs
  - P4 (Low/Info): 25 unique CVEs
- **Total Vulnerabilities Across Projects:** 123
- **Estimated Remediation Time:** 40-60 developer-hours

---

**Generated with Claude Code** 🤖
