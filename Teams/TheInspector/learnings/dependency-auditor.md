# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### CVE 2026-06-20 Audit

#### High-Risk Transitive Dependencies (Watch List)

1. **protobufjs** — Multiple code execution vulnerabilities
   - Latest vulnerable version: 7.5.5
   - Entry points: dockerode → @grpc/grpc-js → protobufjs
   - CVEs: GHSA-xq3m-2v4x-88gg (arbitrary code execution, CVSS 9.8), plus 7+ others
   - Recommendation: Require dockerode 5.0.0+ when using gRPC
   - Patches: 7.5.5 has a patch, but consider gRPC alternative SDKs

2. **@grpc/grpc-js** — DoS via malformed requests
   - Vulnerable range: 1.14.0 - 1.14.3
   - Recommendation: Update via dockerode or explicit version pin
   - CVEs: GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq (both CVSS 7.5)

3. **vite / vitest** — Rapid security evolution
   - vitest < 3.2.6: Critical UI RCE (GHSA-5xrq-8626-4rwp)
   - vite <= 6.4.2: Path traversal & CORS bypass (3 CVEs)
   - Recommendation: Check for updates every 4 weeks, vitest especially before releases
   - Policy: Use latest minor (not major) in stable releases, bump majors in dev

#### Outdated Packages Requiring Major Version Jumps

| Package | Current | Latest | Blocker | Notes |
|---------|---------|--------|---------|-------|
| express (orchestrator) | 4.21.0 | 5.2.1 | path-to-regexp ReDoS fix | Required for security |
| express (backend) | 4.18.2 | 5.2.1 | Same | Required for security |
| react | 18.3.1 | 19.2.7 | New APIs, hooks | Coordinate with product |
| vite | 5.4.0 | 8.0.16 | Path traversal CVEs | 3-major-version jump |
| vitest | 2.0.5 | 4.1.9+ | Critical RCE | Major version jump |
| dockerode | 4.0.4 | 5.0.0 | protobufjs RCE | Critical blocking issue |

#### License Review Summary
- ✅ No GPL/AGPL licenses detected
- ✅ All direct dependencies permissive (MIT/Apache-2.0)
- ✅ No UNLICENSED packages in direct graph
- Recommendation: Continue annual license audits; no immediate action needed

#### Dependency Complexity Observations
- **Frontend: 230 transitive from 13 direct** (17x multiplier)
  - Vite contributes ~98 deps
  - Vitest contributes ~80 deps
  - Testing libraries (~40 deps)
  - Recommendation: Evaluate tree-shaking effectiveness, consider lighter test framework
  
- **Backend: 411 transitive from 13 direct** (32x multiplier)
  - Jest ecosystem: ~250 deps (@babel, @jest/*, istanbul, etc.)
  - Recommendation: Migrate to vitest gradually to reduce bloat
  
- **Orchestrator: 155 transitive from 3 direct** (50x multiplier)
  - dockerode + gRPC = massive tree
  - Recommendation: Investigate Docker HTTP API alternatives

#### Audit Tools Verified
- ✅ `npm audit --json` — Works, comprehensive, includes CVSS scores
- ✅ `npm outdated --json` — Works, shows major version gaps
- ✅ `npm ls --json` — Works for transitive counting
- ❌ License-checker npm package — Not installed, but package.json review sufficient

#### Remediation Timeline Recommendations
1. **CRITICAL (48-72h):** dockerode, vitest UI RCE
2. **HIGH (1-2w):** react-router-dom, vite, express, form-data, ws
3. **MODERATE (2-4w):** Major version upgrades (react 19, express 5, pino 10)
4. **LOW (monthly):** Routine audits, document new CVEs in watch list

#### Next Audit Actions
- [ ] Schedule 2026-07-20 follow-up audit
- [ ] Verify Phase 1 (dockerode) deployed
- [ ] Verify Phase 2 (vitest, react-router) merged
- [ ] Track major version upgrades in progress board
- [ ] Monitor npm advisories for new vulns in watched packages
