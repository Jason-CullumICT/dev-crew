# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-15 — First audit run

1. **Services were offline during audit.** Backend (port 3001) and frontend (port 5173) were not running when the audit started. performance-profiler and chaos-monkey were skipped entirely. For future runs: check service availability early and note which specialists will be in static fallback mode in the scope output.

2. **Spec corpus mismatch is a governance P1, not just a coverage gap.** `Specifications/dev-workflow-platform.md` describes a different application (SQLite-backed platform for feature requests) than what Source/ implements (in-memory workflow engine). The traceability enforcer reports 100% green by reading `Plans/` only — masking this. This needs a dedicated reconciliation session, not a code fix.

3. **Traceability enforcer gap is a systemic risk.** The enforcer at `tools/traceability-enforcer.py` only validates `Plans/*/requirements.md`. All findings in `Specifications/` are invisible to the CI gate. Fix: extend the enforcer to also traverse `Specifications/` and enforce traceability comments there.

4. **Jest v29 cascade is one fix, not 33 separate bugs.** The 33 high-severity CVEs in the dependency report all resolve with a single `npm update jest@30.5.2`. In the synthesis, collapse these into one P2 cluster with a note — don't let 33 individual CVEs inflate the P2 count in a way that obscures the actual remediation effort.

5. **XREF-A (testing framework), XREF-B (spec drift), XREF-C (React Router + search route) are the three root-cause clusters** for this project. Fixing each cluster's root cause resolves 3–36 individual findings. The cross-reference map is the most actionable section of the report for TheFixer.

6. **Grade D was driven entirely by P1 count (6 > 2).** Spec coverage at 67% met the C floor (40%). The dependency P1s (4 CVEs) pushed the combined count above the C-grade maximum. Upgrading the two test frameworks (jest + vitest) would eliminate 3 of the 4 dependency P1s, and fixing the spec reconciliation eliminates 2 QO P1s — after which the system would likely grade B.

7. **No prior audit baseline exists.** First run establishes the baseline. The trend section will be useful starting from the second audit. Next target: 2026-10-22 after Phase 1 remediation.

8. **Escalation console output (no PR/repo context):** When `gh pr view` and `gh repo view` both fail (exit code 4), use the console printf escalation format. Include finding IDs, CVSS scores, and branch name so TheGuardians can act without reading the full report.
