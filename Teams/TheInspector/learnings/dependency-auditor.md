# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-09

### Critical Vulnerabilities Found
1. **Handlebars.js** (GHSA-3mfm-83xf-c92r) — JavaScript injection via AST tampering
   - Affects: Source/Backend
   - Status: Requires update to >=4.7.9
   - Watch: Check if actually used in templates or is transitive dependency only

2. **Vitest** (GHSA-82fw-gwwq-j7x9) — Path traversal in mocker
   - Affects: Source/Frontend (direct dependency)
   - Status: Update to >=5.0.0 (semver major)
   - Impact: Test environment file leak risk

3. **Protobufjs** (GHSA-xq3m-2v4x-88gg) — Arbitrary code execution
   - Affects: platform/orchestrator
   - Status: Requires update to >=7.6.5
   - Watch: Monitor gRPC message handling

### High Severity Patterns
- **browserslist** appears in both Backend and Frontend (CVE-2025-xxx)
- **form-data** CRLF injection in multiple modules
- **@grpc/grpc-js** crashes on malformed input (DoS risk)
- **vite** path traversal in Frontend build tool

### Outdated Majors to Watch
- **React**: 18.x -> 19.x (1 major behind)
- **Express**: 4.x -> 5.x (1 major behind, backend)
- **Pino**: 8.x -> 10.x (2 majors behind, security gap)

### Supply Chain Health
- No post-install scripts detected (good)
- Large transitive trees: Backend ~411, Frontend ~230
- E2E has minimal deps (~4)
- No GPL/AGPL licenses found

### Tools Available
- `npm audit --json` — working, outputs structured report
- `npm outdated --json` — working for version checking
- No npm audit --fix (requires manual review)

### Recommendations for Next Run
1. Track fix status of critical vulns (PR links, update dates)
2. Monitor pino upgrade path (breaking changes between 8->10)
3. Test React upgrade in isolated branch before committing
4. Establish SLA for high CVE fixes (currently: within 1 sprint)
