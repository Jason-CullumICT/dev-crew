# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-23 — First Audit Run

**Traceability enforcer has two structural blind spots (critical)**
- The enforcer scans only `Source/` and only the most-recently-modified `Plans/*/requirements.md`.
- `portal/` (86 FRs) and `Specifications/tiered-merge-pipeline.md` (10 FR-TMP-* requirements) are never evaluated.
- A test with `// Verifies: FR-dependency-search` that explicitly documents "will FAIL until route is implemented" still returns PASSED from the enforcer.
- Always perform manual cross-check of enforcer output against full spec list; do not trust PASSED at face value.

**Performance-profiler and chaos-monkey require all services to be running**
- Both specialists were skipped because backend (localhost:3001) was offline at audit time.
- Always attempt service health checks before scoping; report "dynamic mode unavailable" explicitly in the audit scope section.
- Static-only audits still produce valuable findings — don't abort the audit if services are offline.

**Dependency auditor grade can drive down combined grade significantly**
- Quality-oracle alone would have scored C (1 P1, 5 P2, 88% coverage).
- Dependency auditor contributed 3 additional P1-equivalent critical CVEs → combined grade D.
- Always incorporate dependency-auditor P1s into the overall grade calculation; they count equally against the grading thresholds.

**Handlebars appears in multiple workspaces — batch the fix**
- DEP-001 (handlebars) affects both Source/Backend and portal/Backend.
- DEP-007 (vitest) affects both Source/Frontend and portal/Frontend.
- Cross-reference map (S8) is the right vehicle to surface "fix once, resolve in two places" patterns.

**inspector.config.yml grading thresholds**
- A: max_p1=0, max_p2=3, min_spec_coverage=80
- B: max_p1=0, max_p2=8, min_spec_coverage=60
- C: max_p1=2, max_p2=15, min_spec_coverage=40
- D: anything worse (including 3+ P1s)
- F: reserved for exploitable auth bypass + critical domain failure

**Report paths**
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- Bug backlog JSON: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- The findings/ directory has a .gitignore; check it if reports don't appear in git status.

**Escalation routing**
- Security CVEs (injection, RCE, sensitive data exposure) → TheGuardians
- Architecture violations, spec-drift, test gaps → TheFixer
- Spec authoring, enforcer tooling → Solo-Session (tools/ is solo-session territory)
- New feature work (e.g., FR-TMP-001 through 010 — Tiered Merge Pipeline) → TheATeam

**Prior audit baseline**
- This was the first audit. All 18 findings classified as NEW.
- Next run: compare by finding ID. FIXED if absent, STILL OPEN if present unchanged, REGRESSED if severity increased, NEW if not in this list.
