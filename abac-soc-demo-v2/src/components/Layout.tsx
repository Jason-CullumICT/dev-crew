import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Shield, Users, UsersRound,
  Key, DoorOpen, Cpu, FileText, ClipboardList,
  TestTube, Grid3X3,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/sites', icon: Building2, label: 'Sites' },
  { to: '/arming', icon: Shield, label: 'Arming' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/groups', icon: UsersRound, label: 'Groups' },
  { to: '/permissions', icon: Key, label: 'Permissions' },
  { to: '/doors', icon: DoorOpen, label: 'Doors' },
  { to: '/controllers', icon: Cpu, label: 'Controllers' },
  { to: '/policies', icon: FileText, label: 'Policies' },
  { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/test', icon: TestTube, label: 'Test Access' },
  { to: '/matrix', icon: Grid3X3, label: 'Access Matrix' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-white text-sm tracking-wide">SOC Platform</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Security Management</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border-r-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-slate-700">
          <p className="text-xs text-slate-500">Session-storage demo</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
