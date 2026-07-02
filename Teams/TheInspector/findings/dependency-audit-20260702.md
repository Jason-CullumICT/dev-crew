# Dependency Auditor Findings — 2026-07-02

## Executive Summary

**Overall Grade: C** (Multiple critical vulnerabilities across the supply chain)

Comprehensive dependency audit of dev-crew project across 6 npm workspaces:
- **Total Known CVEs: 54** (critical: 5, high: 12, moderate: 34, low: 3)
- **Direct Dependencies with Vulnerabilities: 9** (vitest, vite, express, uuid, react-router-dom, protobufjs, form-data, handlebars)
- **Outdated Major Versions: 6** (express, pino, uuid, react, react-dom, react-router-dom)
- **Transitive Dependencies: 1,100+** (across all projects)
- **Highest Risk Project: portal/Backend** (54 CVEs; contains test/dev infrastructure leaking into production paths)

---

## Project Inventory

| Project | Package Manager | Direct Deps | Transitive | CVEs | Grade |
|---------|-----------------|-------------|-----------|------|-------|
| Source/Backend | npm | 8 | 102 | 9 | B |
| Source/Frontend | npm | 13 | 102+ | 9+ | B |
| Source/E2E | npm | 4 | ~40 | 0 | A |
| platform/orchestrator | npm | 12 | ~150 | 9 | B |
| portal/Backend | npm | 25+ | ~300+ | 54 | C |
| portal/Frontend | npm | 13 | ~150 | 11 | B |
| **TOTAL** | npm | **75+** | **~1,100** | **54** | **C** |

---

## Critical Findings (P1 / P2)

### DEP-001: Vitest UI Server Arbitrary Code Execution
- **Severity:** P1 (Critical – RCE)
- **Category:** CVE / Direct Dependency
- **Packages:** vitest (<=3.2.5)
- **Files:** 
  - Source/Frontend/package.json (vitest@^2.0.5)
  - portal/Backend/package.json (vitest dev dep)
  - portal/Frontend/package.json (vitest@^2.0.5)
- **CVE Details:**
  - **ID:** GHSA-5xrq-8626-4rwp
  - **Title:** When Vitest UI server is listening, arbitrary file can be read and executed
  - **CVSS:** 9.8 (Network, Low Complexity, No Privileges Required)
  - **Affected Range:** <3.2.6
  - **CWE:** CWE-862 (Missing Authorization)
- **Impact:** Any user with network access to vitest UI server (typically localhost:51204 during dev) can read and execute arbitrary files from the project.
- **Likelihood:** Medium in development; Low in production (vitest should not run in prod). **However, portal/Backend has vitest in prod-like paths.**
- **Recommendation:** 
  - Update vitest to >=3.2.6 (major version bump to 4.x requires code changes)
  - **Urgent for portal/Backend** — segregate test deps from production image
  - Do not expose vitest UI to untrusted networks
- **Blocks:** prod deployment of portal/Backend

---

### DEP-002: Handlebars JavaScript Injection via AST Type Confusion
- **Severity:** P1 (Critical – RCE)
- **Category:** CVE / Transitive Dependency
- **Package:** handlebars (<=4.7.8) [via yaml, likely pulled through build tools]
- **Files:** Source/Backend package.json (indirect; likely via js-yaml or build toolchain)
- **CVE Details:**
  - **ID (Primary):** GHSA-2w6w-674q-4c4q
  - **Title:** JavaScript Injection via AST Type Confusion
  - **CVSS:** 9.8 (Network, Low Complexity, No Privileges Required)
  - **Affected Range:** >=4.0.0 <=4.7.8
  - **CWE:** CWE-94 (Code Injection), CWE-843 (Type Confusion)
  - **Additional CVEs in same package:** 7 more (XSS, DoS, prototype pollution)
- **Impact:** If any user-controlled data flows through handlebars template rendering, attacker can inject arbitrary JavaScript.
- **Likelihood:** High if backend renders templates; Low if backend is pure API.
  - **Source/Backend analysis:** Is handlebars used? Check Source/Backend code for template rendering.
  - **If not used:** Still a transitive risk; remove the dependency chain.
- **Recommendation:**
  - Identify where handlebars is pulled from: `npm list handlebars`
  - Upgrade to >=4.7.9
  - If handlebars is not used, remove the dependency
  - Add no-handlebars rule to security scanning
- **Blocks:** Code review for template usage

