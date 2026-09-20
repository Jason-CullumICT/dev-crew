# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run: 2026-09-20

### Critical Findings
1. **Handlebars.js** — 8 CVEs related to template injection. Comes via transitive dependencies (likely through build tools). All vulnerabilities are in 4.7.8 and earlier; 4.7.9+ is safe.
2. **protobufjs** — 16 critical CVEs in platform/orchestrator. Used by @grpc/grpc-js. Extremely dangerous because orchestrator is core infrastructure. Multiple code injection, DoS, and prototype pollution issues.
3. **brace-expansion** — 4 DoS CVEs. Zero-step sequences, exponential expansion, unbounded arrays. All fixable with latest version.

### High Severity Pattern
- **Build tools** (vite, vitest, @vitest/mocker, esbuild) accumulate many vulnerabilities
- **Protocol-related** (protobufjs, @grpc/grpc-js, path-to-regexp) are high-risk for infrastructure code
- **CSS/Template tools** (postcss, handlebars) have path traversal and injection issues

### Recommendations for Future Audits
1. **Prioritize infrastructure first** — orchestrator crashes = entire pipeline down. protobufjs must be addressed before any other fixes.
2. **Watch these packages for recurring issues:**
   - `browserslist` — unbounded memory growth is a pattern
   - `postcss` — has had repeated security fixes; consider if necessary
   - `js-yaml` — quadratic CPU issues recur; validate input size limits at app level
3. **Direct dependency risk is lower than transitive** — Backend has only 1 direct vuln (uuid), Frontend has 3 (react-router-dom, vite, vitest), Orchestrator has 0.
4. **No deprecated packages found** — dependency tree is relatively well-maintained (no abandoned projects)
5. **No GPL/AGPL detected** — license compliance is clean

### Dependency Counts for Baseline
- Backend: 411 transitive (13 direct)
- Frontend: 53 transitive (13 direct)
- E2E: 4 transitive (2 direct)
- Orchestrator: 155 transitive (3 direct)
- **Total: 623 packages, 31 direct** — reasonable scope, not an outlier

### Tool Availability
- ✅ `npm audit --json` works without node_modules (uses lock file)
- ✅ `npm ls --depth=0` requires node_modules (UNMET DEPENDENCY warnings observed)
- ❌ `license-checker` not available in environment (would need npm install)
- ✅ Can parse lock files directly for license inspection if needed

### Post-Install Script Risk
- ~4 packages have post-install scripts (detected via audit output)
- None appear to be malicious, but worth monitoring for supply chain attacks
- Consider audit requirement: any new dependency with post-install script requires security review

## Learnings

1. **Handlebars.js** — Transitive, via build chain. Update to >=4.7.9. Template injection risk if user input reaches templates.
2. **protobufjs** — CRITICAL. Platform/orchestrator infrastructure vulnerability. 16 CVEs, code injection/DoS/prototype pollution. Requires careful testing before upgrade.
3. **brace-expansion** — 4 DoS CVEs. Easy fix, update to latest.
4. **browserslist** — Unbounded memory growth on long-running processes. Fix available.
5. **form-data, js-yaml, postcss, vite** — Multiple high-severity issues. Prioritize after P1s.
6. **Build tools (vite, vitest) carry the most vulnerabilities** — Consider evaluation for necessity.
