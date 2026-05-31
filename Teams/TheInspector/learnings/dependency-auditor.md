# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run 2026-05-31: First Comprehensive Audit

### Critical Findings (Watch List)

**Handlebars** (Source/Backend)
- 8 CVEs including RCE via AST type confusion (CVSS 9.8)
- Likely used for server-side template rendering
- Upgrade path: 4.7.8 → 4.7.9+ (patch available)
- Status: NEEDS IMMEDIATE ACTION

**Protobufjs** (portal/Backend)
- 9 CVEs including arbitrary code execution (CVSS 9.8)
- Pulled in via OpenTelemetry SDK for trace deserialization
- Upgrade path: 7.5.7 → 7.6.0+ (patch available)
- Status: NEEDS IMMEDIATE ACTION
- Note: Check if tracing still works after upgrade (protobuf schema changes can break)

### High-Risk Patterns

1. **OpenTelemetry version lag** (portal/Backend)
   - auto-instrumentations-node: 0.40.0 (should be 0.75+)
   - sdk-node: 0.47.0 (should be 0.217+)
   - Prometheus exporter vulnerable to DoS crashes
   - Action: Update entire OT stack to latest

2. **Build tool chain outdated** (Source/Frontend)
   - vite@5.4.0 (should be 8.0.14+, 3 major versions behind)
   - vitest@2.0.5 (should be 4.1.7+, 2 major versions behind)
   - Multiple CVEs in build tools affecting dev-time security
   - Impact: Dev environment vulnerable, not production

3. **UUID library** (all workspaces)
   - 9.0.0 (should be 11.1.1+)
   - Buffer bounds check missing when external buffer provided
   - Semantic version constraint `^9.0.0` prevents auto-upgrade
   - Action: Explicit major bump to ^11.0.0 in all workspaces

### Audit Findings by Workspace

| Workspace | Status | Key Issues | Action |
|-----------|--------|-----------|--------|
| Source/Backend | RED | Handlebars RCE | Priority 1 |
| Source/Frontend | YELLOW | Vite/Vitest outdated | Priority 2 |
| Source/E2E | GREEN | None | Monitor |
| portal/Backend | RED | Protobufjs RCE, OT DoS | Priority 1 |

### Dependency Graph Insights

- **Total transitive deps:** ~1,200+
- **Largest workspace:** portal/Backend with 577 total deps
- **Red flags:** 
  - Multiple CVEs in same package (handlebars, protobufjs = upgrade critical)
  - Version mismatch across OT ecosystem (indicates stale base)
  - Build tools consistently lagging (less urgent, dev-only)

### Audit Tools Available

✅ `npm audit --json` works in all workspaces  
✅ `npm outdated --json` works  
⚠️ No `license-checker` pre-installed; recommend quarterly audit with `npx license-checker`  
⚠️ No `govulncheck` (Go) detected; project is npm-only  

### Recurring Patterns to Watch

1. **Handlebars:**
   - High-severity template engine
   - Used in backend (confirm with code review)
   - Needs quarterly CVE checks

2. **Protobufjs:**
   - RCE risk in telemetry path
   - Upgrade carefully; test tracing after update
   - Flag if OpenTelemetry upgrades pull in older protobufjs

3. **OpenTelemetry ecosystem:**
   - Rapid release cadence (0.40 → 0.75+ = significant gap)
   - Worth quarterly update sweep to stay within 2-3 minor versions
   - Dependencies on protobufjs, qs, uuid (coordinate upgrades)

### Next Audit (2026-08-31, projected)

- Rerun `npm audit` in all 4 workspaces
- Check: Have handlebars, protobufjs upgrades been applied?
- Check: Build tools still 3+ major behind?
- Check: License compliance changes?

### License Compliance Summary

- ✅ No GPL/AGPL detected (no viral license risk)
- ✅ All major deps have standard licenses (MIT, BSD, Apache)
- ⚠️ Full transitive tree not checked at scale
- Recommendation: `npx license-checker --json > licenses.json` quarterly
