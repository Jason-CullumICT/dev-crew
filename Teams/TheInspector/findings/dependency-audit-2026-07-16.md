# Dependency Auditor Findings Report
**Date:** 2026-07-16
**Project:** dev-crew (AI-powered development platform)

---

## SCAN SUMMARY

**Package Managers Detected:** npm (JavaScript/TypeScript)
**Workspaces Audited:** 6 major workspaces
  - Source/Backend (Node.js Express API)
  - Source/Frontend (React SPA)
  - Source/E2E (End-to-end tests)
  - platform/orchestrator (Agent orchestrator)
  - portal/Backend (Debug portal API)
  - portal/Frontend (Debug portal UI)

**Vulnerability Snapshot:**
| Workspace | Critical | High | Moderate | Low | Total |
|-----------|----------|------|----------|-----|-------|
| Source/Backend | 1 | 1 | 6 | 1 | 9 |
| Source/Frontend | 1 | 3 | 6 | 1 | 11 |
| Source/E2E | 0 | 0 | 0 | 0 | 0 |
| platform/orchestrator | 1 | 2 | 6 | 0 | 9 |
| portal/Backend | 2 | 6 | 46 | 0 | 54 |
| portal/Frontend | 1 | 4 | 5 | 1 | 11 |
| **TOTAL ACROSS ALL** | **6** | **16** | **69** | **3** | **94** |

---

## CRITICAL FINDINGS (P1)

### DEP-001: Protobufjs RCE (CVSS 9.8)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Workspaces:** platform/orchestrator, portal/Backend
- **Fix:** `npm update protobufjs`

### DEP-002: Handlebars.js JavaScript Injection (CVSS 9.8)
- **CVE:** GHSA-2w6w-674q-4c4q
- **Workspaces:** Source/Backend, Source/Frontend
- **Fix:** Update to handlebars 4.7.9+

### DEP-003: Vitest Arbitrary File Read/Execution
- **CVE:** GHSA-5xrq-8626-4rwp
- **Workspaces:** portal/Backend, portal/Frontend
- **Fix:** `npm update vitest`

---

## HIGH PRIORITY FINDINGS (P2)

| ID | Package | CVE | CVSS | Workspaces |
|----|---------|-----|------|-----------|
| DEP-004 | form-data | GHSA-hmw2-7cc7-3qxx | 7.5 | All |
| DEP-005 | vite | GHSA-67mh-4wv8-2f99 | 5.3 | Source/Frontend, portal |
| DEP-007 | postcss | GHSA-qx2v-qp2m-jg93 | 6.1 | Source/Frontend |
| DEP-008 | react-router-dom | GHSA-2j2x-hqr9-3h42 | 0/High | Source/Frontend |
| DEP-009 | @opentelemetry/* | Multiple | High | portal/* |
| DEP-010 | @grpc/grpc-js | Multiple | High | platform/orchestrator, portal/* |
| DEP-011 | path-to-regexp | Multiple | High | platform/orchestrator, portal/Backend |

---

## OUTDATED PACKAGES (P3)

| Package | Current | Wanted | Latest | Gap |
|---------|---------|--------|--------|-----|
| express | 4.18.2 | 4.22.2 | 5.2.1 | 1 major |
| pino | 8.17.0 | 8.21.0 | 10.3.1 | 2 major |
| uuid | 9.0.0 | 9.0.1 | 14.0.1 | 5 major |
| react | 18.3.1 | 18.3.1 | 19.2.7 | 1 major |
| react-dom | 18.3.1 | 18.3.1 | 19.2.7 | 1 major |
| react-router-dom | 6.26.0 | 6.30.4 | 7.18.1 | 1 major |
| vite | 5.4.0 | 5.4.0 | 8.1.4 | 2 major |

---

## SUPPLY CHAIN RISKS (P4)

- **portal/Backend:** 577 total dependencies (397 production) — EXCEEDS SAFE THRESHOLD
- **Duplicate packages:** vite, vitest, @types/* across multiple workspaces

---

## ACTION ITEMS

### IMMEDIATE (24-48 hours)
1. `npm update vitest protobufjs` in portal/Backend, portal/Frontend, platform/orchestrator
2. Update express, react-router-dom, handlebars
3. Disable vitest UI server in CI/CD

### SHORT TERM (This sprint)
1. `npm update form-data postcss @babel/core`
2. Upgrade React to v19: `npm update react react-dom @types/react`
3. `npm update vite` to latest
4. Update @opentelemetry packages in portal

### MEDIUM TERM (Next sprint)
1. Major version upgrades: express 4→5, pino 8→10, uuid 9→14
2. Audit portal/Backend; remove unused dependencies
3. Add npm audit gates to CI/CD pipeline

---

## ESCALATION TO THEGUARDIANS

Security findings requiring escalation:
- DEP-001: protobufjs RCE
- DEP-002: handlebars JavaScript injection
- DEP-003: vitest file read/code execution
- DEP-004: form-data CRLF injection
- DEP-008: react-router open redirect
- DEP-012: @babel/core file disclosure

---

## METRICS

| Category | Count |
|----------|-------|
| Critical CVEs | 6 |
| High CVEs | 16 |
| Moderate CVEs | 69 |
| Low CVEs | 3 |
| **Total** | **94** |
| Outdated major versions | 6 |
| High-risk dependency trees | 1 |
