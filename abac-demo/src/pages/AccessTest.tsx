import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { evaluateAccess } from '../engine/evaluateAccess';
import { Card } from '../components/common/Card';
import { CheckCircle2, XCircle, ShieldAlert, ChevronDown, ChevronUp, History } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const AccessTestPage: React.FC = () => {
  const { users, doors, policies, addTestLog } = useStore();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDoorId, setSelectedDoorId] = useState('');
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  const evaluation = useMemo(() => {
    const user = users.find(u => u.id === selectedUserId);
    const door = doors.find(d => d.id === selectedDoorId);
    
    if (!user || !door) return null;

    const doorPolicies = policies.filter(p => p.doorIds.includes(door.id));
    const result = evaluateAccess(user, door, doorPolicies);

    // Save to history automatically
    addTestLog({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userName: user.name,
      doorName: door.name,
      granted: result.granted
    });

    return result;
  }, [selectedUserId, selectedDoorId, users, doors, policies, addTestLog]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <Card title="Simulate Access Request" icon={ShieldAlert}>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Subject (User)</label>
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-blue-600/50 outline-none"
            >
              <option value="">-- Choose User --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Resource (Door)</label>
            <select 
              value={selectedDoorId}
              onChange={(e) => setSelectedDoorId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-blue-600/50 outline-none"
            >
              <option value="">-- Choose Door --</option>
              {doors.map(d => (
                <option key={d.id} value={d.id}>{d.name} [{d.location}]</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {evaluation ? (
        <div className="space-y-6">
          <div className={`p-8 rounded-3xl border-2 flex items-center justify-between transition-all ${
            evaluation.granted 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-2xl ${evaluation.granted ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-950'}`}>
                {evaluation.granted ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Access {evaluation.granted ? 'Granted' : 'Denied'}</h2>
                <p className="text-sm font-medium opacity-70">
                  {evaluation.granted 
                    ? `Matched policy: ${evaluation.matchedPolicy}` 
                    : 'No policies matched the subject attributes for this resource.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4" /> Evaluation Logic Breakdown
            </h3>
            
            {evaluation.policyResults.length === 0 ? (
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 italic text-sm">
                This door has no policies assigned. By default, access is denied.
              </div>
            ) : (
              evaluation.policyResults.map((pr) => (
                <div key={pr.policyId} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setExpandedPolicyId(expandedPolicyId === pr.policyId ? null : pr.policyId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {pr.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                      <span className={`text-sm font-bold ${pr.passed ? 'text-slate-100' : 'text-slate-400'}`}>
                        Policy: {pr.policyName}
                      </span>
                    </div>
                    {expandedPolicyId === pr.policyId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {expandedPolicyId === pr.policyId && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-800 bg-slate-950/30">
                      <div className="space-y-3">
                        {pr.ruleResults.map((rr, idx) => (
                          <div key={idx} className="flex items-start gap-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${rr.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-blue-400">{rr.attribute}</span>
                                <span className="text-xs font-bold text-amber-500">{rr.operator}</span>
                                <span className="text-xs font-mono text-slate-300">{Array.isArray(rr.value) ? `[${rr.value.join(',')}]` : rr.value}</span>
                              </div>
                              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                                Result: <span className={rr.passed ? 'text-emerald-500' : 'text-rose-500'}>{rr.reason}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-slate-800 rounded-3xl opacity-50">
          <ShieldAlert className="w-12 h-12 text-slate-700" />
          <p className="text-slate-500 font-medium">Select a user and a door to begin security evaluation.</p>
        </div>
      )}
    </div>
  );
};
