# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-11-13 (audit-2026-11-13-D)

### Grading Notes

- **Grade D** was assigned because P1 count (16) > C ceiling of 2, AND spec coverage (22%) < C floor of 40%.
- P1 breakdown: 2 quality P1s (tool gaps) + 14 critical dependency CVEs. Both categories count.
- 6 of 14 critical CVEs are test-time only (tinypool, @vitest/mocker) — still P1 because build artifacts could be compromised.
- The dependency auditor's "Critical" severity maps directly to P1 in the inspector grading scale.

### Specialist Dispatch Notes

- **performance-profiler** and **chaos-monkey** were skipped — services at localhost:3001 and localhost:5173 were unreachable.
  Always check service health before dispatching dynamic-mode specialists. Static-only audits miss latency regression and fault tolerance gaps.
- **quality-oracle** and **dependency-auditor** are always static — always dispatch them regardless of service availability.
- Next audit: dispatch all 4 specialists. Run performance-profiler with static_only=true if services are still down.

### Escalation Pattern

- 3 security escalations were triggered (ESC-001, ESC-002, ESC-003) for injection, DoS chain, and IP spoofing.
- No PR existed (branch: `audit/inspector-2026-11-13-0d5a28`) — escalation printed to console only.
- If a PR exists next time, the gh pr comment block posts automatically.

### Cross-Reference Efficiency

Three root-cause groups each resolve multiple P1 findings:
1. `proxy-addr` update → closes 3 P1s across 3 workspaces
2. vitest suite update → closes 2 P1s, unblocks 1 escalation
3. Traceability enforcer rewrite → closes 2 P1s + 1 P2

Identify these before recommending fix order — maximum P1 reduction per engineering hour.

### Spec Coverage Ambiguity

- The ~22% overall coverage is misleading: the 0% for most plans is due to the enforcer's scope bug (QO-001), not missing implementations.
- The active-plan coverage (self-judging-workflow + dependency-linking) is ~100%.
- Do not use 22% as evidence of implementation gaps — use it as evidence of enforcer gaps.
- Once QO-001 is fixed, real coverage measurement becomes possible. Set a goal for the next audit.

### Project Architecture Snapshot

- **Source/** implements: Self-Judging Workflow Engine (in-memory store, work items, assessments, dependency linking)
- **Matching specs:** Specifications/workflow-engine.md + Plans/self-judging-workflow/ + Plans/dependency-linking/
- **Orphan spec:** Specifications/dev-workflow-platform.md (77 FRs for a SQLite feature-request product — appears superseded, not marked so)
- **No auth layer** (by design — config.security notes this explicitly). F grade (auth bypass) is not applicable unless auth is added.

### Open P1 Findings for Re-Verification Next Run

| ID | File | Description |
|----|------|-------------|
| QO-001 | `tools/traceability-enforcer.py:46` | Enforcer single-plan default |
| QO-002 | `Specifications/dev-workflow-platform.md` | Specs not classified/enforced |
| DA-P1-001 | `portal/Backend/package.json` | 4 critical CVEs |
| DA-P1-002 | `Source/Backend/package.json` | handlebars injection |
| DA-P1-003 | `Source/Backend/package.json` | proxy-addr spoofing |
| DA-P1-004 | `Source/Frontend/package.json` | tinypool RCE |
| DA-P1-005 | `Source/Frontend/package.json` | @vitest/mocker injection |
| DA-P1-006 | `platform/orchestrator/package.json` | proxy-addr + joi |
| DA-P1-007 | `Source/Backend/package.json` | HTTP DoS chain |

### Deliverables Written

| File | Type |
|------|------|
| `Teams/TheInspector/findings/audit-2026-11-13-D.html` | Full HTML report (16 mandatory sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-11-13.json` | JSON bug backlog |
| `inspector-report.md` | Markdown synthesis summary |
