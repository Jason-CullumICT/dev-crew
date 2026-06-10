# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run 2026-06-10

#### Critical Findings (require immediate action)
1. **Vitest 2.1.9 (Frontend)** — CVSS 9.8 arbitrary file read/execute via UI server
   - When running `vitest ui`, ensure `--host 127.0.0.1` or firewall protection
   - Upgrade to 3.2.6+ immediately (requires major version bump)
   - Affects: all developers running test server; dev-time vulnerability, not prod

2. **Handlebars 4.0.0-4.7.8 (Backend)** — CVSS 9.8 code injection via AST confusion
   - Transitive dependency; not directly in package.json
   - Used by some build/template tool; identify via `npm ls handlebars`
   - Upgrade to 4.7.9+ (fix available)
   - If not used, remove entire transitive chain

#### Deprecated Packages (Update Warnings)
- supertest@6.3.4 → upgrade to 7.1.3+
- glob@7.2.3 → has known security issues; lru-cache recommended alternative
- inflight@1.0.6 → memory leak; replace with lru-cache
- superagent@8.1.2 → upgrade to 10.2.2+

#### Supply Chain Risks (Watch List)
- **uuid@9.0.1** — single maintainer (Christopher Teubert); heavy backend dependency
  - Mitigation: monitor for inactivity; have fallback plan
  - Current: maintained, releases regular patches
- **pino@8.21.0** — single maintainer (Matteo Collina); production logger
  - Mitigation: same as uuid
  - Current: active, frequent updates

#### Package Manager Status
- **npm**: All projects use npm + package-lock.json (good for reproducibility)
- **No yarn/pnpm**: Simpler, but less space-efficient lockfiles
- **Legacy peer deps flag used** (`--legacy-peer-deps`): acceptable for now

#### Audit Tool Availability
- `npm audit` ✅ available; run without `--production` to catch dev vulns
- `npm outdated` ✅ available; critical for tracking major version drift
- `npm ls` ✅ available; use to identify transitive deps

#### Major Version Upgrades Pending
- **React 18 → 19**: likely safe; test integration tests
- **Vite 5 → 8**: breaking changes; requires migration guide
- **TypeScript 5 → 6**: breaking changes; requires review
- **@types/node 20 → 25**: Node 20 EOL April 2025; plan upgrade

#### License Compliance Notes
- All projects MIT/ISC/Apache 2.0 compatible
- No GPL/AGPL in dependency tree (good for commercial use)
- No UNLICENSED packages detected

#### Transitive Dependency Growth
- Backend: 411 packages (moderate)
- Frontend: 222 packages (moderate)
- E2E: 4 packages (minimal)
- **Concern**: No obvious bloat, but frontend vite/vitest ecosystem is heavy

#### Process Recommendations
1. **Add CI gate** to fail builds on P1 CVEs
2. **Set up Dependabot/Renovate** for automated PRs
3. **Monthly audit** of dev dependencies (lower risk, but can accumulate)
4. **Code review checklist**: verify new deps are necessary before merge
