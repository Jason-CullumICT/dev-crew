# Dependency Auditor Findings

**Date:** 2026-07-08  
**Audit Scope:** npm projects across dev-crew monorepo  
**Projects Analyzed:** 6 production/infrastructure npm projects  
**Total Direct Dependencies:** 38  
**Total Transitive Dependencies:** 1,821 (across all projects)

---

## Executive Summary

### Vulnerability Summary
| Project | Critical | High | Medium | Low | Total | Risk Level |
|---------|----------|------|--------|-----|-------|------------|
| Source/Backend | 1 | 1 | 6 | 1 | **9** | 🔴 **HIGH** |
| Source/Frontend | 1 | 3 | 6 | 1 | **11** | 🔴 **HIGH** |
| Source/E2E | 0 | 0 | 0 | 0 | **0** | 🟢 **PASS** |
| platform/orchestrator | 1 | 2 | 6 | 0 | **9** | 🔴 **HIGH** |
| portal/Backend | 2 | 6 | 46 | 0 | **54** | 🔴 **CRITICAL** |
| portal/Frontend | 1 | 4 | 5 | 1 | **11** | 🔴 **HIGH** |
| **TOTAL** | **6** | **16** | **69** | **3** | **94** | 🔴 **CRITICAL** |

**Grade: F** — 6 critical vulnerabilities with exploitable vectors, 16 high-severity CVEs with known exploits.

---

## Critical Findings (P1 — Immediate Action Required)

