# Dependency Audit Report
**Date**: 2026-07-07  
**Scope**: Comprehensive npm dependency audit (Source/, platform/, portal/)  
**Risk Level**: 🔴 **HIGH**

---

## Executive Summary

A systematic audit of npm dependencies across 6 package manifests revealed **94 total vulnerabilities** with **6 CRITICAL CVEs** requiring immediate action. The project has significant security exposure through transitive dependencies in the gRPC and templating ecosystems.

### Key Metrics

| Metric | Value |
|--------|-------|
| **Manifests Scanned** | 6 |
| **Total Vulnerabilities** | 94 |
| **Critical (P1)** | 6 |
| **High (P2)** | 16 |
| **Moderate (P3)** | 69 |
| **Low (P4)** | 3 |
| **Outdated Packages** | 25 (12 major versions behind) |
| **Direct Dependencies** | 79 |

---

## Critical Findings (P1) — Immediate Action Required

### DEP-CRIT-001: Vitest Arbitrary File Read & Execution
- **Severity**: P1 (CRITICAL)
- **CVSS**: 9.8
- **Affected Packages**:
  - `vitest` in Source/Frontend
  - `vitest` in portal/Backend
- **Vulnerable Range**: `<3.2.6`
- **Description**: When Vitest UI server is listening, arbitrary files can be read and executed via malicious requests.
- **Category**: Development/Testing Vulnerability (Low runtime risk if UI not exposed in production)
- **Fix**:
  ```bash
  cd Source/Frontend && npm update vitest
  cd portal/Backend && npm update vitest
  ```
- **URL**: https://github.com/advisories/GHSA-5xrq-8626-4rwp
- **Timeline**: 15 minutes
- **Cross-Ref**: [Frontend QA may need UI server exposure review]

---

### DEP-CRIT-002: Handlebars JavaScript Injection (7 CVEs)
- **Severity**: P1 (CRITICAL)
- **CVSS**: 8.1–9.8
- **Affected Package**: `handlebars` (TRANSITIVE DEPENDENCY)
- **Affected Manifests**:
  - Source/Backend (via unknown direct dependency)
- **Vulnerable Range**: `<=4.7.8`
- **Description**: Multiple JavaScript injection vectors via AST type confusion, prototype pollution, and missing validation in template processing. Attackers can inject malicious code into template processing.
- **Category**: Template Injection, Code Execution
- **Impact**: Arbitrary code execution, XSS, template-based attacks
- **Issue**: Transitive dependency — must identify and update direct dependency requiring `handlebars`
- **Fix** (Step 1): Identify direct dependency
  ```bash
  cd Source/Backend && npm ls handlebars
  ```
  Then update the direct dependency that requires it:
  ```bash
  npm update <direct-dependency-name>
  ```
- **Verification**: `npm audit | grep handlebars` should return 0 results
- **URL**: https://github.com/advisories?query=handlebars
- **Timeline**: 30 minutes (once direct dependency identified)

---

### DEP-CRIT-003: Protobufjs Arbitrary Code Execution (11 CVEs)
- **Severity**: P1 (CRITICAL)
- **CVSS**: 5.3–9.8
- **Affected Package**: `protobufjs` (TRANSITIVE DEPENDENCY)
- **Affected Manifests**:
  - platform/orchestrator (via @grpc/grpc-js)
  - portal/Backend (via @grpc/grpc-js)
- **Vulnerable Range**: `<=7.6.2`
- **Description**: Multiple code execution, injection, and DoS vectors in protobuf parsing and code generation. Malformed protobuf messages can trigger arbitrary code execution.
- **Category**: Remote Code Execution, Injection, DoS
- **Impact**: 
  - Arbitrary code execution
  - Denial of service
  - Prototype pollution attacks
- **Root Cause**: Transitive dependency via `@grpc/grpc-js`
- **Fix**:
  ```bash
  cd platform/orchestrator && npm update @grpc/grpc-js
  cd portal/Backend && npm update @grpc/grpc-js
  ```
