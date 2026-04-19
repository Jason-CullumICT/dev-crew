## Quality Oracle Findings — 2026-04-19

**Grade: C**

---

### Spec Coverage

| Scope | Requirements | Coverage |
|-------|-------------|---------|
| Enforcer scope (`Source/` + `E2E/`) | 13 FR-WF-* | **100%** ✅ |
| `portal/` (not enforced by tool) | ~95 FR-* | **Unverified** ⚠️ |
| `platform/` FR-TMP-* | 10 requirements | **9/10** (FR-TMP-008 gap) |
| **True project-wide total** | ~118 | **Enforcer blind to 87%** |

---

### Findings

#### QO-001 — Traceability Enforcer Blind to 87% of Codebase `P1 · spec-drift`
**`tools/traceability-enforcer.py:70`**

The enforcer hardcodes `source_dirs = ["Source", "E2E"]` and auto-selects only the alphabetically-last `Plans/*/requirements.md`. This means:
- `portal/` with **1,073 `Verifies:` annotations** (FR-001 to FR-095+) is never scanned
- `platform/` (FR-TMP-001–010 implementations) is never scanned  
- 7 of 8 plan requirement files are never enforced

A developer could silently delete any `// Verifies:` comment in `portal/` and CI gates would not catch it.

**Fix:** Expand `inspector.config.yml` `source.dirs` to include `portal/` and `platform/`; update enforcer to iterate all `Plans/*/requirements.md` files.

---

#### QO-002 — `AssessmentResult` Type Defined in Service Layer `P2 · architecture-violation`
**`Source/Backend/src/services/assessment.ts:141`**

`AssessmentResult` (aggregate pod output) is exported from the service file instead of `Source/Shared/types/workflow.ts`. `AssessmentRecord` and `AssessmentVerdict` are correctly in Shared — this one type slipped. Rule: "Shared types are single source of truth."

---

#### QO-003 — Duplicate Logger Abstraction `P2 · architecture-violation`
**`Source/Backend/src/logger.ts` + `Source/Backend/src/utils/logger.ts`**

Two logger implementations in the same package: `utils/logger.ts` (real implementation) and `src/logger.ts` (compatibility shim wrapping it with a different interface). Routes can import either, producing inconsistent log formats. Rule: "Use the project's logger abstraction" — with two abstractions, there is no single one.

---

#### QO-004 — Silent JSON Parse Swallow in API Client `P2 · pattern-violation`
**`Source/Frontend/src/api/client.ts:26`**

```ts
const body = await response.json().catch(() => ({}));
```

Silently swallows parse failures (e.g., HTML 502 from a proxy) with no logging and no comment. Rule: "Never swallow errors silently — every catch block must either re-throw, log, or explicitly document why suppression is intentional."

---

#### QO-005 — FR-TMP-008 Untraced in Dockerfile.worker `P2 · spec-drift`
**`platform/Dockerfile.worker:32-40`**

Every FR-TMP requirement has a `// Verifies:` comment except FR-TMP-008 (Worker Container Prerequisites). The implementation exists correctly (`gh` CLI at line 32, Playwright at lines 38-40) — only the traceability comment is missing.

---

#### QO-006 — ESLint Suppressions Without Explanation `P3 · pattern-violation`
`DependencyPicker.tsx:82` and `useWorkItems.ts:63` both suppress `react-hooks/exhaustive-deps` with no comment explaining which dependency is intentionally omitted or why. Silent suppressions mask potential stale-closure bugs.

---

#### QO-007 — Test Traceability Ratio Gaps `P3 · untested`
34+ test cases across 6 files lack `// Verifies:` annotations. Worst offender: `dependency.test.ts` has 34 tests but only 12 Verifies blocks — 22 untraced tests.

---

#### QO-008 & QO-009 — Frontend Pages/Hooks/Badges Missing Tests `P3 · untested`
`DebugPortalPage.tsx`, both data hooks (`useDashboard.ts`, `useWorkItems.ts`), and four UI primitives (`StatusBadge`, `PriorityBadge`, `TypeBadge`, `Layout`) have no dedicated test files.

---

#### QO-010 — `workflow-engine.md` Has No FR IDs `P4 · spec-drift`
The domain spec contains rich requirements but no `FR-XXX` identifiers — traceability requires a two-hop journey through the plan file.

#### QO-011 — `api-contracts.md` May Diverge From TypeScript `P4 · doc-stale`
Markdown type definitions in `Source/Shared/api-contracts.md` have no enforced consistency with `Source/Shared/types/workflow.ts`.

---

### What's Clean ✅
- **No `console.log` anywhere in production source** (Source/ or portal/)
- **No hardcoded secrets or credentials** found
- **No skipped/todo tests** (`skip`, `xit`, `xdescribe` — zero occurrences)
- **No files over 500 lines** (largest: `WorkItemDetailPage.tsx` at 426 lines)
- **No direct DB calls from route handlers** — service layer enforced correctly in both backends
- **All list endpoints return `{data: T[]}` wrappers** ✓
- **Prometheus metrics at `/metrics`** fully implemented (FR-WF-013) ✓
- **FR-TMP-001–010** all implemented in `platform/` (9/10 with Verifies comments)
- **Portal has 1,073 Verifies annotations** — coverage discipline is strong where it's enforced

Report saved to: `Teams/TheInspector/findings/audit-2026-04-19-C.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
