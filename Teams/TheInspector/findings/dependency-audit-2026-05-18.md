# Dependency Auditor Findings

**Audit Date:** 2026-05-18  
**Status:** ⚠️ **SIGNIFICANT FINDINGS** — 3 Critical CVEs, 5 High-severity, multiple major version gaps

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Projects Scanned** | 7 npm projects |
| **Total Dependencies** | 1,799 (411 Backend + 230 Frontend + 4 E2E + 577 Portal/Backend + 424 Portal/Frontend + 155 Orchestrator) |
| **Known CVEs** | 27 total |
| **Critical (P1)** | 3 |
| **High (P2)** | 5 |
| **Moderate (P3)** | 18 |
| **Outdated Major Versions** | 9 packages |

---

## Critical Findings (P1)

### DEP-001: Handlebars.js Critical JavaScript Injection
- **Severity:** P1 (Critical CVE)
- **Category:** CVE
- **Package:** `handlebars` (4.0.0 – 4.7.8)
- **File:** `Source/Backend/package-lock.json`
- **Detail:** 
  - **GHSA-2w6w-674q-4c4q** (CVSS 9.8): JavaScript Injection via AST Type Confusion
  - **GHSA-3mfm-83xf-c92r** (CVSS 8.1): JavaScript Injection via @partial-block tampering
  - **GHSA-xhpv-hc6g-r9c6** (CVSS 8.1): JavaScript Injection via dynamic partial with object
  - **GHSA-9cx6-37pm-9jff** (CVSS 7.5): Denial of Service via malformed decorator syntax
  - **GHSA-xjpj-3mr7-gcpf** (CVSS 8.2): JavaScript Injection in CLI precompiler
  - Transitive dependency (in jest/ts-jest chain) — impacts testing toolchain
  - **Exploitability:** High — template injection can lead to arbitrary code execution during build/test

- **Fix:** Update jest/ts-jest to versions with newer handlebars
- **Cross-ref:** [ESCALATE → TheGuardians] — potential RCE vector in build pipeline
- **Action Required:** Immediate upgrade required

---

### DEP-002: Protobufjs Arbitrary Code Execution (Critical)
- **Severity:** P1 (Critical CVE)
- **Category:** CVE
- **Package:** `protobufjs` (≤7.5.5)
- **File:** 
  - `portal/Backend/package-lock.json` (via OpenTelemetry dependencies)
  - `platform/orchestrator/package-lock.json` (via OpenTelemetry dependencies)
- **Detail:**
  - **GHSA-xq3m-2v4x-88gg** (CVSS 9.8): Arbitrary code execution in protobufjs
  - **GHSA-75px-5xx7-5xc7** (CVSS 8.1): Code generation gadget after prototype pollution
  - **GHSA-jvwf-75h9-cwgg** (CVSS 7.5): Process-wide DoS via unsafe option paths
  - **GHSA-685m-2w69-288q** (CVSS 7.5): DoS via unbounded protobuf recursion
  - **GHSA-66ff-xgx4-vchm** (CVSS High): Code injection through bytes field defaults
  - Multiple additional moderate/high CVEs related to prototype pollution and method injection
  - **Root Cause:** OpenTelemetry dependencies are severely outdated
  - **Exploitability:** Critical — RCE possible through crafted protobuf messages

- **Fix:** 
  - `portal/Backend`: Upgrade `@opentelemetry/sdk-node` from 0.47.0 → ≥0.218.0
  - `portal/Backend`: Upgrade `@opentelemetry/auto-instrumentations-node` from 0.40.0 → ≥0.76.0
  - `platform/orchestrator`: Upgrade OpenTelemetry dependencies

- **Cross-ref:** [ESCALATE → TheGuardians] — direct RCE vulnerability in observability pipeline
- **Action Required:** CRITICAL — Blocks deployment until patched

---

### DEP-003: Path-to-regexp ReDoS in Portal/Orchestrator
- **Severity:** P1 (High CVE + direct dependency on orchestrator)
- **Category:** CVE
- **Package:** `path-to-regexp` (<0.1.13)
- **File:** 
  - `portal/Backend/package-lock.json`
  - `platform/orchestrator/package-lock.json`
- **Detail:**
  - **GHSA-37ch-88jc-xwx2** (CVSS 7.5): Regular Expression Denial of Service via multiple route parameters
  - Can be triggered on orchestrator with malformed route patterns
  - Affects `express` → `path-to-regexp` chain

