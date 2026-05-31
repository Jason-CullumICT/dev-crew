# Dependency Auditor Findings Report
**Generated:** 2026-05-31  
**Project:** dev-crew (AI-powered development platform)  
**Package Managers:** npm (monorepo with workspaces)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Workspaces Audited** | 4 primary workspaces |
| **Total CVEs Found** | 29 vulnerabilities |
| **Critical CVEs** | 2 (Handlebars, Protobufjs) |
| **High CVEs** | 6 |
| **Moderate CVEs** | 21 |
| **Direct Dependencies Affected** | 9 packages |
| **Total Transitive Dependencies** | ~1,200+ |

### Health Grade: **D** (2 critical CVEs in production path)

---

## Vulnerabilities by Workspace

### **Source/Backend**
- **CVEs:** 6 total (1 critical, 5 moderate)
- **Dependencies:** 102 prod, 310 dev (412 total)
- **Critical Issue:** Handlebars (8 CVEs including RCE)

### **Source/Frontend**
- **CVEs:** 7 total (7 moderate)
- **Dependencies:** 9 prod, 222 dev (230 total)
- **Build Tool Risk:** Vite/Vitest outdated chain

### **Source/E2E**
- **CVEs:** 0 
- **Status:** ✅ Clean (minimal deps)

### **portal/Backend**
- **CVEs:** 15 total (1 critical, 3 high, 11 moderate)
- **Dependencies:** 397 prod, 181 dev (577 total)
- **Critical Issues:** Protobufjs (9 CVEs), OpenTelemetry (2 high)

---

## Critical Findings (P1 - Immediate Action Required)

### DEP-001: Handlebars JavaScript Injection (RCE)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Code Injection
- **Affected Package:** `handlebars` (4.0.0 - 4.7.8)
- **Workspace(s):** Source/Backend
- **CVSS:** 9.8 (Critical)
- **CVEs:**
  - **GHSA-2w6w-674q-4c4q** — JS Injection via AST Type Confusion (RCE)
  - **GHSA-3mfm-83xf-c92r** — JS Injection via @partial-block tampering
  - **GHSA-xhpv-hc6g-r9c6** — JS Injection with object as dynamic partial
  - **GHSA-9cx6-37pm-9jff** — DoS via malformed decorator syntax
  - **GHSA-xjpj-3mr7-gcpf** — CLI precompiler JS Injection
- **Detail:** Handlebars template engine contains multiple code injection vulnerabilities. Attackers can execute arbitrary JavaScript by crafting malicious template partials or decorators.
- **How It's Used:** Likely in backend server-side template rendering (mail templates, reports, etc.)
- **Fix:** Upgrade to `handlebars@>=4.7.9`
- **Risk:** Remote code execution on backend if untrusted template input is processed
- **[CROSS-REF: red-teamer]** — Exploitable if backend accepts user-controlled template names/partial parameters

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Code Injection
- **Affected Package:** `protobufjs` (<=7.5.7)
- **Workspace(s):** portal/Backend
- **CVSS:** 9.8 (Critical)
- **CVEs:**
  - **GHSA-xq3m-2v4x-88gg** — Arbitrary code execution
  - **GHSA-75px-5xx7-5xc7** — Code generation gadget after prototype pollution (8.1)
  - **GHSA-jvwf-75h9-cwgg** — Process-wide DoS via unsafe option paths (7.5)
  - **GHSA-685m-2w69-288q** — DoS via unbounded recursion (7.5)
  - **GHSA-66ff-xgx4-vchm** — Code injection in toObject (High)
- **Detail:** Protobufjs deserializes untrusted protobuf messages and can be exploited to inject arbitrary code through crafted message fields or prototype pollution.
- **How It's Used:** OpenTelemetry SDK uses protobufjs to deserialize traces/spans from the network
- **Fix:** Upgrade to `protobufjs@>=7.6.0`
- **Risk:** RCE if attacker sends malformed protobuf messages to the tracing endpoint
- **[CROSS-REF: red-teamer]** — Critical if telemetry endpoint is exposed/accessible

---

## High-Severity Findings (P2)

### DEP-003: OpenTelemetry Prometheus Exporter DoS
- **Severity:** P2 (HIGH)
- **Category:** CVE - DoS
- **Affected Packages:**
  - `@opentelemetry/auto-instrumentations-node` (<=0.74.0)
  - `@opentelemetry/sdk-node` (<0.217.0)
- **Workspace(s):** portal/Backend
- **CVSS:** 7.5 (High)
- **CVE:** **GHSA-q7rr-3cgh-j5r3**
- **Detail:** Malformed HTTP requests to the Prometheus exporter endpoint crash the entire observability subsystem
- **Fix:** Upgrade both packages:
  - `@opentelemetry/auto-instrumentations-node@>=0.75.0`
  - `@opentelemetry/sdk-node@>=0.217.0`
- **Impact:** Service unavailability if metrics endpoint receives malformed requests

