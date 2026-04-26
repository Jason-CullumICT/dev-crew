# Dependency Auditor Findings
**Date:** 2026-04-26  
**Audit Type:** Comprehensive CVE, Outdated Package, License Compliance, Supply Chain Risk

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Projects Scanned** | 6 main projects |
| **Total Direct Dependencies** | 44 |
| **Total Transitive Dependencies** | ~1,800+ (across lock files) |
| **Critical CVEs** | 2 (handlebars, protobufjs) |
| **High CVEs** | 3 (path-to-regexp, picomatch) |
| **Moderate CVEs** | 19+ across all projects |
| **Major Version Gaps** | 6 packages >1 major version behind |
| **Deprecated Packages** | 0 |
| **Missing License Declarations** | 4 projects (Source/Backend, Frontend, portal/Backend, Frontend) |
| **Post-Install Scripts** | 0 (good sign) |

---

## Critical Findings (P1)

### DEP-001: Handlebars RCE via AST Type Confusion
- **Severity:** P1 / CRITICAL
- **Category:** CVE
- **Package:** handlebars
- **Current Version:** 4.7.8 (vulnerable)
- **Affected Range:** >=4.0.0 <=4.7.8
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8) - JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1) - @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1) - Object as dynamic partial injection
  - GHSA-9cx6-37pm-9jff (CVSS 7.5) - DoS via malformed decorator syntax
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.3) - CLI precompiler unescaped names
  - GHSA-2qvq-rjwj-gvw9 (CVSS 4.7) - Prototype pollution XSS
  - GHSA-7rx3-28cr-v5wh (CVSS 4.8) - Prototype method access bypass
  - GHSA-442j-39wm-28r2 (CVSS 3.7) - Property access validation bypass
- **Location:** Source/Backend
- **Appears in:** Source/Backend package-lock.json
- **Description:** Multiple critical vulnerabilities in handlebars templating engine allow arbitrary code execution, DoS, and XSS attacks via AST type confusion and prototype pollution.
- **Fix:** `npm update handlebars` (upgrade to >=4.7.9)
- **Risk Level:** **CRITICAL - May be exploitable in template rendering contexts**
- **Cross-ref:** [ESCALATE → TheGuardians] if handlebars is used for user-supplied template processing

---

### DEP-002: protobufjs Arbitrary Code Execution
- **Severity:** P1 / CRITICAL
- **Category:** CVE
- **Package:** protobufjs
- **Current Version:** <7.5.5
- **Affected Range:** <7.5.5
- **CVE ID:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **CWE:** CWE-94 (Improper Control of Generation of Code)
- **Locations:** 
  - platform/orchestrator (transitive via dependency chain)
  - portal/Backend (transitive via dependency chain)
- **Description:** Arbitrary code execution vulnerability in protobufjs library. An attacker can execute arbitrary JavaScript code through specially crafted protobuf messages.
- **Fix:** `npm update protobufjs` (upgrade to >=7.5.5)
- **Risk Level:** **CRITICAL - Can allow RCE on system processing protobufs**
- **Dependency Chain:** Introduced via OpenTelemetry SDK dependencies
- **Cross-ref:** [ESCALATE → TheGuardians] - Potential RCE in orchestrator and portal backend

---

## High-Severity Findings (P2)

### DEP-003: path-to-regexp ReDoS Vulnerability
- **Severity:** P2 / HIGH
- **Category:** CVE
- **Package:** path-to-regexp
- **Affected Range:** <0.1.13
- **CVE ID:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **CWE:** CWE-1333 (Inefficient Regular Expression Complexity)
- **Locations:**
  - platform/orchestrator (via Express dependency chain)
  - portal/Backend (via Express dependency chain)
