# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run: 2026-08-16

### Critical Vulnerabilities Found
1. **vitest@<3.2.6**: Arbitrary file read/execute when UI server running (CVSS 9.8) — affects Source/Frontend, portal/Frontend
2. **protobufjs@<=7.6.4**: Code execution via .proto deserialization (CVSS 8.9) — affects platform/orchestrator
3. **handlebars@4.0.0-4.7.8**: JavaScript injection in CLI (CVSS 8.2) — affects Source/Backend
4. **@opentelemetry/auto-instrumentations-node@<=0.76.0**: Prometheus exporter crash (CVSS 7.5) — affects portal/Backend

### Key Patterns Observed
- **Frontend projects** (Source/Frontend, portal/Frontend) have identical critical vitest CVE — coupled build tool risks
- **OpenTelemetry ecosystem**: 0.x versions used; likely needs coordinated major upgrade to 1.x
- **Express dependency chain**: uuid, qs, body-parser vulnerabilities cascade through all Express-based services
- **DevOps infrastructure**: orchestrator and portal/Backend have higher P1/P2 density than product code
- **E2E suite isolation**: Source/E2E has zero vulnerabilities (excellent model)

### Audit Tools Available
- ✅ npm audit --json (all projects)
- ✅ npm outdated --json (Source/Backend, Source/Frontend functional)
- ⚠️ npm license-checker (not fully run; requires local npm install)
- ⚠️ govulncheck, pip-audit (Go/Python not detected in this project)

### Recommended License Compliance Check
Run in each project: `npx license-checker --json > licenses.json`

### Dependency Tree Observations
- Total projects: 6
- Total transitive deps: 1,378 (high attack surface)
- Largest individual: portal/Frontend (424 deps) — vitest/vite ecosystem heavy
- Cleanest: Source/E2E (4 deps, 0 CVEs)

### Fix Priority (Next Runs)
**IMMEDIATE (Blocking):**
- protobufjs in orchestrator (code execution risk)
- vitest in frontend projects (file access risk if UI exposed)
- OpenTelemetry in portal/Backend (monitoring DoS)

**HIGH (This week):**
- @grpc/grpc-js, form-data, nanoid, brace-expansion, ws, react-router-dom

**MODERATE (Next week):**
- uuid, express, react, vite major versions

### Post-Fix Verification
All fixes should:
1. Run `npm audit` to confirm 0 CVEs
2. Run `npm test --workspaces --if-present` to verify no regressions
3. Manual test of critical paths before deploy

### License Decision Log
_(none needed yet — no GPL/AGPL packages flagged)_

### Findings Status Tracking
- DEP-001 through DEP-038: See /findings/dependency-audit-2026-08-16.md for full details
- 4 CRITICAL findings escalated to TheGuardians
- 8 HIGH findings require immediate updates
