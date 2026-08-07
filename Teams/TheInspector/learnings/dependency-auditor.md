# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-07

### Critical Findings Summary
- **30+ CVEs** across npm workspaces
- **3 Critical (P1)**: handlebars (9.8), vitest (9.8), protobufjs (9.8)
- **9 High (P2)**: uuid, brace-expansion, form-data, react-router, postcss, vite, js-yaml, qs, body-parser
- **Grade: D** (exceeds grading thresholds: >2 P1 findings equivalent, 9+ P2 findings)

### Watch List (Recurring Issues)

| Package | Issue | Pattern | Action |
|---------|-------|---------|--------|
| **handlebars@4.7.8** | CRITICAL JavaScript injection | Transitive via babel/generator | Upgrade babel ecosystem; transpilation-only risk |
| **protobufjs@≤7.6.4** | CRITICAL code execution | Transitive via @grpc/grpc-js | Upgrade dockerode→5.0.1; core gRPC infra |
| **vitest@<3.2.6** | CRITICAL arbitrary file read | Direct dev dependency | Upgrade to ≥3.2.6; disable UI server in prod |
| **react-router@<7.18.0** | MODERATE open redirect chain | Transitive via react-router-dom | Upgrade to ≥7.18.0; affects routing security |
| **uuid@<11.1.1** | Buffer overflow in ID gen | Direct dependency Backend/Orchest | Upgrade to ≥14.0.1; impacts work item integrity |
| **vite@≤6.4.2** | Path traversal in dev server | Direct dev dependency | Upgrade to ≥8.2.1; major version bump |

### Dependency Chain Notes

**Backend → Express → qs chain:**
- express@4.18.2 → qs@6.15.1 (DoS in query parsing)
- Fix: upgrade express to 4.22.2+ (includes qs fix)

**Frontend → Vite → Esbuild → PostCSS chain:**
- vite@5.4.0 → esbuild@0.24.2 (CORS bypass)
- vite@5.4.0 → postcss@8.5.22 (source map disclosure)
- Fix: upgrade vite to ≥8.2.1 (BREAKING, major bump)

**Orchestrator → Dockerode → uuid chain:**
- dockerode@4.0.4 → uuid@<11.1.1 (buffer overflow)
- Fix: upgrade dockerode to ≥5.0.1 (includes uuid@14+)

**Backend/Frontend → Babel ecosystem:**
- @babel/core@≤7.29.0 (source map file read)
- handlebars@4.7.8 (JavaScript injection — **very hard to remove**)
- js-yaml@≤3.15.0 (quadratic DoS)
- Fix: update babel core and dependencies, JS-YAML to ≥3.15.1

### Dependency Tree Bloat

- **Backend**: 102 direct+transitive (411 with devDeps) — express adds 80+ transitive
- **Frontend**: 9 prod deps but 230 total with devDeps (vitest/vite add 100+ each)
- **Orchestrator**: 153 total (gRPC/protobufjs ecosystem adds 100+ transitive)
- **E2E**: 4 deps (cleanest workspace)

Recommendation: Consider pnpm workspaces + shared lock file to reduce duplicate transitive deps (uuid appears in 2 versions).

### Audit Tools & Commands

```bash
# Available tools in this environment:
npm audit --json          # Full CVE report per workspace
npm outdated --json       # Check version gaps
npm-check-updates -u      # Interactive major version upgrades (install separately)
license-checker --json    # License compliance (install separately)

# Audit all workspaces:
cd Source/Backend && npm audit --json
cd Source/Frontend && npm audit --json
cd Source/E2E && npm audit --json
cd platform/orchestrator && npm audit --json

# Fix workflow:
npm audit fix             # Auto-fix transitive deps
npm install [pkg]@latest  # Manual upgrade
```

### License Decisions
- **All direct deps**: MIT/Apache2/BSD compliant ✓
- No GPL/AGPL (would violate non-viral license requirement)
- No UNLICENSED packages
- **Next audit:** Check transitive license tree for GPL surprises (not yet implemented)

### Fixes Applied in This Run
- None yet — report only. TheFixer team will implement remediation.
- Recommended priority: uuid (P1) → vitest (P1) → dockerode (P1) → babel/handlebars (P2)

### Next Audit Actions
1. Schedule re-audit after uuid/vitest/dockerode upgrades
2. Verify test suite compatibility post-major-version bumps
3. Monitor brace-expansion/js-yaml for security updates
4. Consider SCA tool integration (npm audit + SBOM generation)
