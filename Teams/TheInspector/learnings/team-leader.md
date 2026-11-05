# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-05 — First full audit run

1. **Static-only audits are common** — both backend (localhost:3001) and frontend (localhost:5173) were offline during this run. Performance-profiler and chaos-monkey were skipped. Plan for static-only as the default; dynamic is the bonus.

2. **Dependency auditor surfaces the most P1s** — in this codebase the dependency vulnerability load (125 vulns, 12 critical) far outweighed code-quality findings (1 P1 from quality-oracle). Budget for a large finding set from dependency-auditor.

3. **Cross-reference groups are high-ROI for remediation** — grouping XREF-001 (Vite/Vitest toolchain) collapsed 6 findings into one upgrade command. Surface these prominently in the report.

4. **portal/Backend is a dependency hotspot** — 61 vulnerabilities, worst in the codebase. Flag it explicitly rather than burying it in the per-project table.

5. **Grade can be misleading without dynamic data** — static-only D grade may become C or B once performance-profiler and chaos-monkey run and don't surface new P1s. Note this caveat clearly in the report.

6. **Traceability enforcer coverage gap is a meta-bug** — QO-004 (enforcer doesn't cover FR-dependency-*) caused QO-001 and QO-002 to slip through the gate. Worth flagging this pattern: when the enforcer passes but features are broken, it means the enforcer is under-scoped.

7. **gh pr view exits non-zero when no PR exists** — the escalation script uses `|| true` pattern mentally, but actually fails silently. Use the printf fallback unconditionally when PR detection errors, as the error code is 4 (not 1). The current script handles this correctly via the `else` branch.

8. **F grade threshold requires both conditions** — "exploitable auth bypass + critical domain failure" means BOTH must be true simultaneously. DEP-001 is an auth bypass but the app has no auth layer, reducing impact. QO-001 breaks a feature but not the core domain. Graded D (6 P1s) rather than F.
