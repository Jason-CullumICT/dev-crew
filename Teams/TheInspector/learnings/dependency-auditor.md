# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-10

### Critical Findings (P1)
1. **Vitest RCE (GHSA-5xrq-8626-4rwp)**: Arbitrary file read/execute when UI server is listening
   - Affects: Source/Frontend@2.0.5, portal/Frontend
   - Root cause: Vitest UI server (--ui) exposes project files to network
   - Mitigation: Disable UI in production; bind to localhost; upgrade to v4.1.10+
   - Impact: HIGH if vitest --ui exposed to network

2. **Protobufjs RCE (GHSA-xq3m-2v4x-88gg)**: Arbitrary code execution via unsafe code generation
   - Affects: platform/orchestrator (transitive via @grpc/grpc-js)
   - Root cause: Unsafe code generation from untrusted proto definitions
   - Mitigation: Upgrade dockerode from 4.0.4 → 5.0.1 (breaks API, requires testing)
   - Impact: CRITICAL for orchestrator (handles Docker API)
   - Blocker: Major version bump required; has dependent code changes

### High-Severity Watch List
- **Vite** (5.4.0): Path traversal in .map handling + fs.deny bypass on Windows
- **form-data** (4.0.0-4.0.5): CRLF injection in multipart field names
- **ws** (8.x): Uninitialized memory disclosure + DoS from tiny fragments
- **react-router-dom** (6.26.0): Protocol-relative URL open redirect (fix: 6.30.4+)
- **@grpc/grpc-js** (1.14.0-1.14.3): DoS on malformed/compressed messages
- **path-to-regexp**: ReDoS on routes with multiple parameters

### Outdated Majors (Upgrade Planning)
- **Backend**: express (4.18→5.2, 1 major), pino (8.17→10.3, 2 majors), uuid (9.0→14.0, 5 majors)
- **Frontend**: react/react-dom (18.3→19.2, 1 major), react-router-dom (6.26→7.18, 1 major)
- **Orchestrator**: dockerode (4.0→5.0, 1 major — blocks protobufjs fix), express (4.21→5.2), multer (1.4→2.2)

**Recommendation**: Prioritize dockerode upgrade to unblock protobufjs fix. React upgrade can wait (UI functionality).

### License Compliance
- No GPL/AGPL licenses detected in direct dependencies
- All major deps use MIT or Apache-2.0 (permissive, commercially compatible)
- No "UNLICENSED" packages found

### Supply Chain Risks (Low)
- No single-maintainer risk for critical packages (express, react, vite all institutional)
- No deprecated packages in current versions
- No suspicious post-install scripts
- All packages have high weekly download counts (>10M)

### Tools Available
- `npm audit --json` — reliable, uses npm advisory DB (lag time possible)
- `npm outdated --json` — reliable
- Lock file analysis — limited to transitive count (need npm install for tree)
- `npm install` required for license-checker in this environment

### Next Steps
1. Establish monthly audit cadence (via CI/CD gate)
2. Add `npm audit` + auto-fix to pre-commit or merge-gate
3. Plan quarterly major version upgrades (express, react, pino)
4. Document dockerode upgrade path + testing checklist (blocks protobufjs fix)
5. Create runbook for responding to future CVE disclosures

### Escalations Made
- [TheGuardians] DEP-001 (Vitest RCE): UI server exposure assessment
- [TheGuardians] DEP-002 (Protobufjs RCE): Orchestrator gRPC/proto usage assessment
- [TheGuardians] DEP-003 (Vite path traversal): Dev server security posture
- [TheFixer] Outdated major versions: Migration planning