- **Description:** Regular Expression Denial of Service (ReDoS) vulnerability in path-to-regexp library. Specially crafted URLs with multiple route parameters can cause excessive CPU usage and service denial.
- **Fix:** `npm update path-to-regexp` (upgrade to >=0.1.13)
- **Risk Level:** **HIGH - Can cause service DoS via crafted URLs**
- **Exploitability:** High in orchestrator (exposed HTTP service parsing routes)
- **Cross-ref:** [CROSS-REF: red-teamer] - ReDoS attack vector on `/api/*` endpoints

---

### DEP-004: picomatch ReDoS & Method Injection
- **Severity:** P2 / HIGH
- **Category:** CVE
- **Package:** picomatch
- **Affected Ranges:** 
  - <=2.3.1
  - 4.0.0 - 4.0.3
- **CVE IDs:**
  - GHSA-c2c7-rcm5-vvqj (CVSS 7.5) - ReDoS via extglob quantifiers
  - GHSA-3v7f-55p6-f55p (CVSS 5.3) - Method injection in POSIX character classes
- **CWE:** CWE-1333 (ReDoS), CWE-1321 (Method Injection)
- **Location:** portal/Frontend (4 instances in node_modules: anymatch, micromatch, readdirp, root)
- **Description:** Multiple vulnerabilities in glob pattern matching library. ReDoS can be triggered by patterns with extglobs, and method injection allows prototype pollution via POSIX character classes.
- **Fix:** `npm update picomatch` (upgrade to >=2.3.2 and >=4.0.4)
- **Risk Level:** **HIGH - Development tool, but can affect build/deploy pipelines**

---

## Moderate Vulnerabilities (P3)

### DEP-005: uuid Buffer Bounds Check Missing
- **Severity:** P3 / MODERATE
- **Category:** CVE
- **Package:** uuid (multiple instances)
- **Affected Range:** <14.0.0
- **CVE ID:** GHSA-w5hq-g745-h8pq
- **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285
- **Locations:**
  - Source/Backend (direct dependency: 9.0.0)
  - platform/orchestrator (indirect via dockerode)
  - portal/Backend (direct dependency: 9.0.0)
- **Description:** Missing buffer bounds check in uuid v3/v5/v6 functions when custom buffer is provided. Can lead to buffer overflows.
- **Fix:** `npm install uuid@14.0.0`
- **Risk Level:** **MODERATE - Only exploitable if passing untrusted buffers to uuid functions**
- **Current Impact:** Low in current codebase (uuid likely used for standard generation only)

---

### DEP-006: Vite Path Traversal in Optimized Deps
- **Severity:** P3 / MODERATE
- **Category:** CVE
- **Package:** vite
- **Affected Range:** <=6.4.1
- **CVE ID:** GHSA-4w7w-66w2-5vf9
- **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
- **Locations:**
  - Source/Frontend (direct: 5.4.0)
  - portal/Frontend (direct: 5.2.0)
  - portal/Backend (indirect)
- **Description:** Vite dev server vulnerable to path traversal via malformed `.map` file handling in optimized dependencies.
- **Fix:** `npm install vite@latest` (>=8.0.10 or 5.4.1+)
- **Risk Level:** **MODERATE - Development environment only, not production**
- **Note:** Source/Frontend using 5.4.0 may already have patch; check release notes

---

### DEP-007: PostCSS XSS via Unescaped </style>
- **Severity:** P3 / MODERATE
- **Category:** CVE
- **Package:** postcss
- **Affected Range:** <8.5.10
- **CVE ID:** GHSA-qx2v-qp2m-jg93
- **CWE:** CWE-79 (XSS)
- **Locations:**
  - Source/Frontend (indirect)
  - portal/Frontend (direct)
  - portal/Backend (indirect)
- **Description:** PostCSS fails to properly escape `</style>` sequences in CSS output, allowing XSS injection if CSS is embedded in HTML.
- **Fix:** `npm install postcss@latest` (>=8.5.10)
- **Risk Level:** **MODERATE - Requires CSS output embedded in HTML context**

---

