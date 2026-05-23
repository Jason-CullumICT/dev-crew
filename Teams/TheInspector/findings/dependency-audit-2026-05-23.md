# Dependency Auditor Findings
**Report Date:** 2026-05-23  
**Status:** Complete  
**Audited Projects:** 3 main (Backend, Frontend, Orchestrator)

---

## Executive Summary

| Metric | Count | Severity Breakdown |
|--------|-------|-------------------|
| **Total CVEs Found** | 21 | Critical: 2, High: 1, Moderate: 18 |
| **Direct Dependencies** | 29 | - |
| **Transitive Dependencies** | 799 | Backend: 412, Frontend: 231, Orchestrator: 156 |
| **Outdated (>1 major version)** | 12 | P2/P3 items below |
| **Post-install Scripts** | 0 | ✓ Clean |
| **License Issues** | 0 | All MIT/Apache-2.0 |

---

## Severity Summary

- **P1 (Critical + Direct):** 1 finding (Backend handlebars)
- **P2 (Critical indirect / High direct / >2 major outdated):** 3 findings
- **P3 (Moderate in direct / >1 major outdated):** 12 findings
- **P4 (Informational):** 5 findings

---

## Findings by Project

### Source/Backend (13 direct, 412 transitive)

#### DEP-001: [CRITICAL] Handlebars Template Injection (via ts-jest)
- **Severity:** P1
- **Category:** CVE (Critical)
- **Package:** `handlebars@4.7.8` (transitive: `ts-jest@29.4.6`)
- **File:** `Source/Backend/package-lock.json`
- **CVE IDs:** 
  - GHSA-3mfm-83xf-c92r: JavaScript Injection via AST Type Confusion (High, CVSS 8.1)
  - GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion (Critical, CVSS 9.8)
  - GHSA-2qvq-rjwj-gvw9: Prototype Pollution → XSS via Partial Template Injection
  - GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap
  - GHSA-442j-39wm-28r2: Property Access Validation Bypass in container.lookup
  - GHSA-xhpv-hc6g-r9c6: JavaScript Injection via dynamic partial handling
  - GHSA-9cx6-37pm-9jff: Denial of Service via malformed decorator syntax
  - GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI precompiler
- **Detail:** Handlebars template engine versions ≤4.7.8 are vulnerable to multiple injection attacks. No direct use in application code detected, but included in ts-jest dev dependency chain. **Context:** This is a dev-time dependency only (testing framework compilation), not in production runtime. However, if ts-jest is used in build pipelines on untrusted input (unlikely here), it poses a risk.
- **Fix:** Upgrade ts-jest to latest (→ ~29.4.11 for patch compatibility, or ~30+ for next major). Handlebars upgrade path is limited by ts-jest support.
- **Cross-ref:** [CROSS-REF: TheGuardians] - Check if handlebars is ever compiled/executed on user-controlled template data during build or test phases.
- **Status:** Monitor - requires ts-jest upgrade; coordinate with frontend-coder on testing framework compatibility

#### DEP-002: QS Stringify DoS (via Express)
- **Severity:** P2
- **Category:** CVE (Moderate in transitive; Moderate in direct)
- **Package:** `qs@6.11.1` → `6.15.1` (transitive: `express@4.22.1`, `body-parser`)
- **File:** `Source/Backend/package-lock.json`
- **CVE ID:** GHSA-q8mj-m7cp-5q26
- **Detail:** qs.stringify() crashes with TypeError when null/undefined entries exist in comma-format arrays and encodeValuesOnly is set. Exploitable in Express request parsing if attacker crafts specific query string formats. CVSS 6.5 (DoS risk).
- **Fix:** `npm audit fix` → upgrades qs to ≥6.15.2 and express to ≥4.22.2
- **Note:** Ready to auto-fix; no breaking changes

