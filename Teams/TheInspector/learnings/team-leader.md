# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-11-11 — First audit run (`run-20261111-091014`)

### Grade
F — first audit to trigger the F threshold (exploitable auth bypass + RCE vectors in npm dependency chain).

### Synthesis notes
- Both dynamic specialists (performance-profiler, chaos-monkey) were skipped because backend:3001 and frontend:5173 were down in the CI environment. The audit scope was static-only. **Always check service health before dispatching specialists** and note which specialists ran in the report header.
- quality-oracle reported grade **D** internally; dependency-auditor found 12 P1 CVEs. The combined P1 count (7 grouped findings) + exploitable auth bypass (DEP-004) pushed the final grade to **F** per `inspector.config.yml` F-threshold rule. The two grading systems must be reconciled during synthesis — the final grade is always the team-leader's call, not the max of the specialist grades.
- DEP-004 (proxy-addr IP spoofing) is a zero-credential auth bypass — this is the clearest F trigger. When proxy-addr appears in the dependency tree, check Express version first.

### Traceability enforcer false-pass (QO-007)
The enforcer at `tools/traceability-enforcer.py` auto-selects the **most recently modified** `requirements.md` only. It reported TRACEABILITY PASSED while 34 FRs in older plans were completely untraced. This is a systematic blind spot — flag it as P2 in every audit until fixed.

### Spec coverage calculation
Four specs scanned; two had 0% coverage. Blended: (13+15+0+0)/(13+16+34+10) = 28/73 ≈ 32%. Use the blended percentage for grading, not any single spec's coverage.

### Dependency audit de-duplication
The dependency-auditor reported 123 total vulnerabilities across 5 projects, but many CVEs affect multiple projects (e.g., proxy-addr appears in 3). Group by CVE root (not by project instance) for the P1/P2 count in the HTML report to avoid inflating severity scores.

### Escalation routing
When no PR is open and `gh` is unavailable, use the terminal escalation fallback (printf block). Post the escalation output prominently before the report summary so it is not overlooked.
