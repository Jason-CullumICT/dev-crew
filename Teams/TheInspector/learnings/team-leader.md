# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-09 — First audit run

- **Spec ecosystem discovery**: This project has three documents in `Specifications/` (dev-workflow-platform.md, tiered-merge-pipeline.md) that describe systems completely different from what is in `Source/`. The codebase pivoted to an in-memory workflow engine (FR-WF-001–FR-013 in Plans/) without archiving the old specs. Future audits should check for this pattern first.

- **Traceability enforcer scope**: `tools/traceability-enforcer.py` scans only `Plans/self-judging-workflow/requirements.md`, not the `Specifications/` dir configured in `inspector.config.yml`. The gate is misleading. Verified by running the enforcer and comparing its output against config's `specs.dir`.

- **Services unavailable in CI**: Both backend (localhost:3001) and frontend (localhost:5173) were unavailable during this audit. performance-profiler and chaos-monkey should always be marked as skipped in CI/ephemeral environments. Check `config.services[*].health` before dispatching these specialists.

- **Dependency audit is the most data-rich specialist**: The dependency-auditor produced the most actionable findings (39 CVEs, 3 critical). It should always run first so escalations can be identified early.

- **Critical CVE → TheGuardians routing**: DEP-001 (handlebars injection) and DEP-003 (protobufjs RCE) triggered the `injection` and `code-execution` escalation triggers defined in `config.escalation.security_triggers`. The escalation block printed to stdout since there was no active PR.

- **Grade D drivers**: spec_coverage=13% (well below C gate of 40%) and P1 count=5 (exceeds C gate of 2). Resolving QO-001 + QO-002 (spec ecosystem fix) and patching the 3 critical CVEs would lift to B in a single sprint.
