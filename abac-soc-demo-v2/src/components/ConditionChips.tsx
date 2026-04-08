import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { ConditionChip, ConditionChipType } from '../types';
import { CHIP_COLORS } from '../lib/chipUtils';

// ── Picker option definitions ────────────────────────────────────────────────

interface PickerOption {
  chipType: ConditionChipType;
  label: string;
  attribute: string;
  operator: string;
  values?: string[];
  freeText?: boolean;
  groupPicker?: boolean;
}

const BASE_OPTIONS: PickerOption[] = [
  { chipType: 'department', label: 'Works in department',  attribute: 'user.department',     operator: '==', freeText: true },
  { chipType: 'status',     label: 'Is status',            attribute: 'user.status',         operator: '==', values: ['Active', 'Suspended', 'Pending'] },
  { chipType: 'clearance',  label: 'Has clearance (min)',  attribute: 'user.clearanceLevel', operator: '>=', values: ['Unclassified', 'Confidential', 'Secret', 'TopSecret'] },
  { chipType: 'role',       label: 'Has role',             attribute: 'user.role',           operator: '==', freeText: true },
  { chipType: 'personType', label: 'Is person type',       attribute: 'user.type',           operator: '==', values: ['Employee', 'Contractor', 'Visitor', 'Vendor'] },
  { chipType: 'group',      label: 'Is in group',          attribute: 'user',                operator: 'IN', groupPicker: true },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface ConditionChipsProps {
  chips: ConditionChip[];
  onChange: (chips: ConditionChip[]) => void;
  /** Show the group picker option — used in Policies People lane */
  allowGroupRef?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ConditionChips({ chips, onChange, allowGroupRef = false }: ConditionChipsProps) {
  const groups = useStore(s => s.groups);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<PickerOption | null>(null);
  const [inputValue, setInputValue] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        closePicker();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [pickerOpen]);

  const visibleOptions = allowGroupRef
    ? BASE_OPTIONS
    : BASE_OPTIONS.filter(o => o.chipType !== 'group');

  function removeChip(id: string) {
    onChange(chips.filter(c => c.id !== id));
  }

  function commitChip(option: PickerOption, value: string, displayLabel?: string) {
    if (!value.trim()) return;
    // Prevent duplicate chips for the same attribute+value combination
    const isDuplicate = chips.some(
      c => c.attribute === option.attribute && c.value === (option.chipType === 'group' ? `group.${value}` : value)
    );
    if (isDuplicate) {
      closePicker();
      return;
    }
    const isGroup = option.chipType === 'group';
    const rawValue = isGroup ? `group.${value}` : value;
    const labelStr = isGroup
      ? (displayLabel ?? value)
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

  function closePicker() {
    setPickerOpen(false);
    setSelectedOption(null);
    setInputValue('');
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
            aria-label={`Remove ${chip.label}`}
          >
            ×
          </button>
        </span>
      ))}

      {/* Add picker */}
      <div className="relative" ref={pickerRef}>
        {!pickerOpen && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors px-1"
          >
            + add condition
          </button>
        )}

        {/* Option list */}
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
                onClick={closePicker}
                className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Value picker */}
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
                  onKeyDown={e => { if (e.key === 'Enter') commitChip(selectedOption, inputValue); }}
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
                  <p className="text-xs text-slate-500 italic px-2">No groups yet.</p>
                )}
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => commitChip(selectedOption, g.id, g.name)}
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
