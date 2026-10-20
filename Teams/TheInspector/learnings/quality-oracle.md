# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-10-20 — Full Audit

### Spec Coverage Snapshot

| Spec / Plan | FRs Declared | FRs Traced to Source | Coverage |
|---|---|---|---|
| `Specifications/dev-workflow-platform.md` | 69 (FR-001 – FR-069) | 0 | **0%** |
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001 – FR-WF-013) | 13 | **100%** |
| `Plans/dependency-linking/requirements.md` | 16 (FR-dependency-*) | 14 | **87.5%** |
| **Overall** | **98** | **27** | **27.6%** |

### Confirmed Open Issues

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| QO-001 | P2 | `dev-workflow-platform.md` (FR-001–069) is entirely unimplemented — a different system was built | STILL OPEN |
| QO-002 | P2 | `FR-dependency-search`: `GET /api/search` not registered in `app.ts` | STILL OPEN |
| QO-003 | P2 | OTel / W3C `traceparent` architecture rule has zero implementation in source | STILL OPEN |
| QO-004 | P2 | Traceability enforcer targets wrong spec (Plans not Specifications/) — false PASSED | STILL OPEN |
| QO-005 | P3 | `FR-dependency-seed` has no source implementation or traceability comment | STILL OPEN |
| QO-006 | P3 | `eslint-disable-next-line react-hooks/exhaustive-deps` in 2 recently-modified files | STILL OPEN |
| QO-007 | P3 | 5 frontend source files (Layout, PriorityBadge, StatusBadge, TypeBadge, DebugPortalPage) lack dedicated test files | STILL OPEN |

### Key File Paths (for faster future audits)

- Active requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-*), `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- Unimplemented spec: `Specifications/dev-workflow-platform.md` (FR-001 – FR-069)
- Route registration: `Source/Backend/src/app.ts` — missing: `/api/search`
- Traceability enforcer: `tools/traceability-enforcer.py` — run with `python3 tools/traceability-enforcer.py`
- Linting suppressions: `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- Components without tests: `Source/Frontend/src/components/{Layout,PriorityBadge,StatusBadge,TypeBadge}.tsx`, `Source/Frontend/src/pages/DebugPortalPage.tsx`

### Useful Patterns

- Source `Verifies:` IDs use `FR-WF-\d+` and `FR-dependency-[a-z-]+` — NOT `FR-\d+` from the main spec
- All production source files have at least one `Verifies:` comment (good hygiene)
- No `console.log` in production code; logger abstraction is consistently used
- No hardcoded secrets or credentials
- Catch blocks surface errors — no silent swallowing except one intentionally documented case in `DependencyPicker.tsx:56-58`
- API list responses correctly return `{data: [...]}` wrapper via `store.findAll()`
- `@opentelemetry/api` is a transitive dependency only — not a direct dep, not used
