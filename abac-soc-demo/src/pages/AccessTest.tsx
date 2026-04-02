import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { evaluateAccess } from '../engine/evaluateAccess';
import { Card } from '../components/common/Card';
import { CheckCircle2, XCircle, ShieldAlert, ChevronDown, ChevronUp, History, KeyRound } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const AccessTestPage: React.FC = () => {
  const { users, doors, policies, groups, grants, addArmingLog, sites } = useStore();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDoorId, setSelectedDoorId] = useState('');
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  const evaluation = useMemo(() => {
    const user = users.find(u => u.id === selectedUserId);
    const door = doors.find(d => d.id === selectedDoorId);
    
    if (!user || !door) return null;

    const doorPolicies = policies.filter(p => p.doorIds.includes(door.id));
    const result = evaluateAccess(user, door, doorPolicies, groups, grants);

    addArmingLog({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userName: user.name,
      action: 'Tested Unlock',
      siteName: sites.find(s => s.id === door.siteId)?.name || 'Unknown',
      result: result.overallGranted ? 'Success' : 'Denied'
    });

    return result;
  }, [selectedUserId, selectedDoorId, users, doors, policies, groups, grants, sites, addArmingLog]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card title="Simulate Access Request" icon={ShieldAlert}>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Subject (User)</label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/50">
              <option value="">-- Choose User --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Resource (Door)</label>
            <select value={selectedDoorId} onChange={(e) => setSelectedDoorId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/50">
              <option value="">-- Choose Door --</option>
              {doors.map(d => <option key={d.id} value={d.id}>{d.name} [{d.location}]</option>)}
            </select>
          </div>
        </div>
      </Card>

      {evaluation && (
        <div className="space-y-6">
          <div className={`p-8 rounded-3xl border-2 flex items-center justify-between transition-all ${evaluation.overallGranted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-2xl ${evaluation.overallGranted ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-950'}`}>
                {evaluation.overallGranted ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Access {evaluation.overallGranted ? 'Granted' : 'Denied'}</h2>
                <p className="text-sm font-medium opacity-70">{evaluation.overallGranted ? `Passed Permission Check & Matched ABAC Policy: ${evaluation.matchedPolicy}` : 'Failed one or more security layers.'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4"><KeyRound className="w-5 h-5 text-amber-500"/><h3 className="font-bold text-slate-100">Layer 1: Explicit Grants</h3></div>
              <div className={`p-4 rounded-xl border flex items-center justify-between ${evaluation.permissionGranted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                <span className="font-bold text-sm">Has 'unlock' permission?</span>
                {evaluation.permissionGranted ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4"><ShieldAlert className="w-5 h-5 text-blue-500"/><h3 className="font-bold text-slate-100">Layer 2: ABAC Policies</h3></div>
              <div className={`p-4 rounded-xl border flex items-center justify-between ${evaluation.abacGranted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                <span className="font-bold text-sm">Satisfies door policies?</span>
                {evaluation.abacGranted ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><History className="w-4 h-4" /> ABAC Logic Breakdown</h3>
            {evaluation.policyResults.map((pr) => (
              <div key={pr.policyId} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedPolicyId(expandedPolicyId === pr.policyId ? null : pr.policyId)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50">
                  <div className="flex items-center gap-3">{pr.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}<span className={`text-sm font-bold ${pr.passed ? 'text-slate-100' : 'text-slate-400'}`}>Policy: {pr.policyName}</span></div>
                  {expandedPolicyId === pr.policyId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedPolicyId === pr.policyId && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-800 bg-slate-950/30 space-y-3">
                    {pr.ruleResults.map((rr, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${rr.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono text-blue-400">{rr.attribute}</span><span className="text-xs font-bold text-amber-500">{rr.operator}</span><span className="text-xs font-mono text-slate-300">{Array.isArray(rr.value) ? `[${rr.value.join(',')}]` : rr.value}</span></div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Result: <span className={rr.passed ? 'text-emerald-500' : 'text-rose-500'}>{rr.reason}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
