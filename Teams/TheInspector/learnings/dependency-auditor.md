# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-27

### Critical Findings
1. **Vitest UI Security (P1)** — GHSA-5xrq-8626-4rwp
   - Arbitrary file read + execution when UI server runs
   - Fix: Upgrade to vitest@^3.2.6
   - Watch: Disable `--ui` flag in CI/exposed environments
   - Status: Escalated to TheGuardians

2. **protobufjs Code Injection (P1)** — GHSA-xq3m-2v4x-88gg
   - Multiple RCE vectors via malformed messages, prototype pollution, gadget chains
   - Fix: Upgrade to protobufjs@^7.5.5 (or upgrade @grpc/grpc-js)
   - Watch: Monitor for further protobufjs patches (very active in security updates)
   - Status: Escalated to TheGuardians

### High-Severity Patterns
- **form-data CRLF injection** — pin to ^4.0.6+
- **Express/qs parameter pollution** — upgrade to express@^4.22.2+
- **path-to-regexp ReDoS** — affects orchestrator and backend routing
- **@grpc/grpc-js crashes** — upgrade to >1.14.3

### Project-Specific Insights
- **Package Managers:** npm-based monorepo (4 workspaces)
  - Source/Backend: 4 direct deps, ~50 transitive
  - Source/Frontend: 3 direct deps, ~150 transitive (React ecosystem)
  - Source/E2E: 1 direct dep (Playwright), no critical vulns
  - platform/orchestrator: 3 direct deps, ~80 transitive (critical for protobufjs risk)

- **Licenses:** All permissive (MIT-dominant). No GPL/AGPL detected. Safe for any license profile.

- **Abandonment:** No abandoned packages. All actively maintained (React, Vite, Vercel, Tidelake teams).

- **Outdated Majors:**
  - pino: 2 major versions behind (8.x → 10.x) — functional but should upgrade
  - uuid: 5 major versions behind (9.x → 14.x) — low risk, best practice to update
  - Express: 1 major available (4.x → 5.x) — breaking changes, upgrade cautiously

### Tools & Availability
- ✅ npm audit --json works in environment
- ✅ npm outdated --json works
- ❌ License-checker not in environment (use manual package.json inspection instead)
- ✅ npm list --all for transitive dependency counts

### Next Auditor Checklist
- [ ] Re-run `npm audit` in all 4 workspaces
- [ ] Verify vitest upgrade to ^3.2.6 completed
- [ ] Check if protobufjs remediation in orchestrator is applied
- [ ] Test pino@^10.x upgrade for breaking changes in logging
- [ ] Add `npm audit` to CI/CD pipeline if not present
- [ ] Consider GitHub Dependabot or Renovate for automated updates

## Learnings

_(none yet — add discoveries here after your first run)_
