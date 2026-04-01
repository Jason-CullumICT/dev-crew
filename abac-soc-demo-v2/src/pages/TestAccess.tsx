import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store/store';
import type { AccessResult, Door } from '../types';
import { evaluateAccess } from '../engine/accessEngine';

export default function TestAccess() {
  const { users, doors, policies, groups, grants, sites } = useStore((s) => ({
    users: s.users,
    doors: s.doors,
    policies: s.policies,
    groups: s.groups,
    grants: s.grants,
    sites: s.sites,
  }));

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDoorId, setSelectedDoorId] = useState<string>('');
  const [result, setResult] = useState<AccessResult | null>(null);
  const [evaluated, setEvaluated] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const selectedDoor = doors.find((d) => d.id === selectedDoorId) ?? null;

  function getSiteName(door: Door): string {
    return sites.find((s) => s.id === door.siteId)?.name ?? door.siteId;
  }

  function handleEvaluate() {
    if (!selectedUser || !selectedDoor) return;
    const accessResult = evaluateAccess(selectedUser, selectedDoor, policies, groups, grants);
    setResult(accessResult);
    setEvaluated(true);
  }

  const assignedPolicies = selectedDoor
    ? policies.filter((p) => p.doorIds.includes(selectedDoor.id))
    : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Test Access</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">User</label>
            <select
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setEvaluated(false);
                setResult(null);
              }}
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.department}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Door</label>
            <select
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDoorId}
              onChange={(e) => {
                setSelectedDoorId(e.target.value);
                setEvaluated(false);
                setResult(null);
              }}
            >
              <option value="">Select a door...</option>
              {doors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {getSiteName(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-md transition-colors"
          disabled={!selectedUserId || !selectedDoorId}
          onClick={handleEvaluate}
        >
          Evaluate Access
        </button>
      </div>

      {evaluated && result && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Permission Layer</h2>
            <div className="flex items-center gap-2">
              {result.permissionGranted ? (
                <span className="inline-flex items-center gap-1 bg-green-900 border border-green-700 text-green-300 text-sm font-bold px-3 py-1 rounded-full">
                  GRANTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-red-900 border border-red-700 text-red-300 text-sm font-bold px-3 py-1 rounded-full">
                  DENIED
                </span>
              )}
            </div>
            {result.permissionGranted ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Matched Grants</p>
                {result.matchedGrants.length > 0 ? (
                  <ul className="space-y-1">
                    {result.matchedGrants.map((grantName, i) => (
                      <li key={i} className="text-sm text-green-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                        {grantName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No matching grants found.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No matching grants found.</p>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">ABAC Layer</h2>
            {assignedPolicies.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No policies assigned — access allowed by default.
              </p>
            ) : (
              <div className="space-y-4">
                {result.policyResults.map((pr) => (
                  <div key={pr.policyId} className="border border-slate-600 rounded-md overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-700 px-4 py-2">
                      <span className="text-sm font-semibold text-slate-200">{pr.policyName}</span>
                      {pr.passed ? (
                        <span className="text-xs font-bold text-green-300 bg-green-900 border border-green-700 px-2 py-0.5 rounded-full">
                          PASS
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-red-300 bg-red-900 border border-red-700 px-2 py-0.5 rounded-full">
                          FAIL
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-700">
                      {pr.ruleResults.map((rr) => {
                        const displayValue = Array.isArray(rr.value)
                          ? rr.value.join(', ')
                          : rr.value;
                        return (
                          <div key={rr.ruleId} className="px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-mono text-slate-300">
                              {rr.attribute}{' '}
                              <span className="text-blue-400">{rr.operator}</span>{' '}
                              <span className="text-amber-300">{displayValue}</span>
                            </span>
                            <span className="text-slate-500">→</span>
                            <span className="font-mono text-slate-400">actual: <span className="text-slate-200">{rr.actual}</span></span>
                            <span className="text-slate-500">→</span>
                            {rr.passed ? (
                              <span className="text-xs font-bold text-green-300">PASS</span>
                            ) : (
                              <span className="text-xs font-bold text-red-300">FAIL</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className={`rounded-lg border-2 p-6 flex items-center justify-center gap-4 ${
              result.overallGranted
                ? 'bg-green-950 border-green-500'
                : 'bg-red-950 border-red-500'
            }`}
          >
            {result.overallGranted ? (
              <>
                <CheckCircle className="w-10 h-10 text-green-400 shrink-0" />
                <span className="text-3xl font-extrabold tracking-widest text-green-400">
                  ACCESS GRANTED
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-10 h-10 text-red-400 shrink-0" />
                <span className="text-3xl font-extrabold tracking-widest text-red-400">
                  ACCESS DENIED
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