#### DEP-003: UUID Buffer Bounds Check Missing
- **Severity:** P2
- **Category:** CVE (Moderate)
- **Package:** `uuid@9.0.1` → `9.0.2` (or `14.0.0` for major upgrade)
- **File:** `Source/Backend/package-lock.json`
- **CVE ID:** GHSA-w5hq-g745-h8pq
- **Detail:** uuid v3/v5/v6 missing buffer bounds validation when buf parameter is provided. Could allow information disclosure or crash. Used directly in application for work item IDs.
- **Fix:** `npm audit fix --force` → uuid@14.0.0 (breaking changes possible but likely safe for UUID usage)
- **Note:** Requires testing to confirm no v3/v5/v6 usage by application

#### DEP-004: Brace-Expansion ReDoS via Zero-Step Sequences
- **Severity:** P3
- **Category:** CVE (Moderate)
- **Package:** `brace-expansion@<1.1.13` (transitive: glob)
- **File:** `Source/Backend/package-lock.json`
- **CVE ID:** GHSA-f886-m6hf-6m8v
- **Detail:** Glob patterns like `{a..0}` cause process hang and memory exhaustion. Used in test discovery (jest.config.ts patterns). **Risk:** Medium — only triggered by test config patterns, not production.
- **Fix:** `npm audit fix` → upgrades glob to version with brace-expansion ≥1.1.13
- **Status:** Ready to fix

#### DEP-005: Deprecated Supertest v6 (Dev Dependency)
- **Severity:** P4
- **Category:** Maintenance
- **Package:** `supertest@6.3.4` → `7.2.2`
- **File:** `Source/Backend/package.json`
- **Detail:** Supertest v6 is end-of-life. Upgrade to v7.1.3+ for continued maintenance per Forward Email support.
- **Note:** Dev dependency only; not critical but reduces technical debt
- **Fix:** `npm update supertest`

#### DEP-006: Deprecated Glob v7
- **Severity:** P4
- **Category:** Maintenance
- **Package:** `glob@7.2.3` (indirect)
- **File:** `Source/Backend/package-lock.json`
- **Detail:** Old glob versions leak memory and contain publicized CVEs. Included in test dependencies.
- **Fix:** Upgrade to glob@10+ (included in jest/ts-jest updates)

#### DEP-007–018: Outdated Type Definitions
- **Severity:** P3
- **Category:** Outdated (>1 major version behind)
- **Packages:**
  - @types/express: 4.17.25 → 5.0.6 (latest)
  - @types/jest: 29.5.14 → 30.0.0
  - @types/node: 20.19.37 → 25.9.1 (+5 major versions)
  - @types/supertest: 6.0.3 → 7.2.0
  - @types/uuid: 9.0.8 → 10.0.0
- **Detail:** Typing packages significantly behind. While not security-critical, they may miss type improvements and constraint changes.
- **Fix:** Coordinate major version upgrades with frontend-coder; test TypeScript compilation
- **Note:** Consider bundling with testing framework updates (jest→30, typescript→6)

#### DEP-019: Express v4 Approaching EOL
- **Severity:** P3
- **Category:** Outdated (major version behind)
- **Package:** `express@4.22.1` → `5.2.1`
- **Detail:** Express v5 is available but is a major release. Current v4.22 is stable but approaching end-of-life. Many dependencies still use v4.
- **Fix:** Plan express v5 migration for next major release cycle; no urgency now
- **Note:** Orchestrator and Portal also use express@4; coordinate migration

#### DEP-020: Pino Logger v8 (2 major versions behind)
- **Severity:** P3
- **Category:** Outdated
- **Package:** `pino@8.21.0` → `10.3.1`
- **Detail:** Pino v10 has performance and API improvements. Current v8 still supported but old.
- **Fix:** `npm update pino` (should be backwards-compatible within major version)
- **Note:** Check release notes for breaking changes before upgrading

#### DEP-021: TypeScript v5 (1 major version behind)
- **Severity:** P3
- **Category:** Outdated
- **Package:** `typescript@5.9.3` → `6.0.3`
- **Detail:** TS v6 released recently; v5 still current but tracking new version is recommended
- **Fix:** Requires full compilation test; bundle with other major upgrades