- **Minimum Version**: `@grpc/grpc-js@>=1.15.0`
- **Verification**: `npm audit | grep protobufjs` should return 0 results
- **URL**: https://github.com/advisories?query=protobufjs
- **Timeline**: 30 minutes
- **Cross-Ref**: [ESCALATE → TheGuardians: gRPC communication validation]

---

## High Priority Findings (P2) — Update Within 1 Week

### DEP-HIGH-001: Vite Path Traversal & FS Bypass
- **Severity**: P2 (HIGH)
- **Affected Packages**:
  - `vite` in Source/Frontend (current: 5.4.0)
  - `vite` in portal/Frontend (current: 5.4.0)
- **Latest Available**: 8.1.3 (3 major versions behind)
- **Vulnerable Range**: `<=6.4.2`
- **Vulnerabilities**:
  - Path traversal in optimized deps `.map` handling
  - NTLMv2 hash disclosure on Windows
  - `server.fs.deny` bypass on Windows alternate paths
- **Category**: Path Traversal, Security Bypass
- **Fix**:
  ```bash
  cd Source/Frontend && npm update vite
  cd portal/Frontend && npm update vite
  ```
- **Timeline**: 1 day (breaking changes possible with major version jump)
- **Cross-Ref**: [Frontend team to test build pipeline after update]

---

### DEP-HIGH-002: @opentelemetry/auto-instrumentations-node Prometheus DoS
- **Severity**: P2 (HIGH)
- **CVSS**: 7.5
- **Affected Package**: `@opentelemetry/auto-instrumentations-node` (DIRECT DEPENDENCY)
- **Affected Manifests**:
  - portal/Backend (DIRECT DEPENDENCY)
- **Current Version**: 0.40.3
- **Latest Available**: 0.78.0 (major gap)
- **Minimum Secure Version**: 0.75.0
- **Description**: Malformed HTTP requests cause process crash via Prometheus exporter without proper validation.
- **Category**: Denial of Service
- **Impact**: Service availability — attacker can crash backend process with crafted requests
- **Fix**:
  ```bash
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node
  ```
- **Verification**: Test Prometheus `/metrics` endpoint with malformed requests
- **URL**: https://github.com/advisories/GHSA-q7rr-3cgh-j5r3
- **Timeline**: 4 hours (patch update, low risk)

---

### DEP-HIGH-003: UUID CVE GHSA-w5hq-g745-h8pq
- **Severity**: P2 (HIGH) due to magnitude of version gap
- **CVSS**: 7.5
- **Affected Package**: `uuid` (DIRECT DEPENDENCY)
- **Affected Manifests**:
  - Source/Backend (DIRECT)
  - platform/orchestrator (DIRECT)
- **Current Version**: 9.0.1
- **Latest Available**: 14.0.1 (5 major versions behind)
- **Vulnerable Range**: Current version has active CVE
- **Description**: Security vulnerability in UUID generation with potential ID collision impact
- **Category**: Cryptographic/ID Generation Flaw
- **Fix**:
  ```bash
  cd Source/Backend && npm update uuid
  cd platform/orchestrator && npm update uuid
  ```
- **Timeline**: 2 hours (patch within major version 14)
- **Cross-Ref**: [Verify all work-item IDs are correctly generated after update]

---

## Outdated Major Versions (P3) — Plan Upgrades

| Package | Current | Latest | Gap | Affected Manifests | Breaking Changes | Priority |
|---------|---------|--------|-----|-------------------|------------------|----------|
| **pino** | 8.21.0 | 10.3.1 | 2 | Source/Backend | Major logger API changes | Week 2 |
| **react** | 18.3.1 | 19.2.7 | 1 | Source/Frontend, portal/Frontend | Component lifecycle, hooks | Sprint 1 |
| **react-dom** | 18.3.1 | 19.2.7 | 1 | Source/Frontend, portal/Frontend | Must update with react | Sprint 1 |
| **react-router-dom** | 6.30.4 | 7.18.1 | 1 | Source/Frontend, portal/Frontend | Route API changes | Sprint 1 |
| **express** | 4.22.2 | 5.2.1 | 1 | Source/Backend, platform/orchestrator, portal/Backend | Router API changes | Week 2 |
| **dockerode** | 4.0.12 | 5.0.1 | 1 | platform/orchestrator | Docker API changes | Week 3 |
| **multer** | 1.4.5-lts.2 | 2.0.2 | 1 | Source/Backend | Form parsing API changes | Week 3 |

