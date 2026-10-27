# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-27 — First Audit Run

1. **Spec-drift-report.json is unreliable as a coverage source.** The traceability enforcer reported 0% coverage because FR-WF-* IDs live in `Plans/` rather than `Specifications/`. Always use the quality-oracle's independent analysis as the authoritative coverage figure, not the enforcer JSON.

2. **Services were offline for this run.** Both backend (localhost:3001) and frontend (localhost:5173) were unreachable. performance-profiler and chaos-monkey must be skipped when services are down. Document this clearly in the scope section — do not attempt dynamic tests or fabricate results.

3. **Two commands clear 4 of 5 P1s.** `npm update express` and `npm update vitest` are independent single-package upgrades that together resolve 4 critical CVEs (DA-001, DA-002, DA-003, DA-004). Surface this in the cross-reference map to make remediation priority obvious.

4. **Cross-reference map (Section 8) is the highest-value synthesis output.** Operators act on "one fix, many findings" groupings more readily than on an undifferentiated list. Build it first before writing the recommendations section.

5. **Grade is driven by the dependency auditor when CVEs are present.** Quality code can earn a B from quality-oracle while the overall grade is D due to critical CVEs. The grading formula uses combined P1/P2 counts, so dependency findings dominate unless they are fixed.

6. **Escalation routing:** When proxy-addr (IP spoofing) and Vitest (arbitrary file access) appear in the same audit, both are TheGuardians escalations — they meet "auth bypass" and "injection" triggers respectively. Code-quality P1s (missing routes, test gaps) go to TheFixer.

7. **`dev-workflow-platform.md` exclusion.** The 69 FRs in this legacy spec inflate the "uncovered requirements" count significantly. Always exclude it from the active coverage calculation and note the exclusion in the scope section.
