# Dependency Auditor Findings
**Run Date:** 2026-05-13  
**Scope:** All npm packages (Backend, Frontend, E2E, Portal, Orchestrator)  
**Status:** ⚠️ **CRITICAL FINDINGS DETECTED**

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Projects Audited** | 6 (npm) |
| **Critical Vulnerabilities** | 2 |
| **High Vulnerabilities** | 4 |
| **Moderate Vulnerabilities** | 22 |
| **Total Vulnerabilities** | 28 |
| **Total Dependencies** | 1,831 |
| **Outdated Major Versions** | 11 |

### Risk Assessment by Severity
- **P1 (Critical)**: 2 findings - **IMMEDIATE ACTION REQUIRED**
- **P2 (High)**: 4 findings - **URGENT**
- **P3 (Moderate)**: 22 findings - **PLAN REMEDIATION**

---

## Critical Vulnerabilities (P1)

### DEP-001: Handlebars.js - Multiple JavaScript Injection Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Arbitrary Code Execution
- **Package:** `handlebars@4.7.8` (current: 4.7.8, vulnerable: >=4.0.0 <=4.7.8)
- **File:** `Source/Backend/package.json` (transitive dependency)
- **Direct Dependency:** No (transitive)
- **Affected Modules:** 
  - Source/Backend: 411 total dependencies, 102 direct prod deps
  
**Detail:**
Handlebars.js versions >=4.0.0 <=4.7.8 contain multiple critical code injection vulnerabilities via AST Type Confusion:

| CVE ID | Type | Severity | Impact |
|--------|------|----------|--------|
| GHSA-2w6w-674q-4c4q | JavaScript Injection via AST Type Confusion | CRITICAL (9.8 CVSS) | Remote Code Execution |
| GHSA-3mfm-83xf-c92r | JavaScript Injection via @partial-block tampering | HIGH (8.1 CVSS) | Code Execution |
| GHSA-xhpv-hc6g-r9c6 | JavaScript Injection via dynamic partial objects | HIGH (8.1 CVSS) | Code Execution |
| GHSA-xjpj-3mr7-gcpf | CLI Precompiler JavaScript Injection | HIGH (8.2 CVSS) | Privilege Escalation |
| GHSA-9cx6-37pm-9jff | Denial of Service via Decorator Syntax | HIGH (7.5 CVSS) | DoS |
| GHSA-2qvq-rjwj-gvw9 | Prototype Pollution → XSS via Partial Template | MODERATE (4.7 CVSS) | Information Disclosure |
| GHSA-7rx3-28cr-v5wh | Prototype Method Access Control Gap | MODERATE (4.8 CVSS) | Access Bypass |
| GHSA-442j-39wm-28r2 | Property Access Validation Bypass | LOW (3.7 CVSS) | Access Bypass |

**Root Cause:** Handlebars template engine fails to properly validate AST node types during template compilation, allowing attackers to inject arbitrary JavaScript code through specially crafted template syntax.

**Exploit Scenario:** 
If Source/Backend processes user-supplied template data (e.g., dynamic work item descriptions, assessment templates), an attacker could inject malicious JavaScript that executes in the Node.js process with full access to the server's runtime.

**Fix:**
```bash
cd Source/Backend
npm update handlebars
```
**Target Version:** 4.7.9 or later (or 4.8.x when available)

**Verification:**
```bash
npm audit | grep handlebars  # Should show 0 vulnerabilities
```

**Cross-Ref:** [ESCALATE → TheGuardians] - Arbitrary code execution in template processing. If work item content can be templated, this is exploitable.

---

### DEP-002: protobufjs - Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Code Injection
- **Package:** `protobufjs@<=7.5.5`
- **Files:** 
  - `platform/orchestrator/package.json` (transitive via dockerode)
  - `portal/Backend/package.json` (transitive via OpenTelemetry)
- **Affected Modules:** 2 (orchestrator, portal/backend)
- **Dependency Count:** 155 (orchestrator), 577 (portal/backend)

**Detail:**
protobufjs <=7.5.5 is vulnerable to arbitrary code execution via unsafe code generation during `.proto` file processing. Multiple attack vectors identified:

