# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-02 — First Audit Run

**Grading calibration:**
- F grade was warranted: proxy-addr (CVSS 9.1) qualifies as "exploitable access-control bypass" even when the app has no formal auth layer, because IP-based controls via Express middleware are bypassed.
- The config's D threshold (`max_p1: 999`) means D catches everything from "slightly over C" to "catastrophic" — F is the correct grade when security escalations + critical domain failure both apply simultaneously.

**Specialist report reading:**
- quality-oracle writes both a root-level `quality-oracle-report.md` (summary) and a detailed file in `Teams/TheInspector/findings/audit-{date}-{grade}.md`.
- dependency-auditor writes a root-level `dependency-auditor-report.md` (summary) and detailed files in `Teams/TheInspector/findings/dependency-audit-{date}.md` + `.json`.
- Both summary reports are self-contained enough for synthesis; read the detailed reports for P1 exploit scenarios and CVE vectors.

**Cross-reference map construction:**
- Group by root cause, not by finding ID. "No CI npm audit gate" is the single root cause of all 17 DEP findings — one CI line fixes the systemic issue.
- The spec drift findings (QO-001, QO-002) are tightly coupled — fixing the enforcer (QO-001) would have surfaced QO-002 automatically if the enforcer had been running correctly.

**Dynamic testing gap:**
- When services are offline, performance-profiler and chaos-monkey must be skipped with a note in §4 and §12.
- Always document the expected latency budgets from `inspector.config.yml` in §12 so the next dynamic run has context.

**Escalation routing:**
- Security P1s + security P2s (path traversal, XSS, open redirect, injection) all go to TheGuardians.
- Non-security P1s (tooling defects, spec drift) go to TheFixer.
- The distinction matters: TheGuardians runs in an ephemeral isolated environment; TheFixer patches code in the normal pipeline.

**No-PR escalation:**
- When there is no open PR (`gh pr view` returns nothing), fall back to printing the escalation notice in the report itself (§ escalation banner) rather than running the gh pr comment command.
- Always capture BRANCH and AUDIT_ID in the printed notice for traceability.

**HTML report structure:**
- All 16 mandatory sections must be present even when data is empty (e.g., §14 Fixed Findings: "None — first audit").
- The risk matrix (§10) should show empty cells rather than omitting rows/columns.
- Use the grade color scheme: F=red, D=orange, C=yellow, B=blue, A=green.

**File naming:**
- HTML report: `audit-{date}-{grade}.html` in `Teams/TheInspector/findings/`
- JSON backlog: `bug-backlog-{date}.json` in `Teams/TheInspector/findings/`
- Root `inspector-report.md`: write the synthesis summary here (was empty on first run).
