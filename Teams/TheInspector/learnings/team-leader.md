# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-05-22 — First Full Synthesis (run-20260522-062207)

### Grading & Thresholds
- With 4 P1 findings (2 RCE CVEs + 2 architecture violations), grade was D despite 88% spec coverage. Spec coverage alone cannot raise the grade if P1 count exceeds the threshold.
- Config `grading.C.max_p1: 2` is the binding constraint most audits will hit first — dependency CVEs from transitive chains easily generate 2+ P1s.

### Service Availability
- Services at localhost:3001 and localhost:5173 were offline. This silenced both performance-profiler and chaos-monkey.
- Recommend surfacing a "partial audit" warning prominently when 2 of 4 specialists are skipped.

### Specialist Reports Location
- Specialist summaries are written to root-level `*-report.md` files (e.g., `quality-oracle-report.md`, `dependency-auditor-report.md`).
- Full detailed findings are in `Teams/TheInspector/findings/`.

### Cross-Reference Patterns
- The enforcer scope gap (QO-001) and ghost requirements (QO-002) are always co-occurring: if the enforcer can't see Specifications/, it can't detect phantom FR IDs. Always group them in synthesis.
- Transitive CVEs in the same project directory always collapse into one npm update command — group DEP-002, DEP-003, DEP-008, DEP-009 together for platform/orchestrator.

### Escalation
- No active PR was found on the audit branch, so escalation fell back to console output. This is the expected path in CI/CD pipelines without open PRs.
- Both escalated findings (DEP-001, DEP-002) were injection-class (template injection + prototype pollution RCE) — always route these to TheGuardians regardless of fix simplicity.

### Output Files
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (root level)
- Prior HTML report filename encodes grade — useful for at-a-glance trend in directory listing.
