# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-10

### Critical Findings Summary
- **Total CVEs Found:** 47 across 6 npm projects
- **Critical (P1):** 3 (vitest UI RCE, protobufjs RCE, @grpc/grpc-js DoS)
- **High (P2):** 11
- **Moderate (P3):** 20
- **Low (P4):** 13
- **Overall Grade:** C (3 P1s exceeds threshold of 2; fix Phase 1 CVEs to upgrade to B)

### Highest Risk Packages (Watch List)
1. **protobufjs** — 8+ CVEs (RCE + 7 DoS/encoding issues); platform/orchestrator only; must upgrade 7.x → 8.x
2. **vitest** — RCE in UI server (< 3.2.6); dev-time risk but critical; Frontend uses 3.2.5
3. **@grpc/grpc-js** — DoS crashes (1.14.0-1.14.3); platform/orchestrator; must upgrade to 1.14.4+
4. **vite** — Path traversal + fs.deny bypass (≤ 6.4.2); Frontend uses 6.4.1; must upgrade to 8.2.1+ (breaking)
5. **brace-expansion** — 4 DoS CVEs in <1.1.18; build-time risk; update transitively

### Projects Scanned
- **Source/Backend:** 411 transitive (102 prod, 310 dev); 1 critical, 3 high
- **Source/Frontend:** ~230 transitive; 1 critical, 5 high
- **Source/E2E:** 4 transitive; clean ✅
- **platform/orchestrator:** 155 transitive (all prod); 1 critical, 2 high — **highest risk**
- **portal/Frontend:** Similar to Source/Frontend
- **portal/Backend:** Similar to platform/orchestrator
- **abac-demo & others:** Not core source; skip in future runs unless specifically requested

### Update Strategy Recommended
1. **Phase 1 (Critical):** Fix all P1 & P2 CVEs in parallel; test in isolation first
   - protobufjs 7.x → 8.x (breaking; test orchestrator thoroughly)
   - vitest 3.x → 4.x (breaking; may affect test setup)
   - vite 6.x → 8.x (breaking; may affect dev server config)
   - uuid 9.x → 14.x (semver-major; safe update for runtime)
2. **Phase 2 (Major versions):** express 4→5, pino 8→10, react 18→19, react-router 6→7
3. **Test gate:** Run full suite after each phase; 0 new failures allowed

### Tool Availability
- `npm audit --json` ✅ Native (npm 7+)
- `npm outdated --json` ✅ Native
- `license-checker` ⏳ Not installed; can install if needed for CI
- **Recommendation:** Add `npm audit --json` to CI pipeline; parse against severity thresholds

### License Compliance
- ✅ No GPL/AGPL found
- ✅ All direct dependencies use permissive licenses (MIT, Apache-2.0, ISC, BSD)
- **Decision:** Safe for commercial use; no legal review needed at this time

### Technical Debt
- **Supply-chain concentration:** platform/orchestrator has 153 prod dependencies; protobufjs/gRPC stack is fragile
- **Dev vs. Prod split:** Source/Backend has 310 dev deps vs 102 prod; acceptable for a TypeScript/Jest stack
- **Vite/Vitest pinning:** Frontend has dev-server security holes; moving from dev → prod needs careful testing

### Prior Findings & Resolution
_(First run; none yet)_

### Notes for Next Audit
1. Check if Phase 1 CVEs are fixed; report resolution status
2. Verify protobufjs major version strategy (7.x EOL?)
3. Monitor brace-expansion; it has recurring DoS issues
4. Consider migrating js-yaml for performance if YAML parsing is in critical path
5. Coordinate Phase 2 upgrades across Source/ and platform/ teams
