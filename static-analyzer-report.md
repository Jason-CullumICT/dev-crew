**Scan complete.** Here's the executive summary:

---

**9 findings** across the `Source/` codebase. No hardcoded secrets, no eval/exec patterns, no weak crypto, no SQL injection surface.

**Highest-priority items for the fix queue:**

| # | Finding | Severity | File |
|---|---------|----------|------|
| SAST-01 | **Zero authentication** on all API routes | High | `app.ts` |
| SAST-02 | **Unauthenticated webhooks**, no HMAC verification | High | `routes/intake.ts` |
| SAST-03 | Raw `err.message` exposed in HTTP 500 responses | Medium | `routes/workflow.ts` (7 sites) |
| SAST-04 | `/metrics` endpoint open to anyone | Medium | `app.ts` |
| SAST-05 | Pagination `limit` has no upper bound | Medium | `routes/workItems.ts`, `routes/dashboard.ts` |
| SAST-06 | No rate limiting | Medium | `app.ts` |
| SAST-07 | No HTTP security headers (no `helmet`) | Medium | `app.ts` |
| SAST-08 | Intake bypasses enum validation for `type`/`priority` | Low | `routes/intake.ts` |
| SAST-09 | Container runs as root | Low | `portal/Dockerfile` |

**Tools unavailable** in this environment: `gitleaks`, `semgrep` — recorded in `Teams/TheGuardians/learnings/static-analyzer.md` for future runs. CI workflow correctly handles secrets via `${{ secrets.* }}` — no secrets hardcoded in workflow YAML files.
