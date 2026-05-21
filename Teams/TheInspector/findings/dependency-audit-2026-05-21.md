# Dependency Audit Report — dev-crew Source Application
**Date:** 2026-05-21  
**Scope:** Source/Frontend, Source/Backend, Source/E2E  
**Package Managers:** npm (x3)  

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Projects Analyzed** | 3 (Frontend, Backend, E2E) |
| **Package Managers** | npm (all) |
| **Total Direct Dependencies** | 19 |
| **Total Transitive Dependencies** | ~650+ |
| **Known CVEs** | 10 total |
| **— Critical** | 1 |
| **— High** | 3 |
| **— Moderate** | 6 |
| **Outdated Major Versions** | 5 packages |
| **Supply Chain Risk** | MODERATE (large transitive tree, handlebars via ts-jest) |

---

## Findings by Severity

### 🔴 P1: Critical — Immediate Remediation Required

#### DEP-001: Handlebars.js Remote Code Execution
- **Severity:** P1 / CRITICAL
- **Category:** CVE (Multiple)
- **Package:** handlebars@4.7.8
- **File:** Source/Backend/package-lock.json
- **Location:** Transitive dependency via `ts-jest` → `handlebars`
- **Impact:** JavaScript injection via AST type confusion; allows RCE in template compilation
- **CVEs:**
  - **GHSA-2w6w-674q-4c4q** — "JavaScript Injection via AST Type Confusion" (CVSS 9.8 Critical)
  - **GHSA-3mfm-83xf-c92r** — "JavaScript Injection via AST Type Confusion by tampering @partial-block" (CVSS 8.1 High)
  - **GHSA-xhpv-hc6g-r9c6** — "JavaScript Injection via AST Type Confusion when passing an object as dynamic partial" (CVSS 8.1 High)
  - **GHSA-9cx6-37pm-9jff** — "Denial of Service via Malformed Decorator Syntax" (CVSS 7.5 High)
  - **GHSA-xjpj-3mr7-gcpf** — "JavaScript Injection in CLI Precompiler via Unescaped Names" (CVSS 8.2 High)
  - Plus 3 additional moderate/low severity CVEs
- **Affected Range:** 4.0.0 ≤ 4.7.8
- **Root Cause:** `ts-jest@29.1.2` depends on `handlebars ^4.7.8`, which includes all 4.x versions with known vulnerabilities
- **Fix:**
  ```bash
  cd Source/Backend
  npm update ts-jest  # or pin to next available version
  ```
  **Note:** Check if ts-jest has a newer version that doesn't depend on handlebars, or consider alternatives
- **Cross-ref:** [ESCALATE → TheGuardians] This is RCE-class and affects test compilation pipeline

---

### 🟠 P2: High — Deploy Blocker / Major Version Behind

#### DEP-002: Express 4.18.2 — Multiple Minor Versions Behind
- **Severity:** P2
- **Category:** Outdated (4 minor versions behind)
- **Package:** express@4.18.2 (current wanted: 4.22.2, latest: 5.2.1)
- **File:** Source/Backend/package.json
- **Direct Dependency:** Yes
- **Risk:** Each minor version includes security patches; 4 versions behind = potential missing patches
- **Fix:** `cd Source/Backend && npm update express@4`
- **Note:** Major version 5.x available but requires code changes (breaking API)

