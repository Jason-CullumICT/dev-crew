# Dependency Auditor Findings

**Date:** July 29, 2026  
**Scanned:** dev-crew Project (npm)  
**Package Managers Detected:** npm v10+ (package.json/package-lock.json)  
**Scope:** 5 major npm projects (Backend, Frontend, E2E, Portal/Backend, Portal/Frontend, Platform/Orchestrator)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total CVEs Found** | 94 (critical: 5, high: 19, moderate: 58, low: 12) |
| **Critical Finding Count** | 5 (P1) |
| **High Finding Count** | 19 (P2) |
| **Affected Projects** | 5/6 projects (E2E clean) |
| **Supply Chain Risk** | **MEDIUM** — Portal/Backend has 577 transitive deps (>500 threshold) |
| **Outdated Packages** | Multiple major versions behind (express, vite, vitest) |
| **License Risk** | No GPL/AGPL detected; all commercial use OK |

---

## Critical Findings (P1)

### **CRITICAL-001: Handlebars.js JavaScript Injection (Code Execution)**
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Execution
- **Affected Projects:** Source/Backend
- **Package:** `handlebars` (transitive, via template compilation)
- **Versions:** <=4.7.8
- **CVSS:** 9.8 (Network, No Auth Required)
- **CVE IDs:**
  - GHSA-2qvq-rjwj-gvw9 (Prototype Pollution + XSS)
  - GHSA-2w6w-674q-4c4q (JavaScript Injection via AST Type Confusion — **CRITICAL**, CVSS 9.8)
  - GHSA-3mfm-83xf-c92r (JavaScript Injection, CVSS 8.1)
- **Issue:** Attacker-controlled template input can execute arbitrary JavaScript. No authentication required. This affects any code that compiles Handlebars templates with untrusted input.
- **Remediation:**
  - `npm update handlebars` to >=4.7.9 (if present)
  - Audit Source/Backend dependencies to confirm handlebars version and remove if unused
  - If template compilation is needed, replace with safer libraries (e.g., Mustache, ETA, nunjucks)
- **Cross-Ref:** [ESCALATE → TheGuardians] — Code execution vector; requires dynamic analysis to confirm exploitability

---

### **CRITICAL-002: Protobufjs Arbitrary Code Execution**
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Execution
- **Affected Projects:** Portal/Backend (transitive via gRPC stack)
- **Package:** `protobufjs` (transitive)
- **Versions:** <7.5.5
- **CVSS:** 9.8 (Network, No Auth Required)
- **CVE ID:** GHSA-xq3m-2v4x-88gg
- **Issue:** Arbitrary code execution when parsing untrusted `.proto` files or JSON payloads. Portal/Backend imports `@opentelemetry/auto-instrumentations-node` which transitively includes protobufjs for gRPC/protobuf support.
- **Remediation:**
  - `npm update protobufjs` to >=7.5.5
  - Check `@opentelemetry/*` package versions — may need bump to 0.76.0+ to pull safe protobufjs
  - Validate that `.proto` definitions are never loaded from untrusted sources
- **Cross-Ref:** [ESCALATE → TheGuardians] — Code execution vector; gRPC-specific threat model

---

### **CRITICAL-003: Vitest UI Server Arbitrary File Read & Execution**
- **Severity:** P1 (Critical)
- **Category:** CVE / Arbitrary File Read + Code Execution
- **Affected Projects:** Portal/Backend
- **Package:** `vitest` (direct dependency)
- **Versions:** <3.2.6
- **CVSS:** 9.8 (Network, No Auth Required)
- **CVE ID:** GHSA-5xrq-8626-4rwp
- **Issue:** When `vitest` UI server is running (typically on port 51204), any unauthenticated attacker can:
  - Read arbitrary files from the filesystem
  - Execute arbitrary code via test file manipulation
- **Remediation:**
  - `npm update vitest` to >=3.2.6 **immediately** — this is a LIVE RCE if vitest UI is accessible
  - **Do NOT run vitest UI in production or staging**
  - Add network ACLs to restrict vitest UI port (51204) to localhost/internal only
  - Consider using `--reporter=default` (non-UI) in CI/CD pipelines
