# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-30 — First Audit Run

**Services were offline** — backend (localhost:3001) and frontend (localhost:5173) were both unreachable at audit time. Always check service health first and document which specialists were skipped and why. Performance-profiler and chaos-monkey were deferred; their static-analysis flags (unbounded Map iteration, concurrent state transition integrity, malformed body handling) remain unverified.

**The F-grade criteria** (exploitable auth bypass + critical domain failure) are strict. This audit hit both: proxy-addr IP spoofing (auth bypass) and 69 unimplemented formal FRs (critical domain failure). Escalating auth bypass findings to TheGuardians immediately — don't wait for next scheduled run.

**Spec drift is the #1 issue on this project** — not code quality. The workflow engine implementation is solid (structured logging, Prometheus metrics, correct response patterns). The grade is F primarily because of spec governance: invented traceability IDs + stale spec with 69 live unimplemented FRs. Fix the specs and the grade leaps to B.

**Cross-reference map insight**: The vitest update chain (DEP-001 + DEP-002 + DEP-016) is a 1-command fix for 3 P1/P2 findings. Always identify these compound fixes early — they're high-leverage for TheFixer.

**Dashboard pattern**: `pipeline-update.sh --action init` must be called before synthesis. RUN_ID was `run-20261030-083155`.

**Escalation pattern**: When no PR exists, the escalation bash block correctly falls back to stdout notice. TheGuardians should be contacted directly for security audits on the branch. The PR comment path requires `gh pr view` to return a PR number.

**Report saved to**: `Teams/TheInspector/findings/audit-2026-10-30-F.html`
**Bug backlog saved to**: `Teams/TheInspector/findings/bug-backlog-2026-10-30.json`
