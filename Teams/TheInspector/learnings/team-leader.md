# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-14 — First audit run

1. **portal/ is a second full application codebase** — not just a debug UI add-on. It has 6 feature plans (~40 FRs), its own Backend + Frontend + Shared layers, and its own FR namespace (FR-NNN vs FR-WF-* in Source/). Always scope both Source/ and portal/ when collecting quality-oracle focus areas.

2. **Traceability enforcer is broken for portal/** — `tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`. All portal/ plan results come back as 100% false failure. When scoping, note this limitation in the audit plan so quality-oracle knows not to interpret enforcer failures as real gaps without verification.

3. **Services were offline for this audit** — both backend (localhost:3001) and frontend (localhost:5173) were unreachable. Performance-profiler and chaos-monkey were skipped. This is likely the normal state for CI-triggered audits. The audit plan should default to static-only for both unless there is explicit evidence services are running.

4. **Dependency auditor surfaces the most P1s** — in this codebase the OpenTelemetry dependency chain in portal/Backend alone contributed 4 escalated P1 CVEs. Always route protobufjs/grpc-js, template injection, and proxy-addr-class CVEs to TheGuardians (security triggers: injection, auth bypass, missing access control). TheFixer handles the mechanical npm update work after TheGuardians assesses exploitability.

5. **Cross-reference map has highest remediation leverage** — the grpc-js update alone closes 15 CVEs (12 protobufjs + 3 grpc-js) in one command. Always build the cross-ref map before writing recommendations so the "Block Deployment" tier lists the highest-leverage fixes, not just the most critical individual findings.

6. **spec_coverage_pct cannot be reported as a number when enforcer is blind** — report as "UNKNOWN (enforcer blind to portal/)" rather than 0% or any number. The grading formula uses min_spec_coverage; if enforcer is broken, do not penalise the grade for that dimension — penalise QO-001 instead.

7. **Grade thresholds are strict** — with 7 P1 findings the grade is D (C allows max 2). Do not round up. The dependency auditor alone contributed 6 P1s; combined with quality-oracle's P1 it is unambiguously D.
