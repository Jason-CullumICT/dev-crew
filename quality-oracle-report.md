Learnings written. Here's the executive summary of the full audit:

---

## Quality Oracle — Full Audit Complete

**Grade: D** · 2 P1 · 4 P2 · 2 P3 · 1 P4

### Spec Coverage
| Scope | Coverage |
|---|---|
| Plans enforcer gate (CI) | **100%** — 13/13 FR-WF-* ✅ |
| `Specifications/` domain specs | **~0%** — 84 requirements, zero source traces ❌ |

---

### Findings

**P1 — Must Fix**

| ID | Finding |
|---|---|
| QO-001 | **Traceability enforcer is blind to `Specifications/`** — the CI gate only validates `Plans/*/requirements.md`, giving a green pass while 84 domain spec requirements have zero implementation references. The gate is a false negative machine. |
| QO-002 | **Implementation is a different system** — `Specifications/dev-workflow-platform.md` specifies SQLite + Feature Requests/Bugs/Cycles/Tickets (FR-001…069). The actual source implements an in-memory WorkItem workflow (FR-WF-001…013). Neither spec nor code acknowledge the divergence; agents reading the spec will implement conflicting code. |

**P2 — High Priority**

| ID | Finding |
|---|---|
| QO-003 | **FR-TMP-001…010 have zero coverage** — `tiered-merge-pipeline.md` defines 10 requirements (risk classification, Playwright runner, auto-PR, AI review, auto-merge). No implementation. E2E dir has zero test files. |
| QO-004 | **Architecture violation — direct store calls from route handlers** — `workItems.ts`, `workflow.ts`, `intake.ts` all call `store.*` directly, bypassing the service layer. Rule: *"No direct DB calls from route handlers — use the service layer."* |
| QO-005 | **Traceability ID format mismatch** — `inspector.config.yml` declares pattern `FR-\d+` but codebase uses `FR-WF-001`, `FR-dependency-*`, free-text. Any tool using the config pattern finds 0 matches in source. |
| QO-006 | **E2E infrastructure with zero tests** — `Source/E2E/playwright.config.ts` is wired up and cited in Verifies comments; `Source/E2E/tests/` is empty. |

**P3 — Improvements**

- **QO-007**: `eslint-disable react-hooks/exhaustive-deps` in `DependencyPicker.tsx:82` and `useWorkItems.ts:63` — stale closure risk
- **QO-008**: `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx` have no test files (all recently modified)

**Positives:** No `console.log` in production, no empty catch blocks, no secrets, no skipped tests, strong Verifies comment density (276 comments in test files).

**Escalation:** None — no auth bypass, injection, or sensitive data exposure found. Route QO-004 to **TheFixer** for service layer refactor. Route QO-001/002/003 to **requirements-reviewer** for spec disposition decisions.
