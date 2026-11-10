# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit History

| Date | Grade | P1 | P2 | P3 | Spec Coverage |
|------|-------|----|----|----|---------------|
| 2026-11-10 | D | 3 | 2 | 3 | 0% (domain specs) / 100% (self-judging-workflow plan) |

---

## Key Discoveries

### Two-Level Traceability (Plans vs Specifications)
This project has two layers of requirements documents:
1. **`Specifications/`** — domain-level specs (technology-agnostic). Three files currently:
   - `workflow-engine.md` — the actual implemented product spec (no FR-NNN IDs; uses prose)
   - `dev-workflow-platform.md` — a full dev platform spec with 69 FRs (FR-001–FR-069); **NOT implemented**
   - `tiered-merge-pipeline.md` — merge pipeline spec with 10 FRs (FR-TMP-*); **NOT implemented**
2. **`Plans/`** — implementation plans with `requirements.md` files using FR-* IDs

The traceability enforcer ONLY scans Plans/, never Specifications/. Running it against Specifications/ reveals 100% failure on the two unimplemented specs.

### FR ID Scheme Fragmentation
The codebase uses multiple FR ID naming schemes:
- `FR-WF-*` (e.g., FR-WF-001) — self-judging-workflow plan, uppercase, enforcer can find these
- `FR-dependency-*` (lowercase) — dependency-linking plan, **enforcer regex cannot match these**
- `FR-NNN` (e.g., FR-001 through FR-069) — dev-workflow-platform.md, NOT implemented
- `FR-TMP-*` — tiered-merge-pipeline.md, NOT implemented

### Enforcer Regex Bug
`tools/traceability-enforcer.py:68` uses `r"FR-[A-Z0-9-]+"` — only uppercase letters after hyphen.
- Fix: change to `r"FR-[A-Za-z0-9-]+"` to catch lowercase suffixes like `FR-dependency-*`

### Architecture Violation Pattern: Routes Bypass Service Layer
Three route files (`workItems.ts`, `workflow.ts`, `intake.ts`) call `store.*` directly.
Only `dashboard.ts` correctly uses a service layer.
- Fast check command: `grep -n "import.*store" Source/Backend/src/routes/*.ts`

### OpenTelemetry Not Implemented
Zero OTel code exists in source. The architecture rule and FR-021 both require it.
- Fast check command: `grep -rn "opentelemetry" Source/Backend/src/` → should return empty

### Useful File Paths for Future Audits
- Main spec: `Specifications/dev-workflow-platform.md` (FR-001–FR-069)
- Pipeline spec: `Specifications/tiered-merge-pipeline.md` (FR-TMP-*)
- Domain spec: `Specifications/workflow-engine.md` (implemented product, no FR-NNN)
- Enforcer target (auto-discovered): `Plans/self-judging-workflow/requirements.md`
- Dependency plan: `Plans/dependency-linking/requirements.md` (FR-dependency-* IDs)
- Shared types: `Source/Shared/types/workflow.ts` (237 lines, single source of truth)
- Backend routes: `Source/Backend/src/routes/` (4 files; 3 bypass service layer)
- Backend services: `Source/Backend/src/services/` (5 files)
- Backend store: `Source/Backend/src/store/workItemStore.ts`

### Spec Coverage Trend
- First audit: 0% on domain specs, 100% on active plan. Trend: N/A (baseline).
- Watch for: whether Specifications/ gets annotated/linked to Plans as work progresses.

### Common Pattern Violations Found
1. `eslint-disable-next-line react-hooks/exhaustive-deps` without rationale (2 files)
2. Hardcoded `localhost` URL in `DebugPortalPage.tsx` as env var fallback
3. No `catch` block issues — all catches log properly ✓
4. No `console.log` in production source ✓
5. No TODO/FIXME/HACK comments in source ✓
6. No files over 500 lines ✓ (largest: workflow.ts at 374 lines)