- **Risk:** If Portal/Backend is running vitest UI on a shared network, it is currently **exploitable by any network neighbor**
- **Cross-Ref:** [ESCALATE → TheGuardians] — Live RCE; requires immediate incident response if UI is exposed

---

### **CRITICAL-004: gRPC (grpc-js) Server Crash via Malformed Requests**
- **Severity:** P1 (High-impact DoS)
- **Category:** CVE / Denial of Service
- **Affected Projects:** Portal/Backend (transitive via OpenTelemetry)
- **Package:** `@grpc/grpc-js` (transitive)
- **Versions:** 1.14.0 - 1.14.3
- **CVSS:** 7.5 (Network, No Auth, Availability only)
- **CVE IDs:**
  - GHSA-5375-pq7m-f5r2 (Malformed request → server crash)
  - GHSA-99f4-grh7-6pcq (Malformed compressed message → client/server crash)
- **Issue:** Sending a specially-crafted gRPC message crashes the gRPC server, causing unavailability of OpenTelemetry collectors/exporters.
- **Remediation:**
  - Bump `@opentelemetry/auto-instrumentations-node` to >=0.79.0 (pulls grpc-js >= 1.14.4)
  - Add request validation middleware if gRPC endpoints are exposed
- **Cross-Ref:** [ESCALATE → TheGuardians] — DoS attack vector affecting observability infrastructure

---

### **CRITICAL-005: OpenTelemetry Auto-Instrumentations — Multiple HIGH CVEs**
- **Severity:** P1 (cascading HIGH/CRITICAL)
- **Category:** CVE / Observability Stack Compromise
- **Affected Projects:** Portal/Backend (direct dependency)
- **Package:** `@opentelemetry/auto-instrumentations-node` (direct, v0.40.0)
- **Versions:** <=0.76.0
- **CVE IDs:**
  - GHSA-q7rr-3cgh-j5r3 (Prometheus exporter process crash via malformed HTTP request, CVSS 7.5)
  - Plus cascading vulnerabilities in: @opentelemetry/instrumentation-*, @opentelemetry/sdk-node, @opentelemetry/resources, @opentelemetry/resource-detector-*
- **Issue:** Auto-instrumentations enable automatic collection of metrics, traces, and logs. Multiple sub-packages have HIGH/CRITICAL vulnerabilities:
  - Prometheus exporter crashes on malformed requests
  - gRPC crashes on malformed messages
  - Resource detectors may leak sensitive environment data
- **Remediation:**
  - **Immediate:** `npm update @opentelemetry/auto-instrumentations-node` to >=0.79.0
  - Audit all `@opentelemetry/*` direct & transitive deps; upgrade the entire stack to 0.47.0+ (or latest 0.5x)
  - Restrict Prometheus `/metrics` endpoint to authorized networks only
  - Review OTEL collector configuration; ensure TLS/mTLS if exporting to remote collectors
- **Cross-Ref:** [ESCALATE → TheGuardians] — Observability stack is critical attack surface; compromises can hide other attacks

---

## High-Severity Findings (P2)

### **P2-001: Brace-Expansion DoS (Multiple CVEs)**
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Affected Projects:** Source/Backend, Source/Frontend, Portal/Frontend
- **Package:** `brace-expansion` (transitive via glob/minimatch/micromatch)
- **Versions:** <1.1.16 (multiple DoS vectors)
- **CVE IDs:**
  - GHSA-f886-m6hf-6m8v (Zero-step sequence hangs)
  - GHSA-3jxr-9vmj-r5cp (Exponential-time expansion, CVSS 5.3)
  - GHSA-mh99-v99m-4gvg (Unbounded expansion length OOM, CVSS 7.5)
