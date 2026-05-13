# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Findings Summary (2026-05-13)

### Critical Issues Discovered
1. **handlebars@4.7.8** - Multiple JavaScript injection vulnerabilities (8 separate CVEs)
   - Affects: Source/Backend (transitive)
   - Action: Update immediately
   - Watch list: Monitor Handlebars for template processing security

2. **protobufjs@<=7.5.5** - Arbitrary code execution via code generation
   - Affects: platform/orchestrator, portal/Backend (transitive via OpenTelemetry)
   - Action: Update immediately
   - Watch list: Protobuf libraries are high-risk supply chain dependencies

### Key Observations

#### Module Risk Levels
- **Highest Risk:** portal/Backend (577 dependencies, includes OTel with protobufjs)
- **High Risk:** portal/Frontend (424 dev dependencies, test toolchain heavy)
- **Moderate Risk:** Source/Backend (411 dependencies, handlebars critical)
- **Low Risk:** Source/E2E (4 dependencies, Playwright only)

#### Dependency Tree Health
- All npm projects use npm (no yarn, pnpm, or other package managers)
- No duplicate major versions detected ✓
- No GPL/AGPL licenses detected (not fully scanned yet)
- Development dependencies outnumber production 2:1 across modules

#### Recurring Patterns
1. **Vite ecosystem vulnerabilities**
   - esbuild CORS bypass (dev-time only, low production risk)
   - vite path traversal (dev-time information disclosure)
   - vitest/vite-node transitive vulnerabilities
   - Recommendation: Vite major version upgrades bundled with esbuild fixes

2. **OpenTelemetry supply chain risk**
   - Multiple modules depend on OpenTelemetry (@opentelemetry/auto-instrumentations-node, sdk-node, exporter)
   - Carries transitive dependency on protobufjs (critical)
   - Recommendation: Monitor OTel release cycles closely; evaluate if metrics collection is worth the risk

3. **Express outdated across infrastructure & app**
   - All Express deployments (Source/Backend, orchestrator, portal/Backend) on 4.18.x or 4.21.x
   - Express 5.x available with breaking changes
   - Recommendation: Stagger Express major version upgrades; test breaking changes in isolated feature branch

#### Tools & Commands Verified
- `npm audit --json` ✓ (all projects)
- `npm outdated --json` ✓ (extracts wanted/latest versions)
- `npm ls --prod` ✗ (fails if dependencies not installed; fallback to lock file parsing)
- `npm license-checker` ✗ (not installed; recommend installing)

### Remediation Priority Matrix

| Package | Severity | Effort | Priority |
|---------|----------|--------|----------|
| handlebars | CRITICAL | 5 min | 1 (Phase 1) |
| protobufjs | CRITICAL | 15 min | 1 (Phase 1) |
| @opentelemetry/auto-instrumentations-node | HIGH | 10 min | 2 (Phase 2) |
| @opentelemetry/sdk-node | HIGH | 10 min | 2 (Phase 2) |
| path-to-regexp | HIGH | 5 min | 2 (Phase 2) |
| picomatch | HIGH | 5 min | 2 (Phase 2) |
| vite/esbuild/postcss | MODERATE | 20 min | 3 (Phase 3) |
| Express 5.x migration | MODERATE | 4-8 hours | 4 (Next quarter) |
| React 19.x migration | MODERATE | 8-12 hours | 4 (Next quarter) |

### License Compliance Status
- Not yet scanned (requires `npm license-checker` installation)
- No GPL/AGPL flags expected (typical for proprietary dev platform)
- Action: Schedule license audit after CVE fixes

### Supply Chain Risk Assessment

**Red Flags:**
- protobufjs is transitive (via OpenTelemetry) in production code (portal/Backend)
- Orchestrator uses dockerode (not scanned in this audit) which may have additional dependencies
- 1,831 total dependencies across 6 modules is a large attack surface

**Green Flags:**
- No single-maintainer packages detected yet
- No recently-transferred package ownership detected
- No packages with <100 weekly downloads detected in direct dependencies
- No post-install scripts in package.json files

### Learnings for Future Audits
1. **Dependency Installation:** Ensure `npm ci` runs before auditing to avoid "UNMET DEPENDENCY" errors
2. **License Scanning:** Install `npm license-checker` globally before running full audits
3. **Cross-Module Coordination:** When same package (e.g., handlebars, vite) appears in multiple modules, plan coordinated updates
4. **Breaking Changes:** Track Express, React, and other major-version upgrades in a separate breaking-changes log
5. **Monitoring:** Set up automated CVE scanning (e.g., Dependabot, Snyk) for continuous monitoring between audits

### Patterns to Watch
- **Handlebars:** If work items support Handlebars templating, this is exploitable (verify with red-teamer)
- **Protobufjs:** OTel dependency chain should be kept up-to-date; consider alternative metrics libraries if risk becomes unacceptable
- **Vite:** dev-server vulnerabilities are low-risk in production but affect local development workflow; don't delay other fixes for these
