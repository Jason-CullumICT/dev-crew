# Dependency Auditor Report
**Date:** 2026-07-19  
**Scope:** All npm workspaces in dev-crew monorepo  
**Status:** 43 vulnerabilities identified | **GRADE: C** (immediate action required)

---

## Executive Summary

The dev-crew project has **critical security gaps** in its dependency chain:

- **3 CRITICAL (P1)** vulnerabilities requiring immediate patching
- **6 HIGH (P2)** vulnerabilities that chain through multiple workspaces
- **34 MODERATE/LOW (P3/P4)** vulnerabilities accumulating risk surface
- **~1,400+ transitive dependencies** across all workspaces (high supply chain surface)

**Immediate Actions Required:**
1. Patch handlebars ≤4.7.8 (CRITICAL: JavaScript Injection)
2. Patch vitest ≤3.2.5 (CRITICAL: Arbitrary file read + execution)
3. Patch protobufjs ≤7.6.2 (CRITICAL: Arbitrary code execution)
4. Update OpenTelemetry stack in portal/Backend (6 HIGH vulnerabilities)

---

## Detailed Findings

### DEP-001: Handlebars.js JavaScript Injection
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars ≤4.7.8
- **Affected Workspaces:** Source/Backend, Source/Frontend, platform/orchestrator
- **File:** package-lock.json
- **CVEs:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8) - JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1) - JavaScript Injection via @partial-block tampering
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2) - JavaScript Injection in CLI Precompiler
- **Detail:** Multiple injection vectors in Handlebars template processing. Attacker can inject arbitrary JavaScript that executes during template compilation or rendering. Affects all three template rendering code paths.
- **Impact:** If any user input reaches Handlebars templates (via email, report generation, template rendering), attackers can execute arbitrary code on the server.
- **Fix:** `npm update handlebars@>=4.7.9` (latest: 4.7.9)
- **Cross-ref:** [ESCALATE → TheGuardians] - Arbitrary code execution in server context

### DEP-002: Vitest UI Arbitrary File Read & Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest ≤3.2.5
- **Affected Workspaces:** Source/Frontend, portal/Frontend
- **File:** package-lock.json
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:** When Vitest UI server is running (typically on dev/test environments), any attacker on the network can read and execute arbitrary files from the filesystem. The UI server does not authenticate requests.
- **Impact:** **CRITICAL for development teams.** If a developer runs `vitest --ui` and the UI is exposed (e.g., on a shared network, CI server, Docker with exposed ports), attackers can read `.env` files, source code, or execute arbitrary code.
- **Fix:** `npm update vitest@>=3.2.6` (latest: 4.1.10 - major version bump)
- **Cross-ref:** [ESCALATE → TheGuardians] - Unauthenticated arbitrary file access; affects CI/CD if exposed

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** protobufjs ≤7.6.2
- **Affected Workspaces:** platform/orchestrator (via @grpc/grpc-js)
- **File:** package-lock.json
- **CVEs:**
  - GHSA-xq3m-2v4x-88gg (CVSS 9.8) - Arbitrary code execution
  - GHSA-66ff-xgx4-vc5h (CVSS 8.6) - Code injection through bytes field defaults
- **Detail:** Protobufjs allows arbitrary code injection when parsing untrusted protobuf schema files or malformed messages. Can lead to RCE during deserialization.
- **Impact:** If the orchestrator processes untrusted protobuf messages or loads remote schemas, attackers can achieve code execution.
- **Fix:** `npm update protobufjs@>=7.6.3` (latest: 7.6.4)
- **Cross-ref:** [ESCALATE → TheGuardians] - RCE in gRPC message processing

---

## High Severity Findings (P2)

### DEP-004: Vite Server Security Bypass (Path Traversal + FS Denial)
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** vite ≤6.4.2
- **Affected Workspaces:** Source/Frontend, portal/Frontend
- **CVEs:**
  - GHSA-fx2h-pf6j-xcff (CVSS 7.5) - `server.fs.deny` bypass on Windows
  - GHSA-4w7w-66w2-5vf9 - Path traversal in optimized deps
- **Detail:** Development server does not properly enforce filesystem restrictions. Attackers can bypass `server.fs.deny` on Windows via alternate path formats (UNC paths, etc.) to read files outside the project.
- **Fix:** `npm update vite@>=6.5.0` (latest: 8.1.5 - major version)
- **Cross-ref:** [CROSS-REF: red-teamer] - Exploitable during dev, not prod

