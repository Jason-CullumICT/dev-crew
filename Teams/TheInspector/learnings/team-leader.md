# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-06-26 (run-20260626-062537)

### Repo Structure: Three Distinct Systems, One Config Gap

dev-crew is NOT a single-app repo. It contains three co-located systems:
- `Source/` — self-judging workflow engine (FR-WF-001–013, FR-dependency-*)
- `portal/` — dev-workflow platform UI + backend (FR-001–095)
- `platform/orchestrator/` — tiered-merge pipeline (FR-TMP-001–010)

**inspector.config.yml only lists `Source/`** as the source dir. In every future audit, the scoping phase MUST manually expand the dirs to include `portal/` and `platform/orchestrator/`. Track finding QO-006 until the config is fixed.

### Specialist Dispatch Without Live Services

Performance-profiler and chaos-monkey require live services. Backend runs on localhost:3001, frontend on localhost:5173. In CI / audit branch runs these are typically offline.

**Pattern to follow:**
1. Check service health with `curl -sf {url} > /dev/null 2>&1` in the scoping phase
2. If offline → skip dynamic specialists, note in report, mark as "static only"
3. Add a recommendation in §15 to re-run with services live

### Traceability Enforcer Is Not a Reliable Gate

The enforcer uses "most recently modified requirements.md" strategy. In a multi-plan repo this always resolves to one plan. The CI gate PASSED on 11% of requirements. Never trust the enforcer output alone — always cross-check with `grep -r "// Verifies:" Source/ portal/ platform/` to get actual coverage.

### Grading: P1 CVEs Drop Grade Below B Automatically

Config threshold B requires max_p1=0. Any P1 finding → grade C or below. The dependency-auditor found 2 P1 CVEs on this run. If P1s are from CVEs only (not domain security exploits), grade is C not D. Domain security exploits (auth bypass, injection in app logic) → D or F.

### Escalation: Four Security Triggers in This Codebase

Findings tagged for TheGuardians in this run:
- DEP-001 (RCE) — injection/code execution trigger
- DEP-003 (CRLF injection) — injection trigger
- DEP-004 (path traversal) — missing access control trigger
- DEP-008 (PostCSS XSS) — injection trigger

All are dev-toolchain / build-time CVEs, not runtime app vulnerabilities. TheGuardians should verify no prod build artifacts are exposed.

### Cross-Reference: Stale Toolchain Compounds Findings

Upgrading `vite@^8.1.0` alone closes: DEP-001 (via vitest dep), DEP-004, DEP-008, DEP-011, DEP-018, DEP-019 — six findings from one operation. Always build the Cross-Reference Map (§8) before writing recommendations so the highest-leverage fixes appear first.

### Report Output Convention

Files saved to `Teams/TheInspector/findings/`:
- HTML report: `audit-{YYYY-MM-DD}-{GRADE}.html`
- Bug backlog: `bug-backlog-{YYYY-MM-DD}.json`
- Dependency audit: `dependency-audit-{YYYY-MM-DD}.md` + `.json` (filed by dependency-auditor directly)
