# Plan: Unified Pipeline Hardening & Optimization Strategy
**Objective:** Transform the dev-crew pipeline into a production-grade, deterministic engine while reducing LLM token consumption and increasing forensic traceability.

---

## Tier 1: The "Mission Critical" Foundation
*Focus: Eliminating 90% of flakiness and cost-inefficiency.*

### 1.1 Deterministic Readiness (Zero Sleep)
*   **Problem:** Pipeline uses `setTimeout` (e.g., 5s in `container-manager.js`) to wait for app boot.
*   **Fix:** Replace sleeps with an exponential backoff polling utility that pings health endpoints (`localhost:3001`, `localhost:5173`) until a `200 OK` is received (max 30s).

### 1.2 Stateful Checkpointing (Resume-from-Failure)
*   **Problem:** Orchestrator crashes or restarts mid-cycle lose all progress.
*   **Fix:** Update `run.json` schema to include `current_phase`. Implement a startup scan to resume unfinished runs.

### 1.3 Context Externalization (Token Win)
*   **Problem:** Parallel agents duplicate massive system context in every prompt.
*   **Fix:** Write shared rules and E2E templates to workspace files (e.g., `.context/cycle-rules.md`). Prompt agents to read these files rather than injecting them into every message.

---

## Tier 2: Stability & Real-Time Observability
*Focus: Protecting the workspace and seeing what agents are doing.*

### 2.1 Infrastructure Hardening (Bake-in Dependencies)
*   **Problem:** `npx playwright install` runs dynamically over the network.
*   **Fix:** Update `Dockerfile.worker` to pre-install Chromium and common dependencies. Remove runtime network installs.

### 2.2 Git-Backed Snapshots (Phase Rollbacks)
*   **Problem:** Agents can ruin the codebase, making feedback loops impossible.
*   **Fix:** Perform a `git commit` at the end of each phase. Allow the orchestrator to reset to the last checkpoint if a phase fails catastrophically.

### 2.3 Live Trace Streaming
*   **Problem:** Agent activity is a "black box" until the cycle ends.
*   **Fix:** Stream worker stdout/stderr to the Dashboard in real-time via WebSocket/EventSource.

---

## Tier 3: Quality & Forensic Traceability
*Focus: Connecting "Why" to "What" and optimizing feedback.*

### 3.1 Rationale Capture
*   **Action:** Mandate that agents output a `thoughts` or `rationale` field in their JSON responses. Store this in the `run.json` for later audit.

### 3.2 Error Snippeting (Token Win)
*   **Action:** In feedback loops, stop sending entire files. Send only the 5 lines of code surrounding the reported error line.

### 3.3 Diff Sanitization (Token Win)
*   **Action:** Filter out `package-lock.json` and binary assets from AI PR reviews. Use `git diff -U1` to minimize context noise.

---

## Tier 4: Governance & Forensic Analysis
*Focus: Final safety gates and performance tuning.*

### 4.1 Log Compression (Token Win)
*   **Action:** Strip boilerplate (NPM progress bars, success messages) from logs before passing them to agents. Send only fatal error traces.

### 4.2 Multi-Agent Consensus
*   **Action:** Require consensus from two different AI models for high-risk PR merges.

### 4.3 Phase Metrics
*   **Action:** Track wall-clock time and tokens consumed per phase. Display in Portal UI to identify bottlenecks.

---

## Tier 5: Process Restoration & Quality Guardrails (Addressing Merge Regressions)
*Focus: Restoring the stringent quality controls and team structures lost during the dev-crew merge from individual repositories (claude-ai-os, container-test, work-backlog).*

### 5.1 Re-Enable Verification Gates
*   **Problem:** `dev-crew/CLAUDE.md` has an empty `Verification gates:` section, completely disabling automated quality checks before agents report success.
*   **Fix:** Restore `python3 tools/traceability-enforcer.py` and `npm test` as mandatory commands in `CLAUDE.md`. Agents must ensure these pass with *zero new failures* before declaring a task complete.

### 5.2 Reinstate "No Silent Failures" Architecture Rules
*   **Problem:** Critical shell-scripting and operational safety rules were stripped from the `dev-crew` rulebook. Agents are no longer instructed to check return values or avoid `|| true`.
*   **Fix:** Add the rigorous "No silent failures" block back into `dev-crew/CLAUDE.md`. This includes mandating that agents never leave empty `catch {}` blocks, verify success independently of exit codes (e.g. checking remote after `git push`), and preserve evidence of failure.

### 5.3 Resurrect TheInspector's Active Artifacts
*   **Problem:** In `container-test`, `TheInspector` was a highly active team with daily reports spanning `chaos-monkey`, `dependency-auditor`, `quality-oracle`, and `red-teamer` inside a `findings/` directory. In `dev-crew`, `findings/` does not exist, and the team's operational learnings are lost.
*   **Fix:** Recreate the `Teams/TheInspector/findings/` and `Teams/TheInspector/learnings/` directory structures. Ensure the pipeline actively triggers `TheInspector` agents to deposit audits and chaos-test reports during the QA phase.

### 5.4 Rebuild TheATeam Quality Artifacts
*   **Problem:** Essential QA artifacts like `design-critique-report.md` and `visual-validation-report.md` were stripped from `TheATeam` during the merge.
*   **Fix:** Restore these report formats to `Teams/TheATeam/` and explicitly require `frontend-coder` and `integration-reviewer` agents to generate design critiques and visual validation artifacts before merging front-end features.

### 5.5 Restore Missing Tools Documentation
*   **Problem:** `dev-crew/tools/` is missing `README.md`, leaving agents blind to how pipeline dashboard scripts (like `pipeline-update.sh`) are supposed to be invoked.
*   **Fix:** Recover `tools/README.md` from the original repositories to re-document the dashboard reporting contracts for all agents.
