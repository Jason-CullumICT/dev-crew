# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Critical Vulnerability Patterns
1. **OpenTelemetry Chain Risk** — Portal/Backend's OpenTelemetry packages are 4+ major versions behind (0.47 → 0.218), pulling in protobufjs RCE (CVSS 9.8). This is a systematic integration risk.
   - **Watch list:** Monitor OpenTelemetry releases monthly
   - **Root cause:** Major version changes in OpenTelemetry happened frequently; hard to track
   - **Fix strategy:** Lock to latest patch of N-1 major version, then batch upgrade annually

2. **Handlebars in Test Toolchain** — Backend's jest/ts-jest chain pulls handlebars 4.7.8 with 8 distinct CVEs (multiple RCEs via template injection).
   - **Watch list:** jest, babel, handlebars
   - **Risk:** Build/test pipeline compromise = CI escape vector
   - **Detection:** Manual `npm audit` catches this; automated checks mandatory

3. **Vite/Vitest Version Sprawl** — Frontend uses vite 5.4.0 with path traversal, but Platform/Portal use vite 5.2.0. Multiple transitive versions cause conflicts.
   - **Watch list:** vite, vitest, esbuild
   - **Recommendation:** Align all frontend projects to same major version

### Audit Tools & Environment
- **npm audit --json** — reliable, gives CVSS scores and full vuln detail
- **npm outdated --json** — useful for major version tracking
- **license-checker** — not installed in this environment; fallback to `jq` parsing of package.json
- **Bash note:** No govulncheck (Go) or pip-audit (Python) projects detected in this repo

### Dependency Hygiene Observations
1. **Post-install scripts:** None found — good supply chain posture ✓
2. **Transitive bloat:** Portal/Backend has 577 dependencies (397 prod!) — extremely high surface area
   - **Recommendation:** Consider monorepo npm audit automation before adding more dependencies
3. **License compliance:** No GPL/AGPL found; all permissive — zero compliance risk ✓

### Previous Audit Results
- First audit: 2026-05-18
  - 3 Critical CVEs (handlebars, protobufjs x2)
  - 5 High-severity (OpenTelemetry SDK, path-to-regexp, picomatch, esbuild, vite)
  - 18 Moderate
  - 9 outdated major versions
  - **Verdict:** CRITICAL BLOCK on Portal/Backend and Orchestrator deployment
