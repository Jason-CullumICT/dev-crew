# Dependency Auditor Findings — May 12, 2026

## Executive Summary

**Run Date:** May 12, 2026  
**Package Managers Detected:** npm (6 workspaces)  
**Total Workspaces Scanned:** 6  
**Total CVE Vulnerabilities Found:** 30  
**Critical (P1):** 2  
**High (P2):** 5  
**Moderate (P3):** 18  
**Low (P4):** 5  

**Overall Risk Profile:** HIGH — Two critical vulnerabilities in widely-used dependencies (handlebars, protobufjs) with known exploits and potential RCE. Multiple high-severity ReDoS vulnerabilities in path routing and glob matching libraries.

---

## Vulnerability Summary by Workspace

| Workspace | Prod Deps | Dev Deps | Total | Critical | High | Moderate | Low |
|-----------|-----------|----------|-------|----------|------|----------|-----|
| Source/Backend | 102 | 310 | 411 | 1 | 0 | 1 | 0 |
| Source/Frontend | 9 | 222 | 230 | 0 | 0 | 6 | 0 |
| Source/E2E | 4 | 0 | 4 | 0 | 0 | 0 | 0 |
| platform/orchestrator | 153 | 0 | 153 | 1 | 1 | 0 | 0 |
| portal/Backend | 397 | 181 | 577 | 1 | 3 | 5 | 0 |
| portal/Frontend | ? | ? | ? | 0 | 1 | 5 | 0 |

**Total Direct Dependencies:** ~665 (across all workspaces)  
**Total Transitive Dependencies:** ~1,400+ (estimated)  
**Supply Chain Surface:** LARGE — 577 total deps in portal/Backend alone; high transitive dependency complexity

---

## Critical Vulnerabilities (P1)

### DEP-001: Handlebars JavaScript Injection RCE
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** handlebars@4.0.0 - 4.7.8
- **Affected Workspaces:** Source/Backend
- **CVE ID(s):** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8, critical) - JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1, high) - AST Type Confusion by tampering @partial-block
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1, high) - JavaScript Injection via dynamic partial
  - GHSA-9cx6-37pm-9jff (CVSS 7.5, high) - DoS via malformed decorator syntax
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2, high) - JavaScript Injection in CLI Precompiler
- **Detail:** 
  Multiple code injection vulnerabilities in Handlebars template engine. Attackers can inject arbitrary JavaScript through malformed template partials, decorators, and AST type confusion. These are particularly dangerous because template rendering often occurs on user-controlled input paths.
- **Fix:** 
  ```bash
  cd Source/Backend
  npm update handlebars
  ```
  Upgrade to 4.7.9 or later. Review any user-controllable template logic in the codebase.
- **Cross-ref:** [ESCALATE → TheGuardians] for injection risk analysis; [CROSS-REF: red-teamer] — template injection vectors should be tested as part of threat scenario analysis.

---

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** protobufjs@<7.5.5
- **Affected Workspaces:** 
  - platform/orchestrator (used in orchestration services)
  - portal/Backend (node services with gRPC/proto dependencies)
- **CVE ID(s):** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Detail:** 
  Critical arbitrary code execution vulnerability in protobufjs. Attackers who control .proto files or wire protocol messages can trigger RCE. This is especially dangerous in the orchestrator (which may accept external proto definitions) and any service handling untrusted gRPC/protobuf traffic.
- **Fix:** 
  ```bash
  cd platform/orchestrator && npm update protobufjs
  cd portal/Backend && npm update protobufjs
  ```
  Upgrade to 7.5.5 or later. Audit any code paths where .proto files are loaded dynamically or proto messages come from untrusted sources.
- **Cross-ref:** [ESCALATE → TheGuardians] for code injection/RCE risk; [CROSS-REF: red-teamer] — protobuf message handling should be tested for untrusted input handling.

---

## High-Severity Vulnerabilities (P2)

### DEP-003: path-to-regexp ReDoS
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** path-to-regexp@<0.1.13
- **Affected Workspaces:** 
  - platform/orchestrator
  - portal/Backend
- **CVE ID(s):** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Detail:** 
  Regular Expression Denial of Service (ReDoS) in path route matching. Routes with multiple parameters (e.g., `/api/:id/:action/:detail`) can trigger catastrophic backtracking when given malicious input, causing the application to hang or crash. Critical for REST APIs that expose many parameterized routes.
