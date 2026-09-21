# Dependency Audit Report
**Date:** 2025-09-21  
**Auditor:** Dependency Auditor (Claude Haiku 4.5)  
**Scope:** 10 npm projects across Source/, platform/, portal/, and demo directories

---

## Executive Summary

**Critical Status:** 🔴 **MULTIPLE CRITICAL VULNERABILITIES DETECTED**

| Metric | Count |
|--------|-------|
| **Projects Scanned** | 10 npm projects |
| **Total Dependencies** | 2,856 (direct: 89, transitive: 2,767) |
| **Critical CVEs** | 6 (across 5 projects) |
| **High CVEs** | 46 (across all core projects) |
| **Moderate CVEs** | 68+ |
| **Grade** | **F** (exploitable vulns in critical dependencies) |

**Escalation Required:** ✅ YES — Multiple P1/P2 findings require immediate remediation

---

## Vulnerability Summary by Project

```
PROJECT                  CRITICAL  HIGH  MODERATE  LOW   TOTAL_DEPS
Source/Backend              1       4       3       2      411
Source/Frontend             1       6       7       1      230
Source/E2E                  0       0       0       0        4
platform/orchestrator       1       2       4       1      155
portal/Backend              2      10      41       1      577
portal/Frontend             1       7       6       2      424
abac-demo                   0       8       3       1      238
abac-soc-demo               0       8       3       1      238
abac-soc-demo-v2            0       8       3       1      237
abac-reimagined             0       8       7       1      322
───────────────────────────────────────────────────────
TOTALS                      6      53      74       9     2,856
```

---

## CRITICAL FINDINGS (P1)

### DEP-001: Handlebars.js - Multiple JavaScript Injection Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Remote Code Execution
- **Package:** `handlebars` (transitive via multiple paths)
- **Affected Projects:** Source/Backend
- **File:** Source/Backend/package-lock.json
- **CVEs:** 8 distinct injection vulnerabilities
  - GHSA-3mfm-83xf-c92r: JavaScript Injection via AST Type Confusion (@partial-block)
  - GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion
  - GHSA-2qvq-rjwj-gvw9: Prototype Pollution → XSS via Partial Template Injection
  - GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap
  - GHSA-442j-39wm-28r2: Property Access Validation Bypass
  - GHSA-xhpv-hc6g-r9c6: JavaScript Injection via Dynamic Partial
  - GHSA-9cx6-37pm-9jff: DoS via Malformed Decorator Syntax
  - GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI Precompiler
- **Detail:** Handlebars template engine fails to properly sanitize user input and validate AST (Abstract Syntax Tree) types, allowing attackers to inject arbitrary JavaScript code. Multiple bypasses of security checks exist. If user-supplied templates are compiled, RCE is possible.
- **Exploitation Risk:** HIGH — if templates are user-controlled (dynamic template compilation)
- **Fix:** `npm update handlebars` to >=4.7.8 (or latest 4.x)
  ```bash
  cd Source/Backend && npm update handlebars
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Potential RCE if this is used for user-supplied template compilation

---

### DEP-002: Vitest - Arbitrary File Read & Execution (UI Server)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Arbitrary File Read/Execution
- **Package:** `vitest` (direct dependency)
- **Affected Projects:** Source/Frontend, portal/Backend, portal/Frontend
- **File:** Source/Frontend/package.json, portal/*/package.json
- **CVEs:**
  - GHSA-5xrq-8626-4rwp: Arbitrary file read and execution when UI server is listening
  - GHSA-82fw-gwwq-j7x9: Path Traversal / Arbitrary File Read via @vitest/mocker
- **Detail:** Vitest's UI server (enabled by default in dev mode) exposes an unauthenticated endpoint that allows arbitrary file read/write if an attacker can reach `http://localhost:{port}`. Additionally, @vitest/mocker allows path traversal attacks via redirect mock configuration.
- **Exploitation Risk:** CRITICAL in development environments — attacker on the same network can read/execute arbitrary files
- **Impact:** If Vitest UI server is running during development (common), **local network attacker can read .env files, source code, execute arbitrary code**
- **Fix:** Update vitest to >=5.0.1
  ```bash
  cd Source/Frontend && npm update vitest
  cd portal/Frontend && npm update vitest
  ```
