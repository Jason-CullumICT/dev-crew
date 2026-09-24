# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings from 2026-09-24 Audit

### Critical Vulnerabilities Found (Watch List)

1. **protobufjs** - Multiple RCE vectors (GHSA-xq3m-2v4x-88gg, GHSA-75px-5xx7-5xc7, GHSA-685m-2w69-288q, GHSA-jvwf-75h9-cwgg)
   - Severity: CRITICAL (9.8 CVSS)
   - Status: Needs immediate update to >=7.5.5
   - Affects: platform/orchestrator, portal/Backend
   - Root cause: AST type confusion, prototype pollution
   - Note: 8 total CVEs in this package — consider alternative if not essential

2. **handlebars** - JavaScript Injection via AST confusion (GHSA-2w6w-674q-4c4q + 6 others)
   - Severity: CRITICAL (9.8 CVSS)
   - Status: Needs immediate update to >=4.7.9
   - Affects: Source/Backend, Source/Frontend (transitive via build tools)
   - Root cause: Template parsing vulnerability
   - Note: 8 total CVEs — heavy reliance in build toolchain

3. **vitest** - Test framework critical vulnerability (source 1139528)
   - Severity: CRITICAL
   - Status: Update to latest patch
   - Affects: portal/Backend, portal/Frontend, Source/Frontend (dev deps)
   - Note: May impact test integrity; requires investigation into exact nature

### High Severity DoS Patterns

- **brace-expansion**: 4 CVEs (all DoS via exponential expansion, unbounded arrays)
- **js-yaml**: 4 CVEs (quadratic CPU on merge keys, unbounded recursion)
- **qs**: 3 CVEs (array-limit bypass, attacker-controlled isBuffer)
- **browserslist**: 2 CVEs (unbounded memory, prototype write)
- **form-data**: CRLF injection (CWE-93)

### Supply Chain Red Flags

- **portal/Backend** has 577 transitive dependencies (69% indirect)
  - This is the highest-risk workspace
  - 54 total vulnerabilities (2 critical, 10 high, 41 moderate)
  - Recommendation: Minimize dependencies, review @opentelemetry/* necessity

### Outdated Packages

Portal/Backend has significant version gaps:
- @opentelemetry/auto-instrumentations-node: 0.40.3 → 0.80.0 (100+ versions behind)
- @opentelemetry/sdk-node: 0.47.0 → 0.222.0 (175+ versions behind)
- @opentelemetry/exporter-trace-otlp-http: 0.47.0 → 0.222.0 (175+ versions behind)

These suggest long-stale dependencies. Recommend comprehensive review of this package.

### License Status

✓ PASS - No GPL/AGPL viral licenses detected
- All major packages use MIT, Apache 2.0, or BSD
- No UNLICENSED packages in direct dependencies

### Audit Tools Available

- `npm audit --json` works on all workspaces
- `npm outdated --json` for version checking
- Versions detected in lock files automatically
- No Go modules, Python, or Rust dependencies in main codebase

### Remediation Notes

**Done (by dependent team):**
- [ ] Update protobufjs to >=7.5.5 (blocks platform/orchestrator, portal/Backend)
- [ ] Update handlebars to >=4.7.9 (transitive via build tools)
- [ ] Update vitest to latest (dev deps across 3 workspaces)
- [ ] Review @opentelemetry/* necessity in portal/Backend

**Recommended for CI/CD:**
- Add npm audit gate to CI pipeline (fail on critical/high)
- Set up Dependabot or Renovate for auto-updates
- Quarterly dependency audits minimum

### Cross-Team Escalations

To TheGuardians (security team):
1. Verify protobufjs is not handling untrusted input in production
2. Verify handlebars is not rendering user-controlled templates
3. Investigate vitest vulnerability impact on test integrity
4. Review js-yaml DoS risk if config parsing untrusted sources