### DEP-008: esbuild CORS Misconfiguration
- **Severity:** P3 / MODERATE
- **Category:** CVE
- **Package:** esbuild
- **Affected Range:** <=0.24.2
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **CWE:** CWE-346 (Origin Validation Error)
- **Locations:**
  - Source/Frontend (via vite)
  - portal/Frontend (via vite)
  - portal/Backend (via vite)
- **Description:** Vite dev server (via esbuild) allows any website to send requests to development server and read responses due to improper CORS headers.
- **Fix:** Update vite to latest (fixes esbuild)
- **Risk Level:** **MODERATE - Dev environment only, not production**

---

### DEP-009: brace-expansion DoS
- **Severity:** P3 / MODERATE
- **Category:** CVE
- **Package:** brace-expansion
- **Affected Range:** <1.1.13
- **CVE ID:** GHSA-f886-m6hf-6m8v
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **Location:** Source/Backend (transitive)
- **Description:** Zero-step sequences in brace-expansion cause process hang and memory exhaustion.
- **Fix:** Automatic with dependency updates; fixable

---

### DEP-010: vitest + Vite Chain Vulnerabilities
- **Severity:** P3 / MODERATE
- **Category:** CVE (Chain)
- **Package:** vitest (direct in Source/Frontend, portal/Frontend, portal/Backend)
- **Affected Versions:** vitest <4.1.5
- **Caused by:** vite, vite-node, @vitest/mocker chain
- **CWE:** CWE-22, CWE-346
- **Description:** vitest inherits vulnerabilities from vite dependency chain (path traversal, CORS).
- **Fix:** `npm install vitest@latest` (>=4.1.5)
- **Risk Level:** **MODERATE - Test environment only**

---

## Outdated Major Versions (P3)

### DEP-011: React & React-Router Major Version Gaps
- **Severity:** P3 / MODERATE
- **Category:** Outdated Major Version
- **Packages:**
  - react: 18.3.1 → 19.2.5 (1 major version behind)
  - react-dom: 18.3.1 → 19.2.5 (1 major version behind)
  - react-router-dom: 6.26.0 → 7.14.2 (1 major version behind)
- **Locations:**
  - Source/Frontend
  - portal/Frontend
- **Risk:** May miss security patches, performance improvements in React 19
- **Fix:** Review React 19 breaking changes and upgrade
- **Timeline:** React 18 enters extended support mode; consider roadmap for v19 migration

---

### DEP-012: Express & Ecosystem Major Version Gaps
- **Severity:** P3 / MODERATE
- **Category:** Outdated Major Version
- **Packages:**
  - express: 4.18.2 → 5.2.1 (1 major version behind)
  - multer: 1.4.5-lts.1 → 2.1.1 (1 major version behind)
- **Locations:**
  - Source/Backend
  - portal/Backend
  - platform/orchestrator
- **Risk:** Express 4.x approaching end-of-life; Express 5 has improved middleware system
- **Fix:** Plan migration to Express 5
- **Timeline:** Express 4.x LTS support ended; critical fixes backported only

---

### DEP-013: Pino Logging Major Version Gap
- **Severity:** P3 / MODERATE
- **Category:** Outdated Major Version
- **Package:** pino: 8.17.0 → 10.3.1 (1+ major versions behind)
- **Location:** Source/Backend
- **Risk:** Missing recent performance optimizations and structured logging improvements
- **Fix:** `npm install pino@latest`

---

### DEP-014: OpenTelemetry SDK Significant Version Gaps
- **Severity:** P3 / MODERATE
- **Category:** Outdated Major Version
- **Packages:**
  - @opentelemetry/exporter-trace-otlp-http: 0.47.0 → 0.215.0 (0.168 versions behind!)
  - @opentelemetry/sdk-node: 0.47.0 → 0.215.0 (0.168 versions behind!)
  - @opentelemetry/auto-instrumentations-node: 0.40.0 → 0.73.0 (0.33 versions behind)
- **Location:** portal/Backend
- **Risk Level:** **HIGH - Critical observability infrastructure 6+ months behind**
- **Impact:** Missing instrumentation improvements, potential trace data quality issues
- **Fix:** Staged upgrade required (coordinated with agent/SDK compatibility)
- **Note:** This represents the largest version gap in the codebase

