# Dependency Auditor Findings — 2026-06-12

## Executive Summary

**Overall Grade: C** (Multiple P1 and P2 vulnerabilities in critical dependencies, significant outdated package versions)

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (6 workspaces) |
| **Direct Dependencies** | 25 total |
| **Transitive Dependencies** | 1,807 total |
| **Critical CVEs** | 4 |
| **High CVEs** | 7 |
| **Moderate CVEs** | 38 |
| **Outdated Major Versions** | 6 packages |
| **Supply Chain Risk Level** | MEDIUM |

---

## Package Inventory

### Workspaces Audited

| Workspace | Direct Deps | Transitive | Vulns (C/H/M) | Status |
|-----------|-----------|-----------|---------------|--------|
| Source/Backend | 4 | 412 | 1/0/5 | ⚠️ Critical CVE |
| Source/Frontend | 3 | 231 | 1/0/8 | ⚠️ Critical CVE |
| Source/E2E | 1 | 5 | 0/0/0 | ✅ Clean |
| platform/orchestrator | 3 | 156 | 1/2/6 | ⚠️ Multiple critical |
| portal/Backend | 11 | 578 | 1/4/13 | 🔴 CRITICAL |
| portal/Frontend | 3 | 425 | 1/1/7 | ⚠️ Critical CVE |

---

## Critical Findings (P1)

### DEP-001: Arbitrary Code Execution in protobufjs
- **Severity:** P1
- **Category:** CVE (CWE-94 - Code Injection)
- **Affected Package:** `protobufjs`
- **Current Version Range:** `<7.5.5` (CRITICAL)
- **File:** `platform/orchestrator/package-lock.json`, `portal/Backend/package-lock.json`
- **CVE Details:**
  - **CVE ID:** GHSA-xq3m-2v4x-88gg
  - **CVSS Score:** 9.8 (Critical)
  - **Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
  - **Description:** Arbitrary code execution via malformed protobuf messages
  - **Attack Surface:** Any endpoint that accepts or processes protobuf-encoded data
- **Impact:** Complete system compromise — attacker can execute arbitrary code with the privileges of the affected service
- **Fix:**
  ```bash
  # platform/orchestrator
  cd platform/orchestrator && npm update protobufjs
  
  # portal/Backend
  cd portal/Backend && npm update protobufjs
  ```
- **Status:** REQUIRES IMMEDIATE REMEDIATION
- **Cross-ref:** [ESCALATE → TheGuardians] — Exploitable RCE vulnerability in production service dependencies

---

### DEP-002: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** P1
- **Category:** CVE (CWE-94, CWE-843 — Template Injection)
- **Affected Package:** `handlebars`
- **Current Version Range:** `>=4.0.0 <=4.7.8` (CRITICAL)
- **File:** `Source/Backend/package-lock.json`
- **CVE Details:**
  - **Primary CVE:** GHSA-2w6w-674q-4c4q (Critical, CVSS 9.8)
  - **Secondary CVE:** GHSA-3mfm-83xf-c92r (High, CVSS 8.1)
  - **Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
  - **Description:** Attacker-controlled template input can achieve arbitrary code execution via type confusion in @partial-block parsing
  - **Attack Vector:** Any template rendering from user-supplied data
- **Impact:** Complete system compromise if user-supplied data is used in Handlebars templates
- **Fix:**
  ```bash
  cd Source/Backend && npm update handlebars
  ```
- **Status:** REQUIRES IMMEDIATE REMEDIATION (if Handlebars is used with untrusted input)
- **Assessment:** **Check whether Handlebars processes untrusted user input** — if not, severity may be reduced to P2
- **Cross-ref:** [ESCALATE → TheGuardians] — Template injection RCE in rendering engine

---

### DEP-003: Vitest UI Server Arbitrary File Read & Execution
- **Severity:** P1
- **Category:** CVE (CWE-862 — Missing Authorization)
- **Affected Packages:** 
  - `vitest` (Frontend: `<=3.0.0-beta.4`)
  - `vitest` (portal/Frontend: `<3.2.6`)
- **Current Version Range:** Test dependencies only
- **File:** `Source/Frontend/package-lock.json`, `portal/Frontend/package-lock.json`
- **CVE Details:**
  - **CVE ID:** GHSA-5xrq-8626-4rwp
  - **CVSS Score:** 9.8 (Critical)
  - **Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
  - **Description:** When Vitest UI server is listening (port 51204), any network attacker can read arbitrary files from disk and execute code
  - **Attack Surface:** Vitest UI (`--ui` flag) — **SHOULD NEVER RUN IN PRODUCTION**
