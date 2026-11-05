# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-11-05

### Critical Findings Summary
- **12 Critical vulnerabilities** identified across 6 npm projects
- **proxy-addr IP spoofing** affects auth/access control (P1)
- **Handlebars.js RCE** via @partial-block template injection (P1)
- **tinypool RCE** in vitest (affects testing infrastructure)
- **protobufjs code injection** in orchestrator (P1)
- **Vitest UI arbitrary file read** when UI server exposed

### High-Risk Projects
1. **portal/Backend** — 61 vulnerabilities (4 critical, 11 high, 46 moderate)
   - Likely legacy or third-party code
   - Requires comprehensive dependency review
   - May need major version upgrades

2. **portal/Frontend** — 18 vulnerabilities (2 critical, 8 high)
   - Affected by tinypool, vitest, vite vulnerabilities
   - Dev tooling issues, moderate runtime risk

3. **Source/Frontend** — 17 vulnerabilities (2 critical, 7 high)
   - Similar dev tooling issues as portal/Frontend
   - tinypool RCE in test infrastructure

### Clean Projects
- **Source/E2E** — 0 vulnerabilities ✅
  - Only 4 production dependencies (minimal)
  - Verify it's actively tested

### Audit Tool Availability
- ✅ `npm audit --json` works on all projects
- ✅ `npm outdated --json` works on all projects
- ❌ `license-checker` not installed (fallback to package.json inspection used)

### Supply Chain Observations
1. **@opentelemetry/auto-instrumentations-node** pulls in 50+ instrumentation packages
   - Major supply chain surface increase
   - Consider if all instrumentations are needed

2. **Vite/Vitest ecosystem** has recurring dev tooling vulnerabilities
   - source-map-js, tinypool, vitest UI
   - Monitor upstream releases closely

3. **No post-install scripts** detected in primary dependencies (low risk)

4. **No GPL/AGPL** licenses detected (compliance OK)

### Recommended Fixes
**Immediate (0-24h):**
- Update proxy-addr (auth critical)
- Update handlebars (RCE)
- Update tinypool + vitest (test infrastructure RCE)
- Update protobufjs (code injection)

**High Priority (48h):**
- Run `npm audit fix --force` on all projects
- Audit portal/Backend for major version updates
- Review certificate validation in @grpc/grpc-js configuration

### Watch List for Future Audits
- `handlebars` — recurring template injection vulnerabilities
- `proxy-addr` — repeated IP spoofing issues (keep pinned to latest)
- `protobufjs` — code generation security issues
- `vite`/`vitest` — dev tooling keeps adding vulnerabilities
- `@opentelemetry/*` — supply chain risk from 50+ transitive deps

### License Compliance Decisions
- All detected licenses are permissive (MIT, Apache 2.0, ISC)
- No viral license risk identified
- No compliance action required

---

## Learnings

### General Observations
1. **npm audit** is the primary tool — always available on npm projects
2. **Portal services** have older dependency trees (higher CVE counts)
3. **Source projects** are newer/more actively maintained (lower CVE counts)
4. **Dev tooling vulnerabilities** (vite, vitest, vitest-mocker) are common in modern React/TS stacks

### Metrics Baseline (for comparison in future audits)
| Project | Total CVEs | Critical | High | Outdated |
|---------|---|--|--|---|
| Source/Backend | 18 | 2 | 5 | 4 |
| Source/Frontend | 17 | 2 | 7 | 3 |
| Source/E2E | 0 | 0 | 0 | 0 |
| platform/orchestrator | 9 | 2 | 3 | 3 |
| portal/Backend | 61 | 4 | 11 | 11 |
| portal/Frontend | 18 | 2 | 8 | 3 |
| **TOTAL** | **125** | **12** | **34** | **26** |
