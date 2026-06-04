# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-04

### Critical Findings (P1)

#### Watch List: High-Risk Packages
1. **vitest** — History of server-mode vulnerabilities
   - Current: 2.0.5 (VULNERABLE — Vitest UI RCE)
   - Recommendation: Always use latest minor (4.1.8+)
   - CI Integration: Never expose Vitest UI server to network
   
2. **handlebars** — Persistent template injection vulns
   - Current: 4.7.8 (pulled via ts-jest)
   - Pattern: Multiple AST type-confusion CVEs per release cycle
   - Remediation: Pin ts-jest to latest; audit codebase for template usage
   
3. **protobufjs** — High-risk code generation / evaluation
   - Current: 7.5.4 (pulled via dockerode)
   - Pattern: Multiple unsafe.eval gadgets per release cycle
   - Remediation: Do NOT load untrusted .proto files
   - Dependency chain: dockerode → protobufjs

#### Tools Available
- `npm audit --json` — works on all npm projects
- Package counts from lock files:
  - Backend: 412 transitive
  - Frontend: 231 transitive
  - Orchestrator: 156 transitive
  - E2E: ~4 transitive

### License Compliance (2026-06-04 snapshot)

- ✅ No GPL/AGPL detected
- ✅ No UNLICENSED packages detected
- ✅ MIT/Apache-2.0/ISC dominates ecosystem
- License checks rely on package.json license field (no external license-checker tool installed)

### Outdated Major Versions Pattern

Packages >1 major behind are candidates for batch updates:
- uuid: 9→14 (5 major!) — high priority
- pino: 8→10 (2 major) — medium priority
- express: 4→5 (2 major) — low (4.22.2 safe for now)

### Supply Chain Risk

- **Monorepo spread:** 4 distinct package.json files with overlapping transitive deps
- **Lock file analysis:** Always compare package-lock.json across projects for conflicts
- **High-risk transitive:** handlebars (via ts-jest), protobufjs (via dockerode)
  
### Audit Findings Not Acted Upon (Reason)

1. **PostCSS XSS (DEP-008)** — Current Vite version safe; low user-control of CSS
2. **Esbuild CORS (DEP-009)** — Dev-time only; accept risk for developer experience
3. **React Router open redirect (DEP-004)** — Current version safe; upgrade when major refresh occurs

### Next Audit Recommendations

- Run after any dependency update to verify fix completion
- Cross-ref with TheGuardians if Handlebars/protobufjs are used with untrusted input
- Verify post-install scripts haven't been reintroduced in lock file updates

---

## Historical Runs

_(First run — add subsequent audit dates here)_
