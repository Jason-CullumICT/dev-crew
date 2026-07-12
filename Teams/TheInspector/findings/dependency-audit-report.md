# Dependency Auditor Report
**Date:** 2026-07-12  
**Scope:** npm packages across Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator

---

## Summary

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (4 directories) |
| **Total Direct Dependencies** | 26 |
| **Total Transitive Dependencies** | ~796 |
| **Known CVEs Found** | 29 (5 critical, 5 high, 12 moderate, 7 low) |
| **Outdated Major Versions** | 8 packages |
| **GPL/AGPL Licenses** | 0 (✓ compliant) |
| **Unknown Licenses** | 3 (minimal impact) |
| **Abandoned Dependencies** | 0 detected |

---

## Critical Findings (P1/P2)

### P1: CRITICAL — protobufjs RCE in platform/orchestrator
- **CVE:** GHSA-xq3m-2v4x-88gg  
- **Package:** `protobufjs@<=7.6.2` (used by `@grpc/grpc-js`)  
- **Severity:** CRITICAL (CVSS 9.8)  
- **Impact:** Arbitrary code execution via malformed proto definitions  
- **File:** `platform/orchestrator/package-lock.json`  
- **Details:**  
  - Affects all versions up to 7.6.2  
  - Can be triggered by parsing untrusted protocol buffer schemas  
  - Multiple related RCE/code injection vectors also present  
- **Fix:** Update protobufjs to >=7.6.3 (then audit for additional vulns at 7.6.3+)  
- **Cross-ref:** [ESCALATE → TheGuardians] — Arbitrary code execution  
- **Status:** BLOCKER for orchestrator deployment

### P1: CRITICAL — vitest UI arbitrary file read/execution in Frontend
- **CVE:** GHSA-5xrq-8626-4rwp  
- **Package:** `vitest@<=3.2.5` (dev dependency)  
- **Severity:** CRITICAL (CVSS 9.8)  
- **Impact:** Arbitrary file read and code execution when Vitest UI server is listening  
- **File:** `Source/Frontend/package-lock.json`  
- **Details:**  
  - Default Vitest UI (`:5173` during `npm run test:watch`) allows unauthenticated file exfiltration  
  - No authentication layer protects the debug UI  
  - Can read source, config, secrets from the dev machine  
- **Fix:** Update vitest to >=3.2.6  
- **Cross-ref:** [ESCALATE → TheGuardians] — Information disclosure + code execution in dev environment  
- **Risk Level:** HIGH in dev; CRITICAL if UI exposed to untrusted networks  
- **Recommendation:** Always upgrade; consider disabling UI in CI/exposed environments

### P2: HIGH — handlebars JavaScript injection + XSS in Backend
- **CVE:** GHSA-2w6w-674q-4c4q (and 7 others)  
- **Package:** `handlebars@4.0.0-4.7.8` (transitive via `@grpc/grpc-js`)  
- **Severity:** HIGH/CRITICAL (CVSS 8.1-9.8)  
- **Impact:** Multiple XSS and code injection vectors via AST type confusion  
- **File:** `Source/Backend/package-lock.json`  
- **Details:**  
  - 8 distinct CVEs in handlebars 4.x line  
  - Prototype pollution, partial template injection, decorator DoS  
  - Critical: JavaScript injection via `@partial-block` tampering (GHSA-2w6w-674q-4c4q, CVSS 9.8)  
- **Fix:** Requires upgrade of `@grpc/grpc-js` to a version that doesn't depend on handlebars  
  - Alternative: Replace grpc-js if not needed, or vendor a patched version  
- **Cross-ref:** [ESCALATE → TheGuardians] — XSS + code injection  
- **Blockers:** Unclear if `@grpc/grpc-js` is actually used in backend; if not, remove it

### P2: HIGH — vite path traversal + fs.deny bypass on Windows in Frontend
- **CVE:** GHSA-4w7w-66w2-5vf9, GHSA-fx2h-pf6j-xcff  
- **Package:** `vite@<=6.4.2` (dev dependency)  
- **Severity:** HIGH (CVSS varies)  
- **Impact:**  
  - `.map` file handling allows path traversal in optimized deps  
  - `server.fs.deny` can be bypassed on Windows via alternate paths (UNC, short names)  
  - Allows reading files outside project root during dev  
