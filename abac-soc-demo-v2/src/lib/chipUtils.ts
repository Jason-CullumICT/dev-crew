import { v4 as uuidv4 } from 'uuid';
import type { ConditionChip, TimeWindow, Rule } from '../types';

// ── Chip → Rule ──────────────────────────────────────────────────────────────

export function chipToRule(chip: ConditionChip): Rule {
  return {
    id: chip.id,
    leftSide: chip.attribute,
    operator: chip.operator,
    rightSide: chip.value,
  };
}

export function timeWindowToRules(tw: TimeWindow): Rule[] {
  const rules: Rule[] = [];
  if (tw.days.length > 0) {
    rules.push({ id: uuidv4(), leftSide: 'now.dayOfWeek', operator: 'IN', rightSide: tw.days.join(', ') });
  }
  if (tw.startTime) {
    rules.push({ id: uuidv4(), leftSide: 'now.hour', operator: '>=', rightSide: String(parseInt(tw.startTime.split(':')[0], 10)) });
  }
  if (tw.endTime) {
    rules.push({ id: uuidv4(), leftSide: 'now.hour', operator: '<', rightSide: String(parseInt(tw.endTime.split(':')[0], 10)) });
  }
  return rules;
}

// ── Rule → Chip (reverse parse for edit mode) ────────────────────────────────

export function rulesToConditionChips(rules: Rule[]): ConditionChip[] {
  const chips: ConditionChip[] = [];
  for (const rule of rules) {
    const v = Array.isArray(rule.rightSide) ? rule.rightSide[0] : rule.rightSide;
    if (rule.leftSide === 'user.department' && rule.operator === '==') {
      chips.push({ id: rule.id, chipType: 'department', label: v, attribute: 'user.department', operator: '==', value: v });
    } else if (rule.leftSide === 'user.status' && rule.operator === '==') {
      chips.push({ id: rule.id, chipType: 'status', label: v, attribute: 'user.status', operator: '==', value: v });
    } else if (rule.leftSide === 'user.clearanceLevel') {
      chips.push({ id: rule.id, chipType: 'clearance', label: rule.operator === '>=' ? `${v}+` : v, attribute: 'user.clearanceLevel', operator: rule.operator, value: v });
    } else if (rule.leftSide === 'user.role' && rule.operator === '==') {
      chips.push({ id: rule.id, chipType: 'role', label: v, attribute: 'user.role', operator: '==', value: v });
    } else if (rule.leftSide === 'user.type' && rule.operator === '==') {
      chips.push({ id: rule.id, chipType: 'personType', label: v, attribute: 'user.type', operator: '==', value: v });
    } else if (rule.leftSide === 'user' && rule.operator === 'IN') {
      const groupName = v.replace('group.', '');
      chips.push({ id: rule.id, chipType: 'group', label: groupName, attribute: 'user', operator: 'IN', value: v });
    }
    // now.* rules handled by rulesToTimeWindows — skip here
  }
  return chips;
}

export function rulesToTimeWindows(rules: Rule[]): TimeWindow[] {
  const dayRule   = rules.find(r => r.leftSide === 'now.dayOfWeek' && r.operator === 'IN');
  const startRule = rules.find(r => r.leftSide === 'now.hour' && r.operator === '>=');
  const endRule   = rules.find(r => r.leftSide === 'now.hour' && r.operator === '<');
  if (!dayRule && !startRule && !endRule) return [];
  return [{
    // id derived from rule ids for stable React key across re-renders
    id: startRule?.id ?? dayRule?.id ?? endRule?.id ?? uuidv4(),
    days: dayRule ? String(dayRule.rightSide).split(', ') : [],
    startTime: startRule ? String(startRule.rightSide).padStart(2, '0') + ':00' : '00:00',
    endTime:   endRule   ? String(endRule.rightSide).padStart(2, '0') + ':00'   : '23:59',
  }];
}

// ── Chip colour classes (Tailwind) ────────────────────────────────────────────

export const CHIP_COLORS: Record<string, string> = {
  department: 'bg-indigo-900 text-indigo-300',
  status:     'bg-green-900 text-green-300',
  clearance:  'bg-violet-900 text-violet-300',
  role:       'bg-indigo-900 text-indigo-300',
  personType: 'bg-indigo-900 text-indigo-300',
  group:      'bg-slate-700 text-slate-300',
  time:       'bg-amber-900 text-amber-300',
  door:       'bg-emerald-900 text-emerald-300',
};
