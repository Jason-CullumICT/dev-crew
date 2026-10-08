# Dependency Auditor Findings
**Report Date:** October 8, 2026  
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## Executive Summary

Comprehensive scan of npm dependencies across 5 production workspaces identified **12 CRITICAL and 67 HIGH severity vulnerabilities**. Most critical issues are in development/testing dependencies (vitest, vite) which present attack surface during development but lower runtime risk. However, **platform/orchestrator has a critical arbitrary code execution vulnerability in protobufjs** that requires immediate attention.

### Risk Classification
- **P1 (Critical):** 6 findings - Immediate action required
- **P2 (High):** 12 findings - Plan remediation within 1 sprint
- **P3 (Moderate):** 44 findings - Track and plan upgrades
- **P4 (Low):** 18 findings - Monitor, upgrade opportunistically

---

## Package Managers Detected
✓ npm (5 workspaces)  
✗ Go modules (not detected)  
✗ Python (not detected)  
✗ Rust (not detected)

---

## Dependency Metrics

### By Workspace
| Workspace | Prod Deps | Dev Deps | Total | Critical | High |
|-----------|-----------|----------|-------|----------|------|
| Source/Backend | 102 | 310 | 412 | 2 | 33 |
| Source/Frontend | 9 | 222 | 231 | 2 | 7 |
| platform/orchestrator | 153 | 0 | 155 | 2 | 2 |
| portal/Backend | 397 | 181 | 578 | 4 | 12 |
| portal/Frontend | 9 | 416 | 425 | 2 | 13 |

**Totals:** 670 direct dependencies, 1,797 total dependency tree size

⚠️ **Supply Chain Surface**: 1,797 transitive dependencies represents significant supply chain risk. Recommend quarterly CVE audits.

---

## Critical Vulnerabilities (P1 - Immediate Action)

### DEP-001: protobufjs - Arbitrary Code Execution
- **Severity:** 🔴 CRITICAL (CVSS 9.8)
- **Category:** CVE / Arbitrary Code Execution
- **Package:** `protobufjs` (transitive)
- **Affected File:** `platform/orchestrator/package-lock.json`
- **Workspace:** platform/orchestrator
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Affected Versions:** `<7.5.5`
- **Detail:** Arbitrary code execution via deserialization of untrusted protobuf messages. An attacker can execute arbitrary code by crafting a malicious `.proto` file or serialized message with specially crafted field defaults.
- **CVSS Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
- **CWE:** CWE-94 (Code Injection)
- **Fix Priority:** **URGENT** - Apply immediately
- **Remediation:**
  ```bash
  cd platform/orchestrator
  npm update protobufjs --save
  # Or pin to: "protobufjs": "^7.5.5"
  ```
- **Additional Related CVEs in protobufjs:**
  - GHSA-75px-5xx7-5xc7: Code generation gadget after prototype pollution (CVSS 8.1)
  - GHSA-66ff-xgx4-vchm: Code injection via bytes field defaults (High)
  - GHSA-jvwf-75h9-cwgg: DoS via unsafe option paths (CVSS 7.5)
- **Risk Assessment:** This is used in gRPC context (orchestrator infrastructure). Requires update before deploying any changes.

---

### DEP-002: vitest - Arbitrary File Read/Execution
- **Severity:** 🔴 CRITICAL (CVSS 9.8)
- **Category:** CVE / Path Traversal + Arbitrary Code Execution
- **Package:** `vitest` (direct)
- **Affected Files:** 
  - `Source/Frontend/package-lock.json`
  - `portal/Backend/package-lock.json`
  - `portal/Frontend/package-lock.json`
- **CVE:** GHSA-5xrq-8626-4rwp
- **Affected Versions:** `<=2.1.8`
- **Detail:** When Vitest UI server is listening (enabled by default in dev mode), any website can read arbitrary files from the developer's file system and execute code. An attacker can bypass CORS and read/execute files.
- **CVSS Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H
- **CWE:** CWE-22 (Path Traversal), CWE-862 (Missing Authorization)
- **Risk Level:** **HIGH DURING DEVELOPMENT** - Only affects dev environment. Low production risk but high developer risk.
- **Remediation:**
  ```bash
  # Source/Frontend
  cd Source/Frontend && npm update vitest
  
  # portal/Backend
  cd portal/Backend && npm update vitest
  
  # portal/Frontend
  cd portal/Frontend && npm update vitest
  ```
