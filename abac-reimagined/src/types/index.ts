// src/types/index.ts

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export type ActionType =
  | 'unlock'
  | 'arm'
  | 'disarm'
  | 'lockdown'
  | 'view_logs'
  | 'manage_users'
  | 'manage_tasks'
  | 'override'

export type ZoneType = 'Perimeter' | 'Interior' | 'Restricted' | 'Public' | 'Secure'
export type ZoneStatus = 'Armed' | 'Disarmed' | 'Alarm'
export type SiteStatus = 'Armed' | 'Disarmed' | 'PartialArm' | 'Alarm' | 'Lockdown'

export interface User {
  id: string
  name: string
  email: string
  department: string
  role: string
  clearanceLevel: number
  type: 'employee' | 'contractor' | 'visitor'
  status: 'active' | 'suspended' | 'inactive'
  customAttributes: Record<string, string>
}

export interface Rule {
  id: string
  leftSide: string
  operator: '==' | '!=' | '>=' | '<=' | '>' | '<' | 'IN' | 'NOT_IN'
  rightSide: string | string[]
}

export interface Group {
  id: string
  name: string
  description: string
  membershipType: 'static' | 'dynamic'
  members: string[]           // userId[] — used when membershipType === 'static'
  membershipRules: Rule[]     // used when membershipType === 'dynamic'
  subGroups: string[]         // groupId[] — members of subgroups inherit this group's grants
  inheritedPermissions: string[] // grantId[]
}

export interface Grant {
  id: string
  name: string
  description: string
  scope: 'global' | 'site' | 'zone'
  targetId?: string
  actions: ActionType[]
  applicationMode: 'assigned' | 'conditional' | 'auto'
  conditions: Rule[]
  conditionLogic: 'AND' | 'OR'
  scheduleId?: string
  customAttributes: Record<string, string>
}

export interface TimeWindow {
  id: string
  days: DayOfWeek[]
  startTime: string   // 'HH:MM' 24h
  endTime: string     // 'HH:MM' 24h — may be less than startTime for overnight windows
}

export interface Holiday {
  id: string
  name: string
  month: number       // 1–12
  day: number         // 1–31
  behavior: 'deny_all' | 'allow_with_override' | 'normal'
  overrideGrantIds: string[]     // grants that remain active on this holiday
  requiredClearance?: number     // minimum clearanceLevel to use override grants
}

export interface NamedSchedule {
  id: string
  name: string
  timezone: string    // IANA, e.g. 'Australia/Sydney'
  windows: TimeWindow[]
  holidays: Holiday[]
}

export interface Policy {
  id: string
  name: string
  description: string
  rules: Rule[]
  logicalOperator: 'AND' | 'OR'
  doorIds: string[]
  scheduleId?: string
}

export interface Zone {
  id: string
  siteId: string
  name: string
  type: ZoneType
  status: ZoneStatus
}

export interface Site {
  id: string
  name: string
  address: string
  timezone: string
  status: SiteStatus
}

export interface Door {
  id: string
  name: string
  siteId: string
  zoneId?: string
  description: string
  customAttributes: Record<string, string>
}

export interface Controller {
  id: string
  name: string
  location: string
  siteId: string
  doorIds: string[]
  customAttributes: Record<string, string>
}

export interface ArmingLog {
  id: string
  timestamp: string
  userName: string
  action: string
  siteName: string
  result: 'Success' | 'Denied'
}

export interface NowContext {
  dayOfWeek: DayOfWeek
  hour: number
  minute: number
  date: string    // 'YYYY-MM-DD'
  month: number   // 1–12
  day: number     // 1–31
}

// Canvas node position — persisted in store so drags survive navigation
export interface CanvasPosition {
  x: number
  y: number
}

export interface StoreSnapshot {
  allUsers: User[]
  allGroups: Group[]
  allGrants: Grant[]
  allSchedules: NamedSchedule[]
  allPolicies: Policy[]
  allDoors: Door[]
  allZones: Zone[]
  allSites: Site[]
  allControllers: Controller[]
}

// ── Engine result types ──────────────────────────────────────────────────────

export type ScheduleStatus = 'active' | 'inactive' | 'override_active'

export interface GrantResult {
  grantId: string
  grantName: string
  applicationMode: Grant['applicationMode']
  scheduleStatus: ScheduleStatus | null   // null if no schedule attached
  activeHolidayName?: string
  conditionResults: ConditionResult[]
  included: boolean
}

export interface ConditionResult {
  ruleId: string
  leftSide: string
  operator: string
  rightSide: string | string[]
  leftResolved: string
  rightResolved: string
  passed: boolean
}

export interface PolicyResult {
  policyId: string
  policyName: string
  ruleResults: ConditionResult[]
  passed: boolean
}

export interface AccessResult {
  permissionGranted: boolean
  abacPassed: boolean
  overallGranted: boolean
  matchedGrants: string[]
  grantResults: GrantResult[]
  policyResults: PolicyResult[]
  groupChain: string[]       // group names the user is in, including via nesting
  nowContext: NowContext
  activeHoliday?: Holiday
}
