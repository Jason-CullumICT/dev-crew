# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## 2026-07-21 — First Full Audit

### Architecture: Two Separate Applications

This repo contains **two distinct apps**:
1. **`Source/`** — The self-judging workflow engine (FR-WF-*); in-memory work item store with assessment pod, router, dependency tracking
2. **`portal/`** — The dev-workflow-platform (FR-001 through FR-095); SQLite-backed app with feature requests, bug reports, dev cycles, pipeline stepper

The traceability enforcer hardcodes `source_dirs = ["Source", "E2E"]` and **never scans `portal/`**. Running the enforcer against `Specifications/dev-workflow-platform.md` reports 76 MISSING even though 74/76 are implemented in portal/. Always include `portal/` when checking platform spec coverage.

### Enforcer Plan Selection Is Fragile

Default mode selects the most recently modified `requirements.md` in `Plans/`. All 8 plans have nearly identical mtimes (~6ms spread). In practice, `self-judging-workflow/requirements.md` always wins (highest mtime: 1784611663.713989). Run with `--plan` or `--file` to target specific plans.

### Enforcer Regex Matches Data IDs

`FR-[A-Z0-9-]+` is too broad — it matches seed-data item IDs in spec prose (e.g., `FR-0004`, `FR-0007` which are feature request doc IDs, not requirement IDs). Also matches template placeholders `FR-XXX`, `FR-XXXX`, `FR-0XX`. These create phantom MISSING reports.

### FR ID Scheme Inconsistency

The `dependency-linking` plan uses `FR-dependency-*` IDs internally but its spec header says `FR-070 — FR-085` from `Specifications/dev-workflow-platform.md`. These are the same features but with different naming. No code file says `// Verifies: FR-070`, so the canonical spec reference can never pass the enforcer. If asked to check this plan, note the mismatch.

### Portal Files Without Traceability (as of 2026-07-21)

- `portal/Frontend/src/pages/TeamsPage.tsx` — no Verifies comment
- `portal/Frontend/src/components/common/RepoSelector.tsx` — no Verifies comment
- `portal/Backend/src/routes/teamDispatches.ts` — no Verifies comment

These relate to the orchestrator cycle dashboard feature. Check `Plans/orchestrator-cycle-dashboard/requirements.md` for matching FR IDs.

### Fast Audit Paths

- **All FR IDs in Source/**: `grep -rn "Verifies:" Source --include="*.ts" --include="*.tsx" | grep -oE "FR-[A-Z0-9-]+" | sort -u`
- **Portal FR coverage check**: `python3 -c "..."` (see audit-2026-07-21 for full script)
- **Recently modified files**: `git log --since="14 days ago" --name-only --pretty=format:"" | grep "^Source/"  | sort -u`
- **No skipped tests** as of this audit
- **No hardcoded secrets** as of this audit
- **No console.log in production** as of this audit

### Spec Coverage Trend

| Date | self-judging-workflow | dev-workflow-platform (with portal) | Grade |
|------|-----------------------|-------------------------------------|-------|
| 2026-07-21 | 100% (13/13) | 100% (74/74 real FRs) | B |

Declining areas: enforcer gate coverage (structural tool issue, not implementation drift).
