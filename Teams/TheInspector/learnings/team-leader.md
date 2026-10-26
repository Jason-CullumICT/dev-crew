# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-26 — First Audit Run (run-20261026-074702)

**Services were offline.** performance-profiler and chaos-monkey had no dynamic data. The final grade was D (4 P1s). For future runs with services live, re-run both to collect latency baselines and dynamic fault injection results.

**Enforcer scope mismatch is a recurring blind spot.** `tools/traceability-enforcer.py` only scans `Source/` and `E2E/`. The `portal/` directory — which contains the majority of the product — is not scanned. This means enforcer-reported coverage (100%) is wildly optimistic (~10% of actual FRs). When scoping the audit, always cross-check enforcer coverage against the total FR count in all `Specifications/*.md` files, not just the enforcer's output.

**Portal/Backend is the highest-risk workspace.** 4 critical CVEs concentrated here (OpenTelemetry + protobufjs). This workspace should be prioritised in future dependency audits and should be checked first for CVE accumulation.

**Cross-reference map is essential for D-grade reports.** With 16 findings, the cross-ref map (§8) is the most actionable section — 3 root causes explain 8 findings. Always build it; operators use it to prioritise fixes.

**Grading formula gotcha:** The config uses `max_p1` as the ceiling, not a range. A report with 3 P1s falls to D even if P2 count is within C range. Always count P1s first before assigning grade.

**First-audit baseline.** This was the first Inspector run for this project. `spec_coverage.prior_audit` is null. Future runs should compare grades, finding counts, and FIXED/STILL OPEN/REGRESSED status.

**No PR was open.** Escalation used the console path. If a PR is open on the branch, the escalation block should post a `gh pr comment` with badge links to TheGuardians and TheFixer.
