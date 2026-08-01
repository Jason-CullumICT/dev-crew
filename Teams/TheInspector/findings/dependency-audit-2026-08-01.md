# Dependency Auditor Findings Report

**Generated:** 2026-08-01
**Project:** dev-crew  
**Auditor:** Dependency Auditor (dependency_auditor)

---

## Executive Summary

**Overall Assessment:** Grade D - Multiple critical and high-priority CVEs require immediate attention.

| Metric | Value |
|--------|-------|
| Package Managers | npm (5 workspaces) |
| Total Dependencies | 648+ (transitive) |
| P1 (Critical) CVEs | 2 |
| P2 (High) CVEs | 11 |
| P3 (Moderate) CVEs | 9 |
| Outdated Major Versions | 7 packages |
| License Issues | None |

---

## Audit Scope

The following projects were analyzed:

- **Source/Backend**: Express.js + Node.js runtime (412 transitive dependencies)
- **Source/Frontend**: React + Vite + TypeScript (231 transitive dependencies)  
- **Source/E2E**: Playwright (5 transitive dependencies)
- **platform/orchestrator**: gRPC + OpenTelemetry + Docker (large dependency tree)
- **portal/Backend & portal/Frontend**: Infrastructure UIs

---

## Critical Findings (P1) — Block Deployment

### DEP-001: protobufjs Arbitrary Code Execution

- **Severity:** **P1 (Critical)**
- **Category:** CVE
- **Package:** `protobufjs`
- **Location:** `platform/orchestrator/package.json` (transitive)
- **CVE ID:** GHSA-xq3m-2v4x-88gg
- **CVSS Score:** 9.8 (Critical)
- **Affected Versions:** `<7.5.5`

**Description:**  
Protobufjs is vulnerable to arbitrary code execution when deserializing untrusted `.proto` files. An attacker-controlled `.proto` file can execute arbitrary JavaScript code on the system. This affects the gRPC infrastructure of the orchestrator.

**Impact:** Remote code execution in the agent orchestration layer.

**Fix:**
```bash
cd platform/orchestrator
npm update protobufjs --save
```

**Cross-ref:** [ESCALATE → TheGuardians] - Arbitrary code execution risk in infrastructure.

---

### DEP-002: Vitest Arbitrary File Access & Execution

- **Severity:** **P1 (Critical)**
- **Category:** CVE
- **Package:** `vitest`
- **Location:** `Source/Frontend/package.json`
- **CVE ID:** GHSA-5xrq-8626-4rwp
- **CVSS Score:** 9.8 (Critical)
- **Affected Versions:** `<3.2.6`

**Description:**  
When the Vitest UI server is running (which it is during dev/test), an attacker can read arbitrary files from the filesystem and execute them. This is a critical local exposure vulnerability in the testing pipeline.

**Impact:** Local file disclosure and execution in development environment.

**Fix:**
```bash
cd Source/Frontend
npm update vitest@latest
# Note: Major version bump required (^2.0.5 → ^3.0.0+)
npm test  # Verify tests still pass
```

**Cross-ref:** [ESCALATE → TheGuardians] - Local file exposure in development pipeline.

---

## High-Priority CVEs (P2) — Address Within 1-2 Sprints

### DEP-003: handlebars Remote Code Execution

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `handlebars`
- **Location:** `Source/Backend/package.json` (transitive via express)
- **CVE ID:** GHSA-xql7-j68w-45gx
- **CVSS Score:** 8.1
- **Affected Versions:** `≤4.7.8`

**Description:** Handlebars is vulnerable to RCE via implicit property access in template compilation. An attacker can craft a template that executes arbitrary JavaScript.

**Fix:** `npm update handlebars` (via express ecosystem update)

**Cross-ref:** [ESCALATE → TheGuardians]

---

### DEP-004: brace-expansion Denial of Service

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `brace-expansion`
- **Location:** `Source/Backend/package.json` (transitive)
- **CVE ID:** GHSA-mh99-v99m-4gvg
- **CVSS Score:** 7.5
- **Affected Versions:** `<1.1.17`

**Description:** DoS via unbounded expansion causing out-of-memory crashes.

**Fix:** `npm update brace-expansion`

---

### DEP-005: form-data CRLF Injection

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `form-data`
- **Location:** Multiple projects (transitive)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx
- **CVSS Score:** 7.5
- **Affected Versions:** `4.0.0–4.0.5`

**Description:** CRLF injection via unescaped multipart field names.

**Fix:** `npm update form-data`

---

### DEP-006: vite server.fs.deny Bypass (Windows)

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `vite`
- **Location:** `Source/Frontend/package.json`
- **CVE ID:** GHSA-fx2h-pf6j-xcff
- **CVSS Score:** 7.5
- **Affected Versions:** `≤6.4.2`

**Description:** Path traversal via Windows alternate paths bypasses `server.fs.deny` restrictions, allowing arbitrary file disclosure.

**Fix:**
```bash
cd Source/Frontend
npm update vite@latest
# Major version bump from ^5.4.0 to ^8.2.0
npm run build  # Verify build still works
```

**Cross-ref:** [ESCALATE → TheGuardians] - File disclosure

