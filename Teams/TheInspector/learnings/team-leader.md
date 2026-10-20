# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-20 — First audit (audit-2026-10-20-b2c99a)

**Scoping**
- Services were not running (backend on :3001 unreachable). Always check service health before dispatching performance-profiler and chaos-monkey — they should be skipped gracefully, not fail. Document "Skipped — services offline" in the report scope section.
- `inspector.config.yml` exists in this project and provides useful overrides (spec dirs, latency budgets, chaos scenarios, security critical_operations). Read it early in scoping.

**Synthesis**
- When all P1 findings are security CVEs, the `escalations` array in the bug backlog JSON will contain all P1s and `p1_findings` will be empty. This is correct — escalations ARE the P1 findings for security-type issues.
- The cross-reference map (Section 8) is most useful when grouped by fix action rather than by root cause category. Group findings that share the exact same `npm update X` command — this makes remediation planning concrete and fast.
- Quality oracle's spec coverage grade (D at 27.6%) and the dependency auditor's grade (D for 4 critical CVEs) both independently produced grade D. The synthesis grade must always be the worst of any specialist grade — never average.

**Grading**
- The `config.grading.D: { max_p1: 999 }` catch-all means any audit with >2 P1s is grade D regardless of P2 count or spec coverage. Don't try to "uplift" the grade based on P2 or P3 performance when P1s are present.
- Grade F is reserved for "exploitable auth bypass + critical domain failure". The proxy-addr auth bypass (DEP-002) is a dependency CVE, not a domain auth bypass — this does not trigger grade F per config intent.

**Escalation**
- No PR was open on this branch, so the `printf`-based escalation path was used (not `gh pr comment`). This is correct — always check `gh pr view` first and only use the badge-comment form when a PR exists.
- config.escalation.security_triggers should be checked against each finding's *description*, not just its title. DEP-001 (RCE) triggers "injection"; DEP-002 triggers "auth bypass"; DEP-004 triggers "sensitive data exposed". Map carefully.

**Report generation**
- The 16 mandatory sections must all be present even when data is absent. Sections 12 (Latency Baselines) and 14 (Fixed Findings) had no data for this audit — they were included with clear "not available" / "first audit" notes rather than omitted.
- Writing the JSON backlog before the HTML report helps — the HTML can then reference exact finding IDs, counts, and routes consistently.
