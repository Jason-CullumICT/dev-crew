# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-02

### Critical Vulnerabilities Identified
- **Vitest UI Server RCE** (GHSA-5xrq-8626-4rwp): Affects Source/Frontend, portal/Frontend. Fixed in vitest@4.1.8+
- **Handlebars.js Code Injection** (GHSA-2w6w-674q-4c4q + 7 more): Transitive in Source/Backend. Update parent dependency pulling it.
- **Protobufjs RCE** (GHSA-xq3m-2v4x-88gg + 9 more): In platform/orchestrator. Critical infrastructure risk.
- **OpenTelemetry Prometheus Crash** (GHSA-q7rr-3cgh-j5r3): portal/Backend direct dependency. DoS vector.

### High-Risk Dependencies (Watch List)
1. **handlebars** — 8 distinct CVEs in ≤4.7.8, recurring injection risks
2. **protobufjs** — 10 CVEs, widely used in gRPC/datastores, RCE potential
3. **vitest** — Dev-time RCE, check CI/CD exposure
4. **uuid** — Buffer bounds issues in v3/v5/v6 implementations
5. **vite/esbuild** — Dev server security, path traversal

### Supply Chain Observations
- **portal/Backend** has 577 transitive dependencies — largest surface, needs rationalization
- **portal/Frontend** has 424 transitive deps despite only 9 direct; build tools explosion (vite, vitest, etc.)
- **Source/E2E** is clean: only 4 transitive deps (Playwright + deps)
- **Post-install scripts**: None detected in primary projects (good)

### Audit Tools & Environment
- **npm audit --json** available in all projects, reliable
- **npm outdated --json** works for version checks
- **npx license-checker** — not pre-installed, can be added if needed
- **Govulncheck** (Go): Not applicable — no Go modules detected
- **pip-audit** (Python): Not applicable — no Python requirements detected

### Decisions & Fixes Applied
- **Express@4.22.1** → 4.22.2+ fixes qs DoS (GHSA-q8mj-m7cp-5q26)
- **uuid@9.0.1** → should upgrade to 14.0.0 (major bump, test required)
- **Vite upgrade path**: 6.4.1 → 8.0.16+ (2 major jumps, likely breaking changes)
- **Vitest upgrade path**: ≤4.1.0-beta.6 → 4.1.8+ (semver major, test UI features)

### License Policy: TBD
- No GPL/AGPL flags raised in preliminary scan
- Recommend establishing explicit whitelist: `["MIT", "Apache-2.0", "BSD-*"]`
- Scan command: `npx license-checker --onlyAllow "MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause"`

### Next Audit Priorities
1. **License compliance audit** — run license-checker on all projects
2. **SBOM generation** — cyclonedx or syft for supply chain visibility
3. **Dependency rationalization** — why is portal/Backend 577 deps deep?
4. **CI gate** — add `npm audit --audit-level=moderate` to PR gates
5. **Recurring checks** — schedule monthly audits; flag new P1/P2 immediately

### Framework Version Tracking
- React: 18.3.1 (v19 available, not urgent)
- Express: 4.22.1 (v5.2.1 available, plan 2026 Q3)
- Pino: 8.21.0 (v10.3.1 available, evaluate for perf)
- Vite: 6.4.1 (v8.0.16 needed for security)
- Vitest: ≤4.1.0 (4.1.8+ critical security fix)
