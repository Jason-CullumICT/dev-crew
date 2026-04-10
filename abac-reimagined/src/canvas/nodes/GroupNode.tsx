import type { Group } from '../../types'

interface Props {
  group: Group
  allGroups: Group[]
  selected: boolean
  highlighted?: boolean
  dimmed?: boolean
  onClick: () => void
  onDoubleClick?: () => void
}

export default function GroupNode({ group, selected, highlighted, dimmed, onClick, onDoubleClick }: Props) {
  const secondaryLabel = `${group.membershipType} · ${group.members.length} member${group.members.length !== 1 ? 's' : ''}`

  return (
    <div
      onClick={onClick}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      role="button"
      tabIndex={0}
      aria-label={`Group: ${group.name}, ${group.membershipType}, ${group.members.length} members`}
      style={{ opacity: dimmed ? 0.4 : 1 }}
      className={`absolute rounded-2xl cursor-pointer transition-all select-none min-w-[148px] px-3.5 py-3 ${
        selected
          ? 'bg-[#0f1320] border-2 border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2),0_0_16px_rgba(99,102,241,0.15)]'
          : highlighted
            ? 'bg-[#0f1320] border-2 border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]'
            : 'bg-[#0f1320] border border-[#1e2d4a] hover:shadow-[0_0_0_2px_rgba(99,102,241,0.25)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Group icon: two overlapping person outlines */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <circle cx="5.5" cy="4.5" r="2" stroke="#6366f1" strokeWidth="1.2"/>
          <path d="M1 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="10.5" cy="4.5" r="2" stroke="#6366f1" strokeWidth="1.2" opacity="0.6"/>
          <path d="M8 13c0-2.5 1.5-4 4-4" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
        </svg>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-slate-100 truncate">{group.name}</div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">{secondaryLabel}</div>
        </div>
      </div>

      {selected && (
        <div className="mt-2 pt-2 border-t border-[#1e293b] space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border inline-block ${
              group.membershipType === 'dynamic'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {group.membershipType}
            </span>
          </div>
          {group.subGroups.length > 0 && (
            <div className="text-[9px] text-slate-500">{group.subGroups.length} subgroup{group.subGroups.length !== 1 ? 's' : ''}</div>
          )}
          {group.inheritedPermissions.length > 0 && (
            <div className="text-[9px] text-slate-500">{group.inheritedPermissions.length} grant{group.inheritedPermissions.length !== 1 ? 's' : ''}</div>
          )}
          {group.membershipType === 'dynamic' && group.membershipRules.length > 0 && (
            <div className="text-[9px] text-slate-500">{group.membershipRules.length} rule{group.membershipRules.length !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}
