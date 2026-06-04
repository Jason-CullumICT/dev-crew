---

## Quality Oracle Findings

**Grade: C** — 2 P1s, 5 P2s, 5 P3s

---

### Spec Coverage

| Spec | FRs | Coverage |
|---|---|---|
| `self-judging-workflow` (active) | 13 | **100%** ✅ enforcer PASS |
| `dependency-linking` (FR-dependency-*) | 16 | **~81%** (enforcer blind — see QO-004) |
| `dev-workflow-platform.md` | 69 | **0% — ORPHANED** |

---

### P1 Findings

**QO-001 — Orphaned Specification (spec-drift)**  
`Specifications/dev-workflow-platform.md` contains 69 FRs (FR-001–FR-069) describing an entirely different application (feature requests, bug reports, dev cycles). The current `Source/` codebase implements the Self-Judging Workflow Engine — a different domain. Enforcer returns 76 failures against this file. The spec is either a superseded design or describes the separate `portal/` app. It must be formally archived or annotated — leaving it live at 0% coverage corrupts coverage metrics and misleads agents.

**QO-002 — GET /api/search not wired → tests always fail (untested)**  
`Source/Backend/tests/routes/search.test.ts` is explicitly self-documented as an "intentionally failing" test: *"will FAIL until the route is implemented."* The 5 test cases all hit `/api/search`, which is never registered in `app.ts`. All 5 fail at runtime. The `FR-dependency-search` feature (DependencyPicker typeahead) is broken end-to-end.

---

### P2 Findings

**QO-003 — Route handlers bypass service layer (architecture-violation)**  
`workItems.ts` and `workflow.ts` both `import * as store from '../store/workItemStore'` and call store functions directly. Architecture rule: *"No direct DB calls from route handlers — use the service layer."* The store is the persistence layer; routes should only call services.

**QO-004 — Traceability enforcer has 3 critical gaps (pattern-violation)**  
(1) Auto-targets only the most-recently-modified plan — never checks `Specifications/`. (2) Regex `FR-[A-Z0-9-]+` silently skips all `FR-dependency-*` IDs (lowercase). (3) False-positives: work item data IDs like `FR-0004` in prose get matched as requirement IDs, causing spurious failures.

**QO-005 — Logger always JSON, no dev pretty-print (architecture-violation)**  
`utils/logger.ts` always writes JSON regardless of `NODE_ENV`. Architecture rule and FR-WF-013 require pretty-printing in development. No `process.env.NODE_ENV` check exists.

**QO-006 — OpenTelemetry completely absent (architecture-violation)**  
Zero OTel SDK packages, no tracing initialization, no `traceparent` propagation. Architecture rule: *"Use OpenTelemetry for distributed tracing. Propagate W3C traceparent header across service boundaries."* → **[ESCALATE → TheGuardians]** (missing tracing masks security-relevant request flows).

**QO-007 — FR-dependency-seed not implemented (spec-drift)**  
Implementation delta explicitly marks this ❌ Missing. No seed mechanism exists in `Source/Backend/src/`. Needs clarification: either implement for the in-memory store, or mark N/A and close the gap.

---

### P3 Findings

| ID | Category | File | Issue |
|---|---|---|---|
| QO-008 | pattern-violation | `src/logger.ts` | Adapter wrapper anti-pattern — two logger modules created by import-style divergence |
| QO-009 | pattern-violation | `DependencyPicker.tsx:82`, `useWorkItems.ts:63` | `eslint-disable react-hooks/exhaustive-deps` in 2 production files |
| QO-010 | pattern-violation | `Source/E2E/package.json:10` | Test script is the npm placeholder (`echo "Error" && exit 1`) — breaks `npm test --workspaces` |
| QO-011 | untested | 5 frontend components | `StatusBadge`, `TypeBadge`, `PriorityBadge`, `Layout`, `DebugPortalPage` — recently modified, zero test files |
| QO-012 | spec-drift | `DependencyPicker.tsx` | FR-dependency-api-types open — `as any` cast for `blocked_by` field, documented in impl delta |

---

Full report written to: `Teams/TheInspector/findings/audit-2026-06-04-C.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
