# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-10

### Spec Coverage Trend
- **Active plan coverage:** 96% (FR-WF-XXX + FR-dependency-XXX fully traced)
- **Full spec coverage:** 27% (Specifications/dev-workflow-platform.md is 0%)
- Trend: **Declining in the large** because the primary domain spec was never updated to reflect the product pivot to the self-judging workflow engine.

### Key Structural Discovery: Two Separate Spec Systems

The repo has **two disconnected spec systems** that are easy to confuse:

1. **Old product spec** — `Specifications/dev-workflow-platform.md` (FR-001–FR-069): Describes a feature-request/bug/dev-cycle management platform. **The codebase does NOT implement this.** This spec appears to be abandoned/superseded but has no deprecation notice.

2. **Current product spec** — `Specifications/workflow-engine.md` (narrative, no IDs) + `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013): Describes the self-judging work item routing/assessment engine. **This IS what's implemented.**

3. **Dependency feature** — `Plans/dependency-linking/requirements.md` (FR-dependency-*): Describes work item dependency tracking. **Implemented but `GET /api/search` endpoint is missing from `app.ts`.**

### Enforcer Blind Spot
The `tools/traceability-enforcer.py` uses "most recently modified requirements.md" as its target. Currently this resolves to the self-judging-workflow plan. This creates a **false green pass** — `Specifications/dev-workflow-platform.md`'s 74 FRs are never checked. Future auditors must run: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` explicitly to see the gap.

### Architecture Pattern: Route Handler Business Logic
The `workflow.ts` route file has inconsistent layering. Operations using service functions (route → `routeWorkItem()`, assess → `assessWorkItem()`) are clean. Operations **without** service functions (approve, reject, dispatch) contain inline state-machine logic + direct store writes. This is the key architecture violation to watch.

### Useful File Paths for Faster Future Audits
- All spec FRs: `grep -oE "FR-[A-Z0-9-]+" Specifications/ Plans/*/requirements.md`
- All traceability comments: `grep -rn "// Verifies:" Source/`
- Route registration: `Source/Backend/src/app.ts` (all routes wired here)
- Duplicate test risk: Check `Source/Frontend/tests/*.test.tsx` vs `Source/Frontend/tests/pages/*.test.tsx`
- Missing endpoint signal: `grep -n "NOTE.*NOT wired" Source/Backend/tests/`

### Common Pattern Violations Found
1. `eslint-disable-next-line react-hooks/exhaustive-deps` — 2 instances in frontend
2. Hardcoded `localhost` URL in `DebugPortalPage.tsx`
3. Inline domain type `BlockerRef` in UI component (should be in Shared/)

### Open P1/P2 Findings as of 2026-05-10
- **QO-001 (P1):** `Specifications/dev-workflow-platform.md` — 74 FRs, 0% traced
- **QO-002 (P1):** Traceability enforcer gives false PASS
- **QO-003 (P2):** Business logic in approve/reject/dispatch route handlers
- **QO-004 (P2):** `GET /api/search` not wired in `app.ts`
- **QO-005 (P2):** Duplicate/diverged test files for WorkItemDetailPage + WorkItemListPage
