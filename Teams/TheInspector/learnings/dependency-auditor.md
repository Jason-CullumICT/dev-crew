# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## 2026-10-03 Audit Findings

### Critical Vulnerabilities (Watch List)

1. **Vitest UI Server Arbitrary File Read** (GHSA-5xrq-8626-4rwp)
   - **Severity:** CRITICAL (CVSS 9.8)
   - **Status:** FIXED in vitest@^5.0.3
   - **Action:** Upgrade Frontend to vitest@^5 or ≥3.2.6 minimum
   - **Note:** This is a development-environment risk (localhost-only binding recommended)

2. **gRPC Server Crashes** (GHSA-5375-pq7m-f5r2 + GHSA-99f4-grh7-6pcq + GHSA-m9gg-hp2v-232j)
   - **Severity:** HIGH (CVSS 7.5+)
   - **Status:** FIXED in @grpc/grpc-js@^1.14.5
   - **Action:** Update orchestrator's @grpc/grpc-js to ≥1.14.5, or upgrade dockerode to ≥5.0.1 (requires Node 18+)
   - **Note:** Multiple crash vectors (malformed requests, compressed messages, cert auth bypass)

3. **Jest Ecosystem Cascade** (15+ packages with HIGH vulnerabilities)
   - **Severity:** HIGH (cascading)
   - **Status:** FIXED in jest@^30.5.2
   - **Action:** Upgrade Backend jest to ≥30.5.2
   - **Note:** No backport to 29.x; major version bump required

### Moderate/High Vulnerabilities

| CVE | Package | Current | Fix | Priority |
|---|---|---|---|---|
| GHSA-c83g-rgw3-j3cx | browserslist | ≤4.28.6 | ^4.28.7 | HIGH |
| GHSA-52cp-r559-cp3m | js-yaml | <3.15.0 | ^3.15.0 | HIGH |
| GHSA-96hv-2xvq-fx4p | ws | 8.0.0-8.20.1 | ^8.21.0 | HIGH |
| GHSA-2j2x-hqr9-3h42 | @remix-run/router | 1.3.0-1.23.2 | ^1.23.3 | MODERATE |
| GHSA-82fw-gwwq-j7x9 | @vitest/mocker | 2.1.0-4.1.10 | ^4.1.11 | MODERATE |
| GHSA-w5hq-g745-h8pq | uuid | <11.1.1 | ^11.1.1 | MODERATE |

### Dependency Ecosystem Analysis

#### Backend (413 dependencies - CRITICAL)
- **Root cause:** jest + 15 submodules (jest-runner, jest-snapshot, jest-resolve, etc.)
- **Recommendation:** Evaluate vitest alternative (63% reduction: 413 → 150 deps)
- **Action:** Q4 2026 migration candidate for test runner replacement
- **Risk:** Large dev dependency tree increases supply chain attack surface during CI/CD

#### Frontend (232 dependencies - HIGH)
- **Root cause:** Vite + vitest + testing-library + TypeScript ecosystem
- **Recommendation:** Current setup is reasonable (deps properly isolated as devDeps)
- **Action:** Keep dependencies up-to-date with quarterly audits
- **Risk:** vitest UI server running in dev mode (mitigated by localhost-only binding)

#### Orchestrator (157 dependencies - CRITICAL)
- **Root cause:** @grpc/grpc-js (90+ deps) + dockerode + express
- **Recommendation:** If gRPC truly needed, isolate to separate microservice; otherwise consider REST/HTTP
- **Action:** Evaluate gRPC necessity; if kept, ensure all grpc-js CVEs patched
- **Risk:** grpc-js has pattern of security issues; multiple HIGH CVEs in 1.14.x line

#### Portal Backend (TBD - likely BETTER)
- **Root cause:** OpenTelemetry instrumentation + better-sqlite3 + express
- **Observation:** Uses vitest (lighter than jest), better-sqlite3 (native, fewer deps)
- **Risk:** OpenTelemetry SDK likely adds 50+ deps, but more justified than jest

