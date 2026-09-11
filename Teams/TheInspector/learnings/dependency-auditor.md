# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-11

### Critical Vulnerabilities Identified (Watch List)

1. **handlebars** - CRITICAL (CVSS 9.8)
   - Issue: JavaScript Injection via AST Type Confusion (GHSA-2w6w-674q-4c4q)
   - Affected: Source/Backend
   - Status: Requires immediate patching to 4.8.1+
   - Note: Multiple injection vectors (decorators, partials, CLI precompilation)

2. **vitest** - CRITICAL (CVSS 9.8)
   - Issue: Arbitrary file read/execution via UI server (GHSA-5xrq-8626-4rwp)
   - Affected: Source/Frontend
   - Status: Requires major version bump to 5.0.0+
   - Note: Also affects @vitest/mocker (path traversal GHSA-82fw-gwwq-j7x9)
   - Risk: Test infrastructure must be validated after upgrade

### High-Severity Recurring Patterns

- **Denial of Service vulnerabilities** in core npm ecosystem:
  - brace-expansion: Multiple DoS vectors (memory exhaustion, exponential expansion)
  - browserslist: Unbounded memory growth + prototype pollution
  - nanoid: Infinite loops + integer overflow
  
- **Transitive dependency risk**: Both Backend and Frontend share vulnerable libs
  - brace-expansion appears in both projects indirectly
  - browserslist appears in both projects (dev-only)
  - Suggests tight coupling to Vite/PostCSS/Babel ecosystem

### Project Vulnerability Profile

| Project | Status | Key Risks |
|---------|--------|-----------|
| Source/Backend | P1 | handlebars (RCE), brace-expansion (DoS), browserslist (DoS) |
| Source/Frontend | P1 | vitest (arbitrary file read), nanoid (infinite loop), form-data (CRLF injection) |
| Source/E2E | ✅ CLEAN | 0 vulnerabilities |
| platform/orchestrator | P1 | handlebars (RCE), browserslist (DoS), brace-expansion (DoS) |

### Tools & Environment Notes

- **npm audit** available and functional - use `npm audit --json` for JSON parsing
- **npm outdated** works - 25 total outdated packages across main projects
  - Highest concentration: portal/Backend (11 packages >1 major version behind)
  - Recommendation: Focus Source/ projects first (critical path), backlog portal/ projects

- **License-checker not pre-installed** - but manual inspection of package.json files shows:
  - All direct dependencies use permissive licenses (MIT, Apache-2.0, ISC, BSD)
  - No GPL/AGPL found (would be P2 violation)
  - No UNLICENSED packages

### Supply Chain Risk Assessment

1. **Transitive Dependency Risk - MEDIUM**
   - ~65 direct+transitive dependencies across main projects
   - Shared vulnerable libraries indicate ecosystem-wide risk
   - Recommendation: Monitor npm ecosystem trends, add `npm audit` to CI/CD

2. **Abandoned Dependencies - NONE DETECTED**
   - All vulnerable packages actively maintained with security patches
   - Fix releases available for all P1 & P2 vulnerabilities
   - No "unmaintained" or "deprecated" flags in npm registry

3. **Dev-Time Security Exposure - HIGH**
   - vitest UI server listening during dev/test exposes arbitrary file read
   - esbuild dev server bypass affects dev workflow
   - Recommendation: Disable UI server in CI/CD, run UI tests locally only

### Remediation Coordination

**For TheGuardians (Security Team):**
- handlebars (RCE) + vitest (arbitrary file read) require escalation
- Both are in execution context during build/test phases
- Recommend coordinating with TheFixer for priority patching

**For TheFixer (QA/Maintenance):**
- vitest@5.0.0 major version bump requires full test suite validation
- Recommend running all tests after upgrade, check for API breakage
- Other P2 vulnerabilities can be batched in next maintenance sprint

### Historical Notes

- **First audit run** - baseline established at 2026-09-11
- **Recommended follow-up**: Weekly `npm audit` runs via CI/CD to catch new CVEs early
- **Suggested automation**: Add `npm audit --audit-level=high` gate to pre-commit hooks

## Learnings

1. **npm ecosystem health matters** - shared build tool dependencies (Vite, PostCSS, Babel, esbuild) carry cascading vulnerability risk; prioritize updating these
2. **Dev-time == production risk** - vitest/esbuild vulnerabilities in dev can leak into CI/CD and production builds
3. **Major version bumps require testing** - vitest@5.0.0 upgrade needs full validation before committing
4. **License audit is manual** - npm license-checker not installed; recommend adding to setup for future audits
