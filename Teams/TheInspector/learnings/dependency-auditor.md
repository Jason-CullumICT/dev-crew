# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Runs

### 2026-08-08 First Audit

**Package Managers Detected:** npm (3 workspaces: Source/Backend, Source/Frontend, Source/E2E)

**Key Findings:**
- **1 Critical CVE:** handlebars@4.0.0–4.7.8 (CVSS 9.8 JS injection)
- **8 High CVEs:** brace-expansion (4x DoS), js-yaml (3x quadratic CPU), form-data (CRLF)
- **9 Moderate CVEs:** express (qs DoS), uuid (buffer bounds), @remix-run/router (open redirect), others
- **4 Low CVEs:** @babel/core, body-parser

**Direct Dependencies with CVEs:** 2
- express@4.18.2 (qs DoS, moderate)
- uuid@9.0.0 (buffer bounds, moderate)

**Outdated Major Versions:** 6
- express 2 majors behind (4.18.2 vs 5.2.1 latest)
- pino 2 majors behind (8.17.0 vs 10.3.1 latest)
- uuid 5 majors behind (9.0.0 vs 14.0.1 latest)
- react 1 major behind (18.3.1 vs 19.2.8 latest)
- react-router-dom 1 major behind (6.26.0 vs 7.18.2 latest)

**Audit Tools Available:**
- `npm audit --json` (fully functional)
- `npm outdated --json` (fully functional)
- No license-checker installed; can read package.json license fields

**Supply Chain:** ~190 transitive dependencies across 3 workspaces. No single-maintainer packages or abandoned repos detected in primary chains.

**Grade:** C (1 critical, 3+ P1 findings)

## Recurring Issues to Watch

1. **DoS via unbounded parsing**: brace-expansion, js-yaml, qs
   - **Mitigation**: Input validation at API boundary (max size/complexity)
   - **Scope**: Check `/api/work-items` for glob patterns, spec uploads for YAML complexity

2. **Templating injection** (handlebars):
   - **Risk**: Even if unused in backend, footprint in build chain is attack surface
   - **Mitigation**: If templating used, require `handlebars --preventIndent` mode or safer alternative (nunjucks)

3. **Buffer safety** (uuid, form-data):
   - **Risk**: Out-of-bounds writes if caller controls buffer size
   - **Mitigation**: Audit Source/Backend for direct buffer-passing patterns

## License Decisions

**Status:** No blocking GPL/AGPL/UNLICENSED found.
- All primary deps are MIT, ISC, or Apache-2.0
- Continue pre-release license audits (no tool friction)

## Next Steps

1. **Priority 1 (Week 1)**: Update handlebars, brace-expansion, js-yaml, form-data
2. **Priority 2 (Week 2)**: Update express, uuid, react-router-dom, vite
3. **Priority 3 (Month 1)**: Plan major version migrations (pino@8→9+, uuid@9→11+)
4. **Escalation to TheGuardians**: Verify handlebars not used in user-controlled template compilation
5. **Escalation to red-teamer**: Check if `/api/work-items` accepts file patterns or YAML specs
