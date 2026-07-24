# Dependency Auditor: Security & Compliance Audit

**Date:** 2026-07-24  
**Scope:** dev-crew monorepo (npm packages only)  
**Audit Tool:** npm audit v10.6.4 + manual analysis  
**Report Grade:** **C** (multiple P1/P2 vulnerabilities)

---

## Executive Summary

| Metric | Count | Status |
|--------|-------|--------|
| **Critical CVEs (P1)** | 3 | 🔴 FAILS |
| **High CVEs (P2)** | 8 | 🔴 REQUIRES ACTION |
| **Moderate CVEs (P3)** | 24 | 🟡 ACCEPTABLE |
| **Total CVEs** | 35 | — |
| **Outdated Major Versions** | 6 | 🟡 CHECK COMPATIBILITY |
| **Deprecated Packages** | 0 | ✅ PASS |
| **License Conflicts** | 0 | ✅ PASS |
| **Total Workspaces** | 6 | — |
| **Total Dependencies** | ~950 transitive | — |

---

## Critical Findings (P1 - MUST FIX IMMEDIATELY)

### DEP-001: Vitest Arbitrary File Read & Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest
- **Version:** ≤3.2.5 (installed: 2.0.5 in Frontend, 1.4.0 in Portal/Frontend)
- **File:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-5xrq-8626-4rwp (9.8/10 CVSS)
- **Detail:** When Vitest UI server is listening on dev machine, an attacker can read arbitrary files and execute code. This affects development environments. **Development-only risk but critical when server is running.**
- **Impact:** Arbitrary code execution on developer machine during testing
- **Fix:** Upgrade to vitest ≥3.2.6 or ≥4.1.10 (major version bump required)
- **Commands:**
  ```bash
  cd Source/Frontend && npm install vitest@latest
  cd portal/Frontend && npm install vitest@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE risk during development

### DEP-002: Handlebars JavaScript Injection & Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars
- **Version:** 4.0.0–4.7.8
- **File:** Source/Backend/package.json
- **CVE:** GHSA-2w6w-674q-4c4q (9.8/10 CVSS)
- **Detail:** Multiple critical vulnerabilities in Handlebars templating:
  - JavaScript injection via AST type confusion (GHSA-2w6w-674q-4c4q)
  - Prototype pollution leading to XSS (GHSA-2qvq-rjwj-gvw9)
  - Denial of service via malformed decorators (GHSA-9cx6-37pm-9jff)
  - CLI precompiler JavaScript injection (GHSA-xjpj-3mr7-gcpf)
- **Root Cause:** Handlebars is a transitive dependency (pulled in via build tools)
- **Impact:** Template injection → RCE on backend if user-supplied templates are compiled
- **Fix:** Upgrade handlebars or remove if not directly used; npm audit fix
- **Commands:**
  ```bash
  cd Source/Backend && npm audit fix
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Template injection RCE

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** protobufjs
- **Version:** ≤7.6.4
- **File:** portal/Backend/package.json
- **CVE:** GHSA-xq3m-2v4x-88gg (9.8/10 CVSS)
- **Detail:** Protobufjs code generation gadget allows arbitrary code execution via:
  - Code injection through bytes field defaults (GHSA-66ff-xgx4-vchm)
  - Prototype injection in message constructors (GHSA-fx83-v9x8-x52w)
  - Unsafe option paths leading to process-wide DoS (GHSA-jvwf-75h9-cwgg)
