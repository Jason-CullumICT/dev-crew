# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-12

### Critical Packages (Watch List)

#### protobufjs — HIGH PRIORITY
- **Status:** CRITICAL RCE vulnerability (CVSS 9.8)
- **CVE:** GHSA-xq3m-2v4x-88gg (Arbitrary code execution)
- **Affected:** `platform/orchestrator`, `portal/Backend`
- **Lesson:** Protobuf ecosystem has seen multiple code execution vulnerabilities. Recommend:
  - Pin to specific patched version, not range
  - Subscribe to security advisories for protobufjs specifically
  - Test protobuf message parsing with fuzzing

#### Vitest — CRITICAL TEST-TIME RCE
- **CVE:** GHSA-5xrq-8626-4rwp (UI server file read + execution)
- **Lesson:** Never enable `--ui` flag in CI/CD or any exposed environment. Test servers are common attack surface.
- **Affected:** `Source/Frontend`, `portal/Frontend`

#### OpenTelemetry Ecosystem — VERSION EXPLOSION
- **Observation:** Portal/Backend OpenTelemetry packages are 0.40–0.47; latest is 0.77–0.219
- **Lesson:** OpenTelemetry is on an aggressive release cycle. Each minor bump can fix vulnerabilities.
  - Recommend quarterly audits for this ecosystem
  - Consider pinning to LTS-like versions if available
  - Monitor GHSA advisories for @opentelemetry/* packages

### Architecture Findings

1. **portal/Backend has largest supply chain surface (578 transitive deps)**
   - Driven by OpenTelemetry auto-instrumentation
   - Recommendation: Audit whether full auto-instrumentation is necessary
   - Alternative: Explicit, minimal instrumentation could reduce surface by 30%

2. **platform/orchestrator is critical infrastructure**
   - Contains Docker (dockerode), gRPC, file upload (multer)
   - Any vulnerability here = infrastructure compromise
   - Recommendation: Higher review bar for updates to this workspace

3. **No GPL/AGPL licenses detected** — licensing strategy is clean

### Audit Tools Available in Environment

- ✅ `npm audit --json` (primary tool)
- ✅ `npm outdated --json` (version tracking)
- ❓ `npx license-checker --json` (works, but slow on large trees)
- ❌ `govulncheck` (Go only — not applicable)
- ❌ `pip-audit` (Python only — not applicable)

### Prior CVE Fixes

_(none yet — first audit run)_

### Recommended Schedules

| Task | Frequency | Owner | Notes |
|------|-----------|-------|-------|
| Full npm audit | Bi-weekly | dependency-auditor | Catch CVE announcements early |
| Outdated report | Monthly | dependency-auditor | Plan major version upgrades |
| License audit | Quarterly | dependency-auditor | Catch new transitive licenses |
| protobufjs watch | Ongoing | TheGuardians | Critical package, frequent issues |

### Decision Log

- **Handlebars in Backend:** ASSESS whether template input is user-controlled before upgrading. Risk might be mitigated if only used for documentation/static rendering.
- **React 19 migration:** Requires code changes. Coordinate with frontend-coder on migration plan.
- **OpenTelemetry strategy:** Recommend meeting with observability owner to discuss version strategy and auto-instrumentation necessity.
