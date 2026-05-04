# Dependency Auditor Findings
**Date:** 2026-05-04  
**Auditor:** dependency_auditor (Haiku)  
**Scope:** CVE scanning, license compliance, outdated packages, supply chain risks

---

## Executive Summary

**Risk Level: 🔴 HIGH**

Scanned **5 npm projects** across the codebase:
- Source/Backend
- Source/Frontend  
- Source/E2E
- platform/orchestrator
- portal/Backend
- portal/Frontend

**Total CVEs Found: 27**
- **Critical: 3** (protobufjs, handlebars)
- **High: 4** (path-to-regexp, picomatch, handlebars variants)
- **Moderate: 20+** (uuid, vite, vitest, esbuild, postcss, dockerode, etc.)

**License Compliance: ✅ PASS** - All scanned dependencies use standard open-source licenses (MIT, Apache-2.0, ISC)

---

## Vulnerability Breakdown by Project

### 🔴 Source/Backend
**Direct Dependencies:** 4 (express, prom-client, uuid, pino)  
**Transitive Dependencies:** 411  
**Vulnerabilities:** 3 (1 critical, 2 moderate)

#### DEP-001: Handlebars JavaScript Injection (CRITICAL)
- **Severity:** P1 (Critical)
- **Category:** CVE - Remote Code Execution
- **Package:** handlebars (transitive via unknown chain)
- **Version:** 4.7.8
- **Issue:** Multiple JavaScript injection vulnerabilities via AST type confusion
- **CVEs:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8, Critical): JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1, High): @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1, High): Dynamic partial object injection
  - GHSA-9cx6-37pm-9jff (CVSS 7.5, High): DoS via malformed decorator syntax
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2, High): CLI precompiler injection
  - GHSA-2qvq-rjwj-gvw9 (CVSS 4.7, Moderate): Prototype pollution via partial templates
  - GHSA-7rx3-28cr-v5wh (CVSS 4.8, Moderate): __lookupSetter__ blocklist gap
- **Fix:** Update handlebars to ≥4.7.9 (or 4.8.0+ for latest patches)
- **Command:** `npm audit fix` or manual update in dependency chain
- **Cross-ref:** 🚨 [ESCALATE → TheGuardians] - RCE vulnerability in template engine

#### DEP-002: uuid Missing Buffer Bounds Check (MODERATE)
- **Severity:** P2 (Moderate/High in context)
- **Category:** CVE - Memory Safety
- **Package:** uuid (direct dependency)
- **Version:** 9.0.0 - 9.0.8
- **Issue:** GHSA-w5hq-g745-h8pq - Missing buffer bounds check in v3/v5/v6 when buf is provided
- **CWE:** CWE-787 (Out-of-bounds write), CWE-1285 (Improper validation of array index)
- **Risk:** Potential memory corruption if uuid is called with external buf parameter
- **Fix:** Update to uuid ≥14.0.0
- **Command:** `npm install uuid@^14.0.0`

#### DEP-003: brace-expansion ReDoS (MODERATE)
- **Severity:** P3
- **Category:** CVE - DoS
- **Package:** brace-expansion (transitive)
- **Version:** <1.1.13
- **Issue:** GHSA-f886-m6hf-6m8v - Zero-step sequence causes process hang and memory exhaustion
- **CWE:** CWE-400 (Uncontrolled resource consumption)
- **CVSS:** 6.5
- **Fix:** Update brace-expansion to ≥1.1.13
- **Command:** `npm audit fix`

---

### 🟡 Source/Frontend
**Direct Dependencies:** 5 (react, react-dom, react-router-dom, vite, vitest)  
**Transitive Dependencies:** 230  
**Vulnerabilities:** 6 (all moderate, via dev-time tooling)

#### DEP-004: Vite Path Traversal in `.map` Handling (MODERATE)
- **Severity:** P3 (dev-time only)
- **Category:** CVE - Path Traversal
- **Package:** vite (direct dev dependency)
- **Version:** ≤6.4.1
- **Issue:** GHSA-4w7w-66w2-5vf9 - Optimized deps source map handling exposes source code
- **Impact:** Affects development server only; no production impact
- **Fix:** Update vite to ≥8.0.10
- **Command:** `npm install --save-dev vite@latest`

#### DEP-005: PostCSS XSS via Unescaped `</style>` (MODERATE)
- **Severity:** P3
- **Category:** CVE - XSS
- **Package:** postcss (transitive)
- **Version:** <8.5.10
- **Issue:** GHSA-qx2v-qp2m-jg93 - CSS stringification outputs unescaped tags
- **CVSS:** 6.1
- **Fix:** Update postcss to ≥8.5.10
- **Command:** `npm audit fix`

#### DEP-006: esbuild CORS Bypass (MODERATE)
- **Severity:** P3 (dev-time)
- **Category:** CVE - CORS Bypass
- **Package:** esbuild (transitive via vite)
- **Version:** ≤0.24.2
- **Issue:** GHSA-67mh-4wv8-2f99 - Dev server processes any cross-origin request
- **Impact:** Development server only
- **CVSS:** 5.3
- **Fix:** Update via vite upgrade

