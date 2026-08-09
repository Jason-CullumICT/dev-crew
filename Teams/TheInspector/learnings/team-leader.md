# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-09 — First Audit Run

- **portal/ is invisible to all tooling configs.** Both `tools/traceability-enforcer.py` (hardcodes `["Source", "E2E"]`) and `Teams/TheInspector/inspector.config.yml` (`source.dirs: ["Source/"]`) omit `portal/` entirely. Always verify this blind spot at audit start — it caused 34 false enforcer failures and left the primary application unscoped.

- **Dependency auditor surfaces P1s that override quality-oracle's grade.** quality-oracle awarded C on its own; dependency-auditor added 3 CVSS-9.8 CVEs, pushing the combined grade to D. Always apply grading thresholds to the union of all specialist findings, not each specialist individually.

- **FR-dependency-* coverage will always read 0%** until the ID mismatch between spec and code is resolved. Do not treat 0% as unimplemented — verify whether the code uses aliased IDs before reporting.

- **Static-only audits miss half the picture.** performance-profiler and chaos-monkey produced no reports because services were offline. Flag this prominently in the scope section and recommend re-running with services up. Latency baselines and fault injection are major audit gaps when services are down.

- **Cross-reference map is worth building.** Four root causes each resolved 2+ findings — surfacing these saves TheFixer significant rework by showing which single fixes have the highest leverage.

- **Grading thresholds from config.grading apply to the combined finding set** across all specialists. Grade is determined by the worst P1/P2 count from any specialist, not each specialist's self-assessment.
