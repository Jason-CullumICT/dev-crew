# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-04-30 — Grade C

### Spec Coverage Trend
- First run: baseline established
- Source/ workflow engine (FR-WF-*): 100% covered (13/13)
- Source/ dependency tracking (FR-dependency-*): 93% covered (14/15) — missing: FR-dependency-search
- portal/ application: UNKNOWN — enforcer never scans this directory

### Critical Structural Gaps Found

#### 1. Two-app architecture: `Source/` vs `portal/`
This repo has TWO distinct applications:
- `Source/` — Self-Judging Workflow Engine (FR-WF-001–013, FR-dependency-*)
- `portal/` — Dev-Workflow-Platform portal (FR-001 to FR-095+, FR-DUP-*)

The traceability enforcer hardcodes `["Source", "E2E"]` scan dirs and never touches `portal/`. There are **1,041** `// Verifies:` comments in `portal/` that are completely invisible to the enforcement gate. The config in `inspector.config.yml` must list both `source.dirs`:
```yaml
source:
  dirs:
    - "Source/"
    - "portal/"        # ← MISSING — causes false-green on dev-workflow-platform FRs
```

#### 2. Enforcer selects wrong plan when all have same mtime
All 8 `Plans/*/requirements.md` files have identical modification timestamps. The enforcer uses `max(files, key=os.path.getmtime)` which is non-deterministic on same-mtime files. Currently selects `self-judging-workflow` (FR-WF-*). To verify all plans, invoke with explicit `--plan` or `--file` flags per plan in CI.

#### 3. FR-dependency-search endpoint missing
`GET /api/search` is tested in `Source/Backend/tests/routes/search.test.ts` with an explicit "intentionally failing" comment. The route is never mounted in `app.ts`. Frontend `client.ts:101` calls this endpoint in `searchItems()` — the DependencyPicker will fail at runtime.

#### 4. pending_dependencies status drift
`FR-dependency-types` and `FR-dependency-dispatch-gating` specify a `pending_dependencies` status value in `WorkItemStatus`. It was never added to the enum. The implementation returns HTTP 400 on dispatch-with-blockers instead of setting this status. The `BlockedBadge` amber path is dead code.

#### 5. Route handlers bypass service layer
`Source/Backend/src/routes/workItems.ts` and `workflow.ts` both import and call `* as store` directly. CLAUDE.md prohibits direct DB/store calls from route handlers. The missing service layer is also why FR-dependency-search has nowhere natural to land.

### Useful File Paths for Future Audits

| Purpose | Path |
|---------|------|
| Backend entry point | `Source/Backend/src/app.ts` |
| All Prometheus metrics | `Source/Backend/src/metrics.ts` |
| Status enum + transitions | `Source/Shared/types/workflow.ts` |
| Dependency service | `Source/Backend/src/services/dependency.ts` |
| Intentionally failing search test | `Source/Backend/tests/routes/search.test.ts` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Inspector config | `Teams/TheInspector/inspector.config.yml` |
| Portal app root | `portal/` (Backend/, Frontend/, Shared/) |

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` used without comment: `DependencyPicker.tsx:82`, `useWorkItems.ts:63`
- Silent `.catch(() => ({}))` in `Source/Frontend/src/api/client.ts:26`
- Non-standard `// Verifies: dev-crew debug portal` in `DebugPortalPage.tsx` (no FR-XXX)

### Architectural Insight: Spec Layering
- `Specifications/*.md` = canonical domain truth (no FR-XXX in `workflow-engine.md`)
- `Plans/*/requirements.md` = implementation-scope FRs (derived from specs)
- The enforcer targets Plans, not Specifications directly
- `Specifications/tiered-merge-pipeline.md` FR-TMP-001–010 live in `platform/` (orchestrator infrastructure), not `Source/` or `portal/` — 0% in the enforcer's scan dirs is expected for this spec
