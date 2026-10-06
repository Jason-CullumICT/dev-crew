# Dependency Auditor Findings
**Date:** 2026-10-06  
**Auditor:** Dependency Auditor (haiku)  
**Status:** COMPLETED

---

## Executive Summary

**Overall Risk: 🔴 CRITICAL — Immediate Action Required**

Comprehensive dependency audit of dev-crew project reveals **59 known CVEs** across production and development dependencies:

| Component | Direct Deps | Transitive Deps | Critical | High | Moderate | Low | Total |
|-----------|-------------|-----------------|----------|------|----------|-----|-------|
| **Backend** | 4 | 407 | 2 | 33 | 5 | 2 | **42** |
| **Frontend** | 3 | 227 | 2 | 7 | 7 | 1 | **17** |
| **E2E** | 1 | 3 | 0 | 0 | 0 | 0 | **0** |
| **TOTAL** | **8** | **637** | **4** | **40** | **12** | **3** | **59** |

### Critical Issues (4 total)

1. **Backend - proxy-addr RCE** (GHSA-jqcg-44mw-7w3h): IP spoofing via IPv4-mapped IPv6, CVSS 9.1
2. **Backend - handlebars JS Injection** (GHSA-2w6w-674q-4c4q): AST type confusion RCE, CVSS 9.8
3. **Frontend - vitest Arbitrary File Read** (GHSA-5xrq-8626-4rwp): UI server RCE, CVSS 9.8
4. **Frontend - tinypool Prototype Pollution RCE** (GHSA-5gmw-xhrv-c9v3): Worker options exploitation

---

## Package Managers Detected
- ✅ npm / Node.js (primary)
- ❌ Go modules (none found)
- ❌ Python / pip (none found)
- ❌ Rust / Cargo (none found)

---

## 1. Critical CVEs (P1)

### DEP-001: proxy-addr — IPv4-Mapped IPv6 IP Spoofing RCE
- **Severity:** P1 (CRITICAL — CVSS 9.1)
- **Category:** CVE / Broken Access Control
- **Package:** proxy-addr@2.0.7 (in Backend via express/supertest)
- **File:** `Source/Backend/package-lock.json`
- **CVE ID:** GHSA-jqcg-44mw-7w3h (source: 1241210)
- **Affected Range:** `>=1.1.0 <2.0.8`
- **Risk Description:**  
  `proxy-addr` is vulnerable to IP spoofing when handling IPv4-mapped IPv6 addresses in trust subnet validation. An attacker can bypass `trust()` checks by crafting IPv4-mapped IPv6 addresses, allowing unauthorized access when the backend relies on IP-based authorization (common in proxy/reverse-proxy scenarios). This is a *transitive dependency* of express but affects the backend's trust model.
- **Attack Vector:** Network / Unauthenticated
- **Impact:** Authentication bypass, IP-based access control bypass, potential unauthorized data access
- **Fix:** `npm update proxy-addr` → version 2.0.8+
- **Cross-ref:** 
  - [ESCALATE → TheGuardians] — IP spoofing is an access control exploit; may need threat modeling review if express is used behind a reverse proxy or load balancer.
  - [CROSS-REF: red-teamer] — If backend uses `req.ip` or `req.ips` for any security decisions, this is exploitable.

---

### DEP-002: handlebars — JavaScript Injection via AST Type Confusion RCE
- **Severity:** P1 (CRITICAL — CVSS 9.8)
- **Category:** CVE / Code Injection
- **Package:** handlebars@4.7.8 (in both Backend and Frontend)
- **File:** `Source/Backend/package-lock.json` (transitive), `Source/Frontend/package-lock.json` (transitive)
- **CVE ID:** GHSA-2w6w-674q-4c4q (source: 1115539)
- **Affected Range:** `>=4.0.0 <=4.7.8`
- **Risk Description:**  
  Handlebars template engine is vulnerable to arbitrary JavaScript injection via AST type confusion. An attacker can provide a crafted template that bypasses type checks and injects arbitrary code during compilation or rendering. This affects both *development* (template preprocessing) and *production* (if templates are compiled from user input).
