# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-09-13

#### Critical Issues Found
1. **protobufjs** — Arbitrary code execution (CVE-2024-8116 / GHSA-xq3m-2v4x-88gg)
   - Affects: platform/orchestrator, portal/Backend (via OpenTelemetry gRPC)
   - Fix: Upgrade to 7.5.5+
   - Watch: This package has had multiple CVEs; monitor closely

2. **handlebars** — JavaScript template injection
   - Affects: Source/Backend (transitive)
   - Fix: Verify version and upgrade to latest
   - Note: Template engines are high-risk; consider reviewing usage

3. **vitest** — Path traversal in mock system allows reading arbitrary files
   - Affects: portal/Backend, portal/Frontend (direct dependencies)
   - Risk: Secret exposure via .env file read during test execution
   - Fix: Upgrade to 2.0.0+

#### High-Severity DoS Vulnerabilities
- **brace-expansion** (4 separate CVEs) — Process hang, OOM via crafted patterns
- **browserslist** (2 CVEs) — Memory leak (no cache eviction) + prototype pollution
- **path-to-regexp** — ReDoS via complex route patterns
- **@grpc/grpc-js** — Crash via malformed gRPC packets
- **postcss** — XSS via unescaped </style> in CSS stringification
- **vite** — Path traversal in .map handling (read arbitrary files)
- **form-data** — CRLF injection in multipart field names

#### Outdated Major Versions
- **express**: 4.18.2 → 4.22.2 (patch) or 5.2.1 (major, breaking changes)
- **pino**: 8.17.0 → 10.3.1 (2 major versions behind)
- **uuid**: 9.0.0 → 14.0.2 (very outdated, but low functional risk)
- **react**: 18.3.1 → 19.3.0 (requires migration planning)
- **react-router-dom**: 6.26.0 → 7.18.3 (requires migration planning)

#### Dependency Tree Observations
- **backend (412 packages)** — High but safe; focus on OpenTelemetry gRPC chain
- **frontend (231 packages)** — Moderate; build tools (vite, postcss) have multiple CVEs
- **portal/backend (450 packages)** — Highest; OpenTelemetry instrumentation pulls in many transitive deps
- **portal/frontend (240 packages)** — Moderate; vitest is direct dependency with CVE
- **orchestrator (150 packages)** — Healthy; protobufjs is only critical issue
- **E2E (5 packages)** — Clean; playwright only, no CVEs

#### License Status
✅ **No GPL/AGPL violations** — All projects use MIT, Apache-2.0, or similar permissive licenses

#### Audit Tools Available
- `npm audit --json` — Works perfectly; structured output
- `npm outdated --json` — Works; shows wanted/latest versions
- `npm ls --json` — Works; useful for dependency tree analysis
- Note: `license-checker` not installed globally; can install per-project if needed

#### Recommendations for Next Audit
1. **Add Dependabot** to GitHub for continuous monitoring
2. **Pre-commit hooks** — `npm audit` should run before commit
3. **Watch these packages closely:**
   - protobufjs (arbitrary code execution)
   - handlebars (template injection)
   - vitest (file access)
   - browserslist (memory issues)
4. **Plan major upgrades:**
   - React 18 → 19 (requires code changes)
   - React Router 6 → 7 (breaking changes)
   - Express 4 → 5 (breaking changes)
5. **Reduce portal/* dependency tree** — 450+ packages is excessive for a portal; consider splitting out OpenTelemetry instrumentation

#### Critical Fix Timeline
- **Day 1 (Immediate):** Fix protobufjs, handlebars, vitest
- **Week 1:** Fix brace-expansion, browserslist, path-to-regexp, vite, postcss, form-data, nanoid, @grpc/grpc-js
- **Month 1:** Fix remaining moderate issues; update express/pino/uuid
- **Month 2:** Plan and begin React/React Router major version migrations