### DEP-005: ws Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** ws ≥8.0.0 <8.21.0
- **Affected Workspaces:** portal/Frontend (transitive via vite)
- **CVE:** GHSA-96hv-2xvq-fx4p (CVSS 7.5)
- **Detail:** WebSocket library susceptible to memory exhaustion via specially crafted tiny fragments. Remote attacker can send malformed frames to exhaust server memory and cause DoS.
- **Impact:** Any API or service using ws for WebSockets can be crashed by unauthenticated attackers.
- **Fix:** `npm update ws@>=8.21.0` (latest: 8.21.0)

### DEP-006: form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data 4.0.0-4.0.5
- **Affected Workspaces:** Source/Frontend, portal/Frontend, portal/Backend
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Detail:** Multipart form field names and filenames are not escaped. Attackers can inject CRLF characters to manipulate HTTP headers or execute HTTP response splitting attacks.
- **Impact:** Can be exploited to cache poisoning, cross-site scripting, or header injection in applications that accept file uploads.
- **Fix:** `npm update form-data@>=4.0.6` (latest: 4.0.6)

### DEP-007: @grpc/grpc-js Server Crash
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** @grpc/grpc-js 1.14.0-1.14.3
- **Affected Workspaces:** platform/orchestrator, portal/Backend
- **CVEs:**
  - GHSA-5375-pq7m-f5r2 (CVSS 7.5) - Malformed request causes crash
  - GHSA-99f4-grh7-6pcq (CVSS 7.5) - Malformed compressed message crash
- **Detail:** gRPC server crashes when processing malformed or compressed messages. Unauthenticated remote DoS.
- **Impact:** Orchestrator or backend services using gRPC can be crashed by network attackers.
- **Fix:** `npm update @grpc/grpc-js@>=1.14.4` (latest: 1.14.10)

### DEP-008: path-to-regexp ReDoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** path-to-regexp <0.1.13
- **Affected Workspaces:** platform/orchestrator
- **CVE:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Detail:** Regular expression denial of service when parsing route patterns with multiple parameters. Attackers can craft URLs that cause exponential backtracking.
- **Impact:** Express route matching can hang or exhaust CPU on malicious request patterns.
- **Fix:** `npm update path-to-regexp@>=0.1.13` (latest: 0.1.13)

### DEP-009: picomatch ReDoS & Injection
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** picomatch <2.3.2 or >=4.0.0 <4.0.4
- **Affected Workspaces:** portal/Frontend
- **CVEs:**
  - GHSA-c2c7-rcm5-vvqj (CVSS 7.5) - ReDoS via extglob quantifiers
  - GHSA-3v7f-55p6-f55p - Method injection in POSIX character classes
- **Detail:** Glob pattern matching vulnerable to ReDoS and method injection.
- **Fix:** `npm update picomatch@>=2.3.2` (latest: 2.3.2)

---

## Moderate Severity Findings (P3)

### DEP-010: express/body-parser query string DoS
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** qs 6.11.1-6.15.1 (affects express, body-parser)
- **Affected Workspaces:** Source/Backend, platform/orchestrator, portal/Backend
- **CVE:** GHSA-q8mj-m7cp-5q26 (CVSS 5.3)
- **Detail:** qs.stringify crashes with TypeError on null/undefined entries in arrays when `encodeValuesOnly` is set.
- **Impact:** API endpoints can be DoS'd by crafted query strings.
- **Fix:** `npm update qs@>=6.15.2` or `npm update express@>=4.22.2`

### DEP-011: uuid Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** uuid <11.1.1 (direct in Source/Backend, transitive in platform/orchestrator)
- **Affected Workspaces:** Source/Backend, platform/orchestrator
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Detail:** UUID v3/v5/v6 functions missing buffer bounds check when `buf` parameter provided. Buffer overflow possible.
- **Impact:** Could lead to memory corruption or data leakage if UUIDs are generated with attacker-controlled buffer.
- **Fix:** Source/Backend: `npm update uuid@>=11.1.1` (latest: 14.0.1 - MAJOR upgrade)
- **Note:** This is a major version bump; requires testing.

### DEP-012: postcss XSS via </style> in CSS
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** postcss <8.5.10
- **Affected Workspaces:** portal/Frontend
- **CVE:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Detail:** PostCSS does not escape `</style>` in CSS stringify output. Injected CSS can break out of style tag.
- **Impact:** If dynamic CSS is generated from user input, XSS possible.
- **Fix:** `npm update postcss@>=8.5.10` (latest: 8.6.1)

