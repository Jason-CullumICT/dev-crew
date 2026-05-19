# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Runs

### 2026-05-19: Full Dependency Scan

**Summary:** Critical vulnerabilities found in protobufjs and handlebars. 27 total CVEs identified across npm packages.

**Key Findings:**
- **Critical (3):** protobufjs (arbitrary code execution), handlebars (JavaScript injection)
- **High (4):** path-to-regexp (ReDoS), picomatch (ReDoS), OpenTelemetry stack crash
- **Moderate (20+):** Build tool vulnerabilities (vite, postcss, esbuild, ws)

**Recurring Patterns:**
1. **Build Tool Fragmentation:** Vite/Vitest/esbuild versions not standardized across modules
   - Source/Frontend: vite@5.4.0, vitest@2.0.5
   - platform/orchestrator: Different transitive version tree
   - portal/Frontend: vite@5.2.0, vitest@1.4.0
   - **Action:** Consolidate to single version per workspace

2. **Protobufjs Known Risk:** 8 CVEs in <=7.5.5, requires immediate update
   - Used in orchestrator (infrastructure)
   - Used in portal/Backend
   - **Watch List:** Monitor protobufjs for future releases

3. **Handlebars Usage:** Critical vulnerability in <=4.7.8
   - Transitive in Source/Backend (likely via Express middleware or another dep)
   - **Action:** Trace to direct dependency and update

4. **License Compliance:** Clean — no GPL/AGPL detected
   - Workspace uses permissive licenses (MIT, Apache 2.0, BSD)

**Tools Available:**
- `npm audit --json` ✅ Fully functional, returns comprehensive CVE data
- `npm outdated --json` ❌ Not yet tested (no node_modules)
- `npm license-checker` ❌ Not installed, manual inspection suffices

**Automation Notes:**
- npm audit returns exit code 1 when vulnerabilities found (expected)
- All module audits completed without installation issues
- Lock files present for all scanned modules

## Watch List (Recurring Issues)

### protobufjs
- **Last Known Vulnerable:** <=7.5.5 (8 CVEs: code execution, code injection, DoS, prototype pollution)
- **Next Check:** Immediately after any protobufjs release
- **Modules Affected:** orchestrator, portal/Backend

### handlebars
- **Last Known Vulnerable:** 4.0.0-4.7.8 (8 CVEs: JavaScript injection, XSS, DoS)
- **Next Check:** After any handlebars release
- **Modules Affected:** Source/Backend (indirect)

### vite/esbuild/vitest ecosystem
- **Recurring Issues:** Path traversal, ReDoS in build tools, memory disclosure
- **Status:** Multiple moderate CVEs per version, requires frequent updates
- **Recommendation:** Consolidate to single version across workspaces

## License Decisions

_None yet — no GPL/AGPL detected, no licensing conflicts._

## Next Actions

1. **Immediate:** Update protobufjs and handlebars in affected modules
2. **High Priority:** Update OpenTelemetry stack, path-to-regexp, picomatch
3. **Infrastructure:** Set up Dependabot or Renovate for continuous scanning
4. **Process:** Establish 30-day audit cadence (next: 2026-06-19)
5. **Consolidation:** Align build tool versions across workspaces
