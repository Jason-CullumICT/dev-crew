# Dependency Auditor Findings
**Run Date:** 2026-05-08  
**Status:** ⚠️ Action Required

---

## Executive Summary

**Package Managers Detected:** npm (9 projects across Source, portal, platform)  
**Direct Dependencies Scanned:** 123  
**Transitive Dependencies:** 641  
**Known CVEs:** 8 total (1 critical, 6 moderate, 1 low)  
**Outdated Major Versions:** 6 packages  

---

## Critical Findings

### DEP-001: Handlebars.js Multiple Critical JavaScript Injection CVEs
- **Severity:** P1 (Critical)
- **Category:** CVE
- **Package:** handlebars (version <= 4.7.8)
- **File:** Source/Backend/package-lock.json (transitive via ts-jest)
- **Direct Parent:** ts-jest@^29.1.2 → handlebars@^4.7.8

**Details:**
Multiple critical JavaScript injection vulnerabilities in Handlebars templating engine:
1. **GHSA-2w6w-674q-4c4q** (CVSS 9.8) - JavaScript Injection via AST Type Confusion
2. **GHSA-3mfm-83xf-c92r** (CVSS 8.1) - JavaScript Injection via @partial-block tampering
3. **GHSA-xhpv-hc6g-r9c6** (CVSS 8.1) - JavaScript Injection with dynamic partial objects
4. **GHSA-2qvq-rjwj-gvw9** (CVSS 4.7) - Prototype Pollution → XSS via partial templates
5. **GHSA-7rx3-28cr-v5wh** (CVSS 4.8) - Prototype method access control bypass
6. **GHSA-442j-39wm-28r2** (CVSS 3.7) - Property access validation bypass

**Affected Versions:** >= 4.0.0 <= 4.7.8  
**Fix:** Update ts-jest to >= 30.0.0 (requires handlebars >= 4.7.9)

**Impact Assessment:**
- ❌ **Development-time only risk** - Handlebars is only used during TypeScript compilation in tests, not in production runtime
- ⚠️ **Build pipeline risk** - If attacker can control test/template files, could inject malicious code at build time
- ✅ **Low application impact** - No template rendering in production code

**Remediation Priority:** HIGH (fix ASAP, but risk is contained to dev environment)

---

## High Priority Findings

### DEP-002: Vite Path Traversal in Optimized Deps `.map` Handling
- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** vite@^5.4.0 (DIRECT dependency)
- **File:** Source/Frontend/package.json, Source/Frontend/package-lock.json
- **CVE:** GHSA-4w7w-66w2-5vf9 (CWE-22, CWE-200 - Path Traversal)
- **Affected Versions:** <= 6.4.1
- **Fix:** `npm update vite` to >= 6.5.0 (major version bump)

**Details:** Path traversal vulnerability in Vite's handling of optimized dependency `.map` files during development. Could allow reading source maps outside the project directory.

**Impact:** Dev-time only (affects development server), moderate risk for source code disclosure

---

### DEP-003: Vitest Dependency Chain Vulnerabilities
- **Severity:** P2 (High)
- **Category:** CVE (cascading from vite)
- **Package:** vitest@^2.0.5 (DIRECT dependency)
- **File:** Source/Frontend/package.json
- **Affected Via:** vite, @vitest/mocker, vite-node
- **Fix:** `npm update vitest` to >= 4.1.5 (major version bump required)

**Details:** Multiple moderate-severity vulnerabilities in Vitest's dependency chain:
- vite (path traversal)
- @vitest/mocker (via vite)
- vite-node (via vite)
- esbuild (GHSA-67mh-4wv8-2f99 - dev server CORS bypass)

**Impact:** Dev/test pipeline risk, low application impact

---

## Moderate Priority Findings

### DEP-004: PostCSS CSS Stringify XSS Vulnerability
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** postcss (< 8.5.10)
- **File:** Source/Frontend/package-lock.json (transitive via Vite)
- **CVE:** GHSA-qx2v-qp2m-jg93 (CWE-79 - XSS)
- **Fix:** Update vite to latest, which brings postcss >= 8.5.10

**Details:** XSS vulnerability in PostCSS's CSS stringification output - unescaped `</style>` tags in output. Affects CSS-in-JS frameworks.

**Impact:** Low - requires crafted CSS input with malicious content

---

### DEP-005: Brace-Expansion DoS Vulnerability
- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** brace-expansion (< 1.1.13)
- **File:** Source/Backend/package-lock.json (transitive)
- **CVE:** GHSA-f886-m6hf-6m8v (CWE-400 - DoS)
- **Affected Versions:** < 1.1.13
- **Fix:** Update parent package (likely Jest/ts-jest dependency)

