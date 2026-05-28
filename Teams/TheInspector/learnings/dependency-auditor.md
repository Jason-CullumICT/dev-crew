# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-28

### Critical Findings
- **Handlebars RCE (GHSA-2w6w-674q-4c4q)**: Found in ts-jest@29.4.6 as transitive dependency. Multiple JavaScript injection vulnerabilities allow RCE via AST type confusion. This is a test-time vulnerability but can compromise developer machines and CI/CD. Requires immediate ts-jest update.

### License Compliance
- **Status: COMPLIANT** — No GPL, AGPL, or viral licenses in either Backend or Frontend
- License distribution is heavily MIT-based (348 in Backend, 211 in Frontend)
- No unknown or UNLICENSED packages detected
- Safe for commercial use

### Package Manager Observations
1. **npm lock file version 3** — standard for npm 10+
2. **No post-install scripts** detected — good supply chain hygiene
3. **No duplicate major versions** — dependency resolution is clean
4. **Clean separation of prod/dev** — good practice maintained

### Tooling Notes
- `npm audit --json` provides comprehensive CVE data with CVSS scores
- `npm outdated --json` shows version gaps effectively
- License info available via `package-lock.json` entries (no need for license-checker tool if package-lock is recent)
- For transitive dependency tracing: `npm ls <package-name>` works well

### Version Update Policy Recommended
- **Security CVEs**: Fix within 48 hours (especially Critical/High)
- **Minor updates**: Plan within 2 weeks
- **Major version updates**: Quarterly review; requires testing
- **Deprecated packages**: Phase out over next 2-3 quarters

### Packages Requiring Ongoing Monitoring
1. **handlebars**: Watch for future RCE variants; keep ts-jest updated
2. **express**: Regular minor updates recommended; v5 is available but has breaking changes
3. **pino**: Currently 2 major versions behind (8.x vs 10.x); consider for next major sprint
4. **vite**: Frontend build tool ecosystem moves fast; check quarterly
5. **react**: Monitor for 19.x → 20.x upgrades; currently 1 major behind

### Discovered Deprecation Warnings (Non-Critical)
- `glob@7.2.3` — Old version; could migrate to Node.js native `fs.glob` or update
- `supertest@6.3.4` — Maintenance mode; upgrade to v7.1.3+ recommended
- `inflight@1.0.6` — Known memory leak; appears in test dependencies, consider removing if unused

### Audit Tool Findings
- npm audit is effective and provides good CVSS context
- JSON output is machine-readable and integrates well with dashboards
- Some vulnerabilities require code audit to determine exploitability (e.g., uuid v3/v5/v6 buffer overflow only if custom buf parameter used)

## Recommendations for Next Audit

1. **Automate scanning**: Set up GitHub Dependabot or Snyk for continuous monitoring
2. **Create a dependency update schedule**: e.g., "First Tuesday of each month"
3. **Cross-ref with TheGuardians**: Have them review handlebars RCE and uuid usage
4. **Document breaking changes**: When updating major versions, track API changes in a changelog
5. **Run audit in CI/CD**: Add `npm audit --audit-level=moderate` to pipeline to catch new vulns early

## Files Generated
- `Teams/TheInspector/findings/dependency-audit-2026-05-28.md` — Full audit report with remediation
- `Teams/TheInspector/findings/dependency-audit-2026-05-28.json` — Machine-readable summary for dashboards

