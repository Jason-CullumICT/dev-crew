# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## 2026-08-26 — First Audit Run

### Spec Alignment Is the Primary Grade Driver

The single biggest grade risk for this project is **spec/implementation mismatch** — not bugs in the code. `dev-workflow-platform.md` has 70 requirements for a product that doesn't exist in source, dragging overall coverage from ~100% (for the actual product) to 15.1%. Before treating low coverage as a code problem, first determine whether the spec is stale/misaligned.

**Lesson:** At audit start, do a quick sanity check: do the specs in `Specifications/` actually describe the product in `Source/`? If not, flag it immediately as P1 (QO-001 pattern) — it will dominate the report and mislead all other analysis.

### Traceability Enforcer Has a Blind Spot

`tools/traceability-enforcer.py` scans `Plans/` (13 FRs), not `Specifications/` (86 requirements). It also uses a different ID format than the inspector config. The gate always passes regardless of how many requirements are unimplemented.

**Lesson:** Always verify which directory the enforcer actually scans (read the script, not the config). Do not trust enforcer "PASSED" output as evidence of real spec coverage without confirming the scan scope.

### Dependency Debt Accumulates Silently in portal/Backend

`portal/Backend` has 577 dependencies and 55 CVEs (2 critical). It is the highest-risk workspace by a significant margin. The OpenTelemetry ecosystem in this workspace is 174 releases behind (0.40 → 0.221).

**Lesson:** Flag `portal/Backend` as the highest-priority workspace for dependency-auditor to investigate first. Instruct it to spend extra analysis time there.

### Static-Only Audit Misses Half the Risk Surface

Performance-profiler and chaos-monkey were both skipped because services were offline. The three threat scenarios in `inspector.config.yml` (concurrent state transitions, malformed request body, backend restart) remain untested.

**Lesson:** When scheduling audits, ensure services are running first. If they can't be started, note it prominently in the scope section and reduce the grade ceiling to C (acknowledging incomplete coverage). Consider including a "services health pre-check" step before dispatching specialists.

### Grade Calculation — Watch the C→D Cliff

The config grades:
- C: max_p1=2, max_p2=15, min_spec_coverage=40
- D: anything worse

With dependency CVEs generating P1s easily (3 from one npm audit run), it's straightforward to accumulate 3+ P1s and fall to D. This is by design — P1 CVEs are genuinely severe. Don't soften the grade; flag it clearly and redirect to rapid remediation.

### Escalation Path

No GitHub PR was open during this audit. Used the printf escalation path (console output) rather than the gh pr comment path. For future runs, check `gh pr view` first before assuming no PR context.

### Positive Signals to Preserve

The workflow-engine implementation is exceptionally clean:
- 100% spec coverage (FR-WF-001..013)
- No hardcoded secrets
- No console.log leaks
- No skipped tests
- Consistent API response shapes
- Structured logging abstraction used throughout

These are signs of good team discipline. Preserve and extend these patterns to the rest of the codebase.
