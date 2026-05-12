# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-12 — First Audit Run

1. **Services were offline.** Backend (http://localhost:3001) and frontend (http://localhost:5173) were unreachable during the audit cycle. performance-profiler and chaos-monkey were skipped. Always check service availability first; if services are offline, static-only mode is the fallback — and that should be noted clearly in the report scope section.

2. **Spec directory mapping is a recurring confusion source.** `Specifications/` contains specs for three different apps (portal/, platform/, Source/) with no cross-links. Any new agent reading Specifications/ will be confused. The team leader should include a note about this in every future audit plan until QO-001 is resolved.

3. **Grading formula using inspector.config.yml:** Grade D was assigned because we had 4 P1 findings (threshold: ≤2 for C). Be aware the config grades harshly on P1 count — even non-exploitable P1s (like spec drift / documentation gaps) count against the grade.

4. **Security escalation routing:** When DEP-001/DEP-002 (critical RCE CVEs) are found, always escalate to TheGuardians before TheFixer. Never route CVEs with CVSS ≥9.0 to TheFixer — that team does quality/code fixes, not security hardening.

5. **Cross-references are high-value.** XREF-001 (OTel absent + OTel CVE) means implementing OTel at the right version resolves 3 findings at once. Always look for these compound fixes — they justify prioritization.

6. **First audit produces no trend data.** All 26 findings are NEW. The trend section is populated from the second audit onwards. Remind the operator of this.

7. **DEP-005/DEP-006 are the same CVE (GHSA-q7rr-3cgh-j5r3)** — one in auto-instrumentations-node, one in sdk-node. Merge them in the P2 table but keep separate entries in the backlog JSON for fix-tracking granularity.

8. **inspector.config.yml filename pattern:** `audit-{date}-{grade}.html` and `bug-backlog-{date}.json`. Always save to `Teams/TheInspector/findings/` per config.report.output_dir.

9. **performance-profiler and chaos-monkey static fallback:** When services are offline, these specialists provide no data. However, note any static-analysis concerns observed (e.g., unbounded Map iteration in GET /api/work-items, concurrent state transitions in workflow.ts) so they become test targets in the next dynamic cycle.
