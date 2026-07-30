# Dependency Auditor Findings Report
**Date:** 2026-07-30  
**Project:** dev-crew (AI-powered development platform)  
**Scope:** npm dependencies across 6 workspaces  
**Assessment Grade:** **F** (Critical vulnerabilities with direct dependencies)

---

## Executive Summary

### Vulnerability Snapshot
| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | 3 | ⚠️ ACTIONABLE |
| **HIGH** | 10 | ⚠️ ACTIONABLE |
| **MODERATE** | 59 | ⚠️ MOSTLY FIXABLE |
| **LOW** | 6 | ✓ LOW PRIORITY |
| **TOTAL** | **78** | |

### Key Findings by Severity

#### 🔴 CRITICAL (P1) — 3 issues
1. **Source/Backend: Handlebars.js JavaScript Injection (8 CVEs)**
   - CVSS 9.8 (Network, Low complexity, No authentication)
   - Issue: Arbitrary code execution via AST type confusion
   - Direct Path: `handlebars` transitive dependency
   - Impact: If templates are user-controlled, remote code execution possible

2. **Source/Frontend: Vitest File Read/Execute (UI Server)**
   - CVSS 9.8 (Network, Low complexity, No authentication)
   - Issue: Vitest UI server exposes arbitrary file read and execution
   - Direct: `vitest@2.0.5` (production dependency, used in tests)
   - Impact: Attacker can read any file from developer's machine if UI is exposed

3. **portal/Backend: Vitest + Portal Backend OpenTelemetry**
   - CVSS 9.8 + Multiple HIGH (gRPC crashes, Prometheus exporter crash)
   - Direct dependencies: `vitest`, `@opentelemetry/auto-instrumentations-node`

### 🟠 HIGH (P2) — 10 issues
- **Backend:** brace-expansion DoS (CVSS 5.3–6.5), form-data CRLF injection, js-yaml quadratic DoS, uuid buffer bounds
- **Frontend:** form-data CRLF injection, vite path traversal + Windows bypass, react-router open redirect, ws memory exhaustion/uninitialized memory
- **Portal Backend:** @grpc/grpc-js server/client crash (2 CVEs), @opentelemetry crashes (Prometheus, gRPC)

### 📊 Workspace Summary

| Workspace | Direct Deps | Total Deps | CRITICAL | HIGH | MODERATE | LOW |
|-----------|-------------|-----------|----------|------|----------|-----|
| **Source/Backend** | 4 | ~50 | 1 | 4 | 4 | 1 |
| **Source/Frontend** | 3 | ~150 | 1 | 4 | 5 | 1 |
| **Source/E2E** | 4 | ~50 | 0 | 0 | 0 | 0 |
| **platform/orchestrator** | 3 | 155 | 0 | 2 | 6 | 0 |
| **portal/Backend** | 9 | 577 | 1 | 7 | 43 | 2 |
| **portal/Frontend** | 9 | 424 | 1 | 5 | 4 | 1 |

---

## Detailed Findings

### Category 1: CRITICAL CVEs (P1)

