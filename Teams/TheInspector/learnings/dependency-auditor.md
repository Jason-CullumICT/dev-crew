# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Critical Package Watch List

**Handlebars.js** — Multiple RCE vulnerabilities in 4.0.0-4.7.8
- Source: Build tooling (Vite/Webpack)
- Risk: JavaScript Injection via AST type confusion
- Current Version: Vulnerable (via transitive deps)
- Action: Verify if used in production templates; escalate to TheGuardians

**brace-expansion** — Multiple DoS (CVE-2026-52863, CVE-2026-52862, others)
- Source: dev-dependency via glob/build tools
- Risk: Process hang/OOM on exponential expansion
- Fixed in: v1.1.18
- Note: Common in tooling chains; watch for repeated appearances

**browserslist** — Memory leaks + crash via untrusted config
- Source: Build tooling (Vite/PostCSS)
- Risk: OOM via unbounded cache, crash via prototype write
- Fixed in: v4.28.9
- Pattern: These appear in both Backend and Frontend (shared toolchain dependency)

**js-yaml** — Quadratic DoS via merge keys and !!omap
- Source: Build/config tooling
- Risk: CPU exhaustion on YAML parsing
- Fixed in: v3.15.2
- Note: Multiple CVEs, watch for future patches

### Supply Chain Patterns

1. **Dev-tool CVEs are widespread** — brace-expansion, browserslist, js-yaml, babel all have CVEs
2. **Build-time != Runtime risk** — Handlebars.js RCE is build-time unless templates are user-controlled
3. **Frontend has smaller transitive tree (53 vs 411)** — React + Router minimal deps; Backend pulls in more tooling
4. **E2E stays clean** — Single @playwright/test dependency, no vulnerabilities

### License Compliance Notes

- No GPL/AGPL libraries detected in direct dependencies
- No post-install scripts (good security indicator)
- Express/pino/uuid/react-dom are MIT/Apache (compatible licenses)

### Tools & Detection

- **npm audit --json** works reliably for CVE detection
- **npm outdated --json** shows major version gaps (exit code 1 is normal)
- **npm audit fix --dry-run** shows exact remediation steps
- **Lock file inspection** needed for transitive dependency counts (jq `.packages | length`)
- **license-checker** tool not evaluated this run (jq parsing issues)

### Remediation Patterns

Standard workflow:
1. `npm audit --json` → count by severity
2. `npm audit fix --dry-run` → show remediation
3. `npm audit fix` → apply fixes
4. `npm outdated --json` → identify major version gaps
5. Manual review of direct deps for API changes before upgrade

### Next Audit Checklist

- [ ] Verify Handlebars.js production usage (run DEP-001 escalation first)
- [ ] Test `npm audit fix` in CI before committing changes
- [ ] Review react-router-dom v7 migration guide (DEP-007 fix)
- [ ] Plan express v5 breaking changes (DEP-010 follow-up)
- [ ] Re-run full audit after fixes to confirm zero vulnerabilities
