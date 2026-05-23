# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-23 — Full Audit (Grade B)

### Architecture Overview (Critical for Future Audits)

This project has **three separate codebases** — not one:

| Codebase | Spec | Implements | Traceability IDs |
|----------|------|------------|-----------------|
| `Source/` | `Specifications/workflow-engine.md` | Self-Judging Workflow Engine (WorkItems, router, assessment pod, dependency tracking) | `FR-WF-001` – `FR-WF-013`, `FR-dependency-*` |
| `portal/` | `Specifications/dev-workflow-platform.md` | Dev Workflow Platform (FeatureRequests, BugReports, Cycles, Pipeline) | `FR-001` – `FR-069`, `FR-dependency-*` |
| `platform/orchestrator/` | `Specifications/tiered-merge-pipeline.md` | Orchestrator pipeline, auto-merge, E2E runner | `FR-TMP-001` – `FR-TMP-010` |

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/` — it is **blind to portal/ and platform/**. Always run three enforcer passes to get full coverage.

### Open P1 Findings (Re-verify Next Run)

1. **QO-001 (OPEN)** — `tools/traceability-enforcer.py` does not scan `portal/` or `platform/`. Fix: extend source_dirs.
2. **QO-002 (OPEN)** — `Source/Shared/types/workflow.ts`: `WorkItemStatus` enum has NO `pending_dependencies` member. The `FR-dependency-dispatch-gating` spec requires status transition to pending_dependencies when blockers exist; dispatch endpoint returns 400 instead. The `// Verifies: FR-dependency-dispatch-gating` comment on `VALID_STATUS_TRANSITIONS` is a false claim.

### Open P2 Findings (Re-verify Next Run)

3. **QO-003 (OPEN)** — `Source/Backend/src/metrics.ts` missing `dependencyCheckDuration` Histogram (3/4 FR-dependency-metrics implemented). Portal correctly has it in `portal/Backend/src/metrics.ts`.
4. **QO-004 (OPEN)** — `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293` uses `as any` cast because `UpdateBugInput`/`UpdateFeatureRequestInput` in `portal/Shared/api.ts` lack `blocked_by?: string[]`.
5. **QO-005 (OPEN)** — No `seed.ts` in `portal/Backend/src/database/`. FR-dependency-seed requires idempotent seeding of 8 dependency relationships on startup.
6. **QO-006 (OPEN)** — Duplicate test files: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368L) and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393L) have diverged. Same for WorkItemListPage.test.tsx (286L vs 262L). Canonical unclear.
7. **QO-007 (OPEN)** — Enforcer regex `FR-[A-Z0-9-]+` false-matches seed data item IDs (FR-0002, FR-0004, etc.) and spec cross-references (FR-070, FR-085) when scanning dependency-linking requirements.md.

### Useful File Paths

- **Source traceability IDs**: All in `Source/Backend/src/` and `Source/Frontend/src/` — FR-WF-* and FR-dependency-*
- **Portal traceability IDs**: `portal/Backend/src/` and `portal/Frontend/src/` — FR-001 to FR-069
- **Platform traceability**: `platform/orchestrator/lib/workflow-engine.js` and `dispatch.js` — FR-TMP-*
- **Spec coverage tool**: `tools/traceability-enforcer.py` — run with `--file` flag against each plan's requirements.md
- **Plans with requirements.md**: self-judging-workflow, dev-workflow-platform, dependency-linking, orchestrated-dev-cycles, image-upload, duplicate-deprecated-status, orchestrator-cycle-dashboard
- **Portal api types**: `portal/Shared/api.ts` (UpdateBugInput, UpdateFeatureRequestInput)
- **Portal database**: `portal/Backend/src/database/schema.ts` (tables), missing `seed.ts`
- **Source metrics**: `Source/Backend/src/metrics.ts` — missing `dependencyCheckDuration`
- **Portal metrics**: `portal/Backend/src/metrics.ts` — has all 4 FR-dependency-metrics

### Spec Coverage Trend

- 2026-05-23 (first run): B grade. 2 P1s (structural/gap issues), 5 P2s (incomplete implementation). No runtime exploits found. Architecture compliance strong.

### Common Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` appears in DependencyPicker.tsx and useWorkItems.ts — monitor for growth
- Traceability IDs in comments sometimes appear with trailing comma (e.g., `// Verifies: FR-WF-002,`) — harmless but inconsistent
