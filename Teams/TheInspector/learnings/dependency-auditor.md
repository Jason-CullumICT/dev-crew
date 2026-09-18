# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Baseline: 2026-09-18

**Key Finding:** 53 total CVEs across 11 npm workspaces. 4 critical (P1), 24 high (P2).

### Critical Packages (Watch List)

These packages have recurring or severe vulnerabilities:

1. **handlebars** (current: 4.0.0-4.7.8)
   - Multiple injection vectors (AST type confusion, prototype pollution, XSS)
   - Fix: Upgrade to >= 4.7.9
   - Severity: CRITICAL (9.8 CVSS)
   - Appears in: Source/Backend (transitive)

2. **vitest** (current: 1.2.2 - 2.0.5)
   - UI server allows arbitrary file read/execution
   - Affects both testing and development
   - Fix: Upgrade to >= 5.0.1 (major bump required)
   - Severity: CRITICAL (9.8 CVSS)
   - Appears in: Source/Frontend (direct), portal/Backend (direct)
   - **IMMEDIATE RISK:** If UI server is exposed on network

3. **protobufjs** (current: <= 7.6.4)
   - Arbitrary code execution via deserialization
   - Multiple secondary DoS vectors
   - Fix: Upgrade to >= 7.5.5+
   - Severity: CRITICAL (9.8 CVSS)
   - Appears in: platform/orchestrator, portal/Backend (transitive via @grpc/grpc-js)

### High-Risk Transitive Dependencies

These are indirectly included and cause issues:

- **brace-expansion** — DoS via exponential expansion (fix: >= 1.1.18)
- **browserslist** — Unbounded memory growth + prototype pollution (fix: >= 4.28.7)
- **form-data** — CRLF header injection (fix: >= 4.0.6)
- **js-yaml** — Quadratic CPU consumption DoS (fix: >= 3.15.2)
- **postcss** — Arbitrary file read via sourceMappingURL (fix: >= 8.5.23)
- **ws** — Memory exhaustion from tiny frames (fix: >= 8.21.0)

### Workspace Risk Levels

| Workspace | Risk | Issue |
|-----------|------|-------|
| Source/E2E | ✅ CLEAR | No vulnerabilities |
| Source/Backend | 🔴 P1 | handlebars transitive; multiple P2s |
| Source/Frontend | 🔴 P1 | vitest direct (critical); vite direct (high) |
| platform/orchestrator | 🔴 P1 | protobufjs transitive (critical) |
| portal/Backend | 🔴 WORST | 54 CVEs (2 critical, 10 high, 41 moderate) |
| portal/Frontend | 🔴 P1 | vitest direct; 7 high vulnerabilities |

### Supply Chain Risk Observations

1. **portal/Backend has 500+ transitive dependencies** — exceptionally high risk surface
   - Recommendation: Evaluate if all transitive deps are necessary
   - Consider dependency tree-shaking or lighter alternatives
   
2. **Shared transitive deps across workspaces:**
   - handlebars, postcss, browserslist appear in multiple projects
   - Fix applied to one workspace helps others (but ensure consistency)

3. **No npm audit in CI detected:**
   - Recommend adding `npm audit --audit-level=moderate` to pre-commit hooks
   - Fail build on P1/P2 discoveries

4. **Major version gaps:**
   - vitest: 5 major versions behind in some workspaces
   - vite: 3 major versions behind
   - Both have CVEs, not optional upgrades

### Audit Tools & Environment Notes

- **npm audit --json** is available and reliable
- **npm outdated --json** shows version gaps clearly
- **npm ls --depth=N** effective for transitive analysis
- **license-checker not available** in this environment — recommend CI integration
- **No Go/Python/Rust/Java detected** — npm-only project

### License Compliance Decisions

- All scanned direct dependencies use standard OSS licenses
- No GPL/AGPL viral licenses detected in direct deps (transitive unclear)
- Recommendation: Integrate `npx license-checker` into CI for automated compliance

### Recommendations for Next Audit

1. **Before audit:** Confirm `npm ci` has been run in all workspaces (for lock file integrity)
2. **During audit:** Check for new advisories not in npm advisory database (check GitHub security)
3. **Post-audit:** Verify that P1 fixes are actually applied (don't trust package.json version ranges)
4. **Establish SLAs:**
   - P1 critical: Fix within 24 hours
   - P2 high: Fix within 1 sprint (14 days)
   - P3 medium: Fix in next sprint or quarterly
   - P4 low: Fix in maintenance window

### Learnings from This Run

- ✅ Can audit multiple workspaces efficiently with parallel npm audit calls
- ✅ JSON output from npm audit is reliable and queryable
- ✅ Transitive dependency chains often hide critical vulns
- ⚠️ Need to check actual installed vs. declared versions (lock file matters)
- ⚠️ Test environment (vitest UI) can be as risky as production code
- ✅ Escalation to TheGuardians appropriate for injection/RCE vulns

## Prior Audits

_(Will add historical baseline comparisons after second run)_
