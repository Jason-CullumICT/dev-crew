import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
  description?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', icon: Icon, description }) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {(title || Icon) && (
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-blue-500" />}
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">{title}</h3>
              {description && <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">{description}</p>}
            </div>
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
