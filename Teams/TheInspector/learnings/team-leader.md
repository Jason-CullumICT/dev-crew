# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-07-12 — First Full Audit (Static Only)

### Baseline Established
- **Grade:** D (first audit — no prior baseline)
- **P1:** 4 | **P2:** 8 | **P3:** 14 | **P4:** 13
- **Spec coverage:** ~73% (69/95 canonical FRs)
- **Specialists run:** quality-oracle (static), dependency-auditor (static)
- **Specialists skipped:** performance-profiler, chaos-monkey — services offline at localhost:3001 and localhost:5173

### Key Findings for Next Run

| Finding | ID | Priority | Status |
|---------|----|----------|--------|
| protobufjs RCE (CVSS 9.8) via @grpc/grpc-js | DEP-001 | P1 | OPEN — escalated to TheGuardians |
| vitest UI file read + RCE (CVSS 9.8) | DEP-002 | P1 | OPEN — escalated to TheGuardians |
| Enforcer blind spot — portal/ never scanned | QO-001 | P1 | OPEN |
| 6 orphan FRs (FR-090–095) with no spec | QO-002 | P1 | OPEN |
| Direct DB call in route handler (teamDispatches.ts) | QO-003 | P2 | OPEN |
| 3× silent .catch(() => {}) blocks | QO-004 | P2 | OPEN |
| tiered-merge-pipeline.md 0% traced | QO-005 | P2 | OPEN |
| handlebars 8 CVEs via @grpc | DEP-003 | P2 | OPEN |
| vite path traversal | DEP-004 | P2 | OPEN |
| form-data CRLF injection | DEP-005 | P2 | OPEN |
| @grpc/grpc-js server crash | DEP-006 | P2 | OPEN |
| path-to-regexp ReDoS | DEP-007 | P2 | OPEN |

### Cross-Cutting Root Causes
1. **@grpc/grpc-js chain** → resolves DEP-001 (P1) + DEP-003 + DEP-006 (P2) in one change — check if removable
2. **Stale dev toolchain** → resolves DEP-002 (P1) + DEP-004 (P2): `npm update vitest@>=3.2.6 vite@>=6.4.3`
3. **Enforcer scope gap** → resolves QO-001 + QO-002 (both P1): add "portal" to source_dirs:69

### Grading Thresholds (inspector.config.yml)
```
A: max_p1=0, max_p2=3,  min_coverage=80%
B: max_p1=0, max_p2=8,  min_coverage=60%
C: max_p1=2, max_p2=15, min_coverage=40%
D: anything worse
F: reserved for exploitable auth bypass + critical domain failure
```
Resolving both security escalations (DEP-001, DEP-002) plus QO-001 and QO-002 would move P1→0 and enable a B grade (P2=8, coverage=73% both within B thresholds).

### Scoping Notes for Next Run
- Check backend health: `curl -sf http://localhost:3001/ > /dev/null` — if up, enable performance-profiler + chaos-monkey in dynamic mode
- All services must be healthy for chaos-monkey dynamic mode
- Run enforcer with: `python3 tools/traceability-enforcer.py --plan dev-workflow-platform` (not auto-detect — non-deterministic per QO-006)
- Spec coverage will be meaningfully different once portal/ is in enforcer scope (QO-001 fix)

### Report Paths
| Artifact | Path |
|----------|------|
| HTML report | `Teams/TheInspector/findings/audit-2026-07-12-D.html` |
| Bug backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-07-12.json` |
| Summary | `inspector-report.md` |
