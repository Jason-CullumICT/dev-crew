# tools/README.md

## Purpose

The `tools/` directory contains the **pipeline dashboard reporting system**. All agents running in team pipelines MUST use these tools to report progress, completion status, and metrics to the orchestrator dashboard. This directory provides:

- `pipeline-update.sh` — agent status reporting contract (start, progress, completion, failure)
- `traceability-enforcer.py` — verification gate ensuring all FRs have implementation comments
- `spec-drift-audit.py` — gap analysis between specifications and implementation
- `pipeline-state-*.json` — live state files tracking all runs per team (auto-managed)
- `pipeline-index.json` — registry of all team state files

Agents must call `pipeline-update.sh` at key moments: run init, agent start, major progress updates, and completion/failure. Without these calls, the orchestrator has no visibility into pipeline progress.

---

## pipeline-update.sh

The shell script that manages all agent-to-dashboard communication. It maintains atomic state files with locking, auto-prunes old runs, and auto-detects active runs when needed.

### Required Dependencies

- `jq` (JSON query tool) — must be installed and in `$PATH`
  - Install: https://jqlang.github.io/jq/download/
  - Verify: `jq --version`

### Core Usage Pattern

Every agent workflow follows this sequence:

```bash
# 1. Initialize a new run (team lead typically does this)
RUN_ID=$(./tools/pipeline-update.sh --team MyTeam --action init)
echo "Created run: $RUN_ID"

# 2. Agent starts (at agent invocation time)
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --agent my-agent --action start

# 3. Agent reports progress (during work)
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --agent my-agent --action update \
  --metrics '{"files_processed": 10, "tests_passing": 45}'

# 4. Agent completes (at end of work)
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --agent my-agent --action complete \
  --verdict "All tests passed, ready for review"

# 5. Or agent fails
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --agent my-agent --action fail
```

### Actions

#### `init` — Create a New Run

Initializes a new pipeline run and returns a `RUN_ID` that must be captured.

```bash
RUN_ID=$(./tools/pipeline-update.sh --team MyTeam --action init)
# Output: run-20260407-143052
```

**Optional flags for init:**
- `--agent AGENT_KEY` — auto-start an agent immediately in the run
- `--name "Agent Name"` — human-readable name for the agent
- `--model "model-id"` — AI model identifier (e.g., `claude-haiku-4-5-20251001`)
- `--metrics '{"task_title": "Build feature X"}'` — optional run-level metadata

**Example with task title:**
```bash
RUN_ID=$(./tools/pipeline-update.sh --team MyTeam --action init \
  --metrics '{"task_title": "Implement auth module"}')
```

#### `start` — Mark Agent as Running

Called when an agent begins execution. Requires `--run`, `--agent`, and `--team`.

```bash
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --agent backend-coder \
  --action start \
  --name "Backend Coder (Agent 001)" \
  --model "claude-opus-4-20250805"
```

#### `update` — Report Progress

Increments iteration counter and merges metrics. Used for mid-execution status updates.

```bash
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --agent my-agent --action update \
  --metrics '{"files_processed": 15, "tests_written": 8, "current_phase": "implementation"}'
```

**Metrics JSON:** Any JSON object is accepted. Common fields:
- `files_processed` — number of files touched
- `tests_written` — test count
- `lines_added` — LOC metric
- `current_phase` — human-readable progress label
- Custom fields — add domain-specific metrics as needed

#### `complete` — Mark Agent as Done

Called on successful completion. Stores the agent verdict and final metrics.

```bash
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --agent my-agent --action complete \
  --verdict "Implemented feature with 95% test coverage. Ready for review." \
  --metrics '{"total_duration_seconds": 3600, "tests_passing": 150}'
```

**Timestamp tracking:** Completion automatically calculates `duration_s` from the `started_at` timestamp.

#### `fail` — Mark Agent as Failed

Called when an agent encounters a terminal error. Stores failure timestamp and duration.

```bash
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --agent my-agent --action fail
```

**Note:** Even on failure, timestamps and duration are recorded for post-mortem analysis.

#### `pipeline-status` — Set Overall Pipeline Status

Updates the pipeline-level status (not a specific agent). Only actions with `--status` flag allowed.