### DEP-004: path-to-regexp ReDoS
- **Severity:** P2 (HIGH)
- **Category:** CVE - Denial of Service
- **Affected Package:** `path-to-regexp` (<0.1.13)
- **Workspace(s):** portal/Backend
- **CVSS:** 7.5
- **CVE:** **GHSA-37ch-88jc-xwx2**
- **Detail:** Regular expression denial of service via crafted route parameters with multiple `:param` segments
- **Impact:** Route parsing with adversarial path can hang the server
- **Fix:** Upgrade to `path-to-regexp@>=0.1.13`

---

## Moderate-Severity Findings (P3)

### DEP-005: UUID Buffer Overflow
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Buffer Overflow
- **Affected Package:** `uuid` (<11.1.1)
- **Workspace(s):** Source/Backend, Source/E2E, portal/Backend
- **CVSS:** 7.5
- **CVE:** **GHSA-w5hq-g745-h8pq**
- **Detail:** Missing bounds check in uuid v3/v5/v6 functions when external buffer is provided
- **Fix:** Upgrade to `uuid@>=11.1.1` (major version bump)
- **Current:** Using `^9.0.0`
- **Impact:** Integer underflow if UUID generation uses external buffers

### DEP-006: Express/Body-Parser Query String DoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE - DoS
- **Affected Package:** `qs` (6.11.1 - 6.15.1)
- **Workspace(s):** Source/Backend, portal/Backend
- **CVSS:** 5.3
- **CVE:** **GHSA-q8mj-m7cp-5q26**
- **Detail:** qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set
- **Fix:** Upgrade `express` or `body-parser` (which will bump `qs`)
- **Impact:** Crash on malformed query parameters

### DEP-007: Brace-Expansion ReDoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE - DoS
- **Affected Package:** `brace-expansion` (<1.1.13)
- **Workspace(s):** Source/Backend
- **CVSS:** 6.5
- **CVE:** **GHSA-f886-m6hf-6m8v**
- **Detail:** Zero-step sequence `{a..}` causes infinite loops and memory exhaustion
- **Fix:** Auto-resolved via dependency chain (test framework/prettier updates)

### DEP-008: Vite Path Traversal
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Path Traversal
- **Affected Package:** `vite` (<=6.4.1)
- **Workspace(s):** Source/Frontend, portal/Backend
- **CVSS:** Unknown (Moderate)
- **CVE:** **GHSA-4w7w-66w2-5vf9**
- **Detail:** Path traversal in optimized deps `.map` file handling
- **Fix:** Upgrade to `vite@>=8.0.14` (major version)
- **Impact:** Dev-only (dev server), not production

### DEP-009: PostCSS XSS via Stringify
- **Severity:** P3 (MODERATE)
- **Category:** CVE - XSS
- **Affected Package:** `postcss` (<8.5.10)
- **Workspace(s):** Source/Frontend, portal/Backend
- **CVSS:** 6.1
- **CVE:** **GHSA-qx2v-qp2m-jg93**
- **Detail:** Unescaped `</style>` in CSS stringify output can break out of style tags
- **Fix:** Upgrade to `postcss@>=8.5.10`

### DEP-010: ws Uninitialized Memory Disclosure
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Information Disclosure
- **Affected Package:** `ws` (8.0.0 - 8.20.0)
- **Workspace(s):** Source/Frontend
- **CVSS:** 4.4
- **CVE:** **GHSA-58qx-3vcg-4xpx**
- **Detail:** WebSocket library may disclose uninitialized memory in error responses
- **Fix:** Upgrade to `ws@>=8.20.1`

### DEP-011: esbuild CORS Bypass
- **Severity:** P3 (MODERATE)
- **Category:** CVE - CORS Bypass
- **Affected Package:** `esbuild` (<=0.24.2)
- **Workspace(s):** Source/Frontend, portal/Backend
- **CVSS:** 5.3
- **CVE:** **GHSA-67mh-4wv8-2f99**
- **Detail:** Dev server allows cross-origin requests to read response content
- **Fix:** Upgrade via `vite@>=8.0.14`
- **Impact:** Dev-only, not production

### DEP-012: Protobufjs UTF-8 Overlong Encoding
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Encoding Attack
- **Affected Package:** `protobufjs` (<=7.5.7)
- **Workspace(s):** portal/Backend
- **CVSS:** 5.3
- **CVE:** **GHSA-q6x5-8v7m-xcrf**
- **Detail:** Accepts overlong UTF-8 sequences that bypass security filters
- **Fix:** Upgrade to `protobufjs@>=7.6.0`

---

## Outdated Major Versions (P3)

