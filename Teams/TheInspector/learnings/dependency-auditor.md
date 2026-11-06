# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### First Audit Run (2026-11-06)

**Key Findings:**
- **4 Critical CVEs** affecting frontend (vitest) and backend (proxy-addr)
- **9 High-severity CVEs** with significant impact (DoS, path traversal, buffer overflow)
- **643 total transitive dependencies** — large attack surface but well-maintained
- **No abandoned packages** — all major deps actively maintained but versions lag latest security patches

**Critical Issues to Fix Before Deployment:**
1. **vitest@2.0.5** → **5.1.0+** (CVSS 9.8 RCE: arbitrary file read/execution via UI server)
   - Fix: `cd Source/Frontend && npm update vitest`
   - Timeline: Immediate
   - Impact: Development environment can be compromised if Vitest UI is exposed

2. **proxy-addr** (via express) — IP spoofing vulnerability (CVSS 9.1)
   - Fix: `cd Source/Backend && npm update express`
   - Timeline: Immediate
   - Impact: IP-based access controls are bypassed; especially critical since backend has NO auth layer

3. **uuid@9.0.0** → **11.1.1+** (CVSS 7.5 buffer bounds check)
   - Fix: `cd Source/Backend && npm update uuid`
   - Timeline: Within sprint
   - Impact: Verify no code passes user-controlled buf parameter to uuid v3/v5/v6

4. **vite@5.4.0** → **8.3.6+** (File access bypass, path traversal)
   - Fix: `cd Source/Frontend && npm update vite`
   - Timeline: Within 1-2 sprints (major version bump, test thoroughly)
   - Impact: Development server could leak sensitive files

**Supply Chain Assessment:**
- ✅ No post-install scripts detected
- ✅ No single-maintainer risks in production deps
- ✅ All packages >1M weekly downloads (well-adopted)
- ✅ No GPL/AGPL licenses (no viral license risk)
- ℹ️ Add license field to Source/Backend and Source/Frontend package.json

**Watch List (Recurring Issues):**
1. **vitest/vite ecosystem:** Major version drift — automate updates or pin to stable major versions
2. **express/body-parser:** Regular DoS CVE patches — update quarterly
3. **React Router:** Redirect-related vulnerabilities — code review redirect() usage

**Audit Tools Available:**
- npm audit ✅ (built-in, used for all scans)
- npm outdated ✅ (supports --json)
- npm list ✅ (dependency tree)
- license-checker ❌ (not installed; fallback to package.json parsing)

**Process Recommendations:**
1. Add `npm audit --audit-level=high --workspaces` to CI/CD gate
2. Enable GitHub Dependabot for auto-PR on new vulnerabilities
3. Monthly automated audit check + quarterly deep review
4. Commit package-lock.json for reproducible builds

**Next Audit:**
- Date: 2027-02-06 (3 months)
- Focus: Verify all P1 fixes deployed, check new CVE announcements