---

### DEP-007: postcss Arbitrary File Read & XSS

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `postcss`
- **Location:** `Source/Frontend/package.json` (transitive via Vite)
- **CVE IDs:** GHSA-6g55-p6wh-862q, GHSA-qx2v-qp2m-jg93
- **CVSS Score:** 7.5, 6.1
- **Affected Versions:** `≤8.5.17`

**Description:** 
1. Arbitrary file read via `sourceMappingURL` comments
2. XSS via unescaped `</style>` tags in CSS stringify output

**Fix:** `npm update postcss`

**Cross-ref:** [ESCALATE → TheGuardians]

---

### DEP-008: @grpc/grpc-js Malformed Request Crash

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `@grpc/grpc-js`
- **Location:** `platform/orchestrator/package.json`
- **CVE IDs:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq
- **CVSS Score:** 7.5
- **Affected Versions:** `1.14.0–1.14.3`

**Description:** Malformed requests or compressed messages cause server/client crashes.

**Fix:** `npm update @grpc/grpc-js`

**Cross-ref:** [ESCALATE → TheGuardians]

---

### DEP-009: picomatch ReDoS & Method Injection

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `picomatch`
- **Location:** `portal/Frontend/package.json` (transitive)
- **CVE ID:** GHSA-c2c7-rcm5-vvqj
- **CVSS Score:** 7.5
- **Affected Versions:** `<2.3.2 || 4.0.0–4.0.3`

**Description:** ReDoS via extglob quantifiers.

**Fix:** `npm update picomatch`

---

### DEP-010: path-to-regexp ReDoS

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `path-to-regexp`
- **Location:** `platform/orchestrator/package.json` (transitive)
- **CVE ID:** GHSA-37ch-88jc-xwx2
- **CVSS Score:** 7.5
- **Affected Versions:** `<0.1.13`

**Description:** ReDoS via multiple route parameters.

**Fix:** `npm update path-to-regexp`

---

### DEP-011: @opentelemetry/auto-instrumentations-node Prometheus Crash

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `@opentelemetry/auto-instrumentations-node`
- **Location:** `portal/Backend/package.json`
- **CVE ID:** GHSA-q7rr-3cgh-j5r3
- **CVSS Score:** 7.5
- **Affected Versions:** `<0.75.0`

**Description:** Malformed HTTP requests crash the Prometheus exporter.

**Fix:** `npm update @opentelemetry/auto-instrumentations-node`

**Cross-ref:** [ESCALATE → TheGuardians]

---

## Moderate CVEs (P3) — Address Within 1 Month

| ID | Package | CVE | Version Range | Fix |
|----|---------|-----|---|---|
| DEP-012 | js-yaml | GHSA-52cp-r559-cp3m | `<3.15.0` | Update js-yaml |
| DEP-013 | qs | GHSA-q8mj-m7cp-5q26 | `6.11.1–6.15.1` | Update qs |
| DEP-014 | body-parser | GHSA-v422-hmwv-36x6 | `<1.20.6` | Update body-parser |
| DEP-015 | uuid | GHSA-w5hq-g745-h8pq | `<11.1.1` | Update uuid |
| DEP-016 | @babel/core | GHSA-4x5r-pxfx-6jf8 | `≤7.29.0` | Update @babel/core |
| DEP-017 | esbuild | GHSA-67mh-4wv8-2f99 | `≤0.24.2` | Update vite (includes esbuild) |
| DEP-018 | react-router-dom | Path normalization | Latest | Update react-router-dom |
| DEP-019 | @opentelemetry/core | GHSA-8988-4f7v-96qf | `<2.8.0` | Update @opentelemetry/sdk-node |
| DEP-020 | protobufjs | GHSA-66ff-xgx4-vchm | `<7.5.5` | Update protobufjs |

---

## Outdated Major Versions (P2-P3)

### DEP-021: express (3 Major Versions Behind)

- **Current:** 4.18.2
- **Latest:** 5.2.1
- **Status:** 2+ major versions behind
- **Severity:** P3
- **Fix:** `npm update express@latest`
- **Note:** Breaking changes; requires middleware and route testing

### DEP-022: pino (2 Major Versions Behind)

- **Current:** 8.17.0
- **Latest:** 10.3.1
- **Status:** 2 major versions behind
- **Severity:** P3
- **Fix:** `npm update pino@latest`

### DEP-023: uuid (5 Major Versions Behind + CVE)

- **Current:** 9.0.0
- **Latest:** 14.0.1
- **Status:** 5 major versions behind + has CVE (DEP-015)
- **Severity:** P2
- **Fix:** `npm update uuid@latest`
- **Priority:** High (combines outdated + vulnerability)

### DEP-024: react (1 Major Version Behind)

- **Current:** 18.3.1
- **Latest:** 19.2.8
- **Status:** 1 major version behind
- **Severity:** P3
- **Fix:** `npm update react@latest`
- **Note:** May require hook updates

### DEP-025: react-router-dom (1+ Major Version Behind)

- **Current:** 6.30.4
- **Latest:** 7.18.2
- **Severity:** P3
- **Fix:** `npm update react-router-dom@latest`

