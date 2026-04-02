import React from 'react';
import type { ClearanceLevel } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'slate' | 'green' | 'red' | 'yellow' | 'purple';
  clearance?: ClearanceLevel;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', clearance }) => {
  let colors = 'bg-slate-800 text-slate-400 border-slate-700';
  
  if (clearance) {
    switch (clearance) {
      case 'Unclassified': variant = 'slate'; break;
      case 'Confidential': variant = 'blue'; break;
      case 'Secret': variant = 'purple'; break;
      case 'TopSecret': variant = 'red'; break;
    }
  }

  switch (variant) {
    case 'blue': colors = 'bg-blue-600/10 text-blue-400 border-blue-600/20'; break;
    case 'green': colors = 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20'; break;
    case 'red': colors = 'bg-rose-600/10 text-rose-400 border-rose-600/20'; break;
    case 'yellow': colors = 'bg-amber-600/10 text-amber-400 border-amber-600/20'; break;
    case 'purple': colors = 'bg-violet-600/10 text-violet-400 border-violet-600/20'; break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${colors}`}>
      {children}
    </span>
  );
};