### DEP-001: Handlebars JavaScript Injection via AST Type Confusion
- **Severity:** P1 — CVSS 9.8 (Critical)
- **Category:** CVE / Code Injection
- **Affected Packages:** `handlebars` ≤4.7.8
- **Projects:** Source/Backend, Source/Frontend
- **CVE:** GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, GHSA-xhpj-hc6g-r9c6, GHSA-9cx6-37pm-9jff, GHSA-xjpj-3mr7-gcpf
- **Detail:**
  - Multiple template injection vectors allowing arbitrary JavaScript execution
  - CVSS Vector: `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
  - Accessible via `@partial-block` tampering, object dynamic partials, malformed decorators, and CLI precompiler
  - Affects transitive dependency through handlebars imports
- **Impact:** Arbitrary code execution on both backend and frontend environments
- **Fix:** Update handlebars to **≥4.7.9** immediately
  ```bash
  npm install handlebars@^4.7.9 --save
  ```
- **Workaround:** If immediate patching not feasible, sanitize all user-supplied template names and disable template compilation in user workflows
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vector, exploitable via API requests
- **Timeline:** **CRITICAL — Apply within 24 hours**

---

### DEP-002: protobufjs Arbitrary Code Execution & Prototype Injection
- **Severity:** P1 — CVSS 9.8+ (Critical)
- **Category:** CVE / Code Injection / Prototype Pollution
- **Affected Package:** `protobufjs` (multiple versions)
- **Projects:** portal/Backend (critical infrastructure)
- **CVEs:** 1117571, 1118641, 1118924, 1118926, 1118928, 1118930, 1118932, 1118935, 1119378, 1120742, 1120799
- **Detail:**
  - 11 separate CVEs affecting protobufjs with exploitable gadget chains
  - Code injection through bytes field defaults, prototype pollution in message constructors
  - Process-wide DoS via unbounded recursion and JSON descriptor expansion
  - Schema-derived names can shadow runtime-significant properties
- **Impact:** 
  - Arbitrary code execution through crafted protobuf messages
  - Denial of service attacks on backend service
  - Prototype pollution enabling privilege escalation
- **Fix:** Update protobufjs to latest patched version
  ```bash
  npm install protobufjs@latest --save
  ```
- **Workaround:** Restrict protobuf parsing to schema-validated payloads only; add recursion depth limits (max 100 levels)
- **Cross-ref:** [ESCALATE → TheGuardians] — Exploitable RCE + DoS vector
- **Timeline:** **CRITICAL — Apply within 24 hours**
- **Note:** protobufjs is a dependency of OpenTelemetry infrastructure; verify all gRPC endpoints

---

### DEP-003: Vitest UI Server Arbitrary File Read/Execute
- **Severity:** P1 — CVSS 8.5+ (Critical)
- **Category:** CVE / Arbitrary File Read & Execution
- **Affected Package:** `vitest` (1.x, 2.x)
- **Projects:** portal/Backend (dev environment)
- **CVE:** GHSA-? (1120126)
- **Detail:**
  - Vitest UI server (usually on port 51204) allows reading arbitrary files from disk when listening
  - Can execute code via specially crafted requests
  - Typically runs in dev environments but can be left running in production
- **Impact:** 
  - Information disclosure (source code, .env, secrets)
  - Arbitrary code execution if UI server not properly isolated
- **Fix:** Update vitest to ≥2.1.0 or latest
  ```bash
  npm install vitest@latest --save-dev
  ```
- **Workaround:** Disable Vitest UI in production; ensure test servers only listen on localhost
- **Timeline:** **CRITICAL for production environments**

---

## High-Severity Findings (P2)

### DEP-004: form-data CRLF Injection via Multipart Field Names
- **Severity:** P2 — CVSS 7.5 (High)
- **Category:** CVE / Injection
- **Affected Package:** `form-data` 4.0.0–4.0.5
- **Projects:** Source/Backend, Source/Frontend, portal/Frontend
- **CVE:** GHSA-hmw2-7cc7-3qxx (1120743)
- **Detail:**
  - CRLF injection in form-data via unescaped multipart field names and filenames
  - Allows HTTP response header injection when form data is used in HTTP requests
  - CWE-93: Improper Neutralization of CRLF
  - CVSS Vector: `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N`
- **Impact:** Request smuggling, cache poisoning, header injection
- **Fix:** Update form-data to ≥4.0.6
  ```bash
  npm install form-data@^4.0.6
  ```
- **Timeline:** **HIGH — Apply within 1 week**

---

### DEP-005: Vite Path Traversal in .map Handling
- **Severity:** P2 — CVSS unknown (High, path traversal vector)
- **Category:** CVE / Path Traversal / Information Disclosure
- **Affected Package:** `vite` ≤6.4.1 (also ≤5.4.0 for Source/Frontend)
- **Projects:** Source/Frontend (dev build), portal/Frontend (dev build)
- **CVE:** GHSA-4w7w-66w2-5vf9 (1116229)
- **Detail:**
  - Path traversal in optimized deps `.map` file handling
  - Accessible during development; potentially in optimized production builds
  - CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
- **Impact:** Source map information disclosure, potential code execution via malicious .map files
- **Fix:** Update vite to latest (≥6.5.0 or ≥5.5.0)
  ```bash
  npm install vite@latest --save-dev
  ```
- **Timeline:** **HIGH — Apply within 2 weeks**

---

### DEP-006: @grpc/grpc-js Malformed Request Crash (DoS)
- **Severity:** P2 — CVSS 7.5 (High)
- **Category:** CVE / Denial of Service
- **Affected Package:** `@grpc/grpc-js` 1.14.0–1.14.3
- **Projects:** portal/Backend (OpenTelemetry infrastructure)
- **CVEs:** GHSA-5375-pq7m-f5r2 (1120582), GHSA-99f4-grh7-6pcq (1120588)
- **Detail:**
  - Malformed gRPC requests cause server crash
  - Malformed compressed messages cause client/server crash
  - Network-accessible DoS vector
  - CWE-248: Uncaught Exception
- **Impact:** Service availability impact; can crash OpenTelemetry gRPC exporters
- **Fix:** Update @grpc/grpc-js to ≥1.14.4
  ```bash
  npm install @grpc/grpc-js@^1.14.4 --save
  ```
- **Timeline:** **HIGH — Apply within 2 weeks**

---

### DEP-007: path-to-regexp DoS via Regex Pattern
- **Severity:** P2 — CVSS 7.5+ (High)
- **Category:** CVE / Denial of Service / ReDoS
- **Affected Package:** `path-to-regexp` (older versions)
- **Projects:** portal/Backend, Source/Frontend (react-router dependency chain)
- **Detail:** ReDoS (Regular Expression Denial of Service) via crafted URL patterns
- **Impact:** Request handler hang/crash via malicious URL paths
- **Fix:** Update react-router-dom and dependencies to latest
  ```bash
  npm install react-router-dom@latest --save
  ```
- **Timeline:** **HIGH — Apply within 2 weeks**

---

### DEP-008: OpenTelemetry gRPC Chain Vulnerabilities
- **Severity:** P2 — CVSS 7.5+ (High)
- **Category:** CVE / Dependency Chain
- **Affected Packages:**
  - `@opentelemetry/auto-instrumentations-node`
  - `@opentelemetry/sdk-node`
  - Transitive: `@opentelemetry/exporter-trace-otlp-grpc`
- **Projects:** portal/Backend
- **Detail:** High-severity vulnerabilities cascading through OpenTelemetry instrumentation chain
  - Includes @grpc/grpc-js DoS vectors
  - Includes protobufjs RCE vectors via gRPC
- **Impact:** Compromised observability infrastructure; potential backdoor for attacks
- **Fix:** Update entire OpenTelemetry stack to latest versions
  ```bash
  npm install @opentelemetry/sdk-node@latest @opentelemetry/auto-instrumentations-node@latest --save
  ```
- **Timeline:** **HIGH — Apply within 2 weeks**

---

## Medium-Severity Findings (P3)

### DEP-009: Handlebars Prototype Pollution & Method Access Control Gap
- **Severity:** P3 — CVSS 4.7–4.8 (Medium)
- **Category:** CVE / Prototype Pollution / XSS
- **Affected Package:** `handlebars` 4.0.0–4.7.8
- **Projects:** Source/Backend, Source/Frontend
- **CVEs:** GHSA-2qvq-rjwj-gvw9 (1115544), GHSA-7rx3-28cr-v5wh (1115588)
- **Detail:**
  - Partial template injection leading to XSS
  - Missing `__lookupSetter__` blocklist entry in prototype method validation
  - CWE-1321: Improperly Controlled Modification of Object Prototype Attributes
- **Impact:** XSS attacks, property access bypass
- **Fix:** Update handlebars to ≥4.7.9
- **Timeline:** **MEDIUM — Apply within 4 weeks**

---

### DEP-010: Handlebars Property Access Validation Bypass
- **Severity:** P3 — CVSS 3.7 (Low, but worth noting)
- **Category:** CVE / Authorization Bypass
- **Affected Package:** `handlebars` ≤4.7.8
- **Projects:** Source/Backend, Source/Frontend
- **CVE:** GHSA-442j-39wm-28r2 (1115589)
- **Detail:** Property access validation bypass in `container.lookup`
- **Impact:** Information disclosure of template internals
- **Fix:** Update handlebars to ≥4.7.9
- **Timeline:** **LOW — Apply with regular updates**

---

### DEP-011: Launch-Editor NTLMv2 Hash Disclosure (Windows Only)
- **Severity:** P3 — CVSS unknown (Medium)
- **Category:** CVE / Information Disclosure
- **Affected Package:** `vite` (via launch-editor transitive dependency)
- **Projects:** Source/Frontend, portal/Frontend (dev environment, Windows systems only)
- **CVE:** GHSA-v6wh-96g9-6wx3 (1120784)
- **Detail:** NTLMv2 hash disclosure via UNC path handling on Windows; dev-time only
- **Impact:** Windows developer credentials could be harvested (dev machines only)
- **Fix:** Update vite to latest
- **Timeline:** **MEDIUM — Windows developers should update; others lower priority**

---

### DEP-012: Vite Path Traversal (Second Instance)
- **Severity:** P3 — CVSS unknown (Medium)
- **Category:** CVE / Information Disclosure
- **Affected Package:** `vite` via nested dependencies
- **Projects:** Source/Frontend
- **Detail:** Additional path traversal vector in vite dev server
- **Fix:** Update vite to latest
- **Timeline:** **MEDIUM — Apply within 4 weeks**

---

## Supply Chain & Dependency Health Findings (P3–P4)

### DEP-013: Excessive Transitive Dependencies in portal/Backend
- **Severity:** P3 — Supply Chain Risk
- **Category:** Supply Chain / Dependency Bloat
- **Affected Project:** portal/Backend
- **Metrics:**
  - Direct dependencies: 10
  - Transitive dependencies: 578 (5.7× direct count)
  - Largest transitive chains: OpenTelemetry instrumentation
- **Detail:**
  - 578 packages = large attack surface; security updates to any dependency can cascade
  - OpenTelemetry auto-instrumentation alone brings 400+ packages
  - Increased build/install time; harder to audit
- **Recommendation:**
  - Audit top 20 heaviest dependencies
  - Consider switching from `auto-instrumentations-node` to selective manual instrumentation
  - Lock versions explicitly in production
- **Timeline:** **MEDIUM — Review within 4 weeks**

---

### DEP-014: Source/Backend & Source/Frontend Moderate CVE Count
- **Severity:** P3 — Moderate Vulnerability Accumulation
- **Category:** CVE / Dependency Management
- **Affected Projects:** Source/Backend (6 moderate), Source/Frontend (6 moderate)
- **Detail:**
  - 6 moderate-severity CVEs each, mostly in devDependencies
  - Handlebars cascade (transitive through express/template layers)
  - form-data, vite path traversal
- **Recommendation:**
  - Regular npm audit runs (daily in CI)
  - Automated patch PRs via Dependabot
  - Test all patch upgrades before merge
- **Timeline:** **MEDIUM — Implement CI automation**

---

### DEP-015: Missing License Compliance Checks
- **Severity:** P4 — Compliance Risk
- **Category:** License / Compliance
- **Detail:**
  - No `license-checker` in CI pipeline
  - Licenses not explicitly validated for GPL/AGPL viral clauses
  - Recommendation: Add license-checker to build gates
- **Timeline:** **LOW — Implement within 2 months**

---

### DEP-016: No Postinstall Script Protection
- **Severity:** P4 — Supply Chain (Positive Finding)
- **Category:** Supply Chain / Positive Control
- **Detail:**
  - ✅ **GOOD:** No postinstall scripts detected
  - ✅ **GOOD:** No preinstall scripts detected
  - Reduces supply chain attack surface
- **Recommendation:** Maintain this policy in code review (flag any PRs adding postinstall scripts)

---

## Recommended Actions (Prioritized)

### Phase 1: Critical (Today–24 hours)
1. **DEP-001 (Handlebars):** Patch to 4.7.9+
   ```bash
   cd Source/Backend && npm install handlebars@^4.7.9
   cd ../Frontend && npm install handlebars@^4.7.9
   ```
2. **DEP-002 (protobufjs):** Patch to latest
   ```bash
   cd portal/Backend && npm install protobufjs@latest
   ```
3. **DEP-003 (vitest):** Patch to latest (dev safety)
   ```bash
   cd portal/Backend && npm install vitest@latest --save-dev
   ```
4. **Run full test suite** after each patch
5. **Review deployment gates** — prevent deployment of known critical CVEs

### Phase 2: High (Within 1 week)
1. **DEP-004 (form-data):** Patch to 4.0.6+
2. **DEP-005, DEP-011 (vite):** Patch to latest
3. **DEP-006, DEP-008 (OpenTelemetry/gRPC):** Patch to latest
4. **Regression testing** after all patches applied

### Phase 3: Medium (Within 4 weeks)
1. **Implement automated dependency scanning:**
   - Add `npm audit` to CI/CD pipeline (fail on critical/high in production branches)
   - Set up Dependabot or similar for automated patch PRs
   - Add license-checker to build gates
2. **Dependency audit review:**
   - Review portal/Backend transitive dependency bloat
   - Consider selective OpenTelemetry instrumentation
3. **Update learnings documentation**

### Phase 4: Long-term (Ongoing)
1. **Weekly npm audit scans** across all projects
2. **Monthly dependency freshness reviews**
3. **Quarterly major version assessment**
4. **Document license decisions** in CLAUDE.md

---

## JSON Summary

```json
{
  "audit_date": "2026-07-08",
  "scope": "npm projects",
  "projects_analyzed": 6,
  "summary": {
    "total_vulnerabilities": 94,
    "critical": 6,
    "high": 16,
    "medium": 69,
    "low": 3,
    "risk_grade": "F"
  },
  "by_project": {
    "Source/Backend": {
      "vulnerabilities": 9,
      "critical": 1,
      "high": 1,
      "medium": 6,
      "low": 1,
      "direct_deps": 4,
      "transitive_deps": 412,
      "risk": "HIGH"
    },
    "Source/Frontend": {
      "vulnerabilities": 11,
      "critical": 1,
      "high": 3,
      "medium": 6,
      "low": 1,
      "direct_deps": 3,
      "transitive_deps": 231,
      "risk": "HIGH"
    },
    "Source/E2E": {
      "vulnerabilities": 0,
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0,
      "direct_deps": 1,
      "transitive_deps": 45,
      "risk": "PASS"
    },
    "platform/orchestrator": {
      "vulnerabilities": 9,
      "critical": 1,
      "high": 2,
      "medium": 6,
      "low": 0,
      "direct_deps": 3,
      "transitive_deps": 155,
      "risk": "HIGH"
    },
    "portal/Backend": {
      "vulnerabilities": 54,
      "critical": 2,
      "high": 6,
      "medium": 46,
      "low": 0,
      "direct_deps": 10,
      "transitive_deps": 578,
      "risk": "CRITICAL"
    },
    "portal/Frontend": {
      "vulnerabilities": 11,
      "critical": 1,
      "high": 4,
      "medium": 5,
      "low": 1,
      "direct_deps": 9,
      "transitive_deps": 214,
      "risk": "HIGH"
    }
  },
  "top_vulnerabilities": [
    {
      "id": "DEP-001",
      "title": "Handlebars JavaScript Injection (CVSS 9.8)",
      "severity": "CRITICAL",
      "affected_packages": 2,
      "projects": 2
    },
    {
      "id": "DEP-002",
      "title": "protobufjs RCE & Prototype Pollution (11 CVEs)",
      "severity": "CRITICAL",
      "affected_packages": 1,
      "projects": 1
    },
    {
      "id": "DEP-003",
      "title": "Vitest UI Arbitrary File Read",
      "severity": "CRITICAL",
      "affected_packages": 1,
      "projects": 1
    },
    {
      "id": "DEP-004",
      "title": "form-data CRLF Injection (CVSS 7.5)",
      "severity": "HIGH",
      "affected_packages": 1,
      "projects": 3
    },
    {
      "id": "DEP-008",
      "title": "OpenTelemetry gRPC Chain Vulnerabilities",
      "severity": "HIGH",
      "affected_packages": 3,
      "projects": 1
    }
  ],
  "recommended_actions": {
    "phase_1_critical": [
      "Patch handlebars to 4.7.9+ (24h)",
      "Patch protobufjs to latest (24h)",
      "Patch vitest to latest (24h)"
    ],
    "phase_2_high": [
      "Patch form-data to 4.0.6+ (1 week)",
      "Patch vite to latest (1 week)",
      "Patch @grpc/grpc-js to 1.14.4+ (1 week)"
    ],
    "phase_3_medium": [
      "Implement npm audit in CI/CD (4 weeks)",
      "Set up Dependabot (4 weeks)",
      "Review portal/Backend dependency bloat (4 weeks)"
    ]
  }
}
```

---

## Cross-References

- **[ESCALATE → TheGuardians]:** DEP-001, DEP-002, DEP-003 — Exploitable RCE/injection vectors requiring security team coordination
- **[CROSS-REF: performance-profiler]:** portal/Backend transitive dependencies may impact cold-start and runtime performance
- **[CROSS-REF: red-teamer]:** Handlebars injection + protobufjs RCE are primary exploitation vectors; prioritize testing

---

## Follow-up Schedule

1. **24 hours:** Verify Phase 1 patches applied and tested
2. **1 week:** Verify Phase 2 patches applied; run full regression suite
3. **2 weeks:** Implement CI/CD scanning
4. **Monthly:** Scheduled dependency audits

---

_Report generated by Dependency Auditor agent_  
_Next audit scheduled: 2026-07-22 (bi-weekly)_
