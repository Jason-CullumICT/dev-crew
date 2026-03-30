# Quality Oracle Learnings

## Run: run-20260330-071418 — Duplicate/Deprecated Status Feature

### Spec Coverage Trend
- 13 functional requirements (FR-DUP-01..13) — all traced to implementation in some layer
- Ghost ID FR-DUP-14 appeared in routes and tests with no spec backing (common when routes need a separate traceability hook and authors invent a new ID rather than reusing existing ones)
- FR-DUP-06, FR-DUP-08, FR-DUP-13 have zero or very low test-side traceability — schema migration and RESOLVED_STATUSES integration go untested directly

### Common Pattern Violations Found
1. **Ghost FR IDs**: `FR-DUP-14` referenced in 6 places (2 route files, 4 test cases) but does not exist in the spec. Happens when coder adds a new feature path (route forwarding) and treats it as a separate FR.
2. **STATUS_OPTIONS omission**: Both `BugReportsPage.tsx` and `FeatureRequestsPage.tsx` STATUS_OPTIONS dropdowns do not include `duplicate` or `deprecated` options. The dispatch plan explicitly required this but it was not implemented.
3. **Missing STATUS_TRANSITIONS in bugService**: `bugService.ts` has no explicit `STATUS_TRANSITIONS` map (unlike `featureRequestService.ts`). Terminal status enforcement is present but any status→any status transitions are allowed otherwise.
4. **Duplicate banner uses list-page link not deep link**: Both BugDetail and FeatureRequestDetail link the `duplicate_of` ID to the list page (`/bugs`, `/feature-requests`) rather than auto-selecting the canonical item.
5. **FR-DUP-13 untested**: No test is tagged `FR-DUP-13` despite the dependency cascade behavior being implemented.

### Useful File Paths for Future Audits
- Spec: `/workspace/Plans/duplicate-deprecated-status/requirements.md`
- Contracts: `/workspace/Plans/duplicate-deprecated-status/contracts.md`
- Shared types: `/workspace/portal/Shared/types.ts`
- Shared API types: `/workspace/portal/Shared/api.ts`
- Backend routes: `/workspace/portal/Backend/src/routes/bugs.ts`, `featureRequests.ts`
- Backend services: `/workspace/portal/Backend/src/services/bugService.ts`, `featureRequestService.ts`
- Schema: `/workspace/portal/Backend/src/database/schema.ts`
- Frontend pages: `/workspace/portal/Frontend/src/pages/BugReportsPage.tsx`, `FeatureRequestsPage.tsx`
- Frontend components: `/workspace/portal/Frontend/src/components/bugs/BugDetail.tsx`, `BugList.tsx`, `feature-requests/FeatureRequestDetail.tsx`, `FeatureRequestList.tsx`

### Coverage Matrix Pattern
When running FR coverage, a grep per FR ID across src + tests is the most reliable method:
```bash
for i in $(seq -w 01 13); do
  src=$(grep -rn "FR-DUP-$i" portal/Backend/src/ portal/Frontend/src/ portal/Shared/ | wc -l)
  tst=$(grep -rn "FR-DUP-$i" portal/Backend/tests/ portal/Frontend/tests/ | wc -l)
  echo "FR-DUP-$i: src=$src tests=$tst"
done
```

### Known Pre-existing Issues (not introduced by this feature)
- Frontend test failures in Traceability.test.tsx, ImageUpload.test.tsx, Learnings.test.tsx, OrchestratorCycleCard.test.tsx are pre-existing and unrelated to this feature
- bugService.ts lacks STATUS_TRANSITIONS map — pre-existing design gap
