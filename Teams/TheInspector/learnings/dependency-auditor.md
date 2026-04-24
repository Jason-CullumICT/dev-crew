# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-04-24

### Critical Findings (Watch List)

#### Handlebars (P1 - CRITICAL)
- **Issue:** JavaScript Injection via AST Type Confusion (GHSA-2w6w-674q-4c4q, CVSS 9.8)
- **Affected:** Source/Backend
- **Status:** UNPATCHED (current: 4.0.0–4.7.8, fix: ≥4.7.9)
- **Remediation:** `npm update handlebars` — verify no user-supplied templates first
- **Post-Patch Test:** Template rendering in unit tests

#### protobufjs (P1 - CRITICAL)
- **Issue:** Arbitrary Code Execution via malformed .proto (GHSA-xq3m-2v4x-88gg, CWE-94)
- **Affected:** platform/orchestrator, portal/Backend
- **Status:** UNPATCHED (current: <7.5.5, fix: ≥7.5.5)
- **Remediation:** `npm update protobufjs` in both services
- **Post-Patch Test:** Verify protobuf message handling in integration tests
- **Risk Context:** If loading .proto files from untrusted sources → P1 RCE. Validate input validation.

#### uuid Buffer Bounds (P2 - HIGH)
- **Issue:** Out-of-bounds write in v3/v5/v6 (GHSA-w5hq-g745-h8pq, CWE-787)
- **Affected:** All services (Source/Backend ^9.0.0, portal/Backend ^9.0.0, orchestrator indirect)
- **Status:** UNPATCHED (current: <14.0.0, fix: ≥14.0.0)
- **Remediation:** `npm update uuid` in all services — MAJOR version bump, verify API compat (unlikely issues)

### Outdated Package Patterns

#### OpenTelemetry Severely Behind (portal/Backend)
- **Current:** @opentelemetry/* 0.40–0.47 (released Jan 2024)
- **Latest:** @opentelemetry/* 0.215 (released Apr 2026)
- **Gap:** ~170+ minor/patch versions behind—signaling neglected observability
- **Recommendation:** Plan comprehensive OTel overhaul as P2.5 priority
- **Risk:** Unreliable distributed tracing; missing new instrumentation

#### Express 4.x Drift (All Backend Services)
- **Current:** 4.18.2–4.21.0
- **Latest:** 5.2.1
- **Pattern:** All backends use 4.x. No critical vulns, but technical debt accumulates.
- **Recommendation:** Plan phased migration (Q3 2026): backend → portal/Backend → orchestrator
- **Breaking Changes:** Request/response object changes; error handling. Review: https://expressjs.com/en/guide/migrating-5.html

#### React 18.x Stall (Frontend Services)
- **Current:** 18.2.0–18.3.1
- **Latest:** 19.2.5
- **Pattern:** Both frontend services lag 1 major version
- **Recommendation:** Plan React 19 upgrade with concurrent features/use() hook training
- **Risk:** Missing performance optimizations; longer bug-fix window

### Build Tool Fragmentation

#### vitest Version Misalignment (portal services)
- **Pattern:** portal/Backend (1.2.2) and portal/Frontend (1.4.0) use vitest 1.x, but vite is 5.x+
- **Recommendation:** vitest 1.x → 4.x requires vite 5.x compatibility review, but vitest 2.x is stable with vite 5.x
- **Action:** Upgrade portal services to vitest ≥2.0.0

### Supply Chain Observations

#### No Post-install Scripts
- ✓ PASS: All package.json files checked—no `scripts.postinstall` or `prepare` hooks
- **Impact:** Zero hidden code execution risk during npm install
- **Monitoring:** Continue checking on dependency additions

#### Portal/Backend Transitive Overload
- **Observation:** 577 total dependencies (397 prod, 181 dev)
- **Cause:** OpenTelemetry suite (~100+ transitive), comprehensive Google client libs
- **Action:** Audit top 20 by install size; consider if all instrumentation is needed

#### No Critical Dependency Duplication
- ✓ PASS: Lock files show no conflicting major versions
- **Example:** All services use uuid ^9.0.0 (no version splits)

### License Compliance

#### ✓ PASS: No Copyleft Licenses Detected
- MIT dominates (express, uuid, pino, react, vite)
- Apache-2.0 for OpenTelemetry (commercial-safe)
- ISC (e2e) is MIT-compatible
- **Action:** Implement periodic `npx license-checker --json` in CI

### Tools & Techniques

#### npm audit JSON Output
- `cd {service} && npm audit --json | jq .vulnerabilities` — efficient CVE extraction
- Works with lock files even if node_modules absent
- Supports `--severity critical|high` filtering for targeted audits

#### npm outdated Command
- `npm outdated` shows current vs. wanted vs. latest for all dependencies
- WANTED column reflects semver caret/tilde constraints
- Use to identify packages that need major version bumps

#### No Standard License Checker Installed
- `npx license-checker` available in npm ecosystem
- Recommend adding to CI pipeline if strict license policies exist

---

## Learnings Summary

1. **Handlebars & protobufjs are recurring concerns** — Both are transitive deps pulled by other packages. Monitor for updates in dependent packages.
2. **Backend services lag behind frontends in updates** — Express, pino, OpenTelemetry all 1–170 versions behind. Infrastructure/DevOps should own dependency upgrades.
3. **Portal/Backend is a dependency management hot spot** — 577 transitive deps is high for a single service. Consider splitting or auditing top consumers.
4. **Build tool versioning matters** — vite/vitest/esbuild ecosystem changes rapidly. Misalignment causes subtle bugs.
5. **No supply chain execution risk (positive)** — No post-install scripts = safer ecosystem integration.
