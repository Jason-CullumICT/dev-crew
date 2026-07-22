# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-07-22 — First Audit (Full Codebase)

### Multi-System Architecture Warning

This repo contains **three independent systems** sharing one `Specifications/` directory. When scoping audits, be explicit about which system is in scope:

| System | Location | Spec | FR IDs |
|--------|----------|------|--------|
| Self-Judging Workflow Engine | `Source/` | Specifications/workflow-engine.md | FR-WF-001..013 (plan-level) |
| Dev Workflow Platform | `portal/` | Specifications/dev-workflow-platform.md | FR-001..FR-069 |
| Tiered Merge Pipeline | `platform/` | Specifications/tiered-merge-pipeline.md | FR-TMP-001..010 |

**Scope `Source/` audits to FR-WF-* and FR-dependency-* only.**

### Grading Outcome

- This audit: **Grade D** — driven entirely by 3 P1 CVEs in npm dependencies (CVSS 9.8)
- `Source/` code quality alone grades **A** (0 P1, 2 P2, 96% coverage)
- Lesson: dependency health can drag an otherwise-excellent codebase to D. Always run dependency-auditor.

### Grading Thresholds (from inspector.config.yml)

```
A: max_p1=0, max_p2=3,  min_spec_coverage=80%
B: max_p1=0, max_p2=8,  min_spec_coverage=60%
C: max_p1=2, max_p2=15, min_spec_coverage=40%
D: any P1 count → D (max_p1=999)
F: exploitable auth bypass + critical domain failure
```

### Specialist Modes

- **quality-oracle**: always static
- **dependency-auditor**: always static
- **performance-profiler**: requires `localhost:3001` to be reachable
- **chaos-monkey**: requires ALL services healthy (backend + frontend)

Check service health before dispatch. If services are offline, note which dynamic specialists were skipped and what data is missing.

### Report Paths

- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary markdown: `inspector-report.md` (repo root)

### Cross-Reference Pattern

When synthesizing, group findings by root cause before writing the cross-reference map (§8). Common patterns found this run:

1. **Dev toolchain version lag** → multiple CVEs resolved by one `npm update`
2. **Missing route registration** + **bypassed service layer** → same remediation path (create service + register route)
3. **Traceability infrastructure** → enforcer scope + canonical ID mapping are the same meta-problem
4. **Logger inconsistency** → LOG_LEVEL fix + import shim fix are the same file

### Escalation Decision Logic

From `config.escalation.security_triggers`: auth bypass, injection, sensitive data exposure, hardcoded secrets, missing access control → TheGuardians.

**CVSS ≥ 8.0 with code injection / RCE attack vector = always escalate**, regardless of whether the trigger keyword matches exactly. DEP-001/002/003 all qualified under "injection."

### Module Ownership Note

`platform/orchestrator` is owned by solo-session only. DEP-003 (protobufjs in Orchestrator) and DEP-008 (path-to-regexp) require a **solo session** to fix — not TheFixer pipeline agents. Call this out explicitly in recommendations.

### First-Audit Baseline

Mark all findings as `NEW` and note "First audit — no baseline" in §5 (Trend) and §7 (Re-Verification). Future audits will use this run's bug-backlog JSON to compute FIXED / STILL OPEN / REGRESSED / NEW status.

### Skipped Specialists

When specialists are skipped due to offline services, still include their cards in §6 with:
- The skip reason
- The configured budgets/scenarios from inspector.config.yml
- A recommendation to re-run with services online

This preserves the expectation that dynamic data will be collected — readers know it's missing, not forgotten.

---

_Last updated: 2026-07-22_