- **Fix:** 
  - Upgrade `path-to-regexp` to ≥0.1.13
  - May require express/vite major version upgrades

- **Action Required:** High priority — DoS vector against orchestrator API

---

## High-Severity Findings (P2)

### DEP-004: OpenTelemetry SDK DoS via Malformed HTTP Request
- **Severity:** P2
- **Category:** CVE
- **Package:** 
  - `@opentelemetry/sdk-node` (0.47.0) 
  - `@opentelemetry/auto-instrumentations-node` (0.40.0)
- **File:** `portal/Backend/package-lock.json`
- **Detail:**
  - **GHSA-q7rr-3cgh-j5r3** (CVSS 7.5): Prometheus exporter process crash via malformed HTTP request
  - Metrics endpoint (`GET /metrics`) vulnerable to crash on crafted payloads
  - Impacts observability, could mask other issues

- **Fix:** Upgrade OpenTelemetry packages (see DEP-002)
- **Cross-ref:** [CROSS-REF: performance-profiler] — metrics endpoint availability risk

---

### DEP-005: Vite Path Traversal in Development Mode
- **Severity:** P2 (impacts development/testing)
- **Category:** CVE
- **Package:** `vite` (≤6.4.1)
- **Files:** 
  - `Source/Frontend/package-lock.json`
  - `portal/Frontend/package-lock.json`
- **Detail:**
  - **GHSA-4w7w-66w2-5vf9**: Path traversal in optimized deps `.map` handling
  - Affects dev server — developer machine could access source maps outside root
  - **Severity reduced from High to P2** because it's dev-only, but still significant

- **Fix:** Upgrade vite to ≥5.4.2 or ≥6.4.2 (note: requires vitest upgrade too)
- **Action Required:** Upgrade vitest to ≥4.1.6 (major version bump required)

---

### DEP-006: Picomatch ReDoS in Portal/Frontend
- **Severity:** P2
- **Category:** CVE
- **Package:** `picomatch` (≤2.3.1 or 4.0.0-4.0.3)
- **File:** `portal/Frontend/package-lock.json`
- **Detail:**
  - **GHSA-c2c7-rcm5-vvqj** (CVSS 7.5): ReDoS via extglob quantifiers
  - **GHSA-3v7f-55p6-f55p** (CVSS 5.3): Method injection in POSIX character classes
  - Affects file glob matching during build time

- **Fix:** Upgrade picomatch to ≥2.3.2 or ≥4.0.4
- **Trigger:** `npm install picomatch@latest`

---

### DEP-007: PostCSS XSS in CSS Output
- **Severity:** P2
- **Category:** CVE
- **Package:** `postcss` (<8.5.10)
- **Files:**
  - `portal/Frontend/package-lock.json` (direct)
  - `Source/Frontend/package-lock.json` (transitive)
- **Detail:**
  - **GHSA-qx2v-qp2m-jg93** (CVSS 6.1): XSS via unescaped `</style>` in CSS stringify output
  - Affects build output — malicious CSS in dependencies could inject scripts
  - Unlikely to be exploitable in this project, but violation of defense-in-depth

- **Fix:** Upgrade postcss to ≥8.5.10
- **Trigger:** `npm install postcss@latest`

---

## Moderate Findings (P3)

### DEP-008: Brace-expansion DoS in Backend
- **Severity:** P3
- **Category:** CVE
- **Package:** `brace-expansion` (<1.1.13)
- **File:** `Source/Backend/package-lock.json`
- **Detail:**
  - **GHSA-f886-m6hf-6m8v** (CVSS 6.5, CWE-400): Zero-step sequence causes process hang and memory exhaustion
  - Transitive via jest/babel chain — theoretical impact during test runs

- **Fix:** Update jest/babel dependencies
- **Action:** Routine update during next minor release

---

### DEP-009: Esbuild Development Server CORS Issue
- **Severity:** P3 (dev-only)
- **Category:** CVE
- **Package:** `esbuild` (≤0.24.2)
- **Files:**
  - `Source/Frontend/package-lock.json`
  - `portal/Frontend/package-lock.json`
- **Detail:**
  - **GHSA-67mh-4wv8-2f99** (CVSS 5.3): Dev server enables arbitrary requests if developer visits malicious site
  - Low risk due to developer awareness, but still a concern for open-network development

- **Fix:** Upgrade vite (which bundles esbuild) to latest

---

