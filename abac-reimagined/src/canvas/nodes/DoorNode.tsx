import { useStore } from '../../store/store'
import type { Door, Zone } from '../../types'

interface Props {
  door: Door
  zone?: Zone
  selected: boolean
  highlighted?: boolean
  dimmed?: boolean
  onClick: () => void
}

export default function DoorNode({ door, zone, selected, highlighted, dimmed, onClick }: Props) {
  const sites = useStore(s => s.sites)
  const isRestricted = zone?.type === 'Restricted' || zone?.type === 'Secure'
  const siteName = sites.find(s => s.id === door.siteId)?.name

  return (
    <div
      onClick={onClick}
      style={{ opacity: dimmed ? 0.2 : 1 }}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[116px] px-3 py-2.5 ${
        selected
          ? `bg-[#0a0d14] border-2 shadow-[0_0_0_4px_rgba(239,68,68,0.08)] ${isRestricted ? 'border-red-500' : 'border-slate-500'}`
          : highlighted
            ? `bg-[#0a0d14] border-2 ${isRestricted ? 'border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.2)]' : 'border-slate-400 shadow-[0_0_0_3px_rgba(148,163,184,0.2)]'}`
            : `bg-[#0a0d14] border ${isRestricted ? 'border-red-900/50 hover:border-red-800' : 'border-[#1e293b] hover:border-slate-600'}`
      }`}
    >
      <div className="text-[9px] mb-1">🚪</div>
      <div className={`text-[11px] font-medium ${isRestricted ? 'text-red-300' : 'text-slate-300'}`}>
        {door.name}
      </div>
      {zone && (
        <div className="text-[9px] text-[#374151] mt-0.5">{zone.type}</div>
      )}

      {selected && (
        <div className="mt-2 pt-2 border-t border-[#1e293b] space-y-1">
          {siteName && <div className="text-[9px] text-slate-500">{siteName}</div>}
          {door.description && <div className="text-[9px] text-slate-600 leading-relaxed">{door.description}</div>}
          {Object.keys(door.customAttributes ?? {}).length > 0 && (
            <div className="text-[8px] text-slate-700">{Object.keys(door.customAttributes!).length} custom attr{Object.keys(door.customAttributes!).length !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}
