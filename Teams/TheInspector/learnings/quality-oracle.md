# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-08-29 (First full audit)

### Spec Coverage Trend
- Enforcer-reported coverage: 100% (13/13 FR-WF-001..013) — misleadingly high
- True corpus coverage: ~20% (~23 of 112 total requirements across all Specifications/)
- Trend: **baseline established** — first audit, no prior data

### Key Discovery: Two-Layer Spec Architecture

This project has two spec layers with different FR-ID naming conventions:

| Layer | Files | ID Format | Enforcer sees? |
|-------|-------|-----------|---------------|
| Plans (implementation) | `Plans/*/requirements.md` | `FR-WF-\d+` | ✅ Yes (most-recent only) |
| Specifications (domain) | `Specifications/*.md` | `FR-\d+`, `FR-dependency-*`, `FR-TMP-\d+` | ❌ No |

The traceability enforcer config (`inspector.config.yml`) defines `traceability: "FR-\\d+"` but no source file uses bare `FR-\d+` IDs — all use `FR-WF-\d+` or `FR-dependency-*`. The pattern never actually validates anything; it passes vacuously.

### Critical File Paths for Fast Future Audits

| Purpose | Path |
|---------|------|
| Main domain spec (74 FR-IDs, unimplemented) | `Specifications/dev-workflow-platform.md` |
| Active implementation spec (prose) | `Specifications/workflow-engine.md` |
| Enforced requirements (13 FR-WF-IDs) | `Plans/self-judging-workflow/requirements.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Architecture rules | `CLAUDE.md` (Architecture Rules section) |
| Test directories | `Source/Backend/tests/`, `Source/Frontend/tests/` |

### Common Pattern Violations Found

1. **Direct store access in routes** (P2 recurring risk): `workItems.ts`, `intake.ts`, `workflow.ts` all import `workItemStore` directly — violates "no direct DB calls from route handlers."
2. **eslint-disable without rationale**: `useWorkItems.ts:63`, `DependencyPicker.tsx:82` suppress `react-hooks/exhaustive-deps` silently.
3. **Tests authored to fail**: `search.test.ts` tests a non-existent endpoint with a comment saying "will FAIL until route is implemented" — should use `describe.skip` instead.

### Useful Grep Patterns

```bash
# Find all active FR-IDs in source (actual format used)
grep -rn "Verifies:.*FR-" Source/ --include="*.ts" --include="*.tsx" -o

# Find untraced recently-modified files
git log --since="14 days ago" --name-only --pretty=format: -- Source/ | sort -u

# Architecture violation check (direct store in routes)
grep -rn "import.*store\|require.*store" Source/Backend/src/routes/

# Dead tests (should-fail tests without .skip)
grep -rn "NOT wired\|will FAIL\|not implemented" Source/Backend/tests/
```

### Open P1/P2 Findings (for re-verification next run)

| ID | Finding | Status |
|----|---------|--------|
| QO-001 | Traceability config pattern `FR-\\d+` matches no source IDs | OPEN |
| QO-002 | FR-001..069 entirely unimplemented in Source/ | OPEN |
| QO-003 | FR-TMP-001..010 entirely unimplemented | OPEN |
| QO-004 | Routes import store directly (3 files) | OPEN |
| QO-005 | GET /api/search not wired; search.test.ts will fail in CI | OPEN |
| QO-006 | FR-dependency-* requirements invisible to enforcer | OPEN |
