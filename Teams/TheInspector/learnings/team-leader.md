# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-16 — First Audit Run

1. **Service availability determines specialist modes.** Both services (backend:3001, frontend:5173) were offline. Performance-profiler and chaos-monkey were automatically skipped. Document this clearly in the report — operators need to know dynamic test coverage was zero.

2. **Grading with 6 P1s lands D, not F.** F is reserved for exploitable auth bypass + critical domain failure (per config). Security CVEs in dependencies without confirmed in-domain exploitation are P1 → D, not F.

3. **Cross-reference map is highest-value synthesis output.** The Express chain (DEP-001, DEP-005, DEP-006, DEP-014) resolves as a single `npm install express@^4.20.0`. Presenting these as grouped root causes dramatically reduces remediation effort compared to listing 4 separate tickets.

4. **Traceability gate false green (QO-001) is a force multiplier.** It makes every other spec-drift finding worse because agents get false confidence. Flag it P1 and block deployment until fixed — it undermines the entire spec-first architecture.

5. **Security escalation pattern for dependencies:** DEP security findings that match escalation triggers (injection, access control bypass) go to TheGuardians. Build-toolchain-only risks (e.g., DEP-002 handlebars in build only) still escalate because CI compromise is a TheGuardians concern, not TheFixer.

6. **First audit has no trend data.** Sections 5, 7, and 14 must explicitly say "first audit — no baseline" rather than leaving them blank or omitting them.

7. **inspector-report.md was empty on entry.** Safe to overwrite as the canonical summary file for the session.
