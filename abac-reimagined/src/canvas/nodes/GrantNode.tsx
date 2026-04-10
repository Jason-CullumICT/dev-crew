import { useStore } from '../../store/store'
import type { Grant } from '../../types'

const MODE_STYLE: Record<Grant['applicationMode'], string> = {
  assigned:    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  conditional: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  auto:        'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

interface Props {
  grant: Grant
  selected: boolean
  highlighted?: boolean
  dimmed?: boolean
  onClick: () => void
}

export default function GrantNode({ grant, selected, highlighted, dimmed, onClick }: Props) {
  const sites = useStore(s => s.sites)
  const zones = useStore(s => s.zones)

  const targetName = grant.targetId
    ? (sites.find(s => s.id === grant.targetId)?.name ?? zones.find(z => z.id === grant.targetId)?.name ?? grant.targetId)
    : null

  return (
    <div
      onClick={onClick}
      style={{ opacity: dimmed ? 0.2 : 1 }}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[136px] px-3.5 py-3 ${
        selected
          ? 'bg-[#0c0a1e] border-2 border-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]'
          : highlighted
            ? 'bg-[#0c0a1e] border-2 border-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.2)]'
            : 'bg-[#0c0a1e] border border-[#2e1f6b] hover:shadow-[0_0_0_2px_rgba(139,92,246,0.25)]'
      }`}
    >
      <div className="text-[12px] font-semibold text-violet-200">{grant.name}</div>
      <div className="text-[9px] text-[#374151] mt-0.5 truncate">{grant.actions.slice(0, 3).join(' · ')}{grant.actions.length > 3 ? ' …' : ''}</div>
      <div className="mt-1.5">
        <span className={`text-[8px] px-1.5 py-0.5 rounded border inline-block ${MODE_STYLE[grant.applicationMode]}`}>
          {grant.applicationMode}
        </span>
      </div>

      {selected && (
        <div className="mt-2 pt-2 border-t border-[#2e1f6b]/40 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-violet-900 uppercase tracking-wide">Scope</span>
            <span className="text-[9px] text-violet-300">{grant.scope}{targetName ? ` · ${targetName}` : ''}</span>
          </div>
          {grant.actions.length > 0 && (
            <div>
              <div className="text-[8px] text-violet-900 uppercase tracking-wide mb-0.5">Actions</div>
              <div className="flex flex-wrap gap-1">
                {grant.actions.map(a => (
                  <span key={a} className="text-[8px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1 py-0.5 rounded">{a}</span>
                ))}
              </div>
            </div>
          )}
          {grant.conditions.length > 0 && (
            <div className="text-[8px] text-violet-900">{grant.conditions.length} condition{grant.conditions.length !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}
