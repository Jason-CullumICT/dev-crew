# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-01

### Critical Findings

**High-Risk CVE Patterns (watch list):**
- `protobufjs <7.5.5`: Arbitrary code execution via .proto deserialization (GHSA-xq3m-2v4x-88gg). Affects gRPC-based infrastructure.
- `vitest <3.2.6`: UI server arbitrary file access when running tests. Dev environment exposure. (GHSA-5xrq-8626-4rwp)
- `handlebars <=4.7.8`: RCE via implicit property access in templates. (GHSA-xql7-j68w-45gx)
- `vite <=6.4.2`: Path traversal on Windows via alternate paths. (GHSA-fx2h-pf6j-xcff)
- `postcss <=8.5.17`: Arbitrary file read + XSS via sourceMappingURL. (GHSA-6g55-p6wh-862q)

### Outdated Packages Requiring Major Version Bumps

| Package | Current | Latest | Breaking Changes | Risk |
|---------|---------|--------|-------------------|------|
| express | 4.18.2 | 5.2.1 | Middleware API changes | P3 |
| pino | 8.17.0 | 10.3.1 | Logger interface | P3 |
| uuid | 9.0.0 | 14.0.1 | **Buffer API + CVE GHSA-w5hq-g745-h8pq** | P2 |
| vite | 5.4.0 | 8.2.0 | **3 major versions + CVE GHSA-fx2h-pf6j-xcff** | P2 |
| vitest | 2.0.5 | 4.x | **Critical CVE GHSA-5xrq-8626-4rwp blocks testing** | P1 |
| react | 18.3.1 | 19.2.8 | Potential hook changes | P3 |
| react-router-dom | 6.30.4 | 7.18.2 | Route definition API | P3 |

### Dependency Tree Characteristics

- **Backend (Source/Backend):** 412 transitive deps via 7 direct
  - Heavy on express ecosystem (body-parser, qs, form-data)
  - Transitive vuln chain via express → handlebars, form-data, qs
  - Recommend pinning express version until 5.x tested
  
- **Frontend (Source/Frontend):** 231 transitive deps via 3 direct (react, react-dom, react-router-dom)
  - Vite adds 200+ deps (build tooling, babel, postcss)
  - Most CVEs are in build-chain (not runtime)
  - vite→postcss→sourceMappingURL vuln affects dev mode
  
- **E2E (Source/E2E):** 5 transitive deps via 1 direct (@playwright/test)
  - Excellent supply chain hygiene
  - Only vuln is in playwright transitive (form-data)
  - Maintain this pattern for test isolation
  
- **Orchestrator (platform/orchestrator):** 600+ deps
  - Heavy on gRPC (@grpc/grpc-js, protobufjs)
  - OpenTelemetry instrumentation adds 50+ deps
  - protobufjs RCE is critical for this service

### License Compliance Status

✅ **All clear.** No GPL/AGPL/restrictive licenses detected.  
Standard stack: MIT (express, react, vite, uuid), Apache 2.0 (@opentelemetry, @grpc), BSD (various).

### Available Tools & Environment

- ✅ `npm audit --json` works in all workspaces
- ✅ `npm outdated --json` for version checks
- ✅ `npm list` for transitive dependency counting
- ✅ `jq` available for lock file parsing
- ❌ `license-checker` not installed (fallback: manual package.json scan)
- ❌ `govulncheck` not used (no Go modules in main source, only in platform/)

### Remediation Priorities

**P1 (Block Release):**
- vitest >=3.2.6 (test safety)
- protobufjs >=7.5.5 (RCE in infrastructure)

**P2 (1-2 sprints):**
- vite >=8.2.0 (major version bump, build testing required)
- postcss >=8.5.18 (file disclosure)
- uuid >=11.1.1 (breaking change, buffer API affected)

**P3 (1 month):**
- express 5.x upgrade (requires middleware testing)
- pino 10.x upgrade
- All moderate CVEs via transitive updates

### Team Coordination Notes

- **No platform/ changes needed** — agents cannot modify orchestrator infrastructure files (architectural rule)
- **Frontend rebuild testing required** for vite upgrade (3 major versions)
- **Backend route testing required** for express 5.x upgrade
- **Vitest critical for dev loop** — upgrade first to unblock testing

### Continuous Monitoring Recommendations

1. Add `npm audit` exit code >0 to CI/CD (fail on moderate+ CVEs in Source/)
2. Implement Renovate.io or Dependabot for automated vulnerability PRs
3. Watch `protobufjs`, `vitest`, `vite` for new CVE announcements (high-risk packages)
4. Quarterly manual audit (this script + peer review)
5. Subscribe to GitHub Security Advisories for critical packages

### Notes for Next Audit

- Re-check vitest/vite compatibility post-upgrade (ensure test infra still works)
- Verify express 5.x middleware stack after upgrade (custom middleware may break)
- Check uuid API changes — any buffer-passing code will need review
- postcss sourceMappingURL fix — may require vite config adjustment
- protobufjs 7.5.5+ may have breaking changes in gRPC proto handling

---

## Learnings Archive

_(none yet — this is the first audit run)_
