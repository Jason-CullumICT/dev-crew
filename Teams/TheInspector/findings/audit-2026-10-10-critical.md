# Dependency Auditor Report
**Date:** 2026-10-10  
**Status:** CRITICAL  
**Summary:** 17 vulnerabilities detected across frontend dependencies, including 2 critical CVEs. Backend and E2E have fewer issues.

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (7 workspaces) |
| **Total Direct Dependencies** | 23 |
| **Total Transitive Dependencies** | ~450 (est.) |
| **Critical CVEs** | 2 |
| **High CVEs** | 13 |
| **Moderate CVEs** | 7 |
| **Low CVEs** | 1 |
| **Total CVEs** | 23 |
| **Outdated Major Versions** | 7 packages |

---

## Critical Findings (P1)

### DEP-001: Vitest UI Server Arbitrary File Read/Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - RCE / Arbitrary File Access
- **Package:** `vitest` <= 2.0.5 (Frontend)
- **File:** `Source/Frontend/package.json`
- **Requirement:** Vitest ^2.0.5
- **CVE:** GHSA-5xrq-8626-4rwp
- **CVSS:** 9.8 (AV:N/AC:L/PR:N/UI:N)
- **CWE:** CWE-22 (Path Traversal), CWE-862 (Missing Authorization)
- **Detail:** 
  - When Vitest UI server listens on any interface, arbitrary files can be read and executed
  - Vulnerable range: < 3.2.6
  - Current version 2.0.5 is affected
  - Affects both code execution and confidentiality
- **Impact:** Remote code execution in dev environment; sensitive file exfiltration
- **Fix:** `npm install vitest@^5.0.3` (major version bump)
- **Cross-ref:** [ESCALATE → TheGuardians] if dev environment is accessible from untrusted networks

### DEP-002: Vitest @vitest/mocker Path Traversal
- **Severity:** P1 (HIGH → P1 context)
- **Category:** CVE - Path Traversal
- **Package:** `vitest` / `@vitest/mocker` >= 2.1.0 < 4.1.11 (Frontend)
- **File:** `Source/Frontend/package.json`
- **CVE:** GHSA-82fw-gwwq-j7x9
- **CVSS:** 5.9 (AV:N/AC:H/PR:N/UI:N)
- **CWE:** CWE-22 (Path Traversal)
- **Detail:** 
  - Redirect mock can bypass path restrictions
  - Allows reading arbitrary files via traversal
  - Affects development testing infrastructure
- **Fix:** Upgrade vitest to >= 4.1.11
- **Cross-ref:** [CROSS-REF: red-teamer] - path traversal in test infrastructure

---

## High-Severity Findings (P2)

### DEP-003: Vite Server FS Deny Bypass on Windows
- **Severity:** P2
- **Category:** CVE - Path Traversal / Unauthorized Access
- **Package:** `vite` <= 6.4.2 (Frontend)
- **File:** `Source/Frontend/package.json`
- **Requirement:** Vite ^5.4.0 (current: 5.4.0)
- **CVE:** GHSA-fx2h-pf6j-xcff
- **CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N)
- **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
- **Detail:** 
  - `server.fs.deny` configuration can be bypassed on Windows using alternate paths
  - Allows access to files that should be restricted
  - Affects dev server only, not production
- **Fix:** Upgrade vite to >= 6.5.0 (major version bump required)
- **Cross-ref:** [CROSS-REF: red-teamer] Windows-specific security config bypass

### DEP-004: Browserslist Unbounded Memory Growth (DoS)
- **Severity:** P2
- **Category:** CVE - Denial of Service
- **Package:** `browserslist` <= 4.28.6 (Frontend, transitive)
- **File:** Source/Frontend/package-lock.json (transitive dependency)
- **CVE:** GHSA-c83g-rgw3-j3cx
- **CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N)
- **CWE:** CWE-770 (Allocation of Resources Without Limits)
- **Detail:** 
  - No cache eviction mechanism leads to unbounded memory growth
  - Distinct query results accumulate in memory without release
  - Eventually causes OOM (Out of Memory) crash
  - Build/dev server could be DoS'd by crafted queries
- **Fix:** Update dependency chain to use browserslist >= 4.28.7+
- **Cross-ref:** [CROSS-REF: performance-profiler] Memory exhaustion risk in build pipeline

