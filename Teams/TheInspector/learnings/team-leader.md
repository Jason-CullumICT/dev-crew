# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-05-15 — First Full Audit (Synthesis Run)

### Project Layout (Critical Context)

This repo has **three separate implementation surfaces**, each with its own scope:

| Surface | Spec | Notes |
|---------|------|-------|
| `Source/` | `workflow-engine.md`, `Plans/self-judging-workflow/` | FR-WF-001 to FR-WF-013 + FR-dependency-* |
| `portal/` | `Specifications/dev-workflow-platform.md`, `Plans/dev-workflow-platform/` | FR-001 to FR-069 + FR-dependency-* |
| `platform/orchestrator/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 |

### Grade Calculation Pattern

When dependency-auditor finds P1 CVEs, the overall grade drops at least one level from what quality-oracle alone would assign. In this run:
- quality-oracle standalone: B (4 P2s, 0 P1s)
- dependency-auditor added 2 P1s → overall grade became C

### Synthesis Rules Learned

1. **Escalation threshold:** DEP P1s automatically require `[ESCALATE → TheGuardians]` even if they're patch-level fixes. The presence of RCE in platform/ is always a blocker.

2. **Cross-reference grouping saves remediation effort:** Four finding groups share a root cause — grouping them in the Cross-Reference Map means TheFixer can resolve 4 DEP findings with one `npm update vite` command.

3. **No PR open:** When no PR is detected (`gh pr view` returns empty), use the printf fallback for escalation. The branch name and audit ID are sufficient context.

4. **Performance/chaos absent:** If specialists don't submit reports (services offline or not dispatched), mark them as "not submitted" in Section 6, note the data gap in Section 4 (Scope & Environment), and use "No data" placeholder in Section 12 (Latency Baselines). Do NOT omit those sections.

5. **First audit baseline:** When `inspector-report.md` is empty (1 line), treat as first run — all findings are NEW, Section 5 (Trend) = "First audit — no baseline", Section 7 (Re-Verification) = all NEW.

### Grading Thresholds (from inspector.config.yml)

| Grade | max_p1 | max_p2 | min_spec_coverage |
|-------|--------|--------|-------------------|
| A | 0 | 3 | 80% |
| B | 0 | 8 | 60% |
| C | 2 | 15 | 40% |
| D | 999 | — | — |
| F | exploitable auth bypass + critical domain failure |

**Key insight:** Any P1 at all eliminates A and B. Even one P1 → C (if P2 ≤ 15 and coverage ≥ 40%).

### Output File Locations

Per `inspector.config.yml`:
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Markdown summary: `inspector-report.md` (root — required deliverable)

### Dashboard Pattern

```bash
# Init at synthesis start:
RUN_ID=$(bash tools/pipeline-update.sh --team TheInspector --action init \
  --agent team_leader --name "Team Leader" --model sonnet \
  --metrics '{"task_title": "System Health Audit — Synthesis Phase"}')

# Complete after report written:
bash tools/pipeline-update.sh --team TheInspector --run "$RUN_ID" \
  --agent team_leader --action complete --verdict passed \
  --metrics '{"grade": "C", "p1_total": 2, "p2_total": 5}'
```

### Escalation Routing

- `[ESCALATE → TheGuardians]`: auth bypass, injection, hardcoded secrets, RCE CVEs, missing access control
- `[ESCALATE → TheFixer]`: spec-drift, architecture violations, missing tests, tooling gaps, P2 CVEs (non-RCE)

### What a Good Synthesis Includes

The 16-section HTML report with all sections populated (even if "None" or "No data"). Sections 8 (Cross-Reference Map) and 10 (Risk Matrix) require the most judgment — invest time there as they give operators the clearest remediation path.

---

_Last updated: 2026-05-15_
