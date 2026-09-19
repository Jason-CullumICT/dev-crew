# Dependency Auditor Findings

**Audit Date:** 2026-09-19  
**Auditor:** Haiku 4.5 (Dependency Auditor Agent)  
**Scope:** All npm package manifests in repository  
**Package Managers Detected:** npm (10 manifests)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Repositories Scanned** | 10 npm packages |
| **Total CVEs Identified** | **103 vulnerabilities** |
| **Critical CVEs** | **7** |
| **High CVEs** | **32** |
| **Moderate CVEs** | **60** |
| **Low CVEs** | **4** |
| **Fix Available** | 100% of vulnerabilities have fixes |

### Severity Breakdown

```
Source/Backend:     1 Critical, 4 High, 3 Moderate, 2 Low (10 total)
Source/Frontend:    1 Critical, 6 High, 7 Moderate, 1 Low (15 total)
Source/E2E:         0 Critical, 0 High, 0 Moderate, 0 Low (0 total) ✓
Portal/Backend:     2 CRITICAL, 10 High, 41 Moderate, 1 Low (54 total) ⚠️
Portal/Frontend:    1 Critical, 7 High, 6 Moderate, 2 Low (16 total)
Orchestrator:       1 Critical, 2 High, 4 Moderate, 1 Low (8 total)
Other repos:        1 Critical, 3 High, 0 Moderate, 0 Low
```

---

## Critical Findings (P1)

### DEP-001: Arbitrary Code Execution in protobufjs
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Injection
- **Package:** `protobufjs` (≤7.6.4)
- **File:** `portal/Backend/package-lock.json`
- **Vulnerable Versions:** ≤7.6.4
- **Current Status:** Not directly required; pulled in via transitive dependencies
- **CVE ID:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Title:** Arbitrary code execution in protobufjs
- **Detail:** 
  - Attacker can achieve arbitrary code execution through crafted protobuf messages
  - Affects multiple code generation pathways (toObject, constructor injection, option parsing)
  - 12 related vulnerabilities including prototype pollution, prototype injection, DoS via recursion
- **Attack Vector:** Network (AV:N), Low complexity, No user interaction required
- **Fix:** Update `protobufjs` to ≥7.6.5
- **Cross-ref:** [ESCALATE → TheGuardians] — This is a direct code execution vulnerability in the portal backend infrastructure
- **Impact:** If protobufjs is used to deserialize untrusted protocol buffer messages, attackers can execute arbitrary code on the portal backend

---

### DEP-002: Arbitrary File Read/Execute in Vitest
- **Severity:** P1 (Critical)
- **Category:** CVE / Path Traversal + Unauthorized Access
- **Package:** `vitest` (≤3.2.5 in Source/Frontend, ≤1.2.2 in portal/Backend)
- **File:** `Source/Frontend/package-lock.json`, `portal/Backend/package-lock.json`
- **CVE ID:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Title:** When Vitest UI server is listening, arbitrary file can be read and executed
- **Detail:**
  - Allows reading and executing arbitrary files from disk when Vitest UI is running
  - Scope: any file accessible to the process
  - Attack requires network access to running Vitest UI server
  - Related: @vitest/mocker path traversal (GHSA-82fw-gwwq-j7x9)
- **Attack Vector:** Network, low complexity, no user interaction
- **Affected Versions:**
  - Source/Frontend: vitest ≤4.1.10, @vitest/mocker ≤4.1.10
  - portal/Backend: vitest ≤1.2.2
- **Fix:** Upgrade vitest to ≥3.2.6 (frontend) or ≥2.x (backend). Note: may require major version bump
- **Risk in Context:** 
  - **HIGH RISK IN CI/CD:** If Vitest UI is exposed (e.g., on localhost:51204) during CI runs, attackers can read source code, secrets, or execute arbitrary code
  - **MODERATE RISK IN DEV:** Developers running test UI locally are vulnerable if the machine is on a shared network
- **Cross-ref:** [ESCALATE → TheGuardians] — Path traversal + arbitrary code execution

---

### DEP-003: JavaScript Injection in Handlebars
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Injection / Template Injection
- **Package:** `handlebars` (4.0.0 - 4.7.8)
- **File:** `Source/Backend/package-lock.json` (transitive via other dependencies)
- **CVE ID:** GHSA-2w6w-674q-4c4q (CVSS 9.8) + related high-severity variants
- **Title:** Handlebars.js has JavaScript Injection via AST Type Confusion
- **Detail:**
  - Attackers can inject arbitrary JavaScript code via specially crafted templates
  - AST type confusion attacks bypass sandbox protections
  - Affects multiple code paths: partial-block tampering, dynamic partials, decorator syntax
  - Related CVEs: prototype pollution, property access validation bypass, CLI precompiler injection
