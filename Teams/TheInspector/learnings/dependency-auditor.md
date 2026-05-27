# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-27

### Critical Findings

**Handlebars.js (GHSA-2w6w-674q-4c4q, CVSS 9.8)**
- Multiple JavaScript injection vectors in <=4.7.8
- Transitive dependency via Express ecosystem
- Watch list: Monitor for minor updates; no known bypass

**uuid Buffer Bounds (GHSA-w5hq-g745-h8pq, CVSS 7.5)**
- Affects v3/v5/v6 functions when custom buffer provided
- Backend using ^9.0.0 prevents upgrade to v11.1.1+
- Consider explicit pin to 11.0.0+ in next update cycle

**Vite Path Traversal (GHSA-4w7w-66w2-5vf9)**
- Frontend using 5.4.0; latest is 8.0.14 (3 major versions behind)
- Major version jumps often break build configs
- Recommend staging vite@6.x first, test, then bump to 8.x

### Recurring Patterns

1. **Express ecosystem outdated:** Always 1-2 minor versions behind
   - Root cause: ^4.18.2 caret prevents upgrade to 4.22.x
   - Fix: Bump to 4.22.2+ in next maintenance window

2. **Frontend build tooling lagging:**
   - Vite: 5.4.0 → 8.0.14 (3 majors behind)
   - Vitest: 2.0.5 → 4.1.7 (2 majors behind)
   - This is a pattern; recommend quarterly frontend deps review

3. **Transitive vulnerabilities more common than direct:**
   - Handlebars, qs, brace-expansion, esbuild all transitive
   - npm audit auto-fix is effective but sometimes breaks exports
   - Always run tests after npm audit fix --force

### Audit Tools & Availability

- ✅ **npm audit** — Works in all Source/ subdirectories
- ✅ **npm outdated** — Provides wanted/latest versions
- ✅ **package-lock.json parsing** — Usable for license extraction
- ❌ **npm license-checker** — Not installed; fallback to jq parsing works
- ❌ **govulncheck** — No Go modules in project
- ❌ **pip-audit** — No Python project

### License Compliance Decision

**Policy: MIT-only acceptable.** All current direct deps are MIT or MIT-compatible.
- No GPL/AGPL packages allowed per inspector.config.yml
- All transitive deps surveyed show MIT in lock file
- No UNLICENSED packages detected

### Next Audit Recommendations

1. **Immediate:** Fix DEP-001 (Handlebars) via npm audit fix --force
2. **This week:** Install Frontend node_modules, update vite/vitest
3. **Next sprint:** Test uuid 14.0.0 in staging, pin major version
4. **Quarterly:** Review vite/vitest against latest (these move fast)
5. **Monthly:** Run npm audit in CI to catch security patch releases

### Known False Positives

- None identified yet; all CVEs are legitimate

---

_Last updated: 2026-05-27 by dependency-auditor_
