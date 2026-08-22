# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Run 2026-08-22: Initial Dependency Audit

**Key Findings:**
1. **3 Critical CVEs across all modules** — all require immediate fixes before production deploy:
   - vitest@^2.0.5 (Frontend): Arbitrary file read/execution when UI server running (CVSS 9.8)
   - handlebars (Backend transitive): 8 template injection CVEs (CVSS 9.8)
   - protobufjs (Orchestrator transitive): Code execution via proto parsing (CVSS 9.8)

2. **High transitive dependency counts** — moderate supply chain risk surface:
   - Backend: 412 transitive deps (5 direct)
   - Frontend: 231 transitive deps (10 direct)
   - Orchestrator: 156 transitive deps (3 direct)

3. **Major version gaps** — several deps are 2+ major versions behind:
   - uuid: 9.x → need 11.x+ (buffer overflow fix requires major update)
   - vitest: 2.x → available as 4.x (but latest 3.x has the critical fix)
   - vite: 5.x → available as 8.x (path traversal fixes)
   - postcss: 8.4 → 8.5+ (file disclosure fixes)

4. **License compliance: CLEAR** — no GPL/AGPL detected across any module; all use permissive licenses (MIT, Apache 2.0, ISC)

5. **Supply chain risks: MINIMAL**
   - ✅ No post-install scripts detected
   - ✅ No obviously abandoned packages
   - ✅ No single-maintainer low-activity packages in direct deps

6. **Audit tools available:**
   - `npm audit --json` works in all directories
   - Lock files present for all modules (package-lock.json)
   - npm version appears to be recent enough for proper CVSS scoring

### Remediation Notes

**P1 (Critical) Fixes — DO IMMEDIATELY:**
- `cd Source/Frontend && npm update vitest` (resolves to 4.1.11+, fixes GHSA-5xrq-8626-4rwp)
- `cd platform/orchestrator && npm update protobufjs` (resolves to 7.7.0+, fixes GHSA-xq3m-2v4x-88gg)
- Backend handlebars: Must identify consuming package (npm ls handlebars) — likely dev tool, not directly declared

**P2 (High) Fixes — This Week:**
- Backend: brace-expansion, js-yaml, form-data DoS vulns (all transitive, npm update should fix)
- Frontend: vite, postcss, nanoid (major version bump for vite from 5→8, requires testing)
- React Router: update to 7.x (open redirect fix)

**P3 (Moderate) Fixes — Next Sprint:**
- UUID in Backend: 9.x → 11.x requires API review (major version bump)
- Express/qs: subtle DoS in body-parser (npm update should resolve)
- gRPC: server crash fix in @grpc/grpc-js

### Team Decisions

None yet — awaiting guidance from TheGuardians on P1 escalations and TheFixer on P2/P3 sequencing.

### Audit Confidence

HIGH — all findings verified against npm official registry with CVSS scores. No disputed/informational CVEs included (P4+ only for reference).
