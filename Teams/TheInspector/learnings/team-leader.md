# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-08-31 — First Audit Run

### Spec Scope Ambiguity
`inspector.config.yml` points `specs.dir` at `Specifications/` but the quality-oracle found 0% traceability there. Root cause: `Specifications/dev-workflow-platform.md` may be a demo/target project spec, not a Source/ implementation spec. Source/ uses `FR-WF-*` from `Plans/`, not `FR-NNN` from `Specifications/`. Next audit: clarify and update `specs.dir` so the grade reflects reality — not this false 0%.

### Performance/Chaos Always Skipped If Services Down
Services (localhost:3001, localhost:5173) were offline at audit time. performance-profiler and chaos-monkey were both skipped. Consider adding static-analysis-only chaos scenarios that don't require live services (the config already defines 2: concurrent state transitions, malformed request body). Run those even when services are offline.

### Dependency Audit Produces Most P1s
In this run, 3 of 5 P1s came from the dependency-auditor. Always give the dependency audit P1s high synthesis weight — CVSS 9.8 CVEs are block-release items regardless of other scores.

### Grade Calculation
Grade is driven by the worst-case metric:
- P1 count alone is sufficient to drop grade (5 P1 → D even with acceptable P2 count)
- Spec coverage 0% also drives D, but is contested if Specifications/ are demo specs
- Recommend presenting "contested grade" when spec scope is ambiguous

### Escalation Pattern
Security triggers (injection, sensitive data exposed) fired on DEP-001, DEP-002, DEP-003. No PR was open on this branch, so the escalation was printed to console. TheGuardians must be triggered manually via `Teams/TheGuardians/team-leader.md` in an ephemeral isolated environment.
