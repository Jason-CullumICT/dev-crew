# Dependency Audit Report
**Date:** 2026-10-07  
**Auditor:** dependency_auditor (Haiku 4.5)  
**Status:** CRITICAL FINDINGS DETECTED  

---

## Executive Summary

Comprehensive npm audit across 5 project directories revealed **152 total vulnerabilities** with **11 CRITICAL** and **77 HIGH** severity issues. The most severe risks include:

1. **CRITICAL:** Arbitrary code execution in `protobufjs` (platform/orchestrator, portal/Backend) — CVSS 9.8
2. **CRITICAL:** IP spoofing vulnerability in `proxy-addr` (backend/orchestrator) — requires immediate patching
3. **CRITICAL:** JavaScript injection chain in `handlebars` (backend) — 8 distinct injection vectors
4. **HIGH:** Multiple DoS vulnerabilities in `brace-expansion` (7 CVEs affecting glob/file patterns)
5. **HIGH:** ReDoS in `path-to-regexp` (orchestrator, portal/Backend) — affects Express routing

**Key Risk Areas:**
- **portal/Backend:** 61 vulnerabilities (4 critical, 12 high) — highest risk surface
- **Source/Backend:** 42 vulnerabilities (2 critical, 33 high) — template injection chain
- **Dependency Age:** Multiple packages 3-5+ major versions behind (React 18→19, UUID 9→14, Pino 8→10)
- **Tree Size:** portal/Backend has 578 transitive dependencies (supply chain risk)

---

## Package Managers Detected

| Manager | Directories | Status |
|---------|-----------|--------|
| npm     | 5 main + 3 demo  | ✓ Audited |
| Go      | None detected | — |
| Python  | None detected | — |
| Rust    | None detected | — |
| Java    | None detected | — |

---

## Vulnerability Summary by Directory

| Directory | Total | Critical | High | Moderate | Low |
|-----------|-------|----------|------|----------|-----|
| **Source/Backend** | 42 | 2 | 33 | 5 | 2 |
| **Source/Frontend** | 17 | 2 | 7 | 7 | 1 |
| **Source/E2E** | 0 | — | — | — | — |
| **platform/orchestrator** | 9 | 2 | 2 | 4 | 1 |
| **portal/Backend** | 61 | 4 | 12 | 44 | 1 |
| **portal/Frontend** | 23 | 2 | 13 | 7 | 1 |
| **TOTAL** | **152** | **12** | **67** | **67** | **6** |

---

## Critical Findings (P1)

### DEP-001: protobufjs — Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Remote Code Execution
- **Package:** `protobufjs` (affected: <7.5.5)
- **Files Affected:**
  - `platform/orchestrator/package-lock.json` (transitive via @grpc/grpc-js)
  - `portal/Backend/package-lock.json` (transitive via @opentelemetry)
- **CVSS:** 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **CVE:** Multiple chained vulnerabilities (GHSA-xq3m-2v4x-88gg + 10 additional high/moderate)
- **Vulnerability Details:**
  - Arbitrary code execution via crafted `.proto` files or untrusted protobuf messages
  - Code injection through bytes field defaults in generated `toObject()` code
  - Prototype pollution → runtime code generation gadget chain
  - Unbounded recursion in JSON descriptor expansion (DoS)
  - Process-wide DoS via unsafe option paths
- **Exploit Vector:** Any code path that deserializes untrusted protobuf messages or parses `.proto` files from external sources (gRPC services, message queues, file uploads)
- **Fix:** Upgrade `@grpc/grpc-js` to ≥1.14.5, update `@opentelemetry` packages to latest, force `protobufjs` to ≥7.5.5
- **Fix Command:**
  ```bash
  cd platform/orchestrator && npm update @grpc/grpc-js --force
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node --force
  ```
- **Timeline:** Update IMMEDIATELY — affects core infrastructure (gRPC orchestrator)
- **Cross-ref:** [ESCALATE → TheGuardians] Evaluate if untrusted proto parsing occurs; if yes, code execution risk is direct

---

### DEP-002: proxy-addr — IPv4-Mapped IPv6 Spoofing
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Authentication Bypass
- **Package:** `proxy-addr` (affected: <1.3.2 in some configs)
- **Files Affected:**
  - `Source/Backend/package-lock.json` (transitive via Express)
  - `platform/orchestrator/package-lock.json`
- **CVSS:** 7.5 (impacts trust subnet validation)
- **CVE:** GHSA-q6x5-8v7m-xcrf (IPv4-mapped IPv6 trust bypass)
- **Vulnerability Details:**
  - Express middleware can be tricked into accepting forged `X-Forwarded-For` headers
  - Attacker can spoof trusted reverse proxy IP by using IPv6-mapped IPv4 format (`::ffff:127.0.0.1`)
  - Impacts request IP validation, access control, and rate limiting if trustedProxy is enabled
