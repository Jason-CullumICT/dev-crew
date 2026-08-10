# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-08-10 — Grade F

### What the last run found
- **Grade: F** (automatic — all 4 pentest objectives achieved, 2 confirmed Critical, 6 total confirmed breaches)
- The application has zero authentication on every endpoint, confirmed live by the red-teamer
- A net-new Critical finding (arbitrary file upload + /etc/passwd exfiltration, RED-002) was discovered by the red-teamer that the pen-tester did not predict — the pen-tester did not audit the upload surface area
- Compliance pass rate: 13% (2/17 controls — both N/A, meaning truly 0 positive passes)

### Scope note — domain mismatch
The pen-tester analyzed `Source/Backend/` (work-items domain) but the test container runs the **portal backend** (feature-requests/bugs/cycles domain). The same vulnerability classes were confirmed active in the running target. In future runs, confirm which domain the live container serves before dispatching the pen-tester so scoping aligns with the red-teamer's actual target.

### Synthesis calibration notes
- SAST-001, PEN-001, COMP-001 all independently flagged the same "no auth" root cause — merge these aggressively in synthesis; they are one finding
- When COMP findings (High) overlap with SAST/PEN findings, prefer the SAST/PEN framing (more precise file/line) and cite the COMP ID as a compliance reference
- The "cascade auto-dispatch on rejection" (PEN-006) is a distinct attack vector from the basic no-auth bypass — keep it separate even though both stem from missing auth
- RED-002 (file upload) is proof that the red-teamer discovers attack surfaces the pen-tester misses; always give the red-teamer full scope to probe beyond the mapped surface

### Patterns that triggered correct alerts
- `app.use('/api/...')` with no preceding middleware → always means no auth → Critical
- `multer` fileFilter checking `file.mimetype` only → always flag; MIME header is attacker-controlled
- `limit` parsed directly from query string with no Math.min → always flag as DoS

### What changed since last run
- First run (no prior baseline)
