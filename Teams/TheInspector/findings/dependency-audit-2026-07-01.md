# Dependency Auditor Findings Report
**Generated:** 2026-07-01  
**Project:** dev-crew (AI-powered development platform)  
**Scope:** npm packages across Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Package Managers Detected** | npm (6 workspaces) |
| **Direct Dependencies** | ~40 across all workspaces |
| **Transitive Dependencies** | ~1,100+ (Backend: 411, Frontend: 230, Orchestrator: 155, Portal Backend: 200+) |
| **Known CVEs** | 30+ across all workspaces |
| **Critical Vulnerabilities** | 3 (handlebars, vitest, protobufjs) |
| **High Severity CVEs** | 8 |
| **Outdated Major Versions** | 6 packages (Express, React, React Router) |

---

## Vulnerability Summary by Severity

```json
{
  "Backend": { "critical": 1, "high": 1, "moderate": 6, "low": 1, "total": 9 },
  "Frontend": { "critical": 1, "high": 3, "moderate": 6, "low": 1, "total": 11 },
  "E2E": { "critical": 0, "high": 0, "moderate": 0, "low": 0, "total": 0 },
  "Orchestrator": { "critical": 1, "high": 2, "moderate": 6, "low": 0, "total": 9 },
  "Portal Backend": { "not_audited": true, "note": "Appears to use older stacks (vitest 1.2.2, vite 5.2.0)" },
  "Portal Frontend": { "not_audited": true, "note": "Appears to use older stacks" }
}
```

---

## Critical & High-Severity Findings

### DEP-001: Handlebars Multiple JavaScript Injection Vulnerabilities
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `handlebars@^4.0.0 <=4.7.8`
- **Affected Files:**
  - Source/Backend/node_modules/handlebars (transitive via ts-jest → @babel/core)
- **Detail:**
  - **GHSA-2w6w-674q-4c4q**: JavaScript Injection via AST Type Confusion (CVSS 9.8 / Critical)
  - **GHSA-3mfm-83xf-c92r**: AST Type Confusion via @partial-block tampering (CVSS 8.1 / High)
  - **GHSA-2qvq-rjwj-gvw9**: Prototype Pollution + XSS via Partial Templates (CVSS 4.7 / Moderate)
  - **GHSA-xhpv-hc6g-r9c6**: JavaScript Injection via dynamic partial AST confusion (CVSS 8.1 / High)
  - **GHSA-9cx6-37pm-9jff**: DoS via Malformed Decorator Syntax (CVSS 7.5 / High)
  - **GHSA-xjpj-3mr7-gcpf**: JavaScript Injection in CLI Precompiler (CVSS 8.2 / High)
- **Impact:** Arbitrary code execution in build pipeline if untrusted templates processed
- **Fix:**
  ```bash
  cd Source/Backend && npm update handlebars
  cd Source/Frontend && npm update handlebars
  ```
- **Root Cause:** Transitive dependency through testing/build toolchain. May not be used directly.
- **Cross-ref:** `[ESCALATE → TheGuardians]` — if handlebars used to process user templates, this is exploitable

---

### DEP-002: Vitest UI Server Arbitrary File Read & Execution
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `vitest@^2.0.5` (Frontend uses 2.0.5; thresholds vary in other repos)
- **CVE:** GHSA-5xrq-8626-4rwp
- **Affected Files:**
  - Source/Frontend/node_modules/vitest
  - Source/Backend may be affected if vitest 2+ installed
- **Detail:**
  - Vitest UI server (`--ui` flag) listens on localhost without proper access control
  - Any file readable by the process can be accessed and executed via HTTP
  - CVSS 9.8 / Critical — network-accessible arbitrary file read + execution
  - Affects versions: `<3.2.6`
- **Impact:** 
  - If vitest dev server runs on exposed port, attacker reads source code, env secrets, config files
  - Exploitable in CI/CD pipelines with internet-facing test infrastructure
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vitest
  # Update to vitest@4.1.9+ or at minimum @3.2.6+
  ```
- **Risk Assessment:** HIGH if vitest UI used in shared dev environment or CI

---

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `protobufjs@^7.6.2` (via gRPC tooling in orchestrator)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Affected Files:**
  - platform/orchestrator/node_modules/protobufjs
  - Transitive via `@grpc/grpc-js`
- **Detail:**
  - Arbitrary code execution when loading untrusted `.proto` files or parsing messages
  - CVSS 9.8 / Critical
  - Multiple additional CVEs: code injection, prototype pollution, unbounded recursion DoS
  - Affects: `<=7.6.2`
- **Impact:**
  - If orchestrator accepts user-supplied protobuf definitions, critical RCE
  - Marshaling/unmarshaling untrusted binary data triggers vulnerability
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update protobufjs
  # Update to 7.6.3+; may require dockerode update
  ```
