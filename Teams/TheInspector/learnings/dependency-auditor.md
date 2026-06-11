# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit: 2026-06-11

### Critical Packages to Watch

| Package | Issue | Notes |
|---------|-------|-------|
| `handlebars` | JavaScript injection (CVSS 9.8) | Transitive via ts-jest@^29.1.2 in Backend; patch exists in ts-jest@29.1.5+ |
| `vitest` | Path traversal chain (esbuild+vite) | Frontend uses @2.0.5; upgrade to v4+ required |
| `react-router-dom` | Open redirect (protocol-relative) | Frontend 6.26.0 → patch available in 6.30.4+ |
| `express` | QS injection (prototype pollution) | Backend 4.18.2 → patch in 4.22.2+ |
| `pino` | Outdated 2 major versions | Backend 8.17.0 → v10 available; plan migration |

### Audit Tools Available

- ✅ `npm audit --json` — Works across all npm packages
- ✅ `npm outdated --json` — Detects version gaps
- ✅ `npm ls` — Dependency tree (use when installed)
- ✅ `npm-check-updates` — Not found, but npm outdated sufficient

### License Compliance Decisions

- **MIT/ISC preferred** — All direct dependencies compliant
- **No GPL/AGPL detected** — No viral license risks
- **Recommendation:** Add license field to Backend and Frontend package.json

### Dependency Baseline

- **Backend:** 231 transitive deps, 411 nodes (no duplicates)
- **Frontend:** 231 transitive deps, 230 nodes (no duplicates)
- **E2E:** 5 transitive deps, clean (0 CVEs)
- **Post-install scripts:** 0 detected (supply chain risk ✅ low)
- **Supply chain surface:** ~462 total transitive packages

### Severity Grading Reference

- **P1:** Critical/High CVE in production code or build infrastructure (code execution risk)
- **P2:** Critical/High in transitive, or Medium in direct; outdated 2+ major versions
- **P3:** Medium/Low CVE; outdated 1+ major version
- **P4:** Informational/disputed CVE; license questions

### Next Audit Should Check

1. Status of handlebars fix (ts-jest update applied?)
2. Vitest migration to v4 completion
3. React/React Router patch status (6.30.4 applied?)
4. Express upgrade to 4.22.2 status
5. New CVEs published against uuid@14, pino@10 candidate versions