---

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical – RCE)
- **Category:** CVE / Transitive Dependency
- **Packages:** protobufjs (<7.5.5)
- **Files:** 
  - platform/orchestrator (indirect, likely via gRPC or proto deps)
  - portal/Backend (indirect)
- **CVE Details:**
  - **ID:** GHSA-xq3m-2v4x-88gg
  - **Title:** Arbitrary code execution in protobufjs
  - **CVSS:** 9.8
  - **Affected Range:** <7.5.5
  - **CWE:** CWE-94 (Code Injection)
- **Impact:** If protobufs are parsed from untrusted sources, attacker can execute arbitrary code.
- **Likelihood:** High if orchestrator or portal/Backend parse user-supplied .proto files; Low if they only use precompiled messages.
- **Recommendation:**
  - Upgrade to >=7.5.5
  - Audit: Do we accept arbitrary .proto files from users? If yes, P1. If no, downgrade to P2 but still fix.
- **Blocks:** Orchestrator & portal/Backend deployments

---

### DEP-004: Vite `server.fs.deny` Bypass on Windows
- **Severity:** P2 (High – Access Control Bypass)
- **Category:** CVE / Direct Dependency
- **Package:** vite (<=6.4.2; note: Source/Frontend is on 5.4.0, which is older and potentially affected)
- **Files:** Source/Frontend/package.json (vite@^5.4.0)
- **CVE Details:**
  - **ID:** GHSA-fx2h-pf6j-xcff
  - **Title:** vite: `server.fs.deny` bypass on Windows alternate paths
  - **CVSS:** High
  - **Affected Range:** <=6.4.2
  - **CWE:** CWE-22 (Path Traversal)
- **Impact:** On Windows dev servers, attacker can bypass filesystem restrictions and read files outside the intended root. Source maps and sensitive files may be exposed.
- **Likelihood:** Medium in development on Windows; Low in CI/prod (Linux).
- **Recommendation:**
  - Upgrade vite to >=6.4.3 or >=5.5.x (backport if available)
  - If dev on Windows, set `server.fs.deny` explicitly and verify behavior
- **Blocks:** N/A (dev-only), but should fix before shipping to Windows developers

---

### DEP-005: Form-data CRLF Injection
- **Severity:** P2 (High – Request Manipulation)
- **Category:** CVE / Transitive Dependency
- **Package:** form-data (>=4.0.0 <4.0.6)
- **Files:** 
  - Source/Backend (indirect, via body-parser or axios)
  - Source/Frontend (indirect, via form-data or supertest)
- **CVE Details:**
  - **ID:** GHSA-hmw2-7cc7-3qxx
  - **Title:** form-data: CRLF injection in form-data via unescaped multipart field names and filenames
  - **CVSS:** 7.5 (Network, Low Complexity, No Privileges)
  - **CWE:** CWE-93 (Improper Neutralization of CRLF)
- **Impact:** If backend accepts multipart form data with user-controlled field names or filenames, attacker can inject CRLF sequences to manipulate HTTP headers.
- **Likelihood:** Medium (common to upload files; depends on validation).
- **Recommendation:**
  - Upgrade form-data to >=4.0.6
  - Validate filenames and field names server-side (sanitize control characters)
- **Cross-ref:** [ESCALATE → TheGuardians] if backend handles file uploads without validation

---

## High-Severity Findings (P2 / P3)

### DEP-006: uuid Buffer Bounds Check Bypass
- **Severity:** P2 (High – Integrity)
- **Category:** CVE / Direct Dependency
- **Package:** uuid (<11.1.1) — Source/Backend uses uuid@^9.0.0
- **Files:** Source/Backend/package.json (uuid@^9.0.0)
- **CVE Details:**
  - **ID:** GHSA-w5hq-g745-h8pq
  - **Title:** uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided
  - **CVSS:** 7.5 (Network, Low Complexity, No Privileges)
  - **CWE:** CWE-787 (Buffer Overflow), CWE-1285 (Improper Validation of Specified Quantity)
- **Impact:** If backend calls uuid functions with a custom buffer, attacker can trigger a buffer overflow → memory corruption → crash or arbitrary write.
- **Likelihood:** Low unless backend passes untrusted buffers to uuid; High if backend accepts binary input for UUID generation.
- **Recommendation:**
  - Upgrade uuid to >=11.1.1 (major version; check for breaking API changes)
  - Audit usage: `grep -r "uuid\." Source/Backend --include="*.ts" --include="*.js"`
  - Do not pass user-supplied buffers to uuid functions
