# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## 2026-08-01 — First Audit Run

### Report generation
- Specialist reports are written to the workspace root (`./quality-oracle-report.md`, `./dependency-auditor-report.md`), not to `Teams/TheInspector/findings/`. Check both locations.
- The dependency-auditor also writes a detailed report and JSON to `Teams/TheInspector/findings/dependency-audit-{date}.md` — read both the workspace-root summary AND the detailed findings file for the full picture.
- Performance-profiler and chaos-monkey reports do not appear when services are offline — treat their absence as a soft skip, not an error.

### Grading
- Apply grading thresholds from `inspector.config.yml` strictly: C allows max 2 P1s; 3 P1s forces D regardless of P2/P3 counts.
- Both specialists produced grades independently (quality-oracle: C, dependency-auditor: D). The overall grade is the lower of all specialist grades — D wins.

### Escalation
- Run the escalation block even when no PR is open. The stdout fallback message is actionable.
- The dependency-auditor already tags findings `[ESCALATE → TheGuardians]` — collect these directly rather than re-evaluating from security_triggers.
- Typical escalation volume: 6–10 CVE-based findings per audit when dependencies are significantly out of date.

### Cross-reference mapping
- Three common cross-ref patterns emerged: traceability tooling gaps (QO-001/003/004), outdated build-chain packages sharing a single fix (DEP-002/006/007/017), and spec-drift clusters (QO-001/002).
- Always check if a single `npm update` resolves multiple CVEs in the same toolchain (e.g., upgrading vite fixes vitest, postcss, and esbuild transitive CVEs).

### Next audit setup
- Schedule the next run with services healthy to enable performance-profiler and chaos-monkey dynamic mode.
- Establish an `npm audit` CI gate to prevent future dependency regressions before they accumulate.
- When prior audit exists: load the prior bug-backlog JSON and diff against current findings to populate FIXED / STILL OPEN / REGRESSED columns.

### False positives to watch
- The traceability enforcer gives PASS for any file carrying a `// Verifies: FR-XXX` comment, including test stubs for unimplemented routes. Do not trust the enforcer PASS signal until QO-003/004 are fixed.
- Dependency audit CVE counts may include dev-only dependencies (vitest, esbuild) — note these in the report but still count them in the grade since they affect CI/CD security posture.
