# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-04

### Critical Findings (Watch List)
- **handlebars** (4.7.8): Multiple JavaScript injection/RCE CVEs. Transitive dependency, source not immediately clear. Track carefully.
- **protobufjs** (<7.5.5): Arbitrary code execution vulnerability found in platform/orchestrator and portal/Backend. Must upgrade to ≥7.5.5.
- **uuid** (9.0.0-9.0.8): Missing buffer bounds check. Affects Backend, platform, portal projects. Upgrade to ≥14.0.0.

### License Decisions
- All observed licenses are permissive (MIT, Apache-2.0, ISC)
- No GPL/AGPL licenses detected
- No unlicensed dependencies in main application scope
- Decision: No license compliance blocker

### Audit Tools Available in Environment
- ✅ npm audit (JSON output)
- ✅ npm outdated (JSON output)
- ✅ npm ls (tree output)
- ❌ npm license-checker (not installed, but can parse lock files manually)
- ❌ govulncheck (no Go modules detected)
- ❌ pip-audit (no Python requirements detected)

### Project Structure Notes
- Main app is npm-only (no Go/Python/Rust dependencies)
- Multiple npm workspaces:
  - Source/Backend: 411 transitive deps (large surface)
  - Source/Frontend: 230 transitive deps (moderate)
  - Source/E2E: 4 transitive deps (minimal) — cleanest
  - platform/orchestrator: 155 transitive deps
  - portal/Backend & Frontend: Similar to main Frontend

### Prior CVE Findings (First Run)
**2026-05-04 Baseline:**
- 3 Critical (handlebars, protobufjs x2)
- 4 High (path-to-regexp, picomatch, handlebars variants)
- 20+ Moderate (vite, vitest, esbuild, postcss, uuid, dockerode, brace-expansion)

**To Track:** Establish baseline for future comparison

### Outdated Dependencies Requiring Attention
1. **uuid:** 9.0.0 → 14.0.0 (6 major versions behind) — SECURITY PRIORITY
2. **pino:** 8.17.0 → 10.3.1 (2 major versions behind) — breaking changes likely
3. **vite:** 5.4.0 → 8.0.10 (3 major versions behind) — SECURITY & FEATURE PRIORITY
4. **react/react-dom:** 18.3.1 → 19.2.5 (1 major behind) — plan carefully
5. **react-router-dom:** 6.26.0 → 7.14.2 (1 major behind)

### Remediation Status (for next audit)
- [ ] Handlebars upgrade planned?
- [ ] protobufjs upgraded?
- [ ] uuid upgraded to 14.x?
- [ ] vite upgraded?
- [ ] Tests passing after updates?

### Recommended Monitoring
1. **GitHub Security Alerts:** Enable for this repo (automatically detects npm CVEs)
2. **Dependabot:** Configure to auto-create PRs for updates
3. **Snyk:** Consider for continuous scanning and supply chain risk
4. **npm audit in CI/CD:** Add to test pipeline before deployment

### Supply Chain Risk Notes
- Backend has 411 transitive dependencies — high exposure surface
- No post-install scripts detected in main app (good)
- Recommend: Monthly CVE scans, quarterly major version audits
- Handlebars appears as transitive in Backend — find and document parent dependency

### Cross-Team Escalations (from this run)
- **TheGuardians:** Handlebars RCE, protobufjs RCE (both P1)
- **TheFixer:** UUID, vite, vitest, esbuild, path-to-regexp, picomatch updates (P2/P3)

### Notes for Next Run
1. Determine which dependency chain brings in Handlebars (npm why handlebars)
2. Consider updating npm itself if vulnerabilities increase
3. May need to add dependency policy file (e.g., .npmauditignore) for known-acceptable risks
4. Look into dev-time vs production CVE severity (many Frontend CVEs are dev-only)

---

## Environment Notes

- **Node version:** Not captured in this run — recommend adding to audit output
- **npm version:** Not captured — recommend adding
- **Lock file format:** package-lock.json v3 (npm 7+)
- **Platform:** Linux (runner environment)
- **Audit date:** 2026-05-04

---

_Last updated: 2026-05-04 by dependency_auditor (Haiku)_
