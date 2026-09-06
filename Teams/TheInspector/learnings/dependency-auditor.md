# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-06

### Critical Vulnerabilities Requiring Immediate Patches

1. **Vitest (<3.2.6)** - GHSA-5xrq-8626-4rwp
   - Arbitrary file read/execution via UI server
   - Affects: Source/Frontend (^2.0.5), portal/Frontend (^1.4.0)
   - Fix: Major version upgrade required to 3.2.6+
   - Status: **CRITICAL - HIGH PRIORITY**

2. **Handlebars (4.0.0-4.7.8)** - GHSA-2w6w-674q-4c4q (CVSS 9.8)
   - JavaScript injection via AST type confusion
   - Affects: Source/Backend (transitive)
   - Fix: Update to 4.7.9+
   - Status: **CRITICAL - REQUIRES AUDIT FIRST**

3. **Protobufjs (<=7.6.4)** - GHSA-xq3m-2v4x-88gg (CVSS 9.8)
   - Arbitrary code execution in protobuf parsing
   - Affects: platform/orchestrator (transitive)
   - Plus 11 additional high/moderate CVEs
   - Fix: Update @opentelemetry/sdk-node to 0.222.0+
   - Status: **CRITICAL - INFRASTRUCTURE RISK**

4. **@opentelemetry/auto-instrumentations-node (<=0.76.0)**
   - Direct: High severity + 50+ transitive moderate CVEs
   - Affects: portal/Backend (^0.40.0, outdated by 40+ versions)
   - Fix: Update to 0.80.0+
   - Status: **CRITICAL - CASCADING VULNERABILITIES**

### Watch List (Recurring Issues)

- **Babel/Webpack toolchain:** Multiple source map-based CVEs (@babel/core, postcss, vite)
  - Pattern: Attacker-controlled source maps can leak source code or execute code
  - Recommendation: Quarterly audit of build tool versions

- **OpenTelemetry ecosystem:** Extremely outdated (175+ minor versions behind in some packages)
  - Pattern: Auto-instrumentation package brings in 50+ dependencies
  - Recommendation: Separate upgrade cycle; plan quarterly updates

- **Frontend routing:** React Router has 3 open redirect CVEs
  - Recommendation: Update to 7.18.0+ or backport patches

### License Compliance Decision Log

- **No GPL/AGPL dependencies found** — Good!
- **MIT license dominant** — Standard, permissive, no viral risk
- **Unknown licenses:** Recommend installing `license-checker` tool

### Audit Tools Available in This Environment

✅ **npm audit** — Works for npm projects (used successfully)  
✅ **npm outdated** — Works but requires lock file for full output  
❌ **license-checker** — Not installed; recommend installing  
❌ **govulncheck** — Not needed (no Go in this project)  
❌ **pip-audit** — Not needed (no Python in this project)  

### Supply Chain Risk Assessment

**Status:** HIGH RISK
- 1,400+ transitive dependencies across 6 npm projects
- Duplicate major versions of critical packages (protobufjs, @opentelemetry/*)
- Recommendation: Implement dependency deduplication strategy
- Recommendation: Quarterly supply chain audits

### Known Abandoned/Deprecated Packages

- **None identified yet** — None of the flagged packages are marked deprecated in npm registry
- Note: Monitor Handlebars (0 commits in last year — potential abandonment sign)

### Mitigation Checklist for Next Audit

- [ ] Verify all P1 fixes applied in production
- [ ] Test React Router 6.30.5+ upgrade (fixes 3 CVEs)
- [ ] Test Vitest 3.2.6+ upgrade (fixes arbitrary file read)
- [ ] Test OpenTelemetry SDK Node 0.222.0+ upgrade
- [ ] Run license-checker tool (install if needed)
- [ ] Audit handlebars usage — is it actually needed?
- [ ] Plan React 19 migration (1 major version behind)
- [ ] Plan React Router 7 migration (1 major version behind, plus CVEs)
- [ ] Coordinate with platform team on dockerode + uuid update

### Cross-Team Dependencies

- **TheGuardians (red-teamer):** Needs to assess exploitability of Handlebars, Protobufjs, PostCSS, React Router
- **TheFixer:** Needs to patch all P1/P2 CVEs and coordinate dependency updates
- **Platform Team:** Needs to update orchestrator dependencies (dockerode, protobufjs, OpenTelemetry)

---

## Summary

**Previous Runs:** None (first audit)  
**Total CVEs Found (Cumulative):** 54  
**Critical CVEs:** 4  
**Most Common CVE Type:** Denial of Service (DoS) via algorithmic complexity  
**Most Common Affected Layer:** Dev dependencies (build tools, test runners)  
**Most Critical Package:** Vitest (arbitrary file read/execution)
