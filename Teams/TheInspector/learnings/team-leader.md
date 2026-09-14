# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-14 — First Audit Run

- **Traceability enforcer gives false green**: `tools/traceability-enforcer.py` only scans the most recently modified `Plans/*/requirements.md`. The 74 FRs in `Specifications/dev-workflow-platform.md` are invisible to it. Always compute true coverage by also scanning `Specifications/` manually or extending the enforcer.
- **Services were offline in CI**: performance-profiler and chaos-monkey could not run. Always check service health early in the scoping phase and note this prominently in the report scope section.
- **platform/orchestrator has solo-session-only restriction**: Any fixes to `platform/orchestrator` (protobufjs, grpc, multer) must be done by a solo session, not TheFixer pipeline agents. Tag these findings clearly in the backlog.
- **Two codebases confusion**: `portal/` and `Source/` are separate applications. Plans written for `portal/` paths are factually wrong when the active code is in `Source/`. Check plan path references against the active codebase during scoping.
- **First audit baseline**: Grade D. 3 P1, 15 P2, 10 P3. 7 security escalations to TheGuardians. Spec coverage 24% (Specifications/ 0%). Use this as the comparison baseline for future audits.
- **Bug backlog routing**: Security CVEs go to TheGuardians for exploitability verification BEFORE going to TheFixer for patching. Both can run in parallel but TheGuardians must sign off on the security findings.