- **Issue:** Three separate DoS vectors in brace-expansion:
  1. Zero-step sequences (e.g., `{1..0}`) cause process hang + memory exhaustion
  2. Non-expanding consecutive braces (e.g., `{}{}{}{}...`) cause quadratic CPU
  3. Large expansion lengths cause out-of-memory crash
- **Exploitability:** High if brace-expansion is used to parse user input (glob patterns, file paths)
- **Remediation:**
  - `npm update minimatch` to >=5.1.0 or `npm update glob` to >=11+
  - These transitive deps should pull safe brace-expansion >=1.1.16
  - Do not use brace-expansion to parse untrusted glob patterns
- **Cross-Ref:** [SEE TheGuardians static-analyzer] — if backend serves user-supplied glob patterns

---

### **P2-002: Form-Data CRLF Injection**
- **Severity:** P2 (High)
- **Category:** CVE / Request Smuggling / CRLF Injection
- **Affected Projects:** Source/Backend (transitive via express?), Portal/Frontend (transitive)
- **Package:** `form-data` (transitive)
- **Versions:** 4.0.0 - 4.0.5
- **CVSS:** 7.5 (Network, CRLF allows header injection)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx
- **Issue:** Multipart form field names and filenames are not escaped for CRLF. An attacker can inject `\r\n` into form field names to:
  - Inject arbitrary HTTP headers
  - Cause request smuggling when using HTTP/1.1 chunked encoding
  - Bypass security headers
- **Exploitability:** Requires ability to control form field names (e.g., file upload with attacker-supplied filename)
- **Remediation:**
  - `npm update form-data` to >=4.0.6
  - Validate and sanitize all file upload filenames to remove CRLF characters
- **Cross-Ref:** [ESCALATE → TheGuardians] — Request smuggling attack vector

---

### **P2-003: js-yaml YAML Merge-Key DoS**
- **Severity:** P2 (High)
- **Category:** CVE / Denial of Service
- **Affected Projects:** Source/Backend
- **Package:** `js-yaml` (transitive, likely via Webpack/Babel)
- **Versions:** >=3.0.0 <3.15.0
- **CVSS:** 7.5 (Quadratic CPU consumption on merge keys)
- **CVE IDs:**
  - GHSA-h67p-54hq-rp68 (Quadratic-complexity merge handling)
  - GHSA-52cp-r559-cp3m (Merge-key chains force quadratic CPU)
- **Issue:** YAML parser enters O(n²) time complexity when processing chains of merge keys. An attacker can craft a YAML file that consumes 100% CPU and stalls the parser.
- **Exploitability:** High if backend accepts YAML config files or parses user-supplied YAML
- **Remediation:**
  - `npm update js-yaml` to >=3.15.0
  - If parsing untrusted YAML, add CPU/timeout limits to parser (e.g., `setTimeout`)
- **Cross-Ref:** [SEE TheGuardians] — if YAML parsing is exposed to user input

---

### **P2-004: Path-to-Regexp ReDoS (Regular Expression DoS)**
- **Severity:** P2 (High)
- **Category:** CVE / ReDoS
- **Affected Projects:** Portal/Backend (transitive via Express)
- **Package:** `path-to-regexp` (transitive)
- **Versions:** <0.1.13
- **CVSS:** 7.5
- **CVE ID:** GHSA-37ch-88jc-xwx2
- **Issue:** Multiple route parameters with certain patterns cause exponential backtracking in regex. An attacker can craft a URL that matches this pattern and cause the express router to hang.
- **Exploitability:** High if backend has dynamic routes with multiple parameters
- **Remediation:**
  - `npm update express` to >=4.18.3+ (should pull path-to-regexp >=0.1.13)
  - Test routing with long/complex URLs to ensure no hangs
- **Cross-Ref:** [ESCALATE → TheGuardians] — ReDoS is a known attack vector for express servers

---

