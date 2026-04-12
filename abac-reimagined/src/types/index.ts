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
  membershipLogic: 'AND' | 'OR'  // how membershipRules are combined; default 'AND' for backwards compat
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
  /** ISO 8601 date string — grant is not valid before this date */
  validFrom?: string
  /** ISO 8601 date string — grant is not valid after this date */
  validUntil?: string
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

// ── Hardware I/O types ───────────────────────────────────────────────────────

export type InputDeviceType =
  | 'card_reader'
  | 'rex_button'
  | 'door_contact'
  | 'pir_sensor'
  | 'glass_break'
  | 'panic_button'
  | 'intercom'

export type OutputDeviceType =
  | 'electric_strike'
  | 'mag_lock'
  | 'siren'
  | 'strobe'
  | 'camera_trigger'
  | 'relay_output'

export type DeviceStatus = 'online' | 'offline' | 'tamper' | 'fault' | 'low_battery'

export interface InputDevice {
  id: string
  name: string
  type: InputDeviceType
  doorId: string
  controllerId: string
  port: number
  status: DeviceStatus
  config: Record<string, string>
}

export interface OutputDevice {
  id: string
  name: string
  type: OutputDeviceType
  doorId?: string
  zoneId?: string
  controllerId: string
  port: number
  status: DeviceStatus
  config: Record<string, string>
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

// ── SOC Monitoring types ─────────────────────────────────────────────────────

export type EventSeverity = 'critical' | 'warning' | 'info'
export type EventCategory = 'access' | 'alarm' | 'system' | 'intrusion'
export type AlarmState = 'active' | 'acknowledged' | 'escalated' | 'cleared'
export type ThreatLevel = 'normal' | 'elevated' | 'high' | 'critical' | 'lockdown'

export type SecurityEventType =
  | 'access_granted'
  | 'access_denied'
  | 'door_forced'
  | 'door_held'
  | 'sensor_trip'
  | 'controller_offline'
  | 'arm_state_change'
  | 'panic_button'
  | 'door_contact_open'
  | 'door_contact_close'
  | 'reader_tamper'
  | 'device_offline'
  | 'device_online'
  | 'pir_trigger'

export interface SecurityEvent {
  id: string
  timestamp: string              // ISO 8601
  category: EventCategory
  severity: EventSeverity
  eventType: SecurityEventType
  siteId: string
  zoneId?: string
  doorId?: string
  userId?: string
  message: string
  metadata: Record<string, string>
}

export interface Alarm {
  id: string
  triggerEventId: string
  severity: EventSeverity
  state: AlarmState
  siteId: string
  zoneId?: string
  doorId?: string
  title: string
  acknowledgedBy?: string        // userId
  acknowledgedAt?: string
  escalatedAt?: string
  clearedAt?: string
  notes: string[]
}

// ── Phase 3 — Response Rules Engine ─────────────────────────────────────────

export type ResponseActionType =
  | 'lock_door'
  | 'lock_zone'
  | 'lock_site'
  | 'unlock_door'
  | 'unlock_zone'
  | 'activate_siren'
  | 'activate_strobe'
  | 'trigger_camera'
  | 'send_notification'
  | 'escalate_alarm'
  | 'change_threat_level'
  | 'arm_zone'
  | 'disarm_zone'

export interface ResponseAction {
  type: ResponseActionType
  targetId?: string              // doorId, zoneId, or siteId depending on type
  params: Record<string, string> // action-specific (e.g., notifyEmail, cameraPreset)
}

export interface ResponseRule {
  id: string
  name: string
  enabled: boolean
  priority: number               // lower = higher priority (evaluated first)
  trigger: {
    eventTypes: SecurityEventType[]
    severities?: EventSeverity[]
  }
  conditions: {
    siteIds?: string[]           // empty/undefined = all sites
    zoneTypes?: ZoneType[]
    armStates?: ZoneStatus[]
    scheduleId?: string          // rule only active during this schedule
    threatLevels?: ThreatLevel[]
  }
  actions: ResponseAction[]
}

export interface EscalationStep {
  delayMinutes: number
  notifyUserIds: string[]
  autoActions: ResponseAction[]
}

export interface EscalationChain {
  id: string
  name: string
  steps: EscalationStep[]
}

// ── Phase 4 — Advanced Access Control ───────────────────────────────────────

/** Anti-passback configuration per zone */
export interface AntiPassbackConfig {
  zoneId: string
  /** hard = deny entry if last event was an entry without exit; soft = grant but log warning */
  mode: 'hard' | 'soft' | 'off'
  /** Number of minutes after which the passback violation is forgiven */
  resetMinutes: number
}

/** Two-person rule configuration per door */
export interface TwoPersonRule {
  doorId: string
  enabled: boolean
  /** Second person must badge within this many seconds of the first */
  timeoutSeconds: number
}

/** Escort mode configuration per door */
export interface EscortConfig {
  doorId: string
  enabled: boolean
  /** Visitor must badge within this many seconds after the escort */
  escortTimeoutSeconds: number
}

/** Door interlock (mantrap) pair — one must close before the other opens */
export interface DoorInterlock {
  id: string
  doorAId: string
  doorBId: string
  /** Human-readable label, e.g. "Server Room Mantrap" */
  name: string
}

/** Zone occupancy derived from badge-in/badge-out events */
export interface ZoneOccupancy {
  zoneId: string
  /** User IDs currently inside the zone based on badge events */
  userIds: string[]
  lastUpdated: string
}
