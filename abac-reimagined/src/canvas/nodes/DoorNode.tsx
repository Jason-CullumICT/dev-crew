import { useStore } from '../../store/store'
import type { Door, Zone } from '../../types'

interface Props {
  door: Door
  zone?: Zone
  selected: boolean
  highlighted?: boolean
  dimmed?: boolean
  onClick: () => void
  onDoubleClick?: () => void
  deviceCount?: { inputs: number; outputs: number; hasUnhealthy: boolean }
}

export default function DoorNode({ door, zone, selected, highlighted, dimmed, onClick, onDoubleClick, deviceCount }: Props) {
  const sites = useStore(s => s.sites)
  const isRestricted = zone?.type === 'Restricted' || zone?.type === 'Secure'
  const siteName = sites.find(s => s.id === door.siteId)?.name
  const iconStroke = isRestricted ? '#ef4444' : '#64748b'

  return (
    <div
      style={{ opacity: dimmed ? 0.4 : 1, width: 100, minHeight: 38, position: 'absolute' }}
      className="relative"
    >
      {/* Base chip */}
      <div
        onClick={onClick}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.() }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
        role="button"
        tabIndex={0}
        aria-label={`Door: ${door.name}${zone ? `, ${zone.type} zone` : ''}`}
        style={{ width: 100, height: 38 }}
        className={`rounded cursor-pointer transition-all select-none flex items-center gap-1.5 px-2 ${
          selected
            ? `bg-[#0a0d14] border-2 ${isRestricted ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12),0_0_16px_rgba(239,68,68,0.1)]' : 'border-slate-500 shadow-[0_0_0_4px_rgba(148,163,184,0.2),0_0_16px_rgba(148,163,184,0.1)]'}`
            : highlighted
              ? `bg-[#0a0d14] border-2 ${isRestricted ? 'border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.2)]' : 'border-slate-400 shadow-[0_0_0_3px_rgba(148,163,184,0.2)]'}`
              : `bg-[#0a0d14] border ${isRestricted ? 'border-red-900/50 hover:border-red-800' : 'border-[#1e293b] hover:border-slate-600'}`
        }`}
      >
        {/* Door icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <rect x="2" y="1" width="10" height="12" rx="0.5" stroke={iconStroke} strokeWidth="1.2"/>
          <line x1="2" y1="13" x2="12" y2="13" stroke={iconStroke} strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="9.5" cy="7" r="0.9" fill={iconStroke}/>
        </svg>
        <div className="flex flex-col flex-1 min-w-0">
          <div className={`text-[11px] font-medium truncate ${isRestricted ? 'text-red-300' : 'text-slate-300'}`}>
            {door.name}
          </div>
          {deviceCount !== undefined && (deviceCount.inputs > 0 || deviceCount.outputs > 0) && (
            <div className={`text-[8px] leading-none mt-0.5 ${deviceCount.hasUnhealthy ? 'text-amber-500' : 'text-slate-600'}`}>
              {deviceCount.inputs}I/{deviceCount.outputs}O
            </div>
          )}
        </div>
      </div>

      {/* Expanded overlay when selected */}
      {selected && (
        <div
          className={`absolute top-full left-0 z-10 mt-0.5 rounded border bg-[#0a0d14] px-2.5 py-2 space-y-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
            isRestricted ? 'border-red-900/50' : 'border-[#1e293b]'
          }`}
          style={{ width: 160, pointerEvents: 'none' }}
        >
          {zone && (
            <div className="text-[11px] text-slate-400">{zone.type}</div>
          )}
          {siteName && (
            <div className="text-[11px] text-slate-500 truncate">{siteName}</div>
          )}
          {door.description && (
            <div className="text-[10px] text-slate-600 leading-relaxed line-clamp-2">{door.description}</div>
          )}
        </div>
      )}
    </div>
  )
}
