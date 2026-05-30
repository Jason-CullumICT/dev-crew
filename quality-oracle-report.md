---

## Quality Oracle Findings — 2026-05-30

### Spec Coverage: ~9% overall (100% operational / 0% primary)

**13** requirements traced to source (FR-WF-001..FR-WF-013)
**69** requirements in primary spec with zero implementation references
**54** additional requirements across 3 unimplemented approved plans

---

### QO-001: Traceability Enforcer Has Dangerous Auto-Selection Blind Spot
- **Severity: P1** | spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** Without `--plan`, the enforcer picks the **most recently modified** `requirements.md` — today that's `Plans/self-judging-workflow/requirements.md`, which passes 100%. Four other plans with unimplemented approved FRs are silently skipped. Running each explicitly reveals:
  - `image-upload` → **21 MISSING FRs**
  - `orchestrated-dev-cycles` → **18 MISSING FRs**
  - `duplicate-deprecated-status` → **15 MISSING FRs**
  - `dependency-linking` → **7 MISSING FRs** (namespace mismatch)
- **Recommendation:** CI gate must iterate all `Plans/*/requirements.md` files, not just the most recently touched one.

---

### QO-002: Primary Specification Has Zero Source Implementation Traces
- **Severity: P1** | spec-drift / architecture-violation
- **File:** `Specifications/dev-workflow-platform.md` (FR-001..FR-069)
- **Detail:** The repo's authoritative spec defines 69 FRs for a Feature Request / Bug Report / Dev Cycle platform. **Not one of these IDs appears anywhere in `Source/`**. The implemented application (`Source/`) is a work-item routing engine that traces to `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` — a completely different product domain. CLAUDE.md: *"Specs are source of truth — implementation traces to specs, never the other way around."*
- **Recommendation:** Requires a team decision: either (a) retire `dev-workflow-platform.md` if the workflow engine is the product, (b) mark it `STATUS: PLANNED` and move it to `Specifications/roadmap/`, or (c) implement the gap. Cannot be fixed with traceability comments alone.
- **Cross-ref:** [ESCALATE → TheFixer] for spec reconciliation

---

### QO-003: FR Namespace Fragmentation Breaks Cross-Plan Traceability
- **Severity: P2** | spec-drift
- **Detail:** Three incompatible FR namespaces coexist — `FR-WF-XXX`, `FR-dependency-XXX` (invented in-source with no plan counterpart), and `FR-001..FR-069` (primary spec, zero source refs). The dependency features *are* implemented but under `FR-dependency-*` IDs while `Plans/dependency-linking/requirements.md` uses `FR-0002..FR-0007`, causing enforcer failure for work that actually exists.

### QO-004: NFRs Have Zero Traceability Coverage
- **Severity: P2** | spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (NFR-1, NFR-2, NFR-3)
- **Detail:** The enforcer regex `FR-[A-Z0-9-]+` structurally excludes `NFR-` prefixed IDs. Non-functional requirements (pipeline timing, graceful degradation) are invisible to all enforcement tooling.

### QO-005: `eslint-disable` in Two Production Source Files
- **Severity: P2** | pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` — the rule that prevents stale closure bugs. CLAUDE.md explicitly lists `eslint-disable` as a flagged pattern.

### QO-006: Duplicate Frontend Test Files Create Ambiguity
- **Severity: P2** | test-quality
- **Files:** `tests/WorkItemDetailPage.test.tsx` + `tests/pages/WorkItemDetailPage.test.tsx` (same for `WorkItemListPage`)
- **Detail:** Both run on `npm test`. Root-level copies appear to be stale predecessors of the `tests/pages/` versions, neither deleted.

### QO-007: DebugPortalPage Lacks Valid FR Traceability
- **Severity: P3** | `Source/Frontend/src/pages/DebugPortalPage.tsx:1`

### QO-008: tiered-merge-pipeline NFRs Have No Enforcement Path
- **Severity: P3** | `Specifications/tiered-merge-pipeline.md`

### QO-009: 3 Approved Plans with Unimplemented Requirements
- **Severity: P3** | `Plans/image-upload/`, `Plans/orchestrated-dev-cycles/`, `Plans/duplicate-deprecated-status/`

### QO-010: Hardcoded `localhost:4200` Fallback in Production Source
- **Severity: P3** | `Source/Frontend/src/pages/DebugPortalPage.tsx:5`

---

### Clean Areas ✅
- **Backend source:** 100% `// Verifies:` comment coverage — every file traces to a spec
- **Frontend source:** 100% `// Verifies:` comment coverage
- **No `console.log`** in production source (logger abstraction used correctly)
- **No empty catch blocks** found
- **No hardcoded secrets** (credentials, API keys) found
- **No skipped/todo tests** (`test.skip`, `xit`, `.todo`)
- **No files over 500 lines** (largest: `WorkItemDetailPage.tsx` at 426 lines)
- **Self-judging-workflow spec:** 13/13 FRs traced — enforcer passes

---

**Overall Grade: D** — driven entirely by the structural spec/implementation identity mismatch (QO-002). If graded only against the operational spec the source actually targets, the grade is **B** (0 P1s, 4 P2s, 100% operational coverage).

Full report saved to `Teams/TheInspector/findings/quality-oracle-2026-05-30.md`
Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`
