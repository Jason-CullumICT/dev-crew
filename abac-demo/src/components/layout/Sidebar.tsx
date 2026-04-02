import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  DoorOpen, 
  Cpu, 
  ShieldCheck, 
  TestTube, 
  Grid3X3 
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/doors', icon: DoorOpen, label: 'Doors' },
  { to: '/controllers', icon: Cpu, label: 'Controllers' },
  { to: '/policies', icon: ShieldCheck, label: 'Policies' },
  { to: '/test', icon: TestTube, label: 'Test Access' },
  { to: '/matrix', icon: Grid3X3, label: 'Access Matrix' },
];

export const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 text-blue-500 font-bold text-xl uppercase tracking-wider">
          <ShieldCheck className="w-8 h-8" />
          <span>ABAC Admin</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 py-4">
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
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center">
          Enterprise Security v1.0
        </div>
      </div>
    </div>
  );
};
