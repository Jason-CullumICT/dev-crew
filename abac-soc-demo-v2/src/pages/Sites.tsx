import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, MapPin, Clock, Shield } from 'lucide-react';
import { useStore } from '../store/store';
import type { Site, SiteStatus, Zone, ZoneType, ZoneStatus } from '../types';
import AttributeEditor from '../components/AttributeEditor';

const SITE_STATUSES: SiteStatus[] = ['Armed', 'Disarmed', 'PartialArm', 'Alarm', 'Lockdown'];
const ZONE_TYPES: ZoneType[] = ['Perimeter', 'Interior', 'Secure', 'Public', 'Emergency'];
const ZONE_STATUSES: ZoneStatus[] = ['Armed', 'Disarmed', 'Alarm'];

function siteStatusBadge(status: SiteStatus): string {
  switch (status) {
    case 'Disarmed': return 'bg-green-900/50 text-green-400 border border-green-700';
    case 'PartialArm': return 'bg-amber-900/50 text-amber-400 border border-amber-700';
    case 'Armed': return 'bg-red-900/50 text-red-400 border border-red-700';
    case 'Alarm': return 'bg-red-950 text-red-300 border border-red-800';
    case 'Lockdown': return 'bg-purple-900/50 text-purple-400 border border-purple-700';
  }
}

function zoneStatusBadge(status: ZoneStatus): string {
  switch (status) {
    case 'Armed': return 'bg-red-900/50 text-red-400 border border-red-700';
    case 'Disarmed': return 'bg-green-900/50 text-green-400 border border-green-700';
    case 'Alarm': return 'bg-orange-900/50 text-orange-400 border border-orange-700';
  }
}

function zoneTypeBadge(type: ZoneType): string {
  switch (type) {
    case 'Perimeter': return 'bg-slate-700/60 text-slate-300 border border-slate-600';
    case 'Interior': return 'bg-slate-700/60 text-slate-300 border border-slate-600';
    case 'Secure': return 'bg-slate-700/60 text-slate-300 border border-slate-600';
    case 'Public': return 'bg-slate-700/60 text-slate-300 border border-slate-600';
    case 'Emergency': return 'bg-slate-700/60 text-slate-400 border border-slate-500';
  }
}

interface SiteFormState {
  name: string;
  address: string;
  timezone: string;
  status: SiteStatus;
  customAttributes: Record<string, string>;
}

interface ZoneFormState {
  name: string;
  type: ZoneType;
  status: ZoneStatus;
  customAttributes: Record<string, string>;
}

const emptySiteForm = (): SiteFormState => ({
  name: '',
  address: '',
  timezone: 'America/New_York',
  status: 'Disarmed',
  customAttributes: {},
});

const emptyZoneForm = (): ZoneFormState => ({
  name: '',
  type: 'Perimeter',
  status: 'Disarmed',
  customAttributes: {},
});

type SiteModalMode = { kind: 'add' } | { kind: 'edit'; site: Site };
type ZoneModalMode = { kind: 'add'; siteId: string } | { kind: 'edit'; zone: Zone };

