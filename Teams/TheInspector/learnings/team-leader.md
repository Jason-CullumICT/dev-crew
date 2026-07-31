# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### Run: 2026-07-31 — First Full Audit (Grade D)

**Specialist dispatch pattern:**
- quality-oracle and dependency-auditor always run static mode; read their `*-report.md` output files from the repo root.
- performance-profiler and chaos-monkey only run if services are healthy (check `curl -sf http://localhost:3001/ > /dev/null`).
- If no `performance-profiler-report.md` or `chaos-monkey-report.md` exist, they did not run — note in Scope section, document static fallback from config latency budgets.

**Grade calculation (from inspector.config.yml):**
- A: max_p1=0, max_p2=3, min_coverage=80%
- B: max_p1=0, max_p2=8, min_coverage=60%
- C: max_p1=2, max_p2=15, min_coverage=40%
- D: anything with >2 P1 findings or <40% domain spec coverage
- F: reserved for exploitable auth bypass + critical domain failure (not triggered here — no auth system exists)

**Two-tier spec system (critical context):**
- `Specifications/` = domain truth documents (FR-001 to FR-076, FR-TMP-*, tiered-merge-pipeline.md) — HIGH LEVEL
- `Plans/{feature}/requirements.md` = implementation-level specs with traceable IDs (FR-WF-*, FR-dependency-*)
- Source code traces to Plans/ FRs, NOT to Specifications/ FRs
- `Specifications/workflow-engine.md` has NO FR IDs — enforcer reports "No FR IDs found" for it
- The traceability enforcer (`python3 tools/traceability-enforcer.py`) only targets Plans/ — gives false PASS for domain specs

**Cross-reference clustering reduces remediation effort:**
- Always check if P2/P3 findings share a root cause — group them as XREF-A/B/C/D
- This run: XREF-A (observability, 3 findings → 1 PR), XREF-D (pending_dependencies, 2 findings → 1 coordinated PR)
- Cross-refs are Section 8 of the HTML report and the `cross_refs` array in bug-backlog JSON

**Escalation routing:**
- Security escalations (code injection, open redirect, traversal, CRLF): → TheGuardians
- Quality/architectural fixes: → TheFixer
- Spec ID hygiene, enforcer scope: → requirements-reviewer
- Check `config.escalation.security_triggers` to determine if a finding needs TheGuardians vs TheFixer
- Use the escalation banner at the top of HTML report for TheGuardians items — makes it impossible to miss

**Grading note — when P1 count > C threshold:**
- Grade goes to D immediately regardless of P2 count or coverage %
- The combined P1 count from ALL specialists determines the grade (not just quality-oracle's grade)
- This run: quality-oracle alone gave D (2 P1s + 0% coverage); dependency-auditor added 3 more P1s → still D

**Report output paths:**
- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary MD: `inspector-report.md` (repo root)

**Deduplication check:**
- quality-oracle covers code quality, spec tracing, architecture rules
- dependency-auditor covers CVEs and version drift
- These domains are disjoint — no finding dedup needed in practice
- Cross-refs identify thematic overlaps, not duplicate findings

**Dashboard reporting:**
```bash
# Init at start of synthesis:
RUN_ID=$(bash tools/pipeline-update.sh --team TheInspector --action init \
  --agent team_leader --name "Team Leader" --model sonnet \
  --metrics '{"task_title": "System Health Audit"}')

# Complete at end:
bash tools/pipeline-update.sh --team TheInspector --run "$RUN_ID" \
  --agent team_leader --action complete --verdict passed \
  --metrics '{"grade": "D", "p1_total": 5, "p2_total": 14}'
```

**Escalation block — no PR open:**
When no PR exists, the escalation block prints to stdout:
```
⚠  ESCALATION → TheGuardians
   Finding : [summary]
   Branch  : [branch]
   To trigger TheGuardians now: Read Teams/TheGuardians/team-leader.md
```

**Specialist report file names:**
- quality-oracle writes: `quality-oracle-report.md` in repo root
- dependency-auditor writes: `dependency-auditor-report.md` in repo root
- Detailed findings also go to `Teams/TheInspector/findings/`
- performance-profiler and chaos-monkey write their own report files if they run

**Fastest paths to a better grade:**
1. Fix all P1s → immediately eligible for C if P2s ≤15 and coverage raises to ≥40%
2. The observability XREF-A cluster is the highest-leverage P2 fix (3 findings → 1 PR)
3. Domain spec coverage is 0% — even a few `// Verifies: FR-XXX` comments in Source/ would start moving the needle once the enforcer is extended to cover Specifications/
