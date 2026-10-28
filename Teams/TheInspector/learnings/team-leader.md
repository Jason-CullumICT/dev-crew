# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-10-28 (run-20261028-081332)

### Grading

- With 9 P1 findings (8 DEP + 1 QO), the grade landed at **D** even though spec coverage (88%) exceeded the A threshold. The config's `grading.C.max_p1: 2` means any run with >2 P1 findings drops to D or F. Large dependency trees with many CVEs will routinely push the grade below C — consider a separate `dependency_p1_weight` config option in future to normalize for dependency-only P1s vs architectural P1s.

### Specialist modes

- When both backend (`localhost:3001`) and frontend (`localhost:5173`) services are offline, performance-profiler and chaos-monkey must be skipped. Document this in the scope section clearly — operators need to know the audit is partial.
- quality-oracle and dependency-auditor are always static and never need live services. They run even when services are offline.

### Synthesis

- Cross-reference map (Section 8) is the most actionable deliverable for engineers — grouping findings by root cause (e.g., "upgrade vitest, fixes DEP-004 + DEP-005 + DEP-017 in one command") reduces remediation cognitive load significantly.
- The dependency-auditor summary report may overcount P1s at the header level vs the individual finding cards. Reconcile: the 5 explicitly documented CVE cards (DEP-001 through DEP-005) matching CVSS ≥9.0 are the confirmed P1s. DEP-006 and beyond are P2 despite the summary saying "8 P1" — the discrepancy likely comes from the auditor's internal severity mapping. Be explicit in the synthesis about which findings drive each severity.
- Always check if the escalation path (PR comment vs CLI printf) is applicable. This project had no open PR at audit time, so the CLI printf path was used.

### False PASS gate (QO-001)

- QO-001 (traceability enforcer false PASS) is the most important systemic finding in this run. If this isn't fixed before the next audit, the gap between actual coverage and CI-reported coverage will grow silently. Flag this as a prerequisite for trusting future quality-oracle results.

### Report structure

- The 16-section HTML report takes ~2000 lines but is complete and navigable with the TOC. All 16 sections must be present even if a section has no data (e.g., Section 14 Fixed Findings = "None" on first run, Section 12 Latency Baselines = "N/A" when services offline).
- JSON bug backlog should have a top-level `escalations` array separate from `findings` — this makes it trivial for TheGuardians tooling to parse only the security findings.

### Deduplication

- DEP-004 and DEP-005 are separate CVEs but the same fix (`npm update vitest`). Cross-reference them explicitly. DEP-017 also fixes with the same command. This single-command cluster saves remediation time.
- The vite cluster (DEP-014, DEP-019, DEP-025) is similarly resolved by one command.

### Next run checklist

- Verify services are running before audit (check health endpoints first)
- Confirm QO-001 (enforcer scope fix) was applied — the CI gate should now fail if portal/ FRs are untraced
- Run performance-profiler (dynamic mode) to capture baseline latency numbers
- Run chaos-monkey (dynamic mode) to verify concurrent state transition and malformed request handling