| CVE ID | Type | CVSS | Attack Vector |
|--------|------|------|----------------|
| GHSA-xq3m-2v4x-88gg | Arbitrary Code Execution | 9.8 CRITICAL | Direct code generation |
| GHSA-66ff-xgx4-vchm | Code Injection via bytes field defaults | - HIGH | Generated code |
| GHSA-75px-5xx7-5xc7 | Code generation gadget (prototype pollution) | 8.1 HIGH | Indirect injection |
| GHSA-jvwf-75h9-cwgg | Process-wide DoS via unsafe option paths | 7.5 HIGH | Prototype pollution |
| GHSA-685m-2w69-288q | Unbounded protobuf recursion DoS | 7.5 HIGH | Denial of Service |
| GHSA-q6x5-8v7m-xcrf | Overlong UTF-8 decoding | 5.3 MODERATE | Data validation bypass |
| GHSA-2pr8-phx7-x9h3 | Denial of service via field names | 5.3 MODERATE | DoS via malformed input |
| GHSA-fx83-v9x8-x52w | Prototype injection in constructors | 5.3 MODERATE | Prototype pollution |

**Root Cause:** 
1. Unsafe dynamic code generation during proto schema compilation
2. Inadequate input validation for protobuf message field names
3. Unprotected prototype chain manipulation in generated constructors

**Exploit Scenario for Orchestrator:** 
If the orchestrator accepts user-supplied `.proto` schemas (unlikely but verify), attacker can inject arbitrary JavaScript into generated code.

**Exploit Scenario for Portal/Backend:** 
OpenTelemetry exporters may process untrusted protobuf data. A malicious exporter response or man-in-the-middle attack could execute arbitrary code.

**Fix:**
```bash
cd platform/orchestrator && npm update protobufjs
cd portal/Backend && npm update
```
**Target Version:** 7.6.0 or later (or 8.x if available)

**Note:** Check if orchestrator/portal directly use protobufjs or if it's only transitive. If transitive, upgrade parent packages to pull fixed versions.

**Cross-Ref:** [ESCALATE → TheGuardians] - This is a supply chain vulnerability affecting both infrastructure (orchestrator) and application (portal). Immediate patching required.

---

## High Vulnerabilities (P2)

### DEP-003: path-to-regexp - Regular Expression Denial of Service (ReDoS)
- **Severity:** P2 (HIGH)
- **Category:** CVE - DoS via ReDoS
- **Package:** `path-to-regexp@<0.1.13`
- **Files:**
  - `platform/orchestrator/package.json` (transitive via Express)
  - `portal/Backend/package.json` (transitive via Express)
- **Affected Modules:** 2
- **CVSS:** 7.5 (High)

**Detail:**
path-to-regexp <0.1.13 is vulnerable to ReDoS attacks when processing route patterns with multiple parameters. A specially crafted URL path can cause exponential backtracking in regex matching, consuming CPU and memory.

**CVE:** GHSA-37ch-88jc-xwx2  
**CWE:** CWE-1333 (Inefficient Regular Expression Complexity)

**Exploit Pattern:**
```
GET /api/[param1]/[param2]/[param3]/[param4]...[paramN]?a=b&a=c&a=d...
```
Can trigger ReDoS in Express route matching, causing 100% CPU spike and request timeout.

**Impact:** 
- Denial of Service (HTTP 503 timeouts)
- Backend becomes unresponsive during attack
- No impact on data confidentiality or integrity

**Fix:**
```bash
cd platform/orchestrator && npm update express path-to-regexp
cd portal/Backend && npm update express path-to-regexp
```
**Target Version:** path-to-regexp >=0.1.13 (Express should pull this automatically)

**Cross-Ref:** [CROSS-REF: red-teamer] - Exploitable DoS vector on Express endpoints.

---

### DEP-004: @opentelemetry/auto-instrumentations-node - Prometheus Exporter Crash
- **Severity:** P2 (HIGH)
- **Category:** CVE - Denial of Service
- **Package:** `@opentelemetry/auto-instrumentations-node@<=0.74.0`
- **File:** `portal/Backend/package.json`
- **CVSS:** 7.5 (High)
- **Affected:** 1 module (portal/Backend)

**Detail:**
OpenTelemetry auto-instrumentation exposes a Prometheus exporter HTTP endpoint that crashes when receiving malformed HTTP requests. A malformed request (e.g., invalid header encoding, oversized payload) will crash the Node.js process.

**CVE:** GHSA-q7rr-3cgh-j5r3

**Exploit Pattern:**
```bash
# Malformed HTTP request to /metrics endpoint
telnet localhost:9464
GET /metrics HTTP/1.1\r\n
[send invalid headers]\r\n\r\n
```