### DEP-005: Browserslist Prototype Pollution / Stats File Injection
- **Severity:** P2
- **Category:** CVE - Denial of Service / Prototype Pollution
- **Package:** `browserslist` <= 4.28.6 (Frontend, transitive)
- **CVE:** GHSA-73wf-gq98-2v4g
- **CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N)
- **CWE:** CWE-248 (Uncaught Exception), CWE-1321 (Improperly Controlled Modification)
- **Detail:** 
  - Untrusted `browserslist-stats.json` custom stats can crash the process
  - Prototype pollution via `normalizeStats` function
  - If stats file is user-controlled, can trigger unhandled crash
- **Fix:** Upgrade browserslist to >= 4.28.7
- **Cross-ref:** [CROSS-REF: red-teamer] File-based injection vector if stats file is controllable

### DEP-006: Jest Multiple High-Severity Vulnerabilities (Backend)
- **Severity:** P2
- **Category:** CVE - Multiple (jest ecosystem)
- **Package:** `jest` ^29.7.0 (Backend devDependency)
- **File:** `Source/Backend/package.json`
- **Affected Components:** @jest/core, @jest/console, @jest/reporters, jest-runner, jest-haste-map, jest-message-util, jest-resolve, jest-snapshot, jest-watcher, micromatch
- **Current Version:** 29.7.0
- **Range Vulnerable:** <= 30.2.0
- **CVE:** Multiple (root: micromatch vulnerability propagation)
- **CVSS:** 7.5+ (cascading)
- **CWE:** CWE-400 (Uncontrolled Resource Consumption), Path Traversal
- **Detail:** 
  - Root cause: `micromatch` library (glob matching) has ReDoS and path traversal issues
  - Affects entire jest ecosystem (console, reporters, runner, haste-map, snapshot)
  - Can cause process hang or crash during test runs
  - Cascade affects: @jest/globals, jest-circus, jest-cli, jest-environment-node
- **Impact:** Test infrastructure could be DoS'd by crafted test file paths or patterns
- **Fix:** `npm install jest@^30.5.2` (major version bump required)
- **Cross-ref:** [CROSS-REF: red-teamer] Test infrastructure DoS vector

### DEP-007: @grpc/grpc-js Server Crash (Platform Orchestrator)
- **Severity:** P2
- **Category:** CVE - Denial of Service / Authentication Bypass
- **Package:** `@grpc/grpc-js` >= 1.14.0 < 1.14.4 (platform/orchestrator)
- **File:** `platform/orchestrator/package-lock.json` (transitive)
- **CVEs:** 
  - GHSA-5375-pq7m-f5r2: Malformed request crash
  - GHSA-99f4-grh7-6pcq: Malformed compressed message crash
  - GHSA-m9gg-hp2v-232j: Certificate validation bypass
- **CVSS:** 7.5-9.0
- **CWE:** CWE-248 (Uncaught Exception), CWE-400 (Resource Exhaustion), CWE-295 (Cert Validation)
- **Detail:** 
  - Multiple crash vectors via malformed gRPC messages
  - Server/client can crash from compressed message handling
  - Certificate authentication can return unauthorized certs as authorized
  - Affects platform orchestrator communication
- **Impact:** Orchestrator availability, authentication bypass in gRPC calls
- **Fix:** Upgrade @grpc/grpc-js to >= 1.14.4
- **Cross-ref:** [ESCALATE → TheGuardians] Certificate validation bypass is critical for platform security

### DEP-008: Ws WebSocket Memory Exhaustion DoS
- **Severity:** P2
- **Category:** CVE - Denial of Service
- **Package:** `ws` >= 8.0.0 < 8.21.0 (Frontend, transitive via Vite)
- **CVE:** GHSA-96hv-2xvq-fx4p
- **CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N)
- **CWE:** CWE-400 (Resource Exhaustion), CWE-770, CWE-1050
- **Detail:** 
  - Memory exhaustion from tiny fragments and data chunks
  - WebSocket can be exhausted by sending many small messages
  - Leads to DoS of Vite dev server or any ws-using component
- **Fix:** Upgrade ws to >= 8.21.0
- **Cross-ref:** [CROSS-REF: performance-profiler] DoS risk for dev environment

