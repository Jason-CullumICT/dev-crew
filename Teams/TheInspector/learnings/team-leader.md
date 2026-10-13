# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-13 — First Audit Run

1. **portal/ is the primary product, not a debug UI.** The inspector.config.yml and CLAUDE.md both describe portal/ incorrectly. Any future audit scope MUST include portal/ manually until QO-002 is fixed. Portal contains 31 source files, 15 test files, full Express backend + React frontend.

2. **Traceability enforcer returns false FAILURE for portal-based plans.** Do not interpret CI gate failures on plans like dev-workflow-platform, dependency-linking, image-upload, duplicate-deprecated-status, orchestrated-dev-cycles, or orchestrator-cycle-dashboard as real failures — they are enforcer blind spots. Real coverage is 97.8%.

3. **All services were offline — static mode only.** performance-profiler and chaos-monkey were both skipped. Next audit should attempt to spin up services first (platform/ infrastructure) for full dynamic coverage.

4. **Dependency supply chain is in critical state.** jest@29.7.0, vitest@2.0.5, express@4.18.2, and protobufjs (orchestrator) all have CRITICAL CVEs. These are not application-code issues — the application logic is clean. Priority: express upgrade (production), then test framework upgrades (CI).

5. **Grading note:** The config grades D for "anything worse than C" (>2 P1 findings). Dependency CVEs in test toolchains inflate P1 count significantly. Consider whether CI-only CVEs should carry the same grade weight as production runtime CVEs in a future config revision.

6. **Cross-reference map is the most valuable synthesis artifact.** Three of four root causes collapsed 9 findings into 4 single fixes. Always build it — operators act on root causes, not individual findings.

7. **First audit has no baseline — all findings are NEW.** On the second run, focus the executive summary on what changed (FIXED vs REGRESSED vs NEW) rather than re-explaining all findings.
