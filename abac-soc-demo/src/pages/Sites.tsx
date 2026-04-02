import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Building2, Search, Plus, MapPin, Clock } from 'lucide-react';

export const SitesPage: React.FC = () => {
  const { sites, zones, doors, controllers } = useStore();
  const [search, setSearch] = useState('');
  
  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search sites..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50"
          />
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Add Site
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredSites.map(site => {
          const siteZones = zones.filter(z => z.siteId === site.id);
          const siteDoors = doors.filter(d => d.siteId === site.id);
          const siteControllers = controllers.filter(c => c.siteId === site.id);

          return (
            <Card key={site.id} className="p-0">
              <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                <div className="flex gap-4 items-center">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-blue-500">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">{site.name}</h2>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {site.address}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {site.timezone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={site.status === 'Disarmed' ? 'green' : site.status === 'PartialArm' ? 'yellow' : 'red'}>
                    STATUS: {site.status}
                  </Badge>
                  <button className="text-xs font-bold text-blue-400 hover:text-blue-300">Edit Details</button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-4 gap-6 bg-slate-950">
                <div className="col-span-1 space-y-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Infrastructure</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Zones</span><span className="font-bold text-slate-200">{siteZones.length}</span>
                    </div>
                    <div className="flex justify-between text-sm bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Doors</span><span className="font-bold text-slate-200">{siteDoors.length}</span>
                    </div>
                    <div className="flex justify-between text-sm bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Controllers</span><span className="font-bold text-slate-200">{siteControllers.length}</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zones</div>
                    <button className="text-xs font-bold text-blue-400 hover:text-blue-300">+ Add Zone</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {siteZones.map(zone => (
                      <div key={zone.id} className="p-3 border border-slate-800 bg-slate-900 rounded-xl flex justify-between items-center group">
                        <div>
                          <div className="font-bold text-sm text-slate-200">{zone.name}</div>
                          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{zone.type} • {zone.doorIds.length} Doors</div>
                        </div>
                        <Badge variant={zone.status === 'Disarmed' ? 'slate' : 'red'}>{zone.status}</Badge>
                      </div>
                    ))}
                    {siteZones.length === 0 && <div className="text-xs text-slate-500 italic p-4">No zones configured.</div>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
