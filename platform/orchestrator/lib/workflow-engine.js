/**
 * Workflow Engine — PR creation with traceability reporting.
 *
 * Usage:
 *   const { createWorkflowEngine } = require("./lib/workflow-engine");
 *   const engine = createWorkflowEngine(runClaude, WORKSPACE);
 *   await engine._createPR(run);
 */

const { execSync } = require("child_process");

// Verifies: FR-PTR-003 — Build the ### Traceability markdown section from run.results.traceability
function buildTraceabilitySection(traceability) {
  if (!traceability || traceability.status === "ERROR") {
    return "### Traceability\nTraceability data not available.";
  }

  const { totalFrs, coveredFrs, missingFrs, coveragePct } = traceability;

  if (coveragePct >= 100) {
    return `### Traceability\n**Coverage: ${coveredFrs}/${totalFrs} FRs (${coveragePct.toFixed(1)}%)** :white_check_mark:`;
  }

  let section = `### Traceability\n**Coverage: ${coveredFrs}/${totalFrs} FRs (${coveragePct.toFixed(1)}%)**\n\nUncovered requirements:`;
  for (const fr of missingFrs) {
    section += `\n- ${fr}`;
  }
  return section;
}

// Verifies: FR-PTR-003, FR-PTR-004
function createWorkflowEngine(runClaudeFn, workspace) {
  /**
   * Create a pull request for a completed pipeline run.
   * Includes traceability section built from run.results.traceability.
   */
  async function _createPR(run) {
    const title = `cycle/${run.id}: ${run.taskTitle || "pipeline cycle"}`;

    // Build PR body sections
    const sections = [];

    sections.push(`## Summary\n${run.task || "Pipeline cycle run."}`);

    if (run.results) {
      if (run.results.implementation) {
        sections.push(`### Implementation\n${run.results.implementation.summary || "Completed."}`);
      }

      if (run.results.qa) {
        const qaStatus = run.results.qa.passed ? "Passed" : "Failed";
        sections.push(`### QA Results\n${qaStatus}${run.results.qa.summary ? ` — ${run.results.qa.summary}` : ""}`);
      }

      if (run.results.smoketest) {
        const smokeStatus = run.results.smoketest.passed ? "Passed" : "Failed";
        sections.push(`### Smoketest\n${smokeStatus}`);
      }

      if (run.results.inspector) {
        sections.push(`### Inspector\n${run.results.inspector.grade || "N/A"}`);
      }

      if (run.results.e2e) {
        const e2e = run.results.e2e;
        sections.push(`### E2E Results\n${e2e.passed ?? 0} passed, ${e2e.failed ?? 0} failed out of ${e2e.total ?? 0} tests`);
      }

      // Verifies: FR-PTR-003 — Traceability section in PR body
      sections.push(buildTraceabilitySection(run.results.traceability));
    } else {
      sections.push(buildTraceabilitySection(null));
    }

    const body = sections.join("\n\n");
    const branch = `cycle/${run.id}`;

    let prNumber = null;
    try {
      const createCmd = `gh pr create --title ${shellEscape(title)} --body ${shellEscape(body)} --base master --head ${shellEscape(branch)}`;
      const result = execSync(createCmd, { cwd: workspace, encoding: "utf-8", timeout: 30000 });
      // gh pr create outputs the PR URL; extract number from it
      const match = result.match(/\/pull\/(\d+)/);
      if (match) prNumber = match[1];
      console.log(`[workflow-engine] PR created: ${result.trim()}`);
    } catch (err) {
      console.error(`[workflow-engine] Failed to create PR: ${err.message}`);
      return null;
    }

    // Verifies: FR-PTR-004 — Add traceability-gap label when coverage < 100%
    if (
      prNumber &&
      run.results &&
      run.results.traceability &&
      run.results.traceability.status !== "ERROR" &&
      run.results.traceability.coveragePct < 100
    ) {
      try {
        execSync(`gh pr edit ${prNumber} --add-label traceability-gap`, {
          cwd: workspace,
          encoding: "utf-8",
          timeout: 15000,
        });
        console.log(`[workflow-engine] Added traceability-gap label to PR #${prNumber}`);
      } catch (err) {
        console.warn(`[workflow-engine] Failed to add traceability-gap label: ${err.message}`);
      }
    }

    return prNumber;
  }

  return { _createPR };
}

// Verifies: FR-PTR-003 — Shell-escape a string for safe use in exec commands
function shellEscape(str) {
  // Wrap in single quotes, escaping any existing single quotes
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

module.exports = { createWorkflowEngine, buildTraceabilitySection };
