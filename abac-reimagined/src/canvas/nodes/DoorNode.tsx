import type { Door, Zone } from '../../types'

interface Props {
  door: Door
  zone?: Zone
  selected: boolean
  onClick: () => void
}

export default function DoorNode({ door, zone, selected, onClick }: Props) {
  const isRestricted = zone?.type === 'Restricted' || zone?.type === 'Secure'

  return (
    <div
      onClick={onClick}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[116px] px-3 py-2.5 ${
        selected
          ? `bg-[#0a0d14] border-2 shadow-[0_0_0_4px_rgba(239,68,68,0.08)] ${isRestricted ? 'border-red-500' : 'border-slate-500'}`
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
    </div>
  )
}
