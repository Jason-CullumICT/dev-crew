# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### First Audit Run (2026-11-19)

**Critical Infrastructure Findings:**
- platform/orchestrator is ALL production dependencies (no dev/test separation)
- Orchestrator has 2 CRITICAL + 3 HIGH vulnerabilities
  - protobufjs code injection (GHSA-66ff-xgx4-vchm)
  - gRPC server crash + auth bypass (GHSA-5375-pq7m-f5r2, GHSA-m9gg-hp2v-232j)
  - body-parser DoS + path-to-regexp ReDoS (via express dependency)
- **Action Required:** Immediate update to @grpc/grpc-js ≥1.14.5, protobufjs ≥7.5.6, express ≥4.22.0

**Backend Issues:**
- pino is 2 major versions behind (8.17.0 → 10.4.0)
- uuid is 5 major versions behind (9.0.0 → 14.0.3)
- Both should be prioritized for updates

**Frontend Issues:**
- 17 total CVEs including 7 high-severity
- React ecosystem outdated (1 major behind): react 18→19, react-dom 18→19, react-router-dom 6→7
- Multiple build toolchain CVEs: postcss, browserslist, nanoid, form-data
- Plan React major version upgrade separately

**Audit Tools Available:**
- npm audit —json (working, provides detailed CVE info)
- npm outdated —json (working, provides version comparisons)
- npx license-checker —json (working, but all projects are UNLICENSED/private)
- No Go/Python/Rust projects detected in this codebase

**CI/CD Recommendation:**
- Add npm audit gate to pipeline with:
  - Fail on critical CVEs
  - Warn on high CVEs
  - Audit all three projects (backend, frontend, orchestrator)
- Consider npm audit fix automation for patch-level updates
- Track "days since last audit" to catch regressions

**Watch List (Recurring CVEs):**
- brace-expansion: Multiple DoS CVEs across versions <1.1.21 (5+ related CVEs)
- body-parser: DoS vulnerabilities keep appearing in older versions
- postcss: Repeated file-read CVEs even after fixes (incomplete patches)
- Protobuf ecosystem: Multiple injection/DoS issues across versions

**Escalation Pattern:**
- Code injection + auth bypass issues → route to TheGuardians
- DoS in infrastructure → route to TheGuardians
- Outdated packages without clear CVEs → route to TheFixer
- License compliance issues → route to requirements team
