# Backend Coder Learnings

## Traceability Enforcer
- The enforcer scans only `Source/` and `E2E/` directories for `// Verifies:` comments. Files in `platform/` are NOT scanned, so traceability comments there won't be picked up.
- The `--json` flag suppresses all print output and emits a single JSON line to stdout. Exit codes remain 0/1.
- The enforcer regex `FR-[A-Z0-9-]+` also picks up example FR IDs in requirements docs (e.g., FR-XXX-001 from example blocks), causing false "missing" reports.

## Module Loading
- `platform/orchestrator/lib/` modules use the factory pattern: `createXxx(runClaudeFn, workspace)` returning an object of methods.
- `dispatch.js` exports both `createDispatcher` (factory) and `parseTraceabilityOutput` (standalone utility).
- `workflow-engine.js` exports `createWorkflowEngine` (factory) and `buildTraceabilitySection` (standalone for testing).

## E2E Tests
- QA-generated E2E tests require a running app server. For backend-only/platform-only features, these will fail with ERR_CONNECTION_REFUSED since there's no UI to test.
- The playwright.pipeline.config.ts baseURL must match an actually running server.
