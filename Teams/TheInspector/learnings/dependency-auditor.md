# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run — 2026-09-26

### Critical Findings Identified

#### 1. Remote Code Execution (CVSS 9.8)
- **protobufjs@<=7.6.4** in `platform/orchestrator`
  - CVE: GHSA-xq3m-2v4x-88gg (arbitrary code execution)
  - **Status:** Must fix before production — blocks deployment
  - **Fix:** `npm update protobufjs` (>=7.6.5)
  - **Test:** Verify gRPC protobuf schemas still parse correctly

- **vitest@<=4.1.10** in `Source/Frontend` and `portal/Frontend`
  - CVE: GHSA-5xrq-8626-4rwp (arbitrary file read/execute when UI server listening)
  - **Status:** Dev-only dependency, low production risk
  - **Fix:** `npm install vitest@5.0.2` (major version bump)
  - **Test:** Run full vitest suite, verify UI server disabled in CI

#### 2. OpenTelemetry Stack Issues (portal/Backend)
- Multiple interconnected vulnerabilities in @opentelemetry/core, @opentelemetry/resources, @opentelemetry/sdk-*
- **Status:** Affects observability pipeline, Prometheus exporter crashes
- **Fix:** Holistic upgrade to `@opentelemetry/auto-instrumentations-node@0.80.0+`
- **Lesson:** OpenTelemetry monorepo requires coordinated upgrades — individual package bumps won't resolve full dependency tree

#### 3. DoS via Denial Patterns
- **brace-expansion** (Source/Backend): Multiple CVEs for unbounded expansion
- **js-yaml** (Source/Backend): Quadratic CPU via merge-key chains
- **browserslist** (Frontend): Memory exhaustion + prototype pollution
- **vite** (Frontend): Path traversal in dev server exposes source
- **ws**: Memory exhaustion in WebSocket frame parsing

### Architecture Patterns

1. **Package Manager:** npm only (no Go/Python/Rust detected)
2. **Dependency Distribution:**
   - Source/Backend: 411 deps (heavy dev dependency load — 310 dev, 102 prod)
   - Source/Frontend: 230 deps (mostly dev)
   - platform/orchestrator: 155 deps (PRODUCTION only, no dev)
   - portal/Backend: 300+ deps (heavy OpenTelemetry footprint)
   - portal/Frontend: 424 deps (heaviest — vitest/vite ecosystem)

3. **Security Posture:**
   - ✅ No post-install scripts (secure)
   - ✅ No hardcoded secrets
   - ✅ License compliance clean (MIT/Apache 2.0)
   - ⚠️ Heavy transitive dependency load (400+ dev deps in portal/Frontend)

### Audit Tools & Environment

- **npm audit**: Works on all workspaces; requires `package-lock.json` (present for all)
- **License detection:** Can be done via `license-checker` or manual package.json parsing
- **Outdated packages:** `npm outdated --json` available for version analysis
- **No other package managers detected** (Go modules, Python, Rust, Java)

### Recommendations for Future Audits

1. **Setup automated scanning in CI:** Each PR should run `npm audit --audit-level=moderate` per workspace
2. **Version bump policy:** Major version updates should be done quarterly, not ad-hoc
3. **Consolidation opportunity:** Consider merging Source/Frontend and Source/Backend into single npm workspace
4. **vitest ecosystem:** 400+ deps is heavy for component testing — consider Playwright/Cypress alternative
5. **gRPC dependencies:** protobufjs is critical-path — keep updated and test thoroughly

### Watch List (Recurring CVEs)

| Package | CVE Count | Status |
|---------|-----------|--------|
| protobufjs | 5 | CRITICAL — needs immediate patch |
| vitest | 2-3 | CRITICAL (dev) — major version bumps required |
| @opentelemetry/* | 10+ | HIGH — ecosystem issue, needs coordinated upgrade |
| brace-expansion | 4 | HIGH — build-time DoS |
| vite | 4 | HIGH — dev server path traversal |
| browserslist | 2 | HIGH — memory exhaustion |

### License Decisions

- ✅ All dependencies MIT or Apache 2.0 — safe for proprietary use
- No GPL/AGPL licenses detected
- No unknown licenses detected

## Key Metrics (2026-09-26)

- **Total CVEs:** 53 across 6 workspaces
- **Critical:** 3 (protobufjs, vitest x2)
- **High:** 18 (mostly DoS, a few path traversal)
- **Moderate:** 28 (mostly transitive, DoS/information disclosure)
- **Low:** 4 (mostly dev-time or low-impact)
- **Workspaces with vulnerabilities:** 5/6 (only Source/E2E is clean)
- **Clean licenses:** 100%
- **Post-install scripts:** 0 (secure)
