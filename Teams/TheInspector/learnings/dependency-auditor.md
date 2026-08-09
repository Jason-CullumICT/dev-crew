# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-09

### Critical Packages to Watch
1. **handlebars** — Multiple CVEs (GHSA-2w6w-674q-4c4q, etc.) in ≤4.7.8
   - Used transitively in Source/Backend
   - Requires ≥4.7.9 to mitigate
   - Watch list: Check after each minor release

2. **vitest** — UI server file disclosure + RCE (GHSA-5xrq-8626-4rwp)
   - Direct dependency in Source/Frontend (^2.0.5) and portal/Frontend (^1.4.0)
   - Fix: Upgrade to ≥4.1.10 (Source/Frontend major bump) and ≥1.6.0 (portal/Frontend)
   - Action: Disable UI server in CI with `--ui=false`

3. **protobufjs** — Arbitrary code execution vulnerability
   - Transitive in platform/orchestrator and portal/Backend
   - CRITICAL: Orchestrator infrastructure is at risk
   - Action: Investigate versions and apply patches immediately

4. **brace-expansion** — Multiple DoS CVEs (exponential expansion, unbounded memory)
   - Transitive in Source/Backend (in glob utilities)
   - Versions: <=1.1.17 affected
   - Watch list: Glob expansion is dangerous with untrusted input

5. **uuid** — 5 major versions behind (9.x → 14.x)
   - Unusual lag; investigate compatibility
   - Used in Source/Backend for work item IDs — ensure no breaking changes

### License Audit Result
✅ **No GPL/AGPL licenses detected.** All dependencies use permissive licenses (MIT, Apache 2.0).
- Decision: Safe to include in non-GPL projects
- No viral license risk

### Dependency Tree Insights
- **Largest:** portal/Backend (577 transitive) — highest attack surface
- **Smallest:** Source/E2E (5 transitive) — very clean, no vulns
- **No post-install scripts detected** across all projects — good supply-chain hygiene

### Recurring Patterns
- **npm vs Go vs Python:** Only npm packages detected in this codebase; no Go modules, Python, Rust, or Java
- **Development deps:** Most vulnerabilities in dev dependencies (vitest, @babel/core, esbuild)
- **Build tools are the bottleneck:** Handlebars, vitest, esbuild account for 3/5 critical issues

### Audit Tools Available
- `npm audit --json` works well; outputs complete CVE data
- `npm outdated` requires npm_modules to be present; `npm audit` is preferred
- `npm ls` can count transitive dependencies if node_modules exist

### Fixes Applied (if any)
_(None yet — audit is for reporting only. Fixes will be applied via separate tickets.)_

### Next Audit Recommendations
1. **Weekly:** Check for new critical CVEs in handlebars, vitest, protobufjs
2. **Monthly:** Re-run full audit across all 10 projects
3. **Quarterly:** Review outdated major versions; plan upgrade roadmap
4. **After Fixes:** Re-audit to confirm patches applied correctly