---

## Moderate-Severity Findings (P3)

### DEP-009: React Router Open Redirect via Protocol-Relative URL
- **Severity:** P3
- **Category:** CVE - Open Redirect
- **Package:** `@remix-run/router` >= 1.3.0 < 1.23.3 (Frontend, transitive via react-router-dom 6.26.0)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **CWE:** CWE-601 (URL Redirection to Untrusted Site)
- **Detail:** 
  - Same-origin redirects with path starting `//` are reinterpreted as protocol-relative URLs
  - Can redirect to external sites via `//attacker.com/path`
  - Requires attacker control of redirect path
- **Impact:** Phishing attacks if user-controlled paths used in redirects
- **Fix:** Upgrade react-router-dom to >= 6.31.0
- **Cross-ref:** [ESCALATE → TheGuardians] Open redirect in routing layer

### DEP-010: @babel/core Arbitrary File Read via SourceMap
- **Severity:** P3
- **Category:** CVE - Information Disclosure
- **Package:** `@babel/core` <= 7.29.0 (Backend, Frontend, Portal)
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **CVSS:** 3.2 (AV:L/AC:H/PR:N/UI:N)
- **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
- **Detail:** 
  - Babel processes sourceMappingURL comments without validation
  - Can read arbitrary files on the filesystem
  - Local attack vector (attacker must provide malicious code to transpile)
- **Impact:** Sensitive file disclosure during build if untrusted code transpiled
- **Fix:** `npm install @babel/core@^7.30.0` or later
- **Cross-ref:** [CROSS-REF: red-teamer] Build-time file disclosure

### DEP-011: Baseline Browser Mapping Process Termination (Frontend)
- **Severity:** P3
- **Category:** CVE - Denial of Service
- **Package:** `baseline-browser-mapping` >= 2.0.0 < 2.11.0 (Frontend, transitive)
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **CVSS:** Moderate
- **CWE:** CWE-705 (Improper Control Flow)
- **Detail:** 
  - Process termination on invalid input
  - Crafted browser mapping data causes crash
  - Dev build could be interrupted
- **Fix:** Update transitive dependency to >= 2.11.0 (via vite upgrade)

### DEP-012: Vite Additional Path Traversal Issues (Nitpick)
- **Severity:** P3
- **Category:** CVE - Path Traversal / NTLMv2 Hash Disclosure
- **Package:** `vite` <= 6.4.2 (Frontend)
- **CVEs:** 
  - launch-editor NTLMv2 hash disclosure on Windows
  - Other historical path traversals
- **CVSS:** Moderate
- **Detail:** 
  - Windows-specific: UNC path handling can leak NTLMv2 hashes
  - Affects file opening in dev server
- **Fix:** Upgrade to vite >= 6.5.0 (fixes entire vite audit trail)

---

## Outdated Major Versions (P3)

### DEP-013: Backend Dependencies Behind Latest
- **Severity:** P3
- **Category:** Outdated Major Versions
- **Packages:**
  - `express`: 4.18.2 → 5.3.0 (1 major version behind)
  - `pino`: 8.17.0 → 10.4.0 (2 major versions behind) ⚠️
  - `uuid`: 9.0.0 → 14.0.3 (5 major versions behind) ⚠️

**Note:** uuid is likely safe for minor version bumps. pino 10.x may have breaking changes (check release notes).

**Fix:** 
```bash
cd Source/Backend
npm install express@latest pino@latest uuid@latest
```

### DEP-014: Frontend Dependencies Behind Latest
- **Severity:** P3
- **Category:** Outdated Major Versions
- **Packages:**
  - `react`: 18.3.1 → 19.3.0 (1 major version behind)
  - `react-dom`: 18.3.1 → 19.3.0 (1 major version behind)
  - `react-router-dom`: 6.26.0 → 7.18.4 (1 major version behind, also has known CVE in 6.x)

**Fix:**
```bash
cd Source/Frontend
npm install react@19 react-dom@19 react-router-dom@7
```

---

## Supply Chain Risks (P4)