### **P2-005: Esbuild Dev Server CORS Bypass (Frontend)**
- **Severity:** P2 (High/Moderate)
- **Category:** CVE / CORS Bypass / Data Exfiltration
- **Affected Projects:** Source/Frontend, Portal/Frontend
- **Package:** `esbuild` (transitive via Vite)
- **Versions:** <=0.24.2
- **CVSS:** 5.3 (Network, User Interaction required)
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **Issue:** Esbuild dev server does not properly enforce CORS. Any website can:
  - Send requests to the dev server
  - Read the response (e.g., source maps, transpiled code)
- **Exploitability:** Moderate — requires dev server to be exposed to the internet (should only be localhost)
- **Remediation:**
  - `npm update vite` to >=5.0+ (pulls safe esbuild)
  - **Never expose Vite dev server to the internet** — add firewall rules to restrict to localhost/internal networks
  - Use `--host 127.0.0.1` when running vite dev server
- **Cross-Ref:** [ESCALATE → TheGuardians] — Source code exfiltration risk if dev server is exposed

---

### **P2-006: PostCSS XSS via Unescaped </style> Tags**
- **Severity:** P2 (Medium)
- **Category:** CVE / XSS
- **Affected Projects:** Portal/Backend, Portal/Frontend
- **Package:** `postcss` (transitive)
- **Versions:** <8.5.10
- **CVSS:** 6.1 (Network, User Interaction)
- **CVE ID:** GHSA-qx2v-qp2m-jg93
- **Issue:** PostCSS does not escape `</style>` tags in CSS output. Injected CSS with `</style>` can:
  - Close the `<style>` tag prematurely
  - Inject arbitrary HTML/JavaScript
- **Exploitability:** Moderate — requires untrusted CSS input or CSS-in-JS that passes through PostCSS
- **Remediation:**
  - `npm update postcss` to >=8.5.10
  - Sanitize any dynamically-generated CSS input
- **Cross-Ref:** [SEE TheGuardians static-analyzer] — XSS vector in CSS pipeline

---

## Moderate-Severity Findings (P3)

### **P3-001: Body-Parser DoS (Denial of Service)**
- **Severity:** P3 (Moderate)
- **Category:** CVE / Denial of Service
- **Affected Projects:** Source/Backend
- **Package:** `body-parser` (transitive via Express)
- **Versions:** <1.20.6
- **CVSS:** 3.7 (Limited impact)
- **CVE ID:** GHSA-v422-hmwv-36x6
- **Issue:** Invalid `limit` value silently disables size enforcement, allowing unbounded payloads to consume memory
- **Remediation:**
  - `npm update express` (should pull safe body-parser)
  - Set explicit `limit` parameter in body-parser config

---

### **P3-002: Babel Core Arbitrary File Read**
- **Severity:** P3 (Low/Moderate)
- **Category:** CVE / Information Disclosure
- **Affected Projects:** Source/Backend, Source/Frontend, Portal/Backend, Portal/Frontend
- **Package:** `@babel/core` (transitive)
- **Versions:** <=7.29.0
- **CVSS:** 3.2 (Local access required, information disclosure only)
- **CVE ID:** GHSA-4x5r-pxfx-6jf8
- **Issue:** Source map URL comments can trigger arbitrary file read on the local filesystem. Only exploitable if:
  1. Babel is running locally (build time)
  2. Attacker can modify source code to include crafted comment
- **Remediation:**
  - `npm update @babel/core` to >=7.30+
  - Use strict input validation on source files

---

### **P3-003: Vitest/Vite Minor Version Lags**
- **Severity:** P3 (Technical Debt)
- **Category:** Outdated / Known Issues
- **Affected Projects:** Portal/Backend (vitest@1.2.2), Source/Frontend (vite <= old version)
- **Versions Behind:**
  - Vitest: 1.2.2 → 4.1.10+ (major version lag)
  - Vite: <=6.4.1 (path traversal in deps)
- **Remediation:**
  - `npm update vitest` to >=3.2.6 (minimum for security fix)
  - Plan to migrate to vitest 4.x for long-term support
  - Vite: `npm update vite` to >=8.1.5+ for latest fixes

---

## Outdated Major Versions (P3/P4)

### **Outdated Dependencies**

