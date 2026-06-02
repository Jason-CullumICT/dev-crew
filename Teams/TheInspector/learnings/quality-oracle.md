# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## 2026-06-02 — First full audit

### Repository Structure (Critical Context)

This repo has TWO separate applications, not one:

| App | Source Dir | Spec | Plan Requirements |
|-----|------------|------|-------------------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013) |
| Dev Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | `Plans/dev-workflow-platform/requirements.md` (FR-001..032) |
| Tiered Merge Pipeline | `platform/orchestrator/` | `Specifications/tiered-merge-pipeline.md` | inline requirements (FR-TMP-001..010) |

The CLAUDE.md `Source/` directory is the workflow engine app, not the portal. The portal is described as "Debug UI" but contains a complete full-stack Express+React application with its own backend, frontend, shared types, and 29 test files.

### Traceability Enforcer Scope Gap (P1 — Open)

`tools/traceability-enforcer.py` hardcodes scan dirs to `["Source", "E2E"]`. When run against dev-workflow-platform requirements, it reports all 34 FRs as MISSING because implementation is in `portal/`. The tool passes silently for the wrong plan.

Fix: add `portal` to `source_dirs` list at line 70 in the enforcer. Or accept a `--source-dirs` CLI flag.

### Key File Paths for Fast Future Audits

| What to check | Where |
|---------------|-------|
| Spec requirements (workflow engine) | `Plans/self-judging-workflow/requirements.md` |
| Spec requirements (portal) | `Plans/dev-workflow-platform/requirements.md` |
| Portal backend services | `portal/Backend/src/services/*.ts` |
| Portal backend routes | `portal/Backend/src/routes/*.ts` |
| Portal frontend tests | `portal/Frontend/tests/*.test.tsx` |
| Source backend services | `Source/Backend/src/services/*.ts` |
| Architecture rules | `CLAUDE.md` → Architecture Rules section |

### Pattern: Extended FRs Only in Plans

The canonical spec `Specifications/dev-workflow-platform.md` stops at FR-069. Implementation goes to FR-095 + FR-dependency-* + FR-DUP-*. These live only in Plans documents. When cross-referencing "is this spec requirement implemented?", check Plans/ not just Specifications/.

### Known Open Issues (as of 2026-06-02)

- **QO-001 (P1):** Enforcer doesn't scan `portal/` — all portal FRs report false-missing
- **QO-002 (P2):** `platform/Dockerfile.worker` missing `# Verifies: FR-TMP-008`
- **QO-003 (P2):** `portal/Backend/src/routes/teamDispatches.ts` has raw `db.prepare()` in route handlers
- **QO-004 (P2):** `teamDispatches.ts` has zero traceability + inline `interface TeamDispatch`
- **QO-005 (P2):** Missing `DependencySection.test.tsx` and `BlockedBadge.test.tsx` in portal/Frontend/tests/
- **QO-006 (P2):** `BlockedBadge.tsx` and `DependencySection.tsx` use wrong ID `FR-0001` (should be `FR-dependency-blocked-badge` / `FR-dependency-section`)
- **QO-007 (P3):** 212 `console.log` calls in `platform/orchestrator/`
- **QO-008 (P3):** Canonical spec not updated to include ~60 extended FRs
- **QO-009 (P3):** `Source/Backend/src/routes/workflow.ts` calls store directly (no workflowService.ts)

### Useful Commands

```bash
# Run enforcer for self-judging-workflow (Source/ scan) — WORKS
python3 tools/traceability-enforcer.py

# Run enforcer for portal app — BROKEN (scans Source/ not portal/)
python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md

# Manual portal traceability check:
grep -rn "Verifies:" portal/ | grep -oP "FR-[A-Z0-9-]+" | sort | uniq

# Check FR-TMP coverage:
grep -rn "FR-TMP" platform/ | grep -oP "FR-TMP-[0-9]+" | sort | uniq

# Find files missing Verifies: in portal routes/services:
for f in portal/Backend/src/routes/*.ts; do
  count=$(grep -c "Verifies:" "$f"); [ "$count" = "0" ] && echo "UNLINKED: $f"
done
```

### Spec Coverage Trend

| Date | Coverage | P1 | P2 | P3 |
|------|----------|----|----|----|
| 2026-06-02 | 98% (56/57) | 1 | 5 | 3 |
