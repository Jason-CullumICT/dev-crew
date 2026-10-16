# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-10-16 — First Audit

- **Services were offline** (backend port 3001, frontend port 5173 both down). Always run `curl -sf {health}` before dispatching — performance-profiler and chaos-monkey are no-ops without live services. Note this clearly in scope section.
- **Spec governance is the #1 issue in this codebase.** `Specifications/dev-workflow-platform.md` describes a product that doesn't exist. Always check whether active Specification files match the actual product before deep-diving code quality.
- **Traceability enforcer is scoped to Plans/ only.** `python3 tools/traceability-enforcer.py` will always report PASS regardless of Specifications/ coverage. Do not cite enforcer gate output as evidence of spec compliance — run a separate scan against Specifications/ files.
- **Dependency audit is high-signal.** 208 CVEs including 5 critical RCE/spoofing (CVSS 9.8/9.1) — dependency-auditor should always run first; its P1 findings dominate grade calculation.
- **5 of 8 P1 findings were dependency CVEs.** Patch availability: all 5 have available upgrades. TheGuardians escalation is mandatory before any production release.
- **Cross-reference map saves remediation effort.** QO-001/002/003/004 share a single root cause (spec governance). Vitest + Tinypool share a single upgrade command. Always build the cross-ref map before writing recommendations.
- **Grade formula:** config.grading thresholds at C are max_p1: 2 — even 3 non-security P1 spec-drift findings push to D. Keep this in mind when advising teams on grade recovery path.
