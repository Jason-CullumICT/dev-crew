# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-03

### Critical Watch List
- **handlebars** (4.7.8 in Backend): Multiple JS injection CVEs — update to >=4.7.9 immediately. Watch for hand-written template processing.
- **vitest** (3.2.5 in Frontend): Arbitrary file read when UI server running — update to >=3.2.6. Ensure UI server never exposed in production.
- **vite** (5.4.0 in Frontend): Multiple security fixes in 6.x/7.x/8.x. Plan major version migration.
- **uuid** (9.0.1 in Backend): Buffer overflow CVE + 5 major versions behind. Update to >=11.1.1 min, test for breaking changes.

### License Decisions
- ✓ MIT, ISC, BSD variants: All approved
- ✓ No GPL/AGPL found — project remains non-GPL compatible
- ⚠ Monitor new dependencies for CC-BY-4.0 (1 found in transitive, low impact)

### Audit Tools Available
- `npm audit --json` — works reliably in all three workspaces
- `npm outdated --json` — detects major version gaps
- `npm list --depth=0` — direct dependency enumeration (works with warnings about unmet deps during lockfile-only analysis)
- `license-checker` (via npx) — can identify non-standard licenses

### Prior Findings Status
- First full audit run — baseline established
- All 18 vulnerabilities are actionable with fixes available
- No abandoned/deprecated packages detected (npm ecosystem actively maintained)

### Dependency Tree Notes
- Backend: 408 transitive deps (4 direct) — large supply chain surface, primarily from @babel/*, jest, typescript tooling
- Frontend: 228 transitive deps (3 direct) — vite/vitest and React ecosystem creates majority
- E2E: Cleanest (4 direct, 1 transitive) — Playwright engine

### Remediation Priorities
1. P1 (Critical): Handlebars, Vitest — fix this week
2. P2 (High): form-data, vite, ws — fix within 1 week
3. P3 (Moderate): js-yaml, brace-expansion, postcss, react-router — plan for next 2 weeks
4. Major version migrations (express, pino, uuid, react, vite): Plan for Q3

### Known Gotchas
- **uuid v11+ breaking change:** API changes from v9 to v11; requires test verification
- **vite 6+ potential breaking changes:** esbuild version bumps, dev server config differences
- **express 5.x migration:** Major rewrite needed; plan dedicated effort
- **Vitest UI server:** Can be critical if left running in CI/testing infrastructure — audit job definitions

### Next Run
- Re-audit after applying P1/P2 fixes to confirm resolution
- Track time-to-fix for P1 vs. P2 (SLA monitoring)
- Add dependency deprecation checks (npm registry API polling)


