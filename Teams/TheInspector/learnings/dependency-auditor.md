# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-14

### Critical Findings (Must Fix Immediately)
1. **Handlebars.js RCE (CRITICAL)** — JavaScript injection via @partial-block tampering
   - Affects: Backend, Frontend (transitive)
   - Action: Update to latest immediately
   - Status: Documented in DEP-001, DEP-001

2. **protobufjs RCE (CRITICAL)** — Arbitrary code execution via deserialization
   - Affects: platform/orchestrator
   - Action: Update to 7.5.5+ immediately
   - Status: Documented in DEP-002

### High-Risk Dependencies to Watch
- **brace-expansion**: 4 separate DoS vulnerabilities (must stay on 1.1.17+)
- **form-data**: CRLF injection risk (must stay on 4.0.6+)
- **vite**: Path traversal in source maps (must stay current)
- **ws**: Memory disclosure (must stay on 8.20.1+)

### Deprecated Packages in Use
1. **glob** - has security vulnerabilities, should be removed/updated
2. **inflight** - memory leak, should be replaced with lru-cache
3. **superagent/supertest** - deprecated, need updates
4. **multer** - v1.x vulnerable, upgrade to 2.x in orchestrator

### Environment Observations
- **npm version:** 10.9.8 (good, recent)
- **No post-install scripts** - low supply chain risk from build scripts
- **804 total transitive dependencies** - large attack surface
  - Backend: 412 packages (largest)
  - Frontend: 231 packages
  - Orchestrator: 156 packages
  - E2E: 5 packages (minimal)

### Recommendations for Next Cycle
1. **CI/CD Integration:** Add `npm audit --audit-level=moderate` to pipeline
2. **Monthly Updates:** Establish cadence for minor/patch updates
3. **Reduce Backend Tree:** Target reduction from 412 → 300 packages
4. **License Scanning:** No GPL/AGPL found (compliant), but keep monitoring
5. **Supply Chain:** Monitor for:
   - Single-maintainer packages
   - Recently transferred ownership
   - Mass-reported CVEs affecting multiple dependencies

### Known False Positives / Non-Issues
_(None identified yet)_

### Package Update Compatibility Notes
- **express 4→5**: Breaking changes possible, needs testing
- **pino 8→10**: Major version updates, may affect logging format
- **react 18→19**: Requires code changes, plan ahead
- **vitest 2→4+**: Breaking changes, test thoroughly

### Tools & Methods
- **Audit Method:** npm audit --json
- **Lock File Analysis:** jq queries on package-lock.json
- **Direct Deps Count:** jq on package.json
- **Deprecated Detection:** jq on package-lock.json deprecation field
- **Coverage:** 4 npm projects analyzed comprehensively
