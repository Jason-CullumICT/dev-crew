# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

| Date | Grade | P1 | P2 | P3 | Active-Plan Coverage |
|------|-------|----|----|----|----------------------|
| 2026-11-02 | D | 2 | 2 | 1 | 100% (self-judging-workflow) |

---

## Learnings

### Traceability Enforcer Scope Defect (discovered 2026-11-02)
- `tools/traceability-enforcer.py` uses `max(req_files, key=os.path.getmtime)` — picks only ONE `requirements.md` from `Plans/`
- All 8 `requirements.md` files in this repo share the same `mtime` (Nov 2 09:15), making selection arbitrary
- **Never scans `Specifications/`** — the CLAUDE.md-designated "Domain truth" is completely excluded
- When called with no args, currently targets `Plans/self-judging-workflow/requirements.md` (13 FRs, all pass)
- Running against `Plans/dev-workflow-platform/requirements.md` shows 34/34 MISSING
- **Fix needed**: iterate all active plans or explicitly name the active plan in CLAUDE.md gate command

### Two Separate Domain Specs Coexist (discovered 2026-11-02)
- `Specifications/workflow-engine.md` — the self-judging WorkItem workflow engine (what Source/ implements); **no FR IDs** (narrative-only)
- `Specifications/dev-workflow-platform.md` — a feature-request management platform (FeatureRequest, BugReport, DevelopmentCycle, SQLite); FR-001 to FR-069; **completely unimplemented** in Source/
- Source code traces to `Plans/self-judging-workflow/requirements.md` (FR-WF-001-013) — matches workflow-engine spec
- Dev-workflow-platform spec may be planned future work or stale — no explicit status documented

### File Locations for Fast Future Audits
- Backend source: `Source/Backend/src/` — all files have `// Verifies: FR-WF-*` at top
- Frontend source: `Source/Frontend/src/` — all files have `// Verifies: FR-WF-*` at top  
- Backend tests: `Source/Backend/tests/` — 14 files, all have Verifies (fully covered)
- Frontend tests: `Source/Frontend/tests/` — fully covered except `setup.ts` (infrastructure file, OK)
- Specifications: `Specifications/workflow-engine.md` (narrative, no FR IDs), `Specifications/dev-workflow-platform.md` (FR-001-069, unimplemented)
- Active plan: `Plans/self-judging-workflow/requirements.md` (13 FR-WF-* items)

### Persistent Violations
- `Source/Frontend/src/api/client.ts:26` — `.catch(() => ({}))` silently swallows JSON parse errors (P2, architecture rule violation)
- `Source/Frontend/src/hooks/useWorkItems.ts:63` — `eslint-disable` react-hooks/exhaustive-deps without rationale
- `Source/Frontend/src/components/DependencyPicker.tsx:82` — same eslint-disable pattern
- `Source/Frontend/src/pages/DebugPortalPage.tsx:5` — hardcoded `localhost:4200` as fallback URL (P3)

### What's Clean
- No console.log in production source (logger abstraction used throughout)
- No framework imports in services (pure domain logic)  
- No direct DB calls from route handlers (no SQLite — in-memory store only)
- No hardcoded secrets or API keys
- No skipped/todo tests
- No files over 500 lines
- All list endpoints return `{data: T[]}` wrappers
