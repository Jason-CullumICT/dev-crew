import { v4 as uuidv4 } from 'uuid'
import type { Rule } from '../types'

const ATTRIBUTES = ['department', 'role', 'clearanceLevel', 'type', 'status']
const OPERATORS: Rule['operator'][] = ['==', '!=', '>=', '<=', '>', '<', 'IN', 'NOT_IN']

interface RuleBuilderProps {
  rules: Rule[]
  logic: 'AND' | 'OR'
  onChange: (rules: Rule[], logic: 'AND' | 'OR') => void
  extraAttributes?: string[]
}

export default function RuleBuilder({ rules, logic, onChange, extraAttributes = [] }: RuleBuilderProps) {
  const allAttributes = [...ATTRIBUTES, ...extraAttributes.filter(a => !ATTRIBUTES.includes(a))]

  function updateRule(id: string, patch: Partial<Rule>) {
    onChange(rules.map(r => r.id === id ? { ...r, ...patch } : r), logic)
  }

  function removeRule(id: string) {
    onChange(rules.filter(r => r.id !== id), logic)
  }

  function addRule() {
    onChange([...rules, { id: uuidv4(), leftSide: 'department', operator: '==', rightSide: '' }], logic)
  }

  return (
    <div className="space-y-2">
      {/* AND/OR toggle — only shown when more than one rule */}
      {rules.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] text-slate-500">Match:</span>
          <div className="flex rounded overflow-hidden border border-[#1e293b]">
            {(['AND', 'OR'] as const).map(op => (
              <button
                key={op}
                onClick={() => onChange(rules, op)}
                className={`px-3 py-1 text-[9px] font-semibold transition-colors ${
                  logic === op
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#111827] text-slate-500 hover:text-slate-300'
                }`}
              >
                {op === 'AND' ? 'ALL (AND)' : 'ANY (OR)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rule rows — always visible, no expand/collapse */}
      {rules.map(rule => (
        <div key={rule.id} className="flex gap-2 items-center bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2">
          <select
            value={rule.leftSide}
            onChange={e => updateRule(rule.id, { leftSide: e.target.value })}
            className="bg-[#080b12] border border-[#2d3148] rounded px-2 py-1 text-[10px] text-indigo-400 flex-1 focus:outline-none focus:border-indigo-500"
          >
            {allAttributes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={rule.operator}
            onChange={e => updateRule(rule.id, { operator: e.target.value as Rule['operator'] })}
            className="bg-[#080b12] border border-[#2d3148] rounded px-2 py-1 text-[10px] text-slate-400 w-[76px] focus:outline-none focus:border-indigo-500"
          >
            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>

          <input
            value={Array.isArray(rule.rightSide) ? rule.rightSide.join(', ') : rule.rightSide}
            onChange={e => {
              const val = e.target.value
              const isMulti = rule.operator === 'IN' || rule.operator === 'NOT_IN'
              updateRule(rule.id, {
                rightSide: isMulti ? val.split(',').map(s => s.trim()).filter(Boolean) : val,
              })
            }}
            placeholder={rule.operator === 'IN' || rule.operator === 'NOT_IN' ? 'val1, val2' : 'value'}
            className="bg-[#080b12] border border-[#2d3148] rounded px-2 py-1 text-[10px] text-emerald-400 flex-1 focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={() => removeRule(rule.id)}
            className="text-slate-600 hover:text-red-400 text-sm shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add rule */}
      <button
        onClick={addRule}
        className="w-full border border-dashed border-[#1e293b] rounded-lg py-2 text-[10px] text-slate-600 hover:text-slate-400 hover:border-[#2d3148] transition-colors"
      >
        + Add rule
      </button>
    </div>
  )
}