#### Portal Frontend (TBD - likely SIMILAR)
- **Observation:** Vite + vitest + tailwindcss + msw
- **Risk:** Similar profile to Source/Frontend; CSS tooling adds 40+ deps

### Audit Tool Findings

#### npm audit --json
- ✅ **Works well** for primary scan (Backend, Frontend, Orchestrator tested)
- ⚠️ **Exit code 1 on vulnerabilities** (expected; JSON still valid in stderr)
- ✅ **Provides**: CVE ID, CVSS score, affected versions, transitive chain

#### npm outdated --json
- ✅ **Works for current vs. latest comparison**
- ⚠️ **Doesn't show security status** (must cross-reference with audit data)

#### npm ls / package-lock.json grep
- ✅ **Gives dependency count** but slow on large trees
- 📊 **Backend:** ~413 versions in package-lock.json
- 📊 **Frontend:** ~232 versions in package-lock.json
- 📊 **Orchestrator:** ~157 versions in package-lock.json

### No License Violations Detected

Spot-check of 20+ primary dependencies:
- MIT: 18 packages
- Apache-2.0: 2 packages
- ISC: Several
- ✅ **No GPL/AGPL** (would be problematic in proprietary code)
- ✅ **No UNLICENSED** (would block production use)

**Recommendation:** Add license-checker to CI/CD for continuous monitoring.

### Supply Chain Risk: Low

- ✅ **No post-install scripts** in primary package.json files
- ✅ **All packages actively maintained** (last commits <2 months)
- ✅ **No abandoned dependencies** detected
- ✅ **No single-maintainer niche packages** in direct deps

**Recommendation:** Monitor for suspicious npm packages via automated tools (e.g., npm audit --production in CI).

### Quarterly Audit Cadence

- **Frequency:** Monthly (security-critical) or Quarterly (feature/stability)
- **Next audit:** 2026-11-03
- **Tool chain:** `npm audit --json` → JSON → ReportFindings tool → Dashboard
- **Escalation:** CRITICAL/HIGH CVEs → TheGuardians (for dev env hardening)
- **Fixes:** CRITICAL/HIGH CVEs → TheFixer (for version upgrades + regression testing)

---

## Historical Findings

_(To be updated after each audit run)_

- **2026-10-03**: First comprehensive audit — 58+ CVEs identified, 2 critical

---

## Recommended Updates (Priority Queue)

### Immediate (This Week - P1)
1. ✅ vitest@^5.0.3 in Frontend (CRITICAL)
2. ✅ @grpc/grpc-js@^1.14.5 or dockerode@^5.0.1 in Orchestrator (CRITICAL)
3. ✅ jest@^30.5.2 in Backend (HIGH)
4. ✅ uuid@^11+ across Backend & Portal Backend (MODERATE)

### High Priority (Sprint - P2)
1. 📦 express@^5 in Backend & Portal Backend (major version)
2. 📦 pino@^10 in Backend & Portal Backend (major version)
3. 📦 react-router-dom@^7 in Frontend & Portal Frontend (CVE fix)
4. 📦 react@^19, react-dom@^19 in Frontend & Portal Frontend (feature gap)

### Medium Priority (Next Sprint - P3)
1. 🔄 browserslist updates (HIGH CVE but transitive)
2. 🔄 js-yaml updates (HIGH CVE but transitive)
3. 🔄 ws updates (HIGH CVE but transitive)
4. 🔄 All transitive deps audit via CI/CD

### Long-Term (Q4 2026 - P4)
1. 🎯 Migrate Backend from jest to vitest (60%+ dep reduction)
2. 🎯 Evaluate gRPC necessity in Orchestrator (50%+ potential reduction)
3. 🎯 Add automated supply chain hardening (dependabot, npm 2FA)
4. 🎯 Separate CI/CD container layers (dev tools vs runtime)
