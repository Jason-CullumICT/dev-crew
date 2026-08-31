# Dependency Auditor Findings Report

**Audit Date:** 2026-08-31  
**Package Managers Detected:** npm (4 projects)  
**Projects Analyzed:** Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator

---

## Executive Summary

### CVE Overview
| Project | Critical | High | Moderate | Low | Total |
|---------|----------|------|----------|-----|-------|
| **Backend** | 1 | 3 | 4 | 1 | **9** |
| **Frontend** | 1 | 5 | 6 | 1 | **13** |
| **E2E Tests** | — | — | — | — | **0** |
| **Orchestrator** | 1 | 2 | 6 | — | **9** |
| **TOTAL** | **3** | **10** | **16** | **2** | **31** |

### Risk Classification
- **🔴 CRITICAL (P1):** 3 findings - **Requires immediate action**
- **🟠 HIGH (P2):** 10 findings - **Fix within sprint**
- **🟡 MODERATE (P3):** 16 findings - **Plan next sprint**
- **🔵 LOW (P4):** 2 findings - **Monitor/document**

---

## Critical Findings (P1)

### DEP-001: Handlebars RCE via JavaScript Injection
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Remote Code Execution
- **Package:** `handlebars@4.7.8` (Backend)
- **File:** `Source/Backend/package-lock.json`
- **Vulnerabilities:**
  - GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion (CVSS 9.8)
  - GHSA-3mfm-83xf-c92r: JavaScript Injection via @partial-block tamper (CVSS 8.1)
  - GHSA-9cx6-37pm-9jff: DoS via Malformed Decorator Syntax (CVSS 7.5)
  - GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI Precompiler (CVSS 8.2)
  - Plus 3 additional prototype pollution and access control issues
- **Impact:** An attacker can inject arbitrary JavaScript and execute it in the template rendering context. This affects any endpoint using handlebars templates.
- **Fix:** `npm update handlebars` → upgrade to ^4.7.9 or later
- **Recommendation:** IMMEDIATE - This is exploitable in production if handlebars is used to render user-controlled content.

---

### DEP-002: Vitest UI Server Arbitrary File Read/Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Path Traversal + Code Execution
- **Package:** `vitest@3.2.5` (Frontend - dev dependency)
- **File:** `Source/Frontend/package-lock.json`
- **Vulnerability:** GHSA-5xrq-8626-4rwp - When Vitest UI server is listening, arbitrary files can be read and executed (CVSS 9.8)
- **Affected Range:** `<3.2.6`
- **Impact:** If the Vitest UI server is running (e.g., during development with `npm run test:watch`), an unauthenticated attacker can:
  - Read arbitrary files from the development machine
  - Execute code via the server endpoint
  - Extract environment variables, source code, config files, etc.
- **Fix:** `npm update vitest` → upgrade to `>=3.2.6`
- **Recommendation:** IMMEDIATE - If Vitest is running on a shared network, this is actively exploitable.
- **Cross-Ref:** [ESCALATE → TheGuardians] - This is a development environment security issue; assess network exposure.

---

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Arbitrary Code Execution
- **Package:** `protobufjs@7.6.4` (platform/orchestrator)
- **File:** `platform/orchestrator/package-lock.json`
- **Vulnerability:** GHSA-xq3m-2v4x-88gg - Arbitrary code execution in protobufjs (CVSS 9.8)
- **Affected Range:** `<7.5.5`
- **Also Affects:**
  - Code injection via bytes field defaults (GHSA-66ff-xgx4-vchm, CVSS varies)
  - Process-wide DoS via unsafe option paths (GHSA-jvwf-75h9-cwgg, CVSS 7.5)
  - Multiple denial-of-service issues from unbounded recursion
- **Impact:** 
  - Malformed `.proto` files or JSON descriptors can trigger code execution
  - gRPC messages with crafted protobuf payloads can crash the orchestrator
  - This is the foundation of the agent pipeline orchestration — compromise here affects all teams
- **Fix:** `npm update protobufjs` → upgrade to latest stable version
- **Recommendation:** IMMEDIATE - This is in the orchestrator, the core infrastructure. Priority update required.
- **Cross-Ref:** [ESCALATE → TheGuardians] - Infrastructure security impact.

---

## High-Severity Findings (P2)

### DEP-004: brace-expansion DoS (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE - Denial of Service
- **Package:** `brace-expansion` (transitive in Backend)
- **Vulnerabilities:**
  - GHSA-f886-m6hf-6m8v: Zero-step sequence causes process hang/memory exhaustion (CVSS 6.5)
  - GHSA-3jxr-9vmj-r5cp: Exponential-time expansion DoS (CVSS 5.3)
  - GHSA-mh99-v99m-4gvg: Unbounded expansion length causing OOM (CVSS 7.5)
  - GHSA-rgw5-rvv9-x895: Unbounded intermediate arrays DoS (CVSS 7.5)
