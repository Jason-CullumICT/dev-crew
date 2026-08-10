# Critical Action Items from Dependency Audit
**Date:** 2026-08-10  
**Status:** 🔴 URGENT — 3 Critical (P1) CVEs require immediate patching

---

## This Week (EOW Deadline)

### 1. ⚠️ CRITICAL: Fix Vitest RCE
- **Package:** vitest
- **Current:** 3.2.5 (Source/Frontend)
- **Fix:** `npm install vitest@>=3.2.6`
- **Test:** `npm test` in Source/Frontend
- **Owner:** Frontend team
- **Escalation:** TheGuardians (RCE in dev server)

### 2. ⚠️ CRITICAL: Fix protobufjs RCE
- **Package:** protobufjs
- **Current:** 7.x (platform/orchestrator)
- **Fix:** `npm install protobufjs@>=8.0.0` (breaking change: 7.x → 8.x)
- **Test:** Full orchestrator test suite; verify proto loading
- **Owner:** Platform team
- **Escalation:** TheGuardians (RCE if untrusted protos loaded)
- **Breaking Change Note:** May require code changes; test thoroughly

### 3. ⚠️ CRITICAL: Fix @grpc/grpc-js DoS
- **Package:** @grpc/grpc-js
- **Current:** 1.14.3 (platform/orchestrator)
- **Fix:** `npm install @grpc/grpc-js@>=1.14.4`
- **Test:** gRPC endpoint tests
- **Owner:** Platform team

### 4. ⚠️ HIGH: Fix Vite Security Issues
- **Package:** vite
- **Current:** 6.4.1 (Source/Frontend)
- **Fix:** `npm install vite@>=8.2.1` (breaking: 6.x → 8.x)
- **Test:** Dev server startup, build pipeline
- **Owner:** Frontend team
- **Breaking Change Note:** Major version bump; verify dev config compatibility

### 5. Fix uuid Buffer Bounds Check
- **Package:** uuid
- **Current:** 9.0.1 (Source/Backend)
- **Fix:** `npm install uuid@>=11.1.1`
- **Test:** Unit tests
- **Owner:** Backend team

---

## Next Two Weeks

### High Severity (P2) CVEs
```bash
# Source/Backend
npm install js-yaml@>=3.15.1          # DoS via YAML merge keys
npm install qs@>=6.15.2               # DoS via null/undefined in arrays
npm install body-parser@>=1.20.6      # Size enforcement bypass

# Source/Frontend
npm install form-data@>=4.0.6         # CRLF injection
npm install ws@>=8.21.0               # WebSocket memory DoS
npm install nanoid@>=3.3.16           # Infinite loop DoS
npm install react-router-dom@>=7.18.2 # Open redirect + fixes others

# platform/orchestrator
npm install path-to-regexp@>=0.1.13   # ReDoS
npm install @opentelemetry/auto-instrumentations-node@>=0.75.0
```

---

## Next Sprint (Major Version Upgrades)

```bash
# Source/Backend
npm install express@>=5.0.0  # +3 majors (requires testing)
npm install pino@>=10.0.0    # +2 majors (logging improvements)

# Source/Frontend
npm install react@>=19.0.0   # +1 major (API changes)
npm install react-dom@>=19.0.0
```

---

## Testing & Validation Checklist

- [ ] **Phase 1 Updates:** Run `npm test --workspaces` — verify 0 new failures
- [ ] **Build Test:** `npm run build` in Source/Backend and Source/Frontend
- [ ] **E2E Tests:** `Source/E2E` full suite pass
- [ ] **Manual Smoke Test:**
  - [ ] Create a work item (Frontend → Backend)
  - [ ] List work items (pagination)
  - [ ] Transition work item state
  - [ ] Delete a work item
  - [ ] Check metrics endpoint (`/metrics`)
- [ ] **Dev Server Check:** `npm run dev` in Frontend; verify Vite serves pages
- [ ] **Orchestrator Check:** If services running, verify gRPC endpoints respond
- [ ] **No Regressions:** Baseline test count matches post-update count

---

## Escalations to TheGuardians (Security Team)

| Finding | Risk | Action |
|---------|------|--------|
| **Vitest RCE** | Arbitrary code execution if UI server exposed | Review dev-build security hardening; disable UI in prod |
| **protobufjs RCE** | Arbitrary code execution if untrusted `.proto` loaded | Verify all `.proto` files from trusted, version-controlled sources |
| **@grpc/grpc-js DoS** | Server crash from malformed gRPC requests | Assess gRPC endpoint exposure; add request validation |
| **js-yaml DoS** | CPU exhaustion if YAML config from users | Review if API accepts YAML input; consider input validation |

---

## Rollback Plan

If Phase 1 updates cause test failures:

1. **Identify** which package broke tests (binary search: revert 1 at a time)
2. **Document** the breaking change (code required, not just dep update)
3. **Open issue** for that package (assign to owner team)
4. **Revert** to previous version temporarily; proceed with other updates
5. **Schedule** code changes for next iteration

---

## Timeline

| Milestone | Deadline | Owner | Status |
|-----------|----------|-------|--------|
| Phase 1 (Critical) | EOW 2026-08-14 | Frontend, Backend, Platform | 🔴 |
| Test Phase 1 | 2026-08-15 | QA | ⏳ |
| Phase 2 (High) | 2026-08-28 | All teams | ⏳ |
| Phase 3 (Major versions) | Next sprint (Sept) | All teams | ⏳ |

---

## Reference Documents

- **Full Report:** `Teams/TheInspector/findings/audit-2026-08-10.md`
- **JSON Summary:** `Teams/TheInspector/findings/cve-summary-2026-08-10.json`
- **Learnings:** `Teams/TheInspector/learnings/dependency-auditor.md`
- **Config:** `Teams/TheInspector/inspector.config.yml` (grading rules)

---

## Questions & Clarifications

**Q: Why are vitest and vite breaking updates?**  
A: Vitest 3.x → 4.x and Vite 6.x → 8.x have API changes. Test thoroughly in an isolated branch first.

**Q: Do we need to update protobufjs? We don't use gRPC in the source app.**  
A: Yes — `platform/orchestrator` (which runs the entire pipeline) depends on it. Critical for orchestrator safety.

**Q: Can we skip uuid@11+? It seems unnecessary.**  
A: No — the buffer bounds check (GHSA-w5hq-g745-h8pq) is a moderate-severity vulnerability in the uuid library. Update it.

**Q: What if Phase 1 breaks the build?**  
A: Expected for breaking updates (vite, vitest, protobufjs). Have owner team debug code changes needed. Do NOT proceed to Phase 2 until Phase 1 tests pass.

---

**Report Generated:** 2026-08-10 by dependency-auditor  
**Next Audit:** Scheduled after Phase 1 updates to verify fixes
