# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Results (2026-11-04)

### Critical Findings Identified

**Total Vulnerabilities: 58** across Backend (32), Frontend (17), Orchestrator (9), E2E (0)

#### Critical CVEs Requiring Immediate Action:
1. **proxy-addr IP Spoofing (GHSA-jqcg-44mw-7w3h)** - P1
   - Transitive via express in Backend & Orchestrator
   - IPv6-mapped IPv4 spoofing can bypass access controls
   - Fix: Update express to latest

2. **Handlebars Code Injection (GHSA-3mfm-83xf-c92r)** - P1
   - Backend transitive via jest/babel
   - AST type confusion allows arbitrary JS injection
   - Fix: Update handlebars > 4.7.8

3. **Tinypool RCE via Prototype Pollution (GHSA-5gmw-xhrv-c9v3)** - P1
   - Frontend transitive via vitest
   - Prototype pollution in worker options
   - Fix: Update vitest to latest (>= 3.0 when available)

4. **protobufjs RCE (GHSA-xq3m-2v4x-88gg)** - P1
   - Orchestrator infrastructure (gRPC)
   - Arbitrary code execution vulnerability
   - Fix: Update @grpc/grpc-js to >= 1.14.5

5. **Vite Path Traversal (DIRECT)** - P2
   - Source/Frontend/package.json: vite ^5.4.0
   - Direct dependency - MUST UPDATE immediately
   - Fix: Update vite to ^5.5.0+

### Package Manager Detection
- **npm** projects found: 4 active (Backend, Frontend, E2E, Orchestrator)
- **No Go/Python/Rust/Java** projects detected

### Dependency Metrics
- Backend lock file: ~5353 lines (large supply chain)
- Frontend lock file: ~2901 lines (moderate supply chain)
- E2E tests: ~75 lines (minimal, 0 vulnerabilities)
- Orchestrator: Critical infrastructure with 9 vulnerabilities

### Watch List (Recurring Issues)
- **express**: Multiple transitive vulns (proxy-addr, body-parser, form-data)
  - Recommendation: Update to v5.x when breaking changes acceptable
- **jest**: High dependency overhead + transitive CVEs (brace-expansion, browserslist)
  - Consider vitest migration for lighter test framework
- **vitest**: Has RCE via tinypool - prioritize updates

### License Compliance
- ✅ No GPL/AGPL in direct dependencies
- ✅ All direct deps have clear licenses
- No license blockers identified

### Abandoned Package Risk
- ✅ No abandoned packages (all vulns from actively maintained libs)
- Packages are current and receiving security patches

### Escalation Recommendations
All 4 critical CVEs should be escalated to **TheGuardians** for security context review:
- Access control bypass risk (proxy-addr)
- Code injection risk (handlebars)
- RCE risks (tinypool, protobufjs)

### Next Steps (For Team)
1. TheGuardians to assess exploitation likelihood in application context
2. Review express upgrade path for Backend/Orchestrator (check for breaking changes)
3. Plan vitest/vite updates for Frontend
4. Establish quarterly CVE scanning and Dependabot automation
5. Monitor orchestrator infrastructure stability after updates
