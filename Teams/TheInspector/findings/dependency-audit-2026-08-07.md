# Dependency Auditor Report
**Date:** 2026-08-07  
**Status:** ⚠️ CRITICAL  
**Grade:** D (2 P1 findings, 9+ P2 findings)

---

## Executive Summary

**The project has 30+ known vulnerabilities across npm dependencies, with 3 critical/exploitable vulnerabilities in direct production dependencies.**

### Key Risk Areas
1. **Handlebars (Backend transitive)**: CRITICAL JavaScript injection (GHSA-2w6w-674q-4c4q), CVSS 9.8
2. **Vitest (Frontend dev)**: CRITICAL arbitrary file read when UI server runs (GHSA-5xrq-8626-4rwp), CVSS 9.8
3. **Protobufjs (Orchestrator transitive)**: CRITICAL code execution (GHSA-xq3m-2v4x-88gg), CVSS 9.8
4. **UUID v9.0.0 (Backend + Orchestrator direct)**: Missing buffer bounds check
5. **React Router (Frontend)**: Multiple open-redirect and injection risks in transitive chain

### Outdated Major Versions
- **Backend**: pino (8.17 → 10.3.1, 2+ major), uuid (9.0 → 14.0.1, 2+ major)
- **Frontend**: react/react-dom (18.3 → 19.2, 1+ major), react-router-dom (6.26 → 7.18, 1+ major)
- **Orchestrator**: dockerode (4.0.4 → 5.0.1, 1+ major)

---

## Detailed CVE Findings

### DEP-001: Handlebars JavaScript Injection (CRITICAL)
- **Severity:** P1
- **Category:** CVE / Code Execution
- **Package:** handlebars@4.7.8 (transitive via babel/generator)
- **Workspace:** Backend
- **CVE ID:** GHSA-2w6w-674q-4c4q
- **CVSS Score:** 9.8 (CRITICAL)
- **Affected Versions:** 4.0.0 - 4.7.8
- **Detail:** 
  - AST type confusion allows attackers to inject arbitrary JavaScript code during template compilation
  - Attacker can craft malicious template with specially-crafted partial blocks (`@partial-block`)
  - This bypasses existing sandbox attempts
  - **Impact:** Template injection attacks can lead to RCE if templates accept user input

**Related CVEs in same package:**
- GHSA-3mfm-83xf-c92r: AST Type Confusion via @partial-block (CVSS 8.1)
- GHSA-xhpv-hc6g-r9c6: AST Type Confusion via dynamic partial (CVSS 8.1)
- GHSA-9cx6-37pm-9jff: DoS via malformed decorators (CVSS 7.5)
- GHSA-2qvq-rjwj-gvw9: Prototype pollution XSS (CVSS 4.7)
- GHSA-7rx3-28cr-v5wh: Missing __lookupSetter__ blocklist (CVSS 4.8)
- GHSA-442j-39wm-28r2: Property access bypass (CVSS 3.7)

- **Fix:** Upgrade handlebars to ≥4.7.9 (requires testing babel ecosystem compatibility)
- **Cross-Ref:** [ESCALATE → TheGuardians] Template injection risk if templates not strictly controlled

---

### DEP-002: Vitest Arbitrary File Read (CRITICAL)
- **Severity:** P1
- **Category:** CVE / Information Disclosure
- **Package:** vitest@2.0.5 (direct dev dependency)
- **Workspace:** Frontend
- **CVE ID:** GHSA-5xrq-8626-4rwp
- **CVSS Score:** 9.8 (CRITICAL)
- **Affected Versions:** <3.2.6
- **Detail:**
  - Vitest UI server (listening on `127.0.0.1:51204` by default) accepts arbitrary file requests
  - Unprotected access allows reading any file accessible to the process (source, `.env`, keys, etc.)
  - Requires UI server to be running (common in dev workflows)
  - **Attack Vector:** Network - local/adjacent network
  - **Impact:** Full source code disclosure, `.env` exposure, sensitive data leak

- **Fix:** Upgrade vitest to ≥3.2.6 (BREAKING: requires Node 18.19+, see note below)
- **Mitigation:** Disable UI server in dev (`--no-ui`), use firewall to block port 51204 from non-local IPs
- **Note:** Fixing requires major version bump; Frontend test framework compatibility needs QA

---