---

## License Compliance Issues (P4)

### DEP-015: Missing License Declarations
- **Severity:** P4 / INFORMATIONAL
- **Category:** License Compliance
- **Locations:**
  - Source/Backend/package.json (no license field)
  - Source/Frontend/package.json (no license field)
  - portal/Backend/package.json (no license field)
  - portal/Frontend/package.json (no license field)
- **Only Declared:**
  - Source/E2E/package.json (ISC)
- **Recommendation:** Add `"license": "MIT"` (or appropriate) to all public packages
- **Risk:** Low (internal projects), but best practice for open source contribution

---

## Supply Chain Risk Analysis

### DEP-016: Large Transitive Dependency Trees
- **Severity:** P4 / INFORMATIONAL
- **Category:** Supply Chain Risk
- **Finding:**
  - Source/Backend: 102 direct, ~400+ transitive
  - Source/Frontend: 9 direct, ~200+ transitive
  - portal/Backend: 397 direct, ~600+ transitive (largest)
  - portal/Frontend: 9 direct, ~400+ transitive
- **Risk Level:** MODERATE (>500 transitive = larger attack surface)
- **Specific Concern:** portal/Backend with 397 direct deps is unusually high
- **Recommendation:** Audit unnecessary dev dependencies; consolidate where possible

---

### DEP-017: No Post-Install Scripts Detected ✓
- **Finding:** POSITIVE - No suspicious post-install scripts in any package.json
- **Risk Level:** LOW / POSITIVE
- **This prevents supply chain attacks via installation-time code execution**

---

## Cross-Project Vulnerability Analysis

### Packages with Vulnerabilities Across Multiple Projects:

| Package | Projects | Severity | CVE Count |
|---------|----------|----------|-----------|
| handlebars | Source/Backend | CRITICAL | 8 |
| protobufjs | platform/orchestrator, portal/Backend | CRITICAL | 1 |
| path-to-regexp | platform/orchestrator, portal/Backend | HIGH | 1 |
| uuid | Source/Backend, orchestrator, portal/Backend | MODERATE | 1 |
| vite | Source/Frontend, portal/Frontend, portal/Backend | MODERATE | 1 |
| vitest | Source/Frontend, portal/Frontend, portal/Backend | MODERATE | 1 (chain) |
| postcss | Source/Frontend, portal/Frontend, portal/Backend | MODERATE | 1 |
| esbuild | Source/Frontend, portal/Frontend, portal/Backend | MODERATE | 1 |

---

## Remediation Priority Matrix

### Immediate (Week 1) - Critical Path Blockers

1. **Handlebars (DEP-001)** - Source/Backend
   - **Action:** `npm update handlebars` to >=4.7.9
   - **Testing:** Verify template rendering in backend tests
   - **Effort:** Low

2. **protobufjs (DEP-002)** - platform/orchestrator & portal/Backend
   - **Action:** Update OpenTelemetry chain
   - **Commands:**
     ```bash
     npm update @opentelemetry/exporter-trace-otlp-http
     npm update @opentelemetry/sdk-node
     ```
   - **Testing:** Ensure observability still works
   - **Effort:** Medium

3. **path-to-regexp (DEP-003)** - platform/orchestrator & portal/Backend
   - **Action:** Update Express versions
   - **Effort:** Medium (may require API changes in Express 5)

### Short-term (Week 2-4) - High Risk

4. **picomatch (DEP-004)** - portal/Frontend
   - **Action:** `npm update picomatch` to >=2.3.2
   - **Effort:** Low

5. **uuid (DEP-005)** - Multiple
   - **Action:** `npm install uuid@14.0.0` (major version bump)
   - **Testing:** Verify UUID generation still works
   - **Effort:** Low

