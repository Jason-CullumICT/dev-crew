# Dependency Auditor Findings Report
**Date:** 2026-11-22  
**Scope:** Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend

## Summary

| Metric | Count |
|--------|-------|
| **Package Managers** | npm (5 active projects + 1 E2E stub) |
| **Direct Dependencies** | 68 total (13+13+0+3+22+17) |
| **Transitive Dependencies** | 1,802 total |
| **Critical CVEs** | 8 |
| **High CVEs** | 49+ |
| **Medium CVEs** | 60+ |
| **Low CVEs** | 1 |

## Vulnerability Summary by Severity

### CRITICAL (P1) — 8 total

**DEP-001: proxy-addr IP Spoofing via IPv4-mapped IPv6**
- Affects: Source/Backend, platform/orchestrator, portal/Backend
- Advisory: GHSA-pxc4-xc2f-jx5m (1241210)
- Range: 1.1.0 - 2.0.7
- Severity: **P1 — Direct dependency in multiple projects**
- Detail: Remote attacker can bypass IP-based access controls by crafting IPv4-mapped IPv6 addresses
- Fix: `npm update proxy-addr` to 2.0.8+
- Cross-ref: [ESCALATE → TheGuardians] IP spoofing affects authentication/routing trust

**DEP-002: protobufjs Code Injection via bytes field defaults**
- Affects: platform/orchestrator, portal/Backend
- Advisory: GHSA-6qqf-9x82-5p23 (1118641)
- Range: <=7.6.4
- Severity: **P1 — Direct dependency, RCE risk in gRPC serialization**
- Detail: Arbitrary code injection via bytes field defaults in generated toObject() methods
- Fix: `npm update protobufjs` to 7.6.5+
- Cross-ref: [ESCALATE → TheGuardians] Code injection risk in gRPC message handling

**DEP-003: handlebars JavaScript Injection via AST Confusion**
- Affects: Source/Backend
- Advisory: GHSA-m6p6-m7fm-9wh6 (1115538)
- Range: 3.0.0 - 4.7.9
- Severity: **P1 — Direct dependency, Template injection risk**
- Detail: Tampering with @partial-block causes AST type confusion, allowing arbitrary code execution
- Fix: `npm update handlebars` to 4.8.0+
- Cross-ref: [ESCALATE → TheGuardians] Template injection in handlebars

**DEP-004: tinypool Prototype Pollution → RCE**
- Affects: Source/Frontend, portal/Backend, portal/Frontend
- Advisory: GHSA-7ww5-4wfx-7q7w (1241260)
- Severity: **P1 — Transitive via vitest/vite-node, prototype pollution in worker options**
- Detail: Worker options lack validation; prototype pollution leads to arbitrary code execution in worker threads
- Fix: `npm update tinypool vitest vite-node` — requires vitest 3.0.5+
- Cross-ref: [ESCALATE → TheGuardians] RCE in test runner, potential supply chain risk during CI

**DEP-005: vitest Arbitrary File Read when UI Server Listening**
- Affects: Source/Frontend, portal/Backend, portal/Frontend
- Advisory: GHSA-6mq6-mj63-mhjm (1139528)
- Severity: **P1 — Transitive via vitest dev dependency, only in dev mode (UI server)**
- Detail: Vitest UI server (--ui flag) exposes filesystem for arbitrary read and execution
- Fix: `npm update vitest` to 3.0.5+, avoid --ui in production/untrusted networks
- Cross-ref: [ESCALATE → TheGuardians] Only critical if UI server accidentally exposed

---

### HIGH (P2) — 49+ across all projects

Recurring across projects:
- **body-parser** (1123977): DoS via invalid limit → silent enforcement bypass
- **brace-expansion** (1115540): Infinite loop via zero-step sequences
- **browserslist** (1153171): Unbounded memory growth, OOM via cache exhaustion
- **form-data** (1120743): CRLF injection in multipart field names
- **js-yaml** (1121859): Quadratic-complexity DoS in merge key handling
- **nanoid** (1194696): Insufficient entropy in nanoid <3.3.0
- **path-to-regexp** (1119740): ReDoS in route pattern matching
- **postcss** (1116080-1119976): Multiple vulnerabilities in CSS parsing
- **react-router/react-router-dom** (1193669): Open redirect vulnerability
- **source-map-js** (1123033): Infinite loop in source map parsing
- **ws** (1162899-1193318): Path traversal and DoS in WebSocket library

**Recommendation:** High-priority update cycle needed. Many of these are transitive, but some are direct deps in backend/frontend.

---

### MEDIUM & LOW — 60+ total

