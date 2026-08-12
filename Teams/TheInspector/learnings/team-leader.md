# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-08-12 (First Run)

### Grade
**D** — 4 P1 findings (exceeds C-grade max_p1: 2). 3 CVSS 9.8 CVEs + 1 tooling gap.

### Repo Structure Discovery
This repo contains THREE separate codebases with distinct requirement namespaces:
1. `Source/` — FR-WF-* (self-judging workflow engine, in-memory store)
2. `portal/` — FR-001 to FR-069 (full feature-request/bug/cycle product, SQLite) — NOT a "debug UI"
3. `platform/` — FR-TMP-* (tiered merge pipeline, orchestrator infrastructure)

**CLAUDE.md describes portal/ as "Debug portal UI" — this is outdated/wrong.** The actual product lives there.

### Specialist Availability
- quality-oracle: always available (static)
- dependency-auditor: always available (static)
- performance-profiler: requires backend at :3001 — was offline this run
- chaos-monkey: requires ALL services up — was offline this run

When scoping, always check service health FIRST to set specialist modes correctly.

### Grading Thresholds (from inspector.config.yml)
- **A:** 0 P1s, ≤3 P2s, ≥80% spec coverage
- **B:** 0 P1s, ≤8 P2s, ≥60% spec coverage
- **C:** ≤2 P1s, ≤15 P2s, ≥40% spec coverage
- **D:** Exceeds C thresholds (not F)
- **F:** Exploitable auth bypass + critical domain failure

### Spec Coverage Nuance
The raw 0% coverage for FR-001–069 and FR-TMP-* is a **structural product split**, not a code gap. When calculating the effective grade-determining coverage, use only active plans that map to Source/:
- Plans/self-judging-workflow: 100%
- Plans/dependency-linking: ~93%
- Effective Source/ coverage: ~96%

### CVE Escalation Pattern
All CVSS 9.8 (Critical) CVEs with code-execution risk go to [ESCALATE → TheGuardians]:
- Arbitrary file execution (Vitest)
- Code injection (protobufjs)
- Template injection RCE (Handlebars)

Dependency CVEs for DoS, header injection, SSRF stay in TheFixer backlog as P2.

### Cross-Reference Map is High-Value
The cross-reference map (§8) is the most actionable part of the report. Finding root causes that span multiple specialists allows a single fix to close multiple finding IDs. Always invest time in this section — it is what operators actually use to prioritise.

### Enforcer Issue is a P1
QO-001 (traceability enforcer blind to 7 of 8 plans) must be rated P1 because it gives false confidence on every CI run. Even though it's a tooling gap rather than a runtime vulnerability, it blocks the entire QA assurance chain.

### Pipeline Update
At synthesis completion, always update the dashboard with grade and P1/P2 totals:
```bash
bash tools/pipeline-update.sh --team TheInspector --run "$RUN_ID" \
  --agent team_leader --action complete --verdict passed \
  --metrics '{"grade": "D", "p1_total": 4, "p2_total": 13}'
```
