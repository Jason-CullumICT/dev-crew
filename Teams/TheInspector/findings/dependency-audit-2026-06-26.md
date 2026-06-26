# Dependency Auditor Findings

**Audit Date:** 2026-06-26  
**Scoped Workspaces:** Source/Backend, Source/Frontend, Source/E2E  
**Package Managers Detected:** npm (Node.js)

---

## Executive Summary

### Vulnerability Overview
- **Total CVEs Found:** 38
  - **Critical:** 2 (Vitest, Minizlib)
  - **High:** 4 (form-data, vite, ws)
  - **Moderate:** 24
  - **Low:** 1

### Dependency Statistics
| Workspace | Direct Deps | Transitive Deps | Total Packages |
|-----------|------------|----------------|----------------|
| Backend   | 8          | 104 (312 dev)  | 412            |
| Frontend  | 3          | 6 (222 dev)    | 231            |
| E2E       | 4          | 0              | 4              |

### Overall Health: **C-** (Actionable issues present)
- 2 critical vulnerabilities require immediate upgrades
- 4 high-severity CVEs in direct/indirect dependencies
- Multiple major version lags (express, pino, vitest, vite)
- Supply chain risk from large dev dependency trees

---

## Critical Findings (P1)

### DEP-001: Vitest UI Server Arbitrary File Read & Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Remote Code Execution
- **Package:** `vitest` (direct dependency in Frontend)
- **Affected Versions:** `<=3.2.5`
- **Current Version:** `2.0.5` ❌ VULNERABLE
- **File:** Source/Frontend/package.json
- **CVSS Score:** 9.8 (Critical)
- **CVE/Advisory:** GHSA-5xrq-8626-4rwp
- **Detail:**
  - When Vitest UI server is listening (dev mode), arbitrary files can be read and executed
  - This affects test suites in development environments
  - No authentication required; network-accessible
  - Impacts confidentiality (H), integrity (H), and availability (H)
- **Fix:** 
  ```bash
  cd Source/Frontend
  npm install vitest@^3.2.6 --save-dev
  ```
  - Upgrade to vitest ≥3.2.6 (requires vite ≥8.1.0)
  - Note: Major version jump to vitest 4.x may require migration

**[CROSS-REF: TheGuardians]** — RCE vulnerability in development toolchain; verify no prod build artifacts exposed via UI server

---

### DEP-002: Minizlib Uncontrolled Resource Consumption (DoS)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Denial of Service
- **Package:** `minizlib` (transitive, via tar → npm internals)
- **Affected Versions:** `>=2.0.0 <2.1.1`
- **CVSS Score:** 7.5 (High)
- **CVE/Advisory:** GHSA-54xg-f67j-4534
- **Detail:**
  - DoS via specially crafted compressed data
  - Can trigger uncontrolled CPU/memory consumption
  - Affects dependency resolution during npm install
- **Fix:**
  ```bash
  npm audit fix --audit-level=critical
  ```
  - Or manually upgrade transitive dependency if fix is available
- **Cross-dep Impact:** May require npm cache clear and fresh install

---

## High-Severity Findings (P2)

### DEP-003: form-data CRLF Injection via Multipart Field Names
- **Severity:** P2 (HIGH)
- **Category:** CVE - Header Injection
- **Package:** `form-data` (transitive, via axios/other)
- **Affected Versions:** `>=4.0.0 <4.0.6`
- **Current Version in Frontend:** 4.0.5 ❌ VULNERABLE
- **CVSS Score:** 7.5 (High)
- **CVE/Advisory:** GHSA-hmw2-7cc7-3qxx
- **Detail:**
  - Multipart field names and filenames are not escaped for CRLF characters
  - Allows injection of HTTP headers via form data
  - Can be exploited if untrusted filenames are used in multipart uploads
- **Fix:**
  ```bash
  cd Source/Frontend
  npm install form-data@^4.0.6 --save
  ```
- **Impact:** If frontend uploads files, verify no untrusted filenames are passed directly

---

### DEP-004: Vite Path Traversal & Windows Alternate Path Bypass
- **Severity:** P2 (HIGH)
- **Category:** CVE - Path Traversal / Access Control Bypass
- **Package:** `vite` (direct dependency in Frontend)
- **Affected Versions:** `<=6.4.2`
- **Current Version:** 5.4.0 ❌ VULNERABLE
- **CVSS Score:** High (multiple CVEs)
- **CVEs:**
  - GHSA-4w7w-66w2-5vf9: Path traversal in `.map` handling
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure on Windows
  - GHSA-fx2h-pf6j-xcff: `server.fs.deny` bypass on Windows