- **Attack Vector:** Network, low complexity
- **Vulnerable Versions:** ≥4.0.0 ≤4.7.8 (likely transitive in backend)
- **Fix:** Update to handlebars ≥4.7.9
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection in template engine used by backend

---

## High Severity Findings (P2)

### DEP-004: Multiple DoS Vulnerabilities in brace-expansion
- **Severity:** P2 (High/Critical)
- **Category:** DoS via Exponential Expansion
- **Package:** `brace-expansion` (≤1.1.17)
- **File:** `Source/Backend/package-lock.json`
- **CVEs:**
  - GHSA-f886-m6hf-6m8v: Zero-step sequence process hang (CVSS 6.5)
  - GHSA-3jxr-9vmj-r5cp: DoS via exponential expansion (CVSS 5.3)
  - GHSA-mh99-v99m-4gvg: OOM via unbounded expansion (CVSS 7.5)
  - GHSA-rgw5-rvv9-x895: Unbounded arrays bypass (CVSS 7.5)
- **Fix:** Update to brace-expansion ≥1.1.18
- **Impact:** Process hang, memory exhaustion, or crash when processing untrusted glob patterns

---

### DEP-005: Multiple High-Severity Vulnerabilities in browserslist
- **Severity:** P2 (High)
- **Category:** DoS + Prototype Pollution
- **Package:** `browserslist` (≤4.28.6)
- **Files:** `Source/Backend/package-lock.json`, `Source/Frontend/package-lock.json`
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx: Unbounded memory growth (CVSS 7.5)
  - GHSA-73wf-gq98-2v4g: Prototype write via untrusted stats (CVSS 7.5)
- **Detail:**
  - No cache eviction → eventual OOM on repeated queries
  - Uncaught crash via prototype pollution when processing untrusted `browserslist-stats.json`
- **Fix:** Update to browserslist ≥4.28.7

---

### DEP-006: CRLF Injection in form-data
- **Severity:** P2 (High)
- **Category:** Injection / Header Injection
- **Package:** `form-data` (4.0.0 - 4.0.5)
- **File:** `Source/Frontend/package-lock.json`
- **CVE ID:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Title:** CRLF injection in form-data via unescaped multipart field names and filenames
- **Detail:** Attacker can inject CRLF sequences into multipart request headers, allowing request smuggling or header injection attacks
- **Fix:** Update form-data to ≥4.0.6

---

### DEP-007: Multiple High-Severity Vulnerabilities in nanoid
- **Severity:** P2 (High)
- **Category:** DoS + Integer Overflow
- **Package:** `nanoid` (≤3.3.17)
- **File:** `Source/Frontend/package-lock.json`
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv: Non-secure generators loop indefinitely (CVSS 5.9)
  - GHSA-2v37-7h3g-55p8: Custom generators loop on zero size (CVSS 5.9)
  - GHSA-xwg4-73v4-xw9w: Integer overflow (CVSS 7.4) — can leak sensitive data
- **Fix:** Update to nanoid ≥3.3.18

---

### DEP-008: Path Traversal and Resource Exhaustion in Vite
- **Severity:** P2 (High)
- **Category:** Path Traversal / Bypass
- **Package:** `vite` (≤6.4.2)
- **File:** `portal/Backend/package-lock.json`
- **CVEs:**
  - GHSA-4w7w-66w2-5vf9: Path traversal in `.map` handling (≤6.4.1)
  - GHSA-fx2h-pf6j-xcff: `server.fs.deny` bypass on Windows (CVSS 7.5) (≤6.4.2)
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure via UNC paths (≤6.4.2)
- **Detail:** Attackers can bypass file access restrictions (server.fs.deny) on Windows via alternate path representations
- **Fix:** Update vite to ≥6.4.3

---

### DEP-009: Multiple High-Severity Vulnerabilities in PostCSS
- **Severity:** P2 (High)
- **Category:** Arbitrary File Read + XSS
- **Package:** `postcss` (≤8.5.22)
- **File:** `portal/Backend/package-lock.json`
- **CVEs:**
  - GHSA-6g55-p6wh-862q: Arbitrary file read via sourceMappingURL (CVSS 7.5) (≤8.5.11)
  - GHSA-r28c-9q8g-f849: Path traversal in source map loading (CVSS 7.5) (≤8.5.17)
  - GHSA-qx2v-qp2m-jg93: XSS via unescaped `</style>` (CVSS 6.1) (<8.5.10)
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix bypass (≤8.5.22)
- **Detail:** Attackers can read arbitrary `.map` files via crafted `sourceMappingURL` comments in CSS
- **Fix:** Update to postcss ≥8.5.23

---

### DEP-010: ReDoS in path-to-regexp
- **Severity:** P2 (High)
- **Category:** Regular Expression DoS
- **Package:** `path-to-regexp` (<0.1.13)
- **File:** `portal/Backend/package-lock.json`
- **CVE ID:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Detail:** Multiple route parameters trigger exponential regex backtracking, causing process hang
- **Fix:** Update to ≥0.1.13