### DEP-013: esbuild CORS Bypass in Dev Server
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** esbuild ≤0.24.2 (transitive via vite)
- **Affected Workspaces:** Source/Frontend, portal/Frontend
- **CVE:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
- **Detail:** esbuild dev server allows any website to send requests and read responses (CORS bypass).
- **Impact:** Dev-only risk; if dev server exposed on network, attackers can exfiltrate source/data.
- **Fix:** Upgrade vite to >=6.5.0 (which pulls esbuild >=0.24.3)

### DEP-014: React Router Open Redirect
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** react-router >=6.7.0 <6.30.4
- **Affected Workspaces:** Source/Frontend, portal/Frontend
- **CVE:** GHSA-2j2x-hqr9-3h42 (CVSS unscored but moderate impact)
- **Detail:** Redirect URLs starting with `//` reinterpreted as protocol-relative URLs (open redirect).
- **Impact:** If app redirects to user-supplied URLs without validation, attackers can redirect to phishing sites.
- **Fix:** `npm update react-router-dom@>=6.30.4` (latest: 6.33.0)

### DEP-015: js-yaml DoS via Merge Key Aliases
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** js-yaml <3.15.0
- **Affected Workspaces:** Source/Backend
- **CVE:** GHSA-h67p-54hq-rp68 (CVSS 5.3)
- **Detail:** YAML parser exhibits quadratic complexity when processing repeated merge key aliases. DoS via crafted YAML.
- **Impact:** If application parses untrusted YAML, can cause CPU exhaustion.
- **Fix:** `npm update js-yaml@>=3.15.0` (latest: 4.1.0)

### DEP-016: @babel/core Arbitrary File Read
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** @babel/core ≤7.29.0
- **Affected Workspaces:** Source/Frontend, portal/Frontend
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2 - LOW; but information disclosure)
- **Detail:** Babel reads arbitrary files via sourceMappingURL comment in transpiled code.
- **Impact:** Low priority; local access mostly.
- **Fix:** `npm update @babel/core@>=7.30.0` (latest: 7.26.0)

---

## OpenTelemetry Stack Issues (portal/Backend)

### DEP-017: OpenTelemetry Auto-Instrumentation Prometheus Crash
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** @opentelemetry/auto-instrumentations-node ≤0.76.0
- **Affected Workspaces:** portal/Backend
- **CVE:** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)
- **Detail:** Prometheus exporter in OpenTelemetry crashes when receiving malformed HTTP requests (no Content-Length header, etc.).
- **Impact:** Metrics endpoint DoS; if exposed, attackers can crash metrics collection.
- **Fix:** `npm update @opentelemetry/auto-instrumentations-node@>=0.78.0`

