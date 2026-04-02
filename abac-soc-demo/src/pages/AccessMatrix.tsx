import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { evaluateAccess } from '../engine/evaluateAccess';
import { Card } from '../components/common/Card';
import { Check, X, Grid3X3 } from 'lucide-react';

export const AccessMatrixPage: React.FC = () => {
  const { users, doors, policies, groups, grants } = useStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100 uppercase tracking-wide flex items-center gap-3">
          <Grid3X3 className="w-6 h-6 text-blue-500" />
          Global Access Matrix (Hybrid Model)
        </h2>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
          Evaluating {users.length} Users × {doors.length} Doors
        </div>
      </div>

      <Card className="flex-1 p-0 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 scrollbar-hide" ref={parentRef}>
          <div className="min-w-max">
            <div className="flex sticky top-0 z-20 bg-slate-900 border-b border-slate-800">
              <div className="w-64 shrink-0 px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-800 flex items-center">
                User / Door Target
              </div>
              {doors.map(door => (
                <div key={door.id} className="w-32 shrink-0 px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-800/50 flex items-center justify-center">
                  <span className="truncate">{door.name}</span>
                </div>
              ))}
            </div>

            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const user = users[virtualRow.index];
                return (
                  <div key={user.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }} className="flex border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                    <div className="w-64 shrink-0 px-6 py-3 border-r border-slate-800 flex flex-col justify-center">
                      <span className="text-xs font-bold text-slate-200 truncate">{user.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest truncate">{user.department}</span>
                    </div>
                    {doors.map(door => {
                      const doorPolicies = policies.filter(p => p.doorIds.includes(door.id));
                      const result = evaluateAccess(user, door, doorPolicies, groups, grants);
                      return (
                        <div key={door.id} className="w-32 shrink-0 border-r border-slate-800/30 flex items-center justify-center">
                          {result.overallGranted ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Check className="w-3.5 h-3.5" strokeWidth={3} /></div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500"><X className="w-3.5 h-3.5" strokeWidth={3} /></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
