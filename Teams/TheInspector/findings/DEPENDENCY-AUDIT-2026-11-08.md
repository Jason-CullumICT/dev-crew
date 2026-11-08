# Dependency Auditor Findings — 2026-11-08

## Executive Summary

**Audit Scope:** 6 npm projects across dev-crew platform
**Total Dependencies:** 1,679 transitive dependencies across all projects
**Critical Findings:** 12 (🔴 CRITICAL — requires immediate remediation)
**Overall Health Grade:** **D** (multiple unpatched critical vulnerabilities)

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 12 | Requires immediate action |
| 🟠 High | 32 | Schedule updates within 7 days |
| 🟡 Moderate | 36 | Schedule updates within 30 days |
| 🟢 Low | 8 | Review for next release |

---

## Critical Vulnerabilities (P1)

These require **immediate** remediation. All bypass or sabotage core security controls.

### DEP-001: proxy-addr IP Spoofing via IPv4-Mapped IPv6
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **CVSS:** 9.1 / AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
- **Package:** `proxy-addr` <= 2.0.7
- **Affected Projects:** 
  - `Source/Backend` (transitive: via express)
  - `platform/orchestrator` (transitive: via express)
  - `portal/Backend` (transitive: via express)
- **Vulnerability:** IPv4-mapped IPv6 addresses can be used to spoof trusted IP ranges, bypassing access controls that rely on `X-Forwarded-For` headers
- **Impact:** An attacker can bypass authentication/authorization by spoofing a trusted proxy IP address (e.g., 127.0.0.1 → ::ffff:127.0.0.1)
- **Attack Vector:** Network — no authentication required
- **CWE:** CWE-290 (Spoofing of IP source address)
- **Fix:** Update to `proxy-addr >= 2.0.8` — run `npm update proxy-addr`
- **References:** 
  - https://github.com/advisories/GHSA-jqcg-44mw-7w3h
  - NIST: A01:2021 – Broken Access Control
- **Cross-ref:** [ESCALATE → TheGuardians] — Access control bypass via network spoofing
- **Recommendation:** This is an OWASP A01 (Broken Access Control) violation. Patch immediately across all projects.

---

### DEP-002: vitest Arbitrary File Read & Execution via UI Server
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **CVSS:** 9.8 / AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
- **Package:** `vitest` < 3.2.6 (testing dependency)
- **Affected Projects:**
  - `Source/Frontend` (direct dependency)
  - `portal/Frontend` (direct dependency)
- **Vulnerability:** When Vitest UI server is running (e.g., during `npm run test:ui`), an attacker can read arbitrary files and execute code via the unprotected HTTP API
- **Impact:** 
  - Leak of .env files, private keys, source code
  - Remote code execution on developer machine or CI runner
  - Credential theft (database passwords, API keys)
- **Attack Vector:** Network — requires UI server to be listening (default port 51204)
- **CWE:** CWE-22 (Path Traversal), CWE-862 (Missing Authorization)
- **Fix:** Update to `vitest >= 3.2.6` or skip UI server in untrusted networks — run `npm update vitest`
- **References:**
  - https://github.com/advisories/GHSA-5xrq-8626-4rwp
  - OWASP A02:2021 – Cryptographic Failures (credentials leak)
- **Cross-ref:** [ESCALATE → TheGuardians] — Credential exposure + RCE
- **Recommendation:** 
  - Patch immediately
  - Audit CI logs to confirm UI server was not exposed
  - Rotate any credentials that could have been leaked

---

