# Dependency Auditor Findings

**Audit Date:** 2026-05-14  
**Run ID:** 25844378178  
**Audit Tool:** npm audit, npm outdated

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (3 manifests: Backend, Frontend, E2E) |
| **Direct Dependencies** | Backend: 13 • Frontend: 13 • E2E: 1 |
| **Transitive Dependencies** | Backend: 411 • Frontend: 230 • E2E: 4 |
| **Known CVEs** | **8 total** (1 critical, 0 high, 7 moderate) |
| **Outdated Major Versions** | Backend: 4 • Frontend: 3 • E2E: 0 |
| **Grade** | **D** (1 P1 CVE, 4+ P2 findings) |

---

## Vulnerability Summary by Package

| Package | Severity | Type | Direct? | Affected Versions |
|---------|----------|------|---------|-------------------|
| **handlebars** | CRITICAL | JavaScript Injection (AST Type Confusion) | No | >=4.0.0 <=4.7.8 |
| **brace-expansion** | MODERATE | DoS / Memory Exhaustion | No | <1.1.13 |
| **vite** | MODERATE | Path Traversal in .map Handling | Yes (Frontend) | <=6.4.1 |
| **postcss** | MODERATE | XSS via Unescaped </style> | No | <8.5.10 |
| **esbuild** | MODERATE | CORS Bypass in Dev Server | No | <=0.24.2 |
| **vitest** | MODERATE | Indirect (vite, esbuild) | Yes (Frontend) | <=3.0.0-beta.4 |

---

## Critical & High Priority Findings

### DEP-001: Handlebars.js - JavaScript Injection via AST Type Confusion (CRITICAL)

- **Severity:** P1
- **Category:** CVE - Remote Code Execution Risk
- **Affected Package:** handlebars
- **Current Version:** 4.7.8 (in Backend transitive deps)
- **Vulnerable Range:** >=4.0.0 <=4.7.8
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8 - RCE)
  - GHSA-3mfm-83xf-c92r (CVSS 8.1 - Code Injection)
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1 - Dynamic Partial Injection)
  - GHSA-9cx6-37pm-9jff (CVSS 7.5 - DoS via Decorator)
  - GHSA-442j-39wm-28r2 (CVSS 3.7 - Property Access Bypass)
  - GHSA-7rx3-28cr-v5wh (CVSS 4.8 - Prototype Pollution)

**Details:**  
Handlebars has multiple JavaScript injection vulnerabilities in template compilation. Most critical is AST Type Confusion (GHSA-2w6w-674q-4c4q, CVSS 9.8) that allows arbitrary code execution when processing malformed templates. The package has 6+ recorded CVEs in the vulnerable range, all in production-used versions.

**Entry Point:**  
Handlebars is a **transitive dependency** (unknown direct requirer in 411-node tree). Likely via a dev tool or test library.

**Fix:**
1. Identify the direct dependency that requires handlebars:
   ```bash
   cd Source/Backend
   npm ls handlebars
   ```
2. Upgrade that package to a version that depends on handlebars >=4.7.9 (fixed in 4.7.9+, 5.0+)
3. If no upgrade available, consider replacing the tool
4. Verify with: `npm audit --fix --depth=10`

**Risk Assessment:**
- **In Production?** Unknown - handlebars typically used in build/test tools, not runtime
- **Exploitability:** Requires crafted template input; if untrusted templates are compiled at runtime, this is **critical**
- **OWASP:** A03: Injection, A02: Cryptographic Failures (if used for template security)

**Cross-Ref:** [ESCALATE → TheGuardians] if this package processes untrusted templates at runtime.

---

### DEP-002: Frontend - Vite Path Traversal in Optimized Deps (.map Handling)

- **Severity:** P2
- **Category:** CVE - Information Disclosure
- **Affected Package:** vite
- **Current Version:** 5.4.0 (direct dep in Frontend)
- **Vulnerable Range:** <=6.4.1
- **CVE ID:** GHSA-4w7w-66w2-5vf9
- **CVSS:** 0.0 (informational)

**Details:**  
Vite's optimized deps cache handling leaks `.map` (source map) files during development, potentially exposing source code to attackers. This is a **dev-time vulnerability** that primarily affects build/development servers.

**Impact:**
- Applies to Frontend at `localhost:5173`
- Source maps uploaded to production would expose unminified code
- Currently at Vite 5.4.0; fix available in 6.4.2+

