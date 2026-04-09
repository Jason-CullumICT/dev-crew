import type { Group } from '../../types'

interface Props {
  group: Group
  allGroups: Group[]
  selected: boolean
  onClick: () => void
}

export default function GroupNode({ group, allGroups, selected, onClick }: Props) {
  const subGroupNames = group.subGroups.map(id => allGroups.find(g => g.id === id)?.name ?? id)

  return (
    <div
      onClick={onClick}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[148px] px-3.5 py-3 ${
        selected
          ? 'bg-[#0f1320] border-2 border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.12),0_8px_28px_rgba(0,0,0,0.5)]'
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
    </div>
  )
}