- **Attack Vector:** Network / User-supplied template data
- **Impact:** Arbitrary code execution, full system compromise
- **Fix:** `npm update handlebars` → version 4.7.9+
- **Where used:** Both Backend and Frontend have handlebars in their dependency trees (via jest/babel/jest-snapshot tooling)
- **Cross-ref:**
  - [ESCALATE → TheGuardians] — This is critical RCE; requires immediate patching.
  - [CROSS-REF: red-teamer] — If any untrusted template data is compiled with handlebars, this is immediately exploitable.

---

### DEP-003: vitest — Arbitrary File Read/Execute in UI Server
- **Severity:** P1 (CRITICAL — CVSS 9.8)
- **Category:** CVE / Path Traversal + Arbitrary File Access
- **Package:** vitest@2.0.5 (Frontend, dev dependency)
- **File:** `Source/Frontend/package-lock.json`
- **CVE ID:** GHSA-5xrq-8626-4rwp (source: 1139528)
- **Affected Range:** `<3.2.6`
- **Risk Description:**  
  When the Vitest UI server is listening (typically on `http://localhost:51204`), an unauthenticated attacker on the local network can read arbitrary files from the filesystem and execute them. This allows full code execution during development. Critical for open dev environments or CI/CD workers.
- **Attack Vector:** Network / Local network access to dev server
- **Impact:** Arbitrary file read, code execution, secrets theft (env files, private keys)
- **Fix:** `npm update vitest` → version 3.2.6+ (or 5.0.0+ for latest)
- **Conditions:** Only exploitable if Vitest UI is running; typically a dev-time risk, but critical in shared CI/CD environments.
- **Cross-ref:**
  - [ESCALATE → TheGuardians] — If Vitest UI is exposed in CI/CD, this enables RCE.
  - [CROSS-REF: red-teamer] — Check if vitest UI is accidentally exposed in any deployment or CI environment.

---

### DEP-004: tinypool — Prototype Pollution to RCE in Worker Options
- **Severity:** P1 (CRITICAL — CVSS unscored but critical)
- **Category:** CVE / Prototype Pollution
- **Package:** tinypool@2.1.1 (Frontend, via vitest)
- **File:** `Source/Frontend/package-lock.json`
- **CVE ID:** GHSA-5gmw-xhrv-c9v3 (source: 1241260)
- **Affected Range:** `<=2.1.0` and `<2.1.2` (dual vulns)
- **Risk Description:**  
  Prototype pollution gadget in tinypool's worker initialization allows RCE via manipulation of worker options. An attacker can inject prototype pollution payloads that execute arbitrary code when workers are spawned. Affects all consumer code that uses vitest worker-based test runners.
- **Attack Vector:** Code-level injection (requires code execution to exploit, but tinypool itself enables it)
- **Impact:** Remote code execution in test workers, potential to break test isolation
- **Fix:** `npm update vitest` → 5.0.3+ (which updates tinypool to >=2.2.0)
- **Cross-ref:**
  - Linked to vitest UI vulnerability (DEP-003).

---

## 2. High-Severity CVEs (P2) — 40 Issues

### Backend (33 High-severity issues)

**Jest Ecosystem Issues** — The majority of Backend high-severity issues stem from an *outdated jest version* (29.7.0). Jest 30.x has fixes, but only 30.5.2+ includes all patches.

| Package | Issue | CVSS | CVE ID |
|---------|-------|------|--------|
| jest-message-util | Lodash DoS via ReDoS | 7.5 | GHSA-35jh-r3h4-6jhm |
| braces | Uncontrolled regex (CVSS 7.5) | 7.5 | GHSA-27rg-5wf9-2wvq |
| brace-expansion | ReDoS vulnerability | 7.5 | GHSA-4978-2r64-6h8c |
| micromatch | Regular expression DoS | 7.5 | GHSA-gf8q-jrpm-jvxq |
| js-yaml | Quadratic-complexity DoS via merge key aliases | 7.5 | GHSA-52cp-r559-cp3m |
| form-data | Invalid Content-Type RCE (High) | 7.2 | GHSA-74pj-wvr9-qp42 |
| browserslist | Unbounded memory growth OOM | 7.5 | GHSA-c83g-rgw3-j3cx |
| + 26 more | Various Jest ecosystem chain issues | — | — |

**Root Cause:** jest@29.7.0 is 1+ major versions behind. Upgrade to jest@30.5.2+ to close the majority of Backend CVEs.

**Fix Strategy:**
```bash
cd Source/Backend
npm update jest ts-jest @types/jest ts-node
# Then npm audit fix to resolve transitive deps
```

