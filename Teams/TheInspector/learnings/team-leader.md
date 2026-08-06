# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-06 — First Audit Run

**Spec coverage calculation:** The traceability enforcer reports PASS but only scans `Plans/`. The actual overall coverage is computed by summing FRs across all spec files in `Specifications/` + `Plans/`. For this project: 108 total FRs, 28 traced → 26% overall. Always run `python3 tools/traceability-enforcer.py --file <each_spec>` manually during scoping — don't trust the default run.

**Domain mismatch pattern:** The primary spec (`dev-workflow-platform.md`) was written for a different product domain than what `Source/` implements. When scoping future audits, compare the domain vocabulary in spec files against the actual types/models in `Source/Shared/types/` — a mismatch is a P1 spec-drift signal.

**Service availability:** Both backend (localhost:3001) and frontend (localhost:5173) were offline at audit time. performance-profiler and chaos-monkey ran static-only. Schedule re-audits with live services to collect latency baselines and run fault injection.

**Escalation triggers fire on CVEs too:** The config `security_triggers` list includes "injection" and "sensitive data exposed" — these match CVE categories, not just architectural patterns. vitest (CVSS 9.8 code execution) and handlebars (injection CVEs) both qualify. Always scan dependency-auditor findings against escalation triggers during synthesis.

**Cross-reference grouping:** Group findings by root cause before writing the report — DEP-001 + DEP-002 + DEP-008 + DEP-009 + DEP-015 all trace to the same "vitest/build-tool chain not updated" root, meaning a single `npm install` resolves 5 findings. This dramatically reduces remediation effort vs treating each finding independently.

**Grade is D but production is not broken:** The D grade is driven by 3 structural P1s (spec/tool gaps) and 2 CVE P1s in dev dependencies — not production logic failures. The workflow-engine implementation itself scores 100% on its own plan. Future reports should note whether P1s are "structural/process" vs "runtime/production" to give operators better signal.