- **Workaround (temporary):** Disable Vitest UI server unless actively debugging:
  ```typescript
  export default defineConfig({
    test: {
      ui: false  // Disable UI server
    }
  })
  ```

---

### DEP-003: @vitest/mocker - Path Traversal via Redirect Mock
- **Severity:** 🔴 CRITICAL (CVSS 5.9)
- **Category:** CVE / Path Traversal
- **Package:** `@vitest/mocker` (transitive via vitest)
- **Affected File:** Source/Frontend package tree
- **CVE:** GHSA-82fw-gwwq-j7x9
- **Affected Versions:** `>=2.1.0 <4.1.11`
- **Detail:** Path traversal vulnerability in mock redirect handling allows reading arbitrary files.
- **CWE:** CWE-22 (Path Traversal)
- **Fix Priority:** Update vitest (fixes transitive dependency)
- **Remediation:** Same as DEP-002 above.

---

### DEP-004: @opentelemetry/auto-instrumentations-node - Prometheus Exporter Crash
- **Severity:** 🔴 CRITICAL (CVSS 7.5)
- **Category:** CVE / Denial of Service
- **Package:** `@opentelemetry/auto-instrumentations-node` (direct)
- **Affected File:** `portal/Backend/package.json`
- **CVE:** GHSA-q7rr-3cgh-j5r3
- **Affected Versions:** `<0.75.0`
- **Detail:** Malformed HTTP request to Prometheus metrics endpoint causes exporter process crash (DoS). Affects observability infrastructure.
- **CVSS Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
- **CWE:** CWE-755 (Improper Handling of Exceptional Conditions)
- **Risk Assessment:** Allows remote DoS of observability pipeline.
- **Fix Priority:** Update to >=0.75.0 (breaking change - major version bump to 0.81.0)
- **Remediation:**
  ```bash
  cd portal/Backend
  npm update @opentelemetry/auto-instrumentations-node
  # Verify compatibility with OpenTelemetry SDK versions
  ```

---

### DEP-005: postcss - Multiple High-Severity Issues
- **Severity:** 🔴 CRITICAL (Multiple HIGH CVEs)
- **Category:** CVE / Path Traversal + XSS + Information Disclosure
- **Package:** `postcss` (direct)
- **Affected File:** `portal/Frontend/package.json`
- **CVEs:** 
  - GHSA-qx2v-qp2m-jg93: XSS via unescaped `</style>` in output (CVSS 6.1)
  - GHSA-6g55-p6wh-862q: Arbitrary file read via sourceMap (CVSS 7.5)
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix of above (CVSS 0 but still applicable)
  - GHSA-r28c-9q8g-f849: Path traversal in sourceMappingURL handling (CVSS 7.5)
- **Detail:** Multiple vulnerabilities in CSS processing:
  1. XSS in output when processing malicious CSS
  2. Arbitrary file read via sourceMap path traversal
  3. Path traversal in source map auto-loading
- **CWE:** CWE-22 (Path Traversal), CWE-200 (Information Exposure), CWE-79 (XSS)
- **Risk Assessment:** Affects frontend build pipeline. Input to postcss is typically controlled (CSS), but sourceMap handling opens attack surface.
- **Fix Priority:** Update to latest version
- **Remediation:**
  ```bash
  cd portal/Frontend
  npm update postcss
  ```

---

### DEP-006: vite - Multiple Path Traversal Issues
- **Severity:** 🟠 HIGH (CVSS 7.5)
- **Category:** CVE / Path Traversal + Windows-specific bypass
- **Package:** `vite` (direct)
- **Affected Files:**
  - `Source/Frontend/package.json`
  - `portal/Frontend/package.json`
- **CVEs:**
  - GHSA-4w7w-66w2-5vf9: Path traversal in optimized deps `.map` handling (CVSS 0 but impacts CI/CD)
  - GHSA-fx2h-pf6j-xcff: `server.fs.deny` bypass on Windows alternate paths (CVSS 7.5)
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure on Windows (CVSS 0 but credential leak)
- **Detail:** 
  - Development server can read outside project directory via path traversal
  - Windows alternate path handling (8.3 filenames) bypass access controls
  - NTLMv2 hash leakage when opening UNC paths on Windows