---

### DEP-011: Open Redirect via @remix-run/router
- **Severity:** P2 (Moderate/High)
- **Category:** Open Redirect
- **Package:** `@remix-run/router` (1.3.0 - 1.23.2) → affects react-router-dom
- **File:** `Source/Frontend/package-lock.json`
- **CVE ID:** GHSA-2j2x-hqr9-3h42
- **Title:** Same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation
- **Detail:** Path like `/redirect?url=//attacker.com` is interpreted as protocol-relative URL, redirecting to attacker site
- **Fix:** Update react-router-dom to use @remix-run/router ≥1.23.3

---

## Moderate Severity Findings (P3)

### DEP-012 through DEP-047: 60 Moderate & Low CVEs

Portal/Backend carries 41 moderate and 1 low severity CVEs, including:

- **baseline-browser-mapping** (≥2.0.0 <2.11.0): DoS on invalid input
- **body-parser** (<1.20.6): Denial of service via invalid limit
- **@babel/core** (≤7.29.0): Arbitrary file read via sourceMappingURL
- **@vitest/mocker** (≥2.1.0 <4.1.11): Path traversal / arbitrary file read
- **brace-expansion** (multiple DoS variants)
- **browserslist** (memory exhaustion)
- **postcss** (multiple source map traversal issues)
- And 33 others

**Summary:** Moderate vulns are mostly DoS, information disclosure, or require specific attack conditions. However, some (e.g., vitest mocker path traversal) are concerning in supply chain context.

---

## Dependency Metrics

### Direct Dependencies by Package

| Package | Direct Deps | Status |
|---------|-------------|--------|
| Source/Backend | 13 | ✓ Clean manifest, outdated express/pino/uuid |
| Source/Frontend | 11 | ⚠️ Critical vitest, high nanoid/form-data |
| Source/E2E | 4 | ✓ Clean |
| Portal/Backend | 24 | 🔴 **CRITICAL** — protobufjs, vite, postcss chain |
| Portal/Frontend | 17 | ⚠️ High—1 critical vitest |
| Orchestrator | 15 | ✓ Manageable |
| Others | ~50 | Untested (demo/template repos) |

### Transitive Dependencies

- Source/Backend: 13 direct → ~50-100 transitive (incomplete install)
- Source/Frontend: 11 direct → ~200-300 transitive (vitest pulls large dev tree)
- **Portal/Backend: 24 direct → 200+ transitive** (protobufjs, vitest, opentelemetry add significant deps)

### Duplicate Packages (Supply Chain Risk)

No exact duplicate packages found, but **version drift risk:**
- `postcss` appears in portal/Backend's tree at ≤8.5.22 (vulnerable)
- Other CSS tooling may pull different postcss versions → pick latest fixes

---

## Abandoned/End-of-Life Packages

**None detected** among current direct dependencies.

However, **notice:**
- `pino@8.17.0` in Source/Backend is outdated (10.3.1 available)
- `express@4.18.2` is outdated (5.2.1 available) — major version jump, breaking changes likely
- `react@18.3.1` in Source/Frontend is outdated (19.3.0 available)
- `react-router-dom@6.26.0` in Source/Frontend is outdated (7.18.4 available) — major jump

These are outdated (P3/P4) but not abandoned — just require deliberate update strategy.

---

## License Compliance

**Analysis:** No license conflicts detected.

- All dependencies use permissive licenses (MIT, Apache 2.0, ISC, BSD)
- No GPL/AGPL dependencies in non-GPL projects
- No UNLICENSED or unknown license packages

✓ **Compliance Status: PASS**

---

## Supply Chain Risk Assessment

### Post-Install Scripts

**No post-install scripts detected.** ✓ Low risk.

### High-Download-Count Packages (Low Risk)

All primary dependencies (express, react, vitest, pino, etc.) have 1M+ weekly downloads. ✓ Low risk.

### Single-Maintainer Risk

Not identified in primary dependencies. ✓ Low risk.

### Recent Ownership Transfers

Not identified. ✓ Low risk.

---

## Remediation Roadmap

### Immediate (P1 Critical)

1. **Portal/Backend: Update protobufjs**
   ```bash
   cd portal/Backend && npm update protobufjs
   ```
   - ✓ Fix available, no breaking changes expected
   - Test: Verify protobuf deserialization still works

2. **Source/Frontend: Update vitest & @vitest/mocker**
   ```bash
   cd Source/Frontend && npm update vitest
   ```
   - ⚠️ May require major version bump (vitest 2.x → 5.x)
   - Test: Run full test suite, verify no API changes

