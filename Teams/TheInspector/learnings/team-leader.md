# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-05 — First Full Audit (run-20260505-052833)

**Project Structure Quirks:**
- This project has THREE source directories that matter: `Source/` (main app), `portal/` (debug UI), and `platform/` (orchestration infrastructure). The `inspector.config.yml` only lists `Source/` in `source.dirs` — a known blind spot that QO-001 tracks.
- `platform/` is solo-session territory and pipeline agents must NOT touch it. However, adding `// Verifies:` comments there is acceptable in a solo session.
- The traceability enforcer defaults to the most-recently-modified `Plans/*/requirements.md` — this means it scans only 1 of 3 active specifications. Always specify `--file` explicitly when running the enforcer in audit context.

**Grade Calibration:**
- Quality oracle gave itself Grade B (0 P1, 3 P2, 82% coverage).
- Dependency auditor gave itself Grade C (2 P1 CVSS 9.8).
- Combined grade: **C** — the P1 CVEs from dependency-auditor pull the grade below B even though quality-oracle was clean on security.
- The `config.grading` thresholds are: A (max_p1=0, max_p2=3, ≥80% coverage), B (max_p1=0, max_p2=8, ≥60%), C (max_p1=2, max_p2≤15, ≥40%). A single P1 drops you out of A and B.

**Cross-Reference Patterns:**
- When a feature appears without a spec FR, expect a cascade: architecture violations (no service layer), missing traceability, and unlinked files all cluster around the same un-spec'd feature. The `teamDispatches` route was the primary example here.
- OpenTelemetry is a recurring risk surface in this repo — it transitively brings in protobufjs which has a critical CVE. Watch this on every dep audit.

**Service Availability:**
- Neither backend (localhost:3001) nor frontend (localhost:5173) was available during this audit cycle. This blocked performance-profiler and chaos-monkey entirely. Next audit should target a time when services are running to get full 4-specialist coverage.

**Escalation:**
- Both P1 findings (DEP-001, DEP-006) are security vulnerabilities requiring TheGuardians, not TheFixer. The dependency-auditor had already marked DEP-006 for escalation in its own report. Confirm the escalation status in the next cycle before routing to TheFixer.

**Report Paths (this project):**
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- Bug backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Quality oracle detail: `Teams/TheInspector/findings/audit-{date}-{specialist-grade}.md`
- Dependency detail: `Teams/TheInspector/findings/dependency-audit-{date}.md`