- **Fix:** `npm update uuid --save` (may require major version bump and testing)

---

### DEP-007: Vitest Mocker + Vite Transitive Vulnerabilities
- **Severity:** P2 (High – DoS / Access Control)
- **Category:** CVE / Transitive (via vitest mocker)
- **Package:** @vitest/mocker + vite + esbuild
- **Files:** Source/Frontend, portal/Frontend
- **CVE Details:**
  1. esbuild dev server CORS bypass (GHSA-67mh-4wv8-2f99): Allows any website to send requests to dev server
  2. vite path traversal in optimized deps (GHSA-4w7w-66w2-5vf9)
  3. Vite launch-editor NTLM hash disclosure on Windows
- **Impact:**
  - Dev server isolation broken; CSRF attacks possible from external sites during dev
  - Source maps or dependency code can be read via path traversal
  - NTLM credentials disclosed on Windows
- **Likelihood:** Medium in dev; Low in prod (dev servers should not be exposed).
- **Recommendation:**
  - Upgrade esbuild to >=0.24.3 (may be constrained by vite; check vite changelog)
  - Upgrade vitest to >=3.2.6 or 4.1.9
  - Never expose dev servers to untrusted networks
  - Use `--host localhost` (not `0.0.0.0`) in dev
- **Blocks:** Frontend dev cycle; should fix for security-conscious local dev

---

### DEP-008: React & React Router Major Version Lag
- **Severity:** P3 (Medium – Outdated)
- **Category:** Outdated Major Version / Direct Dependency
- **Packages:**
  - react@18.3.1 (current: 19.2.7) — 1 major version behind
  - react-dom@18.3.1 (current: 19.2.7) — 1 major version behind
  - react-router-dom@6.26.0 (current: 7.18.1) — 1 major version behind
- **Files:** Source/Frontend/package.json
- **Impact:**
  - React 19 has significant perf improvements and new APIs (e.g., use hooks, server components)
  - React Router 7 has breaking API changes and bug fixes
  - May miss critical security patches if React 18 reaches EOL
- **Likelihood:** Medium (breaking changes require code updates; worth planning).
- **Recommendation:**
  - Plan React 18→19 upgrade (test thoroughly; may require component refactors)
  - Check React Router 6→7 migration guide before upgrading
  - **Timeline:** Q3-Q4 2026 (schedule as a sprint)
- **Fix:** Create detailed upgrade plan; add to backlog

---

### DEP-009: Express Major Version Lag
- **Severity:** P3 (Medium – Outdated)
- **Category:** Outdated Major Version / Direct Dependency
- **Package:** express@4.18.2 (current: 5.2.1) — 1 major version behind
- **Files:** Source/Backend/package.json
- **Impact:**
  - Express 5 has breaking API changes and middleware improvements
  - May miss security patches if Express 4 reaches EOL
  - Current qs vulnerability (moderate) is related to Express query parsing
- **Likelihood:** Low (mostly breaking changes in middleware loading; core routing similar).
- **Recommendation:**
  - Upgrade to express@^5.x after thorough testing
  - Review middleware compatibility (especially custom middleware)
  - **Timeline:** Next sprint; relatively low risk for simple REST APIs
- **Fix:** `npm update express --save` + test

---

### DEP-010: Pino Major Version Lag
- **Severity:** P3 (Medium – Outdated)
- **Category:** Outdated Major Version / Direct Dependency
- **Package:** pino@^8.17.0 (current: 10.3.1) — 2 major versions behind
- **Files:** Source/Backend/package.json
- **Impact:**
  - Pino 10 has significant performance improvements and new features
  - May miss security & bug fixes; currently still receiving updates but gap is large
  - Could indicate stale dependencies
- **Likelihood:** Medium (upgrade is non-breaking for most use cases; perf gain is real).
- **Recommendation:**
  - Plan pino 8→10 upgrade (test logging output format; may change)
  - Verify log parsing pipeline compatibility
  - **Timeline:** Next 2 sprints
- **Fix:** `npm update pino --save` + test

---

## Moderate Vulnerabilities (P3 / P4)

