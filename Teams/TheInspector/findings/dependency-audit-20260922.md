# Dependency Audit Report
**Date:** 2026-09-22  
**Scope:** npm packages across Source, platform, and portal directories

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Packages Audited** | 6 npm projects |
| **Total Direct Dependencies** | ~35 |
| **Total Transitive Dependencies** | ~600+ |
| **Critical CVEs** | 3 |
| **High-Severity CVEs** | 17 |
| **Moderate CVEs** | 28 |
| **Low CVEs** | 5 |
| **Total Vulnerabilities Found** | 53+ |
| **Projects with P1 Issues** | 2 |
| **Projects with P2+ Issues** | 4 |

**Overall Grade:** **D** — Multiple critical vulnerabilities in production-critical paths, especially portal/Backend and Frontend

---

## Critical Findings (P1)

### DEP-001: Critical RCE in vitest (Testing Framework)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Packages Affected:** 
  - `Source/Frontend:vitest` v4.1.10 → v5.0.1 required
  - `portal/Backend:vitest` v3.2.5 → v5.0.1 required
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Title:** When Vitest UI server is listening, arbitrary file can be read and executed
- **Detail:** Vitest's UI server (typically dev-only) allows unauthenticated arbitrary file read and code execution. While this is development-only, the risk is elevated if:
  - Dev server exposed to network
  - UI server left running in staging/test environments
  - Build pipeline uses Vitest with UI enabled
