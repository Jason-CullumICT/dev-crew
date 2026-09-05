# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-05 — First full audit (run-20260905-065749)

**Services were offline.** Both backend (localhost:3001) and frontend (localhost:5173) were unreachable at audit time. performance-profiler and chaos-monkey were skipped. Future runs should be triggered when services are running for full dynamic coverage.

**Traceability enforcer scope gap is a recurring systemic issue.** `tools/traceability-enforcer.py` only scans `Specifications/Implementation/` — the two largest spec files (`dev-workflow-platform.md` 69 FRs, `tiered-merge-pipeline.md` 10 FRs) are completely invisible. This is a P1 finding because the mandatory gate gives false assurance. Patch needed in `tools/traceability-enforcer.py` to glob all `Specifications/*.md`.

**Escalation trigger words to watch:** "injection", "arbitrary file read", "prototype pollution", "code execution", "sensitive data exposed" — all match config escalation triggers and must be routed to TheGuardians immediately, not TheFixer.

**Cross-reference grouping saves remediation time:** Grouping CVEs by upstream package (vite ecosystem = 6 findings / one upgrade; grpc-js = 3 findings / one upgrade; react-router = 3 findings / one upgrade) reduces remediation effort significantly. Always include cross-reference map in synthesis.

**Grade D thresholds:** With 4 P1s and 25% spec coverage, grade D was reached. C allows max 2 P1s and 40% coverage. The project needs QO-001 fixed (gate repair) and DEP-001/002/003 remediated (security upgrades) as minimum steps to progress toward grade C.

**First audit baseline:** This run establishes the baseline. All 40 findings are NEW. Next run will show FIXED/STILL OPEN/REGRESSED delta which is operationally much more valuable.

**Specialist report format:** Specialist reports arrive as summary .md files (quality-oracle-report.md, dependency-auditor-report.md at repo root) plus detailed findings in `Teams/TheInspector/findings/`. Always read the detailed findings files for full CVE/fix data — the summary files are condensed.
