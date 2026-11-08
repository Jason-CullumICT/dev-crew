# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-08 — First Audit Run

**Traceability system is architecturally decoupled from Specifications/**
The traceability enforcer (`tools/traceability-enforcer.py`) only reads `Plans/*/requirements.md` — it never touches `Specifications/`. This means the enforcer always passes even when zero Specifications/ FRs are traced in source. When scoping quality-oracle work, always check _both_ the enforcer scope AND direct grep for `Verifies:` comments mapping to `Specifications/` FR IDs.

**FR namespace conflict — Plans vs Specifications**
Source code uses `FR-WF-*` and `FR-dependency-*` IDs (from Plans), not `FR-001`–`FR-069` (from Specifications/). These are entirely different namespaces with zero overlap. Any traceability finding that says "FR-XXX not found" needs to disambiguate _which_ FR namespace it's checking against.

**Specifications/dev-workflow-platform.md is a landmine**
This file describes a retired system (SQLite, AI voting, dev cycles) but is still in `Specifications/` without an archive marker. Agents reading it as source of truth will design against a system that no longer exists. Flag for requirements-reviewer in every audit until archived.

**Services were offline in this run**
Backend (`:3001`) and Frontend (`:5173`) were both offline. Performance Profiler and Chaos Monkey did not run. When services are down, note this prominently in the HTML report header and Section 4 so stakeholders know the audit is incomplete.

**Dependency surface area is high-risk**
1,679 transitive deps across 6 npm projects. Express middleware ecosystem has recurring DoS CVEs. OpenTelemetry adds 20+ deps per instrumentation package. When scoping dependency-auditor, always flag these subsystems for deeper scrutiny.

**No PR context available in audit branch**
`gh pr view` returned no PR number — the audit branch had no open PR. The escalation fallback (console output) was used. In future runs, if a PR exists, the GitHub comment will auto-post. If not, the console output is the signal.

**Grade D thresholds**
Per `inspector.config.yml`: Grade B requires 0 P1 and ≤8 P2. Grade C requires ≤2 P1 and ≤15 P2 and ≥40% spec coverage. This run had 5 P1 and 0% spec coverage → Grade D.
