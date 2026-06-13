# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Audit Run: 2026-06-13

### Project Architecture Facts (dev-crew Source App)
- **Source/ app** is a work-item workflow engine (in-memory store, Express REST API, React+Vite SPA) — NOT the portal/ app described in the primary spec
- `Specifications/dev-workflow-platform.md` describes the **portal/** app (feature requests, bug reports, dev cycles) — treat it as wrong-product artifact when auditing Source/
- Canonical specs for Source/ live under `Plans/*/requirements.md`
- Three active approved plans: `Plans/self-judging-workflow/`, `Plans/dependency-linking/`, `Plans/duplicate-deprecated-status/`
- In-memory store: `Source/Backend/src/store/workItemStore.ts` — all data is ephemeral

### Grading Notes
- Grade thresholds in `inspector.config.yml`:
  - A: max 0 P1, max 3 P2, min 80% spec coverage
  - B: max 0 P1, max 8 P2, min 60% spec coverage
  - C: max 2 P1, max 15 P2, min 40% spec coverage
  - D: anything worse (no explicit upper bound on P1)
  - F: reserved for exploitable auth bypass + critical domain failure
- 5 P1 findings → Grade **D** (first run baseline 2026-06-13)

### Scoping Lessons
- Services (backend :3001, frontend :5173) were offline during first audit — all specialists ran in static mode
- Performance Profiler and Chaos Monkey generated no reports when services offline; this is expected, not a clean bill of health
- Traceability enforcer default run only checks the most-recently-modified plan file — explicitly check all three plans: `python3 tools/traceability-enforcer.py --plan {name}` for each

### Synthesis Lessons
- Dependency Auditor saves detailed findings to `Teams/TheInspector/findings/` — read `audit-{date}-P1.md` and `audit-{date}-summary.json` during synthesis rather than relying solely on the report.md summary
- Quality Oracle learnings file (`Teams/TheInspector/learnings/quality-oracle.md`) contains the most reliable persistent issue list — use it to cross-check the report
- Cross-reference grouping is high-value: 4 cross-ref groups in first run reduced 11 P1/P2 findings to 4 actionable fix-tasks

### Escalation Routing
- DEP-001 (handlebars injection), DEP-002 (protobufjs RCE), DEP-003 (vitest file-read) → TheGuardians
- QO-001 (spec mismatch) → requirements-reviewer
- All other findings → TheFixer

### Persistent Open Issues (carry forward to next audit)
| ID | Finding | Status |
|----|---------|--------|
| QO-001 | Specifications/dev-workflow-platform.md 0% — wrong product | OPEN |
| QO-002 | GET /api/search not registered in app.ts | OPEN |
| QO-003 | FR-DUP-01–13 entirely unimplemented | OPEN |
| QO-004 | 3 route handlers call store directly (service layer bypass) | OPEN |
| QO-005 | Traceability enforcer checks only most-recent plan | OPEN |
| DEP-001 | Handlebars >=4.0.0 <=4.7.8 JavaScript injection (CVSS 9.8) | OPEN |
| DEP-002 | Protobufjs <=7.5.5 RCE (CVSS 9.8) | OPEN |
| DEP-003 | Vitest <3.2.6 file read/execution (CVSS 9.8) | OPEN |
| DEP-004 | esbuild supply chain RCE (CVSS 8.1) | OPEN |
| DEP-005 | @grpc/grpc-js crash via malformed messages (CVSS 7.5) | OPEN |
| DEP-006 | path-to-regexp ReDoS (CVSS 7.5) | OPEN |

### Report Artifacts
- HTML report: `Teams/TheInspector/findings/audit-20260613-D.html`
- Bug backlog JSON: `Teams/TheInspector/findings/bug-backlog-20260613.json`
- Dep P1 detail: `Teams/TheInspector/findings/audit-20260613-P1.md`
- Dep summary JSON: `Teams/TheInspector/findings/audit-20260613-summary.json`

---

_Next audit recommended: After critical patches applied (estimated 48–72 hours). Run with services online to enable Performance Profiler and Chaos Monkey dynamic testing._
