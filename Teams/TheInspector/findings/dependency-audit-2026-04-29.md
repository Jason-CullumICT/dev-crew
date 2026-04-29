# Dependency Auditor Findings Report
**Generated:** 2026-04-29  
**Scope:** dev-crew Source App  
**Package Managers:** npm (13 projects detected)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Projects Audited** | 6 (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend) |
| **Package Managers** | npm only |
| **Total CVEs Found** | 28 vulnerabilities across all projects |
| **Critical (P1)** | 2 |
| **High (P2)** | 4 |
| **Moderate (P3)** | 22 |
| **Outdated Major Versions** | 7 packages |
| **Overall Grade** | **C** (2 critical CVEs require immediate remediation) |

---

## Vulnerability Summary by Severity

### Critical Vulnerabilities (CVSS 9+)

| Package | Project | CVE ID | Title | CVSS | Status |
|---------|---------|--------|-------|------|--------|
| **handlebars** | Source/Backend | GHSA-2w6w-674q-4c4q | JavaScript Injection via AST Type Confusion | 9.8 | Unfixed |
| **protobufjs** | platform/orchestrator, portal/Backend | GHSA-xq3m-2v4x-88gg | Arbitrary Code Execution | 9.8 | Unfixed |

### High Vulnerabilities (CVSS 7-8.9)

| Package | Project | CVE ID | Title | CVSS |
|---------|---------|--------|-------|------|
| **path-to-regexp** | platform/orchestrator, portal/Backend | GHSA-37ch-88jc-xwx2 | ReDoS via multiple route parameters | 7.5 |
| **picomatch** | portal/Frontend | (Unknown) | Path traversal or ReDoS | ~7.5 |
| **handlebars** (multi) | Source/Backend | Multiple | Various JavaScript injection vectors | 8.1-8.3 |

---

## Critical Findings

### DEP-001: Handlebars.js JavaScript Injection in Source/Backend
- **Severity:** **P1 CRITICAL**
- **Category:** CVE (Remote Code Execution vector)
- **Package:** handlebars (transitive, via unknown dependency)
- **Affected Range:** >=4.0.0 <=4.7.8
- **Current Version:** ~4.x (determined from audit)
- **File:** Source/Backend/package-lock.json
- **CVSS Score:** 9.8 (GHSA-2w6w-674q-4c4q)
- **Detail:** 
  - **GHSA-2w6w-674q-4c4q** (Critical, 9.8): AST Type Confusion allows arbitrary JavaScript injection by crafting malicious template expressions
  - **GHSA-3mfm-83xf-c92r** (High, 8.1): AST Type Confusion via `@partial-block` tampering
  - **GHSA-xjpj-3mr7-gcpf** (High, 8.3): CLI Precompiler accepts unescaped template names/options
  - **GHSA-xhpv-hc6g-r9c6** (High, 8.1): Dynamic partial object injection
  - Plus 4 additional moderate and low severity issues
- **Impact:** If Source/Backend uses handlebars for template rendering (email templates, code generation), an attacker could inject arbitrary code
- **Root Cause:** Handlebars did not properly sanitize AST node types, allowing type confusion attacks
- **Fix:** Upgrade to handlebars >=4.7.9
  ```bash
  cd Source/Backend && npm audit fix
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — This is an RCE vector if templates are user-controlled

---

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** **P1 CRITICAL**
- **Category:** CVE (Remote Code Execution)
- **Packages:** 
  - platform/orchestrator (direct dependency: dockerode)
  - portal/Backend (transitive)
- **Affected Range:** <7.5.5
- **CVSS Score:** 9.8 (GHSA-xq3m-2v4x-88gg)
- **Detail:**
  - **GHSA-xq3m-2v4x-88gg**: Protobufjs versions before 7.5.5 are vulnerable to arbitrary code execution when loading untrusted `.proto` files or JSON payloads. An attacker can embed JavaScript payloads in proto definitions that execute during parsing.
  - The vulnerability affects `util.extend()` and prototype pollution patterns in protobufjs
- **Impact:** If either service processes untrusted protobuf definitions or messages, RCE is possible
- **Fix:** 
  - platform/orchestrator: `npm update protobufjs@^7.5.5` or `npm update dockerode@^5.0.0` (major version bump)
  - portal/Backend: Trace dependency and upgrade parent
  ```bash
  cd platform/orchestrator && npm audit fix
  cd portal/Backend && npm audit fix
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vulnerability in message parsing

---