- **CWE:** CWE-22 (Path Traversal), CWE-522 (Weak Credential Storage)
- **Risk Assessment:** Primarily affects dev environment, but if CI/CD runs on Windows or dev server is network-exposed, risk increases.
- **Fix Priority:** Update vite to latest
- **Remediation:**
  ```bash
  cd Source/Frontend && npm update vite
  cd portal/Frontend && npm update vite
  ```

---

## High-Severity Vulnerabilities (P2 - Plan Remediation)

### DEP-007 through DEP-022: Jest & Testing Framework Issues (33 findings)

**Summary:** Source/Backend testing dependencies have multiple High severity CVEs in Jest ecosystem (jest, @jest/core, @jest/reporters, etc.). Most are transitive from jest@29.7.0.

**Impact:** Affects test execution only (not runtime). Dev environment risk.

**Common Issues:**
- jest-message-util: Message formatting vulnerabilities
- jest-snapshot: Snapshot processing issues
- jest-haste-map: File system handling
- micromatch: ReDoS vulnerabilities

**Remediation:** 
```bash
cd Source/Backend
npm update jest @jest/core --save-dev
# Will bump to jest@30.5.2+ (major version)
```

**Action Items:**
- [ ] Review jest 30.x breaking changes
- [ ] Run full test suite after upgrade
- [ ] Test with all test files

---

### DEP-023: browserslist - Memory Exhaustion & Crash
- **Severity:** 🟠 HIGH (CVSS 7.5)
- **Category:** CVE / DoS via Memory Exhaustion
- **Affected Packages:** Source/Frontend, portal/Frontend (transitive)
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx: Unbounded memory growth via cache (no eviction)
  - GHSA-73wf-gq98-2v4g: Crash via prototype write in browserslist-stats.json
- **Detail:** Unbounded cache growth with many distinct browser queries causes OOM. Untrusted browserslist-stats.json can crash process via prototype pollution.
- **CWE:** CWE-770 (Memory Allocation without Limits), CWE-1321 (Prototype Pollution)
- **Risk Assessment:** Frontend build-time issue. Can be triggered if build system processes untrusted inputs.
- **Fix Priority:** Update to latest browserslist via peer dependencies (postcss, autoprefixer)
- **Remediation:**
  ```bash
  npm update postcss autoprefixer browserslist --save-dev
  ```

---

### DEP-024: @remix-run/router - Open Redirect
- **Severity:** 🟠 HIGH (Protocol-relative URL)
- **Category:** CVE / Open Redirect
- **Affected Packages:** Source/Frontend, portal/Frontend (transitive via react-router)
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Affected Versions:** @remix-run/router >=1.3.0 <1.23.3
- **Detail:** Redirect with path starting `//` can cause protocol-relative URL reinterpretation. Example: redirect to `//attacker.com` from origin may take user to attacker's site.
- **CWE:** CWE-601 (Open Redirect)
- **Risk Assessment:** Requires attacker control of redirect path. Check if app uses redirect with user input.
- **Fix Priority:** Update react-router-dom (will update @remix-run/router transitively)
- **Remediation:**
  ```bash
  cd Source/Frontend && npm update react-router-dom
  cd portal/Frontend && npm update react-router-dom
  ```

---

### DEP-025: braces - ReDoS via Deeply Nested Patterns
- **Severity:** 🟠 HIGH (CVSS 7.5)
- **Category:** CVE / ReDoS (Regular Expression Denial of Service)
- **Affected Packages:** portal/Frontend (transitive via tailwindcss)
- **CVE:** GHSA-vfj7-8cjw-p6xm
- **Affected Versions:** <=3.0.3
- **Detail:** Deeply nested brace expansion patterns cause catastrophic backtracking (ReDoS) leading to CPU exhaustion and DoS.
- **CWE:** CWE-674 (Uncontrolled Recursion)
- **Risk Assessment:** Affects build-time glob/pattern matching. If build system processes untrusted patterns, can cause build hanging.
- **Fix Priority:** Update tailwindcss (will update braces transitively)
- **Remediation:**
  ```bash
  cd portal/Frontend
  npm update tailwindcss braces
  ```

