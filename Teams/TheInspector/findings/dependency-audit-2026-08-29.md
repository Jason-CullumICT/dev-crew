# Dependency Auditor Report
**Date:** August 29, 2026  
**Analysis Type:** CVE scanning, license compliance, outdated version check

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total CVEs Found** | 99 | 🔴 CRITICAL |
| **Critical Vulnerabilities** | 5 | 🔴 REQUIRES IMMEDIATE ACTION |
| **High Severity** | 26 | 🔴 REQUIRES ATTENTION |
| **Medium Severity** | 62 | 🟡 MONITOR |
| **Low Severity** | 6 | 🟢 LOW RISK |
| **Package Managers Detected** | npm (only) | ℹ️ |
| **Total Transitive Dependencies** | 1,797 | 🔴 VERY HIGH |

**Grade: D** — Multiple critical vulnerabilities in direct and transitive dependencies across all packages.

---

## Package Manifest Analysis

### Packages Audited
1. ✅ Source/Backend (primary application)
2. ✅ Source/Frontend (primary application)
3. ✅ Source/E2E (test suite)
4. ⚠️ platform/orchestrator (infrastructure - READ-ONLY)
5. ⚠️ portal/Backend (debug portal - infrastructure)
6. ⚠️ portal/Frontend (debug portal - infrastructure)

---

## Vulnerability Summary by Package

| Package | Path | Prod Deps | Total Deps | Critical | High | Medium | Low | Total |
|---------|------|-----------|-----------|----------|------|--------|-----|-------|
| **Source/Backend** | `Source/Backend/` | 102 | 411 | **1** | 3 | 4 | 1 | **9** |
| **Source/Frontend** | `Source/Frontend/` | 9 | 230 | **1** | 5 | 6 | 1 | **13** |
| **Source/E2E** | `Source/E2E/` | 4 | 4 | 0 | 0 | 0 | 0 | **0** ✅ |
| **platform/orchestrator** | `platform/orchestrator/` | 153 | 155 | **1** | 2 | 6 | 0 | **9** |
| **portal/Backend** | `portal/Backend/` | 397 | 577 | **2** | 10 | 43 | 0 | **55** |
| **portal/Frontend** | `portal/Frontend/` | 9 | 424 | **1** | 6 | 5 | 1 | **13** |

**Total Dependencies:** 674 production, 1,797 transitive

---

## 🔴 CRITICAL VULNERABILITIES (P1)

### DEP-001: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** `handlebars` (transitive via Source/Backend)
- **Affected Versions:** `>=4.0.0 <=4.7.8`
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8)
  - GHSA-3mfm-83xf-c92r (CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1)
- **Detail:** Multiple JavaScript injection vulnerabilities in Handlebars.js template engine via AST type confusion. Attacker can execute arbitrary JavaScript code by tampering with partial blocks or dynamic partials.
- **Impact:** Remote Code Execution (RCE) - CVSS 9.8 (Network, Low Complexity, No Privileges)
- **Fix:** Upgrade handlebars to 4.7.9+
  ```bash
  cd Source/Backend && npm update handlebars
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Remote code execution risk in template rendering layer
- **Status:** ❌ Not fixed

---

### DEP-002: Vitest Critical File Read/Execution via UI Server
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** `vitest` (direct in Source/Frontend)
- **Affected Versions:** `<3.2.6`
- **CVE ID:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:** When Vitest UI server is listening (development mode), attackers can read arbitrary files from disk and execute code. No authentication required.
- **Impact:** Arbitrary file read/write + code execution in dev environment
- **Fix:** Upgrade vitest to 3.2.6+
  ```bash
  cd Source/Frontend && npm update vitest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Development-only but critical during dev work
- **Status:** ❌ Not fixed

---

### DEP-003: protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** `protobufjs` (transitive via portal/Backend OpenTelemetry)
- **Affected Versions:** `<7.5.5`
- **CVE ID:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Detail:** Arbitrary code execution in protobufjs via unsafe code generation. Multiple related CVEs including:
  - Prototype injection in message constructors
  - Code generation gadget after prototype pollution
  - Unbounded recursion DoS
  - Process-wide DoS via unsafe option paths
- **Impact:** Remote Code Execution (CVSS 9.8)
- **Fix:** Upgrade @opentelemetry packages that depend on protobufjs
  ```bash
  cd portal/Backend && npm update @opentelemetry/sdk-node
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE in observability layer
- **Status:** ❌ Not fixed
- **Note:** portal/Backend has 2 critical vulns (this + OpenTelemetry Prometheus exporter crash)

---

### DEP-004: OpenTelemetry Auto-Instrumentation Prometheus Exporter Crash
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** `@opentelemetry/auto-instrumentations-node` (direct in portal/Backend)
- **Affected Versions:** `<0.75.0` (currently ~0.40.0)
- **CVE ID:** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)
- **Detail:** Prometheus exporter process crash via malformed HTTP request. Service goes down when receiving crafted requests.
- **Impact:** Denial of Service (process crash)
- **Fix:** Upgrade to 0.79.0+
  ```bash
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — DoS in debug portal infrastructure
- **Status:** ❌ Not fixed

