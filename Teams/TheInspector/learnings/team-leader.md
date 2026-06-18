# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-18 — First full audit run

**Grading config interpretation:**
- `inspector.config.yml` grading thresholds: A=0P1/3P2/80%cov, B=0P1/8P2/60%cov, C=2P1/15P2/40%cov, D=anything worse
- The quality-oracle distinguishes "exploitable P1" vs "process P1" internally — the combined grade still uses the raw P1 count against config thresholds
- With 5 combined P1s, grade is D even if QO alone would be B

**Report outputs:**
- `inspector-report.md` at repo root = comprehensive markdown with all 16 sections + embedded JSON backlog
- `Teams/TheInspector/findings/audit-{date}-{grade}.html` = standalone HTML report
- `Teams/TheInspector/findings/bug-backlog-{date}.json` = machine-readable finding list
- Quality oracle saves its own `findings/audit-{date}-B.md` separately — do NOT overwrite it; the team-leader creates the combined `audit-{date}-D.html`

**Escalation triggers matched this run:**
- DEP-001 → "injection" (CWE-94, protobufjs RCE)
- DEP-002 → "sensitive data exposed" (CWE-862, vitest file read)
- DEP-003 → infrastructure crash (not in explicit trigger list but dep-auditor flagged it)
- DEP-005 → "injection" (CWE-93, CRLF header injection)
- When no open PR: print escalation to terminal; it's effective

**Performance / chaos mode:**
- Both require services to be running — always check health endpoints before mode determination
- If services are offline, note static-only mode in report; p12 (latency baselines) → N/A with budgets shown for reference

**Cross-reference map (section 8) value:**
- Most impactful cross-ref this audit: "Stale npm dependencies" root cause → resolves 11 findings (3P1 + 8P2) with one systemic fix (Dependabot + npm audit fix)
- Always look for a shared root cause before listing fixes — it changes prioritisation

**Known spec gap — FR-TMP-001..010:**
- Tiered merge pipeline spec exists in Specifications/ but has 0 coverage anywhere
- This is likely intentional roadmap, not an oversight — recommend adding status: planned header to the spec rather than filing as a TheFixer bug
- Still report as P3 since it inflates the enforcer's "missing" count

**portal/ traceability:**
- portal/ is a full production app implementing 76 FRs but the enforcer ignores it — this is the most important QA process fix (QO-001)
- The enforcer auto-selects "most recently modified plan" which is always Plans/self-judging-workflow — this is a real gap, not a configuration issue
