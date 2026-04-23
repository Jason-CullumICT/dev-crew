# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit History

### 2026-04-23 — Grade D
- **Audit ID:** run-20260423-050250
- **Branch:** audit/inspector-2026-04-23-22e525
- **Specialists run:** quality-oracle (static), dependency-auditor (static)
- **Skipped:** performance-profiler, chaos-monkey (services offline)
- **P1/P2/P3:** 3 / 8 / 9
- **Grade:** D (3 P1s exceeded C threshold of max_p1: 2)
- **Escalations:** DEP-001 (protobufjs RCE), DEP-002 (Handlebars injection), DEP-003 (path-to-regexp ReDoS) → TheGuardians

---

## Key Observations

### Grading Mechanics
- Grade D threshold triggered by **P1 count alone** — 3 P1s vs C's max of 2.
- If DEP-001 and DEP-002 are fixed and DEP-003 is resolved, grade climbs to C (P1 count = 1 from QO-001).
- To reach B: QO-001 (spec back-port) must also be resolved, reducing P1 to 0, with P2 count ≤ 8.

### Services Were Offline
- performance-profiler and chaos-monkey both require live services.
- On next audit: check `http://localhost:3001/` and `http://localhost:5173` availability before scoping.
- If services are down, note this prominently in the scope section and in the grade rationale.
- Consider adding a static-mode fallback note to the audit scope for these specialists.

### Cross-Cutting Root Causes
- The three most valuable cross-references in this audit:
  1. **No CI/CD dependency scanning** → resolves all 11 DEP-* findings
  2. **Spec governance gap** → resolves QO-001 (P1) + QO-006 (P2) together
  3. **Partial feature delivery (FR-dependency-*)** → resolves QO-002 + QO-003 + QO-004 together
- Always look for these "one fix resolves N findings" patterns — they are the most valuable insight.

### Escalation Routing
- DEP-003 (path-to-regexp, CVSS 7.5 High) was escalated alongside the two Critical CVEs. Per config, High CVEs with network exploitability → TheGuardians.
- QO-001 (spec-drift P1) routes to **requirements-reviewer**, not TheFixer — spec updates are out of TheFixer scope.

### Report Generation
- HTML report saved to `Teams/TheInspector/findings/audit-{date}-{grade}.html` per config.
- JSON backlog saved to `Teams/TheInspector/findings/bug-backlog-{date}.json`.
- `inspector-report.md` in repo root is the canonical summary for the parent session.

### Dependency Auditor Always Flags High Risk
- Orchestrator (platform/orchestrator) consistently had the highest CVE count.
- Backend's Jest chain (handlebars) is a recurring risk pattern for Node.js projects.
- Always check platform/orchestrator separately — it has production-only dependencies with elevated security surface.

---

_Last updated: 2026-04-23_