### DEP-003: Protobufjs Arbitrary Code Execution (CRITICAL)
- **Severity:** P1
- **Category:** CVE / Code Execution
- **Package:** protobufjs@7.5.5 (transitive via @grpc/grpc-js)
- **Workspace:** Orchestrator (via grpc)
- **CVE ID:** GHSA-xq3m-2v4x-88gg
- **CVSS Score:** 9.8 (CRITICAL)
- **Affected Versions:** <7.5.5
- **Detail:**
  - Arbitrary code execution when processing malformed `.proto` files or gRPC messages
  - Attacker can inject code via crafted protobuf descriptor
  - Multiple related DoS/injection gadgets in same package (11 CVEs total)
  - **Impact:** Full RCE if orchestrator accepts untrusted protobuf definitions

**Related CVEs in same package:**
- GHSA-66ff-xgx4-vchm: Code injection via bytes field defaults (HIGH)
- GHSA-75px-5xx7-5xc7: Code generation gadget after prototype pollution (HIGH)
- GHSA-jvwf-75h9-cwgg: Process-wide DoS via unsafe options (HIGH)
- GHSA-685m-2w69-288q: Unbounded protobuf recursion DoS (HIGH)
- GHSA-wcpc-wj8m-hjx6: Unbounded Any expansion DoS (HIGH)

- **Fix:** Upgrade protobufjs to ≥7.5.5, dockerode to ≥5.0.1
- **Cross-Ref:** [ESCALATE → TheGuardians] If grpc messages come from untrusted sources

---

### DEP-004: UUID Buffer Bounds Check (HIGH)
- **Severity:** P2
- **Category:** CVE / Buffer Overflow
- **Package:** uuid@9.0.0 (direct in Backend & Orchestrator)
- **Workspace:** Backend, Orchestrator
- **CVE ID:** GHSA-w5hq-g745-h8pq
- **CVSS Score:** 7.5 (HIGH)
- **Affected Versions:** <11.1.1
- **Detail:**
  - Missing bounds check when `buf` parameter is provided to v3/v5/v6 generators
  - Can write past buffer boundary if buf is undersized
  - **Impact:** Memory corruption, potential crash or security bypass
  - Backend generates UUIDs for work item IDs — undersized buffer could corrupt state store

- **Fix:** `npm install uuid@14.0.1` (major version bump)
- **Timeline:** HIGH priority — impacts core domain (work item integrity)

---

### DEP-005: brace-expansion DoS (HIGH)
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Package:** brace-expansion@≤1.1.17 (transitive via glob patterns)
- **Workspace:** Backend
- **CVE IDs:**
  - GHSA-3jxr-9vmj-r5cp: Exponential CPU expansion (HIGH, CVSS 5.3)
  - GHSA-mh99-v99m-4gvg: Unbounded expansion length OOM (HIGH, CVSS 7.5)
  - GHSA-rgw5-rvv9-x895: Unbounded intermediate arrays bypass (HIGH, CVSS 7.5)
- **Detail:**
  - Zero-step sequences cause process hang: `{1..0}` → infinite loop
  - Nested braces `{{...}}` cause exponential expansion memory usage
  - Can cause out-of-memory crash if processing untrusted glob patterns
  - **Impact:** Backend crash via malformed file list or path input

- **Fix:** Upgrade brace-expansion to ≥1.1.18 (transitive via jest/glob dependencies)
  - Run `npm audit fix` or manually update glob/jest to latest

---

### DEP-006: form-data CRLF Injection (HIGH)
- **Severity:** P2
- **Category:** CVE / Header Injection
- **Package:** form-data@4.0.0-4.0.5 (transitive via supertest/axios in devDeps)
- **Workspace:** Backend (dev), Orchestrator (dev)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx
- **CVSS Score:** 7.5 (HIGH)
- **Affected Versions:** 4.0.0 - 4.0.5
- **Detail:**
  - Unescaped multipart field names/filenames allow CRLF injection
  - Can inject arbitrary HTTP headers into multipart requests
  - **Impact:** Request smuggling, header injection if form-data used with untrusted field names

- **Fix:** Upgrade form-data to ≥4.0.6

---

### DEP-007: React Router Open Redirect (MODERATE)
- **Severity:** P2 (affects user sessions)
- **Category:** CVE / Open Redirect
- **Package:** react-router@6.0.0-6.30.4 (transitive via react-router-dom)
- **Workspace:** Frontend
- **CVE IDs:**
  - GHSA-2j2x-hqr9-3h42: Protocol-relative URL bypass (CVSS N/A)
  - GHSA-jjmj-jmhj-qwj2: XSS via open redirect (CVSS 6.9)
  - GHSA-wrjc-x8rr-h8h6: Backslash bypass (CVSS N/A)
  - GHSA-337j-9hxr-rhxg: Arbitrary constructor injection SSR (CVSS 6.1)
