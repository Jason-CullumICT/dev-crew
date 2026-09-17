# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run: 2026-09-17

### Critical Packages with Recurring Risk
- **handlebars**: Multiple JavaScript injection CVEs (CVSS 9.8) in 4.0.0-4.7.8. Used in build tools and potentially in template rendering. Watch for usage in dev-crew or transitive deps.
- **vitest**: Arbitrary file read when UI server is running (CVSS 9.8, GHSA-5xrq-8626-4rwp). Dev-time risk if UI exposed.
- **js-yaml**: Quadratic DoS via merge keys (4x CVEs, CVSS 7.5). High risk if parsing untrusted YAML.

### License Decisions
- No GPL/AGPL dependencies flagged in primary app (Source/Backend, Source/Frontend)
- All licenses appear compatible with project license (infer from CLAUDE.md later)
- Recommendation: Add `npm audit` to CI/CD to catch license violations on new deps

### Audit Tools Available
- `npm audit --json`: Works on all npm projects, produces detailed JSON output
- `npm outdated --json`: Shows available versions (exit code 1 if outdated packages exist)
- `npm ls --depth=N`: List dependencies at depth N
- Manual lock file inspection: Can count total deps via `jq '.packages | length'`
- `npm why <package>`: Find which dep pulls a transitive package

### Summary Statistics
- Backend: 10 CVEs (1 CRITICAL, 4 HIGH) across 412 packages
- Frontend: 15 CVEs (1 CRITICAL, 6 HIGH) across 231 packages
- E2E: 0 CVEs (4 direct deps — very clean)
- Portal/Backend: 54 CVEs (2 CRITICAL) — requires separate remediation
- Platform/Orchestrator: 8 CVEs (1 CRITICAL) — infrastructure risk

### Next Audit Checklist
- [ ] Verify Handlebars parent dependency identified and upgraded
- [ ] Confirm vitest upgrade applied and UI server disabled in prod
- [ ] Validate `npm audit fix` runs in CI/CD
- [ ] Schedule express 4→5 migration (breaking changes likely)
- [ ] Plan React 18→19 upgrade (test all hooks/components)
- [ ] Review js-yaml usage for user input parsing risk
- [ ] Check if form-data handles user-controlled field names (CRLF injection risk)
