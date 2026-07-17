# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-17 — First full audit run

**Grade calculation:** The `inspector.config.yml` grade thresholds use `max_p1`, `max_p2`, and `min_spec_coverage` — apply ALL three conditions for each tier. With 4 P1s (exceeds C-grade max of 2), the overall grade is D even though Plans-based spec coverage is 100% and application code quality is B-range.

**Specialist availability:** performance-profiler and chaos-monkey cannot run when services are offline. Check `http://localhost:3001/` health before dispatching them. When skipped, note it explicitly in §4 Scope and §12 Latency Baselines so readers know the gap.

**Escalation path when no PR exists:** `gh pr view` exits with code 4 (not 1) when there is no open PR. Guard with `[ -n "$PR_NUM" ]` — fall through to console escalation notice when empty.

**Cross-reference map (§8) is high-value:** In this audit, 4 root-cause fixes resolved 9 of 14 P1+P2 findings (64% reduction). Always build this section — it directly drives sprint planning efficiency.

**Dependency auditor grade vs overall grade:** The dependency-auditor may assign D to its own domain while the quality-oracle assigns B. The overall grade must be computed fresh from combined counts using config thresholds — do not average specialist grades.

**`gh repo view` may fail in some CI environments** — capture stderr with `2>/dev/null` and handle empty REPO var gracefully.

**platform/ is solo-session only:** Any remediation recommendation for `platform/orchestrator` must note the solo-session ownership constraint. Pipeline agents (TheFixer) cannot touch that directory. Annotate clearly in the backlog.

**Report file naming:** The README specifies `audit-YYYY-MM-DD-{grade}.html`. The grade in the filename should be the OVERALL combined grade (D in this run), not any individual specialist's grade.

**First-audit trend section:** When no prior audit exists, `§5 Trend` and `§7 Re-Verification Summary` should state "First audit — no baseline" explicitly. Do not leave these sections empty or omit them.
