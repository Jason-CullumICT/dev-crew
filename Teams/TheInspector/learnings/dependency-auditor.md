# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-31

### Critical Findings Requiring Immediate Action
1. **Handlebars@4.7.8** — Multiple JavaScript injection/RCE CVEs (CVSS 9.8)
   - Used transitively; verify whether backend actually uses handlebars templates
   - If no usage, consider removing dependency
2. **Vitest@3.2.5** — Arbitrary file read/execution via UI server (CVSS 9.8)
   - Dev-only dependency but running on shared network = production risk
   - Disable `--ui` in CI environments; restrict to localhost in development
3. **Protobufjs@7.6.4** — Arbitrary code execution from malformed protobuf (CVSS 9.8)
   - Orchestrator infrastructure dependency; affects all agent teams
   - Highest priority for update in platform/ directory

### Watch List for Recurring CVEs
- **form-data**: CRLF injection patterns reoccur in each version
- **js-yaml**: Quadratic complexity DoS vulnerabilities are recurring pattern
- **protobufjs**: Multiple code execution vectors; monitor closely for future releases
- **react-router**: Open redirect bugs in path handling; update frequently

### License Compliance Decisions
- ✅ All direct dependencies use permissive licenses (MIT, Apache 2.0, ISC, BSD)
- No GPL/AGPL restrictions detected
- No licensing blockers identified

### Environment Notes
- Project uses npm exclusively (no Go, Python, or Rust dependencies detected)
- 4 npm projects: Backend (102 direct), Frontend (9 direct), E2E (4 direct), Orchestrator (153 direct)
- Frontend has highest transitive count (230 deps) due to vitest/vite ecosystem

### Supply Chain Risk Observations
- **Orchestrator (155 deps)**: All production dependencies; zero dev dependencies = tight ecosystem
  - **Risk**: Any compromise affects all agent teams immediately
  - **Mitigation**: Prioritize orchestrator updates; consider vendoring or lock-step versioning
- **Frontend (230 deps)**: High dev dependency burden from testing infrastructure
  - **Risk**: Vitest/Vite ecosystem has multiple concurrent vulnerabilities
  - **Mitigation**: Upgrade vite→8.x+ (major version bump) as soon as tested
- **Backend (411 deps)**: Largest graph but mostly dev/type dependencies
  - **Risk**: Jest, ts-jest, @types/* create large attack surface
  - **Mitigation**: Acceptable for development; production footprint is small

### Tools & Commands Available
- `npm audit --json` — Full CVE report per package.json
- `npm outdated --json` — Major version gaps
- `license-checker` — Not installed in environment
- No Go/Python/Rust audit tools detected

### Recommendations for Next Run
1. Set up Dependabot or Renovate for continuous dependency monitoring
2. Create release gate: `npm audit` must pass with 0 vulnerabilities before production deployments
3. Establish update cadence: Critical → same day, High → 1 week, Moderate → 1 month
4. Document handlebars, protobufjs, and vitest as "high-risk" dependencies requiring extra scrutiny
5. Consider pinning major versions in package.json (e.g., `"^4.7.9"` instead of `^4.7.0`)

## Learnings

_(See Audit Run: 2026-08-31 above)_