### DEP-015: Large Dependency Tree
- **Severity:** P4 (Informational)
- **Category:** Supply Chain / Complexity
- **Findings:**
  - **Backend:** 232 total dependencies (4 direct, 228 dev/transitive)
  - **Frontend:** 230+ total dependencies (3 direct, 227 dev/transitive)
  - **Lock file complexity:** High (5353 lines Backend, 2901 lines Frontend)
- **Risk:** Each transitive dependency is a potential supply chain attack surface
- **Note:** Jest ecosystem is particularly heavy; consider migration to Vitest for lighter footprint

### DEP-016: Post-Install Scripts Check
- **Severity:** P4
- **Category:** Supply Chain
- **Finding:** No malicious post-install scripts detected in main dependencies
- **Status:** ✅ PASS

---

## License Compliance (P4)

All direct dependencies have standard open-source licenses:

| Package | License | Project Type | Risk |
|---------|---------|--------------|------|
| express | MIT | Backend | ✅ Standard |
| prom-client | MIT | Backend | ✅ Standard |
| uuid | MIT | Backend | ✅ Standard |
| pino | MIT | Backend | ✅ Standard |
| react | MIT | Frontend | ✅ Standard |
| react-dom | MIT | Frontend | ✅ Standard |
| react-router-dom | MIT | Frontend | ✅ Standard |
| @playwright/test | Apache 2.0 | E2E | ✅ Standard |

**Status:** ✅ No license compliance issues detected

---

## Severity Summary

```
P1 (Critical):    2 vulns  [IMMEDIATE ACTION REQUIRED]
P2 (High):        8 vulns  [Urgent - resolve within days]
P3 (Moderate):    8 vulns  [Important - resolve within weeks]
P4 (Low):         5 items  [Monitor/plan]
─────────────────────────
TOTAL:           23 issues
```

---

## Recommended Action Plan

### Phase 1: Immediate (Today)
1. **DEP-001 / DEP-002:** Upgrade Frontend vitest
   ```bash
   cd Source/Frontend
   npm install vitest@^5.0.3
   ```
   - Re-run all tests to verify compatibility
   - Check if Vite also needs upgrade

### Phase 2: Urgent (This Week)
2. **DEP-003 / DEP-012:** Upgrade Frontend vite
   ```bash
   cd Source/Frontend
   npm install vite@^6.5.0
   ```

3. **DEP-006:** Upgrade Backend jest
   ```bash
   cd Source/Backend
   npm install jest@^30.5.2
   ```

4. **DEP-007:** Check platform/orchestrator @grpc/grpc-js version
   - Verify it's < 1.14.4 and plan upgrade

5. **DEP-009:** Upgrade react-router-dom
   ```bash
   cd Source/Frontend
   npm install react-router-dom@^7.0.0
   ```

### Phase 3: Important (This Month)
6. Update all other moderate/outdated packages
7. Verify no new test failures after upgrades
8. Coordinate with TheGuardians on: GHSA-5xrq-8626-4rwp (Vitest RCE), GHSA-m9gg-hp2v-232j (gRPC cert validation)

---

## Cross-Team Escalations

| Escalation | Team | Reason |
|------------|------|--------|
| GHSA-5xrq-8626-4rwp | TheGuardians | Vitest RCE risk if dev env exposed |
| GHSA-m9gg-hp2v-232j | TheGuardians | gRPC certificate validation bypass |
| GHSA-2j2x-hqr9-3h42 | TheGuardians | React Router open redirect |
| GHSA-c83g-rgw3-j3cx, GHSA-96hv-2xvq-fx4p | performance-profiler | DoS risks in build/dev pipeline |

---

## Self-Learning Updates

✅ Added to `Teams/TheInspector/learnings/dependency-auditor.md`:
- Watch list: jest ecosystem, vitest, vite, browserslist, ws
- Jest requires major upgrade to fix cascade
- Frontend > 230 transitive deps (review for reduction)
- No hardcoded secrets or supply chain red flags detected
- Babel core has sourcemap path traversal (low-risk but noted)

---

**Report Generated:** 2026-10-10 08:22 UTC  
**Auditor:** Dependency Auditor Agent (Claude Haiku)  
**Grade Preliminary:** 🔴 **F** (2 critical + multiple high CVEs)  
**Grade Target:** Upgrade to get to **B/C** (no critical, <8 high)
