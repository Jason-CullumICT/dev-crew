# Universal ABAC — Design Spec
**Date:** 2026-04-02  
**Project:** abac-soc-demo-v2  
**Status:** Approved for implementation

---

## Overview

Extend the SOC demo's access control model from a user-only ABAC system to a fully universal ABAC model where:

- All entities (Door, Zone, Site, Controller, Group) carry custom attributes
- Policy rules can reference attributes from any entity using `entity.attribute` notation on either side
- Rules can check group membership for any entity type (`user IN group.X`, `door IN group.Y`)
- Groups can contain any entity type, with both explicit and dynamic (rule-driven) membership
- The access engine resolves all attribute references and membership checks at evaluation time

---

## 1. Data Model Changes

### 1.1 Rule (replaces current Rule interface)

```ts
interface Rule {
  id: string;
  leftSide: string;          // "user.clearanceLevel", "door.securityLevel", "user", "door", etc.
  operator: Operator;        // '==' | '!=' | '>=' | '<=' | 'IN' | 'NOT IN'
  rightSide: string | string[]; // "Secret", "door.requiredClearance", "group.AuthorizedPersonnel", ["Eng","Ops"]
}
```

**Left side formats:**
- `entity.attribute` — resolve attribute from named entity (e.g. `user.clearanceLevel`)
- `entity` — bare entity reference for membership checks only (e.g. `user`, `door`)
- Bare attribute name (no dot) — legacy fallback, treated as `user.{attribute}`

**Right side formats:**
- `entity.attribute` — resolved from context (e.g. `door.requiredClearance`)
- `group.GroupName` — group membership lookup (used with `IN`/`NOT IN` on left side)
- Literal string or array of strings

### 1.2 GroupMember (new)

```ts
interface GroupMember {
  entityType: 'user' | 'door' | 'zone' | 'site' | 'controller';
  entityId: string;
}
```

### 1.3 Group (revised)

```ts
interface Group {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];              // replaces memberUserIds: string[]
  membershipRules: Rule[];             // dynamic membership rules
  membershipLogic: 'AND' | 'OR';       // how membershipRules combine
  membershipType: 'explicit' | 'dynamic' | 'hybrid';
  targetEntityType: 'user' | 'door' | 'zone' | 'site' | 'controller' | 'any';
  inheritedPermissions: string[];      // grant IDs — applied when group contains users
}
```

**membershipType semantics:**
- `explicit` — only `members` array, rules ignored
- `dynamic` — `members` ignored, compute from `membershipRules` against all entities of `targetEntityType`. Groups with `targetEntityType: any` only support `explicit` or `hybrid` membership (dynamic is a no-op for `any`).
- `hybrid` — union of `members` + dynamic rule matches

### 1.4 Entity customAttributes (new fields)

Add `customAttributes: Record<string, string>` to: `Door`, `Zone`, `Site`, `Controller`.  
`User` already has this field.

---

## 2. Engine Changes (`src/engine/accessEngine.ts`)

### 2.1 EvalContext

```ts
interface EvalContext {
  user: User;
  door?: Door;
  zone?: Zone;
  site?: Site;
  group?: Group;
  controller?: Controller;
  allUsers: User[];
  allDoors: Door[];
  allZones: Zone[];
  allSites: Site[];
  allControllers: Controller[];
  allGroups: Group[];
}
```

### 2.2 resolveAttribute(ref: string, context: EvalContext): string

Parses `entity.attribute` notation:
1. Split on first `.` → `[entityKey, attrKey]`
2. Look up entity from context by `entityKey` (`user`, `door`, `zone`, `site`, `group`, `controller`)
3. Check built-in fields first (e.g. `user.department`, `door.lockState`, `zone.type`, `site.status`)
4. Fall back to `entity.customAttributes[attrKey]`
5. If no dot: treat as `user.{ref}` (backwards compatibility)
6. Returns `''` if entity or attribute not found

**Built-in attribute map:**
| Entity | Built-in attributes |
|--------|-------------------|
| user | name, email, department, role, clearanceLevel, status |
| door | name, location, lockState, description |
| zone | name, type, status |
| site | name, address, status, timezone |
| controller | name, location |
| group | name, targetEntityType, membershipType |

### 2.3 isEntityInGroup(entityId, entityType, group, context): boolean

Checks if a given entity is a member of a group:
1. If `membershipType` is `explicit` or `hybrid`: check `group.members` for matching `{entityType, entityId}`
2. If `membershipType` is `dynamic` or `hybrid`: evaluate `group.membershipRules` against the entity
   - Build a minimal context with the entity in the appropriate slot
   - Evaluate rules using `membershipLogic` (AND/OR)
3. Return true if either check passes (per membershipType)

### 2.4 evaluateRule(rule: Rule, context: EvalContext): { leftResolved: string; rightResolved: string; passed: boolean }

Updated evaluation:
1. Detect if leftSide is a bare entity type (`user`, `door`, `zone`, `site`, `controller`) AND operator is `IN`/`NOT IN`
   - This is a **membership check**: resolve rightSide as `group.GroupName` → look up group by name (case-insensitive, spaces treated as-is) → call `isEntityInGroup`
   - If the named group is not found, the rule evaluates to `false`