**Impact:** Process crash → service outage, complete loss of Prometheus metrics

**Fix:**
```bash
cd portal/Backend
npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node
```
**Target Versions:**
- `@opentelemetry/auto-instrumentations-node@>=0.75.0`
- `@opentelemetry/sdk-node@>=0.217.0`

---

### DEP-005: picomatch - ReDoS via Extglob Quantifiers
- **Severity:** P2 (HIGH)
- **Category:** CVE - Denial of Service
- **Package:** `picomatch@<=2.3.1 or 4.0.0-4.0.3`
- **File:** `portal/Frontend/package.json`
- **CVSS:** 7.5 (High)
- **Affected:** 1 module (portal/Frontend dev deps)

**Detail:**
picomatch (minimatch-like glob matching) is vulnerable to ReDoS when processing patterns with extglob quantifiers (e.g., `!(pattern)+`, `?(pattern)*`). Primarily affects build-time tools (Vite, Vitest), not runtime.

**CVE:** GHSA-c2c7-rcm5-vvqj, GHSA-3v7f-55p6-f55p

**Impact:**
- Slow build times, potential CI/CD timeout
- Not exploitable at runtime (affects build tools only)

**Fix:**
```bash
cd portal/Frontend
npm update picomatch
```
**Target Version:** >=2.3.2 (latest)

---

## Moderate Vulnerabilities (P3)

### DEP-006: Vite - Path Traversal in `.map` Handling
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Information Disclosure
- **Package:** `vite@<=6.4.1`
- **Files:** 
  - `Source/Frontend/package.json`
  - `portal/Frontend/package.json`
- **CVSS:** Not scored, but CWE-22 (Path Traversal) + CWE-200 (Info Disclosure)
- **Affected:** 2 modules

**Detail:**
Vite's optimized deps `.map` file handling is vulnerable to path traversal. Dev server could serve source maps outside intended directory.

**CVE:** GHSA-4w7w-66w2-5vf9

**Impact:** Source code disclosure during development (not production-critical for SPA)

**Fix:**
```bash
cd Source/Frontend && npm update vite
cd portal/Frontend && npm update vite
```
**Target Version:** >=5.0.0 or >=6.4.2+

---

### DEP-007: esbuild - Development Server CORS Bypass
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Cross-Origin Request Forgery
- **Package:** `esbuild@<=0.24.2`
- **Files:** 
  - `Source/Frontend/package.json`
  - `portal/Frontend/package.json`
  - `portal/Backend/package.json` (transitive)
- **CVSS:** 5.3 (Moderate)
- **CWE:** CWE-346 (Origin Validation Error)
- **Affected:** 3 modules

**Detail:**
esbuild development server does not properly validate origin headers, allowing any website to send requests to the dev server and read responses. Affects development environment only.

**Impact:**
- Dev server information disclosure
- CORS bypass during local development
- Not a production risk

**Fix:**
```bash
npm update esbuild  # Via vite/vitest dependency updates
```

---

### DEP-008: PostCSS - XSS via Unescaped `</style>` Tags
- **Severity:** P3 (MODERATE)
- **Category:** CVE - XSS
- **Package:** `postcss@<8.5.10`
- **Files:** 
  - `portal/Frontend/package.json` (direct)
  - `Source/Frontend/package.json` (transitive)
  - `portal/Backend/package.json` (transitive)
- **CVSS:** 6.1 (Moderate)
- **CWE:** CWE-79 (Cross-site Scripting)
- **Affected:** 3 modules

**Detail:**
PostCSS's stringify output fails to properly escape `</style>` sequences, allowing XSS injection if CSS is dynamically generated from user input.

**CVE:** GHSA-qx2v-qp2m-jg93

**Impact:**
- If user-supplied CSS is processed and returned in HTML, XSS possible
- Dev-time only issue (affect build output)

**Fix:**
```bash
npm update postcss
```
**Target Version:** >=8.5.10

---

### DEP-009: brace-expansion - Process Hang via Zero-Step Sequences
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Denial of Service
- **Package:** `brace-expansion@<1.1.13`
- **File:** `Source/Backend/package.json` (transitive)
- **CVSS:** 6.5 (Moderate)
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **Affected:** 1 module

**Detail:**
brace-expansion (used in glob matching) hangs the process when given zero-step sequences like `{a..b}` with invalid range.

**CVE:** GHSA-f886-m6hf-6m8v

