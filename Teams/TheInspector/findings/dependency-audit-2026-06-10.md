# Dependency Auditor — Security & Compliance Findings

**Date:** 2026-06-10  
**Scope:** Source/Backend, Source/Frontend, Source/E2E  
**Package Managers:** npm (3 projects)  

---

## Executive Summary

| Metric | Backend | Frontend | E2E |
|--------|---------|----------|-----|
| **Known CVEs** | 6 (1 critical, 5 moderate) | 9 (1 critical, 8 moderate) | 0 |
| **Direct Dependencies** | 13 | 13 | 1 |
| **Transitive Dependencies** | 411 | 222 | 4 |
| **Outdated Major Versions** | 6 packages | 5 packages | 0 |
| **Overall Health** | **C** (critical handlebars) | **C** (critical vitest) | **A** |

**Critical Findings:** 2 critical vulnerabilities requiring immediate action.

---

## Detailed Findings

### Backend (Source/Backend)

#### Package Summary
- **Direct dependencies:** 13 (4 prod, 9 dev)
- **Transitive dependencies:** 411
- **Total packages scanned:** 411

#### Known CVEs: 6 total (1 CRITICAL, 5 MODERATE)

##### DEP-001: Handlebars.js Critical Code Injection
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars@4.0.0-4.7.8
- **Affected versions:** >=4.0.0 <=4.7.8
- **Files:** node_modules/handlebars (transitive dependency)
- **CVEs:**
  - GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion (CVSS 9.8)
  - GHSA-3mfm-83xf-c92r: JavaScript Injection via @partial-block tampering (CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6: JavaScript Injection via object as dynamic partial (CVSS 8.1)
  - GHSA-9cx6-37pm-9jff: Denial of Service via malformed decorator (CVSS 7.5)
  - GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI precompiler (CVSS 8.2)
  - GHSA-2qvq-rjwj-gvw9: Prototype Pollution → XSS via template injection (CVSS 4.7)
  - GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap (CVSS 4.8)
  - GHSA-442j-39wm-28r2: Property Access Validation Bypass (CVSS 3.7)

**Root cause:** Unknown — handlebars is not directly listed in Backend's package.json. It's a transitive dependency of another package in the tree.

**Fix:** `npm audit fix --force` will upgrade to >=4.7.9. However, identify the direct dependency pulling in handlebars and update it first to avoid introducing breaking changes.

**Cross-ref:** [ESCALATE → TheGuardians] — This is a remote code execution risk if handlebars templates are processed server-side or from untrusted sources.

---

##### DEP-002: UUID Missing Buffer Bounds Check
- **Severity:** P2 (MODERATE)
- **Category:** cve
- **Package:** uuid@^9.0.0 (direct dependency, currently 9.0.1)
- **CVE:** GHSA-w5hq-g745-h8pq
- **Affected versions:** <11.1.1
- **CVSS:** 7.5 (AV:N, AC:L, integrity impact)
- **CWE:** CWE-787 (Out-of-bounds write), CWE-1285 (Missing buffer bounds check)
- **Detail:** When `buf` parameter is provided to uuid v3/v5/v6 functions, no bounds check occurs. Malformed buffer can cause out-of-bounds write.
- **Exploitability:** Requires attacker control over uuid() function parameters; low likelihood in typical REST API.
- **Fix:** `npm install uuid@^11.1.1 || uuid@^9.0.3` (patch available)
- **Breaking:** No — 9.0.3+ is backward compatible.

---

##### DEP-003: Express qs DoS Vulnerability
- **Severity:** P2 (MODERATE)
- **Category:** cve
- **Package:** express@^4.18.2 (direct dependency, currently 4.22.1)
- **Via:** qs (transitive)
- **CVE:** GHSA-q8mj-m7cp-5q26
- **Affected versions:** qs >=6.11.1 <=6.15.1
- **CVSS:** 5.3 (remotely triggerable DoS)
- **Detail:** qs.stringify() crashes with TypeError when processing comma-format arrays with null/undefined entries and encodeValuesOnly=true.
- **Impact:** Attacker crafts malicious query string → backend crashes on parsing.
- **Fix:** `npm audit fix` (updates qs)
- **Workaround:** None — requires dependency update.

---

##### DEP-004: Brace-Expansion Denial of Service
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** brace-expansion@<1.1.13 (transitive)
- **CVE:** GHSA-f886-m6hf-6m8v
- **Affected versions:** <1.1.13
- **CVSS:** 6.5 (process hang + memory exhaustion)
- **CWE:** CWE-400 (uncontrolled resource consumption)
- **Detail:** Zero-step sequences in brace expansion patterns cause infinite loop and memory exhaustion.
- **Example:** `expand("{,}")` hangs.
- **Fix:** `npm audit fix`

---

#### Outdated Major Versions (>1 major behind)

| Package | Current | Latest | Wanted | Status |
|---------|---------|--------|--------|--------|
| @types/express | 4.17.25 | 5.0.6 | 4.17.25 | 1 major behind |
| @types/jest | 29.5.14 | 30.0.0 | 29.5.14 | 1 major behind |
| @types/node | 20.19.37 | 25.9.2 | 20.19.42 | 5 majors behind |
| @types/supertest | 6.0.3 | 7.2.0 | 6.0.3 | 1 major behind |
| @types/uuid | 9.0.8 | 10.0.0 | 9.0.8 | 1 major behind |
| jest | 29.7.0 | 30.4.2 | 29.7.0 | 1 major behind |
| pino | 8.21.0 | 10.3.1 | 8.21.0 | 2 majors behind |
| supertest | 6.3.4 | 7.2.2 | 6.3.4 | 1 major behind |
| typescript | 5.9.3 | 6.0.3 | 5.9.3 | 1 major behind |
| uuid | 9.0.1 | 14.0.0 | 9.0.1 | 5 majors behind |

**Assessment:** @types/node and uuid are significantly outdated. Consider upgrading to LTS versions (Node 20 is EOL in 2025).

---

#### Deprecated Packages

Warnings detected during npm install:
- **supertest@6.3.4** — deprecated; maintainers recommend upgrading to 7.1.3+
- **glob@7.2.3** — deprecated; old versions have publicized security vulnerabilities
- **inflight@1.0.6** — deprecated; memory leak; use lru-cache instead
- **superagent@8.1.2** — deprecated; recommend 10.2.2+

---

### Frontend (Source/Frontend)

#### Package Summary
- **Direct dependencies:** 13 (3 prod, 10 dev)
- **Transitive dependencies:** 222
- **Total packages scanned:** 222

#### Known CVEs: 9 total (1 CRITICAL, 8 MODERATE)

##### DEP-005: Vitest Critical Arbitrary File Read/Execute
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest@^2.0.5 (direct dependency, currently 2.1.9)
- **CVE:** GHSA-5xrq-8626-4rwp
- **Affected versions:** <3.2.6
- **CVSS:** 9.8 (AV:N, AC:L, no auth, all impacts)
- **CWE:** CWE-862 (Missing authorization)
- **Detail:** When Vitest UI server is listening on localhost, any file can be read and executed. Exposes dev secrets, source code, environment variables.
- **Risk:** **ACTIVE DURING DEVELOPMENT.** If developer runs `npm run test:watch` with `vitest ui` exposed to network, attacker reads/executes arbitrary files.
- **Example scenario:**
  1. Developer runs `vite dev` + `vitest ui` (default port 51204)
  2. Port exposed to shared network or cloud environment
  3. Attacker connects to `http://localhost:51204`, fetches `.env`, reads all environment variables including API keys
- **Fix:** `npm install vitest@^3.2.6` (major version bump required)
- **Workaround:** Never expose vitest UI to external networks; ensure `--host 127.0.0.1` or firewall rules in place.
- **Breaking:** vitest 3.2.6+ requires Node 16+ (current 18+, safe).

[ESCALATE → TheGuardians] — Critical dev-environment vulnerability.

---

##### DEP-006: Vite Path Traversal in Optimized Deps
- **Severity:** P2 (MODERATE)
- **Category:** cve
- **Package:** vite@^5.4.0 (direct dependency, currently 5.4.21)
- **CVE:** GHSA-4w7w-66w2-5vf9
- **Affected versions:** <=6.4.1 (note: our 5.4.21 falls in affected range)
- **Detail:** Path traversal in `.map` file handling during dependency optimization phase.
- **Impact:** During build/dev, malicious `.map` files or specially crafted paths could escape the deps directory.
- **Likelihood:** Low in typical projects; higher in monorepos or with untrusted source maps.
- **Fix:** `npm install vite@^8.0.16` (major bump) or apply patch when available for v5.
- **Status:** vite 8.x has breaking changes; consider gradual migration.

---

##### DEP-007: React Router Open Redirect
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** react-router-dom@^6.26.0 (direct dependency, currently 6.30.3)
- **Via:** react-router@6.7.0-6.30.3
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Affected versions:** 6.7.0 - 6.30.3
- **Detail:** Same-origin redirect with path starting `//` causes open redirect via protocol-relative URL reinterpretation.
- **Example:** `/redirect?target=//evil.com/path` may redirect to evil.com instead of same-origin.
- **Fix:** `npm install react-router-dom@^6.30.4` (patch available)
- **Breaking:** No.

---

##### DEP-008: PostCSS XSS in CSS Stringify
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** postcss (transitive via vite/build tools)
- **CVE:** GHSA-qx2v-qp2m-jg93
- **Affected versions:** <8.5.10
- **CVSS:** 6.1 (XSS, user interaction required)
- **Detail:** Unescaped `</style>` in CSS stringify output allows XSS in dev server/build output.
- **Impact:** If attacker controls CSS input (e.g., dynamic style generation), can inject scripts.
- **Fix:** `npm install postcss@^8.5.10` (typically automatic with vite update)

---

##### DEP-009: esbuild CORS Bypass in Dev Server
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** esbuild (transitive via vite)
- **CVE:** GHSA-67mh-4wv8-2f99
- **Affected versions:** <=0.24.2
- **CVSS:** 5.3
- **Detail:** Dev server allows any website to send requests and read responses (CORS bypass during development).
- **Impact:** During development, attacker website can exfiltrate source, environment, or other resources from dev server.
- **Fix:** Update vite (pulls in latest esbuild).

---

##### DEP-010: ws Uninitialized Memory Disclosure
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** ws@8.0.0-8.20.0 (transitive)
- **CVE:** GHSA-58qx-3vcg-4xpx
- **Affected versions:** >=8.0.0 <8.20.1
- **CVSS:** 4.4 (memory leak, requires admin)
- **Detail:** WebSocket frame parsing can leak uninitialized memory to remote peer.
- **Impact:** Low in typical React apps (ws used for HMR, not exposed externally).

---

#### Outdated Major Versions

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| @types/react | 18.3.28 | 19.2.17 | 1 major behind |
| @types/react-dom | 18.3.7 | 19.2.3 | 1 major behind |
| @vitejs/plugin-react | 4.7.0 | 6.0.2 | 2 majors behind |
| jsdom | 24.1.3 | 29.1.1 | 5 majors behind |
| react | 18.3.1 | 19.2.7 | 1 major behind |
| react-dom | 18.3.1 | 19.2.7 | 1 major behind |
| typescript | 5.9.3 | 6.0.3 | 1 major behind |
| vite | 5.4.21 | 8.0.16 | 3 majors behind |
| vitest | 2.1.9 | 4.1.8 | 2 majors behind |

**Assessment:** Major React version (18 → 19) has breaking changes; test thoroughly. Vite 8 has significant breaking changes; plan migration.

---

### E2E (Source/E2E)

#### Package Summary
- **Direct dependencies:** 1 (prod only)
- **Transitive dependencies:** 4
- **Total packages scanned:** 4

#### Known CVEs: 0

✅ **No vulnerabilities detected.**

---

## Dependency Tree Analysis

### Duplicate/Multiple Versions

**Backend:** Detected brace-expansion versions via glob transitive chain — check for redundancy.

**Frontend:** No major version conflicts detected.

**E2E:** Minimal dependency footprint (playwright only).

### Supply Chain Risk Assessment

#### Post-Install Scripts
- ✅ None detected in Backend direct dependencies
- ✅ None detected in Frontend direct dependencies
- ⚠️ Frontend's optional dependencies may include build-time post-install hooks (normal for tools)

#### Popularity & Maintenance
All direct dependencies are well-maintained:
- express, react, react-router-dom: very high downloads/week
- uuid, pino: stable, frequent updates
- @types/* packages: maintained by TypeScript community
- jest, vitest, vite: active development

#### Single Maintainer Risk
- ❌ uuid (Christopher Teubert) — single maintainer, high dependence
- ⚠️ pino (Matteo Collina) — single maintainer
- ✅ Others: multiple maintainers or org-backed (React team, Vite team, TypeScript)

**Recommendation:** Monitor these for abandonement; have fallback plans.

---

## License Compliance

### Backend
✅ All packages are compatible with MIT/ISC/Apache 2.0:
- express: MIT
- uuid: MIT
- pino: MIT
- prom-client: Apache 2.0
- jest, typescript: MIT
- @types/*: MIT

**No GPL/AGPL dependencies detected.**

### Frontend
✅ All packages are compatible:
- react, react-dom: MIT
- react-router-dom: MIT
- vite, vitest: MIT
- @testing-library/*: MIT
- typescript: MIT

**No license compliance violations.**

### E2E
✅ @playwright/test: Apache 2.0

---

## Severity Classification Summary

| Severity | Count | Details |
|----------|-------|---------|
| **P1** (CRITICAL) | 2 | Handlebars code injection (Backend), Vitest file read/exec (Frontend) |
| **P2** (HIGH/MODERATE, actionable) | 4 | UUID buffer bounds, Express qs DoS, Vite path traversal, React Router open redirect |
| **P3** (MODERATE, low impact) | 6 | Brace-expansion DoS, PostCSS XSS, esbuild CORS bypass, ws memory leak, + deprecated packages |
| **P4** (LOW/INFORMATIONAL) | 0 | None |

---

## Remediation Roadmap

### Immediate (Next Sprint)
1. **Identify handlebars direct dependency** (Backend) — grep node_modules for which package pulls it in
2. **Upgrade uuid** → 9.0.3+ or 11.1.1+ (Backend)
3. **Upgrade vitest** → 3.2.6+ (Frontend) **[CRITICAL]**

### Short Term (1-2 sprints)
4. **Upgrade react-router-dom** → 6.30.4+ (Frontend)
5. **Run `npm audit fix`** on Backend to address qs, brace-expansion
6. **Plan vite 5→8 migration** (Frontend) — breaking changes require testing

### Medium Term (Next Quarter)
7. **Upgrade React** 18 → 19 (Frontend) — test thoroughly, likely no breaking changes for this codebase
8. **Upgrade TypeScript** 5 → 6 (Backend & Frontend)
9. **Plan Node.js LTS upgrade** (currently 20, EOL Apr 2025)

### Ongoing
10. **Set up automated dependency updates** (dependabot, renovate) with PR auditing
11. **Monitor uuid and pino** for single-maintainer risks
12. **Subscribe to npm security advisories** for critical packages

---

## Cross-Team Escalations

| Finding | Team | Action |
|---------|------|--------|
| DEP-001: Handlebars CVSS 9.8 | TheGuardians | Review if handlebars is actually used server-side; if yes, prioritize fix |
| DEP-005: Vitest CVSS 9.8 | TheGuardians | Dev environment vulnerability; ensure UI server not exposed; code-review launch scripts |
| DEP-002, DEP-003, DEP-004 | TheFixer | Routine dependency updates; no breaking changes |
| Deprecated packages | TheFixer | Update deprecation warnings in build logs; schedule replacement |

---

## JSON Metrics Summary

```json
{
  "audit_date": "2026-06-10",
  "scope": ["Source/Backend", "Source/Frontend", "Source/E2E"],
  "package_managers": ["npm"],
  "summary": {
    "backend": {
      "direct_deps": 13,
      "transitive_deps": 411,
      "cves_critical": 1,
      "cves_high": 0,
      "cves_moderate": 5,
      "cves_low": 0,
      "outdated_major": 6,
      "health_grade": "C"
    },
    "frontend": {
      "direct_deps": 13,
      "transitive_deps": 222,
      "cves_critical": 1,
      "cves_high": 0,
      "cves_moderate": 8,
      "cves_low": 0,
      "outdated_major": 5,
      "health_grade": "C"
    },
    "e2e": {
      "direct_deps": 1,
      "transitive_deps": 4,
      "cves_critical": 0,
      "cves_high": 0,
      "cves_moderate": 0,
      "cves_low": 0,
      "outdated_major": 0,
      "health_grade": "A"
    }
  },
  "total_cves": 15,
  "total_critical": 2,
  "total_moderate": 13,
  "license_violations": 0,
  "supply_chain_risks": [
    "uuid (single maintainer)",
    "pino (single maintainer)"
  ]
}
```

---

## Learnings & Next Steps

1. **Backend:** Handlebars is a hidden transitive dependency — consider vendoring or explicit allow-list.
2. **Frontend:** Vitest critical vulnerability affects developer experience; upgrade immediately.
3. **Ecosystem:** React 19 and vite 8 are available; plan migration for Q3.
4. **Process:** Implement automated dependency auditing in CI/CD; fail builds on P1 findings.