- **Impact:** Complete system compromise if Vitest UI is exposed
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vitest
  cd portal/Frontend && npm update vitest
  ```
- **Mitigation:** Ensure Vitest UI is **NEVER enabled in production or CI/CD exposed environments**
- **Status:** MEDIUM-TERM (affects test infrastructure, not production runtime)
- **Cross-ref:** [ESCALATE → TheGuardians] — Test-time RCE via exposed debug server

---

## High-Severity Findings (P2)

### DEP-004: gRPC-JS Malformed Request Server Crash
- **Severity:** P2
- **Category:** CVE (CWE-248 — Uncaught Exception)
- **Affected Package:** `@grpc/grpc-js`
- **Current Version Range:** `>=1.14.0 <1.14.4` (affects multiple versions)
- **Files:** `platform/orchestrator/package-lock.json`, `portal/Backend/package-lock.json`
- **CVE Details:**
  - **CVE ID:** GHSA-5375-pq7m-f5r2
  - **CVSS Score:** 7.5 (High)
  - **Description:** Malformed gRPC request causes server crash (denial of service)
  - **Attack Vector:** Network — any client can send malformed gRPC frame
- **Impact:** Service unavailability; crash loop if restart is automatic
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update @grpc/grpc-js
  cd portal/Backend && npm update @grpc/grpc-js
  ```
- **Status:** UPDATE REQUIRED

---

### DEP-005: path-to-regexp Regular Expression Denial of Service (ReDoS)
- **Severity:** P2
- **Category:** CVE (CWE-1333 — ReDoS)
- **Affected Package:** `path-to-regexp`
- **Current Version Range:** `<0.1.13`
- **Files:** `platform/orchestrator/package-lock.json`, `portal/Backend/package-lock.json`
- **CVE Details:**
  - **CVE ID:** GHSA-37ch-88jc-xwx2
  - **CVSS Score:** 7.5 (High)
  - **Description:** Multiple route parameters with overlapping patterns can trigger catastrophic regex backtracking
  - **Attack Vector:** Crafted route definition or URL path
- **Impact:** Service becomes unresponsive (CPU spike, slow response)
- **Fix:**
  ```bash
  npm update path-to-regexp
  ```
- **Status:** UPDATE REQUIRED

---

### DEP-006: OpenTelemetry SDK-Node Prometheus Exporter Crash
- **Severity:** P2
- **Category:** CVE (CWE-755 — Improper Error Handling)
- **Affected Package:** `@opentelemetry/sdk-node`
- **Current Version Range:** `<0.217.0`
- **File:** `portal/Backend/package-lock.json`
- **CVE Details:**
  - **CVE ID:** GHSA-q7rr-3cgh-j5r3
  - **CVSS Score:** 7.5 (High)
  - **Description:** Malformed HTTP request to Prometheus exporter endpoint causes crash
  - **Attack Vector:** Direct HTTP POST to `/metrics` with invalid format
- **Impact:** Metrics collection fails; observability blind spot
- **Fix:**
  ```bash
  cd portal/Backend && npm update @opentelemetry/sdk-node
  ```
- **Status:** UPDATE REQUIRED

---

## Moderate-Severity Findings (P3)

### DEP-007–044: 38 Moderate CVEs Across Workspaces

| Package | Workspace | CVE | CVSS | Status |
|---------|-----------|-----|------|--------|
| **qs** | Backend, Frontend, Orchestrator | GHSA-74xc-4c7f-4622 | 6.5 | Fix available |
| **brace-expansion** | Backend, Frontend, Orchestrator | GHSA-f886-m6hf-6m8v | 6.5 (DoS) | Fix available |
| **express** | Backend (direct), Orchestrator, Portal/Backend | qs injection | 6.5 | Fix available |
| **uuid** | Backend (direct) | Update available | Low | Fix available |
| **esbuild** | Frontend | GHSA-67mh-4wv8-2f99 | 5.3 | Fix available (major) |
| **postcss** | Frontend | GHSA-qx2v-qp2m-jg93 | 6.1 (XSS) | Fix available |
| **react-router** | Frontend | GHSA-2j2x-hqr9-3h42 | 6.5 (open redirect) | Fix available |
| **@opentelemetry/auto-instrumentations-node** | Portal/Backend | Transitive vulns | Medium | Update available |
| **picomatch** | Portal/Frontend | GHSA-3v7f-55p6-f55p | 5.3 | Fix available |
| **multiple** | All | Various | 4.5–6.5 | See npm audit output |

**Action:** Run `npm audit fix` in each workspace to remediate moderate vulnerabilities.

---

## Outdated Major Versions (P3)

