# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Audit Run: 2026-09-11

### Grading

- Config thresholds live in `Teams/TheInspector/inspector.config.yml` under `grading:`. Always read them before assigning a grade — do not use a fixed rubric.
- With 4 P1s (exceeds C max of 2), the grade is D even though spec coverage (47%) technically meets C's 40% floor.
- The F grade is reserved for "exploitable auth bypass + critical domain failure" per config comments. CVSS 9.8 CVEs alone do not force F — they are P1 and escalated, but the domain state machine remained intact.

### Scoping

- Both backend and frontend services were down during this audit. Always run `curl -sf {service.health}` early and record the result — it determines whether performance-profiler and chaos-monkey can run in dynamic mode. When services are down, their findings section must still appear in the report (with "skipped" mode clearly marked), not be omitted.
- `git log --oneline -10` showed only one commit on the audit branch. When the branch has minimal history, default to "full codebase" scope rather than "changes since {date}" to avoid missing existing debt.

### Report Structure

- All 16 mandatory sections must appear even when data is absent — use "None" or "First audit — no baseline" rather than removing sections.
- The Cross-Reference Map (§8) is the highest-value synthesis output. Build it by clustering findings that share a root cause. The key question: "What single change resolves multiple findings?" Three of the four root cause clusters in this audit have compounding effects (e.g., fixing vitest@5.0.0 resolves both DEP-002 P1 and DEP-009 P3).
- Spec coverage bar charts in §11 are more actionable than a single number — show per-plan breakdown so the team knows exactly which plans to dispatch.

### Escalation

- The escalation fallback (printf path) runs when `gh repo view` and `gh pr view` both return empty. This is normal in standalone audit branches without an open PR. Always include: Finding ID, one-line description, branch, audit ID, and the next step (read TheGuardians/team-leader.md).
- When escalating multiple findings to TheGuardians, consolidate them in one escalation call with a multi-line finding description rather than one call per finding.

### Synthesis Anti-Patterns to Avoid

- Do not deduplicate findings that happen to affect the same package (DEP-003 through DEP-007 are separate CVEs with separate CWEs even if all patched by `npm audit fix` — keep them as individual backlog items).
- Do not drop the performance-profiler and chaos-monkey sections from the HTML when they skipped — operators need to know these gaps exist and what to do to enable them next time.
- Always route spec-drift P1s to TheFixer backlog (dispatch TheATeam) — they are NOT TheGuardians items unless the unimplemented feature is itself a security control.

### Tooling Notes

- `tools/pipeline-update.sh` script with `--action init` returns a RUN_ID to use for all subsequent updates. Always capture this and pass it to `--action complete` at the end.
- The traceability enforcer `python3 tools/traceability-enforcer.py` (without `--file`) silently passes on this codebase because it targets only the most recently modified plan. Always run it with `--file` for each plan when auditing coverage. This is a P2 finding (QO-003) that should be fixed in the tool itself.

### Next Audit Targets

- Grade B requires: 0 P1, ≤8 P2, ≥60% spec coverage
- Path to B: resolve 4 P1s (patch DEP-001/DEP-002 + dispatch QO-001/QO-002 to TheATeam) and reduce P2 from 14 to ≤8 (npm audit fix handles 12 of them)
- Enable performance-profiler + chaos-monkey by starting services before the next audit run