- **Impact:** Attacker-controlled .proto files or OpenTelemetry GRPC messages can trigger RCE
- **Fix:** Upgrade protobufjs to ≥7.6.5 or update @opentelemetry/sdk-node to ≥0.221.0
- **Commands:**
  ```bash
  cd portal/Backend && npm install protobufjs@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Code generation RCE

---

## High-Priority Findings (P2 - FIX IN NEXT RELEASE)

### DEP-004: OpenTelemetry Prometheus Exporter DoS Crash
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** @opentelemetry/auto-instrumentations-node
- **Version:** ≤0.76.0
- **File:** portal/Backend/package.json
- **CVE:** GHSA-q7rr-3cgh-j5r3 (7.5/10 CVSS)
- **Detail:** Malformed HTTP request to Prometheus exporter crashes process
- **Fix:** Upgrade to @opentelemetry/auto-instrumentations-node ≥0.79.0 (major version)
- **Commands:**
  ```bash
  cd portal/Backend && npm install @opentelemetry/auto-instrumentations-node@latest
  ```

### DEP-005: gRPC Malformed Request DoS & Crash
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** @grpc/grpc-js
- **Version:** 1.14.0–1.14.3
- **File:** portal/Backend/package.json
- **CVE:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq (7.5/10 CVSS each)
- **Detail:** Malformed or compressed gRPC messages crash server
- **Fix:** Upgrade @grpc/grpc-js to ≥1.14.4
- **Commands:**
  ```bash
  cd portal/Backend && npm install @grpc/grpc-js@latest
  ```

### DEP-006: PostCSS File Read & XSS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** postcss
- **Version:** ≤8.5.11
- **File:** portal/Frontend/package.json
- **CVE:** GHSA-6g55-p6wh-862q (7.5/10 CVSS) + GHSA-qx2v-qp2m-jg93
- **Detail:** PostCSS reads arbitrary files via sourceMappingURL in CSS comments; XSS via unescaped CSS output
- **Fix:** Upgrade to postcss ≥8.5.12
- **Commands:**
  ```bash
  cd portal/Frontend && npm install postcss@latest
  ```

### DEP-007: Vite Path Traversal & fs.deny Bypass
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** vite
- **Version:** ≤6.4.2
- **File:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-fx2h-pf6j-xcff (7.5/10 CVSS) + GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3
- **Detail:** Path traversal in optimized deps; Windows alternate path bypass of server.fs.deny security boundary
- **Fix:** Upgrade to vite ≥6.4.3 or ≥8.1.5 (major version)
- **Commands:**
  ```bash
  cd Source/Frontend && npm install vite@latest
  cd portal/Frontend && npm install vite@latest
  ```

### DEP-008: React Router Open Redirect & XSS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** react-router-dom
- **Version:** 6.6.3–6.30.4, 6.0.0–7.17.0 (react-router)
- **File:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-jjmj-jmhj-qwj2 (6.9/10 CVSS), GHSA-2j2x-hqr9-3h42, GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg
- **Detail:** Multiple open redirect vulnerabilities:
  - XSS via protocol-relative URL reinterpretation (path starting //)
  - Backslash bypass in Link & useNavigate (CWE-601)
  - Arbitrary constructor injection in SSR hydration (CWE-470)
- **Fix:** Upgrade react-router-dom to ≥7.18.0
- **Commands:**
  ```bash
  cd Source/Frontend && npm install react-router-dom@latest
  cd portal/Frontend && npm install react-router-dom@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Open redirect leading to XSS

### DEP-009: Form-Data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data
- **Version:** 4.0.0–4.0.5
- **File:** Transitive (via dockerode, multer, supertest)
- **CVE:** GHSA-hmw2-7cc7-3qxx (7.5/10 CVSS)
- **Detail:** Unescaped multipart field names/filenames allow CRLF injection in HTTP headers
- **Fix:** Upgrade form-data to ≥4.0.6
- **Commands:**
  ```bash
  npm audit fix --workspaces
  ```

### DEP-010: Brace-Expansion DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** brace-expansion
- **Version:** <1.1.16
- **File:** Transitive (glob utility)
- **CVE:** GHSA-3jxr-9vmj-r5cp (5.3/10 CVSS)
- **Detail:** Exponential-time expansion of consecutive `{}` groups causes process hang and memory exhaustion
- **Fix:** Upgrade brace-expansion to ≥1.1.16
- **Commands:**
  ```bash
  npm audit fix --workspaces
  ```

### DEP-011: Path-to-Regexp ReDoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** path-to-regexp
- **Version:** <0.1.13
- **File:** portal/Backend/package.json
- **CVE:** GHSA-37ch-88jc-xwx2 (7.5/10 CVSS)
- **Detail:** Regular expression denial of service via multiple route parameters
- **Fix:** Upgrade path-to-regexp to ≥0.1.13
- **Commands:**
  ```bash
  cd portal/Backend && npm audit fix
  ```

### DEP-012: WebSocket Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** ws
- **Version:** 8.0.0–8.20.1
- **File:** Transitive (vitest, dev servers)
- **CVE:** GHSA-96hv-2xvq-fx4p (7.5/10 CVSS)
- **Detail:** Memory exhaustion from tiny fragments and data chunks causes DoS
- **Fix:** Upgrade ws to ≥8.21.0
- **Commands:**
  ```bash
  npm audit fix --workspaces
  ```

---

## Moderate Findings (P3 - PLAN UPGRADE PATH)