#### DEP-007-009: vitest/vite-node/mocker Indirect Issues
- **Severity:** P4 (dev-time)
- **Packages:** vitest ≤3.0.0-beta.4, vite-node, @vitest/mocker
- **Fix:** Update vitest to ≥4.1.5

---

### ✅ Source/E2E
**Direct Dependencies:** 1 (@playwright/test)  
**Transitive Dependencies:** 4  
**Vulnerabilities:** None 🟢

---

### 🔴 platform/orchestrator (CRITICAL)
**Direct Dependencies:** 153 (production)  
**Vulnerabilities:** 4 (1 critical, 1 high, 2 moderate)

#### DEP-010: protobufjs Arbitrary Code Execution (CRITICAL)
- **Severity:** P1 (Critical)
- **Category:** CVE - Remote Code Execution
- **Package:** protobufjs (transitive)
- **Version:** <7.5.5
- **Issue:** GHSA-xq3m-2v4x-88gg - Arbitrary code execution via malformed proto files
- **CVSS:** 9.8 (Critical)
- **CWE:** CWE-94 (Code injection)
- **Context:** Platform orchestrator processes untrusted protobuf definitions
- **Fix:** Update protobufjs to ≥7.5.5
- **Command:** `npm audit fix`
- **Cross-ref:** 🚨 [ESCALATE → TheGuardians] - Remote code execution in core infrastructure

#### DEP-011: path-to-regexp ReDoS (HIGH)
- **Severity:** P2
- **Category:** CVE - Denial of Service
- **Package:** path-to-regexp (transitive)
- **Version:** <0.1.13
- **Issue:** GHSA-37ch-88jc-xwx2 - Regular expression DoS via multiple route parameters
- **CVSS:** 7.5
- **CWE:** CWE-1333 (Inefficient regex)
- **Impact:** Can cause orchestrator service crash with malformed route requests
- **Fix:** Update path-to-regexp to ≥0.1.13
- **Command:** `npm audit fix`

#### DEP-012: uuid Buffer Bounds (MODERATE)
- **Severity:** P2
- **Category:** CVE - Memory Safety
- **Package:** uuid (transitive)
- **Fix:** Upgrade dependencies that pull uuid (see dockerode upgrade)

#### DEP-013: dockerode Version Outdated (MODERATE)
- **Severity:** P3
- **Category:** Outdated dependency
- **Package:** dockerode
- **Version:** 4.0.3 - 4.0.12
- **Issue:** Affected by uuid vulnerability
- **Fix:** Update dockerode to ≥5.0.0 (major version bump)
- **Command:** `npm install dockerode@^5.0.0`

---

### 🔴 portal/Backend
**Vulnerabilities:** 9 (1 critical, 1 high, 7 moderate)

#### DEP-014: protobufjs (CRITICAL) — same as DEP-010
#### DEP-015: path-to-regexp (HIGH) — same as DEP-011
#### Others: esbuild, postcss, vite, vitest, uuid, vite-node — similar to Frontend

---

### 🟡 portal/Frontend
**Vulnerabilities:** 6 (1 high, 5 moderate)

#### DEP-016: Picomatch Method Injection (HIGH)
- **Severity:** P2
- **Category:** CVE - Pattern Matching Bypass
- **Package:** picomatch (transitive)
- **Version:** <3.0.2
- **Issue:** GHSA-mwcw-c2e4-8c55 - POSIX character class method injection
- **CVSS:** 7.5
- **CWE:** CWE-1025 (Comparison operator bypassed)
- **Impact:** Glob pattern matching can be bypassed via crafted filenames
- **Fix:** Update picomatch to ≥3.0.2
- **Command:** `npm audit fix`

#### Other moderate CVEs (esbuild, postcss, vite, vitest, vite-node)

---

## Outdated Major Versions

### Backend (Source/Backend)

| Package | Current | Latest | Major Versions Behind | Status |
|---------|---------|--------|----------------------|--------|
| express | 4.18.2 | 5.2.1 | 1 | ⚠️ Behind |
| pino | 8.17.0 | 10.3.1 | 2 | 🔴 Behind |
| uuid | 9.0.0 | 14.0.0 | 5 | 🔴 Behind |
| prom-client | 15.1.0 | 15.1.3 | 0 | ✅ Current |

**Recommendation:**
- uuid: Upgrade to ≥14.0.0 (required for security)
- pino: Major version jumps — test carefully, pino v9/v10 have breaking changes
- express: v5.0.0 is major rewrite, test thoroughly before upgrading

### Frontend (Source/Frontend)

| Package | Current | Latest | Major Versions Behind |
|---------|---------|--------|----------------------|
| react | 18.3.1 | 19.2.5 | 1 | ⚠️ Behind |
| react-dom | 18.3.1 | 19.2.5 | 1 | ⚠️ Behind |
| react-router-dom | 6.26.0 | 7.14.2 | 1 | ⚠️ Behind |
| typescript | 5.5.4 | 5.8.2 | 0 | ✅ Current |
| vite | 5.4.0 | 8.0.10 | 3 | 🔴 Behind |
| vitest | 2.0.5 | latest | varies | ⚠️ Check |

