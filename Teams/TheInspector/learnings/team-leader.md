# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-19 — First Full Audit

**Specialist report format:**
- Specialists return their findings as markdown files (`quality-oracle-report.md`, `dependency-auditor-report.md`) in the repo root (working directory). Look there first, not in Teams/TheInspector/findings/.
- The dependency-auditor also writes a detailed findings file to `Teams/TheInspector/findings/dependency-audit-{date}.md` with full CVE context. Read both for synthesis.

**Grade D trigger pattern:**
- Even 1 CVSS 9.8 CVE combined with >2 P1 spec findings drives D.
- The F-grade requires "exploitable auth bypass + critical domain failure" — when there's no auth system at all (this codebase), F technically doesn't apply even for RCE vulnerabilities. Grade conservatively at D.

**Escalation routing:**
- DEP-* CVE findings with CVSS ≥9.0 → TheGuardians escalation even if the config triggers list only "auth bypass / injection" — RCE is structurally equivalent to "injection" for routing purposes.
- P2 CVE findings (path traversal, DoS) with TheGuardians escalation tag on the dependency-auditor report → honour the escalation, don't downgrade to TheFixer.
- Quality oracle findings (missing routes, missing metrics, service layer bypass) → TheFixer, never TheGuardians.

**Cross-reference map construction:**
- Group by root cause, not by finding ID. The vitest/vite/ws cluster (DEP-002/003/004) resolves together with one `npm install`. Call that out explicitly as it saves remediation time.
- Traceability tooling bugs (QO-001 + QO-003) are a single root cause — one PR fixes both.

**Spec coverage calculation:**
- Coverage of ~15% is correct when canonical `Specifications/` contains unimplemented specs. Do not inflate by counting Plans/ coverage.
- Report coverage at the canonical-specs level (Specifications/*), not Plans/ level.

**Service availability check:**
- `curl -sf {service.health} > /dev/null 2>&1` returning non-zero means static mode for that specialist.
- performance-profiler and chaos-monkey both skipped when backend is down — document this prominently in §4 (Scope) and §12 (Latency) so readers understand what's missing.

**HTML report tips:**
- All 16 sections must be present even with no data (use "Not run" / "None" placeholders).
- Section §12 (Latency Baselines) should note static checks from inspector.config.yml even when no dynamic data exists.
- Section §8 (Cross-Reference Map) is the most actionable section — spend synthesis effort here. Group by root cause → single fix impact.

**Bug backlog JSON:**
- Include `cross_reference_groups` array at the top level — this is the primary remediation planning artifact.
- Separate `escalations` array from `p1_findings` — escalations go to TheGuardians, the rest go to TheFixer.
- Include `next_audit_targets` with the grade target and what's needed to reach it.

**Dashboard:**
- `pipeline-update.sh --action init` must run before synthesis (get the RUN_ID).
- `pipeline-update.sh --action complete` after all reports written.
- The tool may error silently on some environments (exit code 4) — this is non-fatal, the run still completes.
