---

## Quality Oracle Findings — 2026-04-27

**Grade: C** | Full report: `Teams/TheInspector/findings/audit-2026-04-27-C.md`

---

### Spec Coverage

| Scope | Requirements | Traced | % |
|---|---|---|---|
| Active plan (FR-WF-*) | 13 | 13 | **100%** ✅ |
| FR-dependency-* | 16 | 15 | **94%** ⚠️ |
| `dev-workflow-platform.md` FR-001–FR-069 | 69 | 0 | **0%** ❌ |
| `tiered-merge-pipeline.md` FR-TMP-* | 10 | 0 | **0%** ❌ |
| **Active implementation scope** | **29** | **28** | **97%** |
| **Full Specifications/ directory** | **124** | **28** | **23%** |

---

### P1 Findings

**QO-001 — `GET /api/search` not wired up (FR-dependency-search)**
- The route exists in the test contract (`search.test.ts`, 5 test cases) but is absent from `app.ts`
- The test file itself documents this explicitly: "tests will FAIL until the route is implemented"
- In production, the `DependencyPicker` typeahead 404s on every keystroke
- **Fix:** Add `/api/search` route to `app.ts`; the store's `findAll()` with text filter on `title`/`description` is the implementation

**QO-002 — `Specifications/` describes a completely different system than `Source/`**
- `dev-workflow-platform.md` (FR-001–FR-069): feature requests, bug tracking, development cycles, pipeline runs — none implemented
- `tiered-merge-pipeline.md` (FR-TMP-001–FR-TMP-010): E2E generation, auto-PR, AI review — none implemented
- `Source/` implements the *workflow engine* from `workflow-engine.md` + `Plans/self-judging-workflow/`
- The traceability enforcer **only checks Plans/** so it passes — creating a false-green on Specifications/ coverage
- **Fix:** Add status headers to unimplemented specs (e.g., `Status: PLANNED`) or move them out of `Specifications/`

---

### P2 Findings

| ID | Title |
|---|---|
| QO-003 | FR-070–FR-085 in `api-contracts.md` have no canonical spec anywhere |
| QO-004 | `dependencyCheckDuration` histogram missing from `metrics.ts` (FR-dependency-metrics is 75% implemented) |
| QO-005 | `pending_dependencies` not in `WorkItemStatus` enum — dispatch gating returns 400 instead of transitioning items |
| QO-006 | 4 duplicate frontend test files: `WorkItemDetailPage` and `WorkItemListPage` each exist in `tests/` *and* `tests/pages/` |
| QO-007 | `Source/E2E/tests/` directory does not exist — Playwright config points to void |

---

### P3 Findings

| ID | Title |
|---|---|
| QO-008 | Logger always emits JSON — no dev mode pretty-print (violates FR-003) |
| QO-009 | Two logger modules (`src/logger.ts` wrapper + `src/utils/logger.ts`) with different call conventions |
| QO-010 | FR-dependency-seed not implemented — no seed data script exists |

---

### P4 Findings

| ID | Title |
|---|---|
| QO-011 | 2 `// eslint-disable-next-line react-hooks/exhaustive-deps` with no explanation comment |
| QO-012 | `DebugPortalPage.tsx` has `// Verifies: dev-crew debug portal` — not a valid FR-XXX reference |

---

### Architecture Compliance

✅ No `console.log` in production source  
✅ All routes use service/store layer (no direct store calls from handlers skipped)  
✅ All list endpoints return `{data: T[]}` wrappers  
✅ No hardcoded secrets  
✅ No silent error swallowing  
⚠️ `pending_dependencies` status specified but missing from enum  
⚠️ `dependencyCheckDuration` metric specified but missing from implementation  
⚠️ Logger missing dev-mode pretty-print  

Learnings written to `Teams/TheInspector/learnings/quality-oracle.md`.
