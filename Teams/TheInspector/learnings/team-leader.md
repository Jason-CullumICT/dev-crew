# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-10 — First Audit Run

1. **Specialist skip condition:** Both performance-profiler and chaos-monkey were skipped because services were offline. This significantly limits the audit — re-run with services online to get dynamic coverage. Static mode produces no latency baselines and no fault-injection results.

2. **False PASS trap (QO-002):** The traceability enforcer targets the "most recently modified requirements.md" — this is a heuristic that breaks silently when the primary spec is in `Specifications/` rather than `Plans/`. Always verify which file the enforcer is actually targeting before trusting its verdict.

3. **Grade D trigger:** 3 P1 findings (threshold for C is max 2 P1). The primary spec governance failure (QO-001, QO-002) alone generates 2 P1s. Any project with a stale/unretired spec risks hitting D immediately.

4. **Escalation routing:** DEP-001 (Handlebars RCE) is a dev-only vulnerability but still warranted TheGuardians escalation because (a) CVSS 9.8 and (b) test containers may be part of CI/CD image. When in doubt, escalate and let TheGuardians assess scope.

5. **Cross-reference efficiency:** Three separate CVEs (DEP-002, DEP-003, DEP-004) shared one root cause (outdated Vite ecosystem) and were resolved by a single `npm update vite vitest` command. Always group findings by root cause in the cross-reference map — it dramatically simplifies remediation planning.

6. **Dependency multiplier:** Backend has 4 direct prod dependencies but 411 transitive (102× multiplier) — dominated by ts-jest's dependency tree. When a single dev tool drives 90%+ of the transitive tree, it's a vulnerability concentration risk. Flag high-multiplier tools for architecture review.

7. **Report file naming:** The config specifies `audit-{date}-{grade}.html` — the grade in the filename reflects the final synthesized grade (D), not any individual specialist's grade. Both quality-oracle (C) and dependency-auditor (B) had better grades individually, but the combined 3 P1s drove the overall to D.

8. **First audit baseline:** When no prior audit exists, all findings are NEW. The "Trend" section should clearly state "First audit — no baseline" and explain that FIXED/STILL OPEN/REGRESSED tracking starts from the next run.