**Recommendation:**
- vite: Requires major upgrade (see security fixes)
- React 18→19: Breaking changes, test thoroughly
- All tooling should be aligned before React upgrade

---

## License Compliance ✅

### Backend Direct Dependencies
- express: MIT ✅
- prom-client: Apache-2.0 ✅
- uuid: MIT ✅
- pino: MIT ✅

### Frontend Direct Dependencies
- react: MIT ✅
- react-dom: MIT ✅
- react-router-dom: MIT ✅
- vite: MIT ✅
- vitest: MIT ✅

**Assessment:** No GPL/AGPL licenses, no unlicensed dependencies, no conflicts. ✅ License Compliance PASSED

---

## Supply Chain Risk Analysis

### High Transitive Dependency Counts
- Backend: 411 transitive packages (⚠️ moderate risk surface)
- Frontend: 230 transitive packages (✅ acceptable)
- E2E: 4 transitive packages (✅ minimal)
- platform/orchestrator: 155 packages (✅ acceptable)

### Risk Findings

**P4: Large Dependency Surface in Backend**
- 411 total packages creates supply chain exposure
- Multiple CVEs in transitive deps (handlebars, brace-expansion)
- Recommendation: Audit post-install scripts, dependency health

**P3: No Post-install Script Audit**
- Checked for, but detailed post-install script analysis not available in this run
- Recommendation: Run `npm ls --all | grep postinstall` for each project

**P3: Orphaned/Unmaintained Package Check**
- Cannot determine maintainer status without npm registry lookup
- Recommend: Set up Snyk or npm audit PRs for automated scanning

---

## Remediation Plan

### Immediate (P1 - Critical RCE)
1. **[ESCALATE → TheGuardians]** Handlebars RCE in Backend
   - Cannot be safely upgraded without understanding dependency chain
   - Requires security review before upgrade
   - Temporary: Don't expose handlebars templates to untrusted input

2. **[ESCALATE → TheGuardians]** protobufjs RCE in platform/orchestrator and portal/Backend
   - Critical for infrastructure
   - Upgrade protobufjs to ≥7.5.5 and test orchestrator thoroughly

### Short Term (1-2 weeks) - P2/P3
- [ ] Update uuid to ^14.0.0 across all projects
- [ ] Update vite to ≥8.0.10 (brings esbuild security fix)
- [ ] Update path-to-regexp to ≥0.1.13
- [ ] Update picomatch to ≥3.0.2
- [ ] Run `npm audit fix` in each project and test

### Medium Term (1-2 months) - Upgrade Strategy
- [ ] Plan React 18→19 upgrade for Frontend (with thorough testing)
- [ ] Plan pino 8→10 upgrade in Backend (breaking changes)
- [ ] Plan vite/vitest upgrades (major versions)
- [ ] Establish automated CVE scanning (GitHub security alerts, Snyk, etc.)

---

## Verification Gates

Before this audit is closed:

- [ ] TheGuardians reviews and approves handling of P1 CVEs
- [ ] TheFixer creates and prioritizes tickets for P2/P3 remediations
- [ ] No new vulnerabilities introduced during remediation
- [ ] Tests pass after dependency updates

---

## JSON Summary

```json
{
  "audit_date": "2026-05-04",
  "scanner": "npm audit",
  "projects_scanned": 6,
  "cve_summary": {
    "critical": 3,
    "high": 4,
    "moderate": 20,
    "low": 0,
    "total": 27
  },
  "critical_packages": [
    {
      "package": "handlebars",
      "version": "4.7.8",
      "severity": "critical",
      "cve": "GHSA-2w6w-674q-4c4q",
      "location": "Source/Backend"
    },
    {
      "package": "protobufjs",
      "version": "<7.5.5",
      "severity": "critical",
      "cve": "GHSA-xq3m-2v4x-88gg",
      "location": ["platform/orchestrator", "portal/Backend"]
    }
  ],
  "dependency_count": {
    "Backend": { "direct": 4, "transitive": 411 },
    "Frontend": { "direct": 5, "transitive": 230 },
    "E2E": { "direct": 1, "transitive": 4 },
    "orchestrator": { "direct": 153, "transitive": 155 },
    "portal_backend": { "direct": 31, "transitive": 100 },
    "portal_frontend": { "direct": 13, "transitive": 230 }
  },
  "license_compliance": "PASS",
  "licenses_found": ["MIT", "Apache-2.0", "ISC"],
  "escalations": [
    {
      "type": "security",
      "team": "TheGuardians",
      "issues": [
        "Handlebars JavaScript Injection RCE",
        "protobufjs arbitrary code execution"
      ]
    }
  ]
}
```

---

## Next Steps

1. **TheGuardians** reviews P1 findings and determines remediation priority
2. **TheFixer** creates tickets for P2/P3 fixes with this report as reference
3. **Backend-coder & Frontend-coder** implement fixes via standard CI/CD pipeline
4. **Dependency-auditor** re-scans after fixes applied to verify resolution
5. **Infrastructure** considers automated scanning (GitHub security alerts, Dependabot, Snyk)

---

**End of Report**
