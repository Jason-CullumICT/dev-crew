# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### 2026-07-05: Critical Handlebars & Vitest RCE Vulnerabilities Identified

#### Key Findings
- **Handlebars.js** (transitive in Backend) contains 8 known RCE/injection CVEs (CVSS 9.8 highest). Multiple attack vectors via AST type confusion, template injection, prototype pollution. Immediate upgrade to >= 4.7.9 required.
- **Vitest** (Frontend direct dep) has critical UI server arbitrary file read/execute vulnerability (CVSS 9.8). Affects dev/test environments. Upgrade to >= 3.2.6 or >= 4.1.9.
- **form-data** CVE (CRLF injection) affects both Backend and Frontend — CVSS 7.5.
- **Vite** has Windows-specific fs.deny bypass (high severity on Windows dev environments).
- **ws** (WebSocket) has memory exhaustion DoS (CVSS 7.5).

#### Watch List (Recurring Issues)
- Handlebars (backend) — 8 separate CVEs in current range. This package is severely outdated.
- Pino (backend) — 2 majors behind (8.17 vs 10.3.1). May have missed security backports.
- React stack (frontend) — 1 major behind. v19 should be evaluated but not forced.

#### Audit Tool Status
- **npm audit --json**: ✅ Working and reliable. Both Backend and Frontend successfully audited.
- **npm outdated --json**: ✅ Working. Shows version gaps across all packages.
- **npm ls --json**: Functional but requires jq for tree inspection.

#### Supply Chain Risk Notes
- Backend: 412 transitive deps (102 prod, 310 dev) — large surface. Developer deps are not deployed but expose build/CI to attacks.
- Frontend: 231 transitive deps (9 prod, 222 dev) — similar risk profile.
- E2E: Clean — only 5 transitive deps, 0 CVEs.

#### License Compliance Status
- Metadata missing from `npm ls`. Recommend `license-checker` tool once node_modules installed.
- All major OSS packages (express, react, vite) are permissive licenses (MIT/Apache-2.0) — low risk.

#### Next Audit (Scheduled)
- Run `npm audit` after critical updates applied.
- Check for new CVEs every 30 days or after major version upgrades.
- Consider CI gate: fail on Critical + High CVEs.