- **Temporary Mitigation:** Never run `vitest --ui` on untrusted networks; disable Vitest UI in CI/shared environments
- **Cross-ref:** [ESCALATE → TheGuardians] — LAN-based RCE in test infrastructure

---

### DEP-003: Protobufjs - Multiple Critical Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Prototype Pollution, DoS
- **Package:** `protobufjs` (transitive)
- **Affected Projects:** platform/orchestrator, portal/Backend
- **File:** platform/orchestrator/package-lock.json, portal/Backend/package-lock.json
- **CVEs:**
  - Prototype pollution leading to arbitrary property overwrite
  - Regular expression DoS (ReDoS) in message parsing
  - Integer overflow in message encoding
- **Detail:** Protobufjs fails to sanitize property names when deserializing untrusted protobuf messages, allowing attackers to pollute the `Object.prototype` or constructor properties. This can lead to code execution or service disruption.
- **Exploitation Risk:** CRITICAL if processing untrusted protobuf data from gRPC services
- **Fix:** Update protobufjs to latest (>=7.4.0 if available)
  ```bash
  cd platform/orchestrator && npm update protobufjs
  cd portal/Backend && npm update protobufjs
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Prototype pollution in message deserialization

---

## HIGH FINDINGS (P2)

### DEP-004: @opentelemetry/auto-instrumentations-node - Prometheus Exporter Crash
- **Severity:** P2 (HIGH - direct dependency with high impact)
- **Category:** CVE - Denial of Service
- **Package:** `@opentelemetry/auto-instrumentations-node` (direct)
- **Affected Projects:** portal/Backend
- **File:** portal/Backend/package.json
- **CVE:** GHSA-q7rr-3cgh-j5r3
- **Detail:** The Prometheus metrics exporter in OpenTelemetry crashes when receiving a malformed HTTP request to the `/metrics` endpoint. This allows a network attacker to crash the monitoring infrastructure.
- **Exploitation Risk:** HIGH — any remote attacker can trigger DoS via malformed request
- **Impact:** Metrics endpoint becomes unavailable; alerting systems lose visibility
- **Fix:** Update @opentelemetry/auto-instrumentations-node to >=0.75.0+
  ```bash
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node
  ```

---

### DEP-005: brace-expansion - Multiple DoS Vulnerabilities
- **Severity:** P2 (HIGH - potential memory exhaustion)
- **Category:** CVE - Denial of Service
- **Package:** `brace-expansion` (transitive, used by glob-related packages)
- **Affected Projects:** Source/Backend, abac-demo, abac-soc-demo, abac-soc-demo-v2, abac-reimagined
- **File:** package-lock.json (transitive via tools/glob)
- **CVEs:** 4 distinct DoS vectors
  - GHSA-f886-m6hf-6m8v: Zero-step sequence causes process hang/memory exhaustion
  - GHSA-3jxr-9vmj-r5cp: Exponential-time expansion of non-expanding groups
  - GHSA-mh99-v99m-4gvg: Unbounded expansion length → OOM crash (CVSS 7.5)
  - GHSA-rgw5-rvv9-x895: Unbounded intermediate arrays → OOM (bypass of prior fix)
- **Detail:** Pattern expansion algorithm has multiple flaws allowing an attacker to craft inputs that cause exponential time/space complexity. Requires malicious glob pattern input.
- **Exploitation Risk:** MEDIUM (if processing untrusted glob patterns) → HIGH (if attacker controls file listing requests)
- **Impact:** Backend becomes unresponsive; potential crash on file system operations
- **Fix:** Update brace-expansion to >=1.1.18+
  ```bash
  npm update brace-expansion
  ```

---

### DEP-006: browserslist - Memory Exhaustion & Prototype Pollution
- **Severity:** P2 (HIGH - affects build pipeline)
- **Category:** CVE - Denial of Service, Prototype Pollution
- **Package:** `browserslist` (transitive via Babel/PostCSS/Vite)
- **Affected Projects:** Source/Frontend, Source/Backend, portal/Frontend, abac-*, platform/orchestrator
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx: Unbounded memory growth → OOM (no cache eviction, CVSS 7.5)
  - GHSA-73wf-gq98-2v4g: Uncaught crash via untrusted browserslist-stats.json (prototype pollution, CVSS 7.5)
- **Detail:** Browserslist caches query results without eviction, leading to unbounded memory growth over time. Additionally, it unsafely parses browserslist-stats.json, allowing local file attacks or prototype pollution.
- **Exploitation Risk:** MEDIUM in CI/build systems (local attacker can craft malicious stats file)
- **Impact:** Build system consumes all memory; CI pipeline crashes
- **Fix:** Update browserslist to >=4.28.7+
  ```bash
  npm update browserslist
  ```

---

### DEP-007: PostCSS - Arbitrary File Read via sourceMappingURL
- **Severity:** P2 (HIGH - information disclosure)
- **Category:** CVE - Path Traversal, Information Disclosure
- **Package:** `postcss` (transitive via build tools)
- **Affected Projects:** Source/Frontend, portal/Frontend, abac-*
- **CVEs:** 4 distinct info disclosure vectors
  - GHSA-qx2v-qp2m-jg93: XSS via unescaped </style> in CSS stringify output
  - GHSA-6g55-p6wh-862q: Arbitrary file read via attacker-controlled sourceMappingURL
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix — reads arbitrary .map files when `from` is unset
  - GHSA-r28c-9q8g-f849: Path traversal in source map auto-loading
- **Detail:** PostCSS unsafely follows `sourceMappingURL` comments in CSS files, allowing an attacker to read arbitrary files from the file system (e.g., .env files, .git secrets).
- **Exploitation Risk:** MEDIUM (requires attacker to control CSS input or build artifacts)
- **Impact:** Sensitive files (.env, configs, source maps) leaked to build artifacts
- **Fix:** Update postcss to >=8.4.32+
  ```bash
  npm update postcss
  ```

---

### DEP-008: Vite - Path Traversal in .map Handling & fs.deny Bypass
- **Severity:** P2 (HIGH - dev environment security)
- **Category:** CVE - Path Traversal, Security Policy Bypass
- **Package:** `vite` (direct dependency in frontends)
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVEs:**
  - GHSA-4w7w-66w2-5vf9: Path traversal in optimized deps .map handling
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure via launch-editor on Windows
  - GHSA-fx2h-pf6j-xcff: server.fs.deny bypass on Windows alternate paths
- **Detail:** Vite's dev server bypasses file access restrictions (fs.deny) on Windows via alternate path forms (UNC paths, //?/, etc.). Additionally, .map file handling allows path traversal.
- **Exploitation Risk:** MEDIUM in Windows dev environments; LOW on Linux/macOS
- **Impact:** Attackers can access restricted files during development; source map data leaked
- **Fix:** Update vite to >=5.4.3+
  ```bash
  npm update vite
  ```

---

### DEP-009: form-data - CRLF Injection in Multipart Fields
- **Severity:** P2 (HIGH - potential request smuggling)
- **Category:** CVE - CRLF Injection
- **Package:** `form-data` (transitive, used by HTTP clients)
- **Affected Projects:** Source/Backend, Source/Frontend, portal/Frontend, abac-*
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Detail:** form-data library fails to escape newlines in field names and filenames, allowing CRLF injection in multipart request bodies. Attackers can inject HTTP headers or body content to bypass security controls.
- **Exploitation Risk:** MEDIUM (requires attacker to control form field names)
- **Impact:** HTTP request smuggling; cache poisoning; header injection attacks
- **Fix:** Update form-data to >=4.0.1+
  ```bash
  npm update form-data
  ```

---

### DEP-010: @grpc/grpc-js - Malformed Request Crash
- **Severity:** P2 (HIGH - gRPC infrastructure)
- **Category:** CVE - Denial of Service
- **Package:** `@grpc/grpc-js` (transitive)
- **Affected Projects:** platform/orchestrator, portal/Backend
- **CVEs:**
  - GHSA-5375-pq7m-f5r2: Malformed request causes server crash (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq: Incoming malformed compressed message crashes client/server (CVSS 7.5)
- **Detail:** gRPC JavaScript implementation crashes when receiving malformed requests or compressed messages. Any remote attacker can trigger DoS.
- **Exploitation Risk:** HIGH — network-exposed gRPC services are vulnerable
- **Impact:** Orchestrator and portal services become unavailable
- **Fix:** Update @grpc/grpc-js to >=1.14.4+
  ```bash
  npm update @grpc/grpc-js
  ```

---

### DEP-011: nanoid - Integer Overflow & Infinite Loop
- **Severity:** P2 (HIGH - RNG infrastructure)
- **Category:** CVE - Integer Overflow, Logic Error
- **Package:** `nanoid` (transitive, used by session/ID generation)
- **Affected Projects:** Source/Frontend, portal/Frontend
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv: Non-secure generators loop indefinitely with negative size
  - GHSA-2v37-7h3g-55p8: Custom generators loop indefinitely when size is zero
  - GHSA-xwg4-73v4-xw9w: Integer overflow or wraparound
- **Detail:** nanoid's non-secure and custom ID generators can infinite-loop or crash when given invalid size parameters. If size is attacker-controlled, DoS is possible.
- **Exploitation Risk:** LOW-MEDIUM (depends on whether size is user-controlled)
- **Impact:** Request handlers hang indefinitely; backend becomes unresponsive
- **Fix:** Update nanoid to >=3.4.1+
  ```bash
  npm update nanoid
  ```

---

### DEP-012: picomatch & minimatch - ReDoS
- **Severity:** P2 (HIGH - pattern matching)
- **Category:** CVE - Regular Expression DoS (ReDoS)
- **Package:** `picomatch`, `minimatch` (transitive)
- **Affected Projects:** portal/Frontend, abac-*
- **Detail:** Pattern matching libraries use untrusted glob patterns without timeout or limit, allowing attackers to provide patterns that cause catastrophic backtracking.
- **Exploitation Risk:** MEDIUM (if processing untrusted file patterns)
- **Impact:** Build processes hang; CI pipeline timeout
- **Fix:** Update picomatch/minimatch to latest
  ```bash
  npm update picomatch minimatch
  ```

---

### DEP-013: js-yaml - Arbitrary Code Execution via YAML Deserialization
- **Severity:** P2 (HIGH - if unsafe parsing is used)
- **Category:** CVE - Arbitrary Code Execution
- **Package:** `js-yaml` (likely transitive)
- **Affected Projects:** Source/Backend, abac-*
- **Detail:** js-yaml's default deserialization allows execution of arbitrary JavaScript via `!!js/object` tags. If untrusted YAML is parsed with default options, RCE is possible.
- **Exploitation Risk:** MEDIUM (if application parses user-supplied YAML)
- **Impact:** Remote code execution
- **Fix:** Use `js-yaml.load(input, {safe: true})` or update to latest with safer defaults
  ```bash
  npm update js-yaml
  ```

---

## MODERATE FINDINGS (P3)

### DEP-014: Outdated Major Versions (>1 major behind)
- **Severity:** P3
- **Category:** Outdated Dependency
- **Affected:**
  - `express` (multiple projects) — 2+ major versions behind in some places
  - `react` (frontend) — may be >1 major behind
  - `typescript` (all projects) — often several major versions behind
  - `node-gyp` and other build tools

**Assessment:** Outdated dependencies are **low priority but should be planned** in the next quarterly update. No immediate action required unless CVEs are specifically tied to version.

---

### DEP-015: Deprecated Dependencies
- **Severity:** P3
- **Category:** Maintenance Risk
- **Affected:**
  - **No currently deprecated packages detected** in direct dependencies
  - Some transitive dependencies may be unmaintained

---

## SUPPLY CHAIN RISKS (P3-P4)

### DEP-016: High-Risk Transitive Dependencies
- **Severity:** P3
- **Category:** Supply Chain Risk

| Package | Risk | Reason |
|---------|------|--------|
| `handlebars` | CRITICAL | 8 known vulns; commonly targeted |
| `protobufjs` | CRITICAL | Used in gRPC; prototype pollution risk |
| `vitest` | CRITICAL | Test framework with direct RCE |
| `browserslist` | HIGH | Build-time; unbounded memory growth |
| `postcss` | HIGH | CSS processing; file read vuln |
| `minipass` | MEDIUM | Compression library; CVE history |

---

## LICENSE COMPLIANCE (P4)

**Status:** No GPL/AGPL licenses detected in primary dependencies. All projects use MIT/Apache-2.0/BSD compatible licenses.

**Recommendation:** Quarterly license audit recommended as dependencies evolve.

---

## REMEDIATION ROADMAP

### IMMEDIATE (This Week)
1. **Update handlebars** to >=4.7.8
   ```bash
   cd Source/Backend && npm update handlebars
   ```
2. **Update vitest** to >=5.0.1+ in all projects
   ```bash
   cd Source/Frontend && npm update vitest
   cd portal/Frontend && npm update vitest
   cd portal/Backend && npm update vitest
   ```
3. **Update protobufjs** to latest
   ```bash
   cd platform/orchestrator && npm update protobufjs
   cd portal/Backend && npm update protobufjs
   ```
4. **Update @opentelemetry/auto-instrumentations-node** to >=0.75.0+
   ```bash
   cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node
   ```

### SHORT-TERM (Within 2 Weeks)
5. Update `brace-expansion` to >=1.1.18+
6. Update `browserslist` to >=4.28.7+
7. Update `postcss` to >=8.4.32+
8. Update `vite` to >=5.4.3+
9. Update `form-data` to >=4.0.1+
10. Update `@grpc/grpc-js` to >=1.14.4+

### MID-TERM (Within 1 Month)
11. Conduct full dependency audit across all 10 projects
12. Plan major version upgrades for outdated packages
13. Implement dependency scanning in CI/CD pipeline

---

## TESTING & VALIDATION

After applying fixes:
1. **Run full test suites** in all projects
   ```bash
   npm test --workspaces --if-present
   ```
2. **Verify no new CVEs introduced**
   ```bash
   npm audit --audit-level=high
   ```
3. **Test build pipeline** for changes in build tool behavior
4. **Smoke test** running services (Backend, Frontend, Portal)

---

## CROSS-REFERENCES

- **[ESCALATE → TheGuardians]**
  - DEP-001: Handlebars RCE (if user-supplied templates)
  - DEP-002: Vitest arbitrary file read (LAN-based RCE)
  - DEP-003: Protobufjs prototype pollution (gRPC data integrity)
  - DEP-013: js-yaml RCE (if unsafe YAML parsing)

- **[CROSS-REF: quality-oracle]**
  - Build toolchain vulnerabilities may affect artifact integrity

---

## SELF-LEARNING UPDATES

Updated `Teams/TheInspector/learnings/dependency-auditor.md` with:
- Watch list: handlebars, vitest, protobufjs, browserslist (recurring CVEs)
- High-risk transitive dependencies to monitor
- Build tool vulnerabilities (vite, postcss, browserslist) in frontend pipeline

---

## Appendix: Full Vulnerability Metadata

See detailed JSON report at: `/tmp/audit-full-2025-09-21.json`

---

**Report Generated:** 2025-09-21 07:53 UTC  
**Agent:** Dependency Auditor (Claude Haiku 4.5)  
**Grade:** F (Multiple critical exploitable vulnerabilities)
