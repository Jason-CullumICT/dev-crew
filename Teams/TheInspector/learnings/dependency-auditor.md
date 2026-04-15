# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-04-15

### Critical Findings
- **Handlebars 4.7.8 (CRITICAL):** Multiple RCE vectors via JavaScript injection. Found in Backend transitive deps. Update to 4.7.9+ immediately.
- **path-to-regexp ReDoS:** Affects portal/Backend and platform/orchestrator. Update required.
- **picomatch ReDoS:** Affects portal/Frontend via multiple transitive chains (anymatch, micromatch, readdirp).

### Watch List (Recurring Issues)
1. **Vite/Vitest build chain:** Moderate vulnerabilities in path traversal and dev server CSRF. Monitor for updates (currently awaiting 8.x+ releases).
2. **Pino logger:** 2 major versions behind (8.17.0 vs 10.3.1). Backend team should plan upgrade.
3. **React ecosystem:** Frontend 1 major version behind. Monitor for deprecation warnings.
4. **OpenTelemetry mismatch:** Portal backend packages severely outdated (160+ versions gap).

### Projects at Risk
- **Backend (411 deps):** 2 CVEs including 1 critical. Requires immediate handlebars update.
- **Frontend (230 deps):** 5 moderate CVEs in build toolchain (Vite/Vitest). Low production impact, but blocks build tools.
- **portal/Backend (577 deps):** Largest dependency tree (3:1 dev:prod ratio). 5 CVEs including 2 high. High supply chain risk.
- **portal/Frontend (424 deps):** picomatch ReDoS plus Vite chain. Watch pattern handling in dev.
- **platform/orchestrator (155 deps):** Lean production build, 1 HIGH CVE in path-to-regexp.
- **Source/E2E (4 deps):** Clean, no CVEs.

### Tools Available
- **npm audit --json**: Reliable, structured output. Use for all npm projects.
- **npm outdated**: Works but shows MISSING in offline installs. Check package.json + lock files instead.
- **License checking**: npm registry JSON has license field. No GPL violations detected in first audit.
- **npm ci**: Recommended for CI/CD (lock file guaranteed).

### Recommendations for Next Audit
1. Set up Dependabot or Renovate for automated PRs on each project
2. Add `npm audit --audit-level=moderate` to CI/CD pipeline (fail on critical/high)
3. Implement dependency update schedule:
   - Immediate: Patch security issues (P1/P2)
   - Monthly: Minor/patch updates
   - Quarterly: Major version upgrades + compatibility testing
4. Monitor OpenTelemetry package alignment (currently 160+ versions gap)
5. Plan Vite 8+ and vitest 4+ migration (may require framework updates)

### License Decisions
- No GPL/AGPL found in initial audit
- All major production deps use MIT, Apache-2.0, or BSD (permissive)
- No legal review needed at this time

### Prior CVE Findings
_(first run — no prior findings yet)_

## Learnings Template

_Use this section for discoveries made during analysis that should inform future decisions:_

### Dependency Audit Rules
1. Always run `npm audit --json` to get structured data
2. Cross-reference CVE against NVD and GitHub advisories
3. Check transitive deps for hidden vulnerabilities
4. Separate "development-only" CVEs (Vite, Vitest) from production risks
5. Monitor version gaps (3+ major versions = security risk)
6. Flag duplicate packages in node_modules (npm dedupe issue)
