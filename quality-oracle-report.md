---

## Quality Oracle — Full Audit Report

**Grade: C** | Spec Coverage: ~94% | P1: 1 | P2: 4 | P3: 3 | P4: 1

---

### Spec Coverage Summary

| Spec | FRs | Traced | Coverage |
|------|-----|--------|----------|
| FR-WF-001 to FR-WF-013 (Workflow Engine) | 13 | 13 | 100% ✅ |
| FR-dependency-\* (Dependency Linking) | 16 | 15 | 94% ⚠️ |
| FR-TMP-001 to FR-TMP-010 (Tiered Merge Pipeline) | 10 | 0 | 0% 🔴 (platform/ scope) |
| **Source/ total** | **29** | **28** | **~97% active scope** |

> **Enforcer limitation:** `python3 tools/traceability-enforcer.py` (no flags) only validates 13 FR-WF-\* requirements. The FR-dependency-\* and FR-TMP-\* gaps are invisible to the gate.

---

### P1 Findings

**QO-001 — `GET /api/search` never wired in `app.ts`** (`Source/Backend/src/app.ts:1`)
The DependencyPicker's typeahead calls `searchItems()` → `/api/search` → **404 in production**. `search.test.ts` acknowledges this in its own header: *"these tests will FAIL until the route is implemented."* Five test cases currently fail. Fix: add `Source/Backend/src/routes/search.ts` (filter `getAll()` items by title/description, skip deleted, return `{data: WorkItem[]}`), mount it in `app.ts`. One-sprint fix.

### P2 Findings

**QO-002 — `pending_dependencies` missing from `WorkItemStatus` enum** (`Source/Shared/types/workflow.ts:5`)
`api-contracts.md` and FR-dependency-dispatch-gating require a `pending_dependencies` state transition when a dispatch is blocked by unresolved dependencies. The status literally does not exist in the enum, so the spec state machine cannot be implemented. Current code returns a 400 error instead of transitioning to the specified status. Cascade auto-advance is also broken. *(Shared type change — coordinate with api-contract agent before editing.)*

**QO-003 — `BlockedBadge` missing amber "Pending Dependencies" state** (`Source/Frontend/src/components/BlockedBadge.tsx:10`)
FR-dependency-blocked-badge specifies three render states; only two are implemented. The amber badge (`status='pending_dependencies'`) is entirely absent — no `status` prop, no amber color, no test. Gated on QO-002.

**QO-004 — Route handlers call `store.*` directly, bypassing service layer** (`Source/Backend/src/routes/workItems.ts:44`)
`workItems.ts` and `workflow.ts` both call the in-memory store directly from route handlers. Only `dashboard.ts` follows the service pattern. Architecture rule: *"No direct DB calls from route handlers — use the service layer."*

**QO-005 — FR-TMP-001 to FR-TMP-010 have zero traceability in `Source/`** (`Specifications/tiered-merge-pipeline.md:1`)
10 tiered-merge-pipeline FRs exist in specs but are unresolvable in `Source/` — they live in `platform/` (orchestrator infrastructure), which pipeline agents cannot touch. Recommend updating the spec or enforcer config to explicitly mark these as platform-layer scope.

### P3 Findings

**QO-006** — Traceability enforcer silently validates only 1 of 3 active requirement sets  
**QO-007** — 5 known-failing tests committed to repo (`search.test.ts`) — violates zero-failures policy  
**QO-008** — Dual logger abstraction (`src/logger.ts` wraps `src/utils/logger.ts`) creates import confusion  

### P4 Findings

**QO-009** — Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions without justification comments  

---

**Immediate fix priority:** QO-001 (wire the search route) unblocks QO-007 (passing tests), closes FR-dependency-search, and restores DependencyPicker functionality. All within `Source/Backend/` — no shared type changes needed.
