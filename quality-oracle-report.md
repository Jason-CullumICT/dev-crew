Here is the full Quality Oracle report:

---

## Quality Oracle Findings — 2026-04-30

### Spec Coverage: ~93% (Source/ app) | Portal: unknown
- **13 FR-WF-*** requirements in Source/: **100%** covered (enforcer confirms)
- **FR-dependency-**** requirements: **93%** — FR-dependency-search missing implementation
- **FR-TMP-001–010** (tiered-merge-pipeline): **0%** — platform layer, not in Source/
- **FR-001–095** (portal/): **unknown** — enforcer blind to the portal/ directory

**Overall Grade: C** (2 P1s; B requires max_p1 = 0)

---

### QO-001 — P1: `GET /api/search` not wired in app.ts
**Category:** spec-drift  
**File:** `Source/Backend/src/app.ts`, `Source/Backend/tests/routes/search.test.ts:1–6`  
The search test file explicitly flags the route as intentionally unimplemented: *"these tests will FAIL until the route is implemented."* The frontend `client.ts:101` calls `/search?q=` in `searchItems()` — every user of `DependencyPicker` gets a runtime network error. `FR-dependency-search` is unimplemented.  
**Fix:** Implement the route, mount it in `app.ts`, remove the failing comment.

---

### QO-002 — P1: Traceability enforcer is blind to `portal/`
**Category:** spec-drift, architecture-violation  
**File:** `tools/traceability-enforcer.py:77`, `Teams/TheInspector/inspector.config.yml:42`  
The enforcer hardcodes `["Source", "E2E"]` scan dirs. The `portal/` directory contains **1,041** `// Verifies:` comments (FR-001–095, FR-DUP-*). Running the enforcer against `Specifications/dev-workflow-platform.md` reports **76 requirements missing** — a false failure — because none of portal/ is ever scanned. The verification gate is structurally broken for the portal application.  
**Fix:** Add `"portal"` to `source.dirs` in both `inspector.config.yml` and the enforcer script.

---

### QO-003 — P2: `pending_dependencies` status missing from WorkItemStatus enum
**Category:** spec-drift  
**File:** `Source/Shared/types/workflow.ts:5–15`  
`FR-dependency-types` and `FR-dependency-dispatch-gating` specify a `pending_dependencies` status. It was never added to the enum. Dispatch with unresolved blockers returns HTTP 400 instead of setting this status. The `BlockedBadge` amber badge path (`status === 'pending_dependencies'`) is permanently dead code.

---

### QO-004 — P2: `dependencyCheckDuration` histogram missing
**Category:** spec-drift  
**File:** `Source/Backend/src/metrics.ts`  
`FR-dependency-metrics` requires 4 metrics. Three are present; the `dependency_check_duration` histogram is absent despite `isReady()` being an O(n) BFS traversal called on every dispatch attempt.

---

### QO-005 — P2: Route handlers call the store directly (no service layer)
**Category:** architecture-violation  
**Files:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:15`  
Both import `* as store` and call it from HTTP handlers, violating *"No direct DB calls from route handlers — use the service layer."* Route logic also mutates `item.changeHistory` in-place before the store update.

---

### QO-006 — P2: Enforcer non-deterministically picks one of 8 plans
**Category:** pattern-violation  
**File:** `tools/traceability-enforcer.py:48–57`  
All 8 `Plans/*/requirements.md` files share identical mtimes. `max(files, key=os.path.getmtime)` is non-deterministic; it happens to pick `self-judging-workflow`. Seven plans' FRs are never verified, including `FR-DUP-*`, `FR-070–085`, and FR-dependency plans targeting `portal/`.

---

### QO-007 — P3: `eslint-disable-next-line` without justification
`DependencyPicker.tsx:82` and `useWorkItems.ts:63` suppress `react-hooks/exhaustive-deps` with no comment explaining why the omission is safe.

### QO-008 — P3: Silent JSON parse swallowed in API client
`Source/Frontend/src/api/client.ts:26` — `.catch(() => ({}))` discards JSON parse errors without logging, violating *"never swallow errors silently."*

### QO-009 — P4: Non-standard Verifies marker in DebugPortalPage.tsx
No `FR-XXX` reference — the enforcer will never match it.

### QO-010 — P4: `workflow-engine.md` spec has no FR-XXX IDs
Makes programmatic traceability from the canonical spec impossible.

---

**Report saved to:** `Teams/TheInspector/findings/audit-2026-04-30-C.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
