# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-06-17 — Full Audit (First Baseline)

### Audit Outcome
- **Grade: D** (3 P1 findings; grading threshold C = max_p1 ≤ 2)
- **Specialists run:** quality-oracle (static), dependency-auditor (static)
- **Specialists not run:** performance-profiler, chaos-monkey (services offline at audit time)
- **Escalated to TheGuardians:** 3 findings (DEP-001 Handlebars CVSS 9.8, DEP-002 Vitest CVSS 9.8, DEP-004 Esbuild CVSS 8.1)

### Key Discovery: Three-Directory Project Layout

This project has **three distinct application directories** — each with its own spec:

| Dir | Spec | FR IDs | Notes |
|-----|------|--------|-------|
| `Source/` | workflow-engine.md | FR-WF-001–013 | In-memory work item store |
| `portal/` | dev-workflow-platform.md | FR-001–095, FR-DUP-*, FR-dependency-* | SQLite portal UI |
| `platform/` | tiered-merge-pipeline.md | FR-TMP-001–010 | Orchestrator infrastructure |

**Do not scope the audit to only `Source/`** — all three directories need coverage.

### Enforcer Blind Spot (Critical — affects future audit scoping)

`tools/traceability-enforcer.py:78` only scans `["Source", "E2E"]`. Running it on portal/ plans always fails with false positives; the default run always passes (self-judging-workflow). This is **QO-001 (P1)** — must be fixed before the next audit or the verification gates remain misleading.

Fix: Add `"portal"` and `"platform"` to `source_dirs` in traceability-enforcer.py.

### Services Were Down — Dynamic Specialists Cannot Run

At audit time, both backend (localhost:3001) and frontend (localhost:5173) were unreachable. This means:
- performance-profiler could not collect latency baselines
- chaos-monkey could not run fault injection scenarios
- **Next audit: start services first**, then dispatch performance-profiler and chaos-monkey in dynamic mode

The 5 chaos scenarios in inspector.config.yml are still untested:
- Backend restart (process-kill)
- Concurrent state transitions (static-analysis)
- Malformed request body (static-analysis)

### Grading Calibration

Per inspector.config.yml:
- **A:** max_p1=0, max_p2=3, min_spec_coverage=80
- **B:** max_p1=0, max_p2=8, min_spec_coverage=60
- **C:** max_p1=2, max_p2=15, min_spec_coverage=40
- **D:** max_p1=999 (fallback for anything exceeding C threshold)
- **F:** reserved for exploitable auth bypass + critical domain failure

This app has no authentication layer, so F is technically unreachable per config. Grade D is the floor for this project until P1 CVEs are resolved.

### Path to Grade C (Next Audit Target)
Fix DEP-001 (Handlebars) + DEP-002 (Vitest) → drops P1 count from 3 to 1 (QO-001 only) → satisfies C threshold (max_p1=2).

### npm Workspace Structure

6 workspaces: Source/Backend (411 deps), Source/Frontend (230 deps), Source/E2E (4 deps), platform/orchestrator, portal/Backend, portal/Frontend. Each manages its own package.json independently — no monorepo lock file at root. Run `npm audit` in each workspace; single `npm audit fix` at root does not cover all.

### Cross-Reference Map Insight

The most effective remediation chains are:
1. **QO-001 fix → resolves QO-001, QO-002 (visible), QO-003 (verifiable), QO-004, QO-005, QO-006** — single 15-min change unlocks 6 fixes
2. **Frontend npm audit fix (vite + vitest) → resolves DEP-002, DEP-003, DEP-004, DEP-006** — one command
3. **Backend npm audit fix → resolves DEP-001, DEP-005, DEP-012** — one command

### Learnings for Scoping Future Audits

- **First git log entry:** ae8e2bf "Quality Oracle report" — only one commit in log (repo is fresh or shallow clone)
- **inspector.config.yml location confirmed:** Teams/TheInspector/inspector.config.yml
- **Findings output dir:** Teams/TheInspector/findings/ — use filename_pattern from config
- **Prior learnings to read:** Teams/TheInspector/learnings/{quality-oracle,dependency-auditor,performance-profiler,chaos-monkey}.md
- **Specialist reports land at repo root** (quality-oracle-report.md, dependency-auditor-report.md) then detailed reports go to findings/ — check both locations
