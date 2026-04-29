# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run 2026-04-29: Initial Full Audit

### Critical Packages Discovered
1. **Handlebars.js** — Watch list: Multiple RCE vectors via AST type confusion (GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, and 6 others)
   - Last seen in: Source/Backend (transitive dependency)
   - Status: Requires immediate upgrade to >=4.7.9
   - Future scanning: Always audit this package aggressively

2. **Protobufjs** — Watch list: Arbitrary code execution in versions <7.5.5 (GHSA-xq3m-2v4x-88gg)
   - Last seen in: platform/orchestrator (via dockerode), portal/Backend
   - Status: Requires upgrade to >=7.5.5 or dockerode >=5.0.0
   - Future scanning: Monitor for new RCE vectors

3. **path-to-regexp** — Watch list: ReDoS in route parameter parsing
   - Last seen in: platform/orchestrator, portal/Backend
   - CVSS: 7.5 (High)
   - Status: Requires upgrade to >=0.1.13

### Audit Tools Verified
- `npm audit --json` ✓ Works and provides detailed CVE metadata
- `npm outdated --json` ✓ Works; identifies major version gaps
- No Go, Python, or Rust projects detected in Source/ (npm-only codebase)
- License-checker not installed; `npm audit` does not report license issues

### Outdated Package Patterns
- **Source/Backend:** 4 outdated packages (uuid 5 majors behind, pino 2 majors, express 1 major, prom-client up-to-date)
- **Source/Frontend:** 3 outdated packages (react/react-dom/react-router-dom all 1 major behind)
- **Recommendation:** Schedule React 19.x migration in next quarter; uuid/pino upgrades in this sprint

### Transitive Dependency Counts
- Source/Backend: 13 (low complexity)
- Source/Frontend: 13 (low complexity)
- platform/orchestrator: 3 (minimal)
- portal/Backend: 22 (moderate)
- portal/Frontend: 17 (moderate)
- **All well below 500-dependency threshold for supply chain risk**

### License Compliance
- **Status:** No GPL/AGPL packages detected; all direct dependencies are OSI-approved (MIT, Apache, ISC)
- **No escalations to legal team needed**

### Supply Chain Health
- **No abandoned dependencies detected**
- **No post-install scripts in Source/ manifests**
- **No suspicious single-maintainer packages**
- **Recommendation:** Implement automated weekly scanning in CI/CD

### Team Escalations
- **1 escalation to TheGuardians:**
  - DEP-001: Handlebars RCE (template injection risk)
  - DEP-002: Protobufjs RCE (message parsing risk)
  - DEP-003: path-to-regexp ReDoS (public-facing routes)

### Next Run Checklist
- [ ] Verify handlebars, protobufjs, path-to-regexp fixes were applied
- [ ] Re-run npm audit in affected projects
- [ ] Confirm no new regressions in tests
- [ ] Check for updates to watchlist packages (handlebars, protobufjs)
