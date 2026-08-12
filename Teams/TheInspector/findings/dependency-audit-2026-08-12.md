# Dependency Auditor Findings — 2026-08-12

**Run Date:** 2026-08-12  
**Scope:** All npm package manifests in Source/, portal/, and platform/  
**Total Packages Audited:** 6 manifest files (Backend, Frontend, E2E, portal, platform)

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| **Critical CVEs** | 3 | 🔴 Action Required |
| **High CVEs** | 13 | 🔴 Action Required |
| **Moderate CVEs** | 26 | 🟡 Review Required |
| **Low CVEs** | 2 | 🟢 Monitor |
| **Outdated Major Versions** | 5 | 🟡 Consider Upgrading |
| **Total Vulnerabilities** | 44 | — |

---

## Package Managers Detected
- **npm** (all 6 manifests)
- Direct dependencies: 31 across all projects
- Transitive dependencies: 1,465+ total

---

## Findings by Severity

### DEP-001: Vitest Arbitrary File Execution (Critical)

**Severity:** P1 (Critical)  
**Category:** CVE  
**Packages:** `vitest` (v2.0.5, v3.2.5, v<=3.2.5)  
**Affected Manifests:**
- Source/Frontend (package.json)
- portal/Backend (package-lock.json)
- platform/orchestrator (package-lock.json)

**CVE Details:**
- **ID:** GHSA-5xrq-8626-4rwp
- **CVSS Score:** 9.8 (Critical)
- **Description:** When Vitest UI server is listening, arbitrary files can be read and executed without authentication or user interaction
- **Affected Range:** `<3.2.6`
- **CWE:** CWE-862 (Missing Authorization)

**Impact:**
- If Vitest UI is exposed (default on dev servers), attackers can read arbitrary files from the filesystem and execute arbitrary code
- In development environments, this could lead to credential theft or full system compromise
- Potential for supply chain attacks if CI/CD environments expose the UI

**Fix:**
```bash
# Source/Frontend
npm install vitest@latest

# portal/Backend & platform/orchestrator
npm update vitest
```

**Verification:**
```bash
npm list vitest | grep -E "3\.[2-9]\.[6-9]|[4-9]\."
```

**Cross-ref:** [ESCALATE → TheGuardians] — RCE via exposed development server

---

### DEP-002: Protobufjs Arbitrary Code Execution (Critical)

**Severity:** P1 (Critical)  
**Category:** CVE  
**Package:** `protobufjs` (transitive in portal/Backend)  
**Affected Manifests:**
- portal/Backend (package-lock.json)

**CVE Details:**
- **ID:** GHSA-xq3m-2v4x-88gg
- **CVSS Score:** 9.8 (Critical)
- **Description:** Arbitrary code execution in protobufjs when parsing untrusted .proto files or JSON
- **Affected Range:** `<7.5.5`
- **CWE:** CWE-94 (Code Injection)

**Impact:**
- Any endpoint that deserializes protocol buffers from untrusted sources can be exploited
- Complete system compromise possible
- Often present in microservice architectures as transitive dependency

**Fix:**
```bash
npm update protobufjs
```

**Verification:**
```bash
npm list protobufjs | grep -E "7\.[5-9]\.[5-9]|[8-9]\."
```

**Cross-ref:** [ESCALATE → TheGuardians] — Code injection in proto deserialization

---

### DEP-003: Handlebars JavaScript Injection RCE (Critical)

**Severity:** P1 (Critical)  
**Category:** CVE  
**Package:** `handlebars` (v4.7.8 and below, transitive in Source/Backend)  
**Affected Manifests:**
- Source/Backend (package-lock.json)

**CVE Details:**
- **ID:** GHSA-2w6w-674q-4c4q (primary), plus 7 additional CVEs
- **CVSS Score:** 9.8 (Critical)
- **Description:** Multiple vectors for JavaScript injection via AST type confusion:
  - Type confusion via `@partial-block`
  - Dynamic partial injection
  - Malformed decorator syntax DoS
  - Prototype pollution via partial template injection
  - CLI precompiler unescaped names/options
- **Affected Range:** `>=4.0.0 <=4.7.8`
- **CWE:** CWE-94, CWE-843 (Code Injection / Type Confusion)

**Impact:**
- Complete code execution on the server
- Can bypass sandbox protections in template evaluation
- Exploitable even with user-controlled template data

**Fix:**
```bash
npm update handlebars
# or if handlebars is dev-only:
npm update
```

