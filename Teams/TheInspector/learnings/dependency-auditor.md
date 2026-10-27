# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-27

### Critical Findings

**Recurring CVEs (Watch List):**
- `proxy-addr` (GHSA-jqcg-44mw-7w3h): IP spoofing via IPv4-mapped IPv6 — affects ALL projects via Express
- `vitest` (GHSA-5xrq-8626-4rwp): Arbitrary file access when UI server listening — frontend projects
- `body-parser` (GHSA-27r3-jxmh-p828): DoS via compressed request bodies — backend projects

**Outdated Major Versions (Requiring action):**
- `express`: 4.18.2 → upgrade to 4.22.3+ (minor) or 5.3.0+ (major)
- `pino`: 8.17.0 → 10.4.0+ (2+ major versions behind)
- `uuid`: 9.0.0 → 14.0.3+ (5+ major versions behind)
- `vitest`: 2.0.5 / 4.1.10 → 5.0.5+ (breaking changes)

### Packages with Recurring Issues
1. **OpenTelemetry ecosystem** (portal/Backend): Multiple transitive CVEs in @opentelemetry/* packages
2. **Vite/Vitest stack** (frontend): Critical security issues; recommend moving to Vite 8.3.5+
3. **Express middleware chain**: proxy-addr, body-parser, qs all have recent CVEs

### License Compliance Decision
✓ **All projects COMPLIANT** — No GPL/AGPL detected. Mix of MIT/Apache/ISC is safe for commercial use.

### Audit Tools Available in Environment
- `npm audit --json`: ✓ Available in all Node.js projects
- `npm outdated --json`: ✓ Available (Source/Backend confirmed)
- `license-checker`: Not tested (would require separate tool)

### Remediation Checklist
- [ ] Phase 1 (48h): Update express, vitest, test in CI/CD
- [ ] Phase 2 (1w): Update react-router-dom, uuid, audit brace-expansion
- [ ] Phase 3 (2w): Vite breaking change upgrade, pino major version
- [ ] Phase 4 (month-end): Set up Dependabot/Renovate for ongoing updates

### Lessons Learned
1. **Dependency tree health**: portal/Frontend has 424 transitive deps (approaching P4 threshold of 500)
2. **Major version lag**: When packages fall 2+ major versions behind, security patches accumulate
3. **Vitest in dev workflow**: Critical security issue requiring UI server never exposed to untrusted networks
4. **Express ecosystem**: Proxy-addr CVE affects all Express apps — monitor Express release notes closely

### Next Audit Recommendations
- Scan again post-remediation to verify all CVEs resolved
- Establish monthly dependency audit cadence
- Monitor GitHub Security Advisories for these packages
- Pin critical package versions in lockfiles to avoid transitive updates
