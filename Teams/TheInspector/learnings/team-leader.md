# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-05 — First Audit Run

**Grade calculation is cumulative across all specialists.**
Quality oracle gave grade C (1 P1, 4 P2). Dependency auditor gave grade D (4 P1). Combined P1 count was 5 — exceeding the C threshold of max 2 — so overall grade is D. Always aggregate before grading; never take the worst individual grade as the combined grade.

**P1 security escalations dominate the overall grade.**
4 of 5 P1 findings were dependency CVEs, not code quality issues. In projects with no automated dependency management, dependency-auditor will almost always be the grade driver. Check it first when scoping.

**Services were offline — two specialists were skipped.**
When `localhost:3001` and `localhost:5173` don't respond, performance-profiler and chaos-monkey cannot run dynamic tests. The report must clearly flag this limitation. Static checks from config.performance.static_checks are still valuable to surface but are not substitutes for measured baselines.

**Portal/Backend is a separate risk surface.**
The `portal/` directory is infrastructure (owned by solo-session, off-limits to pipeline agents) but it has its own `package.json` with 578 dependencies. The dependency auditor should always include it in scope. Its CVE count (54) was 3× higher than any application project.

**Escalation trigger matching must be literal.**
Config `security_triggers` lists: `auth bypass`, `injection`, `sensitive data exposed`, `hardcoded secret`, `missing access control`. UUID buffer overflow (DEP-003) doesn't literally match any trigger — but the dependency-auditor had already flagged it for TheGuardians. Include specialist-marked escalations even when they don't match a literal trigger string; the config list is a supplement, not an exclusive filter.

**First-audit reports have no trend data — make that explicit in all trend-facing sections.**
Sections 5 (Trend), 7 (Re-Verification), and 14 (Fixed Findings) all required "none — first audit" handling. This is the correct response; do not skip these sections.

**Cross-reference grouping by root cause is more actionable than by specialist.**
The four cross-reference root causes (dependency hygiene, spec-implementation gap, tooling scope, error suppression) cut across findings more usefully than listing findings by specialist. Teams can assign one person to each root cause cluster.

**Spec coverage at 100% can be misleading.**
Enforcer PASS with 100% coverage sounds healthy. But it only covered 29/108+ FR IDs across the repository. The executive summary must call this out clearly so stakeholders understand the number is a narrow-scope metric.