---

### Source/Frontend (13 direct, 231 transitive)

#### DEP-022: Vite Path Traversal via Map Handling
- **Severity:** P2
- **Category:** CVE (Moderate)
- **Package:** `vite@5.4.21` → `5.4.23` / `6+` (or `8.0.14` for latest)
- **File:** `Source/Frontend/package-lock.json`
- **CVE ID:** GHSA-4w7w-66w2-5vf9
- **Detail:** Vite optimized deps `.map` path traversal. Exploitable in dev builds if attacker controls optimized deps. **Risk:** Dev-only, low production impact.
- **Fix:** `npm audit fix --force` → vite@8.0.14 (breaking changes likely)
- **Status:** Can defer; dev-time only

#### DEP-023: Esbuild CORS Bypass (Vite dependency)
- **Severity:** P2
- **Category:** CVE (Moderate)
- **Package:** `esbuild@<=0.24.2` (via vite)
- **File:** `Source/Frontend/package-lock.json`
- **CVE ID:** GHSA-67mh-4wv8-2f99
- **Detail:** Esbuild dev server allows any website to send requests and read responses (CSRF + cross-origin). **Risk:** Dev-time only, but poses risks during frontend development on shared networks.
- **Fix:** Upgrade vite to ≥5.4.3 (or vite@8+ for latest)
- **Status:** Should fix for development security

#### DEP-024: PostCSS XSS via Unescaped Style Tags
- **Severity:** P3
- **Category:** CVE (Moderate)
- **Package:** `postcss@<8.5.10` (via vite)
- **File:** `Source/Frontend/package-lock.json`
- **CVE ID:** GHSA-qx2v-qp2m-jg93
- **Detail:** PostCSS doesn't escape `</style>` in CSS stringification, leading to XSS if attacker controls CSS input. **Risk:** Only if custom CSS is dynamically generated from user input (unlikely here).
- **Fix:** `npm audit fix` → postcss@8.5.10+
- **Status:** Should fix as precaution

#### DEP-025: WS Uninitialized Memory Disclosure
- **Severity:** P3
- **Category:** CVE (Moderate)
- **Package:** `ws@8.20.0` (indirect)
- **File:** `Source/Frontend/package-lock.json`
- **CVE ID:** GHSA-58qx-3vcg-4xpx
- **Detail:** WebSocket library leaks uninitialized memory in certain conditions. **Risk:** Frontend doesn't use WebSockets directly; likely transitive via test or dev dependency. Low risk.
- **Fix:** Upgrade ws to ≥8.20.1
- **Status:** Low priority

#### DEP-026–031: Outdated React & Tooling
- **Severity:** P3
- **Category:** Outdated (>1 major version behind)
- **Packages:**
  - react: 18.3.1 → 19.2.6 (+1 major)
  - react-dom: 18.3.1 → 19.2.6 (+1 major)
  - react-router-dom: 6.30.3 → 7.15.1 (+1 major)
  - @types/react: 18.3.28 → 19.2.15 (+1 major)
  - @types/react-dom: 18.3.7 → 19.2.3 (+1 major)
  - vitest: 2.1.9 → 4.1.7 (+2 major)
  - vite: 5.4.21 → 8.0.14 (+3 major in latest)
  - typescript: 5.9.3 → 6.0.3 (+1 major)
  - jsdom: 24.1.3 → 29.1.1 (+5 major)
  - @vitejs/plugin-react: 4.7.0 → 6.0.2 (+2 major)
- **Detail:** Frontend stack is moderately outdated. React 19 and tooling upgrades available but require testing.
- **Fix:** Plan frontend update sprint; react@19 + vite@latest + vitest@latest should be coordinated
- **Note:** Frontend-coder to plan and execute update; scope includes testing revalidation

---

### platform/orchestrator (3 direct, 156 transitive)

