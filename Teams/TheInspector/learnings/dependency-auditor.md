# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-16

### Critical Findings (Watch List)

1. **vitest@<=3.2.5** — CRITICAL RCE via UI server
   - Affects: Source/Frontend (direct dependency)
   - Status: UNPATCHED
   - Fix: `npm install vitest@^3.2.6 --save-dev`
   - CVE: GHSA-5xrq-8626-4rwp (CVSS 9.8)

2. **glob@7.2.3** — Deprecated with known CVEs
   - Affects: Source/Backend (transitive via ts-jest → test infra)
   - Root: ts-jest@29.1.2 depends on deprecated glob
   - Fix: Upgrade ts-jest to v30+

3. **vite@<=6.4.2** — Multiple path traversal vulns
   - Affects: Source/Frontend (direct dependency)
   - CVEs: GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff
   - Fix: `npm install vite@^8.0.0 --save-dev`

4. **esbuild** — Supply chain RCE via registry hijacking
   - Affects: Source/Frontend (transitive via vite)
   - CVE: GHSA-gv7w-rqvm-qjhr (CVSS 8.1)
   - Status: Addressed via vite upgrade

### Recurring CVE Patterns

- **Test Infrastructure:** Jest/ts-jest pulls in deprecated dependencies (glob, inflight, babel-plugin-istanbul)
  - Recommendation: Monitor jest for major version bumps that modernize build tooling
- **Build Tools:** Vite/esbuild have path traversal risks on Windows
  - Mitigation: Always run `npm audit` after vite updates; watch security advisories weekly
- **WebSocket Libs:** ws@8.x has DoS vulnerabilities in fragment handling
  - Status: Vitest/vite transitively depend on old ws; fixed by vite upgrade

### Audit Tools Available

- `npm audit --json` — Works reliably in all npm workspaces
- `npm outdated --json` — Identifies version lag (filters to latest per semver)
- `npm ls --depth=0` — Lists direct dependencies (but requires installation)
- `jq` — Useful for parsing lock file counts: `jq '.packages | length' package-lock.json`
- **Not available:** license-checker (can be installed but requires deps to be present)

### Dependency Counts (Baseline)

| Workspace | Direct Deps | Transitive Deps | Key Risk |
|-----------|------------|----------------|----------|
| Backend | 13 | 411 | 310 dev deps from jest/ts-jest/babel |
| Frontend | 13 | 230 | Vite/vitest/react build chain |
| E2E | 1 | 4 | Clean — only @playwright/test |

**Supply Chain Risk:** 641 total transitive dependencies (Backend + Frontend). Each is a potential vector.

### Team Escalations (Recurring)

All **critical** and **high** severity CVEs in dev-crew route to **TheGuardians** (security team), not TheFixer:
- Code execution vulns (DEP-001, DEP-004)
- Path traversal (DEP-003)
- HTTP injection (DEP-005)
- Deprecated packages with known vulns (DEP-002)

### License Decisions

- **dev-crew project:** UNLICENSED (private/commercial) — this is correct
- **No GPL/AGPL dependencies found** ✓ PASS — minimal copyleft risk
- No unusual licenses requiring legal review

### Next Review

**Scheduled:** 2026-06-23 (7 days)  
**Focus:** Verify all critical fixes (vitest, vite, ts-jest) have been applied and tests pass  
**Action:** Re-run `npm audit` in both Backend and Frontend workspaces
