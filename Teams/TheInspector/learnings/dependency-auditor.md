# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Results (2026-05-25)

### Critical Findings Summary
- **2 Critical CVEs:** handlebars (JavaScript injection), protobufjs (RCE)
- **1 High CVE:** path-to-regexp (ReDoS DoS attack)
- **18 Moderate CVEs** across body-parser, vite, uuid, postcss, and others
- **8 packages with major version gap** (should be updated in phases)

### High-Volatility Watch List
Packages with recurring or severe CVE patterns:

1. **protobufjs** (BLOCKED)
   - 9 CVEs including RCE (CVSS 9.8), prototype pollution, DoS
   - Used by orchestrator; critical infrastructure
   - Requires immediate update to ≥7.5.8
   - Post-fix: verify no code generation gadget usage

2. **handlebars** (BLOCKED)
   - 8 CVEs including JavaScript injection (CVSS 9.8), XSS via templates
   - Unknown usage in Backend dependency tree
   - Requires audit of why it's a transitive dep (likely via another package)
   - Solution: Update to ≥4.7.9 and investigate source

3. **vite** (MONITOR)
   - Multiple CVEs (path traversal, esbuild CORS bypass)
   - Frontend dev infrastructure; not in production build
   - Recommend major version bump (5.x → 8.x) for security + perf
   - Test build output after update

4. **express** (STABLE - NEEDS PATCH)
   - Moderate CVE via qs dependency (DoS on query parsing)
   - Used in Backend and Orchestrator
   - Patch available: 4.22.2 (current: 4.18.2)
   - 4→5 major bump deferred to Q2 (breaking changes)

5. **uuid** (OUTDATED)
   - Currently: 9.0.0 | Latest: 14.0.0 (5 major versions behind)
   - Moderate CVE: buffer bounds check missing
   - Risk increases with each major version gap
   - Schedule update to ≥11.1.1 minimum

### License Compliance Status
- Source/Backend: MIT-compatible (express, pino, uuid)
- Source/Frontend: MIT/Apache-compatible (react, react-dom, vite)
- Source/E2E: MIT-compatible (@playwright/test → MIT)
- platform/orchestrator: MIT-compatible (express, dockerode, multer)
- **No GPL/AGPL/viral licenses detected** ✓

### Transitive Dependency Hygiene
| Location | Direct | Transitive | Ratio | Risk |
|----------|--------|-----------|-------|------|
| Backend | 4 | 411 | 1:103 | HIGH (handlebars appears here) |
| Frontend | 3 | 230 | 1:77 | MEDIUM (dev deps, vite bloat) |
| Orchestrator | 3 | 155 | 1:52 | HIGH (protobufjs RCE here) |
| E2E | 1 | 4 | 1:4 | LOW |

**Hygiene opportunities:**
- Backend: Audit why handlebars is a transitive dep; remove if unnecessary
- Frontend: vitest/vite bring in esbuild (redundant?); consider lightweight alternative
- Orchestrator: protobufjs is essential but critical; keep close eye on future CVEs

### Tools & Environment
- **npm audit:** Works natively, provides JSON output with CVSS scores
- **npm outdated:** Effective for major version detection
- **npm ls:** Available for tree analysis
- **License checker:** Not installed; manual review of package.json sufficient for now
- **Govulncheck, pip-audit:** Not needed for this project (npm-only)

### Prior Findings & Decisions
_(None yet — this is the first audit)_

### Next Audit Recommendations
1. **Run quarterly:** npm audit changes monthly; catch new CVEs early
2. **Set baseline:** Track when handlebars/protobufjs get updates
3. **Automate:** Add npm audit to CI/CD (fail on P1/P2)
4. **Track fix progress:** 
   - [ ] protobufjs update (BLOCKER)
   - [ ] handlebars audit + fix
   - [ ] React major version bump (Q2)
5. **Dependency policy:** Create DEPENDENCY_POLICY.md with license rules, update cadence

### Technical Debt Notes
- Backend's handlebars transitive dep source unknown → investigate
- Express 4→5 breaking changes require coordination with Backend team
- Orchestrator uses dockerode (Docker API client); ensure container isolation verified
- Frontend build output (vitest/vite) not in production path but should still be secured

### Agent Notes
- npm audit exit codes: non-zero when vulnerabilities found (expected)
- JSON output includes affected package tree and fix availability
- Major version updates often have breaking changes; coordinate with code team
- Transitive deps can't be easily removed (only indirect via direct dep update)
- Watch for deprecated packages (npm shows `deprecated: true` in registry)
