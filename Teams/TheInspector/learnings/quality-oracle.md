# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-09-11 — First Full Audit

#### Spec Coverage Trend
- **self-judging-workflow plan**: 100% (13/13 FRs) — stable, complete
- **dev-cycle-traceability plan**: 0% (0/20 FRs) — never implemented, P1
- **orchestrator-cycle-dashboard plan**: 0% (0/7 FRs) — never implemented, P1

#### Critical Discovery: Traceability Enforcer Scope Gap
Running `python3 tools/traceability-enforcer.py` without arguments always resolves to the **most recently modified** `requirements.md` (currently `Plans/self-judging-workflow/requirements.md`). This masks failures in `Plans/dev-cycle-traceability/requirements.md` and `Plans/orchestrator-cycle-dashboard/requirements.md`. Always run the enforcer against all plan files explicitly for a complete picture:
```bash
python3 tools/traceability-enforcer.py --file Plans/self-judging-workflow/requirements.md
python3 tools/traceability-enforcer.py --file Plans/dev-cycle-traceability/requirements.md
python3 tools/traceability-enforcer.py --file Plans/orchestrator-cycle-dashboard/requirements.md
```

#### Source Traceability ID Namespaces in Use
- `FR-WF-001` through `FR-WF-013` — Self-Judging Workflow Engine (Plans/self-judging-workflow)
- `FR-dependency-*` (composite keys) — Dependency Tracking (merged into self-judging-workflow codebase)
- `FR-050` through `FR-069` — Dev Cycle Traceability (Plans/dev-cycle-traceability — UNIMPLEMENTED)
- `FR-070` through `FR-076` — Orchestrator Cycle Dashboard (Plans/orchestrator-cycle-dashboard — UNIMPLEMENTED)
- **Note:** `Specifications/dev-workflow-platform.md` uses `FR-001`–`FR-069` IDs but these are NOT the same as the IDs used in source traceability — this spec covers a *different, larger system* (the full dev-workflow platform). The implemented app (workflow-engine) traces to `FR-WF-*` IDs from `Plans/self-judging-workflow/`.

#### Architecture Pattern: Direct Store Calls from Routes
Three route files (`workItems.ts`, `intake.ts`, `workflow.ts`) import `workItemStore` directly. This violates the service-layer rule. The other routes (dashboard, intake actions) correctly call service functions. Future audits: check for `import.*store` in route files.

#### Useful File Paths for Future Audits
- Plans with requirements: `Plans/*/requirements.md`
- All source traceability: `grep -rn "Verifies:" Source/ --include="*.ts"`
- All spec FRs: `grep -rn "FR-[0-9A-Z]" Specifications/ --include="*.md"`
- Large files: `Source/Backend/src/routes/workflow.ts` (374 lines), `Source/Frontend/src/pages/WorkItemDetailPage.tsx` (426 lines)
- Duplicate test files: `tests/WorkItemDetailPage.test.tsx` AND `tests/pages/WorkItemDetailPage.test.tsx` — both exist with different content
- Enforcer script: `tools/traceability-enforcer.py` — supports `--file` flag to target specific plan

#### Common Pattern Violations Found
1. `eslint-disable-next-line react-hooks/exhaustive-deps` in `useWorkItems.ts` and `DependencyPicker.tsx` — undocumented
2. Direct store imports in route files (architecture violation)
3. Traceability enforcer scope gap (systemic — process issue not code issue)

#### Grading Reference (from inspector.config.yml)
- **Grade A**: 0 P1, ≤3 P2, spec coverage ≥80%
- **Grade B**: 0 P1, ≤8 P2, spec coverage ≥60%
- **Grade C**: ≤2 P1, ≤15 P2, spec coverage ≥40%
- **Grade D**: anything worse
- **This audit**: 2 P1 → Grade D