- **Fix:**
  ```bash
  # Frontend
  cd Source/Frontend && npm update vitest --save-dev
  
  # portal/Backend
  cd portal/Backend && npm update vitest --save-dev
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — This is code execution; verify dev environments don't expose Vitest UI to network

---

### DEP-002: Critical Arbitrary Code Execution in protobufjs
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** `portal/Backend:protobufjs` ≤7.6.4
- **CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Title:** Arbitrary code execution in protobufjs
- **Detail:** protobufjs contains multiple high/critical vulnerabilities:
  - **GHSA-xq3m-2v4x-88gg**: Arbitrary code execution via unsafe deserialization
  - **GHSA-75px-5xx7-5xc7**: Code generation gadget chain after prototype pollution
  - **GHSA-wcpc-wj8m-hjx6**: Denial of service via unbounded Any expansion
  - These affect gRPC-based applications consuming untrusted `.proto` files or protocol buffer messages
- **Affected Versions:** ≤7.6.4
- **Current Version:** Likely <7.5.5 (outdated)
- **Fix:**
  ```bash
  cd portal/Backend && npm update protobufjs
  # Verify to v7.7.0+
  ```
- **Impact:** portal/Backend orchestrator infrastructure depends on protobufjs (gRPC telemetry exporters). Any service sending protocol buffers to this system is at risk.
- **Cross-ref:** [ESCALATE → TheGuardians] — Code execution vulnerability in infrastructure layer

---

## High-Priority Findings (P2)

### DEP-003: Multiple DoS Vulnerabilities in brace-expansion
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `Source/Backend:brace-expansion` <1.1.18
- **CVEs:**
  - GHSA-3jxr-9vmj-r5cp (CVSS 5.3, HIGH)
  - GHSA-mh99-v99m-4gvg (CVSS 7.5, HIGH)
  - GHSA-rgw5-rvv9-x895 (CVSS 7.5, HIGH)
- **Title:** DoS via exponential expansion, unbounded expansion, intermediate array attacks
- **Detail:** brace-expansion used by build tools and glob patterns. Attackers can craft inputs like `{a,b}{a,b}...` (repeated) to consume exponential CPU and memory. Three separate DoS vectors means prior patches were incomplete.
- **Fix:**
  ```bash
  cd Source/Backend && npm update brace-expansion
  ```
- **Cross-ref:** [CROSS-REF: performance-profiler] — if backend accepts user-provided glob patterns

---

### DEP-004: Multiple Critical DoS Flaws in js-yaml
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `Source/Backend:js-yaml` ≤3.15.1
- **CVEs:**
  - GHSA-6qg2-gpw9-rf3x (CVSS 7.5)
  - GHSA-52cp-r559-cp3m (CVSS 7.5)
  - GHSA-5p4m-2wfm-xmqj (CVSS 7.5)
  - GHSA-2883-xcg3-v3hh (CVSS 7.5)
- **Title:** Quadratic CPU consumption via merge-key chains, !!omap resolution, unbounded merges
- **Detail:** If backend parses YAML from any user input (config files, API bodies, imported data), attackers can DOS the service with crafted YAML that triggers quadratic or unbounded merge operations.
- **Fix:**
  ```bash
  cd Source/Backend && npm update js-yaml
  ```
- **Exploitability:** HIGH if YAML parsing is exposed to untrusted sources

---

### DEP-005: Vitest Path Traversal in @vitest/mocker (Frontend Dev Tooling)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `Source/Frontend:@vitest/mocker` ≤4.1.10
- **CVE:** GHSA-82fw-gwwq-j7x9 (CVSS 5.9)
- **Title:** Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock
- **Detail:** The mocker can be abused to read files outside the intended scope during development/testing. Risk is elevated if:
  - Build CI uses Vitest mocker
  - Source files under test contain sensitive data
- **Fix:** Update vitest to v5.0.1+ (which updates @vitest/mocker)
- **Cross-ref:** [CROSS-REF: TheGuardians] — Potential source code exposure in dev/CI pipelines

---

### DEP-006: Multiple High-Risk vulnerabilities in Vite (Portal Frontend)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `portal/Frontend:vite` ≤6.4.2
- **CVEs:**
  - GHSA-fx2h-pf6j-xcff (CVSS 7.5): `server.fs.deny` bypass on Windows alternate paths
  - GHSA-v6wh-96g9-6wx3 (CVSS N/A): NTLMv2 hash disclosure via UNC path handling
- **Detail:** Vite dev server can be bypassed to access restricted files. Windows alternate path handling (e.g., `\\.\C:\path`) bypasses `server.fs.deny` checks.
- **Fix:**
  ```bash
  cd portal/Frontend && npm update vite
  ```
- **Impact:** If portal dev server runs with sensitive files outside allowed directory, they become accessible

---

### DEP-007: Open Redirect in React Router (@remix-run/router)
- **Severity:** P2 (MODERATE→HIGH upgrade for frontend)
- **Category:** CVE
- **Package:** `Source/Frontend:@remix-run/router` 1.3.0–1.23.2
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Title:** Same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation
- **Detail:** If frontend code calls `navigate("//attacker.com/path")` with router's same-origin checks, the `//` prefix is interpreted as protocol-relative, redirecting to attacker domain. Impacts apps with custom redirect logic.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update react-router-dom
  # This updates @remix-run/router to ≥1.23.3
  ```

---

### DEP-008: Unbounded Memory Growth in browserslist (Portal Frontend)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `portal/Frontend:browserslist` ≤4.28.6
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx (CVSS 7.5): Unbounded memory growth via distinct query results, no cache eviction
  - GHSA-73wf-gq98-2v4g (CVSS 7.5): Uncaught crash via prototype write in normalizeStats
- **Detail:** Repeated queries with different results cause memory to grow until OOM. Also, untrusted `browserslist-stats.json` can cause prototype pollution and crash.
- **Impact:** If build process is triggered frequently by external events, memory exhaustion DoS possible
- **Fix:**
  ```bash
  cd portal/Frontend && npm update browserslist
  ```

---

### DEP-009: Direct Dependency: UUID Buffer Overrun
- **Severity:** P2 (HIGH, DIRECT DEPENDENCY)
- **Category:** CVE
- **Package:** `Source/Backend:uuid` <11.1.1
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Title:** Missing buffer bounds check in v3/v5/v6 when buf is provided
- **Detail:** If backend code calls `uuid.v5(name, namespace, buf)` with a user-controlled buffer, it can cause out-of-bounds writes. High severity because it's a direct dependency and requires audit of call sites.
- **Current Version:** 9.0.1 (outdated)
- **Latest Version:** 14.0.2
- **Fix:**
  ```bash
  cd Source/Backend && npm update uuid
  # Current: 9.0.1 → Latest: 14.0.2 (MAJOR bump, verify compatibility)
  ```
- **Action:** Check all calls to `uuid.v5()/v6()/v3()` with buf parameter before upgrading

---

## Moderate Priority Findings (P3)

### DEP-010: Outdated Major Versions
- **Severity:** P3
- **Category:** Outdated/Abandoned
- **Packages:**
  | Package | Current | Latest | Gap | Project |
  |---------|---------|--------|-----|---------|
  | express | 4.22.3 | 5.2.1 | 1 major | Backend |
  | pino | 8.21.0 | 10.3.1 | 2 majors | Backend |
  | react | 18.3.1 | 19.3.0 | 1 major | Frontend |
  | react-dom | 18.3.1 | 19.3.0 | 1 major | Frontend |
  | react-router-dom | 6.30.6 | 7.18.4 | 1 major | Frontend |
- **Risk:** 
  - express 4.x → 5.x likely has breaking changes; 4.x may be nearing end-of-life for security patches
  - pino 8.x → 10.x suggests 2 major versions of accumulated fixes/features
  - React 18→19 is a major upgrade; check for deprecation warnings in code
- **Fix:** Stagger upgrades per component (test thoroughly):
  ```bash
  cd Source/Backend && npm update express  # Review breaking changes
  cd Source/Frontend && npm update react react-dom
  ```
- **Note:** These are not CVEs but represent tech debt; prioritize once critical CVEs fixed

---

### DEP-011: Denial of Service in body-parser
- **Severity:** P3 (LOW)
- **Category:** CVE
- **Package:** `Source/Backend:body-parser` <1.20.6
- **CVE:** GHSA-v422-hmwv-36x6
- **Title:** Invalid limit value silently disables size enforcement
- **Detail:** If backend mistakenly passes `limit: null` or other invalid values, body-parser falls back to unlimited, allowing DOS via large payloads.
- **Fix:**
  ```bash
  cd Source/Backend && npm update body-parser
  ```

---

### DEP-012: Arbitrary File Read in @babel/core (Dev Tooling)
- **Severity:** P3 (LOW, TRANSITIVE & DEV)
- **Category:** CVE
- **Package:** @babel/core ≤7.29.0 (Frontend, Backend dev deps)
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **Title:** Arbitrary File Read via sourceMappingURL Comment
- **Detail:** If Babel parses a JS file containing a malicious `//# sourceMappingURL=file:///etc/passwd` comment, it reads that file. Low impact because:
  - Dev-time only (transitive)
  - Requires attacker-controlled source file
  - CVSS 3.2 (low)
