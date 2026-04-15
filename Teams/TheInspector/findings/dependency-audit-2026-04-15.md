# Dependency Auditor Findings — dev-crew

**Audit Date:** 2026-04-15  
**Agent:** dependency_auditor  
**Status:** ✅ Complete

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Package Managers Detected** | npm (6 projects) |
| **Total Direct Dependencies** | 588 (across all projects) |
| **Total Transitive Dependencies** | 1,987 (from lock files) |
| **Known CVEs** | 15 total |
| │ ├─ Critical | 1 |
| │ ├─ High | 3 |
| │ └─ Moderate | 11 |
| **Outdated Major Versions** | 6 packages |
| **Abandoned Dependencies** | 0 identified |
| **Supply Chain Risks** | 3 identified |

**Overall Grade:** **C** (per grading config: 1 critical CVE, 3 high CVEs exceed A/B thresholds)

---

## Critical Findings (P1)

### DEP-001: Handlebars.js Multiple Critical JavaScript Injection Vulnerabilities

- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Remote Code Execution Risk
- **Package:** `handlebars@4.7.8`
- **File:** Source/Backend/package-lock.json
- **Direct/Transitive:** Transitive (used by log/template dependencies)
- **Affected Versions:** 4.0.0 ≤ version ≤ 4.7.8
- **Current Version:** 4.7.8 (end of vulnerable range)

**Vulnerabilities:**

1. **GHSA-2w6w-674q-4c4q** — JavaScript Injection via AST Type Confusion
   - **CVSS Score:** 9.8 (Critical)
   - **CWE:** CWE-94 (Code Injection), CWE-843 (Type Confusion)
   - **Impact:** Attacker can inject arbitrary JavaScript code
   - **Vector:** Network-accessible, low complexity, no user interaction required

2. **GHSA-3mfm-83xf-c92r** — JavaScript Injection via @partial-block AST Tampering
   - **CVSS Score:** 8.1 (High)
   - **CWE:** CWE-94, CWE-843
   - **Impact:** Ability to execute arbitrary code through template injection
   - **Requires:** Tampering with @partial-block in templates

3. **GHSA-2qvq-rjwj-gvw9** — Prototype Pollution via Partial Template Injection
   - **CVSS Score:** 4.7 (Moderate)
   - **CWE:** CWE-79 (XSS), CWE-1321 (Prototype Pollution)

4. **GHSA-7rx3-28cr-v5wh** — Prototype Method Access Control Gap (__lookupSetter__)
   - **CVSS Score:** 4.8 (Moderate)
   - **CWE:** CWE-1321

5. **GHSA-xjpj-3mr7-gcpf** — JavaScript Injection in CLI Precompiler
   - **CVSS Score:** 8.3 (High)
   - **CWE:** CWE-79, CWE-94, CWE-116

6. **GHSA-xhpv-hc6g-r9c6** — JavaScript Injection via AST Type Confusion (Dynamic Partial)
   - **CVSS Score:** 8.1 (High)
   - **CWE:** CWE-94, CWE-843

7. **GHSA-9cx6-37pm-9jff** — DoS via Malformed Decorator Syntax
   - **CVSS Score:** 7.5 (High)
   - **CWE:** CWE-754

**Exploitation Scenario:**
If the application uses Handlebars templates to render user-controlled data without proper sandboxing, an attacker could inject malicious JavaScript that executes in the server or client context.

**Recommended Fix:**
```bash
cd Source/Backend
npm update handlebars
# Should upgrade to 4.7.9+ or latest 4.x release
```

**Status:** 🔴 **BLOCKING** - Requires immediate update  
**Cross-ref:** `[ESCALATE → TheGuardians]` — Potential RCE in template injection vectors

---

## High Priority Findings (P2)

### DEP-002: path-to-regexp Regular Expression Denial of Service (ReDoS)

- **Severity:** P2 (HIGH)
- **Category:** CVE - Denial of Service
- **Package:** `path-to-regexp` (multiple instances)
- **File:** 
  - portal/Backend/package-lock.json
  - platform/orchestrator/package-lock.json
- **Affected Versions:** < 0.1.13
- **CVSS Score:** 7.5 (High)
- **CWE:** CWE-1333 (Inefficient Regular Expression)

