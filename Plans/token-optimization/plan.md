# Plan: Pipeline Token Optimization Strategy
**Objective:** Reduce excessive LLM token consumption, lower cost per cycle, and prevent context-window bloat that leads to degraded AI performance.

### 1. Optimize "N+1" Context Injection in Dispatch Prompts
*   **The Problem:** In `dispatch.js` (`buildAgentPrompt`), the orchestrator concatenates multiple instructions, E2E templates, and context rules directly into the system prompt for *every* agent. If a cycle has 4 agents running in parallel, you pay for this massive context 4 times.
*   **Proposed Fix:** 
    *   Stop injecting large, static texts into the prompt. 
    *   Instead, write the shared context (E2E rules, implementation rules) to a temporary text file in the workspace (e.g., `.orchestrator/cycle-rules.md`).
    *   Change the agent prompt to simply say: *"Read your specific assignment in `Plans/.../dispatch-plan.md` and follow the cycle rules in `.orchestrator/cycle-rules.md`."*
    *   Let the agents use their file-reading tools to fetch the context only when needed.
*   **Expected Impact:** Massive reduction in input tokens, especially for complex runs with many parallel QA and implementation agents.

### 2. Sanitize and Compress PR Review Diffs
*   **The Problem:** `FR-TMP-005` feeds the raw output of `git diff master...cycle/{run-id}` to Claude for AI PR review. Diffs include lockfiles (`package-lock.json`), generated assets, and large amounts of unchanged context lines (the default is 3 lines of context).
*   **Proposed Fix:** 
    *   Modify the `git diff` command in `workflow-engine.js` to strictly exclude lockfiles and binary/asset files using pathspecs.
    *   Reduce the unified context lines from the default 3 down to 1 using the `-U1` flag.
    *   *Example command:* `git diff -U1 master...cycle/{run-id} -- . ':(exclude)*package-lock.json' ':(exclude)*.svg'`
*   **Expected Impact:** Eliminates 10,000+ token spikes caused by trivial NPM updates or large auto-generated files.

### 3. Parse and Summarize Playwright Error Outputs
*   **The Problem:** When an E2E test fails, the orchestrator triggers a feedback loop and sends `outputTail` (raw console stdout) to the coders. Playwright traces and JSON reporters contain massive amounts of noisy, uncompressed metadata that burn tokens without adding value.
*   **Proposed Fix:** 
    *   Since Playwright is already running with `--reporter=json`, parse the JSON output file directly in `workflow-engine.js` instead of capturing stdout.
    *   Extract *only* the specific failing test names, the error `message`, and the code `snippet` where it failed.
    *   Construct a condensed, human-readable summary string (e.g., "Test 'Login' failed at line 42: Timeout waiting for selector") and pass *that* to the agent.
*   **Expected Impact:** Reduces feedback loop payloads from thousands of raw terminal lines down to ~100 high-signal tokens per failure.

### 4. Remove the 12,000-Character Regex Fallback
*   **The Problem:** In `dispatch.js` (`extractRoles`), if the regex fails to find agent roles, the orchestrator slices the first 12,000 characters of the dispatch plan and asks Claude to extract the roles.
*   **Proposed Fix:**
    *   Update the Leader agent's system prompt (or `enrichTaskForLeader`) to mandate that the dispatch plan *must* conclude with a strict, parsable JSON block containing the roles (e.g., ```json { "implementation": [...], "qa": [...] } ```).
    *   Update `extractRoles` to look for this JSON block first.
    *   If fallback is absolutely necessary, use a much smaller slice (e.g., `slice(-2000)`) where the summary usually lives, rather than 12k chars.
*   **Expected Impact:** Eliminates unpredictable ~3,000+ input token spikes during the dispatch parsing phase.

### 5. Externalize E2E Test Templates
*   **The Problem:** `dispatch.js` hardcodes a 15-line Playwright code template directly into the prompt string for all QA agents.
*   **Proposed Fix:**
    *   Create a static file in the repository (e.g., `templates/playwright-e2e.spec.ts`).
    *   Update the QA prompt to reference this file: *"Use the Playwright test template located at `templates/playwright-e2e.spec.ts` as the baseline for your tests."*
*   **Expected Impact:** Saves ~150-200 tokens per QA agent spawned, permanently stripping boilerplate code out of the system prompts.
