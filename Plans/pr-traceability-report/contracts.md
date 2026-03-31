# API Contracts: PR Traceability Report

## 1. Traceability Enforcer JSON Output Contract

**Command:** `python3 tools/traceability-enforcer.py --json [--plan <name>] [--file <path>]`

**stdout (JSON):**
```json
{
  "plan_file": "Plans/pr-traceability-report/requirements.md",
  "total_frs": 4,
  "covered_frs": 3,
  "missing_frs": ["FR-PTR-004"],
  "coverage_pct": 75.0,
  "status": "FAIL"
}
```

**Exit codes:** 0 = all covered, 1 = gaps exist (unchanged)

**Edge cases:**
- No plan file found: `{"plan_file": null, "total_frs": 0, "covered_frs": 0, "missing_frs": [], "coverage_pct": 100.0, "status": "PASS"}`
- No FR IDs in plan: same as above (vacuously true)

## 2. Run Object Traceability Shape

```js
// Stored at run.results.traceability
{
  totalFrs: number,       // total FR-XXX IDs found in plan
  coveredFrs: number,     // count with matching // Verifies: comments
  missingFrs: string[],   // list of uncovered FR IDs
  coveragePct: number,    // 0-100, one decimal
  status: "PASS" | "FAIL" | "ERROR"
}

// Error case:
{
  status: "ERROR",
  error: "enforcer script not found"  // human-readable reason
}
```

## 3. PR Body Traceability Section

Inserted as `### Traceability` in the PR body markdown.

**100% coverage:**
```markdown
### Traceability
**Coverage: 4/4 FRs (100.0%)** :white_check_mark:
```

**Partial coverage:**
```markdown
### Traceability
**Coverage: 3/4 FRs (75.0%)**

Uncovered requirements:
- FR-PTR-004
```

**Error/unavailable:**
```markdown
### Traceability
Traceability data not available.
```

## 4. PR Labels

| Condition | Label added |
|-----------|------------|
| `coveragePct < 100` | `traceability-gap` |
| `coveragePct === 100` or data unavailable | no label |
