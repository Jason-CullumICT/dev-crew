export type ClearanceLevel = 'Unclassified' | 'Confidential' | 'Secret' | 'TopSecret';

export const CLEARANCE_HIERARCHY: Record<ClearanceLevel, number> = {
  'Unclassified': 0,
  'Confidential': 1,
  'Secret': 2,
  'TopSecret': 3
};

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  clearanceLevel: ClearanceLevel;
  customAttributes: Record<string, string>;
}

export interface Door {
  id: string;
  name: string;
  location: string;
  controllerId: string;
  description: string;
}

export interface Controller {
  id: string;
  name: string;
  location: string;
  doorIds: string[];
}

export type Operator = '==' | '!=' | '>=' | '<=' | 'IN' | 'NOT IN';

export interface Rule {
  id: string;
  attribute: string; // e.g. "user.department", "user.clearanceLevel", "user.customAttributes.key"
  operator: Operator;
  value: string | string[];
}

export type LogicalOperator = 'AND' | 'OR';

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  logicalOperator: LogicalOperator;
  doorIds: string[];
}

export interface RuleResult {
  attribute: string;
  operator: Operator;
  value: string | string[];
  actualValue: string | null;
  passed: boolean;
  reason: string;
}

export interface PolicyResult {
  policyId: string;
  policyName: string;
  passed: boolean;
  ruleResults: RuleResult[];
}

export interface AccessResult {
  granted: boolean;
  matchedPolicy?: string;
  policyResults: PolicyResult[];
}

export interface DashboardStats {
  userCount: number;
  doorCount: number;
  controllerCount: number;
  policyCount: number;
}

export interface AccessTestLog {
  id: string;
  timestamp: string;
  userName: string;
  doorName: string;
  granted: boolean;
}
