# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-23 — First Audit Run

**Specialist report format inconsistency**
The dependency-auditor wrote its findings as a freeform Markdown summary in `dependency-auditor-report.md`, but also produced a structured JSON at `Teams/TheInspector/findings/dependency-audit-2026-09-23.json`. Always read the JSON for synthesis — it contains exact CVE counts, CVSS scores, and module breakdowns that the prose summary may approximate. Prose summaries are useful for the executive summary; JSON is authoritative for scorecard numbers.

**quality-oracle report location**
The quality-oracle wrote its findings to `quality-oracle-report.md` in the repo root AND to `Teams/TheInspector/findings/quality-oracle-2026-09-23.md`. Both are identical. The root-level file is what the parent session reads for synthesis.

**Services were offline — two specialists produced no output**
performance-profiler and chaos-monkey were not run because both backend (localhost:3001) and frontend (localhost:5173) were offline. Neither produced a static-mode report either. The HTML report sections for latency baselines and chaos results are therefore empty. In future runs, check service availability early and surface this as a caveat prominently in the scope section — operators need to know these sections are incomplete.

**Grading note: F vs D boundary**
The dependency-auditor self-graded F based on raw CVE severity. The team-leader config says "F is reserved for: exploitable auth bypass + critical domain failure." The CVSS 9.8 vitest finding is a dev-server vulnerability (not a production auth bypass), and the RCE in protobufjs requires network access to the orchestrator with attacker-controlled protobuf messages. Grading was set to D to reflect process + security severity while routing the security findings to TheGuardians, the appropriate team. Document this reasoning in future grading rationale sections.

**platform/ findings must note the solo-session restriction**
DEPS-003 (protobufjs RCE in platform/orchestrator) requires a fix in `platform/` — which is solo-session only per CLAUDE.md. The fix command must be annotated with this restriction in both the JSON backlog and the HTML report so pipeline agents don't accidentally touch it.

**Escalation block: no PR/repo context available**
The escalation bash block (for posting a GitHub PR comment) silently fails when not in a GitHub Actions context (`gh pr view` returns nothing, `gh repo view` may also fail). The plain-text fallback prints to stdout, which is fine. Prefer the fallback message in solo/local contexts; include the PR comment path only in CI pipeline contexts.

**Cross-reference map is high value**
Three root-cause groups emerged: (1) missing npm audit gate in CI (covers 11 CVE findings), (2) plan docs not maintained post-implementation (covers 2 traceability findings), (3) inconsistent error handling (covers 2 correctness findings). The cross-reference map section of the HTML report is worth the effort — it shows that a single CI hook change closes 11 findings at once.

**Next audit checklist**
- Start services before invoking TheInspector: `npm run dev` in Source/Backend and Source/Frontend
- Run `python3 tools/traceability-enforcer.py --all` (once QO-001 is fixed) against all plans
- Check for resolution of all 5 P1 findings before grading
- Compare against `Teams/TheInspector/findings/bug-backlog-2026-09-23.json` for FIXED/STILL OPEN/REGRESSED status
