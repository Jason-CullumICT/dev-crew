# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-05-11 — Grade A

### Spec Coverage Trend
- **First audit baseline:** ~96% (116/121 requirements)
- All `FR-WF-001–013` (workflow-engine.md) and `FR-001–069` (dev-workflow-platform.md) are fully covered.
- Three open gaps in the `dependency-linking` plan: FR-dependency-api-types, FR-dependency-seed, FR-dependency-frontend-tests (logged in requirements.md delta as ❌ Missing — not regressions, never implemented).

### Architecture: The Two Codebases

This repo has two separate application implementations:

| Dir | Spec | FR pattern | DB layer | Status |
|-----|------|-----------|----------|--------|
| `Source/` | `workflow-engine.md` | `FR-WF-*`, `FR-dependency-*` | In-memory store | ✅ Clean |
| `portal/` | `dev-workflow-platform.md` | `FR-001–095`, `FR-DUP-*` | SQLite (better-sqlite3) | ⚠️ Route-layer violations |

The `Source/` implementation is clean and architecture-compliant.  
The `portal/` implementation systematically calls `getDb()` directly from route handlers (51 calls, 9 files) — a widespread P2 architecture violation.

### Traceability Enforcer Limitation

`tools/traceability-enforcer.py` only scans the **most recently modified** `Plans/*/requirements.md`. This means:
- Plans older than the latest are silently skipped.
- `FR-TMP-*` in `platform/` are never checked (enforcer only scans `Source/` and `E2E/`).
- Running `python3 tools/traceability-enforcer.py` will PASS even when other plans have open gaps.

**To run a full multi-plan check**, run the enforcer explicitly against each plan:
```bash
python3 tools/traceability-enforcer.py --plan self-judging-workflow
python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md
```

### Key File Paths for Faster Future Audits

| What to check | Path |
|--------------|------|
| Spec requirements | `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md` |
| Plan requirements | `Plans/*/requirements.md` |
| Source traceability | `grep -rn "Verifies:" Source/ portal/ platform/` |
| Portal route violations | `grep -rln "getDb()" portal/Backend/src/routes/` |
| Missing dependency items | `Plans/dependency-linking/requirements.md` (Implementation Delta table) |
| Traceability enforcer | `python3 tools/traceability-enforcer.py` |
| All unique FR IDs in use | `grep -rn "Verifies:" Source/ portal/ platform/ \| grep -oP "FR-[A-Z0-9-]+" \| sort -u` |

### Common Pattern Violations Found

1. **eslint-disable-next-line react-hooks/exhaustive-deps** — found in 2 production files; likely masking missing hook deps.
2. **Duplicate logger abstraction** — `Source/Backend/src/logger.ts` re-exports `src/utils/logger.ts`. Functional but confusing.

### Re-verification Protocol

On next audit, check:
- [ ] QO-001: Has `getDb()` been removed from `portal/Backend/src/routes/`? Count remaining violations.
- [ ] QO-002: Does `portal/Shared/api.ts` now have `blocked_by` in UpdateBugInput/UpdateFeatureRequestInput?
- [ ] QO-003: Does `portal/Backend/src/database/seed.ts` exist?
- [ ] QO-004: Do `portal/Frontend/tests/DependencySection.test.tsx` and `BlockedBadge.test.tsx` exist?
- [ ] QO-005: Does `platform/Dockerfile.worker` have a `# Verifies: FR-TMP-008` comment?
- [ ] QO-006: Do portal bug/FR detail route handlers have `// Verifies: FR-DUP-06`?
