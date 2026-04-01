# SOC Security Management Platform — Mock UI

## Objective
Build a standalone React + Vite + TypeScript + Tailwind CSS demo app at `abac-soc-demo-v2/` in the workspace root. Session-storage only, no backend.

## Project Setup
```bash
cd /workspace
npm create vite@latest abac-soc-demo-v2 -- --template react-ts
cd abac-soc-demo-v2
npm install @tanstack/react-virtual react-router-dom lucide-react uuid zustand
npm install -D tailwindcss @tailwindcss/postcss postcss autoprefixer
```
Set `vite.config.ts` server port to 4304.
Configure Tailwind v4 via `postcss.config.js`.

## File Structure
```
abac-soc-demo-v2/
  src/
    types/index.ts          — all TypeScript interfaces
    engine/accessEngine.ts  — hasPermission() + evaluateAccess()
    store/store.ts          — zustand store with sessionStorage
    data/testData.ts        — generateTestData()
    components/
      Layout.tsx            — sidebar + outlet
    pages/
      Dashboard.tsx
      Sites.tsx
      Arming.tsx
      Users.tsx
      Groups.tsx
      Permissions.tsx
      Doors.tsx
      Controllers.tsx
      Policies.tsx
      Tasks.tsx
      AccessTest.tsx
      AccessMatrix.tsx
    App.tsx
    main.tsx
```

## Types (src/types/index.ts)
- `ClearanceLevel`: Unclassified | Confidential | Secret | TopSecret (hierarchy 0-3)
- `UserStatus`: Active | Suspended | Pending
- `User`: id, name, email, department, role, clearanceLevel, status, customAttributes: Record<string,string>, grantedPermissions: string[], groupIds: string[]
- `Group`: id, name, description, memberUserIds: string[], inheritedPermissions: string[]
- `GrantScope`: global | site | zone
- `ActionType`: arm | disarm | unlock | lockdown | view_logs | manage_users | manage_tasks | override
- `Grant`: id, name, description, scope: GrantScope, targetId?: string, actions: ActionType[]
- `SiteStatus`: Armed | Disarmed | PartialArm | Alarm | Lockdown
- `Site`: id, name, address, timezone, status: SiteStatus, assignedManagerIds: string[], zones: string[]
- `ZoneType`: Perimeter | Interior | Secure | Public | Emergency
- `ZoneStatus`: Armed | Disarmed | Alarm
- `Zone`: id, siteId, name, type: ZoneType, status: ZoneStatus, doorIds: string[], cameraIds?: string[]
- `LockState`: Locked | Unlocked | Forced | Held
- `Door`: id, name, location, siteId, zoneId, controllerId, description, lockState: LockState
- `Controller`: id, name, location, siteId, doorIds: string[]
- `Operator`: == | != | >= | <= | IN | NOT IN
- `Rule`: id, attribute, operator: Operator, value: string | string[]
- `Policy`: id, name, description, rules: Rule[], logicalOperator: AND|OR, doorIds: string[]
- `TaskPriority`: Low | Medium | High | Critical
- `TaskStatus`: Open | InProgress | Blocked | Complete | Cancelled
- `TaskCategory`: Inspection | Maintenance | Incident | Audit | Training | Other
- `TaskNote`: id, text, authorId, timestamp
- `Task`: id, title, description, siteId, zoneId?, assignedToUserId?, createdByUserId, priority, status, dueDate, category, notes: TaskNote[]
- `AccessResult`: permissionGranted: boolean, abacGranted: boolean, overallGranted: boolean, matchedPolicy?, policyResults: PolicyResult[]
- `ArmingLog`: id, timestamp, userName, action, siteName, result

## Access Engine (src/engine/accessEngine.ts)
```ts
// Layer 1: permission check
export function hasPermission(user, groups, grants, action, siteId?, zoneId?): boolean
// Collects direct grants (user.grantedPermissions) + group-inherited grants
// Matches: global scope always passes; site scope matches targetId===siteId; zone matches targetId===zoneId

// Layer 2: ABAC evaluation
export function evaluateAccess(user, door, policies, groups, grants): AccessResult
// permissionGranted = hasPermission(user, groups, grants, 'unlock', door.siteId, door.zoneId)
// abacGranted = any assigned policy passes all its rules
// overallGranted = permissionGranted && abacGranted
// Clearance hierarchy for >= <=: Unclassified(0) < Confidential(1) < Secret(2) < TopSecret(3)
```

