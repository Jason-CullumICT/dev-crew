# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-27 — First Audit Run

#### Grading Calibration
- **With dependency CVEs counted:** quality-oracle can return B standalone while dependency-auditor returns D. The combined TheInspector grade (C in this case) reflects the worst-case finding set — don't anchor on any single specialist's grade.
- **Threshold:** 2 P1s + 13 P2s → Grade C (matches config: max_p1:2, max_p2:15).
- **npm audit fix is a high-leverage action:** Running it in both workspaces resolves ~11 P2 CVEs in a single operation. Always surface this as a cross-reference in §8.

#### Specialist Modes
- **Services were offline** this run. performance-profiler and chaos-monkey fell back to static mode. Latency data is unavailable. Recommend scheduling a follow-up dynamic audit when services are running.
- **Static mode produces no dynamic findings** — don't interpret absence of performance findings as a clean bill of health.

#### Scope Gaps to Carry Forward
- `portal/` (76 FRs) and `platform/` (13 FRs) are **not in the traceability enforcer scope** — 89 requirements unaudited by the enforcer tool. QO-003 tracks this. Future audits must note this caveat explicitly.
- The enforcer's green result covers only `Plans/self-judging-workflow/requirements.md` → do not interpret as full-project pass.

#### Escalation Routing
- **4 findings escalated to TheGuardians** this run: DEP-001 (Handlebars injection), DEP-004 (CRLF), DEP-007 (PostCSS source maps), DEP-010 (open redirect).
- No PR or GitHub repo was detectable in this environment — used console escalation path.
- Next run: check `gh repo view` and `gh pr view` before synthesis to determine which escalation path to use.

#### Report Structure
- All 16 mandatory HTML sections were generated. Section 8 (Cross-Reference Map) was particularly useful: identified that a single `npm audit fix` resolves 10 of 11 P2 CVEs.
- Keep the JSON bug backlog aligned with the HTML report — escalations array must mirror the `[ESCALATE → TheGuardians]` tags.