### DEP-010: Additional Protobufjs Moderate CVEs
- **Severity:** P3
- **Category:** CVE
- **Package:** `protobufjs` (≤7.5.5)
- **Files:** Same as DEP-002
- **Detail:**
  - **GHSA-q6x5-8v7m-xcrf**: Overlong UTF-8 decoding
  - **GHSA-2pr8-phx7-x9h3**: DoS from crafted field names
  - **GHSA-fx83-v9x8-x52w**: Prototype injection in constructors
  - Moderate variants of issues in DEP-002

- **Fix:** Resolved by DEP-002 protobufjs upgrade

---

## Outdated Major Versions (P2/P3)

### DEP-011: Express 4 → 5 Version Gap (Backend)
- **Severity:** P3
- **Category:** Outdated
- **Package:** `express` (4.18.2, current 5.2.1)
- **File:** `Source/Backend/package.json`
- **Gap:** 1 major version behind
- **Risk:** May miss security patches from express 5.x
- **Fix:** `npm update express@latest` — but requires compatibility check for error handling middleware
- **Note:** Express 5 has breaking changes in error handling

---

### DEP-012: Pino 8 → 10 Version Gap (Backend)
- **Severity:** P3
- **Category:** Outdated
- **Package:** `pino` (8.17.0, current 10.3.1)
- **File:** `Source/Backend/package.json`
- **Gap:** 2 major versions behind
- **Risk:** Older versions may have logger-specific DoS issues
- **Fix:** `npm update pino@latest` — check for API changes in major versions
- **Cross-ref:** [CROSS-REF: performance-profiler] — logger efficiency

---

### DEP-013: UUID 9 → 14 Version Gap
- **Severity:** P3
- **Category:** Outdated
- **Package:** `uuid` (9.0.0, current 14.0.0)
- **File:** `Source/Backend/package.json`
- **Gap:** 5 major versions behind
- **Risk:** Low actual risk (uuid is stable), but signals dependency drift
- **Fix:** `npm update uuid@latest`

---

### DEP-014: React 18 → 19 Version Gap (Frontend + Portal)
- **Severity:** P3
- **Category:** Outdated
- **Package:** `react`, `react-dom` (18.3.1 → 19.2.6)
- **Files:** 
  - `Source/Frontend/package.json`
  - `portal/Frontend/package.json`
- **Gap:** 1 major version behind
- **Risk:** React 19 may have security improvements
- **Fix:** `npm update react react-dom@latest` — test thoroughly for hooks changes

---

### DEP-015: React Router 6 → 7 Version Gap
- **Severity:** P3
- **Category:** Outdated
- **Package:** `react-router-dom` (6.26.0 → 7.15.1, or 6.22.0 → 7.15.1)
- **Files:**
  - `Source/Frontend/package.json`
  - `portal/Frontend/package.json`
- **Gap:** 1 major version behind
- **Risk:** Router improvements, security fixes
- **Fix:** `npm update react-router-dom@latest`

---

### DEP-016: OpenTelemetry Major Version Gaps (Portal Backend)
- **Severity:** P2 (multiple major gaps + critical CVEs)
- **Category:** Outdated + Vulnerable
- **Packages:**
  - `@opentelemetry/sdk-node` (0.47.0 → 0.218.0) = **4+ major versions behind**
  - `@opentelemetry/auto-instrumentations-node` (0.40.0 → 0.76.0) = **3+ major versions behind**
  - `@opentelemetry/exporter-trace-otlp-http` (0.47.0 → 0.218.0) = **4+ major versions behind**
- **File:** `portal/Backend/package.json`
- **Critical:** This is the primary driver of P1 findings (protobufjs RCE)
- **Fix:** 
  ```bash
  npm install @opentelemetry/sdk-node@latest @opentelemetry/auto-instrumentations-node@latest @opentelemetry/exporter-trace-otlp-http@latest
  ```
- **Test:** Verify telemetry endpoints after upgrade (breaking API changes possible)

---

## Dependency Tree Size & Supply Chain Risks

### DEP-017: High Transitive Dependency Count (P4 informational)
- **Severity:** P4
- **Category:** Supply chain risk
- **Finding:** 
  - Backend: 411 dependencies (102 prod, 310 dev)
  - Portal/Backend: 577 dependencies (397 prod, 181 dev)
- **Risk:** Large attack surface; each dependency is a potential supply chain attack vector
- **Recommendation:** Regular audits; consider using `npm audit fix` with caution

---