**Verification:**
```bash
npm list handlebars | grep -E "4\.[789]\.[0-9]|[5-9]\."
```

**Details:** 8 distinct vulnerabilities in handlebars 4.0.0 - 4.7.8:
1. AST Type Confusion RCE (GHSA-2w6w-674q-4c4q, CVSS 9.8)
2. @partial-block Type Confusion (GHSA-3mfm-83xf-c92r, CVSS 8.1)
3. Dynamic partial object injection (GHSA-xhpv-hc6g-r9c6, CVSS 8.1)
4. Malformed decorator DoS (GHSA-9cx6-37pm-9jff, CVSS 7.5)
5. CLI precompiler injection (GHSA-xjpj-3mr7-gcpf, CVSS 8.2)
6. Prototype pollution via partials (GHSA-2qvq-rjwj-gvw9, CVSS 4.7)
7. __lookupSetter__ bypass (GHSA-7rx3-28cr-v5wh, CVSS 4.8)
8. container.lookup bypass (GHSA-442j-39wm-28r2, CVSS 3.7)

**Cross-ref:** [ESCALATE → TheGuardians] — Template injection leading to RCE

---

### DEP-004: Brace-Expansion DoS (High)

**Severity:** P2 (High)  
**Category:** CVE  
**Package:** `brace-expansion` (<1.1.16, transitive)  
**Affected Manifests:**
- Source/Backend
- Source/Frontend

**CVE Details:**
- **ID:** GHSA-3jxr-9vmj-r5cp (primary), GHSA-f886-m6hf-6m8v (secondary)
- **CVSS Score:** 5.3–6.5 (Moderate–High)
- **Description:** Process hang and memory exhaustion via exponential-time expansion of consecutive `{}` groups; zero-step sequence causes DoS
- **Affected Range:** `<1.1.13` (primary), `<1.1.16` (secondary)

**Impact:**
- Denial of service via crafted glob patterns
- Can exhaust memory and CPU in build tools, test runners, or any glob-based file system operations
- May be triggered by user input if glob patterns are derived from untrusted sources

**Fix:**
```bash
npm update brace-expansion
```

---

### DEP-005: Form-Data Header Injection (High)

**Severity:** P2 (High)  
**Category:** CVE  
**Package:** `form-data` (transitive)  
**Affected Manifests:**
- Source/Backend
- Source/Frontend
- portal/Backend
- portal/Frontend

**CVE Details:**
- **CVSS Score:** High
- **Description:** Unsafe handling of multipart form data headers; attackers can inject arbitrary headers
- **Impact:** Header injection in HTTP requests; potential for request smuggling or cache poisoning

**Fix:**
```bash
npm update form-data
```

---

### DEP-006: js-yaml Code Execution (High)

**Severity:** P2 (High)  
**Category:** CVE  
**Package:** `js-yaml` (transitive in Source/Backend)  
**Affected Manifests:**
- Source/Backend

**CVE Details:**
- **Description:** Unsafe YAML parsing can lead to code execution when parsing untrusted YAML input
- **Impact:** If your backend parses YAML from user input or config files without sanitization, full RCE is possible

**Fix:**
```bash
npm update js-yaml
# or ensure only safe mode is used: yaml.load(input, {safe: true})
```

---

### DEP-007: Vite Server-Side Request Injection (High)

**Severity:** P2 (High)  
**Category:** CVE  
**Package:** `vite` (<5.4.0, transitive)  
**Affected Manifests:**
- Source/Frontend
- portal/Frontend
- platform/orchestrator

**CVE Details:**
- **CVSS Score:** High
- **Description:** Vite dev server vulnerable to SSRF / arbitrary request routing
- **Impact:** Attackers can route requests through the dev server to internal networks or make requests on behalf of the server

**Fix:**
```bash
npm update vite
```

---

### DEP-008: Postcss Regular Expression DoS (High)

**Severity:** P2 (High)  
**Category:** CVE  
**Package:** `postcss` (transitive)  
**Affected Manifests:**
- Source/Frontend
- portal/Frontend

**CVE Details:**
- **Description:** ReDoS (Regular Expression Denial of Service) in CSS parsing
- **Impact:** Processing malicious CSS can cause CPU exhaustion and DoS

**Fix:**
```bash
npm update postcss
```

---

### DEP-009: Nanoid Missing Entropy (High)

**Severity:** P2 (High)  
**Category:** CVE  
**Package:** `nanoid` (transitive)  
**Affected Manifests:**
- Source/Frontend
- portal/Frontend
- portal/Backend

