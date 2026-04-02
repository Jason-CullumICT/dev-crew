import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ShieldCheck, ShieldAlert, Shield, Lock, Unlock, Zap, History, User } from 'lucide-react';
import { hasPermission } from '../engine/evaluateAccess';
import { v4 as uuidv4 } from 'uuid';
import type { SiteStatus } from '../types';

export const ArmingPage: React.FC = () => {
  const { sites, zones, users, groups, grants, addArmingLog, updateSite, updateZone, armingLogs } = useStore();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [actingUserId, setActingUserId] = useState('');

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const actingUser = users.find(u => u.id === actingUserId);

  const handleArmAction = (status: SiteStatus) => {
    if (!actingUser || !selectedSite) return;

    const action = status === 'Disarmed' ? 'disarm' : (status === 'Lockdown' ? 'lockdown' : 'arm');
    const permitted = hasPermission(actingUser, groups, grants, action, selectedSite.id);

    if (!permitted) {
      addArmingLog({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userName: actingUser.name,
        action: `Attempted ${action}`,
        siteName: selectedSite.name,
        result: 'Denied (No Permission)'
      });
      alert(`User ${actingUser.name} does not have permission to ${action} this site.`);
      return;
    }

    updateSite({ ...selectedSite, status });
    
    // Also update all zones if full arm/disarm
    if (status === 'Armed' || status === 'Disarmed') {
      const siteZones = zones.filter(z => z.siteId === selectedSite.id);
      siteZones.forEach(z => {
        updateZone({ ...z, status: status === 'Armed' ? 'Armed' : 'Disarmed' });
      });
    }

    addArmingLog({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userName: actingUser.name,
      action: `Set Site Status: ${status}`,
      siteName: selectedSite.name,
      result: 'Success'
    });
  };

  const getSiteStatusColor = (status: string) => {
    switch(status) {
      case 'Disarmed': return 'text-emerald-500';
      case 'PartialArm': return 'text-amber-500';
      case 'Armed': return 'text-rose-500';
      case 'Alarm': return 'text-red-500 animate-pulse';
      case 'Lockdown': return 'text-red-600 font-black';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1 space-y-6">
          <Card title="Control Context" icon={User}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Acting Security Officer</label>
                <select value={actingUserId} onChange={(e) => setActingUserId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/50">
                  <option value="">-- Select User --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Target Site</label>
                <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/50">
                  <option value="">-- Select Site --</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card title="Event History" icon={History}>
            <div className="space-y-3">
              {armingLogs.slice(0, 8).map(log => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px]">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-300">{log.userName}</span>
                    <span className={log.result === 'Success' ? 'text-emerald-500' : 'text-rose-500'}>{log.result}</span>
                  </div>
                  <div className="text-slate-500 mt-1">{log.action} • {log.siteName}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-2 space-y-6">
          {selectedSite ? (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center justify-between shadow-2xl relative overflow-hidden transition-all">
                <div className="relative z-10">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Current Site Posture</div>
                  <h2 className={`text-5xl font-black uppercase tracking-tighter ${getSiteStatusColor(selectedSite.status)}`}>
                    {selectedSite.status}
                  </h2>
                  <p className="text-slate-400 mt-4 text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" /> {selectedSite.name} Operational Environment
                  </p>
                </div>
                <div className={`p-10 rounded-full bg-slate-950 border-4 shadow-inner ${selectedSite.status === 'Disarmed' ? 'border-emerald-500/20 text-emerald-500' : 'border-rose-500/20 text-rose-500'}`}>
                  {selectedSite.status === 'Disarmed' ? <Unlock className="w-16 h-16" /> : <Lock className="w-16 h-16" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card title="Global Controls" icon={Zap}>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleArmAction('Armed')} className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-tighter flex flex-col items-center gap-2 transition-all">
                      <ShieldCheck className="w-6 h-6" /> ARM SITE
                    </button>
                    <button onClick={() => handleArmAction('Disarmed')} className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-tighter flex flex-col items-center gap-2 transition-all">
                      <Unlock className="w-6 h-6" /> DISARM SITE
                    </button>
                    <button onClick={() => handleArmAction('PartialArm')} className="p-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-tighter flex flex-col items-center gap-2 transition-all">
                      <Shield className="w-6 h-6" /> PARTIAL
                    </button>
                    <button onClick={() => handleArmAction('Lockdown')} className="p-4 rounded-2xl bg-red-950 border border-red-600 text-red-500 font-black uppercase tracking-tighter flex flex-col items-center gap-2 transition-all">
                      <ShieldAlert className="w-6 h-6" /> LOCKDOWN
                    </button>
                  </div>
                </Card>

                <Card title="Zone Status" icon={Shield}>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    {zones.filter(z => z.siteId === selectedSite.id).map(zone => (
                      <div key={zone.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-slate-200">{zone.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase">{zone.type}</div>
                        </div>
                        <Badge variant={zone.status === 'Disarmed' ? 'slate' : 'red'}>{zone.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 opacity-50 space-y-4">
              <Shield className="w-16 h-16" />
              <p className="font-bold uppercase tracking-widest">Select a site to manage arming state</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
