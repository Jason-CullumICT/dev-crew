# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-11-28

#### Critical Findings Pattern
- **Vitest RCE via tinypool:** Direct dependency vulnerability, requires major version update (v2→v5)
- **Handlebars JavaScript injection:** Transitive via babel, affects templating. Multiple CVEs in 4.0.0-4.7.9 range
- **Proxy-addr IP spoofing:** Transitive via express, requires 2.0.8+. Affects all three backend projects
- **Protobufjs arbitrary code execution:** Transitive via @grpc/grpc-js, multiple prototype pollution gadgets

#### High-Risk Projects
1. **portal/Backend:** 653 total dependencies (highest risk surface)
2. **portal/Frontend:** 474 dependencies, 416 dev (46x dev:prod ratio!)
3. **Source/Frontend:** Direct vitest vulnerability requires immediate attention

#### Supply Chain Observations
- ✅ No post-install scripts (positive)
- ⚠️ portal/Frontend has unusually high dev:prod ratio (25-46x)
- ⚠️ uuid pinned at 9.0.0 while latest is 14.0.3 — verify if intentional
- ✅ No abandoned packages in direct dependencies
- ✅ License compliance clean (no GPL/AGPL in prod)

#### Outdated Versions to Watch
- **pino:** 2 majors behind (8.17.0 → 10.4.0) — SECURITY RISK
- **React, Express, Router:** 1 major behind — breaking changes on update
- **uuid:** 5 majors behind — UNUSUAL, check team intent

#### Audit Tool Availability
- ✅ npm audit (native) — works on all projects
- ✅ npm outdated (native) — works
- ✅ npm ls (native) — works
- ❌ license-checker — not installed, but can read package.json license fields
- ❌ govulncheck, pip-audit — not applicable (npm only)

#### Recommended Audit Cadence
- **Weekly:** Run `npm audit` in CI for new CVE detection
- **Monthly:** Manual review of P3 (moderate) findings
- **Quarterly:** Major version update assessment
- **Annually:** License compliance audit, abandoned package check

#### Findings to Escalate
- Vitest/tinypool RCE → TheGuardians (if UI was exposed)
- Handlebars template injection → TheGuardians (if untrusted input processed)
- Protobufjs RCE → TheGuardians (if gRPC messages processed)
- Proxy-addr IP spoofing → TheGuardians (if IP-based access control in use)