- **Affected Range:** `<=1.1.17`
- **Impact:** Attackers can craft input strings that cause exponential expansion, exhausting memory and CPU.
- **Fix:** `npm update brace-expansion` → upgrade to `>=1.1.18`
- **Recommendation:** Schedule in next sprint.

---

### DEP-005: form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** CVE - Injection
- **Package:** `form-data@4.0.5` (transitive in Backend/Frontend)
- **Vulnerability:** GHSA-hmw2-7cc7-3qxx - CRLF injection via unescaped multipart field names/filenames (CVSS 7.5)
- **Affected Range:** `>=4.0.0 <4.0.6`
- **Impact:** Attacker can inject CRLF sequences in multipart form data, leading to HTTP response splitting or header injection.
- **Fix:** `npm update form-data` → upgrade to `>=4.0.6`
- **Recommendation:** Schedule in next sprint.

---

### DEP-006: js-yaml Quadratic Complexity DoS (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE - Denial of Service
- **Package:** `js-yaml` (transitive in Backend)
- **Vulnerabilities:**
  - GHSA-52cp-r559-cp3m: YAML merge-key chains cause quadratic CPU (CVSS 7.5)
  - GHSA-h67p-54hq-rp68: Merge key handling DoS (CVSS 5.3)
  - GHSA-5p4m-2wfm-xmqj: Quadratic CPU in !!omap resolution (CVSS 7.5)
- **Affected Range:** `<=3.15.0`
- **Impact:** Specially crafted YAML documents with merge-key chains or omap sequences cause quadratic-time CPU consumption.
- **Fix:** `npm update js-yaml` → upgrade to `>=3.15.1`
- **Recommendation:** Schedule in next sprint.

---

### DEP-007: React Router Open Redirect + XSS (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE - Open Redirect / XSS
- **Package:** `react-router-dom@6.30.6` (Frontend)
- **Vulnerabilities:**
  - GHSA-2j2x-hqr9-3h42: Protocol-relative URL reinterpretation (CVSS varies)
  - GHSA-wrjc-x8rr-h8h6: Open redirect via backslash in `<Link>` and `useNavigate`
  - GHSA-jjmj-jmhj-qwj2: Open redirect leading to XSS (CVSS 6.9)
  - GHSA-337j-9hxr-rhxg: Arbitrary constructor injection in SSR hydration (CVSS 6.1)
- **Affected Range:** `6.0.0 - 7.17.0` (varies by CVE)
- **Impact:** Users can be redirected to attacker-controlled domains; SSR applications vulnerable to constructor injection.
- **Fix:** `npm update react-router-dom` → upgrade to `>=7.18.0`
- **Recommendation:** Schedule in current sprint (frontend critical path).

---

### DEP-008: Vite Path Traversal + fs.deny Bypass
- **Severity:** P2 (HIGH)
- **Category:** CVE - Path Traversal / Information Disclosure
- **Package:** `vite@5.4.0` (Frontend dev)
- **Vulnerabilities:**
  - GHSA-fx2h-pf6j-xcff: `server.fs.deny` bypass on Windows alternate paths (CVSS 7.5)
  - GHSA-4w7w-66w2-5vf9: Path traversal in optimized deps `.map` handling
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure (Windows-specific)
- **Affected Range:** `<=6.4.2`
- **Impact:** 
  - Attackers can bypass `server.fs.deny` and read sensitive files during development
  - Windows systems particularly vulnerable to alternate path tricks
- **Fix:** `npm update vite` → upgrade to `>=8.2.2` (or latest)
- **Recommendation:** Update in current sprint.

---

### DEP-009: PostCSS Arbitrary File Read (Multiple CVEs)
- **Severity:** P2 (HIGH)
- **Category:** CVE - Path Traversal / Information Disclosure
- **Package:** `postcss@8.5.22` (transitive in Frontend via vite)
- **Vulnerabilities:**
  - GHSA-6g55-p6wh-862q: Attacker-controlled sourceMappingURL reads arbitrary .map files (CVSS 7.5)
  - GHSA-r28c-9q8g-f849: Path traversal in sourceMappingURL auto-loading (CVSS 7.5)
  - GHSA-fxqj-rqcc-2cmp: Incomplete fix of GHSA-6g55-p6wh-862q
  - GHSA-qx2v-qp2m-jg93: XSS via unescaped `</style>` in CSS output
- **Affected Range:** `<=8.5.22`
- **Impact:** Attacker can craft CSS comments with sourceMappingURL pointing to sensitive files on the server.
- **Fix:** `npm update postcss` → upgrade to latest
- **Recommendation:** Update as part of vite/vitest updates.

---

### DEP-010: path-to-regexp ReDoS
- **Severity:** P2 (HIGH)
- **Category:** CVE - Regular Expression Denial of Service
- **Package:** `path-to-regexp` (transitive in platform/orchestrator via express)
- **Vulnerability:** GHSA-37ch-88jc-xwx2 - ReDoS via multiple route parameters (CVSS 7.5)
- **Affected Range:** `<0.1.13`
- **Impact:** Specially crafted route definitions with multiple parameters cause exponential regex backtracking.
- **Fix:** Update express and dependencies → `npm update path-to-regexp`
- **Recommendation:** Schedule in next sprint.