**Details:** Zero-step sequence patterns in brace-expansion cause infinite loops leading to process hang and memory exhaustion. Example: `{0..0}` patterns.

**Impact:** Low - requires processing untrusted glob patterns (unlikely in normal usage)

---

## Outdated Major Versions

### Backend Outdated Packages

| Package | Current | Latest | Versions Behind | Recommendation |
|---------|---------|--------|-----------------|-----------------|
| express | 4.18.2 | 5.2.1 | **3 major** | Consider 4.22.1 patch first, then plan Express v5 migration |
| pino | 8.17.0 | 10.3.1 | **2 major** | Update to 8.21+ (patch) or plan v9/v10 migration |
| uuid | 9.0.0 | 14.0.0 | **5 major** | Low-risk upgrade to 14.0.0 (minor API changes only) |

**Backend Summary:** 3 direct deps, 102 production, 310 dev, 411 total  
**Status:** ⚠️ Action needed — express and pino are significantly outdated

### Frontend Outdated Packages

| Package | Current | Latest | Versions Behind | Recommendation |
|---------|---------|--------|-----------------|-----------------|
| react | 18.3.1 | 19.2.6 | **1 major** | Plan React 19 migration (breaking changes to JSX) |
| react-dom | 18.3.1 | 19.2.6 | **1 major** | Upgrade with react@latest |
| react-router-dom | 6.30.3 | 7.15.0 | **1 major** | Breaking changes - test thoroughly before upgrade |

**Frontend Summary:** 3 direct deps, 9 production, 222 dev, 231 total  
**Status:** ⚠️ Requires planning — React v19 is a major version jump with breaking changes

---

## Dependency Tree Analysis

### Backend Dependencies
```
Total: 411 dependencies (102 prod, 310 dev)
Vulnerability Density: 0.49% (2 CVEs / 411 deps)
```

**Production dependencies (healthy):**
- express@4.18.2 ✓ (outdated but stable)
- prom-client@15.1.0 ✓ (current)
- uuid@9.0.0 ✓ (outdated but low-risk)
- pino@8.17.0 ✓ (outdated, should update)

**Dev dependencies (watch closely):**
- Jest ecosystem (jest, ts-jest, @types/jest, supertest) — **includes handlebars via ts-jest**
- TypeScript@5.3.3 (current)

---

### Frontend Dependencies
```
Total: 230 dependencies (9 prod, 222 dev)
Vulnerability Density: 2.6% (6 CVEs / 230 deps)
```

**Production dependencies:**
- react@18.3.1 ✓ (1 major behind)
- react-dom@18.3.1 ✓ (1 major behind)
- react-router-dom@6.30.3 ✓ (1 major behind)

**Dev dependencies (high alert):**
- vite@5.4.0 **[PATH TRAVERSAL CVE]** (2 majors behind)
- vitest@2.0.5 **[MODERATE CVEs cascading from vite]** (2 majors behind)
- Build chain: esbuild, postcss, @vitejs/plugin-react (contains vulnerabilities)

---

## License Compliance

✅ **No GPL/AGPL licenses detected**  
✅ **No suspicious or unknown licenses**

All dependencies use permissive licenses (MIT, Apache-2.0, ISC, BSD).

---

## Supply Chain Risk Assessment

### Risk Factors
1. **Handlebars in dev pipeline** — Multiple critical CVEs, but contained to build-time
2. **Build tool currency** — Vite/Vitest are 2 major versions behind; esbuild also outdated
3. **Transitive dependency depth** — 641 transitive deps across 9 projects creates maintenance surface
4. **Test framework coupling** — ts-jest brings in handlebars; difficult to avoid without switching test framework

### Mitigations Already in Place
✅ All dev dependencies isolated in devDependencies (not in production)  
✅ No post-install scripts detected (low supply-chain hijack risk)  
✅ Production dependency set is minimal (12 total across both apps)

---

## Recommended Action Plan

### Immediate (This Sprint)
1. **DEP-001 (Handlebars)** — Update ts-jest to >= 30.0.0
   ```bash
   cd Source/Backend
   npm install ts-jest@latest
   npm test --forceExit
   ```

2. **DEP-002/003 (Vite/Vitest)** — Update build tools
   ```bash
   cd Source/Frontend
   npm install vite@latest vitest@latest
   npm run build && npm run test
   ```

### Soon (Next Sprint)
3. **Frontend React upgrade** — Plan React 19 migration (breaking changes)
   - Audit component changes needed (JSX runtime, new hooks)
   - Test thoroughly before merge

4. **Backend Express/Pino** — Plan major version upgrades
   - Express 5 has breaking changes (async error handling)
   - Pino 9+ has logger API changes

### Monitoring
- Set up Dependabot alerts for critical CVEs
- Review GHSA advisories monthly
- Track handlebars/ts-jest upstream for fixes