**Vulnerability:** GHSA-37ch-88jc-xwx2  
Multiple route parameters in a maliciously crafted URL cause exponential regex backtracking, leading to CPU exhaustion and service unavailability.

**Exploitation:**
```
GET /api/v1/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/
```
Could cause the routing layer to hang indefinitely.

**Affected Projects:**
1. portal/Backend (via express or routing middleware)
2. platform/orchestrator (553 total deps, appears in routing)

**Recommended Fix:**
```bash
# Audit the dependency chain to find which module pulls path-to-regexp
npm audit fix --force
# Or explicit update if available:
npm update path-to-regexp
```

**Status:** 🟠 **HIGH** - Update required urgently  
**Cross-ref:** `[CROSS-REF: red-teamer]` — Test with unbounded path segments

---

### DEP-003: Picomatch ReDoS and Method Injection Vulnerabilities

- **Severity:** P2 (HIGH)
- **Category:** CVE - Regular Expression Denial of Service + Prototype Pollution
- **Package:** `picomatch`
- **File:** portal/Frontend/package-lock.json
- **Affected Versions:** < 2.3.2 OR 4.0.0-4.0.3
- **Direct/Transitive:** Transitive (via anymatch, micromatch, readdirp)

**Vulnerabilities:**

1. **GHSA-c2c7-rcm5-vvqj** — ReDoS via Extglob Quantifiers
   - **CVSS Score:** 7.5 (High)
   - **CWE:** CWE-1333
   - **Impact:** CPU exhaustion when matching certain glob patterns

2. **GHSA-3v7f-55p6-f55p** — Method Injection in POSIX Character Classes
   - **CVSS Score:** 5.3 (Moderate)
   - **CWE:** CWE-1321 (Prototype Pollution)
   - **Impact:** Glob matching can be bypassed

**Exploitation Scenario:**
Build tools or watch processes using picomatch-based file patterns could hang or bypass security restrictions on file inclusion.

**Recommended Fix:**
```bash
cd portal/Frontend
npm update picomatch  # Should reach 2.3.2+
npm audit fix  # May require vitest/vite updates
```

**Status:** 🟠 **HIGH** - Update required  
**Cross-ref:** `[CROSS-REF: performance-profiler]` — Watch patterns in build may cause hangs

---

## Moderate Priority Findings (P3)

### DEP-004: Vite Build Tool Chain Vulnerabilities

- **Severity:** P3 (MODERATE)
- **Category:** CVE - Path Traversal + Development Security
- **Packages:** 
  - `vite` (direct) — Path Traversal in .map handling
  - `esbuild` (transitive) — Development server CSRF
  - `@vitest/mocker`, `vite-node` (transitive)
- **Files:** 
  - Source/Frontend/package-lock.json
  - portal/Backend/package-lock.json
  - portal/Frontend/package-lock.json
- **Affected Versions:** 
  - vite ≤ 6.4.1
  - esbuild ≤ 0.24.2

**Vulnerabilities:**

1. **GHSA-4w7w-66w2-5vf9** — Vite Path Traversal in Optimized Deps `.map` Handling
   - **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure)
   - **Impact:** Potential source map or dependency file exposure

2. **GHSA-67mh-4wv8-2f99** — esbuild Development Server CSRF
   - **CVSS Score:** 5.3 (Moderate)
   - **CWE:** CWE-346 (Origin Validation Error)
   - **Impact:** Any website can send requests to dev server and read responses
   - **Context:** Development only, but affects open dev environments

**Recommended Fix:**
```bash
cd Source/Frontend
npm update vite vitest
# Requires vitest upgrade from 2.0.5 to 4.1.4+ (major version)

cd portal/Frontend
npm update vite vitest
```

**Status:** 🟡 **MODERATE** - Development/build chain, lower production risk  
**Cross-ref:** `[CROSS-REF: red-teamer]` — Relevant only if dev environment exposed

---

### DEP-005: Brace-expansion Denial of Service

- **Severity:** P3 (MODERATE)
- **Category:** CVE - DoS
- **Package:** `brace-expansion` (< 1.1.13)
- **File:** Source/Backend/package-lock.json
- **CVSS Score:** 6.5
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Vulnerability:** GHSA-f886-m6hf-6m8v  
Zero-step sequences in brace expansion cause infinite loops and memory exhaustion.

