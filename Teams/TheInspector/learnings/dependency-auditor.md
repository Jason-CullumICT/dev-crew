# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### 2026-07-25 — First Audit

#### Critical Vulnerabilities (Watch List)
1. **Handlebars.js** — 8+ known injection/prototype pollution CVEs
   - Affects: jest, superagent, others (transitive)
   - Risk: If used for runtime template processing → SSTI/RCE
   - Status: Patches available (4.7.9+); confirm usage in codebase before upgrading
   
2. **Vitest UI Server** — Arbitrary file read/execution (GHSA-5xrq-8626-4rwp)
   - Affects: Frontend workspace
   - Risk: Critical if UI server exposed to untrusted networks
   - Status: Requires major upgrade (2.x → 4.1.10+)
   - Mitigation: Disable UI server in production/CI; restrict network access in dev

#### Common Transitive Vulnerabilities
- **Form-data** (CRLF injection) — Common in HTTP client chains (superagent, node-fetch)
- **js-yaml** (DoS) — Quadratic complexity via merge keys
- **Brace-expansion** (DoS) — Via glob → jest dependency chain
- **PostCSS** (path traversal) — Via vite/webpack build chains

#### Audit Tools Available
- `npm audit --json` — Full JSON audit with CVE details (recommended over text output)
- `npm outdated --json` — Outdated packages with target versions
- `npx license-checker --json` — License compliance checking
- `npm list --depth=0 --json` — Direct dependency inventory

#### Environment Notes
- **npm workspaces:** Source/Backend and Source/Frontend are separate lock files
- **Lock files location:** `Source/{Backend,Frontend}/package-lock.json` (NOT root)
- **Total dependency surface:** 641 unique packages (411 backend, 230 frontend) — moderate-high risk
- **Build tooling:**
  - Backend: jest, ts-jest, typescript, pino (logging)
  - Frontend: vite, vitest, react, react-router

#### Policy Decisions
- **Express:** Keep at 4.18.2 stable; do not upgrade to 4.21–4.22.1 (qs CVE); plan 5.x migration separately
- **React:** Plan major version upgrade to 19 (currently 18); coordinate with React Router 7 migration
- **License compliance:** No GPL/AGPL violations detected; project UNLICENSED is acceptable for private work

#### Next Steps (Standing)
- [ ] Monthly CVE audit (quarterly minimum)
- [ ] Monitor Handlebars/Vitest for patch updates
- [ ] Audit Vitest UI server exposure in dev/CI environments
- [ ] Plan React 19 + React Router 7 migration for next major release