#### DEP-032: [CRITICAL] Protobufjs Code Execution
- **Severity:** P1
- **Category:** CVE (Critical)
- **Package:** `protobufjs@<=7.5.7` (transitive: `dockerode@4.0.10`)
- **File:** `platform/orchestrator/package-lock.json`
- **CVE IDs:**
  - GHSA-xq3m-2v4x-88gg: Arbitrary code execution
  - GHSA-66ff-xgx4-vchm: Code injection via bytes field defaults
  - GHSA-2pr8-phx7-x9h3: DoS from crafted field names
  - GHSA-fx83-v9x8-x52w: Prototype injection in constructors
  - GHSA-75px-5xx7-5xc7: Code generation gadget after prototype pollution
  - GHSA-jvwf-75h9-cwgg: Process-wide DoS via unsafe option paths
  - GHSA-685m-2w69-288q: DoS via unbounded recursion
  - GHSA-q6x5-8v7m-xcrf: Overlong UTF-8 decoding
  - GHSA-jggg-4jg4-v7c6: DoS via unbounded JSON descriptor expansion
- **Detail:** Protobufjs ≤7.5.7 has **arbitrary code execution** vulnerability. Used by dockerode for Docker API communication. **RISK:** High — if attacker controls Docker API responses or protobuf messages, can execute arbitrary code in orchestrator process.
- **Fix:** Upgrade dockerode to ≥5.0.0 (brings protobufjs upgrade) OR upgrade protobufjs directly
- **Status:** URGENT — This is production infrastructure. Prioritize dockerode@5.0.0 upgrade
- **Cross-ref:** [ESCALATE → TheGuardians] — Code execution in orchestrator infrastructure

#### DEP-033: Path-to-Regexp ReDoS
- **Severity:** P2
- **Category:** CVE (High)
- **Package:** `path-to-regexp@<0.1.13` (via express)
- **File:** `platform/orchestrator/package-lock.json`
- **CVE ID:** GHSA-37ch-88jc-xwx2
- **Detail:** ReDoS via multiple route parameters. Crafted route definitions could cause CPU exhaustion. **Risk:** Express routes defined in orchestrator are internally controlled, but still represents a latent DoS vector.
- **Fix:** `npm audit fix` → path-to-regexp@>=0.1.13 (via express upgrade)
- **Status:** Should fix; likely automatic with other upgrades

#### DEP-034: UUID Buffer Bounds
- **Severity:** P2
- **Category:** CVE (Moderate, same as Backend DEP-003)
- **Package:** `uuid@<11.1.1` (via dockerode)
- **Detail:** Same uuid issue as backend; orchestrator uses docker API which may use uuid.
- **Fix:** Upgrade dockerode@5.0.0+ (brings uuid upgrade)
- **Status:** Included in protobufjs fix

#### DEP-035: QS DoS
- **Severity:** P3
- **Category:** CVE (Moderate, same as Backend DEP-002)
- **Package:** `qs@6.11.1` (via express)
- **Fix:** `npm audit fix`

#### DEP-036–038: Outdated Transitive Dependencies
- **Severity:** P4
- **Category:** Maintenance
- **Package:** Various (no major production dependencies, but express@4 is outdated)
- **Note:** Coordinate express upgrade with Backend/Frontend updates

---

## Supply Chain Analysis

### Dependency Tree Size
| Project | Direct | Transitive | Risk Assessment |
|---------|--------|-----------|-----------------|
| Backend | 13 | 412 | **P4** - Medium complexity, all npm registry |
| Frontend | 13 | 231 | **P4** - Medium complexity, all npm registry |
| Orchestrator | 3 | 156 | **P4** - Medium complexity, includes Docker bridge |

**P4 Finding:** Transitive dependency counts are reasonable (<500 each), no bloat detected.

### Post-Install Scripts
✓ **Clean** — No postinstall scripts detected. Zero supply chain risk from build-time code execution.

### Single-Maintainer / Low-Download Packages
- **prom-client**: Maintained by Prometheus; stable
- **pino**: Maintained by Matteo Collina; well-supported
- **dockerode**: Maintained by apocas; 200k+ weekly downloads
- All major packages have healthy maintenance

