# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-27 — First Audit Run

**Services offline pattern:** When both backend and frontend services are offline, only quality-oracle and dependency-auditor can run (static mode). Performance-profiler and chaos-monkey require live services. Always report this clearly in Section 4 (Scope & Environment) so readers understand the coverage gap.

**Specialist report format:** Quality Oracle delivered findings in inline markdown (not a separate file). Dependency Auditor delivered findings to `Teams/TheInspector/findings/dependency-audit-{date}.json` and `.md`. For synthesis, both formats are fine — read from wherever the specialist wrote them.

**Grade D triggers:** The dominant failure mode in this codebase is spec drift — 25.7% coverage against 113 total FRs. Even with only 2 P1 and 10 P2 findings (which would score C on counts alone), the 25.7% spec coverage is below the 40% threshold, forcing grade D. Always compute coverage against *all* spec documents, not just the enforcer scope.

**False enforcer confidence:** `tools/traceability-enforcer.py` currently only watches `Plans/self-judging-workflow/requirements.md` (13 FRs) and reports 100%. This creates a false-green CI gate. The real coverage is 25.7% across 113 FRs. Flag this prominently in executive summary.

**Cross-reference grouping:** Group findings into root causes before writing the cross-reference map. Root cause grouping revealed that 4 frontend dependency findings (DEP-006/007/010/011) share one fix, and 3 spec-drift findings (QO-004/005/006) share a solo-session decision. This reduces the action list from 21 items to ~6 root-cause fixes.

**Security escalation threshold:** Findings tagged `[ESCALATE → TheGuardians]` must be from the `escalation.security_triggers` list in inspector.config.yml. In this audit: "injection" (DEP-001 Handlebars), "path traversal" and "CORS bypass" (DEP-006/007 Vite/esbuild). The fallback escalation path (printf) was used because no PR/repo was accessible via `gh` CLI.

**solo-session findings:** QO-004, QO-005, and QO-006 all require solo-session work (touching `tools/` or making spec status decisions). These must NOT be routed to TheFixer. Mark clearly in backlog JSON with `"route_to": "solo-session"`.

**Report file naming:** Follow `config.report.filename_pattern`: `audit-{date}-{grade}.html` and `bug-backlog-{date}.json`. Both go to `Teams/TheInspector/findings/`.

**First audit baseline:** When this is the first audit, Section 5 (Trend) and Section 7 (Re-Verification) have no data. Mark all findings as NEW. The report establishes the baseline for the next audit's FIXED/STILL OPEN/REGRESSED tracking.