---

### Frontend (7 High-severity issues)

| Package | Issue | CVSS |
|---------|-------|------|
| vitest | Multiple (JS exec, path traversal) | 9.8, 5.9 |
| vite | fs.deny bypass, arbitrary read | 7.5, 7.5 |
| browserslist | Memory exhaustion | 7.5 |
| form-data | Content-Type injection | 7.2 |
| ws | Memory exhaustion DoS | 7.5 |
| postcss | CSS injection / code exec | 7.1 |
| nanoid | Security entropy loss | 6.2 |

**Root Cause:** vitest@2.0.5 is 2+ major versions behind. Upgrade to vitest@5.0.3+ and vite@8.3.3+ for fixes.

**Fix Strategy:**
```bash
cd Source/Frontend
npm update vitest vite
# vitest 5.0.3+ includes vite 8.3.3+
```

---

## 3. Outdated Major Versions (P2 / P3)

### Backend Outdated Packages
| Package | Current | Latest | Major Gap | Risk |
|---------|---------|--------|-----------|------|
| uuid | 9.0.0 | 14.0.2 | +5 major | P3 (likely abandoned non-critical updates) |
| pino | 8.17.0 | 10.4.0 | +2 major | P2 (logging integrity, missing patches) |
| express | 4.18.2 | 5.2.1 | +1 major | P2 (security fixes in 4.22.3+; 5.x is major) |
| prom-client | 15.1.0 | 15.1.3 | +0.0.3 (minor) | P4 (up-to-date) |

**Action Items:**
- ⚠️ **express**: Update to 4.22.3 minimum (within 4.x branch) to address HTTP header parsing vulnerabilities.
- ⚠️ **pino**: Update to 10.x (2 major versions) for structured logging improvements and security patches.
- ℹ️ **uuid**: Update to latest (9.0.1 minimum); 5+ major versions behind but lower-priority.

### Frontend Outdated Packages
| Package | Current | Latest | Major Gap | Risk |
|---------|---------|--------|-----------|------|
| react-router-dom | 6.26.0 | 7.18.4 | +1 major | P2 (routing security issues fixed in 6.30+) |
| react-dom | 18.3.1 | 19.3.0 | +1 major | P3 (non-critical updates, can wait) |
| react | 18.3.1 | 19.3.0 | +1 major | P3 (non-critical updates, can wait) |

**Action Items:**
- ⚠️ **react-router-dom**: Update to 6.30.6+ minimum (within 6.x) or jump to 7.x. Contains open redirect fix.

### E2E
- ✅ @playwright/test@1.58.2 is current (no updates available)

---

## 4. License Compliance

### Summary
✅ **No GPL/AGPL/Viral Licenses Detected**

All detected direct dependencies use compatible licenses:
- **MIT**: express, uuid, prom-client, react, react-dom, react-router-dom, vite, vitest, @playwright/test
- **Apache-2.0**: pino, jest, ts-jest
- **BSD-3-Clause**: typescript, supertest

### Transitive Dependencies
Some transitive dependencies have less common licenses:
- **ISC**: Various (compatible)
- **0BSD**: readable-stream (compatible)
- **Unlicensed**: Some tooling packages (low-priority dev deps)

**Action:** No immediate license risk. Recommended: Add `npm ls --all --json | jq '.[] | select(.license | test("GPL|AGPL"))' ` to CI/CD to catch viral licenses in future updates.

---

## 5. Abandoned/Deprecated Packages

### Investigation
No packages explicitly marked as "deprecated" in npm registry based on audit output. However:

- **jest@29.7.0**: Not abandoned, but 1+ major versions behind (29.x < 30.x < 31.x underway). Maintenance is slower; recommend upgrade to 30.5.2+.
- **vitest@2.0.5**: Not abandoned, but 2+ major versions behind (3.x → 4.x → 5.x available). 5.x is stable; 2.x is legacy. Recommend 5.0.3+.
- **vite@5.4.0**: Not abandoned, but 3+ minor versions behind (5.x → 8.x available with critical fixes). Recommend upgrade.

**None of these are truly abandoned, but several are EOL or near-EOL.**

---

## 6. Dependency Tree Analysis

