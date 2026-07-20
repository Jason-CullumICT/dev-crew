# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run — 2026-07-20

### Spec Coverage

| Source | Total FRs | Covered in Source | Coverage |
|--------|-----------|-------------------|----------|
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001–013) | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` | 74 (FR-001–FR-069) | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-001–010) | 0 | **0%** |
| **Total Specifications/** | **84** | **0** | **0%** |
| **Total all (Plans + Specs)** | **97** | **13** | **13.4%** |

**Trend:** First audit baseline. Plans-backed coverage is excellent (100%). Specifications/-backed coverage is critically low (0%) — driven by spec/implementation mismatch (see QO-001, QO-003).

---

### Common Pattern Violations Found

1. **Business logic in route handlers** — `workflow.ts` approve/reject handlers mutate state and push to `changeHistory` inline. Extract to service layer.
2. **Direct store imports in routes** — `intake.ts`, `workItems.ts`, `workflow.ts` all import `store/workItemStore` directly. Only `dashboard.ts` correctly goes through a service.
3. **eslint-disable without rationale** — `react-hooks/exhaustive-deps` suppressed in `DependencyPicker.tsx` and `useWorkItems.ts` without explanation.
4. **Silently swallowed JSON error** — `api/client.ts` `.catch(() => ({}))` violates CLAUDE.md's "never swallow errors silently" rule.
5. **Duplicate test files** — WorkItemDetailPage and WorkItemListPage each have two test files (flat and `pages/` subdirectory). The `pages/` variants are more complete.

---

### Key File Paths for Faster Future Audits

- **Enforcer script:** `tools/traceability-enforcer.py` — only scans `Plans/`, NOT `Specifications/`
- **Active requirements:** `Plans/self-judging-workflow/requirements.md` (13 FR-WF-XXX)
- **Domain specs with zero source coverage:**
  - `Specifications/dev-workflow-platform.md` (74 FRs — different product than built)
  - `Specifications/tiered-merge-pipeline.md` (10 FR-TMP-XXX)
- **Architecture violations:** `Source/Backend/src/routes/workflow.ts` (approve/reject business logic inline)
- **Duplicate tests:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Known failing test:** `Source/Backend/tests/routes/search.test.ts` (search route not wired in app.ts)
- **Unimplemented route:** `GET /api/search` — test exists, route file does not

---

### Open Questions for Next Run

1. Was `Specifications/dev-workflow-platform.md` intentionally superseded by `Specifications/workflow-engine.md`? If yes, it should be archived or clearly marked obsolete.
2. Is `Specifications/tiered-merge-pipeline.md` in-scope for the current implementation sprint?
3. Should the traceability enforcer be extended to scan `Specifications/` directory? (High value — currently the primary enforcement gap.)