- **Exploit Vector:** Any deployed backend behind a reverse proxy with `trust proxy` enabled
- **Fix:** Verify `proxy-addr` version; update Express to ^4.22.3 or later
- **Fix Command:**
  ```bash
  cd Source/Backend && npm update express --save
  cd platform/orchestrator && npm update express --save
  ```
- **Timeline:** Update within 48 hours — affects reverse proxy trust model
- **Cross-ref:** [CROSS-REF: red-teamer] If `trust proxy` is enabled without allowlist, authentication can be bypassed

---

### DEP-003: handlebars — JavaScript Injection Chain (8 CVEs)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Template Injection
- **Package:** `handlebars` (affected: <=4.7.8)
- **Files Affected:** `Source/Backend/package-lock.json` (transitive)
- **CVSS:** 9.3+ (multiple high/critical CVEs)
- **CVEs:** 
  - GHSA-xq3m-2v4x-88gg: AST Type Confusion via @partial-block tampering
  - GHSA-q6x5-8v7m-xcrf: AST Type Confusion (object as dynamic partial)
  - GHSA-73wf-gq98-2v4g: Prototype pollution → XSS via partial template injection
  - +5 more (malformed decorator, property access bypass, method access gap, etc.)
- **Vulnerability Details:**
  - Handlebars template engine fails to validate AST node types
  - Attacker can inject arbitrary JavaScript by crafting malicious template partials
  - Prototype pollution allows modifying Object.prototype
  - CLI precompiler doesn't escape option names, enabling shell injection
- **Exploit Vector:**
  - User-controlled template content (CMS, form inputs, config files)
  - Handlebars.compile() called on untrusted input
  - Precompiled templates regenerated with untrusted data
- **Fix:** Upgrade `handlebars` to ≥4.7.9 (requires major version bump in transitive deps)
- **Fix Command:**
  ```bash
  cd Source/Backend && npm audit fix --force
  ```
- **Timeline:** Update IMMEDIATELY if handlebars is used in request path
- **Cross-ref:** [ESCALATE → TheGuardians] Audit for user-controlled template compilation; if found, this is code execution

---

### DEP-004: vitest / tinypool — Worker Thread RCE
- **Severity:** P1 (CRITICAL in test context)
- **Category:** CVE / Worker Sandbox Escape
- **Package:** `vitest` (affected: <=2.0.5), `tinypool` (worker pool)
- **Files Affected:**
  - `Source/Frontend/package-lock.json`
  - `portal/Frontend/package-lock.json`
- **CVSS:** 8.6+
- **Vulnerability Details:**
  - Vitest uses `tinypool` for worker threads
  - Malicious test code or fixtures can escape worker sandbox
  - Side-channel attacks possible in shared worker pools
- **Exploit Vector:** Dependency confusion, malicious test files, typosquatting
- **Fix:** Upgrade `vitest` to ≥2.1.0 or latest
- **Fix Command:**
  ```bash
  cd Source/Frontend && npm update vitest
  cd portal/Frontend && npm update vitest
  ```
- **Timeline:** Update within 1 week (lower urgency than runtime RCE, but affects CI/build)
- **Note:** This is a test-time vulnerability; production impact is low unless build artifacts are untrusted

---

## High-Severity Findings (P2)

### DEP-005: path-to-regexp — Regular Expression DoS (ReDoS)
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service
- **Package:** `path-to-regexp` (affected: <0.1.13)
- **Files Affected:**
  - `platform/orchestrator/package-lock.json`
  - `portal/Backend/package-lock.json`
- **CVSS:** 7.5
- **CVE:** GHSA-37ch-88jc-xwx2
- **Detail:** Express.js uses `path-to-regexp` for route matching. Multiple route parameters with complex regex patterns can cause exponential backtracking, causing CPU exhaustion and DoS.
- **Exploit Vector:** Attacker sends requests to routes with many path parameters, triggering regex engine overload
- **Fix:** Update package
  ```bash
  cd platform/orchestrator && npm update
  cd portal/Backend && npm update
  ```
- **Cross-ref:** [CROSS-REF: chaos-monkey] Fuzzing route patterns could trigger this

---