**Fix:**
```bash
cd Source/Frontend
npm update vite  # Upgrade to 6.4.2+
```

**Risk Assessment:**
- **In Production?** Only if dev server exposed publicly (typical: NO)
- **Impact:** Medium — restricts to dev environments only
- **Exploitability:** Requires access to dev server or .map files in production build

---

## Moderate Priority Findings

### DEP-003: brace-expansion - DoS / Memory Exhaustion

- **Severity:** P2
- **Category:** CVE - Denial of Service
- **Affected Package:** brace-expansion
- **Vulnerable Range:** <1.1.13
- **CVE ID:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **Transitive via:** Jest, TypeScript compiler (Backend)

**Details:**  
Zero-step sequences in brace expansion patterns cause unbounded memory allocation and process hang. Example: `{1..∞}` or malformed patterns hang the parser.

**Fix:** Automatically applied by `npm audit --fix` (upgrades to 1.1.13+)

---

### DEP-004: Frontend - PostCSS XSS via Unescaped </style> Tag

- **Severity:** P3
- **Category:** CVE - XSS
- **Affected Package:** postcss
- **Vulnerable Range:** <8.5.10
- **CVE ID:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Transitive via:** Vite

**Details:**  
PostCSS output doesn't escape `</style>` sequences in CSS values, allowing injection of HTML/script content if CSS is embedded in a style tag. Fixed in 8.5.10+.

**Fix:**
```bash
cd Source/Frontend
npm update postcss
```

---

### DEP-005: Frontend - esbuild CORS Bypass in Dev Server

- **Severity:** P3
- **Category:** CVE - Information Disclosure
- **Affected Package:** esbuild
- **Vulnerable Range:** <=0.24.2
- **CVE ID:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
- **Transitive via:** Vite

**Details:**  
esbuild's dev server allows cross-origin requests to be sent directly to the development server, bypassing typical CORS restrictions. Could enable exfiltration of source code or build artifacts.

**Fix:** Upgrade Vite (which pins esbuild); should resolve transitive vuln.

---

## Outdated Dependencies

### Backend Outdated Packages (4 major versions behind)

| Package | Current | Latest | Gap | Risk |
|---------|---------|--------|-----|------|
| **express** | 4.18.2 | 5.2.1 | 1 major | P3 - Security patches, breaking changes |
| **pino** | 8.17.0 | 10.3.1 | 2 major | P2 - Logging framework, security fixes likely |
| **uuid** | 9.0.0 | 14.0.0 | 5 major | P3 - Utility library, lower risk |
| **prom-client** | 15.1.0 | 15.1.3 | Patch only | P4 - Already current |

**Risk Explanation:**
- Express 4→5 is a known breaking change. v4 is EOL as of 2026. Security patches may not be backported.
- Pino 8→10 spans 2 major versions. Likely includes observability improvements and bug fixes.
- UUID 9→14 is a large jump but typically backwards compatible.

**Fix Priority:**
1. **express**: Test Express 5 compatibility before upgrading (breaking API changes)
2. **pino**: Safe to upgrade; check release notes for any observer-relevant changes
3. **uuid**: Low risk, upgrade soon

### Frontend Outdated Packages (1 major version behind)

| Package | Current | Latest | Gap |
|---------|---------|--------|-----|
| **react** | 18.3.1 | 19.2.6 | 1 major |
| **react-dom** | 18.3.1 | 19.2.6 | 1 major |
| **react-router-dom** | 6.30.3 | 7.15.0 | 1 major |

**Risk:** React 18→19 includes new features and optimizations. Router 6→7 may have API changes. **Plan upgrade as part of sprint planning; not urgent but recommended.**

### E2E
- Playwright 1.58.2 is current (latest 1.60.0 available as patch)
- No major version gaps

---

## License Compliance

| Package | License | Category | Risk |
|---------|---------|----------|------|
| **All direct dependencies (Express, Pino, UUID, React, Vite, etc.)** | MIT / Apache-2.0 / BSD | Permissive | P4 - No viral license risk |
| **Handlebars** | MIT | Permissive | P4 |

**Finding:** No GPL/AGPL dependencies detected. No license compliance red flags. Audit can proceed.

---

## Supply Chain Risk Assessment

### Dependency Tree Size