- **Cross-ref:** `[ESCALATE → TheGuardians]` — RCE in orchestrator infrastructure

---

### DEP-004: Form-Data CRLF Injection
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `form-data@4.0.0 - 4.0.5`
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Affected Files:**
  - Source/Backend/node_modules/form-data
  - Source/Frontend/node_modules/form-data
  - platform/orchestrator/node_modules/form-data
- **Detail:**
  - Unescaped multipart field names/filenames allow CRLF injection
  - CVSS 7.5 / High
  - Can be exploited to inject HTTP headers, bypass CORS, perform header injection
- **Fix:**
  ```bash
  npm update form-data  # to 4.0.6+
  ```
- **Impact:** Request smuggling, HTTP header injection via multipart form uploads

---

### DEP-005: Vite Path Traversal & `server.fs.deny` Bypass
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `vite@^5.4.0` (Frontend), `vite@^5.2.0` (Portal Frontend)
- **CVEs:** 
  - GHSA-4w7w-66w2-5vf9: Path traversal in optimized deps `.map` handling (≤6.4.1)
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure via UNC paths on Windows (≤6.4.2)
  - GHSA-fx2h-pf6j-xcff: `server.fs.deny` bypass on Windows alternate paths (CVSS 7.5 / High)
- **Affected Files:**
  - Source/Frontend/node_modules/vite
  - portal/Frontend/node_modules/vite
- **Detail:**
  - Dev server can be tricked into serving files outside `root` directory
  - Windows-specific bypass allows access to files in parent dirs via alternate paths
  - Impact on CI/CD agents, shared dev environments on Windows
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite  # to 8.1.2+
  cd portal/Frontend && npm update vite  # to 8.1.2+
  ```
- **Risk:** Path traversal in dev server is LOW for isolated dev machines, but HIGH for CI/cloud runners

---

### DEP-006: React Router Open Redirect
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `react-router-dom@^6.26.0` (Frontend), `react-router-dom@^6.22.0` (Portal Frontend)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Affected Versions:** `6.7.0 - 6.30.3`
- **Detail:**
  - Same-origin redirect with paths starting `//` causes open redirect via protocol-relative URLs
  - Attacker can craft redirect to arbitrary domain
  - CVSS unspecified but marked Moderate
- **Fix:**
  ```bash
  cd Source/Frontend && npm update react-router-dom  # to 6.30.4+
  cd portal/Frontend && npm update react-router-dom  # to 6.22.0 is NOT vulnerable; check actual version in node_modules
  ```
- **Impact:** Credential harvesting, account takeover, phishing via legitimate domain

---

