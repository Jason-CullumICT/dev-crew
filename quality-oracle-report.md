## Quality Oracle Findings — 2026-10-03

**Overall Grade: C** (1×P1, 3×P2, 3×P3, 1×P4)

---

### Spec Coverage: 8.3% enforced / ~85% actual

The traceability enforcer only scans `Source/` and `E2E/`, covering 13 of ~156 total specified requirements. The portal/ codebase (the primary implementation of `dev-workflow-platform.md`) has 277+ `// Verifies:` annotations but is completely invisible to the enforcer.

---

### QO-001 · P1 — Enforcer Scans Wrong Directory
`tools/traceability-enforcer.py:69-70` hardcodes `source_dirs = ["Source", "E2E"]`. All FR-001—089 requirements live in `portal/`, not `Source/`. Running the enforcer against any portal plan reports 100% failure (all requirements missing) even though the code is well-annotated. The verification gate that CLAUDE.md calls required only validates 8% of total requirements.

**Fix:** Add `portal/` and `platform/` to the scan dirs, or (better) make the enforcer read `source.dirs` from `inspector.config.yml`.

---

### QO-002 · P2 — FR-070 ID Collision
`Plans/image-upload/requirements.md` and `Plans/orchestrator-cycle-dashboard/requirements.md` both define FR-070 as completely different requirements (ImageAttachment type vs. OrchestratorCyclesPage). Any `// Verifies: FR-070` comment is now ambiguous. This breaks single-source-of-truth for requirement IDs.

---

### QO-003 · P2 — Ghost FRs (FR-090—095) — Code Written Before Spec
`portal/Frontend/src/components/orchestrator/types.ts` and `RunsTab.tsx` reference FR-090, FR-091, FR-093—095 which appear in **no specification or plan**. This violates the core project mandate: *"If the spec doesn't cover it, write the spec first."*

---

### QO-004 · P2 — Recently-Modified Files With Zero Traceability
- `portal/Backend/src/routes/teamDispatches.ts` (85 lines, 0 `Verifies:` comments)
- `portal/Frontend/src/pages/TeamsPage.tsx` (406 lines, 0 `Verifies:` comments)

Both modified within 14 days, both completely unlinked to any specification.

---

### QO-005 · P3 — Large Service Files
`portal/Backend/src/services/cycleService.ts` (526 lines) and `featureRequestService.ts` (506 lines) exceed the 500-line threshold. Mixed responsibilities suggest decomposition opportunities.

---

### QO-006 · P3 — eslint-disable Without Explanatory Comments
Three recently-modified files suppress `react-hooks/exhaustive-deps` without explaining why the omission is intentional. CLAUDE.md prohibits disabled linting rules; where necessary, a rationale comment is required.

---

### QO-008 · P3 — Enforcer Ignores inspector.config.yml
The enforcer hardcodes its behavior independent of the inspector config, creating configuration duplication with no effect. Updating `inspector.config.yml` does not change enforcer behavior.

---

**Findings written to:** `Teams/TheInspector/findings/quality-oracle-2026-10-03.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
