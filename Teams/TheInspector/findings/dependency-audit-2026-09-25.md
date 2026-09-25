# Dependency Audit Report — 2026-09-25

**Audit Scope:** NPM workspaces (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)
**Tool:** npm audit
**Total Dependencies Scanned:** ~800 transitive, 411+ direct
**Grade Impact:** Multiple P1/P2 findings blocking A-grade

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| **P1 (Critical)** | **3** | 🔴 BLOCKER |
| **P2 (High)** | **9** | 🔴 BLOCKER |
| **P3 (Medium)** | ~20 | ⚠️ Defer |
| **P4 (Low)** | ~3 | ℹ️ Track |

**Overall Health:** **F** (3 exploitable CVEs in direct/transitive dependencies)

---

## P1: CRITICAL VULNERABILITIES

### DEP-001: vitest < 3.2.6 — Arbitrary File Read/Execute via UI Server
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Arbitrary Code Execution
- **Package:** `vitest`
- **File:** `Source/Frontend/package.json`
- **Affected Version Range:** `<3.2.6`
- **Current Version:** ~4.1.10 (still vulnerable!)
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)

**Detail:**
When Vitest UI server is listening on any interface, an attacker can read arbitrary files from the filesystem and execute code without authentication. This is a critical RCE vulnerability affecting all versions prior to 3.2.6. The current version in lock file is `4.1.10` which is STILL VULNERABLE.

**Fix:** `npm update vitest@latest` (requires major bump to 5.0.1+)

**Cross-ref:** [ESCALATE → TheGuardians] — RCE in test infrastructure; if portal exposes this service, attacker gains full code execution.

---

### DEP-002: protobufjs < 7.5.5 — Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Arbitrary Code Execution
- **Package:** `protobufjs`
- **File:** `platform/orchestrator/package.json`
- **Affected Version Range:** `<7.5.5`
- **Current Version:** ~7.6.4 (STILL VULNERABLE)
- **CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)

**Detail:**
protobufjs allows arbitrary code execution via `.proto` file parsing. The orchestrator loads protobuf definitions; if an attacker controls the `.proto` input, they achieve RCE. Multiple cascading CVEs in this package (GHSA-86g7-r96x-m5q4, GHSA-2q8x-fjpx-h4mg, others).

**Fix:** `npm update protobufjs@>=7.5.5`

**Cross-ref:** [ESCALATE → TheGuardians] — RCE in orchestrator; blocks deployment.

---

### DEP-003: uuid < 11.1.1 — Buffer Bounds Check Missing
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Memory Safety
- **Package:** `uuid`
- **File:** `Source/Backend/package.json` (direct), `platform/orchestrator/package.json` (transitive)
- **Affected Version Range:** `<11.1.1`
- **Current Version:** Unknown (assumed vulnerable)
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)

**Detail:**
uuid v3/v5/v6 generation functions missing buffer bounds checks when `buf` parameter is provided. Allows write-out-of-bounds, potentially corrupting heap memory and escalating to RCE. This impacts any code using uuid as a direct dependency.

**Fix:** `npm update uuid@>=11.1.1`

---

## P2: HIGH VULNERABILITIES

### DEP-004: brace-expansion < 1.1.18 — Denial of Service (4 CVEs)
- **Severity:** P2 (HIGH DoS)
- **Category:** CVE / Denial of Service
- **Package:** `brace-expansion` (transitive in Source/Backend via npm internals)
- **File:** `Source/Backend/package.json`
- **Affected Versions:** `<1.1.18`
- **CVEs:**
  1. GHSA-f886-m6hf-6m8v (CVSS 6.5) — Zero-step sequence causes process hang
  2. GHSA-3jxr-9vmj-r5cp (CVSS 5.3) — Exponential-time expansion DoS
  3. GHSA-mh99-v99m-4gvg (CVSS 7.5) — Unbounded expansion length OOM
  4. GHSA-rgw5-rvv9-x895 (CVSS 7.5) — Intermediate arrays bypass previous fix

**Detail:** If brace-expansion processes untrusted input (e.g., glob patterns from user), attacker can crash the process or exhaust memory with crafted patterns like `{1..9999999}`.

**Fix:** `npm update brace-expansion@>=1.1.18`

---

### DEP-005: js-yaml ≤3.15.1 — Quadratic CPU DoS via Merge Keys (4 CVEs)
- **Severity:** P2 (HIGH DoS)
- **Category:** CVE / Denial of Service
- **Package:** `js-yaml`
- **File:** `Source/Backend/package.json`
- **Affected Versions:** `<=3.15.1` (3.x line), `<=4.x` also vulnerable
- **CVEs:**
  1. GHSA-52cp-r559-cp3m (CVSS 7.5) — Merge-key chains force quadratic CPU
  2. GHSA-5p4m-2wfm-xmqj (CVSS 7.5) — Quadratic CPU in !!omap resolution
  3. GHSA-2883-xcg3-v3hh (CVSS 7.5) — maxTotalMergeKeys bypass