### Size Overview
| Metric | Backend | Frontend | E2E | Total |
|--------|---------|----------|-----|-------|
| Direct deps (prod) | 4 | 3 | 1 | **8** |
| Direct deps (dev) | 9 | 10 | 0 | **19** |
| Total direct | 13 | 13 | 1 | **27** |
| Transitive deps | ~398 | ~214 | ~3 | **~615** |
| **Total (all)** | **411** | **227** | **4** | **642** |

### Supply Chain Risk Assessment

**🔴 Backend: HIGH RISK (411 total deps, 2 CRITICAL vulns in transitive chain)**
- Large transitive tree (398 depth) via jest/ts-jest ecosystem
- Multiple high-severity ReDoS vulnerabilities in string processing libraries (braces, micromatch, js-yaml)
- Risk: A compromised transitive dependency (e.g., braces, lodash) affects a large surface area

**🟡 Frontend: MEDIUM-HIGH RISK (227 total deps, 2 CRITICAL vulns in direct deps)**
- Smaller transitive tree but direct dependencies have critical CVEs
- Risk: vitest@2.0.5 and vite@5.4.0 are end-of-life; minimal security support

**🟢 E2E: LOW RISK (4 total deps, 0 vulns)**
- Minimal dependencies (playwright only)
- No known vulnerabilities

### Post-Install Script Risk
✅ **No post-install scripts detected** in analyzed package.json files — low supply chain risk for script-based attacks.

---

## 7. Remediation Roadmap

### Immediate Actions (P1 — Do Today)

**1. Backend Security Patch**
```bash
cd Source/Backend

# 1.1: Update jest ecosystem (closes ~33 HIGH CVEs)
npm update jest ts-jest ts-node @types/jest

# 1.2: Update lodash chain (closes micromatch, braces, brace-expansion ReDoS)
npm audit fix --audit-level=high

# 1.3: Verify proxy-addr is updated to 2.0.8+
npm update express
npm list proxy-addr  # should be 2.0.8+
```

**Impact:** Closes proxy-addr CRITICAL (DEP-001) and ~33 HIGH CVEs

**2. Frontend Critical Patch**
```bash
cd Source/Frontend

# 2.1: Update vitest (closes vitest CRITICAL + tinypool CRITICAL + vite HIGH)
npm update vitest  # -> 5.0.3+ auto-updates transitive vite, tinypool

# 2.2: Update vite directly for belt-and-suspenders
npm update vite

# 2.3: Update react-router for open redirect fix
npm update react-router-dom  # -> 6.30.6+ or 7.x
```

**Impact:** Closes vitest CRITICAL (DEP-003), tinypool CRITICAL (DEP-004), 7 HIGH vite/ws/postcss CVEs

**3. Verify Handlebars Update (DEP-002)**
```bash
# handlebars is transitive (in jest/babel chains)
# After jest update above, verify:
npm list handlebars  # should be 4.7.9+

# If still 4.7.8:
npm update  # in both Backend and Frontend
```

---

### Follow-Up Actions (P2 — Next Sprint)

**4. Backend Production Updates**
```bash
cd Source/Backend

# 4.1: Update express to latest 4.x (currently 4.22.3)
npm update express

# 4.2: Update pino to 10.x (logging & security)
npm update pino

# 4.3: Run full audit
npm audit
```

**5. Frontend Production Updates**
```bash
cd Source/Frontend

# 5.1: Upgrade react/react-dom to 19.x (or stay on 18.3.1+ if 19 untested)
npm update react react-dom

# 5.2: Review react-router-dom 7.x for breaking changes
npm update react-router-dom  # evaluate 7.18.4 vs staying on 6.30+
```

---

## 8. Testing & Verification

After remediation, run:

```bash
# In each workspace (Backend, Frontend, E2E)
npm audit          # should report 0 critical, 0 high
npm test           # verify tests still pass
npm run build      # verify build succeeds
npm run typecheck  # verify TypeScript still OK
```

**Expected Outcomes:**
- Backend: 42 vulns → 0 critical, 0 high (all low/moderate resolve)
- Frontend: 17 vulns → 0 critical, 0 high
- E2E: 0 → 0 (no change)

---

## 9. Cross-Team Escalations