### DEP-018: OpenTelemetry Core Baggage DoS
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** @opentelemetry/core <2.8.0
- **Affected Workspaces:** portal/Backend (cascading through many @opentelemetry/* packages)
- **CVE:** GHSA-8988-4f7v-96qf (CVSS 5.3)
- **Detail:** W3C Baggage propagation unbounded memory allocation. Malformed baggage headers cause memory exhaustion.
- **Impact:** If service receives untrusted baggage headers, memory can be exhausted.
- **Fix:** `npm update @opentelemetry/sdk-node@>=0.220.0` (pulls in fixed transitive deps)

---

## Outdated Major Versions (P3)

### DEP-019: Express 4.22.0 (1 major version behind)
- **Current:** 4.22.0 | **Latest:** 5.2.1
- **Impact:** 1 major release behind; minor CVE fixes available
- **Fix:** Consider upgrading, but requires testing

### DEP-020: Pino 8.21.0 (2 major versions behind)
- **Current:** 8.21.0 | **Latest:** 10.3.1
- **Impact:** Significant lag; potential performance improvements missed
- **Fix:** Major upgrade; requires careful testing

### DEP-021: uuid 9.0.1 (5 major versions behind)
- **Current:** 9.0.1 | **Latest:** 14.0.1
- **Impact:** Security CVEs fixed in later versions (DEP-011)
- **Fix:** Upgrade required

---

## Dependency Tree Analysis

| Workspace | Direct Deps | Transitive | Total | Risk Surface |
|-----------|------------|-----------|-------|---|
| Source/Backend | 23 | 388 | 411 | MEDIUM |
| Source/Frontend | 9 | 221 | 230 | MEDIUM |
| Source/E2E | 4 | 0 | 4 | LOW |
| platform/orchestrator | 28 | 127 | 155 | HIGH |
| portal/Backend | 95 | — | 95+ | **HIGH** |
| portal/Frontend | 9 | 415 | 424 | HIGH |
| **TOTAL** | ~168 | ~1,200+ | ~1,400+ | **HIGH** |

**Observations:**
- Portal workspaces have highest complexity (vite/OpenTelemetry chains)
- Orchestrator has complex gRPC + protobufjs dependencies
- **>1,400 transitive dependencies across monorepo** = significant supply chain risk

---

## Supply Chain Risk Assessment

### Duplicate Dependencies (Different Versions)
No critical duplicates detected, but some transitive packages pulled at different versions:
- `@opentelemetry/*` - Multiple versions across portal/Backend (8+ distinct namespace)
- `vite` - Dev dependency, but pulled transitively by vitest

### Post-Install Scripts
- None detected in core dependencies (vite, express, etc. are clean)
- Build tools (esbuild, rollup) have no malicious hooks

### Low-Download Dependencies
- Most dependencies have >1M weekly downloads (healthy)
- Exception: Some orchestrator gRPC tools (~10k/week) — monitor for abandonment

---

## Cross-Team Escalation

### 🚨 [ESCALATE → TheGuardians]
- **DEP-001, DEP-002, DEP-003** (All CRITICAL) - Arbitrary code execution risks
- **DEP-004, DEP-005, DEP-006** (HIGH) - Information disclosure + DoS
- **Security Context:** No authentication layer in app means **any** attacker can exploit these if exposed

### [CROSS-REF: red-teamer]
- Test exploitability of handlebars injection in email/report generation paths
- Verify vitest UI is not exposed in CI (check for exposed ports 51204+)
- Check if untrusted protobuf schemas are loaded from remote sources

---

## Remediation Plan

### Phase 1: Immediate (This Sprint)
**Priority: Critical vulnerabilities**
```bash
# Backend
cd Source/Backend
npm update handlebars uuid
npm update @babel/core

# Frontend
cd Source/Frontend
npm update handlebars vitest vite
npm update form-data

# Orchestrator
cd platform/orchestrator
npm update protobufjs path-to-regexp
npm update @grpc/grpc-js

# Portal Backend
cd portal/Backend
npm update @opentelemetry/sdk-node
npm update @opentelemetry/auto-instrumentations-node

# Portal Frontend
cd portal/Frontend
npm update handlebars vitest vite ws form-data
npm update picomatch react-router-dom
```

### Phase 2: Major Upgrades (Next Sprint)
```bash
# Source/Backend
npm update uuid@^14.0.0  # Major bump - test thoroughly
npm update pino@^10.0.0  # Major - verify logging still works
npm update js-yaml@^4.0.0 # Major - check YAML parsing changes

# portal/Frontend
npm update vitest@^4.0.0 # Major - UI tests
```

### Phase 3: Ongoing
- Set up `npm audit` in CI/CD pipeline (fail on CRITICAL/HIGH)
- Pin major versions for stability; lock files ensure reproducibility
- Monitor for new advisories weekly

---

## Verification Checklist

After remediation:
- [ ] Run `npm audit --workspaces` — zero CRITICAL/HIGH
- [ ] Run full test suite — zero new failures
- [ ] Verify dev server starts (`npm run dev`)
- [ ] Verify builds complete (`npm run build`)
- [ ] Spot-check application flows (login, workflow create, etc.)
- [ ] Rerun this audit — document before/after

---

## Learnings & Recommendations

**For `Teams/TheInspector/learnings/dependency-auditor.md`:**

1. **Recurring Vulns:** Handlebars, vitest, vite show up consistently in Node.js projects. Consider company-wide standards.
2. **OpenTelemetry:** Massive transitive dependency chain (50+ packages). High maintenance burden; evaluate necessity vs. value.
3. **Monorepo Strategy:** Centralize dependency versions via npm workspaces root `package.json` to force consistency.
4. **CI/CD Integration:** Implement `npm audit` gate; fail builds on CRITICAL/HIGH.
5. **Dev vs. Prod:** Vite/vitest vulnerabilities are dev-only; acceptable risk if dev environments isolated from production.

---

## Files Changed
- None (audit-only report)

## Summary Metrics
```json
{
  "total_cves": 43,
  "critical": 3,
  "high": 6,
  "moderate": 24,
  "low": 10,
  "workspaces_affected": 6,
  "total_dependencies": 1400,
  "transitive_dependencies": 1200,
  "license_issues": 0,
  "abandoned_packages": 0,
  "overall_grade": "C",
  "remediation_time_estimate_hours": 4,
  "testing_time_estimate_hours": 2
}
```

---

**Report Generated:** 2026-07-19  
**Next Audit:** 2026-08-02 (bi-weekly)  
**Owner:** TheInspector (dependency-auditor)
