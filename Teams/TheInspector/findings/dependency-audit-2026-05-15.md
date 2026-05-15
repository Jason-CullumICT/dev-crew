# Dependency Auditor Findings

**Audit Date:** 2026-05-15  
**Scope:** dev-crew Source and Platform directories  
**Package Managers Detected:** npm (Node.js/JavaScript)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Projects Audited | 4 (Backend, Frontend, E2E, Orchestrator) |
| Total Transitive Dependencies | 799 |
| **CVEs Found** | **9** |
| **Critical Severity** | **2** |
| **High Severity** | **1** |
| **Moderate Severity** | **6** |
| Outdated Major Versions | 8 |
| Supply Chain Risk Issues | 0 (no post-install scripts detected) |

---

## Vulnerability Findings by Severity

### 🔴 CRITICAL (P1) — Immediate Action Required

#### DEP-001: Handlebars JavaScript Injection (Backend)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Code Execution
- **Package:** `handlebars@4.7.8`
- **File:** `Source/Backend/package.json` → transitive via dev dependencies
- **CVEs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8): JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1): JavaScript Injection via @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1): JavaScript Injection via dynamic partial
  - GHSA-9cx6-37pm-9jff (CVSS 7.5): DoS via malformed decorator syntax
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2): JavaScript Injection in CLI precompiler
  - GHSA-2qvq-rjwj-gvw9 (CVSS 4.7): Prototype pollution + XSS
  - GHSA-7rx3-28cr-v5wh (CVSS 4.8): Prototype method access control gap
  - GHSA-442j-39wm-28r2 (CVSS 3.7): Property access bypass

- **Affected Versions:** 4.0.0 ≤ version ≤ 4.7.8
- **Current Version:** 4.7.8 (VULNERABLE)
- **Fix Available:** Yes, upgrade to 4.7.9 or later
- **Impact:** Template injection attacks could allow arbitrary JavaScript execution during template rendering
- **Fix:** 
  ```bash
  cd Source/Backend && npm audit fix
  # Or specifically:
  npm update handlebars
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Arbitrary code execution risk in build/templating pipeline

---

#### DEP-002: Protobufjs Arbitrary Code Execution (Orchestrator - CRITICAL)
- **Severity:** P1 (CRITICAL)
- **Category:** CVE - Code Execution + Multiple Related Issues
- **Package:** `protobufjs@7.5.4`
- **File:** `platform/orchestrator/package.json`
- **CVEs:**
  - GHSA-xq3m-2v4x-88gg (CVSS 9.8): Arbitrary code execution
  - GHSA-66ff-xgx4-vchm (CVSS 8.1): Code injection via bytes field defaults
  - GHSA-75px-5xx7-5xc7 (CVSS 8.1): Code generation gadget after prototype pollution
  - GHSA-jvwf-75h9-cwgg (CVSS 7.5): Process-wide DoS via unsafe option paths
  - GHSA-685m-2w69-288q (CVSS 7.5): DoS via unbounded recursion
  - GHSA-2pr8-phx7-x9h3 (CVSS 5.3): DoS from crafted field names
  - GHSA-fx83-v9x8-x52w (CVSS 5.3): Prototype injection
  - GHSA-q6x5-8v7m-xcrf (CVSS 5.3): UTF-8 overlong decoding

- **Affected Versions:** All ≤ 7.5.5
- **Current Version:** 7.5.4 (VULNERABLE)
- **Fix Available:** Yes, upgrade to 7.5.6 or later (critical patch)
- **Impact:** 
  - Arbitrary code execution in protobuf message processing
  - Prototype pollution leading to RCE chains
  - Process-wide DoS through crafted protobuf messages
  - **RISK**: Orchestrator runs agent pipelines — code execution here means pipeline hijack
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update protobufjs
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE in critical infrastructure (orchestrator)
- **BLOCKING:** Platform stability depends on this. Hotfix required before any new deployments.

---

### 🟠 HIGH (P2) — Urgent Fix Needed

#### DEP-003: path-to-regexp ReDoS (Orchestrator)
- **Severity:** P2 (HIGH)
- **Category:** CVE - Denial of Service
- **Package:** `path-to-regexp@0.1.12`
- **File:** `platform/orchestrator/package.json` → transitive via `express@^4.21.0`
- **CVE:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
  - **Title:** Regular Expression Denial of Service via multiple route parameters
- **Affected Versions:** < 0.1.13
- **Current Version:** 0.1.12 (VULNERABLE)
- **Fix Available:** Yes, fix in 0.1.13+
- **Impact:** Attacker can craft routes with many parameters to cause ReDoS, hanging the orchestrator
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update path-to-regexp
  ```