export default function Sites() {
  const sites = useStore((s) => s.sites);
  const zones = useStore((s) => s.zones);
  const doors = useStore((s) => s.doors);
  const addSite = useStore((s) => s.addSite);
  const updateSite = useStore((s) => s.updateSite);
  const deleteSite = useStore((s) => s.deleteSite);
  const addZone = useStore((s) => s.addZone);
  const updateZone = useStore((s) => s.updateZone);
  const deleteZone = useStore((s) => s.deleteZone);

  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [siteModal, setSiteModal] = useState<SiteModalMode | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(emptySiteForm());
  const [zoneModal, setZoneModal] = useState<ZoneModalMode | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneFormState>(emptyZoneForm());

  function toggleExpand(id: string) {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddSite() {
    setSiteForm(emptySiteForm());
    setSiteModal({ kind: 'add' });
  }

  function openEditSite(site: Site) {
    setSiteForm({ name: site.name, address: site.address, timezone: site.timezone, status: site.status, customAttributes: site.customAttributes ?? {} });
    setSiteModal({ kind: 'edit', site });
  }

  function handleSiteSubmit() {
    if (!siteForm.name.trim()) return;
    if (siteModal?.kind === 'add') {
      addSite({ id: uuidv4(), ...siteForm, assignedManagerIds: [], zones: [], customAttributes: siteForm.customAttributes });
    } else if (siteModal?.kind === 'edit') {
      updateSite({ ...siteModal.site, ...siteForm });
    }
    setSiteModal(null);
  }

  function handleDeleteSite(id: string) {
    deleteSite(id);
    setExpandedSites((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function openAddZone(siteId: string) {
    setZoneForm(emptyZoneForm());
    setZoneModal({ kind: 'add', siteId });
  }

  function openEditZone(zone: Zone) {
    setZoneForm({ name: zone.name, type: zone.type, status: zone.status, customAttributes: zone.customAttributes ?? {} });
    setZoneModal({ kind: 'edit', zone });
  }

  function handleZoneSubmit() {
    if (!zoneForm.name.trim()) return;
    if (zoneModal?.kind === 'add') {
      addZone({ id: uuidv4(), siteId: zoneModal.siteId, ...zoneForm, doorIds: [], customAttributes: zoneForm.customAttributes });
    } else if (zoneModal?.kind === 'edit') {
      updateZone({ ...zoneModal.zone, ...zoneForm });
    }
    setZoneModal(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Sites &amp; Zones</h1>
          <p className="text-sm text-slate-400 mt-1">{sites.length} site{sites.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button
          onClick={openAddSite}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Site
        </button>
      </div>

      {/* Site List */}
      <div className="space-y-3">
        {sites.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Shield size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No sites configured. Add your first site to get started.</p>
          </div>
        )}

        {sites.map((site) => {
          const siteZones = zones.filter((z) => z.siteId === site.id);
          const isExpanded = expandedSites.has(site.id);

          return (
            <div key={site.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              {/* Site Card Header */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleExpand(site.id)}
                  className="text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-slate-100 text-base">{site.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${siteStatusBadge(site.status)}`}>
                      {site.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={12} />
                      {site.address || <span className="italic opacity-60">No address</span>}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={12} />
                      {site.timezone}
                    </span>
                    <span className="text-xs text-slate-500">
                      {siteZones.length} zone{siteZones.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditSite(site)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                    title="Edit site"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteSite(site.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                    title="Delete site"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Expanded Zones */}
              {isExpanded && (
                <div className="border-t border-slate-700/60 bg-slate-950/40">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zones</span>
                      <button
                        onClick={() => openAddZone(site.id)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors"
                      >
                        <Plus size={13} />
                        Add Zone
                      </button>
                    </div>

                    {siteZones.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">No zones defined for this site.</p>
                    ) : (
                      <div className="space-y-2">
                        {siteZones.map((zone) => {
                          const doorCount = doors.filter((d) => d.zoneId === zone.id).length;
                          return (
                            <div
                              key={zone.id}
                              className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-slate-200">{zone.name}</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${zoneTypeBadge(zone.type)}`}>
                                    {zone.type}
                                  </span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${zoneStatusBadge(zone.status)}`}>
                                    {zone.status}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {doorCount} door{doorCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => openEditZone(zone)}
                                  className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
                                  title="Edit zone"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => deleteZone(zone.id)}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                  title="Delete zone"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Site Modal */}
      {siteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-base font-semibold text-slate-100">
                {siteModal.kind === 'add' ? 'Add Site' : 'Edit Site'}
              </h2>
              <button
                onClick={() => setSiteModal(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={siteForm.name}
                  onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Site name"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Address</label>
                <input
                  type="text"
                  value={siteForm.address}
                  onChange={(e) => setSiteForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, City, State"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Timezone</label>
                <input
                  type="text"
                  value={siteForm.timezone}
                  onChange={(e) => setSiteForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="America/New_York"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                <select
                  value={siteForm.status}
                  onChange={(e) => setSiteForm((f) => ({ ...f, status: e.target.value as SiteStatus }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {SITE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Custom Attributes</label>
                <AttributeEditor
                  attributes={siteForm.customAttributes ?? {}}
                  onChange={(customAttributes) => setSiteForm((f) => ({ ...f, customAttributes }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setSiteModal(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSiteSubmit}
                disabled={!siteForm.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {siteModal.kind === 'add' ? 'Add Site' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Modal */}
      {zoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-base font-semibold text-slate-100">
                {zoneModal.kind === 'add' ? 'Add Zone' : 'Edit Zone'}
              </h2>
              <button
                onClick={() => setZoneModal(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Zone name"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                <select
                  value={zoneForm.type}
                  onChange={(e) => setZoneForm((f) => ({ ...f, type: e.target.value as ZoneType }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {ZONE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                <select
                  value={zoneForm.status}
                  onChange={(e) => setZoneForm((f) => ({ ...f, status: e.target.value as ZoneStatus }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {ZONE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Custom Attributes</label>
                <AttributeEditor
                  attributes={zoneForm.customAttributes ?? {}}
                  onChange={(customAttributes) => setZoneForm((f) => ({ ...f, customAttributes }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setZoneModal(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleZoneSubmit}
                disabled={!zoneForm.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {zoneModal.kind === 'add' ? 'Add Zone' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
