import { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../store/store';
import { evaluateAccess } from '../engine/accessEngine';
import type { User, Door, AccessResult, PolicyResult } from '../types';

interface ModalState {
  user: User;
  door: Door;
  result: AccessResult;
}

function ResultBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
        passed ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
      }`}
    >
      {passed ? 'GRANTED' : 'DENIED'}
    </span>
  );
}

function PolicyResultRow({ pr }: { pr: PolicyResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-700 rounded mb-2">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-750 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium text-gray-200">{pr.policyName}</span>
        <div className="flex items-center gap-2">
          <ResultBadge passed={pr.passed} />
          <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <table className="w-full text-xs text-gray-300">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="text-left py-1 pr-2">Attribute</th>
                <th className="text-left py-1 pr-2">Operator</th>
                <th className="text-left py-1 pr-2">Expected</th>
                <th className="text-left py-1 pr-2">Actual</th>
                <th className="text-left py-1">Result</th>
              </tr>
            </thead>
            <tbody>
              {pr.ruleResults.map((r) => (
                <tr key={r.ruleId} className="border-b border-gray-800 last:border-0">
                  <td className="py-1 pr-2 font-mono">{r.attribute}</td>
                  <td className="py-1 pr-2 font-mono">{r.operator}</td>
                  <td className="py-1 pr-2 font-mono">
                    {Array.isArray(r.value) ? r.value.join(', ') : r.value}
                  </td>
                  <td className="py-1 pr-2 font-mono">{r.actual}</td>
                  <td className="py-1">
                    <span
                      className={`font-bold ${r.passed ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {r.passed ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BreakdownModal({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  const { user, door, result } = modal;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Access Breakdown</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="text-blue-400">{user.name}</span>
              <span className="text-gray-600 mx-2">→</span>
              <span className="text-purple-400">{door.name}</span>
            </p>
          </div>
          <button
            className="text-gray-500 hover:text-gray-200 text-xl leading-none focus:outline-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Overall result */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Overall Result</span>
            <ResultBadge passed={result.overallGranted} />
          </div>

          {/* Permission layer */}
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Permission Layer (RBAC)</span>
              <ResultBadge passed={result.permissionGranted} />
            </div>
            {result.matchedGrants.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {result.matchedGrants.map((g) => (
                  <span
                    key={g}
                    className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded"
                  >
                    {g}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-500">No matching grants</span>
            )}
          </div>

          {/* ABAC layer */}
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">ABAC Layer (Policies)</span>
              <ResultBadge passed={result.abacGranted} />
            </div>
            {result.matchedPolicy && (
              <p className="text-xs text-gray-400 mb-2">
                Matched policy: <span className="text-green-400">{result.matchedPolicy}</span>
              </p>
            )}
            {result.policyResults.length > 0 ? (
              result.policyResults.map((pr) => (
                <PolicyResultRow key={pr.policyId} pr={pr} />
              ))
            ) : (
              <span className="text-xs text-gray-500">No policies assigned to this door</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ROW_HEIGHT = 36;
const COL_WIDTH = 80;
const ROW_HEADER_WIDTH = 160;
const COL_HEADER_HEIGHT = 90;

export default function AccessMatrix() {
  const users = useStore((s) => s.users);
  const doors = useStore((s) => s.doors);
  const policies = useStore((s) => s.policies);
  const groups = useStore((s) => s.groups);
  const grants = useStore((s) => s.grants);

  const parentRef = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const columnVirtualizer = useVirtualizer({
    count: doors.length,
    horizontal: true,
    getScrollElement: () => parentRef.current,
    estimateSize: () => COL_WIDTH,
    overscan: 5,
  });

  const handleCellClick = useCallback(
    (user: User, door: Door) => {
      const result = evaluateAccess(user, door, policies, groups, grants);
      setModal({ user, door, result });
    },
    [policies, groups, grants],
  );

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const totalWidth = columnVirtualizer.getTotalSize();

  if (users.length === 0 || doors.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Access Matrix</h1>
        <p className="text-gray-400">No users or doors configured. Add users and doors to see the access matrix.</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full">
      <h1 className="text-2xl font-bold text-white mb-4">Access Matrix</h1>

      <div className="flex-1 relative overflow-hidden border border-gray-700 rounded-lg bg-gray-900">
        {/* Column header row (sticky top, offset by row header width) */}
        <div
          className="sticky top-0 z-20 bg-gray-900 flex"
          style={{ height: COL_HEADER_HEIGHT }}
        >
          {/* Corner cell */}
          <div
            className="sticky left-0 z-30 bg-gray-900 border-b border-r border-gray-700 flex-shrink-0"
            style={{ width: ROW_HEADER_WIDTH, height: COL_HEADER_HEIGHT }}
          />
          {/* Column headers container */}
          <div
            className="relative overflow-hidden flex-1"
            style={{ height: COL_HEADER_HEIGHT }}
          >
            <div style={{ width: totalWidth, height: COL_HEADER_HEIGHT, position: 'relative' }}>
              {virtualColumns.map((vc) => {
                const door = doors[vc.index];
                return (
                  <div
                    key={vc.key}
                    className="absolute top-0 bottom-0 border-b border-r border-gray-700 flex items-end justify-center pb-2"
                    style={{
                      left: vc.start,
                      width: vc.size,
                    }}
                  >
                    <span
                      className="text-xs text-gray-300 font-medium whitespace-nowrap overflow-hidden"
                      style={{
                        display: 'block',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'bottom center',
                        maxWidth: 70,
                        textOverflow: 'ellipsis',
                      }}
                      title={door.name}
                    >
                      {door.name.length > 10 ? door.name.slice(0, 10) + '…' : door.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: 'calc(100vh - 260px)' }}
        >
          <div
            style={{
              width: ROW_HEADER_WIDTH + totalWidth,
              height: totalHeight,
              position: 'relative',
            }}
          >
            {virtualRows.map((vr) => {
              const user = users[vr.index];
              return (
                <div
                  key={vr.key}
                  style={{
                    position: 'absolute',
                    top: vr.start,
                    left: 0,
                    width: ROW_HEADER_WIDTH + totalWidth,
                    height: vr.size,
                    display: 'flex',
                  }}
                >
                  {/* Row header */}
                  <div
                    className="sticky left-0 z-10 bg-gray-900 border-b border-r border-gray-700 flex items-center px-3 flex-shrink-0"
                    style={{ width: ROW_HEADER_WIDTH, height: vr.size }}
                  >
                    <span
                      className="text-xs text-gray-300 font-medium truncate"
                      title={user.name}
                    >
                      {user.name}
                    </span>
                  </div>

                  {/* Cells container */}
                  <div
                    style={{
                      position: 'relative',
                      width: totalWidth,
                      height: vr.size,
                      flexShrink: 0,
                    }}
                  >
                    {virtualColumns.map((vc) => {
                      const door = doors[vc.index];
                      const result = evaluateAccess(user, door, policies, groups, grants);
                      const granted = result.overallGranted;
                      return (
                        <div
                          key={vc.key}
                          onClick={() => handleCellClick(user, door)}
                          className={`absolute flex items-center justify-center border-b border-r border-gray-800 cursor-pointer text-sm font-bold select-none transition-opacity hover:opacity-80 ${
                            granted
                              ? 'bg-green-900/60 text-green-400'
                              : 'bg-red-900/40 text-red-500'
                          }`}
                          style={{
                            left: vc.start,
                            width: vc.size,
                            height: vr.size,
                          }}
                          title={`${user.name} → ${door.name}: ${granted ? 'Granted' : 'Denied'}`}
                        >
                          {granted ? '✓' : '✗'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modal && (
        <BreakdownModal modal={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