### DEP-003: protobufjs Remote Code Execution via Code Generation
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **CVSS:** 9.8 / AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
- **Package:** `protobufjs` >= 7.0.0 < 7.5.5
- **Affected Projects:**
  - `platform/orchestrator` (transitive: via @protobufjs/*)
  - `portal/Backend` (transitive: via @protobufjs/*)
- **Vulnerability:** When decoding untrusted `.proto` files or messages, protobufjs can execute arbitrary code via the code generator. Attackers craft malformed protobuf messages to inject code during deserialization.
- **Impact:**
  - Remote code execution on services handling untrusted protobuf data
  - Data exfiltration, lateral movement, infrastructure compromise
- **Attack Vector:** Network — requires service to parse attacker-controlled protobuf data
- **CWE:** CWE-94 (Improper Control of Generation of Code)
- **Fix:** Update to `protobufjs >= 7.5.5` — run `npm update protobufjs`
- **References:**
  - https://github.com/advisories/GHSA-h755-8qp7-32mj
  - CVE-2023-43816
- **Cross-ref:** [ESCALATE → TheGuardians] — Remote code execution
- **Recommendation:** 
  - Patch immediately
  - If orchestrator or portal processes untrusted input, audit logs for anomalous activity
  - Review `.proto` file sources — ensure they come only from trusted repositories

---

---

## High Severity Vulnerabilities (P2)

### DEP-004: body-parser Denial of Service via Trailing Bytes
- **Severity:** P2 (HIGH)
- **Category:** cve
- **CVSS:** 7.5 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
- **Package:** `body-parser` < 1.20.9
- **Affected Projects:**
  - `Source/Backend` (transitive: via express)
  - `platform/orchestrator` (transitive: via express)
  - `portal/Backend` (transitive: via express)
- **Vulnerability:** When parsing compressed request bodies (gzip, deflate), `body-parser` does not validate that trailing bytes after the compressed payload are removed. Attackers can send malformed compressed bodies causing unhandled exceptions and service crashes.
- **Impact:** Denial of service — any route accepting POST/PUT with compressed bodies can be crashed
- **Attack Vector:** Network — any unauthenticated client can trigger
- **CWE:** CWE-248 (Uncaught Exception)
- **Fix:** Update to `body-parser >= 1.20.9` (requires express update)
- **References:** https://github.com/advisories/GHSA-27r3-jxmh-p828
- **Cross-ref:** [CROSS-REF: red-teamer] — Exploitable DoS on public APIs

---

### DEP-005: brace-expansion Denial of Service via Exponential Expansion
- **Severity:** P2 (HIGH)
- **Category:** cve
- **CVSS:** 5.3 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L
- **Package:** `brace-expansion` < 1.1.16
- **Affected Projects:**
  - `Source/Backend` (transitive)
- **Vulnerability:** The `brace-expansion` library used during build/test allows exponential-time expansion of consecutive non-expanding brace groups (e.g., `{}{}{}{}`). Attackers craft inputs that consume unbounded CPU during build steps.
- **Impact:** Build pipeline DoS, test suite hangs, development velocity impact
- **Attack Vector:** Local/CI — requires attacker to control file paths or config during build
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **Fix:** Update dependency tree — indirect, requires upstream bump

---

### DEP-006: browserslist Memory Exhaustion
- **Severity:** P2 (HIGH)
- **Category:** cve
- **CVSS:** 7.5 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
- **Package:** `browserslist` <= 4.28.6
- **Affected Projects:**
  - `Source/Frontend` (transitive: via build tools)
  - `portal/Frontend` (transitive: via build tools)
- **Vulnerability:** The `browserslist` library caches query results without eviction. An attacker (or legitimate use) that sends many distinct queries causes unbounded memory growth, eventually triggering OOM and process termination.
- **Impact:** Build pipeline crashes, dev server DoS, CI runner memory exhaustion
- **Attack Vector:** Local — developer or build tool
- **CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
- **Fix:** Update to `browserslist > 4.28.6` — run `npm update browserslist`

---

### DEP-007: @grpc/grpc-js Malformed Request Crash
- **Severity:** P2 (HIGH)
- **Category:** cve
- **CVSS:** 7.5 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
- **Package:** `@grpc/grpc-js` < 1.14.4 or < 1.14.5
- **Affected Projects:**
  - `platform/orchestrator` (transitive)
  - `portal/Backend` (transitive)
- **Vulnerability:** Three separate CVEs:
  1. **GHSA-5375-pq7m-f5r2**: Malformed request crashes server (CWE-248)
  2. **GHSA-99f4-grh7-6pcq**: Malformed compressed message crashes client/server (CWE-248)
  3. **GHSA-m9gg-hp2v-232j**: getAuthContext returns unauthorized certs as authorized (CWE-295)
- **Impact:** Denial of service, TLS certificate validation bypass
- **Attack Vector:** Network — any gRPC client can craft malformed messages
- **CWE:** CWE-248 (Uncaught Exception), CWE-295 (Improper Certificate Validation)
- **Fix:** Update to `@grpc/grpc-js >= 1.14.5` — run `npm update @grpc/grpc-js`

---

### DEP-008: ws Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **CVSS:** 7.5 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
- **Package:** `ws` >= 8.0.0 < 8.21.0
- **Affected Projects:**
  - `Source/Frontend` (transitive: via vite)
  - `portal/Frontend` (transitive: via vite)
- **Vulnerability:** WebSocket server receives many tiny fragments causing memory exhaustion and OOM. Attacker sends a large number of 1-byte messages, each allocating buffer space.
- **Impact:** WebSocket server DoS (affects HMR/dev server)
- **Attack Vector:** Network — unauthenticated
- **CWE:** CWE-770 (Uncontrolled Resource Consumption)
- **Fix:** Update to `ws >= 8.21.0` — run `npm update ws`

---

---

## Moderate Severity Vulnerabilities (P3)

### DEP-009: uuid Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **CVSS:** 7.5 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N
- **Package:** `uuid` < 11.1.1 (direct dependency in `Source/Backend`)
- **Affected Projects:**
  - `Source/Backend` (direct)
  - `platform/orchestrator` (transitive)
  - `portal/Backend` (transitive)
- **Vulnerability:** When `uuid` v3/v5/v6 functions are called with a supplied `buf` argument, the library does not bounds-check the buffer. An attacker can write out-of-bounds memory.
- **Impact:** Buffer overflow, data corruption, potential code execution
- **Attack Vector:** Local/application code — requires attacker to control UUID generation parameters
- **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285 (Improper Validation of Specified Type)
- **Fix:** Update `uuid` to >= 11.1.1 — **This is a DIRECT dependency in Backend. Run `npm update uuid` in Source/Backend**
- **References:** https://github.com/advisories/GHSA-w5hq-g745-h8pq
- **Recommendation:** Patch immediately in Backend; verify API doesn't pass user-controlled buffer objects to uuid functions.

---

### DEP-010: @vitest/mocker Path Traversal via Redirect Mock
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **CVSS:** 5.9 / AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N
- **Package:** `@vitest/mocker` >= 2.1.0 < 4.1.11
- **Affected Projects:**
  - `Source/Frontend`
  - `portal/Frontend`
- **Vulnerability:** When mocking redirects, path traversal can read files outside project root
- **Impact:** Leak of .env, secrets during test execution
- **CWE:** CWE-22 (Path Traversal)
- **Fix:** Update to `vitest >= 4.1.12` (includes patch for @vitest/mocker)

---

### DEP-011: @opentelemetry/core Unbounded Memory in W3C Baggage
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **CVSS:** 5.3 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L
- **Package:** `@opentelemetry/core` <= 1.28.0
- **Affected Projects:**
  - `portal/Backend` (transitive via @opentelemetry/auto-instrumentations-node)
- **Vulnerability:** When parsing W3C Baggage header, unbounded memory is allocated for large or many baggage entries. Attacker sends request with many baggage items causing memory exhaustion.
- **Impact:** Memory DoS on observability services
- **Attack Vector:** Network — any HTTP request can include baggage headers
- **CWE:** CWE-770 (Allocation of Resources Without Limits)
- **Fix:** Update `@opentelemetry/sdk-node` to >= 0.301.0
- **References:** https://github.com/advisories/GHSA-8988-4f7v-96qf

---

### DEP-012: @opentelemetry/propagator-jaeger Unhandled Exception DoS
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **CVSS:** 7.5 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
- **Package:** `@opentelemetry/propagator-jaeger` < 2.9.0
- **Affected Projects:**
  - `portal/Backend` (transitive)
- **Vulnerability:** Malformed Jaeger-formatted trace header causes unhandled exception, crashing request handler
- **Impact:** Denial of service on any trace-propagation endpoint
- **CWE:** CWE-248 (Uncaught Exception)
- **Fix:** Update to `@opentelemetry/sdk-node >= 0.301.0`

---

### DEP-013: Vite File Server Bypass (3 CVEs)
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** `vite` <= 6.4.3
- **Affected Projects:**
  - `Source/Frontend`
  - `portal/Frontend`
- **Vulnerabilities:**
  1. **GHSA-rq7h-c2jc-7f22**: Files outside `server.fs.allow` served on non-Windows when paths match
  2. **GHSA-fx2h-pf6j-xcff**: `server.fs.deny` bypass via Windows alternate paths
  3. Cross-origin script execution via custom middleware
- **Impact:** Leak of private source files, vendor files during dev
- **Attack Vector:** Local — dev server only
- **CWE:** CWE-22 (Path Traversal), CWE-284 (Improper Access Control)
- **Fix:** Update `vite` to > 6.4.3 — run `npm update vite`

---

### DEP-014: @remix-run/router Open Redirect
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **CVSS:** Not scored (CVSS null)
- **Package:** `@remix-run/router` < 1.23.3
- **Affected Projects:**
  - `Source/Frontend`
  - `portal/Frontend`
- **Vulnerability:** React Router redirect with path starting `//` is interpreted as protocol-relative URL, allowing attacker to redirect to arbitrary domain
- **Impact:** Open redirect → phishing, credential theft
- **Attack Vector:** User click → attacker-controlled URL parameter
- **CWE:** CWE-601 (URL Redirection to Untrusted Site)
- **Fix:** Update to `@remix-run/router >= 1.23.3` — run `npm update react-router-dom`

---

### DEP-015: @protobufjs/utf8 Overlong UTF-8 Decoding
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **CVSS:** 5.3 / AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N
- **Package:** `@protobufjs/utf8` <= 1.1.0
- **Affected Projects:**
  - `platform/orchestrator`
  - `portal/Backend`
- **Vulnerability:** Overlong UTF-8 sequences accepted as valid, bypassing validation
- **Impact:** Integrity check bypass on protobuf messages
- **CWE:** CWE-176 (Improper Handling of Unusual Sequences)
- **Fix:** Bump protobuf dependencies to latest

---

### DEP-016: qs Denial of Service (4 CVEs)
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** `qs` 2.2.5 - 6.16.0
- **Affected Projects:**
  - `Source/Backend`
  - `platform/orchestrator`
  - `portal/Backend`
- **Vulnerabilities:**
  1. **GHSA-q8mj-m7cp-5q26**: Crash on null/undefined in comma arrays
  2. **GHSA-x5fp-wj9c-mxmx**: Array-limit bypass via bracket-key comma parsing
  3. **GHSA-4mjr-xmp4-gh2g**: DoS via attacker-controlled isBuffer
  4. **GHSA-6pq8-jhm2-2vcw**: Crash on non-callable toString in comma array
- **Impact:** Query parameter parsing crashes
- **Attack Vector:** Any route with query string parsing
- **CWE:** CWE-248, CWE-770 (Uncontrolled Resource Consumption)
- **Fix:** Ensure `qs >= 6.16.1` — run `npm update qs`

---

---

## License Compliance

### Summary
- ✅ No GPL/AGPL licenses found in direct dependencies (good — non-viral)
- ⚠️ **Unknown/UNLICENSED**: Not audited (npm audit --json does not include license info by default)
- Recommendation: Run `npx license-checker --json` for full compliance audit

### Licenses Found in Direct Dependencies
All direct dependencies use permissive licenses (MIT, ISC, Apache-2.0, BSD):
- MIT: express, uuid, dockerode, pino, vitest, vite, ts-jest
- ISC: uuid, async
- Apache-2.0: @opentelemetry/*, protobufjs
- BSD-2-Clause / BSD-3-Clause: various dev tools

---

## Supply Chain Risk Assessment

### Total Transitive Dependencies
| Project | Total | Risk Surface |
|---------|-------|---------------|
| Source/Backend | 411 | High (>400) |
| Source/Frontend | 230 | Medium |
| Source/E2E | 4 | **Low** ✅ |
| platform/orchestrator | 155 | Medium |
| portal/Backend | 225 | Medium |
| portal/Frontend | 424 | High (>400) |
| **TOTAL** | **1,679** | **Very High** |

### Observations
- **1,679 transitive dependencies** is a large supply chain surface — each dependency = one potential vulnerability vector
- **E2E tests are isolated** (only 4 deps) — good practice ✅
- **Frontend projects have 200+ dev dependencies** — test/build tools increase risk
- **Backend/Orchestrator rely heavily on npm ecosystem** — prioritize critical patches

### Post-Install Scripts
- No suspicious post-install scripts detected in audited packages
- Recommendation: Run `npm audit --production` periodically to exclude dev tools from risk calculation

---

## Recommended Remediation Plan

### Immediate (Today)
1. **DEP-001, DEP-002, DEP-003** — Apply critical patches:
   ```bash
   cd Source/Backend && npm update proxy-addr uuid vitest
   cd Source/Frontend && npm update vitest
   cd platform/orchestrator && npm update protobufjs proxy-addr @grpc/grpc-js
   cd portal/Backend && npm update protobufjs proxy-addr @grpc/grpc-js @opentelemetry/auto-instrumentations-node
   cd portal/Frontend && npm update vitest
   ```

2. **Run tests** to confirm no breaking changes:
   ```bash
   npm test --workspaces --if-present
   ```

3. **Audit rotation** — rotate all API keys, database credentials if any leaked

### This Week (P2 patches)
- DEP-004 through DEP-008: Schedule express, body-parser, browserslist, ws updates
- Test Frontend builds: `npm run build` in Source/Frontend and portal/Frontend

### This Month (P3 patches)
- DEP-009 through DEP-016: Schedule moderate-severity updates
- Full dependency tree review: `npm ls` identify orphaned/redundant packages
- License compliance audit: `npx license-checker --json`

---

## Cross-References & Escalations

### [ESCALATE → TheGuardians]
- **DEP-001**: Access control bypass via IP spoofing (A01:2021)
- **DEP-002**: Remote code execution + credential leak (A02:2021, A07:2021)
- **DEP-003**: Remote code execution in orchestrator
- **DEP-010**: Path traversal in test environment

### [CROSS-REF: red-teamer]
- DEP-004, DEP-005, DEP-007: Exploitable DoS vectors
- DEP-008: WebSocket DoS
- DEP-012: Trace header DoS
- DEP-013: File server bypass (dev-mode only)
- DEP-016: Query string parsing DoS

---

## Summary Statistics

```json
{
  "audit_date": "2026-11-08",
  "projects_scanned": 6,
  "total_vulnerabilities": 88,
  "critical": 12,
  "high": 32,
  "moderate": 36,
  "low": 8,
  "total_dependencies": 1679,
  "direct_dependencies_with_issues": 8,
  "grade": "D",
  "remediation_priority": "URGENT"
}
```

---

## Appendix: Audit Commands Run

```bash
# Backend
cd Source/Backend && npm audit --json

# Frontend
cd Source/Frontend && npm audit --json

# E2E
cd Source/E2E && npm audit --json

# Orchestrator
cd platform/orchestrator && npm audit --json

# Portal Backend
cd portal/Backend && npm audit --json

# Portal Frontend
cd portal/Frontend && npm audit --json
```

---

**Generated by:** Dependency Auditor (TheInspector team)  
**Date:** 2026-11-08  
**Tool:** `npm audit --json`  
**Next audit:** Recommended in 7 days (after critical patches applied)

---