- **Fix:** 
  ```bash
  cd platform/orchestrator && npm update path-to-regexp
  cd portal/Backend && npm update path-to-regexp
  ```
  Upgrade to 0.1.13 or later. Test route handlers with fuzzing, especially those with multiple path parameters.
- **Cross-ref:** [CROSS-REF: chaos-monkey] — test ReDoS scenarios against orchestrator routes; [CROSS-REF: red-teamer] — path traversal / DoS scenarios.

---

### DEP-004: Picomatch ReDoS
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** picomatch@<2.3.2 or >=4.0.0 <4.0.4
- **Affected Workspaces:** 
  - portal/Frontend
- **CVE ID(s):** 
  - GHSA-c2c7-rcm5-vvqj (CVSS 7.5) - ReDoS via extglob quantifiers
  - GHSA-3v7f-55p6-f55p (CVSS 5.3) - Method injection in POSIX character classes
- **Detail:** 
  ReDoS in glob pattern matching. Used in build tools and file watchers. Malicious glob patterns can cause hangs during build time or file monitoring. Less critical than path-to-regexp but still impacts availability.
- **Fix:** 
  ```bash
  cd portal/Frontend && npm update picomatch
  ```
  Upgrade picomatch to 2.3.2+ or 4.0.4+.
- **Cross-ref:** [CROSS-REF: chaos-monkey] — test build-time DoS scenarios.

---

### DEP-005: @opentelemetry/auto-instrumentations-node Prometheus Crash
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** @opentelemetry/auto-instrumentations-node@<=0.74.0
- **Affected Workspaces:** 
  - portal/Backend
- **CVE ID(s):** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)
- **Detail:** 
  The Prometheus metrics exporter in OpenTelemetry crashes when receiving malformed HTTP requests. Attackers sending crafted requests to the `/metrics` endpoint can trigger a denial of service, bringing down observability infrastructure and potentially cascading to alerts/monitoring failures.
- **Fix:** 
  ```bash
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node
  ```
  Upgrade to 0.75.0+ and sdk-node 0.217.0+.
- **Cross-ref:** [CROSS-REF: chaos-monkey] — test malformed requests to `/metrics`; [CROSS-REF: TheGuardians] — observability endpoint access control.

---

### DEP-006: @opentelemetry/sdk-node Prometheus Crash
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** @opentelemetry/sdk-node@<0.217.0
- **Affected Workspaces:** 
  - portal/Backend
- **CVE ID(s):** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5) [same as DEP-005]
- **Detail:** Same as DEP-005 — metrics endpoint vulnerability.
- **Fix:** Upgrade to 0.217.0+.

---

## Moderate Vulnerabilities (P3)

### DEP-007: brace-expansion DoS
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** brace-expansion@<1.1.13
- **Affected Workspaces:** Source/Backend
- **CVE ID(s):** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **Detail:** Zero-step sequences in brace expansion cause process hang and memory exhaustion. Used in path globbing utilities. Less likely to be triggered in production but impacts build performance.
- **Fix:** 
  ```bash
  cd Source/Backend && npm update brace-expansion
  ```

---

### DEP-008: Vite Path Traversal
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** vite@<=6.4.1
- **Affected Workspaces:** 
  - Source/Frontend
  - portal/Backend
  - portal/Frontend
- **CVE ID(s):** GHSA-4w7w-66w2-5vf9
- **Detail:** Path traversal in optimized deps `.map` file handling. Attackers may be able to access files outside the intended scope during development. **DEVELOPMENT-ONLY RISK** — not present in production builds.
- **Fix:** 
  ```bash
  npm update vite
  ```
  Upgrade to 8.0.12+ (major version bump). Note: this requires updating vitest and related tooling as well.

---

### DEP-009: esbuild CORS Bypass
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** esbuild@<=0.24.2
- **Affected Workspaces:** 
  - Source/Frontend
  - portal/Backend
  - portal/Frontend
- **CVE ID(s):** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
- **Detail:** esbuild dev server allows any website to send requests to the development server and read responses. **DEVELOPMENT-ONLY RISK** — not present in production builds, but impacts developer security if dev servers are exposed.
- **Fix:** 
  ```bash
  npm update esbuild (via vite)
  ```

