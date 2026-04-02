import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, User as UserIcon } from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const pathName = location.pathname.substring(1) || 'Dashboard';
  const title = pathName.charAt(0).toUpperCase() + pathName.slice(1);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide">{title}</h1>
      
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search across entities..." 
            className="bg-slate-900 border border-slate-800 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 w-64 transition-all"
          />
        </div>
        
        <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-950"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-200">Security Admin</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Global Controller</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
            <UserIcon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </header>
  );
};
