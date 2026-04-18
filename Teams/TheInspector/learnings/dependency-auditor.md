# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-04-18

#### Critical Findings Watch List
1. **handlebars@<=4.7.8**: Multiple JS injection CVEs (CVSS 8.1-9.8). Used in Source/Backend build chain. Investigation needed on dependency source.
2. **protobufjs@<7.5.5**: Arbitrary code execution. Present in platform/orchestrator (critical) and portal/Backend. Immediate patching required.
3. **path-to-regexp**: ReDoS via express routing. All express@4.x projects affected. Upgrade express to 4.22+ or 5.x to fix transitively.

#### Recurring Patterns
- **Vite/Vitest ecosystem**: Multiple moderate CVEs in path traversal and CORS bypass. Dev-environment focused but blocks builds.
  - esbuild@<=0.24.2 affects all vite projects
  - vitest@<3.0.0-beta.4 chains to path-traversal CVEs
  - Fix: Upgrade vitest to 4.1.4+, vite to 8.0.8+ (major version bumps)

- **OpenTelemetry packages in portal/Backend**: Severely outdated (100+ minor versions behind). Not critical for function but missing observability improvements.

#### Licensing Decisions
- All direct dependencies use MIT or Apache 2.0 licenses — no viral license risk
- No UNLICENSED packages found
- No GPL/AGPL contamination

#### Tools & Environment
- **npm audit --json**: Reliable for npm projects; exit code 1 when vulnerabilities found (expected)
- **npm outdated --json**: Shows current, wanted, latest versions; good for major version tracking
- **node_modules not present**: Dependencies not installed in audit environment; analysis based on lock files and package.json only
- **license-checker not available**: Fall back to package.json license fields (all major packages have them)

#### Audit Scope
- **Projects scanned:** 6 (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)
- **Package managers:** npm (all projects use npm)
- **No Go/Python/Rust/Java projects detected**

#### Remediation Strategy
- **Phase 1 (Immediate):** Fix P1/P2 CVEs (handlebars, protobufjs, path-to-regexp, picomatch)
- **Phase 2 (Next sprint):** Upgrade Vite/Vitest/React/Express ecosystems
- **Phase 3 (Follow-up):** Upgrade OpenTelemetry packages, pino
- **Escalations:** handlebars & protobufjs → TheGuardians (RCE/injection risks)
