# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-11-11 — Full Audit

### Spec Coverage Trend
- **Self-Judging Workflow (FR-WF-001–013):** 100% traced — all 13 FRs have `// Verifies:` in source
- **Dependency Linking (FR-dependency-*):** 15 of 16 FRs traced — `FR-dependency-seed` missing
- **Dev-Workflow-Platform (FR-001–FR-032):** 0% traced — entire platform spec not implemented
- **Tiered Merge Pipeline (FR-TMP-001–010):** 0% traced — no implementation in Source/

### Key File Paths (for faster future audits)
- Traceability enforcer: `tools/traceability-enforcer.py` — only checks most-recently-modified `requirements.md` by default
- Backend routes: `Source/Backend/src/routes/` — 4 files only (dashboard, intake, workItems, workflow)
- Metrics: `Source/Backend/src/metrics.ts` — 7 counters, **no histograms**
- Dual logger: `Source/Backend/src/logger.ts` (compat shim) + `Source/Backend/src/utils/logger.ts` (actual impl)
- Search gap: `Source/Backend/tests/routes/search.test.ts` documents missing `/api/search` route — tests will FAIL

### Common Pattern Violations Found
1. Routes call store directly (architecture rule violation — should use service layer)
2. `dependencyCheckDuration` histogram missing despite spec requiring it
3. Traceability enforcer only auto-scans the most recent plan — other plans silently unverified
4. Two logger implementations with different call signatures create log format inconsistency

### Useful Commands
```bash
# Check all plans, not just most recent:
python3 tools/traceability-enforcer.py --plan dev-workflow-platform
python3 tools/traceability-enforcer.py --plan dependency-linking

# Find all Verifies IDs in source:
grep -rn "Verifies:" Source/ | grep -oE "FR-[A-Z0-9-]+" | sort -u

# Find files with zero Verifies in backend src:
for f in Source/Backend/src/**/*.ts; do grep -l "Verifies:" "$f" 2>/dev/null || echo "MISSING: $f"; done
```
