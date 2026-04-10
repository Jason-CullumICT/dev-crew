import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle, XCircle, MinusCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useStore } from '../store/store'
import { evaluateAccess } from '../engine/accessEngine'
import { buildNowContext } from '../engine/scheduleEngine'
import type { ActionType, AccessResult } from '../types'

interface OracleNavState {
  userId?: string
  doorId?: string
}

function StepHeader({ label, status, expanded, onToggle }: {
  label: string; status: 'pass' | 'fail' | 'skip' | 'holiday'; expanded: boolean; onToggle: () => void
}) {
  const Icon = status === 'pass' ? CheckCircle : status === 'fail' ? XCircle : MinusCircle
  const color = { pass: 'text-emerald-400', fail: 'text-red-400', skip: 'text-slate-600', holiday: 'text-amber-400' }[status]
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
    >
      <Icon size={15} className={color} />
      <span className="text-[12px] font-semibold text-slate-200 flex-1">{label}</span>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
        status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' :
        status === 'fail' ? 'bg-red-500/10 text-red-400' :
        status === 'holiday' ? 'bg-amber-500/10 text-amber-400' :
        'bg-slate-700 text-slate-500'
      }`}>{status}</span>
      {expanded ? <ChevronDown size={13} className="text-slate-600" /> : <ChevronRight size={13} className="text-slate-600" />}
    </button>
  )
}

export default function Reasoner() {
  const users     = useStore(s => s.users)
  const doors     = useStore(s => s.doors)
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const schedules = useStore(s => s.schedules)
  const policies  = useStore(s => s.policies)
  const zones     = useStore(s => s.zones)
  const sites     = useStore(s => s.sites)
  const controllers = useStore(s => s.controllers)

  const location = useLocation()
  const navState = (location.state ?? {}) as OracleNavState

  const [selectedUserId,  setSelectedUserId]  = useState(navState.userId ?? users[0]?.id ?? '')
  const [selectedDoorId,  setSelectedDoorId]  = useState(navState.doorId ?? doors[0]?.id ?? '')
  const [selectedAction,  setSelectedAction]  = useState<ActionType>('unlock')
  const [result, setResult] = useState<AccessResult | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]))

  const store = useMemo(() => ({
    allUsers: users, allGroups: groups, allGrants: grants,
    allSchedules: schedules, allPolicies: policies, allDoors: doors,
    allZones: zones, allSites: sites, allControllers: controllers,
  }), [users, groups, grants, schedules, policies, doors, zones, sites, controllers])

  function toggleStep(i: number) {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function runTrace() {
    const user = users.find(u => u.id === selectedUserId)
    const door = doors.find(d => d.id === selectedDoorId)
    if (!user || !door) return
    const now = buildNowContext()
    setResult(evaluateAccess(user, door, store, now, selectedAction))
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0b0e18]">
      {/* Input strip */}
      <div className="border-b border-[#141828] px-4 py-3 flex items-end gap-3 shrink-0 bg-[#08090f]">
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Person</label>
          <select
            value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); setResult(null) }}
            className="bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Door</label>
          <select
            value={selectedDoorId}
            onChange={e => { setSelectedDoorId(e.target.value); setResult(null) }}
            className="bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {doors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Action</label>
          <select
            value={selectedAction}
            onChange={e => { setSelectedAction(e.target.value as ActionType); setResult(null) }}
            className="bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {(['unlock','arm','disarm','view_logs','lockdown'] as ActionType[]).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          onClick={runTrace}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-[11px] font-bold hover:from-cyan-500 hover:to-teal-500 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.25)]"
        >
          Trace
        </button>
        {result && (
          <div className="ml-auto text-[10px] text-slate-500 font-mono">
            {result.nowContext.dayOfWeek} {String(result.nowContext.hour).padStart(2,'0')}:{String(result.nowContext.minute).padStart(2,'0')}
            {result.activeHoliday && <span className="ml-2 text-amber-400">🏖 {result.activeHoliday.name}</span>}
          </div>
        )}
      </div>

      {!result ? (
        <div className="flex-1 flex items-center justify-center text-[#374151] text-[12px]">
          Select a person, door, and action — then click Trace
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto divide-y divide-[#141828]">

            {/* Step 1: Group Membership */}
            <div>
              <StepHeader
                label="1 · Group Membership"
                status={result.groupChain.length > 0 ? 'pass' : 'skip'}
                expanded={expandedSteps.has(0)}
                onToggle={() => toggleStep(0)}
              />
              {expandedSteps.has(0) && (
                <div className="px-6 pb-3 space-y-2">
                  {result.groupChain.length === 0 ? (
                    <p className="text-[10px] text-slate-600">User is not a member of any group.</p>
                  ) : (
                    result.groupChain.map((name, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <CheckCircle size={11} className="text-emerald-400 shrink-0" />
                        <span className="text-slate-300">{name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Grant Collection */}
            <div>
              <StepHeader
                label="2 · Grant Collection"
                status={result.grantResults.length > 0 ? (result.permissionGranted ? 'pass' : 'fail') : 'skip'}
                expanded={expandedSteps.has(1)}
                onToggle={() => toggleStep(1)}
              />
              {expandedSteps.has(1) && (
                <div className="px-6 pb-3 space-y-2">
                  {result.grantResults.length === 0 ? (
                    <p className="text-[10px] text-slate-600">No grants cover this door + action.</p>
                  ) : (
                    result.grantResults.map(gr => (
                      <div key={gr.grantId}
                        className={`rounded-lg border px-3 py-2 ${gr.included ? 'border-emerald-900/50 bg-emerald-500/[0.04]' : 'border-[#1e293b] bg-[#0f1117]'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-slate-200">{gr.grantName}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${gr.included ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/[0.08] text-red-400'}`}>
                            {gr.included ? 'INCLUDED' : 'EXCLUDED'}
                          </span>
                        </div>
                        <div className="text-[9px] text-[#374151] space-y-0.5">
                          <div>Mode: <span className="text-slate-500">{gr.applicationMode}</span></div>
                          {gr.scheduleStatus !== null && (
                            <div>Schedule: <span className={
                              gr.scheduleStatus === 'active' ? 'text-emerald-400' :
                              gr.scheduleStatus === 'override_active' ? 'text-amber-400' :
                              'text-red-400'
                            }>{gr.scheduleStatus}{gr.activeHolidayName ? ` · 🏖 ${gr.activeHolidayName}` : ''}</span></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Schedule Evaluation */}
            <div>
              <StepHeader
                label="3 · Schedule Evaluation"
                status={
                  result.activeHoliday ? 'holiday' :
                  result.grantResults.some(g => g.scheduleStatus === 'inactive') ? 'fail' : 'pass'
                }
                expanded={expandedSteps.has(2)}
                onToggle={() => toggleStep(2)}
              />
              {expandedSteps.has(2) && (
                <div className="px-6 pb-3 space-y-1.5">
                  {result.activeHoliday && (
                    <div className="text-[10px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/20 rounded px-3 py-2">
                      🏖 <span className="font-semibold">{result.activeHoliday.name}</span> in effect — holiday rules apply
                    </div>
                  )}
                  {result.grantResults.filter(g => g.scheduleStatus !== null).map(gr => (
                    <div key={gr.grantId} className="flex items-center gap-2 text-[10px]">
                      {gr.scheduleStatus === 'active' || gr.scheduleStatus === 'override_active'
                        ? <CheckCircle size={11} className="text-emerald-400 shrink-0" />
                        : <XCircle size={11} className="text-red-400 shrink-0" />
                      }
                      <span className="text-slate-400">{gr.grantName}:</span>
                      <span className={
                        gr.scheduleStatus === 'active' ? 'text-emerald-400' :
                        gr.scheduleStatus === 'override_active' ? 'text-amber-400' : 'text-red-400'
                      }>{gr.scheduleStatus}</span>
                    </div>
                  ))}
                  {result.grantResults.every(g => g.scheduleStatus === null) && (
                    <p className="text-[10px] text-slate-600">No schedules attached to any candidate grant.</p>
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Policy Check */}
            <div>
              <StepHeader
                label="4 · Policy Check"
                status={result.policyResults.length === 0 ? 'skip' : result.abacPassed ? 'pass' : 'fail'}
                expanded={expandedSteps.has(3)}
                onToggle={() => toggleStep(3)}
              />
              {expandedSteps.has(3) && (
                <div className="px-6 pb-3 space-y-3">
                  {result.policyResults.length === 0 ? (
                    <p className="text-[10px] text-slate-600">No policies assigned to this door.</p>
                  ) : (
                    result.policyResults.map(pr => (
                      <div key={pr.policyId} className={`rounded-lg border overflow-hidden ${pr.passed ? 'border-emerald-900/40' : 'border-red-900/40'}`}>
                        <div className={`flex items-center justify-between px-3 py-1.5 ${pr.passed ? 'bg-emerald-500/[0.04]' : 'bg-red-500/[0.04]'}`}>
                          <span className="text-[11px] font-semibold text-slate-300">{pr.policyName}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${pr.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/[0.08] text-red-400'}`}>
                            {pr.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                        <div className="divide-y divide-[#141828]">
                          {pr.ruleResults.map(rr => (
                            <div key={rr.ruleId} className="px-3 py-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="font-mono text-slate-400">{rr.leftSide}</span>
                              <span className="text-blue-400">{rr.operator}</span>
                              <span className="text-amber-300">{Array.isArray(rr.rightSide) ? rr.rightSide.join(', ') : rr.rightSide}</span>
                              <span className="text-slate-600">→</span>
                              <span className="text-slate-300">{rr.leftResolved}</span>
                              <span className="text-slate-600">→</span>
                              {rr.passed
                                ? <span className="text-emerald-400 font-bold">PASS</span>
                                : <span className="text-red-400 font-bold">FAIL</span>
                              }
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Step 5: Final Verdict */}
            <div>
              <StepHeader
                label="5 · Final Verdict"
                status={result.overallGranted ? 'pass' : 'fail'}
                expanded={expandedSteps.has(4)}
                onToggle={() => toggleStep(4)}
              />
              {expandedSteps.has(4) && (
                <div className="px-6 pb-4">
                  <div className={`rounded-xl border-2 p-6 flex items-center justify-center gap-4 ${
                    result.overallGranted
                      ? 'bg-emerald-950/30 border-emerald-500'
                      : 'bg-red-950/30 border-red-500'
                  }`}>
                    {result.overallGranted
                      ? <><CheckCircle size={28} className="text-emerald-400" /><span className="text-2xl font-black tracking-widest text-emerald-400">ACCESS GRANTED</span></>
                      : <><XCircle size={28} className="text-red-400" /><span className="text-2xl font-black tracking-widest text-red-400">ACCESS DENIED</span></>
                    }
                  </div>
                  {!result.overallGranted && (
                    <p className="text-[10px] text-slate-600 text-center mt-2">
                      {!result.permissionGranted ? 'Permission layer: no matching grant' : 'ABAC layer: policy check failed'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
