# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Run 2026-11-22: Comprehensive npm Audit

**Key Findings:**
1. **8 Critical CVEs** across 5 npm projects — immediate patching required:
   - proxy-addr (IP spoofing): 3 projects affected (Backend, Orchestrator, Portal Backend)
   - protobufjs (code injection): 2 projects affected (Orchestrator, Portal Backend)
   - handlebars (template injection): 1 project (Backend)
   - tinypool (prototype pollution RCE): 3 projects via vitest
   - vitest (file read when UI enabled): 3 projects via test framework

2. **High CVE Volume**: 49+ high-severity vulnerabilities across all projects
   - Recurring offenders: body-parser, brace-expansion, browserslist, form-data, js-yaml, postcss, react-router, ws
   - Most are transitive; mitigation requires updating parent packages

3. **Supply Chain Risk**:
   - **platform/orchestrator**: 52x multiplier (3 direct → 156 transitive) via gRPC/protobuf
   - **portal/Backend**: 578 transitive deps (large surface area)
   - 50+ @opentelemetry/* packages in portal/Backend create maintenance burden

4. **License Compliance**: 
   - No GPL/AGPL dependencies detected ✓
   - MIT and Apache 2.0 dominate (safe for proprietary code)

5. **Package Health**:
   - No abandoned packages detected
   - React, Express, gRPC all actively maintained
   - Some packages >1 major version behind (need upgrade planning)

### Audit Tools Available
- npm audit --json: Available in all 5 projects
- npm outdated --json: Available (shows null for uninstalled packages)
- npm ls: Can count direct deps
- package-lock.json: Can extract transitive dependency counts

### Recommendations for Next Audit
1. Run npm install first to populate current versions
2. Use npm audit fix where applicable (may auto-patch transitive deps)
3. Consider creating a dependency update strategy:
   - P0: Security-critical (proxy-addr, protobufjs, handlebars, tinypool)
   - P1: High-severity DoS/injection fixes
   - P2: Major version upgrades (react, react-router, express)
4. Consolidate test tooling versions across Frontend projects (duplicates increase maintenance)
5. Monitor protobufjs and @grpc/grpc-js closely — both have history of RCE issues

### Cross-Team Escalation Pattern
- Security issues (CVEs, code injection) → TheGuardians
- Major version upgrades (breaking changes) → TheFixer
- Observability consolidation → Architectural review