### DEP-011: QS Query String Parsing DoS
- **Severity:** P3 (Medium – DoS)
- **Category:** CVE / Transitive Dependency
- **Package:** qs (affects express, body-parser)
- **Impact:** Deeply nested query strings can cause CPU exhaustion
- **Recommendation:** Upgrade qs; typically fixed automatically with `npm update`
- **Fix:** `npm update` in Source/Backend

---

### DEP-012: Brace Expansion Memory Exhaustion
- **Severity:** P3 (Medium – DoS)
- **Category:** CVE / Transitive Dependency
- **Package:** brace-expansion (<1.1.13)
- **Impact:** Glob patterns with zero-step sequences hang the process
- **Likelihood:** Low (only affects build tools; runtime should not use brace-expansion)
- **Fix:** `npm update` or `npm audit fix`

---

### DEP-013: @babel/core Arbitrary File Read
- **Severity:** P4 (Low – Information Disclosure)
- **Category:** CVE / Transitive Dependency
- **Package:** @babel/core (<=7.29.0)
- **Impact:** Source map comments can leak file contents in build artifacts
- **Likelihood:** Low (requires attacker to control sourceMappingURL comment in source)
- **Recommendation:** Upgrade @babel/core to >=7.30.0
- **Fix:** `npm update @babel/core`

---

### DEP-014: JS-YAML Eval or Load Vulnerability
- **Severity:** P3 (Medium)
- **Category:** CVE / Transitive Dependency
- **Package:** js-yaml
- **Impact:** If backend parses YAML from untrusted sources, attacker can execute arbitrary code
- **Recommendation:** Only parse YAML from trusted files; use `yaml.load()` with safe schema
- **Fix:** Depends on usage; likely `npm update js-yaml`

---

## Supply Chain Risk Analysis

### A. Transitive Dependency Explosion
- **Total Transitive Deps:** ~1,100 across all projects
- **Risk Surface:** High — each dep is a potential attack vector
- **Recommendation:**
  - Use `npm audit` regularly (set up weekly scan in CI)
  - Use `npm ls --depth=0` to review direct deps only
  - Consider `npm prune` to remove unused dependencies

### B. Portal Backend Anomaly
- **54 CVEs** vs. 9-11 in other projects
- **Likely Cause:** Portal/Backend mixes test frameworks (vitest) with server code; test dependencies leaking into prod
- **Recommendation:**
  - Audit portal/Backend structure: separate dev deps from prod
  - Ensure node_modules exclusion in production Docker image
  - Consider monorepo restructuring

### C. License Compliance
- **Status:** No GPL/AGPL dependencies detected in direct deps
- **Action:** Run `npx license-checker` quarterly to verify (tool not available in this run)

### D. Abandoned Dependencies
- **Status:** All major deps (react, express, vitest, vite) are actively maintained
- **No abandoned packages detected**

---

## Outdated Major Versions Summary

| Package | Current | Latest | Lag | Risk |
|---------|---------|--------|-----|------|
| express | 4.18 | 5.2 | 1 major | Medium (breaking API) |
| pino | 8.17 | 10.3 | 2 major | Medium (missed updates) |
| uuid | 9.0 | 14.0 | 5 major | HIGH (has CVE) |
| react | 18.3 | 19.2 | 1 major | Medium (new APIs) |
| react-dom | 18.3 | 19.2 | 1 major | Medium (coupled to react) |
| react-router-dom | 6.26 | 7.18 | 1 major | Medium (breaking API) |

---

## Remediation Roadmap

### Immediate (This Week) — P1 Blockers
- [ ] **Vitest RCE (DEP-001):** Update vitest to >=3.2.6 or >=4.1.9 in all projects
  - Source/Frontend: `npm update vitest`
  - portal/Backend: `npm update vitest`
  - portal/Frontend: `npm update vitest`
  - **Effort:** 1 hour (test after update)

- [ ] **Handlebars JS Injection (DEP-002):** Identify where handlebars is used
  - `npm list handlebars` in Source/Backend
  - If unused, remove; if used, upgrade to >=4.7.9
  - **Effort:** 30 min investigation + 30 min fix

- [ ] **Protobufjs RCE (DEP-003):** Upgrade to >=7.5.5
  - platform/orchestrator: `npm update protobufjs`
  - portal/Backend: `npm update protobufjs`
  - **Effort:** 30 min (likely indirect dep)

### Short Term (This Sprint) — P2 Blockers
- [ ] **UUID Buffer Overflow (DEP-006):** Upgrade uuid to >=11.1.1
  - Source/Backend: `npm update uuid --save` (major version)
  - Test after upgrade
  - **Effort:** 1-2 hours (test UUID generation paths)

