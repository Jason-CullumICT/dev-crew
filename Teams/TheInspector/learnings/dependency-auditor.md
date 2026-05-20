# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-20

### Critical Findings (Watch List)
1. **Handlebars.js** - 8 CVEs (1 Critical CVSS 9.8, 4 High, 3 Moderate)
   - Comes as transitive dep via ts-jest → jest → handlebars
   - Current version: 4.7.8 (EOL, no patch available)
   - Safe version: >= 4.7.9
   - **Action:** Update ts-jest/jest to force handlebars upgrade
   - **Investigation needed:** Does app compile handlebars templates at runtime from untrusted input?
   - **Owner:** TheGuardians (if runtime compilation found)

2. **Brace-Expansion** - DoS vulnerability (CWE-400, CVSS 6.5)
   - Zero-step sequences cause process hang and memory exhaustion
   - Safe version: >= 1.1.13
   - Comes as transitive via glob/minimatch chains

### Outdated Major Versions (Upgrade Roadmap)
- **React:** 18.3.1 → 19.2.6 (1 major behind; breaking changes)
- **Express:** 4.18.2 → 5.2.1 (1 major behind)
- **React Router:** 6.26.0 → 7.15.1 (1 major behind)
- **Pino:** 8.17.0 → 10.3.1 (2 major behind; safer upgrade)
- **UUID:** 9.0.0 → 14.0.0 (1 major behind)

### Audit Tools Available
- ✅ `npm audit --json` - Full JSON output for parsing
- ✅ `npm outdated --json` - Major version lag detection
- ✅ `npm ls --depth=N` - Dependency tree inspection (works from any npm dir)
- ✅ Manual license review (no license-checker tool installed, but npm registry provides license field)

### Dependency Statistics
- **Backend:** 411 total (102 prod, 310 dev) - Large dev dependency tree
- **Frontend:** 7 direct → ~200+ transitive via vite/react
- **E2E:** 4 total (playwright) - Clean
- **Infrastructure:** 3 direct (dockerode, express, multer) - Clean

### License Compliance Decision
- All direct deps use MIT/ISC (permissive)
- No GPL/AGPL detected (project can remain non-GPL)
- Decision: **PASS** - No legal review needed

### Lessons Learned
1. **Transitive dependencies can be critical:** Handlebars vulnerability is in build tooling, not runtime code. Importance of tracing dependency chains.
2. **Dev dependencies are attack surface too:** 310 dev deps in Backend is large. Consider trimming test/build tools.
3. **Node package managers need CI integration:** Add `npm audit` to CI/CD pipeline to prevent new CVEs from merging.
4. **Major version upgrades are planned work:** React 18→19, Express 4→5 are not patch-level fixes; schedule as separate tasks.
5. **Supply chain risk scales with tree:** 400+ dependencies = 400+ maintainers. Use Dependabot or similar for continuous monitoring.

### Next Audit
- **Schedule:** Monthly (2026-06-20)
- **Trigger:** When dependencies change significantly
- **Escalation:** If handlebars vulnerability is confirmed as runtime risk, escalate to TheGuardians immediately

## Learnings

_(See audit run details above)_
