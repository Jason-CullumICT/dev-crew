# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit Run: 2026-04-22 (run-20260422-045823)

### Grade: C

### Key Discoveries

1. **Services were down in this environment** — both backend (localhost:3001) and frontend (localhost:5173) were unreachable. Always check service availability early in scoping. If both services are down, performance-profiler and chaos-monkey cannot run (chaos requires ALL services healthy). This limits the audit to static-mode only — note this prominently in the report.

2. **Spec coverage context matters** — aggregate coverage of ~30% sounds alarming but is misleading here:
   - `dev-workflow-platform.md` describes a *different* product variant (SQLite-based), not the current Express + in-memory implementation
   - `tiered-merge-pipeline.md` lives in `platform/` (orchestrator infra), not Source/
   - The active plan (`Plans/self-judging-workflow/requirements.md`) has 100% coverage (13/13 FRs)
   - **Lesson:** Always distinguish "active spec coverage" vs "aggregate coverage across all Specifications/". Document which specs are in-scope for the current product variant. The traceability-enforcer.py only scans Plans/ — this is the structural gap (QO-001).

3. **First audit baseline** — this is the first TheInspector run for this project. No prior P1/P2 findings existed in learnings. Future audits will use this as the baseline for FIXED / STILL OPEN / REGRESSED / NEW tracking.

4. **Cross-reference efficiency** — 5 findings were resolved by just 2 upgrade commands:
   - `npm install --save-dev ts-jest@30.0.0` → fixes DA-001 (P1) + DA-002 (P2) [2 findings, 1 command]
   - `npm install --save-dev vite@^6.4.2` → fixes DA-003 (P2) + DA-004 (P3) + DA-005 (P3) [3 findings, 1 command]
   - Cross-ref mapping is high-value for remediation planning — always build it.

5. **Escalation process** — no open PR was found on the branch, so the console escalation block was used. If a PR exists, the gh pr comment route provides better visibility. Check for PRs early in synthesis so the escalation is ready.

6. **Grade calculation with a P1 test-dependency CVE** — the Handlebars P1 is in ts-jest (a dev dependency), not production code. However, it still fails the B threshold (max_p1: 0). The correct approach is to grade C (which it earns), not B, and let TheGuardians assess the actual production risk. Do not downgrade P1 CVEs because they are transitive or dev-only — that decision belongs to TheGuardians.

7. **Architecture violations as P2** — CLAUDE.md declares OTel and service-layer separation as "non-negotiable architecture rules." When these are violated, always classify as P2 (architecture-violation), not P3. The violation is the gap between what was mandated and what was built.

### Grading Thresholds Applied

```yaml
# From inspector.config.yml
A: { max_p1: 0, max_p2: 3, min_spec_coverage: 80 }
B: { max_p1: 0, max_p2: 8, min_spec_coverage: 60 }
C: { max_p1: 2, max_p2: 15, min_spec_coverage: 40 }
D: { max_p1: 999 }
```

Applied: 1 P1 → fails A and B → C (1 P1 ≤ C max of 2 ✅, 6 P2 ≤ C max of 15 ✅, active coverage 100% ≥ 40% ✅)

### What to Check Next Run

- Did ts-jest get upgraded? → DA-001 should be FIXED
- Did vite get upgraded? → DA-003/004/005 should be FIXED
- Did workItemService.ts get extracted? → QO-002 should be FIXED
- Did OTel get bootstrapped? → QO-004 should be FIXED
- Did pending_dependencies status get added? → QO-005/006 should be FIXED
- Are services up this time? → run performance-profiler and chaos-monkey in dynamic mode
