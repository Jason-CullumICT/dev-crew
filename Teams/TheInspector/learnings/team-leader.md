# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Run History

- **2026-06-28** — First audit. Grade D. 4 P1 (3 CVEs + 1 unregistered route), 11 P2. 3 security escalations → TheGuardians.

## Grading Application Notes

### 2026-06-28
- Quality Oracle gave itself Grade C (1 P1, 5 P2 by actual count vs 4 in their JSON).
- Dependency Auditor gave itself Grade D (3 P1 CVEs, 6 P2 CVEs).
- Combined: 4 P1 total → exceeds Grade C threshold (max_p1=2) → overall Grade **D**.
- Spec coverage at 79% is above Grade B threshold (60%) but irrelevant when P1 count already drops to D.
- Always apply grading to the **combined** findings across all specialists, not per-specialist.

## Security Escalation Triggers (confirmed from config)

Per `inspector.config.yml` security_triggers:
- `injection` → maps to DEP-003 (Handlebars.js JS injection)
- `sensitive data exposed` → maps to DEP-002 (Vitest arbitrary file read of .env)
- RCE (protobufjs, DEP-001) — not in the literal trigger list but severity warrants escalation; use judgment for CVSS ≥ 9.0

No PR context was available (services offline, branch only). Used terminal escalation format.

## Cross-Reference Building

The most valuable cross-references in this audit:
1. `pending_dependencies` absent from enum → root cause of 2 separate P2 findings (badge + gating)
2. Outdated @opentelemetry → root cause of 1 P1 + 3 P2 findings
3. Enforcer blind spot → root cause of P1 gap going undetected

Pattern: always look for findings from different specialists that share a root cause. One fix may resolve 4+ findings.

## Dependency Auditor Output

The dependency-auditor-report.md was in narrative/summary format rather than the structured findings format used by quality-oracle. The JSON at `findings/dependency-audit-summary-2026-06-28.json` was the reliable structured source. Always prefer the JSON when available.

## Performance/Chaos Skipped

Both dynamic specialists were skipped (services offline). This is expected in CI/CD contexts.
When summarizing, include skipped specialists in §6 with "services offline" note.
Latency baselines in §12 should use config targets as placeholders when dynamic data is unavailable.

## Spec Coverage Note

Quality Oracle only checks Source/ plans (FR-WF-* and FR-dependency-*).
Specifications/dev-workflow-platform.md (FR-001..069) and tiered-merge-pipeline.md (FR-TMP-*)
target portal/ and platform/ respectively — they appear in the repo but are NOT checked by
the Source/ traceability enforcer. Document this caveat in §11.

## Report File Naming

Config pattern: `audit-{date}-{grade}.html` and `bug-backlog-{date}.json`
- HTML: `Teams/TheInspector/findings/audit-2026-06-28-D.html`
- JSON: `Teams/TheInspector/findings/bug-backlog-2026-06-28.json`
- Root summary: `inspector-report.md` (user-requested, markdown format)

## Finding ID Namespacing

- Quality Oracle uses: `QO-NNN`
- Dependency Auditor uses: `DEP-NNN`
- Outdated packages without CVEs: `DEP-outdated-N`
- This makes cross-referencing and deduplication straightforward.