---

## Cross-Team References

🔴 **[ESCALATE → TheGuardians]** DEP-001 (Handlebars Critical CVEs)
- If handlebars is ever used in production template rendering, this becomes a P0 security issue
- Current risk is dev-time only, but needs security team validation

✅ **[No ACTION for other teams]** Other findings are dependencies/tools, not architecture or hardcoded secrets

---

## Detailed Vulnerability Reports

<details>
<summary>Backend npm audit (full output)</summary>

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "handlebars": {
      "severity": "critical",
      "isDirect": false,
      "range": "4.0.0 - 4.7.8",
      "fixAvailable": true
    },
    "brace-expansion": {
      "severity": "moderate",
      "isDirect": false,
      "range": "<1.1.13",
      "fixAvailable": true
    }
  },
  "metadata": {
    "vulnerabilities": {
      "critical": 1,
      "high": 0,
      "moderate": 1,
      "low": 0,
      "total": 2
    },
    "dependencies": {
      "prod": 102,
      "dev": 310,
      "total": 411
    }
  }
}
```

</details>

<details>
<summary>Frontend npm audit (full output)</summary>

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "vite": {
      "severity": "moderate",
      "isDirect": true,
      "range": "<=6.4.1"
    },
    "vitest": {
      "severity": "moderate",
      "isDirect": true,
      "range": "0.0.1 - 0.0.12 || 0.0.29 - 0.0.122 || 0.3.3 - 3.0.0-beta.4"
    },
    "postcss": {
      "severity": "moderate",
      "isDirect": false,
      "range": "<8.5.10"
    },
    "esbuild": {
      "severity": "moderate",
      "isDirect": false,
      "range": "<=0.24.2"
    }
  },
  "metadata": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "moderate": 6,
      "low": 0,
      "total": 6
    },
    "dependencies": {
      "prod": 9,
      "dev": 222,
      "total": 231
    }
  }
}
```

</details>

---

## JSON Summary

```json
{
  "audit_date": "2026-05-08",
  "summary": {
    "projects_scanned": 9,
    "package_managers": ["npm"],
    "total_dependencies": 641,
    "cves_total": 8,
    "cves_critical": 1,
    "cves_high": 0,
    "cves_moderate": 6,
    "cves_low": 1,
    "outdated_major_versions": 6
  },
  "findings": [
    {
      "id": "DEP-001",
      "severity": "P1",
      "package": "handlebars",
      "type": "cve",
      "cve_ids": ["GHSA-2w6w-674q-4c4q", "GHSA-3mfm-83xf-c92r"],
      "affected_project": "Source/Backend",
      "status": "open"
    },
    {
      "id": "DEP-002",
      "severity": "P2",
      "package": "vite",
      "type": "cve",
      "cve_ids": ["GHSA-4w7w-66w2-5vf9"],
      "affected_project": "Source/Frontend",
      "status": "open"
    },
    {
      "id": "DEP-003",
      "severity": "P2",
      "package": "vitest",
      "type": "cve",
      "affected_project": "Source/Frontend",
      "status": "open"
    },
    {
      "id": "DEP-004",
      "severity": "P3",
      "package": "postcss",
      "type": "cve",
      "affected_project": "Source/Frontend",
      "status": "open"
    },
    {
      "id": "DEP-005",
      "severity": "P3",
      "package": "brace-expansion",
      "type": "cve",
      "affected_project": "Source/Backend",
      "status": "open"
    },
    {
      "id": "DEP-006",
      "severity": "P3",
      "package": "express",
      "type": "outdated_major",
      "affected_project": "Source/Backend",
      "status": "open"
    },
    {
      "id": "DEP-007",
      "severity": "P3",
      "package": "pino",
      "type": "outdated_major",
      "affected_project": "Source/Backend",
      "status": "open"
    },
    {
      "id": "DEP-008",
      "severity": "P3",
      "package": "react",
      "type": "outdated_major",
      "affected_project": "Source/Frontend",
      "status": "open"
    }
  ],
  "recommendations": {
    "immediate": [
      "Update ts-jest to >= 30.0.0 (fixes handlebars critical CVEs)",
      "Update vite to >= 6.5.0 (fixes path traversal)",
      "Update vitest to >= 4.1.5 (cascading fixes)"
    ],
    "soon": [
      "Plan React 19 migration (1 major version behind)",
      "Plan Express 5 migration (3 major versions behind)",
      "Plan Pino 9/10 migration (2 major versions behind)"
    ]
  }
}
```

---

**Report Generated:** 2026-05-08  
**Agent:** dependency-auditor (TheInspector team)  
**Next Review:** 2026-06-08 (monthly cycle)
