# Design: PR Traceability Report

## Architecture

This feature threads traceability data through three layers:

```
traceability-enforcer.py --json  →  workflow-engine.js (capture + store)  →  _createPR (render in PR body)
```

### 1. traceability-enforcer.py: --json flag

Add an `--json` argument to the argparse parser. When set, output a JSON object to stdout instead of the human-readable format. The JSON structure:

```json
{
  "status": "passed" | "failed",
  "total_frs": 5,
  "covered_frs": ["FR-001", "FR-002", "FR-003", "FR-004", "FR-005"],
  "missing_frs": [],
  "coverage_percent": 100.0,
  "requirements_file": "Plans/my-feature/requirements.md"
}
```

Implementation: In `main()`, after `check_traceability()` returns, if `args.json` is set, print the JSON dict and exit with the same exit code (0 for pass, 1 for gaps). The existing text output path remains the default.

### 2. workflow-engine.js: Capture traceability after QA stages

**No changes to dispatch.js.** Instead of relying on QA agents to write a file, the workflow engine runs the enforcer directly after all implementation+QA stages complete. This is simpler and more reliable — one exec call with deterministic output, no coordination needed.

**Placement:** After the stage dispatch loop ends (after `run.feedbackLoops = feedbackLoops;`) and before Phase 3.5 (app start for dynamic testing). At this point all implementation and QA work is done, Source/ files are finalized.

```javascript
// ── Phase 3.4: Capture traceability results ──
console.log(`[${run.id}] Running traceability enforcer...`);
try {
  const traceResult = await this.containerManager.execInWorker(
    containerId, "bash",
    ["-c", "cd /workspace && python3 tools/traceability-enforcer.py --json 2>/dev/null"],
    { label: "traceability", quiet: true }
  );
  if (traceResult.stdout.trim()) {
    const traceData = JSON.parse(traceResult.stdout.trim());
    run.results = run.results || {};
    run.results.traceability = {
      totalFrs: traceData.total_frs,
      coveredFrs: traceData.covered_frs,
      missingFrs: traceData.missing_frs,
      coveragePercent: traceData.coverage_percent,
      status: traceData.status,
    };
  } else {
    run.results = run.results || {};
    run.results.traceability = { status: "unavailable", reason: "no output" };
  }
} catch (err) {
  console.warn(`[${run.id}] Traceability capture failed: ${err.message}`);
  run.results = run.results || {};
  run.results.traceability = { status: "unavailable", reason: err.message };
}
saveRunFn(run);
```

### 3. workflow-engine.js: _createPR update

In the `prBody` array (currently lines 405-418), insert a `### Traceability` section after the Results section:

```javascript
const traceability = run.results?.traceability;
let traceSection;
if (traceability && traceability.status !== "unavailable") {
  const covered = traceability.coveredFrs?.length || 0;
  const total = traceability.totalFrs || 0;
  const pct = traceability.coveragePercent?.toFixed(1) || "0.0";
  traceSection = [
    "",
    "### Traceability",
    `- Coverage: ${covered}/${total} FRs (${pct}%)`,
  ];
  if (traceability.missingFrs && traceability.missingFrs.length > 0) {
    traceSection.push("- **Uncovered FRs:**");
    for (const fr of traceability.missingFrs) {
      traceSection.push(`  - ${fr}`);
    }
  } else {
    traceSection.push("- All FRs covered");
  }
} else {
  traceSection = ["", "### Traceability", "- Traceability: not available"];
}
```

### 4. workflow-engine.js: traceability-gap label

In `_createPR`, when building the `labels` string, append `,traceability-gap` if `traceability.coveragePercent < 100`. Use the fallback `gh pr edit --add-label` path if the label doesn't exist yet (same pattern already used for other labels).

## File Change Summary

| File | Changes | Size |
|------|---------|------|
| `tools/traceability-enforcer.py` | Add `--json` flag, JSON output path in `main()` | S |
| `platform/orchestrator/lib/workflow-engine.js` | Capture traceability after QA, add to PR body, add label logic | M |

**dispatch.js is NOT modified.** The workflow engine runs the enforcer directly — simpler, more reliable, no agent coordination needed.

## Risk Assessment

- **Risk Level: medium** — new feature touching 2 files across two subsystems (Python tooling + JS orchestrator), no schema changes, no auth changes
- The changes are additive and use existing patterns (execInWorker for tooling, label handling in _createPR)
- Graceful degradation ensures PR creation never fails due to traceability issues
