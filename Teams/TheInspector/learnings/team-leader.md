# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-06-27 — First audit run

### Scoping
- Services were offline on this audit branch (`localhost:3001`, `localhost:5173`). performance-profiler and chaos-monkey were skipped. Always note this prominently — a dynamic audit is significantly more valuable for resilience and latency posture.
- `inspector.config.yml` `source.dirs: ["Source/"]` misses `portal/` where the majority of FRs live. This is now finding QO-001 (P1). For future runs, verify enforcer scope matches codebase layout before trusting PASSED output.

### Synthesis
- The grading config `C: { max_p1: 2 }` means 3 P1s → D, even if all 3 are tooling/dependency issues rather than business logic bugs. Communicate this clearly in the executive summary so stakeholders understand the code quality in Source/ is actually strong.
- Cross-reference deduplication is high-value: the frontend toolchain chain (DEP-001, DEP-004, DEP-008, DEP-012) and the orchestrator gRPC chain (DEP-002, DEP-007) each resolve in a single upgrade. Surfacing this in §8 saves significant remediation effort.

### Escalation
- No GitHub PR was open on the audit branch, so the escalation used the console fallback path. The instructions to trigger TheGuardians were printed. In CI runs with a PR, the badge comment path should fire automatically.
- Security trigger matching: "injection" matched DEP-002 (code injection), DEP-003 (CRLF injection), DEP-006 (regex injection). "missing access control" matched DEP-001. "sensitive data exposed" also matched DEP-001 (reads .env files). This is correct per config.

### Report
- Two specialists skipped → §12 (Latency Baselines) and §10 (parts of Risk Matrix) have gaps. Used "Services offline" banners rather than omitting sections — all 16 sections must appear per the mandatory section rule.
- First audit means §5 Trend, §7 Re-Verification, and §14 Fixed Findings all show "None / first audit" — this is correct, not an error.
