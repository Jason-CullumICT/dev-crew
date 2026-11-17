# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-17 — First full audit run

**Synthesis pattern that worked well:**
- Read quality-oracle-report.md and dependency-auditor-report.md from repo root; detailed findings also in `Teams/TheInspector/findings/dependency-audit-{date}.md`
- Cross-reference map (§8) is high-value: 4 root causes explained 10 P1/P2 findings; "single fix resolves N findings" framing helps operators prioritize
- Grade is mechanically computed from config grading thresholds — count P1s first, then P2s; spec coverage is a tie-breaker

**Grading nuance:**
- P1 from an orphaned spec (governance issue) counts in the P1 total by strict config rules, pulling the grade from C to D. Consider whether future configs should distinguish "runtime P1" vs "governance P1" in the thresholds.
- Active plan coverage (100%) is the meaningful metric for the implemented system; Specifications/ root coverage (25%) is misleading because it includes an orphaned spec for a planned-but-not-started system.

**Services were offline:**
- Dynamic specialists (performance-profiler, chaos-monkey) produced no findings. Next audit: ensure services are running for complete coverage.
- The branch was `audit/inspector-2026-11-17-617c82` — not a PR branch. Escalation fell back to printf (no gh pr comment). This is expected behavior.

**Dependency accumulation pattern:**
- 645 total dependencies with 28 CVEs suggests no prior CI/CD npm audit gate existed. Recommend adding `npm audit --audit-level=moderate` gate as first remediation priority so this doesn't silently recur.
- 3 direct dependencies with CVEs (vitest, vite, uuid) had 2–5 major version gaps — consistent with no automated update process.

**Escalation triggers hit:**
- DEP-002 (handlebars injection), DEP-003 (proxy-addr IP spoofing), DEP-004 (uuid buffer), DEP-005 (vite traversal), DEP-009 (react-router redirect) → all 5 sent to TheGuardians

**Files generated:**
- `Teams/TheInspector/findings/audit-{date}-{grade}.html` — full 16-section HTML report
- `Teams/TheInspector/findings/bug-backlog-{date}.json` — structured backlog with P1/P2 findings + escalations array
- `inspector-report.md` — markdown summary at repo root (user-requested artifact)