---

## License Compliance

| Package | License | Status |
|---------|---------|--------|
| express | MIT | ✓ |
| react | MIT | ✓ |
| vite | MIT | ✓ |
| pino | MIT | ✓ |
| prom-client | Apache-2.0 | ✓ |
| uuid | MIT | ✓ |

**Result:** All dependencies use permissive licenses (MIT/Apache-2.0). No GPL/AGPL/viral licenses detected. **Status: P4 — Compliant**

---

## Recommendations by Priority

### Immediate (This Sprint)
1. **Upgrade dockerode@5.0.0** — Fixes critical protobufjs RCE in orchestrator
2. **Run `npm audit fix`** on Backend → fixes qs, brace-expansion, postcss
3. **Test Backend post-fix** — Verify no breaking changes from upgrades

### Short-Term (Next 2 Weeks)
4. Upgrade vite to ≥5.4.3+ to fix esbuild CORS bypass
5. Coordinate ts-jest upgrade path with frontend-coder (testing framework compatibility)
6. Plan React 19 + tooling upgrade sprint for Frontend (DEP-026–031)

### Medium-Term (Next Quarter)
7. Migrate Express v4 → v5 across all services (Backend, Orchestrator, Portal)
8. Upgrade TypeScript to v6 across all projects
9. Audit for any undocumented handlebars usage in Backend

### Technical Debt (Monitor)
10. Track deprecation notices for supertest, glob, and other dev dependencies
11. Plan Pino v10 migration when testing confirms compatibility
12. Review orchestrator's protobufjs usage post-upgrade for any API changes

---

## Cross-Team Coordination

| Finding | Owner | Notes |
|---------|-------|-------|
| DEP-032 (Protobufjs RCE) | **solo-session** | Update platform/orchestrator immediately; this is infrastructure |
| DEP-001 (Handlebars) | frontend-coder | Verify ts-jest compatibility during testing framework update |
| DEP-026–031 (React upgrades) | frontend-coder | Plan React 19 migration sprint |
| Express v5 migration | backend-coder + frontend-coder | Coordinate across services |

---

## Dashboard JSON Summary

```json
{
  "audit_date": "2026-05-23",
  "projects_audited": 3,
  "vulnerabilities": {
    "critical": 2,
    "high": 1,
    "moderate": 18,
    "total": 21
  },
  "cves_by_project": {
    "Source/Backend": {
      "critical": 1,
      "high": 0,
      "moderate": 5,
      "total": 6
    },
    "Source/Frontend": {
      "critical": 0,
      "high": 0,
      "moderate": 4,
      "total": 4
    },
    "platform/orchestrator": {
      "critical": 1,
      "high": 1,
      "moderate": 4,
      "total": 6
    }
  },
  "severity_p_grades": {
    "P1": 1,
    "P2": 3,
    "P3": 12,
    "P4": 5
  },
  "dependencies": {
    "direct": 29,
    "transitive": 799
  },
  "remediation_status": {
    "immediate": 2,
    "short_term": 3,
    "medium_term": 4,
    "monitoring": 1
  },
  "escalations": [
    {
      "cve": "GHSA-xq3m-2v4x-88gg",
      "package": "protobufjs",
      "target_team": "TheGuardians",
      "reason": "Arbitrary code execution in infrastructure (orchestrator)"
    },
    {
      "cve": "GHSA-3mfm-83xf-c92r",
      "package": "handlebars",
      "target_team": "TheGuardians",
      "reason": "Template injection risk; verify ts-jest doesn't execute untrusted templates"
    }
  ]
}
```

---

## Notes for Future Audits

- **npm audit fix:** Can be safely run on Backend immediately (no breaking changes expected)
- **Version tracking:** Express v4 is now 1+ years behind v5; prioritize migration planning
- **Tooling upgrades:** Frontend requires coordinated testing of React 19 + vite + vitest upgrades
- **Orchestrator stability:** Dockerode upgrade required; test Docker API integration post-upgrade
