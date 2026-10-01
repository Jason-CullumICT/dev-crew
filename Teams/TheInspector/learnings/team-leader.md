# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-01 — First Full Audit (Grade: D)

**Grading with config thresholds:**
- Config key: `grading.C.max_p1: 2` — if P1 count > 2, grade falls to D automatically.
- Never compute grade from specialist sub-grades alone; always apply config thresholds to the combined P1/P2 counts.
- Total P1 count = sum of all specialist P1 findings (QO + DEP + perf + chaos).

**Service availability check matters:**
- Backend (localhost:3001) and frontend (localhost:5173) were both offline.
- performance-profiler and chaos-monkey were skipped; mark as "not run" in Section 6.
- Static-only audit still yields grade-relevant findings; do not wait for services to produce an output.

**Security escalation triggers:**
- The word "injection" anywhere in a finding description or category triggers `[ESCALATE → TheGuardians]`.
- Check all findings (not just P1s) — DEP-007 (form-data CRLF injection) was P2 but still triggered escalation.
- protobufjs RCE on orchestrator: route to solo-session/platform-maintainer, NOT TheFixer (platform/ is solo-session only).

**Dependency auditor produces high finding counts:**
- Dependency audit can generate 15+ findings across severity levels; group the P2 DoS CVEs together in the executive summary to avoid overwhelming operators.
- Cross-reference: single CI enforcement gate (`npm audit --audit-level=high`) resolves all 13 DEP-00x findings permanently.

**Cross-reference map is critical:**
- Section 8 should identify that adding `npm audit` to CI resolves 13 findings in one action — make this the first recommendation.
- Enforcer blind-spot (QO-001) and spec-drift (QO-002) share the same root cause — flag together.

**Trend section on first audit:**
- Always note "First audit — no baseline" explicitly. All findings are NEW. Next audit date = audit_date + 7 days.

**File output paths (from config):**
- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary MD: `inspector-report.md` (repo root)
