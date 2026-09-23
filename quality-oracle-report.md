## Quality Oracle Findings — 2026-09-23

**Grade: C** | Active plan coverage: 100% | Cross-plan coverage: ~30%

---

### Spec Coverage

| Plan | FRs | Covered | Status |
|------|-----|---------|--------|
| self-judging-workflow | 13 | 13 | ✅ PASS |
| dependency-linking | 7 | 0 | ❌ FAIL (stale FR IDs) |
| dev-workflow-platform | 34 | 0 | ❌ FAIL (never built) |

---

### Findings (8 total)

**P1 — 2 findings**

**QO-001 · `tools/traceability-enforcer.py`** — *Traceability enforcer only gates the most-recently-modified plan.* The default (no `--plan`) picks the latest-mtime `requirements.md`, currently `self-judging-workflow`. Running `python3 tools/traceability-enforcer.py` as defined in CLAUDE.md shows PASS while two other plans silently fail (34 + 7 missing FRs). Any agent following the gate believes traceability is clean when it is not. **Fix:** Either run the gate against all plans explicitly, or add `--plan self-judging-workflow` to CLAUDE.md and document scope.

**QO-002 · `Specifications/dev-workflow-platform.md`** — *FR-001 through FR-032 entirely unimplemented.* The dev-workflow-platform spec (69 FRs — feature requests, bug reports, dev cycles, SQLite backend, full React UI) was approved in plan run-1774234977 but was never dispatched to a coder team. The current `Source/` implements a completely different domain (self-judging workflow engine). Git history has only one commit. **Fix:** Decision required — archive the spec as superseded (move to `Specifications/archived/`) or dispatch an implementation team.

---

**P2 — 2 findings**

**QO-003 · `Plans/dependency-linking/requirements.md`** — Stale FR IDs (FR-0002, FR-0003, FR-070, FR-085, etc.) reference a `portal/` codebase that no longer exists in Source/. The dependency feature was implemented under `FR-dependency-*` IDs. The plan requirements were never updated, so running the enforcer against this plan always fails.

**QO-004 · `Source/Frontend/src/api/client.ts:26`** — `.catch(() => ({}))` silently swallows JSON parse errors on non-2xx responses (e.g., HTML 502 from a proxy). Violates the "never swallow errors silently" architecture rule. **Fix:** Add a suppression rationale comment, or log at debug level.

---

**P3 — 4 findings**

**QO-005** — Duplicate logger: `src/logger.ts` is an undocumented wrapper around `src/utils/logger.ts`. Risk of divergence; confuses agents.

**QO-006** — `useWorkItems.ts:63` has `eslint-disable-next-line react-hooks/exhaustive-deps` with no rationale comment.

**QO-007** — 5 frontend components have no test file: `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx`.

**QO-008** — `Source/Backend/src/routes/workflow.ts` — all 7 catch blocks return `res.status(500)` directly, bypassing the centralized Express error handler. Should call `next(err)` instead.

---

**Findings report saved to:** `Teams/TheInspector/findings/quality-oracle-2026-09-23.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
