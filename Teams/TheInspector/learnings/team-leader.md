# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-06-22 — First Audit Run

- **Grade D baseline established.** First audit found 3 P1 CVEs (all CVSS 9.8) and 12 P2 findings. Future audits compare against `Teams/TheInspector/findings/bug-backlog-2026-06-22.json`.
- **Specialist reports may be inline markdown, not separate files.** quality-oracle-report.md and dependency-auditor-report.md were root-level files. Glob for `*-report.md` to find them.
- **performance-profiler and chaos-monkey were not dispatched** because services were offline. When services are available, dispatch both for dynamic baselines. The first dynamic run will establish p50/p95/p99 baselines.
- **Dependency auditor produces both a summary report and a detailed findings file** (`Teams/TheInspector/findings/dependency-audit-{date}.md`). Always read the detailed file for full CVE data needed in the HTML report.
- **The traceability enforcer is blind to portal/** — this is a known P2 finding (QO-001). Until fixed, effective spec coverage is ~12% (13/108 requirements). Do not trust `python3 tools/traceability-enforcer.py` as a broad quality signal until QO-001 is resolved.
- **Cross-reference map (Section 8) is high-value.** Root Cause A (enforcer scoping) alone closes 4 findings. Root Cause C (Vite/Vitest upgrade) closes 5 findings. Present root causes prominently in recommendations.
- **Three P1 CVEs share CVSS 9.8** but differ in exploitability: DEP-006 is zero-precondition (most urgent), DEP-001 and DEP-012 require authenticated access. Rank escalations in that order.
