# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings (Run 2026-07-12)

### Critical Watch List
1. **protobufjs** — Multiple high/critical CVEs including RCE (GHSA-xq3m-2v4x-88gg). Deep dep in platform/orchestrator via @grpc/grpc-js. Requires immediate attention.
2. **handlebars** — 8 distinct CVEs (XSS, code injection, DoS). Used indirectly via @grpc/grpc-js. Monitor for patches; consider removing @grpc/grpc-js if not essential.
3. **vitest** — Critical file disclosure CVE in <=3.2.5 (GHSA-5xrq-8626-4rwp). Must upgrade immediately for Frontend.

### Audit Tools & Environment
- **npm audit** requires `npm install` first (no lock-file-only mode available)
- **license-checker** not installed globally; manually parse package-lock.json instead
- Node.js available for direct JSON parsing of package-lock files

### Recurring Patterns
1. **Form-data CRLF injection** — Appears in multiple branches (Backend, Frontend). Always update together with express/body-parser.
2. **Express-related DoS (qs, path-to-regexp)** — Any express version has transitive risks. Plan express updates holistically.
3. **Dev-time security risks** — Vite, vitest, ws have CVEs that don't affect production but pose risk if dev infrastructure exposed.

### Dependency Tree Health
- **Backend:** 411 transitive deps (high due to jest/typescript/build infra)
- **Frontend:** 230 transitive deps (reasonable for React + vite)
- **Orchestrator:** 155 transitive deps (includes heavy gRPC/protobuf stack)
- **Total:** ~796 deps across workspace
- No GPL/AGPL licenses detected ✓
- No post-install scripts detected ✓
- No major version conflicts ✓

### Remediation Priorities (Next Audit)
1. **P1 Critical:** protobufjs, vitest, handlebars (via @grpc/grpc-js)
2. **P2 High:** vite (path traversal), form-data, @grpc/grpc-js, uuid, qs, react-router-dom
3. **P3 Moderate:** js-yaml, brace-expansion, postcss, ws, esbuild, @babel/core
4. **P3 Outdated:** React 18→19, vite 5→6/8, pino 8→10 (2 major versions back)

### Cross-Team Coordination
- **TheGuardians escalation needed for:** All P1/P2 CVEs (protobufjs, vitest, handlebars, vite, form-data, uuid)
- **TheFixer coordination:** React/Vite/Express major version upgrade planning

### Audit Schedule Recommendation
- Monthly `npm audit` runs (lightweight)
- Quarterly deep scans including outdated package analysis
- Immediate re-audit after any P1 CVE remediation