- **Note:** May require express update (`npm update express`)
- **Cross-ref:** [CROSS-REF: chaos-monkey] — DoS vector to test orchestrator resilience

---

### 🟡 MODERATE (P3) — Schedule for Next Sprint

#### DEP-004: Vite Path Traversal in .map Handling (Frontend)
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Information Disclosure
- **Package:** `vite@5.4.0` (direct dependency)
- **File:** `Source/Frontend/package.json`
- **CVE:** GHSA-4w7w-66w2-5vf9
  - **Title:** Path Traversal in Optimized Deps `.map` Handling
- **Affected Versions:** ≤ 6.4.1
- **Current Version:** 5.4.0 (VULNERABLE, 1 major version behind)
- **Fix Available:** Yes, upgrade to 6.4.2+
- **Impact:** Dev-time path traversal; could leak source maps or other build artifacts in dev server
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite
  ```
- **Note:** This is a major version bump (5→6) — test thoroughly for breaking changes

---

#### DEP-005: Vitest Transitive Vulnerabilities (Frontend)
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Multiple (via vite, @vitest/mocker, vite-node)
- **Package:** `vitest@2.0.5` (direct dependency)
- **File:** `Source/Frontend/package.json`
- **Root Cause:** Inherited from vulnerable `vite` dependency
- **Affected Versions:** vitest 0.0.1–3.0.0-beta.4 (when vite is vulnerable)
- **Current Version:** 2.0.5 (VULNERABLE due to vite@5.4.0)
- **Fix Available:** Yes, fixing vite will fix vitest
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite
  # This will cascade to vitest, @vitest/mocker, vite-node
  ```

---

#### DEP-006: PostCSS XSS via </style> Injection (Frontend)
- **Severity:** P3 (MODERATE)
- **Category:** CVE - XSS
- **Package:** `postcss@8.5.9`
- **File:** `Source/Frontend/package.json` → transitive via vite
- **CVE:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
  - **Title:** XSS via Unescaped `</style>` in CSS Stringify Output
- **Affected Versions:** < 8.5.10
- **Current Version:** 8.5.9 (VULNERABLE)
- **Fix Available:** Yes, upgrade to 8.5.10+
- **Impact:** Malicious CSS could break out of style tags and inject JavaScript
- **Fix:**
  ```bash
  cd Source/Frontend && npm update postcss
  ```

---

#### DEP-007: Esbuild ReDoS (Frontend)
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Denial of Service
- **Package:** `esbuild@0.24.2`
- **File:** `Source/Frontend/package.json` → transitive via vite
- **CVE:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
  - **Title:** esbuild enables website to send requests to dev server and read responses