**Impact:**
- Process hang on malformed glob patterns
- Application becomes unresponsive

**Fix:**
```bash
cd Source/Backend && npm update brace-expansion
```
**Target Version:** >=1.1.13

---

### DEP-010: Vitest & Vite (Transitive) - Multiple Moderate Issues
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Multiple (esbuild, vite transitive)
- **Packages:** 
  - `vitest@<=2.0.5` (Source/Frontend)
  - `vitest@<=1.4.0` (portal/Frontend)
  - `vitest@<=2.2.0-beta.2` (portal/Backend)
- **Impact:** Build-time and dev-time only, not production
- **Affected:** 3 modules

**Fix:**
```bash
npm update vitest
```

---

## Outdated Major Versions (P3)

### DEP-011: Express - 1+ Major Versions Behind
| Module | Current | Latest | Majors Behind | Risk |
|--------|---------|--------|---------------|------|
| Source/Backend | ^4.18.2 | 5.2.1 | 1 | P3 - Likely missing security patches |
| platform/orchestrator | ^4.21.0 | 5.2.1 | 1 | P3 - Infrastructure component |
| portal/Backend | ^4.18.2 | 5.2.1 | 1 | P3 - Likely missing security patches |

**Recommendation:** Upgrade to Express 5.x (breaking changes to review), or at least to 4.21.x for security patches.

---

### DEP-012: Pino - 2+ Major Versions Behind
| Module | Current | Latest | Majors Behind |
|--------|---------|--------|---------------|
| Source/Backend | ^8.17.0 | 10.3.1 | 2 |
| portal/Backend | ^10.3.1 | 10.3.1 | 0 ✓ |

**Recommendation:** Upgrade Source/Backend Pino to 10.x.

---

### DEP-013: UUID - 5+ Major Versions Behind
| Module | Current | Latest | Majors Behind |
|--------|---------|--------|---------------|
| Source/Backend | ^9.0.0 | 14.0.0 | 5 |
| portal/Backend | ^9.0.0 | 14.0.0 | 5 |

**Recommendation:** Upgrade to UUID 14.x (major version updates should be safe for UUID generation library).

---

### DEP-014: React Ecosystem - Multiple Outdated
| Package | Module | Current | Latest | Gap |
|---------|--------|---------|--------|-----|
| react | Source/Frontend | ^18.3.1 | 19.x | 1 major |
| react | portal/Frontend | ^18.2.0 | 19.x | 1 major |
| react-router-dom | Source/Frontend | ^6.26.0 | Latest | Check |
| react-router-dom | portal/Frontend | ^6.22.0 | Latest | Check |

**Recommendation:** React 19.x is stable and recommended for new features. Plan major version upgrade.

---

## Supply Chain & Dependency Health

### Total Dependency Counts
| Module | Direct | Transitive | Total | Risk Level |
|--------|--------|-----------|-------|-----------|
| Source/Backend | 4 | 107 | 411 | ⚠️ MODERATE (102 prod deps) |
| Source/Frontend | 3 | 227 | 230 | ⚠️ MODERATE (9 prod deps, 222 dev) |
| Source/E2E | 1 | 3 | 4 | ✓ LOW |
| platform/orchestrator | 3 | 152 | 155 | ⚠️ MODERATE (153 prod deps) |
| portal/Frontend | 3 | 421 | 424 | ⚠️ HIGH (424 dev deps) |
| portal/Backend | 11 | 566 | 577 | ⚠️ HIGH (577 total deps) |

**Summary:**
- **Largest dependency trees:** portal/Backend (577), portal/Frontend (424)
- **Most production dependencies:** portal/Backend (397)
- **No duplicate major versions detected** ✓

---

## License Compliance

**Status:** Not audited in this run (npm license-checker not installed).

**Recommendation:** 
```bash
npx license-checker --json > license-report.json
```

Run after fixing critical CVEs. Flag any GPL/AGPL licenses if project is closed-source.

---

## Remediation Roadmap

### Phase 1: IMMEDIATE (Next 24 hours)
**Blockers for production deployment:**

1. **DEP-001 (Handlebars)** - Source/Backend
   - Action: `npm update handlebars`
   - Verify: `npm audit | grep handlebars`
   
2. **DEP-002 (protobufjs)** - orchestrator, portal/Backend
   - Action: `npm update protobufjs` (in both modules)
   - Verify: `npm audit | grep protobufjs`