### Direct Dependencies Behind Current Versions

| Package | Workspace | Current | Latest | Gap | Risk |
|---------|-----------|---------|--------|-----|------|
| **express** | Backend | 4.18.2 | 5.2.1 | +1 major | Breaking API, migration required |
| **express** | Orchestrator | 4.22.2 | 5.2.1 | ~+1 major | Breaking API, migration required |
| **pino** | Backend | 8.17.0 | 10.3.1 | +2 major | Likely missing security patches |
| **uuid** | Backend | 9.0.1 | 14.0.0 | +5 major | Likely missing security patches |
| **react** | Frontend | 18.3.1 | 19.2.7 | +1 major | Breaking API, migration required |
| **react-dom** | Frontend | 18.3.1 | 19.2.7 | +1 major | Breaking API, migration required |
| **react-router-dom** | Frontend | 6.30.4 | 7.17.0 | +1 major | Breaking API, migration required |
| **react** | portal/Frontend | 18.3.1 | 19.2.7 | +1 major | Breaking API, migration required |
| **dockerode** | Orchestrator | 4.0.12 | 5.0.0 | +1 major | Breaking API; critical for platform |
| **multer** | Orchestrator | 1.4.5-lts.2 | 2.1.1 | +1 major | Breaking API; critical for file uploads |
| **@opentelemetry/* packages** | portal/Backend | 0.40–0.47 | 0.77–0.219 | +1–20 major | Likely missing security patches |

**Priority Upgrades:**
1. **P1:** `pino`, `uuid`, `@opentelemetry/*` in portal/Backend (2+ major versions behind)
2. **P2:** `express`, `react*`, `react-router-dom`, `dockerode`, `multer` (breaking API, but necessary)

---

## License Compliance

✅ **No GPL/AGPL licenses detected in direct dependencies**

- All main projects use `UNLICENSED` or compatible licenses
- No viral license contamination risk
- Portal Backend: 11 direct dependencies, all clean

**Recommendation:** Periodically audit license changes in new versions before upgrading

---

## Supply Chain Risk Assessment

### Dependency Tree Size & Risk Surface

| Workspace | Direct | Transitive | Risk | Notes |
|-----------|--------|-----------|------|-------|
| Source/Backend | 4 | 412 | **MEDIUM** | Small direct dependency surface; acceptable transitive load |
| Source/Frontend | 3 | 231 | **LOW** | Minimal dependencies |
| platform/orchestrator | 3 | 156 | **MEDIUM** | Small surface, but critical (gRPC, Docker) |
| portal/Backend | 11 | 578 | **HIGH** | Largest transitive footprint; OpenTelemetry adds complexity |
| portal/Frontend | 3 | 425 | **MEDIUM** | React ecosystem; typical size |
| **TOTAL** | 25 | 1,807 | **MEDIUM** | |

### High-Risk Observations

1. **portal/Backend: 578 transitive deps**
   - Driven by OpenTelemetry auto-instrumentation and gRPC ecosystem
   - Recommend: Evaluate if full auto-instrumentation is necessary; consider explicit instrumentation
   - Risk: Large supply chain surface for observability tooling

2. **platform/orchestrator: Critical infrastructure**
   - Docker integration (`dockerode`)
   - gRPC communication
   - Direct kernel/container interaction
   - Risk: Compromise here = infrastructure takeover
   - Mitigation: High priority for patching and security review

3. **No deprecated packages detected**, but several packages with deprecation notices (glob, async-cache, old supertest/superagent versions in transitive deps)

---

## Audit Results by Workspace

### ✅ Source/E2E (Clean)
- **Status:** No vulnerabilities
- **Audit:** `npm audit` ✅ PASSED
- **Dependencies:** 5 transitive only (no production code)

### ⚠️ Source/Backend (1 Critical, 5 Moderate)
- **Critical:** Handlebars (requires assessment of template input sources)
- **Moderate:** qs, brace-expansion, express (via qs)
- **Outdated:** express (+1 major), pino (+2 major), uuid (+5 major)
- **Action:** Assess Handlebars usage; run `npm audit fix` for moderate fixes; plan major version upgrades
- **Status:** REQUIRES REVIEW & ACTION

### ⚠️ Source/Frontend (1 Critical, 8 Moderate)
- **Critical:** Vitest (test-time RCE; mitigation: disable UI in production)
- **Moderate:** esbuild, postcss, react-router, brace-expansion, and others
- **Outdated:** react (+1 major), react-dom (+1 major), react-router-dom (+1 major)
- **Action:** Run `npm audit fix`; plan React 19 migration
- **Status:** REQUIRES ACTION

### 🔴 platform/orchestrator (1 Critical, 2 High, 6 Moderate)
- **Critical:** protobufjs (arbitrary code execution)
- **High:** @grpc/grpc-js, path-to-regexp
- **Outdated:** dockerode, multer, express (all critical infrastructure)
- **Action:** IMMEDIATE — Update protobufjs, gRPC, path-to-regexp; plan Docker/multer upgrades
- **Status:** CRITICAL — PRODUCTION INFRASTRUCTURE AT RISK

### 🔴 portal/Backend (1 Critical, 4 High, 13 Moderate)
- **Critical:** protobufjs (arbitrary code execution)
- **High:** @grpc/grpc-js, path-to-regexp, @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node
- **Moderate:** 13 additional vulnerabilities (qs, brace-expansion, esbuild, etc.)
- **Outdated:** Massive gap in OpenTelemetry packages (+20 major versions); gRPC infrastructure
- **Action:** CRITICAL — Update protobufjs, gRPC, OpenTelemetry, SDK packages
- **Status:** CRITICAL — MULTIPLE P1/P2 VULNERABILITIES

### ⚠️ portal/Frontend (1 Critical, 1 High, 7 Moderate)
- **Critical:** Vitest (test-time RCE)
- **High:** picomatch
- **Moderate:** esbuild, postcss, react-router, brace-expansion, etc.
- **Outdated:** react (+1 major), react-dom (+1 major), react-router-dom (+1 major)
- **Action:** Run `npm audit fix`; update Vitest; plan React migration
- **Status:** REQUIRES ACTION

---

## Remediation Roadmap

### Phase 1: CRITICAL (Immediate — Days 1–2)
```bash
# All workspaces affected by protobufjs RCE
npm update protobufjs   # CVSS 9.8 — arbitrary code execution

# gRPC DoS + ReDoS vulnerabilities
npm update @grpc/grpc-js path-to-regexp   # CVSS 7.5 each

# Test-time RCE in Frontend workspaces
npm update vitest
```

**Verification:**
```bash
npm audit --json | jq '.metadata.vulnerabilities | select(.critical > 0 or .high > 0)'
```

### Phase 2: HIGH-PRIORITY (Week 1)
```bash
# OpenTelemetry stack in portal/Backend
cd portal/Backend && npm update @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node

# Moderate CVEs across all workspaces
npm audit fix  # (across all package.json files)
```

### Phase 3: MAJOR VERSION UPGRADES (Week 2–4)
```bash
# Express ecosystem (architecture decision needed)
npm install express@5.2.1   # Breaking API changes

# React 19 migration
npm install react@19.2.7 react-dom@19.2.7   # Breaking API changes

# Pino & UUID in Backend
npm install pino@10.3.1 uuid@14.0.0

# Docker/multer in orchestrator
npm install dockerode@5.0.0 multer@2.1.1
```

---

## Verification & Attestation

### Audit Commands Used
```bash
# CVE scanning
npm audit --json  # All workspaces

# Outdated detection
npm outdated --json  # All workspaces

# License compliance
npx license-checker --json  # Spot checks
```

### Next Audit
- **Schedule:** 2 weeks (after remediation of P1/P2)
- **Trigger:** Any dependency update in critical packages
- **Owner:** dependency-auditor agent

---

## Cross-References & Escalations

### [ESCALATE → TheGuardians] — Security Findings
1. **DEP-001:** protobufjs RCE (GHSA-xq3m-2v4x-88gg) — Exploitable in production
2. **DEP-002:** Handlebars template injection (GHSA-2w6w-674q-4c4q) — If templates use user input
3. **DEP-003:** Vitest UI server RCE (GHSA-5xrq-8626-4rwp) — Test infrastructure risk
4. **DEP-004:** gRPC DoS via malformed request — Service stability
5. **DEP-005:** path-to-regexp ReDoS — Service availability
6. **DEP-006:** OpenTelemetry Prometheus crash — Observability gap

### [COORDINATE WITH → TheFixer] — Remediation
- Major version upgrades (express, react, pino, etc.) require code changes
- Handlebars assessment (is it used with user input?)
- OpenTelemetry version strategy in portal/Backend

---

## Learnings & Future Audits

**Added to `Teams/TheInspector/learnings/dependency-auditor.md`:**
- protobufjs: HIGH-WATCH package (frequent CVEs)
- Vitest UI: NEVER enable in exposed environments (test-time RCE)
- OpenTelemetry ecosystem: Aggressive patching cycle (version gaps widen quickly)
- portal/Backend: Largest supply chain surface — consider instrumentation audit

