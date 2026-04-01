export type ClearanceLevel = 'Unclassified' | 'Confidential' | 'Secret' | 'TopSecret';
export const CLEARANCE_RANK: Record<ClearanceLevel, number> = {
  Unclassified: 0,
  Confidential: 1,
  Secret: 2,
  TopSecret: 3,
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
  grantedPermissions: string[]; // grant IDs
  groupIds: string[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberUserIds: string[];
  inheritedPermissions: string[]; // grant IDs
}

export type GrantScope = 'global' | 'site' | 'zone';

export type ActionType =
  | 'arm'
  | 'disarm'
  | 'unlock'
  | 'lockdown'
  | 'view_logs'
  | 'manage_users'
  | 'manage_tasks'
  | 'override';

export interface Grant {
  id: string;
  name: string;
  description: string;
  scope: GrantScope;
  targetId?: string;
  actions: ActionType[];
}

export type SiteStatus = 'Armed' | 'Disarmed' | 'PartialArm' | 'Alarm' | 'Lockdown';

export interface Site {
  id: string;
  name: string;
  address: string;
  timezone: string;
  status: SiteStatus;
  assignedManagerIds: string[];
  zones: string[]; // zone IDs
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
}

export interface Controller {
  id: string;
  name: string;
  location: string;
  siteId: string;
  doorIds: string[];
}

export type Operator = '==' | '!=' | '>=' | '<=' | 'IN' | 'NOT IN';

export interface Rule {
  id: string;
  attribute: string;
  operator: Operator;
  value: string | string[];
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  logicalOperator: 'AND' | 'OR';
  doorIds: string[];
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

export interface PolicyResult {
  policyId: string;
  policyName: string;
  passed: boolean;
  ruleResults: { ruleId: string; attribute: string; operator: Operator; value: string | string[]; actual: string; passed: boolean }[];
}

export interface AccessResult {
  permissionGranted: boolean;
  abacGranted: boolean;
  overallGranted: boolean;
  matchedPolicy?: string;
  matchedGrants: string[];
  policyResults: PolicyResult[];
}

export interface ArmingLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  siteName: string;
  result: 'Success' | 'Denied';
}