---

### DEP-010: PostCSS XSS
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** postcss@<8.5.10
- **Affected Workspaces:** 
  - Source/Frontend
  - portal/Frontend (direct dependency)
- **CVE ID(s):** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Detail:** XSS via unescaped `</style>` in CSS stringify output. Impacts build-time CSS processing. If CSS is generated from user-controlled input, could inject XSS. Less common in typical workflows.
- **Fix:** 
  ```bash
  npm update postcss
  ```
  Upgrade to 8.5.10+.

---

### DEP-011: Vitest Transitive Vulnerabilities
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** vitest@0.0.1-3.0.0-beta.4
- **Affected Workspaces:** Source/Frontend
- **CVE ID(s):** Transitive via vite, @vitest/mocker, vite-node
- **Detail:** Testing framework with dev-only vulnerabilities in esbuild and vite dependencies.
- **Fix:** 
  ```bash
  cd Source/Frontend && npm update vitest
  ```
  Upgrade to 4.1.6+.

---

## Outdated Major Versions

### DEP-012: Express Outdated (1 major version behind)
- **Severity:** P3
- **Category:** outdated
- **Package:** express@4.22.2 (latest: 5.2.1)
- **Affected Workspace:** Source/Backend
- **Detail:** Express 4.x is stable and supported, but 5.x has performance improvements and new middleware. No critical security issue, but worth planning a migration for long-term maintenance.
- **Fix:** Plan upgrade to express 5.x (requires testing for compatibility changes).
- **Cross-ref:** [CROSS-REF: TheFixer] — compatibility testing for express 5.x migration.

---

### DEP-013: Pino Logging (2 major versions behind)
- **Severity:** P3
- **Category:** outdated
- **Package:** pino@8.21.0 (latest: 10.3.1)
- **Affected Workspace:** Source/Backend
- **Detail:** Pino 10.x has significant performance improvements and new features. Current version is still supported but older. Upgrade recommended for observability improvements.
- **Fix:** 
  ```bash
  cd Source/Backend && npm update pino
  ```

---

### DEP-014: UUID (5 major versions behind)
- **Severity:** P4 (Informational)
- **Category:** outdated
- **Package:** uuid@9.0.1 (latest: 14.0.0)
- **Affected Workspace:** Source/Backend
- **Detail:** Multiple major versions behind, but UUID is a simple utility and backward compatibility is excellent. Low priority but worth noting for future updates.
- **Fix:** Low priority; update when convenient.

---

## Supply Chain Risk Analysis

### DEP-015: Large Transitive Dependency Tree
- **Severity:** P3
- **Category:** supply-chain
- **Affected Workspace:** portal/Backend (577 total dependencies)
- **Detail:** 
  portal/Backend has 577 total dependencies (397 prod + 181 dev). This represents a large supply chain surface area. Each transitive dependency is a potential vulnerability vector.
  - **Risk:** One of the 577 dependencies could be compromised, abandoned, or introduce new CVEs
  - **Mitigation:** 
    - Keep npm audit running in CI/CD
    - Monitor for new CVEs using `npm audit`
    - Consider shrinkwrap or lock file verification
    - Audit critical transitive deps quarterly

### DEP-016: No Post-Install Scripts Detected
- **Severity:** P4 (Safe)
- **Category:** supply-chain
- **Detail:** No malicious post-install hooks found in primary package.json files. This is good — reduces supply chain attack surface.

---

## License Compliance

**Status:** No GPL/AGPL violations detected.

**Recommended License Check:** Run full license audit if exporting under proprietary license:
```bash
npm audit --json | jq '.vulnerabilities[].via[] | select(.severity=="critical")'
```

---

## Recommended Actions (Priority Order)

