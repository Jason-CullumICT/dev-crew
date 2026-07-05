# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-05 — First Audit Run

**Grading threshold interpretation:** The config `grading.C.max_p1: 2` is a ceiling — if total P1s across ALL specialists exceeds 2, the grade falls to D. Count P1s from all specialists before assigning grade; do not grade each specialist independently.

**Escalated findings still count toward grade:** DEP-001 and DEP-002 were escalated to TheGuardians but still contributed to the P1 count for grading. Escalation routes them for follow-up; it does not remove them from the severity tally.

**Spec coverage is bimodal:** The project has ~90% active spec coverage (FR-WF-* + FR-dependency-*) but only ~11% full corpus coverage because two large unimplemented specs (dev-workflow-platform.md, tiered-merge-pipeline.md) exist in Specifications/. Report both numbers — active coverage is meaningful, full corpus coverage is misleading without context.

**Traceability enforcer blind spot is a P1:** A CI gate that reports PASSED while covering only ~13% of the spec corpus is an architecture rule violation (every FR needs a test), not just a code quality issue. Classify as P1.

**Services were offline:** Backend (localhost:3001) and Frontend (localhost:5173) were not running. This forced static-only mode for all specialists. Performance Profiler and Chaos Monkey were entirely skipped. Note this prominently — dynamic findings will appear in a future audit when services are up.

**Cross-reference map is high-value:** The cross-ref between QO-001 (missing search route) and QO-003 (direct store calls) shows they share the same root cause (no service layer), so a single workItemService.ts refactor resolves both. Highlight these in Section 8 — they are the most actionable output for TheFixer.

**Dependency audit produced two P1 escalations:** Handlebars (transitive) and Vitest (direct) both carry CVSS 9.8. The dependency-auditor correctly identified these; team leader must not downgrade them during synthesis. Supply-chain RCEs require TheGuardians regardless of whether the application actively uses the vulnerable feature.

**No PR context on this branch:** The escalation bash block fell through to the printf path (no `gh pr view` result). This is expected for audit branches that are not open PRs. Manual escalation instructions were printed to stdout.

**Path to grade C is clear:** Fix QO-001 + QO-002 (2 non-security P1s) + DEP-001 + DEP-002 (2 security P1s via npm update) → 0 P1s → grade C or better depending on P2 count.