| Package | Current | Latest | Major Gap | Impact |
|---------|---------|--------|-----------|--------|
| `express` | ^4.18.2 | 4.19+ | Minor | Mid-range security patches missing |
| `typescript` | 5.3.3 | 5.5+ | Minor | New safety checks, type improvements |
| `vitest` | 1.2.2 | 4.1+ | **2 majors** | **Critical** — many fixes between 1.x → 4.x |
| `vite` | Unknown (<=6.4) | 8.1+ | **2+ majors** | Path traversal fixed in >=8.1 |

---

## Supply Chain Risk Assessment

### **Transitive Dependency Tree**

| Project | Direct Deps | Transitive Deps | Risk Level |
|---------|------------|-----------------|-----------|
| Source/Backend | 4 | ~50 | **LOW** |
| Source/Frontend | ~8 | ~100 | **LOW** |
| Source/E2E | 4 | ~40 | **CLEAN** (no vulns) |
| Portal/Backend | 11 | **577** | **MEDIUM** (>500 threshold) |
| Portal/Frontend | ~10 | ~200 | **MEDIUM** |
| Platform/Orchestrator | ~8 | ~100 | **LOW** |

**Finding:** Portal/Backend (via OpenTelemetry auto-instrumentation) has 577 transitive dependencies. This is a **supply chain risk**:
- Larger attack surface (any transitive dep could be compromised)
- Harder to audit and patch all dependencies
- Some dependencies may have poor maintenance

**Recommendation:** Evaluate whether OpenTelemetry auto-instrumentation is necessary. Consider:
- Manual instrumentation of only critical paths (e.g., HTTP middleware, DB queries)
- Removing unused instrumentation packages (aws-lambda, amqplib, etc.)

---

## License Compliance

**Finding:** No GPL/AGPL or UNLICENSED packages detected in primary dependencies.

