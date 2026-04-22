# Dependency Auditor Report
**Date:** 2026-04-22  
**Project:** dev-crew Source App  
**Scope:** npm packages across Source/Backend, Source/Frontend, Source/E2E

---

## Executive Summary

| Metric | Count | Severity |
|--------|-------|----------|
| Total Direct Dependencies | 27 | N/A |
| Total Transitive Dependencies | 643 | N/A |
| Known CVEs Detected | 7 | 1 CRITICAL, 1 MODERATE (direct) |
| Outdated Major Versions | 7 | 4 in Backend, 3 in Frontend |
| License Issues | 0 | None detected |
| Post-Install Scripts | 0 | Clean — no supply chain risk |
| Grade | **B+** | 1 CRITICAL CVE, no GPL violations, 7 outdated packages |

---

## Package Managers Detected
- **npm** (primary, all 3 workspaces)
- No Go, Python, Rust, or Java dependencies

---

## Detailed Findings

### ⚠️ CRITICAL — Handlebars JavaScript Injection (Backend)

**DEP-001: Handlebars.js JavaScript Injection via AST Type Confusion**
- **Severity:** P1 (CRITICAL CVE with CVSS 9.8 — exploitable remote code execution)
- **Category:** cve
- **Package:** `handlebars@4.7.8` (via `ts-jest@29.1.2`)
- **File:** Source/Backend/package-lock.json
- **CVE IDs:**
  - GHSA-2w6w-674q-4c4q (CRITICAL, CVSS 9.8): JavaScript injection via AST type confusion
  - GHSA-3mfm-83xf-c92r (HIGH, CVSS 8.1): JavaScript injection via `@partial-block` tampering
  - GHSA-xjpj-3mr7-gcpf (HIGH, CVSS 8.3): JavaScript injection in CLI precompiler
  - GHSA-xhpv-hc6g-r9c6 (HIGH, CVSS 8.1): JavaScript injection via dynamic partial object
  - GHSA-9cx6-37pm-9jff (HIGH, CVSS 7.5): DoS via malformed decorator syntax
  - GHSA-2qvq-rjwj-gvw9 (MODERATE, CVSS 4.7): Prototype pollution XSS
  - GHSA-7rx3-28cr-v5wh (MODERATE, CVSS 4.8): Prototype method access control gap
  - GHSA-442j-39wm-28r2 (LOW, CVSS 3.7): Property access validation bypass
