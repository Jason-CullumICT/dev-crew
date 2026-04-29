# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run History

| Date | Grade | P1 | P2 | P3 | P4 | Escalations | Specialists Active |
|------|-------|----|----|----|----|-------------|-------------------|
| 2026-04-29 | D | 3 | 10 | 25 | 2 | 2 (→ TheGuardians) | quality-oracle, dependency-auditor |

---

## Learnings

### Multi-App Repository Structure
This repo contains **three separate applications** — important for coverage interpretation:
- `Source/` — Workflow Engine (primary app, main focus of quality-oracle)
- `portal/` — Dev Workflow Platform (portal app, separate spec FR-001..069)
- `platform/` — Orchestrator Infrastructure (solo-session only, FR-TMP-001..010)

Do NOT treat 0% portal/platform coverage as a regression — these have different spec scopes.

### Grading Thresholds (from inspector.config.yml)
- **A**: max_p1=0, max_p2=3, min_spec_coverage=80%
- **B**: max_p1=0, max_p2=8, min_spec_coverage=60%
- **C**: max_p1=2, max_p2=15, min_spec_coverage=40%
- **D**: anything worse (>2 P1)
- **F**: reserved for exploitable auth bypass + critical domain failure

### Service Availability Check
Backend: `http://localhost:3001/`
Frontend: `http://localhost:5173`
Both offline during 2026-04-29 audit → performance-profiler and chaos-monkey ran in static mode only.
Always check service status before dispatching performance-profiler and chaos-monkey.

### Grade Calculation Pattern
1. Collect P1/P2 from ALL specialists (dependency P1 counts as P1!)
2. Compare total P1 against thresholds: C allows ≤2, B allows 0
3. If total P1 > 2 → Grade D regardless of P2 count
4. Document escalations separately — they count toward grade but route to TheGuardians not TheFixer

### Escalation Decision Matrix (from inspector.config.yml)
Route to TheGuardians if finding involves:
- auth bypass, injection, sensitive data exposed, hardcoded secret, missing access control
- **Also:** dependency CVEs with CVSS ≥9.0 (RCE risk) — always escalate even if not in trigger list
Route to TheFixer for everything else (functional bugs, spec drift, architecture violations).

### Cross-Reference Map Tips
When multiple findings share a root cause, the Cross-Reference Map (Section 8) is the highest-value section for remediation planning. Group by:
1. Same vulnerable package family (DEP-001, DEP-002, DEP-003)
2. Same incomplete feature (QO-004, QO-005, QO-006, QO-007 — all dependency-linking)
3. Same observability gap (QO-002, QO-003 — both Source/Backend observability)

### Watch List for Next Audit
| ID | Finding | Priority |
|----|---------|----------|
| DEP-001 | Handlebars RCE — verify patch applied | P1 |
| DEP-002 | Protobufjs RCE — verify upgrade applied | P1 |
| QO-001 | /api/search route wired in app.ts | P1 |
| QO-007 | pending_dependencies status added to WorkItemStatus | P2 |
| QO-002 | OTel tracing added to Source/Backend | P2 |

### Output Files Convention
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- Bug backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (repo root)