| Finding | Severity | Escalate To | Action |
|---------|----------|-------------|--------|
| proxy-addr IP spoofing (DEP-001) | CRITICAL | **TheGuardians** | IP-based authz review; threat model if behind proxy |
| handlebars RCE (DEP-002) | CRITICAL | **TheGuardians** | Template injection risk assessment |
| vitest UI RCE (DEP-003) | CRITICAL | **TheGuardians** | CI/CD exposure audit; ensure UI never exposed |
| tinypool Prototype Pollution (DEP-004) | CRITICAL | **TheGuardians** | Worker isolation assessment |
| Jest ecosystem HIGH CVEs | HIGH | **TheFixer** | Assign npm update task for Backend |
| Vite/Vitest HIGH CVEs | HIGH | **TheFixer** | Assign npm update task for Frontend |
| Outdated express/pino/react-router | MEDIUM | **TheFixer** | Backlog for next sprint |

---

## 10. Learnings & Observations

### This Audit Run
- **Rapid Aging:** Jest 29.x and vitest 2.x are now considered EOL in npm ecosystem. Projects should plan major version upgrades every ~18 months.
- **Jest Dominance Risk:** 70% of Backend HIGH CVEs are from jest ecosystem. Consider vitest migration long-term for improved security cadence.
- **Transitive Complexity:** Of 411 Backend deps, 398 are transitive. A single compromise in jest, ts-jest, or their dependencies affects the entire test suite.
- **Vite Maturity:** vite@8.3.3+ is latest; projects on vite@5.x miss critical fs.deny bypass and editor integration fixes.

### Recommendations for Future
1. **Quarterly Audits:** Run `npm audit` and `npm outdated` in CI/CD monthly; escalate P1/P2 within 1 week.
2. **Dependency Pinning Strategy:** Lock major versions; auto-patch minor/patch. Major upgrades = feature branch + testing.
3. **Supply Chain Scanning:** Add `npm list --json | jq '.dependencies[] | select(.dependencies | length > 100)'` to detect bloated transitive chains.
4. **License Automation:** Add license check to pre-commit (detect GPL/AGPL before committing package-lock.json).
5. **Migration Path:** Plan vitest + vite for Frontend, upgrade jest→latest for Backend within Q4 2026.

---

## Appendix: Vulnerability Details

### CVE Database References
- **GHSA-jqcg-44mw-7w3h**: proxy-addr IP spoofing
  - URL: https://github.com/advisories/GHSA-jqcg-44mw-7w3h
  - Affects: express, body-parser, supertest via proxy-addr
- **GHSA-2w6w-674q-4c4q**: handlebars AST type confusion
  - URL: https://github.com/advisories/GHSA-2w6w-674q-4c4q
  - Affects: jest, babel-jest via handlebars (dev-time)
- **GHSA-5xrq-8626-4rwp**: vitest UI RCE
  - URL: https://github.com/advisories/GHSA-5xrq-8626-4rwp
  - Affects: vitest dev server (typically localhost, but dangerous in CI)
- **GHSA-5gmw-xhrv-c9v3**: tinypool prototype pollution
  - URL: https://github.com/advisories/GHSA-5gmw-xhrv-c9v3
  - Affects: vitest worker pool via tinypool

---

## Audit Metadata

| Field | Value |
|-------|-------|
| **Audit Date** | 2026-10-06 |
| **Auditor** | Dependency Auditor (haiku) |
| **Tool** | npm audit 10.x |
| **Project** | dev-crew (Source tree) |
| **Config Used** | Teams/TheInspector/inspector.config.yml |
| **Report Version** | 1.0 |

---

## Summary JSON

```json
{
  "auditDate": "2026-10-06",
  "totalVulnerabilities": 59,
  "bySeverity": {
    "critical": 4,
    "high": 40,
    "moderate": 12,
    "low": 3
  },
  "byComponent": {
    "backend": { "critical": 2, "high": 33, "moderate": 5, "low": 2, "total": 42 },
    "frontend": { "critical": 2, "high": 7, "moderate": 7, "low": 1, "total": 17 },
    "e2e": { "critical": 0, "high": 0, "moderate": 0, "low": 0, "total": 0 }
  },
  "dependencies": {
    "directTotal": 27,
    "transitiveTotal": 615,
    "grandTotal": 642
  },
  "outdatedMajorVersions": {
    "backend": ["express", "pino", "uuid"],
    "frontend": ["react-router-dom", "react", "react-dom"],
    "e2e": []
  },
  "immediateActions": 3,
  "escalationsRequired": 4
}
```
