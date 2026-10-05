# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### First Audit Run (2026-10-05)

**Critical Findings:**
- **protobufjs (CRITICAL):** Arbitrary code execution in @grpc/grpc-js transitive chain. Affects orchestrator build pipeline — requires immediate fix.
- **Jest ecosystem (HIGH):** Jest 29.x has 10+ high-severity transitive CVEs. Upgrade to v30.5.2+ for all projects.
- **Browserslist (HIGH):** Memory leak DoS in frontend build chain. Impacts CI/CD reliability.

**Patterns Identified:**
1. **Transitive dependencies dominate vulnerability count** — 38 CVEs found, but only 3 directly specified; rest transitive
2. **Build tool chain risk** — Frontend with 230+ transitive deps has high supply-chain surface; backend 130+; orchestrator 155+
3. **No root monorepo structure** — Each package.json managed separately; audit required for 7 separate manifests
4. **Major version gaps** — React (18→19), Pino (8→10), React Router (6→7) all outdated; library patches missed

**Audit Tools Available:**
- `npm audit --json` — Works across all 7 projects
- `npm outdated --json` — Shows major version gaps
- `npm ls` — Shows dependency tree (unmet deps in some projects)

**Watch List for Future Audits:**
- protobufjs — recurring critical CVEs; evaluate gRPC necessity
- jest — transitive ecosystem volatility; keep locked to latest stable
- browserslist — memory leak vulnerability; monitor upstream
- uuid — buffer check CVE; widespread transitive dependency
- @remix-run/router — open redirect in react-router-dom; keep current

**License Compliance:**
- No GPL/AGPL packages detected
- All primary dependencies MIT or Apache 2.0
- No unlicensed packages found

**Recommendation for Next Run:**
- Focus P1 items (orchestrator) first; re-audit after fixes
- Consider adding `npm audit --production` to CI/CD gate
- Establish max-transitive-depth policy (e.g., warn >200 transitive deps)
