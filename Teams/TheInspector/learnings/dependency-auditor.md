# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-28

### Critical Vulnerabilities (Watch List)

1. **vitest**: GHSA-5xrq-8626-4rwp (RCE when UI server exposed)
   - Affects: Source/Frontend, portal/Backend, portal/Frontend
   - Fix: Upgrade to ≥3.2.6 (major bump for some projects)
   - Status: **REQUIRES IMMEDIATE ACTION**

2. **protobufjs**: GHSA-gx4f-cqfv-7h5q (arbitrary code execution)
   - Affects: platform/orchestrator, portal/Backend
   - Fix: Upgrade to latest (requires verification)
   - Status: **CRITICAL — only in orchestrator/portal backend**

3. **vite**: GHSA-fx2h-pf6j-xcff (fs.deny bypass on Windows)
   - Affects: Source/Frontend, portal/Frontend
   - Fix: Upgrade to ≥5.5.0 or ≥8.2.2
   - Status: **P2 — dev-time only, not production**

### Recurring CVE Patterns

- **Denial of Service via exponential expansion:** brace-expansion, js-yaml (multiple CVEs each)
  - Root cause: Parsing untrusted input without iteration bounds
  - Mitigation: Keep build tools (jest, vitest) updated

- **Memory exhaustion from tiny fragments:** WebSocket (ws), nanoid
  - Root cause: No request/message size limits
  - Mitigation: Set `maxPayload` in ws config, validate generator inputs

- **Query string parsing DoS:** qs library
  - Root cause: Recursive object construction from user input
  - Affects all express projects via body-parser
  - Action: Keep qs updated

### Outdated Dependency Tracking

**Major version gaps:**
- uuid: 9.x → 14.x (5+ majors behind) — has breaking API changes
- express: 4.x → 5.x (1 major) — stable for most projects
- react: 18.x → 19.x (1 major) — worth evaluating for upgrade

**Recommendation:** Plan React upgrade in next sprint (small team).

### License Compliance Decisions

✓ All direct dependencies use standard OSS licenses
✓ No GPL/AGPL concerns
✓ Safe for commercial use

**Future:** Monitor for unexpected license changes in minor updates.

### Audit Tools Available in This Environment

- `npm audit --json` ✓ (all projects)
- `npm outdated --json` ✓ (works, exit code 1 if updates available)
- `npm list --depth=0 --json` ✓ (for manual license checks)
- `license-checker` ✗ (not installed, skipped)

### Supply Chain Risk Profile

**Dependency tree size:** 1,400+ transitive deps across projects
- **Backend/Frontend**: 410+ each (high dev tooling)
- **E2E**: 5 (minimal, clean)
- **Orchestrator**: 156 (moderate, infrastructure use)

**Risk factors:**
- Frontend projects heavily depend on Vite/Vitest ecosystem
- OpenTelemetry stack in portal/Backend adds 100+ indirect deps
- All projects share express/body-parser (coordinate updates)

### Next Audit (Recommended)

Run monthly or after major dependency updates. Focus on:
1. vitest major version upgrade path (3.x → 4.x)
2. React 19.x stability assessment
3. OpenTelemetry module synchronization in portal
4. Orchestrator protobufjs version pinning

### Related Findings from Other Inspectors

- [TODO: Cross-ref when TheGuardians completes security-review]
- [TODO: Cross-ref performance-profiler if large deps impact startup time]
