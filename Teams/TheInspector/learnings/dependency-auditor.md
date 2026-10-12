# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit History

### 2026-10-12 Initial Audit
**Status:** URGENT — 4 Critical CVEs detected  
**Report:** `/findings/audit-2026-10-12-urgent.md`

## Key Findings & Patterns

### Critical CVE Watch List
- **Handlebars (via Jest):** RCE in build pipeline — upgrade Jest to 30.5.2+
- **Proxy-addr (via Express):** IP spoofing CVE — critical for auth bypass prevention
- **Vite:** Path traversal in dev server — affects source map security
- **Tinypool (via Vitest):** Code execution in test parallelization

### Jest Ecosystem Issues (RECURRING)
- Jest 29.7.0 (current) has 42 vulnerabilities (2 critical, 33 high)
- Jest 30.5.2+ resolves majority of handlebars/brace-expansion chain
- **Action:** Mandate Jest 30+ for all Backend test suites

### Frontend Framework Lag (RECURRING)
- React 18.3.1 is 1 major version behind (19.3.0 available)
- React Router 6.26.0 is 1 major version behind (7.18.4 available)
- Both lag introduces cumulative security patches + open redirect risk
- **Action:** Plan React 19 + React Router 7 migration in next sprint

### License Compliance Notes
- ✓ Primary deps (express, react, pino, uuid) are MIT/Apache 2.0
- ✓ No GPL/AGPL in direct dependencies
- TODO: Run `npx license-checker` to audit transitive chains for legal review

### Supply Chain Observations
- **No abandoned packages detected** — all deps actively maintained
- **No duplicate package versions** — lock file integrity is good
- **No post-install scripts** in direct dependencies (security positive)
- Jest pulls ~40+ transitive deps; Vite ~35+; recommend size audit

## Remediation Status

### Phase 1 (Immediate) — NOT YET STARTED
- [ ] Upgrade Jest 29.7.0 → 30.5.2 (fixes 2 critical CVEs)
- [ ] Upgrade Vite/Vitest to latest (fixes path traversal + tinypool)
- [ ] Upgrade React Router 6 → 7 (fixes open redirect + obsolescence)

### Phase 2 (Short-term) — NOT YET STARTED
- [ ] Run `npm audit fix` to patch browserslist, form-data, braces
- [ ] Upgrade React 18 → 19 (requires compatibility testing)
- [ ] Add `npm audit` gate to CI/CD pipeline (fail on critical/high)

### Phase 3 (Ongoing) — NOT YET STARTED
- [ ] Set up Dependabot or Snyk for automated monitoring
- [ ] Quarterly license-checker audit
- [ ] Semi-annual dependency tree review

## Environment Notes

### Package Managers Detected
- ✓ **npm** (10 projects, all using lockfiles)
- ✗ Go modules (none found)
- ✗ Python (none found)
- ✗ Rust (none found)
- ✗ Java/Maven (none found)

### Audit Tools Available
- ✓ `npm audit --json` (primary tool)
- ✓ `npm outdated --json` (version tracking)
- ✓ `npm ls --json --depth=0` (dep tree inspection)
- TODO: `npx license-checker --json` (license audit)
- TODO: `npm-check-updates` (major version tracking)

### Project Structure
- **3 main projects scanned:** Backend, Frontend, E2E
- **Backend:** Express REST API, 13 direct deps, heavy Jest usage
- **Frontend:** React SPA, 13 direct deps, Vite + React Router stack
- **E2E:** Minimal deps, clean audit (0 vulns)
- **Platform:** Orchestrator infrastructure (agents should not audit)
- **Portal:** Debug UI (has its own npm projects, not yet prioritized)