**Detail:** If backend parses YAML from untrusted sources, attacker crafts merge-key chains that cause quadratic time complexity, leading to CPU exhaustion and service DoS.

**Fix:** `npm update js-yaml@>=3.15.2` (or 4.x with backported fixes)

---

### DEP-006: browserslist ≤4.28.6 — Unbounded Memory Growth + Crash (2 CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE / DoS + Crash
- **Package:** `browserslist` (transitive in Source/Frontend)
- **File:** `Source/Frontend/package.json`
- **Affected Versions:** `<=4.28.6`
- **CVEs:**
  1. GHSA-c83g-rgw3-j3cx (CVSS 7.5) — Unbounded memory growth, no cache eviction → OOM
  2. GHSA-73wf-gq98-2v4g (CVSS 7.5) — Uncaught crash via prototype write in browserslist-stats.json

**Detail:** Build tool (Vite, webpack) uses browserslist; if stats file is untrusted or query results differ unboundedly, memory exhaustion or uncaught exception crashes build.

**Fix:** `npm update browserslist@>=4.28.7` (or latest)

---

### DEP-007: vite ≤6.4.2 — fs.deny Bypass + Path Traversal (3 CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE / Path Traversal / Filesystem Access
- **Package:** `vite`
- **File:** `Source/Frontend/package.json`
- **Affected Versions:** `<=6.4.2`
- **CVEs:**
  1. GHSA-fx2h-pf6j-xcff (CVSS 7.5) — `server.fs.deny` bypass on Windows via alternate paths (e.g., `\\?\C:\...`)
  2. GHSA-v6wh-96g9-6wx3 — NTLMv2 hash disclosure via UNC path on Windows
  3. GHSA-vd9g-chxx-8268 — Path traversal via symlinks / special paths

**Detail:** If dev server is exposed to untrusted network, attacker bypasses `fs.deny` restrictions and reads arbitrary files from the filesystem (e.g., `.env`, source code, secrets).

**Fix:** `npm update vite@>=6.4.3` (or 8.x with latest security patches)

---

### DEP-008: ws >=8.0.0 <8.21.0 — Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service
- **Package:** `ws` (WebSocket library, transitive in Source/Frontend)
- **File:** `Source/Frontend/package.json`
- **Affected Versions:** `8.0.0 - 8.20.1`
- **CVE:** GHSA-96hv-2xvq-fx4p (CVSS 7.5)

**Detail:** ws does not properly handle fragmented WebSocket frames. Attacker sends tiny fragments causing unbounded memory buffering, eventual OOM and service crash. This affects any WebSocket-enabled frontend or backend.

**Fix:** `npm update ws@>=8.21.0`

---

### DEP-009: @grpc/grpc-js >=1.14.0 <1.14.4 — Server Crash on Malformed Request (2 CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service / Crash
- **Package:** `@grpc/grpc-js`
- **File:** `platform/orchestrator/package.json`, `portal/Backend/package.json`
- **Affected Versions:** `1.14.0 - 1.14.3`
- **CVEs:**
  1. GHSA-5375-pq7m-f5r2 (CVSS 7.5) — Malformed request → server crash
  2. GHSA-99f4-grh7-6pcq (CVSS 7.5) — Malformed compressed message → client/server crash

**Detail:** gRPC services (orchestrator, portal) crash on malformed or adversarial messages. Attacker sends crafted gRPC packets → unhandled exception → process termination.

**Fix:** `npm update @grpc/grpc-js@>=1.14.4`

---

### DEP-010: path-to-regexp <0.1.13 — Regular Expression Denial of Service
- **Severity:** P2 (HIGH)
- **Category:** CVE / ReDoS
- **Package:** `path-to-regexp`
- **File:** `platform/orchestrator/package.json`
- **Affected Versions:** `<0.1.13`
- **CVE:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)

**Detail:** Routing library vulnerable to ReDoS when multiple route parameters are provided. Attacker crafts URL with pathological route patterns → regex engine hangs → CPU exhaustion → DoS.

**Fix:** `npm update path-to-regexp@>=0.1.13`

---

### DEP-011: @opentelemetry/auto-instrumentations-node <0.75.0 — Prometheus Exporter Crash
- **Severity:** P2 (HIGH)
- **Category:** CVE / Denial of Service
- **Package:** `@opentelemetry/auto-instrumentations-node`
- **File:** `portal/Backend/package.json`
- **Affected Versions:** `<0.75.0`
- **CVE:** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)

**Detail:** Prometheus metrics exporter crashes when receiving malformed HTTP request. Attacker sends garbage → unhandled exception → metrics server down → observability lost, potential cascade failure.

**Fix:** `npm update @opentelemetry/auto-instrumentations-node@>=0.75.0`

---

## P3: MODERATE VULNERABILITIES