```bash
./tools/pipeline-update.sh --team MyTeam --run $RUN_ID --action pipeline-status \
  --status "quality-gate-passed"
```

Valid statuses: `running`, `paused`, `complete`, `failed`, `quality-gate-passed`, `quality-gate-failed`, etc.

### Implicit Run Detection

If `--run RUN_ID` is omitted and there is **exactly one running run** for the team, the script auto-detects it. This simplifies agent code:

```bash
# These are equivalent if only one run is active:
./tools/pipeline-update.sh --team MyTeam --run run-20260407-143052 --agent x --action start
./tools/pipeline-update.sh --team MyTeam --agent x --action start  # auto-detects run
```

**Error if multiple runs are running:**
```
ERROR: Multiple active runs for MyTeam. Pass --run RUN_ID to specify which.
Active runs:
  run-20260407-143052
  run-20260407-143100
```

### Metrics JSON Format

The `--metrics` flag accepts a JSON string that is merged into the agent's metrics object.

```bash
# Simple metric
--metrics '{"files": 10}'

# Complex metric
--metrics '{"phase": "testing", "results": {"passed": 45, "failed": 2}, "coverage": 87.5}'

# Multiple updates merge (last write wins):
# Update 1: --metrics '{"files": 5, "tests": 2}'
# Update 2: --metrics '{"files": 10}'
# Result: {"files": 10, "tests": 2}
```

### Return Values and Error Handling

- **Success:** Script exits with `0`. For `init`, prints `RUN_ID` to stdout.
- **Failure:** Exits with `1` and prints error to stderr.

```bash
if RUN_ID=$(./tools/pipeline-update.sh --team MyTeam --action init); then
  echo "Run created: $RUN_ID"
else
  echo "Failed to init run" >&2
  exit 1
fi
```

### State File Format (pipeline-state-{TEAM}.json)

The script manages JSON state files automatically. Each team has its own state file.

```json
{
  "team": "MyTeam",
  "next_run_number": 5,
  "runs": {
    "run-20260407-143052": {
      "number": 4,
      "pipeline": {
        "id": "run-20260407-143052",
        "status": "running",
        "started_at": "2026-04-07T14:30:52Z",
        "completed_at": "2026-04-07T14:45:00Z",
        "task_title": "Implement auth module"
      },
      "agents": {
        "backend-coder": {
          "name": "Backend Coder (Agent 001)",
          "model": "claude-opus-4-20250805",
          "status": "complete",
          "started_at": "2026-04-07T14:30:55Z",
          "completed_at": "2026-04-07T14:45:00Z",
          "duration_s": 845,
          "verdict": "All tests passing, ready for review",
          "iteration": 3,
          "metrics": {
            "files_modified": 12,
            "tests_written": 8,
            "coverage": 92
          }
        }
      },
      "updated_at": "2026-04-07T14:45:00Z"
    }
  }
}
```

**Key fields:**
- `team` — team name (read-only, set at init)
- `next_run_number` — auto-increment counter
- `runs` — map of `RUN_ID -> run object`
  - `number` — sequential run number
  - `pipeline` — overall run metadata (status, task title, timestamps)
  - `agents` — map of agent key to agent status
    - `status` — one of: `running`, `complete`, `failed`
    - `iteration` — incremented by `update` action
    - `metrics` — merged JSON from all `--metrics` calls
    - `duration_s` — calculated from start to completion

### Auto-Pruning

The script automatically prunes old runs to keep **max 50 runs per team**. Pruning is aggressive: completed and failed runs are removed first (oldest first). Running runs are never pruned.

**Implication:** Do not rely on old runs persisting forever. Copy run data to external storage if you need history beyond 50 runs.

---

## traceability-enforcer.py

Verification gate that ensures every FR requirement in a plan has a corresponding `// Verifies: FR-XXX` comment in the Source/ codebase.

### Usage

```bash
# Auto-detect most recent requirements.md in Plans/
python3 tools/traceability-enforcer.py

# Target a specific plan
python3 tools/traceability-enforcer.py --plan my-feature

# Target a specific file
python3 tools/traceability-enforcer.py --file Plans/my-plan/requirements.md
```

### What It Checks