## Store (src/store/store.ts)
Zustand store persisted to sessionStorage. Slices: users, groups, grants, sites, zones, doors, controllers, policies, tasks, armingLogs. Full CRUD (add/update/delete/set) for each entity type.

## Test Data (src/data/testData.ts)
`generateTestData()` populates the store with:
- 5 sites: HQ Office (Armed), Regional Office (Armed), Data Centre Alpha (Disarmed), Central Warehouse (Disarmed), Executive Suite (Disarmed)
- 3-5 zones per site with mixed statuses
- 30 users with realistic names across Engineering / Security / Operations / Executive / Facilities
- 6 groups: Executives, Senior Security, Operations Team, Engineering Lead, Facilities, Read-Only
- 8 grants covering arm/disarm/view_logs/manage_users/manage_tasks/override scoped to sites
- 12 doors across sites with proper siteId/zoneId/controllerId references
- 3 controllers
- 5 ABAC policies of increasing complexity (dept check → clearance check → AND combo → IN operator → TopSecret-only)
- 15 tasks in mixed statuses (Open/InProgress/Blocked/Complete)

## Pages

### Layout
Dark slate/zinc sidebar (240px). Nav items with lucide-react icons:
Dashboard(/) · Sites(/sites) · Arming(/arming) · Users(/users) · Groups(/groups) · Permissions(/permissions) · Doors(/doors) · Controllers(/controllers) · Policies(/policies) · Tasks(/tasks) · Test Access(/test) · Access Matrix(/matrix)

### Dashboard (/)
5 count widgets: Active Users, Total Sites, Armed Sites, Active Alarms, Open Tasks.
Site overview cards (name + address + status badge: green=Disarmed, amber=PartialArm, red=Armed, dark-red=Alarm/Lockdown).
Recent arming events table (last 10 from armingLogs).
Overdue tasks list (dueDate < today, status !== Complete/Cancelled).

### Sites & Zones (/sites)
Site list with add/edit/delete. Click site to expand and manage its zones (add/edit/delete zone with name/type/status fields).

### Arming Control (/arming)
Site selector. Shows site status + zone statuses. Lists users with arm/disarm permission (via hasPermission). Buttons: Arm Site, Disarm Site, Partial Arm, Trigger Lockdown, Clear Alarm. Each updates site/zone status and appends to armingLogs. Acting user = first user with global grant.

### Users (/users)
Searchable/sortable/paginated table (25/page). Click row to expand: attributes, direct grants, group memberships, effective permissions. Add/Edit/Delete modal with all User fields including grant + group assignment.

### Groups (/groups)
List with CRUD. Detail shows member users and inherited grants. Form: name, description, member picker, grant picker.

### Permissions (/permissions)
Grant list with CRUD. Form: name, description, scope radio (global/site/zone), targetId picker (shows when scoped), actions multi-checkbox (all 8 ActionTypes).

### Doors (/doors)
Searchable table. CRUD modal. Columns: name, site, zone, controller, lockState badge.

### Controllers (/controllers)
List with CRUD. Shows managed door names.

### ABAC Policies (/policies)
List with CRUD. Form: name, description, AND/OR toggle, rule builder (add/remove rules: attribute text + operator dropdown + value text), door multi-select.

### Task Board (/tasks)
Toggle between Kanban (4 columns: Open/InProgress/Blocked/Complete, draggable cards) and List (searchable/filterable table). Card shows: title, priority badge, site name, assignee, due date. Click to open detail modal: full edit form + append-only notes thread.

### Test Access (/test)
User dropdown + Door dropdown. Evaluate button calls evaluateAccess(). Shows:
- Permission layer: granted/denied + which grants matched
- ABAC layer: per-policy result + per-rule breakdown
- Overall: large GRANTED (green) or DENIED (red) banner

### Access Matrix (/matrix)
Rows = users, columns = doors. Virtualised with @tanstack/react-virtual. Cell = green ✓ or red ✗. Click cell → breakdown modal (same as Test Access detail).

## App.tsx
React Router with all 12 routes. On mount: if store users.length === 0, call generateTestData().

## Definition of Done
- `npm run build` completes with zero TypeScript errors
- `npm run dev` starts on port 4304
- All 12 nav sections render without errors
- Test data auto-populates on first load
- Arming panel updates site/zone status
- Task board shows both kanban and list
- Access test shows two-layer result breakdown
