# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## 2026-10-24 — First Audit (run-20261024-e44da2f)

### Grading Applied
- Config grading thresholds work as expected: 6 P1 findings → immediate D regardless of P2 count.
- Spec coverage (0% domain, 100% Plans) confirms that the Plans gate gives false confidence — must always report both numbers separately.

### Specialist Availability
- Both services (backend :3001, frontend :5173) were offline on this audit run.
- performance-profiler and chaos-monkey were correctly skipped.
- **Learning:** Always check service health before dispatching dynamic specialists. In audit-branch CI contexts, services will typically be offline.

### Escalation Routing
- All 4 critical CVEs (proxy-addr, handlebars, tinypool, protobufjs) correctly triggered the TheGuardians escalation path.
- No PR context found (audit branch) — used console printf path. Correct.
- quality-oracle explicitly confirmed no security escalations from code-level analysis.

### Cross-Reference Patterns
- The traceability tooling gap (QO-001 + QO-005) is a common class of finding: the enforcer enforces *one* thing while the spec grows in another direction. Watch for this pattern in future audits.
- Route-handler/store coupling (QO-004) combined with vulnerable body parsers (DEP-005, DEP-011) creates a compounding risk. These should always be cross-referenced when both appear.

### Report Generation
- Outputs: `Teams/TheInspector/findings/audit-{date}-{grade}.html`, `Teams/TheInspector/findings/bug-backlog-{date}.json`, `inspector-report.md` (root-level index).
- dependency-auditor writes its own JSON to `findings/audit-{date}.json` — include this in the synthesis but don't duplicate it.

### What to Check Next Audit
- Did QO-001 get fixed? (enforcer extension to Specifications/)
- Did QO-002 get a spec disposition decision?
- Were the 4 critical CVEs patched?
- Are services now online so dynamic specialists can run?
- Re-run with performance-profiler + chaos-monkey in dynamic mode once services are up.
