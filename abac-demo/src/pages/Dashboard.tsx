import React from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { 
  Users, 
  DoorOpen, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { users, doors, controllers, policies, testLogs } = useStore();

  const stats = [
    { label: 'Active Users', value: users.length, icon: Users, color: 'text-blue-500' },
    { label: 'Secure Doors', value: doors.length, icon: DoorOpen, color: 'text-emerald-500' },
    { label: 'Controllers', value: controllers.length, icon: Cpu, color: 'text-purple-500' },
    { label: 'Policies', value: policies.length, icon: ShieldCheck, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-slate-700 transition-colors`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <Activity className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card 
          title="Recent Access Events" 
          description="Last 5 security evaluations"
          className="lg:col-span-2"
          icon={Activity}
        >
          <div className="space-y-4">
            {testLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic text-sm">
                No access events recorded yet. Use the Test Access panel to generate logs.
              </div>
            ) : (
              testLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800/50 hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${log.granted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {log.granted ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">
                        {log.userName} <span className="text-slate-500 font-normal mx-1">requested access to</span> {log.doorName}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant={log.granted ? 'green' : 'red'}>
                    {log.granted ? 'Granted' : 'Denied'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card 
          title="System Health" 
          description="Service status overview"
          icon={Cpu}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Policy Engine</span>
                <Badge variant="green">Online</Badge>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Virtualization layer</span>
                <Badge variant="green">Stable</Badge>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Storage persistence</span>
                <Badge variant="blue">SessionOnly</Badge>
            </div>
            
            <div className="pt-4 border-t border-slate-800">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Clearance Distribution</div>
              <div className="space-y-2">
                {['Unclassified', 'Confidential', 'Secret', 'TopSecret'].map(level => {
                  const count = users.filter(u => u.clearanceLevel === level).length;
                  const percentage = users.length ? (count / users.length) * 100 : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                        <span className="text-slate-400">{level}</span>
                        <span className="text-slate-500">{count} Users</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            level === 'TopSecret' ? 'bg-rose-500' : 
                            level === 'Secret' ? 'bg-violet-500' : 
                            level === 'Confidential' ? 'bg-blue-500' : 'bg-slate-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
