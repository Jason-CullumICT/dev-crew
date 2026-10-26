# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-10-26

### Architecture

- **Two distinct applications** live in this repo:
  1. `Source/` + `Source/Shared/` — self-judging workflow engine (FR-WF-* requirements from `Plans/self-judging-workflow/requirements.md`)
  2. `portal/` + `portal/Shared/` — development workflow platform (FR-001–FR-095 from `Specifications/dev-workflow-platform.md` and Plans)
  These are NOT duplicates; they serve different domains. Each has its own Shared types dir.

- **Traceability enforcer gap**: `tools/traceability-enforcer.py` only scans `Source/` and `E2E/`; it never looks at `portal/`. All portal traceability is manually maintained and is NOT validated by the gate. The enforcer also only reads the most-recently-modified `Plans/*/requirements.md`, not `Specifications/` directly.

- **FR numbering schemes**:
  - `FR-WF-*` → self-judging workflow engine (Source/)
  - `FR-001 – FR-069` → dev-workflow-platform spec (portal/)
  - `FR-070 – FR-095` → image-upload, duplicate-deprecated, orchestrator features (portal/) — defined in Plans/, NOT in Specifications/
  - `FR-TMP-001 – FR-TMP-010` → tiered-merge-pipeline.md (UNIMPLEMENTED — no code references found anywhere)
  - `FR-dependency-*` → dependency-linking (portal/)
  - `FR-DUP-*` → duplicate/deprecated status (portal/)

### Key File Paths

- Specs: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- Plans requirements: `Plans/self-judging-workflow/requirements.md`, `Plans/image-upload/requirements.md`
- Portal shared types: `portal/Shared/types.ts`, `portal/Shared/api.ts`
- Source shared types: `Source/Shared/types/workflow.ts`
- Traceability enforcer: `tools/traceability-enforcer.py`

### Recurring Patterns to Watch

- `portal/Backend/src/routes/teamDispatches.ts` — bypasses service layer with raw SQL; no Verifies comment; inline interface
- `.catch(() => {})` empty silencers in `BugDetail.tsx`, `FeatureRequestDetail.tsx`, `RepoSelector.tsx`
- Plans add FR-070+ without corresponding Specifications updates (spec-first discipline gap)
- `eslint-disable-next-line react-hooks/exhaustive-deps` in `DependencyPicker.tsx`, `useWorkItems.ts`, `useApi.ts`

### Spec Coverage Trend

| Spec | Requirements | Enforcer Checks | Actual Code Coverage |
|------|-------------|-----------------|---------------------|
| workflow-engine (FR-WF-*) | 13 | ✅ Yes (Source/) | 100% |
| dev-workflow-platform (FR-001–FR-069) | ~85 | ❌ No | Appears complete in portal/ |
| tiered-merge-pipeline (FR-TMP-*) | 10 | ❌ No | **0% — fully unimplemented** |
| image-upload (FR-070–FR-079) | ~26 | ❌ No | Appears complete in portal/ |
