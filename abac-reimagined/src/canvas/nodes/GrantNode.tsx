import type { Grant } from '../../types'

const MODE_STYLE: Record<Grant['applicationMode'], string> = {
  assigned:    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  conditional: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  auto:        'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

interface Props {
  grant: Grant
  selected: boolean
  onClick: () => void
}

export default function GrantNode({ grant, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[136px] px-3.5 py-3 ${
        selected
          ? 'bg-[#0c0a1e] border-2 border-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]'
          : 'bg-[#0c0a1e] border border-[#2e1f6b] hover:shadow-[0_0_0_2px_rgba(139,92,246,0.25)]'
      }`}
    >
      <div className="text-[12px] font-semibold text-violet-200">{grant.name}</div>
      <div className="text-[9px] text-[#374151] mt-0.5">{grant.actions.join(' · ')}</div>
      <div className="mt-1.5">
        <span className={`text-[8px] px-1.5 py-0.5 rounded border inline-block ${MODE_STYLE[grant.applicationMode]}`}>
          {grant.applicationMode}
        </span>
      </div>
    </div>
  )
}
