# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### 2026-07-28 Audit Run

**Environment:** npm workspaces across 10 directories (Source/, platform/, portal/)

**Key Findings:**

1. **Critical Vulnerabilities Identified:**
   - handlebars: Multiple JavaScript injection vectors (GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, GHSA-xhpv-hc6g-r9c6)
     - Affects: Source/Backend
     - Watch list: This package appears frequently in legacy Node projects; check for template injection entry points
   - vitest: Arbitrary file read via UI server (GHSA-5xrq-8626-4rwp)
     - Affects: Source/Frontend
     - Mitigation: UI server is dev-only; ensure not exposed in production
   - Portal workspaces: Each has 2 critical CVEs with high vulnerability density

2. **Supply Chain Risks:**
   - Portal dependencies show 54+ packages each with 54 CVEs total — bloated transitive tree
   - Recommend architectural separation: portal/ should be isolated from core Source/
   - Source/E2E is clean (0 CVEs) — good isolation, use as model for test workspace design

3. **Transitive Dependencies:**
   - brace-expansion DoS issues via build tools (glob, minimatch)
   - form-data CRLF injection affects file upload pipelines
   - qs prototype pollution is widespread (via express → body-parser)
   - All are transitive; direct dependencies are cleaner than expected

4. **Audit Tools Available:**
   - `npm audit --json`: Works reliably across all workspaces
   - `npm outdated --json`: Supported but not always populated for all packages
   - `npm ci` + lock files: Required before running npm audit (dependency installation)
   - No go.mod, requirements.txt, or Cargo.toml detected in repo

5. **Workspace Configuration:**
   - 10 workspaces total: 3 primary (Backend/Frontend/E2E), 2 orchestrator (platform), 2 portal, 3 demo/template
   - Direct dependency count: 13 (Backend), 13 (Frontend), 0 (E2E)
   - Transitive expansion: ~23x for Backend, ~35x for Frontend (normal for React/TypeScript)

### License Compliance Status

- No GPL/AGPL detected in npm audit output
- All primary workspaces appear MIT/Apache-2.0 licensed
- Recommendation: Add `npx license-checker` to CI for continuous monitoring

### Remediation Priorities

**P1 (IMMEDIATE - 24 hours):**
- handlebars@^4.7.9 (Source/Backend)
- vitest@^3.2.6 (Source/Frontend)
- Portal critical CVEs (investigate and patch)

**P2 (SHORT-TERM - 1 week):**
- brace-expansion@^1.1.16
- form-data@^4.0.6
- vite, postcss, ws updates

**P3 (BACKLOG):**
- uuid, qs, body-parser, react-router, esbuild, @babel/core

### Automation & Next Steps

1. Integrate `npm audit --audit-level=moderate` into CI/CD to fail on moderate+ CVEs
2. Set up quarterly audit runs (next: 2026-08-28)
3. Add portal/* to separate audit schedule with tighter SLA
4. Monitor GitHub advisories for handlebars and vitest (high-impact packages)
