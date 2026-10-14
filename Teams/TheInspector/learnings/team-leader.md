# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-14 — First audit run

**Grading nuance: spec coverage needs context**
The `inspector.config.yml` grading thresholds use `min_spec_coverage` which reads as a flat percentage. However the codebase has 80 roadmap FRs (dev-workflow-platform.md + tiered-merge-pipeline.md) that are intentionally not implemented yet — they're for a separate portal system. The nominal 26% coverage misleads. Always check whether low-coverage spec files are "roadmap" items before assigning a coverage-based grade penalty. In future audits, update the config to add an `exclude` list for roadmap specs, or document it in the config file.

**P1 findings from dependency-auditor push final grade below quality-oracle's grade**
Quality-oracle alone graded B (0 P1s). The dependency-auditor contributed 2 P1 CVEs that pushed the combined grade to C. Always compute the combined grade across all specialists before assigning the final letter — individual specialist grades are sub-scores, not the final answer.

**Services were offline — performance-profiler and chaos-monkey did not run**
Both specialists require at least one service to be healthy. When services are offline, these specialists have no static fallback defined in the config. The report must flag their absence explicitly and note that latency baselines and fault-injection coverage are unknown. Schedule a follow-up dynamic audit when services are healthy.

**Dependency audit surfaces most security escalations**
In this run, all 5 TheGuardians escalations came from the dependency-auditor (proxy-addr, protobufjs, vitest, react-router, grpc-js). The quality-oracle found no security issues. For future audits, the dependency-auditor is the primary source of security escalations for this stack; the quality-oracle focuses on spec drift and architecture rules.

**Cross-reference map is the highest-value synthesis output**
The three root causes identified (dependency staleness, incomplete feature backlog, enforcer scope gap) each span multiple findings. Surfacing these to operators as "one fix resolves N findings" is more actionable than a flat finding list.

**Report file locations**
- Markdown report: `inspector-report.md` (repo root)
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
