# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Audit Run: 2026-07-16

**Branch:** audit/inspector-2026-07-16-c67d22  
**Grade:** D  
**Specialists run:** quality-oracle (static), dependency-auditor (static)  
**Specialists not run:** performance-profiler, chaos-monkey (no live services at synthesis time)

### Key Findings This Run

**Highest-impact:** 94 CVEs across 6 npm workspaces including 3 CVSS 9.8 vulnerabilities (protobufjs RCE, handlebars injection, vitest file disclosure). Escalated 5 findings to TheGuardians.

**P1 broken feature:** GET /api/search completely unimplemented — DependencyPicker modal broken for all users. Test file explicitly disclaims 4 tests will fail.

### Patterns to Watch in Future Audits

1. **npm audit gate absence** — No CI gate blocking critical CVEs. A perennial risk until Dependabot or `npm audit` CI step is added. Check for this first in future dependency audits.

2. **portal/ codebase is a blind spot** — The traceability enforcer only scans `Source/`. ~100+ portal FRs are completely unverified. This inflates apparent coverage. Fix pending in QO-002.

3. **Dual logger pattern** — Two logger files is a code smell indicating parallel implementation. The enforcer won't catch this — look for it manually.

4. **Jest/Vitest split** — Backend uses Jest, frontend uses Vitest. CLAUDE.md mandates Vitest for both. Check `Source/Backend/package.json` test script in future runs.

5. **portal/Backend dep bloat** — 577 transitive dependencies (397 production). The highest CVE count of any workspace (54). Watch this workspace closely.

### Synthesis Tips

- **Grade calculation:** Count P1 across ALL specialists before assigning grade. Quality Oracle gave itself a C (1 P1), but adding dependency-auditor's 3 P1s → D overall.
- **First-audit baseline:** All findings are NEW; the re-verification table will be meaningful from the second audit onward.
- **Escalation trigger words:** "injection," "code execution," "file read," "redirect," "sensitive data" — flag these to TheGuardians even if dependency-auditor surfaces them.

### Missing Specialists

- **performance-profiler:** Needs live backend at http://localhost:3001. Run `curl -sf http://localhost:3001/ > /dev/null 2>&1` before scoping to confirm. Static checks from config: unbounded list pagination, no latency measurements available.
- **chaos-monkey:** Needs ALL services healthy. Static mode checks available via config fault_scenarios: invalid state transitions, malformed requests.

### Escalation Path Used

No active PR detected. Used terminal escalation path (branch: audit/inspector-2026-07-16-c67d22, no PR number). For future runs with an open PR, the `gh pr comment` path in the escalation block will post the security signal directly.

### Report Artifacts

- HTML report: `Teams/TheInspector/findings/audit-2026-07-16-D.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-2026-07-16.json`
- Summary: `inspector-report.md` (repo root)