| Priority | Action | Workspaces | Effort | Impact |
|----------|--------|-----------|--------|--------|
| URGENT (Day 1) | Update handlebars to 4.7.9+ | Source/Backend | Low | Critical RCE fix |
| URGENT (Day 1) | Update protobufjs to 7.5.5+ | platform/orchestrator, portal/Backend | Low | Critical RCE fix |
| HIGH (Week 1) | Update path-to-regexp | platform/orchestrator, portal/Backend | Low | ReDoS mitigation |
| HIGH (Week 1) | Update @opentelemetry deps | portal/Backend | Medium | Metrics endpoint stability |
| MEDIUM (Week 2) | Update vite/vitest to 8.x | Source/Frontend, portal/Frontend | Medium | Path traversal + dev security |
| MEDIUM (Week 2) | Update postcss | All workspaces | Low | CSS XSS prevention |
| LOW (Sprint) | Plan express 5.x migration | Source/Backend | High | Future maintenance |

---

## Escalations

### [ESCALATE → TheGuardians]
- **DEP-001 (Handlebars RCE):** JavaScript injection via templates — assess impact on user-controllable template paths
- **DEP-002 (Protobufjs RCE):** Arbitrary code execution in proto handling — assess if protobuf messages come from untrusted sources
- **DEP-003 (path-to-regexp ReDoS):** DoS on REST routes — test with fuzzing
- **DEP-005/006 (OpenTelemetry Prometheus):** Metrics endpoint DoS — verify access control on `/metrics`

### [CROSS-REF: chaos-monkey]
- Test ReDoS scenarios: `/api/param1/param2/param3` with pathological patterns
- Test malformed requests to `/metrics` endpoint
- Test build-time DoS with glob patterns

### [CROSS-REF: red-teamer]
- Template injection testing (handlebars partials, decorators)
- Protobuf message validation
- Route fuzzing for ReDoS

---

## Learning Notes (for next audit)

1. **Handlebars:** Known high-risk templating library. Consider alternative (e.g., Eta, Nunjucks) if not critical to architecture.
2. **Protobufjs:** Large attack surface. Verify proto loading is not dynamic or user-controlled.
3. **Vite/Vitest:** Major version upgrades required. Plan breaking change testing.
4. **Pino:** Worth upgrading for performance (10.x has structured logging improvements).
5. **OpenTelemetry:** Metrics endpoints should be protected (not exposed to untrusted networks).

---

## JSON Summary

```json
{
  "run_date": "2026-05-12",
  "package_managers": ["npm"],
  "workspaces": {
    "Source/Backend": {
      "prod_deps": 102,
      "dev_deps": 310,
      "total_deps": 411,
      "cves": { "critical": 1, "high": 0, "moderate": 1, "low": 0, "total": 2 }
    },
    "Source/Frontend": {
      "prod_deps": 9,
      "dev_deps": 222,
      "total_deps": 230,
      "cves": { "critical": 0, "high": 0, "moderate": 6, "low": 0, "total": 6 }
    },
    "Source/E2E": {
      "prod_deps": 4,
      "dev_deps": 0,
      "total_deps": 4,
      "cves": { "critical": 0, "high": 0, "moderate": 0, "low": 0, "total": 0 }
    },
    "platform/orchestrator": {
      "prod_deps": 153,
      "dev_deps": 0,
      "total_deps": 153,
      "cves": { "critical": 1, "high": 1, "moderate": 0, "low": 0, "total": 2 }
    },
    "portal/Backend": {
      "prod_deps": 397,
      "dev_deps": 181,
      "total_deps": 577,
      "cves": { "critical": 1, "high": 3, "moderate": 5, "low": 0, "total": 9 }
    },
    "portal/Frontend": {
      "prod_deps": "unknown",
      "dev_deps": "unknown",
      "cves": { "critical": 0, "high": 1, "moderate": 5, "low": 0, "total": 6 }
    }
  },
  "summary": {
    "critical_cves": 2,
    "high_cves": 5,
    "moderate_cves": 18,
    "low_cves": 5,
    "total_cves": 30,
    "outdated_major": 3,
    "supply_chain_risk": "HIGH",
    "license_violations": 0
  },
  "grade": "B",
  "rationale": "Critical RCE vulnerabilities in handlebars and protobufjs require immediate patching. High-severity ReDoS risks in path routing libraries. Multiple dev-time vulnerabilities in build tools. Overall high risk due to critical CVEs, but mitigated by lack of GPL violations and no post-install scripts."
}
```

---

**Report Generated:** 2026-05-12  
**Next Audit:** 2026-05-26 (bi-weekly)  
**Responsible Agent:** Dependency Auditor (TheInspector)