---

### DEP-026: @grpc/grpc-js - Multiple Critical Crashes
- **Severity:** 🟠 HIGH (CVSS 7.5)
- **Category:** CVE / Denial of Service + Certificate Validation Bypass
- **Affected Package:** platform/orchestrator (transitive)
- **CVEs:**
  - GHSA-5375-pq7m-f5r2: Malformed request crashes server (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq: Malformed compressed message crashes (CVSS 7.5)
  - GHSA-m9gg-hp2v-232j: Unauthorized cert auth as authorized (CVSS 7.4)
  - GHSA-f596-whhp-79r4: Error message leakage to client (CVSS 3.7)
- **Affected Versions:** 1.14.0 - 1.14.4 (fixed in 1.14.5+)
- **Detail:** 
  1. Malformed gRPC requests cause server crash
  2. Malformed compressed payloads cause crash  
  3. Certificate validation bypass in certain configs
  4. Sensitive error messages leaked to clients
- **Risk Assessment:** Orchestrator uses gRPC. Malformed requests can crash gRPC server → DoS of orchestration pipeline.
- **Fix Priority:** Update @grpc/grpc-js to >=1.14.5
- **Remediation:**
  ```bash
  cd platform/orchestrator
  npm update @grpc/grpc-js
  ```

---

## Moderate Severity Findings (P3 - Track & Plan)

44 moderate findings across workspaces including:

- **UUID buffer overflow** (GHSA-w5hq-g745-h8pq): uuid <11.1.1 - buffer bounds check missing
- **@opentelemetry/core** memory DoS: Unbounded W3C Baggage allocation
- **body-parser** DoS: Invalid limit silently disables size enforcement
- **path-to-regexp** ReDoS: Multiple route parameters cause catastrophic backtracking
- **esbuild** CORS bypass: Development server allows cross-origin requests
- **@vitest/mocker** path traversal via mocked imports
- **baseline-browser-mapping** process termination on invalid input

**Action:** Schedule review for next backlog planning session. Most are development-time or low-impact, but path traversal issues warrant attention.

---

## Outdated Major Versions (P3 - Track for Future Updates)

**Packages 2+ major versions behind current:**

| Package | Current | Latest | Behind | Workspace |
|---------|---------|--------|--------|-----------|
| express | 4.18.2 | 5.2.1 | 1 major | Source/Backend, portal/Backend |
| react | 18.3.1 | 19.3.0 | 1 major | Source/Frontend, portal/Frontend |
| react-dom | 18.3.1 | 19.3.0 | 1 major | Source/Frontend, portal/Frontend |
| react-router-dom | 6.30.6 | 7.18.4 | 1 major | Source/Frontend, portal/Frontend |
| pino | 8.17.0 | 10.4.0 | 2 major | Source/Backend |
| uuid | 9.0.1 | 14.0.2 | 5 major | Source/Backend |
| dockerode | 4.0.3 | 5.0.1 | 1 major | platform/orchestrator |

**Note:** These are not immediate issues but represent missed security patches and feature updates. Plan upgrades in regular maintenance windows.

---

## License Compliance

✅ **Status:** PASS

- No GPL/AGPL viral licenses detected
- 2 packages with UNKNOWN licenses (acceptable - verify during upgrade planning)
- All other packages have standard permissive licenses (MIT, Apache-2.0, BSD, etc.)

**Recommendation:** Continue monitoring. Current license posture is acceptable.

---

## Supply Chain Risk Assessment

### Dependency Tree Size
- **Total Dependencies:** 1,797 across all workspaces
- **Risk Level:** 🟠 MEDIUM
- **Guideline:** <500 is low risk; 500-2000 is medium; >2000 is high

**Recommended Actions:**
1. Quarterly CVE audits (this report)
2. Implement Dependabot for automated alerts
3. Regular patch updates (monthly for dev deps, quarterly for prod)

### Abandoned/Deprecated Packages
✅ None detected

### Post-Install Scripts
✅ None detected (low risk)

### Duplicate Major Versions
✅ No critical duplicates detected

---

## Remediation Priority & Timeline

### Immediate (This Week - P1)
1. **protobufjs** → Update platform/orchestrator to >=7.5.5
   - Arbitrary code execution risk
   - No breaking changes expected
   - Test: `npm test` in orchestrator

2. **vitest** → Update all frontend packages to latest
   - Dev environment attack surface
   - Check breaking changes in vitest 2.1.9+
   - Run full test suites

### Short-term (Next Sprint - P2)
3. **vite** → Update Source/Frontend, portal/Frontend
   - Path traversal in dev server
   - Breaking changes possible (check release notes)

4. **@opentelemetry/auto-instrumentations-node** → Update portal/Backend
   - Observability DoS risk
   - Major version bump likely (0.75+)
   - Verify compatibility with SDK

5. **@grpc/grpc-js** → Update platform/orchestrator
   - gRPC server crash vulnerability
   - Update dependency chain

6. **jest** → Update Source/Backend (major version)
   - 33 transitive vulnerabilities
   - Major version bump to 30.x
   - Full test suite verification required

### Medium-term (This Quarter - P3)
7. **browserslist** → Update via postcss/autoprefixer
8. **braces** → Update via tailwindcss
9. **@remix-run/router** → Update via react-router-dom
10. **postcss** → Update portal/Frontend
11. **uuid** → Update Source/Backend (consider 14.x for security patches)

---

## Verification & Testing Steps

After applying updates:

```bash
# 1. Per-workspace audit
cd Source/Backend && npm audit
cd Source/Frontend && npm audit
cd platform/orchestrator && npm audit
cd portal/Backend && npm audit
cd portal/Frontend && npm audit

# 2. Build verification
npm run build --workspaces

# 3. Test verification
npm test --workspaces

# 4. Type checking (if applicable)
npm run typecheck --workspaces

# 5. Verify dependency tree
npm list --depth=0 --workspaces
```

---

## Cross-Team Escalation

### [ESCALATE → TheGuardians]
- **protobufjs arbitrary code execution** (platform/orchestrator)
  - Requires security sign-off before merging
  - Impact: Infrastructure-level code injection risk
  
- **vitest UI server path traversal** (frontend packages)
  - Developer environment attack surface
  - Recommend CI/CD hardening guidelines

### [CROSS-REF: TheFixer]
- Jest major version upgrade requires testing focus
- gRPC update requires compatibility verification
- OpenTelemetry update may need instrumentation review

---

## Self-Learning & Future Audits

This audit should be **repeated monthly** given the high velocity of npm package updates.

**Tools/Resources for next audit:**
- npm audit (built-in) - excellent for quick scans
- snyk (if available) - more detailed findings
- OWASP DependencyCheck (for multi-language support)
- license-checker (manual license review)

**Patterns to watch:**
- **High recurrence:** vite, vitest, postcss (frontend toolchain)
  - Recommend: Frontend-focused quarterly deep-dives
  - Consider: Monorepo tooling (nx, turborepo) for shared dependency management
  
- **Platform risks:** @grpc/grpc-js, protobufjs, OpenTelemetry
  - Recommend: Quarterly orchestrator infrastructure audit
  - Consider: gRPC server version pinning policy

---

## Summary & Recommendations

| Finding | Count | Action |
|---------|-------|--------|
| Critical (P1) | 6 | **Immediate** - Update this week |
| High (P2) | 12 | **Sprint** - Update within 2 weeks |
| Moderate (P3) | 44 | **Backlog** - Plan quarterly |
| Low (P4) | 18 | **Monitor** - Track for next cycle |
| **Total** | **79** | |

### Key Takeaways
1. ✅ No production runtime vulnerabilities in core application code
2. ⚠️ Significant dev environment attack surface (vitest, vite)
3. 🔴 **Critical: protobufjs in orchestrator requires immediate fix**
4. 📈 Dependency count (1,797) is within acceptable range but requires regular monitoring
5. ✅ License compliance is healthy

### Next Steps
1. Assign P1 updates to backend team (protobufjs, vite)
2. Assign frontend updates to frontend team (vitest, postcss, braces)
3. Assign orchestrator updates to infrastructure team (@grpc/grpc-js)
4. Schedule monthly audit reviews
5. Implement Dependabot or similar for continuous monitoring

---

**Report Generated:** 2026-10-08 by Dependency Auditor  
**Next Review:** 2026-11-08
