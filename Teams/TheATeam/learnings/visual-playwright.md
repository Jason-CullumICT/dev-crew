# Visual Playwright Learnings

## 2026-04-15

### App Not Running in CI Pipeline Cycles

- Both frontend (`http://localhost:5173`) and backend (`http://localhost:3001`) were unreachable (HTTP 000 / connection refused) during this cycle run.
- The feature being validated ("Bake Playwright into worker Docker image") is a Docker/infrastructure change — no running app is expected in the pipeline runner environment itself.
- **Learning**: For infrastructure-only features (Dockerfile changes, Docker image pre-baking, CI configuration), the visual smoke test will consistently SKIP because the app is not spawned inside the pipeline runner. This is expected and correct behaviour — do not treat SKIP as a failure for infra-only changes.
- **Learning**: The pre-flight `curl` check correctly gates the test; SKIP exits 0, so the pipeline is not blocked.

### Changed Pages Identification

- `git diff --name-only` returned no output for `src/pages/` — confirms this is an infrastructure-only change with no frontend page modifications.
- When there are no changed pages, the test suite is limited to the generic "frontend loads" smoke test, which still requires a running app.

### Playwright Not Installed in Runner

- `npx playwright test` would require Playwright to be available. The feature itself (pre-baking Playwright into the Docker worker image) would address this for future cycles once the Docker image is updated.
- Until the new Docker image is deployed, Playwright may not be available in the runner environment.

### Recommendations

- After deploying the baked Docker image, re-run this skill to confirm Playwright is available without a per-cycle install step.
- Consider adding a `which playwright` / `npx playwright --version` check to the pre-flight to give a clearer signal about Playwright availability.
