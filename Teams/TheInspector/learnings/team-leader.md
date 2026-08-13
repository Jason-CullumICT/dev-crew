# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-08-13 (Full Codebase, Grade: D)

### Grading Calibration

With 4 combined P1 findings (1 quality + 3 dep-CVEs), the project graded D.
Without the dependency P1s, quality-oracle alone would have been B.
**Lesson:** dependency-auditor's CVSS 9.8 CVEs reliably push the combined grade down
to C or D. Run dep-auditor first in future to set expectations before quality-oracle
assigns its own grade.

### Two-App Architecture — Critical Context

This repo contains **two separate products**, not one:

| App | Location | Spec | Stack |
|-----|----------|------|-------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | Express + in-memory store |
| Dev Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | Express + SQLite |

**For all future audits:** scope quality-oracle to `Source/` for the active delivery
target. Never merge `portal/` findings with `Source/` spec coverage numbers — the
enforcer has no awareness of this split.

### Specialist Mode Logic (this repo)

- Backend offline (`localhost:3001`) → performance-profiler runs static only
- performance-profiler static → chaos-monkey also static (requires all services)
- Services offline means: no p50/p95/p99, no fault injection results
- **To get full coverage:** run `npm run start` in `Source/Backend` before launching TheInspector

### Escalation Triggers Seen

- DEP-001 (`protobufjs` RCE) → TheGuardians: injection trigger matched
- DEP-003 (`handlebars` JS injection) → TheGuardians: injection trigger matched
- Neither required a PR comment (no GitHub remote found, no open PR)
- Used printf fallback escalation path

### Synthesis Approach That Worked

1. Read quality-oracle-report.md + bug-backlog JSON together (JSON has the structured data, report has the narrative context)
2. Read dependency-auditor-report.md (narrative) + dependency-audit-*.json (CVE details)
3. Compute combined P1/P2 totals → apply grading config → grade
4. Build cross-reference map by grouping findings by root cause (not by specialist)
5. Write HTML with 16 sections, then bug-backlog JSON, then inspector-report.md summary

### Report File Naming

Per `inspector.config.yml`:
- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON: `Teams/TheInspector/findings/bug-backlog-{date}.json`

The quality-oracle pre-wrote `bug-backlog-2026-08-13.json` with only QO findings.
**Team leader must overwrite it with the combined backlog** (QO + DEP + all specialists).

### Common Dependency Patterns

- `protobufjs` and `handlebars` both CVSS 9.8 in this stack — watch list
- `vitest` UI server is always a risk when exposed; affects test workspaces
- `portal/Backend` is consistently the worst workspace (55 vulns vs 9 in Source/Backend)
- abac-* projects are dormant but carry 9 vulns each (0 critical) — low priority
- `Source/E2E` is clean (0 vulns) — good isolation

### Grade Trend

| Date | Grade | P1 | P2 | P3 | P4 | Notes |
|------|-------|----|----|----|----|-------|
| 2026-08-13 | D | 4 | 10 | 4 | 2 | First audit baseline. Dep CVEs drive the D. |
