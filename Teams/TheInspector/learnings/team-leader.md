# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-07-26 (run-20260726-054655)

**Grade: C** · P1: 1 · P2: 5 · Spec coverage: ~97% (Source/ active scope)

#### Grading application
- Config thresholds require P1=0 for grades A or B. Any P1 finding locks the grade at C or below.
- Source/ active scope (excl. platform/) is ~97%. Effective coverage looks healthy; the apparent 0% on FR-TMP-* is a scope annotation issue, not a real gap.

#### Service availability
- Both backend (`:3001`) and frontend (`:5173`) were offline at audit time.
- performance-profiler and chaos-monkey were skipped entirely — no dynamic findings in this report.
- Always check services first; note in report header if specialists were skipped.

#### Specialist report parsing
- quality-oracle: delivers a structured `quality-oracle-report.md` in the repo root with Grade, P1/P2/P3/P4 sections.
- dependency-auditor: delivers a summary report in the repo root AND detailed files in `Teams/TheInspector/findings/`. Read both — the root report has the P1/P2/P3/P4 classification; the findings/ files have full CVE detail.
- Check both locations before synthesis.

#### Escalation routing (this run)
- QO-001 (missing route) is P1 functional, not a security escalation trigger. Routes to TheFixer.
- No findings matched security escalation criteria (auth bypass, injection, sensitive data, hardcoded secret, missing access control).
- Always compare each P1 finding against `config.escalation.security_triggers` before routing.

#### Cross-reference discipline
- Three root causes span multiple findings: (1) missing search route → QO-001+QO-007, (2) missing enum value → QO-002+QO-003, (3) service layer bypass → QO-004+QO-001*.
- Surfacing these cross-refs in §8 is the most actionable part of the report for TheFixer.

#### Audit trend table
| Run ID | Date | Grade | P1 | P2 | Spec Coverage | Notes |
|--------|------|-------|----|----|---------------|-------|
| run-20260726-054655 | 2026-07-26 | C | 1 | 5 | ~97% | First audit. Static only. 2/4 specialists. |
