# ABAC Groups & Policies UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw-rule UI on Groups and Policies pages with a chip-based sentence builder (Groups) and colour-coded lane builder (Policies), wired to the real Zustand store.

**Architecture:** Two new shared components handle chip display/editing (`ConditionChips`, `TimeWindowChips`). Groups.tsx and Policies.tsx are fully rewritten to use these components. Demo seed data is appended to `generateRealWorldData()` so the store is pre-populated with 3 Groups (with Grants) and 3 Policies that cross-reference each other.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Vite (`cd abac-soc-demo-v2 && npm run dev` to preview, opens on `http://localhost:5173`)

**Spec:** `docs/superpowers/specs/2026-04-08-abac-groups-policies-ux-design.md`

---

## Shared types used across all tasks

Add these to `src/types/index.ts` at the very end — they are local UI types only and do not change the store shape:

```typescript
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
```

---

## Shared utility functions

These go in `src/lib/chipUtils.ts` (new file). Reference this file in every task that needs chip↔rule conversion.

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { ConditionChip, TimeWindow, Rule } from '../types';

// ── Chip → Rule ──────────────────────────────────────────────────────────────

export function chipToRule(chip: ConditionChip): Rule {
  return {
    id: uuidv4(),
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
    rules.push({ id: uuidv4(), leftSide: 'now.hour', operator: '>=', rightSide: String(parseInt(tw.startTime)) });
  }
  if (tw.endTime) {
    rules.push({ id: uuidv4(), leftSide: 'now.hour', operator: '<', rightSide: String(parseInt(tw.endTime)) });
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
    // now.* rules are parsed separately by rulesToTimeWindows — skip them here
  }
  return chips;
}

export function rulesToTimeWindows(rules: Rule[]): TimeWindow[] {
  const dayRule = rules.find(r => r.leftSide === 'now.dayOfWeek' && r.operator === 'IN');
  const startRule = rules.find(r => r.leftSide === 'now.hour' && r.operator === '>=');
  const endRule = rules.find(r => r.leftSide === 'now.hour' && r.operator === '<');
  if (!dayRule && !startRule && !endRule) return [];
  return [{
    id: uuidv4(),
    days: dayRule ? String(dayRule.rightSide).split(', ') : [],
    startTime: startRule ? String(startRule.rightSide).padStart(2, '0') + ':00' : '00:00',
    endTime: endRule ? String(endRule.rightSide).padStart(2, '0') + ':00' : '23:59',
  }];
}

// ── Chip colour classes ───────────────────────────────────────────────────────

export const CHIP_COLORS: Record<string, string> = {
  department: 'bg-indigo-900 text-indigo-300',
  status:     'bg-green-900 text-green-300',
  clearance:  'bg-violet-900 text-violet-300',
  role:       'bg-sky-900 text-sky-300',
  personType: 'bg-indigo-900 text-indigo-300',
  group:      'bg-slate-700 text-slate-300',
  time:       'bg-amber-900 text-amber-300',
  door:       'bg-emerald-900 text-emerald-300',
};
```

---

## Task 1: Add shared types and utility file

**Files:**
- Modify: `abac-soc-demo-v2/src/types/index.ts` (append UI types)
- Create: `abac-soc-demo-v2/src/lib/chipUtils.ts`

- [ ] **Step 1: Append UI types to `src/types/index.ts`**

After the last line of the file, append:

```typescript
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
  label: string;
  attribute: string;
  operator: Operator;
  value: string;
}

export interface TimeWindow {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
}
```

- [ ] **Step 2: Create `src/lib/chipUtils.ts`**

Create the file with the full content from the "Shared utility functions" section above. This is the exact content — copy it verbatim.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd abac-soc-demo-v2 && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd abac-soc-demo-v2 && git add src/types/index.ts src/lib/chipUtils.ts
git commit -m "feat(abac-demo): add ConditionChip/TimeWindow types and chip↔rule utils"
```

---

## Task 2: Build `ConditionChips` component

A chip strip that displays existing condition chips and lets the user add new ones via a dropdown.

**Files:**
- Create: `abac-soc-demo-v2/src/components/ConditionChips.tsx`

- [ ] **Step 1: Create `src/components/ConditionChips.tsx`**

