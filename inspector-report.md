# TheInspector — System Health Audit Report
**Date:** 2026-09-20  
**Branch:** `audit/inspector-2026-09-20-a866e2`  
**Run ID:** `run-20260920-074528`  
**Overall Grade: C** ⚠️  

---

## Grade Breakdown

| Metric | Value | Threshold (C) |
|--------|-------|--------------|
| P1 findings | **2** | ≤ 2 |
| P2 findings | **14** | ≤ 15 |
| Spec coverage | **81%** | ≥ 40% |
| Specialists run | **2/4** | static only (services offline) |

---

## 🚨 Escalations → TheGuardians (3 findings)

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| DEP-001 | **P1** | Handlebars.js RCE — 8 CVEs, JavaScript injection via AST type confusion | Upgrade to `handlebars >=4.7.9` |
| DEP-002 | **P1** | protobufjs — 16 CVEs, code injection + DoS in orchestrator infrastructure | Upgrade protobufjs (with regression testing) |
| DEP-007 | P2 | postcss XSS & Path Traversal — 4 CVEs | `npm update postcss` |

**Action required before next release.** TheGuardians must validate injection surface and confirm fixes.

---

## P1 Findings

### DEP-001 — Handlebars.js RCE `Source/Backend`
- **Package:** `handlebars <=4.7.8`
- **CVEs:** 8 (JavaScript injection via AST type confusion, prototype pollution, partial-block manipulation)
- **Exploit:** User-controlled input reaching any Handlebars template → RCE with no auth required
- **Fix:** `npm update handlebars` in Source/Backend (patch release, non-breaking)
- **Route:** `[ESCALATE → TheGuardians]`

### DEP-002 — protobufjs Critical Cluster `platform/orchestrator`
- **Package:** `protobufjs <=6.x`
- **CVEs:** 16 (code injection in .proto parsing, DoS, prototype pollution, unbounded recursion)
- **Exploit:** Crafted .proto message crashes or compromises orchestrator → entire CI/CD pipeline halts
- **Fix:** Upgrade protobufjs after orchestrator regression testing
- **Route:** `[ESCALATE → TheGuardians + Infrastructure Team]`

---

## P2 Findings Summary (14 total)

### From Quality Oracle

| ID | Category | File(s) | Description |
|----|----------|---------|-------------|
| QO-001 | architecture-violation | `Source/Backend/src/routes/{workItems,workflow,intake}.ts` | Route handlers call store directly — bypasses service layer |
| QO-002 | spec-drift | `portal/Shared/api.ts`, `DependencyPicker.tsx` | Missing `blocked_by` field forces unsafe `as any` casts |
| QO-003 | spec-drift | `portal/Backend/src/database/seed.ts` (missing) | FR-dependency-seed: no seed file in portal/Backend |
| QO-004 | untested | `portal/Frontend/tests/` (2 files missing) | DependencySection and BlockedBadge have zero test coverage |

### From Dependency Auditor

| ID | Package | Location | Issue |
|----|---------|----------|-------|
| DEP-003 | brace-expansion | Source/Backend | DoS — exponential expansion (4 CVEs) |
| DEP-004 | browserslist | Source/Backend | Memory exhaustion & prototype pollution (2 CVEs) |
| DEP-005 | form-data | Source/Backend | CRLF injection (1 CVE) |
| DEP-006 | js-yaml | Source/Backend | Quadratic CPU DoS (4 CVEs) |
| DEP-007 | postcss | Source/Frontend | XSS & path traversal (4 CVEs) — **TheGuardians** |
| DEP-008 | vite | Source/Frontend | Path traversal in .map handling (3 CVEs) |
| DEP-009 | nanoid | Source/Backend | Integer overflow & infinite loop (3 CVEs) |
| DEP-010 | @grpc/grpc-js | platform/orchestrator | Malformed message crash (2 CVEs) |
| DEP-011 | @remix-run/router | Source/Frontend | Open redirect (1 CVE) |
| DEP-012 | path-to-regexp | Source/Backend | ReDoS (1 CVE) |

---

## P3/P4 Findings

| ID | Severity | Description |
|----|----------|-------------|
| QO-005 | P3 | Traceability enforcer blind spot — FR-TMP-001–010 in `platform/` not scanned |
| QO-006 | P4 | Undocumented `eslint-disable` in `useWorkItems.ts:63` |

---

## Spec Coverage

| Spec | Requirements | Coverage |
|------|-------------|---------|
| `workflow-engine.md` | FR-WF-001–013 | **100%** ✅ |
| `tiered-merge-pipeline.md` | FR-TMP-001–010 | **100%** *(platform/ not enforced)* |
| `dev-workflow-platform.md` | FR-dependency-* | **81%** ⚠️ |

Enforcer gate: **PASS** (13/13 FR-WF-* requirements traced)

---

## Recommendations

### 🚫 Block Deployment
1. Upgrade `handlebars >=4.7.9` in Source/Backend
2. Escalate protobufjs to TheGuardians + Infrastructure; isolate orchestrator network
3. Upgrade postcss in Source/Frontend

### ⚡ This Sprint (→ TheFixer)
4. `npm audit fix` across all workspaces (resolves DEP-003–006, DEP-009, DEP-012)
5. `npm update vite react-router-dom @grpc/grpc-js` in affected workspaces
6. Extract `workItemService.ts`; refactor route handlers (QO-001)
7. Add `blocked_by?: string[]` to API types; remove `as any` casts (QO-002)

### 📅 Next Sprint (→ TheFixer)
8. Create `portal/Backend/src/database/seed.ts` (QO-003)
9. Write `DependencySection.test.tsx` + `BlockedBadge.test.tsx` (QO-004)
10. Extend traceability enforcer to scan `platform/` (QO-005)
11. Add `npm audit --audit-level=high` CI gate + configure Dependabot

### 📋 Backlog
12. Document `eslint-disable` suppression in `useWorkItems.ts:63` (QO-006)
13. Schedule follow-up audit with services online for latency baselines + chaos testing

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|-----------|---------|-----------|
| Injection-class CVEs in dependency tree | DEP-001, DEP-002, DEP-007 | Upgrade handlebars/protobufjs/postcss + add `npm audit` CI gate |
| Portal dependency-linking plan incomplete | QO-002, QO-003, QO-004 | Complete portal dependency-linking implementation per plan delta table |
| No CI/CD dependency scanning gate | DEP-003–DEP-012 | Add `npm audit` to CI pipeline + Dependabot/Renovate |
| Service layer bypass | QO-001 | Extract `workItemService.ts` |

---

## Deliverables
- ✅ **Full HTML report:** `Teams/TheInspector/findings/audit-2026-09-20-C.html`
- ✅ **Bug backlog JSON:** `Teams/TheInspector/findings/bug-backlog-2026-09-20.json`
- ✅ **Audit metrics:** `Teams/TheInspector/findings/audit-metrics-2026-09-20.json` (from dependency-auditor)
- ✅ **Dependency detail:** `Teams/TheInspector/findings/dependency-audit-2026-09-20.md`

---

*TheInspector · Run ID: `run-20260920-074528` · Grade: C · 2P1 · 14P2 · 1P3 · 1P4*