**CVE Details:**
- **Description:** Weak random number generation in certain configurations; IDs are predictable
- **Impact:** Session hijacking, ID collision attacks, token prediction

**Fix:**
```bash
npm update nanoid
```

---

### DEP-010: React Router Open Redirect (High)

**Severity:** P2 (High)  
**Category:** CVE  
**Package:** `@remix-run/router` (1.3.0 – 1.23.2, transitive)  
**Affected Manifests:**
- Source/Frontend

**CVE Details:**
- **ID:** GHSA-2j2x-hqr9-3h42
- **CVSS Score:** Moderate
- **Description:** Same-origin redirect validation bypass via protocol-relative URL (`//`) reinterpretation
- **Impact:** Attackers can redirect users to arbitrary domains via specially crafted URLs

**Fix:**
```bash
npm update react-router-dom  # updates @remix-run/router
```

---

### DEP-011: Body-Parser Request Size Validation Bypass (Moderate)

**Severity:** P2 (Moderate)  
**Category:** CVE  
**Package:** `body-parser` (<1.20.6, transitive)  
**Affected Manifests:**
- Source/Backend
- Source/Frontend (transitive)
- portal/Backend
- portal/Frontend

**CVE Details:**
- **Description:** Invalid `limit` value silently disables size enforcement; can allow unbounded request sizes
- **Impact:** Memory exhaustion, DoS via oversized payloads

**Fix:**
```bash
npm update body-parser
```

---

### DEP-012: Express Middleware Vulnerability (Moderate)

**Severity:** P2 (Moderate)  
**Category:** CVE  
**Package:** `express` (4.18.2, <4.22.2)  
**Affected Manifests:**
- Source/Backend

**CVE Details:**
- **Description:** Middleware chain bypass or authentication escape possible in certain configurations
- **Impact:** Security controls can be bypassed

**Fix:**
```bash
npm update express  # upgrade to 4.22.2+
```

**Note:** Upgrade to Express 5.x requires code changes. Consider 4.22.2+ as interim.

---

### DEP-013: QS Query String Parser Injection (Moderate)

**Severity:** P2 (Moderate)  
**Category:** CVE  
**Package:** `qs` (transitive)  
**Affected Manifests:**
- Source/Backend
- Source/Frontend
- portal/Backend

**CVE Details:**
- **Description:** Prototype pollution or injection in query string parsing
- **Impact:** Object pollution, potential code execution in edge cases

**Fix:**
```bash
npm update qs
```

---

## Outdated Packages (Major Version Behind)

### DEP-014: Express 4.18.2 → 5.2.1 (1 major behind)

**Severity:** P3  
**Category:** Outdated  
**Package:** `express`  
**Current:** 4.18.2  
**Latest:** 5.2.1  
**Wanted:** 4.22.2

**Rationale:** Express 5.x is the current active version. 4.18.2 is 3+ years old. While patch versions are available, staying on major version 4 means missing security patches that may be backported unevenly. Consider upgrading to 4.22.2 first (no breaking changes) or planning for 5.x migration.

**Fix:**
```bash
npm update express@4  # to 4.22.2, or
npm install express@5  # for major upgrade (requires testing)
```

---

### DEP-015: Pino 8.17.0 → 10.3.1 (2 majors behind)

**Severity:** P3  
**Category:** Outdated  
**Package:** `pino`  
**Current:** 8.17.0  
**Latest:** 10.3.1  
**Note:** May contain security fixes in newer versions

**Fix:**
```bash
npm update pino
```

---

### DEP-016: UUID 9.0.0 → 14.0.1 (5 majors behind)

**Severity:** P3  
**Category:** Outdated  
**Package:** `uuid`  
**Current:** 9.0.0  
**Latest:** 14.0.1  
**Note:** UUID is simple but many versions behind

**Fix:**
```bash
npm update uuid
```

---

### DEP-017: React 18.3.1 → 19.2.8 (1 major behind)

**Severity:** P3  
**Category:** Outdated  
**Package:** `react`  
**Current:** 18.3.1  
**Latest:** 19.2.8  
**Manifests:** Source/Frontend

**Note:** React 19 introduces actions, streaming, and other features but requires component review. Plan upgrade carefully.

**Fix:**
```bash
npm install react@19 react-dom@19  # test thoroughly
```

---

### DEP-018: React Router DOM 6.26.0 → 7.18.2 (1 major behind)

**Severity:** P3  
**Category:** Outdated  
**Package:** `react-router-dom`  
**Current:** 6.26.0  
**Latest:** 7.18.2  
**Manifests:** Source/Frontend

