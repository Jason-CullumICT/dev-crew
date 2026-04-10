export type ClearanceLevel = 'Unclassified' | 'Confidential' | 'Secret' | 'TopSecret';
export const CLEARANCE_RANK: Record<ClearanceLevel, number> = {
  Unclassified: 0, Confidential: 1, Secret: 2, TopSecret: 3,
};

export type UserStatus = 'Active' | 'Suspended' | 'Pending';

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  clearanceLevel: ClearanceLevel;
  status: UserStatus;
  customAttributes: Record<string, string>;
  grantedPermissions: string[];
  groupIds: string[];
}

export interface GroupMember {
  entityType: 'user' | 'door' | 'zone' | 'site' | 'controller';
  entityId: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
  membershipRules: Rule[];
  membershipLogic: 'AND' | 'OR';
  membershipType: 'explicit' | 'dynamic' | 'hybrid';
  targetEntityType: 'user' | 'door' | 'zone' | 'site' | 'controller' | 'any';
  inheritedPermissions: string[];
  scheduleId?: string;
}

export type GrantScope = 'global' | 'site' | 'zone';

export type ActionType =
  | 'arm' | 'disarm' | 'unlock' | 'lockdown'
  | 'view_logs' | 'manage_users' | 'manage_tasks' | 'override';

export interface Schedule {
  daysOfWeek: number[];   // [0..6]; 0=Sun,1=Mon,...,6=Sat; empty = all days
  startTime: string;      // 'HH:MM' 24h
  endTime: string;        // 'HH:MM' 24h
  validFrom?: string;     // 'YYYY-MM-DD' optional
  validUntil?: string;    // 'YYYY-MM-DD' optional
  timezone: string;       // IANA e.g. 'Australia/Sydney'
}

export interface Grant {
  id: string;
  name: string;
  description: string;
  scope: GrantScope;
  targetId?: string;
  actions: ActionType[];
  applicationMode: 'assigned' | 'conditional' | 'auto';
  conditions: Rule[];
  conditionLogic: 'AND' | 'OR';
  customAttributes: Record<string, string>;
  schedule: Schedule | null;
}

export type SiteStatus = 'Armed' | 'Disarmed' | 'PartialArm' | 'Alarm' | 'Lockdown';

export interface Site {
  id: string;
  name: string;
  address: string;
  timezone: string;
  status: SiteStatus;
  assignedManagerIds: string[];
  zones: string[];
  customAttributes: Record<string, string>;
}

export type ZoneType = 'Perimeter' | 'Interior' | 'Secure' | 'Public' | 'Emergency';
export type ZoneStatus = 'Armed' | 'Disarmed' | 'Alarm';

export interface Zone {
  id: string;
  siteId: string;
  name: string;
  type: ZoneType;
  status: ZoneStatus;
  doorIds: string[];
  cameraIds?: string[];
  customAttributes: Record<string, string>;
}

export type LockState = 'Locked' | 'Unlocked' | 'Forced' | 'Held';

export interface Door {
  id: string;
  name: string;
  location: string;
  siteId: string;
  zoneId: string;
  controllerId: string;
  description: string;
  lockState: LockState;
  customAttributes: Record<string, string>;
}

export interface Controller {
  id: string;
  name: string;
  location: string;
  siteId: string;
  doorIds: string[];
  customAttributes: Record<string, string>;
}

export type Operator = '==' | '!=' | '>=' | '<=' | 'IN' | 'NOT IN';

export interface Rule {
  id: string;
  leftSide: string;
  operator: Operator;
  rightSide: string | string[];
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  logicalOperator: 'AND' | 'OR';
  doorIds: string[];
  scheduleId?: string;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Open' | 'InProgress' | 'Blocked' | 'Complete' | 'Cancelled';
export type TaskCategory = 'Inspection' | 'Maintenance' | 'Incident' | 'Audit' | 'Training' | 'Other';

export interface TaskNote {
  id: string;
  text: string;
  authorId: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  siteId: string;
  zoneId?: string;
  assignedToUserId?: string;
  createdByUserId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  category: TaskCategory;
  notes: TaskNote[];
}

export interface RuleResult {
  ruleId: string;
  leftSide: string;
  operator: Operator;
  rightSide: string | string[];
  leftResolved: string;
  rightResolved: string;
  passed: boolean;
}

export interface PolicyResult {
  policyId: string;
  policyName: string;
  passed: boolean;
  ruleResults: RuleResult[];
}

export interface NowContext {
  hour: number;          // 0-23
  minute: number;        // 0-59
  dayOfWeek: string;     // 'Sun'|'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'
  dayOfWeekNum: number;  // 0=Sun ... 6=Sat
  date: string;          // 'YYYY-MM-DD'
  month: number;         // 1-12
}

export interface GrantResult {
  grantId: string;
  grantName: string;
  applicationMode: Grant['applicationMode'];
  scheduleActive: boolean | null;    // null if no schedule
  conditionsPassed: boolean | null;  // null if assigned with no conditions
  conditionResults: RuleResult[];
  included: boolean;
}

export interface AccessResult {
  permissionGranted: boolean;
  abacGranted: boolean;
  overallGranted: boolean;
  matchedPolicy?: string;
  matchedGrants: string[];
  policyResults: PolicyResult[];
  grantResults: GrantResult[];
  nowContext: NowContext;
}

export interface ArmingLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  siteName: string;
  result: 'Success' | 'Denied';
}

export interface NamedSchedule {
  id: string;
  name: string;
  description?: string;
  daysOfWeek: string[];      // e.g. ['Mon','Tue','Wed','Thu','Fri']
  startTime: string;         // '09:00'
  endTime: string;           // '17:00'
  validFrom?: string;        // ISO date string or undefined
  validUntil?: string;       // ISO date string or undefined
  timezone: string;
  color: string;             // hex for timeline rendering e.g. '#4ade80'
}

export interface StoreSnapshot {
  allUsers: User[];
  allDoors: Door[];
  allZones: Zone[];
  allSites: Site[];
  allControllers: Controller[];
  allGroups: Group[];
  allGrants: Grant[];
  allSchedules: NamedSchedule[];
}

// ── UI-only chip types (not persisted) ──────────────────────────────────────

export type ConditionChipType =
  | 'department'
  | 'status'
  | 'clearance'
  | 'role'
  | 'personType'
  | 'group';

export interface ConditionChip {
  id: string;
  chipType: ConditionChipType;
  /** Human label shown on chip, e.g. "Engineering", "Active", "Confidential+" */
  label: string;
  /** Rule.leftSide value, e.g. "user.department" */
  attribute: string;
  operator: Operator;
  /** Rule.rightSide value, e.g. "Engineering" */
  value: string;
}

export interface TimeWindow {
  id: string;
  /** e.g. ['Mon','Tue','Wed','Thu','Fri'] — empty means every day */
  days: string[];
  startTime: string; // 'HH:MM' 24h
  endTime: string;   // 'HH:MM' 24h
}