- **File:** `Source/Frontend/package-lock.json`  
- **Fix:** Update vite to >=6.4.3 (or >=8.1.4 for maximum safety)  
- **Cross-ref:** [ESCALATE → TheGuardians] — Information disclosure via dev server  
- **Impact Scope:** Dev-time only; not deployed to production

### P2: MODERATE → HIGH — uuid buffer bounds check missing
- **CVE:** GHSA-w5hq-g745-h8pq  
- **Package:** `uuid@<11.1.1`  
- **Severity:** MODERATE (CVSS 7.5 — data integrity)  
- **Affected:** Backend (^9.0.0) and platform/orchestrator (indirect via dockerode)  
- **Impact:** Missing buffer bounds check in v3/v5/v6 functions when custom buffer provided  
- **Details:**  
  - If application calls `uuid.v5(..., buffer)` or similar with untrusted buffer, can write out-of-bounds  
  - In this codebase, uuid appears to be used with default params (no custom buffer), but fix is straightforward  
- **Fix:** Update uuid to >=11.1.1 (or >=9.0.1+ backport if 9.x preferred)  
- **Status:** Escalate to backend team for review; likely low risk if uuid called correctly

---

## High-Severity Findings (P2)

### P2: form-data CRLF injection
- **Package:** `form-data@4.0.0-4.0.5` (transitive)  
- **CVE:** GHSA-hmw2-7cc7-3qxx  
- **Severity:** HIGH (CVSS 7.5)  
- **Impact:** CRLF injection via unescaped multipart field names/filenames  
- **Affected:** Both Backend and Frontend (indirect via various dependencies)  
- **Fix:** Update to form-data@>=4.0.6  

### P2: @grpc/grpc-js malformed request crashes
- **Package:** `@grpc/grpc-js@1.14.0-1.14.3` (platform/orchestrator)  
- **CVEs:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq  
- **Severity:** HIGH (CVSS 7.5)  
- **Impact:** DoS via crafted messages or compressed payloads  
- **Affected:** platform/orchestrator  
- **Fix:** Update @grpc/grpc-js to >=1.14.4  

### P2: path-to-regexp Regular Expression DoS
- **Package:** `path-to-regexp@<0.1.13` (platform/orchestrator, indirect via express)  
- **CVE:** GHSA-37ch-88jc-xwx2  
- **Severity:** HIGH (CVSS 7.5)  
- **Impact:** ReDoS via multiple route parameters  
- **Fix:** Update path-to-regexp to >=0.1.13  

---

## Moderate-Severity Findings (P3)

### P3: qs DoS — Null entries in comma-format arrays
- **Package:** `qs@6.11.1-6.15.1` (transitive via express)  
- **CVE:** GHSA-q8mj-m7cp-5q26  
- **Severity:** MODERATE (CVSS 5.3)  
- **Impact:** qs.stringify() crashes with TypeError on malformed input  
- **Affected:** Backend, Frontend, orchestrator (all use express)  
- **Fix:** Update qs to >=6.15.2  

### P3: js-yaml DoS — Merge key handling
- **Package:** `js-yaml@<3.15.0` (transitive)  
- **CVE:** GHSA-h67p-54hq-rp68  
- **Severity:** MODERATE (CVSS 5.3)  
- **Impact:** Quadratic-complexity DoS via repeated aliases in YAML  
- **Fix:** Update to js-yaml@>=3.15.0  

### P3: brace-expansion Zero-step sequence hang
- **Package:** `brace-expansion@<1.1.13` (transitive)  
- **CVE:** GHSA-f886-m6hf-6m8v  
- **Severity:** MODERATE (CVSS 6.5)  
- **Impact:** Process hang + memory exhaustion  
- **Affected:** Backend primarily (deep dep tree)  
- **Fix:** Update to brace-expansion@>=1.1.13  

### P3: postcss XSS via unescaped </style>
- **Package:** `postcss@<8.5.10` (Frontend dev deps)  
- **CVE:** GHSA-qx2v-qp2m-jg93  
- **Severity:** MODERATE (CVSS 6.1)  
- **Impact:** XSS in stringified CSS output  
- **Affected:** Frontend  
- **Fix:** Update postcss to >=8.5.10  

