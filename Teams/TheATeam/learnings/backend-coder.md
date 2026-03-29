# Backend Coder Learnings

## PR Traceability Report (2026-03-29)

- `traceability-enforcer.py` `check_traceability()` prints a scanning message to stdout which pollutes JSON output. Added `quiet` parameter to suppress it when `--json` is active.
- The enforcer only scans `Source/` and `E2E/` directories. Files in `platform/` and `tools/` are not checked. Traceability comments in those files serve as documentation but won't be detected by the enforcer.
- `workflow-engine.js` uses `const` for `labels` in _createPR — needed to change to `let` to allow appending `,traceability-gap`.
- The `execInWorker` command in the design uses `2>/dev/null` to suppress stderr, but stdout pollution from `check_traceability()` still leaked through. Fixing at the Python level (quiet flag) is cleaner than trying to parse around it.
