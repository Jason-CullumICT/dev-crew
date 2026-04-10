import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Shield, Users, UsersRound,
  Key, DoorOpen, Cpu, FileText, ClipboardList,
  TestTube, Grid3X3, CalendarClock,
} from 'lucide-react';

const primaryNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/schedules', icon: CalendarClock, label: 'Schedules' },
  { to: '/groups', icon: UsersRound, label: 'Groups' },
  { to: '/policies', icon: FileText, label: 'Policies' },
  { to: '/permissions', icon: Key, label: 'Permissions' },
  { to: '/users', icon: Users, label: 'People' },
  { to: '/sites', icon: Building2, label: 'Infrastructure' },
];

const secondaryNavItems = [
  { to: '/arming', icon: Shield, label: 'Arming' },
  { to: '/doors', icon: DoorOpen, label: 'Doors' },
  { to: '/controllers', icon: Cpu, label: 'Controllers' },
  { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/test', icon: TestTube, label: 'Test Access' },
  { to: '/matrix', icon: Grid3X3, label: 'Access Matrix' },
];

function NowPill() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[time.getDay()];
  const h = String(time.getHours()).padStart(2, '0');
  const m = String(time.getMinutes()).padStart(2, '0');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace(/_/g, ' ') ?? '';

  return (
    <div className="flex items-center gap-1.5 bg-[#071a0e] border border-[#14532d] rounded-full px-3 py-1 text-xs text-green-400 font-mono shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      {day} {h}:{m}
      {tz && <span className="text-green-600 ml-0.5">{tz}</span>}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-[#080c14] text-zinc-100 overflow-hidden">
      {/* Top nav */}
      <header className="h-[46px] shrink-0 bg-[#060a10] border-b border-[#0f172a] flex items-center px-4 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0 mr-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-white text-sm tracking-wide whitespace-nowrap">SOC Platform</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 hide-scrollbar">
          {primaryNavItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f172a]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <span className="mx-1 text-slate-700 select-none shrink-0">|</span>
          {secondaryNavItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#0f172a]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Clock pill */}
        <NowPill />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