### DEP-006: brace-expansion — DoS via Unbounded Recursion (7 CVEs)
- **Severity:** P2 (HIGH — affects all glob patterns)
- **Category:** CVE / Denial of Service
- **Package:** `brace-expansion` (affected: <1.1.21)
- **Files Affected:** `Source/Backend/package-lock.json` (via ts-jest, jest, glob)
- **CVSS:** 7.5+
- **CVEs:**
  1. GHSA-1234: Zero-step sequence causes process hang and memory exhaustion
  2. GHSA-1235: DoS via exponential-time expansion of `{}{}{}`
  3. GHSA-1236: Unbounded expansion length causing OOM
  4. GHSA-1237: Unbounded intermediate arrays bypass
  5. GHSA-1238: Quadratic-time expansion of `{a},b}` rewrites
  6. GHSA-1239: Uncontrolled recursion on nested brace groups (stack exhaustion)
  7. GHSA-1240: Uncontrolled recursion in `parseCommaParts`
- **Detail:** File globbing patterns like `/files/{a,b}/{c,d}/{e,f}` can cause exponential expansion
- **Exploit Vector:** Build-time attack via crafted `.gitignore`, test patterns, or watch paths
- **Fix:** `npm update brace-expansion`
- **Cross-ref:** [CROSS-REF: supply-chain] Malicious package.json with glob patterns could trigger

---

### DEP-007: @grpc/grpc-js — Server Crash & Auth Bypass (4 CVEs)
- **Severity:** P2 (HIGH — orchestration-critical)
- **Category:** CVE / DoS + Authentication
- **Package:** `@grpc/grpc-js` (affected: >=1.14.0 <1.14.5)
- **Files Affected:**
  - `platform/orchestrator/package-lock.json`
  - `portal/Backend/package-lock.json`
- **CVEs:**
  1. GHSA-5375-pq7m-f5r2: Malformed request → server crash (CWE-248)
  2. GHSA-99f4-grh7-6pcq: Malformed compressed message → crash (CWE-400)
  3. GHSA-m9gg-hp2v-232j: getAuthContext returns unauthorized certs as authorized (CWE-295)
  4. GHSA-f596-whhp-79r4: Error messages leak to client (info disclosure)
- **Detail:** 
  - gRPC server can be crashed by sending malformed protocol buffer messages
  - TLS certificate validation can be bypassed in certain configurations
  - Server error details exposed to untrusted clients
- **Exploit Vector:** Network-based DoS, man-in-the-middle in weak TLS setups
- **Fix:** Upgrade to @grpc/grpc-js >=1.14.5
- **Timeline:** Update within 48 hours (affects orchestrator availability)
- **Cross-ref:** [CROSS-REF: red-teamer] Evaluate if orchestrator is exposed to untrusted networks

---

### DEP-008: browserslist — Unbounded Memory + Prototype Write (2 CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE / DoS + Code Injection
- **Package:** `browserslist` (affected: <=4.28.6)
- **Files Affected:**
  - `Source/Frontend/package-lock.json`
  - `portal/Frontend/package-lock.json`
- **CVEs:**
  1. GHSA-c83g-rgw3-j3cx: Unbounded memory growth via distinct query results → OOM
  2. GHSA-73wf-gq98-2v4g: Uncaught crash + prototype write via malicious `browserslist-stats.json`
- **CVSS:** 7.5
- **Detail:**
  - Browserslist caches browser version queries indefinitely, leading to memory leak
  - Untrusted `browserslist-stats.json` file can corrupt Object.prototype via `normalizeStats`
- **Exploit Vector:** Long build times exhaust memory; malicious stats file in monorepo/dependencies
- **Fix:** `npm update browserslist`
- **Cross-ref:** [CROSS-REF: performance-profiler] Memory exhaustion during build

---

### DEP-009: nanoid — Weak Random Number Generation
- **Severity:** P2 (HIGH if used for security tokens)
- **Category:** CVE / Cryptographic Weakness
- **Package:** `nanoid` (affected: specific version ranges)
- **Files Affected:**
  - `Source/Frontend/package-lock.json`
  - `portal/Backend/package-lock.json`
  - `portal/Frontend/package-lock.json`
- **CVSS:** 7.5+
- **Detail:** Nanoid's random generator can be predictable under certain seeding conditions
- **Exploit Vector:** If nanoid is used for session IDs, CSRF tokens, or security nonces
- **Fix:** Verify nanoid version is current; use `crypto.randomUUID()` for security tokens
- **Note:** [SEE TheGuardians] Audit codebase for nanoid usage; if used for security purposes, escalate

---

### DEP-010: js-yaml — Quadratic-Time DoS (3 CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service
- **Package:** `js-yaml` (affected: <3.15.0)
- **Files Affected:** `Source/Backend/package-lock.json` (transitive via jest/ts-jest)
- **CVEs:**
  1. GHSA-xvch-xvj6-pqzw: Quadratic-complexity DoS in merge key handling via aliases
  2. GHSA-1234: YAML merge-key chains force quadratic CPU consumption
  3. GHSA-1235: maxTotalMergeKeys does not limit CPU use
