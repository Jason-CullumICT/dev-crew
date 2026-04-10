import { useStore } from '../../store/store'
import type { Grant } from '../../types'

interface Props {
  grant: Grant
  selected: boolean
  highlighted?: boolean
  dimmed?: boolean
  onClick: () => void
  onDoubleClick?: () => void
  /** H7: Total number of doors this grant logically covers (may exceed rendered edges) */
  coveredDoorCount?: number
}

export default function GrantNode({ grant, selected, highlighted, dimmed, onClick, onDoubleClick, coveredDoorCount = 0 }: Props) {
  const sites = useStore(s => s.sites)
  const zones = useStore(s => s.zones)

  const targetName = grant.targetId
    ? (sites.find(s => s.id === grant.targetId)?.name ?? zones.find(z => z.id === grant.targetId)?.name ?? grant.targetId)
    : null

  const secondaryLabel = grant.scope + (targetName ? ` · ${targetName}` : '')

  return (
    <div
      onClick={onClick}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      role="button"
      tabIndex={0}
      aria-label={`Grant: ${grant.name}, ${grant.scope} scope`}
      style={{ opacity: dimmed ? 0.4 : 1 }}
      className={`absolute rounded-xl cursor-pointer transition-all select-none min-w-[136px] px-3.5 py-3 ${
        selected
          ? 'bg-[#0c0a1e] border-2 border-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.2),0_0_16px_rgba(139,92,246,0.15)]'
          : highlighted
            ? 'bg-[#0c0a1e] border-2 border-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.2)]'
            : 'bg-[#0c0a1e] border border-[#2e1f6b] hover:shadow-[0_0_0_2px_rgba(139,92,246,0.25)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Grant icon: key silhouette */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <circle cx="6" cy="6.5" r="3" stroke="#8b5cf6" strokeWidth="1.2"/>
          <line x1="8.5" y1="6.5" x2="14" y2="6.5" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="12" y1="6.5" x2="12" y2="8.5" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="14" y1="6.5" x2="14" y2="8" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-slate-100 truncate">{grant.name}</div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">{secondaryLabel}</div>
        </div>
      </div>

      {selected && (
        <div className="mt-2 pt-2 border-t border-[#2e1f6b]/40 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border inline-block ${
              grant.applicationMode === 'assigned'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : grant.applicationMode === 'conditional'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
            }`}>
              {grant.applicationMode}
            </span>
          </div>
          {coveredDoorCount > 0 && (
            <div className="text-[9px] text-slate-500">covers {coveredDoorCount} door{coveredDoorCount !== 1 ? 's' : ''}</div>
          )}
          {grant.actions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {grant.actions.map(a => (
                <span key={a} className="text-[8px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1 py-0.5 rounded">{a}</span>
              ))}
            </div>
          )}
          {grant.conditions.length > 0 && (
            <div className="text-[9px] text-slate-500">{grant.conditions.length} condition{grant.conditions.length !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}
