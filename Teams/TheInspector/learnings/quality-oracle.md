# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-08-13 (Full Audit, Grade: B)

### Architecture Map

This repo has **two separate apps**, not one:

| App | Location | Stack | Spec | Active Plans |
|-----|----------|-------|------|--------------|
| Self-Judging Workflow Engine | `Source/` | Express + TypeScript + in-memory store | `Specifications/workflow-engine.md` | `Plans/self-judging-workflow/`, `Plans/dependency-linking/` |
| Dev Workflow Platform | `portal/` | Express + SQLite + React | `Specifications/dev-workflow-platform.md` | `Plans/dev-workflow-platform/`, `Plans/orchestrated-dev-cycles/`, etc. |

Never conflate the two. Traceability checks for `Source/` must target `Plans/self-judging-workflow/requirements.md` (and `Plans/dependency-linking/requirements.md`). The dev-workflow-platform requirements target `portal/`.

---

### Spec Coverage (Source/ only)

- **Active plan (self-judging-workflow):** 13/13 FRs traced → **100%**
- **Dependency-linking plan:** Most FRs implemented. Known gaps: `FR-dependency-search` (not wired in app.ts), `FR-dependency-seed` (no seed.ts).
- **Other plans (image-upload, dup-status, dev-cycle-traceability, orchestrated-dev-cycles, orchestrator-cycle-dashboard, dev-workflow-platform):** These target `portal/` not `Source/`. Running enforcer against them with `Source/` as target yields false failures.

---

### Key File Paths for Fast Future Audits

| What | Path |
|------|------|
| Backend production source | `Source/Backend/src/` |
| Backend test suite | `Source/Backend/tests/` |
| Frontend production source | `Source/Frontend/src/` |
| Frontend test suite | `Source/Frontend/tests/` |
| Shared types | `Source/Shared/types/workflow.ts` |
| In-memory store | `Source/Backend/src/store/workItemStore.ts` |
| Metrics definitions | `Source/Backend/src/metrics.ts` |
| App wiring (routes) | `Source/Backend/src/app.ts` |
| Logger canonical | `Source/Backend/src/utils/logger.ts` |
| Logger shim | `Source/Backend/src/logger.ts` |
| Active requirements | `Plans/self-judging-workflow/requirements.md` |
| Dependency requirements | `Plans/dependency-linking/requirements.md` |

---

### Common Pattern Violations Found

1. **Logger missing dev/prod branching** — `utils/logger.ts` always emits JSON. Add NODE_ENV guard.
2. **eslint-disable without explanation** — `useWorkItems.ts:63`, `DependencyPicker.tsx:82`. Document WHY.
3. **Duplicate test files** — WorkItemDetailPage and WorkItemListPage each have two test files: one in `tests/` and one in `tests/pages/`. Consolidate.
4. **getAllItems() called 3x in one dashboard request** — `services/dashboard.ts` should call once and reuse.
5. **Two logger files** — shim anti-pattern from multi-agent coordination. Should be unified.

---

### Known Open Gaps (as of 2026-08-13)

| Gap | Location | Notes |
|-----|----------|-------|
| `GET /api/search` not wired | `Source/Backend/src/app.ts` | Test file documents this intentionally; tests will fail |
| No seed.ts | `Source/Backend/src/` | FR-dependency-seed |
| Logger no dev pretty-print | `Source/Backend/src/utils/logger.ts` | CLAUDE.md arch rule |
| Enforcer checks only one plan | `tools/traceability-enforcer.py` | Needs --all flag |

---

### Traceability Enforcer Usage Notes

- Default (no args): checks most recently modified `Plans/*/requirements.md` — currently `self-judging-workflow/requirements.md`
- To check all plans: run manually for each: `python3 tools/traceability-enforcer.py --file Plans/<name>/requirements.md`
- Plans targeting `portal/` will "fail" if scanned against `Source/` only — this is expected, not a bug
- The enforcer regex matches `FR-[A-Z0-9-]+` broadly, which picks up template FRs like `FR-XXX` in example rows; filter these from count

---

### Spec Trend

- First audit baseline. Spec coverage for active plan is excellent (100%). Gap is in breadth — other plans not enforced.