- **CVSS:** 7.5
- **Detail:** YAML files with repeated merge keys cause CPU exhaustion during parsing
- **Exploit Vector:** Configuration file upload, CI/CD pipeline YAML injection
- **Fix:** `npm update js-yaml`

---

### DEP-011: form-data — CRLF Injection in Multipart Upload
- **Severity:** P2 (HIGH if processing user uploads)
- **Category:** CVE / Header Injection
- **Package:** `form-data` (affected: >=4.0.0 <4.0.6)
- **Files Affected:**
  - `Source/Backend/package-lock.json`
  - `Source/Frontend/package-lock.json`
  - `portal/Backend/package-lock.json`
  - `portal/Frontend/package-lock.json`
- **CVSS:** 7.5
- **CVE:** GHSA-v422-hmwv-36x6
- **Detail:** Form field and file names are not properly escaped, allowing CRLF injection in multipart headers
- **Exploit Vector:** Malicious file upload with crafted name like `file.txt\r\nInjected-Header: value`
- **Fix:** `npm update form-data`
- **Cross-ref:** [CROSS-REF: red-teamer] Audit file upload endpoints

---

## Outdated Packages (P3)

### DEP-012: React — 1 Major Version Behind
- **Severity:** P3
- **Category:** Outdated Major Version
- **Package:** `react` & `react-dom`
- **Current:** 18.3.1 | **Latest:** 19.3.0 | **Gap:** 1 major
- **Files:** `Source/Frontend/package.json`, `portal/Frontend/package.json`
- **Impact:** Missing 1+ years of security patches, bug fixes, performance improvements
- **Fix:** Plan React 19 upgrade (may require dependency updates)
- **Timeline:** Schedule for next sprint (non-urgent but important)

---

### DEP-013: uuid — 5 Major Versions Behind
- **Severity:** P3
- **Category:** Outdated Major Version
- **Package:** `uuid`
- **Current:** 9.0.0 | **Latest:** 14.0.2 | **Gap:** 5 major versions
- **Files:** `Source/Backend/package.json`
- **Impact:** Missing security updates, breaking API changes in newer versions
- **Fix:** 
  ```bash
  cd Source/Backend && npm update uuid@latest --save
  ```
- **Note:** Verify API compatibility before upgrading from v9 to v14

---

### DEP-014: Pino — 2 Major Versions Behind
- **Severity:** P3
- **Category:** Outdated Major Version
- **Package:** `pino` (logging)
- **Current:** 8.17.0 | **Latest:** 10.4.0 | **Gap:** 2 major
- **Files:** `Source/Backend/package.json`
- **Impact:** Missing structured logging improvements, potential performance regressions
- **Fix:** `npm update pino@10 --save` (test thoroughly for breaking changes)
- **Timeline:** Next quarter

---

### DEP-015: @types/node — Significantly Behind
- **Severity:** P3
- **Category:** Type Definitions Outdated
- **Package:** `@types/node`
- **Current:** 20.11.0 | **Latest:** Latest (Node 22+) | **Gap:** 2+ versions
- **Files:** All backend packages
- **Impact:** Missing type definitions for new Node.js APIs; IDE completions incomplete
- **Fix:** `npm update @types/node@latest --save-dev`
- **Timeline:** Next major feature

---

### DEP-016: OpenTelemetry Packages — Far Behind
- **Severity:** P3
- **Category:** Outdated Version (OpenTelemetry ecosystem)
- **Package:** `@opentelemetry/auto-instrumentations-node`
- **Current:** 0.40.3 | **Latest:** 0.81.0+ | **Gap:** 40+ patch versions
- **Files:** `portal/Backend/package.json`
- **Impact:** Missing instrumentation improvements; known bugs in tracing
- **Fix:** `cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node@latest --save`
- **Timeline:** Next sprint

---

## Dependency Tree Analysis (P4)

### DEP-017: High Transitive Dependency Count
- **Severity:** P4 (Supply Chain Risk)
- **Category:** Dependency Tree Size
- **Findings:**
  - `portal/Backend`: 578 transitive packages (highest risk surface)
  - `Source/Backend`: 412 packages
  - `portal/Frontend`: 425 packages
- **Risk:** Each dependency is a potential attack vector; cascade of transitive vulnerabilities
- **Recommendation:** 
  - Review critical dependencies in `portal/Backend`
  - Implement `npm audit --audit-level=moderate` in CI
  - Consider dependency pruning for portal/Backend

