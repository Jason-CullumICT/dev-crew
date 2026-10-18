# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Latest Audit (2026-10-18)

**Overall Risk Level:** 🔴 HIGH (152 total CVEs, 10 critical)

### Critical Findings

1. **Vitest UI RCE (DEP-001):** Vitest >=2.0.0 <2.1.0 exposes UI server on localhost:51204 with arbitrary file read + execution. Impacts all projects using vitest for testing.
   - **Status:** Requires immediate npm update vitest
   - **Watch:** Ensure UI server never exposed to untrusted networks

2. **Jest CVE Cascade (DEP-007):** Jest <=30.2.0 pulls in 35+ high-severity vulnerabilities through babel-jest → babel/core, braces (ReDoS), jest-message-util (RCE). Source/Backend is affected.
   - **Status:** Requires major version bump to jest@30.5.2+
   - **Learning:** Jest is high-maintenance from security perspective. Consider vitest migration in future.

3. **OpenTelemetry gRPC Chain (DEP-006):** Auto-instrumentations-node @ >=0.40.0 pulls @grpc/grpc-js >=1.14.0 <1.14.5 with 4 CVEs:
   - Server crash from malformed requests (DoS)
   - Client/server crash from compressed messages (DoS)
   - Certificate validation bypass (AUTH BYPASS - critical)
   - Error message info disclosure
   - **Status:** Requires npm update @opentelemetry/auto-instrumentations-node
   - **Watch:** gRPC is heavily maintained; check releases frequently

4. **Proxy-Addr IPv4-Mapped IPv6 Spoofing (DEP-003):** Express (all versions) pulls proxy-addr. Versions <2.0.5 allow IP spoofing via IPv4-mapped IPv6, breaking trust_proxy logic (auth bypass).
   - **Status:** Requires npm update express to >=4.21.1
   - **Pattern:** This affects ALL Express users. Critical to verify after any express update.

5. **Protobufjs Code Execution (DEP-002):** Transitive via OpenTelemetry, allows unsafe deserialization RCE. Versions 6.0.0 to <7.2.5.
   - **Status:** Fixed by updating OpenTelemetry packages

### High-Severity CVEs Requiring Action

- **React Router Open Redirect (DEP-008):** @remix-run/router >=1.3.0 <1.23.3. Allows // protocol-relative redirect tricks. Affects Source/Frontend, portal/Frontend.
  - Fix: npm update react-router-dom (ensure >=6.22.3)

- **Vitest Path Traversal (DEP-009):** @vitest/mocker >=2.1.0 <4.1.11. Allows arbitrary file read via mocking. Affects Frontend projects.
  - Fix: npm update vitest to >=4.1.11

- **Babel Arbitrary File Read (DEP-011):** @babel/core <=7.29.0. Source map parsing allows file read.
  - Fix: Transitive; upgrading jest/vitest pulls newer babel

### Project Risk Assessment

| Project | Risk | Primary Issues | Recommendation |
|---------|------|-----------------|-----------------|
| Source/Backend | 🔴 CRITICAL | Jest CVE cascade (42 CVEs, 2 critical) | Update jest ASAP; test thoroughly |
| Source/Frontend | 🟡 HIGH | React Router redirect, Vitest path traversal | npm update react-router-dom, vitest |
| Source/E2E | 🟡 MEDIUM | Only 9 CVEs; minimal deps (good) | Keep as-is; low maintenance burden |
| platform/orchestrator | 🔴 CRITICAL | 61 CVEs total, gRPC auth bypass via OpenTelemetry | ALERT: gRPC cert validation bypass is AUTH RISK. Verify use case. If not using gRPC, consider decoupling. |
| portal/Backend | 🔴 CRITICAL | 23 CVEs, vitest critical RCE, OpenTelemetry high | Update vitest + OpenTelemetry immediately |
| portal/Frontend | 🟡 HIGH | 23 CVEs; vitest RCE, React Router redirect | Update vitest + react-router-dom |

### Audit Methodology

**Tools Used:**
- `npm audit --json` for each project (6 runs)
- Manual package.json inspection (version ranges)
- Lock file analysis (transitive dependency depth)

**Environment:**
- npm 10+ (supports `npm audit --json`)
- Node.js 18+ LTS (presumed, based on package.json "type": "module")
- 6 npm projects scanned; no Go/Python/Rust/Java projects

**Limitations:**
- `npm audit` only checks published CVEs (not private/0-days)
- Requires package-lock.json present (all 6 projects have it)
- Does not check for source code vulnerabilities ([SEE TheGuardians static-analyzer])

### Recommendations Going Forward

**Immediate Actions (This Sprint):**
1. npm update vitest (all projects)
2. npm update jest to 30.5.2+ (Source/Backend, major bump)
3. npm update express (all projects with express; verify proxy-addr >=2.0.5)
4. npm update @opentelemetry/* (portal/Backend)

**Next Sprint (P2):**
5. npm update react-router-dom (Frontend projects, ensure >=6.22.3)
6. Run full test suite after updates
7. Document OpenTelemetry gRPC usage and version constraints

**Strategic (Plan for Q1):**
8. Evaluate Jest vs Vitest: Jest has 35+ high-CVE chain; Vitest is lighter
9. Consider decoupling OpenTelemetry auto-instrumentation if gRPC not used (saves transitive deps)
10. Set up Dependabot/Renovate in CI for continuous monitoring
11. Add `npm audit` check to pre-commit hook or CI/CD

### Watch List (High-Churn Packages)

- `jest` - High CVE density; major version bumps required frequently
- `@opentelemetry/*` - Pulls large transitive tree (gRPC); frequent CVEs
- `@babel/core` - File read CVE; keep >=7.30.0
- `vitest` - UI server exposure risk; ensure >2.1.0
- `express` - Proxy-addr transitive dependency; critical auth risk
- `react-router-dom` - Open redirect risk; keep >=6.22.3

### License Compliance Status

**Finding:** No GPL/AGPL detected in manifest review. All dependencies appear to use permissive licenses (MIT, ISC, Apache-2.0, BSD-2-Clause).

**Recommendation:** Run `npx license-checker --json` quarterly to detect license drift.

### Supply Chain Risk Assessment

**Positive Signals:**
- ✅ Zero post-install scripts detected (good — no build-time surprises)
- ✅ No deprecated packages in direct dependencies
- ✅ Source/E2E has minimal deps (only @playwright/test)

**Risk Signals:**
- ⚠️ Portal/Backend has 11 direct production dependencies (larger attack surface than Source/Backend's 4)
- ⚠️ OpenTelemetry auto-instrumentation brings gRPC (55+ transitive packages)
- ⚠️ Jest and Vitest chains are large and frequently updated (>200 transitive each)
- ⚠️ Platform/orchestrator has 0 devDependencies but 50+ transitive (all gRPC-related)

**Mitigation:** Implement weekly `npm audit` checks in CI/CD. Consider peer dependency approach for some packages.

## Historical Patterns

_(First audit — add patterns over time as trends emerge)_

---

## Agent Notes

- **Auditor Model:** Haiku 4.5 (fast, efficient for static analysis)
- **Run Duration:** ~5 minutes for full 6-project scan
- **Next Scheduled Audit:** 2026-10-25 (weekly recommended for high-risk projects)
