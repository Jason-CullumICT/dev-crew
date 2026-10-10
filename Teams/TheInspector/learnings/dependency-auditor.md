# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-10

### Critical Findings (P1)
- **Vitest UI Server RCE (GHSA-5xrq-8626-4rwp)**: Frontend vitest 2.0.5 has arbitrary file read/exec. Needs upgrade to >=3.2.6 (tested: vitest@5.0.3 works).
- **Vitest Path Traversal (GHSA-82fw-gwwq-j7x9)**: @vitest/mocker redirect mock bypass. Fixed in >=4.1.11.

### High Severity (P2)
- **Vite path traversal (GHSA-fx2h-pf6j-xcff)**: Windows alternate path bypass. Requires vite >= 6.5.0.
- **Jest ecosystem cascade (micromatch ReDoS)**: 29.7.0 vulnerable; 30.2.0 fixed in 30.5.2 (major bump).
- **Browserslist DoS (GHSA-c83g-rgw3-j3cx)**: Unbounded memory growth, no cache eviction. Fixed in 4.28.7+.
- **gRPC server crash (GHSA-5375-pq7m-f5r2, etc)**: platform/orchestrator @grpc/grpc-js needs >=1.14.4.

### Watch List (Recurring CVEs)
- ✅ **jest ecosystem**: Has recurring high-severity vulns in micromatch transitive chain. Plan migration to vitest for lighter footprint.
- ✅ **vitest**: Recently (2024-2025) had critical RCE. Recommend staying current. Already on 5.0.3 in Frontend to fix.
- ✅ **vite**: Multiple path traversals and fs.deny bypasses. Security-sensitive for dev environment.
- ✅ **browserslist**: Multiple DoS vectors. Ensure latest stable.
- ✅ **ws**: Memory exhaustion from small packets. Keep up to date.
- ✅ **@babel/core**: Low-risk sourcemap traversal, but low in dependency tree. Not urgent.

### Outdated Packages
- **Backend**: express (1 major), pino (2 major, 8→10), uuid (5 major but likely safe)
- **Frontend**: react/react-dom (1 major), react-router-dom (1 major + has CVE in 6.26.0)
- **prom-client**: Current (15.1.3)

### License Check
- All direct deps: MIT or Apache 2.0 (✅ no GPL/AGPL conflicts)
- No UNLICENSED packages found

### Supply Chain
- **Dependency tree size**: Backend 232 total, Frontend 230+ total (~450 combined transitive)
- **Post-install scripts**: None detected in main packages
- **Single maintainers**: Not checked yet (low priority)
- **Download velocity**: All major packages have healthy weekly download counts

### Environment Detection
- **Package managers**: npm only (Node.js projects)
- **Go modules**: Not detected
- **Python**: Not detected
- **Rust**: Not detected
- **Java**: Not detected

### Audit Tools Available
- ✅ `npm audit --json` (used successfully)
- ✅ `npm outdated --json` (used successfully)
- ⚠️ `license-checker` (not tested yet, fallback to package.json manual review OK)
- ❌ `govulncheck` (not applicable, no Go modules)
- ❌ `pip-audit` (not applicable, no Python)

### Misc Notes
- E2E project (Playwright) is clean: 0 vulnerabilities
- Portal Backend/Frontend have same vitest/vite issues + @grpc/grpc-js problems
- platform/orchestrator is infrastructure-critical; prioritize its gRPC fix
- Demo projects (abac-*) not audited; they're example code

## Decisions Made
- Recommend Phase 1/2/3 action plan in audit report
- Flag for escalation to TheGuardians: Vitest RCE, gRPC cert bypass, React Router open redirect
- Flag for escalation to performance-profiler: Browserslist/ws/vite DoS risks
- No immediate license risk
- No hardcoded secrets detected
