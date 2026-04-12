// src/components/ThreatLevelPill.tsx
// Phase 3 — Global threat level indicator with click-to-change dropdown.

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ShieldAlert } from 'lucide-react'
import { useStore } from '../store/store'
import type { ThreatLevel } from '../types'

// ── Colour mapping ─────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<ThreatLevel, { pill: string; dot: string; label: string }> = {
  normal:   { pill: 'bg-green-500/10 border-green-500/30 text-green-400',   dot: 'bg-green-500',   label: 'Normal' },
  elevated: { pill: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', dot: 'bg-yellow-500', label: 'Elevated' },
  high:     { pill: 'bg-orange-500/10 border-orange-500/30 text-orange-400', dot: 'bg-orange-500', label: 'High' },
  critical: { pill: 'bg-red-500/10 border-red-500/30 text-red-400',         dot: 'bg-red-500',    label: 'Critical' },
  lockdown: { pill: 'bg-purple-500/10 border-purple-500/30 text-purple-400', dot: 'bg-purple-500', label: 'Lockdown' },
}

const ALL_LEVELS: ThreatLevel[] = ['normal', 'elevated', 'high', 'critical', 'lockdown']

// ── Component ─────────────────────────────────────────────────────────────────

export default function ThreatLevelPill() {
  const threatLevel    = useStore(s => s.threatLevel)
  const setThreatLevel = useStore(s => s.setThreatLevel)

  const [open, setOpen]           = useState(false)
  const [confirming, setConfirming] = useState<ThreatLevel | null>(null)
  const dropdownRef               = useRef<HTMLDivElement>(null)

  const styles = LEVEL_STYLES[threatLevel]

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function selectLevel(level: ThreatLevel) {
    if (level === threatLevel) { setOpen(false); return }
    setConfirming(level)
  }

  function confirmChange() {
    if (confirming !== null) {
      setThreatLevel(confirming)
      setOpen(false)
      setConfirming(null)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Pill button */}
      <button
        onClick={() => { setOpen(o => !o); setConfirming(null) }}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium transition-colors ${styles.pill}`}
        title="Click to change threat level"
      >
        <ShieldAlert size={10} />
        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} shrink-0`} />
        <span>{styles.label}</span>
        <ChevronDown size={9} className="opacity-60" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#0f1320] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden w-48">
          {confirming !== null ? (
            /* Confirmation state */
            <div className="p-3">
              <div className="text-[11px] text-slate-300 mb-1 font-medium">
                Change to <span className={LEVEL_STYLES[confirming].pill.split(' ')[2]}>{LEVEL_STYLES[confirming].label}</span>?
              </div>
              <div className="text-[10px] text-slate-600 mb-2">
                This will update the global threat level and may trigger response rules.
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setConfirming(null)}
                  className="flex-1 py-1 rounded text-[10px] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmChange}
                  className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                    LEVEL_STYLES[confirming].pill
                  } hover:opacity-80`}
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            /* Level list */
            <div className="py-1">
              <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-slate-600 border-b border-[#1e293b]">
                Set Threat Level
              </div>
              {ALL_LEVELS.map(level => {
                const s = LEVEL_STYLES[level]
                const isActive = level === threatLevel
                return (
                  <button
                    key={level}
                    onClick={() => selectLevel(level)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors ${
                      isActive
                        ? 'bg-white/[0.04] ' + s.pill.split(' ')[2]
                        : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                    {s.label}
                    {isActive && <span className="ml-auto text-[9px] opacity-60">current</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