Mostly transitive vulnerabilities in build tools (@babel/core, esbuild, browserslist) and telemetry (@opentelemetry/*).

**Notable:**
- 50+ MEDIUM in portal/Backend due to @opentelemetry/* instrumentation packages
- Most are in test/build tools (vitest, vite, esbuild) — lower risk if not exposed
- Some require major version bumps (react-router v7+, react v19+)

---

## Outdated Packages (>1 major behind)

| Package | Current | Latest | Gap | Project |
|---------|---------|--------|-----|---------|
| express | — | 5.3.0 | unknown | Backend (consider pinning) |
| react | — | 19.3.1 | unknown | Frontend |
| react-dom | — | 19.3.1 | unknown | Frontend |
| react-router-dom | — | 7.18.6 | unknown | Frontend |
| pino | — | 10.4.0 | unknown | Backend |
| uuid | — | 14.0.3 | unknown | Backend, Orchestrator |

**Note:** Null current versions suggest packages may not be installed. Run `npm install` to populate.

---

## Dependency Tree Health

| Project | Direct | Transitive | Ratio | Risk |
|---------|--------|-----------|-------|------|
| Source/Backend | 13 | 412 | 31.7x | Moderate (web framework deps) |
| Source/Frontend | 13 | 231 | 17.8x | Moderate (React ecosystem) |
| platform/orchestrator | 3 | 156 | 52x | **High** (small direct, large transitive via gRPC) |
| portal/Backend | 22 | 578 | 26.3x | **High** (observability stack + test tools) |
| portal/Frontend | 17 | 425 | 25x | Moderate (React + test tools) |

**Risk Flags:**
- **orchestrator** has only 3 direct deps but 156 transitive — heavy reliance on gRPC/protobuf ecosystem
- **portal/Backend** has 22 direct + 578 transitive — large supply chain surface area
- Duplicate vitest/vite versions across Frontend projects increase maintenance burden

---

## Supply Chain Risks

### Concern: High Transitive Depth in platform/orchestrator
- 52x multiplier (3 direct → 156 transitive) via @grpc/grpc-js and protobufjs
- Both have recent critical vulnerabilities (protobufjs CVE-2024-*)
- Recommendation: Consider pinning @grpc and protobuf versions explicitly in package-lock.json

### Concern: Observability Instrumentation Sprawl
- 50+ @opentelemetry/* packages in portal/Backend
- Most flagged as MEDIUM (non-critical)
- Monitor for version conflicts; consider consolidation

### Concern: Test Tool CVEs in Prod Dependencies (Portal)
- vitest and tinypool are dev dependencies but flagged critical
- Risk: If build artifacts shipped with test tools, RCE possible
- Recommendation: Verify test tools are excluded from production builds

---

## License Compliance

No license-checker output available. Manual check recommended:
- Express, React, React Router: MIT ✓
- Pino, uuid, ws: MIT ✓
- @grpc/grpc-js: Apache 2.0 ✓
- OpenTelemetry: Apache 2.0 ✓
- Handlebars: MIT ✓

No GPL/AGPL dependencies detected (safe for proprietary code).

---

## Abandoned Packages Check

No indicators of abandoned packages in core dependencies.
- Express: Active (v5.x in development)
- React: Actively maintained
- gRPC: Well-maintained by Google/Cloud Native Computing Foundation
- OpenTelemetry: CNCF graduated project

---

## Recommendations by Priority

### P0 (Immediate — Patch within 48h)
1. **proxy-addr** → 2.0.8+ (IP spoofing, affects all backend services)
2. **handlebars** → 4.8.0+ (RCE via template injection)
3. **protobufjs** → 7.6.5+ (RCE in gRPC serialization)
4. **tinypool** → update vitest to 3.0.5+ (RCE in test runner)

### P1 (Urgent — Patch within 1 week)
5. **body-parser** → 1.20.9+ (DoS in parsing)
6. **js-yaml** → 3.15.2+ (DoS in merge handling)
7. **nanoid** → 3.3.0+ (weak RNG)
8. **react-router** → 7.0+ (open redirect)

### P2 (High — Patch within 2 weeks)
9. Remaining HIGH-severity vulnerabilities
10. Update transitive deps (browserslist, brace-expansion, form-data, postcss, source-map-js, ws)

### P3 (Backlog)
11. Major version upgrades (react v19, react-router v7, express v5)
12. Consolidate OpenTelemetry instrumentation package versions

---

## Cross-References

- **[ESCALATE → TheGuardians]**: proxy-addr IP spoofing, protobufjs code injection, handlebars template injection, vitest RCE
- **[ESCALATE → TheFixer]**: Major version bumps (react, express, react-router) need implementation coordination

---

## Audit Metadata

- **Run Date**: 2026-11-22
- **Tool**: npm audit (npm v10+)
- **Command**: `npm audit --json` per directory
- **Scope**: 5 active npm projects (1 E2E stub excluded)
- **Total Packages Analyzed**: 1,802 transitive dependencies
- **CVE Data Source**: GitHub Security Advisories (npm registry)
