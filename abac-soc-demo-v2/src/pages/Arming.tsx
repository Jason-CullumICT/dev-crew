import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import { hasPermission } from '../engine/accessEngine';
import type { EvalContext } from '../engine/accessEngine';
import type { SiteStatus, ZoneStatus, ZoneType } from '../types';

function siteStatusBadge(status: SiteStatus) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';
  switch (status) {
    case 'Disarmed':
      return <span className={`${base} bg-green-900 text-green-300`}>Disarmed</span>;
    case 'PartialArm':
      return <span className={`${base} bg-amber-900 text-amber-300`}>Partial Arm</span>;
    case 'Armed':
      return <span className={`${base} bg-red-900 text-red-300`}>Armed</span>;
    case 'Alarm':
      return <span className={`${base} bg-red-950 text-red-200`}>Alarm</span>;
    case 'Lockdown':
      return <span className={`${base} bg-purple-900 text-purple-300`}>Lockdown</span>;
    default:
      return <span className={`${base} bg-gray-700 text-gray-300`}>{status}</span>;
  }
}

function zoneStatusBadge(status: ZoneStatus) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
  switch (status) {
    case 'Armed':
      return <span className={`${base} bg-red-900 text-red-300`}>Armed</span>;
    case 'Disarmed':
      return <span className={`${base} bg-green-900 text-green-300`}>Disarmed</span>;
    case 'Alarm':
      return <span className={`${base} bg-red-950 text-red-200`}>Alarm</span>;
    default:
      return <span className={`${base} bg-gray-700 text-gray-300`}>{status}</span>;
  }
}

export default function Arming() {
  const sites = useStore((s) => s.sites);
  const zones = useStore((s) => s.zones);
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);
  const grants = useStore((s) => s.grants);
  const doors = useStore((s) => s.doors);
  const controllers = useStore((s) => s.controllers);
  const updateSite = useStore((s) => s.updateSite);
  const updateZone = useStore((s) => s.updateZone);
  const addArmingLog = useStore((s) => s.addArmingLog);

  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id ?? '');

  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;
  const siteZones = zones.filter((z) => z.siteId === selectedSiteId);

  const storeSnapshot = {
    allUsers: users,
    allDoors: doors,
    allZones: zones,
    allSites: sites,
    allControllers: controllers,
    allGroups: groups,
  };

  const authorizedUsers = users.filter((u) => {
    const ctx: EvalContext = { user: u, store: storeSnapshot };
    return hasPermission(u, groups, grants, 'arm', ctx, selectedSiteId);
  });

  const actingUser = users[0] ?? null;

  function logAction(action: string) {
    if (!actingUser || !selectedSite) return;
    addArmingLog({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userName: actingUser.name,
      action,
      siteName: selectedSite.name,
      result: 'Success',
    });
  }

  function handleArmSite() {
    if (!selectedSite) return;
    updateSite({ ...selectedSite, status: 'Armed' });
    siteZones.forEach((z) => updateZone({ ...z, status: 'Armed' }));
    logAction('Armed');
  }

  function handleDisarmSite() {
    if (!selectedSite) return;
    updateSite({ ...selectedSite, status: 'Disarmed' });
    siteZones.forEach((z) => updateZone({ ...z, status: 'Disarmed' }));
    logAction('Disarmed');
  }

  function handlePartialArm() {
    if (!selectedSite) return;
    updateSite({ ...selectedSite, status: 'PartialArm' });
    siteZones.forEach((z) => {
      const perimeterTypes: ZoneType[] = ['Perimeter'];
      const disarmedTypes: ZoneType[] = ['Interior', 'Public'];
      if (perimeterTypes.includes(z.type)) {
        updateZone({ ...z, status: 'Armed' });
      } else if (disarmedTypes.includes(z.type)) {
        updateZone({ ...z, status: 'Disarmed' });
      }
    });
    logAction('PartialArm');
  }

  function handleTriggerLockdown() {
    if (!selectedSite) return;
    updateSite({ ...selectedSite, status: 'Lockdown' });
    siteZones.forEach((z) => updateZone({ ...z, status: 'Armed' }));
    logAction('Lockdown');
  }

  function handleClearAlarm() {
    if (!selectedSite) return;
    updateSite({ ...selectedSite, status: 'Disarmed' });
    siteZones.forEach((z) => updateZone({ ...z, status: 'Disarmed' }));
    logAction('ClearAlarm');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Arming Control</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: site selector + zone statuses + authorized users */}
        <div className="lg:col-span-2 space-y-6">
          {/* Site Selector */}
          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            {selectedSite && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Status:</span>
                  {siteStatusBadge(selectedSite.status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Address:</span>
                  <span className="text-sm text-gray-300">{selectedSite.address}</span>
                </div>
              </div>
            )}
          </div>

          {/* Zone Statuses */}
          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <h2 className="text-base font-semibold text-gray-200 mb-4">Zone Statuses</h2>
            {siteZones.length === 0 ? (
              <p className="text-sm text-gray-500">No zones found for this site.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 pr-4 text-gray-400 font-medium">Zone</th>
                      <th className="text-left py-2 pr-4 text-gray-400 font-medium">Type</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteZones.map((zone) => (
                      <tr key={zone.id} className="border-b border-gray-800 last:border-0">
                        <td className="py-2.5 pr-4 text-gray-200">{zone.name}</td>
                        <td className="py-2.5 pr-4 text-gray-400">{zone.type}</td>
                        <td className="py-2.5">{zoneStatusBadge(zone.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Authorized Users */}
          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <h2 className="text-base font-semibold text-gray-200 mb-4">Users with Arm/Disarm Permission</h2>
            {authorizedUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No users have arm permission for this site.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 pr-4 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-2 pr-4 text-gray-400 font-medium">Department</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authorizedUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800 last:border-0">
                        <td className="py-2.5 pr-4 text-gray-200">{user.name}</td>
                        <td className="py-2.5 pr-4 text-gray-400">{user.department}</td>
                        <td className="py-2.5 text-gray-400">{user.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: action buttons */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <h2 className="text-base font-semibold text-gray-200 mb-5">Actions</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleArmSite}
                disabled={!selectedSite}
                className="w-full px-4 py-3 rounded-md bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Arm Site
              </button>

              <button
                onClick={handleDisarmSite}
                disabled={!selectedSite}
                className="w-full px-4 py-3 rounded-md bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Disarm Site
              </button>

              <button
                onClick={handlePartialArm}
                disabled={!selectedSite}
                className="w-full px-4 py-3 rounded-md bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Partial Arm
              </button>

              <button
                onClick={handleTriggerLockdown}
                disabled={!selectedSite}
                className="w-full px-4 py-3 rounded-md bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Trigger Lockdown
              </button>

              <button
                onClick={handleClearAlarm}
                disabled={!selectedSite}
                className="w-full px-4 py-3 rounded-md bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Clear Alarm
              </button>
            </div>

            {actingUser && (
              <p className="mt-4 text-xs text-gray-500">
                Acting as: <span className="text-gray-400">{actingUser.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