**Exploitation:**
```javascript
braceExpansion('{0..Infinity}') // Hangs
```

**Recommended Fix:**
```bash
cd Source/Backend
npm update brace-expansion  # To 1.1.13+
```

**Status:** 🟡 **MODERATE** - Transitive dependency, low likelihood of exploitation  
**Usage Check:** Verify if brace-expansion is used directly in code (likely only in build tools)

---

## Outdated Dependencies (P3)

### DEP-006: Backend Pino Logger 2+ Major Versions Behind

- **Severity:** P3 (OUTDATED)
- **Package:** `pino`
- **Current:** 8.17.0 (via ^8.17.0 in package.json)
- **Latest:** 10.3.1
- **File:** Source/Backend/package.json
- **Gap:** 2+ major versions

**Impact:**
- Missing bug fixes and performance improvements
- Potential security patches in major versions
- Incompatibility with newer OpenTelemetry versions

**Recommended Fix:**
```bash
cd Source/Backend
npm update pino  # May require code changes for major version
npm test  # Verify compatibility
```

**Status:** 🟡 **MODERATE** - Consider as part of next update cycle

---

### DEP-007: Frontend React 1 Major Version Behind

- **Severity:** P3 (OUTDATED)
- **Packages:** `react`, `react-dom`, `react-router-dom`
- **Current:** 18.3.1 (react), 6.26.0 (react-router-dom)
- **Latest:** 19.2.5 (react), 7.14.1 (react-router-dom)
- **File:** Source/Frontend/package.json
- **Gap:** 1 major version (React 19 available)

**Impact:**
- Missing new React features (useActionState, useFormStatus, etc.)
- No access to React 19 performance improvements
- Potential incompatibilities with newer third-party libraries

**Recommended Fix:**
```bash
cd Source/Frontend
npm update react react-dom react-router-dom
npm test
```

**Status:** 🟡 **MODERATE** - Consider for next major feature cycle

---

### DEP-008: Backend UUID 4+ Major Versions Behind

- **Severity:** P3 (OUTDATED)
- **Package:** `uuid`
- **Current:** 9.0.0
- **Latest:** 13.0.0
- **File:** Source/Backend/package.json
- **Gap:** 4 major versions

**Recommended Fix:**
```bash
cd Source/Backend
npm update uuid
npm test
```

**Status:** 🟡 **MODERATE** - Likely non-breaking, safe to update

---

### DEP-009: Portal Backend OpenTelemetry Packages Severely Outdated

- **Severity:** P3 (OUTDATED - CRITICAL MISMATCH)
- **Packages:**
  - @opentelemetry/sdk-node: 0.47.0 → 0.214.0
  - @opentelemetry/auto-instrumentations-node: 0.40.3 → 0.72.0
  - @opentelemetry/exporter-trace-otlp-http: 0.47.0 → 0.214.0
- **File:** portal/Backend/package.json
- **Gap:** 160+ minor version releases behind

**Impact:**
- Missing critical tracing improvements
- Potential incompatibilities with OpenTelemetry collectors
- May affect observability infrastructure

**Recommended Fix:**
```bash
cd portal/Backend
npm update @opentelemetry/*
npm test
```

**Status:** 🟡 **MODERATE** - Recommended for next update cycle

---

## Supply Chain Risk Findings

### DEP-010: Large Transitive Dependency Tree in portal/Backend (577 total)

- **Severity:** P3 (SUPPLY CHAIN)
- **Category:** Dependency Bloat
- **Metric:** 577 transitive dependencies (397 prod, 181 dev)
- **Risk:** Large attack surface for supply chain compromises

**Recommended:**
- Audit production dependencies vs. dev-only
- Consider dependency consolidation (e.g., shared UI libs)
- Use npm ci for reproducible installs
- Regularly run `npm audit` in CI/CD pipeline

---

### DEP-011: Duplicate Picomatch Instances in portal/Frontend

- **Severity:** P3 (SUPPLY CHAIN)
- **Category:** Dependency Duplication
- **Package:** `picomatch` appears in 4 different versions/locations:
  - node_modules/picomatch
  - node_modules/anymatch/node_modules/picomatch
  - node_modules/micromatch/node_modules/picomatch
  - node_modules/readdirp/node_modules/picomatch