2. Otherwise: resolve both `leftSide` and `rightSide` via `resolveAttribute`
3. Compare resolved values using operator (existing comparison logic, including clearance rank hierarchy)
4. For `IN`/`NOT IN` with array rightSide: match resolved left value against array items
5. For `IN`/`NOT IN` with `entity.attribute` rightSide that resolves to comma-separated string: split on `,` then match

Returns resolved values for display in TestAccess results panel.

### 2.5 resolveGroupMembers(group, context): GroupMember[]

Returns the effective membership of a group given current context. Used for display and for `hasPermission` to determine which grants apply.

### 2.6 hasPermission — updated

When collecting group grants for a user: use `resolveGroupMembers` for all groups where `targetEntityType` is `user` or `any`, checking if the user is an effective member.

### 2.7 evaluateAccess — updated signature

```ts
interface StoreSnapshot {
  allUsers: User[];
  allDoors: Door[];
  allZones: Zone[];
  allSites: Site[];
  allControllers: Controller[];
  allGroups: Group[];
}

evaluateAccess(user, door, policies, groups, grants, store: StoreSnapshot): AccessResult
```

Builds full `EvalContext` from arguments. Passes context through all rule evaluations. Callers (TestAccess, AccessMatrix, Arming) read all entity lists from the Zustand store and pass as `store`. This keeps the function signature stable as entities are added.

---

## 3. Store Changes

`store.ts` requires no structural changes. The updated `Group` type is a superset of the old one — migration is handled in `testData.ts` by regenerating all groups.

---

## 4. UI Changes

### 4.1 Rule Builder component (`src/components/RuleBuilder.tsx`) — new shared component

Extracted from Policies page and enhanced:
- **Left side**: text input with autocomplete hint popover showing `entity.attribute` options derived from current store data. Also shows bare entity names (`user`, `door`, `zone`, `site`) as membership check shortcuts.
- **Operator**: dropdown (all 6 operators)
- **Right side**: text input with autocomplete hints. For `IN`/`NOT IN` with a bare entity on the left, shows group names with `group.` prefix as suggestions.
- **IN / NOT IN value mode toggle**: when right side is a literal, allows comma-separated entry; when prefixed with `group.` or `entity.`, treated as a reference.

### 4.2 Policies page — updated

Replaces inline rule builder with `<RuleBuilder />`. No other changes needed.

### 4.3 Groups page — updated

- **Members section**: entity type selector + picker showing entities of that type (name + key attributes)
- **Membership type toggle**: Explicit / Dynamic / Hybrid
- **Dynamic rules section** (shown for Dynamic and Hybrid): `<RuleBuilder />` + AND/OR toggle
- **Target entity type**: selector for what entity type this group manages (affects which entities appear in the member picker and which dynamic rules are evaluated against)
- **Inherited permissions**: shown only when `targetEntityType` is `user` or `any`

### 4.4 Entity attribute editors — updated

Add a key/value attribute editor (same pattern as Users' customAttributes) to edit modals in:
- `Doors.tsx`
- `Sites.tsx` (for both Site and Zone forms)
- `Controllers.tsx`

### 4.5 TestAccess page — updated results panel

Add a **"Resolved Context"** section showing attribute values used during evaluation:
- Table of `entity.attribute → resolved value` for all attributes referenced in matched rules
- Shows dynamic group membership resolution: which groups the user/door was dynamically placed in

---

## 5. Test Data Updates (`src/data/testData.ts`)

Update `generateTestData()` to demonstrate the new capabilities:

- **Doors**: add `securityLevel` and `requiredClearance` custom attributes to select doors
- **Zones**: add `classification` custom attribute to Secure zones
- **Sites**: add `operationalStatus` custom attribute
- **Groups**: convert some existing groups to dynamic/hybrid:
  - "Senior Security" → dynamic, `user.department == Security AND user.status == Active`
  - "Engineering Lead" → dynamic, `user.department == Engineering AND user.clearanceLevel >= Secret`
  - Add new group "High Security Doors" → `targetEntityType: door`, dynamic, `door.securityLevel == High`
  - Add new group "Secure Zones" → `targetEntityType: zone`, dynamic, `zone.type == Secure`
- **Policies**: add new policies demonstrating cross-entity and membership rules:
  - "Secure Door Access" → `user IN group.EngineeringLead AND door IN group.HighSecurityDoors`
  - "Cross-entity Clearance" → `user.clearanceLevel >= door.requiredClearance`

---

## 6. Definition of Done

- `npm run build` passes with zero TypeScript errors
- TestAccess page renders without errors
- Evaluating a user against a door shows resolved attribute context
- Dynamic group membership correctly includes/excludes users at evaluation time
- Cross-entity rule `user.clearanceLevel >= door.requiredClearance` evaluates correctly
- Group membership rule `user IN group.X` and `door IN group.Y` evaluate correctly
- All 12 pages render without crashes
- Existing explicit group behaviour unchanged for `membershipType: explicit`
