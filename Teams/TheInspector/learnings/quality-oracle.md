# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-10-28

### Spec Coverage Trend
- First baseline run. Overall ~88% coverage across all spec documents.
- `Specifications/workflow-engine.md` + its plan: 100% traced (enforcer confirms this).
- `Specifications/dev-workflow-platform.md`: ~96% traced in `portal/` — 3 FR-dependency items still open.
- `Specifications/tiered-merge-pipeline.md`: **0%** — no implementation, no traceability comments anywhere.

### Key Discoveries

**Two-app architecture:**
- `Source/` implements the **Self-Judging Workflow Engine** (FR-WF-001–013, in-memory store, Express backend + React frontend at localhost:3001/5173).
- `portal/` implements the **Dev Workflow Platform** (FR-001–069, SQLite-backed, Express + React at localhost:3001/4200). These are DIFFERENT apps.
- The enforcer only scans `Source/`, so portal/ is completely invisible to it.

**Enforcer behavior:**
- `tools/traceability-enforcer.py` auto-picks the *most recently modified* `requirements.md` in `Plans/`. Currently targets `Plans/self-judging-workflow/requirements.md` (13 items).
- It searches `Source/` and `E2E/` only — never `portal/`.
- Fix: add `portal/` to `source.dirs` in `inspector.config.yml` AND add the dev-workflow-platform spec as a second scan target.

**Known open items (portal/) — verified in Plans/dependency-linking/requirements.md:**
- `FR-dependency-seed`: `portal/Backend/src/database/seed.ts` does not exist.
- `FR-dependency-api-types`: `UpdateBugInput`/`UpdateFeatureRequestInput` lack `blocked_by`; `DependencyPicker.tsx` lines 291/293 use `as any` workaround.
- `FR-dependency-frontend-tests`: `portal/Frontend/tests/DependencySection.test.tsx` and `BlockedBadge.test.tsx` do not exist (only `DependencyPicker.test.tsx` exists).

**Architecture violation pattern:**
- In `Source/`, route handlers (`workItems.ts`, `workflow.ts`, `intake.ts`) import store directly — bypasses service layer rule.
- In `portal/`, architecture is correct: routes call services which call the DB.

**Non-canonical FR IDs in portal tests:**
- `portal/Backend/tests/dependencies.test.ts` uses `FR-dependency-cycle-detection`, `FR-dependency-linking`, `FR-dependency-ready-check` — not spec-canonical. Map these to:
  - `FR-dependency-cycle-detection` → `FR-dependency-service`
  - `FR-dependency-linking` → `FR-dependency-service`
  - `FR-dependency-ready-check` → `FR-dependency-endpoints`

**Duplicate frontend test files:**
- `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` — both cover FR-WF-011. Merge into the `pages/` location.

### Useful File Paths for Future Audits
- Main spec (portal): `Specifications/dev-workflow-platform.md` — FR-001 to FR-069 + FR-dependency-*
- Workflow engine spec: `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` — FR-WF-001 to FR-WF-013
- Pipeline spec (deferred/unimplemented): `Specifications/tiered-merge-pipeline.md` — FR-TMP-001 to FR-TMP-010
- Enforcer: `tools/traceability-enforcer.py` — run with `--file Specifications/dev-workflow-platform.md` to target main spec
- Portal backend: `portal/Backend/src/` — services, routes, database
- Portal frontend: `portal/Frontend/src/` and `portal/Frontend/tests/`
- Source backend: `Source/Backend/src/` — in-memory store engine
- Shared types (Source): `Source/Shared/types/workflow.ts`
- Shared types (portal): `portal/Shared/` (types.ts, api.ts)