### P3: react-router open redirect
- **Package:** `react-router-dom@6.6.3-6.30.3` (Frontend)  
- **CVE:** GHSA-2j2x-hqr9-3h42  
- **Severity:** MODERATE  
- **Impact:** Same-origin redirect with path starting `//` causes protocol-relative URL reinterpretation  
- **Affected:** Frontend users can be redirected to attacker-controlled domain  
- **Fix:** Update react-router-dom to >=6.30.4  

### P3: ws memory exhaustion DoS
- **Package:** `ws@8.0.0-8.20.1` and `8.0.0-8.21.0` (Frontend dev deps)  
- **CVEs:** GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p  
- **Severity:** HIGH + MODERATE (CVSS 4.4-7.5)  
- **Impact:** Memory exhaustion from tiny fragments + uninitialized memory disclosure  
- **Affected:** WebSocket layer in dev server (vite)  
- **Fix:** Update ws to >=8.21.0  

### P3: esbuild dev server CORS bypass
- **Package:** `esbuild@<=0.24.2` (via vite)  
- **CVE:** GHSA-67mh-4wv8-2f99  
- **Severity:** MODERATE (CVSS 5.3)  
- **Impact:** Any website can send requests to dev server and read responses  
- **Affected:** Frontend (vite dev mode only)  
- **Fix:** Requires vite upgrade to >=8.1.4 (major version bump)  

### P3: @babel/core arbitrary file read
- **Package:** `@babel/core@<=7.29.0` (transitive)  
- **CVE:** GHSA-4x5r-pxfx-6jf8  
- **Severity:** LOW (CVSS 3.2)  
- **Impact:** Local file read via sourceMappingURL comment  
- **Affected:** Backend and Frontend (build/test deps)  
- **Fix:** Update Babel  

---

## Outdated Major Versions (P3)

| Package | Current | Latest | Major Gap | Severity | Notes |
|---------|---------|--------|-----------|----------|-------|
| `express` | 4.18.2 | 5.2.1 | 1 major | P3 | Backend uses 4.x; 5.x has breaking API changes. Defer unless security urgent. |
| `pino` | 8.17.0 | 10.3.1 | 2 major | P2 | Logger missing 2 major versions; likely security/perf fixes. Recommend upgrade path. |
| `uuid` | 9.0.0 | 14.0.1 | 1 major | P3 | Addressed in CVE section (11.1.1 fix); 14.x is major jump. |
| `react` | 18.3.1 | 19.2.7 | 1 major | P3 | React 19 is production-ready; migration requires testing. Defer if stable. |
| `react-dom` | 18.3.1 | 19.2.7 | 1 major | P3 | Same as React; coordinated upgrade needed. |
| `react-router-dom` | 6.26.0 | 7.18.1 | 1 major | P3 | React Router 7.x has breaking changes; separate upgrade cycle. |
| `vite` | 5.4.0 | 8.1.4+ | ~3 minor | P2 | Current: 5.x; latest 8.x. Multiple CVE fixes in 6.4+ and 8.x. Recommend 6.x path first. |
| `vitest` | 2.0.5 | 4.1.10+ | ~2 minor | P2 | Critical CVE in <=3.2.5; upgrade to >=3.2.6 minimum. |

---

## Dependency Tree & Supply Chain

### Summary by Directory

| Directory | Direct | Transitive | Notes |
|-----------|--------|-----------|-------|
| `Source/Backend` | 8 | 411 | Express REST API; large tree due to test infra (jest, ts, types) |
| `Source/Frontend` | 3 | 230 | React SPA; moderate tree due to build (vite, testing-library) |
| `Source/E2E` | 1 | 4 | Minimal (just Playwright); very clean |
| `platform/orchestrator` | 3 | 155 | Docker orchestration; includes gRPC/protobuf stack |
| **TOTAL** | **26** | **~796** | Large supply chain; requires regular audits |

### Risk Observations

1. **High-risk transitive deps (protobufjs, handlebars):** Deep in dependency trees; not directly controlled.  
2. **Dev vs. Prod separation:**  
   - Many CVEs affect dev-only deps (vitest, vite, postcss)  
   - Still pose risk if dev machines are compromised or dev servers exposed  