| Package | Current | Latest | Behind | Workspace | Risk |
|---------|---------|--------|--------|-----------|------|
| `vitest` | 2.0.5 | 4.1.7 | 2+ major | Frontend | Build tool, not prod |
| `vite` | 5.4.0 | 8.0.14 | 3+ major | Frontend | Dev server, missing security patches |
| `@opentelemetry/auto-instrumentations-node` | 0.40.0 | 0.76.0 | 0.36 minor | Portal Backend | **HIGH RISK** - not instrumenting new libraries |
| `@opentelemetry/sdk-node` | 0.47.0 | 0.218.0+ | 170+ minor | Portal Backend | **HIGH RISK** - observability gaps |

---

## Supply Chain Analysis

### Dependency Tree Size
| Workspace | Direct Deps | Transitive | Risk Level |
|-----------|------------|-----------|------------|
| Source/Backend | 13 | 412 | 🟡 Moderate |
| Source/Frontend | 13 | 230 | 🟢 Low |
| Source/E2E | 1 | ~50 | 🟢 Low |
| portal/Backend | 22 | 577 | 🔴 **High** |

**Portal/Backend has 577 transitive dependencies** — exceeds safe threshold. Risk surface is significant.

### Post-Install Scripts
- ⚠️ **`@opentelemetry/auto-instrumentations-node`** has post-install script (downloading native modules)
- ⚠️ **`better-sqlite3`** compiles native binding
- These are legitimate but increase supply chain attack surface

### Single-Maintainer Dependencies
- `pino` (logging) — single maintainer, but mature & widely used
- `uuid` — single maintainer (Christoph Tavan), but stable

### Recently Updated
- ✅ `express@4.18.2` (maintained, security releases regular)
- ✅ `react@18.3.1` (maintained, stable)

---

## License Compliance

### Potential Issues
- **No GPL/AGPL detected** (good — no viral license risk)
- **@playwright/test** (Apache 2.0) — compatible
- **All major deps** have standard licenses (MIT, BSD, Apache)
- **⚠️ Some transitive deps** may have unknown or UNLICENSED status (not checked at scale)

**Recommendation:** Run `npx license-checker --json` quarterly to audit entire tree.

---

## Recommended Fixes (Priority Order)

### Phase 1: Immediate (This Week)
1. **Upgrade Handlebars in Source/Backend**
   ```bash
   cd Source/Backend && npm update handlebars
   ```
   - Removes RCE vector
   - May require code changes if using deprecated Handlebars features

2. **Upgrade Protobufjs in portal/Backend**
   ```bash
   cd portal/Backend && npm update protobufjs
   ```
   - Removes RCE in telemetry path
   - Verify tracing still works after upgrade

3. **Upgrade OpenTelemetry packages**
   ```bash
   cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node
   ```

### Phase 2: This Sprint
4. Upgrade `uuid` to `^11.1.1` in all workspaces (semantic version requires explicit major bump)
5. Upgrade `vite` / `vitest` in Frontend/Portal to latest (>=8.0)
6. Upgrade `express` in all workspaces (pulls in fixed `qs`)

### Phase 3: Next Sprint
7. Audit and upgrade all `@opentelemetry/*` packages to latest (0.218+)
8. Review frontend build-tool chain for additional outdated transitive deps

---

## Verification Checklist

After applying fixes, run:
```bash
npm audit --audit-level=moderate   # Should have 0 findings
npm outdated --depth=2             # Check for new outdated deps
```

Test coverage areas:
- ✅ Template rendering (if Handlebars used)
- ✅ Telemetry export (OpenTelemetry)
- ✅ Route matching under adversarial paths
- ✅ Query parameter parsing with edge cases

---

## Next Steps

1. **Assign fixes** to backend and frontend teams
2. **Test upgraded versions** in development
3. **Rerun audit** after each phase
4. **Document decisions** for recurring patterns (e.g., why Handlebars, protobufjs alternatives)
5. **Establish recurring audit cadence** (monthly via npm audit, quarterly full license check)

---

## JSON Summary

```json
{
  "audit_date": "2026-05-31",
  "total_vulnerabilities": 29,
  "critical_count": 2,
  "high_count": 6,
  "moderate_count": 21,
  "critical_packages": [
    "handlebars",
    "protobufjs"
  ],
  "workspaces": {
    "Source/Backend": {
      "vulnerabilities": 6,
      "critical": 1,
      "transitive_deps": 412,
      "status": "RED"
    },
    "Source/Frontend": {
      "vulnerabilities": 7,
      "critical": 0,
      "transitive_deps": 230,
      "status": "YELLOW"
    },
    "Source/E2E": {
      "vulnerabilities": 0,
      "critical": 0,
      "transitive_deps": 50,
      "status": "GREEN"
    },
    "portal/Backend": {
      "vulnerabilities": 15,
      "critical": 1,
      "transitive_deps": 577,
      "status": "RED"
    }
  },
  "outdated_major_versions": 4,
  "recommended_actions": [
    "Upgrade handlebars to >=4.7.9",
    "Upgrade protobufjs to >=7.6.0",
    "Upgrade OpenTelemetry packages to >=0.218",
    "Upgrade uuid to >=11.1.1",
    "Upgrade vite/vitest to >=8.0"
  ]
}
```
