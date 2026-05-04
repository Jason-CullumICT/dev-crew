# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-04 — First Audit Run

**Portal/ is a blind spot in tooling and config.**
- `inspector.config.yml` lists only `Source/` in `source.dirs` — this means QO and traceability checks miss the entire `portal/` application.
- Add `portal/` to `inspector.config.yml source.dirs` before the next scoping phase so specialists know to include it.
- The quality-oracle correctly identified this as QO-001; it should be in the default config going forward.

**Services were offline — static-only audit.**
- Neither backend (localhost:3001) nor frontend (localhost:5173) responded during scoping.
- performance-profiler and chaos-monkey were skipped.
- In static-only mode, the highest achievable grade is limited by CVE findings from dependency-auditor.
- Next run: start services first, then trigger audit for full dynamic coverage.

**P1 CVEs from transitive dependencies kill grade A/B immediately.**
- Handlebars 4.7.8 and protobufjs <7.5.5 are both CVSS 9.8 RCEs — not in direct dependencies but in transitive chains.
- The grading thresholds (A/B require max_p1: 0) are strict; any critical CVE drops the grade to C.
- Running `npm audit fix` across all projects before an audit would let the team achieve grade B if no P1s remain.

**`audit-2026-05-04-B.md` in findings/ was written by quality-oracle in this run — not a prior audit.**
- Do not mistake same-run specialist artifacts for prior audit baselines.
- Prior audit detection: look for HTML reports (audit-YYYY-MM-DD-GRADE.html) from a different date.
- This was the first audit; all findings were tagged NEW.

**platform/ requires solo-session for dependency updates.**
- DEP-011 (path-to-regexp in platform/orchestrator) and DEP-013 (dockerode) require a solo session, not TheFixer.
- Note this constraint explicitly in the Scope section of the report so TheFixer doesn't attempt to touch platform/.

**Escalation: no open PR in this run.**
- The escalation block correctly fell back to the terminal output path (no PR_NUM found).
- Branch: audit/inspector-2026-05-04-3d8291