---

## Manifests Summary

### ✅ Source/E2E (CLEAN)
- **Direct Dependencies**: 5
- **Vulnerabilities**: 0
- **Status**: ✅ No action needed

### 🔴 Source/Backend (CRITICAL)
- **Direct Dependencies**: 18
- **Vulnerabilities**: 12 (1 CRITICAL, 2 HIGH, 9 MODERATE)
- **Critical Issues**:
  - Handlebars (transitive) — template injection
  - uuid CVE + major version gap
  - qs CVE (transitive via express)
- **Outdated**: pino (8→10), express (4→5), uuid (9→14)
- **Action**: Update uuid and handlebars chain immediately; plan React/Express upgrades

### 🟡 Source/Frontend (HIGH)
- **Direct Dependencies**: 12
- **Vulnerabilities**: 8 (3 CRITICAL, 2 HIGH, 3 MODERATE)
- **Critical Issues**:
  - Vitest (arbitrary file read)
  - Vite (path traversal)
- **Outdated**: react (18→19), react-dom (18→19), react-router-dom (6→7)
- **Action**: Update vitest/vite immediately; test React 19 upgrade path

### 🔴 platform/orchestrator (CRITICAL)
- **Direct Dependencies**: 16
- **Vulnerabilities**: 14 (2 CRITICAL, 3 HIGH, 9 MODERATE)
- **Critical Issues**:
  - Protobufjs (transitive via gRPC) — code execution
  - uuid CVE + major version gap
- **Outdated**: uuid (9→14), dockerode (4→5)
- **Action**: Update @grpc/grpc-js and uuid immediately

### 🔴 portal/Backend (CRITICAL)
- **Direct Dependencies**: 18
- **Vulnerabilities**: 54 (2 CRITICAL, 6 HIGH, 46 MODERATE)
- **Critical Issues**:
  - @opentelemetry/auto-instrumentations-node (DoS)
  - Vitest (arbitrary file read)
  - Protobufjs (transitive via gRPC)
