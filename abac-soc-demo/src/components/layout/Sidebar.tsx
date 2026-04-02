import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  UsersRound, 
  KeyRound, 
  DoorOpen, 
  Cpu, 
  ShieldCheck, 
  CheckSquare, 
  TestTube, 
  Grid3X3,
  ShieldAlert
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sites', icon: Building2, label: 'Sites & Zones' },
  { to: '/arming', icon: ShieldAlert, label: 'Arming Control' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/groups', icon: UsersRound, label: 'Groups' },
  { to: '/permissions', icon: KeyRound, label: 'Permissions' },
  { to: '/doors', icon: DoorOpen, label: 'Doors' },
  { to: '/controllers', icon: Cpu, label: 'Controllers' },
  { to: '/policies', icon: ShieldCheck, label: 'ABAC Policies' },
  { to: '/tasks', icon: CheckSquare, label: 'Task Board' },
  { to: '/test', icon: TestTube, label: 'Test Access' },
  { to: '/matrix', icon: Grid3X3, label: 'Access Matrix' },
];

export const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 text-blue-500 font-bold text-xl uppercase tracking-wider">
          <ShieldCheck className="w-8 h-8" />
          <span>SOC Admin</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${isActive 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center">
          SOC Enterprise v2.0
        </div>
      </div>
    </div>
  );
};
