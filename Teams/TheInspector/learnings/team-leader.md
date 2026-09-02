# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-02 — First audit run

1. **Dependency auditor grade dominates synthesis.** Quality oracle gave B, but dependency auditor gave D (1 P1 + 17 P2 instances). Synthesis grade must reflect the worst specialist grade when P2 counts exceed the next band's threshold. Always check per-project instance counts, not just unique package counts.

2. **Services were offline.** Both backend (localhost:3001) and frontend (localhost:5173) were unreachable. Performance profiler and chaos monkey were skipped. Always probe service health before scoping — note in report when dynamic testing is unavailable and flag it as a data caveat.

3. **Cross-reference mapping is valuable for remediation.** Three of the four root causes found map multiple findings to a single fix. Highlight these first in the report — they give the most leverage per engineering hour.

4. **Spec coverage can be misleading without the enforcer fix.** QO-003 shows that 85+ portal/ FRs are invisible to the traceability enforcer. The 93% coverage figure only covers the scanned scope. Future audits should note this caveat until QO-003 is fixed.

5. **OpenTelemetry major-version lag is a recurring risk.** portal/Backend's OTel stack being 2+ majors behind is the root cause of the P1 RCE. Monitor OTel releases closely; recommend Dependabot for this project.

6. **First-audit baseline:** All 25 findings are NEW. Grade D. Next audit should target: DEP-001 fixed (mandatory), QO-001/002/003 fixed, overall grade C or better.

7. **Report output path:** HTML report saves to `Teams/TheInspector/findings/audit-{date}-{grade}.html`. The dependency auditor saved a `.md` with the same `audit-2026-09-02-D.md` name — ensure HTML and MD don't collide on future runs (they won't — different extensions).
