# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-04-20 — First Audit Run (run-20260420-052509)

**Services were offline during this audit.** Both `http://localhost:3001/` (backend) and `http://localhost:5173` (frontend) were unreachable. This caused performance-profiler and chaos-monkey to be skipped entirely. For future runs: check service health in the scoping phase and note it prominently in the plan so the parent session can spin up services before dispatching dynamic-mode specialists.

**Grading calibration.** With 3 P1 findings and ~28% Specifications/ coverage, the grade landed at D. The C-grade threshold in `inspector.config.yml` allows max 2 P1s — even one additional P1 from a dynamic test run (e.g., chaos-monkey finding unhandled 500s) would keep the grade at D. The key levers to reach C are: resolve the two dependency P1s (DA-001, DA-002) and fix the governance P1 (QO-001).

**Two coverage scopes produce conflicting signals.** The Plans/ scope shows 100% coverage (green), the Specifications/ scope shows ~28% (red). When synthesising, always report BOTH numbers clearly, not just the Plans/ number. The Specifications/ gap is the meaningful signal.

**Ghost FR references (QO-009).** `Source/Shared/api-contracts.md` references FR-070–FR-085 which don't exist in any spec file. These are harmless for now but will confuse future traceability runs. Flag these quickly as doc-stale rather than spec-drift since no code is claiming to implement them.

**Security escalation routing.** DA-001 (Handlebars) and DA-002 (Protobufjs) both match `injection` in the security escalation triggers. No PR was open on this branch, so the console escalation path was used. If a PR opens later, re-run the escalation block to post the badge comment.

**Cross-reference map is worth building carefully.** Three root-cause clusters emerged: (A) enforcer scope gap → resolves QO-001+QO-009, (B) missing service layer → resolves QO-002+QO-007, (C) platform transitive deps → resolves DA-002+DA-003. TheFixer should be briefed on these clusters to avoid three separate PRs where one would do.

**performance-profiler and chaos-monkey learnings exist.** Check `Teams/TheInspector/learnings/performance-profiler.md` and `chaos-monkey.md` — these were pre-populated with project context. On the next run with services online, pass these learnings to the respective specialists at dispatch time.

**Report file naming.** The `.gitignore` in `Teams/TheInspector/findings/` excludes `*.html` files. Only the JSON bug backlog is committed. Confirm this is intentional on future runs (the HTML is the rich report but it's large).
