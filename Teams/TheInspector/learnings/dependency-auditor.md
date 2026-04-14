# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-04-14

### Critical Findings
- **handlebars@4.x** has CRITICAL RCE via AST type confusion (GHSA-2w6w-674q-4c4q)
  - Affects: Source/Backend
  - Status: REQUIRES IMMEDIATE ACTION
  - Watch list: handlebars is a high-value target; monitor future releases

### High-Risk Patterns Identified
- **ReDoS Vulnerabilities in Path/Glob Libraries**
  - `path-to-regexp` (GHSA-37ch-88jc-xwx2) affects routing in orchestrator + portal
  - `picomatch` (GHSA-c2c7-rcm5-vvqj) affects glob matching in frontend
  - Pattern: Route parameters and glob patterns are ReDoS attack surfaces

- **Vite/esbuild Chain**
  - All frontend/testing projects share vulnerable `vite` + `esbuild` (dev-server CORS bypass, path traversal)
  - Recommend: Establish shared version policy to avoid redundancy

### Version Gap Risks
- **pino@8** → @10 (2 major gap) — likely missing 2 years of security patches
- **uuid@9** → @13 (4 major gap) — check if library has been refactored or abandoned
- **React@18** → @19 (1 major) — low risk; standard upgrade path

### Tools Available
- `npm audit --json` works in all projects
- `npm outdated --json` returns exit code 1 even on success (parse stdout, not exit code)
- `npm ls --json` available but very large output for orchestrator

### Supply Chain Risks
- **platform/orchestrator** has ~500+ transitive deps (153 direct) — highest risk surface
- No license-checker tool installed yet; recommend adding to audit pipeline
- Duplicate dep versions (vite, esbuild) across multiple projects suggest monorepo refactoring opportunity

### Grading Notes
- Handlebars CVE makes this a "B" grade even with other issues mitigated
- Once P1 handlebars is patched, the 3 HIGH vulnerabilities (path-to-regexp, picomatch) are upgradeable to A-grade
- License audit not yet performed (no tool installed)

### Recommendations for Next Run
1. Install and run `npm install -g license-checker` to audit license compliance
2. Get exact transitive dep counts: `npm ls --json | jq '.dependencies | recurse(.dependencies?) | objects | length'`
3. Check deprecation flags: `npm view {package} deprecated`
4. Identify candidates for monorepo consolidation (Vite versions)
5. Schedule Follow-up for pino@10 migration planning
