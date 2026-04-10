import { useState, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import PolicyModal from '../modals/PolicyModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Policy } from '../types'

export default function Policies() {
  const policies     = useStore(s => s.policies)
  const doors        = useStore(s => s.doors)
  const schedules    = useStore(s => s.schedules)
  const deletePolicy = useStore(s => s.deletePolicy)

  const [editing, setEditing]             = useState<Policy | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<Policy | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return policies
    return policies.filter(p => p.name.toLowerCase().includes(q))
  }, [policies, search])

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deletePolicy(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Policies</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{policies.length} policies</span>
          <button
            onClick={() => setEditing('new')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by policy name..."
        resultCount={filtered.length}
        totalCount={policies.length}
      />

      <div className="grid gap-3">
        {filtered.map(policy => {
          const schedule = policy.scheduleId ? schedules.find(s => s.id === policy.scheduleId) : null

          // Build a compact rule summary string (max 2 rules shown inline, then "…")
          const ruleSummaryParts = policy.rules.map(r => {
            const rhs = Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide
            return `${r.leftSide} ${r.operator} '${rhs}'`
          })
          const logicSep = ` ${policy.logicalOperator} `
          const ruleSummary = ruleSummaryParts.length <= 2
            ? ruleSummaryParts.join(logicSep)
            : ruleSummaryParts.slice(0, 2).join(logicSep) + ` ${policy.logicalOperator} …`

          return (
            <div key={policy.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[13px] font-bold text-slate-100">{policy.name}</div>
                    {/* AND/OR logic operator badge */}
                    {policy.rules.length > 1 && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                        policy.logicalOperator === 'AND'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                          : 'bg-orange-500/10 text-orange-400 border-orange-500/25'
                      }`}>{policy.logicalOperator}</span>
                    )}
                  </div>
                  {/* Rule summary */}
                  {policy.rules.length > 0 && (
                    <div className="text-[10px] text-slate-500 mt-1 font-mono truncate" title={ruleSummaryParts.join(logicSep)}>
                      {ruleSummary}
                    </div>
                  )}
                  {policy.description && (
                    <div className="text-[10px] text-slate-600 mt-0.5 truncate">{policy.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] text-slate-600">{policy.rules.length} rule{policy.rules.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => setEditing(policy)}
                    aria-label="Edit"
                    className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setPendingDelete(policy)}
                    aria-label="Delete"
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {policy.doorIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {policy.doorIds.map(id => (
                    <span key={id} className="text-[9px] bg-[#111827] border border-[#1e293b] text-slate-500 px-1.5 py-0.5 rounded">
                      &#x1F6AA; {doors.find(d => d.id === id)?.name ?? id}
                    </span>
                  ))}
                </div>
              )}
              {schedule && (
                <span className="text-[9px] bg-[#07100e] border border-[#134e4a] text-teal-400 px-1.5 py-0.5 rounded inline-block">{schedule.name}</span>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-[12px] text-slate-600">
            {search ? 'No policies match your search.' : 'No policies yet. Click + New to create one.'}
          </p>
        )}
      </div>

      {editing !== null && (
        <PolicyModal policy={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete policy?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
