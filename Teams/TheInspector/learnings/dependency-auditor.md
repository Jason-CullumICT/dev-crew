# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Critical Watch List
- **handlebars@4.7.8**: Multiple critical JavaScript injection CVEs (CVSS 9.8). Found as transitive in Source/Backend. Fix: Update to >=4.7.9
- **path-to-regexp**: ReDoS vulnerability in platform/orchestrator (CVSS 7.5). Fix: Update to >=0.1.13
- **brace-expansion**: Memory exhaustion via DoS (CVSS 6.5). Transitive in Backend. Fix: Update to >=1.1.13

### Audit Tools Available
- **npm audit --json**: Available on all npm projects ✓
- **npm outdated --json**: Available for version checking ✓
- **license-checker**: Available via npx ✓
- **Go modules**: Not used (no go.mod files detected)
- **Python**: Not used (no requirements.txt files detected)

### License Decisions
- **GPL/AGPL licenses**: None detected in direct dependencies
- **Recommendation**: Continue monitoring for viral licenses
- **Current status**: MIT, Apache 2.0, BSD predominate (all permissive)

### Dependency Supply Chain Metrics
- **Total projects audited**: 6 (Backend, Frontend, E2E, orchestrator, portal-Backend, portal-Frontend)
- **Total dependencies**: ~2,800+ transitive
- **Critical dependency**: handlebars (transitive in Backend) - likely from jest or babel toolchain
- **Supply chain surface**: Large (>2500 packages = significant attack surface)

### Prior CVE Findings
- **First audit run (2026-04-15)**: 
  - 1 critical (handlebars JavaScript injection)
  - 2 high (path-to-regexp ReDoS, brace-expansion)
  - 13 moderate (vite ecosystem)
  - 0 low
  - **Total: 16 CVE findings**
- **Status**: 2 P1 findings require immediate escalation to TheGuardians

### Next Run Checklist
1. ✓ Detect npm projects (6 detected)
2. ✓ Run npm audit on each
3. ✓ Check npm outdated for major version gaps
4. ✓ Run license-checker
5. ✓ Cross-reference with CLAUDE.md for critical modules
6. ✓ Escalate security findings to TheGuardians
7. ✓ Report findings with cross-refs to other specialists
8. ✓ Update learnings (this file)