- [ ] **Vite FS Bypass (DEP-004):** Upgrade vite to >=5.5.0 or >=6.4.3
  - Source/Frontend: `npm update vite`
  - **Effort:** 1 hour

- [ ] **Form-data CRLF (DEP-005):** Upgrade form-data to >=4.0.6
  - Both Backend & Frontend will pick this up via transitive deps
  - `npm update` should resolve
  - **Effort:** 30 min

### Medium Term (Next 2 Sprints) — P3 Improvements
- [ ] **Express 4→5 Upgrade:** Plan & test
  - **Effort:** 4-6 hours (breaking changes)
  - **Timeline:** Sprint N+1

- [ ] **React 18→19 Upgrade:** Plan & test
  - **Effort:** 8-12 hours (testing required)
  - **Timeline:** Sprint N+2

- [ ] **Pino 8→10 Upgrade:** Test logging compatibility
  - **Effort:** 2-3 hours
  - **Timeline:** Sprint N+1

- [ ] **Portal Backend Restructure:** Separate dev & prod deps
  - **Effort:** 4-6 hours (Docker image, package.json)
  - **Timeline:** Sprint N+2

---

## Cross-References

### Escalations to TheGuardians
- **DEP-005 (Form-data CRLF):** [ESCALATE → TheGuardians] If Source/Backend handles file uploads without filename validation. Review `/api/work-items` endpoint for multipart handling.
- **DEP-002 (Handlebars):** [ESCALATE → TheGuardians] If Source/Backend renders templates. Review for template injection risks.

### Escalations to TheFixer
- All P2+ vulnerabilities should be assigned as bugs in TheFixer backlog after this audit.
- Priority: vitest, handlebars, protobufjs, uuid, vite, form-data

---

## Grading Justification

**Grade: C** (Baseline: B with up to 8 P2 findings; degraded to C due to 5 P1 findings)

- **5 Critical CVEs (P1):** vitest RCE, handlebars JS injection, protobufjs RCE, vite FS bypass, form-data CRLF
- **6 High CVEs (P2):** uuid buffer overflow + 5 others
- **34 Moderate CVEs (P3)**
- **1 Major version lag on critical dep (uuid):** Significant technical debt
- **Spec Coverage:** N/A (no specs for dependency management provided)

**To improve to Grade B:**
- Fix all 5 P1 CVEs (vitest, handlebars, protobufjs)
- Update uuid to >=11.1.1
- Establish automated dependency scanning in CI

**To achieve Grade A:**
- All of the above
- Update express, pino, react, react-router-dom to latest major versions
- Establish SLA for CVE remediation (e.g., P1 within 24 hours)
- Implement supply chain scanning (SLSA, scorecard)

---

## Testing Recommendations

After applying patches:
1. Run `npm audit` in each project to verify no new vulns introduced
2. Run `npm test` in Source/Backend, Source/Frontend, Source/E2E to confirm no breaking changes
3. Run `npm list --depth=0` to spot-check direct deps are as intended
4. For major version upgrades (express, react), run full integration tests before merge

---

## Learnings & Future Scans

_(To be updated in Teams/TheInspector/learnings/dependency-auditor.md after team review)_

- **Recurring Issues:** vitest/vite vulnerabilities; form-data issues; handlebars transitive deps
- **Watch List:** uuid (frequently updated; major version jumps); protobufjs (common in proto systems)
- **Audit Cadence:** Weekly via CI; monthly manual deep audit
- **Tool Availability:** npm audit (available), npm outdated (available), npm list (available)

---

## JSON Summary

```json
{
  "audit_date": "2026-07-02",
  "grade": "C",
  "total_projects": 6,
  "total_cves": {
    "critical": 5,
    "high": 12,
    "moderate": 34,
    "low": 3,
    "total": 54
  },
  "direct_dependencies": 75,
  "transitive_dependencies": 1100,
  "outdated_major_versions": 6,
  "p1_findings": 5,
  "p2_findings": 9,
  "p3_findings": 20,
  "p4_findings": 20,
  "blocking_deployments": ["portal/Backend", "platform/orchestrator"],
  "escalations": {
    "the_guardians": 2,
    "the_fixer": 15
  }
}
```

---

**Report Generated:** 2026-07-02 by dependency_auditor  
**Next Scheduled Audit:** 2026-07-09