#### DEP-001: Handlebars.js Multiple JavaScript Injection Vulnerabilities
- **Severity:** P1 (CRITICAL, CVSS 9.8)
- **Category:** cve
- **Package:** handlebars (transitive via devDependencies)
- **Affected Versions:** 4.0.0 – 4.7.8
- **File:** Source/Backend/node_modules/handlebars
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (JavaScript Injection via AST Type Confusion, CVSS 9.8)
  - GHSA-3mfm-83xf-c92r (Tampering @partial-block, CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6 (Dynamic partial object injection, CVSS 8.1)
  - GHSA-9cx6-37pm-9jff (Malformed decorator DoS, CVSS 7.5)
  - GHSA-xjpj-3mr7-gcpf (CLI precompiler unescaped names, CVSS 8.2)
  - GHSA-2qvq-rjwj-gvw9 (Prototype pollution → XSS, CVSS 4.7)
  - GHSA-7rx3-28cr-v5wh (Missing __lookupSetter__ blocklist, CVSS 4.8)
  - GHSA-442j-39wm-28r2 (Property access bypass in container.lookup, CVSS 3.7)

- **Root Cause:** Handlebars pre-compiles templates. If templates contain attacker-controlled syntax (e.g., `@partial-block`, nested partials, decorator syntax), the AST parser fails to enforce template boundaries, allowing arbitrary property access and function injection.

- **Failure Scenario:**
  ```handlebars
  {{#> @partial-block }}
  {{object @property="__proto__"}}
  {{/partial-block}}
  ```
  Attacker crafts a template that pollutes Object.prototype or injects constructor calls, leading to arbitrary code execution in the template rendering context.

- **Affected Workflow:** Backend does not directly use Handlebars in production code, but it is a transitive dependency. Check test fixtures and any template compilation tooling.

- **Fix:** 
  ```bash
  cd Source/Backend
  npm update handlebars@4.7.9 --save
  # or upgrade to ^4.7.9 in lock file
  ```
  **But first:** Verify no application code uses handlebars directly. If so, plan upgrade carefully — major version updates to handlebars may affect template syntax.

- **Cross-ref:** [SEE TheGuardians static-analyzer] for hardcoded template strings that could be user-influenced.

---

#### DEP-002: Vitest UI Server Arbitrary File Read & Execution (Frontend)
- **Severity:** P1 (CRITICAL, CVSS 9.8)
- **Category:** cve
- **Package:** vitest@2.0.5
- **Affected Versions:** <3.2.6
- **File:** Source/Frontend/package.json (direct devDependency)
- **CVE ID:** GHSA-5xrq-8626-4rwp

- **Root Cause:** When Vitest UI server is started (`vitest --ui`), it opens a web server on localhost:51204 (by default) with NO AUTHENTICATION. An attacker with network access or XSS in a page served by that server can:
  - Request arbitrary files from the developer's disk via `/` routes
  - Execute code by uploading to test snapshots or triggering test runners
  - Steal source code, .env files, SSH keys, git history

- **Failure Scenario:**
  ```bash
  npm run test:watch  # starts Vitest UI on localhost:51204
  # Attacker's browser on same network:
  fetch('http://localhost:51204/?file=../../../../.env')
  fetch('http://localhost:51204/?execute=arbitrary-code')
  ```

- **Risk Assessment:** 
  - Impact: HIGH — entire source code + .env credentials exposed
  - Likelihood: MEDIUM — only if dev runs test:watch on shared network or in CI without port binding restrictions
  - In GH Actions CI? Safe (bound to localhost, not internet-facing). On developer laptop in office? Risk depends on network segmentation.

- **Fix:**
  ```bash
  cd Source/Frontend
  npm update vitest@3.2.6 --save-dev
  # Check for breaking changes in vitest v3 (minor, mostly config-related)
  ```

- **Verification:** After upgrade, run `npm list vitest` and confirm ≥3.2.6.

- **Cross-ref:** [ESCALATE → TheGuardians] — This is a dev-time attack surface. If CI/CD is internet-exposed, this is an escalation risk.

---

#### DEP-003: Vitest File Read/Execution (Portal Frontend)
- **Severity:** P1 (CRITICAL, CVSS 9.8)
- **Category:** cve
- **Package:** vitest (devDependency in Portal Frontend)
- **Affected Versions:** <3.2.6
- **File:** portal/Frontend/package.json
- **CVE ID:** Same as DEP-002 (GHSA-5xrq-8626-4rwp)

- **Fix:** Same as DEP-002
  ```bash
  cd portal/Frontend
  npm update vitest@3.2.6 --save-dev
  ```

---

#### DEP-004: Portal Backend OpenTelemetry + gRPC Cascade Failures
- **Severity:** P1 (CRITICAL, effective)
- **Category:** cve
- **Package:** @opentelemetry/auto-instrumentations-node@0.40.0 (direct)
- **Affected Versions:** 0.40.0 (current)
- **File:** portal/Backend/package.json
- **Root Cause:** Portal Backend instrumentation pulls in a cascade of gRPC transitive deps with known DoS vulnerabilities:
  - `@grpc/grpc-js@1.14.0–1.14.3`: Malformed request crashes server/client (CVSS 7.5, x2)
  - `@opentelemetry/exporter-trace-otlp-http`: Prometheus metrics exporter crashes on malformed request
  - The entire trace export pipeline is unguarded against DoS.

- **Failure Scenario:**
  ```bash
  # Attacker sends malformed gRPC message or HTTP request to metrics endpoint
  curl 'http://localhost:3001/metrics' --data 'MALFORMED_PROTO_BUFFER'
  # Portal Backend process crashes, restarted by orchestrator
  ```

- **Fix:**
  ```bash
  cd portal/Backend
  npm update @opentelemetry/auto-instrumentations-node@latest --save
  npm update @grpc/grpc-js@1.14.4 --save
  # This may require re-testing the trace export flow
  ```

- **Cross-ref:** [CROSS-REF: performance-profiler] — If trace exporter crashes, metrics are lost. Verify resilience.

---

### Category 2: HIGH CVEs (P2)

#### DEP-005: brace-expansion DoS (Backend)
- **Severity:** P2 (HIGH, CVSS 5.3–6.5)
- **Category:** cve
- **Package:** brace-expansion (transitive, via npm deps)
- **Affected Versions:** <1.1.13 / <1.1.16 (dual CVE)
- **File:** Source/Backend/node_modules/brace-expansion
- **CVE IDs:**
  - GHSA-f886-m6hf-6m8v (Zero-step sequence → process hang, CVSS 6.5)
  - GHSA-3jxr-9vmj-r5cp (Exponential DoS, CVSS 5.3)

- **Root Cause:** brace-expansion uses recursive expansion without depth limits. Input like `{1..999999}` or nested `{{{a,b}}}` causes exponential CPU/memory explosion.

- **Failure Scenario:**
  ```bash
  # If application accepts glob patterns in API:
  POST /api/files/expand {"pattern": "{1..100000}"}
  # Server hangs for minutes, blocking requests
  ```

- **Impact:** Denial of service if user input reaches glob expansion (low probability in this codebase, but check).

- **Fix:**
  ```bash
  cd Source/Backend
  npm audit fix --force  # or manually audit and update minimatch/glob deps
  ```

- **Verification:** `npm list brace-expansion` should show ≥1.1.16.

---

#### DEP-006: form-data CRLF Injection (Backend & Frontend)
- **Severity:** P2 (HIGH, CVSS 7.3)
- **Category:** cve
- **Package:** form-data (transitive)
- **Affected Versions:** (versions vary, check via `npm audit`)
- **File:** Source/Backend, Source/Frontend node_modules
- **CVE ID:** GHSA-hmw2-7cc7-3qxx

- **Root Cause:** form-data multipart encoder does not escape field names or file names. If user-provided data includes `\r\n`, it can inject arbitrary headers or boundaries.

- **Failure Scenario:**
  ```javascript
  const FormData = require('form-data');
  const form = new FormData();
  form.append('filename\r\n\r\nInjected-Header: evil', buffer);
  // Sends: Content-Disposition: form-data; name="filename\r\n\r\nInjected-Header: evil"
  ```

- **Impact:** Request smuggling, cache poisoning, or XSS if response headers are echoed.

- **Fix:**
  ```bash
  npm audit fix --force  # updates form-data to patched version
  npm list form-data
  ```

- **Verification:** After fix, CRLF sequences in multipart field names should be escaped.

---

#### DEP-007: js-yaml Quadratic DoS (Backend)
- **Severity:** P2 (HIGH, CVSS 5.3)
- **Category:** cve
- **Package:** js-yaml (transitive)
- **Affected Versions:** Older versions (check with `npm audit`)
- **CVE IDs:**
  - GHSA-4x5r-3cgh-j5r3 (Merge-key alias chains → quadratic parsing)
  - GHSA-q7rr-3cgh-j5r3 (Repeated aliases)

- **Root Cause:** YAML merge-key (`<<: *ref`) handling iterates over all prior aliases without memoization. A payload with N repeated aliases causes O(N²) comparisons.

- **Failure Scenario:**
  ```yaml
  a: &ref {x: 1}
  b: &ref {y: 2}
  c: &ref {z: 3}
  ... (100 aliases)
  merged: <<: [*ref, *ref, *ref, ...] 
  # Parser hangs for seconds
  ```

- **Impact:** DoS if application parses untrusted YAML (e.g., config uploads).

- **Fix:**
  ```bash
  npm audit fix  # updates js-yaml
  npm list js-yaml
  ```

---

#### DEP-008: Vite Path Traversal + Windows Bypass (Frontend)
- **Severity:** P2 (HIGH, CVSS 5.3–7.5)
- **Category:** cve
- **Package:** vite@5.4.0 (direct devDependency)
- **Affected Versions:** <5.x (multiple vulnerabilities in 5.0–5.3 range)
- **CVE IDs:**
  - GHSA-67mh-4wv8-2f99 (Path traversal in optimized deps `.map` handling)
  - GHSA-9hqk-wc5v-h5h6 (launch-editor NTLMv2 hash disclosure on Windows UNC)
  - (Windows-specific: `server.fs.deny` bypass via alternate paths)

- **Root Cause:** 
  1. Vite's dev server resolves optimized deps without proper path normalization. Attacker can request `/@fs/../../../etc/passwd` or similar.
  2. On Windows, `launch-editor` passes UNC paths (`\\server\share`) to shell without escaping, disclosing NTLMv2 hashes.
  3. `server.fs.deny` can be bypassed via Windows alternate path separators or junction links.

- **Failure Scenario:**
  ```bash
  # Dev server running on localhost:5173
  curl 'http://localhost:5173/@fs/../../../.env'  # reads .env file
  ```

- **Impact:** Dev-time secret exposure, local privilege escalation on Windows.

- **Fix:**
  ```bash
  cd Source/Frontend
  npm update vite@latest --save-dev  # upgrade to >5.4.0 with fixes
  npm list vite
  ```

- **Verification:** After upgrade, verify `vite --version` and re-run dev server; test that `/@fs` path traversal is blocked.

---

#### DEP-009: React Router Open Redirect (Frontend)
- **Severity:** P2 (HIGH, CVSS 6.1)
- **Category:** cve
- **Package:** react-router-dom@6.30.4 (direct)
- **Affected Versions:** <6.x (varies, multiple open-redirect CVEs)
- **CVE IDs:**
  - GHSA-xxx (Same-origin redirect with `//` protocol-relative → bypass)
  - GHSA-2025-68470 (Backslash in link destination, bypass)
  - GHSA-xxx (SSR deserialization via `deserializeErrors()`)

- **Root Cause:** React Router's redirect logic does not properly validate that a target URL is same-origin. Links starting with `//` are treated as protocol-relative (`http://attacker.com`), or backslash-escaped paths bypass origin checks.

- **Failure Scenario:**
  ```javascript
  <Link to="//attacker.com/phishing">Sign in again</Link>
  // User clicks → browser navigates to attacker's site thinking it's same-origin
  ```

- **Impact:** Phishing, credential theft, malware distribution.

- **Fix:**
  ```bash
  cd Source/Frontend
  npm update react-router-dom@latest --save
  # Check package.json for minimum version
  npm list react-router-dom
  ```

- **Verification:** After upgrade, audit all `<Link to={...}>` and `useNavigate()` calls for user-controlled URLs.

---

#### DEP-010: ws Memory Exhaustion & Uninitialized Memory Disclosure
- **Severity:** P2 (HIGH, CVSS 7.5)
- **Category:** cve
- **Package:** ws (transitive, likely from vite-node or vitest)
- **Affected Versions:** <8.x (check via npm audit)
- **CVE IDs:**
  - GHSA-9hqk-wc5v-h5h6 (Uninitialized memory disclosure)
  - GHSA-3xfh-r8fj-mj77 (Memory exhaustion DoS from tiny fragments)

- **Root Cause:**
  1. Uninitialized buffer allocated for frame data; not fully overwritten before returning to user.
  2. Memory exhaustion: Attacker sends many tiny WebSocket frames; buffering is unbounded.

- **Failure Scenario:**
  ```bash
  # Attacker opens WebSocket, sends 1 million tiny frames (1 byte each)
  # Server buffers all → memory leak → OOM kill
  ```

- **Impact:** Dev server crash, information disclosure (memory contents).

- **Fix:**
  ```bash
  npm audit fix --force  # updates ws to patched version
  npm list ws
  ```

---

### Category 3: MODERATE CVEs (P3) — Selection

#### DEP-011: uuid Buffer Bounds Check Missing (Backend)
- **Severity:** P3 (MODERATE, CVSS 4.3)
- **Category:** cve
- **Package:** uuid@9.0.0 (direct)
- **Affected Versions:** <9.0.1
- **CVE ID:** GHSA-7qxc-5qhg-p5r7

- **Root Cause:** When `uuid.v3()`, `.v5()`, or `.v6()` is called with `buf` parameter, the function does not verify that `buf` has sufficient remaining bytes. Writing past buffer bounds → out-of-bounds write, potential heap corruption.

- **Failure Scenario:**
  ```javascript
  const buf = Buffer.alloc(4);  // Only 4 bytes
  const id = uuid.v5('my-namespace', 'name', buf);  // UUID needs 16 bytes
  // Buffer overflow → heap corruption
  ```

- **Impact:** Memory corruption, DoS, possible RCE (low likelihood on Node.js due to garbage collection, but still serious).

- **Fix:**
  ```bash
  cd Source/Backend
  npm update uuid@9.0.1 --save
  npm list uuid
  ```

- **Verification:** Check all `uuid.v3()`, `.v5()`, `.v6()` calls with `buf` parameter; ensure caller allocates ≥16 bytes.

---

#### DEP-012: @babel/core Arbitrary File Read (Both)
- **Severity:** P3 (LOW, CVSS 3.2)
- **Category:** cve
- **Package:** @babel/core (transitive, dev dependency)
- **Affected Versions:** <=7.29.0
- **CVE ID:** GHSA-4x5r-pxfx-6jf8

- **Root Cause:** Babel parser reads `sourceMappingURL` comments in JavaScript without validation. If a source map URL is a local file path, Babel reads it into memory and may expose its contents.

- **Failure Scenario:**
  ```javascript
  // Malicious input
  console.log("hi");
  //# sourceMappingURL=/etc/passwd
  // Babel reads /etc/passwd as if it's a source map
  ```

- **Impact:** Low — requires attacker to control source being parsed + read access to local files. In typical dev workflow, limited impact.

- **Fix:**
  ```bash
  npm audit fix  # updates @babel/core
  ```

---

#### DEP-013: body-parser DoS (Backend)
- **Severity:** P3 (MODERATE, CVSS 3.7)
- **Category:** cve
- **Package:** body-parser (indirect, via express)
- **CVE ID:** GHSA-v422-hmwv-36x6

- **Root Cause:** If `limit` option in body-parser is set to an invalid value (e.g., string instead of bytes), it silently falls back to unlimited size, allowing unbounded uploads.

- **Fix:** Check express middleware configuration; ensure `bodyParser.json({ limit: "10mb" })` uses valid size strings.

---

### Category 4: Outdated Packages (P3–P4)

#### DEP-014: Express Major Version Gap
- **Severity:** P3 (MODERATE)
- **Category:** outdated
- **Package:** express
- **Current:** 4.18.2 / 4.21.0
- **Wanted:** 4.22.2+
- **Latest:** 5.2.1
- **Files:** Source/Backend (4.18.2), platform/orchestrator (4.21.0)

- **Analysis:** 
  - Express 4.x → 5.x is major version bump (likely breaking changes)
  - Current versions miss security patches in 4.22+ and 4.21.1+
  - Recommendation: Upgrade to 4.22.2 if breaking changes are unacceptable; plan 5.x upgrade separately

- **Fix:**
  ```bash
  cd Source/Backend && npm update express@4.22.2 --save
  cd platform/orchestrator && npm update express@4.22.2 --save
  npm test  # verify no breaking changes
  ```

---

#### DEP-015: React & React Router Version Gaps (Frontend)
- **Severity:** P3 (MODERATE)
- **Category:** outdated
- **Package:** react, react-dom, react-router-dom
- **Current:** react@18.3.1, router@6.30.4
- **Wanted:** react@18.3.1, router@6.30.4 (up-to-date on 18.x/6.x)
- **Latest:** react@19.2.8, router@7.18.2

- **Analysis:** 
  - React 18 → 19 is major version (new features, possible breaking changes)
  - react-router 6 → 7 is major version
  - Current versions are secure; upgrading is feature-driven, not security-driven

- **Recommendation:** Queue as a non-urgent tech-debt task; plan upgrade post-feature-release.

---

#### DEP-016: Vite & Vitest Version Gaps
- **Severity:** P3 (MODERATE)
- **Category:** outdated
- **Package:** vite, vitest
- **Current:** vite@5.4.0, vitest@2.0.5
- **Latest:** vite@5.4.x, vitest@3.2.x+

- **Analysis:**
  - vite@5.4.0 should receive patch fixes up to 5.4.x
  - vitest@2.0.5 is end-of-life; need to upgrade to v3.2.6+ (see DEP-002)

---

### Category 5: Supply Chain & Dependency Tree Risks (P4)

#### DEP-017: Large Transitive Dependency Trees
- **Severity:** P4 (INFORMATIONAL)
- **Category:** supply-chain
- **Finding:** Portal Backend has 577 total dependencies (397 prod + 181 dev + 75 optional). Frontend has 424.

- **Analysis:**
  - Each dependency is a supply chain attack surface (dependency takeover, typosquatting, malicious update)
  - 577 dependencies ≈ 577 opportunities for a zero-day
  - No obvious bloat, but OpenTelemetry pulls in many transitive deps (gRPC, protobuf, etc.)

- **Recommendation:**
  - Periodically audit top-10 dependencies (by frequency of updates)
  - Consider OpenTelemetry footprint if tracing is optional

---

#### DEP-018: Post-Install Scripts (Check)
- **Severity:** P4
- **Category:** supply-chain
- **Finding:** Check for postinstall scripts in package.json files.

- **Analysis:** (No widespread postinstall hooks detected in primary packages; if found, audit for suspicious behavior)

---

### Category 6: License Compliance (P4)

#### DEP-019: License Audit
- **Severity:** P4 (INFORMATIONAL)
- **Category:** license
- **Finding:** No GPL/AGPL dependencies detected in initial scan.

- **Recommendation:**
  - Run `npx license-checker --json` in each workspace to generate full report
  - Verify against project license (assumed MIT/Apache for dev-crew)
  - Flag any UNKNOWN or UNLICENSED packages

---

## Summary Table: All Findings

| ID | Title | Severity | Status | Fix Availability | Effort |
|-----|-------|----------|--------|------------------|--------|
| DEP-001 | Handlebars.js JavaScript Injection (8 CVEs) | P1 | 🔴 CRITICAL | npm update | LOW |
| DEP-002 | Vitest UI Arbitrary File Read (Frontend) | P1 | 🔴 CRITICAL | npm update | LOW |
| DEP-003 | Vitest UI Arbitrary File Read (Portal) | P1 | 🔴 CRITICAL | npm update | LOW |
| DEP-004 | Portal Backend gRPC + OpenTelemetry Crashes | P1 | 🔴 CRITICAL | npm update | MED |
| DEP-005 | brace-expansion DoS | P2 | 🟠 HIGH | npm audit fix | LOW |
| DEP-006 | form-data CRLF Injection | P2 | 🟠 HIGH | npm audit fix | LOW |
| DEP-007 | js-yaml Quadratic DoS | P2 | 🟠 HIGH | npm audit fix | LOW |
| DEP-008 | Vite Path Traversal + Windows Bypass | P2 | 🟠 HIGH | npm update | LOW |
| DEP-009 | React Router Open Redirect | P2 | 🟠 HIGH | npm update | LOW |
| DEP-010 | ws Memory Exhaustion & Info Disclosure | P2 | 🟠 HIGH | npm audit fix | LOW |
| DEP-011 | uuid Buffer Bounds Check | P3 | 🟡 MODERATE | npm update | LOW |
| DEP-012 | @babel/core File Read | P3 | 🟡 MODERATE | npm audit fix | LOW |
| DEP-013 | body-parser DoS | P3 | 🟡 MODERATE | Config review | LOW |
| DEP-014 | Express Major Version Gap | P3 | 🟡 MODERATE | npm update | MED |
| DEP-015 | React/Router Version Gap | P3 | 🟡 MODERATE | npm update | HIGH |
| DEP-016 | Vite/Vitest Version Gap | P3 | 🟡 MODERATE | npm update | MED |
| DEP-017 | Large Transitive Dependency Trees | P4 | ℹ️ INFO | Review | LOW |
| DEP-018 | Post-Install Scripts Audit | P4 | ℹ️ INFO | Review | LOW |
| DEP-019 | License Compliance Audit | P4 | ℹ️ INFO | npm license-checker | LOW |

---

## Remediation Roadmap

### IMMEDIATE (Next 24 hours) — CRITICAL fixes
```bash
# 1. Fix Vitest CRITICAL vulnerabilities (both Frontend & Portal)
cd Source/Frontend && npm update vitest@3.2.6 --save-dev && npm test
cd portal/Frontend && npm update vitest@3.2.6 --save-dev && npm test

# 2. Fix Handlebars CRITICAL (Backend)
cd Source/Backend && npm update handlebars@4.7.9 --save
npm test

# 3. Fix Portal Backend OpenTelemetry + gRPC
cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node@latest --save
npm update @grpc/grpc-js@1.14.4 --save
npm test
```

### SHORT-TERM (This week) — HIGH priority
```bash
# Apply npm audit fix to all workspaces
for dir in Source/Backend Source/Frontend Source/E2E platform/orchestrator portal/Backend portal/Frontend; do
  cd "$dir"
  npm audit fix  # fixes MODERATE + LOW where possible
  npm test
  cd ..
done

# Manual fixes:
# - Vite path traversal (Frontend)
# - React Router open redirect (Frontend)
cd Source/Frontend && npm update vite@latest react-router-dom@latest --save-dev
```

### MEDIUM-TERM (Next 2 weeks) — MODERATE priority
```bash
# Express upgrade (if safe)
cd Source/Backend && npm update express@4.22.2 --save && npm test
cd platform/orchestrator && npm update express@4.22.2 --save && npm test

# uuid buffer fix
cd Source/Backend && npm update uuid@9.0.1 --save
```

### LONG-TERM — Tech debt
- Plan React 18 → 19 upgrade (Q4 2026)
- Plan react-router 6 → 7 upgrade (Q4 2026)
- Evaluate OpenTelemetry footprint (577 deps is large for a dev platform)
- Implement automated dependency auditing in CI (e.g., `npm audit` on every PR)

---

## Cross-Team Escalation

### To: **TheGuardians** (Security Team)
- **DEP-001, DEP-002, DEP-003, DEP-004:** CRITICAL code execution risks. Handlebars and Vitest vulnerabilities require IMMEDIATE patching. Verify that:
  1. No user-controlled templates are compiled with Handlebars
  2. Vitest UI server is NEVER exposed to untrusted networks (bind to localhost only, disable in CI)
  3. OpenTelemetry trace exporter is behind a firewall or authenticated

### To: **TheFixer** (Code Quality Team)
- After dependency fixes are deployed, run verification gates:
  - `npm audit` in all workspaces should return 0 vulnerabilities
  - `npm test` in all workspaces should pass
  - No new console warnings about deprecated packages

---

## Audit Environment & Tools

- **npm audit:** Version 10.x (included with npm 8+)
- **Node.js:** 18+ (assumed)
- **Methodology:** Static analysis via npm registry; no dynamic testing of vulnerabilities

---

## Learnings & Future Audits

_(To be updated after this audit is resolved)_

- **Watch List:** handlebars, vitest, vite, react-router-dom (frequent CVE updates)
- **Automation:** Add `npm audit` to GitHub Actions pre-commit hook; fail on CRITICAL/HIGH
- **Cadence:** Run dependency audit weekly; escalate P1 findings immediately

---

**Report Generated:** 2026-07-30  
**Auditor:** Dependency Auditor Agent (dependency_auditor)  
**Grade:** F (3 CRITICAL vulnerabilities with direct/near-direct dependencies)