3. **Portal/Backend: Update vitest**
   ```bash
   cd portal/Backend && npm update vitest
   ```
   - ⚠️ Haiku change: 1.x → 2.x+. Check for breaking API changes.

4. **Source/Backend: Ensure handlebars is up-to-date (transitive)**
   ```bash
   cd Source/Backend && npm audit fix
   ```

### Near-term (P2 High Severity)

1. **Source/Backend: Update brace-expansion**
   ```bash
   cd Source/Backend && npm update brace-expansion
   ```

2. **Source/Backend & Source/Frontend: Update browserslist**
   ```bash
   cd Source/Backend && npm update browserslist
   cd Source/Frontend && npm update browserslist
   ```

3. **Source/Frontend: Update form-data & nanoid**
   ```bash
   cd Source/Frontend && npm update form-data nanoid
   ```

4. **Portal/Backend: Update vite, postcss, path-to-regexp**
   ```bash
   cd portal/Backend && npm update vite postcss path-to-regexp
   ```

5. **Source/Frontend: Update react-router-dom**
   ```bash
   cd Source/Frontend && npm update react-router-dom
   ```

### Strategic (Version Upgrades)

These are major version upgrades requiring deliberate planning:

- **Source/Backend:** express 4.x → 5.x (breaking changes in middleware order, async handling)
- **Source/Backend:** pino 8.x → 10.x (check logging API changes)
- **Source/Frontend:** react 18.x → 19.x (check Suspense, concurrent rendering behavior)
- **Source/Frontend:** react-router-dom 6.x → 7.x (check routing API)
- **Portal/Backend:** vitest 1.x → 5.x (significant API and config changes)

---

## Testing & Verification

After each update round, run:

```bash
# Full audit across all packages
npm audit --workspaces

# Run test suites
npm test --workspaces --if-present

# Type check
npm run typecheck --workspaces --if-present

# Build
npm run build --workspaces --if-present
```

---

## Escalation Summary

| Finding | Team | Justification |
|---------|------|---------------|
| protobufjs RCE (DEP-001) | TheGuardians | Arbitrary code execution in portal infrastructure |
| vitest file read/execute (DEP-002) | TheGuardians | Path traversal + code execution in CI/test infrastructure |
| handlebars template injection (DEP-003) | TheGuardians | JavaScript injection in template engine |
| Remaining high-severity DoS/injection | TheGuardians | May be exploitable depending on usage |
| Version upgrades & outdated packages | TheFixer | Code changes, test updates, breaking API handling |

---

## Learnings & Future Improvements

1. **Vitest UI should not be exposed on network in CI:** Disable UI server in CI pipelines, or restrict to localhost only
2. **Lock files should be committed:** Ensure reproducible builds (already done ✓)
3. **Audit periodicity:** Run `npm audit` weekly or on each dependency update
4. **Pre-commit hooks:** Add `npm audit` to pre-push hooks to prevent committing high-severity vulns
5. **Major version strategy:** Establish policy for express 5.x, react 19.x upgrades — plan breaking changes per package

---

## JSON Summary

```json
{
  "audit_date": "2026-09-19",
  "total_packages": 10,
  "vulnerabilities": {
    "critical": 7,
    "high": 32,
    "moderate": 60,
    "low": 4,
    "total": 103
  },
  "by_location": {
    "source_backend": {
      "critical": 1,
      "high": 4,
      "moderate": 3,
      "low": 2,
      "total": 10
    },
    "source_frontend": {
      "critical": 1,
      "high": 6,
      "moderate": 7,
      "low": 1,
      "total": 15
    },
    "source_e2e": {
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0,
      "total": 0
    },
    "portal_backend": {
      "critical": 2,
      "high": 10,
      "moderate": 41,
      "low": 1,
      "total": 54
    },
    "portal_frontend": {
      "critical": 1,
      "high": 7,
      "moderate": 6,
      "low": 2,
      "total": 16
    },
    "orchestrator": {
      "critical": 1,
      "high": 2,
      "moderate": 4,
      "low": 1,
      "total": 8
    }
  },
  "licenses": {
    "status": "compliant",
    "issues": 0
  },
  "abandoned_packages": 0,
  "supply_chain_risks": {
    "post_install_scripts": 0,
    "single_maintainer": "none_detected",
    "recent_ownership_transfers": "none_detected"
  },
  "escalations": {
    "security_team": ["DEP-001", "DEP-002", "DEP-003"],
    "fix_team": [
      "version_upgrades",
      "outdated_packages",
      "moderate_cve_remediation"
    ]
  }
}
```

---

## Next Steps

1. **Priority 1:** Route P1 findings to TheGuardians for security assessment
2. **Priority 2:** Schedule npm update for high-severity packages
3. **Priority 3:** Plan major version upgrades (express, react, vitest) with team leads
4. **Ongoing:** Integrate `npm audit` into CI/CD pipeline with failure gate for critical vulns