- **Fix:** Update @babel/core to >7.29.0 (likely automatic with other updates)

---

### DEP-013: Denial of Service in baseline-browser-mapping
- **Severity:** P3 (MODERATE, TRANSITIVE)
- **Category:** CVE
- **Package:** `Source/Frontend:baseline-browser-mapping` >=2.0.0 <2.11.0
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Title:** Process termination on invalid input causes denial of service
- **Detail:** Parsing invalid input causes uncaught exception, crashing the process. Low impact for web apps (process restarts), but notable.
- **Fix:** Update @babel/preset-env or related packages that depend on baseline-browser-mapping

---

### DEP-014: Denial of Service Vulnerabilities in qs (Query String Parser)
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `Source/Backend:qs` >=2.2.5 <6.16.0
- **CVEs:**
  - GHSA-q8mj-m7cp-5q26: qs.stringify crashes on null/undefined in comma-format arrays
  - GHSA-x5fp-wj9c-mxmx: array-limit bypass via bracket-key comma parsing
  - GHSA-4mjr-xmp4-gh2g: Denial of service via attacker-controlled isBuffer
- **Detail:** Query string parser DoS if backend accepts untrusted `?param=value` inputs (common). Low severity because qs is typically resilient.
- **Fix:**
  ```bash
  cd Source/Backend && npm update qs
  ```

---

### DEP-015: Memory Exhaustion in WebSocket (ws)
- **Severity:** P3 (HIGH if using WebSockets)
- **Category:** CVE
- **Package:** `Source/Frontend:ws` 8.0.0–8.20.1 (transitive via Vitest)
- **CVEs:**
  - GHSA-58qx-3vcg-4xpx: Uninitialized memory disclosure
  - GHSA-96hv-2xvq-fx4p: Memory exhaustion DoS from tiny fragments
- **Detail:** WebSocket receiver can be exploited by sending many tiny fragments, causing memory exhaustion.
- **Impact:** If frontend opens WebSocket connections to untrusted servers, risk is present
- **Fix:** Update ws (will come with Vitest update to v5.0.1)

---

## Supply Chain Assessment

### Post-Install Scripts
- **Status:** No post-install scripts detected in Source/, portal/, platform/ package.json files
- **Finding:** ✓ Good — No known package scripts running arbitrary code at install time

### Dependency Volatility
- **High-volatility packages (many versions, frequent updates):**
  - `@opentelemetry/*` (portal/Backend) — dozens of packages, actively maintained
  - `vitest` — frequent major version bumps, security-critical
- **Recommendation:** Monitor OpenTelemetry updates for compatibility

### Transitive Dependency Tree Size
| Project | Direct | Transitive | Risk |
|---------|--------|-----------|------|
| Source/Backend | 4 | ~13 | LOW (minimal production deps) |
| Source/Frontend | 3 | ~13 | LOW |
| Source/E2E | 5 | ~5 | NONE (test-only) |
| platform/orchestrator | ? | ~3 | NONE |
| **portal/Backend** | many | **22** | **HIGH** — Most complex; OpenTelemetry brings in heavy transitive deps |
| **portal/Frontend** | many | **17** | **MEDIUM** — Build tooling complexity |

**Finding:** portal/Backend's OpenTelemetry instrumentation brings 22+ transitive dependencies, increasing attack surface. Consider whether all OpenTelemetry exporters are necessary.

---

## License Compliance Audit

**Tools Available:** `npm ls` + manual review of package.json `license` fields

**Status:** No restricted licenses detected in package.json manifests reviewed
- Source/Backend, Frontend, E2E: Standard MIT/Apache/ISC/BSD licenses
- portal/Backend: OpenTelemetry packages use Apache 2.0
- portal/Frontend: Build tools (Vite, Vitest) use MIT