```tsx
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { ConditionChip, ConditionChipType } from '../types';
import { CHIP_COLORS } from '../lib/chipUtils';

// ── Picker option definitions ────────────────────────────────────────────────

interface PickerOption {
  chipType: ConditionChipType;
  label: string;
  attribute: string;
  operator: 'ConditionChip["operator"]';
  values?: string[];          // fixed options
  freeText?: boolean;         // allow typing a value
  groupPicker?: boolean;      // show group name list
}

const BASE_OPTIONS: Omit<PickerOption, 'operator'>[] & { operator: string }[] = [
  { chipType: 'department', label: 'Works in department', attribute: 'user.department', operator: '==',   freeText: true },
  { chipType: 'status',     label: 'Is status',          attribute: 'user.status',     operator: '==',   values: ['Active', 'Suspended', 'Pending'] },
  { chipType: 'clearance',  label: 'Has clearance (min)', attribute: 'user.clearanceLevel', operator: '>=', values: ['Unclassified', 'Confidential', 'Secret', 'TopSecret'] },
  { chipType: 'role',       label: 'Has role',           attribute: 'user.role',       operator: '==',   freeText: true },
  { chipType: 'personType', label: 'Is person type',     attribute: 'user.type',       operator: '==',   values: ['Employee', 'Contractor', 'Visitor', 'Vendor'] },
  { chipType: 'group',      label: 'Is in group',        attribute: 'user',            operator: 'IN',   groupPicker: true },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface ConditionChipsProps {
  chips: ConditionChip[];
  onChange: (chips: ConditionChip[]) => void;
  /** If true, shows the group picker option (used in Policies People lane) */
  allowGroupRef?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ConditionChips({ chips, onChange, allowGroupRef = false }: ConditionChipsProps) {
  const groups = useStore(s => s.groups);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<typeof BASE_OPTIONS[0] | null>(null);
  const [inputValue, setInputValue] = useState('');

  const visibleOptions = allowGroupRef
    ? BASE_OPTIONS
    : BASE_OPTIONS.filter(o => o.chipType !== 'group');

  function removeChip(id: string) {
    onChange(chips.filter(c => c.id !== id));
  }

  function commitChip(option: typeof BASE_OPTIONS[0], value: string) {
    if (!value.trim()) return;
    const isGroup = option.chipType === 'group';
    const rawValue = isGroup ? `group.${value}` : value;
    const labelStr = isGroup
      ? value
      : option.operator === '>='
        ? `${value}+`
        : value;
    const chip: ConditionChip = {
      id: uuidv4(),
      chipType: option.chipType as ConditionChipType,
      label: labelStr,
      attribute: option.attribute,
      operator: option.operator as ConditionChip['operator'],
      value: rawValue,
    };
    onChange([...chips, chip]);
    setSelectedOption(null);
    setInputValue('');
    setPickerOpen(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Existing chips */}
      {chips.map(chip => (
        <span
          key={chip.id}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${CHIP_COLORS[chip.chipType] ?? 'bg-slate-700 text-slate-300'}`}
        >
          {chip.label}
          <button
            type="button"
            onClick={() => removeChip(chip.id)}
            className="ml-0.5 opacity-60 hover:opacity-100 leading-none"
          >
            ×
          </button>
        </span>
      ))}

      {/* Add picker */}
      <div className="relative">
        {!pickerOpen && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors px-1"
          >
            + add condition
          </button>
        )}

        {pickerOpen && !selectedOption && (
          <div className="absolute left-0 top-6 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-56 py-1">
            {visibleOptions.map(opt => (
              <button
                key={opt.chipType}
                type="button"
                onClick={() => setSelectedOption(opt)}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {opt.label}
              </button>
            ))}
            <div className="border-t border-slate-700 mt-1 pt-1">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {pickerOpen && selectedOption && (
          <div className="absolute left-0 top-6 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-56 p-3 space-y-2">
            <p className="text-xs text-slate-400">{selectedOption.label}</p>

            {selectedOption.values && (
              <div className="space-y-1">
                {selectedOption.values.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => commitChip(selectedOption, v)}
                    className="w-full text-left px-2 py-1.5 text-xs text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {selectedOption.freeText && (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitChip(selectedOption, inputValue)}
                  placeholder="Type value..."
                  className="flex-1 bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => commitChip(selectedOption, inputValue)}
                  className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500 transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            {selectedOption.groupPicker && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {groups.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No groups yet.</p>
                )}
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => commitChip(selectedOption, g.name)}
                    className="w-full text-left px-2 py-1.5 text-xs text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setSelectedOption(null); setInputValue(''); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd abac-soc-demo-v2 && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd abac-soc-demo-v2 && git add src/components/ConditionChips.tsx
git commit -m "feat(abac-demo): add ConditionChips component with attribute/group pickers"
```

---

## Task 3: Build `TimeWindowChips` component

Amber chip builder for day + time range windows.

**Files:**
- Create: `abac-soc-demo-v2/src/components/TimeWindowChips.tsx`

- [ ] **Step 1: Create `src/components/TimeWindowChips.tsx`**

```tsx
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TimeWindow } from '../types';
import { CHIP_COLORS } from '../lib/chipUtils';

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRESETS: { label: string; days: string[]; startTime: string; endTime: string }[] = [
  { label: 'Business Hours (Mon–Fri 08–18)', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:00', endTime: '18:00' },
  { label: 'Night Shift (Mon–Fri 20–06)',    days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '20:00', endTime: '06:00' },
  { label: 'Weekend',                         days: ['Sat','Sun'],                  startTime: '00:00', endTime: '23:59' },
  { label: 'Always (24/7)',                   days: [],                             startTime: '00:00', endTime: '23:59' },
];

interface TimeWindowChipsProps {
  windows: TimeWindow[];
  onChange: (windows: TimeWindow[]) => void;
}

function chipLabel(tw: TimeWindow): string {
  const dayPart = tw.days.length === 0
    ? 'Every day'
    : tw.days.length === 7
      ? 'Every day'
      : tw.days.join('–');
  const timePart = tw.startTime === '00:00' && tw.endTime === '23:59'
    ? 'Always'
    : `${tw.startTime}–${tw.endTime}`;
  return timePart === 'Always' && dayPart === 'Every day' ? 'Always (24/7)' : `${dayPart} ${timePart}`;
}

export default function TimeWindowChips({ windows, onChange }: TimeWindowChipsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [draft, setDraft] = useState<Omit<TimeWindow, 'id'>>({ days: [], startTime: '08:00', endTime: '18:00' });

  function removeWindow(id: string) {
    onChange(windows.filter(w => w.id !== id));
  }

  function addPreset(preset: typeof PRESETS[0]) {
    onChange([...windows, { id: uuidv4(), ...preset }]);
    setPickerOpen(false);
  }

  function addCustom() {
    onChange([...windows, { id: uuidv4(), ...draft }]);
    setPickerOpen(false);
    setCustomMode(false);
    setDraft({ days: [], startTime: '08:00', endTime: '18:00' });
  }

  function toggleDay(day: string) {
    setDraft(d => ({
      ...d,
      days: d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day],
    }));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {windows.map(tw => (
        <span
          key={tw.id}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${CHIP_COLORS.time}`}
        >
          {chipLabel(tw)}
          <button type="button" onClick={() => removeWindow(tw.id)} className="ml-0.5 opacity-60 hover:opacity-100 leading-none">×</button>
        </span>
      ))}

      <div className="relative">
        {!pickerOpen && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors px-1"
          >
            + add time window
          </button>
        )}

        {pickerOpen && !customMode && (
          <div className="absolute left-0 top-6 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-64 py-1">
            {PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => addPreset(p)}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-slate-700 mt-1 pt-1">
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-slate-700 transition-colors"
              >
                Custom...
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {pickerOpen && customMode && (
          <div className="absolute left-0 top-6 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-64 p-3 space-y-3">
            <p className="text-xs text-slate-400 font-medium">Custom time window</p>

            <div>
              <p className="text-xs text-slate-500 mb-1">Days</p>
              <div className="flex flex-wrap gap-1">
                {DAY_OPTIONS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      draft.days.includes(day)
                        ? 'bg-amber-800 text-amber-200'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Start</p>
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={e => setDraft(d => ({ ...d, startTime: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">End</p>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={e => setDraft(d => ({ ...d, endTime: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addCustom}
                className="flex-1 px-2 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setCustomMode(false); }}
                className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
              >
                ← back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd abac-soc-demo-v2 && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd abac-soc-demo-v2 && git add src/components/TimeWindowChips.tsx
git commit -m "feat(abac-demo): add TimeWindowChips component with presets and custom builder"
```

---

## Task 4: Rewrite `Groups.tsx`

Full replacement. The card list uses sentence chips. The modal uses `ConditionChips` + `TimeWindowChips`. The `RuleBuilder` is removed from this page entirely.

**Files:**
- Modify: `abac-soc-demo-v2/src/pages/Groups.tsx` (full rewrite)

- [ ] **Step 1: Replace `src/pages/Groups.tsx` with the following**

```tsx
import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Group, GroupMember, ConditionChip, TimeWindow } from '../types';
import ConditionChips from '../components/ConditionChips';
import TimeWindowChips from '../components/TimeWindowChips';
import {
  chipToRule,
  timeWindowToRules,
  rulesToConditionChips,
  rulesToTimeWindows,
  CHIP_COLORS,
} from '../lib/chipUtils';

// ── Badge helpers ────────────────────────────────────────────────────────────

function membershipBadges(group: Group): string[] {
  const badges: string[] = [];
  const hasDynamic = group.membershipRules.some(r => !r.leftSide.startsWith('now.'));
  const hasTime    = group.membershipRules.some(r => r.leftSide.startsWith('now.'));
  const hasExplicit = group.membershipType === 'explicit' || group.membershipType === 'hybrid';
  if (hasDynamic || group.membershipType === 'dynamic') badges.push('auto-enrolled');
  if (hasExplicit && group.membershipType !== 'dynamic') badges.push('hand-picked');
  if (hasTime) badges.push('time-gated');
  return badges;
}

const BADGE_COLORS: Record<string, string> = {
  'auto-enrolled': 'bg-indigo-900 text-indigo-300',
  'hand-picked':   'bg-slate-700 text-slate-300',
  'time-gated':    'bg-amber-900 text-amber-300',
};

// ── Modal draft ──────────────────────────────────────────────────────────────

interface GroupDraft {
  id: string;
  name: string;
  description: string;
  conditionChips: ConditionChip[];
  timeWindows: TimeWindow[];
  members: GroupMember[];
  memberSearch: string;
  inheritedPermissions: string[];
}

function emptyDraft(): GroupDraft {
  return { id: '', name: '', description: '', conditionChips: [], timeWindows: [], members: [], memberSearch: '', inheritedPermissions: [] };
}

function groupToDraft(g: Group): GroupDraft {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    conditionChips: rulesToConditionChips(g.membershipRules),
    timeWindows: rulesToTimeWindows(g.membershipRules),
    members: [...g.members],
    memberSearch: '',
    inheritedPermissions: [...g.inheritedPermissions],
  };
}

function draftToGroup(draft: GroupDraft, existing?: Group): Group {
  const conditionRules = draft.conditionChips.map(chipToRule);
  const timeRules = draft.timeWindows.flatMap(timeWindowToRules);
  const membershipRules = [...conditionRules, ...timeRules];

  const hasConditions = conditionRules.length > 0;
  const hasExplicit   = draft.members.length > 0;
  const membershipType: Group['membershipType'] =
    hasConditions && hasExplicit ? 'hybrid' :
    hasConditions                ? 'dynamic' :
                                   'explicit';

  return {
    ...(existing ?? {}),
    id: draft.id || uuidv4(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    members: draft.members,
    membershipRules,
    membershipLogic: 'AND',
    membershipType,
    targetEntityType: 'user',
    inheritedPermissions: draft.inheritedPermissions,
  } as Group;
}

// ── Sentence chip row (read-only display) ────────────────────────────────────

function SentenceRow({ group }: { group: Group }) {
  const chips = useMemo(() => rulesToConditionChips(group.membershipRules), [group.membershipRules]);
  const timeWindows = useMemo(() => rulesToTimeWindows(group.membershipRules), [group.membershipRules]);

  if (chips.length === 0 && timeWindows.length === 0 && group.members.length === 0) {
    return <span className="text-slate-600 text-xs italic">No conditions defined</span>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs">
      {chips.length > 0 && <span className="text-slate-500">People who are</span>}
      {chips.map((chip, i) => (
        <span key={chip.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-600 font-semibold">and</span>}
          <span className={`px-2 py-0.5 rounded-full font-medium ${CHIP_COLORS[chip.chipType] ?? 'bg-slate-700 text-slate-300'}`}>
            {chip.label}
          </span>
        </span>
      ))}
      {timeWindows.map(tw => {
        const dayPart = tw.days.length === 0 ? '' : tw.days.join('–');
        const timePart = `${tw.startTime}–${tw.endTime}`;
        return (
          <span key={tw.id} className="flex items-center gap-1">
            <span className="text-slate-500">during</span>
            {dayPart && <span className={`px-2 py-0.5 rounded-full font-medium ${CHIP_COLORS.time}`}>{dayPart}</span>}
            <span className={`px-2 py-0.5 rounded-full font-medium ${CHIP_COLORS.time}`}>{timePart}</span>
          </span>
        );
      })}
      {group.membershipType !== 'dynamic' && group.members.length > 0 && chips.length > 0 && (
        <span className="text-slate-500">+ {group.members.length} explicit</span>
      )}
      {group.membershipType === 'explicit' && group.members.length > 0 && (
        <span className="text-slate-500">{group.members.length} hand-picked member{group.members.length !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Groups() {
  const users        = useStore(s => s.users);
  const groups       = useStore(s => s.groups);
  const grants       = useStore(s => s.grants);
  const addGroup     = useStore(s => s.addGroup);
  const updateGroup  = useStore(s => s.updateGroup);
  const deleteGroup  = useStore(s => s.deleteGroup);
  const updateUser   = useStore(s => s.updateUser);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [draft, setDraft] = useState<GroupDraft>(emptyDraft());

  // ── Member sync ────────────────────────────────────────────────────────────

  function syncUserGroupIds(groupId: string, oldMembers: GroupMember[], newMembers: GroupMember[]) {
    const liveUsers = useStore.getState().users;
    const oldIds = oldMembers.filter(m => m.entityType === 'user').map(m => m.entityId);
    const newIds = newMembers.filter(m => m.entityType === 'user').map(m => m.entityId);
    newIds.filter(id => !oldIds.includes(id)).forEach(userId => {
      const u = liveUsers.find(u => u.id === userId);
      if (u && !u.groupIds.includes(groupId)) updateUser({ ...u, groupIds: [...u.groupIds, groupId] });
    });
    oldIds.filter(id => !newIds.includes(id)).forEach(userId => {
      const u = liveUsers.find(u => u.id === userId);
      if (u) updateUser({ ...u, groupIds: u.groupIds.filter(gid => gid !== groupId) });
    });
  }

  // ── Modal handlers ─────────────────────────────────────────────────────────

  function openAdd()      { setEditingGroup(null); setDraft(emptyDraft()); setModalOpen(true); }
  function openEdit(g: Group) { setEditingGroup(g); setDraft(groupToDraft(g)); setModalOpen(true); }
  function closeModal()   { setModalOpen(false); setEditingGroup(null); setDraft(emptyDraft()); }

  function handleSave() {
    if (!draft.name.trim()) return;
    const group = draftToGroup(draft, editingGroup ?? undefined);
    if (editingGroup) {
      updateGroup(group);
      syncUserGroupIds(group.id, editingGroup.members, draft.members);
    } else {
      addGroup(group);
      syncUserGroupIds(group.id, [], draft.members);
    }
    closeModal();
  }

  function handleDelete(g: Group) {
    syncUserGroupIds(g.id, g.members, []);
    deleteGroup(g.id);
    if (expandedId === g.id) setExpandedId(null);
  }

  function toggleMember(userId: string) {
    const exists = draft.members.some(m => m.entityType === 'user' && m.entityId === userId);
    setDraft(d => ({
      ...d,
      members: exists
        ? d.members.filter(m => !(m.entityType === 'user' && m.entityId === userId))
        : [...d.members, { entityType: 'user', entityId: userId }],
    }));
  }

  const filteredUsers = useMemo(() =>
    users.filter(u => u.name.toLowerCase().includes(draft.memberSearch.toLowerCase())),
    [users, draft.memberSearch],
  );

  const showExplicitPicker = draft.conditionChips.length === 0 || draft.members.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Groups</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          + New Group
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {groups.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-16">No groups yet. Create one to get started.</div>
        )}
        {groups.map(group => {
          const isExpanded = expandedId === group.id;
          const badges = membershipBadges(group);
          const grantCount = group.inheritedPermissions.length;

          return (
            <div key={group.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Card header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : group.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-white text-base">{group.name}</span>
                    {badges.map(badge => (
                      <span key={badge} className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[badge]}`}>
                        {badge}
                      </span>
                    ))}
                    {grantCount > 0 && (
                      <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        {grantCount} grant{grantCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <SentenceRow group={group} />
                  {group.description && (
                    <p className="text-slate-500 text-xs mt-1 truncate">{group.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(group); }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(group); }}
                    className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <span className="text-slate-500 text-sm ml-1">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-800 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Members</h3>
                    {group.membershipType === 'dynamic' ? (
                      <p className="text-gray-500 text-sm italic">Membership determined by conditions above</p>
                    ) : group.members.length === 0 ? (
                      <p className="text-gray-600 text-sm">No explicit members</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {group.members.map(m => {
                          const user = users.find(u => u.id === m.entityId);
                          return (
                            <li key={m.entityId} className="text-sm text-white flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                              {user?.name ?? m.entityId}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inherited Grants</h3>
                    {group.inheritedPermissions.length === 0 ? (
                      <p className="text-gray-600 text-sm">No grants</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {group.inheritedPermissions.map(gid => {
                          const grant = grants.find(g => g.id === gid);
                          return (
                            <li key={gid} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-sm text-white">{grant?.name ?? gid}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">{editingGroup ? 'Edit Group' : 'New Group'}</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Group Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Night Shift Security"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Description <span className="text-slate-600 normal-case">(optional)</span></label>
                <textarea
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="What is this group for?"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Who belongs? */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Who belongs in this group?</label>
                <p className="text-xs text-slate-600 mb-3">People who match all of these conditions are automatically enrolled.</p>
                <ConditionChips
                  chips={draft.conditionChips}
                  onChange={chips => setDraft(d => ({ ...d, conditionChips: chips }))}
                />
              </div>

              {/* When? */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">When are they active? <span className="text-slate-600 normal-case">(optional)</span></label>
                <p className="text-xs text-slate-600 mb-3">Leave empty for no time restriction.</p>
                <TimeWindowChips
                  windows={draft.timeWindows}
                  onChange={windows => setDraft(d => ({ ...d, timeWindows: windows }))}
                />
              </div>

              {/* Explicitly add people */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Also include specific people <span className="text-slate-600 normal-case">(optional)</span>
                </label>
                <p className="text-xs text-slate-600 mb-3">These people are always in the group regardless of the conditions above.</p>
                {showExplicitPicker && (
                  <>
                    <input
                      type="text"
                      value={draft.memberSearch}
                      onChange={e => setDraft(d => ({ ...d, memberSearch: e.target.value }))}
                      placeholder="Search people..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 mb-2"
                    />
                    <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-800">
                      {filteredUsers.map(user => {
                        const checked = draft.members.some(m => m.entityType === 'user' && m.entityId === user.id);
                        return (
                          <label key={user.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-800 transition-colors">
                            <input type="checkbox" checked={checked} onChange={() => toggleMember(user.id)} className="w-4 h-4 accent-indigo-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-slate-100 block">{user.name}</span>
                              <span className="text-xs text-slate-500">{user.department}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Inherited Grants */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Grants <span className="text-slate-600 normal-case">— what can people in this group do?</span>
                </label>
                <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-800">
                  {grants.length === 0 && (
                    <div className="px-3 py-3 text-slate-600 text-sm text-center">No grants available</div>
                  )}
                  {grants.map(grant => {
                    const checked = draft.inheritedPermissions.includes(grant.id);
                    return (
                      <label key={grant.id} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setDraft(d => ({
                            ...d,
                            inheritedPermissions: checked
                              ? d.inheritedPermissions.filter(id => id !== grant.id)
                              : [...d.inheritedPermissions, grant.id],
                          }))}
                          className="w-4 h-4 accent-emerald-500 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-100 block">{grant.name}</span>
                          <span className="text-xs text-slate-500 capitalize">{grant.scope} · {grant.actions.join(', ')}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button onClick={closeModal} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!draft.name.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd abac-soc-demo-v2 && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and verify visually**

```bash
cd abac-soc-demo-v2 && npm run dev
```

Navigate to `http://localhost:5173/groups`. Verify:
- Group cards show badge pills (auto-enrolled, time-gated, hand-picked)
- Sentence chip row renders for each group
- "+ New Group" opens modal with condition chip builder and time window builder
- Creating a group with conditions shows it on the card list

- [ ] **Step 4: Commit**

```bash
cd abac-soc-demo-v2 && git add src/pages/Groups.tsx
git commit -m "feat(abac-demo): rewrite Groups page with sentence-builder chip UX"
```

---

## Task 5: Rewrite `Policies.tsx`

Full replacement. Three colour-coded lanes (People/Time/Doors) replace the flat form and raw RuleBuilder.

**Files:**
- Modify: `abac-soc-demo-v2/src/pages/Policies.tsx` (full rewrite)

- [ ] **Step 1: Replace `src/pages/Policies.tsx` with the following**

```tsx
import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Policy, ConditionChip, TimeWindow } from '../types';
import ConditionChips from '../components/ConditionChips';
import TimeWindowChips from '../components/TimeWindowChips';
import {
  chipToRule,
  timeWindowToRules,
  rulesToConditionChips,
  rulesToTimeWindows,
  CHIP_COLORS,
} from '../lib/chipUtils';

// ── Lane display component ───────────────────────────────────────────────────

interface LaneProps {
  color: string;
  label: string;
  accentClass: string;
  children: React.ReactNode;
}

function Lane({ color, label, accentClass, children }: LaneProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-0.5 self-stretch rounded-full shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${accentClass}`}>{label}</p>
        <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
      </div>
    </div>
  );
}

// ── Policy card ──────────────────────────────────────────────────────────────

function PolicyCard({
  policy,
  onEdit,
  onDelete,
}: {
  policy: Policy;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const doors   = useStore(s => s.doors);
  const [expanded, setExpanded] = useState(false);

  const peopleChips = useMemo(() => rulesToConditionChips(policy.rules), [policy.rules]);
  const timeWindows = useMemo(() => rulesToTimeWindows(policy.rules), [policy.rules]);
  const assignedDoors = useMemo(() => doors.filter(d => policy.doorIds.includes(d.id)), [doors, policy.doorIds]);
  const isOverride = timeWindows.length === 0 && policy.doorIds.length > 5;

  function chipLabel(tw: TimeWindow) {
    const dayPart = tw.days.length === 0 ? 'Every day' : tw.days.join('–');
    const timePart = tw.startTime === '00:00' && tw.endTime === '23:59' ? 'Always' : `${tw.startTime}–${tw.endTime}`;
    return timePart === 'Always' && dayPart === 'Every day' ? '24/7' : `${dayPart} ${timePart}`;
  }

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden ${isOverride ? 'border-red-900' : 'border-gray-800'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <button onClick={() => setExpanded(e => !e)} className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-white font-semibold text-base">{policy.name}</span>
              {isOverride && (
                <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full font-medium">⚠ Override</span>
              )}
              <span className={`text-xs transition-transform inline-block ml-auto ${expanded ? 'rotate-180' : ''}`}>▾</span>
            </div>

            {/* Lanes (always visible) */}
            <div className="space-y-2">
              {/* People */}
              <Lane color="bg-indigo-600" label="People" accentClass="text-indigo-400">
                {peopleChips.length === 0 ? (
                  <span className="text-slate-600 text-xs italic">Anyone</span>
                ) : peopleChips.map((chip, i) => (
                  <span key={chip.id} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-slate-500 text-xs font-semibold">
                        {policy.logicalOperator}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS[chip.chipType] ?? 'bg-slate-700 text-slate-300'}`}>
                      {chip.label}
                    </span>
                  </span>
                ))}
              </Lane>

              {/* Time */}
              <Lane color="bg-amber-500" label="Time" accentClass="text-amber-400">
                {timeWindows.length === 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS.time}`}>Always (24/7)</span>
                ) : timeWindows.map(tw => (
                  <span key={tw.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS.time}`}>
                    {chipLabel(tw)}
                  </span>
                ))}
              </Lane>

              {/* Doors */}
              <Lane color="bg-emerald-500" label="Doors" accentClass="text-emerald-400">
                {assignedDoors.length === 0 ? (
                  <span className="text-slate-600 text-xs italic">No doors assigned</span>
                ) : assignedDoors.map(door => (
                  <span key={door.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS.door}`}>
                    {door.name}
                  </span>
                ))}
              </Lane>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button onClick={onEdit} className="px-3 py-1.5 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
              Edit
            </button>
            <button onClick={onDelete} className="px-3 py-1.5 text-xs text-red-400 bg-gray-800 hover:bg-red-950 border border-gray-700 hover:border-red-800 rounded-lg transition-colors">
              Delete
            </button>
          </div>
        </div>

        {expanded && policy.description && (
          <p className="text-slate-500 text-sm mt-3 border-t border-gray-800 pt-3">{policy.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Modal draft ──────────────────────────────────────────────────────────────

interface PolicyDraft {
  name: string;
  description: string;
  logicalOperator: 'AND' | 'OR';
  peopleChips: ConditionChip[];
  timeWindows: TimeWindow[];
  doorIds: string[];
}

function emptyDraft(): PolicyDraft {
  return { name: '', description: '', logicalOperator: 'AND', peopleChips: [], timeWindows: [], doorIds: [] };
}

function policyToDraft(p: Policy): PolicyDraft {
  return {
    name: p.name,
    description: p.description,
    logicalOperator: p.logicalOperator,
    peopleChips: rulesToConditionChips(p.rules),
    timeWindows: rulesToTimeWindows(p.rules),
    doorIds: [...p.doorIds],
  };
}

function draftToPolicy(draft: PolicyDraft, id: string): Policy {
  const peopleRules = draft.peopleChips.map(chipToRule);
  const timeRules   = draft.timeWindows.flatMap(timeWindowToRules);
  return {
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    logicalOperator: draft.logicalOperator,
    rules: [...peopleRules, ...timeRules],
    doorIds: draft.doorIds,
  };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Policies() {
  const policies      = useStore(s => s.policies);
  const doors         = useStore(s => s.doors);
  const addPolicy     = useStore(s => s.addPolicy);
  const updatePolicy  = useStore(s => s.updatePolicy);
  const deletePolicy  = useStore(s => s.deletePolicy);

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [draft, setDraft]             = useState<PolicyDraft>(emptyDraft());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [doorSearch, setDoorSearch]   = useState('');

  const filteredDoors = useMemo(
    () => doors.filter(d => d.name.toLowerCase().includes(doorSearch.toLowerCase())),
    [doors, doorSearch],
  );

  function openAdd()          { setEditingId(null); setDraft(emptyDraft()); setDoorSearch(''); setModalOpen(true); }
  function openEdit(p: Policy) { setEditingId(p.id); setDraft(policyToDraft(p)); setDoorSearch(''); setModalOpen(true); }
  function closeModal()       { setModalOpen(false); setEditingId(null); setDraft(emptyDraft()); setDoorSearch(''); }

  function handleSave() {
    if (!draft.name.trim()) return;
    const id = editingId ?? uuidv4();
    const policy = draftToPolicy(draft, id);
    if (editingId) updatePolicy(policy);
    else addPolicy(policy);
    closeModal();
  }

  function toggleDoor(doorId: string) {
    setDraft(d => ({
      ...d,
      doorIds: d.doorIds.includes(doorId)
        ? d.doorIds.filter(id => id !== doorId)
        : [...d.doorIds, doorId],
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Access Policies</h1>
          <button onClick={openAdd} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
            + New Policy
          </button>
        </div>

        {policies.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No policies defined.</p>
            <p className="text-sm mt-1">Create a policy to define who can access which doors and when.</p>
          </div>
        )}

        <div className="space-y-4">
          {policies.map(policy => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onEdit={() => openEdit(policy)}
              onDelete={() => setDeleteConfirmId(policy.id)}
            />
          ))}
        </div>
      </div>

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-white font-semibold text-lg mb-2">Delete Policy</h2>
            <p className="text-gray-400 text-sm mb-6">
              Remove "{policies.find(p => p.id === deleteConfirmId)?.name}"? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { deletePolicy(deleteConfirmId); setDeleteConfirmId(null); }}
                className="px-4 py-2 text-sm text-white bg-red-700 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
              <h2 className="text-white font-semibold text-lg">{editingId ? 'Edit Policy' : 'New Policy'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Policy Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. After-Hours Research Lab"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Description <span className="text-gray-600 normal-case">(optional)</span></label>
                <input
                  type="text"
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="What does this policy do?"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* People lane */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-indigo-600 rounded-full" />
                  <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">People</label>
                  <span className="text-xs text-gray-600">— who does this apply to?</span>
                </div>
                <p className="text-xs text-gray-600 pl-3">Leave empty to apply to everyone.</p>
                <div className="pl-3">
                  <div className="flex items-center gap-3 mb-2">
                    {(['AND', 'OR'] as const).map(op => (
                      <label key={op} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                        draft.logicalOperator === op
                          ? op === 'AND' ? 'bg-indigo-900 border-indigo-600 text-indigo-200' : 'bg-violet-900 border-violet-600 text-violet-200'
                          : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'
                      }`}>
                        <input type="radio" name="logic" value={op} checked={draft.logicalOperator === op} onChange={() => setDraft(d => ({ ...d, logicalOperator: op }))} className="sr-only" />
                        {op === 'AND' ? 'All conditions must match' : 'Any condition matches'}
                      </label>
                    ))}
                  </div>
                  <ConditionChips
                    chips={draft.peopleChips}
                    onChange={chips => setDraft(d => ({ ...d, peopleChips: chips }))}
                    allowGroupRef
                  />
                </div>
              </div>

              {/* Time lane */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-amber-500 rounded-full" />
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-widest">Time</label>
                  <span className="text-xs text-gray-600">— when is this active?</span>
                </div>
                <p className="text-xs text-gray-600 pl-3">Leave empty for always-on (24/7).</p>
                <div className="pl-3">
                  <TimeWindowChips
                    windows={draft.timeWindows}
                    onChange={windows => setDraft(d => ({ ...d, timeWindows: windows }))}
                  />
                </div>
              </div>

              {/* Doors lane */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-emerald-500 rounded-full" />
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Doors</label>
                  <span className="text-xs text-gray-600">— which doors does this unlock?</span>
                </div>
                <div className="pl-3">
                  <input
                    type="text"
                    value={doorSearch}
                    onChange={e => setDoorSearch(e.target.value)}
                    placeholder="Search doors..."
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 mb-2"
                  />
                  {doors.length === 0 && <p className="text-xs text-gray-600 italic">No doors available.</p>}
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {filteredDoors.map(door => {
                      const checked = draft.doorIds.includes(door.id);
                      return (
                        <label key={door.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                          checked ? 'bg-emerald-900 border-emerald-600 text-emerald-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleDoor(door.id)} className="sr-only" />
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-500 border-emerald-400' : 'border-gray-600'}`}>
                            {checked && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </span>
                          <span className="truncate">{door.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {draft.doorIds.length > 0 && (
                    <p className="text-xs text-emerald-500 mt-1">{draft.doorIds.length} door{draft.doorIds.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!draft.name.trim()}
                className="px-4 py-2 text-sm text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingId ? 'Save Changes' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd abac-soc-demo-v2 && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and verify visually**

```bash
cd abac-soc-demo-v2 && npm run dev
```

Navigate to `http://localhost:5173/policies`. Verify:
- Each policy card shows three colour-coded lanes (indigo People, amber Time, green Doors)
- "+ New Policy" opens modal with the three lane sections
- People lane shows the `allowGroupRef` group picker in the dropdown
- Door selector shows two-column grid with search
- AND/OR radio controls the logical operator label between chips in the People lane

- [ ] **Step 4: Commit**

```bash
cd abac-soc-demo-v2 && git add src/pages/Policies.tsx
git commit -m "feat(abac-demo): rewrite Policies page with colour-coded lane UX"
```

---

## Task 6: Seed demo grants, groups and policies

Append demo data to `generateRealWorldData()` in `realWorldData.ts`. The demo data seeds:
- 3 Grants (unlock actions scoped to specific sites)
- 3 Groups referencing those grants
- 3 Policies referencing the groups and real door IDs

**Files:**
- Modify: `abac-soc-demo-v2/src/data/realWorldData.ts` (append to `generateRealWorldData` function)

- [ ] **Step 1: Find the closing brace of `generateRealWorldData`**

Open `src/data/realWorldData.ts` and find the last call inside `generateRealWorldData()` — it will be something like `useStore.setState({ ... })` or a series of `store.setX(...)` calls. You need to append the demo seed block **before the function closing brace**.

Read the file and find the exact pattern for how it seeds data (what store setters it calls), then add the following block using the same pattern.

- [ ] **Step 2: Append demo seed block**

Add this block at the end of `generateRealWorldData()`, before its closing `}`. Use `useStore.getState()` to read live IDs for doors that already exist in the store (seeded earlier in the function).

```typescript
  // ── Demo seed: Grants ───────────────────────────────────────────────────────
  const DEMO_GRANT_DC: import('../types').Grant = {
    id: 'demo-grant-dc',
    name: 'Data Centre Unlock',
    description: 'Unlock access to Data Centre doors',
    scope: 'site',
    targetId: 'site-ctrl-88', // Data Centre
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [],
    conditionLogic: 'AND',
    customAttributes: {},
    schedule: null,
  };

  const DEMO_GRANT_ALLSHIFT: import('../types').Grant = {
    id: 'demo-grant-allshift',
    name: 'All Doors Unlock',
    description: 'Full unlock access across all sites',
    scope: 'global',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [],
    conditionLogic: 'AND',
    customAttributes: {},
    schedule: null,
  };

  const DEMO_GRANT_ESCORT: import('../types').Grant = {
    id: 'demo-grant-escort',
    name: 'Escorted Access',
    description: 'Access limited to escorted areas during business hours',
    scope: 'site',
    targetId: 'site-ctrl-0', // Main Building
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [],
    conditionLogic: 'AND',
    customAttributes: {},
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '18:00',
      timezone: 'Pacific/Auckland',
    },
  };

  // Only seed if not already present (idempotent)
  const existingGrants = useStore.getState().grants;
  if (!existingGrants.find(g => g.id === 'demo-grant-dc')) {
    useStore.getState().addGrant(DEMO_GRANT_DC);
    useStore.getState().addGrant(DEMO_GRANT_ALLSHIFT);
    useStore.getState().addGrant(DEMO_GRANT_ESCORT);
  }

  // ── Demo seed: Groups ───────────────────────────────────────────────────────
  const existingGroups = useStore.getState().groups;
  if (!existingGroups.find(g => g.id === 'demo-group-dc-engineers')) {
    useStore.getState().addGroup({
      id: 'demo-group-dc-engineers',
      name: 'Data Centre Engineers',
      description: 'Engineering staff with Confidential clearance — auto-enrolled',
      membershipType: 'dynamic',
      membershipLogic: 'AND',
      targetEntityType: 'user',
      members: [],
      membershipRules: [
        { id: 'dcr-1', leftSide: 'user.department', operator: '==', rightSide: 'Engineering' },
        { id: 'dcr-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: 'Confidential' },
        { id: 'dcr-3', leftSide: 'user.status', operator: '==', rightSide: 'Active' },
      ],
      inheritedPermissions: ['demo-grant-dc'],
    });

    useStore.getState().addGroup({
      id: 'demo-group-night-security',
      name: 'Night Shift Security',
      description: 'Security staff on night rotation — time-gated',
      membershipType: 'dynamic',
      membershipLogic: 'AND',
      targetEntityType: 'user',
      members: [],
      membershipRules: [
        { id: 'nsr-1', leftSide: 'user.department', operator: '==', rightSide: 'Security' },
        { id: 'nsr-2', leftSide: 'user.status', operator: '==', rightSide: 'Active' },
        { id: 'nsr-3', leftSide: 'now.dayOfWeek', operator: 'IN', rightSide: 'Mon, Tue, Wed, Thu, Fri' },
        { id: 'nsr-4', leftSide: 'now.hour', operator: '>=', rightSide: '20' },
      ],
      inheritedPermissions: ['demo-grant-allshift'],
    });

    useStore.getState().addGroup({
      id: 'demo-group-cleared-contractors',
      name: 'Cleared Contractors',
      description: 'TopSecret-cleared contractors — business hours only',
      membershipType: 'dynamic',
      membershipLogic: 'AND',
      targetEntityType: 'user',
      members: [],
      membershipRules: [
        { id: 'ccr-1', leftSide: 'user.role', operator: '==', rightSide: 'Contractor' },
        { id: 'ccr-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: 'TopSecret' },
        { id: 'ccr-3', leftSide: 'user.status', operator: '==', rightSide: 'Active' },
        { id: 'ccr-4', leftSide: 'now.dayOfWeek', operator: 'IN', rightSide: 'Mon, Tue, Wed, Thu, Fri' },
        { id: 'ccr-5', leftSide: 'now.hour', operator: '>=', rightSide: '8' },
        { id: 'ccr-6', leftSide: 'now.hour', operator: '<', rightSide: '18' },
      ],
      inheritedPermissions: ['demo-grant-escort'],
    });
  }

  // ── Demo seed: Policies ──────────────────────────────────────────────────────
  // Resolve real door IDs from the seeded store for named doors
  const liveDoors = useStore.getState().doors;
  function doorIdsByName(...names: string[]): string[] {
    return liveDoors.filter(d => names.some(n => d.name.toLowerCase().includes(n.toLowerCase()))).map(d => d.id);
  }

  const existingPolicies = useStore.getState().policies;
  if (!existingPolicies.find(p => p.id === 'demo-policy-biz-hours')) {
    const mainEntranceDoors = doorIdsByName('main', 'entrance', 'lobby', 'reception');

    useStore.getState().addPolicy({
      id: 'demo-policy-biz-hours',
      name: 'Business Hours — All Staff',
      description: 'Standard access for all active employees during working hours',
      logicalOperator: 'AND',
      rules: [
        { id: 'bhr-1', leftSide: 'user.status', operator: '==', rightSide: 'Active' },
        { id: 'bhr-2', leftSide: 'now.dayOfWeek', operator: 'IN', rightSide: 'Mon, Tue, Wed, Thu, Fri' },
        { id: 'bhr-3', leftSide: 'now.hour', operator: '>=', rightSide: '8' },
        { id: 'bhr-4', leftSide: 'now.hour', operator: '<', rightSide: '18' },
      ],
      doorIds: mainEntranceDoors.slice(0, 6),
    });

    const labDoors = doorIdsByName('lab', 'research', 'server');
    useStore.getState().addPolicy({
      id: 'demo-policy-afterhours-lab',
      name: 'After-Hours Research Lab',
      description: 'Data Centre Engineers can access the lab at any time',
      logicalOperator: 'AND',
      rules: [
        { id: 'ahr-1', leftSide: 'user', operator: 'IN', rightSide: 'group.Data Centre Engineers' },
        { id: 'ahr-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: 'Confidential' },
      ],
      doorIds: labDoors.slice(0, 4),
    });

    const allDoorIds = liveDoors.slice(0, 12).map(d => d.id);
    useStore.getState().addPolicy({
      id: 'demo-policy-emergency',
      name: 'Emergency Override',
      description: 'Security and Emergency Team with TopSecret clearance — unrestricted',
      logicalOperator: 'OR',
      rules: [
        { id: 'emr-1', leftSide: 'user', operator: 'IN', rightSide: 'group.Night Shift Security' },
        { id: 'emr-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: 'TopSecret' },
      ],
      doorIds: allDoorIds,
    });
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd abac-soc-demo-v2 && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run dev server and verify end-to-end**

```bash
cd abac-soc-demo-v2 && npm run dev
```

Clear localStorage first (open DevTools → Application → Storage → Clear site data), then reload.

Verify on **Groups page** (`/groups`):
- 3 demo groups appear: Data Centre Engineers, Night Shift Security, Cleared Contractors
- Each shows correct badge pills (auto-enrolled, time-gated)
- Sentence chip row shows the right condition chips
- Expanding each group shows its inherited grant

Verify on **Policies page** (`/policies`):
- 3 demo policies appear with the three lanes
- "After-Hours Research Lab" People lane shows a `group` chip: "Data Centre Engineers"
- "Emergency Override" shows the `⚠ Override` badge and OR logic

- [ ] **Step 5: Commit**

```bash
cd abac-soc-demo-v2 && git add src/data/realWorldData.ts
git commit -m "feat(abac-demo): seed 3 demo Groups (with Grants) and 3 demo Policies"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Groups — sentence builder card list | Task 4 (`Groups.tsx` card list + `SentenceRow`) |
| Groups — chip-based modal (no raw rules) | Task 4 (modal with `ConditionChips` + `TimeWindowChips`) |
| Groups — badge labels (auto-enrolled, time-gated, hand-picked) | Task 4 (`membershipBadges` fn) |
| Groups — 3 demo items seeded | Task 6 |
| Policies — colour-coded lanes (People/Time/Doors) | Task 5 (`Lane` component) |
| Policies — modal with lane sections | Task 5 (modal body) |
| Policies — People lane supports group refs | Task 5 (`allowGroupRef` prop on `ConditionChips`) |
| Policies — Doors = individual door IDs (no zones) | Task 5 (door checkbox grid) |
| Policies — 3 demo items seeded | Task 6 |
| Cross-page link: Policy refs Group by name | Task 6 (`demo-policy-afterhours-lab` uses `group.Data Centre Engineers`) |
| No type changes | Confirmed — `types/index.ts` additions are UI-only, append-only |
| No engine changes | Confirmed — `accessEngine.ts` untouched |
| `RuleBuilder` not in Groups or Policies | Confirmed — neither page imports it |

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency check:** `ConditionChip`, `TimeWindow`, `chipToRule`, `timeWindowToRules`, `rulesToConditionChips`, `rulesToTimeWindows`, `CHIP_COLORS` are defined once in `types/index.ts` and `lib/chipUtils.ts` respectively, and imported consistently across Tasks 2–5.
