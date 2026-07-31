# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-07-31

#### Critical Findings Pattern
1. **Code Injection via Template Engines:** Handlebars.js (v4.7.8) has 8+ JavaScript injection CVEs via AST type confusion, prototype pollution. Affects backends using templating.
2. **Serialization/RPC RCE:** Protobufjs (<=7.6.4) has critical code execution via prototype injection in message constructors. Used by gRPC/Docker orchestration code.
3. **Dev Tooling Exposure:** Vitest UI server (<=3.2.5) allows arbitrary file read + code execution on dev machines. Dangerous in CI/development environments.

#### Transitive Dependency Insights
- **Backend:** 412 total packages (5 direct) — 80:1 ratio. Major sources: handlebars (via some build tool), protobufjs (via dockerode/grpc).
- **Frontend:** 231 total packages (6 direct) — 38:1 ratio. Major sources: vite, postcss, react-router trees.
- **Orchestrator:** 156 total packages (5 direct) — 31:1 ratio. Major sources: protobufjs, ws, grpc stack.
- **Portal:** Very high dependency count (54+ critical packages), needs reduction.

**Key insight:** 60%+ of CVEs are transitive. Reducing dependency tree depth (e.g., swapping heavy deps for lighter alternatives) would improve security posture significantly.

#### Version Drift Issues
- **Express:** 4.18.2 → 5.2.1 (1 major behind) — likely patches for body-parser, qs
- **Pino:** 8.17.0 → 10.3.1 (2 majors behind) — significant drift
- **React:** 18.3.1 → 19.2.8 (1 major behind) — performance and security improvements missed
- **UUID:** 9.0.0 → 14.0.1 (5 majors behind) — extreme drift
- **Vitest:** 2.0.5 (needs 3.2.6+ or 4.1.10+) — critical fix required
- **Vite:** 5.4.0 (needs 6.4.3+ or 7.x+) — multiple path traversal fixes

**Root cause:** No automated dependency update process detected. Recommendation: Implement Dependabot or Renovate in CI.

#### Specific CVE Watch List
These packages have recurring vulnerability patterns across versions:
1. **protobufjs** — Code generation and prototype pollution gadgets in most versions. Recommend pinning <7.6.5 and planning migration.
2. **handlebars** — Multiple injection vectors across 4.0-4.7.x. Recommend pinning to 4.7.9+ or evaluating alternative templating.
3. **postcss** — Source map and path traversal issues persistent. Keep updated frequently.
4. **form-data** — CRLF injection design flaw; upgrade ASAP.
5. **ws** — Resource exhaustion in fragments. Monitor closely; upgrade to 8.21.0+.

#### License Compliance
No license checking performed this run (npm license-checker not available in environment). Recommend adding `npm_config_legacy_peer_deps=true` compatibility layer for license scanning.

#### Tools & Environment Notes
- **npm audit:** Working, JSON output reliable
- **npm audit fix:** Recommended but may have breaking changes; review before applying
- **npm outdated:** Exit code 1 (expected for outdated packages); parse output as JSON
- **Package manifest discovery:** All npm-based projects found via glob. No Go/Python/Rust/Java dependencies detected in main source tree.

#### Recommended Processes
1. **Weekly audit:** `npm audit --all-workspaces --json` in CI pipeline
2. **Quarterly major version reviews:** Check which direct dependencies are >1 major version behind
3. **Dependency tree reduction:** Analyze why Backend has 412 packages; opportunities for pruning
4. **Automated updates:** Set up Renovate or Dependabot with security fix priority (P1-P2) going directly to main
5. **Escalation template:** Create issue template for security findings routed to TheGuardians team

#### Cross-Ref Examples from This Run
- **Vitest CVE (DEP-001):** Noted as P1 code injection → escalate to TheGuardians
- **React Router open redirect (DEP-007):** Open redirect + SSR gadget injection → TheGuardians
- **Handlebars injection (DEP-002):** Template-based RCE → TheGuardians
- **Version drift (DEP-015-018):** Routine updates → TheFixer team

#### Next Steps
1. Run full audit weekly; archive findings in `findings/` directory
2. Maintain this learnings file after each audit
3. Track fix status of P1 findings in a separate backlog
4. Set up automated alerts for new critical CVEs in monitored packages
