import { useStore } from '../store/store'

const STATUS_CLASS = {
  active:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20',
  inactive:  'bg-slate-700 text-slate-500 border border-slate-600',
}

const TYPE_CLASS = {
  employee:   'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  contractor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  visitor:    'bg-slate-700 text-slate-400 border border-slate-600',
}

export default function People() {
  const users = useStore(s => s.users)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">People</h1>
        <span className="text-[10px] text-slate-600">{users.length} users</span>
      </div>

      <div className="grid gap-2">
        {users.map(user => (
          <div key={user.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg px-4 py-3 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-slate-100">{user.name}</div>
              <div className="text-[10px] text-slate-500">{user.role} · {user.department}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${TYPE_CLASS[user.type]}`}>{user.type}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${STATUS_CLASS[user.status]}`}>{user.status}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
                L{user.clearanceLevel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
