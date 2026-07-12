# TheInspector Audit Report — 2026-07-12

**Grade: D** | Run ID: `run-20260712-054335` | Static-only audit (services offline)

---

## Overall Assessment

> ⛔ **Do Not Deploy.** Two CVSS 9.8 vulnerabilities (RCE + file-read + code execution) have been escalated to TheGuardians and block deployment until cleared. Four total P1 findings push the grade to **D** (config threshold: max P1 for grade C = 2).

| Metric | Value |
|--------|-------|
| Overall Grade | **D** |
| P1 Findings | 4 |
| P2 Findings | 8 |
| P3 Findings | 14 |
| P4 Findings | 13 |
| Escalations → TheGuardians | 2 |
| Spec Coverage | ~73% (69/95 canonical FRs) |
| Specialists Run | quality-oracle, dependency-auditor (static) |
| Specialists Skipped | performance-profiler, chaos-monkey (services offline) |
| Prior Audit | None — first audit, establishing baseline |

---

## Grading Rationale

```
A: max_p1=0, max_p2=3,  min_coverage=80%
B: max_p1=0, max_p2=8,  min_coverage=60%
C: max_p1=2, max_p2=15, min_coverage=40%
D: max_p1=999 (anything worse)
```

This audit: **4 P1** (exceeds C threshold of 2) → **Grade D**.
Spec coverage (73%) would satisfy B; P2 count (8) would satisfy B. The two critical CVEs determine the floor.

---

## 🚨 Escalations → TheGuardians

Both findings require security-team triage **before any remediation attempt**.

### DEP-001 — protobufjs RCE (CVSS 9.8)
- **Package:** `protobufjs@<=7.6.2` (transitive via `@grpc/grpc-js` in `platform/orchestrator`)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Exploit:** Untrusted `.proto` input → arbitrary code execution in the orchestrator process
- **Fix (after clearance):** Remove `@grpc/grpc-js` if unused, or `npm update protobufjs @grpc/grpc-js`
- **[ESCALATE → TheGuardians]**

### DEP-002 — vitest UI Arbitrary File Read & Code Execution (CVSS 9.8)
- **Package:** `vitest@<=3.2.5` in `Source/Frontend` (dev dependency)
- **CVE:** GHSA-5xrq-8626-4rwp
- **Exploit:** `vitest --ui` starts an unauthenticated server; any process on the same machine reads `.env`, source, executes code
- **Fix (after clearance):** `npm update vitest@>=3.2.6`
- **[ESCALATE → TheGuardians]**

---

## P1 Findings

| ID | Title | File | Fix |
|----|-------|------|-----|
| DEP-001 | protobufjs RCE (CVSS 9.8) | platform/orchestrator | Remove @grpc or update protobufjs |
| DEP-002 | vitest file read + RCE (CVSS 9.8) | Source/Frontend | npm update vitest@>=3.2.6 |
| QO-001 | Enforcer blind spot — portal/ never scanned (86% of codebase) | tools/traceability-enforcer.py:69 | Add "portal" to source_dirs |
| QO-002 | 6 orphaned FR IDs (FR-090–095) with no spec | portal/Frontend/src/components/orchestrator/ | Create Plans/orchestrator-ui-runs/requirements.md |

---

## P2 Findings

| ID | Category | Title | File | Fix |
|----|----------|-------|------|-----|
| QO-003 | Architecture | Direct DB calls in route handler | portal/Backend/src/routes/teamDispatches.ts:37 | Create teamDispatchService.ts |
| QO-004 | Error Handling | 3× silent `.catch(() => {})` | RepoSelector.tsx:20, FeatureRequestDetail.tsx:80, BugDetail.tsx:82 | Add logging + user feedback |
| QO-005 | Traceability | tiered-merge-pipeline.md — 0% coverage | Specifications/tiered-merge-pipeline.md | Annotate spec or add Verifies: comments |
| DEP-003 | CVE | handlebars 8 CVEs via @grpc | platform/orchestrator | Remove @grpc or update handlebars@>=4.7.9 |
| DEP-004 | CVE | vite path traversal (GHSA-4w7w) | Source/Frontend | npm update vite@>=6.4.3 |
| DEP-005 | CVE | form-data CRLF injection | Source/Backend, Source/Frontend | npm update form-data@>=4.0.6 |
| DEP-006 | CVE | @grpc/grpc-js server crash | platform/orchestrator | npm update @grpc/grpc-js@>=1.14.4 |
| DEP-007 | CVE | path-to-regexp ReDoS | platform/orchestrator | npm update path-to-regexp@>=0.1.13 |