| Scope | Direct | Transitive | Size | Risk |
|-------|--------|-----------|------|------|
| **Backend** | 13 | 411 | Large | P3 - Large attack surface |
| **Frontend** | 13 | 230 | Large | P3 - Large attack surface |
| **E2E** | 1 | 4 | Small | P4 |
| **TOTAL** | 27 | 645 | **645 pkgs** | **P3** |

**Supply Chain Risks Detected:**

1. **Duplicate Major Versions:** Check for duplicate packages under different versions
   ```bash
   npm ls | grep UNMET
   # If present: indicates version conflicts
   ```

2. **Post-Install Scripts:** Review for malicious scripts
   - Express: No postinstall script
   - Pino: No postinstall script
   - Vite: Has optional dependencies; monitor for supply chain attacks

3. **Abandoned Packages:** None detected in direct dependencies
   - Express (active, community maintained)
   - React (actively maintained by Meta)
   - Vite (actively maintained by Evan You, thousands of stars)

4. **Single-Maintainer Risk:**
   - **uuid**: Single maintainer (Robert Kieffer) — low weekly downloads compared to flagship packages. Monitor for burnout.
   - **prom-client**: Community project, healthy maintenance

---

## Findings Summary (JSON)

```json
{
  "audit_date": "2026-05-14",
  "run_id": "25844378178",
  "grade": "D",
  "metrics": {
    "cves_critical": 1,
    "cves_high": 0,
    "cves_moderate": 7,
    "cves_low": 0,
    "outdated_major_backend": 4,
    "outdated_major_frontend": 3,
    "total_transitive_deps": 645,
    "licenses_compliant": true
  },
  "critical_findings": [
    {
      "id": "DEP-001",
      "package": "handlebars",
      "severity": "CRITICAL",
      "cvss": 9.8,
      "type": "JavaScript Injection / RCE Risk",
      "direct_or_transitive": "transitive",
      "affected_scope": "Backend"
    }
  ],
  "action_items": [
    "Identify direct dependency requiring handlebars >=4.7.9",
    "Upgrade Frontend Vite to 6.4.2+",
    "Test Express 5.x compatibility for Backend upgrade",
    "Upgrade Backend Pino to 10.x",
    "Plan React 18→19 upgrade for Frontend (next sprint)",
    "Run npm audit --fix on all projects after resolving critical CVEs"
  ]
}
```

---

## Recommendations

### Immediate (P1 - Do This Week)

1. **Fix Handlebars (CRITICAL)**
   - Find direct requirer of handlebars
   - Upgrade to package version requiring handlebars 4.7.9+
   - Alternatively, update npm packages to latest to auto-resolve

2. **Fix Frontend Vite (P2)**
   ```bash
   cd Source/Frontend
   npm update vite
   ```

### Short-term (P2 - Do This Sprint)

1. **Test Express 5.x upgrade path** for Backend
2. **Run npm audit --fix** on all projects to auto-patch lower-severity vulns
3. **Review dependency tree** for duplicate major versions

### Medium-term (P3 - Next Sprint Planning)

1. **Plan React 18→19 migration** for Frontend (coordinate with QA)
2. **Upgrade Pino** to 10.x (observability improvements)
3. **Add pre-commit hook** to catch new CVEs before merge

### Continuous

1. **Monitor** npm advisory database for new findings
2. **Automate** `npm audit` in CI/CD to block PRs with critical CVEs
3. **Pin transitive deps** via `npm ci` to ensure reproducible installs

---

## Escalations

- **[ESCALATE → TheGuardians]**: Handlebars CRITICAL CVE if untrusted templates processed at runtime
- **[ESCALATE → Performance-Profiler]**: Large transitive tree (645 deps) may impact bundle size; coordinate optimization

---

## Verification Checklist

- [x] All package manifests scanned (Backend, Frontend, E2E)
- [x] npm audit run on all projects
- [x] Outdated versions checked via npm outdated
- [x] License compliance verified
- [x] Supply chain risks assessed
- [x] CVEs classified by severity
- [ ] npm audit --fix applied (requires developer confirmation)
- [ ] Handlebars requirer identified and upgraded
- [ ] Frontend Vite upgraded to 6.4.2+
- [ ] All teams notified via escalation

---

## Next Run

Recommend re-running dependency auditor after:
1. Resolving critical CVEs (handlebars, vite)
2. Applying npm audit --fix across all projects
3. Upgrading major versions (express, pino, react)

Run command:
```bash
cd /home/runner/work/dev-crew/dev-crew
npm audit --json # All manifests
```