---

## Moderate & Low Severity Findings

**16 Moderate findings & 2 Low findings documented** — see JSON summary for details

### Key Moderate Issues
- **nanoid**: Infinite loop vulnerabilities (CVSS 5.9)
- **uuid**: Buffer bounds check vulnerability (CVSS 7.5)
- **qs**: DoS via malformed query strings (CVSS 5.3)
- **body-parser**: Limit bypass (CVSS 3.7)
- **@babel/core**: Arbitrary file read (CVSS 3.2)

---

## Outdated Packages (>1 Major Version Behind)

### Backend
| Package | Current | Latest | Gap | Recommendation |
|---------|---------|--------|-----|-----------------|
| `uuid` | 9.0.1 | 14.0.2 | 5 major | Update to fix CVE-2025-24736 |
| `pino` | 8.21.0 | 10.3.1 | 2 major | Update (breaking changes likely) |
| `express` | 4.18.2 | 5.2.1 | 2 major | Update (major version requires testing) |

### Frontend
| Package | Current | Latest | Gap | Recommendation |
|---------|---------|--------|-----|-----------------|
| `react` | 18.3.1 | 19.2.8 | 1 major | Update (React 19 has significant changes) |
| `react-dom` | 18.3.1 | 19.2.8 | 1 major | Update with react |
| `react-router-dom` | 6.26.0 → 6.30.6 | 7.18.3 | 1+ major | Update to fix multiple CVEs |

---

## Dependency Tree Analysis

| Metric | Backend | Frontend | E2E | Orchestrator |
|--------|---------|----------|-----|--------------|
| **Direct** | 4 | 3 | 4 | 3 |
| **Direct (incl. dev)** | 102 | 9 | 4 | 153 |
| **Transitive** | 411 | 230 | ~10 | 155 |
| **Supply Chain Risk** | MEDIUM | HIGH | LOW | HIGH |

### Risk Assessment
- **Frontend:** 230+ transitive deps with vitest/vite ecosystem = high supply chain risk
- **Orchestrator:** 155 deps focused on gRPC/protobuf = critical infrastructure
- **Backend:** 411 deps = largest attack surface; primarily from dev tools (jest, ts-jest, types)

---

## License Compliance

✅ **No GPL/AGPL licenses detected in direct dependencies**  
✅ All major dependencies use permissive licenses (MIT, Apache 2.0, ISC, BSD)

**Verdict:** No license compliance issues.

---

## Remediation Roadmap

### 🚨 IMMEDIATE (This Week)
1. **Backend:** `npm update handlebars` — upgrade to `^4.7.9`
2. **Frontend:** `npm update vitest` — upgrade to `>=3.2.6`
3. **Orchestrator:** `npm update protobufjs` — upgrade to latest stable
4. Test thoroughly after each update

### 📋 CURRENT SPRINT
1. **Frontend:** Update react-router-dom to `>=7.18.0`
2. **Frontend:** Update vite to latest (will fix vitest/postcss transitively)
3. **Backend:** Update brace-expansion, form-data, js-yaml
4. **Backend:** Update uuid to `>=11.1.1` (requires major version bump)
5. Run full test suites after each update

### 🔄 NEXT SPRINT
1. **Backend:** Consider express `5.x` migration (major version change)
2. **Backend:** Upgrade pino to `10.x` (major version change)
3. **Frontend:** Evaluate React 19 upgrade (requires testing)
4. Set up automated dependency update checks (e.g., Dependabot)

---

## Action Items for Team Leaders

1. **TheGuardians** (Security Team):
   - [ ] Assess Vitest UI server exposure in dev environments
   - [ ] Review protobufjs usage in orchestrator for untrusted input handling
   - [ ] Verify handlebars usage doesn't render user-controlled templates
   - [ ] Escalate any findings to incident management if production exposure exists

2. **TheFixer** (Quality Team):
   - [ ] Schedule npm update for critical packages (DEP-001, DEP-002, DEP-003)
   - [ ] Test vitest update against existing test suite
   - [ ] Evaluate major version upgrades (uuid, express, pino, React)
   - [ ] Create backlog items for remaining moderate/low CVEs

3. **All Teams**:
   - [ ] Do not use `npm install --force` or ignore-scripts workarounds
   - [ ] Pin dependency versions after updates to prevent surprise regressions
   - [ ] Run `npm audit` before each release

---

## Cross-Team Escalations

- **DEP-002 (Vitest)** → TheGuardians: Dev environment security; assess network exposure of test UI servers
- **DEP-003 (Protobufjs)** → TheGuardians: Infrastructure security; orchestrator is foundational service

---

## Findings JSON

Machine-readable findings available at: `Teams/TheInspector/findings/dependency-audit-2026-08-31.json`

---

**Report Generated:** 2026-08-31  
**Agent:** dependency_auditor (Haiku)  
**Learnings Updated:** Teams/TheInspector/learnings/dependency-auditor.md
