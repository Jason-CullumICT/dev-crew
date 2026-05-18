## Quality Oracle Findings

**Grade: C** | **Spec Coverage: 15.8%** (15 of 95 `Specifications/` FRs traced)

---

### The Core Issue: Spec-Scope Mismatch

The `Source/` code implements the **Self-Judging Workflow Engine** — but its traceability IDs (`FR-WF-001`–`FR-WF-013`) come from `Plans/self-judging-workflow/requirements.md`, **not** from `Specifications/`. Meanwhile, `Specifications/` defines two entirely different applications that have no implementation yet:

| Spec File | FRs Defined | Traced in Source | Coverage |
|-----------|-------------|-----------------|---------|
| `dev-workflow-platform.md` (FR-001–069) | 69 | 0 | 0% |
| `dev-workflow-platform.md` (FR-dependency-*) | 16 | 15 | 94% |
| `tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0 | 0% |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | 100% |

---

### Findings

#### P1 — Critical

**QO-001: `GET /api/search` not wired in `app.ts` — tests explicitly document this gap**
- `Source/Backend/tests/routes/search.test.ts` line 2–6 says verbatim: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until implemented."*
- The `FR-dependency-search` requirement (DependencyPicker typeahead) has a full test suite but the route doesn't exist. The traceability enforcer still passes because the FR ID appears in the file.
- **Fix:** Add the search handler to `app.ts` and implement the route (filter `store.findAll()` by `q` param on title/description).

---

#### P2 — High

**QO-002 & QO-003:** 69 (FR-001–069) + 10 (FR-TMP-001–010) spec requirements have 0% source coverage — intentional (different app not yet built), but creates a misleading coverage gap.

**QO-004: Traceability enforcer produces false PASS** — only scans 13 FRs from one plan file; ignores 95 FRs in `Specifications/`. The verification gate is incomplete.

**QO-005: `pending_dependencies` WorkItemStatus missing from enum** — FR-dependency-dispatch-gating says unresolved blockers → set `pending_dependencies` status. The `WorkItemStatus` enum has no such value; the dispatch route returns `400` instead of silently transitioning the item.

---

#### P3 — Medium

| ID | Finding |
|----|---------|
| QO-006 | Missing `dependencyCheckDuration` Histogram — FR-dependency-metrics requires 4 metrics, only 3 implemented |
| QO-007 | No Prometheus route latency histogram — required by CLAUDE.md architecture rule + FR-004 |
| QO-008 | No OpenTelemetry tracing — CLAUDE.md requires OTel; no `@opentelemetry/*` imports anywhere |
| QO-009 | Duplicate test files for `WorkItemDetailPage` and `WorkItemListPage` in both `tests/` and `tests/pages/` — diverged, ambiguous authority |
| QO-010 | FR-dependency-seed (explicit seed data) has no implementation |

---

#### What Passes ✅

The implementation is clean within its own scope: no `console.log`, no empty catch blocks, no direct DB calls from routes, no hardcoded secrets, no framework imports in services, all catch blocks log with full context, list endpoints return `{data: T[]}` wrappers, and all backend source files have at least one `// Verifies:` comment.

---

Full report written to `Teams/TheInspector/findings/audit-2026-05-18-C.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
