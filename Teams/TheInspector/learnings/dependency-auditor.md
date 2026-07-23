# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Summary (2026-07-23)

### Critical Vulnerabilities Identified
- **3 critical CVEs** found across the codebase (handlebars, vitest, protobufjs)
- **6 high-severity CVEs** (form-data CRLF injection, brace-expansion DoS, vite SSRF, gRPC crashes, etc.)
- **Source/Backend:** 9 CVEs (1 critical, 3 high)
- **Source/Frontend:** 11 CVEs (1 critical, 3 high)
- **platform/orchestrator:** 9 CVEs (1 critical, 2 high)
- **Source/E2E:** Clean (no vulnerabilities)

### Watch List (Known Vulnerable Packages in This Codebase)
1. **handlebars** ≤4.7.8 — JavaScript injection via AST type confusion (CRITICAL)
   - Present in: Source/Backend (indirect)
   - Fix: `npm update handlebars`
   - Status: Requires immediate patching

2. **vitest** ≤3.2.5 — Arbitrary file read/execution via UI server (CRITICAL)
   - Present in: Source/Frontend (direct)
   - Fix: `npm update vitest` (≥3.2.6 or ≥4.1.10)
   - Status: Dev-time risk, high priority

3. **protobufjs** ≤7.6.4 — Arbitrary code execution in code generation (CRITICAL)
   - Present in: platform/orchestrator (indirect via @grpc/grpc-js)
   - Fix: `npm update protobufjs`
   - Status: Requires immediate patching if processing untrusted protobuf

4. **@grpc/grpc-js** 1.14.0-1.14.3 — Server crash via malformed requests (HIGH)
   - Present in: platform/orchestrator
   - Fix: `npm update @grpc/grpc-js`

5. **form-data** 4.0.0-4.0.5 — CRLF injection in headers (HIGH)
   - Present in: Source/Backend, Source/Frontend (indirect)
   - Fix: `npm update form-data`

### Dependency Tree Health
- **Source/Backend:** 412 transitive deps (high complexity)
- **Source/Frontend:** 231 transitive deps (moderate complexity)
- **platform/orchestrator:** 156 transitive deps (acceptable)
- **Observation:** Large transitive dependency trees increase supply chain risk

### Tools Available
- ✅ npm audit — fully functional for all npm packages
- ✅ npm outdated — identifies version gaps
- ✅ Manual license scanning (no GPL/AGPL found)
- ✅ No postinstall script detection tools needed (none found)

### License Decisions
- All direct dependencies use permissive licenses (MIT, ISC, Apache-2.0)
- No GPL/AGPL viral license issues identified
- No UNLICENSED or unknown license dependencies

### Remediation Status
**As of 2026-07-23:**
- [ ] CRIT-001 (Handlebars) — Pending
- [ ] CRIT-002 (Vitest) — Pending
- [ ] CRIT-003 (Protobufjs) — Pending
- [ ] HIGH severity packages — Pending

### Recommendations for Future Audits
1. **Frequency:** Quarterly minimum; monthly if accepting user-supplied templates/protobuf
2. **Scope:** Include all 4 projects plus demo/portal subdirectories
3. **Focus areas:**
   - Monitor Express ecosystem for future qs/body-parser vulnerabilities
   - Track React 18→19 upgrade (when major version gap widens)
   - Plan React Router 6→7 migration (breaking changes expected)
   - Watch Vitest releases for security patches beyond UI server fix
4. **Escalation triggers:**
   - Any NEW critical or high CVE in a direct dependency
   - Any dependency with no updates in >2 years
   - New minor version releases of Express/React/Vitest

### Session Notes
- No postinstall scripts detected (supply chain relatively clean)
- Dependency duplication at transitive level is normal, not critical
- Handlebars is NOT directly required; appears via indirect transitive dependency
- Vitest is dev-only; test runner exposure to untrusted networks is the risk
- gRPC/protobufjs ecosystem is critical for orchestrator; patch immediately
