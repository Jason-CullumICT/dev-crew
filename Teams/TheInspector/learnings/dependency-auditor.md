# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-11

### Critical Findings (Watch List)

**CRITICAL (P1) — Requires immediate action:**
- `handlebars` 4.0.0-4.7.8: Multiple JavaScript injection & prototype pollution CVEs (CVSS 9.8)
  - Affects: Source/Backend (transitive via build/logging dependency)
  - Fix: Upgrade to 4.7.9+
  - Note: Check which dependency brings in handlebars; may be optional dev dependency

- `vitest` ≤3.2.5: Arbitrary file read/execute via UI server (CVSS 9.8)
  - Affects: Source/Frontend (direct dev dependency)
  - Fix: Upgrade to 4.1.10+ (major version change)
  - Note: Dev-only but high risk in CI/CD pipelines

**HIGH (P1) — Plan upgrades:**
- `brace-expansion` <1.1.16: 4x DoS vulnerabilities via glob expansion
  - Affects: All projects (transitive)
  - Fix: Upgrade to 1.1.16+

- `form-data` <1.0.0-1: CRLF injection in multipart encoding
- `js-yaml`: Quadratic DoS via merge keys
- `@grpc/grpc-js` 1.14.0-1.14.3: Server crash on malformed messages

### Outdated Major Versions

Packages >1 major version behind (security patch backport risk):
- `pino`: 8.17.0 → 10.3.1 (2 majors behind)
- `uuid`: 9.0.0 → 14.0.1 (5 majors behind, but low risk — pure utility)
- `express`: ^4.x → ^5.x (across all 3 projects)
- `react`/`react-router-dom`: ^18.x → ^19.x/^7.x

**Action:** Plan compatibility testing before major upgrades.

### Monorepo Characteristics

- **Package Managers:** npm only (10 projects)
- **Total Dependencies:** ~40 direct, ~40 transitive — healthy scale
- **No post-install scripts:** ✓ Good
- **No abandoned packages detected:** ✓ Good
- **License Compliance:** ✓ PASS (no viral licenses)
- **Supply chain risk:** Low — small tree, no suspicious patterns

### Tools Available

- `npm audit --json`: ✓ Works perfectly
- `npm outdated --json`: ✓ Works
- `npm ls --all`: ✓ Works
- `npm list --depth=0`: ✓ Works
- `npm ls <package>`: ✓ Traces dependency chain

### Ecosystem Notes

- **Frontend:** React 18 + React Router 6 (both 1 major behind)
- **Backend:** Express 4 + Pino 8 + TypeScript (lean, no template engines directly)
- **Infrastructure:** Docker orchestration via `dockerode` (1 major behind)
- **Testing:** Frontend uses Vitest (critical vuln found), Backend uses Jest

### Remediation Steps (Next Audit)

1. Verify vitest, handlebars, brace-expansion updates applied
2. Re-run `npm audit --json` to confirm P1/P2 cleared
3. Run `npm test --workspaces` to validate compatibility
4. Plan Phase 3 major upgrades (express, react, pino)
5. Set up CI gate: fail if `critical` or `high` CVEs present

### Next Audit Focus

- [ ] Confirm critical CVEs fixed
- [ ] Check if any new CVEs emerge in dependencies
- [ ] Test major version upgrade compatibility for express/react/pino
- [ ] Monitor for deprecated packages or abandoned libraries