- **Detail:**
  - Dev server can be tricked to serve files outside intended root
  - Windows: alternate path formats (UNC paths) bypass `server.fs.deny`
  - Information disclosure of source maps and private files
- **Fix:**
  ```bash
  cd Source/Frontend
  npm install vite@^8.1.0 --save-dev
  ```
  - Note: Major version jump; may require config/API updates (see vite v8 migration guide)

---

### DEP-005: ws WebSocket Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** CVE - Denial of Service
- **Package:** `ws` (transitive, likely via dev deps)
- **Affected Versions:** `>=8.0.0 <8.21.0`
- **CVSS Score:** 7.5 (High)
- **CVE/Advisory:** GHSA-96hv-2xvq-fx4p
- **Detail:**
  - Memory exhaustion from tiny fragments and data chunks in WebSocket frames
  - Attacker can craft malformed WebSocket messages to exhaust server memory
  - Affects dev servers using ws library (e.g., live-reload)
- **Fix:**
  ```bash
  npm audit fix
  ```
  - Upgrade ws to ≥8.21.0 (transitive fix via dependency update)

---

## Moderate-Severity Findings (P3)

### DEP-006: JS-YAML Quadratic DoS in Merge Key Handling
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Denial of Service
- **Package:** `js-yaml` (transitive, via @istanbuljs/load-nyc-config → jest)
- **Affected Versions:** `<=4.1.1`
- **CVSS Score:** 5.3
- **Detail:** DoS from repeated YAML aliases triggering O(n²) merge key processing
- **Fix:** Upgrade jest or js-yaml directly
- **Backend Impact:** Test suite only (dev dependency)

---

### DEP-007: QS DoS via Comma-Format Arrays with encodeValuesOnly
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Denial of Service
- **Package:** `qs` (transitive, via body-parser → express)
- **Affected Versions:** `>=6.11.1 <=6.15.1`
- **CVSS Score:** 5.3
- **Detail:** Crash when `qs.stringify()` processes null/undefined in comma-format arrays with `encodeValuesOnly` set
- **Fix:** 
  ```bash
  cd Source/Backend
  npm audit fix
  ```
- **Backend Impact:** Backend uses body-parser for JSON parsing; moderate risk

---

### DEP-008: PostCSS XSS via Unescaped </style> in CSS Output
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Cross-Site Scripting (XSS)
- **Package:** `postcss` (transitive, via vite/tailwind)
- **Affected Versions:** `<8.5.10`
- **CVSS Score:** 6.1
- **Detail:** Unescaped CSS `</style>` sequences in output allow breaking out of style context and injecting HTML
- **Fix:**
  ```bash
  cd Source/Frontend
  npm install postcss@^8.5.10 --save
  ```

---

### DEP-009: Brace-Expansion Zero-Step Sequence Hang
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Denial of Service
- **Package:** `brace-expansion` (transitive)
- **Affected Versions:** `<1.1.9`
- **CVSS Score:** 5.3
- **Detail:** Zero-step sequences (e.g., `{a..0}`) cause infinite loop and memory exhaustion
- **Fix:** Transitive fix via dependency upgrades (jest, various build tools)

---

### DEP-010: React Router Open Redirect via Protocol-Relative URLs
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Open Redirect
- **Package:** `react-router` (transitive, via react-router-dom in Frontend)
- **Affected Versions:** `>=6.7.0 <6.30.4`
- **Current Version:** 6.30.3 ❌ VULNERABLE (off by one)
- **CVSS Score:** Not rated (likely medium)
- **Detail:**
  - Same-origin redirects with path starting `//` are reinterpreted as protocol-relative URLs
  - Allows open redirect to attacker-controlled domain
  - Affects routing logic if paths are derived from untrusted input
- **Fix:**
  ```bash
  cd Source/Frontend
  npm install react-router-dom@^6.30.4 --save
  ```
- **Frontend Impact:** Verify all redirect logic; if any redirect target is user-derived, audit carefully

---

### DEP-011: Esbuild CORS/SOP Bypass in Dev Server
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Security Policy Bypass
- **Package:** `esbuild` (transitive, via vite)
- **Affected Versions:** `<=0.24.2`
- **CVSS Score:** 5.3
- **Detail:** Any website can send arbitrary requests to dev server and read responses (CORS bypass)
- **Fix:** Upgrade vite to ≥8.1.0 (which includes esbuild fix)

---