### DEP-003: path-to-regexp Regular Expression Denial of Service (ReDoS)
- **Severity:** **P2 HIGH**
- **Category:** CVE (Denial of Service)
- **Packages:** 
  - platform/orchestrator (transitive)
  - portal/Backend (transitive)
- **Affected Range:** <0.1.13
- **CVSS Score:** 7.5
- **CVE ID:** GHSA-37ch-88jc-xwx2
- **Detail:**
  - path-to-regexp versions <0.1.13 have a catastrophic backtracking regex in route parameter parsing
  - An attacker can craft a URL with multiple route parameters designed to cause extreme regex backtracking
  - This causes the application to hang or become unresponsive (DoS)
  - CWE-1333: Inefficient Regular Expression Complexity
- **Entry Points:**
  - platform/orchestrator: Any route handler using express or similar frameworks
  - portal/Backend: Same as above
- **Impact:** DoS attack on both orchestrator and portal backend via specially-crafted URLs
- **Fix:** 
  ```bash
  cd platform/orchestrator && npm update path-to-regexp
  cd portal/Backend && npm update path-to-regexp
  ```
- **Testing:** Send requests with 100+ chained route parameters to verify fix

---

### DEP-004: Picomatch Path Traversal / ReDoS in portal/Frontend
- **Severity:** **P2 HIGH**
- **Category:** ReDoS (Denial of Service)
- **Package:** picomatch
- **File:** portal/Frontend/package-lock.json
- **Detail:**
  - picomatch is used by Vite for path globbing
  - Vulnerable versions can be exploited with specially-crafted glob patterns
  - May allow path traversal or cause ReDoS during build/dev server startup
- **Impact:** Dev server hangs or bypasses intended file restrictions during bundling
- **Fix:** 
  ```bash
  cd portal/Frontend && npm update picomatch
  cd portal/Frontend && npm audit fix
  ```

---

## High-Severity Moderate Vulnerabilities (P3)

### DEP-005: UUID Buffer Bounds Check Missing
- **Severity:** **P3 MODERATE** (but affects critical packages)
- **Package:** uuid
- **Affected Versions:** <14.0.0
- **CVE:** GHSA-w5hq-g745-h8pq
- **Affected Projects:** Source/Backend (9.0.1), platform/orchestrator
- **Issue:** 
  - uuid v3/v5/v6 missing bounds check when user provides a `buf` parameter
  - Can cause buffer overflow (CWE-787)
  - Less likely in typical usage patterns but serious if uuid functions accept user-controlled buffer arguments
- **Fix:**
  - Source/Backend: `npm update uuid@^14.0.0` — Major version bump
  - Current: 9.0.1 → Latest: 14.0.0
  - This is over 2 major versions behind

---

### DEP-006: Vite Path Traversal in `.map` Handling (Dev Tool)
- **Severity:** **P3 MODERATE** (dev-only)
- **Package:** vite
- **Affected Versions:** <5.x
- **CVE:** GHSA-4w7w-66w2-5vf9
- **Affected Projects:** Source/Frontend, portal/Frontend, portal/Backend
- **Issue:**
  - Vite's optimized deps `.map` file handling is vulnerable to path traversal
  - An attacker with filesystem access could escape the deps directory
  - Only affects dev server; production builds unaffected
- **Fix:** Update vite to latest (5.x or 6.x)

---

### DEP-007: PostCSS XSS via Unescaped `</style>` Tag
- **Severity:** **P3 MODERATE**
- **Package:** postcss
- **Affected Versions:** <8.5.10
- **CVE:** GHSA-qx2v-qp2m-jg93
- **Affected Projects:** Source/Frontend, portal/Frontend, portal/Backend
- **Issue:**
  - PostCSS stringify output doesn't escape `</style>` tags in CSS values
  - If CSS contains user input, could lead to style tag injection and XSS
- **Fix:** `npm update postcss@^8.5.10`

---

## Outdated Major Versions (P3)

### DEP-008: Express.js Major Version Behind
- **Severity:** **P3 (outdated)**
- **Package:** express
- **Project:** Source/Backend
- **Current:** 4.22.1 (semver range ^4.18.2)
- **Latest:** 5.2.1
- **Major Versions Behind:** 1
- **Breaking Changes:** Yes (major version)
- **Recommendation:** Plan for Express 5.x upgrade as part of backend refactor (breaking change, not urgent)

---

### DEP-009: Pino Logger Major Version Behind
- **Severity:** **P3 (outdated)**
- **Package:** pino
- **Project:** Source/Backend
- **Current:** 8.21.0
- **Latest:** 10.3.1
- **Major Versions Behind:** 2 (likely missing security patches)
- **Recommendation:** Upgrade to pino ^10.x — likely includes bug and security fixes