1. Extracts all `FR-XXX` IDs from the target requirements file
2. Scans `Source/` and `E2E/` directories for files ending in `.ts`, `.tsx`, `.js`, `.jsx`, `.go`, `.py`, `.sh`
3. Looks for comments matching the pattern: `// Verifies: FR-XXX`
4. Reports any FRs without implementation comments

### Example Output: Failure

```
Targeting requirements from: Plans/auth-flow/requirements.md
Scanning 5 requirements across Source, E2E...

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
TRACEABILITY FAILURE: 2 requirements lack implementation!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  [MISSING] FR-AC-001
  [MISSING] FR-AC-003

Ensure your code contains '// Verifies: FR-XXX' comments.
```

### Example Output: Success

```
Targeting requirements from: Plans/auth-flow/requirements.md
Scanning 5 requirements across Source, E2E...

************************************************************
TRACEABILITY PASSED: All requirements have implementation references.
************************************************************
```

### Exit Codes

- `0` — All FRs have verifies comments (PASS)
- `1` — One or more FRs are missing verifies comments (FAIL)

### In a Pipeline

Use as a verification gate:

```bash
python3 tools/traceability-enforcer.py --plan my-feature || {
  echo "Traceability gate failed. Fix missing FR comments."
  exit 1
}
```

---

## spec-drift-audit.py

Gap analysis tool that compares specifications against implementation. Identifies:
- Missing implementations (FRs in specs but no code)
- Untracked implementations (code without spec)
- Legacy FR ID resolution via alias mapping

### Usage

```bash
# Run audit with default alias file (tools/fr-aliases.json)
python3 tools/spec-drift-audit.py

# Use custom alias file
python3 tools/spec-drift-audit.py --aliases custom-aliases.json
```

### What It Checks

1. **Canonical FRs:** Scans `Specifications/` for canonical FR IDs (format: `FR-XX-NNN`, e.g., `FR-AC-001`, `FR-EM-008`)
2. **Verified FRs:** Scans `Source/` for `// Verifies: FR-XXX` comments
3. **Alias Resolution:** Maps legacy IDs (e.g., `FR-001`) to canonical IDs if an alias map exists
4. **Safety Check:** Fails if any critical safety FRs are missing (see safety list below)

### Output

Prints summary to console:

```
--- Level 5 Spec-Drift Audit ---

Canonical FRs in specs:  15
Canonical FRs covered:   13
Coverage:                86.7%
Raw // Verifies IDs:     14
Alias-resolved:          2
Unresolved legacy IDs:   1

TOP GAPS (of 2 missing):
  [MISSING] FR-AC-002
  [MISSING] FR-DR-010

UNRESOLVED LEGACY IDs (of 1):
  [LEGACY] FR-001 — add to tools/fr-aliases.json to map to canonical ID

Full audit saved to spec-drift-report.json
```

**JSON Report:** Saves detailed analysis to `spec-drift-report.json`:

```json
{
  "summary": {
    "canonical_frs_in_specs": 15,
    "canonical_frs_covered": 13,
    "coverage_percentage": "86.7%",
    "raw_verifies_ids_in_source": 14,
    "alias_resolved_count": 2,
    "unresolved_legacy_ids": 1
  },
  "covered_frs": ["FR-AC-001", "FR-AC-002", ...],
  "missing_frs": ["FR-AC-003", "FR-DR-016"],
  "untracked_implementations": ["FR-XX-999"],
  "coverage_by_file": {
    "FR-AC-001": ["Source/Backend/auth/login.go", ...]
  }
}
```

### Safety-Critical FRs

The tool has a **hard fail** if any of these FRs are missing:

- `FR-EM-004` — Emergency shutdown
- `FR-EM-008` — Audit logging
- `FR-EM-009` — Rate limiting
- `FR-DR-016` — Data retention
- `FR-AC-003` — Access control

If any are missing, exit code is `1` even if overall coverage is high.

### Alias Mapping

Create `tools/fr-aliases.json` to map legacy FR IDs to canonical IDs:

```json
{
  "FR-001": "FR-AC-001",
  "FR-002": "FR-AC-002",
  "FR-003": "FR-EM-004",
  "FR-AUTH-01": "FR-AC-001"
}
```

