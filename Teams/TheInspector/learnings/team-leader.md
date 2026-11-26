# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-26 — First audit run

1. **Specialist skipping pattern**: When backend/frontend services are offline, skip performance-profiler and chaos-monkey entirely and note it prominently in the report header. Do NOT fabricate latency numbers. Mark §12 (Latency Baselines) as "Not collected — services offline."

2. **Grade calculation — dependency CVEs count as P1s**: Critical CVEs from the dependency auditor (prototype pollution, header injection, TLS bypass, buffer overflow, DoS) should be mapped to P1 audit findings for grading purposes, same as source-code P1s. This pushed the grade from C to D in this run.

3. **Security escalation trigger — TLS bypass**: `@grpc/grpc-js TLS certificate validation bypass` triggers TheGuardians escalation even though "TLS bypass" is not literally in the `security_triggers` list. It's a cryptographic failure enabling MITM — treat it equivalent to "auth bypass."

4. **Cross-reference map (§8) is high-value**: Grouping DA-001 through DA-006 under the single root cause "npm dependency staleness → npm audit fix" made the remediation path much clearer than listing them individually. Always build this map; reviewers use it to parallelise fixes.

5. **spec-drift-report.json is a secondary source**: The JSON report from the traceability enforcer showed 0 canonical FRs covered, but that's the enforcer's known-broken view. The quality-oracle's deeper analysis (96.5% plans-level, 27.2% all-scopes) is the authoritative figure. Use quality-oracle findings as primary, spec-drift-report.json as a secondary signal.

6. **No PR number on feature branches**: The escalation block tried `gh pr view` — it returned empty because the branch `audit/inspector-2026-11-26-*` has no open PR. The fallback `printf` block executed correctly. This is the expected path for audit-only branches.

7. **Inspector config `traceability: "FR-\\d+"` conflicts with actual FR IDs**: The config file specifies `FR-\d+` as the traceability pattern but the codebase actually uses `FR-[A-Za-z0-9-]+` (mixed case, dashes). The config needs updating. Flag this in future scoping phases.
