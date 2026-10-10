# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-10-10 (run-20261010-082137)

**Grade:** D · 5 P1 · 10 P2 · 8 P3 · 2 P4 (25 total) · Static-only

#### Scoping Discoveries
- Services (backend :3001, frontend :5173) were offline → static-mode only; performance-profiler and chaos-monkey were skipped. Schedule a follow-up run with live services to fill latency/chaos gaps.
- Branch: `audit/inspector-2026-10-10-bb0d3a` · No PR or repo context available (GitHub CLI returned NO_REPO). Escalation notice was written inline to the report instead of as a PR comment.

#### Cross-Specialist Patterns
- **Build toolchain is the single largest risk cluster.** Upgrading vitest@^5.0.3 + vite@^6.5.0 closes 8 findings in one pass (2 P1, 4 P2, 2 P3). Always check cross-fixing potential before listing individual remediations.
- **Spec drift and tooling blindness compound each other.** When both the canonical spec is stale (QO-001) AND the enforcer doesn't check it (QO-002), there's a systemic false-confidence problem — not just a coverage gap. Report these as a pair.
- **Permanently failing tests are a P1, not a style issue.** QO-003 (intentionally failing tests) breaks the entire CI "zero new failures" gate. Future leaders should escalate any committed test that is documented as intentionally failing.

#### Grading Notes
- Config grades D for "anything worse than C (max_p1: 2)". With 5 P1 this is firmly D.
- F is reserved for "exploitable auth bypass + critical domain failure." DEP-001 (CVSS 9.8) is a dev toolchain RCE, not a runtime auth bypass — correct to score D, not F. But TheGuardians must confirm dev env is not externally reachable.

#### Escalation Routing
- 3 findings escalated to TheGuardians: DEP-001 (Vitest RCE), DEP-007 (gRPC cert bypass), DEP-009 (React Router redirect).
- 4+ findings routed to TheFixer: QO-001, QO-002, QO-003 (P1s), plus P2/P3 tooling upgrades.
- The gRPC certificate bypass (DEP-007) is in `platform/` — pipeline agents cannot touch it. Solo session or TheGuardians must own the fix.

#### Report Quality
- All 16 mandatory sections were included. Section 8 (Cross-Reference Map) proved most valuable — identified that one vite upgrade closes 6 CVEs.
- First audit: no baseline for FIXED/REGRESSED tracking. Store this report as the comparison baseline for the next run.

#### Watch List for Next Audit
- Did vitest / vite / jest get upgraded? If yes, those 13 findings should move to FIXED.
- Were services online? If yes, run performance-profiler and chaos-monkey.
- Did requirements-reviewer canonicalize Specifications/? QO-001/002/004/007 should be FIXED or STILL OPEN.
- Did TheFixer implement GET /api/search? QO-003 should be FIXED.