When the audit finds `// Verifies: FR-001` in code, it resolves it to `FR-AC-001` and counts it as covered.

---

## Agent Reporting Obligation

**All agents running in team pipelines MUST follow this reporting contract:**

### At Invocation Start

```bash
RUN_ID=$(./tools/pipeline-update.sh --team $TEAM --action init)
./tools/pipeline-update.sh --team $TEAM --run $RUN_ID --agent my-role \
  --action start \
  --name "My Agent Name" \
  --model "claude-opus-4-20250805"
```

### During Major Work Phases

```bash
./tools/pipeline-update.sh --team $TEAM --run $RUN_ID --agent my-role --action update \
  --metrics '{"phase": "implementation", "files_touched": 8}'
```

### On Completion

```bash
./tools/pipeline-update.sh --team $TEAM --run $RUN_ID --agent my-role --action complete \
  --verdict "Completed auth implementation. 42 tests passing. Ready for review."
```

### On Failure

```bash
./tools/pipeline-update.sh --team $TEAM --run $RUN_ID --agent my-role --action fail
```

**Consequences of not reporting:**
- Orchestrator dashboard has no visibility
- Team lead cannot see progress or detect hangs
- No post-mortem data if agent crashes
- Pipeline timings and metrics are incomplete

---

## Directory Structure

```
tools/
  README.md                           # This file
  pipeline-update.sh                  # Main reporting script
  traceability-enforcer.py            # FR verification gate
  spec-drift-audit.py                 # Spec-to-code gap analysis
  pipeline-state-TheFixer.json        # Live state for TheFixer team
  pipeline-state-TheATeam.json        # Live state for TheATeam team
  pipeline-index.json                 # Registry of all teams
  fr-aliases.json                     # (Optional) Legacy FR ID mapping
  spec-drift-report.json              # (Generated) Audit output
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Init a run | `RUN_ID=$(./tools/pipeline-update.sh --team TEAM --action init)` |
| Start agent | `./tools/pipeline-update.sh --team TEAM --run $RUN_ID --agent KEY --action start` |
| Report progress | `./tools/pipeline-update.sh --team TEAM --run $RUN_ID --agent KEY --action update --metrics '...'` |
| Complete agent | `./tools/pipeline-update.sh --team TEAM --run $RUN_ID --agent KEY --action complete --verdict "..."` |
| Fail agent | `./tools/pipeline-update.sh --team TEAM --run $RUN_ID --agent KEY --action fail` |
| Enforce FRs | `python3 tools/traceability-enforcer.py --plan my-feature` |
| Audit gaps | `python3 tools/spec-drift-audit.py` |

---

## Troubleshooting

### "jq is required but not found"

Install jq:
- macOS: `brew install jq`
- Ubuntu/Debian: `sudo apt-get install jq`
- Windows (WSL): `sudo apt-get install jq`
- Download: https://jqlang.github.io/jq/download/

### "No active runs for TEAM. Use --action init to create one"

You must call `init` first to create a run. Capture the returned `RUN_ID`:

```bash
RUN_ID=$(./tools/pipeline-update.sh --team MyTeam --action init)
# Now use $RUN_ID in subsequent calls
```

### "Multiple active runs for TEAM. Pass --run RUN_ID"

Multiple runs are active. Either:
- Explicitly pass `--run RUN_ID` to specify which one, or
- Complete/fail one of the existing runs to reduce them to one

### "Run 'run-XXX' not found"

The run has been pruned (auto-cleanup after 50 runs per team) or the `RUN_ID` is misspelled. Check the state file:

```bash
jq '.runs | keys' tools/pipeline-state-MyTeam.json
```

### "Traceability FAILURE: X requirements lack implementation"

FRs in the plan are missing `// Verifies: FR-XXX` comments in code. For each missing FR, add a comment in the relevant source file:

```go
// Verifies: FR-AC-001
func loginUser(username, password string) (*User, error) {
  // implementation
}
```

---

## See Also

- `Specifications/` — domain specifications (source of truth for all FRs)
- `Plans/` — feature plans with requirements
- `CLAUDE.md` — agent architecture and verification rules
- `Teams/` — agent team definitions and learnings