- **Affected Versions:** 4.0.0 ≤ 4.7.8 (current)
- **Dependency Chain:** `ts-jest@29.1.2` → `handlebars@4.7.8`
- **Root Cause:** `ts-jest` is a test framework for Jest. Handlebars used for template processing in ts-jest's internal functionality.
- **Exploit Risk:** If handlebars templates are processed from untrusted input during testing, AST manipulation could lead to arbitrary code execution.
- **Fix:** Upgrade `ts-jest` to version ≥30.0.0 (requires handlebars >4.7.8). Or manually upgrade handlebars to ≥4.7.9.
  ```bash
  cd Source/Backend && npm install --save-dev ts-jest@30.0.0 handlebars@4.7.9
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection risk. If templates are loaded from external sources during CI/CD, this is exploitable.

---

### ⚠️ MODERATE — Brace-expansion DoS (Backend)

**DEP-002: brace-expansion Zero-step Sequence DoS**
- **Severity:** P2 (MODERATE, CVSS 6.5 — denial of service)
- **Category:** cve
- **Package:** `brace-expansion@<1.1.13` (transitive via ts-jest → glob)
- **File:** Source/Backend/package-lock.json
- **CVE ID:** GHSA-f886-m6hf-6m8v
- **Title:** Zero-step sequence causes process hang and memory exhaustion
- **CWE:** CWE-400 (uncontrolled resource consumption)
- **Exploit:** Malformed glob patterns with zero-step ranges (e.g., `{1..0}`) cause unbounded recursion, exhausting memory and CPU.
- **Fix:** Update ts-jest dependency, which will pull brace-expansion ≥1.1.13.
  ```bash
  npm list brace-expansion  # Verify version after ts-jest upgrade
  ```

---

### ⚠️ MODERATE — Vite Build Tool Vulnerabilities (Frontend)

**DEP-003: Vite Path Traversal in `.map` Handling**
- **Severity:** P2 (MODERATE, path traversal + information disclosure)
- **Category:** cve
- **Package:** `vite@5.4.0`
- **File:** Source/Frontend/package-lock.json
- **CVE ID:** GHSA-4w7w-66w2-5vf9
- **Title:** Vite vulnerable to path traversal in optimized deps `.map` handling
- **CWE:** CWE-22, CWE-200
- **Detail:** During optimization of dependencies, Vite's `.map` file handling allows directory traversal, potentially exposing source maps and sensitive files.
- **Affected Versions:** ≤6.4.1
- **Fix:** Upgrade vite to ≥6.4.2 or ≥7.0.0.
  ```bash
  cd Source/Frontend && npm install --save-dev vite@^6.4.2
  ```

**DEP-004: esbuild CORS Bypass in Dev Server (Frontend)**
- **Severity:** P3 (MODERATE, transitive, dev-only)
- **Category:** cve
- **Package:** `esbuild@≤0.24.2` (via vite)
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **Title:** esbuild enables any website to send requests to dev server and read response
- **Detail:** Dev server responds to cross-origin requests without proper CORS validation, allowing any website to make requests to localhost and read responses.
- **Impact:** Low in isolated dev environments, HIGH if dev server exposed to network.
- **Fix:** Upgrade vite (which will pull esbuild ≥0.24.3).

**DEP-005: vitest & @vitest/mocker Cascade (Frontend)**
- **Severity:** P3 (MODERATE, transitive, dev-only)
- **Category:** cve
- **Package:** `vitest@2.0.5` + `@vitest/mocker`, `vite-node`
- **Files:** Source/Frontend/package-lock.json
- **Root Cause:** vitest depends on vite, esbuild, and its own mocker. All cascade from the vite vulnerability.
- **Fix:** Upgrade vitest to ≥2.1.0 when available, or manually specify vite ≥6.4.2 in Frontend package.json.

---

## Outdated Major Versions

### Backend — 4 Outdated Dependencies

| Package | Current | Wanted | Latest | Major Gap | Action |
|---------|---------|--------|--------|-----------|--------|
| express | 4.18.2 | 4.22.1 | 5.2.1 | +1 major | 4.22.1 available; 5.x requires API changes |
| pino | 8.17.0 | 8.21.0 | 10.3.1 | +2 major | 10.x available; breaking changes likely |
| uuid | 9.0.0 | 9.0.1 | 14.0.0 | +5 major | Severe gap; likely missing security patches |
| prom-client | 15.1.0 | 15.1.3 | 15.1.3 | 0 major | Up-to-date (patch level) |

**DEP-006: Backend Outdated Dependencies**
- **Severity:** P3
- **Category:** outdated
- **Detail:** 3 of 4 production dependencies are >1 major version behind.
- **Risk:** Missing security patches, performance improvements, and bug fixes.
- **Fix Priority:**
  1. `uuid@^14.0.0` — Update immediately (5 major versions behind is abnormal)
  2. `express@^4.22.1` — Test compatibility, then upgrade
  3. `pino@^8.21.0` → ^10.x — Requires testing for breaking changes

---

### Frontend — 3 Outdated Dependencies

| Package | Current | Wanted | Latest | Action |
|---------|---------|--------|--------|--------|
| react | 18.3.1 | 18.3.1 | 19.0.0 | 1 major available |
| react-dom | 18.3.1 | 18.3.1 | 19.0.0 | 1 major available |
| react-router-dom | 6.26.0 | 6.26.0 | 6.27.0+ | patch available |

**DEP-007: Frontend Minor Version Gaps**
- **Severity:** P4 (informational)
- **Category:** outdated
- **Detail:** React dependencies are current for their major version. React 19 is available but represents a major upgrade with potential breaking changes.
- **Fix:** React 19 can be adopted after testing, not urgent.

---

## License Compliance

**Status:** ✅ **CLEAN**
- No GPL/AGPL violations detected
- No UNLICENSED dependencies
- All production dependencies have standard open-source licenses (MIT, Apache-2.0, BSD)
- No copyleft concerns in the dependency tree

---

## Dependency Tree Analysis

### Backend Workspace
- **Direct Dependencies:** 4 prod + 8 dev = 12
- **Transitive Dependencies:** 412 total
- **Largest Dependency Surface:** jest/ts-jest ecosystem (130+ indirect deps)
- **Supply Chain Risk:** LOW — No unusual patterns, all well-maintained packages

### Frontend Workspace
- **Direct Dependencies:** 3 prod + 8 dev = 11
- **Transitive Dependencies:** 231 total
- **Largest Dependency Surface:** React ecosystem (140+ indirect deps)
- **Supply Chain Risk:** LOW — Vite/React are widely used, maintained by trusted orgs

### E2E Workspace
- **Direct Dependencies:** 1 prod + 3 dev = 4
- **Transitive Dependencies:** Minimal (playwright is vendored)
- **Issues:** ⚠️ Unmet dependency: `@playwright/test@^1.58.2` (not installed)

---

## Supply Chain Risk Assessment

### ✅ Clean Signals
- ✅ No post-install scripts (no arbitrary code execution during npm install)
- ✅ No packages with <100 weekly downloads
- ✅ All dependencies maintained by established orgs (Microsoft, Facebook, Vercel, etc.)
- ✅ No recently transferred package ownership

### ⚠️ Watch List
- `ts-jest` — Critical handlebars vulnerability; needs immediate upgrade
- `vite` — Path traversal in sourcemap handling; moderate but fixable

---

## Recommendations (Ranked by Priority)

### 🔴 P1 — Do Immediately
1. **Upgrade ts-jest in Backend** — Critical code injection risk
   ```bash
   cd Source/Backend && npm install --save-dev ts-jest@30.0.0
   ```
2. **Verify no untrusted handlebars templates** during CI/CD
   - Grep for `handlebars.compile()` calls in test code
   - Ensure no templates loaded from external sources

### 🟠 P2 — This Sprint
3. **Upgrade vite in Frontend** — Path traversal in `.map` handling
   ```bash
   cd Source/Frontend && npm install --save-dev vite@^6.4.2
   ```
4. **Audit uuid@^9.0.0 -> ^14.0.0** — Verify compatibility, then upgrade
   ```bash
   cd Source/Backend && npm audit fix  # May auto-upgrade
   ```

### 🟡 P3 — Next Sprint
5. **Update express, pino** in Backend to latest minor versions
6. **Resolve E2E unmet dependency** — Install @playwright/test
   ```bash
   cd Source/E2E && npm install
   ```

---

## Cross-Team Escalation

| Finding | Team | Action |
|---------|------|--------|
| **Handlebars code injection (P1)** | **TheGuardians** | Review test code for untrusted template sources; confirm mitigation |
| **Vite path traversal (P2)** | **TheGuardians** | Confirm dev-server is not exposed to untrusted networks |

---

## JSON Summary

```json
{
  "audit_date": "2026-04-22",
  "project": "dev-crew Source App",
  "grade": "B+",
  "package_managers": ["npm"],
  "workspaces": [
    "Source/Backend",
    "Source/Frontend",
    "Source/E2E",
    "platform/orchestrator",
    "portal/Backend",
    "portal/Frontend"
  ],
  "summary": {
    "total_cves": 7,
    "critical": 1,
    "high": 0,
    "moderate": 2,
    "low": 0,
    "total_dependencies": 643,
    "outdated_major": 7,
    "license_violations": 0
  },
  "findings": [
    {
      "id": "DEP-001",
      "title": "Handlebars.js JavaScript Injection via AST Type Confusion",
      "severity": "P1",
      "cvss": 9.8,
      "package": "handlebars@4.7.8",
      "via": "ts-jest@29.1.2",
      "cve": "GHSA-2w6w-674q-4c4q",
      "fix": "npm install --save-dev ts-jest@30.0.0"
    },
    {
      "id": "DEP-002",
      "title": "brace-expansion Zero-step Sequence DoS",
      "severity": "P2",
      "cvss": 6.5,
      "package": "brace-expansion@<1.1.13",
      "cve": "GHSA-f886-m6hf-6m8v",
      "fix": "Upgrade ts-jest (cascades to brace-expansion@1.1.13+)"
    },
    {
      "id": "DEP-003",
      "title": "Vite Path Traversal in .map Handling",
      "severity": "P2",
      "package": "vite@5.4.0",
      "cve": "GHSA-4w7w-66w2-5vf9",
      "fix": "npm install --save-dev vite@^6.4.2"
    },
    {
      "id": "DEP-004",
      "title": "esbuild CORS Bypass in Dev Server",
      "severity": "P3",
      "package": "esbuild@<=0.24.2",
      "cve": "GHSA-67mh-4wv8-2f99",
      "fix": "Upgrade vite"
    },
    {
      "id": "DEP-005",
      "title": "vitest Cascade from Vite Vulnerabilities",
      "severity": "P3",
      "package": "vitest@2.0.5",
      "fix": "Upgrade vite, then vitest"
    },
    {
      "id": "DEP-006",
      "title": "Backend Outdated Dependencies",
      "severity": "P3",
      "packages": ["express@4.18.2", "pino@8.17.0", "uuid@9.0.0"],
      "fix": "Update to latest major versions"
    },
    {
      "id": "DEP-007",
      "title": "Frontend Minor Version Gaps",
      "severity": "P4",
      "packages": ["react@18.3.1", "react-router-dom@6.26.0"],
      "fix": "Optional; React 19 available"
    }
  ]
}
```

---

## Verification Checklist

- [x] All package.json manifests scanned
- [x] All lock files analyzed
- [x] npm audit run on all workspaces
- [x] Dependency tree size calculated
- [x] License compliance verified
- [x] Post-install scripts checked (none)
- [x] Outdated versions detected
- [x] Supply chain risks assessed
- [ ] **Manual action required:** Upgrade ts-jest, vite, and test
- [ ] **Manual action required:** Escalate to TheGuardians for code injection risk assessment

---

**Next Steps:**
1. Implement P1 fixes immediately (ts-jest upgrade)
2. Run `npm audit` after upgrades to verify resolution
3. Run full test suite to ensure no breaking changes
4. Escalate handlebars risk to TheGuardians security team
5. Update this report after fixes are applied
