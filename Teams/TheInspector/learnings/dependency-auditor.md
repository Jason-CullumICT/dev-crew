# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit History

### 2026-06-07: First Full Audit

**Key Findings:**
- dev-crew uses 6 npm workspaces with no Go/Python/Rust dependencies
- Total of 23 known vulnerabilities (4 critical, 4 high, 15+ moderate)
- Critical packages: handlebars (4.7.8), vitest (≤4.1.0-beta.6), protobufjs (≤7.5.7)
- No GPL/AGPL compliance issues
- No post-install scripts (secure npm profile)
- 1,807 transitive dependencies across all workspaces (high surface area)

**Watch List (Recurring CVEs):**
1. **handlebars** - Aged codebase with recurring template injection vulnerabilities (8 separate CVEs)
   - Recommendation: Consider migrating away from Handlebars to modern template engine
   - Requires security team assessment before deployment
   - All versions <4.7.9 are vulnerable

2. **vitest** - Test framework had critical vulnerability in beta versions
   - Most workspaces pinned to ≤4.1.0-beta.6
   - Upgrade to stable 4.1.0+ immediately

3. **OpenTelemetry** - Active maintenance, vulnerabilities patched regularly
   - portal/Backend: uses direct dependencies @opentelemetry/auto-instrumentations-node, @opentelemetry/sdk-node
   - Both need updates to latest

**Audit Tools Available:**
- ✓ `npm audit --json` - Full JSON output with CVE details
- ✓ `npm list --depth=0` - Direct dependency inspection
- jq for JSON parsing (installed)
- No npm-check-updates or license-checker tools available in environment

**Environment Notes:**
- Running in GitHub Actions runner with npm 10.x
- All workspaces have package-lock.json files
- No root package.json (monorepo structure without workspace root)

## Remediation Status

### Phase 1 (IMMEDIATE) - NOT STARTED
- [ ] handlebars@4.7.9+ 
- [ ] vitest@4.1.0+
- [ ] protobufjs@7.6.0+

### Phase 2 (URGENT) - NOT STARTED
- [ ] @opentelemetry/auto-instrumentations-node@0.75.0+
- [ ] @opentelemetry/sdk-node@0.217.0+
- [ ] path-to-regexp@0.1.13+
- [ ] picomatch@2.3.2+

### Maintenance Notes

**portal/Backend - Transitive Dependency Bloat:**
- 22 direct, 578 transitive = highest complexity
- Consider future audit for unused dependencies
- High supply chain risk surface

**License Compliance:**
- 13 unlicensed packages across all workspaces (mostly dev-time tools)
- No action required unless project is redistributed
- No GPL/AGPL packages = no viral license risk

## Next Audit Schedule

**Recommended:** 2026-06-14 (1 week)
- Verify Phase 1 & Phase 2 updates were applied
- Check for new vulnerabilities introduced by updates
- Validate test suites pass after updates

## Cross-Team Notes

- **TheGuardians:** Handlebars template injection risk requires security assessment
- **TheFixer:** Moderate CVEs in vite, postcss, react-router can be handled in parallel with critical fixes