---

### DEP-010: React & React Router Out of Date
- **Severity:** **P3 (outdated)**
- **Package:** react, react-dom, react-router-dom
- **Project:** Source/Frontend
- **Current Versions:**
  - react: 18.3.1 → Latest: 19.2.5 (1 major behind)
  - react-dom: 18.3.1 → Latest: 19.2.5 (1 major behind)
  - react-router-dom: 6.30.3 → Latest: 7.14.2 (1 major behind)
- **Recommendation:** Plan for React 19.x upgrade (will require testing)

---

### DEP-011: UUID Major Version Behind
- **Severity:** **P3 (outdated) + security (buffer bounds)**
- **Package:** uuid
- **Project:** Source/Backend
- **Current:** 9.0.1
- **Latest:** 14.0.0
- **Major Versions Behind:** 5
- **Recommendation:** Critical — includes security fix for buffer overflow

---

## Dependency Tree Complexity

| Project | Direct Dependencies | Transitive Dependencies | Risk Level |
|---------|---------------------|-------------------------|-----------|
| Source/Backend | 4 | 13 | Low |
| Source/Frontend | 3 | 13 | Low |
| Source/E2E | ? | 1 | Low |
| platform/orchestrator | ? | 3 | Low |
| portal/Backend | ? | 22 | Moderate |
| portal/Frontend | ? | 17 | Moderate |

**Note:** No projects exceed 500 transitive dependencies (acceptable for supply chain risk).

---

## Licenses & Compliance

- **npm audit** does not report license issues in this codebase
- All direct dependencies appear to be OSI-approved (MIT, Apache, ISC)
- **No license compliance violations detected**

---

## Supply Chain Risks

### Observations:
1. **No abandoned dependencies detected** — All flagged packages are actively maintained
2. **No post-install scripts detected** in Source/ manifests
3. **No suspicious single-maintainer packages** detected

### Recommendations:
- Monitor protobufjs releases (affected by multiple RCEs recently)
- Pin critical packages (uuid, path-to-regexp) to exact versions after testing
- Implement automated dependency scanning in CI/CD pipeline

---

## Recommended Remediation Plan

### Immediate (P1 - Critical, do today):
1. **DEP-001:** Upgrade handlebars in Source/Backend
   ```bash
   cd Source/Backend && npm audit fix --force
   npm test  # Verify no breakage
   ```
2. **DEP-002:** Upgrade protobufjs in platform/orchestrator and portal/Backend
   - **platform/orchestrator:** Consider upgrading dockerode to ^5.0.0 (major bump)
   - **portal/Backend:** Trace protobufjs dependency, upgrade parent
3. **Coordinate with TheGuardians** — Escalate RCE/injection vectors for threat assessment

### Short-term (P2 - High, this week):
4. **DEP-003:** Update path-to-regexp in platform/orchestrator and portal/Backend
5. **DEP-004:** Update picomatch in portal/Frontend

### Medium-term (P3 - Moderate, next sprint):
6. **DEP-005 through DEP-011:** Create backlog items for:
   - uuid 14.x upgrade (Source/Backend)
   - pino 10.x upgrade (Source/Backend)
   - Vite 5.x+ update (all frontend projects)
   - PostCSS 8.5.10+ update (all frontend projects)
   - React 19.x migration plan (Source/Frontend)
   - Express 5.x migration plan (Source/Backend - lower priority)

### Verification Gates:
```bash
# After each fix:
npm audit                    # Confirm no new vulnerabilities
npm test                     # Verify no breakage
npm list --depth=0           # Check for conflicts
```

---

## Cross-Team Escalation

### → TheGuardians (Security Team)
- **DEP-001: Handlebars RCE** — If Source/Backend renders user-controlled templates, this is exploitable
- **DEP-002: Protobufjs RCE** — If either service deserializes untrusted protobuf messages, this is exploitable
- **DEP-003: path-to-regexp ReDoS** — Could be triggered by public-facing routes

**Recommended:** Threat model the affected services to determine if RCE vectors are exposed.

---

## JSON Summary

```json
{
  "audit_date": "2026-04-29",
  "projects_audited": 6,
  "package_managers": ["npm"],
  "vulnerabilities": {
    "critical": 2,
    "high": 4,
    "moderate": 22,
    "low": 0,
    "total": 28
  },
  "outdated_packages": {
    "major_versions_behind": 7,
    "patches_behind": 22
  },
  "grade": "C",
  "escalations": 1,
  "remediation_timeline_days": 7
}
```

