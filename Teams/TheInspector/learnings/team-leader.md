# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## Audit 2026-10-12 (inspector-audit-2026-10-12-5fa56e) — Grade F

### Synthesis observations
- **First audit establishes baseline.** Prior inspector-report.md was empty. All 19 findings tagged NEW.
- **Services were offline.** Both localhost:3001 (backend) and localhost:5173 (frontend) unreachable. performance-profiler and chaos-monkey had to be skipped. Always check service health before promising dynamic results to stakeholders.
- **Traceability tooling masked the true picture.** QO-001 revealed the enforcer only scans the most-recently-modified requirements.md. When synthesising coverage across specialists, cross-check the enforcer's own reliability before trusting its PASSED output.
- **Dependency grade dragged the overall grade to F.** Quality Oracle alone would have scored D. The dependency auditor found 4 Critical CVEs including an auth bypass (CVSS 9.1) which triggered the F escalation condition in config.grading.
- **Cross-reference map was the most useful synthesis step.** Three distinct root causes collapsed 19 findings into 4 fix actions: (1) npm dep update, (2) fix enforcer, (3) FR-ID normalisation, (4) register missing route. Document this pattern for future audits.
- **5 escalations to TheGuardians.** No open PR was found; escalation was printed to stdout. In future runs with an open PR, the gh pr comment path should be used.

### Grading calibration for this project
- Config.grading F triggers at "exploitable auth bypass + critical domain failure" — DEP-002 (proxy-addr, CVSS 9.1) is an auth bypass; DEP-001/004 are RCE = critical domain failure. Grade F was correct.
- With 7 P1 findings and 22% spec coverage, the project would have been D regardless; the CVE escalation pushes it to F.

### What to check next audit
1. Were Phase 1 deps patched? (jest@30.x, vite@latest, vitest@2.0.5+, npm audit fix)
2. Is GET /api/search now registered?
3. Did enforcer get fixed to scan all plans?
4. Are services running? (enables performance-profiler + chaos-monkey)
5. Did spec coverage improve past 40% (minimum for Grade C)?