- **Detail:**
  - Paths starting with `//` treated as same-origin but interpreted as protocol-relative URLs by browser
  - Backslash `\` not properly rejected, allows redirect to malicious site
  - SSR hydration deserialization can inject arbitrary constructor calls
  - **Impact:** Session hijacking, XSS, malicious redirects if app uses dynamic routing

- **Fix:** Upgrade react-router-dom to ≥7.18.0+ (includes @remix-run/router@≥1.23.3)

---

### DEP-008: PostCSS Source Map Disclosure (HIGH)
- **Severity:** P2
- **Category:** CVE / Information Disclosure
- **Package:** postcss@≤8.5.22 (transitive via vite/vitest)
- **Workspace:** Frontend
- **CVE IDs:**
  - GHSA-6g55-p6wh-862q: Arbitrary file read via sourceMappingURL (CVSS 7.5)
  - GHSA-r28c-9q8g-f849: Path traversal in .map file loading (CVSS 7.5)
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix — reads arbitrary .map files (CVSS N/A)
- **Detail:**
  - Attacker-controlled sourceMappingURL in CSS can point to arbitrary files
  - PostCSS loads and processes those files as source maps
  - Allows disclosure of `.env.map`, source maps for secrets, build artifacts
  - **Impact:** Configuration/credential exposure via CSS injection

- **Fix:** Upgrade postcss to ≥8.5.23, vite to ≥8.2.1 (transitive via Frontend build chain)

---

### DEP-009: Vite Path Traversal (MODERATE-HIGH)
- **Severity:** P2
- **Category:** CVE / Path Traversal
- **Package:** vite@5.4.0 (direct dev dependency)
- **Workspace:** Frontend
- **CVE IDs:**
  - GHSA-fx2h-pf6j-xcff: server.fs.deny bypass on Windows (CVSS 7.5)
  - GHSA-4w7w-66w2-5vf9: Path traversal in optimized deps .map handling (CVSS N/A)
  - GHSA-v6wh-96g9-6wx3: launch-editor NTLMv2 hash disclosure (CVSS N/A)
- **Detail:**
  - Windows: Alternate paths bypass `server.fs.deny` (e.g., `/./../../etc/passwd`)
  - .map files in optimized deps can traverse to parent directories
  - launch-editor with UNC paths exposes NTLM hash on Windows
  - **Impact:** Dev server can leak protected source files

- **Fix:** Upgrade vite to ≥8.2.1 (BREAKING: major version bump, test compatibility)

---

### DEP-010: js-yaml DoS (MODERATE-HIGH)
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Package:** js-yaml@≤3.15.0 (transitive via handlebars/babel tooling)
- **Workspace:** Backend
- **CVE IDs:**
  - GHSA-52cp-r559-cp3m: Quadratic merge-key chains (CVSS 7.5)
  - GHSA-h67p-54hq-rp68: Quadratic merge key handling (CVSS 5.3)
  - GHSA-5p4m-2wfm-xmqj: Quadratic omap resolution (CVSS 7.5)
- **Detail:**
  - YAML with repeated merge keys causes CPU spikes
  - `omap` resolution quadratic in entry count
  - Can exhaust CPU if parsing untrusted YAML config

- **Fix:** Upgrade js-yaml to ≥3.15.1 (transitive via babel/jest)

---

### DEP-011: qs DoS (MODERATE)
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Package:** qs@6.11.1-6.15.1 (transitive via express@4.21.0)
- **Workspace:** Backend, Orchestrator
- **CVE ID:** GHSA-q8mj-m7cp-5q26
- **CVSS Score:** 5.3 (MODERATE)
- **Detail:**
  - `qs.stringify()` crashes with TypeError when encoding comma-format arrays with null/undefined with `encodeValuesOnly` set
  - Causes unhandled exception, potential crash
  - **Impact:** Request parsing failure if query string malformed

- **Fix:** Upgrade express to latest, or downgrade qs to ≤6.11.0

---

### DEP-012: body-parser DoS (MODERATE)
- **Severity:** P3
- **Category:** CVE / Denial of Service
- **Package:** body-parser@≤1.20.5 (transitive via express)
- **Workspace:** Backend, Orchestrator
- **CVE ID:** GHSA-v422-hmwv-36x6
- **CVSS Score:** 3.7 (LOW)
- **Detail:**
  - Invalid `limit` value silently disables size enforcement
  - Large request bodies can be accepted without limit
  - **Impact:** Resource exhaustion if malformed limit is passed

- **Fix:** Upgrade body-parser via express, or manually to ≥1.20.6

---

### DEP-013: @babel/core Source Map File Read (LOW)
- **Severity:** P3
- **Category:** CVE / Information Disclosure
- **Package:** @babel/core@≤7.29.0 (transitive via babel tooling)
- **Workspace:** Backend, Frontend
- **CVE ID:** GHSA-4x5r-pxfx-6jf8
- **CVSS Score:** 3.2 (LOW)
- **Detail:**
  - Comments with `sourceMappingURL` can point to arbitrary files
  - Babel reads and processes those files during transpilation
  - **Impact:** Source map disclosure on dev build systems

- **Fix:** Upgrade @babel/core to ≥7.29.1 (usually transitive)

---

### DEP-014: gRPC Server Crash (HIGH)
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Package:** @grpc/grpc-js@1.14.0-1.14.3 (transitive via protobufjs/orchestrator)
- **Workspace:** Orchestrator
- **CVE IDs:**
  - GHSA-5375-pq7m-f5r2: Malformed request crashes server (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq: Malformed compressed message crashes (CVSS 7.5)
- **Detail:**
  - Malformed requests/compressed messages cause unhandled exception
  - gRPC server crashes on crafted input
  - **Impact:** Orchestrator unavailability if receives malformed gRPC

- **Fix:** Upgrade @grpc/grpc-js to ≥1.14.4

---

### DEP-015: esbuild CORS Bypass (MODERATE)
- **Severity:** P2
- **Category:** CVE / Security Control Bypass
- **Package:** esbuild@≤0.24.2 (transitive via vite)
- **Workspace:** Frontend
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **CVSS Score:** 5.3 (MODERATE)
- **Detail:**
  - Dev server allows arbitrary websites to send requests and read responses
  - CORS not properly enforced
  - **Impact:** XSS via dev server during development

- **Fix:** Upgrade vite to ≥8.2.1 (includes esbuild fix)

---

## Outdated Major Versions (P3 Findings)

### Backend
| Package | Current | Latest | Versions Behind | Status |
|---------|---------|--------|-----------------|--------|
| pino | 8.17.0 | 10.3.1 | 2+ | ⚠️ OLD |
| uuid | 9.0.0 | 14.0.1 | 2+ | ⚠️ OLD + CVE |
| express | 4.18.2 | 5.2.1 | 1+ | ⚠️ OLD |
| prom-client | 15.1.0 | 15.1.3 | Current | ✓ PASS |

**Recommendation:** pino & uuid should be upgraded for security + bug fixes

---

### Frontend
| Package | Current | Latest | Versions Behind | Status |
|---------|---------|--------|-----------------|--------|
| react | 18.3.1 | 19.2.8 | 1+ | ⚠️ OLD |
| react-dom | 18.3.1 | 19.2.8 | 1+ | ⚠️ OLD |
| react-router-dom | 6.26.0 | 7.18.2 | 1+ | ⚠️ OLD + CVE |

**Recommendation:** React 19 major bump requires testing; Router upgrade critical for security

---

### Orchestrator
| Package | Current | Latest | Versions Behind | Status |
|---------|---------|--------|-----------------|--------|
| dockerode | 4.0.4 | 5.0.1 | 1+ | ⚠️ OLD |
| express | 4.21.0 | 5.2.1 | 1+ | ⚠️ OLD |
| multer | 1.4.5-lts.1 | 1.4.5-lts.1 | Current | ✓ PASS |

**Recommendation:** Dockerode should be upgraded (fixes uuid transitive CVE)

---

## Transitive Dependency Issues

### Duplicate Versions
- **uuid**: TWO versions in dependency tree (9.0.0 in Backend, <11.1.1 in Orchestrator via dockerode)
  - **Risk:** Inconsistent UUID generation across services, duplicated CVE surface
  - **Fix:** Upgrade both to same version (≥14.0.0)

- **vite/esbuild**: Multiple transitive versions via vitest
  - **Risk:** Webpack-like dependency bloat, unpredictable bundling

---

## Supply Chain Risks

### High-Risk Transitive Dependencies
1. **handlebars@4.7.8** — Not directly used by application code, but pulled in by babel/generator for transpilation. **Very hard to remove.**
2. **protobufjs@7.5.5** — Used by orchestrator's gRPC integration. **Core infrastructure.**
3. **vitest@2.0.5** — Dev-only, but arbitrary file read vulnerability makes dev environment a target.

### Postinstall Scripts
**None detected** — good. No supply-chain execution risk.

### Deprecated/Abandoned Packages
- **No deprecated packages found** in direct dependencies
- **Transitive watch list**: handlebars, js-yaml (low maintenance activity)

---

## Dependency Tree Size

| Workspace | Direct | Transitive | Total | Risk Level |
|-----------|--------|-----------|-------|-----------|
| Backend | 4 | 98 | 102 | ⚠️ High (411 including devDeps) |
| Frontend | 3 | 6 | 9 | ⚠️ Very High (230 including devDeps) |
| E2E | 1 | 3 | 4 | ✓ Low |
| Orchestrator | 3 | 150 | 153 | ⚠️ Very High (gRPC adds 100+ deps) |

**Supply chain surface:** 30+ direct dependencies, 300+ transitive. Gotta know what's in there.

---

## Remediation Plan

### IMMEDIATE (Next Sprint)
1. **DEP-004 (uuid)**: Upgrade to v14.0.1
   - Affects: Backend, Orchestrator
   - Risk: Memory corruption in work item ID generation
   - Effort: LOW (semver-major bump, no API changes)

2. **DEP-002 (vitest)**: Upgrade to ≥3.2.6
   - Affects: Frontend dev environment
   - Risk: Source code + .env disclosure via UI server
   - Effort: MEDIUM (major version bump, test suite changes)
   - Mitigation: Disable UI server in dev (`--no-ui` flag)

3. **DEP-003 (protobufjs via dockerode)**: Upgrade dockerode to ≥5.0.1
   - Affects: Orchestrator infrastructure
   - Risk: RCE via malformed protobuf descriptors
   - Effort: MEDIUM (major version bump, Docker API compatibility test)

### HIGH PRIORITY (This Sprint)
4. **DEP-001 (handlebars)**: Upgrade babel ecosystem
   - Affects: Backend build toolchain (transpilation only, not runtime)
   - Risk: Template injection if babel output is evaluated
   - Effort: MEDIUM (check babel compatibility)
   - Status: Transitive, hard to remove

5. **DEP-005 (brace-expansion)**: Run `npm audit fix` on Backend
   - Affects: Backend dev (Jest glob patterns)
   - Risk: Crash on malformed test file paths
   - Effort: LOW (transitive fix)

6. **DEP-008 (postcss)**: Upgrade vite to ≥8.2.1
   - Affects: Frontend build
   - Risk: Source map + .env disclosure
   - Effort: MEDIUM (major version bump)

### MEDIUM PRIORITY (Next 2 Sprints)
7. **DEP-007 (react-router)**: Upgrade to ≥7.18.0
   - Affects: Frontend routing
   - Risk: Open redirect → XSS/session hijacking
   - Effort: MEDIUM (API changes in Router v7)

8. **DEP-012 (express)**: Upgrade to v5.x
   - Affects: Backend + Orchestrator
   - Risk: qs DoS in query string parsing
   - Effort: HIGH (breaking API changes: `app.set()`, error handling)

---

## Testing & Verification

Before deploying fixes:
1. **Backend**: Run `npm test` with upgraded uuid — verify no segfaults in ID generation
2. **Frontend**: Run `vitest run --no-ui`, verify test output
3. **Orchestrator**: Test Docker connection, verify gRPC message handling
4. **E2E**: Full smoke test with upgraded dependencies

---

## Compliance Notes

- **No GPL/AGPL licenses** detected in direct dependencies ✓
- **All packages MIT/Apache2/BSD** ✓
- **No UNLICENSED packages** ✓
- **License compliance:** PASS

---

## Cross-References

- **[ESCALATE → TheGuardians]** — DEP-001 (handlebars), DEP-003 (protobufjs) if untrusted input accepted
- **[ESCALATE → TheFixer]** — All moderate/low CVEs for backlog prioritization
- **[ESCALATE → ThePerformanceProfiler]** — js-yaml quadratic parsing could cause CPU spikes

---

## Learning Record

**Updated** `Teams/TheInspector/learnings/dependency-auditor.md` with:
- Watch list: handlebars (transpilation), protobufjs (gRPC), vitest (dev security)
- Audit tools available: `npm audit --json`, `npm outdated --json`, `license-checker`
- Known patterns: express → qs dependency chain, vite → esbuild → postcss chain
- Prior audit note: Backend/Frontend/Orchestrator have high transitive dep counts
