# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Baseline (2026-09-23)

### CVE Summary
- **Total CVEs:** 110 across the codebase
- **Critical:** 6 (vitest, handlebars, protobufjs)
- **High:** 33 (brace-expansion, browserslist, form-data, vite, nanoid, postcss, etc.)
- **Blocking Release:** YES — 3 critical CVEs + 33 high-severity require immediate patching

### High-Risk Packages (Watch List)

#### Critical — Arbitrary File Read/RCE
- **vitest@<=4.1.10:** Path traversal + arbitrary file read (CVSS 9.8) — Source/Frontend direct dependency
- **handlebars@<=4.7.8:** JavaScript injection via @partial-block tampering — Source/Backend transitive
- **protobufjs:** Remote code execution — platform/orchestrator transitive

#### High — DoS / Injection
- **brace-expansion@<=1.1.17:** 4 separate CVEs (ReDoS, unbounded expansion, OOM) — **11 major version gap from 1.1.18**
- **browserslist@<=4.28.6:** Unbounded memory growth + prototype pollution — both Source/Backend and Source/Frontend
- **form-data:** CRLF injection in multipart headers
- **vite@5.4.0:** Path traversal in dev server .map handling
- **uuid@9.0.0:** 5 major versions behind (9.0.0 → 14.0.2) — unusual lag, suggests old lock file

### Supply Chain Risks

#### Source/Backend: 411 Transitive Dependencies (23% OVER THRESHOLD)
- **Risk Level:** CRITICAL
- **Root Cause:** jest + ts-jest ecosystem brings massive dependency tree
- **Mitigation:** Consider jest → vitest migration; audit devDependencies
- **Target:** Reduce to <350 transitive deps within 2 sprints

#### Deprecated/Abandoned Check
- No packages marked `deprecated: true` in npm registry
- All core packages actively maintained
- However, **uuid 5-major lag** and **brace-expansion stuck at 1.1.x** warrant investigation

### License Compliance
- ✅ All production dependencies are MIT/ISC (permissive)
- ✅ No GPL/AGPL viral licenses detected
- ✅ Safe for proprietary use

### Outdated Major Versions

#### Urgent (>2 majors behind, security implications)
- **uuid:** 9.0.0 → 14.0.2 (5 majors) — Update immediately
- **pino:** 8.17.0 → 10.3.1 (2 majors) — Review breaking changes

#### Important (1-2 majors, plan migration)
- **express:** 4.18.2 → 5.2.1 (2 majors) — Breaking changes; plan carefully
- **react/react-dom:** 18.3.1 → 19.3.0 (1 major) — Stable; concurrent features
- **react-router-dom:** 6.26.0 → 7.18.4 (1 major) — **Major rewrite of API; significant refactor needed**

### Tools & Commands

**npm audit tools:**
```bash
npm audit --json                    # Full audit output
npm audit --audit-level=high        # Only high/critical
npm outdated --json                 # Outdated packages
npm list <pkg> --depth=0            # Direct dependency version
npx license-checker --json          # License audit (if installed)
```

**Package-specific commands:**
```bash
# Check specific CVE
npm audit --json | jq '.vulnerabilities."<package>"'

# List all direct dependencies and their sizes
npm ls --depth=0

# Find unused dependencies
npx depcheck --ignores=""
```

### Prior Findings

1. **2026-09-23 - Initial Audit**
   - Grade: F (110 CVEs)
   - 3 critical blocking issues identified
   - 33 high-severity issues requiring patches
   - Supply chain risk flagged: Source/Backend 411 transitive deps
