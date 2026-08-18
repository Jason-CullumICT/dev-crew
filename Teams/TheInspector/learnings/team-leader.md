# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-18 — First Audit (inspector-2026-08-18)

**Grade: D** | P1: 4 | P2: 13 | P3: 34 | Spec coverage: 93.8% active-plans

#### What Went Well
- Dependency auditor found critical CVE cluster quickly; all three P1s are straightforward npm update fixes
- Quality oracle correctly identified the spec-drift P1 (obsolete spec with 74 FRs for a different app)
- Cross-reference mapping identified 5 root causes that each resolve multiple findings with a single fix

#### Key Discoveries
1. **Obsolete spec is the biggest traceability blocker** — `Specifications/dev-workflow-platform.md` (74 FRs for a SQLite feature-tracker) is completely disconnected from the actual in-memory work-item engine in Source/. This one document creates a P1 and inflates apparent "uncovered FRs" by 74. Always check whether the active spec matches the actual implementation domain before accepting coverage numbers.

2. **Traceability enforcer has a latent bug** — It only scans the most-recently-modified plan (not all plans). When synthesizing coverage metrics, note the enforcer's scope and caveat accordingly. The 93.8% figure is a single-plan number, not a project-wide number.

3. **Dynamic modes both skipped** — performance-profiler requires backend health check passing; chaos-monkey requires ALL services. When services are down, flag these explicitly in the report and include the static concerns noted in inspector.config.yml under `performance.static_checks`. Do NOT omit the sections — use "Pending" status rows in the latency table.

4. **Dependency audit scope** — The project has ~800 npm packages across 4 projects. E2E project was clean. The platform/orchestrator project carries protobufjs (10 CVEs, CVSS 9.8) — the highest-severity finding in the audit. Always check platform/ dependencies even though pipeline agents are restricted from editing platform/.

5. **Escalation path** — No PR was open on this branch (`audit/inspector-2026-08-18-83b0f8`), so escalation went to terminal. In a normal PR-based workflow, the gh pr comment command would post the escalation badge. Confirmed the branch detection works correctly.

#### Grade Progression for Next Audit
- Fix DEP-001, DEP-002, DEP-003 → removes 3 P1s
- Archive obsolete spec (QO-001) → removes 1 P1
- After all P1s fixed: 0 P1s, 13 P2s → **Grade C** (within C threshold of max_p2=15)
- Fix 5+ P2 CVEs (one `npm audit fix` run) → 0 P1s, ≤8 P2s → **Grade B**
- Fix remaining P2s + service layer → **Grade A** possible

#### Synthesis Timing
- Reading 3 reports + config: ~2 min
- Generating HTML (16 sections) + JSON backlog + inspector-report.md: ~8 min
- Total team-leader time: ~10 min