### DEP-012: @babel/core Arbitrary File Read via sourceMappingURL
- **Severity:** P3 (LOW → MODERATE depending on context)
- **Category:** CVE - Information Disclosure
- **Package:** `@babel/core` (transitive, via babel-jest/ts-jest)
- **Affected Versions:** `<=7.29.0`
- **CVSS Score:** 3.2 (Low)
- **Detail:** Source maps with malicious sourceMappingURL comments can leak local filesystem paths
- **Fix:** Upgrade @babel/core (transitive; likely fixed in newer jest/babel)

---

### DEP-013: UUID Missing Buffer Bounds Check (High CVSS, Direct Dep)
- **Severity:** P2/P3 (MODERATE → HIGH)
- **Category:** CVE - Buffer Overflow / Memory Corruption
- **Package:** `uuid` (direct dependency in Backend)
- **Affected Versions:** `<11.1.1`
- **Current Version:** 9.0.1 ❌ VULNERABLE
- **CVSS Score:** 7.5 (High)
- **CVE/Advisory:** GHSA-w5hq-g745-h8pq
- **Detail:**
  - Missing buffer bounds check in v3/v5/v6 when `buf` parameter is provided
  - Can be exploited if UUID generation uses untrusted buffer parameters
  - Impacts integrity (potential corruption of memory adjacent to buffer)
- **Fix:**
  ```bash
  cd Source/Backend
  npm install uuid@^11.1.1 --save
  ```
  - Note: Major version jump from 9 → 11; verify no API changes in code

---

## Outdated Dependencies (P3)

### DEP-014: Express 4 Major Behind (Backend)
- **Severity:** P3
- **Category:** Outdated
- **Package:** `express`
- **Current:** 4.18.2 → **Wanted:** 4.22.2 → **Latest:** 5.2.1
- **Age Gap:** 4 releases behind (v4), not on v5
- **Risk:** Missing security patches, bug fixes, performance improvements
- **Recommendation:** 
  - Minor bump (4.18.2 → 4.22.2) is safe: `npm install express@4.22.2`
  - v5 is a major rewrite; defer unless actively planning
- **Timeline:** Deprecation warning likely on v4 within 12–18 months

---

### DEP-015: Pino 8 Major Behind (Backend)
- **Severity:** P3
- **Category:** Outdated
- **Package:** `pino` (logging library)
- **Current:** 8.17.0 → **Wanted:** 8.21.0 → **Latest:** 10.3.1
- **Age Gap:** 2 major versions behind
- **Risk:** Logging performance regressions, security patches, feature parity
- **Recommendation:**
  - Upgrade to 8.21.0 (bug fixes): `npm install pino@8.21.0`
  - Plan v10 migration (includes async improvements, better perf)

---

### DEP-016: React 18 Major Behind (Frontend)
- **Severity:** P3
- **Category:** Outdated
- **Package:** `react` and `react-dom`
- **Current:** 18.3.1 → **Latest:** 19.2.7
- **Age Gap:** 1 major version behind
- **Risk:** Missing concurrent rendering improvements, new hooks, security fixes
- **Recommendation:**
  - React 19 is stable; plan migration (may require component updates)
  - `npm install react@latest react-dom@latest`
  - Timeline: React 18 EOL likely within 12 months

---

### DEP-017: React Router DOM Major Behind (Frontend)
- **Severity:** P3
- **Category:** Outdated + Vulnerable
- **Package:** `react-router-dom`
- **Current:** 6.26.0 → **Latest:** 7.18.0
- **Age Gap:** 1 major version behind
- **Risk:** Outdated + CVE-006 (open redirect) pending update
- **Recommendation:**
  - **Action:** Upgrade to 6.30.4+ immediately (fixes open redirect)
  - Plan v7 migration for next release cycle
  - `npm install react-router-dom@^6.30.4`

---

### DEP-018: Vitest 2 Major Behind (Frontend)
- **Severity:** P3
- **Category:** Outdated + Critical CVE
- **Package:** `vitest`
- **Current:** 2.0.5 → **Latest:** 4.x
- **Age Gap:** 2+ major versions behind
- **Risk:** DEP-001 (arbitrary file read RCE), missing performance improvements
- **Recommendation:**
  - **Action:** Upgrade to vitest ≥3.2.6 immediately (fixes P1 CVE)
  - Can eventually jump to v4 (breaking changes likely)
  - `npm install vitest@latest --save-dev`

---

### DEP-019: Vite 5 Behind Latest (Frontend)
- **Severity:** P3
- **Category:** Outdated + High CVE
- **Package:** `vite`
- **Current:** 5.4.0 → **Latest:** 8.1.0+
- **Age Gap:** 3+ major versions behind
- **Risk:** DEP-004 (path traversal + Windows bypass), security hardening
- **Recommendation:**
  - **Action:** Upgrade to 8.1.0+ (fixes P2 CVEs)
  - Plan incremental migration (v6 → v7 → v8)
  - `npm install vite@^8.1.0 --save-dev`

