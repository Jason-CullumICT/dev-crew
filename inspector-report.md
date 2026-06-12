# TheInspector — Audit Report
**Audit ID:** `run-20260612-065801`  
**Date:** 2026-06-12  
**Branch:** `audit/inspector-2026-06-12-be2da3`  
**Overall Grade:** **D**  
**Specialists:** quality-oracle ✅ · dependency-auditor ✅ · performance-profiler ⏭ (services offline) · chaos-monkey ⏭ (services offline)

---

## Grade Rationale

| Threshold | max_p1 | max_p2 | min_spec_coverage | Met? |
|-----------|--------|--------|-------------------|------|
| A | 0 | 3 | 80% | ❌ (3 P1s, 7 P2s) |
| B | 0 | 8 | 60% | ❌ (3 P1s present) |
| C | 2 | 15 | 40% | ❌ (3 P1s > max of 2) |
| **D** | 999 | — | — | ✅ **ASSIGNED** |

3 P1 CVEs (CVSS 9.8) exceed the C-grade threshold of `max_p1: 2`. Grade = **D**.

---

## Summary Counts

| Severity | Count | Details |
|----------|-------|---------|
| P1 | 3 | DEP-001, DEP-002, DEP-003 — all [ESCALATE → TheGuardians] |
| P2 | 7 | QO-001, QO-002, QO-003, QO-004, DEP-004, DEP-005, DEP-006 |
| P3 | 3 | QO-005, QO-006, QO-007 |
| P4 | 1 | QO-008 |
| **Total** | **14** | |

**Spec coverage:** 69% (true, Source/ scope) · 100% enforcer-visible (FR-WF-*)  
**Dependency vulnerabilities:** 56 total — 4 critical · 7 high · 38 moderate · 7 low  
**License compliance:** CLEAN

---

## ⚠ Security Escalation → TheGuardians

Three P1 findings trigger `escalation.security_triggers` (injection, missing access control):

### DEP-001 — protobufjs Arbitrary Code Execution (CVSS 9.8)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Affected:** `platform/orchestrator`, `portal/Backend`
- **Vector:** Network, no auth required
- **Impact:** Full RCE at service privilege level
- **Fix:** `npm update protobufjs` in both workspaces
- **[ESCALATE → TheGuardians]**

### DEP-002 — Handlebars.js Template Injection (CVSS 9.8)
- **CVE:** GHSA-2w6w-674q-4c4q
- **Affected:** `Source/Backend`
- **Vector:** Network, no auth (if user input reaches templates)
- **Impact:** Server-side code execution via @partial-block type confusion
- **Fix:** `npm update handlebars`; audit all Handlebars call sites for untrusted input
- **[ESCALATE → TheGuardians]**

### DEP-003 — Vitest UI Server File Read & Execution (CVSS 9.8)
- **CVE:** GHSA-5xrq-8626-4rwp
- **Affected:** `Source/Frontend`, `portal/Frontend`
- **Vector:** Network, no auth (when `--ui` flag active)
- **Impact:** Arbitrary file read + code execution on developer/CI machines
- **Fix:** `npm update vitest`; enforce CI policy: never run `vitest --ui` in networked environments
- **[ESCALATE → TheGuardians]**

---

## P2 Findings → TheFixer Backlog

| ID | Title | File | Assign |
|----|-------|------|--------|
| QO-001 | GET /api/search missing from app.ts | `Source/Backend/src/app.ts` | TheFixer |
| QO-002 | dependencyCheckDuration Histogram absent | `Source/Backend/src/metrics.ts` | TheFixer |
| QO-003 | Route handlers bypass service layer | `routes/workItems.ts`, `workflow.ts`, `intake.ts` | TheFixer |
| QO-004 | Tiered Merge Pipeline 0% implemented | `Specifications/tiered-merge-pipeline.md` | TheATeam |
| DEP-004 | @grpc/grpc-js DoS (CVSS 7.5) | `platform/orchestrator`, `portal/Backend` | TheFixer |
| DEP-005 | path-to-regexp ReDoS (CVSS 7.5) | `platform/orchestrator`, `portal/Backend` | TheFixer |
| DEP-006 | @opentelemetry Prometheus crash (CVSS 7.5) | `portal/Backend` | TheFixer |

---

## P3 Findings

| ID | Title | File |
|----|-------|------|
| QO-005 | FR-dependency-seed not implemented | `Source/Backend/src/` |
| QO-006 | Duplicate logger abstraction | `src/logger.ts` · `src/utils/logger.ts` |
| QO-007 | Hardcoded artifact path in playwright config | `Source/E2E/playwright.pipeline.config.ts` |

## P4 Findings

| ID | Title | File |
|----|-------|------|
| QO-008 | eslint-disable without justification | `DependencyPicker.tsx` · `useWorkItems.ts` |

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|-----------|----------|------------|
| Incomplete API surface | QO-001 + QO-003 | `searchRouter` + `workItemService.ts` in `app.ts` |
| Outdated platform/portal packages | DEP-001 + DEP-004 + DEP-005 | `npm update protobufjs @grpc/grpc-js path-to-regexp` |
| Test infrastructure hygiene | DEP-003 + QO-007 | `npm update vitest` + fix `playwright.pipeline.config.ts` |
| Missing TMP traceability | QO-004 + QO-007 | Create `Plans/tiered-merge-pipeline/requirements.md` |

---

## Remediation Priority

**Block deployment:**
1. Patch DEP-001/002/003 (CVSS 9.8) — Phase 1: `npm update protobufjs @grpc/grpc-js path-to-regexp vitest`
2. Trigger TheGuardians audit on this branch

**This sprint:**
- QO-001: Wire up `/api/search` route
- QO-002: Add `dependencyCheckDuration` histogram
- DEP-004/005/006: npm update pass

**Next sprint:**
- QO-003: Extract `workItemService.ts`
- QO-004: Clarify TMP spec status
- Major version upgrades (express@5, react@19, pino@10, uuid@14)

**Backlog:**
- QO-005/006/007/008

---

## Deliverables

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-20260612-D.html` | Full 16-section HTML report |
| `Teams/TheInspector/findings/bug-backlog-20260612.json` | Machine-readable finding backlog with escalations array |
| `inspector-report.md` | This summary document |

---

*Generated by TheInspector team_leader · `run-20260612-065801` · 2026-06-12*
