# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit Run 2026-05-30

### Synthesis Observations

**Specialist reports were available from two of four specialists:**
- quality-oracle: full static report ✅
- dependency-auditor: full static report ✅
- performance-profiler: NOT RUN — services offline at audit time
- chaos-monkey: NOT RUN — services offline at audit time

**Report format inconsistency:** The dependency-auditor's top-level summary listed "High (P2): 5" but the detailed findings body only labeled 3 findings as P2 (DEP-003, DEP-004, DEP-005). The detailed body is canonical; the summary was inflated. Future audits: always defer to the detailed body severity labels.

**Grade calculation:** With 4 P1 findings and 9% spec coverage (both below Grade C thresholds), the overall grade is D. However, the grade is misleading — it reflects two structural issues (orphaned primary spec + critical CVEs) rather than implementation quality failure. The actual source code is well-structured with 100% operational spec coverage, no empty catch blocks, no hardcoded secrets, no skipped tests.

**First-audit quirk:** All 25 findings are NEW. The FIXED / STILL OPEN / REGRESSED columns of the re-verification table are all zero. Future audits will need to compare against `bug-backlog-2026-05-30.json` to populate those columns.

### Escalation Path

DEP-001 (handlebars injection) and DEP-002 (protobufjs RCE) both hit the `injection` trigger in `config.escalation.security_triggers`. Both are CVSS 9.8 with zero-precondition exploitability. Console escalation path was used (no PR context detected — `gh pr view` returned empty).

**Lesson:** When escalating via console (no PR), include specific CVE IDs and location details in the `FINDING_SUMMARY` — the one-line description is the only signal the team has to triage urgency before reading the report.

### Cross-Reference Map Lessons

The most valuable cross-ref entries were:
1. **Stale lockfiles** as root cause for 11 of 15 dep findings — single `npm audit fix` sprint clears the majority.
2. **No spec lifecycle governance** as root cause for 4 quality-oracle findings — one policy document fixes the structural cause of the D grade.

These cross-refs are the most actionable output for TheFixer — they show where one fix resolves multiple backlog items.

### Services Offline Pattern

When services are offline, two specialists cannot run. This is expected. Future scoping phase should:
1. Note this explicitly in the audit plan for the parent session
2. Still dispatch quality-oracle and dependency-auditor (both always static)
3. Mark performance-profiler and chaos-monkey as "deferred — re-run with live services"
4. Do NOT delay the overall audit — partial coverage is better than no audit

### Report Paths (2026-05-30 baseline)

| Artifact | Path |
|----------|------|
| HTML report | `Teams/TheInspector/findings/audit-2026-05-30-D.html` |
| JSON backlog | `Teams/TheInspector/findings/bug-backlog-2026-05-30.json` |
| Summary | `inspector-report.md` (root) |

### Baseline Established

This is the first audit. The JSON backlog at `Teams/TheInspector/findings/bug-backlog-2026-05-30.json` is the comparison baseline for all future audits. Future team-leader should:
1. Load this JSON at synthesis time
2. Compare each finding ID against prior backlog to classify NEW / STILL OPEN / FIXED / REGRESSED
3. Highlight FIXED items prominently (green cards in Section 14)

### Target for Next Audit (2026-06-27)

- Grade C or better (all P1 CVEs resolved, CI gate fixed)
- DEP-001 and DEP-002 closed (either fixed or TheGuardians accepted residual risk)
- QO-001 closed (enforcer CI step updated)
- Performance-profiler and chaos-monkey run with live services (latency baselines established)
