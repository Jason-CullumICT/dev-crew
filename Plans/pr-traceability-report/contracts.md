# API Contracts: PR Traceability Report

## traceability-enforcer.py --json output

```json
{
  "status": "passed | failed",
  "total_frs": 5,
  "covered_frs": ["FR-001", "FR-002"],
  "missing_frs": ["FR-003", "FR-004", "FR-005"],
  "coverage_percent": 40.0,
  "requirements_file": "Plans/pr-traceability-report/requirements.md"
}
```

**Exit codes (unchanged):**
- `0`: All FRs have `// Verifies:` comments (status = "passed")
- `1`: One or more FRs missing (status = "failed")

**CLI interface:**
```
python3 tools/traceability-enforcer.py --json [--plan NAME] [--file PATH]
```

## run.results.traceability schema

Stored on the run object after QA completes:

```typescript
interface TraceabilityResult {
  status: "passed" | "failed" | "unavailable";
  totalFrs?: number;
  coveredFrs?: string[];
  missingFrs?: string[];
  coveragePercent?: number;
  requirementsFile?: string;
}
```

## PR body traceability section

Rendered in the PR body between the Results section and the end:

```markdown
### Traceability
- Coverage: 3/5 FRs (60.0%)
- **Uncovered FRs:**
  - FR-003
  - FR-004
```

Or when all covered:
```markdown
### Traceability
- Coverage: 5/5 FRs (100.0%)
- All FRs covered
```

Or when unavailable:
```markdown
### Traceability
- Traceability: not available
```

## PR labels

When `coveragePercent < 100`, add label: `traceability-gap`

Appended to existing label set. Uses fallback `gh pr edit --add-label` if label creation fails during `gh pr create`.
