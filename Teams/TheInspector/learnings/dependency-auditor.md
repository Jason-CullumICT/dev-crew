# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run 2026-08-30

### Critical Findings (Do Not Ignore)
1. **handlebars@4.0.0-4.7.8** (Backend) — Multiple JavaScript injection vulns (CVSS 9.8) — RCE via AST type confusion
2. **protobufjs@<=7.6.4** (Orchestrator, portal/Backend) — Arbitrary code execution (CVSS 9.8)
3. **vitest@<3.2.6** (Frontend, portal/Frontend) — Arbitrary file read/execute via UI server (CVSS 9.8) — NO AUTH REQUIRED
4. **@opentelemetry/auto-instrumentations-node** (portal/Backend) — Supply chain bomb: pulls 40+ instrumentation packages with cascading vulns

### Watch List (Recurring Issues)
- **express@4.18.2** — Upstream DoS vulns via `qs` dependency (need to update express → qs upstream fix)
- **uuid@9.0.0** — Missing buffer bounds checks in v3/v5/v6 (CVSS 7.5)
- **brace-expansion** — DoS via exponential expansion (3 separate CVEs)
- **postcss** — Persistent file read via sourceMappingURL (4 separate CVEs)
- **vite/vitest** — Path traversal and fs.deny bypass issues (multiple versions)

### License Audit Status
✅ **PASS:** No GPL/AGPL in direct dependencies
⚠️ **WARNING:** Portal/Backend pulls 40+ OpenTelemetry packages (auto-instrumentation) — license compliance unclear

### Audit Tools Available
- `npm audit --json` — Full NPM vulnerability audit (all workspaces tested)
- `npm outdated --json` — Outdated package detection
- Manual lock file analysis for transitive deps
- No Go/Python/Rust projects in this codebase (npm only)

### Prior Findings Status
- **First audit:** All 4 P1 critical vulns still present (NOT FIXED)
- **Critical blockers:** Must fix before production deployment
- **Pattern:** Outdated dependencies (especially Express, uuid, vitest) have known CVEs with published patches

### Remediation Notes
- vitest UI server RCE is a **development environment compromise** (not runtime prod issue, but serious in CI)
- protobufjs cascades through @grpc/grpc-js → @opentelemetry/auto-instrumentations-node chain
- handlebars appears unused in Source/Backend (verify & remove if unnecessary)

### Escalations Made
- [ESCALATE → TheGuardians] — All 4 P1 findings + 21 High findings for exploitability assessment
- [CROSS-REF: performance-profiler] — brace-expansion, js-yaml, nanoid, picomatch (DoS/ReDoS/infinite loop)

### Next Audit Cycle
- Run 30 days from 2026-08-30 (scheduled: 2026-09-30)
- Focus on: Major version upgrades (React 18→19, Express 4→5, vitest 2→4)
- Monitor: @opentelemetry/auto-instrumentations-node version constraints
- Track: Handlebars removal status, uuid upgrade progress
