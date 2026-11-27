# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-27 — First audit run

**Two-tier spec system discovered:**  
The project has two spec levels: primary domain spec (`Specifications/dev-workflow-platform.md`, 76 FRs, 0% coverage) and plan-level specs under `Plans/*/requirements.md` (all ~100% covered). The traceability enforcer always targets the plan-level spec — the primary spec is never enforced. Always check both levels in future audits.

**Inspector config file location:** `Teams/TheInspector/inspector.config.yml` — overrides auto-discovery for service URLs, latency budgets, grading thresholds, and security scenarios.

**Services offline pattern:** Services at localhost:3001 / localhost:5173 were offline during audit. When both are offline, skip performance-profiler and chaos-monkey; both specialists need live services. Static analysis still runs for all 4 specialists.

**Escalation triggers to look for:**  
Config lists: "auth bypass", "injection", "sensitive data exposed", "hardcoded secret", "missing access control". Dependency CVEs for proxy-addr (IP spoofing = auth bypass) and Handlebars/protobufjs (injection/RCE) both qualify — don't miss these in dep audits.

**Grade D thresholds:** From inspector.config.yml: A=0 P1/3 P2/80% spec; B=0 P1/8 P2/60% spec; C=2 P1/15 P2/40% spec; D=anything worse. With 8 P1s this round, D was inevitable. Target C for next audit: patch escalated CVEs to remove 4 P1s, leaving 4 non-security P1s (QO-001/002 spec drift + DEP-003/004 build-chain).

**Fast-path files for future runs:**  
- Traceability enforcer: `tools/traceability-enforcer.py` (broken: targets wrong spec by default)  
- Primary spec: `Specifications/dev-workflow-platform.md` (76 FRs, 0% traced)  
- Package files: `Source/Backend/package.json`, `Source/Frontend/package.json`, `Source/E2E/package.json`, `platform/orchestrator/package.json`  
- Prior HTML report: `Teams/TheInspector/findings/audit-2026-11-27-D.html`  
- Prior bug backlog: `Teams/TheInspector/findings/bug-backlog-2026-11-27.json`
