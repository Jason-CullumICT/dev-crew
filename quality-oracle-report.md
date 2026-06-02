---

## Quality Oracle Findings — 2026-06-02

**Grade: C** (1 P1 · 5 P2 · 3 P3 · 2 P4)

### Spec Coverage

| Spec | FRs | Covered | % |
|------|-----|---------|---|
| `workflow-engine.md` (FR-WF-*) | 13 | 13 | **100%** |
| `dev-workflow-platform.md` (FR-001..032) | 34 | 34 | **100%** |
| `tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 9 | **90%** |
| **Aggregate** | **57** | **56** | **98%** |

---

### QO-001 · P1 · spec-drift — Traceability Enforcer Blind to Portal App
`tools/traceability-enforcer.py` hardcodes scan dirs to `["Source", "E2E"]`. The dev-workflow-platform app lives in `portal/`. Running the enforcer against `Plans/dev-workflow-platform/requirements.md` reports all 34 FRs as MISSING — a 100% false-negative rate. Any CI gate using this tool will silently pass on portal regressions. The default invocation resolves to the most recently modified plan (self-judging-workflow) and only checks FR-WF-* IDs, completely skipping the portal's 100+ FRs.

**Fix:** Add `"portal"` to the `source_dirs` list at line 70.

---

### QO-002 · P2 · spec-drift — FR-TMP-008 Untraced
`platform/Dockerfile.worker` correctly installs `gh` CLI (line 32) and Playwright (lines 39-40) as required by FR-TMP-008, but has no `# Verifies: FR-TMP-008` comment. It's the only tiered-merge-pipeline requirement without a traceability link.

### QO-003 · P2 · architecture-violation — Direct DB in teamDispatches Route
`portal/Backend/src/routes/teamDispatches.ts` calls `db.prepare()` directly in `router.get` and `router.post`. Every other portal route delegates to a service class. Violates the non-negotiable **"No direct DB calls from route handlers"** rule.

### QO-004 · P2 · untested — teamDispatches.ts is Completely Untraced
Zero `// Verifies:` comments. No matching FR in any spec or plan file. Also defines `interface TeamDispatch` inline instead of in `portal/Shared/types.ts`. Represents untracked scope creep.

### QO-005 · P2 · untested — Missing Required Dependency UI Test Files
`FR-dependency-frontend-tests` requires `DependencySection.test.tsx` and `BlockedBadge.test.tsx` in `portal/Frontend/tests/`. Neither exists. The 226-line `DependencySection` and 70-line `BlockedBadge` components have zero dedicated test coverage.

### QO-006 · P2 · spec-drift — Wrong FR ID on Dependency Components
`BlockedBadge.tsx` and `DependencySection.tsx` both carry `// Verifies: FR-0001` — an ID that doesn't exist in any spec or plan. Correct IDs are `FR-dependency-blocked-badge` and `FR-dependency-section`. The enforcer counts a ghost requirement as covered while the real ones appear absent.

---

### QO-007 · P3 — 212× console.log in platform/orchestrator (architecture rule violation)
### QO-008 · P3 · doc-stale — Canonical Spec Missing ~60 Implemented FRs (FR-070+ not in Specifications/)
### QO-009 · P3 — Source/Backend/src/routes/workflow.ts calls store directly in 13 route handlers (no workflowService.ts)

---

### QO-010 · P4 — 4 disabled ESLint rules without justification comments
### QO-011 · P4 — 6 files exceed 500-line threshold (largest: pipelines.test.ts at 1,010 lines)

---

**Escalations:** No security findings. QO-003/004/005/006 and QO-001 routed to **TheFixer**. QO-008 routed to **requirements-reviewer** to backfill the canonical spec.

Report saved: `Teams/TheInspector/findings/quality-oracle-2026-06-02.md`
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
