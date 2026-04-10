import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import RuleBuilder from '../components/RuleBuilder'
import { useStore } from '../store/store'
import type { Group, Rule } from '../types'

interface Props {
  group?: Group
  onClose: () => void
}

function blankGroup(): Group {
  return { id: uuidv4(), name: '', description: '', membershipType: 'static', members: [], membershipRules: [], membershipLogic: 'AND', subGroups: [], inheritedPermissions: [] }
}

type Tab = 'Basics' | 'Members' | 'Rules' | 'Grants'
const TABS: Tab[] = ['Basics', 'Members', 'Rules', 'Grants']

export default function GroupModal({ group, onClose }: Props) {
  const users       = useStore(s => s.users)
  const groups      = useStore(s => s.groups)
  const grants      = useStore(s => s.grants)
  const addGroup    = useStore(s => s.addGroup)
  const updateGroup = useStore(s => s.updateGroup)

  const [draft, setDraft] = useState<Group>(group ?? blankGroup())
  const [tab, setTab]     = useState<Tab>('Basics')

  // Exclude self from subgroup picker
  const otherGroups = groups.filter(g => g.id !== draft.id)

  function toggleMember(uid: string) {
    setDraft(d => ({
      ...d,
      members: d.members.includes(uid) ? d.members.filter(m => m !== uid) : [...d.members, uid],
    }))
  }

  function toggleSubGroup(gid: string) {
    setDraft(d => ({
      ...d,
      subGroups: d.subGroups.includes(gid) ? d.subGroups.filter(s => s !== gid) : [...d.subGroups, gid],
    }))
  }

  function toggleGrant(gid: string) {
    setDraft(d => ({
      ...d,
      inheritedPermissions: d.inheritedPermissions.includes(gid)
        ? d.inheritedPermissions.filter(p => p !== gid)
        : [...d.inheritedPermissions, gid],
    }))
  }

  function onRulesChange(rules: Rule[], l: 'AND' | 'OR') {
    setDraft(d => ({ ...d, membershipRules: rules, membershipLogic: l }))
  }

  function save() {
    if (!draft.name.trim()) return
    if (group) updateGroup(draft)
    else addGroup(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={group ? `Edit Group — ${group.name}` : 'New Group'} onClose={onClose} onSave={save} size="lg">
      {/* Tab bar — sticky inside scrollable body */}
      <div className="sticky top-0 z-10 flex border-b border-[#1e293b] bg-[#0d1117]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[10px] font-semibold tracking-wide transition-colors ${
              tab === t ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-400'
            }`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {tab === 'Basics' && (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Group name" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls + ' resize-none h-20'} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Describe this group's purpose" />
            </div>
            <div>
              <label className={labelCls}>Sub-groups (members inherit this group's grants)</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {otherGroups.map(g => (
                  <label key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                    <input type="checkbox" checked={draft.subGroups.includes(g.id)} onChange={() => toggleSubGroup(g.id)}
                      className="accent-indigo-500" />
                    <span className="text-[11px] text-slate-300">{g.name}</span>
                  </label>
                ))}
                {otherGroups.length === 0 && <p className="text-[10px] text-slate-600 px-3">No other groups exist yet.</p>}
              </div>
            </div>
          </>
        )}

        {tab === 'Members' && (
          <div>
            <label className={labelCls}>Users ({draft.members.length} selected)</label>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                  <input type="checkbox" checked={draft.members.includes(u.id)} onChange={() => toggleMember(u.id)}
                    className="accent-indigo-500" />
                  <div className="flex-1">
                    <div className="text-[11px] text-slate-300">{u.name}</div>
                    <div className="text-[9px] text-slate-600">{u.department} · L{u.clearanceLevel}</div>
                  </div>
                  <span className="text-[9px] text-slate-600">{u.status}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'Rules' && (
          <div>
            <p className="text-[10px] text-slate-500 mb-3">Users matching these rules are dynamically included in the group alongside any static members.</p>
            <RuleBuilder rules={draft.membershipRules} logic={draft.membershipLogic} onChange={onRulesChange} />
          </div>
        )}

        {tab === 'Grants' && (
          <div>
            <label className={labelCls}>Inherited Grants ({draft.inheritedPermissions.length} selected)</label>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {grants.map(g => (
                <label key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                  <input type="checkbox" checked={draft.inheritedPermissions.includes(g.id)} onChange={() => toggleGrant(g.id)}
                    className="accent-indigo-500" />
                  <div className="flex-1">
                    <div className="text-[11px] text-slate-300">{g.name}</div>
                    <div className="text-[9px] text-slate-600">{g.scope} · {g.applicationMode}</div>
                  </div>
                </label>
              ))}
              {grants.length === 0 && <p className="text-[10px] text-slate-600 px-3">No grants exist yet.</p>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