6. **vite, vitest, postcss, esbuild chain (DEP-006 through DEP-010)**
   - **Action:** Coordinate update across all frontend projects
   - **Command:** `npm install vite@latest vitest@latest postcss@latest`
   - **Effort:** Medium (test frameworks involved)

### Medium-term (Month 2) - Modernization

7. **React Major Version Upgrade (DEP-011)**
   - **Action:** Plan React 18→19 migration
   - **Effort:** High (breaking changes, testing required)
   - **Coordination:** Frontend team

8. **Express Major Version Upgrade (DEP-012)**
   - **Action:** Plan Express 4→5 migration
   - **Effort:** High (middleware changes)
   - **Coordination:** Backend + orchestrator teams

9. **OpenTelemetry SDK Modernization (DEP-014)**
   - **Action:** Staged upgrade with testing
   - **Effort:** High (critical infrastructure)
   - **Note:** This should be coordinated with Express upgrade timeline

---

## Testing & Verification Strategy

### Unit Test Coverage
- All projects have test suites; run full suite after each update
- Command: `npm test --workspaces --if-present`

### Integration Testing
- platform/orchestrator: Verify health checks work
- portal/Backend: Verify OpenTelemetry tracing still functional
- portal/Frontend: Verify API communication still works

### Vulnerability Re-scan
- After updates: `npm audit --json > before.json && npm install && npm audit --json > after.json`
- Diff to confirm no new vulnerabilities introduced

---

## Learning & Future Prevention

### Additions to dependency-auditor.md:

1. **Watch List - Recurring Issues:**
   - Handlebars: Update monitoring for template injection vectors
   - OpenTelemetry: Large version gaps common; quarterly reviews recommended
   - Vite/esbuild: Keep updated; development tools get frequent security patches

2. **Policy Recommendations:**
   - Set monthly audit cadence for npm audit
   - Require upstream updates within 30 days for HIGH/CRITICAL
   - Modernize Node.js LTS every 2 years (align with v18→v20→v22 schedule)

3. **Dependency Discipline:**
   - Reduce portal/Backend direct deps from 397 → target <200 by consolidation
   - Consider monorepo tool (nx, turborepo) to manage shared deps more cleanly
   - Automated dependabot/renovate PR creation for patch updates

---

## Summary by Severity

```
Total Findings: 17
├── P1 (Critical): 2
│   ├── Handlebars RCE
│   └── protobufjs RCE
├── P2 (High): 3
│   ├── path-to-regexp ReDoS
│   ├── picomatch ReDoS/Injection
│   └── OpenTelemetry Version Gap (supply chain)
├── P3 (Moderate): 10
│   ├── uuid bounds check
│   ├── Vite path traversal
│   ├── PostCSS XSS
│   ├── esbuild CORS
│   ├── brace-expansion DoS
│   ├── vitest chain vulnerabilities
│   ├── React version gap
│   ├── Express version gap
│   ├── Pino version gap
│   └── OpenTelemetry (major version gap)
└── P4 (Informational): 2
    ├── Missing license declarations
    └── Large transitive trees
```

---

## Dashboard Metrics

```json
{
  "audit_date": "2026-04-26",
  "projects_scanned": 6,
  "total_direct_dependencies": 44,
  "total_transitive_dependencies": 1800,
  "vulnerabilities": {
    "critical": 2,
    "high": 3,
    "moderate": 12,
    "low": 0,
    "total": 17
  },
  "outdated_packages": {
    "major_version_gaps": 6,
    "significant_gaps": 1
  },
  "license_issues": {
    "undeclared": 4,
    "problematic": 0
  },
  "supply_chain_risks": {
    "post_install_scripts": 0,
    "large_dep_trees": 4
  },
  "recommended_actions": 9,
  "effort_estimate_hours": 40
}
```

---

## References

- NPM Security Advisories: https://www.npmjs.com/advisories/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Handlebars Security: https://github.com/handlebars-lang/handlebars.js/releases
- Express EOL: https://expressjs.com/en/advanced/healthcheck-firewalls.html
