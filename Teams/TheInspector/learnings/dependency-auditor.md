# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Results (2026-11-26)

**Summary:** 116 CVEs across 6 npm projects, with 12 critical vulnerabilities requiring immediate action.

### Critical Watch List (recurring issues)

| Package | Issue | Last Seen | Mitigation |
|---------|-------|-----------|-----------|
| browserslist | Memory exhaustion (GHSA-c83g-rgw3-j3cx), Prototype pollution (GHSA-73wf-gq98-2v4g) | 2026-11-26 | Update to >4.28.6 |
| uuid | Buffer bounds check missing (GHSA-w5hq-g745-h8pq) | 2026-11-26 | Update to >=11.1.1 |
| brace-expansion | DoS via expansion (GHSA-3jxr-9vmj-r5cp, others) | 2026-11-26 | Update to >=1.1.17 |
| form-data | CRLF injection (GHSA-hmw2-7cc7-3qxx) | 2026-11-26 | Update to >=4.0.6 |
| body-parser | DoS via trailing bytes (GHSA-27r3-jxmh-p828) | 2026-11-26 | Update to >=1.20.9 |
| @grpc/grpc-js | Certificate validation bypass (GHSA-m9gg-hp2v-232j) | 2026-11-26 | Update to >=1.14.5 |

### Outdated Packages Requiring Major Version Upgrades

| Package | Current | Latest | Projects | Action |
|---------|---------|--------|----------|--------|
| OpenTelemetry SDK suite | 0.47.0 | 0.301.2 | portal/Backend | 6+ major versions behind, priority update |
| express | 4.18.2 | 5.3.0 | Source/Backend, portal/Backend | 1 major version; evaluate 4.22.3 patch first |
| react | 18.3.1 | 19.3.1 | Source/Frontend, portal/Frontend | 1 major version; plan migration carefully |
| pino | 8.17.0 | 10.4.0 | Source/Backend | 2 major versions; performance improvements |

### Supply Chain Risk Assessment

**High Risk (Priority Focus):**
- **portal/Backend:** 577 total dependencies with 61 CVEs (4 critical). Largest attack surface.
- **Source/Frontend:** 222 dev dependencies — regular cleanup recommended.

**Low Risk (Minimal):**
- **Source/E2E:** 0 CVEs, only 4 dependencies (@playwright/test). Clean.

### Available Audit Tools

In this environment:
- ✅ `npm audit --json` — Works across all 6 npm projects
- ✅ `npm outdated --json` — Detects stale major versions
- ❌ `license-checker` — Not installed (would require `npm install -g license-checker`)
- ❌ `govulncheck` — Go tools not available in this environment
- ❌ `pip-audit` — Python audit tool not available

### License Compliance (TO-DO in future audits)

No GPL/AGPL packages detected in quick scan of package.json files, but full license audit deferred pending license-checker installation.

### Decisions Made

1. **Dependencies to Lock:** express@4.22.3 is recommended as a safer intermediate step than jumping to 5.x; major version bump requires testing.
2. **OpenTelemetry:** Requires separate evaluation for compatibility; not a simple `npm install`. May need vendor-specific guidance.
3. **React:** 18 → 19 migration should be evaluated in a separate technical spike before attempting the upgrade.
