# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-23

### Critical Findings (RCE Risks)
1. **protobufjs@<=7.5.7** (via dockerode in platform/orchestrator)
   - Arbitrary code execution vulnerability (GHSA-xq3m-2v4x-88gg)
   - FIX: Upgrade dockerode to ≥5.0.0
   - STATUS: Urgent — production infrastructure affected
   - ESCALATED: TheGuardians (code execution)

2. **handlebars@4.7.8** (via ts-jest in Source/Backend)
   - Multiple template injection vulnerabilities (8 CVEs)
   - Risk is dev-time only (testing framework), not production
   - FIX: Upgrade ts-jest (handlebars upgrade path limited)
   - STATUS: Require coordinate with frontend-coder for testing framework compatibility

### Project-Specific Watch Lists

**Source/Backend (412 transitive deps)**
- qs@6.11.1: DoS vulnerability via express — fix with npm audit fix
- uuid@9.0.1: Buffer bounds check missing — upgrade via audit fix --force
- Outdated types: @types/express, @types/node, @types/jest all >1 major behind
- Express v4 EOL approaching — plan v5 migration for next major release

**Source/Frontend (231 transitive deps)**
- vite@5.4.21: Path traversal + esbuild CORS bypass — upgrade to ≥5.4.3 or vite@8
- react@18.3.1: 1 major version behind (v19) — plan React 19 migration sprint
- react-router-dom@6.30.3: 1 major behind (v7) — bundle with React 19 upgrade
- vitest@2.1.9: 2 major versions behind (v4) — test compatibility carefully
- ws: Uninitialized memory disclosure — low priority (likely dev-only)

**platform/orchestrator (156 transitive deps)**
- 🚨 **protobufjs**: See critical findings above
- path-to-regexp: ReDoS via express — fix with `npm audit fix`
- uuid: Same issue as Backend
- Low count of direct deps (3) is healthy

### Audit Patterns

1. **express vulnerability cluster**: All projects affected by qs (express dependency). Common fix: npm audit fix
2. **uuid issues**: Affects Backend (direct) and Orchestrator (via dockerode). Fix: audit fix --force
3. **Development tooling outdated**: Frontend tooling (vite, vitest, react-testing-library) significantly behind latest
4. **Supply chain health**: 
   - No post-install scripts detected (clean)
   - No GPL/AGPL licenses (compliant)
   - Transitive dependency counts healthy (<500 each)
   - All major packages have good maintenance records

### Tools & Commands Available

```bash
# Quick audit on project
cd Source/Backend && npm audit

# Auto-fix (safe)
npm audit fix

# Auto-fix with breaking changes
npm audit fix --force

# Check outdated
npm outdated

# Count transitive deps
jq '.packages | length' package-lock.json

# Find where a package comes from
npm ls <package>
```

### Next Audit Priorities

1. Track protobufjs upgrade path (dockerode v5 compatibility)
2. Monitor express v5 release stability (major migration candidate)
3. Schedule React 19 migration testing (Frontend)
4. Verify ts-jest + handlebars upgrade compatibility (Backend dev)
5. Plan quarterly review of dependency versions across all projects

## Learnings

- **npm audit is reliable** - detected all major CVEs across projects accurately
- **Transitive dependency management** - Lock files track ~800 total deps across 3 projects; manageable but requires coordinated upgrades
- **Dev vs. Production risk** - Some vulnerabilities (esbuild, handlebars) are dev-time only; context matters for severity assessment
- **Express + qs cluster** - Most npm projects affected; standardize on npm audit fix for this specific issue
- **Type definitions lag** - @types/* packages often 1-2 major versions behind runtime packages; less critical but increases tech debt