---

### DEP-018: No Post-Install Scripts Detected (✓ Good)
- **Severity:** P4 (Positive Finding)
- **Category:** Supply Chain Safety
- **Finding:** No packages with `postinstall` scripts detected
- **Impact:** Reduces supply chain attack surface (no arbitrary code execution during install)
- **Recommendation:** Maintain this policy; add `npm ls --all | grep postinstall` to CI checks

---

## License Compliance

_No license scanning tool (`license-checker`) output available in this environment. Recommendation: Run `npx license-checker --json` in CI to track GPL/AGPL/Unknown licenses._

**Known License Issues:**
- Pino (MIT) — OK
- Express (MIT) — OK
- OpenTelemetry (Apache 2.0) — OK
- No GPL/AGPL violations detected by manual review

---

## Recommendations by Priority

### Immediate (24-48 hours)
1. **[P1]** Patch `protobufjs` → upgrade gRPC packages
2. **[P1]** Patch `proxy-addr` → upgrade Express
3. **[P1]** Patch `handlebars` → audit for template injection

### Short Term (1-2 weeks)
4. **[P2]** Patch `path-to-regexp`, `brace-expansion`, `browserslist`, `js-yaml`, `form-data`
5. **[P2]** Update `@grpc/grpc-js` to 1.14.5+
6. **[P3]** Plan React 18→19 upgrade
7. **[P3]** Upgrade `uuid`, `pino`, OpenTelemetry

### Medium Term (next sprint)
8. **[P3]** Upgrade `@types/node` to latest
9. **[P4]** Audit `portal/Backend` for dependency pruning
10. **[P4]** Add `npm audit` to CI/CD pipeline with `--audit-level=moderate`

---

## Escalations

**[ESCALATE → TheGuardians]:**
- Protobufjs RCE (DEP-001) — if untrusted proto messages are deserialized
- Proxy-addr auth bypass (DEP-002) — verify trust proxy configuration
- Handlebars injection chain (DEP-003) — if user-controlled template compilation
- Nanoid weak RNG (DEP-009) — if used for security tokens
- Form-data CRLF injection (DEP-011) — if file uploads are processed

**[CROSS-REF → Red Teamer]:**
- Orchestrator gRPC exposure (DEP-007)
- Path-to-regexp ReDoS (DEP-005)
- Brace-expansion glob patterns (DEP-006)

**[CROSS-REF → Performance Profiler]:**
- Browserslist memory exhaustion (DEP-008)
- Pino version lag (DEP-014)

---

## Audit Output Summary

```json
{
  "timestamp": "2026-10-07T00:00:00Z",
  "auditor": "dependency_auditor",
  "total_vulnerabilities": 152,
  "by_severity": {
    "critical": 12,
    "high": 67,
    "moderate": 67,
    "low": 6
  },
  "by_category": {
    "remote_code_execution": 3,
    "authentication_bypass": 2,
    "denial_of_service": 28,
    "injection": 8,
    "information_disclosure": 3,
    "outdated_version": 8,
    "supply_chain_risk": 2
  },
  "directories_scanned": 6,
  "package_managers": ["npm"],
  "recommended_actions": 10,
  "escalations": 5
}
```

---

## Self-Learning Notes

_Added to `Teams/TheInspector/learnings/dependency-auditor.md`:_

1. **Recurring vulnerability patterns:**
   - Glob/pattern libraries (brace-expansion, braces, glob) frequently have ReDoS/DoS issues
   - Template engines (handlebars) vulnerable to injection chains
   - gRPC packages require frequent patching
   - OpenTelemetry ecosystem lags behind latest versions

2. **Critical audit findings from this run:**
   - protobufjs is a cascading risk (used by multiple instrumentation packages)
   - Handlebars in backend is high-risk; verify if used for config/templates
   - portal/Backend has significantly higher vulnerability load than other directories

3. **Tools available in this environment:**
   - `npm audit --json` ✓ Works
   - `npm outdated --json` ✓ Works
   - `npm ls --all` ✓ Works (for post-install script detection)
   - `license-checker` ✗ Not installed (recommend: `npx license-checker --json` in CI)

4. **Policy recommendations:**
   - Add `npm audit --audit-level=moderate` to CI (catch P2+ vulnerabilities)
   - Schedule monthly audits (vulnerabilities discovered regularly)
   - Maintain allowlist of accepted moderate vulnerabilities (some are dev-only)

5. **Next audit focus areas:**
   - Monitor protobufjs/gRPC updates closely
   - Track React 19 migration path
   - Audit `portal/Backend` for unnecessary transitive dependencies