### DEP-026: vitest (1 Major Version Behind + Critical CVE)

- **Current:** 2.0.5
- **Latest:** 4.x
- **Status:** Multiple major versions behind + has P1 CVE (DEP-002)
- **Severity:** P2
- **Priority:** CRITICAL (blocks release)

### DEP-027: vite (3 Major Versions Behind + Multiple CVEs)

- **Current:** 5.4.0
- **Latest:** 8.2.0
- **Status:** 3 major versions behind + has P2 CVE (DEP-006)
- **Severity:** P2
- **Priority:** High (blocks frontend)

---

## Dependency Tree Analysis

### DEP-028: Large Backend Dependency Tree

| Metric | Value |
|--------|-------|
| Package | Source/Backend |
| Direct Dependencies | 7 |
| Transitive Dependencies | 412 |
| Severity | P4 (Informational) |

**Recommendation:** Monitor for duplicate versions and use `npm dedup`.

### DEP-029: Frontend Dependency Tree

| Metric | Value |
|--------|-------|
| Package | Source/Frontend |
| Direct Dependencies | 3 |
| Transitive Dependencies | 231 |
| Severity | P4 (Informational) |

**Recommendation:** React ecosystem creates substantial dependency tree; maintain consistency across versions.

### DEP-030: E2E Test Dependencies (Excellent)

| Metric | Value |
|--------|-------|
| Package | Source/E2E |
| Direct Dependencies | 1 |
| Transitive Dependencies | 5 |
| Severity | P4 (Good) |

**Status:** Minimal supply chain surface. Maintain this approach.

---

## License Compliance

**Status:** ✅ No issues detected.

All direct dependencies use standard OSS licenses (MIT, Apache 2.0, BSD). No GPL/AGPL viral licenses found. No license escalation required.

---

## Supply Chain Risk Assessment

- **Risk Level:** Moderate
- **Primary Concern:** Large transitive dependency trees increase vulnerability cascade risk
- **Mitigation:** 
  - Use `npm audit` in CI/CD gates
  - Establish automated dependency update cadence (Renovate.io or Dependabot)
  - Quarterly license compliance review

---

## Action Plan

### 🔴 IMMEDIATE (This Sprint)

**P1 Blockers — Do not deploy without fixing:**

1. **protobufjs RCE** (DEP-001)
   ```bash
   cd platform/orchestrator && npm update protobufjs
   ```

2. **Vitest File Access** (DEP-002) 
   ```bash
   cd Source/Frontend && npm update vitest@latest
   npm test --workspaces --if-present
   ```

### 🟠 SHORT-TERM (1-2 Sprints)

**P2 High-Priority:**

1. Vite path traversal (DEP-006) - Test frontend build
2. postcss file read + XSS (DEP-007)
3. @grpc/grpc-js crash fixes (DEP-008)
4. handlebars RCE (DEP-003)
5. All other P2 findings

### 🟡 MEDIUM-TERM (Within 1 Month)

**P3 Moderate CVEs + Outdated Packages:**

1. express major version upgrade (4→5)
2. pino major version upgrade (8→10)  
3. uuid major version upgrade (9→14)
4. React ecosystem updates
5. All P3 CVE fixes

### 🟢 LONG-TERM (Quarterly)

1. Set up Renovate.io or Dependabot for automated PRs
2. Add `npm audit` to CI/CD gates (fail on moderate+ in prod code)
3. Establish quarterly dependency review cadence
4. Monitor for CVE announcements in critical packages

---

## Cross-Team Escalation

### [ESCALATE → TheGuardians]

The following findings require security review before remediation:

- **DEP-001:** protobufjs RCE (arbitrary code execution)
- **DEP-002:** Vitest file access (local exposure in test infrastructure)
- **DEP-003:** handlebars RCE (code execution risk)
- **DEP-006:** vite path traversal (file disclosure)
- **DEP-007:** postcss file read + XSS (file disclosure + injection)
- **DEP-008:** @grpc/grpc-js crash (infrastructure DoS)
- **DEP-011:** @opentelemetry Prometheus crash (observability DoS)
- **DEP-017:** esbuild CORS bypass (dev server exposure)

### [ESCALATE → TheFixer]

Medium-priority remediation work:

- express, pino, uuid major version upgrades
- vite, vitest compatibility testing
- Breaking change integration testing

---

## Audit Methodology

1. **npm audit**: Ran `npm audit --json` on all workspaces
2. **npm outdated**: Checked for versions >1 major behind
3. **Lock file analysis**: Counted transitive dependencies from package-lock.json
4. **CVE research**: Cross-referenced advisories with GitHub Security Database
5. **License review**: Manual scan for GPL/AGPL/restrictive licenses

---

## Next Steps

1. Review and prioritize findings with team leadership
2. Dispatch security review to TheGuardians for P1-P2 items
3. Schedule breaking change testing for major version upgrades
4. Implement continuous dependency monitoring (Renovate/Dependabot)
5. Re-audit in 30 days to verify fixes

---

**Report Generated:** 2026-08-01  
**Auditor:** Dependency Auditor (dependency_auditor)  
**Contact:** TheInspector Team