| Package | CVE | Issue | Fix |
|---------|-----|-------|-----|
| uuid | GHSA-w5hq-g745-h8pq | Missing buffer bounds check in v3/v5/v6 | Upgrade to ≥11.1.1 |
| body-parser | GHSA-v422-hmwv-36x6 | DoS via invalid limit value | Upgrade to ≥1.20.6 |
| qs | GHSA-q8mj-m7cp-5q26 | DoS via qs.stringify crash | Upgrade to ≥6.15.2 |
| @babel/core | GHSA-4x5r-pxfx-6jf8 | Arbitrary file read via sourceMappingURL | Upgrade to ≥7.29.1 |
| picomatch | GHSA-c2c7-rcm5-vvqj | ReDoS via extglob quantifiers | Upgrade to ≥2.3.2 or ≥4.0.4 |
| js-yaml | GHSA-52cp-r559-cp3m | Quadratic-complexity DoS in merge key | Upgrade to ≥3.15.0 |
| @opentelemetry/core | GHSA-8988-4f7v-96qf | Unbounded memory allocation in W3C Baggage | Upgrade @opentelemetry/sdk-node to ≥0.221.0 |
| **Multiple @opentelemetry/** | Various | Transitive dependencies in auto-instrumentations-node | Upgrade @opentelemetry/auto-instrumentations-node to ≥0.79.0 |

---

## Outdated Packages (>1 Major Version Behind)

### Critical Upgrades (2+ major versions behind)

| Package | Current | Latest | Workspace | Risk |
|---------|---------|--------|-----------|------|
| express | 4.18.2 → 4.22.2 | 5.2.1 | Source/Backend, platform/orchestrator | ⚠️ Major bump required; breaking changes |
| pino | 8.17.0 → 8.21.0 | 10.3.1 | Source/Backend | ⚠️ 2 major versions; check compatibility |
| uuid | 9.0.0 → 9.0.1 | 14.0.1 | Source/Backend | ⚠️ 5 major versions |
| react | 18.3.1 | 19.2.8 | Source/Frontend | ⚠️ 1 major version (concurrent rendering) |
| react-router-dom | 6.26.0 → 6.30.4 | 7.18.1 | Source/Frontend, portal/Frontend | ⚠️ Major API changes in v7 |
| @opentelemetry/* | 0.40–0.47 | 0.79–0.221 | portal/Backend | 🔴 **CRITICAL: 9+ major versions behind** |
| multer | 1.4.5-lts.1 | 2.2.0 | portal/Backend | ⚠️ Major version bump |

### P3 Priority Upgrades (1 major version behind)

- vite: 5.4.0 → 5.4.0 (up to date)
- vitest: 2.0.5 → 2.0.5 (up to date)
- tailwindcss: 3.4.1 → 3.4.1 (up to date)
- better-sqlite3: 12.8.0 → 13.0.1 (minor upgrade safe)

---

## License Compliance

**Status:** ✅ PASS

All direct dependencies use compatible licenses:
- MIT: express, react, uuid, pino, jest, vitest, vite, etc.
- Apache 2.0: @opentelemetry/*, protocol buffers
- ISC: npm, prom-client
- BSD-2/BSD-3: supertest, various

**No GPL/AGPL dependencies detected.** No licensing conflicts.

---

## Supply Chain Risk Assessment

### Post-Install Scripts
- ⚠️ **better-sqlite3** & **esbuild** have native compilation (acceptable—verified packages)
- ✅ No suspicious post-install scripts detected

### Package Maturity
- All direct dependencies are well-maintained (weekly downloads: 1M+)
- No single-maintainer high-risk packages
- No recently transferred ownership

### Transitive Dependency Sprawl
- **Source/Backend:** 411 transitive dependencies (102 prod, 310 dev)
- **Source/Frontend:** 230 transitive dependencies (9 prod, 222 dev)
- **portal/Backend:** 155 transitive dependencies (153 prod)
- **Total project:** ~950 transitive dependencies

**Risk:** P4 (informational). Recommend periodic SCA scans.

---

## Dependency Audit Recommendations

### Immediate (This Sprint)

1. **Fix Critical CVEs** (DEP-001, DEP-002, DEP-003):
   ```bash
   # Backend
   cd Source/Backend && npm audit fix
   
   # Frontend
   cd Source/Frontend && npm install vitest@latest react-router-dom@latest vite@latest
   
   # Portal
   cd portal/Backend && npm audit fix
   cd portal/Frontend && npm install vitest@latest react-router-dom@latest postcss@latest vite@latest
   ```

2. **Test Thoroughly:**
   - Run full test suite after each fix
   - Manual testing of routes (React Router changes)
   - OpenTelemetry integration test (protobufjs changes)

### Next Sprint

3. **Major Version Upgrades** (with compatibility review):
   - Express 4.x → 5.x (breaking changes in middleware handling)
   - React 18.x → 19.x (concurrent rendering)
   - @opentelemetry 0.x → 0.221.x (critical: 175+ versions behind!)

4. **Establish SCA Policy:**
   - Run `npm audit` in CI/CD before merge
   - Set audit level to "moderate" (block on HIGH/CRITICAL)
   - Review new transitive dependencies quarterly

---

## Cross-References

- **[ESCALATE → TheGuardians]** — vitest RCE, handlebars RCE, protobufjs RCE, React Router open redirect
- **[ESCALATE → TheFixer]** — Outdated package upgrades, license review, dependency tree optimization

---

## Dashboard Reporting

Audit run against RUN_ID provided by team leader. Metrics recorded via `tools/pipeline-update.sh`:
- CVEs Critical: 3
- CVEs High: 8
- CVEs Moderate: 24
- Outdated Major: 6

**Grade:** **C** (multiple P1 vulnerabilities require immediate remediation)

---

## Self-Learning Updates

Created file: `Teams/TheInspector/learnings/dependency-auditor.md` with:
- Watch list: handlebars, protobufjs, @opentelemetry/* (persistent CVE patterns)
- License decisions: MIT/Apache2/BSD preferred; no GPL/AGPL in non-GPL projects
- Audit tools available: npm audit, npm outdated
- Prior findings: baseline established 2026-07-24