---

## 🔴 HIGH SEVERITY VULNERABILITIES (P2)

### Key High-Severity Findings

**Source/Backend:**
- **brace-expansion** (3 CVEs, CVSS 7.5): DoS via zero-step sequence, exponential expansion, unbounded expansion
- **form-data** (CRLF injection, CVSS 7.5): Multipart field injection in request headers
- **js-yaml** (arbitrary code execution): YAML parsing vulnerability

**Source/Frontend:**
- **form-data** (CRLF injection, CVSS 7.5)
- **nanoid** (2 CVEs, CVSS 5.9): Infinite loops with negative/zero size
- **postcss** (CVSS): CSS parsing vulnerability
- **vite** (esbuild DoS, CVSS 5.3): Development server can be exploited for CORS bypass
- **ws** (WebSocket vulnerability)

**portal/Backend (HIGHEST RISK):**
- **@grpc/grpc-js** (2 CVEs, CVSS 7.5 each): Server crash on malformed requests and compressed messages
- **@opentelemetry/** packages (5 high-severity): Baggage propagation memory exhaustion, Prometheus crash
- **form-data**, **nanoid**, **path-to-regexp** (all CVSS 7.5+)

**platform/orchestrator:**
- **protobufjs** (7 CVEs, CVSS 7.5-9.8): Code injection, prototype pollution gadgets
- **path-to-regexp** (ReDoS, CVSS 7.5): Regular expression DoS via route parameters
- **express** (moderate via qs)

---

## 📊 Vulnerability Distribution

```
Critical (P1):     5 ████
High (P2):        26 ████████████████████████
Medium (P3):      62 ████████████████████████████████████████████
Low (P4):          6 ██

Total: 99 vulnerabilities
```

**Dominance:** Medium-severity issues (63% of total) but critical ones pose RCE risks.

---

## ⚠️ SUPPLY CHAIN RISK ASSESSMENT

### Dependency Tree Size
- **Total Transitive Dependencies:** 1,797
- **Status:** 🔴 VERY HIGH (>500 threshold)
- **Risk:** Large attack surface; vulnerability in any transitive dep impacts multiple packages

### High-Risk Transitive Patterns
1. **OpenTelemetry Cascade** (portal/Backend):
   - 40+ gRPC/protobufjs sub-dependencies
   - protobufjs 7.5.5 is 2 years old with multiple known issues
   - Many packages bundle old OpenTelemetry versions

2. **Form-Data CRLF** (affects 3 packages):
   - Used by axios, supertest, test tools
   - CRLF injection (GHSA-hmw2-7cc7-3qxx) affects all versions 4.0.0-4.0.5

3. **Brace-Expansion DoS** (affects build tools):
   - Used by webpack, vitest, vite
   - 3 separate DoS CVEs in <1.1.18

---

## 📋 OUTDATED MAJOR VERSIONS

### Source/Backend
Outdated production dependencies:
- ✅ `express` ^4.18.2 → current 4.21+ (minor version, no major gap)
- ✅ `uuid` ^9.0.0 → current 9.x (no major gap)
- ✅ `pino` ^8.17.0 → current 8.x (no major gap)
- ✅ `prom-client` ^15.1.0 → current 15.x (no major gap)

**Status:** ✅ No major version gaps detected in production deps.

### Source/Frontend
- ✅ `react` ^18.3.1 → current 18.x (no major gap)
- ✅ `react-dom` ^18.3.1 → current 18.x (no major gap)
- ✅ `react-router-dom` ^6.26.0 → current 6.x (no major gap)

**Status:** ✅ No major version gaps.

### portal/Backend
- ⚠️ `@opentelemetry/*` packages behind (0.40.0 vs 0.47+)
- ⚠️ `better-sqlite3` ^12.8.0 (consider 13.x if compatible)
- ✅ Core deps (express, cors, pino) are recent

### Portal/Frontend
- ⚠️ `react` ^18.2.0 (one minor version behind 18.3+)
- ⚠️ `react-router-dom` ^6.22.0 (behind 6.26+)

**Status:** ⚠️ Portal packages have moderate version drift; upgrade when tested.

---

## 📜 LICENSE COMPLIANCE

**No license-checker tool output available.** Manual analysis of package.json files:

| Package | Direct? | License | Compliance Status |
|---------|---------|---------|-------------------|
| express | Yes | MIT | ✅ Permissive |
| react | Yes | MIT | ✅ Permissive |
| react-dom | Yes | MIT | ✅ Permissive |
| typescript | Yes | Apache-2.0 | ✅ Permissive |
| pino | Yes | MIT | ✅ Permissive |
| vitest | Yes | MIT | ✅ Permissive |
| vite | Yes | MIT | ✅ Permissive |
| @playwright/test | Yes | Apache-2.0 | ✅ Permissive |

**Status:** ✅ **All detected direct dependencies are permissive licenses (MIT, Apache-2.0).** No GPL/AGPL/copyleft virality risk.

---

## 🚨 CRITICAL ACTION ITEMS (IMMEDIATE)

### Tier 1: RCE Vulnerabilities (Fix within 24-48 hours)

1. **Source/Frontend vitest@<3.2.6**
   ```bash
   cd Source/Frontend
   npm update vitest vite vite-node
   npm test  # Verify no breakage
   ```

2. **Source/Backend handlebars**
   - Check dependency tree: `npm list handlebars`
   - Root cause: likely from lodash-template or ember dependencies in test tools
   - **Action:** `npm update` and identify source

3. **portal/Backend protobufjs + OpenTelemetry**
   ```bash
   cd portal/Backend
   npm update @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
   npm test
   ```

### Tier 2: Crash/DoS Vulnerabilities (Fix within 1 week)

- **brace-expansion** (Source/Backend) — DoS in glob parsing
- **@grpc/grpc-js** (portal/Backend) — Server crash on malformed requests
- **nanoid** (Source/Frontend, portal/Frontend) — Infinite loops
- **form-data** (all) — CRLF injection

### Tier 3: Upgrade Advisory (Fix within 2 weeks)

- Portal packages with minor version drift (react, react-router-dom)
- OpenTelemetry core packages (update to 2.8.0+ for baggage fix)

---

## 🛡️ REMEDIATION STRATEGY

### Step 1: Audit Dependency Chains
```bash
# Find root cause of handlebars in Source/Backend
cd Source/Backend && npm list handlebars

# Find form-data usage
cd Source/Backend && npm list form-data

# Check OpenTelemetry cascade
cd portal/Backend && npm list protobufjs
```

### Step 2: Staged Updates (High Risk)
```bash
# Isolate each package update and test
cd Source/Frontend
git checkout -b deps/vitest-update
npm update vitest
npm test --workspaces --if-present
npm run typecheck
# Commit and push for review
```

### Step 3: Development vs. Production Risk
- **Development-only** (source/Frontend vitest UI): Lower risk but still high CVSS
- **Production** (handlebars, protobufjs): Higher impact — coordinate with full QA

### Step 4: Verify After Updates
```bash
# Re-run audits
npm audit --json | jq '.metadata.vulnerabilities'

# Check for new issues
npm test
npm run build
```

---

## 📈 METRICS & SEVERITY CLASSIFICATION

| Severity | P-Level | CVSS | Count | Examples |
|----------|---------|------|-------|----------|
| Critical | P1 | 9.0-10.0 | 5 | RCE (handlebars, protobufjs, vitest) |
| High | P2 | 7.0-8.9 | 26 | DoS (brace-expansion), CRLF (form-data) |
| Medium | P3 | 4.0-6.9 | 62 | Moderate injection/bypass risks |
| Low | P4 | 0.1-3.9 | 6 | Local/low-impact issues |

---

## 🔗 CROSS-TEAM ESCALATIONS

**[ESCALATE → TheGuardians]**
- DEP-001: Handlebars RCE (Source/Backend)
- DEP-002: Vitest arbitrary file read (Source/Frontend dev)
- DEP-003: protobufjs RCE (portal/Backend OpenTelemetry)
- DEP-004: OpenTelemetry Prometheus DoS (portal/Backend)
- General: Form-data CRLF injection series (all packages)

**[NOTE: platform/ Directory]**
- platform/orchestrator has 9 vulnerabilities (protobufjs-heavy)
- Per CLAUDE.md: infrastructure package — read-only for team agents
- **Action:** Report separately; solo session or team leader must coordinate platform updates

---

## 📝 RECOMMENDATIONS

### Short Term (48 hours)
1. ✅ Update Source/Frontend vitest + vite to fix dev-time RCE
2. ✅ Identify and update handlebars chain in Source/Backend
3. ✅ Update portal/Backend OpenTelemetry packages

### Medium Term (1-2 weeks)
1. Systematic npm audit fixes for all high/critical CVEs
2. Add `npm audit --audit-level=high` to CI/CD pre-push hook
3. Establish weekly audit cycle (e.g., cron job)

### Long Term
1. Dependency pruning: portal/Backend has 577 deps for a debug UI (over-engineered)
2. Consider lighter OpenTelemetry auto-instrumentation or vendor lock
3. Migrate away from deprecated packages (js-yaml, brace-expansion)
4. Dependency size budget: target <400 transitive deps per package

---

## 📂 Assets

- **Audit JSON Logs:**
  - `/tmp/backend-audit.json` (Source/Backend)
  - `/tmp/frontend-audit.json` (Source/Frontend)
  - `/tmp/orchestrator-audit.json` (platform/orchestrator)
  - `/tmp/portal-backend-audit.json` (portal/Backend)
  - `/tmp/portal-frontend-audit.json` (portal/Frontend)

---

## Self-Learning & Future Audits

See `Teams/TheInspector/learnings/dependency-auditor.md` for:
- Prior CVE findings and fix status
- Watch list (recurring vulnerability packages)
- Environment audit tool availability

---

**Report Generated By:** Dependency Auditor Agent  
**Date:** 2026-08-29 UTC  
**Next Audit Recommended:** 2026-09-05 (weekly cycle)
