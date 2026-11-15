# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

### 2026-11-15 — First Full Audit

**Spec Coverage: ~96.5%** (28/29 active requirements traced; 1 untraced, 1 unimplemented)

---

## Key Discoveries

### Source Layout
- `Source/Backend/src/` — Express + TypeScript backend (in-memory store via `workItemStore`)
- `Source/Frontend/src/` — React + Vite + Tailwind SPA
- `Source/Shared/types/workflow.ts` — shared type definitions
- `Source/E2E/` — Playwright E2E configs (no active tests yet)
- `portal/` — SEPARATE system (dev-workflow-platform portal, FR-001 to FR-069); do NOT confuse with `Source/`

### Traceability Namespaces
- **FR-WF-001 to FR-WF-013** — Defined in `Plans/self-judging-workflow/requirements.md`. All 13 are traced in Source.
- **FR-dependency-*** — Defined in `Specifications/dev-workflow-platform.md` (the dependency-linking feature). 15/16 traced in Source.
- **FR-001 to FR-069** — Also in `dev-workflow-platform.md` but for the PORTAL system (`portal/`), NOT `Source/`. Do not flag these as spec drift against `Source/`.

### Traceability Enforcer Limitation
`tools/traceability-enforcer.py` only checks the **most recently modified** `Plans/*/requirements.md`. It scans FR-WF-001 to FR-WF-013 and reports PASSED, but it does NOT check FR-dependency-* requirements from Specifications/. The `FR-dependency-seed` and (functionally) `FR-dependency-search` gaps are invisible to this tool.

### Architecture Violation (Persistent)
Routes directly import the in-memory store — this violates the "No direct DB calls from route handlers" rule:
- `Source/Backend/src/routes/workItems.ts` → imports `../store/workItemStore` and calls it directly
- `Source/Backend/src/routes/workflow.ts` → same
- `Source/Backend/src/routes/intake.ts` → same

The store is intentionally in-memory (not a real DB), and the CLAUDE.md rule was likely written for the portal SQLite system. However, the rule as written applies here too. Flag as architecture violation until clarified.

### Known Unimplemented Requirement
- **FR-dependency-search**: `GET /api/search` endpoint is NOT wired in `Source/Backend/src/app.ts`. The test file (`Source/Backend/tests/routes/search.test.ts`) explicitly documents this gap and the tests are expected to fail. The `DependencyPicker` component calls `searchItems()` which hits this endpoint — the dependency picker search is broken.

### Known Untraced Requirement
- **FR-dependency-seed**: No seed data code exists in `Source/`. Seed data for known blocked items (BUG-0010, FR-0004, etc.) is never created on startup.

### Duplicate Test Files
Two pairs of near-duplicate test files exist:
- `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (older, less typed) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (newer, fully typed)
- `Source/Frontend/tests/WorkItemListPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx`
The `/pages/` versions are more comprehensive. The root-level ones appear to be older iterations not yet removed.

### ESLint Suppress (Minor)
Two `eslint-disable-next-line react-hooks/exhaustive-deps` comments without inline justification:
- `Source/Frontend/src/hooks/useWorkItems.ts:63`
- `Source/Frontend/src/components/DependencyPicker.tsx:82`

---

## Useful Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Plans/self-judging-workflow/requirements.md` | Active FR-WF-* requirements (enforcer target) |
| `Specifications/dev-workflow-platform.md` lines 461–482 | FR-dependency-* requirements (NOT enforcer target) |
| `Source/Backend/src/app.ts` | Route wiring — check for missing endpoint registrations |
| `Source/Backend/tests/routes/search.test.ts` | Documents the /api/search gap explicitly |
| `tools/traceability-enforcer.py` | Only covers Plans/, not Specifications/ |

---

## Spec Coverage Trend

| Run | Date | Coverage | P1s | P2s | Grade |
|-----|------|----------|-----|-----|-------|
| 1 | 2026-11-15 | 96.5% | 1 | 3 | B |
