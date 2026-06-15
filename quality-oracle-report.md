---

## Quality Oracle Findings

### Spec Coverage: Mixed

| Spec | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| Self-judging workflow (`FR-WF-*`) | 13 | 13 | **100%** |
| Dependency-linking (`FR-dependency-*`) | 16 | 13 | **81%** |
| Dev workflow platform (`FR-001…069`) | 69 | 69 | **100%** ⚠️ (enforcer blind spot) |
| Tiered merge pipeline (`FR-TMP-*`) | 10 | 0 | **0%** (platform layer, not in Source/portal) |

---

### Grade: **C**

_(1 P1 disqualifies A/B — max_p1 must be 0 for grade B)_

---

### QO-001 · P1 · Traceability Enforcer Blind Spot
**File:** `tools/traceability-enforcer.py:71`

The enforcer scans only `Source/` and `E2E/`. The primary production application lives in `portal/` (FR-001…FR-069). Two failure modes:
1. **False failure** — running against `Plans/dev-workflow-platform/requirements.md` reports 34 "MISSING" even though all 34 are correctly traced in `portal/`.
2. **False pass** — default invocation always picks `Plans/self-judging-workflow/requirements.md` and passes, masking any regression in `portal/`.

**Fix:** Add `portal/` to the scan list at line 71: `source_dirs = ["Source", "E2E", "portal"]`

---

### QO-002 · P2 · Direct SQL in Route Handler
**File:** `portal/Backend/src/routes/teamDispatches.ts:37-44, 72-75`

Architecture rule: *No direct DB calls from route handlers.* This file runs raw `db.prepare(...).all()`/`.run()` SQL inline in both GET and POST handlers with no service layer. It is also the only portal route with zero `// Verifies:` traceability comments.

---

### QO-003 · P2 · `inspector.config.yml` Missing `portal/`
**File:** `Teams/TheInspector/inspector.config.yml:42`

`source.dirs` lists only `Source/`. Every inspector specialist scopes to the workflow engine and ignores the portal app entirely. `specs.implementation_dir: "Specifications/Implementation/"` also references a non-existent directory.

---

### QO-004 · P2 · Traceability ID Mismatch
**File:** `portal/Backend/src/routes/search.ts:1,15`

Uses `// Verifies: FR-dependency-linking` — not a real requirement ID. The correct ID is `FR-dependency-search`. The enforcer would flag `FR-dependency-search` as unimplemented.

---

### QO-006 · P2 · Untraced Unspecced Production Files
Three recently-modified files have zero `// Verifies:` comments and **no corresponding spec requirement**:
- `portal/Frontend/src/pages/TeamsPage.tsx` (406 lines) — unspecced feature
- `portal/Frontend/src/components/common/RepoSelector.tsx` (92 lines)
- `portal/Backend/src/routes/teamDispatches.ts` (85 lines)

`TeamsPage.tsx` in particular is scope creep — there is no FR in `dev-workflow-platform.md` covering a Teams UI page.

---

### QO-005, QO-007, QO-008 · P3 · Pattern Issues
- **Enforcer false positives** — regex `FR-[A-Z0-9-]+` picks up seed data IDs (`FR-0002`, etc.) and template placeholders (`FR-XXX`) as requirement IDs
- **Large files** — `cycleService.ts` (526 lines), `featureRequestService.ts` (506 lines) exceed the 500-line threshold
- **eslint-disable suppressions** — 3 `react-hooks/exhaustive-deps` suppressions in useEffect hooks without explanatory comments

---

### QO-009, QO-010 · P4 · Minor Issues
- `FR-TMP-001…010` (tiered merge pipeline spec) untraced anywhere — likely platform-layer but not scoped out in config
- `portal/Backend/src/lib/tracing.ts:36` — silent OTel init failure swallowed with no warning log (intent documented but no signal to operators)

---

**Findings report saved to:** `Teams/TheInspector/findings/audit-2026-06-15-C.md`
**Learnings updated at:** `Teams/TheInspector/learnings/quality-oracle.md`
