# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run 2026-11-01: dev-crew

**Critical Packages Under Watch (CVE Hotspots):**
- `handlebars` - 8+ CVEs stacked; consider replacing with lighter template engine (ejs, mustache)
- `protobufjs` - 10+ CVEs; evaluate buf.build ecosystem as alternative
- `proxy-addr` - Critical auth bypass via IPv6-mapped IPv4; affects all Express apps
- `vitest` + `tinypool` - Multiple RCE vectors in test infrastructure

**Major Version Gaps Requiring Upgrades:**
- `express`: 4.18.2 → 5.3.0 (1 major, CRITICAL security fixes)
- `react-router-dom`: 6.26.0 → 7.18.5 (1 major, multiple open redirects fixed)
- `vite`: 5.4.0 → 8.3.5 (3 majors, path traversal & execution bugs)
- `vitest`: 2.0.5 → 5.0.5 (3 majors, arbitrary file read fixes)
- `uuid`: 9.0.0 → 14.0.3 (5 majors, buffer bounds security)

**Dependency Tree Risk Pattern:**
- dev-crew monorepo: 600+ transitive dependencies
- Frontend testing stack (Jest → vitest) cascades vulnerabilities
- Orchestrator pulls in gRPC ecosystem (protobufjs, @grpc/grpc-js) with high CVE density

**Audit Tool Availability:**
- `npm audit --json` works reliably (returns JSON even on failure, exit code 1)
- `npm outdated --json` works reliably
- `npx license-checker --json` NOT available in default npm environment; may need pre-install in CI

**Remediation SLA Recommendation:**
- CRITICAL findings: 24-48 hours
- HIGH findings: 1-2 weeks
- MODERATE: 30 days
- Re-audit interval: 14 days

**Escalation Patterns:**
- Template injection (handlebars) → TheGuardians security review
- RCE (protobufjs, vitest) → TheGuardians security review
- Auth bypass (proxy-addr, IP spoofing) → TheGuardians security review
- Dependency updates (all packages) → TheFixer code changes

**Failed Discovery Attempts:**
- License checking skipped (license-checker not pre-installed)
- Recommend adding to CI pipeline pre-audit step
