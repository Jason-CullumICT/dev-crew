# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-07-02 — First Audit Run

- **Services were offline** during this audit (backend at :3001 and frontend at :5173 did not respond). performance-profiler and chaos-monkey were skipped. Always check service health early and note in §4 (Scope & Environment) so readers know dynamic risk is unquantified.
- **Grade is driven by P1 count** — 4 P1 findings exceeded the C-grade cap of 2, pushing to D even though spec coverage was 91% (well above thresholds). When P1 count is high, the grade always drops to D regardless of other metrics.
- **Dependency audit dominates finding count** — 3 of 4 P1 findings were CVEs from dependency-auditor. Always read the dependency-auditor JSON file (`dependency-audit-{date}.json`) for the structured data; the markdown report is summary-only.
- **Injection triggers always escalate to TheGuardians** — DEP-002 (Handlebars) and DEP-005 (form-data) both matched the `injection` security trigger. The escalation block ran in CLI mode (no PR detected). Branch name was `audit/inspector-2026-07-02-0f328e`.
- **Cross-reference map**: the single most impactful fix is adding a `npm audit --audit-level=high` CI gate — it would have blocked 7+ of the dependency findings before reaching audit. Flag this prominently in executive summary.
- **portal/Backend is the architectural risk hotspot**: 54 CVEs, dev/test deps in production paths, two deployment blockers. A structural fix (separating devDependencies) has more leverage than individual CVE patches.
