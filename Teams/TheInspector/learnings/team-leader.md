# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit Run: 2026-08-10

### Synthesis Patterns That Worked

1. **Cross-reference map is high-leverage** — The most actionable part of the report. Finding that DEP-002 + DEP-003 + DEP-013 + DEP-014 all live in `platform/orchestrator/package-lock.json` means one solo session fixes 4 findings (2 P1, 2 P2). Always look for file-colocation opportunities before writing recommendations.

2. **Grade calculation is additive across specialists** — The quality-oracle graded itself C (2 P1s), the dependency-auditor graded itself C (3 P1s). Combined P1 count is 5, which exceeds the C threshold (max_p1: 2) → Grade D. Each specialist grades only its own domain; team-leader must recompute grade over the full P1/P2 totals.

3. **Check services before running synthesis** — Both performance-profiler and chaos-monkey were skipped because backend (port 3001) and frontend (port 5173) were offline. Next time: check service health first and note it clearly in scope, so specialists can be told whether to use static or dynamic mode.

4. **Escalation triggers are narrow but important** — Only `injection`, `auth bypass`, `hardcoded secret`, `sensitive data exposed`, `missing access control` trigger TheGuardians escalation. DoS vulnerabilities (DEP-003) do NOT trigger escalation per config — they go to TheFixer. RCE vulnerabilities (DEP-001, DEP-002) DO qualify as `injection`. Be precise.

5. **The traceability enforcer blind spot was itself a P1** — A broken CI gate (QO-001) that silently skips 88% of the codebase is an architecture violation at P1, not P2. The gate returning false pass is categorically worse than a coverage gap.

### Codebase Facts (Fast Lookup)

- `platform/` → solo session only; pipeline agents MUST NOT touch it (CLAUDE.md rule)
- `tools/traceability-enforcer.py` line 70: `source_dirs = ["Source", "E2E"]` (hardcoded — needs portal + platform)
- `portal/Shared/api.ts` lines 32–38 and 59–67: `UpdateFeatureRequestInput` and `UpdateBugInput` missing `blocked_by`
- `portal/Frontend/src/components/DependencyPicker.tsx` lines 291–293: two `as any` casts on PATCH calls
- `portal/Backend/src/database/`: only `connection.ts` and `schema.ts` exist — `seed.ts` is absent
- `platform/orchestrator/package.json`: 153 production deps, fragile protobufjs/gRPC stack
- All 8 `Plans/*/requirements.md` files have identical mtime (Aug 10 04:02) — enforcer nondeterminism
- `portal/Backend/src/services/cycleService.ts`: 526 lines (over 500-line threshold)
- `portal/Backend/src/services/featureRequestService.ts`: 506 lines (over 500-line threshold)

### Open Finding Tracker (for re-verification in next audit)

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| QO-001 | P1 | Enforcer blind to portal/ and platform/ | OPEN |
| QO-002 | P1 | Nondeterministic plan selection | OPEN |
| DEP-001 | P1 (escalated) | Vitest RCE — TheGuardians | OPEN |
| DEP-002 | P1 (escalated) | protobufjs RCE — TheGuardians | OPEN |
| DEP-003 | P1 | @grpc/grpc-js DoS | OPEN |
| QO-003 | P2 | blocked_by missing from API types | OPEN |
| QO-004 | P2 | seed.ts does not exist | OPEN |
| QO-005 | P2 | DependencySection.test.tsx + BlockedBadge.test.tsx missing | OPEN |
| QO-006 | P2 | FR-TMP-006/008/010 no Verifies: comments | OPEN |
| DEP-004..014 | P2 | 11 CVEs — see bug-backlog-2026-08-10.json | OPEN |

### Report Paths

- HTML: `Teams/TheInspector/findings/audit-2026-08-10-D.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-2026-08-10.json`
- Markdown synthesis: `inspector-report.md` (root level)
- Dependency detail: `Teams/TheInspector/findings/audit-2026-08-10.md`

### Grading Thresholds (from inspector.config.yml)

```
A: max_p1=0, max_p2=3, min_spec=80%
B: max_p1=0, max_p2=8, min_spec=60%
C: max_p1=2, max_p2=15, min_spec=40%
D: max_p1=999 (anything worse than C)
F: reserved for exploitable auth bypass + critical domain failure
```

### Next Audit Targets

To reach Grade C: Resolve all 5 P1 findings (QO-001, QO-002, DEP-001, DEP-002, DEP-003)
To reach Grade B: Additionally reduce P2 count from 15 to ≤ 8 (close 7+ P2s)
To reach Grade A: Additionally reduce P2 to ≤ 3 and maintain spec coverage ≥ 80%