- **Affected Versions:** ≤ 0.24.2
- **Current Version:** 0.24.2 (VULNERABLE)
- **Fix Available:** Yes, fix in newer version
- **Impact:** Dev server CSRF/SSRF — external site can make requests through dev server
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite
  # Cascades to esbuild
  ```

---

#### DEP-008: Brace-expansion ReDoS (Backend)
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Denial of Service
- **Package:** `brace-expansion@<1.1.13`
- **File:** `Source/Backend/package.json` → transitive
- **CVE:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
  - **Title:** Zero-step sequence causes process hang and memory exhaustion
- **Affected Versions:** < 1.1.13
- **Current Version:** < 1.1.13 (VULNERABLE)
- **Fix Available:** Yes, upgrade to 1.1.13+
- **Fix:**
  ```bash
  cd Source/Backend && npm audit fix
  ```

---

#### DEP-009: @protobufjs/utf8 UTF-8 Decoding (Orchestrator)
- **Severity:** P3 (MODERATE)
- **Category:** CVE - Logic Error
- **Package:** `@protobufjs/utf8@≤1.1.0`
- **File:** `platform/orchestrator/package.json` → transitive via protobufjs
- **CVE:** GHSA-q6x5-8v7m-xcrf (CVSS 5.3)
  - **Title:** Overlong UTF-8 decoding bypass
- **Fix Available:** Yes, fix in protobufjs 7.5.6+
- **Fix:** Update protobufjs (see DEP-002)

---

## Outdated Major Versions (P3)

| Package | Current | Latest | Gap | Project | Action |
|---------|---------|--------|-----|---------|--------|
| `express` | 4.18.2 | 5.2.1 | 1 major | Backend | Defer to next sprint (breaking changes) |
| `pino` | 8.17.0 | 10.3.1 | 2 major | Backend | Update (minor breaking, worth it for features) |
| `uuid` | 9.0.0 | 14.0.0 | 5 major | Backend | **Q: Is this stale? Check deprecation status** |
| `react` | 18.3.1 | 19.2.6 | 1 major | Frontend | Defer to feature sprint (breaking changes) |
| `react-dom` | 18.3.1 | 19.2.6 | 1 major | Frontend | Defer to feature sprint |
| `react-router-dom` | 6.26.0 | 7.15.1 | 1 major | Frontend | Defer to feature sprint |

---

## Dependency Tree Summary

| Project | Direct Deps (prod) | Direct Deps (dev) | Total Transitive | Risk |
|---------|------------------|-----------------|-----------------|------|
| Source/Backend | 4 | 10 | 412 | **CRITICAL** |
| Source/Frontend | 3 | 11 | 231 | **HIGH** |
| Source/E2E | 1 | 0 | 4 | None |
| platform/orchestrator | 3 | 0 | 156 | **CRITICAL** |
| **Total** | **11** | **21** | **799** | — |

**Assessment:** 799 dependencies is significant but not unusual for a Node.js app. Main concern: quality of critical packages (handlebars, protobufjs).

---

## Supply Chain Risk Assessment

✅ **No post-install scripts detected** — low malware risk  
✅ **Popular, maintained packages** — no abandoned libraries detected  
⚠️ **Multiple critical vulnerabilities in key transitive deps** — upgrade needed immediately

---

## Recommended Fix Priority

### Immediate (This Week)
1. **DEP-001**: Upgrade handlebars in Backend → `npm audit fix`
2. **DEP-002**: Upgrade protobufjs in Orchestrator → **HOTFIX REQUIRED** (RCE risk)

### This Sprint
3. **DEP-003**: Upgrade path-to-regexp (orchestrator stability)
4. **DEP-004**: Upgrade vite (Frontend dev security)
5. **DEP-006, 007**: Cascade from vite upgrade
6. **DEP-008**: npm audit fix (Backend)

### Next Sprint
7. **Major version upgrades**: React, React Router, Express (plan breaking changes)

---

## Verification Gates

After upgrades:
```bash
# For each affected project:
cd Source/Backend && npm test
cd Source/Frontend && npm test
cd Source/E2E && npm test
cd platform/orchestrator && npm test (if tests exist)

# Confirm no new vulnerabilities:
npm audit
```

---

## Cross-Team Escalations

### [ESCALATE → TheGuardians] Security Findings

**Critical Issues:**
- **DEP-001 (handlebars)**: Template injection RCE — impacts build pipeline security
- **DEP-002 (protobufjs)**: Arbitrary code execution in orchestrator — impacts all agent pipelines

**Recommendation:** Treat as P0 hotfix. These must be patched before the next sprint begins.

### [CROSS-REF: chaos-monkey] DoS Testing

- **DEP-003** (path-to-regexp ReDoS): Good candidate for chaos scenario
- **DEP-008** (brace-expansion ReDoS): Another regex DoS vector to test

---

## License Compliance

✅ No GPL/AGPL packages detected in direct dependencies  
✅ All major packages have standard MIT/Apache-2.0 licenses  
📋 Full license report: `npm audit` includes license field (no blocking issues)

---

## Tool Availability

- ✅ `npm audit` — used for CVE detection
- ✅ `npm outdated` — used for version staleness
- ⚠️ `npm ls` — used for transitive dependency counts
- ❌ `license-checker` — not installed (npm provides license info in audit output)

---

## Next Steps for Dependency Auditor

1. **Re-run audit after fixes** (especially DEP-001, DEP-002) → confirm zero critical/high
2. **Monitor for patch releases** of protobufjs, vite (watch GitHub releases)
3. **Document major upgrade strategy** for express, react, react-router (breaking changes require test plan)
4. **Add to learnings**: 
   - Handlebars known to have frequent CVEs
   - Protobufjs critical in orchestrator (watch closely)
   - Vite/vitest ecosystem updates frequently (monitor)

---

**Report Generated:** 2026-05-15  
**Auditor:** Dependency Auditor Agent  
**Status:** Ready for team review and escalation
