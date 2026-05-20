# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit 1 — 2026-05-20 · Grade C

### Specialist Availability Pattern
- **quality-oracle** and **dependency-auditor** always run static — never need live services.
- **performance-profiler** and **chaos-monkey** require live services. Backend (`localhost:3001`) and Frontend (`localhost:5173`) were offline on this run — both were skipped.
- **Always check service health** before dispatching perf/chaos agents. Use `curl -sf {url} > /dev/null 2>&1`.

### Handlebars Investigation Pattern (applies to any transitive CVE in test tooling)
When a P1 CVE is found in a transitive test dependency (e.g., via ts-jest → jest → handlebars), immediately run:
```bash
grep -r "handlebars\|\.compile\(\|\.precompile\(" Source/ --include="*.ts" --include="*.tsx" --include="*.js" -l
```
If empty → no runtime exposure, but still patch. The escalation to TheGuardians still applies to verify build pipeline isolation.

### Grading Config Reminder
```yaml
A: { max_p1: 0, max_p2: 3, min_spec_coverage: 80 }
B: { max_p1: 0, max_p2: 8, min_spec_coverage: 60 }
C: { max_p1: 2, max_p2: 15, min_spec_coverage: 40 }
D: { max_p1: 999 }  # anything worse
F: # exploitable auth bypass + critical domain failure
```
With 2 P1s, the grade cannot be better than C regardless of P2 count.

### Cross-Reference Identification
Two cross-references found in this audit:
1. **QO-003 + QO-004** — same root cause (service layer bypass), same fix pattern, different zones (portal/ vs Source/)
2. **DEP-001 + DEP-002** — both resolved by a single `npm upgrade --save-dev ts-jest jest`

Always look for these patterns in the findings to save remediation effort.

### Escalation Routing
- If DEP finding references CVE with CVSS ≥ 8.0 AND matches security_triggers in config → tag `[ESCALATE → TheGuardians]`
- If finding is runtime-only concern AND no production exposure → still escalate but note the context
- When no PR exists, print the escalation block to stdout (the non-gh branch of the escalation bash)

### Output Files Checklist
All three outputs are required per run:
1. `Teams/TheInspector/findings/audit-{date}-{grade}.html` — full 16-section HTML
2. `Teams/TheInspector/findings/bug-backlog-{date}.json` — machine-readable backlog
3. `inspector-report.md` (root) — summary for human review

### Grading History

| Date | Grade | P1 | P2 | P3 | P4 | Spec Coverage | Notes |
|------|-------|----|----|----|----|--------------|-------|
| 2026-05-20 | C | 2 | 6 | 7 | 2 | 97% | First audit. 5 failing tests. Services offline (perf/chaos skipped). |