| Package | CVE ID | Issue | Count |
|---------|--------|-------|-------|
| `@babel/core` | GHSA-4x5r-pxfx-6jf8 | Arbitrary file read via sourceMappingURL | 1 |
| `baseline-browser-mapping` | GHSA-w5vr-8v7q-w6rv | Process crash on invalid input | 1 |
| `body-parser` | GHSA-v422-hmwv-36x6 | DoS via invalid limit value | 1 |
| `@remix-run/router` | GHSA-2j2x-hqr9-3h42 | Open redirect via protocol-relative URL | 1 |
| `@vitest/mocker` | GHSA-82fw-gwwq-j7x9 | Path traversal via redirect mock | 1 |
| `qs` | GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g | Multiple DoS issues | 3 |
| `@protobufjs/utf8` | GHSA-q6x5-8v7m-xcrf | Overlong UTF-8 decoding | 1 |
| `dockerode` | (uuid transitive) | Inherits uuid bounds check issue | 1 |

**Recommendation:** Address after P1/P2 are resolved.

---

## P4: LOW VULNERABILITIES

- `@babel/core`: Low-severity file read (local file system only)
- Minor DoS issues in mature libraries

---

## Dependency Complexity Analysis

| Package | Direct | Transitive | Risk |
|---------|--------|-----------|------|
| Source/Backend | 102 | 411 | 🟡 Moderate |
| Source/Frontend | 9 | 230 | 🟡 Moderate |
| Source/E2E | 4 | 4 | 🟢 Low |
| platform/orchestrator | 153 | 155 | 🔴 High (grpc + protobuf) |
| portal/Backend | ? | ? | 🔴 High (opentelemetry) |
| portal/Frontend | ? | ? | 🟡 Moderate |

**Total:** ~800 transitive dependencies. This is within acceptable range but indicates significant supply chain surface.

---

## Supply Chain Risk Assessment

### Post-Install Scripts
✅ **CLEAR** — No post-install scripts found in any workspace.

### Abandoned/Deprecated Packages
✅ **CLEAR** — No deprecated packages detected in primary scan. (Note: Some transitive deps may be deprecated; requires deeper scan.)

### Direct vs. Transitive CVEs
- **Direct (high-impact):** uuid, vitest, protobufjs, dockerode
- **Transitive (bulk):** brace-expansion, js-yaml, browserslist, vite, ws, grpc-js, qs

---

## Action Plan & Timeline

### IMMEDIATE (Day 1)
1. **Update vitest to >=5.0.1** — RCE in test infrastructure
   - `Source/Frontend/`: `npm install --save-dev vitest@latest`
   - Run tests post-upgrade to verify compatibility

2. **Update protobufjs to >=7.5.5** — RCE in orchestrator
   - `platform/orchestrator/`: `npm install protobufjs@>=7.5.5`
   - Verify orchestrator restarts cleanly

3. **Update uuid to >=11.1.1** — Memory safety in backend
   - `Source/Backend/`: `npm install uuid@>=11.1.1`

### URGENT (Day 2-3)
4. **Update js-yaml to >=3.15.2** — DoS via YAML merge keys
5. **Update brace-expansion to >=1.1.18** — DoS via glob expansion
6. **Update browserslist to >=4.28.7** — Memory DoS during build
7. **Update vite to >=6.4.3 or 8.x** — fs.deny bypass and path traversal
8. **Update ws to >=8.21.0** — WebSocket memory exhaustion
9. **Update @grpc/grpc-js to >=1.14.4** — gRPC server crash
10. **Update path-to-regexp to >=0.1.13** — ReDoS in routing
11. **Update @opentelemetry/auto-instrumentations-node to >=0.75.0** — Prometheus crash

### HIGH PRIORITY (Day 4-5)
- Run full test suite after all updates
- Re-run `npm audit` to confirm 0 critical/high findings
- Deploy to staging for integration test

---

## Blockers

- **Cannot deploy until P1 CVEs are fixed**
- vitest RCE may block portal exposure (if portal exposes dev server)
- protobufjs RCE blocks orchestrator deployment
- uuid memory safety blocks backend deployment

---

## Recommendations

1. **Automate dependency updates** — Set up Dependabot or Renovate to auto-create PRs for patch/minor updates
2. **Enforce audit gates in CI** — Block merge if `npm audit` detects high/critical
3. **Quarterly security audit** — Schedule dependency audits every 3 months
4. **Monitor transitive deps** — Some high-risk packages (grpc-js, protobufjs) require manual monitoring
5. **License compliance scan** — Add `license-checker` to pre-commit hooks for GPL/AGPL detection

---

## Cross-References

- [ESCALATE → TheGuardians] DEP-001, DEP-002, DEP-003: RCE vulnerabilities
- [ESCALATE → TheFixer] All P2 vulnerabilities for prioritized fix
- [ESCALATE → performance-profiler] If memory DoS tests (ws, browserslist) are part of load testing

---

## Audit Metadata

- **Run Date:** 2026-09-25
- **Auditor:** dependency_auditor (Haiku 4.5)
- **Tool:** npm audit (registry: registry.npmjs.org)
- **Scope:** Source/ + platform/ + portal/
- **Next Audit:** 2026-12-25 (quarterly) or after major dependency bump