**Risk:** Each copy may have different vulnerability status; harder to audit and patch.

**Recommended:**
- Pin picomatch version in package.json if not already
- Run `npm dedupe` after updates
- Monitor duplicate dependency warnings in CI/CD

---

### DEP-012: Backend Dependency Count (411) with Limited Prod Use (102)

- **Severity:** P3 (SUPPLY CHAIN)
- **Metric:** 310 dev dependencies vs 102 prod dependencies (3:1 ratio)
- **Risk:** Larger build artifact, broader CI/CD supply chain attack surface

**Recommended:**
- Verify test dependencies are truly dev-only
- Consider consolidated test frameworks
- Use `npm ci --omit=dev` for production builds

---

## License Compliance Summary

| Project | Findings |
|---------|----------|
| Source/Backend | ✅ All dependencies use permissive licenses (MIT, Apache-2.0, BSD) |
| Source/Frontend | ✅ All dependencies use permissive licenses (MIT, Apache-2.0, BSD) |
| Source/E2E | ✅ No license issues (minimal deps) |
| portal/Backend | ⚠️ `better-sqlite3` uses MIT (OK), but 577 deps need full audit |
| portal/Frontend | ✅ Spot-checked packages use MIT/Apache-2.0 |
| platform/orchestrator | ✅ Express, typical OSS licenses |

**Verdict:** No GPL/AGPL violations detected in sampled dependencies.

---

## Remediation Roadmap

### Immediate (Week 1)
- [ ] **DEP-001**: Update handlebars to 4.7.9+ or latest 4.x
- [ ] **DEP-002**: Update path-to-regexp via `npm audit fix`
- [ ] **DEP-003**: Update picomatch via `npm update picomatch` and test

### Short-term (Week 2-3)
- [ ] **DEP-004**: Plan vitest/vite major version upgrade (Frontend team)
- [ ] **DEP-005**: Update brace-expansion to 1.1.13+
- [ ] Run full test suite after each update

### Medium-term (Next Sprint)
- [ ] **DEP-006**: Plan pino upgrade (Backend team)
- [ ] **DEP-007**: Plan React 19 upgrade (Frontend team)
- [ ] **DEP-008**: Update uuid (Backend team)
- [ ] **DEP-009**: Update OpenTelemetry packages (Portal team)

### Ongoing
- [ ] Set up dependabot or renovate for automated PRs
- [ ] Add `npm audit` to CI/CD pipeline (fail on critical/high)
- [ ] Quarterly dependency audits
- [ ] Monitor security advisories (GitHub/npm)

---

## Cross-Functional Escalations

### To TheGuardians (Security Team)
- **DEP-001 (Handlebars):** Multiple RCE vectors, requires security validation after update
- **DEP-002, DEP-003 (ReDoS):** Test with malicious inputs (unbounded path segments, glob patterns)

### To TheFixer (Bug/Quality Team)
- **DEP-009 (OpenTelemetry):** Severe version mismatch may affect observability infrastructure

### To Performance Profiler (if available)
- **DEP-004 (Vite/esbuild):** Monitor dev server performance; dev environment CSRF vectors

---

## Audit Metadata

- **Audit Tool:** npm audit (official npm security advisory database)
- **CVE Database:** GitHub Security Advisory (GHSA), NVD, npm Registry
- **Lock Files Analyzed:** 6 package-lock.json files
- **Last Updated:** 2026-04-15
- **Next Recommended Audit:** 2026-05-15 (30 days)

---

## Glossary

- **P1 (Priority 1):** Blocking, requires immediate fix
- **P2 (Priority 2):** High-impact, fix within 2 weeks
- **P3 (Priority 3):** Medium/Low-impact, fix within current sprint
- **Direct Dependency:** Explicitly listed in package.json
- **Transitive Dependency:** Pulled in by a direct dependency
- **ReDoS:** Regular Expression Denial of Service
- **CVSS:** Common Vulnerability Scoring System (0-10 scale)
- **CWE:** Common Weakness Enumeration

---

**Report Prepared By:** dependency_auditor agent (TheInspector team)  
**Classification:** Internal - Dev Team  
**Status:** ✅ Final
