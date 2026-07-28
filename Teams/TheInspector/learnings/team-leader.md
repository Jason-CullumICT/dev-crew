# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-28 — First audit run

**Specialist report location**: Specialists write reports to the repo root as `quality-oracle-report.md`, `dependency-auditor-report.md`, `performance-profiler-report.md`, `chaos-monkey-report.md`. Read all four before synthesizing.

**Performance/chaos skipped when services offline**: Both `performance-profiler` and `chaos-monkey` require live services. On this run, `http://localhost:3001` and `http://localhost:5173` were unreachable, so both specialists were skipped. Static checks from `inspector.config.yml` were noted in Section 12 for the next dynamic run.

**Grade calculation**: Apply grading thresholds from `inspector.config.yml` to the combined finding set across ALL specialists, not per-specialist. Cross-specialist P1/P2 counts determine the final grade.

**Security escalation without a PR**: When `gh pr view` returns no PR, use the `printf` escalation path (not the `gh pr comment` path). On this run, branch was `audit/inspector-2026-07-28-7e839c` with no associated PR.

**First audit baseline**: On a first audit, all findings are NEW. The Re-Verification Summary (Section 7) will have 0 in FIXED/STILL OPEN/REGRESSED. Next run should compare against `Teams/TheInspector/findings/bug-backlog-2026-07-28.json`.

**Key finding patterns observed**:
- `Specifications/` directory specs are NOT scanned by the traceability enforcer (it only scans `Plans/`). This creates a structural blind spot: domain specs can accumulate 0% coverage silently.
- Portal workspaces (`portal/Backend`, `portal/Frontend`) have disproportionately high CVE density (54 CVEs each vs 9–11 in Source workspaces). Treat portal as higher-risk in future scans.
- `Source/E2E` workspace was completely clean (0 CVEs) — good isolation model to highlight for other areas.

**Output paths** (from `inspector.config.yml`):
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Markdown summary: `inspector-report.md` (root) — requested by caller

**Dashboard run ID format**: `run-YYYYMMDD-HHMMSS` (e.g., `run-20260728-052904`).

**Cross-reference map** is the highest-value section for remediation planning. Always build it before writing recommendations — it reveals which single actions resolve multiple findings (e.g., adding `npm audit` to CI resolves 8 DEP findings at once).