### DEP-018: No Post-Install Scripts Detected (✓ Good)
- **Status:** ✓ PASS
- **Finding:** No malicious post-install hooks detected
- **Note:** This is a positive security posture indicator

---

### DEP-019: Duplicate Transitive Dependencies (P4 informational)
- **Severity:** P4
- **Category:** Dependency bloat
- **Finding:** 
  - Multiple versions of `esbuild` (via vite, vitest chains)
  - Multiple versions of `vite-node`, `@vitest/mocker`
  - Multiple versions of `picomatch` (via micromatch, anymatch, readdirp)
- **Impact:** Increases bundle size, complicates debugging
- **Recommendation:** Use `npm dedupe` to consolidate when possible

---

## License Compliance

### DEP-020: License Audit Results
- **Severity:** P4 (informational)
- **Finding:**
  - `Source/Frontend`: UNLICENSED (expected for proprietary project)
  - All dependency licenses: Standard permissive (MIT, Apache, ISC)
  - **No GPL/AGPL found** ✓
  - **No UNLICENSED dependencies** ✓
- **Recommendation:** Maintain current license policy; monitor for GPL additions in future

---

## Summary by Project

| Project | CVEs | Critical | High | Moderate | Outdated Major | Status |
|---------|------|----------|------|----------|-----------------|--------|
| Source/Backend | 2 | 1 | 0 | 1 | 3 | ⚠️ **CRITICAL** |
| Source/Frontend | 6 | 0 | 0 | 6 | 2 | ⚠️ **FIX REQUIRED** |
| Source/E2E | 0 | 0 | 0 | 0 | 0 | ✓ PASS |
| Portal/Backend | 10 | 1 | 3 | 6 | 4+ | 🔴 **CRITICAL BLOCK** |
| Portal/Frontend | 6 | 0 | 1 | 5 | 2 | ⚠️ **FIX REQUIRED** |
| Platform/Orchestrator | 3 | 1 | 1 | 1 | 0 | 🔴 **CRITICAL BLOCK** |

---

## Remediation Roadmap

### Phase 1: CRITICAL (Blocks Deployment) — Week 1
**Must complete before any release:**

1. **Source/Backend**: Update handlebars (via jest/ts-jest) — RCE in test pipeline
   ```bash
   cd Source/Backend && npm install jest@latest ts-jest@latest
   ```

2. **Portal/Backend + Orchestrator**: Update OpenTelemetry packages and protobufjs
   ```bash
   cd portal/Backend && npm install @opentelemetry/sdk-node@latest @opentelemetry/auto-instrumentations-node@latest
   cd platform/orchestrator && npm install # Re-lock dependencies
   ```

3. **Portal/Backend + Orchestrator**: Update path-to-regexp indirectly via express upgrade
   ```bash
   npm install express@latest
   ```

4. **Test All Critical Updates:**
   ```bash
   npm test --workspaces
   npm run build --workspaces
   python3 tools/traceability-enforcer.py
   ```

---

### Phase 2: HIGH PRIORITY — Week 2
1. Update vite/vitest to resolve esbuild + path traversal issues
2. Update picomatch (Portal/Frontend)
3. Update postcss (all frontend projects)

---

### Phase 3: ROUTINE — Within 1 Sprint
1. React 18 → 19 migration (both frontends)
2. React Router 6 → 7 migration
3. Express 4 → 5 migration
4. Pino/UUID updates (low risk)

---

## Dashboard Reporting

**Note:** RUN_ID was not provided in the task prompt. To report findings to the TheInspector dashboard, provide a RUN_ID and I will execute:

```bash
bash tools/pipeline-update.sh --team TheInspector --run "$RUN_ID" \
  --agent dependency_auditor --action complete --verdict failed \
  --metrics '{
    "cves_critical": 3,
    "cves_high": 5,
    "cves_moderate": 18,
    "cves_total": 26,
    "outdated_major": 9,
    "projects_critical": 2,
    "transitive_dependencies": 1799,
    "supply_chain_risks": 3
  }'
```

---

## Next Steps

1. **TheGuardians escalation** — Route DEP-001, DEP-002, DEP-003 for security validation
2. **Backend-Coder** — Implement Phase 1 updates + run verification gates
3. **Frontend-Coder** — Implement vite/pitest/postcss updates
4. **QA** — Regression testing after each phase
5. **Re-audit** — Run `npm audit` after all updates to confirm resolution

---

**Audit completed by:** dependency-auditor (haiku)  
**Tool versions:** npm audit, npm outdated  
**Last update:** 2026-05-18
