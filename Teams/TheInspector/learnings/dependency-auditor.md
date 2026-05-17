# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Critical Findings - Immediate Action Required

### 1. **CRITICAL: Handlebars JavaScript Injection (Source/Backend)**
- **Package**: handlebars@4.7.8
- **Severity**: CRITICAL (CVSS 9.8)
- **Issue**: Multiple JS injection vulnerabilities via AST type confusion
- **CVE**: GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, GHSA-xhpv-hc6g-r9c6, GHSA-9cx6-37pm-9jff
- **Path**: ts-jest → jest → handlebars (transitive dependency)
- **Action**: Update jest/ts-jest or replace with alternative test framework
- **Timeline**: P1 - address within 1 sprint

### 2. **CRITICAL: protobufjs Arbitrary Code Execution (Portal Backend & Orchestrator)**
- **Package**: protobufjs@7.5.5
- **Severity**: CRITICAL (CVSS 9.8)
- **Issue**: Arbitrary code execution via code generation gadget chain
- **CVEs**: GHSA-xq3m-2v4x-88gg (primary), GHSA-75px-5xx7-5xc7 (secondary)
- **Path**: @opentelemetry/exporter-trace-otlp-http → protobufjs (transitive)
- **Action**: Update @opentelemetry packages to latest (currently 90+ versions behind)
- **Timeline**: P1 - address within 1 sprint

### 3. **HIGH: @opentelemetry Package Cluster (Portal Backend)**
- **Packages**: @opentelemetry/auto-instrumentations-node@0.40.0, @opentelemetry/sdk-node@0.47.0
- **Severity**: HIGH (CVSS 7.5)
- **Issue**: Prometheus exporter process crash via malformed HTTP request (DoS)
- **CVE**: GHSA-q7rr-3cgh-j5r3
- **Version Gap**: 0.40.0 → latest 0.76.0 (36 versions behind)
- **Action**: Update to @opentelemetry/auto-instrumentations-node@0.75.0+
- **Timeline**: P2 - within 2 sprints

## Package-by-Package Vulnerabilities

### npm Audit Summary by Directory

| Directory | Prod | Dev | Total | Critical | High | Medium | Low |
|-----------|------|-----|-------|----------|------|--------|-----|
| Source/Backend | 102 | 310 | 412 | 1 | 0 | 1 | 0 |
| Source/Frontend | 9 | 222 | 231 | 0 | 0 | 6 | 0 |
| Source/E2E | 4 | 0 | 4 | 0 | 0 | 0 | 0 | ✅
| platform/orchestrator | 153 | 0 | 156 | 1 | 1 | 1 | 0 |
| portal/Backend | 397 | 181 | 578 | 1 | 3 | 6 | 0 |
| portal/Frontend | 9 | 416 | 425 | 0 | 1 | 5 | 0 |
| **TOTAL** | **674** | **1129** | **1806** | **3** | **5** | **19** | **0** |

### Vulnerability Details by Package

#### Handlebars (Source/Backend)
- **Current**: 4.7.8 (via ts-jest/jest)
- **CVEs**: 8 vulnerabilities (1 CRITICAL, 3 HIGH, 3 MODERATE, 1 LOW)
- **Impact**: JavaScript injection, prototype pollution, type confusion attacks
- **Fix**: Upgrade jest/ts-jest or switch test framework

#### Protobufjs (Portal/Backend + Orchestrator)
- **Current**: 7.5.5
- **CVEs**: 9 vulnerabilities (1 CRITICAL, 4 HIGH, 3 MODERATE, 1 MODERATE)
- **Impact**: Arbitrary code execution, prototype injection, DoS via recursion
- **Root Cause**: transitive dependency via @opentelemetry
- **Fix**: Update @opentelemetry packages to versions that use protobufjs@>=7.5.6

#### path-to-regexp (Portal/Backend + Orchestrator)
- **Severity**: HIGH
- **CVE**: GHSA-37ch-88jc-xwx2 (ReDoS via multiple route parameters)
- **CVSS**: 7.5
- **Fix**: Update express or routing packages

#### Vite / Vitest (Frontend/Portal/Backend dev)
- **Severity**: MODERATE
- **CVEs**: 
  - Vite path traversal in `.map` handling (CWE-22)
  - esbuild source exposure (CWE-346)
  - PostCSS XSS via unescaped `</style>` (CWE-79)
