# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-14 — First audit run

1. **portal/ is a blind spot in the traceability enforcer.** The enforcer scans only `Source/` and `E2E/`. All portal code (FR-001–069) is invisible. This causes QO-001, QO-002, QO-003 to persist undetected. Until QO-006 is fixed, manually cross-check `portal/` in scoping phase.

2. **Dependency auditor grade can dominate overall grade.** Quality oracle graded B (0 P1, 6 P2), but dependency auditor found 2 P1 CVEs, pulling the overall grade to C. Always apply the combined-findings grade formula from `inspector.config.yml §grading`, not each specialist's individual grade.

3. **Services were offline — performance-profiler and chaos-monkey were not run.** The audit is incomplete without dynamic testing. The static checks noted in §12 of the report are not substitutes for real latency measurements. Flag this clearly in the Scope section and recommend a re-run with live services.

4. **First audit baseline saved at:** `Teams/TheInspector/findings/audit-2026-07-14-C.html` and `Teams/TheInspector/findings/bug-backlog-2026-07-14.json`. Next audit should compare against this to populate FIXED / STILL OPEN / REGRESSED columns.

5. **Escalation trigger for DEP findings:** CRLF injection and memory disclosure both hit the security escalation triggers ("injection" and "sensitive data exposed"). Route these to TheGuardians alongside explicit RCE/bypass findings.

6. **Cross-Reference Map (§8) is high-value.** Root cause B (portal/ enforcer blind spot) showed that fixing QO-006 automatically surfaces QO-001/002/003 in future runs — one fix closes four findings. Always build this map during synthesis; it guides remediation priority.

7. **Grade baseline for this project:**
   - Grade C achieved with: 2 P1 CVEs (DEP-001, DEP-002), 8 P2s, ~90% spec coverage (measured domains)
   - Next target: Grade B requires 0 P1s — resolving DEP-001/DEP-002 (Handlebars + Vite) is the critical path