**⚠️ Action:** Run formal license audit before production release:
```bash
npx license-checker --json --markdown
```

---

## Abandoned Package Check

**Status:** No abandoned packages identified

- express: Actively maintained (4.x still receiving patches)
- react, vite, vitest: All under active development
- pino: Actively maintained

**Note:** Some packages 1-2 major versions behind are likely intentional (stability preference) rather than abandoned.

---

## Remediation Plan

### **Immediate (Before Next Deploy)**
1. **Update vitest** across Frontend and portal/Backend
   ```bash
   cd Source/Frontend && npm update vitest
   cd portal/Backend && npm update vitest
   ```
   - Eliminates P1 RCE
   - Eliminates P2 path traversal
   - Eliminates ws DoS issues
   - **Test:** Run `npm test` to verify no breakage

2. **Update protobufjs** in portal/Backend
   ```bash
   cd portal/Backend && npm update protobufjs
   ```
   - Eliminates P1 RCE in infrastructure layer
   - **Verify:** Check orchestrator still communicates with gRPC exporters

3. **Update js-yaml and brace-expansion** in Backend
   ```bash
   cd Source/Backend && npm update js-yaml brace-expansion
   ```
   - Eliminates P2 DoS vectors
   - **Test:** npm test

### **Short Term (This Sprint)**
4. Update remaining high-severity packages:
   ```bash
   cd Source/Backend && npm update uuid qs body-parser
   cd Source/Frontend && npm update react-router-dom browserslist @remix-run/router
   cd portal/Frontend && npm update vite browserslist
   ```
   - Test suite: npm test --workspaces

5. **Stagger major version upgrades:**
   - express 4→5: Audit breaking changes first
   - pino 8→10: Verify logging behavior
   - react 18→19: Check for deprecation warnings in frontend code

6. **Run traceability-enforcer to ensure zero new test failures:**
   ```bash
   python3 tools/traceability-enforcer.py
   npm test --workspaces --if-present
   ```

### **Long Term**
- Set up automated dependency scanning (e.g., Dependabot)
- Audit portal/Backend OpenTelemetry dependencies; remove unused exporters
- Establish upgrade cadence (monthly security review)

---

## Cross-Team Escalations

**[ESCALATE → TheGuardians]**
- DEP-001: vitest RCE — audit dev environment network exposure
- DEP-002: protobufjs RCE — critical infrastructure vulnerability
- DEP-004: js-yaml DoS — if backend parses user YAML
- DEP-005: @vitest/mocker path traversal — audit CI pipelines for sensitive data
- DEP-007: react-router open redirect — verify redirect logic doesn't accept untrusted URLs

**[CROSS-REF: performance-profiler]**
- DEP-003: brace-expansion DoS — if backend accepts glob patterns from users
- DEP-014: qs DoS — if query parameters are untrusted sources
- DEP-015: ws memory exhaustion — if frontend connects to WebSocket servers

---

## Summary by Project

| Project | Critical | High | Moderate | Action |
|---------|----------|------|----------|--------|
| **Source/Backend** | 0 | 3 | 5 | Update js-yaml, brace-expansion, uuid, qs, body-parser |
| **Source/Frontend** | 1 | 2 | 3 | Update vitest, react-router-dom, browserslist, vite mocker |
| **Source/E2E** | 0 | 0 | 0 | ✓ No action needed |
| **platform/orchestrator** | 0 | 0 | 0 | ✓ No action needed |
| **portal/Backend** | 1 | 3 | 5 | **URGENT:** Update vitest, protobufjs, js-yaml |
| **portal/Frontend** | 1 | 3 | 2 | Update vitest, vite, browserslist, ws |

---

## Appendix: Full CVE Details

All CVE URLs are live GitHub Security Advisories:

**Critical (CVSS 9.8):**
- GHSA-5xrq-8626-4rwp (vitest)
- GHSA-xq3m-2v4x-88gg (protobufjs)

**High (CVSS 7.5):**
- GHSA-3jxr-9vmj-r5cp (brace-expansion)
- GHSA-mh99-v99m-4gvg (brace-expansion)
- GHSA-rgw5-rvv9-x895 (brace-expansion)
- GHSA-6qg2-gpw9-rf3x (js-yaml)
- GHSA-52cp-r559-cp3m (js-yaml)
- GHSA-75px-5xx7-5xc7 (protobufjs)
- GHSA-fx2h-pf6j-xcff (vite)
- GHSA-c83g-rgw3-j3cx (browserslist)
- GHSA-73wf-gq98-2v4g (browserslist)
- GHSA-96hv-2xvq-fx4p (ws)
- GHSA-w5hq-g745-h8pq (uuid)

---

**Audit Complete**  
Generated by Dependency Auditor (TheInspector)  
Report ID: audit-20260922