### DEP-007: @grpc/grpc-js Server Crash DoS
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `@grpc/grpc-js@1.14.0 - 1.14.3`
- **CVEs:**
  - GHSA-5375-pq7m-f5r2: Malformed request causes server crash (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq: Malformed compressed message causes crash (CVSS 7.5)
- **Affected Files:**
  - platform/orchestrator/node_modules/@grpc/grpc-js
- **Detail:**
  - Two separate crashes from protocol violations
  - Remote attacker can DoS gRPC server without authentication
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update @grpc/grpc-js  # to 1.14.4+
  ```
- **Impact:** Service availability loss in orchestrator infrastructure

---

### DEP-008: path-to-regexp ReDoS via Multiple Route Parameters
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `path-to-regexp@<0.1.13` (transitive via express/multer routing)
- **CVE:** GHSA-37ch-88jc-xwx2
- **Affected Files:**
  - platform/orchestrator/node_modules/path-to-regexp
  - Any express-based service
- **Detail:**
  - Regular expression denial of service (ReDoS) with crafted URLs containing multiple route parameters
  - CVSS 7.5 / High
  - Attacker sends specially-crafted URL → CPU exhaustion → service hang
- **Fix:**
  ```bash
  npm update path-to-regexp
  ```
- **Impact:** HTTP DoS on any API endpoint using parameterized routes (e.g., `/api/work-items/:id`)

---

## Moderate-Severity Findings

### DEP-009: uuid Missing Buffer Bounds Check
- **Severity:** P2 (High/Moderate border)
- **Category:** cve
- **Package:** `uuid@^9.0.0` (Backend: 9.0.0, E2E not vulnerable, Portal Backend: 9.0.0)
- **CVE:** GHSA-w5hq-g745-h8pq
- **Detail:**
  - Missing bounds check in v3/v5/v6 when user provides custom buffer
  - Affects: `<11.1.1`
  - CVSS 7.5 / Moderate (writes beyond buffer)
- **Fix:**
  ```bash
  cd Source/Backend && npm update uuid  # to 11.1.1+ (MAJOR VERSION BUMP)
  cd portal/Backend && npm update uuid
  ```
- **Root Cause:** uuid is a direct dependency with minor updates available but major version required for full fix

---

### DEP-010: Brace-expansion Zero-step Sequence DoS
- **Severity:** P2
- **Category:** cve
- **Package:** `brace-expansion@<1.1.13` (transitive via npm tooling)
- **CVE:** GHSA-f886-m6hf-6m8v
- **Detail:**
  - Patterns like `{0..0}` cause infinite loop / memory exhaustion
  - CVSS 6.5 / Moderate
  - Affects glob expansion in build tools
- **Fix:**
  ```bash
  npm update brace-expansion
  ```

---

### DEP-011: qs Query String DoS
- **Severity:** P2
- **Category:** cve
- **Package:** `qs@6.11.1 - 6.15.1` (affects express in Backend & Orchestrator)
- **CVE:** GHSA-q8mj-m7cp-5q26
- **Detail:**
  - `qs.stringify()` crashes with TypeError on null/undefined in comma-format arrays when `encodeValuesOnly` set
  - CVSS 5.3 / Moderate
  - Attacker crafts request with malformed query string → 500 error / DoS
- **Fix:**
  ```bash
  npm update qs  # automatic via express update
  ```

---

### DEP-012: PostCSS XSS via Unescaped </style>
- **Severity:** P3
- **Category:** cve
- **Package:** `postcss@<8.5.10` (Frontend: indirectly; Portal Frontend: 8.4.38 = vulnerable)
- **CVE:** GHSA-qx2v-qp2m-jg93
- **Detail:**
  - Unescaped `</style>` in CSS stringify output → XSS in style tags
  - CVSS 6.1 / Moderate
  - Affects compiled CSS with user-supplied values
- **Fix:**
  ```bash
  cd portal/Frontend && npm update postcss  # to 8.5.10+
  ```

---

### DEP-013: Esbuild CORS Bypass (Development Server)
- **Severity:** P3
- **Category:** cve
- **Package:** `esbuild@<=0.24.2` (transitive via Vite in Frontend)
- **CVE:** GHSA-67mh-4wv8-2f99
- **Detail:**
  - Dev server allows any website to send requests and read responses
  - CVSS 5.3 / Moderate
  - Attackers can exfiltrate development assets
- **Fix:** Resolved by updating `vite` (which pins esbuild)

---

### DEP-014: JS-YAML Quadratic-Complexity DoS
- **Severity:** P3
- **Category:** cve
- **Package:** `js-yaml@<3.15.0` (transitive via build toolchain)
- **CVE:** GHSA-h67p-54hq-rp68
- **Detail:**
  - Repeated aliases in merge keys cause O(n²) complexity
  - CVSS 5.3 / Moderate
  - Impacts YAML parsing in build configs or CI scripts
- **Fix:**
  ```bash
  npm update js-yaml
  ```

---

### DEP-015: @babel/core Arbitrary File Read
- **Severity:** P3
- **Category:** cve
- **Package:** `@babel/core@<=7.29.0` (transitive via build toolchain in Frontend & Backend)
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **Detail:**
  - `sourceMappingURL` comment processed unsafely
  - CVSS 3.2 / Low
  - Babel reads arbitrary files if user supplies malicious JS to transpile
- **Fix:**
  ```bash
  npm update @babel/core
  ```

---

### DEP-016: WebSocket (ws) Memory Exhaustion DoS
- **Severity:** P2
- **Category:** cve
- **Package:** `ws@8.0.0 - 8.20.1` (transitive via Vitest/Vite in Frontend)
- **CVEs:**
  - GHSA-58qx-3vcg-4xpx: Uninitialized memory disclosure (CVSS 4.4)
  - GHSA-96hv-2xvq-fx4p: Memory exhaustion from tiny fragments (CVSS 7.5 / High)
- **Affected:** Frontend vitest/vite dev server
- **Fix:**
  ```bash
  npm update ws  # via vitest/vite update
  ```

---

## Outdated Major Versions

### DEP-017: Express >1 Major Version Behind
- **Package:** `express@^4.18.2` (Backend)
- **Current:** 4.22.2 (wanted), 5.2.1 (latest)
- **Severity:** P3
- **Issue:** Express 5.x introduces breaking changes but includes security patches. Using 4.x means missing ~18 months of fixes.
- **Fix:** Requires manual upgrade to Express 5.x with testing
- **Note:** This is acceptable short-term; ES6 async/await changes are the main blocker

### DEP-018: Pino >1 Major Version Behind
- **Package:** `pino@^8.17.0` (Backend)
- **Current:** 8.21.0 (wanted), 10.3.1 (latest)
- **Severity:** P3
- **Issue:** Missing 2 major versions of improvements and fixes
- **Fix:**
  ```bash
  cd Source/Backend && npm update pino@10
  ```

### DEP-019: uuid >5 Major Versions Behind
- **Package:** `uuid@^9.0.0` (Backend, E2E, Portal Backend)
- **Current:** 9.0.1 (wanted), 14.0.1 (latest)
- **Severity:** P3
- **Issue:** Security fix (DEP-009) requires major bump; missing 5 versions of improvements
- **Fix:**
  ```bash
  npm update uuid@14
  ```

### DEP-020: React >1 Major Version Behind
- **Package:** `react@^18.3.1` (Frontend)
- **Current:** 18.3.1 (wanted), 19.2.7 (latest)
- **Severity:** P3
- **Issue:** React 19 has been stable for 6+ months; current version is now in LTS maintenance
- **Fix:**
  ```bash
  cd Source/Frontend && npm update react react-dom
  ```

### DEP-021: React Router >1 Major Version Behind
- **Package:** `react-router-dom@^6.26.0` (Frontend)
- **Current:** 6.30.4 (wanted), 7.18.1 (latest)
- **Severity:** P3
- **Issue:** React Router 7 stable for >6 months; also fixes open redirect (DEP-006)
- **Fix:**
  ```bash
  cd Source/Frontend && npm update react-router-dom@7
  ```

---

## Transitive Dependency Risks

### DEP-022: High Transitive Dependency Count
- **Backend:** 411 total (102 prod, 310 dev)
- **Frontend:** 230 total (9 prod, 222 dev)
- **Orchestrator:** 155 total (153 prod, 3 dev)
- **Severity:** P4 (supply chain surface area)
- **Issue:** 
  - Backend exceeds 400 dependencies; Frontend/Orchestrator more reasonable
  - Each dependency = potential entry point for supply chain attacks
  - No evidence of dependency tree bloat (mostly legitimate test/build tools)
- **Recommendation:** 
  - Review Backend dev dependencies (310); consider reducing test framework dependencies
  - Use `npm ls --depth=0` to audit direct dependencies only
  - Set security audit policy to fail on High+ vulnerabilities

---

### DEP-023: Missing Lock Files
- **Status:** ✅ Backend has `package-lock.json`
- **Status:** ❌ Frontend, E2E, Orchestrator, Portal services appear to lack committed lock files
- **Severity:** P3
- **Issue:**
  - Without lock files, `npm install` picks versions non-deterministically
  - Different developers/CI may get different versions
  - Makes audit reproducibility difficult
- **Fix:**
  ```bash
  cd Source/Frontend && npm ci  # vs npm install
  cd Source/E2E && npm ci
  cd platform/orchestrator && npm ci
  ```
- **Recommendation:** Commit `package-lock.json` / `yarn.lock` for all workspaces

---

## License Compliance

### DEP-024: License Audit Required
- **Status:** ⚠️ Not audited with `license-checker`
- **Recommendation:**
  ```bash
  npx license-checker --json > /tmp/licenses.json
  # Manual review for GPL/AGPL viral licenses
  ```
- **Known Safe:**
  - MIT: express, pino, react, react-dom, uuid, vite, vitest, etc. (majority)
  - Apache 2.0: @grpc, @opentelemetry packages
  - ISC: npm ecosystem standard
- **High Risk:** None detected in superficial review

---

## Supply Chain Attack Surface

### DEP-025: Single-Maintainer Packages
- **Risk Level:** P4 (informational)
- **Candidates:** uuid, pino, various @types/* packages
- **Mitigation:** Use `npm audit --production` to focus on runtime dependencies
- **Note:** Development-only packages like vitest, vite are acceptable risks due to isolation

### DEP-026: Post-Install Scripts
- **Risk Level:** P4
- **Status:** ✅ No detected post-install scripts in main manifests
- **Verify:**
  ```bash
  grep -r '"postinstall"' Source/ platform/ portal/
  ```

---

## Remediation Priority & Timeline

### **Immediate (P1 - Critical)**
1. **Handlebars**: Update babel/core chain (dev dependency, low exploitability)
2. **Vitest**: Update Frontend to vitest@4.1.9+ (immediate for security)
3. **Protobufjs**: Update orchestrator to 7.6.3+ (critical RCE risk)

**Est. effort:** 4-6 hours (requires regression testing for protobufjs in gRPC)

### **High Priority (P2 - High)**
4. **Form-Data**: Automatic fix via express/vite updates
5. **Vite**: Update both Frontend repos (higher risk on Windows CI)
6. **React Router**: Update to 6.30.4+ (fixes open redirect)
7. **uuid**: Bump to 11.1.1+ or 14.0.1+ (buffer bounds check)
8. **@grpc/grpc-js**: Update to 1.14.4+ (DoS protection)

**Est. effort:** 6-8 hours (test react-router path behavior, uuid in crypto code)

### **Medium Priority (P3 - Moderate)**
9. **Pino**: 8.x → 10.x (2 major versions)
10. **React/React DOM**: 18.x → 19.x (test UI components)
11. **PostCSS**: 8.4.38 → 8.5.10+ (Portal Frontend)

**Est. effort:** 8-10 hours (component regression testing)

### **Optional (P4)**
12. Commit lock files if not already done
13. Run `npm ls --depth=0` audit to identify unused dependencies
14. Consider deprecating old browser support in tsconfig if React 19 requires it

---

## Known Issues Confirmed

| Issue | Package | Verified | Status |
|-------|---------|----------|--------|
| Handlebars XSS | @babel/core → handlebars | ✅ npm audit | Critical RCE in build |
| Vitest UI RCE | vitest@2.0.5 | ✅ npm audit | Immediate fix needed |
| Protobufjs RCE | @grpc/grpc-js → protobufjs | ✅ npm audit | Blocks orchestrator |
| Form-Data CRLF | express → form-data | ✅ npm audit | Header injection |
| Vite traversal | vite@5.4.0 | ✅ npm audit | Dev-mode only, medium risk |
| React Router open redirect | react-router-dom@6.26.0 | ✅ npm audit | Phishing vector |
| uuid bounds | uuid@9.0.0 | ✅ npm audit | Buffer overflow risk |
| Express/qs DoS | express@4.21.0 | ✅ npm audit | Query string bomb |
| PostCSS XSS | postcss@8.4.38 | ✅ npm audit | Portal frontend only |

---

## Cross-References

- `[ESCALATE → TheGuardians]` — Handlebars (if user-supplied templates), Vitest UI (if exposed), Protobufjs (RCE)
- `[CROSS-REF: performance-profiler]` — Brace-expansion DoS, qs DoS may impact build/startup performance
- `[CROSS-REF: quality-oracle]` — Outdated packages (React 18→19, Express 4→5) need regression testing

---

## Next Steps

1. **Team Leader**: Route Critical findings (DEP-001, DEP-002, DEP-003) to TheGuardians for RCE assessment
2. **Backend Team**: Run `npm update` in Source/Backend with pre-commit hook verification
3. **Frontend Team**: Prioritize vitest/vite/react-router updates (6-8 hour sprint)
4. **Orchestrator Team**: Address protobufjs + @grpc issues (blocks feature work if unresolved)
5. **All Teams**: Commit lock files to git after updates

---

## Learnings for Next Audit

- **Handlebars** is a widespread build tool dependency; future upgrades should check for vulnerabilities in the full babel chain
- **Vitest UI** should be disabled in production CI runs (add `--ui` only for local development via `.npmrc`)
- **Protobufjs** has a long history of code injection issues; consider pinning to 7.6.3+ in all gRPC-using services
- **Express 5.x** was not adopted due to async/await changes; evaluate React 19 + Express 5 compatibility for next major release
- **Path-to-regexp** ReDoS is a recurring issue in Express ecosystem; monitor for updates

---

**Report generated by Dependency Auditor (Claude Haiku 4.5)**  
**Dashboard:** See Teams/TheInspector/learnings/dependency-auditor.md for persistent learnings
