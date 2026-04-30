# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-04-30

### Critical Findings
- **Handlebars.js CRITICAL vulnerabilities** in build tooling (8 CVEs across code injection and prototype pollution vectors). These are transitive dependencies via Jest/Babel. While no direct exploit path in application code, this represents a significant build-time supply chain risk.
- **UUID buffer overflow** is a direct backend dependency that should be upgraded ASAP (P2 priority).

### Remediation Track Record
- This is the first audit; establishing baseline.
- Planned remediation for vite (P3), vitest (P3), react upgrade (P4), express upgrade (P4).

## Dev Environment Notes
- **Package Managers:** npm only (no Go, Python, Rust, or Java detected)
- **Workspaces:** Backend (Source/Backend), Frontend (Source/Frontend), E2E tests
- **Supply Chain Surface:** ~600+ transitive dependencies (moderate for Node.js)
- **License Compliance:** All direct deps use permissive licenses (MIT, ISC) — no viral license risk detected
- **Maintenance Health:** All major packages actively maintained; no abandoned dependencies

## Audit Tools Available
- ✓ `npm audit --json` (available in both workspaces)
- ✓ `npm outdated --json` (works, exit code 1 when outdated packages exist — ignore exit code, read JSON)
- ✗ `npx license-checker --json` (not consistently available; fallback to package.json reading)
- ✗ `govulncheck`, `pip-audit` (Go/Python not used in project)

## Recurring CVEs to Watch
- **Handlebars:** High-severity template injection vector; appears in build tooling. Watch for next release cycles.
- **Vite/ESBuild:** Minor path traversal/CORS issues in dev tooling; monitor for upstream fixes.
- **PostCSS:** XSS via CSS stringification; low actual risk if CSS is not user-supplied; tied to vite upgrades.

## Decision Log
- **React 19 upgrade:** Deferred to backlog (P4) — no security driver, breaking changes require separate sprint.
- **Express 5 upgrade:** Deferred to backlog (P4) — requires middleware audit, plan for next quarter.
- **Vite upgrade to 6.x:** Bumped to short-term (P3) — resolves multiple dev-tool CVEs.

## Next Audit Scope
- Verify remediation of P1/P2 items (uuid, handlebars)
- Track vite/vitest upgrade success
- Re-baseline supply chain health
- Check for new vulnerabilities in major release candidates