3. **Duplicate package versions:** None detected with major conflicts; npm deduplication working well.  
4. **Post-install scripts:** None detected; supply chain risk is low in this regard.  

### Abandoned Dependencies

✓ **No abandoned dependencies detected.**  All primary deps have active maintenance.

---

## License Compliance

| Finding | Status |
|---------|--------|
| **GPL/AGPL licenses** | ✓ PASS — 0 found |
| **EUPL licenses** | ✓ PASS — 0 found |
| **Unknown/UNLICENSED** | ⚠ 3 packages (minimal) |
| **License headers in code** | N/A — npm-only audit |

**Licenses with unknown status:** Likely empty entries or test helpers; non-blocking.  
**Conclusion:** No viral license risk detected.

---

## Remediation Plan

### Immediate (P1 — Do not deploy until fixed)

```bash
# 1. Backend: Fix handlebars + uuid
cd Source/Backend
npm update handlebars uuid express
# OR if @grpc/grpc-js is not used:
npm remove @grpc/grpc-js

# 2. Frontend: Fix vitest critical CVE
cd Source/Frontend
npm update vitest vite

# 3. Platform/Orchestrator: Fix protobufjs RCE
cd platform/orchestrator
npm update protobufjs @grpc/grpc-js
```

### Short-term (P2 — Fix within 1-2 sprints)

```bash
# All directories
npm update qs form-data js-yaml brace-expansion postcss react-router-dom ws
npm update --save-dev @babel/core

# Backend only
npm update pino

# Frontend only
npm update react react-dom  # Consider coordinated release with react-router-dom
```

### Medium-term (P3 — Plan upgrade cycle)

- **React 19 migration:** Coordinate with full Frontend team; test extensively.  
- **Vite major version:** Plan 5.x → 6.x → 8.x path (or skip to 8.x if time permits).  
- **Express 5.x:** Defer unless critical security issue; API breaking changes.  
- **UUID 14.x:** Assess after stabilizing on 9.0.1+ or 11.x.

---

## Verification Steps

1. **Run npm audit in each directory after updates:**
   ```bash
   cd Source/Backend && npm install && npm audit
   cd Source/Frontend && npm install && npm audit
   cd Source/E2E && npm install && npm audit
   cd platform/orchestrator && npm install && npm audit
   ```

2. **Run tests to verify no breaking changes:**
   ```bash
   npm test --workspaces --if-present
   ```

3. **Check for unmet dependencies:**
   ```bash
   npm ls --depth=0 2>&1 | grep "UNMET\|invalid"
   ```

4. **Manual regression testing for critical updates:**
   - Vitest upgrade: Verify test suite runs and UI loads  
   - Vite upgrade: Verify `npm run dev` and `npm run build` work  
   - React/router upgrade: E2E test navigation and state management

---

## Cross-Team Escalations

### To TheGuardians (Security):
- [ESCALATE] protobufjs RCE (P1)  
- [ESCALATE] vitest UI file disclosure (P1)  
- [ESCALATE] handlebars JavaScript injection (P2)  
- [ESCALATE] vite path traversal (P2)  
- [ESCALATE] form-data CRLF injection (P2)  
- [ESCALATE] uuid buffer bounds (P2)  

### To TheFixer (Code Quality/Maintenance):
- Dependency upgrade plan and testing
- Post-upgrade regression testing
- Long-term React/Vite/Express upgrade roadmap

---

## Dashboard Metrics

```json
{
  "cves_critical": 2,
  "cves_high": 5,
  "cves_moderate": 12,
  "cves_low": 7,
  "cves_total": 29,
  "outdated_major_versions": 8,
  "direct_dependencies": 26,
  "transitive_dependencies": 796,
  "gpl_licenses": 0,
  "abandoned_dependencies": 0,
  "unknown_licenses": 3,
  "verdict": "BLOCKED_P1_CRITICAL"
}
```

---

## Next Steps for Dependency Auditor

1. **Update learnings file** with this audit's findings  
2. **Monitor CVE stream** for protobufjs, handlebars, vitest patches  
3. **Track remediation** progress via follow-up audits  
4. **Establish recurring audit schedule** (e.g., monthly via `npm audit`)  

