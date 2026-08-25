# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-25 — First audit (inspector-2026-08-25)

**Grade: D** — 6 P1 findings, 12 P2 findings, 0% primary spec coverage.

**Key discoveries:**

1. **Spec gap is the top structural risk.** `Specifications/dev-workflow-platform.md` (FR-001–069) is entirely untraced. The codebase implements a different product (Work Item routing / FR-WF-XXX). Future audits should check this first — if it's still unreconciled after two cycles, escalate as a blocking architectural issue.

2. **Traceability enforcer gives false confidence.** `tools/traceability-enforcer.py` only scans `Plans/*/requirements.md`. Until this is fixed, the gate output is unreliable for `Specifications/`. Do not cite traceability-enforcer PASSED as evidence of compliance for the primary spec.

3. **Dependency attack surface is large (941 deps).** 3 CVSS 9.8 Critical RCEs were present. The dependency auditor should always be run — it is high-signal. Frontend is 96% transitive deps; consider whether a lockfile audit gate in CI would reduce repeat findings.

4. **Escalation pattern works correctly.** Three RCE findings (handlebars, vitest, protobufjs) were correctly tagged `[ESCALATE → TheGuardians]` and the escalation printf block ran. No open PR existed on the branch, so the shell fallback path was used. Future: verify whether a GHA workflow for TheGuardians exists before assuming the badge links are live.

5. **Performance-profiler and chaos-monkey skipped.** Services were not verified available this cycle. In future scoping: explicitly curl health endpoints for backend and frontend before declaring specialists inactive. If services are up, run dynamic specialists — static-only audits miss a significant class of runtime findings.

6. **CI baseline is pre-broken.** `GET /api/search` test suite is known-failing. Agents see a broken baseline and cannot reliably detect new regressions. Flag this on every audit until resolved — it is a systemic CI hygiene problem, not just a QO finding.

7. **Cross-reference map is most useful for remediation.** The gRPC stack cross-reference (DA-P1-003 + DA-P2-008) and the frontend dep bundle cross-reference (DA-P2-004,005,006,009) saved significant remediation planning effort by grouping fixes.

**Tooling notes:**
- `tools/pipeline-update.sh` works correctly. Always init at start of synthesis, complete at end.
- `gh repo view` and `gh pr view` are available; no open PR on audit branch — use printf escalation path.
- HTML report at `Teams/TheInspector/findings/audit-2026-08-25-D.html` — all 16 sections present.
- JSON backlog at `Teams/TheInspector/findings/bug-backlog-2026-08-25.json`.
