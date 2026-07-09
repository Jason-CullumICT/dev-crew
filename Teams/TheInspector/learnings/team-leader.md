# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-09 — First audit run

**Grading applied:**
- Config thresholds: A (0 P1, ≤3 P2, ≥80% coverage) · B (0 P1, ≤8 P2, ≥60%) · C (≤2 P1, ≤15 P2, ≥40%) · D (anything worse)
- 2 P1 + 6 P2 + 99% actual spec coverage → **Grade C** (P1 count is the binding constraint)
- F is reserved for exploitable auth bypass + critical domain failure; not triggered here

**Specialist routing observed:**
- quality-oracle ran static-only and completed cleanly; graded A independently
- dependency-auditor ran static (npm audit) and graded C; was the binding driver for overall grade
- performance-profiler and chaos-monkey were skipped — both services (localhost:3001, localhost:5173) offline at audit time
- When services are offline, mention this prominently in the scope caveat (sections 4 and 12)

**Cross-reference map (section 8) is valuable:**
- The Vite/Vitest upgrade cluster (DEP-001, 003, 004, 011, 012) reduces to a single PR — surfacing this saved remediation time
- react-router-dom CVE + outdated (DEP-010, DEP-018) is another single-fix cluster
- Future: ask dependency-auditor to pre-tag cross-refs where possible

**Escalation path:**
- No PR was active on this branch — escalation printed to stdout rather than posting a GitHub comment
- The 3 escalated findings are all dev-tooling CVEs (Vitest, Handlebars, form-data), not production auth/injection issues
- Even dev-time CVEs with CVSS 9.8 warrant TheGuardians review if they affect CI environments

**Report generation:**
- All 16 mandatory sections included; sections 5 (trend) and 14 (fixed) are "first audit" stubs — populate in next run
- Section 12 (latency baselines) requires performance-profiler to have run; stub clearly and note to re-run
- The HTML report is self-contained (inline CSS) — no external dependencies needed

**What to do next audit:**
- Run with services live to populate performance-profiler and chaos-monkey results
- Compare grades: anything that was C or worse in this audit should show in section 7 (re-verification)
- Check if DEP-001, DEP-002, DEP-005 were patched — if yes they move to section 14 (fixed)
- Extend enforcer to cover all specs (QO-001) — verify it in the next audit