---

## Cross-Reference Map

| Root Cause | Affected Findings | Single Fix | Impact |
|------------|------------------|-----------|--------|
| `@grpc/grpc-js` dependency chain | DEP-001 (P1) + DEP-003 (P2) + DEP-006 (P2) | Remove if unused, else update @grpc/grpc-js | Resolves 1 P1 + 2 P2 |
| Stale dev toolchain (vite + vitest) | DEP-002 (P1) + DEP-004 (P2) | `npm update vitest@>=3.2.6 vite@>=6.4.3` | Resolves 1 P1 + 1 P2 |
| Enforcer scope gap (`portal/` excluded) | QO-001 (P1) + QO-002 (P1) | Add "portal" to enforcer source_dirs | Resolves 2 P1s; prevents recurrence |
| Silent error pattern | QO-004 (P2) | One-pass refactor of 3 component files | Resolves 1 P2 |

---

## Spec Coverage

| Spec | Coverage | Notes |
|------|----------|-------|
| dev-workflow-platform.md (FR-001–069) | **100%** | All 69 FRs traced in portal/ |
| Dependency FRs (16 fine-grained IDs) | **6%** (1/16) | Vocabulary drift — code uses coarse IDs |
| tiered-merge-pipeline.md (FR-TMP-001–010) | **0%** | Possibly implemented in platform/ (out of scope) |
| **Overall** | **~73%** (69/95) | |

---

## Recommendations

### 🚨 Block Deployment — Do Today
1. **[DEP-001]** Escalate to TheGuardians. Audit @grpc/grpc-js usage — remove if unused to resolve DEP-001 + DEP-003 + DEP-006 in one change.
2. **[DEP-002]** Escalate to TheGuardians. After clearance: `npm update vitest@>=3.2.6`.

### 📋 This Sprint
3. **[QO-001]** Fix enforcer: add `"portal"` to source_dirs:69; pin `--plan` arg in CI.
4. **[QO-002]** Create `Plans/orchestrator-ui-runs/requirements.md` with FR-090–095 acceptance criteria.
5. **[DEP-004,005,007]** Patch: `npm update vite@>=6.4.3 form-data@>=4.0.6 path-to-regexp@>=0.1.13`.

### 📆 Next Sprint
6. **[QO-003]** Create teamDispatchService.ts; move all DB calls out of route handler.
7. **[QO-004]** Replace silent catches in RepoSelector, FeatureRequestDetail, BugDetail.
8. **[QO-005]** Resolve tiered-merge-pipeline traceability gap.
9. **[DEP-003,006]** Resolve @grpc chain (handlebars + grpc-js crash CVEs).
10. **[QO-006,009]** Fix non-deterministic enforcer; standardize FR ID format.
11. **[Outdated]** Upgrade pino 8→10; plan React 18→19 migration.

### 🗂 Backlog
12. QO-007: Add FR IDs to workflow-engine.md spec.
13. QO-008: Decompose 3 files exceeding 500 lines.
14. QO-010: Audit 3× eslint-disable react-hooks/exhaustive-deps suppressions.
15. DEP-008–015: Batch-patch moderate-severity CVEs (qs, js-yaml, ws, babel, postcss, esbuild, etc.).
16. Re-run TheInspector with services running for performance + chaos coverage.

---

## Outputs

| Artifact | Path |
|----------|------|
| Full HTML report (16 sections) | `Teams/TheInspector/findings/audit-2026-07-12-D.html` |
| Bug backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-07-12.json` |
| This summary | `inspector-report.md` |

---

## P3/P4 Summary

**P3 (14):** QO-006 through QO-010 (tooling/traceability), DEP-008–016 (moderate CVEs + outdated majors)
**P4 (13):** DEP-017–029 — low-severity npm CVEs; all have patches available.

Full details in `Teams/TheInspector/findings/dependency-audit-report.md`.

---

*Generated by TheInspector team-leader · run-20260712-054335 · 2026-07-12*