- **Impact**: Dev-time security issues (source code disclosure, build-time injection)
- **Status**: Lower priority than production CVEs

#### Picomatch (Portal/Frontend)
- **Severity**: HIGH
- **CVE**: GHSA-c2c7-rcm5-vvqj (ReDoS via extglob quantifiers)
- **CVSS**: 7.5
- **Impact**: Glob pattern matching DoS

## Outdated Packages (>1 Major Version Behind)

### Source/Backend
- `express`: 4.18.2 → 5.2.1 (1 major version behind)
- `pino`: 8.17.0 → 10.3.1 (2 major versions behind) — likely missing security patches
- `uuid`: 9.0.0 → 14.0.0 (5 major versions behind)

### Portal/Backend
- `@opentelemetry/auto-instrumentations-node`: 0.40.0 → 0.76.0 (36 versions behind!) — CRITICAL URGENCY
- `@opentelemetry/exporter-trace-otlp-http`: 0.47.0 → 0.218.0 (171 versions behind!) — CRITICAL URGENCY
- `@opentelemetry/sdk-node`: 0.47.0 → 0.218.0 (171 versions behind!) — CRITICAL URGENCY
- `express`: 4.18.2 → 5.2.1 (1 major behind)
- `multer`: 1.4.5-lts.1 → 2.1.1 (1 major behind)
- `uuid`: 9.0.0 → 14.0.0 (5 major behind)

### Source/Frontend
- No major outdates (modern versions)

## License Compliance

✅ **Result**: No GPL/AGPL viral licenses detected.

**Licenses present:**
- MIT (primary)
- BSD-3-Clause (handlebars)
- ISC (e2e)

**Recommendation**: No license blocking issues. All major dependencies use permissive licenses compatible with private/commercial use.

## Abandoned Packages

✅ **Result**: No abandoned packages detected.
- express, pino, uuid, vite all have active maintenance
- @opentelemetry actively maintained (just older lock)

## Supply Chain Risk Assessment

### Post-Install Scripts
✅ **Result**: No post-install scripts detected in any manifest.

### Large Transitive Closure
⚠️ **Result**: Two packages exceed safe threshold:
- `portal/Backend`: 578 transitive dependencies (production focus on opentelemetry bloat)
- `portal/Frontend`: 425 transitive dependencies (test/build tooling)

**Recommendation**: 
- Portal/Backend is largest; consider splitting telemetry concerns
- Monitor for package duplication (multiple major versions of same package)

### Dependency Duplication
- Multiple versions of `vite`, `esbuild`, `postcss` across dev tooling
- No critical duplicates in production paths

## Recommendations by Priority

### P1 (This Sprint)
1. **Update @opentelemetry packages** in `portal/Backend`:
   - `@opentelemetry/auto-instrumentations-node` → 0.75.0+
   - `@opentelemetry/sdk-node` → 0.217.0+
   - `@opentelemetry/exporter-trace-otlp-http` → 0.47.0+
   - **Why**: Fixes CRITICAL protobufjs code execution
   
2. **Update handlebars** (via jest upgrade in `Source/Backend`):
   - Upgrade `jest` to 30.x+ or switch to vitest
   - **Why**: 8 vulnerabilities including CRITICAL JS injection

### P2 (Next Sprint)
3. Update `pino` in Source/Backend: 8.x → 10.3.1
4. Update `express` across all: 4.18.x → 4.22.x or 5.x
5. Update `uuid` across all: 9.x → 14.x
6. Update Vite/Vitest in dev dependencies

### P3 (Quarterly)
7. Audit large transitive closure in portal/Backend
8. Evaluate OpenTelemetry necessity vs. complexity tradeoff
9. Switch from picomatch to safer glob library if possible

## Known Issues Affecting Team

- `jest` + `ts-jest` bundling with old `handlebars` — may need test framework replacement
- `OpenTelemetry` versions are significantly behind, pulling in `protobufjs` with RCE
- No major architectural issues, but security patch lag is concerning for production deployment

## Audit Tools Available

- ✅ npm audit (all Node workspaces)
- ❌ pip-audit (not present — no Python deps found)
- ❌ govulncheck (not present — no Go modules found)

## Next Audit

**Recommended cadence**: Weekly (dev team pace) or bi-weekly (release-gated)
**Trigger**: Before any production deployment, after dependency updates, on security advisories
