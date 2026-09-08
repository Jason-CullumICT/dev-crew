# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-09-08

**Critical Vulnerabilities Identified:**
1. **handlebars (4.0.0-4.7.8)** — CRITICAL RCE via AST type confusion (GHSA-2w6w-674q-4c4q, CVSS 9.8)
   - Found in: Source/Backend (transitive, likely via @babel/core)
   - Status: REQUIRES IMMEDIATE UPGRADE
   - Fix: npm update handlebars to >=4.7.9

2. **vitest (<3.2.6)** — CRITICAL arbitrary file read/execution when UI server active (GHSA-5xrq-8626-4rwp, CVSS 9.8)
   - Found in: Source/Frontend (direct dev dependency, v2.0.5)
   - Status: DO NOT EXPOSE UI SERVER TO NETWORK
   - Fix: Upgrade vitest >=3.2.6 (requires vite >=7.x major upgrade)

3. **protobufjs (<=7.6.4)** — CRITICAL RCE via unsafe code generation (GHSA-xq3m-2v4x-88gg, CVSS 9.8)
   - Found in: platform/orchestrator (transitive via @grpc/grpc-js)
   - Status: BLOCKS PRODUCTION GRPC DEPLOYMENTS
   - Fix: Upgrade protobufjs >=7.7.0 AND @grpc/grpc-js >=1.14.4

**High-Risk Transitive Dependencies (Watch List):**
- browserslist (<=4.28.6) — unbounded memory growth OOM risk
- form-data (4.0.0-4.0.5) — CRLF injection in multipart
- js-yaml (<3.15.1) — quadratic CPU DoS via merge-key chains
- nanoid (<3.3.18) — infinite loop on zero-size generators
- postcss (<=8.5.22) — path traversal via sourceMappingURL
- ws (8.0.0-8.20.1) — memory exhaustion from tiny fragments

**Outdated Major Versions (Priority Fix Order):**
1. **uuid** (9.0.0 → 14.0.2) — +5 major versions, likely security fixes
2. **pino** (8.17.0 → 10.3.1) — +2 major versions
3. **express** (4.18/4.21 → 5.2.1) — standardize across Backend/Orchestrator
4. **react/react-dom** (18.3.1 → 19.2.8) — +1 major, breaking changes expected
5. **react-router-dom** (6.26.0 → 7.18.3) — +1 major, multiple open-redirect CVEs in current version
6. **dockerode** (4.0.4 → 5.0.1) — +1 major
7. **multer** (1.4.5-lts.1 → 2.3.0) — +1 major

**Dependency Tree Metrics:**
- Backend: 411 total (6 direct, 405 transitive)
- Frontend: 230 total (8 direct, 222 transitive)
- Orchestrator: 155 total (3 direct, 152 transitive)
- **Combined: 796 transitive dependencies = large attack surface**

**Findings:**
- No deprecated packages detected ✓
- No post-install scripts detected ✓
- License compliance clean (no GPL/AGPL in third-party) ✓
- No single-maintainer high-risk packages detected ✓
- Version skew detected: express (4.18 vs 4.21 in same codebase) — standardize

**Escalations:**
- [ESCALATE → TheGuardians] for all 3 P1 CVEs (build-time + network-exposed RCE)
- [NOTE → TheFixer] for major version upgrades and transitive dep patching

**Tools Available in This Environment:**
- ✓ npm audit (direct, accurate)
- ✓ npm outdated
- npm ls (to inspect tree)
- No license-checker needed (manual inspection sufficient for small projects)
- No govulncheck (no Go modules detected)
- No pip-audit (no Python modules detected)

**Audit Confidence:** HIGH (npm audit official, verified with npm outdated and direct package.json inspection)