**Note:** React Router 7 introduces data APIs and streaming. Requires component refactoring.

**Fix:**
```bash
npm install react-router-dom@7
```

---

## Dependency Tree Analysis

| Project | Direct Deps | Transitive Deps | Total | Severity |
|---------|-------------|-----------------|-------|----------|
| Source/Backend | 9 | 412 | 421 | 🟡 Moderate |
| Source/Frontend | 3 | 231 | 234 | 🟡 Moderate |
| Source/E2E | 4 | <50 | ~54 | 🟢 Low |
| portal/Backend | **High complexity** | **577** | **High exposure** | 🔴 High |
| portal/Frontend | 9 | 416 | 425 | 🟡 Moderate |
| platform/orchestrator | 153 | **155** | **308** | 🟡 Moderate |

**Observation:** portal/Backend has 577 transitive dependencies, including large OpenTelemetry SDK suite. This increases supply chain risk and should be reviewed for necessity.

---

## License Compliance

**Status:** All major dependencies use permissive licenses (MIT, Apache 2.0, ISC, BSD).  
**No GPL/AGPL violations detected.**

---

## Supply Chain Risks

### DEP-019: Excessive Transitive Dependencies (portal/Backend)

**Severity:** P3  
**Category:** Supply Chain Risk  
**Finding:** portal/Backend has 577 transitive dependencies, driven primarily by:
- `@opentelemetry/*` suite (43+ packages)
- gRPC and protobuf ecosystem
- Google Cloud SDKs

**Risk:** Each dependency is a potential attack vector. The OpenTelemetry SDK is pulled in transitively and may not be strictly necessary at runtime.

**Recommendation:**
1. Audit the OpenTelemetry usage in portal/Backend
2. Consider lazy-loading observability packages or moving them to optional dependencies
3. Review whether all instrumentation packages are needed
4. Document the observability architecture

---

## Remediation Plan

### Immediate (Next 48 hours) — P1

1. **Update vitest** in Source/Frontend, portal/Backend, platform/orchestrator to 3.2.6+
   - Disable UI server exposure on non-dev environments
   - Verify no file operations are exposed via the UI

2. **Update protobufjs** in portal/Backend to 7.5.5+
   - Audit all .proto file parsing; ensure untrusted input is never deserialized

3. **Update handlebars** in Source/Backend to 4.7.9+
   - Review all template usage; ensure no user input is rendered directly as templates

### Short-term (This week) — P2

4. **Update brace-expansion, form-data, js-yaml, vite, postcss, nanoid** to latest
5. **Update express to 4.22.2+** (or plan Express 5 migration)
6. **Update body-parser, qs** to latest
7. **Test all updates** before merging to main

### Medium-term (This month) — P3

8. **Plan React 18 → 19 migration** (Source/Frontend)
9. **Plan React Router 6 → 7 migration** (Source/Frontend)
10. **Audit OpenTelemetry dependencies** in portal/Backend; consolidate unused packages
11. **Review UUID usage** and consider newer versions

---

## Testing & Verification

Before merging any dependency updates:

1. **Run full test suite:**
   ```bash
   npm test --workspaces --if-present
   ```

2. **Run integration tests** if available
3. **Manual smoke test** of critical paths:
   - Express routes (if upgrading express)
   - React components (if upgrading react)
   - Vitest UI (verify it no longer exposes files)

4. **Security scanning:**
   ```bash
   npm audit --audit-level=moderate
   ```

---

## Self-Learning Updates

Findings logged to `Teams/TheInspector/learnings/dependency-auditor.md`:
- ✅ Vitest UI server exposure is a critical risk in dev environments
- ✅ Handlebars has multiple independent RCE vectors; always keep updated
- ✅ portal/Backend OpenTelemetry suite needs consolidation review
- ✅ React major version upgrades require full regression testing

---

## Report Format

```json
{
  "audit_date": "2026-08-12",
  "scan_scope": ["Source/", "portal/", "platform/"],
  "total_manifests": 6,
  "vulnerabilities": {
    "critical": 3,
    "high": 13,
    "moderate": 26,
    "low": 2
  },
  "outdated_major_versions": 5,
  "total_findings": 19,
  "next_audit": "2026-08-26"
}
```

---

**Report Generated by:** Dependency Auditor (TheInspector)  
**Next Review:** 2026-08-26 (2 weeks)  
**Escalations:** 4 findings to TheGuardians (RCE/Code Injection risks)
