import { useStore } from '../../store/store'
import type { Group } from '../../types'

interface Props {
  group: Group
  allGroups: Group[]
  selected: boolean
  highlighted?: boolean
  dimmed?: boolean
  onClick: () => void
}

export default function GroupNode({ group, allGroups, selected, highlighted, dimmed, onClick }: Props) {
  const users = useStore(s => s.users)
  const subGroupNames = group.subGroups.map(id => allGroups.find(g => g.id === id)?.name ?? id)

  const memberNames = group.members
    .map(id => users.find(u => u.id === id)?.name ?? id)
    .slice(0, 3)
  const extraMembers = group.members.length - 3

  return (
    <div
      onClick={onClick}
      style={{ opacity: dimmed ? 0.2 : 1 }}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[148px] px-3.5 py-3 ${
        selected
          ? 'bg-[#0f1320] border-2 border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.12),0_8px_28px_rgba(0,0,0,0.5)]'
          : highlighted
            ? 'bg-[#0f1320] border-2 border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]'
            : 'bg-[#0f1320] border border-[#1e2d4a] hover:shadow-[0_0_0_2px_rgba(99,102,241,0.25)]'
      }`}
    >
      <div className="text-[12px] font-semibold text-slate-100">{group.name}</div>
      <div className="text-[9px] text-[#374151] mt-0.5">
        {group.membershipType === 'dynamic' ? 'dynamic' : `static · ${group.members.length} members`}
      </div>

      {subGroupNames.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#1e293b]">
          <div className="text-[8px] text-[#1e3a5f] uppercase tracking-wide mb-1">Subgroups</div>
          {subGroupNames.map(name => (
            <div key={name} className="flex items-center gap-1.5 bg-[#080b12] border border-[#1e293b] rounded px-1.5 py-0.5 mt-1 text-[9px] text-[#475569]">
              <span className="text-[#1e3a5f]">↳</span> {name}
            </div>
          ))}
        </div>
      )}

      <div className="mt-1.5">
        <span className={`text-[8px] px-1.5 py-0.5 rounded border inline-block ${
          group.membershipType === 'dynamic'
            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          {group.membershipType}
        </span>
      </div>

      {selected && group.membershipType === 'static' && group.members.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#1e293b]">
          <div className="text-[8px] text-indigo-900 uppercase tracking-wide mb-1">Members</div>
          {memberNames.map(name => (
            <div key={name} className="text-[9px] text-slate-400 py-0.5 truncate">{name}</div>
          ))}
          {extraMembers > 0 && (
            <div className="text-[9px] text-slate-600">+{extraMembers} more</div>
          )}
        </div>
      )}

      {selected && (group.membershipRules?.length ?? 0) > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-[#1e293b]">
          <div className="text-[8px] text-indigo-900 uppercase tracking-wide mb-1">Rules ({group.membershipRules.length})</div>
          {group.membershipRules.slice(0, 2).map((r, i) => (
            <div key={i} className="text-[9px] text-slate-500 truncate">{r.leftSide} {r.operator} {Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide}</div>
          ))}
        </div>
      )}
    </div>
  )
}
