# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-08-02 (First Audit)

### Repo Layout

```
Source/          — backend-coder (Express API + workItemStore)
portal/          — frontend-coder (React SPA + portal backend)
platform/        — SOLO SESSION ONLY (orchestrator, Docker, pipeline scripts)
Specifications/  — requirements-reviewer
tools/           — SOLO SESSION ONLY (pipeline scripts, traceability-enforcer)
```

### Service URLs
- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Dashboard: http://localhost:9800
- Reports: http://localhost:9801

### Key Discoveries

1. **Traceability enforcer is broken for this repo.** `tools/traceability-enforcer.py` only scans `Source/` and `E2E/`. 83 of 97 FRs live in `portal/` and `platform/` — completely invisible. Always caveat enforcer results with this known blind spot until QO-001 is fixed.

2. **Two-tier coverage gap.** Always report BOTH enforcer-visible coverage (what the gate sees) AND actual coverage (across all dirs). They are very different numbers. The discrepancy is the P1 finding, not the implementation.

3. **workflow-engine.md has no FR-XXX IDs.** This is the canonical domain spec but it cannot be mechanically verified. All IDs live in `Plans/self-judging-workflow/requirements.md` as `FR-WF-*`. Cross-reference these when scoping quality-oracle.

4. **Services were offline.** performance-profiler and chaos-monkey were skipped. In future audits, check service health first and note in scope if dynamic mode is unavailable. Static analysis mode is available for both — use it rather than fully skipping.

5. **dependency-auditor writes directly to findings/.** It created `findings/audit-2026-08-02-D.md` and `findings/dep-audit-2026-08-02.json` before synthesis. The synthesis HTML should be the authoritative output; reference but do not duplicate the dep-auditor files.

6. **platform/orchestrator carries RCE CVEs.** protobufjs (CVSS 9.1) and gRPC (CVSS 7.5 DoS). Platform is solo-session-only for code, but `npm audit fix` in platform/orchestrator is legitimate for TheFixer to coordinate.

### Grading Thresholds (from inspector.config.yml)
```
A: max_p1=0, max_p2=3, min_spec_coverage=80%
B: max_p1=0, max_p2=8, min_spec_coverage=60%
C: max_p1=2, max_p2=15, min_spec_coverage=40%
D: anything worse
F: exploitable auth bypass + critical domain failure (reserved)
```

### Escalation Triggers → TheGuardians
- auth bypass, injection, sensitive data exposed, hardcoded secret, missing access control
- In this repo: template injection (handlebars), code injection (protobufjs), RCE (vitest) all triggered escalation

### Known Open Issues from This Audit (for re-verification next time)

| ID | Finding | Priority |
|----|---------|----------|
| DEP-001 | Vitest RCE CVSS 9.8 | P1 → TheGuardians |
| DEP-002 | Handlebars injection CVSS 8.1 | P1 → TheGuardians |
| DEP-003 | Protobufjs RCE CVSS 9.1 | P1 → TheGuardians |
| QO-001 | Enforcer blind spot | P1 → TheFixer solo |
| QO-002 | workflow-engine.md no FR IDs | P1 → requirements-reviewer |
| QO-003 | No service layer in Source/Backend | P2 → TheFixer backend |
| QO-004 | portal/Shared/api.ts missing blocked_by | P2 → TheFixer api-contract |
| QO-005 | seed.ts absent | P2 → TheFixer backend |
| QO-006 | Logger no dev pretty-print | P2 → TheFixer backend |
| DEP-004–011 | High CVEs (express, vite, ws, grpc, etc.) | P2 → TheFixer |

### Useful Commands for Future Audits
```bash
# Check service availability
curl -sf http://localhost:3001/ > /dev/null 2>&1 && echo "up" || echo "down"
curl -sf http://localhost:5173 > /dev/null 2>&1 && echo "up" || echo "down"

# Check CVEs (run in each module dir)
npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities'

# Check enforcer
python3 tools/traceability-enforcer.py 2>&1 | tail -5

# Count Verifies comments per directory
grep -r "Verifies:" Source/ --include="*.ts" | wc -l
grep -r "Verifies:" portal/ --include="*.ts" | wc -l
grep -r "Verifies:" platform/ | wc -l
```

### Report Artifacts Pattern
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- Bug backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (root)
