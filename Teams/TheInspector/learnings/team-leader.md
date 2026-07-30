# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## 2026-07-30 — First Audit (run-20260730-052653)

### Grading

- **Grade F criteria** (`F: reserved for exploitable auth bypass + critical domain failure`) is met when a CVSS 9.8 zero-precondition vulnerability exists alongside an RCE-class finding. In this run: Vitest UI server (no auth = auth bypass criterion) + Handlebars RCE (domain failure criterion) = F grade justified even though there is no in-app authentication layer.
- When grading config says `D: max_p1: 999`, do not cap at D when F criteria are also met — F is the floor, not D.

### Scoping

- **inspector.config.yml `source.dirs`** only covers `Source/` — the `portal/` application is a fully independent full-stack production app (FR-001–FR-095) not included in any quality gate. Always check for blind-spot applications before finalising scope.
- When services are offline, skip performance-profiler and chaos-monkey but document expected latency budgets from config for the report. Do not skip the section — populate with static analysis observations.
- Git branch name is reliable for report headers (`git rev-parse --abbrev-ref HEAD`). RUN_ID from `pipeline-update.sh` is the canonical run identifier.

### Synthesis

- **Cross-reference map is the most valuable synthesis step.** Finding `portal/ excluded from monitoring` appears in both quality-oracle (QO-002) and dependency-auditor (DEP-004). A single config change fixes both. Surface these multi-specialist root causes prominently.
- Escalation triggers from config (`injection`, `missing access control`, `sensitive data exposed`) should be applied to ALL P1/P2 findings, not just security-labelled ones. DEP-008 (Vite path traversal) matched `sensitive data exposed` and correctly escalated.
- When no PR context exists, use the fallback printf escalation block verbatim — include branch and run ID so the human knows exactly which audit triggered it.

### Reporting

- All 16 mandatory sections must be present even if they have no data. Section 14 (Fixed Findings) and Section 5 (Trend) both said "First audit — no baseline" — this is valid content, not an omission.
- The JSON bug backlog should include an `escalations` array separate from the P1/P2 arrays so downstream tools can easily distinguish security-routed from fix-routed items.
- Performance profiler produces latency baseline data. Even in static-only mode, include the expected budgets from config so the next dynamic run has a reference.

### Quality Oracle Patterns

- **False-green traceability gates are P1.** A gate that always reports success regardless of actual compliance is a structural failure of the spec-first model — even if there are no implementation bugs found.
- The enforcer scans by timestamp, not by config-registered plan list. This is the root cause; fixing it requires code change in `tools/traceability-enforcer.py`.

### Dependency Auditor Patterns

- Large dependency trees (portal/Backend: 577 deps) accumulate CVEs faster than small ones. The portal/Backend being invisible to the quality oracle means these CVEs silently compound over time.
- Vitest is in the top-5 CVE watch list and should be checked every audit run.
- `npm audit fix` resolves most P2/P3 CVEs; P1 CVEs usually require explicit version pins.

### Next Audit Checklist

- [ ] Re-check QO-001: has `traceability-enforcer.py` been fixed?
- [ ] Re-check DEP-001/002/003: are vitest ≥3.2.6 and handlebars ≥4.7.9 deployed?
- [ ] Re-check QO-002: is `portal/` in `inspector.config.yml source.dirs`?
- [ ] Attempt to start backend/frontend before launching performance-profiler and chaos-monkey
- [ ] Check for PR context before assuming fallback escalation path
