import React from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { 
  Users, Building2, BellRing, CheckSquare, ShieldCheck, Activity, ShieldAlert
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { users, sites, tasks, armingLogs, zones } = useStore();

  const armedSitesCount = sites.filter(s => s.status === 'Armed' || s.status === 'PartialArm' || s.status === 'Lockdown').length;
  const activeAlarmsCount = sites.filter(s => s.status === 'Alarm').length + zones.filter(z => z.status === 'Alarm').length;
  const openTasksCount = tasks.filter(t => t.status === 'Open' || t.status === 'InProgress').length;
  const overdueTasks = tasks.filter(t => (t.status === 'Open' || t.status === 'InProgress') && new Date(t.dueDate) < new Date());

  const stats = [
    { label: 'Active Users', value: users.length, icon: Users, color: 'text-blue-500' },
    { label: 'Total Sites', value: sites.length, icon: Building2, color: 'text-slate-400' },
    { label: 'Armed Sites', value: armedSitesCount, icon: ShieldCheck, color: 'text-emerald-500' },
    { label: 'Active Alarms', value: activeAlarmsCount, icon: BellRing, color: activeAlarmsCount > 0 ? 'text-rose-500' : 'text-slate-500' },
    { label: 'Open Tasks', value: openTasksCount, icon: CheckSquare, color: 'text-amber-500' },
  ];

  const getSiteStatusColor = (status: string) => {
    switch(status) {
      case 'Disarmed': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500';
      case 'PartialArm': return 'border-amber-500/30 bg-amber-500/10 text-amber-500';
      case 'Armed': return 'border-rose-500/30 bg-rose-500/10 text-rose-500';
      case 'Alarm': return 'border-red-600/50 bg-red-600/20 text-red-500 animate-pulse';
      case 'Lockdown': return 'border-red-900 bg-red-950 text-red-600';
      default: return 'border-slate-700 bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-slate-700 transition-colors`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card title="Site Overview" icon={Building2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sites.map(site => (
                <div key={site.id} className={`p-4 rounded-xl border flex items-center justify-between ${getSiteStatusColor(site.status)}`}>
                  <div>
                    <div className="font-bold">{site.name}</div>
                    <div className="text-xs opacity-70 mt-1">{site.address}</div>
                  </div>
                  <Badge variant={site.status === 'Disarmed' ? 'green' : site.status === 'PartialArm' ? 'yellow' : 'red'}>
                    {site.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Arming Events" icon={Activity}>
            <div className="space-y-3">
              {armingLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm italic">No recent events</div>
              ) : (
                armingLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm">
                    <div>
                      <span className="font-bold text-slate-200">{log.userName}</span>
                      <span className="text-slate-500 mx-2">{log.action}</span>
                      <span className="font-medium text-slate-300">{log.siteName}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${log.result.includes('Success') ? 'text-emerald-500' : 'text-rose-500'}`}>{log.result}</div>
                      <div className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="Overdue Tasks" icon={ShieldAlert}>
            <div className="space-y-3">
              {overdueTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm italic">No overdue tasks</div>
              ) : (
                overdueTasks.map(task => (
                  <div key={task.id} className="p-3 rounded-lg bg-slate-950 border border-rose-900/50 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-slate-200 line-clamp-1">{task.title}</span>
                      <Badge variant="red">{task.priority}</Badge>
                    </div>
                    <div className="text-xs text-rose-500 font-medium">Due: {new Date(task.dueDate).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