#### DEP-003: Pino 8.17.0 — Two Major Versions Behind
- **Severity:** P2
- **Category:** Outdated (2 major versions behind)
- **Package:** pino@8.17.0 (current wanted: 8.21.0, latest: 10.3.1)
- **File:** Source/Backend/package.json
- **Direct Dependency:** Yes
- **Risk:** Major version gap suggests significant changes; check release notes for breaking changes
- **Fix:** `cd Source/Backend && npm update pino@8` (conservative) or test with pino@10
- **Reference:** [Pino Changelog](https://github.com/pinojs/pino/releases)

#### DEP-004: Vite 5.4.0 — Multiple Moderate CVEs
- **Severity:** P2
- **Category:** CVE (Moderate x4)
- **Package:** vite@5.4.0
- **File:** Source/Frontend/package.json
- **Direct Dependency:** Yes
- **CVEs:**
  - **GHSA-4w7w-66w2-5vf9** — "Path Traversal in Optimized Deps `.map` Handling" (CVSS 0.0, but path traversal concern)
  - **GHSA-67mh-4wv8-2f99** (via esbuild) — "esbuild enables any website to send any requests to development server"
  - Cascading: @vitest/mocker, vite-node affected
- **Impact:** Dev-time security issues, potential information disclosure in development builds
- **Fix:** `cd Source/Frontend && npm update vite` (latest 8.0.13 available with fix)
- **Note:** Major version jump from 5 → 8 may break build process; test thoroughly

#### DEP-005: React 18.3.1 — Major Version Behind
- **Severity:** P2
- **Category:** Outdated (1 major version behind)
- **Package:** react@18.3.1 (latest: 19.2.6)
- **File:** Source/Frontend/package.json
- **Direct Dependency:** Yes (both react & react-dom)
- **Risk:** React 19 is now stable; 18.x will receive fewer security updates
- **Impact:** Long-term security and performance enhancements in React 19
- **Fix:** Plan migration to React 19 (non-trivial, likely breaking changes)
- **Note:** Consider this a roadmap item, not immediate blocker

---

### 🟡 P3: Medium — Advisory / Deprecation Warning

#### DEP-006: PostCSS 8.x — Moderate XSS via CSS Stringify
- **Severity:** P3
- **Category:** CVE (Moderate)
- **Package:** postcss (via vite dependency, range <8.5.10)
- **File:** Source/Frontend (transitive)
- **CVE:** **GHSA-qx2v-qp2m-jg93** — "XSS via Unescaped </style> in CSS Stringify Output"
- **CVSS:** 6.1 (Medium)
- **Impact:** If user-controlled CSS is compiled and rendered, attacker can inject `</style>` to break out of style context
- **Fix:** Upgrade vite (which will pull newer postcss)

#### DEP-007: Vitest 2.0.5 — Multiple Moderate CVEs (via Vite cascade)
- **Severity:** P3
- **Category:** CVE (Moderate)
- **Package:** vitest@2.0.5 (direct, in Frontend)
- **Affected By:** @vitest/mocker, vite-node transitive CVEs
- **Fix:** Update vitest when vite is updated (may require major version bump)

#### DEP-008: UUID 9.0.0 — Five Major Versions Behind
- **Severity:** P3
- **Category:** Outdated (5 major versions behind)
- **Package:** uuid@9.0.0 (current wanted: 9.0.1, latest: 14.0.0)
- **File:** Source/Backend/package.json
- **Risk:** UUID is a utility library; major versions usually indicate algorithm changes or API simplification
- **Impact:** Cosmetic risk unless your code relies on deprecated APIs
- **Fix:** `cd Source/Backend && npm update uuid` (test to ensure no breaking changes)
- **Note:** Low priority unless cryptographic changes are critical

#### DEP-009: React Router 6.26.0 — Major Version Behind
- **Severity:** P3
- **Category:** Outdated (1 major version behind)
- **Package:** react-router-dom@6.26.0 (latest: 7.15.1)
- **File:** Source/Frontend/package.json
- **Risk:** Router library; usually non-breaking, but check changelog
- **Fix:** Test with react-router-dom@7 (likely safe update)

#### DEP-010: WS (WebSocket) 8.x — Uninitialized Memory Disclosure
- **Severity:** P3
- **Category:** CVE (Moderate)
- **Package:** ws (via vite, range 8.0.0–8.20.0)
- **CVE:** **GHSA-58qx-3vcg-4xpx** — "Uninitialized Memory Disclosure"
- **CVSS:** 4.4 (Medium)
- **Impact:** Information disclosure if WebSocket connections are used; unlikely in this context (dev tool)
- **Fix:** Update vite

---

## Dependency Tree Analysis

### Frontend (Source/Frontend)
```
Direct dependencies: 9
Transitive dependencies: 230
  - Production: 9 (react, react-dom, react-router-dom)
  - Development: 222 (vite, vitest, typescript, @types/*, testing-library/*)
  - Optional: 50 (peer dependencies)

Top-level risks:
  ✓ vite (4 moderate CVEs, 1 path traversal)
  ✓ vitest (affected by vite and @vitest/mocker CVEs)
  ✗ No abandoned packages detected
```

### Backend (Source/Backend)
```
Direct dependencies: 9
Transitive dependencies: 411
  - Production: 102 (express, pino, prom-client, uuid)
  - Development: 310 (jest, ts-jest, @types/*, supertest)
  - Optional: 2

Top-level risks:
  🔴 ts-jest → handlebars (CRITICAL RCE)
  🟠 express (4 minor versions behind, known patch gaps)
  🟠 pino (2 major versions behind)
  ✗ No abandoned packages detected
```

### E2E (Source/E2E)
```
Direct dependencies: 1
Transitive dependencies: minimal
  - @playwright/test@1.58.2

No known CVEs
```

---

## License Compliance Check

| Package | License | Status |
|---------|---------|--------|
| react, react-dom | MIT | ✓ Approved |
| react-router-dom | MIT | ✓ Approved |
| express | MIT | ✓ Approved |
| pino | MIT | ✓ Approved |
| uuid | MIT | ✓ Approved |
| prom-client | Apache-2.0 | ✓ Approved |
| jest, vitest | MIT | ✓ Approved |
| vite | MIT | ✓ Approved |
| typescript | Apache-2.0 | ✓ Approved |
| @playwright/test | Apache-2.0 | ✓ Approved |
| handlebars | MIT | ✓ Approved (but CVE-laden) |
| **Overall** | **No conflicts** | **✓ PASS** |

All dependencies use permissive licenses (MIT, Apache-2.0). No GPL/AGPL conflicts detected.

---

## Supply Chain Risk Assessment

### Risk Factors
- **Large transitive tree:** 650+ indirect packages (typical for npm ecosystem, but increases surface area)
- **Build-time dependency on handlebars:** ts-jest → handlebars is a supply chain bottleneck (CVE-critical)
- **Concentrated trust:** jest & ts-jest used by majority of projects
- **Post-install scripts:** Not detected in root dependencies

### Mitigations
1. Pin all versions in package-lock.json (already done)
2. Audit high-velocity packages quarterly (jest, vite, React)
3. Consider lockfile verification (`npm ci` instead of `npm install`)
4. Automate CVE scanning in CI (consider Snyk, npm audit in pre-commit)

---

## Remediation Roadmap

### Immediate (P1 - This Sprint)
- [ ] Update ts-jest in Source/Backend to remove handlebars CVE
  - Check ts-jest releases; may require major version bump
  - Verify tests still pass after update
  - Timeline: 1-2 hours

### Short-term (P2 - Next 2 Weeks)
- [ ] Update vite in Source/Frontend to resolve path traversal (major version jump 5→8)
  - Test dev server and build pipeline
  - Check for breaking changes in plugin API
  - Timeline: 4-6 hours
- [ ] Update express to 4.22.x (patch version, low risk)
  - Timeline: 1 hour
- [ ] Plan React 19 migration (separate effort, likely 1-2 sprints)

### Medium-term (P3 - Next Month)
- [ ] Update pino to 10.x (check changelog for breaking changes)
- [ ] Update react-router-dom to 7.x
- [ ] Review uuid version jump (backward-compatible?)

### Continuous
- [ ] Add `npm audit` to pre-commit hook or CI
- [ ] Enable GitHub Dependabot or similar
- [ ] Monthly dependency health check

---

## Cross-Team Escalations

### [ESCALATE → TheGuardians]
**Finding:** Handlebars RCE via ts-jest in Backend test pipeline
- **Severity:** P1 / Critical
- **Details:** ts-jest@29.1.2 depends on handlebars@4.7.8, which has 5 high/critical CVEs
- **Why it matters:** RCE in Handlebars template compilation → potential code injection during build
- **Action required:** Patch ts-jest or find alternative before merging unvetted PRs
- **Owner:** TheGuardians (security escalation)

### [CROSS-REF: performance-profiler]
**Finding:** Large transitive dependency tree (230 in Frontend, 411 in Backend)
- Could impact build times and bundle size
- Consider tree-shaking and bundle analysis before React 19 migration

---

## Audit Completeness

| Check | Status |
|-------|--------|
| npm audit (all projects) | ✅ Complete |
| Package version comparison | ✅ Complete |
| License compliance | ✅ Complete |
| Supply chain risk scan | ✅ Complete |
| Abandoned package detection | ✅ None found |
| Direct vs. transitive analysis | ✅ Complete |
| Remediation roadmap | ✅ Complete |

---

## JSON Summary

```json
{
  "audit_date": "2026-05-21",
  "projects": [
    {
      "name": "Frontend",
      "path": "Source/Frontend",
      "package_manager": "npm",
      "direct_dependencies": 9,
      "transitive_dependencies": 230,
      "cves": {
        "critical": 0,
        "high": 0,
        "moderate": 7,
        "total": 7
      },
      "outdated_major": 2,
      "findings": ["DEP-004 (Vite)", "DEP-005 (React)", "DEP-006 (PostCSS)", "DEP-007 (Vitest)", "DEP-009 (React Router)", "DEP-010 (WS)"]
    },
    {
      "name": "Backend",
      "path": "Source/Backend",
      "package_manager": "npm",
      "direct_dependencies": 9,
      "transitive_dependencies": 411,
      "cves": {
        "critical": 1,
        "high": 3,
        "moderate": 1,
        "total": 2
      },
      "outdated_major": 3,
      "findings": ["DEP-001 (Handlebars RCE)", "DEP-002 (Express)", "DEP-003 (Pino)", "DEP-008 (UUID)"]
    },
    {
      "name": "E2E",
      "path": "Source/E2E",
      "package_manager": "npm",
      "direct_dependencies": 1,
      "transitive_dependencies": "minimal",
      "cves": {
        "critical": 0,
        "high": 0,
        "moderate": 0,
        "total": 0
      },
      "outdated_major": 0,
      "findings": []
    }
  ],
  "summary": {
    "total_cves": 10,
    "critical": 1,
    "high": 3,
    "moderate": 6,
    "license_compliance": "PASS",
    "supply_chain_risk": "MODERATE",
    "grade": "B"
  }
}
```

---

**Report Generated:** 2026-05-21 by Dependency Auditor  
**Next Review:** 2026-06-21 (monthly cadence recommended)