---

## Low-Severity Findings (P4)

### DEP-020: Various Transitive Moderate CVEs in Jest Ecosystem
- **Severity:** P4 (Dev-only, moderate risk)
- **Packages:** jest-snapshot, babel-jest, ts-jest chain
- **Issue:** Test infrastructure has moderate CVEs (js-yaml, brace-expansion)
- **Fix:** Update jest to latest stable or pin versions that fix transitive deps

---

## Supply Chain Risk Assessment

### Dependency Tree Size
- **Backend:** 412 total packages (104 prod + 308 dev)
- **Frontend:** 231 total packages (9 prod + 222 dev)
- **E2E:** 4 packages (no transitive deps)

**Risk Level:** 🟡 MODERATE
- Dev dependency trees are large but isolated from production
- No post-install scripts detected (good security practice)
- Recommend continued monitoring for supply chain incidents in high-volume packages

---

## Remediation Plan

### Immediate (Week 1) — P1/P2 Vulnerabilities
```bash
# Backend
cd Source/Backend
npm install uuid@^11.1.1 --save
npm audit fix  # For qs, other moderate deps

# Frontend
cd Source/Frontend
npm install vitest@^3.2.6 --save-dev  # Fixes P1 RCE
npm install vite@^8.1.0 --save-dev    # Fixes P2 path traversal
npm install form-data@^4.0.6 --save   # Fixes P2 CRLF injection
npm install react-router-dom@^6.30.4 --save  # Fixes open redirect
npm audit fix
```

### Short-term (Month 1) — P3 Outdated Versions
```bash
# Backend
npm install express@4.22.2 --save
npm install pino@8.21.0 --save

# Frontend
npm install react@latest react-dom@latest --save
npm install typescript@latest --save-dev
```

### Medium-term (Q3 2026) — Major Version Migrations
- React 19 migration (components, hooks audit)
- Vite v8 config adjustments (if major breaking changes)
- Vitest v4 migration (if breaking changes detected)

---

## Testing & Verification

After applying fixes:

```bash
# Run full audit suite
npm audit --audit-level=moderate

# Test build & execution
npm run build
npm test

# Check for regressions
npm ls  # Verify no version conflicts
```

---

## Learnings & Recommendations

1. **Enable Dependabot/Snyk:** Automate CVE scanning on push
2. **Audit Lock:** Commit package-lock.json changes only after full test suite passes
3. **Pre-commit Hook:** Consider `npm audit` check (with threshold) in git hooks
4. **Scheduled Audit:** Monthly audit runs to catch newly-disclosed CVEs
5. **React/Vite Roadmap:** Plan multi-version migrations for major frameworks (v18→v19, vite v5→v8)

---

## JSON Summary

```json
{
  "audit_date": "2026-06-26",
  "workspace_scope": ["Source/Backend", "Source/Frontend", "Source/E2E"],
  "summary": {
    "grade": "C-",
    "cves_critical": 2,
    "cves_high": 4,
    "cves_moderate": 24,
    "cves_low": 1,
    "total_findings": 20,
    "outdated_major_versions": 6
  },
  "workspaces": {
    "backend": {
      "direct_deps": 8,
      "total_deps": 412,
      "vulnerabilities": 27,
      "critical": 1,
      "high": 1,
      "moderate": 24,
      "low": 1
    },
    "frontend": {
      "direct_deps": 3,
      "total_deps": 231,
      "vulnerabilities": 11,
      "critical": 1,
      "high": 3,
      "moderate": 6,
      "low": 1
    },
    "e2e": {
      "direct_deps": 4,
      "total_deps": 4,
      "vulnerabilities": 0
    }
  },
  "critical_findings": [
    "DEP-001: Vitest RCE (9.8 CVSS)",
    "DEP-002: Minizlib DoS (7.5 CVSS)"
  ],
  "high_findings": [
    "DEP-003: form-data CRLF injection",
    "DEP-004: Vite path traversal",
    "DEP-005: ws memory exhaustion"
  ],
  "remediation_effort": "2-4 hours (immediate fixes) + 1 week (migrations)"
}
```

---

## Cross-Team References

- **[CROSS-REF: TheGuardians]** — DEP-001 (Vitest RCE), DEP-003 (CRLF), DEP-008 (XSS): Security-critical fixes required before next deployment
- **[CROSS-REF: TheFixer]** — DEP-014 to DEP-020: Code migration + testing for major version upgrades (React v19, Vite v8)
- **[CROSS-REF: quality-oracle]** — No spec drift detected; upgrade paths do not affect functional requirements

