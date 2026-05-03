# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run #1 (2026-05-03)

#### Critical Findings
1. **Handlebars RCE Chain (via ts-jest)** — Source/Backend
   - 8 distinct CVE entries, CVSS 9.8 top severity
   - Root cause: ts-jest@^29.1.2 depends on handlebars@^4.7.8 (unpatched)
   - Fix: Update ts-jest to latest (should pull handlebars >=4.7.9)
   - Status: Recommend immediate upgrade before deployment

2. **Protobufjs RCE** — platform/orchestrator
   - CVSS 9.8, affects `.proto` file parsing
   - Via Google Cloud client library chain
   - Fix: npm update protobufjs (should go to >=7.5.5)
   - Risk: Only if orchestrator loads untrusted proto files

#### High Priority
- **path-to-regexp ReDoS**: Affects portal & orchestrator (CVSS 7.5)
- **UUID Buffer Bounds**: Direct dep in Backend & Portal (5 major versions behind)

#### Inventory Notes
- **Monorepo Structure**: 6 main workspaces + 4 demo projects
- **Transitive Dependencies**: ~200+ across monorepo (high supply chain surface)
- **UUID Versions in Use**: 9.0.0 (Backend/Portal), 10.0.0 (Orchestrator), 13.0.0 (demos)
- **License Compliance**: All green (MIT/Apache-2.0 primary)

#### Audit Tools Available
- `npm audit --json` — fully functional in all workspaces
- `npm outdated --json` — works per-workspace
- `npm ls` — useful for mapping transitive deps

#### Watch List (Future Audits)
- ts-jest/handlebars — upgrade and monitor for new vulns
- dockerode — pulled in for orchestrator, watch for uuid transitive
- Vite ecosystem — multiple moderate CVEs in dev deps (lower priority but monitor)

#### Prior Decisions
_(to be populated as team addresses findings)_
