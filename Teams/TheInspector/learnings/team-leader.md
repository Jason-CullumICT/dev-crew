# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-11-15 — Grade D

### Project Characteristics

- **Stack:** Express REST API (Node/TypeScript) + React SPA (Vite/TypeScript) + in-memory store (no database)
- **No authentication layer** — threat model focuses on data integrity and state machine abuse, not auth bypass
- **Spec coverage is excellent** (96.5%) but traceability tooling has a blind spot for `Specifications/` FR-IDs
- **Large transitive dependency trees:** Backend 412 packages, Frontend 230 packages — high CVE surface area

### Synthesis Lessons

1. **Distinguish CVE severity from production risk** — vitest and tinypool are P1 CVEs but are test-time dependencies. Flag this distinction clearly in the report (still P1; still escalate) but note exploitability context.
2. **proxy-addr appears as a transitive Express dep** — any Express upgrade brings it along. When grading, proxy-addr CVE may be automatically fixed by `npm update express`.
3. **Handlebars is almost certainly transitive** (not a direct dep of the app) — confirm which direct dep pulls it in and whether that dep can be upgraded without code changes.
4. **Grade D was driven by dep CVEs, not application logic bugs** — the architecture is relatively sound (spec coverage 96.5%, clear service layer pattern) but the dependency chain has significant CVE debt.
5. **Performance and chaos sections are required even when skipped** — include them with "not measured" language and re-run instructions. Never omit sections.

### Routing Decisions

- Security CVEs with CVSS ≥ 9.0 → always escalate to TheGuardians regardless of whether they appear exploitable in the current architecture
- Architecture violations (service layer bypass) → TheFixer, not TheGuardians
- Traceability tooling issues → solo-session (tools/ directory)
- Spec structure issues → solo-session or requirements-reviewer

### Grading Gotcha

The grading config uses `max_p1` as a ceiling. Quality Oracle graded the app as "B" because it considered only architecture P1s (not CVE P1s). The team leader must aggregate ALL specialists before assigning the final grade. With 6 total P1s, the correct grade is D per the config thresholds.

### Cross-Reference Map Pattern

Three root causes covered 24 of 29 total findings:
1. **Outdated dependency chain** → 22 DEP-* findings (single fix: `npm audit fix` + major version bumps)
2. **Missing service layer** → QO-001 + QO-002 (single fix: introduce workItemService.ts)
3. **Traceability tooling gap** → QO-004 + QO-007 (single fix: extend enforcer to scan Specifications/)

### Next Audit Checklist

- [ ] Confirm services are live before dispatching performance-profiler and chaos-monkey
- [ ] Check `Teams/TheInspector/findings/` for prior audit to establish FIXED/STILL OPEN trend
- [ ] After `npm audit fix` run — verify DEP-001 (handlebars) and DEP-002 (proxy-addr) are truly resolved or still present as transitive deps
- [ ] Verify QO-001 (search route) is wired — test `curl localhost:3001/api/search?q=test`
- [ ] Verify QO-002 (service layer) — check workItems.ts no longer imports from workItemStore directly
