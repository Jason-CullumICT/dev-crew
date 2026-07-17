# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run 2026-07-17

### Critical Findings (Watch List)
- **handlebars**: 6+ code injection CVEs across 4.0.0–4.7.8. Used transitively in Backend. Current status: VULNERABLE
- **protobufjs**: Arbitrary code execution CVEs. Used via @grpc/grpc-js in orchestrator. Current status: CRITICAL
- **vitest**: UI server RCE in <3.2.6. Used in Frontend dev deps. Current status: VULNERABLE in dev
- **form-data**: CRLF injection via multipart encoding. Transitive in Backend & Frontend

### Ecosystem Issues
1. **npm workspace fragmentation**: 10 package.json files with no coordination. Different packages use different versions of same transitive deps (e.g., protobufjs, uuid, @opentelemetry).
   - **Action:** Migrate to npm workspaces with unified lockfile
   - **CI/CD:** Add `npm audit --workspaces` to verification gates
   
2. **Large transitive graph**: Backend has 411 transitive deps, Frontend 230. Total ~800+ unique deps.
   - **Risk:** Wide attack surface; one vulnerability affects multiple areas
   - **Action:** Rationalize dependency tree (identify unused transitive deps)

3. **Unexplained transitive deps**: Handlebars appears in Backend (server-side) via unknown chain. Likely from indirect dependency (e.g., pino → stringifier that uses handlebars?). Investigate and remove if not needed.

### Outdated Patterns
- express@4.18.2 is 4 minor versions behind (4.22.2) and 1 major behind (5.2.1)
- React/react-dom@18 available but v19 exists; frontend major migration pending
- Pino logger 2 major versions behind (8→10)
- react-router 1 major version behind (6→7)

**Decision:** Create separate `upgrade-plan.md` for staged React/routing/logging migrations (breaking changes require testing)

### Audit Tool Notes
- `npm audit --json` works in directories with node_modules
- `npm audit --workspaces` requires npm 7.24+ and workspace configuration
- No govulncheck, pip-audit, or Cargo audits needed (Go/Python/Rust not detected)
- License checker: All internal packages correctly marked UNLICENSED; no GPL/AGPL/viral licenses detected

### Supply Chain Observations
- **Post-install scripts:** Not found in core dependencies; good security practice
- **Maintainer risk:** Most CVEs affect well-maintained packages (express, @opentelemetry, vitest). No abandoned package red flags.
- **Download frequency:** All packages have high weekly download counts (>1M in most cases). Low typosquatting risk.
- **Ownership changes:** None detected in recent scans. No known ownership transfer events.

### Next Audit Action Items
1. Run: `npm audit fix` in Source/Backend, Source/Frontend, platform/orchestrator to patch low/moderate
2. Manually evaluate major version upgrades (vitest 3→4, vite 5→8, express 4→5, React 18→19)
3. Identify and remove handlebars transitive dependency if not explicitly needed
4. Create SBOM (npm sbom or syft) for compliance tracking
5. Set up automated CVE scanning in CI/CD (e.g., dependabot, snyk)

### Findings Summary
- **DEP-001 to DEP-024** documented in `/Teams/TheInspector/findings/dependency-audit-2026-07-17.md`
- **Critical escalations** to TheGuardians: handlebars RCE, protobufjs RCE, vitest UI access
- **Grade: D** (3 critical vulnerabilities, 10+ high, 20+ moderate/low)