**License Breakdown (Sample):**
- MIT: express, uuid, pino, jest, typescript, vitest
- Apache-2.0: @types/*, @opentelemetry/*
- ISC: body-parser, cors, multer
- BSD: @babel/core, esbuild

**Action:** No license violations detected. All use-cases (commercial SaaS) are permitted.

---

## Abandoned/Deprecated Packages

**Finding:** No abandoned packages detected. All primary dependencies are actively maintained.

**Watch List:**
- `better-sqlite3` (15 weeks since last update) — stable; no issues
- `@opentelemetry/*` (active, releases every 2-4 weeks)

---

## Recommendations by Priority

### **Immediate (Next 24-48 hours)**
1. **Update @opentelemetry/auto-instrumentations-node** to >=0.79.0
   - Fixes 2× HIGH CVEs and 1× CRITICAL (gRPC crash + protobufjs RCE)
   - `cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node`
   - Test Portal backend observability still works post-update

2. **Update vitest** to >=3.2.6 (Portal/Backend)
   - Fixes CRITICAL RCE in vitest UI server
   - `cd portal/Backend && npm update vitest`
   - Verify no tests are broken

3. **Audit and patch handlebars** (Source/Backend)
   - Confirm handlebars is really a dependency (may be transitive)
   - If present and >4.7.8: `npm update handlebars`
   - If <4.7.9 available: check if template compilation is necessary; consider replacing with safer library

### **Short-term (Next 1-2 weeks)**
4. **Update express** to >=4.18.3
   - Pulls safe body-parser, path-to-regexp
   - `npm update express` in Source/Backend, Portal/Backend

5. **Update form-data** to >=4.0.6
   - Fixes CRLF injection in multipart handling
   - `npm update form-data`

6. **Update js-yaml** to >=3.15.0
   - Fixes quadratic DoS on merge keys
   - May be transitive; verify before updating

7. **Update @babel/core** to >=7.30
   - Fixes file read vulnerability
   - Transitive; should update via `npm audit fix --audit-level=moderate`

### **Medium-term (Next month)**
8. **Evaluate and reduce transitive dependencies in Portal/Backend**
   - Consider manual instrumentation instead of `@opentelemetry/auto-instrumentations-node`
   - Target: reduce from 577 → 300-400 transitive deps

9. **Plan Vitest 1.x → 4.x migration**
   - Portal/Backend is on 1.2.2; latest is 4.x
   - Plan breaking changes; test suite likely needs updates

10. **Upgrade Vite** (if <8.1.5)
    - Path traversal fix in optimized deps `.map` handling

---

## Cross-References

- **[ESCALATE → TheGuardians]:** 
  - Handlebars RCE (CRITICAL-001)
  - Protobufjs RCE (CRITICAL-002)
  - Vitest RCE (CRITICAL-003)
  - gRPC DoS (CRITICAL-004)
  - OpenTelemetry stack compromise (CRITICAL-005)
  - CRLF injection in form-data (P2-002)
  - Esbuild CORS bypass (P2-005)

- **[SEE TheGuardians static-analyzer]:**
  - Brace-expansion if backend parses untrusted globs
  - js-yaml if backend parses untrusted YAML
  - PostCSS XSS if CSS-in-JS is exposed

---

## JSON Summary

```json
{
  "audit_date": "2026-07-29",
  "project": "dev-crew",
  "package_manager": "npm",
  "scanned_projects": [
    "Source/Backend",
    "Source/Frontend",
    "Source/E2E",
    "Portal/Backend",
    "Portal/Frontend",
    "platform/orchestrator"
  ],
  "total_cves": 94,
  "severity_breakdown": {
    "critical": 5,
    "high": 19,
    "moderate": 58,
    "low": 12
  },
  "P1_findings": 5,
  "P2_findings": 6,
  "P3_findings": 3,
  "critical_packages": [
    {
      "name": "handlebars",
      "version_range": "<=4.7.8",
      "cves": ["GHSA-2w6w-674q-4c4q", "GHSA-3mfm-83xf-c92r"],
      "severity": "CRITICAL",
      "projects_affected": ["Source/Backend"]
    },
    {
      "name": "protobufjs",
      "version_range": "<7.5.5",
      "cves": ["GHSA-xq3m-2v4x-88gg"],
      "severity": "CRITICAL",
      "projects_affected": ["Portal/Backend"]
    },
    {
      "name": "vitest",
      "version_range": "<3.2.6",
      "cves": ["GHSA-5xrq-8626-4rwp"],
      "severity": "CRITICAL",
      "projects_affected": ["Portal/Backend"]
    }
  ],
  "supply_chain_risk": {
    "highest_transitive_count": 577,
    "project": "Portal/Backend",
    "risk_level": "MEDIUM"
  },
  "next_actions": [
    "Update @opentelemetry/auto-instrumentations-node to >=0.79.0",
    "Update vitest to >=3.2.6",
    "Audit and patch handlebars (Source/Backend)",
    "Update express to >=4.18.3",
    "Update form-data to >=4.0.6",
    "Escalate findings to TheGuardians for code-execution risks"
  ]
}
```

---

## Learnings for Next Audit

_(To be updated in `Teams/TheInspector/learnings/dependency-auditor.md`)_

1. **High-risk packages in this stack:**
   - OpenTelemetry auto-instrumentation (large transitive dep tree, multiple HIGH vulns)
   - Vitest (fast-moving project; RCE risk in UI server)
   - Handlebars (if used for templates; many injection risks)

2. **Audit cadence:** Re-run npm audit monthly or after major version bumps.

3. **Watch list:**
   - protobufjs (inherited via gRPC/OpenTelemetry)
   - brace-expansion (DoS risk; ensure minimatch/glob are up-to-date)
   - Vitest (breaking changes between major versions; plan upgrade carefully)

4. **License notes:** No GPL/AGPL in this project; all commercial use permitted.

5. **Supply chain:** Portal/Backend's 577 transitive deps is above threshold. Recommend reducing auto-instrumentation footprint.

---

**Auditor:** Dependency Auditor (dependency_auditor)  
**Status:** COMPLETE — Ready for escalation to TheGuardians and TheFixer