### Phase 2: URGENT (This sprint)
**Deployed components with high risk:**

3. **DEP-003 (path-to-regexp)** - orchestrator, portal/Backend
   - Action: `npm update express`
   
4. **DEP-004 (@opentelemetry)** - portal/Backend
   - Action: `npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node`

### Phase 3: PLANNED (Next quarter)
**Deprecation and version upgrades:**

5. Major version upgrades (Express 5.x, React 19.x, Pino 10.x)
6. Dependency inventory & optimization (too many dev deps)

---

## Cross-Team Escalations

### [ESCALATE → TheGuardians]
- **DEP-001:** Handlebars RCE - verify if work item descriptions/templates are processed with Handlebars
- **DEP-002:** protobufjs RCE - orchestrator is infrastructure, may need special deployment process

### [CROSS-REF: red-teamer]
- **DEP-003:** path-to-regexp ReDoS - explore Denial of Service attack surface on route matching
- **DEP-004:** OpenTelemetry crash - test malformed requests to metrics endpoint
- **DEP-005:** picomatch ReDoS - check if build-time glob patterns can be attacker-controlled

---

## Verification Checklist

- [ ] Run `npm audit` in all 6 modules — should show 0 critical, 0 high after Phase 1
- [ ] Run traceability enforcer: `python3 tools/traceability-enforcer.py`
- [ ] Run full test suite to verify no breaking changes from updates
- [ ] Manual testing of Express routes after Express update
- [ ] Verify OpenTelemetry metrics endpoint stability after upgrade

---

## Dashboard Metrics

```json
{
  "audit_date": "2026-05-13",
  "modules_scanned": 6,
  "vulnerabilities": {
    "critical": 2,
    "high": 4,
    "moderate": 22,
    "low": 0,
    "total": 28
  },
  "dependency_stats": {
    "total_dependencies": 1831,
    "production_dependencies": 667,
    "development_dependencies": 1164
  },
  "outdated_packages": {
    "major_versions_behind": 11,
    "recommendations": 5
  },
  "risk_level": "HIGH",
  "next_action": "Fix critical vulnerabilities in handlebars and protobufjs"
}
```

---

## Appendix: Full Vulnerability Index

| ID | Package | Severity | CVE | Module | Status |
|----|---------|-----------|----|--------|--------|
| DEP-001 | handlebars | CRITICAL | GHSA-2w6w-674q-4c4q | Source/Backend | PENDING |
| DEP-002 | protobufjs | CRITICAL | GHSA-xq3m-2v4x-88gg | orchestrator, portal/Backend | PENDING |
| DEP-003 | path-to-regexp | HIGH | GHSA-37ch-88jc-xwx2 | orchestrator, portal/Backend | PENDING |
| DEP-004 | @opentelemetry/auto-instrumentations-node | HIGH | GHSA-q7rr-3cgh-j5r3 | portal/Backend | PENDING |
| DEP-005 | picomatch | HIGH | GHSA-c2c7-rcm5-vvqj | portal/Frontend | PENDING |
| DEP-006 | vite | MODERATE | GHSA-4w7w-66w2-5vf9 | Source/Frontend, portal/Frontend | PENDING |
| DEP-007 | esbuild | MODERATE | GHSA-67mh-4wv8-2f99 | Source/Frontend, portal/Frontend, portal/Backend | PENDING |
| DEP-008 | postcss | MODERATE | GHSA-qx2v-qp2m-jg93 | Source/Frontend, portal/Frontend, portal/Backend | PENDING |
| DEP-009 | brace-expansion | MODERATE | GHSA-f886-m6hf-6m8v | Source/Backend | PENDING |
| DEP-010 | vitest | MODERATE | (multiple transitive) | Source/Frontend, portal/Frontend, portal/Backend | PENDING |
| DEP-011 | express | MODERATE | (outdated) | Source/Backend, orchestrator, portal/Backend | PENDING |
| DEP-012 | pino | MODERATE | (outdated) | Source/Backend | PENDING |
| DEP-013 | uuid | MODERATE | (outdated) | Source/Backend, portal/Backend | PENDING |
| DEP-014 | react ecosystem | MODERATE | (outdated) | Source/Frontend, portal/Frontend | PENDING |

---

**Report prepared by:** Dependency Auditor Agent  
**Grade:** D (2 critical, 4 high findings)  
**Next Review:** 2026-05-20 (post-remediation)
