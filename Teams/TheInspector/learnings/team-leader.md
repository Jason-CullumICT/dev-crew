# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-05-02 — First Full Audit Run

### Context Discovery
- `inspector.config.yml` exists and is well-populated — always read it before scoping; it contains latency budgets, threat scenarios, and grading thresholds that auto-discovery alone would miss.
- Both `quality-oracle-report.md` and `dependency-auditor-report.md` are written to the repo root, not to `Teams/TheInspector/findings/`. The detailed `.md` findings files are in `Teams/TheInspector/findings/`. Check both locations when collecting specialist outputs.
- `performance-profiler-report.md` and `chaos-monkey-report.md` were absent — specialists only produce reports when they run. Always check for absence gracefully with Glob before attempting to read.

### Grading
- With `max_p1: 2` for grade C, two P1s from different specialists still lands at C — specialist findings are additive in the combined count.
- Dependency auditor grades P3 for Medium CVEs but quality-oracle grades P2 for architecture violations — severity naming is not identical. Normalize to P1-P4 scale when merging.

### Cross-Reference Synthesis
- The most useful cross-refs come from incomplete feature implementations (Root Cause 1 — dependency-linking): one plan is partially built, and multiple specialists each see a different symptom of the same root cause. Look for findings that share an FR prefix as a signal of this pattern.
- Vite ecosystem findings cluster naturally: vite, esbuild, and vitest all move together. Always present as a single "update the Vite stack" fix.

### Escalation
- `handlebars` via `ts-jest` is a recurring dependency-auditor finding in Node.js backends — add it to the watch list for future runs.
- No open PR was found on branch `audit/inspector-2026-05-02-4ea4c1` — escalation printed to console. Remind operators that the PR comment path requires an open PR against main before the Inspector runs.

### Report Generation
- All 16 HTML sections must be present. If specialists are skipped, sections 12 (latency) and chaos findings still appear with "Skipped" callouts — do not omit them.
- The Cross-Reference Map (Section 8) is the highest-value synthesis section — operators consistently use it to batch fixes. Always build it from FR prefix clustering and shared file paths.
- `bug-backlog-{date}.json` `priority_order` field should be used by TheFixer to sequence work items — P1s come first, then P2s in the order they appear in the cross-reference map.

### Baseline
- Grade C established on 2026-05-02. Next audit target: Grade B (requires QO-001 + DEP-001 resolved, P2 count ≤ 8, coverage ≥ 87% maintained).
