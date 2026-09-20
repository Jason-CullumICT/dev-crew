# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-20 — First audit run (run-20260920-074528)

**Grading logic (from inspector.config.yml):**
- A: 0 P1s, ≤3 P2s, ≥80% coverage
- B: 0 P1s, ≤8 P2s, ≥60% coverage
- C: ≤2 P1s, ≤15 P2s, ≥40% coverage
- D: anything worse; F: exploitable auth bypass + critical domain failure
- The dependency-auditor may assign its own grade (D) but the combined grade uses the config thresholds with all findings pooled across specialists.

**Dependency auditor vs. combined grade:** DA rated itself D (standalone) because it found 2 P1s and 10 P2s on its own. But combined with QO's 4 P2s and 0 P1s, the total (2 P1, 14 P2) fits the C band. Always apply inspector.config.yml grading to the combined pool, not per-specialist grades.

**Services offline = static-only audit:** backend (3001) and frontend (5173) were not available. performance-profiler and chaos-monkey were not dispatched. Note this prominently in S4 and S12.

**Escalation routing:**
- "injection" in escalation.security_triggers catches: template injection (DEP-001), code injection (DEP-002), XSS (DEP-007), path traversal (DEP-007) — postcss is a P2 escalation, not P1.
- Only DEP-001 and DEP-002 qualify as P1; DEP-007 escalates as P2 because it is a build-tool risk.
- When no PR exists, use the console escalation block (no gh pr comment).

**Cross-reference map is the most actionable section:** three separate QO findings (QO-002, QO-003, QO-004) trace to a single root cause (portal dependency-linking plan incomplete). Grouping these into one fix entry saves TheFixer time.

**platform/ exclusion from enforcer:** enforcer scan dirs are `Source/` and `E2E/` only. FR-TMP-001–010 are implemented in `platform/` — always flag this as a P3 blind-spot finding (QO-005 pattern) until the enforcer config is extended.

**Report file locations:**
- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary MD: `inspector-report.md` (repo root, as requested by parent session)
