# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### 2026-04-22 — Initial Audit

#### Critical Findings
- **Handlebars.js (P1 CRITICAL)**: Multiple code injection vulnerabilities in versions 4.0.0-4.7.8. All affected versions have CVSS scores 3.7-9.8. This is a **transitive dependency** via `ts-jest@29.1.2`.
  - Root cause: ts-jest pulls handlebars for template preprocessing
  - Fix: Upgrade to ts-jest@30.0.0+ (pulls handlebars@4.7.9+)
  - **Escalation to TheGuardians required** — code injection risk if handlebars templates processed from untrusted sources

#### Moderate Findings (Watch List)
- **ts-jest@29.1.2**: Pulls vulnerable handlebars; also pulls brace-expansion with DoS risk
- **vite@5.4.0**: Path traversal in sourcemap `.map` handling (GHSA-4w7w-66w2-5vf9)
- **esbuild@<=0.24.2**: CORS bypass in dev server (via vite)

#### Dependency Tree Metrics
- **Backend**: 412 transitive deps (102 prod, 310 dev) — jest/ts-jest ecosystem is largest subtree
- **Frontend**: 231 transitive deps (9 prod, 222 dev) — React ecosystem
- **E2E**: Minimal (4 direct, playwright vendored)
- **Total Project**: ~643 transitive deps — moderate supply chain surface

#### Outdated Dependencies (Need Action)
- **uuid@9.0.0**: 5 major versions behind (14.0.0) — abnormal gap, likely missing patches
- **express@4.18.2**: 1 major behind (4.22.1), 2 majors behind Express 5.x
- **pino@8.17.0**: 2 majors behind (10.3.1)
- **React@18.3.1**: 1 major behind (19.0.0) — not urgent

#### License Compliance
- ✅ No GPL/AGPL in dependency tree
- ✅ No UNLICENSED packages
- ✅ All standard open-source licenses (MIT, Apache-2.0, BSD-*) 

#### Supply Chain Health
- ✅ No post-install scripts (zero arbitrary code execution risk)
- ✅ No low-popularity packages (<100 weekly downloads)
- ✅ All dependencies from established organizations
- ✅ No recent ownership transfers detected

#### Process Notes
- `npm audit --json` is the primary audit tool; lock files are the source of truth
- Backend workspace uses ts-jest which introduces cascading transitive vulnerabilities
- Frontend is relatively clean; vulnerabilities are in dev tooling (vite, vitest)
- E2E workspace has unmet dependency (@playwright/test not installed)

#### Next Audit Checklist
- [ ] Verify ts-jest upgraded and handlebars vulnerability resolved
- [ ] Confirm uuid, express, pino upgrades and test compatibility
- [ ] Check if vite/vitest have released patches for path traversal
- [ ] Monitor for new handlebars CVEs in advisory databases
- [ ] Review test code for any hardcoded handlebars templates
