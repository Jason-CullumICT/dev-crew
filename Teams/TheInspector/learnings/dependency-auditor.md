# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit History

### 2026-04-16 (First Full Audit)

**Critical Finding:** Handlebars in ts-jest (Backend) — 7 CVEs including CVSS 9.8 RCE  
**Status:** dev-only, but blocks on ts-jest upstream patch  
**Watch List:** Handlebars (recurring risk in test toolchains)

**Outdated Packages:**
- Backend: express (1 major), pino (2 majors), uuid (4 majors) — plan upgrades for next sprint
- Frontend: react/react-dom (1 major), react-router-dom (1 major) — schedule React 19 upgrade Q2
- Vite must upgrade to v8+ (6 months behind) — blocking 5 MODERATE CVEs in dev tools

**Supply Chain Risks:**
1. ts-jest → Handlebars (RCE risk during test execution) — mitigation: keep ts-jest updated
2. esbuild single-maintainer (Evan Wallace) — no action needed, widely audited
3. Vite rapid release cycle (major version yearly) — establish quarterly update schedule

**Positive Signals:**
- No GPL/AGPL licenses ✅
- No abandoned dependencies ✅
- Lock files checked in ✅
- No duplicate major versions ✅
- Monorepo reduces supply chain surface ✅

## Learnings

### Audit Tools & Coverage
- **npm audit** is reliable for npm projects (tested successfully in all 3 source dirs)
- **license-checker** tool available but has dependency discovery issues (may need manual review for full tree)
- **npm outdated** shows available updates (useful for tracking lag)
- Recommend adding `--audit-level=moderate` to CI pipeline before merge

### Package Manager Coverage
- **npm only** (Node.js) — project doesn't use Go modules, Python, Rust, Java
- All manifests have lock files (reproducible builds) ✅
- Monorepo structure (3 independent package.json files) benefits from per-directory audits

### Handlebars Recurring Risk
- **Watch List:** Handlebars is brought in transitively by test toolchains (ts-jest)
- 7 distinct CVEs reported (CRITICAL RCE + HIGH injection vectors)
- Mitigation: keep ts-jest patched, or migrate to jest-ts-preset or native TypeScript support
- Risk Level: MODERATE (dev-only, but build artifacts may ship if not careful)

### Version Lag Patterns
- **express:** 2 releases behind (4.18 → 4.22) — not urgent but has security patches
- **pino:** 2 MAJOR versions behind (8 → 10) — logger frameworks may have perf/security fixes
- **uuid:** 4 MAJOR versions behind (9 → 13) — low-risk utility, not urgent
- **React:** 1 major behind (18 → 19) — typical for web apps, plan quarterly updates
- **Vite:** 2 MAJOR versions behind (5 → 8)! — **URGENT**, blocks 5 CVEs

### Dependency Tree Insights
- **Backend:** 412 transitive deps (102 prod, 310 dev) — test toolchain is heavy
- **Frontend:** 231 transitive deps (9 prod, 222 dev) — Vite/Vitest are heavy
- **E2E:** 4 transitive deps (Playwright) — very lean
- Recommendation: document preferred versions in CLAUDE.md (e.g., "React 18.x LTS policy")

### License Compliance Status
- **No GPL/AGPL detected** ✅ — project is clear for proprietary deployment
- Licenses are MIT/Apache/ISC (permissive) ✅
- Recommendation: add `npm-check-licenses` to pre-commit or CI (catch future additions)

### Cross-Team Escalation
- **Handlebars RCE** must be escalated to TheGuardians (JavaScript injection is security domain)
- **Vite path traversal** is dev-only but could expose source maps (TheGuardians may care)
- **esbuild CORS bypass** is dev-only (low priority for security team)

## Recommendations for Next Audit (May 2026)

1. **Urgent Actions:**
   - [ ] Check if ts-jest has released patch for Handlebars
   - [ ] Plan Vite 5 → 8 migration (2-3 sprint commitment)
   - [ ] Add `npm audit` to CI (pre-merge gate)

2. **Medium Priority:**
   - [ ] Upgrade Backend express 4.18 → 4.22
   - [ ] Upgrade Backend pino 8 → 10 (perf/security)
   - [ ] Establish "React LTS" policy (e.g., "stay within 2 majors of latest")

3. **Process Improvements:**
   - [ ] Add Dependabot integration (auto-PR for security updates)
   - [ ] Document version policies in CLAUDE.md (e.g., "npm audit --audit-level=moderate required before merge")
   - [ ] Add pre-commit hook: `npm audit --audit-level=moderate` in each package.json dir

4. **Watch List for Next Audit:**
   - ts-jest (Handlebars risk)
   - esbuild (single-maintainer risk)
   - React 19 adoption timeline
   - Vite 8 breaking changes compatibility