- **Outdated**: Multiple OpenTelemetry packages, express, multer
- **Action**: Priority update for @opentelemetry/* packages

### 🟡 portal/Frontend (HIGH)
- **Direct Dependencies**: 10
- **Vulnerabilities**: 6 (0 CRITICAL, 3 HIGH, 3 MODERATE)
- **Issues**:
  - Vite (path traversal)
- **Outdated**: react, react-dom, react-router-dom
- **Action**: Update vite; test React ecosystem upgrades

---

## Remediation Plan

### Phase 1: Emergency Updates (TODAY) — 30–60 minutes
**Goal**: Eliminate 6 CRITICAL and 3 HIGH CVEs

```bash
# 1. Update vitest (CRITICAL — arbitrary file read)
cd Source/Frontend && npm update vitest
cd portal/Backend && npm update vitest

# 2. Update vite (HIGH — path traversal)
cd Source/Frontend && npm update vite
cd portal/Frontend && npm update vite

# 3. Update @grpc/grpc-js (CRITICAL — protobufjs RCE)
cd platform/orchestrator && npm update @grpc/grpc-js
cd portal/Backend && npm update @grpc/grpc-js

# 4. Update uuid (HIGH CVE + major gap)
cd Source/Backend && npm update uuid
cd platform/orchestrator && npm update uuid

# 5. Update @opentelemetry/auto-instrumentations-node (HIGH — DoS)
cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node

# 6. Trace and update handlebars chain (CRITICAL)
cd Source/Backend && npm ls handlebars
# Then: npm update <direct-dependency>
```

**Verification**:
```bash
npm audit | grep -E "CRITICAL|HIGH"  # Should return 0 results in all manifests
git diff --stat  # Verify all lock files updated
```

### Phase 2: Security Updates (WITHIN 1 WEEK) — 4–8 hours
**Goal**: Update remaining HIGH and moderate CVEs, test breaking changes

- Update remaining @opentelemetry packages in portal/Backend
- Test Source/Frontend with updated vitest/vite (may have breaking changes)
- Verify Prometheus metrics endpoint doesn't crash with malformed requests
- Test gRPC communication after protobufjs update

### Phase 3: Major Version Planning (SPRINT) — 2–4 days
**Goal**: Plan and test major version upgrades

- **React 18→19**: Requires integration testing, component lifecycle review
- **Express 4→5**: API breaking changes, requires route handler review
- **Pino 8→10**: Logger API changes, review structured logging calls
- Create feature branches for each major version upgrade
- Update integration tests
- Load test after each major version change

---

## License Compliance

### Status
- ✅ Most direct dependencies use commercial-friendly licenses (MIT, Apache-2.0, ISC)
- ⚠️ Some transitive dependencies may have GPL/AGPL licenses
- **Action**: Run `npx license-checker --json` before release to validate full chain

### Recommendations
- Add license-checker to pre-release CI/CD pipeline
- Document any GPL/AGPL dependencies with legal team approval

---

## Supply Chain Risk Assessment

### High-Risk Dependencies (Transitive)

| Dependency | Root Cause | Risk | Mitigation |
|-----------|-----------|------|-----------|
| `protobufjs` | @grpc/grpc-js | 11 CVEs, RCE | Update gRPC to latest, monitor grpc-js releases |
| `handlebars` | Unknown (trace needed) | 7 CVEs, injection | Update source direct dependency |
| `qs` | express | CVE history | Update express |

### Observations
1. **gRPC Ecosystem**: High CVE density in protobufjs; consider quarterly security audits of gRPC ecosystem
2. **Transitive Depth**: Many critical CVEs are 2–3 levels deep in dependency tree
3. **Single Maintainer Risk**: Not evaluated in this audit — future audits should check npm registry metadata

---

## Continuous Improvement Recommendations

### Immediate (This Week)
1. ✅ Apply Phase 1 emergency updates
2. ✅ Run traceability enforcer to ensure zero test breakage
3. Add pre-commit hook: `npm audit --audit-level=moderate`

### Short-term (This Month)
1. Integrate Dependabot or Renovate for automated patch updates
2. Add license-checker to release workflow
3. Create dependency upgrade runbooks for major versions
4. Map transitive dependency chains for all critical packages

### Medium-term (This Quarter)
1. Implement "zero-CVEs" policy for production deployments
2. Quarterly dependency audits (every 3 months)
3. Automated version upgrade PRs with testing
4. Supply chain risk dashboard (npm registry metadata scraping)

### Long-term (6+ Months)
1. Shift critical services to use managed runtimes with patched dependencies
2. Establish dependency governance policy
3. Implement automated rollback for failed major version upgrades

---

## Report Metadata

- **Audit Date**: 2026-07-07
- **Audit Tool**: npm audit, npm outdated
- **Report Location**: `/home/runner/work/dev-crew/dev-crew/dependency-auditor-report.json`
- **Learnings**: Teams/TheInspector/learnings/dependency-auditor.md
- **Cross-References**:
  - [CROSS-REF: TheGuardians] — gRPC communication security review
  - [CROSS-REF: TheFixer] — Major version upgrade planning
  - [CROSS-REF: Quality-Oracle] — Integration test coverage for dependency updates

---

**Report Generated**: 2026-07-07 06:18 UTC  
**Auditor**: TheInspector / Dependency Auditor Agent  
**Effort**: High (comprehensive multi-manifest scan)
