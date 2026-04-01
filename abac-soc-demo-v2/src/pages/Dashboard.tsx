import { useMemo } from 'react';
import { Users, Building2, ShieldAlert, AlertTriangle, ClipboardList } from 'lucide-react';
import { useStore } from '../store/store';
import type { SiteStatus, TaskPriority } from '../types';

const TODAY = new Date().toISOString().slice(0, 10);

function siteStatusBadge(status: SiteStatus) {
  switch (status) {
    case 'Disarmed':
      return 'bg-green-900 text-green-300 border border-green-700';
    case 'PartialArm':
      return 'bg-amber-900 text-amber-300 border border-amber-700';
    case 'Armed':
      return 'bg-red-900 text-red-300 border border-red-700';
    case 'Alarm':
      return 'bg-red-950 text-red-200 border border-red-800';
    case 'Lockdown':
      return 'bg-purple-900 text-purple-300 border border-purple-700';
    default:
      return 'bg-slate-700 text-slate-300 border border-slate-600';
  }
}

function priorityBadge(priority: TaskPriority) {
  switch (priority) {
    case 'Critical':
      return 'bg-red-900 text-red-300 border border-red-700';
    case 'High':
      return 'bg-orange-900 text-orange-300 border border-orange-700';
    case 'Medium':
      return 'bg-yellow-900 text-yellow-300 border border-yellow-700';
    case 'Low':
      return 'bg-slate-700 text-slate-300 border border-slate-600';
    default:
      return 'bg-slate-700 text-slate-300 border border-slate-600';
  }
}

export default function Dashboard() {
  const users = useStore((s) => s.users);
  const sites = useStore((s) => s.sites);
  const tasks = useStore((s) => s.tasks);
  const armingLogs = useStore((s) => s.armingLogs);

  const activeUserCount = useMemo(
    () => users.filter((u) => u.status === 'Active').length,
    [users],
  );

  const armedSiteCount = useMemo(
    () => sites.filter((s) => s.status === 'Armed').length,
    [sites],
  );

  const activeAlarmCount = useMemo(
    () => sites.filter((s) => s.status === 'Alarm' || s.status === 'Lockdown').length,
    [sites],
  );

  const openTaskCount = useMemo(
    () => tasks.filter((t) => t.status === 'Open' || t.status === 'InProgress').length,
    [tasks],
  );

  const recentArmingLogs = useMemo(() => armingLogs.slice(0, 10), [armingLogs]);

  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.dueDate < TODAY &&
          t.status !== 'Complete' &&
          t.status !== 'Cancelled',
      ),
    [tasks],
  );

  const siteNameById = useMemo(() => {
    const map: Record<string, string> = {};
    sites.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [sites]);

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 p-6 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Security Operations Overview</p>
      </div>

      {/* Count widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Active Users */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Users</span>
            <span className="p-1.5 rounded-md bg-blue-950 text-blue-400">
              <Users size={16} />
            </span>
          </div>
          <span className="text-3xl font-bold text-blue-400">{activeUserCount}</span>
        </div>

        {/* Total Sites */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Sites</span>
            <span className="p-1.5 rounded-md bg-indigo-950 text-indigo-400">
              <Building2 size={16} />
            </span>
          </div>
          <span className="text-3xl font-bold text-indigo-400">{sites.length}</span>
        </div>

        {/* Armed Sites */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Armed Sites</span>
            <span className="p-1.5 rounded-md bg-red-950 text-red-400">
              <ShieldAlert size={16} />
            </span>
          </div>
          <span className="text-3xl font-bold text-red-400">{armedSiteCount}</span>
        </div>

        {/* Active Alarms */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Alarms</span>
            <span className="p-1.5 rounded-md bg-orange-950 text-orange-400">
              <AlertTriangle size={16} />
            </span>
          </div>
          <span className="text-3xl font-bold text-orange-400">{activeAlarmCount}</span>
        </div>

        {/* Open Tasks */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Open Tasks</span>
            <span className="p-1.5 rounded-md bg-yellow-950 text-yellow-400">
              <ClipboardList size={16} />
            </span>
          </div>
          <span className="text-3xl font-bold text-yellow-400">{openTaskCount}</span>
        </div>
      </div>

      {/* Site overview grid */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-3">Site Overview</h2>
        {sites.length === 0 ? (
          <p className="text-sm text-slate-500">No sites configured.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-100 leading-tight">{site.name}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${siteStatusBadge(site.status)}`}
                  >
                    {site.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-snug">{site.address}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent arming events table */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-3">Recent Arming Events</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {recentArmingLogs.length === 0 ? (
            <p className="text-sm text-slate-500 p-4">No arming events recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                      Time
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                      User
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                      Action
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                      Site
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentArmingLogs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/60'}
                    >
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-200 whitespace-nowrap">{log.userName}</td>
                      <td className="px-4 py-3 text-slate-300 capitalize whitespace-nowrap">{log.action}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{log.siteName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            log.result === 'Success'
                              ? 'bg-green-900 text-green-300 border border-green-700'
                              : 'bg-red-900 text-red-300 border border-red-700'
                          }`}
                        >
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Overdue tasks */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-3">Overdue Tasks</h2>
        {overdueTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No overdue tasks.</p>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700">
            {overdueTasks.map((task) => (
              <div key={task.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 truncate">{task.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {siteNameById[task.siteId] ?? task.siteId}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityBadge(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">Due {task.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
