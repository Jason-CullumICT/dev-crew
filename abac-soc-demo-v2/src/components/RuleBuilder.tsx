import { useState } from 'react';
import { useStore } from '../store/store';
import type { Rule, Operator } from '../types';

const OPERATORS: Operator[] = ['==', '!=', '>=', '<=', 'IN', 'NOT IN'];

const BARE_ENTITY_TYPES = ['user', 'door', 'zone', 'site'] as const;
type BareEntityType = typeof BARE_ENTITY_TYPES[number];

const LEFT_SIDE_SUGGESTIONS = [
  'user.clearanceLevel',
  'user.department',
  'user.role',
  'user.status',
  'door.securityLevel',
  'door.lockState',
  'zone.type',
  'zone.status',
  'site.status',
  'now.hour',
  'now.minute',
  'now.dayOfWeek',
  'now.dayOfWeekNum',
  'now.date',
  'now.month',
  'grant.name',
  'grant.scope',
  'grant.applicationMode',
  'user',
  'door',
  'zone',
  'site',
];

const ATTRIBUTE_VALUE_SUGGESTIONS = [
  'Secret',
  'TopSecret',
  'Confidential',
  'Unclassified',
  'Active',
  'Suspended',
  'High',
  'Low',
  'Locked',
  'Unlocked',
];

function isBareEntityType(value: string): value is BareEntityType {
  return (BARE_ENTITY_TYPES as readonly string[]).includes(value);
}

function isMembershipOperator(op: Operator): boolean {
  return op === 'IN' || op === 'NOT IN';
}

interface RuleRowProps {
  rule: Rule;
  groupNames: string[];
  onUpdate: (field: 'leftSide' | 'operator' | 'rightSide', value: string) => void;
  onDelete: () => void;
}

function RuleRow({ rule, groupNames, onUpdate, onDelete }: RuleRowProps) {
  const [leftFocused, setLeftFocused] = useState(false);
  const [rightFocused, setRightFocused] = useState(false);

  const showMembershipHints =
    isBareEntityType(rule.leftSide) && isMembershipOperator(rule.operator);

  const rightSideHints: string[] = showMembershipHints
    ? groupNames.map((name) => `group.${name}`)
    : ATTRIBUTE_VALUE_SUGGESTIONS;

  const leftHintsVisible = leftFocused;
  const rightHintsVisible = rightFocused;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        {/* Left side */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={typeof rule.leftSide === 'string' ? rule.leftSide : ''}
            onChange={(e) => onUpdate('leftSide', e.target.value)}
            onFocus={() => setLeftFocused(true)}
            onBlur={() => setTimeout(() => setLeftFocused(false), 150)}
            placeholder="entity.attribute"
            className="w-full bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Operator */}
        <select
          value={rule.operator}
          onChange={(e) => onUpdate('operator', e.target.value as Operator)}
          className="bg-slate-700 border border-slate-600 text-slate-100 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 shrink-0"
        >
          {OPERATORS.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        {/* Right side */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={
              Array.isArray(rule.rightSide)
                ? rule.rightSide.join(', ')
                : rule.rightSide
            }
            onChange={(e) => onUpdate('rightSide', e.target.value)}
            onFocus={() => setRightFocused(true)}
            onBlur={() => setTimeout(() => setRightFocused(false), 150)}
            placeholder={
              isMembershipOperator(rule.operator)
                ? 'group.GroupName or comma-separated'
                : 'value or entity.attribute'
            }
            className="w-full bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="text-slate-500 hover:text-red-400 text-sm leading-none shrink-0 px-1"
          title="Remove rule"
          type="button"
        >
          ×
        </button>
      </div>

      {/* Left side hints */}
      {leftHintsVisible && (
        <ul className="flex flex-wrap gap-1 mt-0.5">
          {LEFT_SIDE_SUGGESTIONS.map((hint) => (
            <li key={hint}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onUpdate('leftSide', hint);
                }}
                className="text-slate-500 hover:text-slate-300 text-xs font-mono bg-slate-900 rounded px-1.5 py-0.5 transition-colors"
              >
                {hint}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Right side hints */}
      {rightHintsVisible && rightSideHints.length > 0 && (
        <ul className="flex flex-wrap gap-1 mt-0.5">
          {rightSideHints.map((hint) => (
            <li key={hint}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onUpdate('rightSide', hint);
                }}
                className="text-slate-500 hover:text-slate-300 text-xs font-mono bg-slate-900 rounded px-1.5 py-0.5 transition-colors"
              >
                {hint}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface RuleBuilderProps {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

export default function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  const groups = useStore((s) => s.groups);
  const groupNames = groups.map((g) => g.name);

  const addRule = () => {
    const newRule: Rule = {
      id: crypto.randomUUID(),
      leftSide: '',
      operator: '==',
      rightSide: '',
    };
    onChange([...rules, newRule]);
  };

  const updateRule = (
    ruleId: string,
    field: 'leftSide' | 'operator' | 'rightSide',
    value: string,
  ) => {
    onChange(
      rules.map((r) =>
        r.id === ruleId ? { ...r, [field]: value as Rule[typeof field] } : r,
      ),
    );
  };

  const deleteRule = (ruleId: string) => {
    onChange(rules.filter((r) => r.id !== ruleId));
  };

  return (
    <div className="space-y-2">
      {rules.length === 0 && (
        <p className="text-xs text-slate-600 italic">No rules added yet.</p>
      )}

      {rules.map((rule) => (
        <RuleRow
          key={rule.id}
          rule={rule}
          groupNames={groupNames}
          onUpdate={(field, value) => updateRule(rule.id, field, value)}
          onDelete={() => deleteRule(rule.id)}
        />
      ))}

      <button
        type="button"
        onClick={addRule}
        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
      >
        + Add Rule
      </button>
    </div>
  );
}
